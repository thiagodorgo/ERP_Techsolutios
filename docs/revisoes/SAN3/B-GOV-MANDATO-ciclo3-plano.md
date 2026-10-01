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

> **v2 — 2026-09-27, após o parecer do `critico-adversarial` (rodada 1 de 2; `scratchpad/CRITICO-CICLO3.md`).** Ele derrubou os
> mecanismos (1), (2), (4) e (5) da v1 — **e tinha razão nos quatro, por execução**: reproduzi os cinco escapes dele contra o meu
> próprio protótipo (`<<< NADA >>>` em 5/5) e o abuso da colagem (`PASTE` absolvendo um SHA fabricado). O que muda na v2, cada
> item com a prova em §0.6(d) e o critério que o derruba em §2:
> 1. **Mecanismo (2) refeito de raiz — `approved_head` vira TOKEN RESERVADO.** Detectar "afirmação" em prosa é reconhecer forma,
>    em qualquer unidade (linha, parágrafo, seção); o crítico mostrou que a unidade seguinte é sempre a que escapa. A propriedade
>    que se enuncia sem forma é outra: **o nome do campo é da ferramenta; o autor não o escreve** — a única via de o
>    `approved_head` aparecer num mandato é a colagem verbatim (igualdade linha a linha, bloco inteiro) da saída atual do
>    `mandato-refs.sh`. Sem partição, sem co-ocorrência, sem `nao-rotula:`. 5/5 escapes do crítico, o abuso (acima e abaixo), a
>    colagem velha e a reordenada → REJ; grafias (`approved-head`, `approvedHead`, `approved_`+quebra+`head`, em cerca, inline,
>    célula) → REJ. O residual (sinônimo em prosa: "o head que a junta aprovou é X") é **declarado impossível sem vocabulário**,
>    com dono, e **asserido como OK de propósito** no guard para ficar visível.
> 2. **Princípio novo em §0.5, que responde à pergunta do crítico ("o que o gatilho trata como fronteira, e quem a testa?"):**
>    partição é segura para regras **universais** ("toda unidade tem X" — partir só rejeita mais) e insegura para regras de
>    **co-ocorrência** ("a unidade tem A e B" — partir esconde). Toda checagem do pré-voo é classificada; nenhuma ∃ sobrevive.
> 3. **Mecanismos (4) e (5) unificados num INVENTÁRIO de isenções e máquinas de estado** (E2.i): cada isenção é *estrutural por
>    igualdade* (colagem) ou *declarada e visível* (`caixa-exata:`, `(novo)` — contadas em AVISO), cobre **exatamente** o que
>    nomeia, e tem o **teste recíproco de sobre-isenção** [F-ISO-*]; cada máquina de estados tem o caso não previsto nomeado e a
>    saída fail-closed testada [F-SM-*]. Duas isenções do ciclo 2 que eram escapes caem: cabeçalho de tabela (vira unidade) e
>    `>`/`###` fora das seções (só `# título` fica) — protótipos de 1 linha executados, compatíveis com os 33 casos protegidos.
> 4. **Mecanismo (1) sem fallback.** Dois devs é **condição de início**, conferida pelo inspetor; não há "um dev commita os testes
>    primeiro". Não há prazo que o justifique.
> 5. **E4 fica, sem corte, e o custo é multiplicado:** ≈6 h serial pela minha conta (≈7 h pela do crítico), ≈1,5–2 h com
>    `--jobs 4` (8 cores medidos). §3 reescrito: **nada sai por caber ou não** — não há teto (`D-SEM-TETO-AUDITORIA-NO-3`).
> 6. **§1.1 ganha A11** ("o arnês muda o comportamento, não o conteúdo" — controle diferencial arnês × árvore real) **e A12**
>    ("número unitário publicado sem a multiplicação que o contexto exige" — o meu ≈2 h).
>
> **O que derrubo do crítico: nada de substância.** Uma precisão de número: o custo da E4 não é ≈7 h com o unitário medido —
> é ≈6 h; a diferença é o unitário do pré-voo (0,47 s × ~230 casos ≈ 110 s/execução, e não os 3 min que o meu R8 projetou). O
> número que vale é o que o Dev-S publicar na 1ª rodada. **Terreno da v2:** editada em `C:/Users/AMP/w-mandato` sobre o blob
> commitado em `61302337` (disco = blob `078fb17e…`, LF, CR=0, conferido antes de editar); `w-mandato` mostra dezenas de ` M
> .agents/agents/*.md` que **não são meus** — reporto, não toco. Base viva nunca alvo; nada da v2 precisou de banco.

> **v3 — 2026-09-27, após a rodada 2 (a última) do `critico-adversarial` (`scratchpad/CRITICO-CICLO3-R2.md`). A v3 vai direto
> para o dev: onde não fecho, declaro a fronteira com dono, por escrito.** Ele concedeu a checagem 7, os mecanismos 1–3 e a minha
> correção aritmética; derrubou o princípio do §0.5 ("meio princípio: cobre PARTIR e não JUNTAR") e o alcance do inventário — **e
> tinha razão em todos os sete, por execução minha** (§0.6(f)): `m8` 5→0 com dois espaços; `m3` (fixture dele) ec 1→0; `m4` 2→0;
> `m5`/`m5c` 0 com célula cheia; `m7` 0 nas três isenções da checagem 6. E achei mais um **da mesma direção** que ele não atacou:
> **SHA colado** (`<40 legítimo><40 fabricado>` sem separador = corrida de 80 hex → **não conferido**, 0 REJ; separado → 1).
> O que muda na v3:
> 1. **§0.5 completo: quem MOVE a fronteira é o autor, nos DOIS sentidos.** Para regra ∀, partir é seguro e **juntar é inseguro**
>    → o que pode agregar numa unidade fica **limitado por estrutura**: prosa **antes** do `medido por:` (a reivindicação; atribuir
>    N números a um comando é residual **declarado**) e **cerca** (saída, por convenção declarada). Depois do token, qualquer linha
>    não cercada **abre unidade nova**. Protótipo de 5 linhas executado: `m8-indent` 0→1 REJ; prosa antes do token → OK; saída
>    cercada → OK. **Custo:** saída colada vai em cerca — e o cabeçalho do script deixa de ensinar "indente a continuação".
> 2. **Checagem 1 classificada e um só oráculo de seção**, ciente de cerca, para as checagens 1, 2, 3, 5 e 7: o `grep -q` e o awk
>    próprio da checagem 2 **somem**; `## HIPOTESE` dentro de cerca balanceada → `REJ falta a secao ## HIPOTESE — a única ocorrência
>    está DENTRO de cerca, l.N`. Protótipo executado contra a fixture dele.
> 3. **`caixa-exata:` por SEGMENTO** (o mesmo segmento de shell da invocação), com recíproco **intra-unidade** e **intra-linha**; a
>    **célula de evidência (`uok`) entra no inventário** e a linha de tabela **nunca agrega** (célula cheia + linhas indentadas → REJ).
> 4. **Inventário completo (I1–I18):** entram as classificações da checagem 6 (sem barra, sem extensão, razão numérica, placeholder,
>    absoluto, URL), o oráculo único e o estado `uok`; a frase "isenção fora do inventário não existe" passa a ser **verdadeira**.
> 5. **Colagem autoidentificada, cercada, para QUALQUER PR:** o bloco começa em `# refs do PR #N` (1ª linha da saída real), o pré-voo
>    lê N, roda `bash "$REFS" N` e compara o bloco inteiro (menos `# gerado em:`); a **checagem 4 aceita os SHAs de colagens
>    verificadas** (proveniência por construção). Resolve o §8 (3 PRs colados) — protótipo com 3 blocos reais: 3 OK; 1 SHA trocado
>    → só aquele bloco `DESATUALIZADO` e os seus tokens REJ. **Quando o head anda, a colagem velha é rejeitada nomeando a causa** —
>    é a fronteira 6 (retrato, não histórico) estendida à colagem, com dono; a junta relê o dogfooding **no head para o qual foi
>    escrito**, ou aceita a REJ "DESATUALIZADO" como não-defeito do documento.
> 6. **Custo medido por dois papéis, com fórmula:** refs **2,66–2,92 s** (eu) / 2,56 s (ele); pré-voo **0,52–0,64 s** (eu) / 0,49 s
>    (ele) → **≈4,2–5,0 h serial, ≈1,0–1,3 h com `--jobs 4`**. O "≈2 min" da v2 era estimativa de um job sem cronômetro,
>    **republicada como "medido" em R3/§11 — A12 contra mim**, corrigida.
> 7. **Os três `\g<1>` eram piores do que o crítico mediu:** o meu `rx()` fazia *slicing*, logo o grupo **não foi preservado** — a
>    linha A10, a linha "remédio nasce com a doença" do mapa e **o texto inteiro do item 6 do contrato da E4** tinham sido
>    **apagados**. Restaurados do blob v1 (`61302337`), e a v3 é aplicada só com substituição literal + `grep -c 'g<1>'` = 0 no fim.
> **O que derrubo do crítico: nada.** Nenhuma medição minha contradiz uma dele; o único número que difere (unitário do refs) está
> dentro da variância de máquina e publico os dois. **O que fica como fronteira com dono, por escrito (§3):** conteúdo de cerca é
> saída por convenção (o pré-voo não distingue saída de prosa cercada — é a junta que reexecuta); N afirmações antes de um
> `medido por:` são atribuídas a esse comando (atribuição, não veracidade); sinônimo em prosa; colagem é retrato.
> **Terreno da v3:** disco = blob de `cb9c360a` (`310553c4…`, LF) antes de editar; `w-mandato` com os ` M .agents/agents/*.md`
> alheios (fantasma de stat-cache, reportado); base viva nunca alvo.

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
| P-4 | *o TOKEN, não a vizinhança; é SHA sse o token inteiro é hex* (pre l.46-51) | classe `[A-Za-z0-9_./:-]` (l.183) | o `..` do intervalo git é **operador**, não parte de identificador; dentro do token, o `.` interno derruba `ehex` (F-4a). `:`/`-` saem das duas pontas; `.` sai **só do fim** — por isso `.<sha>` escapa (C1′; Dev-T F-4b, reproduzido: ec=0). E2.c conserta os dois |
| P-5 | *o COMANDO, não o vocabulário; `-i` na invocação* (pre l.55-59) | `coletagrep()` l.131-135: nome ∈ {`grep`,`rg`}; `-i` procurado na **linha** | trocou vocabulário de prosa por **vocabulário de nome** (`egrep`/`fgrep` fora) e a **invocação** pela linha (`sort -ui && grep` passa) |
| P-6 | *existência exata no caminho citado* (pre l.61-74) | l.283 `(novo)` por **linha**; l.288 `d="${c##*:}"` | `(novo)` isenta tokens que não declara; e "o que vem depois do último `:`" trata **qualquer** prefixo como revisão — `falso.ts:package.json` passa porque `package.json` existe |
| P-7 | *o guard fica vermelho se — e só se — o comportamento muda* (testes l.9-15) | 51 casos, escritos pelo **mesmo autor** do script, nas **formas que ele imaginou** | "vermelho sse comportamento muda" foi provado para **ausência do artefato** (0/51) e **no-ops** (4/4), não para **cobertura**: 16 pontos mudam o comportamento com o guard verde. Cobertura foi **narrada** ("51 casos"), não **medida** |

### 0.5 Por que o remédio nasceu com a doença — o MECANISMO, o princípio COMPLETO (v3), e o que este plano faz contra ele

**A anatomia dos quatro remédios (ciclo 1, ciclo 2, v1, v2):** cada um variou o que estava **dentro** da unidade do gatilho e
nunca perguntou **quem move a fronteira da unidade, e em que sentido**. Ciclo 1: marcador → escapou a tabela. Ciclo 2: linha →
tabela/quebra/prosa. v1: 14 formas dentro do parágrafo → escapou **partir** o parágrafo. v2: tirou a fronteira da checagem 7 (certo)
e generalizou em princípio "partição é segura para ∀" → escapou **juntar** (indentação, cerca), que é o operador que o autor
controla com a barra de espaço — e que o cabeçalho do próprio script **ensinava** ("indente a continuação").

**O princípio completo — regra × operador do autor:**

| tipo de regra | PARTIR (autor separa: linha vazia, quebra) | JUNTAR (autor agrega: indentação, cerca, remoção de separador) | consequência de desenho |
|---|---|---|---|
| **∀ sobre unidades** — "toda unidade tem X" (chk 3) | seguro: unidade a mais, que precisa de X | **inseguro**: um X cobre N afirmações (`m8`: 5 REJ → 0 com dois espaços) | **limitar o que agrega por estrutura**: só prosa **antes** do token (a reivindicação — atribuição a 1 comando é o residual declarado) e **cerca** (saída, convenção declarada). Depois do token, linha não cercada = unidade nova. Linha de tabela nunca agrega |
| **∀ lexical sobre o documento** (chk 7) | seguro — e a busca é no documento inteiro normalizado, não em janela | seguro (mais ocorrências) | nenhuma unidade, nenhuma fronteira |
| **∀ por token** (chk 4, chk 6) | seguro: partes conferidas (sub-caminho não existe; sub-SHA cobrado) | **inseguro para SHA**: `<40><40>` colado = 80 hex → não é SHA (medido: 0 REJ) | corrida hexadecimal **>40 = REJ** (fail-closed); caminho colado não existe → REJ (seguro) |
| **∀ por invocação** (chk 5) | seguro: `grep \` continuado sem `-i` no segmento → REJ (over-rejection aceita) | inseguro se a isenção for mais larga que o segmento (`caixa-exata:` por unidade absolvia o 2º `grep`: `m4` 2 → 0) | isenção **no mesmo segmento** da invocação; recíproco intra-unidade e intra-linha |
| **∃ estrutural** — "existe o cabeçalho da seção" (chk 1) | n/a | **inseguro se o oráculo for outro**: `grep -q` vê `## HIPOTESE` dentro de cerca; a máquina de unidades não (`m3`: ec 1 → 0) | **um só oráculo**, ciente de cerca, para 1, 2, 3, 5 e 7; falha do ∃ = REJ nomeando a ocorrência engolida |
| **isenção** — "se há T, não se cobra X" | — | **inseguro se o escopo absolvido > objeto** (colagem absolvia o parágrafo; célula absolvia as indentadas: `m5c` 3 afirmações → 0) | escopo **exato** + recíproco nos **dois** lados (entre e dentro), no inventário |

**Consequência para a v3:** nenhuma regra ∃ sobre conteúdo; o único ∃ (cabeçalho de seção) é avaliado pelo mesmo oráculo das ∀ e
falha rejeitando; toda agregação é estrutural e limitada; toda isenção está no inventário (I1–I18) com escopo exato e recíproco
nos dois lados. **O residual que sobra é semântico, e está dito em §3:** o pré-voo garante que toda afirmação está **atribuída** a
um comando declarado e que toda saída está **marcada** como saída (cerca) — não garante que o comando produza a afirmação nem que
a saída cercada seja verdadeira. Isso é da junta, por reexecução, e é exatamente a divisão de trabalho que a ferramenta existe
para tornar mecânica: o leitor sabe **qual** comando rodar para cada afirmação.

**O que impede o remédio deste ciclo de repetir o padrão — por CONSTRUÇÃO (v3):**

| mecanismo do defeito | o que muda de ESTRUTURA | onde | trajetória v1 → v2 → v3 |
|---|---|---|---|
| uma mente, duas peças | **autor do guard ≠ autor do script — condição de início, sem fallback.** Dev-T commita testes antes (vermelhos contra o ciclo 2); Dev-S não edita teste | §2, §4, §10 | fallback (A-6) removido na v2; **sólido** |
| formas imaginadas pelo autor | checagens ∃ viram ∀ lexicais (token reservado); ∀ partem só para rejeitar mais **e agregam só por estrutura**; o laço `FORMAS` prova over-rejection e inclui as 5 fronteiras do crítico; a junta varia fronteiras **e agregação** | E2.b/E2.g, E3 | v1 lista → v2 sem fronteira (chk 7) → **v3 sem fronteira móvel em nenhuma checagem** |
| cobertura narrada | ferramenta rastreada de mutação, matriz commitada, controles [M-2]/[M-3] com diferencial arnês × árvore | E4 | **sólido** (concedido); custo agora medido por dois papéis |
| divergência estreita / isenção larga | só isenções **inventariadas**, escopo exato, recíproco **entre e dentro** | E2.i | v2 recíproco só entre unidades (B-3) → **v3 nos dois lados** |
| estado / oráculo fora do inventário | inventário de **7** máquinas (oráculo único, cerca, seção, unidade, tabela+`uok`, colagem, token), cada uma com caso não previsto e saída fail-closed testada | E2.i | v2 6 máquinas e 2 de fora (B-2, B-3ii) → **v3 completo** |
| análise de operador numa direção só | **A13** em §1.1: toda regra e toda isenção é analisada sob **partir E juntar**, com um caso de cada no guard ([F-AGG-*]) | §1.1, E3 | v1 (partição no falso-positivo só) → v2 (partir só) → **v3 os dois** |

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

**(b) [SUPERADO na v2 — ver (d); fica como registro do erro que o crítico pegou em A-1/A-2] Checagem 7 por PARÁGRAFO, cerca-consciente, com duas isenções por propriedade** (`proto/ah.awk`, `TOOL` = saída **real** do
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

**(d) v2 — TOKEN RESERVADO, executado contra os fixtures DO CRÍTICO (`scratchpad/crit393c/B`, `TOOL` = o `tool.txt` dele) e
contra grafias/fronteiras minhas** (`proto/reserved.awk`; primeiro a reprodução dos achados dele no meu protótipo v1):

```
== (A-1/A-2) os escapes dele contra o MEU proto v1 ah.awk (por paragrafo):
f-bullet / f-tabela / f-quebra / f-prosa / f-heading      CLAIM   (as 5 formas de paragrafo unico: o v1 funciona nelas)
x-lista-frouxa / x-details / x-definicao-frouxa / x-citacao-apos / x-cerca-apos     <<< NADA >>>   (5/5 escapes CONFIRMADOS)
x-paste-abuso   PASTE l.1 — nao e afirmacao     (o SHA fabricado acima da colagem e ABSOLVIDO: A-2 CONFIRMADO)

== v2 reserved.awk — os mesmos 12 fixtures do critico:
f-bullet f-tabela f-quebra f-prosa f-heading                       5/5  REJ l.N: token reservado approved_head fora da colagem
x-lista-frouxa x-details x-definicao-frouxa x-citacao-apos x-cerca-apos   5/5  REJ  (os 5 escapes)
x-paste-abuso                                                     REJ l.1  (a afirmacao fabricada; as 2 linhas da colagem isentas)
f-paste-puro                                                      ok   nenhum approved_head fora da colagem
== grafias e fronteiras novas (esperado: todas REJ):
g-hifen (approved-head) · g-camel (approvedHead) · g-maiusc-espaco (APPROVED HEAD) · g-dentro-de-cerca · g-inline-code · g-tabela   6/6 REJ
g-partido (`approved_` + quebra + `  head`)                       REJ l.3-4: token reservado approved_head partido entre duas linhas
g-grep-dogfooding (`medido por: grep -ic approved_head J.md` + saida colada)   REJ l.3 e l.4   <- CUSTO declarado (contorno: 'approved_h[e]ad')
== negativas e sobre-isencao:
n-so-colagem (colagem indentada, sem cerca, com a linha vazia da propria saida)   ok
n-colagem-cerca (a mesma dentro de ```)                                            ok
n-sem-token                                                                        ok  (+AVISO sem colagem)
n-sinonimo ("o head que a junta aprovou e `<sha>`")                                ok  <- ESCAPE POR CONSTRUCAO (fronteira 11; asserido de proposito)
n-cruzamento ("o PR foi approved" + linha seguinte "head do ramo: x")             REJ l.3-4  <- falso-positivo ACEITO e declarado
x-colagem-velha (1 SHA trocado)                                                    REJ l.6
x-colagem-desordem (2 linhas trocadas)                                             REJ l.6 (linha igual a um campo, mas a colagem nao bate inteira: parcial ou DESATUALIZADA)
x-abuso-abaixo (afirmacao fabricada DEPOIS da colagem)                             REJ l.6
```
**Onde a propriedade passa a morar:** no **léxico do documento inteiro** — não há unidade, logo não há fronteira a escapar; e na
**igualdade com a ferramenta** — a colagem é isenta por ser idêntica (bloco inteiro, na ordem), e cobre só as suas linhas.
**O que fica de fora por construção, e é dito:** sinônimo em prosa (fronteira 11). Detectá-lo é vocabulário. Não há remédio
form-free para isso, e o plano não finge que há.

**(e) v2 — duas sobre-isenções do ciclo 2 que ninguém tinha atacado, fechadas com 1 linha cada** (cópia pristina `git show
34969a81:scripts/mandato-preflight.sh`, md5 `1b65dc3c`; `diff` = 1 linha em cada):
```
== checagem 3 — cabecalho de tabela vira UNIDADE (l.222: `continue` -> abre unidade):
h-claim-no-header  `| suite 3103/3105 e CI 14/14 | valor |` + sep + linha com evidencia   pristino PRE-VOO OK  ->  v2 REJEITOU 1   (afirmacao escondida no cabecalho)
h-header-sem-coluna `| item | valor |` + sep + linha com evidencia                          pristino PRE-VOO OK  ->  v2 REJEITOU 1   (custo: tabela em MEDIDO tem coluna de evidencia)
h-header-com-coluna `| afirmacao | medido por: |` + sep + linha                            pristino OK          ->  v2 OK
   compatibilidade [P-0]: os 6 cabecalhos das fixtures protegidas sao `| afirmacao | medido por: |` (4), `| hipotese | derruba com: |` (1) e o de [A4] — todos nomeiam a coluna
== checagem 2 — fora das secoes so `# titulo` (l.112: tira `/^#/` e `/^>/`, deixa `/^# /`):
o-citacao-antes  `> suite 3103/3105 verde e CI 14/14` antes de ## MEDIDO   pristino PRE-VOO OK  ->  v2 REJEITOU 1
o-h3-antes       `### suite 3103/3105 verde` antes                          pristino PRE-VOO OK  ->  v2 REJEITOU 1
o-titulo         `# Mandato do bloco X`                                     pristino OK          ->  v2 OK
   compatibilidade [P-0]: `grep -n 'bruto('` nas fixtures: nenhuma usa `>` nem `###` fora das secoes
```

**(f) v3 — os sete achados da rodada 2 reproduzidos (fixtures DELE em `scratchpad/crit393d/fx` + minhas em `plan393c/fx3`) e
os protótipos que os fecham** (pristino `1b65dc3c`; patch `pre.v3-agg.sh` com `diff` de **9 linhas** provado; `secoes.awk`,
`chk5.awk`, `reserved3.awk`):

```
== B-1 JUNTAR (pristino -> v3-agg)
m8-controle-nao-indent (5 afirmacoes em coluna 0)          ec=1 rej=5 -> ec=1 rej=5
m8-agrega-indent (as 5, indentadas sob um medido por:)     ec=0 rej=0 -> ec=1 rej=1   <- fechado (>=1, nunca 0: as 5 viram UMA unidade nova)
m8-agrega-cerca  (3 afirmacoes DENTRO de cerca sob token)  ec=0 rej=0 -> ec=0 rej=0   <- fronteira 18 (cerca = saida por convencao)
m8-legit-prosa-antes (3 linhas de prosa ANTES do token)    ec=0 rej=0 -> ec=0 rej=0   <- atribuicao a 1 comando: fronteira 17
b1correto-like (`  # tests 3058` NAO cercado apos token)   ec=0 rej=0 -> ec=1 rej=1   <- a fixture protegida [B1-correto] ENCODA o escape
b1correto-v3   (a mesma, saida cercada)                    ec=0 rej=0 -> ec=0 rej=0
m5-controle-unidade-normal (do critico: prosa APOS token)  ec=0 rej=0 -> ec=1 rej=1   <- custo R13, mensagem diz o contorno
== B-3(ii) uok (pristino -> v3-agg; linha de tabela nunca agrega)
m5-uok-continuacao / m5c-uok-3-afirmacoes                  ec=0 rej=0 -> ec=1 rej=1   (x2)
m5b-celula-vazia · tabela-uma-sem · A4-like · tabela-2-ok  1 · 1 · 1 · 0  ->  1 · 1 · 1 · 0   (tabelas legitimas INALTERADAS)
== B-2 checagem 1 / oraculo unico (secoes.awk)
m3-controle-sem-cerca      pristino ec=1 rej=1 | oraculo: ok
m3-cerca-engole (DELE)     pristino ec=0 rej=0 | oraculo: REJ1 falta a secao ## HIPOTESE — a unica ocorrencia esta DENTRO de cerca, l.8
== B-3(i) caixa-exata por SEGMENTO (chk5.awk)
caixa-exata na linha 1, 2o grep na linha 2 (m4 dele)       AVISO seg1 (declarada) ; REJ5 l.2 seg1: grep -c "aprovado" atas.md
`grep A f caixa-exata: x && grep B g`                       AVISO seg1 ; REJ5 l.1 seg2
`sort -ui l && egrep "x" f | grep -i y g`                   REJ5 l.1 seg2: egrep "x" f
== B-4 classificacoes da chk 6 (pristino; passam de proposito -> viram I13-I18 + fronteiras 3/4)
m7-fora (`naoexiste-xyz.md`, `src/modules/inexistente`, `9999/8888`)   ec=0 rej=0 | m7-controle (`dir/naoexiste-xyz.md`) ec=1 rej=1
== JUNTAR em SHA (meu)
m9-sha-colado (`<40 legitimo><40 fabricado>` sem separador)   pristino ec=0 rej=0 (80 hex nao e SHA)  | regra >40 hex: REJ4 l.3
m9-controle-separado (os mesmos com um espaco)                pristino ec=1 rej=1
== B-5 colagem multi-PR autoidentificada (reserved3.awk; TOOLDIR = saidas ATUAIS reais de 701/702/777, ND/ND/LIDO)
p-3prs (3 blocos cercados, cada um comecando em `# refs do PR #N`)   PASTE 701 OK; PASTE 702 OK; PASTE 777 OK; ok
p-3prs-701-velha (UM SHA trocado no bloco 701; diff = 1 linha)       REJ bloco 701 DESATUALIZADO; 702 OK; 777 OK; REJ TOKEN l.15,l.17 (as do 701)
p-abuso-acima (afirmacao fabricada ACIMA do bloco)                   PASTE 701 OK; REJ l.3 TOKEN
p-abuso-dentro (linha inserida DENTRO do bloco)                      REJ bloco DESATUALIZADO; REJ TOKEN x4
p-sem-cabecalho (bloco sem a 1a linha `# refs do PR #N`)             nao e colagem -> REJ TOKEN x3 + AVISO
p-token-3linhas (`appro`/`ved_`/`head:` em 3 linhas, dentro de cerca) REJ l.5 TOKEN (documento inteiro normalizado, sem janela)
== custo unitario (5x cada, mesma maquina): refs 2745/2660/2918/2793/2765 ms (sonda 8 atas, shim) · pre-voo 601/588/555/644/522 ms
```
**Declaro dois erros meus no caminho** (classes A2 e A10): o 1º patch `v3-agg` não substituiu nada (o `\n` do heredoc chegou como
quebra real e a asserção estourou; o `diff` vazio provou a cópia pristina — as colunas "v3" daquela rodada eram o pristino) e o
`printf '- e o LIDO…'` engoliu o `-` como opção; o `reserved3` comparava `# gerado em:` só de um lado. Refeitos por `awk` com número de
linha e âncora de `grep -n`; nada acima foi lido antes do `diff` provar a substituição.

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
| A11 **o arnês muda o COMPORTAMENTO, não o conteúdo** (achado A-5 do crítico) | o crítico mediu 4 810 ms por invocação no arnês (o `RAIZ` não era repositório git) contra 467 ms na árvore real — bytes idênticos (`hash-object` = blob), comportamento 10× diferente; o meu `R6` já sabia que `<rev>:<caminho>` depende de `git rev-parse` em `$RAIZ` | **controle DIFERENCIAL**: o mesmo comando, sobre o mesmo insumo fixo, no arnês **e** na árvore real (worktree próprio); saídas iguais (menos caminho/data) ou o arnês é uma variável e a diferença é **nomeada** (repo git, PATH, cwd, EOL). Obrigatório em E4 (`--controle` inclui) e em toda medição do §0 de qualquer cadeira |
| A12 **número unitário publicado sem a multiplicação que o contexto exige** (achado A-3, contra mim) | "≈2 h" usava o guard de 30 s enquanto outra seção do mesmo plano projetava 3 min para o guard novo; ninguém multiplicou | todo custo/contagem projetado vem com a **fórmula** (unitário × N, com os dois medidos ou marcados "projetado") e é **re-multiplicado por outro papel** antes de decidir algo com ele (aqui: o crítico) |
| A13 **análise de operador numa direção só** (achado B-1 do crítico, contra mim) | v1 mediu a partição só no falso-positivo; v2 analisou só PARTIR e não JUNTAR; o `[F-ISO-10]` testava só partir; o recíproco de `caixa-exata:` só entre unidades | toda regra e toda isenção é analisada sob **os dois** operadores que o autor controla (partir / juntar; disparar / sobre-isentar; entre / dentro), com **um caso de cada** no guard ([F-AGG-*], [F-ISO-*] intra e inter); a tabela §0.5 v3 é a lista de conferência |
| A14 **sonda fraca — o caso passa (ou cai) por OUTRA causa que não a anunciada** (Dev-T, T6: 13 sondas em 103; e os dois defeitos dele em D-5) | alternância cujo ramo esquerdo era a mensagem de hoje; `>= 1` onde a contagem exata discrimina; `status===1` sem mensagem; título que promete o que nenhuma asserção cobra; `[F-MIN]` lendo o array em memória (**sobrevivia ao artefato apagado** — o C2-01 em escala menor); `[F-EXT/juntar-2]` medindo partição sob título de fronteira 20 | toda asserção nomeia a **mensagem contratual** (§12.3) **e** a contagem exata; **matriz de ausência do artefato = 0 sobreviventes** (é o controle que pegou o `[F-MIN]`, não releitura); título × asserção conferidos por **outro papel** (C1‴) |

Regra de classificação para a junta 3: um achado é **defeito real** se (i) reproduz na cópia pristina verificada, (ii) o comportamento
muda **antes** de se olhar a cor do guard, (iii) sobrevive à 2ª execução em cwd/arnês distinto e (iv) nenhum controle da tabela
o dissolve. É **artefato** se algum controle o dissolve — e isso também se registra, como fez a C2′ com as sondas que falharam.

---

## §2 — As entregas E1–E5: contrato · critérios com ⇄ mutação e ◐ discriminação · drill e fronteira

**Ordem obrigatória (mecanismo 1 de §0.5):** E1 e E3 (testes, **Dev-T**) → commit → E2 e E4 (script e ferramenta, **Dev-S**) →
commit → E5 (registro, Dev-S) + dívidas do orquestrador. Dev-T **não lê** o script que Dev-S vai escrever (não existe ainda);
Dev-S **não edita** `tests/**`. Se Dev-S medir que um teste está errado, escreve a falsificação (comando + saída) e **para** —
volta ao planejador (§8, regra 1). **Sem fallback (A-6):** dois devs **nomeados e distintos** é **condição de início**, conferida pelo inspetor antes do 1º commit; se só há um, o bloco espera o segundo. Ordem de commit é verificável; independência de imaginação é o que funciona — e o mecanismo é a segunda.

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

### E2 — `scripts/mandato-preflight.sh` (v3): oráculo único, agregação limitada por estrutura, token reservado com colagem por PR, e o inventário COMPLETO (fecha (4), (5), C1′ 3-5-7, C2′-02/03; A-1/A-2/A-7/A-8 da rodada 1; B-1…B-5 da rodada 2; SHA colado)

**Regra 3 para o Dev-S (mecanismo 4):** nenhuma checagem fica **mais estreita** do que este contrato para acomodar um caso que doeu;
caso legítimo rejeitado → isenção **já inventariada** em (i) ou falsificação escrita ao planejador. **Isenção ou estado fora do
inventário = divergência não autorizada.** E toda mudança é analisada sob **partir E juntar** (A13).

**(a) Um só ORÁCULO de seção e cerca (B-2).** Uma passada calcula, por linha, `fence` (CommonMark: abre com ≥3 crases ou tils;
fecha só com o mesmo caractere e comprimento ≥) e `sec` ∈ {"", M, H, X} — cabeçalhos `## ` **só contam fora de cerca**; um `##
MEDIDO`/`## HIPOTESE` dentro de cerca é registrado como **engolido** (linha). As checagens 1, 2, 3, 5 e 7 lêem **este** oráculo; o
`grep -qE '^## +…'` e o awk próprio da checagem 2 **somem**. **Checagem 1** = o oráculo viu os dois cabeçalhos; senão `REJEITADO
falta a secao '## HIPOTESE'` **+** `— a única ocorrência está DENTRO de cerca, l.N` quando houver engolido. **Checagem 2** = toda linha
não vazia com `sec` ∈ {"", X} que não seja `# ` (título) → REJ; uma linha de cerca fora das seções é conteúdo → REJ. Cerca aberta
no EOF → REJ nomeando a abertura (mantido). Seção vazia → `AVISO      secao <X> sem unidades` (literal ASCII, prefixo de 10 colunas — F-1e assere `AVISO…sem unidades`).
- **[F-1c]** a fixture `m3-cerca-engole` do crítico **verbatim** (cerca colada a uma unidade com token, `## HIPOTESE` e a hipótese
  dentro dela) → REJ `falta a secao '## HIPOTESE' — … DENTRO de cerca, l.8`; **[F-1d]** idem com `## MEDIDO`; **[F-2c]** cerca aberta
  antes de `## MEDIDO` → REJ (conteúdo fora); **[F-8a…e]** como na v2; **[F-1e]** `## HIPOTESE` presente e vazia → OK + AVISO.
  ⇄ manter `grep -q` para a checagem 1 → F-1c `PRE-VOO OK` → vermelho. ⇄ awk próprio da checagem 2 → F-2c OK → vermelho.
  ◐ artefato se a cerca da fixture não estiver balanceada (F-8a dispara em vez de F-1c — ler a mensagem); real se a mensagem nomeia a linha engolida.

**(b) Checagem 7 — `approved_head` é TOKEN RESERVADO (v3: documento inteiro; colagem por PR, autoidentificada, cercada).**
*Propriedade:* o nome do campo é da ferramenta; o autor não o escreve. Normalização: **o documento inteiro** (menos as linhas
isentas) reduzido a `[A-Za-z0-9]` minúsculo, concatenado; o token é a substring `approvedhead` — qualquer grafia, qualquer lugar,
partido em **qualquer** número de linhas (não há janela); a linha reportada é a do 1º caractere do casamento. **Única isenção —
estrutural, por IGUALDADE, por bloco:** um **bloco cercado** cuja 1ª linha não vazia é `# refs do PR #N — …` (a 1ª linha real da
saída da ferramenta). O pré-voo lê **N do bloco**, roda `bash "$REFS" N` (uma vez por N distinto) e compara **todas** as linhas do
bloco (trim; ignorando vazias e `# gerado em:`), na ordem e por inteiro. Igual → o bloco é **SAÍDA DA FERRAMENTA**: as suas linhas ficam isentas das checagens **4, 5, 6 e 7** (no guard, o shim inventa
caminhos de ata que não existem no `RAIZ` — sem esta isenção F-7c/F-7i cairiam pela checagem 6, pelo motivo errado; emenda §12), os SHAs
delas **entram na proveniência da checagem 4** para a prosa, e o pré-voo imprime **`COLAGEM    l.a-b: refs do PR #N confere com a saida
atual`** (sinal positivo, literal ASCII, prefixo de 10 colunas). Diferente → `REJEITADO l.a-b: bloco '# refs do PR
#N' NAO bate com a saida atual de mandato-refs.sh N (parcial, editado ou DESATUALIZADO: o head andou?)` e cada linha dele com o
token → REJ. Bloco sem a 1ª linha, não cercado, ou com refs ec 1/2 para N (→ REJ `referências indisponíveis para #N — nada foi
verificado`) **não é colagem**. Resolve o §8: três blocos (392, 393, 387), cada um verificado contra o **seu** PR. **Quando o head
anda**, o bloco de ontem é rejeitado nomeando a causa — fronteira 19 (retrato), com a regra de leitura da junta em §3/§8.
`nao-rotula:` não existe. Sem colagem no mandato → `AVISO` (fronteira 16). Custos (KPI, ata, `grep approved_head`, adjacência
"approved"/"head") como na v2, testados em F-7b/f.
- **[F-7a]** 5 escapes do crítico + 5 formas de parágrafo único → 10/10 REJ. **[F-7b]** 7 grafias + **`appro`/`ved_`/`head` em 3
  linhas dentro de cerca** → 8/8 REJ. ⇄ janela de 2 linhas → o de 3 passa → vermelho.
- **[F-7c]** blocos gerados **pelo teste** a partir do shim para **3 PRs** (ND, ND, LIDO), cercados e indentados → 3 PASTE, 0 REJ,
  sem AVISO; **e** um SHA de outro PR citado em prosa **com** o bloco dele presente → OK na checagem 4 (**[F-4d]**; sem o bloco →
  REJ). ⇄ isentar só o PR do argumento → 2 blocos REJ → vermelho. ⇄ chk 4 sem a união → F-4d REJ → vermelho.
- **[F-7d] sobre-isenção:** afirmação acima / abaixo / **inserida dentro** do bloco; 1 SHA trocado; 2 linhas trocadas → REJ nomeando
  só o que é estranho, com a dica `DESATUALIZADO` no bloco. ⇄ isenção por parágrafo → acima/abaixo passam → vermelho. ⇄ prefixo em
  vez de igualdade → 1 SHA trocado passa → vermelho.
- **[F-7g]** bloco sem a 1ª linha `# refs do PR #N` → não é colagem → tokens REJ; **[F-7h]** refs **morto** para um N → REJ nomeando
  `#N`, e os outros blocos continuam verificados; **[F-7i]** o mesmo bloco 2× → 2 PASTE, OK.
- **[F-7e]** sem `PR` no argumento + token fora de bloco → REJ; **[F-7f]** sinônimo em prosa → **OK de propósito** (fronteira 11).
- ◐ artefato se a fixture de colagem foi escrita à mão ou o shim usado pelo teste ≠ o `MANDATO_REFS` do script; real se reproduz
  com bloco gerado e `od` limpo.

**(c) Tokenização (checagem 4) — partir E juntar:** `..` parte tokens (intervalo git); `.` inicial sai; **corrida hexadecimal
> 40 = `REJEITADO corrida hexadecimal de N caracteres (SHAs colados?) l.N`** — juntar dois SHAs sem separador deixava de ser SHA
(medido: 0 REJ). `_` não parte (fronteira 10).
- **[F-4a]** `git log <legítimo>..<fabricado>` → REJ do fabricado; **[F-4b]** `.<fabricado>` → REJ; **[F-4c]** `<legítimo><fabricado>`
  colado → REJ (>40); controle separado por espaço → REJ normal do fabricado; **[F-4d]** ver (b). ⇄ tratar >40 como não-SHA → 4c OK → vermelho.

**(d) Checagem 5 por SEGMENTO, com `caixa-exata:` no MESMO segmento (B-3 i):** a linha é partida em segmentos por `|`, `||`, `&&`,
`;`, `$(`, crase; família = nome que **termina em `grep`** ou `rg`; `-i` (isolado, agrupado, `--ignore-case`) no mesmo segmento;
`caixa-exata:` isenta **as invocações do segmento que a contém** (fronteira 20: um segmento com 2 `grep` e 1 `caixa-exata:` isenta
os 2 — AVISO com contagem), **nunca** outra linha da mesma unidade. As linhas indentadas e cercadas continuam varridas (o
segmento é por linha). **Toda linha das seções é varrida pela checagem 5 — inclusive `###`** (hoje a linha `###` não é varrida:
`### …, medido por: grep "ausente" f` → ec=0 no pristino; achado do Dev-T `F-INV S5/cabecalho/neg`, reproduzido em §12; I7 corrigida).
- **[F-5a…e]** como na v2; **[F-5f]** `caixa-exata:` na linha 1, 2º `grep` na linha 2 da **mesma unidade** (a `m4` do crítico) → REJ
  do 2º; **[F-5g]** `grep A f caixa-exata: && grep B g` → REJ do 2º segmento; **[F-5h]** `grep A f && grep B g caixa-exata:` → REJ do
  1º. ⇄ isenção por unidade → 5f OK → vermelho. ⇄ por linha → 5g OK → vermelho. Fixture `[B5e]` reescrita (§ [P-0] v3).

**(e) Checagem 6:** `(novo)` isenta o token de caminho **imediatamente anterior**; `<prefixo>:<caminho>` é revisão só se
`rev-parse` resolve. **As classificações do que NÃO é caminho ficam no inventário (I13–I18) e são asseridas DE PROPÓSITO:**
- **[F-6a…e]** como na v2; **[F-6f]** `naoexiste-xyz.md` (sem `/`), `src/modules/inexistente` (sem extensão/barra), `9999/8888`
  (razão), `<placeholder>/x.md`, `C:/x/y.md`, `/x/y.md`, `https://x/y.md` → **7/7 OK, nomeados** (fronteiras 3, 4 e classificações);
  controle `dir/naoexiste-xyz.md` → REJ. ⇄ conferir nome sem `/` → `CLAUDE.md` legítimo em prosa vira caminho e passa; mas
  `naoexiste-xyz.md` REJ → o teste **muda de cor** e a fronteira 3 fica visível — é o propósito.

**(f) Checagem 1 —** ver (a). **(h) Checagem 2 —** ver (a); **[F-2a]** `>`/`###` antes de `## MEDIDO` → REJ; **[F-2b]** `# Título` → OK.

**(g) Checagem 3 — agregação LIMITADA POR ESTRUTURA (B-1, B-3 ii), cabeçalho-unidade, simetria.** Unidade = linha não indentada
dentro da seção **+ as linhas indentadas que a seguem ATÉ a que contém o token** (`medido por:`/`derruba com:`), inclusive **+ blocos
cercados em qualquer posição** (saída). **Depois do token, qualquer linha não vazia e não cercada — indentada ou não — abre unidade
nova** (que precisa do próprio token). **Linha de tabela é unidade fechada: nunca agrega** (célula cheia satisfaz **só** aquela linha) — **com célula cheia OU vazia**: uma
linha indentada após a linha de tabela abre unidade nova; a fixture `m5b` (célula vazia + 1 indentada) dá **2** REJ (o protótipo §0.6(f)
deu 1 por atalho de implementação; vale o contrato — Dev-T `[F-SM-4]` tem razão).
Cabeçalho de tabela é unidade (nomeando a coluna, satisfaz; senão REJ). Cerca em unidade **sem** token → REJ (`saída colada sem
comando`). `###` isento (I7). Mensagem para a unidade nova após token: `… (linha após o comando fora de cerca: saída colada vai em
cerca; continuação de prosa vai ANTES do 'medido por:')`. **O cabeçalho do script deixa de dizer "indente a continuação"** e passa a
dizer: *reivindicação (uma ou várias linhas) → `medido por: <comando>` → saída em cerca*.
- **[F-AGG-1]** 5 afirmações indentadas **após** o token (`m8` do crítico) → **≥1 REJ, nunca 0**; **[F-AGG-2]** 3 linhas de prosa
  indentadas **antes** do token → OK (fronteira 17, asserido de propósito); **[F-AGG-3]** saída cercada após o token → OK;
  **[F-AGG-4]** linha de saída **não** cercada após o token (`  # tests 3058`) → REJ com a mensagem do contorno; **[F-AGG-5]** linha
  de tabela com célula cheia + 3 indentadas (`m5c`) → REJ; **[F-AGG-6]** cerca numa unidade sem token → REJ; **[F-AGG-7]** 3
  afirmações **dentro** de cerca sob token → **OK de propósito** (fronteira 18); **[F-AGG-8]** a fixture-controle do crítico (prosa
  após o token) → REJ (custo R13, asserido). ⇄ voltar a agregar indentadas após o token → AGG-1/4/5 OK → vermelho. ⇄ cerca não
  cobrada sem token → AGG-6 OK → vermelho.
- **[F-3h]** cabeçalho de tabela; **[F-3s]** simetria `medido por: -`. ◐ para AGG-*: artefato se a fixture mistura TAB/espaços de
  modo que "indentada" não é reconhecida (`od`), ou se a cerca não fecha (F-8a); real se a mensagem é a de "após o comando".

**(i) INVENTÁRIO COMPLETO (v3) — isenções, classificações, partições, máquinas.** Isenção, classificação ou estado fora destas
tabelas **não existe** (agora verdadeiro: B-4). Cada linha tem tipo, escopo exato, análise **partir/juntar** e teste nos dois lados.

| # | isenção / classificação / partição | tipo | escopo EXATO | partir / juntar | disparo | recíproco |
|---|---|---|---|---|---|---|
| I1 | colagem do refs (chk 7) | estrutural, igualdade, **por bloco cercado autoidentificado** | as linhas do bloco igual | juntar linhas ao bloco = deixa de ser igual → REJ | F-7c | F-7d/g/h/i |
| I2 | `caixa-exata:` (chk 5) | declarada, visível (AVISO) | invocações do **mesmo segmento** | juntar 2 greps num segmento = ambos isentos (fronteira 20, AVISO conta) | [B5e] (reescrita) | **F-5f (intra-unidade), F-5g/h (intra-linha)** |
| I3 | `(novo)` (chk 6) | declarada, visível | token de caminho imediatamente anterior | juntar 2 caminhos numa linha → só o anterior | [B7b] | F-6a |
| I4 | `<rev>:<caminho>` (chk 6) | estrutural (`rev-parse`) | o prefixo que resolve | — | F-6d | F-6c |
| I5 | separador `\|---\|` (chk 3) | estrutural | a linha | — | [B1-correto] | F-ISO-5 |
| I6 | cabeçalho de tabela | **removida** → unidade | — | — | F-3h | F-3h |
| I7 | `###` dentro das seções | declarada, visível (`grep '^###'`) — fronteira 13 | a linha, **só para a checagem 3**: as checagens 4, 6 e 7 já varrem a linha e a **5 passa a varrer** (hoje não varre — achado do Dev-T, §12 D-3) | juntar um `grep` a um `###` escapava | [B1-correto] | F-ISO-7 (de propósito) + **F-INV S5/cabecalho/neg** (REJ) |
| I8 | `# título` fora das seções (chk 2) | estrutural | a linha | — | F-2b | F-2a/c |
| I9 | token não-SHA por classe (chk 4) | classificação | o token | **juntar SHAs → >40 hex = REJ** | [B3-neg] | F-4a/b/**c** |
| I10 | linha em branco fecha unidade (chk 3) | partição ∀ | — | partir = unidade a mais (seguro) | [B1-recuada] | F-ISO-10 |
| I11 | segmento de shell (chk 5) | partição ∀ | — | partir = over-rejection (seguro); juntar = ver I2 | F-5b/e | F-ISO-11 |
| **I12** | **célula da coluna de evidência** (chk 3, `uok`) | estrutural (cabeçalho nomeia a coluna) | **exatamente a linha de dados** | juntar indentadas à linha → **não agrega** | [B1-tabela-uma-sem] | **F-AGG-5** |
| **I13** | token sem `/` não é caminho (chk 6) | classificação — fronteira 3 | o token | — | F-6f (de propósito) | F-6f controle |
| **I14** | sem extensão e sem barra final não é caminho (chk 6) | classificação — fronteira 4 | o token | — | F-6f | F-6f |
| **I15** | razão numérica `^[0-9./]+$` (chk 6) | classificação | o token | — | [B7c], F-6f | — |
| **I16** | placeholder `<…>` (chk 6) | classificação | o token | — | F-6f | — |
| **I17** | absoluto `X:/`, `/…` (chk 6) | classificação | o token | — | [B7c] | — |
| **I18** | URL `://` (chk 4/6) | classificação — fronteira 1 (SHA em URL) | o token | — | [B7c], F-6f | — |
| **I19** | **cerca = saída** (chk 3) | convenção **visível** — fronteira 18 | as linhas cercadas da unidade | juntar afirmações à cerca → não cobradas (declarado, F-AGG-7); cerca sem token → REJ | F-AGG-3 | **F-AGG-6, F-AGG-7 (de propósito)** |
| **I20** | prosa indentada **antes** do token agrega (chk 3) | estrutural — fronteira 17 | linhas indentadas até o token | juntar N afirmações antes do token = atribuição a 1 comando (declarado) | **F-AGG-2** | **F-AGG-1/4/8** (após o token não agrega) |

| máquina | estados | caso NÃO previsto | saída fail-closed | teste |
|---|---|---|---|---|
| **M0 oráculo** (seção × cerca) | fence ∈ {fora, dentro(char,k)} × sec ∈ {"", M, H, X} | `##` dentro de cerca; cerca fora das seções; cabeçalho repetido | engolido registrado → chk 1 REJ nomeando; cerca fora = conteúdo → chk 2 REJ; repetido → troca de novo (declarado) | F-1c/d, F-2c, F-8a |
| M1 cerca | fora / dentro | aberta no EOF; fechamento errado | REJ nomeando a abertura | F-8a-e |
| M2 seção | "", M, H, X | conteúdo antes da 1ª; `## OUTRA` | chk 2 REJ; X | F-2a, [A2] |
| M3 unidade | fechada / aberta-antes-do-token / **aberta-depois-do-token** | indentada sem unidade; **não cercada após o token**; cerca sem token | vira unidade (precisa de token); **unidade nova**; REJ | [B1-recuada], **F-AGG-1/4/6/8**, F-SM-3 |
| M4 tabela (+`uok`) | fora / cabeçalho / linha | sem separador; `\|` após linha sem `\|`; célula vazia; **indentada após linha** | unidades normais; `tabCol=0`; REJ; **unidade nova** | F-SM-4, [B1-tabela-uma-sem], **F-AGG-5** |
| M5 colagem | fora / bloco(N, j) | parcial; editado; velho; sem cabeçalho; repetido; refs morto para N | REJ com causa; não é colagem; 2 PASTE; REJ nomeando #N | F-7d/g/h/i |
| M6 token | — | partido em k linhas; grafia; em cerca; **em colagem editada** | documento inteiro; alnum; cerca não isenta; bloco não igual não isenta | F-7b, F-7d |

**Cabeçalho do script (v3)** documenta: um só oráculo; *reivindicação → `medido por:` → saída em cerca*; token reservado e colagem
por bloco; custos (KPI/ata/grep; adjacência; saída não cercada; prosa após o token; cabeçalho de tabela; `>`/`###` fora); `_` não
parte; >40 hex; `caixa-exata:` por segmento; conteúdo de evidência não verificado; `###` dentro isento. **Drill e fronteira:** F-*
sobre fixtures geradas com `MANDATO_REFS` shimado — não atravessam sinônimos, veracidade de saída cercada, nem mandatos reais
(dogfooding §8). Fora, com dono `B-GOV-MANDATO-2`: fronteiras 1–20 (§3).

### E3 — `tests/mandato-preflight.test.ts` (v3): laço de FORMAS contra over-rejection, os fixtures das DUAS rodadas do crítico como casos, e recíprocos nos dois lados

**Reenquadramento (mantido da v2, com A13):** escapes por forma são impossíveis por construção nas ∃ (7) e só rejeitam a mais nas ∀;
**e agora toda ∀ tem o par partir/juntar testado** ([F-AGG-*], [F-ISO-*] inter e intra). O laço prova over-rejection (positivas) e
universalidade (negativas). Os 33 casos ficam — **com duas fixtures reescritas na forma, por divergência declarada** ([P-0] v3).

**`FORMAS` (≥ 19):** as 14 da v1 + as 5 frouxas do crítico verbatim (`listaFrouxa`, `detailsFrouxo`, `definicaoFrouxa`,
`citacaoAposVazia`, `cercaAposVazia`). **[F-MIN]** ≥ 19 e as 9 nomeadas. ⇄ remover uma → vermelho.

**Sementes:**
| semente | negativa | positiva | shim | isenções nomeadas (motivo) |
|---|---|---|---|---|
| S3 chk 3 | `cobertura 87,4% em 12 de 13 rotas` · `` | cauda `medido por: true` | `REFS_OK` | `cabecalho` (I7); **nas 5 frouxas a positiva dá REJ e é ASSERIDA como REJ** — a forma frouxa separa a reivindicação da evidência (partição ∀: over-rejection desejada); `cercado` positiva: token dentro da cerca → **REJ** também (cerca é saída, não reivindicação — I19), asserido |
| S4 chk 4 | `cite` · `<FAKE>` | cauda `<SHA_A>` | `REFS_OK`, pr 393 | nenhuma |
| S5 chk 5 | `nao existe, medido por:` · `grep "ausente" f` | cauda `grep -i "ausente" f` | `REFS_OK` | nenhuma |
| S6 chk 6 | `li` · `src/zzz/nao/existe/falso.ts, medido por: true` | cauda `scripts/mandato-refs.sh, medido por: true` | `REFS_OK` | nenhuma |
| S7 chk 7 | `approved_head` · `` `<SHA_A>` medido por: true `` — 19 formas × 1 grafia + 8 grafias × 1 forma + partido em 3 linhas (28 casos) | blocos de colagem **gerados do shim**, cercados, para 1 e para 3 PRs | negativas sob LIDO/ND/AUSENTE | nenhuma |

- **[F-INV]** por semente: negativas fora das isenções = `{1, true}` (conjunto de tamanho 1); isenções nomeadas com o veredito
  esperado **escrito** (inclusive as que esperam REJ); positivas = `{0, false}`. ⇄ S7: detector por unidade → frouxas `{0,false}` →
  vermelho. ⇄ S3: tirar I7 → vermelho. ◐ positiva falhando: correr pelo script do ciclo 2; os dois rejeitam → renderização (F-2a por
  outra razão — ler a mensagem); só o novo → over-rejection real (achado).
- **[F-EXT] (C1‴):** ≥3 formas próprias que variem **fronteira** (linha vazia, seção, cerca, EOF) **e ≥3 que JUNTEM** (indentação após o
  token, cerca com afirmações, tabela + indentadas, 2 greps num segmento, SHA colado, `## HIPOTESE` em cerca), ≥2 grafias do
  token; [F-INV] continua verde e as junções dão o veredito que o inventário declara (REJ, ou OK **de propósito** nas fronteiras 17/18/20).

**Casos específicos (um `test` cada):** F-8a…e · F-1c/d/e · F-2a/b/c · F-7a…i · F-4a…d · F-5a…h · F-6a…f · F-3h/s · **F-AGG-1…8** ·
**F-ISO-2 (intra = F-5f), 5, 7, 10, 11** · **F-SM-3/4** · **F-EOL** (cada semente e cada bloco de colagem em `\r\n` → mesmo veredito; `od`
prova o CR) · **F-0** (script apagado → 0). Fixtures de colagem **geradas** chamando o shim em modo completo para cada N (nunca
literal); os fixtures das duas rodadas do crítico entram **verbatim** (`crit393c/B`, `crit393d/fx`) com o veredito v3 esperado
escrito em cada um.

**[P-0] v3 — as duas fixtures reescritas na forma (única alteração permitida em linha antiga):** `[B1-correto]`: `  # tests 3058`
sai da posição não cercada e entra na cerca (a forma antiga **é** o escape B-1/F-AGG-4); `[B5e]`: `  caixa-exata: …` sai da linha
indentada e vai para o segmento da invocação (`grep -c NAOAPARECE CLAUDE.md caixa-exata: o token e maiusculo por contrato`). As
propriedades ficam testadas (0 rejeições nas duas). C3‴ confere: `git diff 34969a81..HEAD -- tests/mandato-preflight.test.ts`
tem só adições + esses dois hunks **+ (§13.1) os hunks de `[B8a]`/`[B8b]`/`[B8c]` reescritos para a semântica v3 pelo Dev-T-3, mais o `[B8d]` novo**.

**Vermelho-controle da E3 contra `34969a81` — lista CORRIGIDA pela execução do Dev-T (emenda §12: a v3 errava em 4 + 1 e omitia 6):**
VERMELHOS esperados — F-INV(S7), F-7a/b/c/d/g/**h/i**, **F-EOL/colagem**, F-4**a/b**/c/d, F-5a/b/d/e/f/g/h, F-6a/c, F-3h, F-2a/c,
F-1c/d/**e**, F-AGG-1/4/5/6/8, F-8a-d, **F-ISO-11** (a fixture do Dev-T é `sort -ui … && egrep … | grep -i …` — a escapada da C1′),
F-SM-4, **F-EXT/juntar-1/2**, **F-INV S5/cabecalho/neg** (achado de conteúdo: o `###` engolia a checagem 5 — entra na E2.d);
VERDES esperados (guardas de regressão — o vermelho **deles** é a mutação, E4 [M-2]) — os 31 antigos inalterados + as 2 reescritas,
F-1b, F-6e/f, F-3s, F-7e/f, F-AGG-2/3/7, **F-ISO-5** (o ciclo 2 já rejeita o pseudo-separador), F-ISO-7/10, F-SM-3, F-2b.
**MEDIDO no head `4ad4ba9f`:** pré-voo **298 casos, 85 vermelhos, 0 sobreviventes** ao artefato apagado/renomeado; refs **33 casos,
33 verdes por desenho**, e os mutantes `m021`/`m025`/`m018` (os do §0.3) matam **exatamente** V5/V6/V4. Lista diferente = achado a reportar.

**Drill e fronteira:** mede o pré-voo como script sobre fixtures; não atravessa mandatos reais (dogfooding §8, no head certo —
fronteira 19), sinônimos (11) nem veracidade de saída cercada (18).

### E4 — `scripts/mandato-mutantes.sh` (NOVO, autorização nominal §4): cobertura por mutação MEDIDA e reproduzível (fecha (3), C2′-08)

**Propriedade:** *"cobertura" é um número que qualquer cadeira reproduz com um comando: pontos de decisão enumerados da FONTE,
um mutante por ponto com operador DECLARADO, guard executado contra cada mutante em cópia isolada, e a lista dos que ficaram
VERDES.* O que a C2′ construiu no scratchpad vira ferramenta rastreada — para o próximo "30 mutações executadas" não ser
infalsificável.

**Contrato:** `bash scripts/mandato-mutantes.sh <refs|preflight> [--only <linhas>] [--equivalentes <arquivo>] [--controle] [--jobs N]` (com `--jobs N`, mutantes em paralelo, cada um em cópia própria)
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
6. `--controle`: injeta na cópia do artefato uma cláusula `[ -z "$SONDA_INEXISTENTE" ] || parado "sonda"` **sem guard** (polaridade corrigida no §13 D-S-4: só dispara se alguém exportar a variável; a forma `-n` da v3 abortava o PRISTINO e destruía a linha de base) e exige
   que ela apareça como NAO-COBERTA — a ferramenta **sabe achar buraco**; e roda os 4 no-ops do C2′ (comentários reescritos)
   exigindo VERDE — a ferramenta **não acusa texto**. E **controle diferencial (A11):** roda o pristino sobre um insumo fixo na cópia **e** na árvore real (`RAIZ` do repositório) e exige saídas idênticas (menos caminho/data) — se diferirem, o arnês é uma variável e a rodada **não conta** até a diferença ser nomeada.

**Critérios:**
- **[M-1]** sobre o head do ciclo 3: `NAO-COBERTOS − equivalentes = 0` nos dois artefatos, com o arquivo de equivalentes
  **commitado** em `docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-mutantes.md` junto da matriz completa colada. ⇄ apagar um `test(` de V1..V15
  ou F-* → o mutante correspondente reaparece NAO-COBERTO → ec=1.
- **[M-2] (vermelho-controle histórico)** sobre os artefatos de `34969a81` (cópia via `git archive`) com os guards de `34969a81`:
  a lista de NAO-COBERTOS **contém** as linhas 105 e 196 do pré-voo e 135, 142 e 153 do refs (os cinco de §0.3). ⇄ é a medição —
  se a ferramenta não os acha, ela não mede.
- **[M-3]** `--controle` → sonda NAO-COBERTA **e** no-ops VERDES **e** diferencial arnês × árvore idêntico (A11), ec=0. ⇄ quebrar o `diff` obrigatório → a sonda "coberta" → vermelho.
- **[M-4]** nenhum arquivo rastreado muda durante a execução (`git status --porcelain` igual antes/depois; `hash-object` dos 4 = blob).
- ◐ para todos: artefato se o `#fail` veio do terminal e não do log (A9), se o `diff` do mutante tem ≠1 linha (A1/A2), ou se o
  guard rodou com `cwd` errado e o `tsx` não resolveu (todos "vermelhos" por erro de import — conferir que o pristino dá 0 fail
  **na mesma invocação** antes de cada lote).

**Custo MEDIDO por dois papéis, com a fórmula (B-6 — a v2 republicou em R3/§11 como "medido" um "≈2 min" que era estimativa sem
cronômetro; A12 contra mim):** unitário do **refs** = **2,66–2,92 s** (eu, 5×, repo-sonda com 8 atas e shim de `gh`, sem rede) /
**2,56 s** (crítico, 5×); unitário do **pré-voo** = **0,52–0,64 s** (eu, 5×) / **0,49 s** (crítico). Guard novo: refs ≈ 33 casos ×
2,8 s + arranque ≈ **97 s** (eu) / 88 s (ele); pré-voo ≈ 240 casos × 0,58 s + arranque ≈ **145 s** (eu) / 116 s (ele). Mutantes ≈ 60
(refs) e ≈ 85 (pré-voo). **Serial: 60 × 97 + 85 × 145 ≈ 5,0 h (eu) / 4,2 h (ele)**; com **`--jobs 4`** (8 cores por `nproc`) ≈
**1,3 / 1,05 h**. Publico os dois; a diferença é variância de máquina (o crítico mediu no mesmo minuto, eu noutro). O número que
vale é o que o Dev-S publicar na 1ª rodada, **com a mesma fórmula** (unitário medido × N × mutantes). Roda na bateria, em
background; `--only` para iteração. **Não é entrega de corte** (§3).

**MEDIDO pelo Dev-S (§13.5), que substitui a projeção acima:** pré-voo **184 pontos**, guard **531 s** (N=2; 1,78 s/caso), ≈86 mutantes
→ **≈12,7 h serial / ≈5,1 h com `--jobs 4`**; refs ≈35 min. A rodada publicada com `LB_FAIL=1` é descartada; a definitiva roda do zero com
linha de base 0 e é identificada pelos `hash-object` dos 4 artefatos, não pelo SHA do head.

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
| **crítico A-1** — o laço `FORMAS` não varia a fronteira do parágrafo (5 escapes) | bloqueia | E2.b (token reservado — sem fronteira) + E3 (5 frouxas verbatim em `FORMAS`) | F-7a, F-INV(S7), F-EXT | sim: 5/5 `<<< NADA >>>` no meu v1; 5/5 REJ no v2 |
| **crítico A-2** — a isenção da colagem absolve o parágrafo (SHA fabricado) | bloqueia | E2.b (isenção por igualdade, linha a linha) + E2.i I1 | F-7d | sim: `PASTE` no v1; REJ l.1 no v2 (acima e abaixo) |
| **crítico A-3** — custo da E4 ≈6–7 h, não ≈2 h | bloqueia | E4 (custo multiplicado; `--jobs`) + §1.1 A12 | — | sim: 8 cores; unitário 0,47 s dele |
| **crítico A-4** — o corte da E4 reabre o bloqueante (3) | bloqueia | §3 (sem corte) + §9 R3/R10 | M-1/M-2/M-3 | — |
| **crítico A-5** — arnês muda comportamento, não conteúdo | média | §1.1 A11 + E4 `--controle` diferencial | M-3 | herdado dele (4 810 ms × 467 ms); não re-medi |
| **crítico A-6** — fallback anula o mecanismo (1) | alta | §2 (sem fallback; condição de início) + §9 R4 | inspetor | — |
| **crítico A-7** — isenções testadas só no sentido que dispara | bloqueia | E2.i (teste recíproco por isenção) | F-ISO-2/5/7/10/11, F-7d | — |
| **crítico A-8** — mecanismo (5) instanciado uma vez | alta | E2.i (6 máquinas, cada uma com caso não previsto e saída) | F-SM-3/4/7, F-8, F-2a, F-7b | — |
| **planejador v2** — cabeçalho de tabela com afirmação escapa; `>`/`###` antes de `## MEDIDO` escapam | (achado meu, sobre o ciclo 2) | E2.g, E2.h | F-3h, F-2a | sim: §0.6(e), 1 linha cada, pristino OK → v2 REJ |
| **crítico B-1** — o princípio só cobria PARTIR; JUNTAR (indentação, cerca) leva 5 REJ → 0 | bloqueia | §0.5 v3 (princípio completo) + E2.g (agregação só antes do token e por cerca) + fronteiras 17/18 | F-AGG-1…7, A13 | sim: `m8` 5→0 no pristino; 0→1 no `v3-agg` (diff 9 linhas) |
| **crítico B-2** — checagem 1 é ∃ fora da classificação; 2º oráculo de seção cego à cerca | bloqueia | E2.a (oráculo único) + E2.i M0 | F-1c/d, F-2c | sim: `m3` dele ec=0; `secoes.awk` → REJ l.8 |
| **crítico B-3(i)** — `caixa-exata:` por unidade absolve o 2º grep | bloqueia | E2.d (por segmento) + I2 recíproco intra | F-5f/g/h | sim: `m4` 2→0; `chk5.awk` → REJ seg |
| **crítico B-3(ii)** — célula de evidência (`uok`) absolve indentadas; fora do inventário | bloqueia | E2.g (linha de tabela nunca agrega) + I12 | F-AGG-5 | sim: `m5c` 0→1 |
| **crítico B-4** — 3 isenções da checagem 6 fora do inventário e do §3 | alta | E2.i I13–I18 + §3 (3, 4 explícitas) | F-6f (asseridas de propósito) | sim: `m7` 0 |
| **crítico B-5** — §8 cola 3 saídas, E2.b isenta 1; colagem apodrece com o head | alta | E2.b (colagem autoidentificada por PR, cercada; chk 4 ∪ colagens) + fronteira 19 + §8 regra 9 | F-7c/g/h/i, F-4d | sim: `p-3prs` 3 OK; `-velha` só 701 REJ |
| **crítico B-6** — termo dominante do custo nunca medido | média | E4 custo (dois papéis, fórmula) + §9 R3 + §11 | — | sim: refs 2,66–2,92 s; pré-voo 0,52–0,64 s |
| **crítico B-7** — 3 `\g<1>` literais (e 3 linhas apagadas, pior do que medido) | média | §1.1 A10, E4 item 6 e esta linha do mapa **restaurados do blob v1**; apply v3 só com substituição literal + `grep -c 'g<1>'` = 0 | — | sim: `git show 61302337:<plano>` |
| **planejador v3** — SHA COLADO (`<40><40>` = 80 hex não é SHA) | (achado meu, sobre o ciclo 2) | E2.c (>40 hex → REJ) | F-4c | sim: `m9` 0 REJ; separado 1 |

**O que ESTÁ fechado e este plano PROTEGE (não reabre):** C2-01 (0/51 ao artefato apagado) → [F-0]/[V15] + E4 ausência; guard não
preso ao texto → `--controle` no-ops; C1-01 forma da linha → 33 casos + F-INV(S3); basename → `[B6]`/`[B6b]`/`[B6c]` verbatim; KPI
2× → §7; LIDO 0/107 declarado → inalterado, dono `B-GOV-ATA-CABECALHO`. **Critério de proteção [P-0] v3:** `git diff
34969a81..HEAD -- tests/mandato-refs.test.ts` só tem linhas adicionadas; `git diff 34969a81..HEAD -- tests/mandato-preflight.test.ts`
só tem linhas adicionadas **mais exatamente cinco casos antigos reescritos, por divergência declarada**: dois na FORMA (B-1/B-3) e três na SEMÂNTICA (`[B8a]`/`[B8b]`/`[B8c]`, que encodavam "rotular é afirmar" da v2 — §13.1): `[B1-correto]`
(a linha `  # tests 3058` não cercada passa para dentro da cerca — a forma antiga **encoda o escape B-1**) e `[B5e]` (`caixa-exata:`
passa para o **segmento** da invocação). As propriedades dos dois (bullet+saída+tabela+`###` → 0; `caixa-exata:` isenta) ficam
**testadas**; `grep -c '^test('` só cresce; qualquer outra linha antiga alterada = violação (C3‴ confere pelo diff). ⇄ alterar uma
terceira fixture → vermelho na conferência.
---

## §3 — Cabe num ciclo? SIM. Nada sai por prazo — não há prazo. O que SAI, sai por ter OUTRO DONO (v3: fronteiras por escrito)

**Não há corte** (mantido da v2; A-4). Um ciclo termina quando a junta vota. Dois devs sequenciais, sessões quantas forem, e
≈1–1,3 h de máquina para E4 em background.

**Estimativa de engenharia:** Dev-T — E1 (+15 casos) e E3 (laço de 19 formas × sementes + ≈60 específicos, ≈450 linhas): 1–2
sessões. Dev-S — E2 (≈+130 linhas líquidas: oráculo único, cerca, agregação limitada, token reservado com colagem multi-PR,
tokenizador com >40 hex, segmentos com `caixa-exata:` no segmento, adjacência do `(novo)`, revisão, cabeçalho-unidade): 1 sessão;
E4 + E5: 1 sessão + máquina. Orquestrador: dívidas (1 h). Inspetor confere Dev-T ≠ Dev-S antes do 1º commit.

**Entra:** os 6 `bloqueia` do ciclo 2, 7 ajustes, 3 notas, os 8 achados da rodada 1 e os **7 da rodada 2** do crítico (todos
absorvidos como desenho), o SHA colado (meu), as 5 dívidas do orquestrador, e os mecanismos de §0.5 v3.

**Sai, com dono nomeado — e agora cada fronteira diz POR QUE não fecha sem reconhecer forma ou vocabulário** (o Dev-S abre
`P-GOV-MANDATO-3-FRONTEIRAS` com as fronteiras 9–20; `B-GOV-MANDATO-2` já está na fila, §5.3 l.269):

| # | o que fica de fora | por que é de OUTRO dono (e a medição deste lado) | dono |
|---|---|---|---|
| 9 | conteúdo de `medido por:`/célula (`-`, `n/a`) não verificado | verificar conteúdo = reconhecer comando; F-3s prova simetria | `B-GOV-MANDATO-2` |
| 10 | `_<sha>` não é SHA | partir em `_` mata a checagem 6 para 587 caminhos (medido) | `B-GOV-MANDATO-2` |
| 11 | **sinônimo em prosa** de `approved_head` | detectar afirmação em prosa é forma; **não há remédio form-free** (escrito); F-7f assere OK de propósito | `B-GOV-MANDATO-2` |
| 13 | `###` dentro das seções isento da checagem 3 | exceção (b) do ciclo 2; visível por grep; F-ISO-7 assere de propósito | `B-GOV-MANDATO-2` |
| 14 | existência no disco, não no git | mandatos citam gerados legítimos | `B-GOV-MANDATO-2` |
| 15 | homoglifos/zero-width no token | adversarial; normalização ASCII | `B-GOV-MANDATO-2` |
| 16 | colagem da ferramenta obrigatória (hoje `AVISO`) | quebraria 12/33 fixtures protegidas | `B-GOV-MANDATO-2` |
| **17** | **N afirmações antes de um `medido por:` são ATRIBUÍDAS a esse comando** — o pré-voo não sabe se o comando as produz | separar "reivindicação" de "continuação de prosa" é semântica; o que se garante é atribuição inequívoca (a junta sabe qual comando reexecutar). Medido: `m8-legit-prosa-antes` OK por desenho | `B-GOV-MANDATO-2` (a fronteira que substitui o B-1) |
| **18** | **conteúdo de cerca é SAÍDA por convenção** — afirmações digitadas dentro de cerca sob um `medido por:` não são cobradas (`m8-agrega-cerca` 0 REJ) | distinguir saída colada de prosa cercada é forma/vocabulário; a cerca é a marca **visível** de "isto é saída do comando acima" e a junta reexecuta; cerca sem `medido por:` na unidade → REJ (I19) | `B-GOV-MANDATO-2` |
| **19** | **a colagem é retrato, não histórico** — quando o head anda, a colagem legítima de ontem vira `DESATUALIZADO` | igual à fronteira 6 (proveniência); a mensagem nomeia a causa, e a regra da junta é: REJ cuja única causa é `DESATUALIZADO` num documento escrito para um head anterior **não é defeito do documento** — reexecutar o dogfooding no head certo (`git worktree add` no head do relatório) | `B-GOV-MANDATO-2` |
| **20** | **`caixa-exata:` cobre todas as invocações do MESMO segmento** (um segmento com 2 `grep` e 1 `caixa-exata:` isenta os 2) | o segmento é a resolução da checagem 5; separar 2 comandos no mesmo segmento é reconhecer sintaxe de shell além dos separadores. AVISO conta as invocações isentas | `B-GOV-MANDATO-2` |
| 2r | `Select-String`/`findstr` | a casa usa bash | `B-GOV-MANDATO-2` (fronteira 2, restante) |
| 3, 4 | **nome sem `/` e caminho sem extensão/barra final não são conferidos** (`m7`) — já em `P-GOV-MANDATO-2-FRONTEIRAS` itens 3 e 4, agora **também no inventário** (I13, I14) | pela estrutura são indistinguíveis de `e/ou`, `14/14`, palavras | `B-GOV-MANDATO-2` (vigentes) |
| 5 | drift do JSON do `gh` | fronteira 5 vigente | `B-GOV-MANDATO-2` |
| — | template de ata; linha `approved_head` pelo ritual; retrofit | ritual da junta | `B-GOV-ATA-CABECALHO` |

(A fronteira 12 da v1 e a isenção `nao-rotula:` não existem na v3. A fronteira 6 ganha a colagem — 19 — em vez de ser reescrita.)

**Fronteira de cada drill:** E1 não atravessa a API real · E2/E3 não atravessam sinônimos, veracidade de saída cercada nem
mandatos reais (dogfooding §8; [F-EXT] varia **fronteiras e agregação**) · E4 não atravessa mutantes semânticos ([M-EXT]).

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
  o laço de formas gera casos por construção (19 formas × 4 sementes ∀ × 2 lados ≈ 152, mais S7 28+2) e seria fácil "bater a meta"
  sem cobrir nada. Estimativa: refs 18 → ≥ 33; pré-voo 33 → ≥ 240 (laço ≈152 + S7 30 + ≈60 específicos + F-EOL); total ≈ 275.
  **[F-0]/[V15]:** cada arquivo, com o seu script apagado, passa **0**.
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
#     O ARNES TEM DE SER REPOSITORIO GIT COM AS DEPENDENCIAS DAS FIXTURES (como o §0.2; emenda §12/D-4): [B6] faz `git ls-files`
#     em RAIZ e exige >= 20 rastreados; [B6b] precisa de mobile/flutter_app/lib/core/sync/sync_action_store.dart; [B7b] de
#     docs/revisoes/SAN3/; F-6d de `HEAD:package.json`. Sem isso o guard do PRE-VOO produz FALSOS VERMELHOS (classe A11).
#     (O guard do REFS cria o proprio repo tmp e NAO depende do RAIZ: 33/33 com e sem `git init` — medido pelo planejador.)
T=$(mktemp -d); git -c core.autocrlf=false archive 34969a81 scripts tests src/config mobile/flutter_app/lib/core/sync/sync_action_store.dart docs/revisoes/SAN3 CLAUDE.md package.json | tar -x -C "$T"
cp tests/mandato-*.test.ts "$T/tests/"; ( cd "$T" && git init -q && git -c core.autocrlf=false add -A && git -c user.name=t -c user.email=t@t -c commit.gpgsign=false commit -q -m arnes )
TW=$(cygpath -m "$T")   # C:/… — git.exe/node.exe recusam /c/… com MSYS_NO_PATHCONV=1 (A4)
for f in scripts/mandato-refs.sh scripts/mandato-preflight.sh; do [ "$(git hash-object --no-filters "$TW/$f")" = "$(git rev-parse 34969a81:$f)" ] || echo "ARNES DIVERGE: $f"; done   # caminho ABSOLUTO: o relativo mede o arquivo do worktree (Dev-T, D-4)
node --test --import tsx --test-reporter=tap "$TW/tests/mandato-preflight.test.ts" > vc-pre.tap 2>&1   # 'not ok' == a lista de E3 (85 no head 4ad4ba9f)
node --test --import tsx --test-reporter=tap "$TW/tests/mandato-refs.test.ts"      > vc-refs.tap 2>&1  # 33/33 VERDES por desenho; [D1] e sensivel a PATH (pre-existente) — controle diferencial: rodar tambem no worktree (A11)
# --- bateria completa (Dev-S no fim; Dev-T roda o que existe)
npx prisma generate                 # DATABASE_URL -> Postgres DESCARTAVEL proprio (porta provada)
npm run check
npm run lint
npm test                            # 2x; denominador identico; TAP em ARQUIVO, lido do arquivo
npm run build
npm --prefix frontend run check
npm --prefix frontend run build
node --test --import tsx --test-reporter=tap tests/mandato-refs.test.ts      > refs.tap      # >= 33, 0 fail
node --test --import tsx --test-reporter=tap tests/mandato-preflight.test.ts > pre.tap       # >= 240, 0 fail
bash scripts/mandato-mutantes.sh refs      --jobs 4 | tee mut-refs.txt      # NAO-COBERTOS - equivalentes = 0
bash scripts/mandato-mutantes.sh preflight --jobs 4 | tee mut-pre.txt       # idem
bash scripts/mandato-mutantes.sh preflight --controle              # sonda NAO-COBERTA, no-ops VERDES
# [M-2] historico: os artefatos e guards de 34969a81 -> a lista contem pre l.105/196 e refs l.135/142/153
node scripts/kpi-freeze.mjs --check
node --test --import tsx tests/kpi-dashboard-charts.test.ts
node scripts/sync-agent-agents.mjs --check
node --check Kpis/app.js
python agent-orchestration/controle/gerar-indice-pendencias.py && git diff --stat -- agent-orchestration/controle/pendencias-indice.md
bash scripts/mandato-refs.sh 392 ; echo ec=$?      # VIVO: ec=3 (objeto 7822deaf…, sem linha approved_head) — colada em CERCA, bloco inteiro a partir de '# refs do PR #392'
bash scripts/mandato-refs.sh 393 ; echo ec=$?      # VIVO: ec=3 com os objetos dos ciclos 1 e 2 @ head do PR — colada em CERCA, bloco inteiro (a checagem 7 verifica cada bloco contra o SEU PR)
bash scripts/mandato-refs.sh 387 ; echo ec=$?      # VIVO: ec=3 com 2 objetos — colada em CERCA, bloco inteiro
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
   um caso legítimo é rejeitado, a saída é isenção **inventariada em E2.i** (colagem por bloco autoidentificado, `caixa-exata:` no **segmento** da invocação, `(novo)` — inventário I1–I20; `nao-rotula:` **não existe**) ou falsificação ao planejador — **nunca** um gatilho mais estreito.
7. Nunca tocam ata, corpo de jurado, `.github/`, `.gitattributes`. Nunca `stash`/`clean`/`checkout` alheio/`prune`. Resíduo alheio
   se reporta. Removem o que criaram **pelo nome** (`git worktree remove --force C:/Users/AMP/w-dev?393`, `docker rm -f
   pg-dev?393 redis-dev?393`) e reportam a limpeza §C5 em 1 linha nominal.
8. Toda afirmação numérica do relatório vem com `medido por:` **na mesma unidade** — e o token `approved_head` **só** dentro da colagem verbatim da ferramenta (a checagem 7 nova cobra isso do próprio relatório — inclusive em `medido por: grep …`; **não há grafia que escape — a normalização é alfanumérica (§13 D-S-2)**: escreva "o campo de aprovação do KPI/da ata" ou cole a ferramenta; e **hash de blob/md5 não tem canal de proveniência** (fronteira 22): publique o **veredito** da comparação (`IDENTICO`/`DIVERGE`), não o hash).
9. **Saída colada vai em CERCA; continuação de prosa vai ANTES do `medido por:`** (E2.g) — o pré-voo novo rejeita linha não cercada
   após o comando, e a mensagem diz o contorno. **Revalidação num head posterior:** um relatório escrito para o head H só é
   reexecutado pelo pré-voo **num worktree em H** (`git worktree add --detach C:/Users/AMP/w-xxx H`); REJ cuja única causa é um
   bloco `DESATUALIZADO` num head movido **não é defeito do documento** (fronteira 19) — a cadeira registra a causa e reexecuta no
   head certo.

## §9 — Riscos e rollback (v3)

| # | risco | mitigação | rollback / corte (com dono) |
|---|---|---|---|
| R1 | o laço `FORMAS` rejeita forma **legítima** (over-rejection) | gêmea positiva nas 19 formas; ◐ de E3 separa renderização de defeito | nenhum: forma legítima rejeitada é achado |
| R2 | token reservado rejeita usos legítimos do nome do campo (KPI `approved_head: null`, citação da ata, `grep approved_head`; "approved"/"head" adjacentes) | custos declarados e testados (F-7b/f); contornos na mensagem de REJEITADO | nenhum: uso legítimo novo = fronteira nova com dono |
| R3 | E4 do pré-voo custa **≈12,7 h serial / ≈5,1 h com `--jobs 4`** — MEDIDO pelo Dev-S (184 pontos, guard 531 s N=2, 1,78 s/caso; §13.5); refs ≈35 min. Os ≈1,3 h da v3 eram projeção (A12, 3ª vez) | rodada em **background** lançada pelo orquestrador, linha de base `fail=0` obrigatória (aborta se suja), C2‴ no escopo do §13.3 (controles + refs inteiro + amostra `--only` ≥20% + [M-EXT]) | **nenhum — E4 fica** |
| R4 | só um dev disponível | **sem fallback**: Dev-T ≠ Dev-S é condição de início | o bloco espera |
| R5 | o ramo anda durante o desenvolvimento (13× no ciclo 2; 3× e 1× durante os pareceres) — **e a colagem verificada apodrece com ele (fronteira 19)** | os devs medem o head no início e no fim; a REJ `DESATUALIZADO` nomeia a causa; a junta reexecuta o dogfooding **no head do relatório** | — |
| R6 | `<rev>:<caminho>` e `rev-parse` dependem de `$RAIZ` ser repositório (A11) | fail-closed sem repo; controle diferencial arnês × árvore em `--controle` | nenhum |
| R7 | reintroduzir a classe **na correção** (2× no bloco, 4× no painel, **2× neste plano — v1 e v2**) | os mecanismos v3 com critério executável; **rodadas do crítico esgotadas** → a junta 3 é a única defesa restante: C1‴ recebe os fixtures das duas rodadas **e** a instrução de atacar **juntar** | reprovação → ciclo 4 precedido da auditoria da máquina (§C7.4.4) |
| R8 | suíte lenta (≈240 spawns × 0,6 s ≈ 150 s) | aceitável no CI; `concurrency` se passar de 5 min | nenhum |
| R9 | mandato em CRLF | [F-EOL] | defeito real do script → E2 |
| R10 | E4 mede errado | [M-2] (baseline furada), [M-3] (`--controle` + diferencial), [M-EXT] | conserta-se a E4; nunca matriz narrada |
| R11 | igualdade da colagem falha por EOL/trim | igualdade após trim; [F-EOL] cobre colagem em `\r\n` | achado de E2, não afrouxar |
| R12 | falso-positivo do token em prosa adjacente ("…approved" / "head…") | custo declarado; mensagem nomeia a linha | nenhum |
| **R13** | **a regra "depois do token só cerca" rejeita saída colada NÃO cercada** — é o hábito atual (a própria fixture protegida `[B1-correto]` e o relatório do dev do ciclo 2) | custo declarado no cabeçalho do script ("saída vai em cerca"); a mensagem de REJ diz "linha após `medido por:` fora de cerca — cerque a saída"; **duas fixtures protegidas reescritas na forma, por divergência declarada** ([P-0] v3) | nenhum: é o conserto do B-1; afrouxar reabre o escape |
| **R14** | **atribuição ≠ veracidade** (fronteiras 17 e 18): N afirmações antes do token, ou digitadas dentro de cerca, passam | o mapeamento afirmação→comando é inequívoco; a junta reexecuta; o mandato do orquestrador é lido por três cadeiras que fazem exatamente isso | fronteira com dono, não rollback |
| **R15** | a colagem multi-PR custa uma invocação do refs por bloco (≈2,8 s cada) e depende do `gh` vivo | 3 blocos ≈ 8 s; refs indisponível → REJ nomeando a indisponibilidade (nunca "colagem falsa") | nenhum |

**Rollback global:** os cinco arquivos de código são **novos no bloco** (`A` contra `fc3363e3`); `git revert` do squash devolve a
`main` ao estado de `fc3363e3` para esses caminhos. Sem migração, sem dado.

## §10 — Junta 3 (§C7) — composição por competência, quórum, papéis, e o gatilho de auditoria

**Inelegíveis, conferidos por nome:** como **jurado** — `guardiao-fail-closed`, `medidor-de-cobertura-do-artefato`,
`jurado-mandato-c3b-fronteira-numero-registro` (ciclo 2), `jurado-mandato-c1-prevoo-fail-closed`, `jurado-mandato-c2-pergunta-feita`,
`jurado-mandato-c3-escopo-kpi-registro` (ciclo 1); o orquestrador; o `planejador-mestre`; Dev-T, Dev-S, **Dev-T-3 e Dev-S-2 (§13)**; os devs dos ciclos 1
(`aa051e8cc3eb1c1a0`) e 2 (`a4ed42a5e3a81bdd3`). Como **dev** — o dev do ciclo 2 e o orquestrador. Como **planejador** — C1′, C2′.

**Quórum:** maioria de 3 (§C7.1-ter(b)) — o bloco não toca dinheiro, segurança, permissão nem perda de dado; a C3‴ confere no diff
(`git diff --name-only fc3363e3 HEAD -- src prisma frontend mobile .github` = 0, com controle positivo `-- scripts tests` > 0).
Sem veto individual. **As duas rodadas do `critico-adversarial` estão ESGOTADAS** (rodada 1: 5 bloqueia/2 alta/1 média sobre a v1;
rodada 2: 3/2/2 sobre a v2 — todos absorvidos, com reprodução e protótipo em §0.6(d)/(e)/(f)). **A v3 vai direto ao dev.** A junta 3
é a única defesa restante contra a classe deste bloco: por isso a C1‴ recebe instrução explícita de atacar **juntar** e os fixtures
das duas rodadas, e a C3‴ confere que **cada fronteira do §3 (9–20) está no cabeçalho do script e em `P-GOV-MANDATO-3-FRONTEIRAS`**
— fronteira que só existe no plano é fronteira não declarada.

**Cadeiras — três identidades NOVAS (fábrica), corpos versionados nos dois espelhos ANTES da inspeção:**

| cadeira | identidade (nome sugerido) | competência | itens que julga por EXECUÇÃO própria (nunca com as amostras deste plano) |
|---|---|---|---|
| **C1‴** | `jurado-mandato-c1c-invariancia-de-forma` | propriedade × forma; **fronteiras E agregação**; máquinas fail-closed | [F-EXT]: ≥3 formas que variem a FRONTEIRA (vazia, seção, cerca, EOF) **e ≥3 que JUNTEM** (indentadas após o token; afirmações em cerca — espera OK **de propósito**, fronteira 18; tabela + indentadas; 2 greps no mesmo segmento — espera AVISO, fronteira 20; SHA colado; `## HIPOTESE` em cerca), ≥2 grafias do token; cerca F-8 + 2 variantes próprias; colagem **parcial**, **velha**, **com abuso acima/abaixo/dentro**, **sem cabeçalho** e **para 2 PRs** próprias; F-ISO-*/F-SM-*/F-AGG-* com amostras próprias; **recebe os fixtures das duas rodadas do crítico** (`crit393c/B`, `crit393d/fx`) como amostra mínima e gera as suas; tenta uma isenção não inventariada; **[F-EOL]** |
| **C2‴** | `jurado-mandato-c2c-cobertura-por-mutacao` | cobertura por mutação; arnês isolado; controles | reexecuta a E4 **no escopo do §13.3**: controles completos ([M-3] + diferencial A11), matriz do **refs inteira** (≈35 min), e **amostra `--only`** do pré-voo (todos os NÃO-COBERTOS/equivalentes + ≥20% dos VERMELHOS com semente publicada) contra a matriz publicada **do zero** (linha de base 0; identificada pelos 4 `hash-object`) — divergência é achado; [M-2] histórico; [M-3]; **[M-EXT] ≥10 mutantes próprios fora da tabela** (multi-linha, semânticos); reclassifica os "equivalentes" com fixture própria; 0/N ao artefato apagado; 4 no-ops |
| **C3‴** | `jurado-mandato-c3c-fronteira-numero-registro` | escopo por geração; número; registro; **ordem dos commits** | §4 por laço (diff → declaração); KPI 2× em cluster descartável (porta provada); índice pelo gerador; **`git log`: ordem por PAR de autoria (teste → script): E1/E3 `6c8fb3e8`/`4ad4ba9f` antes de E2/E4 `33356358`/`616fd4fa`, e Dev-T-3 antes de Dev-S-2 — um commit de teste posterior ao script de OUTRO par não viola (§13.2, autorização escrita); nenhum commit tocando `tests/**` e `scripts/**` juntos**; as 4 dívidas do orquestrador por execução (corpo do PR × head; ERRATA em 6 blobs com hash do texto abaixo; `§5.3`; 107); `R-B-GOV-MANDATO-2.md` existe |

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
ciclo 2) **e distintos — condição de início, sem fallback (A-6)**; plano de perda (sem suplente; queda relança a mesma identidade; voto perdido nunca é aprovação; evidência incremental);
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

## §11 — A linha (v3)

**Cabe num ciclo: SIM — 5 entregas em dois devs sequenciais, sem corte (não há prazo), E4 com custo medido por dois papéis
(≈4,2–5,0 h serial, ≈1,0–1,3 h com `--jobs 4`). Fechou por construção, com protótipo executado: JUNTAR (agregação só por prosa
antes do token e por cerca; linha de tabela nunca agrega — `m8` 0→1, `m5c` 0→1), o ∃ da checagem 1 (oráculo único ciente de cerca —
`m3` do crítico → REJ nomeando l.8), `caixa-exata:` por segmento com recíproco intra-unidade e intra-linha (`m4` 0→1), o inventário
completo I1–I19 + 7 máquinas (as três classificações da checagem 6, o oráculo e o `uok` dentro), a colagem autoidentificada e
cercada para qualquer PR (3 blocos reais OK; 1 SHA trocado → só aquele bloco `DESATUALIZADO`), o SHA colado (>40 hex → REJ) e os
três `\g<1>` (linhas restauradas do blob v1, inclusive o item 6 da E4 que tinha sido apagado). Fica como fronteira com dono, por
escrito (§3, 9–20): atribuição ≠ veracidade (N afirmações antes do token; conteúdo de cerca é saída por convenção), sinônimo em
prosa, colagem é retrato quando o head anda, `caixa-exata:` cobre o segmento. Não derrubo nada do crítico. **A v3 está pronta
para o dev sem mais um ataque na medida em que o que sobrou não é defeito escondido: está nomeado, medido e com dono — e a junta 3
recebe os fixtures das duas rodadas mais a instrução explícita de atacar juntar, não só partir.**

## §12 — EMENDA pós-Dev-T (2026-09-27): parecer do planejador sobre as 5 divergências, antes do Dev-S

- **Papel:** `planejador-mestre` · **Fable 5.1** · corpo `.claude/agents/planejador-mestre.md`. É **emenda**, não plano novo: o
  Dev-S herda a v3 **com estas correções**; nada da engenharia muda, só listas, contrato de mensagens e uma linha da E2.
- **Objeto:** relatório `scratchpad/DEV-T-CICLO3.md` (296 l.); head do Dev-T **`4ad4ba9f`** = `origin/chore/mandato-refs-e-preflight`
  (medido; `w-mandato` está em `7ec2576b`, dois commits atrás — é o worktree do orquestrador, reportado). Os dois `.sh` em `4ad4ba9f`
  são **byte-idênticos** aos de `34969a81` (`1ae66019`/`68fe23c9`, conferido por `git rev-parse`). Plano no disco = blob `924ffa2d`.
- **Método:** cada afirmação dele foi **reexecutada** no pristino `1b65dc3c` com fixture minha; onde a minha divergiu da dele, o
  motivo está escrito. Li os testes dele (`C:/Users/AMP/w-devt393/tests/`, só leitura) para saber **o que ele assere**, porque é isso
  que o Dev-S precisa cumprir — não a minha prosa acentuada.

### 12.1 Veredito por divergência

| # | divergência do Dev-T | minha medição | veredito | o que muda |
|---|---|---|---|---|
| **D-1a** F-4a (`..`) VERDE na lista, nasce VERMELHO | `git log <legit>..<fake>` → pristino **ec=0** (já estava no meu §0.3 `range.md`!) | **ACATO — erro da LISTA**, não do teste nem da E2.c. O P-4 estava certo sobre o `..` | lista E3 corrigida |
| **D-1b** F-4b (`.` inicial) VERDE na lista, nasce VERMELHO; "P-4 diz que `.` sai das pontas" | `.<fake>` → **ec=0**; `<fake>.` → **ec=1**. O `limpa()` tira `:`/`-` das duas pontas e `.` **só do fim** | **ACATO — erro da lista e IMPRECISÃO do P-4** ("`.`/`:`/`-` só saem das pontas" lê-se como "das duas"). Corrigido no P-4. **Nenhuma entrega muda**: E2.c já manda tirar o `.` inicial |
| **D-1c** F-ISO-11 VERDE na lista, nasce VERMELHO ("usa `egrep`, mesmo mecanismo do F-5a") | a fixture dele é `sort -ui l && egrep "x" f \| grep -i y g` → pristino **ec=0** (o `-ui` na linha isenta tudo — escapada C1′-4 — e `egrep` está fora da família). A minha fixture (`grep … \` + `-i` na linha seguinte) → **REJ hoje** (verde por desenho); a 1ª versão dela deu ec=0 por artefato **meu** (`\\n` do `printf` virou `\n` literal, classe A2) | **ACATO**: a lista assumiu outra fixture; a dele é válida e melhor (é a escapada real). Vai para VERMELHOS. A variante `grep`-continuação fica como guarda verde opcional | lista E3 |
| **D-1d** F-1e VERDE na lista, nasce VERMELHO | `AVISO … sem unidades` é entrega nova da E2.a | **ACATO — erro da lista** | lista E3; mensagem literal em 12.3 |
| **D-2** F-ISO-5 VERMELHO na lista, é VERDE por desenho | `\|--- suite 3103/3105 ---\|` → pristino **ec=1 rej=2** (pseudo-separador vira unidade; e o cabeçalho, sem separador real, também) | **ACATO — erro da lista**; é guarda de regressão | lista E3 |
| **D-3** 6 casos sem lista; `F-INV S5/cabecalho/neg` é achado de conteúdo | `### nao aparece, medido por: grep "ausente" f` → **ec=0** (controle em bullet → REJ). As checagens **4 e 6 varrem** o `###` (`### li src/zzz/…falso.ts e <fake>` → rej=2); **só a 5 não varre** | **ACATO — achado REAL, ENTRA na E2 deste ciclo** (uma linha: a checagem 5 varre toda linha das seções, inclusive `###`); I7 corrigida ("isenta só da 3"). Os 6 casos vão para VERMELHOS | E2.d, I7, lista E3 |
| **D-4** receita do §8 dá falso vermelho **16/33** no refs "porque `$T` não é repositório git" | **NÃO REPRODUZ para o refs**: receita do §8 tal como escrita (archive + cp, **sem** `git init`), `RAIZ` = arnês em caminho longo do scratchpad → **33/33**; com `git init` → 33/33; worktree → 33/33. O guard do refs cria o próprio repo tmp e não depende do `RAIZ`. O 16/33 dele (com `[D1]` ainda vermelho após `git init`) aponta para **PATH/ambiente da execução dele** (o próprio `[D1]` é sensível a PATH) — classe A11, mas com outra variável | **ACATO A EMENDA, CORRIJO O DIAGNÓSTICO.** A receita do §8 **está** errada — para o **pré-voo**: [B6] faz `git ls-files` em `RAIZ` e exige ≥20 rastreados, [B6b] precisa do `.dart`, [B7b] de `docs/revisoes/SAN3/`, F-6d de `HEAD:package.json`; o §0.2 provia tudo isso e o §8 não. **Medido:** o guard do pré-voo de `4ad4ba9f` no arnês da receita (sem git, sem dependências) dá **211/87** contra **213/85** no worktree (o número do próprio Dev-T em T9): **3 falsos VERMELHOS** (`[B6]` sem `git ls-files`, `[B6b]` sem o `.dart`, `[B7b]` sem `docs/revisoes/SAN3/`) **e 1 falso VERDE** (`[F-6c]`: sem `package.json` no arnês, o `d="${c##*:}"` do script velho não acha o alvo, rejeita, e o caso passa pela razão errada — A11 no sentido perigoso; medido por `comm` entre os TAPs do arnês e do worktree). Receita reescrita (git init + dependências + `hash-object` por caminho **absoluto**, a armadilha irmã que ele achou) | §8 |
| **D-5** dois defeitos dele, corrigidos antes do commit | `[F-MIN]` sobrevivia ao artefato apagado (lia o array); `[F-EXT/juntar-2]` usava `;` (separador) e media o oposto do título | **Registro como classe A14 em §1.1** (sonda que passa por outra causa). É o C2-01 do ciclo 1 numa escala menor — e foi pego pelo controle certo (matriz de ausência), não por releitura | §1.1 |

**Não derrubo nenhuma divergência; corrijo um diagnóstico (D-4).** Cinco acatadas; uma com diagnóstico refeito por execução.

### 12.2 Duas hipóteses dele, respondidas
- **"O Dev-S vai precisar emitir `cerca aberta` e `saida colada sem comando` como texto literal."** — **Sim, e mais**: a tabela 12.3 fixa
  **todas** as strings contratuais em **ASCII** (o script é ASCII; a minha prosa acentuada não é contrato). Regex dele que tolera
  acento (`ap[oó]s`, `sa[ií]da`) continua valendo; o script emite sem acento.
- **"`[F-SM-4]` espera 2 onde o protótipo mediu 1 (`m5b`)."** — **Ele tem razão.** O contrato E2.g diz "linha de tabela nunca agrega";
  o meu protótipo `pre.v3-agg.sh` só travava a agregação quando a **célula estava cheia** (atalho de implementação, §0.6(f)). Com
  célula vazia + 1 indentada: **2** REJ (a linha, e a unidade nova). E2.g corrigida com a frase explícita.

### 12.3 CONTRATO DE MENSAGENS (literal, ASCII) — o que os testes do Dev-T asseram e o Dev-S TEM de emitir

Extraído dos `assert.match` do guard em `4ad4ba9f` (contagem = nº de casos que asserem). Prefixo de 10 colunas como no ciclo 2
(`REJEITADO  `, `AVISO      `, e o novo `COLAGEM    `). Sem acento em nenhuma mensagem do script.

| checagem | mensagem (fragmento literal exigido) | casos |
|---|---|---|
| cerca (E2.a) | `REJEITADO  cerca aberta desde l.N (<char> x<k>) sem fechamento ate o fim do arquivo` — fragmento asserido: **`cerca aberta`** | 6 |
| chk 1 (E2.a) | `REJEITADO  falta a secao '## HIPOTESE'` / `'## MEDIDO'` + quando engolida: ` — a unica ocorrencia esta DENTRO de cerca, l.N` — fragmento: **`DENTRO de cerca`** | 3 |
| chk 1 (E2.a) | `AVISO      secao HIPOTESE sem unidades` — fragmento: **`AVISO` … `sem unidades`** (regex `AVISO[^\n]*sem unidades`) | 1 |
| chk 2 | `REJEITADO  linha(s) de conteudo fora de MEDIDO/HIPOTESE:` (mantida) | 2 |
| chk 3 (E2.g) | `REJEITADO  unidade de MEDIDO sem 'medido por: <comando>' — l.N: <linha>` (mantida) **+ sufixo quando a unidade nasceu depois do token:** ` (linha apos o comando fora de cerca: saida colada vai em cerca; continuacao de prosa vai ANTES do 'medido por:')` — fragmento: **`apos o comando`** | 3 |
| chk 3 (I19) | `REJEITADO  saida colada sem comando — l.N: cerca numa unidade sem 'medido por:'` — fragmento: **`saida colada sem comando`** | 1 |
| chk 3 (HIPOTESE) | `REJEITADO  unidade de HIPOTESE sem 'derruba com:` (mantida) | 1 |
| chk 4 | `REJEITADO  SHA '<sha>' nao esta na saida de mandato-refs.sh N (... SHA VELHO ...)` (mantida) | 2 |
| chk 4 (E2.c) | `REJEITADO  corrida hexadecimal de N caracteres (SHAs colados?) — l.N` — fragmentos: **`corrida hexadecimal`** e o **N** (ex.: `80`) | 1 |
| chk 4 | `REJEITADO  o mandato cita SHA mas nao recebeu o numero do PR` (mantida) | 1 |
| chk 4/7 | `REJEITADO  referencias indisponiveis (mandato-refs.sh ec=1)` (mantida) | 1 |
| chk 5 | `REJEITADO  invocacao de grep/rg SEM -i (...) — l.N: <segmento>` (mantida; agora por segmento) + `AVISO      caixa-exata: isenta N invocacao(oes) sem -i — l.N` | — |
| chk 6 | `REJEITADO  caminho citado nao existe: <caminho>` / `diretorio citado nao existe` (mantidas) | 3 |
| chk 7 (E2.b) | `REJEITADO  l.N: token reservado approved_head fora da colagem da ferramenta` — fragmentos: **`token reservado`** e **`fora da colagem`** (os dois) | 6 / 5 |
| chk 7 (E2.b) | `REJEITADO  l.a-b: bloco '# refs do PR #N' NAO bate com a saida atual de mandato-refs.sh N (parcial, editado ou DESATUALIZADO: o head andou?)` — fragmentos: **`NAO bate com a saida atual`**, **`DESATUALIZADO`**, e o **`#N`** do bloco | 3 |
| chk 7 (E2.b) | refs indisponivel para o N de um bloco: `REJEITADO  l.a-b: referencias indisponiveis para #N (mandato-refs.sh ec=1) — nada foi verificado` — fragmento: o **`N`** (ex.: `666`); **nunca** a palavra `falsa` | 1 |
| chk 7 (E2.b) | `AVISO      sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)` — fragmento: **`sem colagem`**; **ausente** quando há bloco verificado | 4 |
| chk 7 (E2.b) | **`COLAGEM    l.a-b: refs do PR #N confere com a saida atual`** — sinal positivo (o Dev-T ainda não o assere; a junta usa no dogfooding) | 0 |
| saída | `PRE-VOO OK — <arquivo>` / `PRE-VOO REJEITOU N item(ns). O mandato NAO sai.` (mantidas) | 5 |

**Regra para o Dev-S:** estas strings são **contrato**; se uma checagem precisar de mensagem que não está aqui, ele **acrescenta**
sem alterar as existentes, e reporta. Alterar uma existente é divergência (§8 regra 1).

### 12.4 O que muda no plano por esta emenda (todas as edições, por âncora)
1. **§0.4 P-4** — precisão: `:`/`-` saem das duas pontas; `.` só do fim.
2. **E2.a** — AVISO de seção vazia com prefixo e literal ASCII.
3. **E2.b** — bloco verificado é saída da ferramenta: isento das checagens **4, 5, 6 e 7**; SHAs dele na proveniência; linha `COLAGEM`.
4. **E2.d** — a checagem 5 varre **toda** linha das seções, inclusive `###` (D-3, achado de conteúdo).
5. **E2.g** — linha de tabela nunca agrega, **com célula cheia ou vazia** (`m5b` = 2 REJ).
6. **E2.i I7** — isenção do `###` limitada explicitamente à checagem 3.
7. **E3** — lista de vermelho-controle corrigida (+F-4a/b, F-ISO-11, F-1e, F-7h/i, F-EOL/colagem, F-EXT/juntar-1/2, F-INV S5/cabecalho/neg
   → VERMELHOS; F-ISO-5 → VERDES) com o **medido**: 298/85/0 sobreviventes; refs 33 verdes com `m021`/`m025`/`m018` cirúrgicos.
8. **§8** — receita do vermelho-controle: arnês **com** `git init` + dependências das fixtures + `hash-object` por caminho absoluto.
9. **§1.1 A14** — sonda fraca (passa/cai por outra causa).

**O Dev-S pode começar** com a v3 + esta emenda: os testes dele já estão no head; a E2 tem contrato de mensagens fechado; o único
item que entrou (checagem 5 em `###`) é uma linha e já tem o caso vermelho esperando.

## §13 — EMENDA pós-Dev-S (2026-09-28): o `[B8b]`, os dois papéis de correção, a reexecução da C2‴ e as divergências do Dev-S

- **Papel:** `planejador-mestre` · **Fable 5.1**. É emenda: engenharia inalterada; decide-se o que os pareceres deixaram aberto.
- **Objeto:** head `b757e278` (resolvido por `bash scripts/mandato-refs.sh 393`; `w-mandato` limpo em `b757e278` = origin); os 4 artefatos
  no head: `scripts/mandato-refs.sh` `474c7521…`, `scripts/mandato-preflight.sh` `3ff7d78c…`, `tests/mandato-refs.test.ts` `f4b6d721…`,
  `tests/mandato-preflight.test.ts` `20d60ca2…` (blobs por `git rev-parse HEAD:<caminho>`). Relatório do Dev-S: `scratchpad/DEV-S-CICLO3.md`.
- **Método:** cada decisão abaixo cita **a linha do plano que decide** e, onde há execução, o comando e a saída (script do head sobre
  fixtures minhas; guard do head só por leitura de código, nunca editado).

### 13.1 (i) `[B8b]` × `[F-EOL/s7-neg]` — quem está certo, pelo TEXTO da v3 (transcrição, não autorrevisão)

**Fato reproduzido:** os dois chamam `mandato()` com o mesmo corpo (`- approved_head: \`SHA_A\` medido por: true`), PR `393` e shim
`REFS_LIDO_A` (l.390 e l.1565 do guard); o nome só vira nome de arquivo (l.44-48). Insumo idêntico → veredito único, por construção.

**O texto decide, e decide pelo `s7-neg`:** l.21 ("`approved_head` vira TOKEN RESERVADO"), l.24 ("a única via de o `approved_head`
aparecer num mandato é a colagem verbatim"), l.525 (E2.b: "TOKEN RESERVADO (v3: documento inteiro …)"), **E2.b [F-7a]: "as 5 formas de
parágrafo único … → 10/10 REJ nomeando a linha, sob QUALQUER shim (LIDO, ND, AUSENTE)"**, l.1007 (regra 8), §12.3 l.1158 (mensagem
literal). `[B8b]` assere que o rótulo em item de lista **sob LIDO com o mesmo SHA é aceito** — é o critério **da v2** ("rotular é afirmar",
E2.b v2 [F-7b]), **revogado pela v3**. **Veredito: `[B8b]` está ERRADO; `s7-neg` está certo.** Não há buraco na E2; **há um buraco no
[P-0] v3**: ele nomeou duas fixtures antigas que encodavam semântica revogada (`[B1-correto]`, `[B5e]`) e **não nomeou `[B8a]`/`[B8b]`/`[B8c]`**
— os três encodam "rotular é afirmar" (a v2), não só o `[B8b]`.

**E o que o script do head faz com os três (medido — é isto que muda o escopo):**
```
fixture unica `- approved_head: <SHA_A> medido por: true`, PR 393
shim ND       -> REJEITADO l.3: token reservado ... fora da colagem  +  REJEITADO l.3: o mandato rotula <SHA_A> ... mas a ferramenta diz NAO DETERMINAVEL   (2 REJ)
shim LIDO-A   -> REJEITADO l.3: token reservado ... fora da colagem                                                                                      (1 REJ)
shim LIDO-B   -> REJEITADO l.3: token reservado ... fora da colagem  +  REJEITADO l.3: ... mas a ferramenta LEU <SHA_B>                                   (2 REJ)
scripts/mandato-preflight.sh (head): l.315 function rotulo_ah · l.397 · l.552 (token) · l.570/574 (mensagens velhas) · l.307 do cabecalho: "do ciclo 2, que continua de pe (o token reservado e uma camada ACIMA dele, nao um substituto)"
```
O Dev-S **manteve o detector por linha do ciclo 2** (`rotulo_ah`) ao lado do token reservado — declarado no cabeçalho do script, **não no
relatório**, e **contra a E2.b** ("substitui 'rotular é afirmar'"). Consequências: `[B8a]`/`[B8c]` ficam verdes pela mensagem **velha**; a mesma
linha recebe **2 rejeições**; e o script carrega uma **máquina de forma fora do inventário** (E2.i não a lista) — a classe que a rodada 2 do
crítico atacou (B-2/B-3). É redundante **por construção**: tudo o que `rotulo_ah` pega já foi pego pelo token (a saída acima prova: sob
LIDO-A só o token fala). **Decisão: sai.** É `bloqueia` se a junta o encontrar; por isso fecha-se **antes** dela, por dois papéis:

| papel | o que faz | vermelho-controle (por PROPRIEDADE, não por forma) |
|---|---|---|
| **Dev-T-3** (teste) | reescreve **`[B8a]`, `[B8b]`, `[B8c]`** para a semântica v3: o mesmo corpo sob **ND, LIDO-A e LIDO-B** → `status 1`, **`rejeicoes === 1`**, mensagem `token reservado` **e** `fora da colagem`, e `doesNotMatch(/rotula .* como approved_head/)`. Um 4º caso **[B8d]**: o mesmo rótulo em **tabela** e em **prosa** sob LIDO-A → o **mesmo** veredito (é a propriedade "o estado e a forma são irrelevantes") | contra o script de hoje: `[B8a]`/`[B8c]` **VERMELHOS** (2 REJ e a mensagem velha presente); `[B8b]` VERDE; `[B8d]` VERDE. Renomear fixture não muda nada disso — o insumo é o mesmo byte |
| **Dev-S-2** (script) | **remove** `rotulo_ah`, `EST7`, `LIDOSHA` e as duas mensagens velhas (l.315-, l.397, l.556-577); corrige o cabeçalho (l.307): o token **substitui**; o AVISO de ec=3 da checagem 4 **fica** (é da checagem 4) | depois: `# fail 0` nos 298 **e** o documento com rótulo em item de lista sob LIDO **continua `ec=1`** com **1** REJ — `bash scripts/mandato-preflight.sh <fixture> 393` com o shim LIDO-A, saída colada. E4 do pré-voo **re-baseline do zero** (13.5) |

**O ciclo escorrega, e é honesto dizer:** Dev-T-3 → Dev-S-2 → E4 do zero → junta. Não há prazo que justifique o lado barato (deixar o
detector velho e mudar só o `[B8b]`): seria manter uma máquina de forma que o plano passou dois ciclos a eliminar.

### 13.2 (ii) Dev-T-3 — nome, escopo e a AUTORIZAÇÃO por escrito do commit de `tests/**` depois de `scripts/**`

- **Identidade:** `dev-t3-mandato-b8-refs` — **nova**, Opus 5, só `tests/**`; inelegíveis para o papel: Dev-T (`4ad4ba9f`), Dev-S (`33356358`…),
  orquestrador, C1′/C2′/C3″, planejador. **Inelegível como jurado** depois (§10 atualizado).
- **Escopo do diff (a C3‴ confere):** em `tests/mandato-preflight.test.ts`, **só** os hunks de `[B8a]`/`[B8b]`/`[B8c]` + o `[B8d]` novo; em
  `tests/mandato-refs.test.ts`, **só** adições (13.4: V16–V19). Qualquer outra linha antiga alterada = violação do [P-0].
- **AUTORIZAÇÃO (§10 C3‴, "testes antes de script"):** a ordem é **por PAR de autoria**, não global: E1/E3 (`6c8fb3e8`, `4ad4ba9f`) precedem
  E2/E4 (`33356358`, `616fd4fa`) — conferido no `git log` do head; e **Dev-T-3 precede Dev-S-2**, o par da correção. Um commit de teste
  posterior ao script de **outro** par **não viola** o mecanismo 1 (é o teste chegando antes do **seu** script). Sem esta linha a junta
  produziria um `bloqueia` **fabricado pelo processo** — classe A8/A13 da §1.1 — e dispararia a auditoria da máquina por artefato.
- **Prova de fechamento (por propriedade):** (1) `# fail 0` em 298 e 33+; (2) o vermelho-controle de 13.1 nos dois sentidos; (3) `git diff
  4ad4ba9f..<Dev-T-3> -- tests/mandato-preflight.test.ts` toca só os 4 hunks nomeados; (4) matriz de ausência 0/298 e 0/33+ (mantida).

### 13.3 (iii) Reexecução da E4 pela C2‴ — escopo decidido

**Decisão: controles completos + matriz do refs completa + AMOSTRA dirigida do pré-voo; a rodada completa do pré-voo é do orquestrador,
em background, e entra na ata se terminar.** Justificativa: a pergunta da cadeira é "*a ferramenta mede honestamente e a matriz publicada é
reproduzível?*". A ferramenta é determinística; o que falsifica essa pergunta são (a) os controles ([M-3]: sonda NÃO-COBERTA, no-ops
VERDES, diferencial arnês × árvore — os três já acharam defeito **na própria E4**), (b) uma amostra cujos vereditos **batem** com a matriz, e
(c) mutantes que a ferramenta **não gera** ([M-EXT]). Reexecutar 5 h de pré-voo repete o (b) sem acrescentar poder de falsificação — e o
bloco já perdeu **quatro** instâncias de agente por queda; uma cadeira que passa 5 h num job é uma cadeira que cai. **Escopo exigido:**
1. `bash scripts/mandato-mutantes.sh refs --controle --jobs 4` **inteiro** (≈35 min medidos) — `N/K/NAO-COBERTOS` têm de bater com a matriz
   publicada **do head** (13.5); divergência = achado.
2. `bash scripts/mandato-mutantes.sh preflight --controle` (só os controles) **+ `--only` sobre**: **todos** os NÃO-COBERTOS e equivalentes
   declarados na matriz publicada, **+ ≥ 20% dos VERMELHOS** sorteados com semente publicada na ata, + os 5 pontos históricos do §0.3
   ([M-2]: pré-voo 105/196 e refs 135/142/153 do `34969a81`).
3. **[M-EXT]** ≥ 10 mutantes próprios fora da tabela de operadores (multi-linha, semânticos), no pré-voo **e** no refs.
4. Diferencial arnês × árvore em **cada** rodada (A11), e a linha de base **fail=0** conferida antes de ler qualquer cor (13.5).

### 13.4 (iv) Os 5 não-cobertos do `refs` — ganham teste AGORA (Dev-T-3), e o l.379 é o primeiro

| ponto (matriz `…-mutantes.md`) | o que é | caso novo (Dev-T-3, `tests/mandato-refs.test.ts`) | ⇄ mutante que o deixa vermelho |
|---|---|---|---|
| **l.379** `if LIDO && -n MERGE && MERGE != AH` — o AVISO "merge commit != approved_head" | **o erro que originou o bloco** (o par que o orquestrador trocou duas vezes) | **[V16]** PR **MERGED** (shim: `mergeCommit` = S6) com ata APROVADA `approved_head` = S1 ≠ S6 → stdout contém `AVISO: merge commit != approved_head`; controle: `mergeCommit` = S1 → **sem** o AVISO | `-n` → `-z` (o mutante da matriz) e `!=` → `=` |
| l.115 `ver()` — `command -v … \|\| parado "falta '$1' no PATH"` | dependência ausente vira PARADO | **[V17]** `MANDATO_GH=nao-existe-8877` (não é arquivo) → ec=1, stderr `falta 'nao-existe-8877' no PATH`, stdout vazio | `\|\| parado` → `\|\| true` |
| l.116/119 `ghc()`/`[ -f "$GH_BIN" ]` — shim por arquivo × comando | **equivalente no Windows/MSYS** (arquivo com shebang executa direto) — discriminável só onde o bit `x` manda | **[V18]** shim gravado **sem** `chmod` → o pristino invoca `bash <arquivo>` e funciona; o mutante `-d` tentaria executar direto e falha — **`test.skip` em `win32`, declarado** (fronteira 23, §3) | `-f` → `-d` (roda no CI ubuntu) |
| l.160 `git rev-parse --git-dir \|\| parado "nao estou dentro de um repositorio git"` | fora de repositório | **[V19]** `cwd` = `mkdtemp` **sem** `git init` → ec=1, stderr `nao estou dentro de um repositorio git`, stdout vazio | `\|\| parado` → `\|\| true` |

`P-GOV-MANDATO-3-MUTANTES-REFS` fecha quando a matriz do refs reexecutada no head da correção der **NAO-COBERTOS = 0** (ou 1, o l.116/119,
**declarado equivalente em win32** com o [V18] verde no CI ubuntu).

### 13.5 (v) E4: custo real, linha de base e "no head" — ratificado

- **Custo, medido pelo Dev-S e ratificado:** pré-voo **184 pontos**, guard **531 s** (N=2: 514/548 — **1,78 s/caso**, ≈3,7× o meu 0,48 s: o
  laço de formas e a colagem por PR fizeram cada caso custar mais), ≈86 mutantes rodando guard → **≈12,7 h serial / ≈5,1 h com `--jobs 4`**;
  refs ≈35 min com `--jobs 4`. Os meus ≈1,3 h eram **projeção** com unitário velho e ≈85 pontos — **A12, terceira vez, contra mim**; corrigido
  em E4/§9 R3. **Não há corte** (§3 mantido): a rodada roda em **background**, lançada pelo orquestrador, e a C2‴ faz 13.3.
- **Os 14 pontos medidos pelo Dev-S foram com `LB_FAIL=1`** (`[B8b]` vermelho na base): um mutante que só inverta a checagem 7 sai VERDE
  falso. **Ratificado: a matriz publicada do pré-voo é DESCARTADA e a rodada roda do ZERO, com linha de base `fail=0` nos dois guards,
  depois do Dev-S-2** (13.1). A ferramenta **aborta** se a linha de base não for 0 (item novo do contrato E4: `LB_FAIL != 0` → `ec=2`,
  "linha de base suja — corrija o guard antes de medir"). ⇄ mutação: remover o abort → a matriz publica cobertura falsa → [M-3] vermelho.
- **"E4 no head" define-se pelos `hash-object` dos 4 artefatos** (`scripts/mandato-{refs,preflight}.sh`, `tests/mandato-{refs,preflight}.test.ts`),
  gravados no cabeçalho de `…-mutantes.md`, **não pelo SHA do head do PR** — o head vai andar (registro, KPI, e a integração do #394, que
  conflita em `decisoes.md`). **Integração por MERGE, nunca rebase**: rebase apagaria `4ad4ba9f`, `616fd4fa`, `1466c7d9` e a ordem por par que a
  C3‴ confere. A C2‴ confere a matriz contra os 4 blobs, não contra o SHA.

### 13.6 (vi) E5 — quem abre `P-GOV-MANDATO-3-FRONTEIRAS`

É entrega do **papel Dev-S** (§4: `pendencias.md` está no permitido do Dev-S; §3 l.839 e E5 l.751 mandam abrir). O Dev-S não a abriu.
**Dev-S-2** (`dev-s2-mandato-registro`, identidade nova; **script**: só a remoção de 13.1 e o abort de 13.5; **registro**: o resto) abre
`P-GOV-MANDATO-3-FRONTEIRAS` (BAIXA, dono `B-GOV-MANDATO-2`) com as fronteiras **9–23** (as de §3 + 21, 22 e 23 desta emenda), **depois** da
E4 do zero, junto com: fechar `P-GOV-MANDATO-3-B8B-CONTRADICAO` (teste de encerramento = 13.1) e `P-GOV-MANDATO-3-MUTANTES-REFS` (13.4);
reescrever `P-GOV-MANDATO-3-MUTANTES-PREFLIGHT` como "matriz publicada do zero em `<hash dos 4 artefatos>`" ou mantê-la ABERTA com o log
da rodada se ela não terminar; KPI re-baseline (**`backend_tests` reexecutado no head da correção, N=2**); emenda ciclo 3 no comando; trilha.

### 13.7 (vii) As 5 divergências do Dev-S — veredito de cada

| # | divergência | medição | veredito |
|---|---|---|---|
| D-S-1 | `[B8b]` × `s7-neg` | 13.1 | **acatada** — `[B8b]` errado; e o detector velho sai |
| D-S-2 | regra 8 do §8 morta: `approved_h[e]ad` cai na normalização | reproduzido pelo Dev-S (mesma REJ nas duas grafias) — e **por desenho**: a normalização é alfanumérica, logo **nenhuma grafia escapa** | **acatada**: regra 8 reescrita — o contorno é **semântico** ("o campo de aprovação do KPI/da ata"; sinônimo é a fronteira 11 por construção) ou a colagem |
| D-S-3 | checagem 4 sem canal de proveniência para hash de blob/md5 | blob = 40 hex, indistinguível de commit; md5 = fronteira 8 vigente | **fronteira 22 com dono `B-GOV-MANDATO-2`**: o contorno do Dev-S (publicar o **veredito** da comparação, não o hash) vira **regra do §8**; canal novo (`blob:<hash>`) é escopo novo |
| D-S-4 | sonda do §E4.6 destrói a linha de base (`[ -n … ] \|\| parado` dispara com a variável ausente) | `-n` de vazio é falso → `parado` — o pristino aborta | **acatada — erro meu de polaridade**: E4 item 6 passa a `[ -z "$SONDA_INEXISTENTE" ] \|\| parado "sonda"`; o Dev-S entregou a polaridade certa |
| D-S-5 | I2 `caixa-exata:` só isenta **dentro** das crases | reproduzido: `` `grep -c X f  # caixa-exata: motivo` `` → AVISO + OK; declaração **fora** das crases → REJ. A crase é separador de segmento (E2.d): é o contrato | **fronteira 21, declarada com contorno**: a declaração vai **dentro do mesmo segmento**, como **comentário de shell** ao fim do comando (`# caixa-exata: <motivo>`) — legítimo e visível; F-5g/h continuam valendo |
| (D-S-6) | custo do guard 2,5–3,7× o do plano | 531 s medido (N=2) | **acatada** — 13.5 |

**Fronteiras novas desta emenda (para `P-GOV-MANDATO-3-FRONTEIRAS`):** **21** `caixa-exata:` só no mesmo segmento (contorno: comentário
dentro das crases) · **22** hash de blob/md5 sem canal de proveniência (contorno: publicar o veredito) · **23** `[V18]` equivalente em win32
(discrimina só no CI ubuntu).

**Sucessão:** Dev-T-3 primeiro (13.2), Dev-S-2 depois (13.1/13.6), E4 do zero em background (13.5), inspetor, junta com a C2‴ no escopo 13.3.

---

*Limpeza §C5 do planejador (v1–v3, 1 linha):* removidos pelo nome o worktree `C:/Users/AMP/w-plan393c`, `scratchpad/plan393c/{H,R,mut,parts}`,
o repo-sonda `plan393c/R3`, o shim `plan393c/mut3` e `plan393c-npmci.log`; **mantidos como evidência declarada**: `plan393c/proto/` (`ah.awk` v1, `fence.awk`,
`reserved.awk` v2, `reserved3.awk`, `secoes.awk`, `chk5.awk`, `pre.pristino.sh`, `pre.v2-*.sh`, `pre.v3-agg.sh`, `tool*.txt`),
`plan393c/fx`, `fx2`, `fx3`, `fx4`, `fx5` (fixtures de §0.3/§0.6/§12/§13), `plan393c/arnes8` (arnês da receita do §8, D-4) e `plan393c/v2`, `v3`, `v4` (partes + `apply*.py`); nenhum rastreado tocado; resíduo
alheio (`b04a`, `b11`, `gov-descuido`, `gov-elenco`, `w-mandato` com ` M .agents/agents/*.md` fantasmas, `w-teto`, `crit393c/`,
`crit393d/`, `TEMPLATE-J-ata.md`) só reportado. Base viva nunca alvo.

---

## §14 — EMENDA pós-fábrica (2026-09-28): a `main` andou (#394), as divergências que a fábrica achou ao escrever as três cadeiras, a sonda real, o KPI pós-integração e a ordem dos próximos passos

- **Papel:** `planejador-mestre` · **Fable 5.1** (rodando como `general-purpose` porque o diretório de agentes da sessão está velho; corpo lido de `e4aa7592:.claude/agents/planejador-mestre.md`, blob `151bf048` = o da `origin/main`; md5 EOL-neutro `4c912f69a93f07b14d8fd1c49539c778`). É emenda: engenharia inalterada; decide-se o que a fábrica deixou em aberto e o que a `main` mudou. Errata de linha anterior vive **aqui**, citando a linha.
- **Objeto:** head `e4aa7592` (`git -C C:/Users/AMP/w-mandato rev-parse HEAD` = `origin/chore/mandato-refs-e-preflight` = `gh pr view 393 --json headRefOid`; PR OPEN, rascunho, `mergeStateStatus DIRTY`). `origin/main` = `b3f0af5f` (#394; pai `fc3363e3`); `git merge-base origin/main HEAD` = `fc3363e3`. Os 5 artefatos, por blob, **idênticos** em `c32f77b5` e `e4aa7592` (`git ls-tree`): `scripts/mandato-refs.sh` `474c7521` · `scripts/mandato-preflight.sh` `faa408c8` · `scripts/mandato-mutantes.sh` `37549262` · `tests/mandato-refs.test.ts` `4a653b77` · `tests/mandato-preflight.test.ts` `3d875a54`; nenhum existe em `b3f0af5f` (`git ls-tree b3f0af5f -- <os 5>` vazio).
- **Método:** cada decisão cita a linha do plano que decide e, onde há execução, o comando e a saída — experimentos no **meu scratchpad**, nunca em worktree alheio (`w-e4`, `w-devs2`, `w-mandato` só lidos; nenhum worktree novo foi necessário). Corpos lidos de `e4aa7592:.claude/agents/especialistas/jurado-mandato-c{1c,2c,3c}-*.md`. Evidência incremental: `scratchpad/PLANO-393-S14.md`. Nenhum SHA digitado. Armadilha medida: neste Bash, `git show origin/main:<caminho>` falha sem `MSYS_NO_PATHCONV=1` (o `/…:` vira lista de caminhos — `origin\main;…`); `git cat-file -p <sha>:<caminho>` funciona; os corpos já mandam `export MSYS_NO_PATHCONV=1` na 1ª linha.
- **Insumo do orquestrador, acatado (17:2x, do porteiro do #394 — `scratchpad/PORTEIRO-394.md` R2/R5/§5-bis/§8):** o backfill do #394 vai num **PR de registro** (precedente #382, `1b8319f9`), que é o **próximo merge**, antes de o #393 integrar — para o #393 integrar uma vez só (14.11).

### 14.1 (A1) Gatilho de auditoria — o §10 l.1078 alinha-se ao texto vigente (T-24)

**Texto vigente** (`b3f0af5f:CLAUDE.md` §C7.4 item 4, l.419-429, e `b3f0af5f:agent-orchestration/controle/decisoes.md` l.2713-2719, T-24 — medido por `git cat-file -p` + `grep -n`): *"Conta o `bloqueia` que reprova o ciclo 3 — o `pre-existente` não reprova (§C7.1-ter(a)) nem abre ciclo 4"*; e o **Efeito** da T-24, literal: *"reprovação sem achado `bloqueia` (ex.: 'não consigo medir') abre o ciclo 4 e, pelo gate, também exige a auditoria."*

**Decisão (emenda o §10 l.1078):** onde está *"se a junta 3 produzir achado `bloqueia`"* leia-se **"se a junta 3 REPROVAR — por `bloqueia` `dentro-do-bloco`, ou por qualquer reprovação sem `bloqueia` (ex.: 'não consigo medir' = REPROVADO); achado `pre-existente` não reprova nem abre ciclo 4"**. O que dispara a auditoria é a **reprovação do ciclo 3**, não a gravidade do achado. Distinção que os corpos já carregam: cadeira que **cai** sem votar não reprova (voto perdido nunca é aprovação nem reprovação; relança-se a mesma identidade); cadeira que **vota** "não consigo medir" reprova e abre ciclo 4 **com** auditoria.

**Corpos:** os três remetem ao texto da `origin/main` como o que rege o gatilho (c1c l.83-84; c2c l.105; c3c l.71) — **ratificado**. O resumo *"se a junta 3 produzir `bloqueia`, antes de qualquer ciclo 4 audita-se"* (c1c l.358-360; c2c l.342-344; c3c l.471-473) é mais estreito que a T-24 → **ERRATA E-1** (14.13).

### 14.2 (A2) Fronteiras — onde vão 21, 22, 23 e a nova 24; os blobs estão CONGELADOS pela identidade da matriz

**Fato medido (cabeçalho de `scripts/mandato-preflight.sh`, blob `faa408c8`, l.1-117 — `grep -n -i` por número e por conteúdo):** por número estão 4, 10, 11, 16, 17, 18, 20; por conteúdo também 13 (l.107), 21 (l.69: *"`caixa-exata:` isenta as invocacoes DO SEGMENTO QUE O CONTEM"*) e 19 em parte (l.94 nomeia `DESATUALIZADO: o head andou`, não a regra da junta); **ausentes** 9 (`n/a`: 0 linhas), 14 (`disco`: 0), 15 (`homoglif|zero-width`: 0) e 22 (`md5|blob|hash`: 0). `scripts/mandato-refs.sh`: `grep -i fronteira` = 0. A 12 não existe (§3 l.863); a 23 é do **guard** do refs (`tests/mandato-refs.test.ts` l.780-790), não de script nenhum.

**Decisão:**
1. **Os 5 blobs ficam CONGELADOS da rodada E4 até o voto da junta 3** — não por custo: a matriz é **indexada por número de linha** do artefato (ferramenta l.143-148; `--only` l.149-157). Qualquer edição de cabeçalho, mesmo só comentário, desloca todas as linhas e a matriz publicada deixa de ser reproduzível no blob novo (o item 1 da C2‴ ficaria vermelho, **e com razão**). Exceção única: `tests/mandato-refs.test.ts` (Dev-T-4, 14.4) — o guard não é indexado, e a matriz do refs é **reexecutada** no blob novo.
2. **`P-GOV-MANDATO-3-FRONTEIRAS` nasce com 9–11, 13–22 e 24** (BAIXA, dono `B-GOV-MANDATO-2`), cada uma com o texto do §3 / §13.7 / 14.4 — **e com um item próprio, nomeado:** *"cabeçalho de `mandato-preflight.sh`: 9, 14, 15, 19 (regra da junta) e 22 entram no cabeçalho na próxima mudança de blob; cabeçalho de `mandato-mutantes.sh`: 24 — congelados neste ciclo pela identidade da matriz (§14.2.1)"* (dono `B-GOV-MANDATO-2`). A **23** entra como **retirada**: *"fechada neste ciclo por [V18b]/[V18c] (§14.4)"* — para rastreabilidade do §13.6/§13.7, que a listavam.
3. **21 e 22 são do pré-voo** (I2/`caixa-exata:`; checagem 4 e o hash de blob/md5 — o §8 regra 8 l.1011 já a declara); **24 é da ferramenta E4** (14.4). A 21 já está no cabeçalho por conteúdo.
4. **Critério da C3‴ nesta junta (emenda o §10 l.1053 — "9–20 no cabeçalho do script e na pendência" — e ratifica o c3c item 3c com ERRATA E-2):** para cada fronteira, presença **na pendência** é critério; presença **no cabeçalho** é **fato publicado com a linha** (presente / ausente / parcial), e toda ausência tem de estar nomeada no item do passo 2 — ausência **sem** o item nomeado é achado. *"Fronteira que só existe no plano é fronteira não declarada"* (§10 l.1054) continua inteira: a pendência é artefato versionado com dono, e o cabeçalho a segue na próxima mudança de blob.

### 14.3 (A3) Matriz do pré-voo — OBRIGATÓRIA; "se terminar" sai do plano

**Fato medido:** rodada completa em `C:/Users/AMP/w-e4` (detached em `c32f77b5`; blobs = os do head, cabeçalho desta emenda), saída em `scratchpad/E4/`: refs **terminou** 16:44:45 (`log.txt`: `FIM refs ec=1 | N=46 K=44 NAO-COBERTOS=2 EXCLUIDOS=52 ANOMALIAS=1`); pré-voo **começou** 16:44:45 com linha de base `fail=0 de tests=299`, **162** pontos de decisão, diferencial `IDENTICO`, sonda `NAO-COBERTA`, e às 17:24 (`date`) estava no controle (b), no-op l.5 concluído (`preflight.txt`, 16 linhas). Cada execução do guard ≈ 531 s (§13.5, medido pelo Dev-S).

**Hipótese (derruba: `tail -1 scratchpad/E4/log.txt` trazendo `FIM preflight`):** a matriz começa ≈ 17:45 (4 no-ops × ≈ 9 min a partir de ≈ 17:10); ≈ 75 mutantes rodam o guard (a proporção do refs, 46 de 99, sobre 162) × 531 s ÷ ganho 2,5× do `--jobs 4` ≈ 4,4 h → fim ≈ 22:00–22:30.

**Decisão (REVOGA §13.3 l.1246-1247 *"entra na ata se terminar"* e §13.6 l.1293-1294 *"ou mantê-la ABERTA com o log da rodada se ela não terminar"*; ratifica §10 l.1061 e [M-1] l.720-721):** a matriz do pré-voo, **completa** (162 linhas), com linha de base 0 e identidade por tripla (14.8), colada em `docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-mutantes.md` §4, é **insumo obrigatório do briefing** — sem ela o inspetor **não libera** a junta 3. Por quê: a pergunta da C2‴ é *"a matriz publicada é reproduzível?"*; sem matriz, os itens 1 e 3 dela não têm objeto → "não consigo medir" → REPROVADO por construção → pela T-24 (14.1) abre-se ciclo 4 **com** auditoria da máquina — uma auditoria **fabricada pelo processo** (§1.1 A8/A13), a classe que o §13.2 já recusou uma vez. A `D-SEM-TETO-AUDITORIA-NO-3` tirou o prazo; custo de máquina nunca foi critério (§3 l.831). Se a rodada abortar (`ec=2`, `[M-4] FALHA`, diferencial `DIVERGE`, sonda "coberta"), o orquestrador **relança** em `w-e4` nos mesmos blobs e a junta espera. → **ERRATA E-3** no c2c (l.62-69: a ambiguidade que ele registra deixa de existir).

### 14.4 (A4) `refs`: os dois não-cobertos (l.116 e l.119) e a anomalia da l.164

**Matriz medida (`scratchpad/E4/refs.txt`, 16:44; linha de base `fail=0 de tests=37`; controles: diferencial `IDENTICO`, sonda `NAO-COBERTA`, no-ops 4/4 VERDES):** `N=46 K=44 NAO-COBERTOS=2 EXCLUIDOS=52 ANOMALIAS=1 EQUIVALENTES-DECLARADOS=0`; não-cobertos `116 | M3(-f>-d)` e `119 | M3(-f>-d)`, ambos sobre `$GH_BIN`; anomalia `164 | ANOMALIA-SINTAXE | M1`. O §13.4 l.1269-1270 admitia *"0 (ou 1, o l.116/119, declarado equivalente em win32)"*: são **dois pontos**, e a fronteira 23 está **errada** — medido:

```
# exp.1 (scratchpad, uname MINGW64_NT-10.0-22631) — três shims SEM bit x: com shebang (com.sh), sem shebang (sem.sh), sem shebang e sem extensão (semext)
./sem.sh x                                  -> SHIM-SEM-SHEBANG x   ec=0   (executa direto: a l.116 mutada dá a MESMA saída, para os 3 shims)
command -v ./com.sh                         -> ./com.sh             ec=0
command -v ./sem.sh                         ->                      ec=1   (sem shebang, o `command -v` FALHA)
[ -d ./sem.sh ] || ver ./sem.sh   (mutante da l.119)   -> PARADO: falta './sem.sh' no PATH   ec=1
# exp.2 — arquivo regular `gh-alvo` no cwd (sem x, com shebang) + comando `gh-alvo` num diretório prefixado ao PATH; GH_BIN=gh-alvo (nome nu)
pristino l.116: if [ -f "$GH_BIN" ]; then bash "$GH_BIN" x; else "$GH_BIN" x; fi   -> SAIDA-DO-ARQUIVO-NO-CWD x
mutante  l.116 (-f -> -d)                                                          -> SAIDA-DO-COMANDO-NO-PATH x
mutante  l.119 (-f -> -d) com o comando no PATH                                    -> ec=0 (não discrimina; a l.119 só discrimina pela forma do exp.1)
```

Leitura: em win32 o `-f`→`-d` da **l.119** é discriminável por **shim sem shebang passado por caminho** (o `command -v` de arquivo sem shebang falha e `ver` pára); o da **l.116** é discriminável por **arquivo regular no cwd × comando de mesmo nome no PATH** (o pristino executa o arquivo, o mutante executa o comando). As duas fixtures discriminam **também no ubuntu** (sem bit x, `command -v` falha e a execução direta falha). Logo **nenhum dos dois é equivalente** — e a A6 (E4 l.713-714) só aceita "equivalente" com fixture que **tentou e não conseguiu** discriminar. Declarar equivalência está fora de questão; pendência com dono seria mandar a outro bloco um caso que cabe numa sessão.

**Decisão: teste novo, por um quarto papel — Dev-T-4** (`dev-t4-mandato-refs-win32`, identidade nova; **só** `tests/mandato-refs.test.ts`, só adições contra `34969a81` — [P-0]; inelegíveis para o papel: Dev-T, Dev-S, Dev-T-3, Dev-S-2, orquestrador, planejador, C1′/C2′/C3″; **inelegível como jurado** depois):

| caso | fixture (âncoras ◐ obrigatórias) | pristino | ⇄ mutante que o deixa vermelho |
|---|---|---|---|
| **[V18b]** l.119 | shim de `gh` **sem shebang**, sem bit x, passado por **caminho** em `MANDATO_GH`; âncora: `spawnSync("bash",["-c","command -v <caminho>"])` com `status ≠ 0` no arnês (se resolver, o caso não discrimina) | `ec=0`, lê a ata (`approved_head: S1`, como o `[V18]`) | `-f`→`-d` na l.119 → `ec=1`, stderr `PARADO: falta '<caminho>' no PATH`, stdout vazio, `doesNotMatch(/nao li o PR/)` (parou pela causa certa, como o `[V17]`) |
| **[V18c]** l.116 | arquivo regular `<nome>` **no cwd do script** (`repo`), sem bit x, respondendo o JSON com o SHA `S_A`; diretório temporário **prefixado ao `PATH` do spawn** com um comando `<nome>` (com bit x) respondendo `S_B`; `MANDATO_GH=<nome>` (nome nu, sem `/`); âncoras: `existsSync(repo/<nome>)` **e** `command -v <nome>` resolvendo para o diretório do PATH, não para o cwd | stdout com `S_A` (o arquivo do cwd) | `-f`→`-d` na l.116 → stdout com `S_B` (o comando do PATH) — discriminado pelo **SHA**, nunca só pelo `ec` |

Detalhes: `roda()` fixa o `env` (guard l.360-367) — o Dev-T-4 **acrescenta** um helper com `env` estendido (adição). O comentário do `skip` do `[V18]` (l.780-786, escrito neste ciclo pelo Dev-T-3) diz *"nenhum caso pode discriminá-lo"* — falsificado acima; o Dev-T-4 **reescreve essa frase** (linha nascida neste ciclo: contra `34969a81` continua adição pura, [P-0] intacto; divergência declarada aqui). O `[V18]` (bit x) fica: mede só no ubuntu. **Vermelho-controle (Dev-T-4, no worktree dele, guard editado ainda não commitado — a ferramenta lê o guard da árvore, l.116):** `bash scripts/mandato-mutantes.sh refs --only 116,119` → **116 e 119 VERMELHOS**; guard pristino sobre artefato pristino → verde; ausência 0/N mantida (§13.2(4)).

**Depois do Dev-T-4:** o orquestrador reexecuta `bash scripts/mandato-mutantes.sh refs --controle --jobs 4` em worktree detached **novo** (`C:/Users/AMP/w-e4b`, no commit `T4`; `npm ci` próprio; ≈ 35–40 min, §13.5) → `scratchpad/E4B/refs.txt` com o cabeçalho de identidade (14.8). **Hipótese (derruba: a linha `N= K= …` dessa saída):** `N=46 K=46 NAO-COBERTOS=0 EXCLUIDOS=52 ANOMALIAS=1`. `P-GOV-MANDATO-3-MUTANTES-REFS` fecha com **`NAO-COBERTOS=0`** — o *"(ou 1 …)"* do §13.4 l.1269-1270 está **revogado**.

**Anomalia l.164** (`MB=$(git merge-base "origin/$BASE" "$HEAD_PR" 2>/dev/null || echo "")`): o M1 casa `|| echo` e o `sed` da ferramenta (l.178) come o `)` de fechamento → mutante não compila → `ANOMALIA-SINTAXE` (o `bash -n` da l.226 pegou, como desenhado — cabeçalho l.67-68). O ponto é **semanticamente inerte**: `$(x || echo "")` ≡ `$(x || true)` — `MB` vazio nos dois quando o `merge-base` falha. **Classificação: EXCLUÍDO por limitação do operador** — nem coberto nem não-coberto; vira a **fronteira 24 da ferramenta** (*"M1 dentro de substituição de comando `$( … || echo … )` produz mutante inválido; o ponto fica sem medição e é listado como ANOMALIA"*), declarada em `…-mutantes.md` §7 (item 6, K2) e em `P-GOV-MANDATO-3-FRONTEIRAS` (14.2). A C2‴ confirma a inércia no [M-EXT] (mutante manual que remove o `|| echo ""`: comportamento igual → sai do denominador com o `diff` vazio publicado — item 4 dela).

### 14.5 (A5) Errata de citação — §13.1 l.1202-1203

A frase atribuída a *"E2.b [F-7a]"* — *"as 5 formas de parágrafo único … → 10/10 REJ nomeando a linha, sob QUALQUER shim (LIDO, ND, AUSENTE)"* — é um **composto**, não uma citação (medido por `grep -n -E '10/10|QUALQUER shim|\[F-7a\]'` no plano: `QUALQUER shim` só existe na própria l.1203): a l.541 diz, literal, **"[F-7a] 5 escapes do crítico + 5 formas de parágrafo único → 10/10 REJ."**; a l.658 (tabela de sementes, linha S7) diz **"negativas sob LIDO/ND/AUSENTE"**; "nomeando a linha" é o contrato de mensagens do §12.3 (l.1158, `REJEITADO  l.N: …`). A **conclusão** do §13.1 não muda: a v3 revoga "rotular é afirmar" pelas l.21, l.24, l.525, l.541, l.658, l.1007 e l.1158. A mensagem do commit `9d3de5dd` (Dev-T-3) repete o composto como se fosse literal — fato; mensagem de commit não se edita, a errata vive aqui.

### 14.6 (A6) Bases pós-integração — escopo, KPI, e o que a C3‴ confere no commit de merge

**Fatos medidos:** `git diff --name-only fc3363e3 b3f0af5f` = 22 arquivos, entre eles `CLAUDE.md` e `AGENTS.md`; `git diff --name-only fc3363e3 e4aa7592 -- CLAUDE.md AGENTS.md | wc -l` = **0** (o bloco não os toca). `git merge-tree --write-tree --name-only origin/main HEAD` → conflito em **7**: `Kpis/app.js`, `Kpis/kpis-history.json`, `Kpis/kpis-history.md`, `Kpis/kpis-latest.json`, `agent-orchestration/controle/decisoes.md`, `pendencias-indice.md`, `pendencias.md`. **Esse 7 é retrato contra `b3f0af5f`:** com o PR de registro do #394 antes (14.11), a lista se **re-mede** no ato da integração pelo mesmo comando (hipótese: `status-geral.md` e `log-execucao.md` entram, porque os dois lados os tocam; derruba: o próprio `merge-tree`).

**Decisão 1 — base de escopo (emenda §10 l.1049 e §7 l.945):** `MB=$(git merge-base origin/main HEAD)` **depois de `git fetch origin`**, e **fail-closed: após a integração, `MB` tem de ser igual a `git rev-parse origin/main`** (desigualdade = a integração não aconteceu, ou a `main` andou de novo → integra-se outra vez; nunca se mede contra base velha). Escopo do bloco = `git diff --name-only "$MB" HEAD` (≡ `origin/main...HEAD`, três pontos — vale antes e depois do merge). O §10 l.1049 (`fc3363e3`) e o §7 l.945 (`34969a81..HEAD -- frontend mobile`) passam a `"$MB"`, com o controle positivo `-- scripts tests > 0` que já têm; lido literalmente, `fc3363e3..HEAD` conteria o #394 e fabricaria violação de `CLAUDE.md`/`AGENTS.md` (§1.1 A5). O [P-0] contra `34969a81` nos dois guards **continua** (é diff de arquivo que não vem pela `main` — a C3‴ prova: `git diff "$M"^1 "$M" -- tests/mandato-*.test.ts` vazio, controle positivo `-- Kpis` > 0). A fábrica acertou o `MB` (c3c l.140-145); falta-lhe a igualdade `MB = origin/main` → **ERRATA E-4**.

**Decisão 2 — `blocks_completed` (emenda §7 l.947 *"168, inalterado"*):** valor = **`value` de `"$MB":Kpis/kpis-latest.json` + 1**, recontado pelo Dev-S-2 no K1 (14.11). Com a `main` em `b3f0af5f` isso é **168 → 169** (medido: `b3f0af5f:Kpis/kpis-latest.json` l.63-64 `"value": 168`; o head publica 168 nas três entradas `pr: 393` do history, l.2480/2493/2505). O PR de registro do #394 **não deve** mover o campo — o precedente `1b8319f9` (#382) não moveu (medido: `git diff 1b8319f9^ 1b8319f9 -- Kpis/kpis-latest.json` só toca `merge_commit`, `approved_head` e `backfill_note`) — mas a regra é **MB+1**, não "169": se mover, o número segue a regra. É o que a própria nota do campo na `main` manda (*"o #393 publica 168 no ramo dele; quem mergear depois RECONTA … a partir da `main` de então"*, C1-A3 do #392).

**Decisão 3 — o commit de merge `M` (pais: `M^1` = head do ramo, `M^2` = `origin/main`), conferido pela C3‴ contra os DOIS pais (ratifica a seção "A integração da `main` é por MERGE" do c3c, com as expectativas explícitas):**
1. `git diff --name-only "$M"^2 "$M"` ⊆ lista PERMITIDA do §4 (+ §13.2, §13.6, 14.4 Dev-T-4) — é o delta do bloco contra a `main`; **e** `-- CLAUDE.md AGENTS.md` vazio, com controle `-- scripts tests > 0`.
2. `git diff --name-only "$M"^1 "$M"` ⊆ `git diff --name-only "$MB_antes" "$M"^2` (o que a `main` trouxe; `MB_antes` = merge-base **antes** do merge — `fc3363e3` hoje) — nada entra pelo merge além do que a `main` tem.
3. Arquivo trazido pela `main` **sem** conflito: blob em `M` = blob em `M^2` (`git ls-tree`), adoção byte a byte.
4. Arquivo em conflito: 0 marcadores (`grep -c '^<<<<<<<\|^=======\|^>>>>>>>'` = 0); JSON parseável (`node -e 'JSON.parse(require("fs").readFileSync(f,"utf8"))'`); **união** — o conjunto dos cabeçalhos de entrada de cada pai ⊆ resultado (`decisoes.md`/`pendencias.md`: linhas `^## `; `kpis-history.json`: pares `pr`+data; extraídos por script, nunca lidos a olho); `pendencias-indice.md` = saída do gerador em `M`; **`Kpis/kpis-latest.json` e `Kpis/app.js` em `M` = blob de `M^2`** (o lado da `main`: #394 ou o registro dele) — a recontagem do #393 é do K1, não do merge; `kpi-freeze --check` ec=0 em `M`.
5. `git show --remerge-diff "$M"` (ou `git diff-tree --cc -p`) publicado; vermelho-controle: cópia do resultado sem um cabeçalho de um dos pais → a conferência acusa.
6. `M` **não entra** na ordem por par (c3c ponto 1) e é julgado pela resolução (c3c ponto 4) — ratificado.

### 14.7 (A7) A forma executável de cada item do §13.3 — sem editar a ferramenta

**Fato (fonte, blob `37549262`):** os controles (l.240-283) rodam **antes** da matriz e **não leem `ONLY`**; `--only` só filtra os pontos da matriz (l.149-157); artefato e guard vêm da **árvore** (l.115-116), o resto do `HEAD` (l.107-109); **não há modo "só controles"**; e a ferramenta **não existe em `34969a81`** (`git ls-tree 34969a81 -- scripts/mandato-mutantes.sh` vazio; controle positivo: existe em `e4aa7592`).

| item §13.3 | forma executável (C2‴; worktree próprio, `npm ci` próprio, saída em arquivo, `ec` por variável) |
|---|---|
| 1 — refs inteiro | `bash scripts/mandato-mutantes.sh refs --controle --jobs 4 > "$S/mut-refs.txt" 2>&1; ec=$?` no head julgado (árvore = head, provado por `hash-object`); compara **linha a linha** com a matriz publicada no K2 (14.4 — blob novo do guard, tripla nova) |
| 2 — pré-voo: controles + amostra | **uma** invocação: `bash scripts/mandato-mutantes.sh preflight --controle --only <L> --jobs 4`, com `L` = todos os NÃO-COBERTOS ∪ equivalentes declarados ∪ ≥ 20% dos VERMELHOS sorteados com semente publicada. Os controles saem **inteiros** nessa mesma rodada (não dependem de `--only`). Se quiser os controles **isolados**, a forma é `preflight --controle --only 1` (a l.1 é `#!…`, não é ponto de decisão → matriz vazia, `N=0`, `ec=0`, l.149-158) — e a cadeira declara qual usou (é o que o c2c l.219-221 já pede) |
| 2 — [M-2] histórico | worktree próprio **detached em `34969a81`** (`C:/Users/AMP/w-j3c2h`, `npm ci` próprio); a ferramenta entra como arquivo **não rastreado**: `git show <head-julgado>:scripts/mandato-mutantes.sh > scripts/mandato-mutantes.sh`, provado por `tr -d '\r' \| md5sum` = o do blob; `bash scripts/mandato-mutantes.sh refs --only 135,142,153` e `… preflight --only 105,196`. O `git archive HEAD` da ferramenta (l.107) leva a árvore de `34969a81` — o mundo do ciclo 2 inteiro; `[M-4]` compara `git status` antes/depois (o `??` da ferramenta está nos dois → igual). Esperado: os 5 pontos **VERDES / NÃO-COBERTOS**. Se a linha de base do guard velho não for `fail=0`, a ferramenta aborta `ec=2` — aí o [M-2] é medido **à mão** (os 5 mutantes por `sed` em arnês, guard velho, cor lida do TAP) e a cadeira diz que a ferramenta não alcançou o histórico e por quê |
| 3 — [M-EXT] | como no c2c item 4; inclui a sonda de inércia da l.164 (14.4) |
| 4 — diferencial + base 0 | como no c2c item 5 |

### 14.8 (A8) Identidade da matriz — 3 blobs por matriz; 5 publicados

**Fato:** a ferramenta lê `ART` e `GUARD` da árvore (l.115-116) e o seu próprio código define enumeração e operadores (l.143-148, l.161-213). A matriz do **refs** depende de `mandato-refs.sh` + `mandato-refs.test.ts` + `mandato-mutantes.sh`; a do **pré-voo**, de `mandato-preflight.sh` + `mandato-preflight.test.ts` + `mandato-mutantes.sh`. O guard do refs **não** entra na matriz do pré-voo — e vai mudar (Dev-T-4) **sem** invalidar a rodada do pré-voo em curso.

**Decisão (emenda §13.5 l.1282-1285 "4 artefatos"; ratifica o runner do orquestrador, que grava 5):** a identidade de **cada matriz** são os **3 blobs que a ferramenta lê para aquele alvo**; o cabeçalho de `…-mutantes.md` grava os **5** (a tripla de cada matriz + os 2 restantes como dado) e o head em que a rodada correu, como dado. A C2‴ compara **a tripla** de cada matriz com o head julgado; os outros dois blobs são publicados, não são critério → **ERRATA E-5** (c2c item 1, l.229-231, e l.160-165).

### 14.9 (A9) Inelegíveis — nomeados pela trilha, para o inspetor conferir por nome

| papel | identidade / trilha (scratchpad da sessão) | modelo | commits (`git log --format='%h %s' fc3363e3..e4aa7592`) | worktree (`git worktree list`) |
|---|---|---|---|---|
| Dev-T (2 instâncias) | `DEV-T-CICLO3.md` (sem slug; "Dev-T do ciclo 3, 1ª/2ª instância") | Opus 5 [1m] | `6c8fb3e8` (E1), `4ad4ba9f` (E3) | `C:/Users/AMP/w-devt393` @ `4ad4ba9f` |
| Dev-S (2 instâncias) | `DEV-S-CICLO3.md` ("papel Dev-S, identidade nova") | Opus 5 (1M) | `33356358` (E2, 1ª inst.); `616fd4fa` (E4), `72214ff7`, `1466c7d9`, `714d4815`, `d222ce7c` (2ª inst. — hipótese pelas pendências "pelo dev do ciclo 3, 2ª instância" e pelo worktree; derruba: a trilha não reivindicar um deles) | `C:/Users/AMP/w-devs393` @ `d222ce7c` |
| Dev-T-3 | `dev-t3-mandato-b8-refs` (`DEV-T3-CICLO3.md`) | Opus 5.5 | `9d3de5dd` | removido pelo nome |
| Dev-S-2 | `dev-s2-mandato-registro` (`DEV-S2-CICLO3.md`; fase 2 = K1/K2, 14.12) | Opus 5.5 | `c32f77b5` (+ K1, K2) | `C:/Users/AMP/w-devs2` @ `c32f77b5` |
| **Dev-T-4** (novo, 14.4) | `dev-t4-mandato-refs-win32` (trilha `DEV-T4-CICLO3.md`) | Opus | `T4` | a criar em caminho curto; remover pelo nome |
| planejador | este papel (v1–v3, §12, §13, §14) | Fable 5.1 | `5bd54f03`, `cb9c360a`, `7ec2576b`, `f35fc028`, `b757e278`, `399ce357` | `w-plan393c` (removido) |
| orquestrador | — | — | `61302337`, `b334c3b9`, `e4aa7592`, e o `M` | `w-mandato`, `w-e4`, `w-e4b` |

Somam-se os do §10 l.1043-1046 (as seis cadeiras; `aa051e8cc3eb1c1a0`; `a4ed42a5e3a81bdd3`). O briefing do ciclo 3 lista **estes nomes**; os corpos (c1c l.98-100, c2c l.119-121, c3c l.85-87) ganham o Dev-T-4, os commits e as trilhas por **ERRATA E-6**.

### 14.10 (B) A sonda do §E4.6 — a forma REAL, transcrita da fonte

`scripts/mandato-mutantes.sh` (blob `37549262`), l.255-257:

```
LSET=$(grep -n '^set -u' "$SD/$ART" | head -1 | cut -d: -f1)
sed -i "${LSET}a [ -z \"\${SONDA_INEXISTENTE:-}\" ] || exit 9" "$SD/$ART"
SLINHA=$((LSET+1))
```

A linha injetada, logo abaixo do primeiro `set -u` do artefato, é **`[ -z "${SONDA_INEXISTENTE:-}" ] || exit 9`**. **Errata do §E4.6 l.715 e do §13.7 D-S-4 l.1303**, que escrevem `[ -z "$SONDA_INEXISTENTE" ] || parado "sonda"`: sob `set -u`, `"$SONDA_INEXISTENTE"` sem `:-` mata o pristino ("unbound variable", `ec=1`) por outra via; e `parado` não existe no pré-voo (no refs só é definida na l.114, depois da sonda) — com a variável exportada daria "command not found" e o script **seguiria** (`ec=0`). A polaridade `-z` do §13 está certa; a **grafia** é a da fonte (cabeçalho da ferramenta l.50-62; medido pelo Dev-S-2 em `DEV-S2-CICLO3.md` [T2]). O `…-mutantes.md` §2.1 (K2) passa a citar a grafia real.

### 14.11 (C) KPI do #393 pós-integração — o backfill do #394 NÃO é deste PR

**Fatos:** o porteiro do #394 (`scratchpad/PORTEIRO-394.md`, R2, §5-bis, §8) fixou um **PR de registro do #394** (votos + parecer do inspetor em `votos/B-GOV-SEM-TETO/`, parecer do porteiro, `status-geral`/`log-execucao`, 4 pendências, **e o backfill §C3.5**: `merge_commit b3f0af5f82aca23502326f18b644a28df3236b5a`, `approved_head 7ad08690bad5e9cbc4d34fe6905b14c6ac634046` — o *"Objeto julgado"* de `b3f0af5f:agent-orchestration/omega/juntas/J-B-GOV-SEM-TETO.md` l.3/l.6, **não** o head no merge `3f791a7d`, que é a ata pós-junta, 16:45:21, descendente de `7ad08690`) como **próximo merge**, antes do #393 — precedente `1b8319f9` (#382).

**Decisão:**
1. **O #393 não faz backfill do #394**; recebe-o pela `main`. A base que o #393 integra é a `origin/main` **pós-registro** — SHA que ainda não existe: a **regra** é (a) `git merge-base --is-ancestor b3f0af5f origin/main` → `ec=0` **e** (b) em `origin/main:Kpis/kpis-history.json` a entrada `"pr": 394` tem `merge_commit` **não nulo** (a prova de que o registro entrou). As duas medidas pelo orquestrador **antes** do `git merge`, coladas na mensagem de `M`.
2. **Recontagem: Dev-S-2 fase 2, commit K1** (registro; `Kpis/*` só por `kpi-freeze`, §4 l.887), sobre a árvore de `T4` (14.12): `backend_tests` **N=2** em cluster descartável com porta provada (§7 l.941-944), Δ por arquivo contra `"$MB":Kpis/kpis-latest.json` e `34969a81` (inclui os +2 casos do Dev-T-4); `blocks_completed` = MB+1 com nota (14.6); `pr` 393, `merge_commit`/`approved_head` **null**; `frontend_smoke_tests`/`flutter_tests` carregados com nota, provado por `git diff --name-only "$MB" HEAD -- frontend mobile` = 0 (controle `-- scripts tests > 0`); history: **entrada nova** "ciclo 3 — recontagem pós-integração" (a última do arquivo; `latest` = ela; o guard `tests/kpi-dashboard-charts.test.ts` l.323-336 confere a cópia `FROZEN`); a entrada sobre mutação cita `…-mutantes.md` e os `N/K` dele (§7 l.949) — se o K2 ainda não existir quando o K1 for escrito, os `N/K` citados são os da rodada em curso **com a marca "matriz publicada no K2"**, e o K2 fecha a citação.
3. **`P-KPI-NOTAS-CARREGADAS-REGRESSAO-392`** (dono: o #393) **fecha no K1**: as 4 métricas (`backend_contract_tests_focused` 34, `flutter_modules` 17, `mobile_backend_contracts` 18, `mobile_core_saas_contracts` 21 — `b3f0af5f:agent-orchestration/controle/pendencias.md` l.9817-9826) ganham nota do PR corrente no `kpis-latest.json` **e** no history (*"carregado sem reexecução neste PR (#393); último valor oficial: PR #<n>"*, com `<n>` achado por `git log -S '"value": <v>' -- Kpis/kpis-latest.json` na `main` — nunca digitado); teste de encerramento = o da própria pendência.

### 14.12 (D) Ordem dos próximos passos — dono por papel (§C7.4-bis), e o que depende da E4 do pré-voo

| # | passo | quem (papel) | depende da E4 do pré-voo? |
|---|---|---|---|
| 0 | PR de registro do #394 merge na `main` (fora deste bloco) | orquestrador + porteiro | não |
| 1 | **Integração por merge** (`git fetch origin`; regra 14.11.1 medida; `git merge --no-ff origin/main`; resolução 14.6.3; índice pelo gerador; `kpi-freeze --check`; push) → `M` | orquestrador, **papel de integração** | não |
| 2 | **Dev-T-4:** [V18b]/[V18c] + frase do `[V18]`; vermelho-controle `--only 116,119`; push → `T4` (só `tests/mandato-refs.test.ts`) | `dev-t4-mandato-refs-win32` | não |
| 3 | **E4-refs-2** em `C:/Users/AMP/w-e4b` (detached em `T4`): `refs --controle --jobs 4` → `scratchpad/E4B/refs.txt` | orquestrador (runner) | não — corre em paralelo com a E4 do pré-voo (blobs do pré-voo intocados) |
| 4 | **K1 — Dev-S-2 fase 2 (registro/KPI, sem script):** recontagem 14.11.2-3; `P-GOV-MANDATO-3-FRONTEIRAS` (14.2); fechar `…-B8B-CONTRADICAO` (teste do §13.1); `…-MUTANTES-PREFLIGHT` com o estado real ("rodada em curso, base 0, tripla `<blobs>`"); emenda ciclo 3 do comando completada (Dev-T-4 nominal; identidade por tripla); trilha; índice pelo gerador; `…-mutantes.md` §2.1 (grafia real da sonda) e §7 item 6 (fronteira 24) | `dev-s2-mandato-registro` | não (depende de `T4`, pelos +2 casos) |
| 5 | **K2 — Dev-S-2 fase 2 (só docs):** §3 de `…-mutantes.md` = matriz E4-refs-2 (tripla nova); §4 = matriz do pré-voo **completa** (162 linhas, tripla); fechar `…-MUTANTES-REFS` (`NAO-COBERTOS=0`) e `…-MUTANTES-PREFLIGHT` ("matriz publicada do zero em `<tripla>`"); history: citação `N/K` fechada | `dev-s2-mandato-registro` | **SIM** (e da E4-refs-2). K1 e K2 podem ser um só commit se as duas rodadas já tiverem terminado quando o Dev-S-2 nascer |
| 6 | Registro da junta: seção ciclo 3 da ata (esqueleto com `Objeto julgado`), briefing (inelegíveis de 14.9 **por nome**; R5 do porteiro: `git merge-base --is-ancestor b3f0af5f <objeto>` → `ec=0`, **declarado no briefing**; matriz presente; triplas), ERRATAs E-1…E-6 nos 3 corpos **nos dois espelhos** + `sync-agent-agents.mjs --check`, corpo do PR reescrito | orquestrador | não (mas o briefing só fecha depois do K2) |
| 7 | **Inspetor** — com o corpo do **head integrado** (item 2.2 "ciclo ≥ 4"; md5 EOL-neutro = o da `origin/main`; o corpo de `e4aa7592` ainda diz "ciclo ≥ 3: parecer do crítico + PD" e bloquearia por construção); confere R5, S0, a matriz dos dois alvos com tripla = head, inelegíveis por nome, blobs congelados (14.2.1) | `inspetor-de-terreno-da-junta` | **SIM** (via K2) |
| 8 | **Junta 3** (C1‴, C2‴, C3‴) | as três cadeiras | **SIM** |

**Se a `main` andar de novo** entre 1 e 8: nova integração por merge (14.6.1 fail-closed), o K1 re-lê `MB`, e a C3‴ trata cada merge (c3c ponto 5).

### 14.13 ERRATAs aos 3 corpos — a fábrica escreveu; o orquestrador aplica, PREFIXADAS, nos dois espelhos (texto abaixo intocado; `sync-agent-agents.mjs --check`)

Arquivos: `.claude/agents/especialistas/jurado-mandato-c1c-invariancia-de-forma.md`, `…-c2c-cobertura-por-mutacao.md`, `…-c3c-fronteira-numero-registro.md` (e os espelhos em `.agents/agents/especialistas/`). Cada ERRATA cita a linha do corpo que corrige; o texto é o que segue, literal.

- **E-1 (os 3 corpos; corrige c1c l.358-360, c2c l.342-344, c3c l.471-473):** *"ERRATA E-1 (plano §14.1, 2026-09-28): onde este corpo resume 'se a junta 3 produzir `bloqueia`, antes de qualquer ciclo 4 audita-se a máquina', vale o texto da `origin/main` (T-24): QUALQUER reprovação do ciclo 3 — `bloqueia` `dentro-do-bloco`, ou reprovação sem `bloqueia` (ex.: 'não consigo medir' = REPROVADO) — abre o ciclo 4 e exige a auditoria; `pre-existente` não reprova nem abre ciclo 4."*
- **E-2 (c1c l.203-205 e l.365-368; c3c item 3c l.372-385):** *"ERRATA E-2 (plano §14.2/§14.4): a fronteira 23 foi FECHADA neste ciclo ([V18b]/[V18c], Dev-T-4) e deixa de ser fronteira declarada; a 24 (ferramenta E4: M1 dentro de `$( … || echo … )` produz mutante inválido — l.164 do refs) entra em `P-GOV-MANDATO-3-FRONTEIRAS`. Para a C3‴ (item 3c): o critério é a presença de 9–11, 13–22 e 24 NA PENDÊNCIA; presença no CABEÇALHO é fato publicado com a linha, e cada ausência no cabeçalho tem de estar nomeada no item 'cabeçalho congelado' da própria pendência (os blobs estão congelados pela identidade da matriz, §14.2.1) — ausência SEM esse item é achado."*
- **E-3 (c2c l.62-69):** *"ERRATA E-3 (plano §14.3): a matriz do zero do pré-voo, completa (162 linhas), é insumo OBRIGATÓRIO do briefing; o inspetor não libera a junta sem ela. Se, ainda assim, ela não estiver no ramo quando você começar, isso não é classificação livre: é `bloqueia` por [M-1] (E4 l.720-721) e achado de terreno contra o inspetor. Os textos 'entra na ata se terminar' (§13.3) e 'ou mantê-la ABERTA' (§13.6) estão revogados."*
- **E-4 (c3c; corrige l.139-145, l.146-154, item 2d l.325-330, item 3b l.357-365, item 4b l.430-435):** *"ERRATA E-4 (plano §14.6/§14.11/§14.12): (a) depois da integração, `MB` tem de ser IGUAL a `git rev-parse origin/main` (após `git fetch origin`) — desigualdade = integração não aconteceu ou a `main` andou; (b) no commit de merge `M`, `Kpis/kpis-latest.json` e `Kpis/app.js` são o blob do 2º pai (`M^2`); os pontos (iv)/(v) da seção 'A integração da `main`' valem para o head FINAL (K1/K2), não para `M`; (c) o commit do Dev-T-4 (`T4`, só `tests/mandato-refs.test.ts`) é classe T sem par de script — não entra na ordem por par do item 4b; (d) `blocks_completed` esperado = `value` em `"$MB":Kpis/kpis-latest.json` + 1 (com a `main` em `b3f0af5f`: 168 → 169), e o §7 '168, inalterado' está superado; (e) `P-GOV-MANDATO-3-MUTANTES-REFS` fecha só com `NAO-COBERTOS=0` (o 'ou 1' do §13.4 está revogado) e `…-MUTANTES-PREFLIGHT` FECHA (a saída 'mantida ABERTA' do §13.6 está revogada); (f) `P-KPI-NOTAS-CARREGADAS-REGRESSAO-392` (dono #393) tem de estar FECHADA no head, com a nota do PR corrente nas 4 métricas; (g) o backfill do #394 NÃO é deste PR — chega pela `main` (PR de registro do #394); conferir que a entrada `pr: 394` do history no head tem `merge_commit` não nulo e igual ao de `origin/main`."*
- **E-5 (c2c; corrige item 1 l.229-231, l.160-165, l.247-254):** *"ERRATA E-5 (plano §14.4/§14.7/§14.8): (a) a identidade de cada matriz são os 3 blobs que a ferramenta lê para aquele alvo (artefato + guard do alvo + `scripts/mandato-mutantes.sh`); o cabeçalho de `…-mutantes.md` grava os 5, e só a TRIPLA de cada matriz é critério; (b) depois do Dev-T-4 ([V18b]/[V18c]), os mutantes de l.116 e l.119 do refs DEVEM sair VERMELHOS também em win32; não há declaração de equivalência a conferir — se algum sair VERDE, é achado; o `[V18]` continua `skip` em win32 (fato, não critério); (c) a l.164 do refs é `ANOMALIA-SINTAXE` por limitação do M1 dentro de `$( … )` — fronteira 24 declarada; publique-a como ponto sem medição e confirme a inércia no seu [M-EXT]; (d) os itens 2 e 3 do §13.3 têm a forma executável do §14.7 (uma invocação `--controle --only <L>`; controles isolados = `--controle --only 1`; [M-2] em worktree detached em `34969a81` com a ferramenta como arquivo não rastreado)."*
- **E-6 (os 3 corpos, seção "Quem você é"; corrige c1c l.98-100, c2c l.119-121, c3c l.85-87):** *"ERRATA E-6 (plano §14.9): à lista de inelegíveis somam-se Dev-T-4 (`dev-t4-mandato-refs-win32`, commit `T4`) e os commits `72214ff7`, `1466c7d9`, `714d4815`, `d222ce7c` (Dev-S, 2ª instância); os devs sem slug são conferidos pela trilha (`scratchpad/DEV-T-CICLO3.md`, `DEV-S-CICLO3.md`) e pelos worktrees `w-devt393@4ad4ba9f` / `w-devs393@d222ce7c`."*

**Ratificado sem errata:** c1c item 8 (o `[B8b]` por propriedade, com o vermelho-controle no pai de `c32f77b5` via `git log -S rotulo_ah` — o merge preserva essa história); c3c "De quem é" (o `M` é papel de integração) e `MB=$(git merge-base origin/main HEAD)`; c2c "A ferramenta, lida pela fonte" (l.216-221) e a publicação por linha de l.116/l.119.

**Sucessão (substitui a do §13, l.1311):** registro do #394 → `M` (orquestrador) → `T4` (Dev-T-4) → E4-refs-2 ∥ E4 do pré-voo (em curso) → K1 → K2 (Dev-S-2) → ERRATAs + briefing + ata (orquestrador) → inspetor (corpo do head integrado; R5) → junta 3.

*Limpeza §C5 do planejador (§14, 1 linha):* removidos pelo nome `scratchpad/pl14-exp` e `pl14-exp2` (experimentos, removidos no próprio comando) e `scratchpad/s14.lf.md` (rascunho desta seção); nenhum worktree criado (`w-pl14` não foi necessário — nada mutou fora do scratchpad); nenhum rastreado tocado além deste arquivo; `w-e4`, `w-devs2`, `w-mandato` só lidos, nenhum processo tocado; base viva nunca alvo; resíduo alheio (`w-devs393`, `w-devt393`, `b04a`, `b11`, `gov-descuido`, `gov-elenco`, ` M` fantasmas de `.agents/.claude` na árvore principal, `results.txt`, `TEMPLATE-J-ata.md`, `votos/*` não rastreados) só reportado.

### 14.14 EMENDA pós-porteiro do #395 (2026-09-28, ~18:00): as ressalvas R-A…R-E entram no escopo do #393 — e a integração já aconteceu

- **Fatos (medidos agora em `w-mandato`, git só leitura):** `origin/main` = `3b1fe0f9` (#395, "docs(registro): votos, inspetor e porteiro do #394 versionados, e o backfill dele", 17:38:22 -03, pai único `b3f0af5f`; `gh pr view 395` → `MERGED`, mergeCommit `3b1fe0f9…`, 20:38:23Z). O commit de integração **já existe**: `7d02d8da` ("chore(integracao): main (3b1fe0f9) no B-GOV-MANDATO por merge, antes da junta 3", 17:56), pais `e27fbe14` (ERRATAs E-1…E-6 nos 3 corpos) e `3b1fe0f9`; `git merge-base origin/main HEAD` = `3b1fe0f9` = `origin/main` — a regra fail-closed de 14.6.1 está **satisfeita**; `MERGE_HEAD` ausente, 0 arquivos unmerged. Conflito re-medido antes do merge (`git merge-tree --write-tree --name-only 3b1fe0f9 e27fbe14`): **9** arquivos — os 7 da §14.6 + `agent-orchestration/codex/log-execucao.md` + `agent-orchestration/docs/status-geral.md` (a hipótese da §14.6 confirmou-se; a C3‴ trata os 9 pela regra 14.6.3). Parecer do porteiro do #395: `scratchpad/PORTEIRO-395.md`, 89 linhas, md5 EOL-neutro **`9cd7cb00020f0577044eb2ed3de4e3b8`** (medido por `tr -d '\r' | md5sum`), veredito **LIBERADO COM RESSALVA** (l.89), ressalvas R-A…R-E (l.79-83) — lidas na fonte, não pelo resumo do orquestrador.

- **R-A (`ajuste`, dentro-do-bloco do #395; dono #393):** `3b1fe0f9:Kpis/kpis-history.md` l.2955 = `| pr / merge_commit / approved_head | \`394\` / \`null\` / \`null\` **na autoria** (§C3.5) |` — o #395 escreveu o backfill só no JSON (`3b1fe0f9:Kpis/kpis-history.json` l.2475-2476: `merge_commit b3f0af5f…`, `approved_head 7ad08690…`); os backfills anteriores escreveram também o `.md` (porteiro l.79: l.2660/2748/2819/2977). **Decisão:** **Dev-S-2, no K1**, reescreve essa linha — localizada por **conteúdo** (`grep -n` de `` `394` / `null` / `null` ``), nunca por número: o merge move linhas — para os dois valores do JSON, com a marca *"backfill §C3.5 do #394: JSON pago pelo #395, `.md` pago aqui pelo #393 (R-A do porteiro do #395)"*. Entra no §4 PERMITIDO ao Dev-S **nominalmente** (a linha é de outro bloco — sem declaração, a C3‴ 1b reprova por construção).

- **R-B (`nota`; dono #393):** `dd79c96f` é commit de ramo squashado — **não está na `main`** (`git merge-base --is-ancestor dd79c96f origin/main` → ec=1; o objeto existe localmente como `commit`). Em `3b1fe0f9:agent-orchestration/controle/pendencias.md` aparece **2×** (medido por `grep -n`): l.9809 (item C2-3-1 de `P-GOV-SEM-TETO-AJUSTES-DA-JUNTA`) e l.9842 (prova de `P-GOV-INSPETOR-CICLO-DECLARADO-NAO-DERIVADO`). Aparece também em `J-B-GOV-SEM-TETO.md` e em 6 arquivos de `votos/B-GOV-SEM-TETO/` (`git grep -l dd79c96f 3b1fe0f9`) — **registro histórico de outro bloco: não se toca** (§4 PROIBIDO, atas alheias). **Decisão:** **Dev-S-2, no K1**, nas **2** ocorrências de `pendencias.md`, troca a âncora por `b3f0af5f` (o squash do #394 na `main`, que carrega o hunk do item 2.2 — `git diff b3f0af5f^ b3f0af5f -- .claude/agents/inspetor-de-terreno-da-junta.md` = 1 hunk, §14 cabeçalho) mantendo a data, com a marca *"(âncora corrigida: `dd79c96f` é commit de ramo squashado, fora da `main` — R-B do porteiro do #395)"*. Teste de fechamento (C3‴): `git grep -c dd79c96f <head> -- agent-orchestration/controle/pendencias.md` = 0, controle positivo `b3f0af5f` ≥ 2 no mesmo arquivo. Entra no §4 PERMITIDO ao Dev-S **nominalmente** (pendências abertas por outro bloco).

- **R-C (base e ancestralidade) — emenda o §14.12 passos 6/7 e a ERRATA E-4 só onde citam SHA:** a ancestralidade que o inspetor mede e o briefing declara é **`git merge-base --is-ancestor 3b1fe0f9 <objeto>` → ec=0** (implica `b3f0af5f`: medido `git merge-base --is-ancestor b3f0af5f 3b1fe0f9` → ec=0). A E-4(d) lê-se *"com a `main` em `3b1fe0f9`: 168 → 169"* (o #395 não moveu `blocks_completed` — porteiro §8; a C3‴ confere pelo `$MB`). E-4(a) e (g) não citam SHA — inalteradas. As condições (a)/(b) do §14.11.1 estão **satisfeitas e medidas** (`b3f0af5f` ancestral de `3b1fe0f9`; entrada `pr: 394` do history com `merge_commit` não nulo em `3b1fe0f9`).

- **R-D:** ao versionar o parecer, o md5 EOL-neutro **`9cd7cb00020f0577044eb2ed3de4e3b8`** vai na mensagem do commit de registro **e** no corpo do PR; a C3‴ (item 3d) confere `git show <head>:agent-orchestration/omega/juntas/votos/B-GOV-SEM-TETO/PORTEIRO-395.md | tr -d '\r' | md5sum` = esse valor (controle positivo: o `PORTEIRO-394.md` do mesmo diretório dá outro md5 — `c99c94d5…`, parecer l.20).

- **R-E (escopo):** o parecer viaja **neste PR**, em `agent-orchestration/omega/juntas/votos/B-GOV-SEM-TETO/PORTEIRO-395.md` (NOVO; o diretório já tem 8 arquivos na `main` — `git ls-tree -r 3b1fe0f9`), **pelo orquestrador, no commit de registro da junta (passo 6 do §14.12)** — nunca em `M` (já existe e é integração pura, 14.6.3(2)), nunca pelo Dev-S-2 (não é registro deste bloco) e nunca num commit que toque `tests/**` ou `scripts/**`. Byte a byte do scratchpad (md5 acima). Não é ata: o PROIBIDO *"as 107 outras atas"* são os `J-*.md` (é assim que a C3‴ 1a converte a prosa).

- **§4 PERMITIDO — acréscimos nominais desta emenda.** A C3‴ 1b exige que estejam **também** na EMENDA — CICLO 3 do comando (`agent-orchestration/codex/comandos/B-GOV-MANDATO-mandato-verificavel.md`, l.259+; hoje Emendas 1–3): o **Dev-S-2 acrescenta lá, no K1, uma "Emenda 4 — escopo nominal pós-§14"** com as três linhas abaixo (e as autorizações da §14.4/§14.12: Dev-T-4 em `tests/mandato-refs.test.ts`; identidade por tripla).

| arquivo | ação | quem / commit | ressalva |
|---|---|---|---|
| `agent-orchestration/omega/juntas/votos/B-GOV-SEM-TETO/PORTEIRO-395.md` | NOVO, byte a byte, md5 `9cd7cb00020f0577044eb2ed3de4e3b8` | orquestrador / passo 6 | R-D, R-E |
| `Kpis/kpis-history.md` — a linha `pr / merge_commit / approved_head` da entrada do #394 | 1 linha reescrita (`394` / `b3f0af5f…` / `7ad08690…`) | Dev-S-2 / K1 | R-A |
| `agent-orchestration/controle/pendencias.md` — as 2 ocorrências de `dd79c96f` | âncora → `b3f0af5f`, data mantida, marca escrita | Dev-S-2 / K1 | R-B |

(`pendencias-indice.md` continua **só** pelo gerador; `Kpis/app.js` **só** por `kpi-freeze`; nada disto toca `tests/**`/`scripts/**`.)

- **ERRATA nova aos corpos — uma só, E-7, à C3‴** (entra na lista da §14.13; o orquestrador aplica prefixada, nos dois espelhos; corrige c3c item 1b l.245-249, item 3d l.387-411, seção "A integração da `main`" l.139-145, e a E-4(d)). Texto literal: *"ERRATA E-7 (plano §14.14): (a) a ancestralidade que o briefing declara e você confere é `git merge-base --is-ancestor 3b1fe0f9 <objeto>` → ec=0 (3b1fe0f9 = #395, registro do #394; contém b3f0af5f); a E-4(d) lê-se 'com a `main` em `3b1fe0f9`: 168 → 169'; (b) três autorizações nominais a mais, que têm de estar TAMBÉM na EMENDA — CICLO 3 do comando: `agent-orchestration/omega/juntas/votos/B-GOV-SEM-TETO/PORTEIRO-395.md` (NOVO, orquestrador, commit de registro da junta, md5 EOL-neutro `9cd7cb00020f0577044eb2ed3de4e3b8` publicado na mensagem do commit e no corpo do PR — confira pelo blob), a linha `pr / merge_commit / approved_head` da entrada do #394 em `Kpis/kpis-history.md` (Dev-S-2, K1: `394` / `b3f0af5f…` / `7ad08690…`, R-A) e as 2 ocorrências de `dd79c96f` em `agent-orchestration/controle/pendencias.md` trocadas por `b3f0af5f` (Dev-S-2, K1, R-B; teste: `git grep -c dd79c96f <head> -- agent-orchestration/controle/pendencias.md` = 0, controle `b3f0af5f` ≥ 2); (c) o commit de merge da integração é `7d02d8da` (pais `e27fbe14` e `3b1fe0f9`), com 9 arquivos resolvidos (os 7 do §14.6 + `codex/log-execucao.md` + `docs/status-geral.md`) — trate os 9 pela regra §14.6.3; (d) `J-B-GOV-SEM-TETO.md` e `votos/B-GOV-SEM-TETO/*` vindos da `main` também citam `dd79c96f`: são registro de outro bloco e ficam intocados — cobrá-los é reprovação por construção."* C1‴ e C2‴: nenhuma errata — nada do que julgam muda.

- **§14.12, passos afetados:** 1 (`M`) **feito** (`7d02d8da`); 4 (K1) ganha R-A, R-B e a Emenda 4 do comando; 6 ganha `PORTEIRO-395.md` com o md5 na mensagem do commit e no corpo do PR; 7 mede `3b1fe0f9 → objeto`. **Esta §14.14 vai em commit próprio de `docs(plano)` — nunca amendada ao `M`** (14.6.3(2): `M` só traz o que a `main` tem). Nada disto depende da E4 do pré-voo.

### 14.15 EMENDA — mutante que NÃO TERMINA na E4 do pré-voo (2026-09-29, 20:2x): classificação TIMEOUT, mecanismo de desbloqueio, regra para os próximos, fronteira 25

- **Fato do orquestrador (29/09 ~20:15, herdado como relato, não como medida minha):** na E4 do pré-voo em curso (`w-e4`, `c32f77b5`, `--controle --jobs 4`, matriz iniciada 28/09 ~17:32) o mutante da **l.161** de `scripts/mandato-preflight.sh` (`if (fc == "") {` → M10 `if (0) {`) está parado desde 28/09 17:32:49; `grep -n timeout scripts/mandato-mutantes.sh` = 0 — a ferramenta não tem timeout por mutante e o `wait` da l.295 espera para sempre.
- **Fatos meus (medidos 29/09 20:19-20:27, git e processos só leitura; experimentos em cópia no scratchpad, nunca em `w-e4`):**
  1. **O travamento reproduz fora da E4:** cópia do blob `faa408c8` + M10 na l.161 (`diff` = 2 linhas, `bash -n` ok) sobre um mandato em bullets (`## MEDIDO / - 3058 de 3060 / - 12 de 13 / ## HIPOTESE / …`): **pristino** → `ec=1`, 2 `REJEITADO` (unidade sem `medido por:`), <1 s; **mutante** sob `timeout -k 5 60 bash -x` → **`ec=124`**, 0 linhas de stdout, e o trace pára na invocação do `awk` do oráculo (l.150-197 do script, `' $NORM`).
  2. **A causa é um laço infinito no `awk`, não um bloqueio de I/O:** com `if (0)` toda linha cai no ramo "dentro de cerca" (l.178+), cuja condição (l.179) chama `marcaResto(l)` → `marcaLen(l)` **sem a guarda `mc==""`** da l.160; e `marcaLen("")` — `c=substr("",1,1)=""; while (substr(s,k+1,1)==c) k++` — **nunca sai** para linha vazia (a l.2 de qualquer `mandato()` do guard é vazia). Micro-experimento: `timeout -s KILL 5 awk '…marcaLen("")…'` → morto, `ec=137`; controle `marcaLen("## MEDIDO")`=2, `marcaLen("```")`=3.
  3. **Por que o `bash` parece "parado, sem filho":** a substituição de comando `ESTRUT=$(awk … "$NORM")` (l.197) é um subshell; o subshell morreu e o **`awk` ficou órfão, girando** — `Win32_Process`: `awk.exe` PID **40484**, `ORAC=/tmp/tmp.wFJgiCdkJP/oraculo`, criado **09-28 17:32:50** (mesmo segundo do `bash` 14300), pai 13224 **inexistente**, CPU 4833 s e crescendo; o `bash` 14300 (criado 17:32:49) está bloqueado **lendo o pipe** cuja ponta de escrita é esse `awk`. O filtro por `m161` não o vê porque a linha de comando do `awk` leva o caminho do `oraculo`, não o do mutante. Cadeia viva do m161: `node --test` 51396 → `node` 45744 → `bash` 14300 (+ o órfão 40484). `.tap` = 15 bytes (`TAP version 13`, 0 casos).
  4. **Há um SEGUNDO `awk` órfão, anterior à E4:** PID **10516**, `ORAC=/tmp/tmp.iDvZQDZick/oraculo`, criado **09-28 02:27:43** (a E4 começou 16:04), pai 19872 inexistente, **24249 s de CPU (~6,7 h)** — sobra de uma rodada da madrugada de 28/09 (as duas rodadas contaminadas do Dev-S, `P-GOV-MANDATO-3-MUTANTES-PREFLIGHT`), mesma classe de laço, disputando núcleo com a E4 desde então.
  5. **Estado da rodada (só leitura em `C:/Users/AMP/AppData/Local/Temp/tmp.HTCnbfYDsQ/`):** `matriz.txt` com **40** linhas (pontos 120-238: 22 VERMELHOS, 6 VERDES/NÃO-COBERTOS — l.165, 182, 187, 188, 189, 190 —, 12 EXCLUÍDOS); `pontos.txt` = 162; vagas vivas: m161 (travada), m225/m239/m240 (bash criados 20:27:15-16, sãs). **Toda** fixture do guard tem linha vazia → no m161 **cada** um dos 299 casos travaria: desbloquear só o caso 1 não resolve.
  6. **A hipótese da §14.3 (fim 28/09 22:00-22:30) foi DERRUBADA** pelo travamento + 2 suspensões da máquina (eventos 42/1, relato do orquestrador).

**Decisões:**

1. **Classificação do ponto 161 — categoria própria `TIMEOUT`, fora de K e fora de NÃO-COBERTOS.** Comportamento **mudou e é medido** (o pristino termina; o mutante não termina — item 1, com causa no item 2). Pela prática de mutação (Stryker `Timeout`, PIT `TIMED_OUT`) conta como **detectado por comportamento**; pelo contrato da ferramenta (cabeçalho l.41: VERMELHO = `# fail` acima da base) **não há categoria** — e o guard **não** o detecta por asserção (o `spawnSync` de `roda()` l.104 não tem `timeout`: o caso trava junto). Portanto: a linha bruta da ferramenta (depois do desbloqueio: `161 | ANOMALIA-DENOMINADOR | M10 | tests=0 nao conta`) é publicada **verbatim**, e a matriz publicada (K2) acrescenta a reclassificação `161 | M10 | TIMEOUT — comportamento mudou (mutante não termina: laço em marcaLen("") alcançado sem a guarda mc==""); detectável só por timeout, que o guard não tem; vaga morta pelo orquestrador em <hora> após <N h acordado>`. Não soma a K (o guard não reagiu por asserção), não soma a NÃO-COBERTOS (a mudança é detectável por qualquer executor com timeout — o próprio job do CI morreria), **não entra em [M-1]** (que conta `NAO-COBERTOS − equivalentes`), e é declarada como **fronteira 25** (item 4). A C2‴ **não** põe pontos TIMEOUT no `--only` (a rodada dela travaria): reproduz por **execução direta com `timeout 60`** do mutante feito à mão (item 1) e pelo micro-experimento do item 2 — se o mutante terminar em 60 s sobre a fixture do item 1, a classificação cai.

2. **Mecanismo — NÃO matar o `bash` 14300 sozinho.** Matá-lo deixaria o `awk` 40484 girando para sempre e, pior, o `node --test` seguiria para o caso 2, que trava de novo (item 5): 298 mortes seguidas. O que se mata é **a vaga inteira, da raiz, mais o órfão**, nesta ordem e com re-verificação imediata de cada PID (PID, data de criação, linha de comando com `tmp.HTCnbfYDsQ/m161` ou `ORAC=/tmp/tmp.wFJgiCdkJP`, pai) — PIDs se reciclam:
   (i) `taskkill /PID 51396 /T /F` (o `node --test` do m161 e a árvore 45744 → 14300);
   (ii) `Stop-Process -Id 40484` (o `awk` órfão do m161, pai inexistente, CPU crescendo);
   (iii) conferir em 60 s: `roda_guard` do m161 devolve (`.tap` sem `# tests` → `tests=0` → l.229-230 imprime `ANOMALIA-DENOMINADOR`, `rm -rf m161`, a vaga libera) e `matriz.txt` ganha a linha 161; nenhum processo com `m161` ou `tmp.wFJgiCdkJP` vivo;
   (iv) **também** `Stop-Process -Id 10516` (o órfão de 28/09 02:27: pai inexistente, 24249 s de CPU, `ORAC=/tmp/tmp.iDvZQDZick`) — é resíduo **deste bloco** (mesma classe, sessão morta), não alheio; queima um núcleo e retarda a E4 sem mudar resultado nenhum;
   (v) registrar em `scratchpad/E4/log.txt` (só acréscimo): hora, PIDs, datas de criação, CPU antes, bytes do `.tap`, os comandos e as saídas, e as janelas acordadas (eventos 42/1).
   Nunca: o `bash` principal da ferramenta (linha de comando com `mandato-mutantes.sh`), as vagas m225/m239/m240, ou qualquer processo sem `tmp.HTCnbfYDsQ`/o `ORAC` nomeado na linha de comando.

3. **Regra para NOVOS mutantes travados, até o fim da rodada (critério medível):** uma vaga `mN` está **travada** quando o `.tap` dela **não cresce por ≥ 15 min de máquina acordada** (o guard escreve uma linha TAP por caso; 299 casos em ≈ 531 s → 1,8 s/caso; 15 min ≈ 500× a média) **e** a folha da vaga é um `awk` com CPU crescendo (2 amostras a ≥ 5 s) **ou** um `bash` com CPU parada cujo `awk` de substituição está órfão. Ação: (a) registrar como em 2(v); (b) reproduzir **fora** da E4, em cópia, com `timeout -k 5 60 bash -x <mutante> <fixture>` e nomear a causa (como o item 1-2 fez); (c) matar a vaga da raiz + órfão, como em 2(i)-(iii); (d) a ferramenta imprime `ANOMALIA-DENOMINADOR` e o K2 reclassifica `TIMEOUT` com a causa. A rodada **continua** (a matriz completa segue obrigatória, §14.3). **Hipótese nova de fim (derruba: `FIM preflight` em `log.txt`):** ≈ 122 pontos restantes → ≈ 55 execuções do guard × 531 s ÷ 4 vagas, sem os dois `awk` disputando núcleo ≈ 2 h acordadas → ≈ 22:30-23:00 de 29/09.

4. **Fronteira 25 (ferramenta E4 + guard) e pendência com dono:** *"sem timeout por mutante (ferramenta, `roda_guard` l.123-127 e `wait` l.295) nem por caso (guard, `spawnSync` l.104 sem `timeout:`): mutante que não termina bloqueia a rodada e o caso; TIMEOUT é classificação manual pelo protocolo do §14.15(3)"* — declarada em `…-mutantes.md` §7 (item 7, K2) e em `P-GOV-MANDATO-3-FRONTEIRAS` (25), **dono `B-GOV-MANDATO-2`** (o bloco que mudar o blob da ferramenta depois do voto — os blobs seguem congelados, §14.2.1; consertar agora recomeçaria as duas matrizes do zero sem mudar veredito nenhum): contrato do conserto — `--timeout <s>` por mutante com morte da árvore de processos e categoria `TIMEOUT` impressa pela ferramenta (contada como detectada por comportamento, publicada separada de K); no guard, `timeout: 60_000` no `spawnSync` de `roda()` e asserção `r.signal === null` (Dev-T do bloco dono). O que fica declarado **neste** ciclo, como `ajuste` `dentro-do-bloco`: *o guard do pré-voo não distingue "o artefato não termina" — o caso trava junto*; não é `bloqueia`: o pristino termina em toda fixture (linha de base `fail=0 de 299` em 531 s) e o CI mataria o job por timeout.

5. **ERRATA nova — E-8 (c2c e c3c; entra na lista da §14.13; o orquestrador aplica prefixada, nos dois espelhos). Texto literal:** *"ERRATA E-8 (plano §14.15): (a) [C2‴] a matriz do pré-voo publicada tem UMA categoria a mais, `TIMEOUT` (hoje o ponto l.161, M10: o mutante não termina — laço em `marcaLen(\"\")` alcançado sem a guarda `mc==\"\"`): a linha bruta da ferramenta para ele é `ANOMALIA-DENOMINADOR` (vaga morta pelo orquestrador) e a reclassificação vem ao lado, com a causa; ele NÃO entra em K, em NÃO-COBERTOS nem em [M-1]. NÃO inclua pontos TIMEOUT no seu `--only` (a sua rodada travaria — a ferramenta não tem timeout, fronteira 25); reproduza por execução direta do mutante feito à mão sob `timeout -k 5 60`, com o pristino como controle, e pelo micro-experimento `awk 'BEGIN{print marcaLen(\"\")}'` sob `timeout 5`; se o mutante terminar, a classificação cai (achado). Todo comando seu que execute o artefato mutado vai sob `timeout`. (b) [C3‴] a entrada do history sobre mutação cita os N/K BRUTOS da ferramenta e, à parte, `1 TIMEOUT (l.161)` com o ponteiro para `…-mutantes.md`; `P-GOV-MANDATO-3-FRONTEIRAS` tem a 25 (sem timeout na ferramenta e no guard; dono `B-GOV-MANDATO-2`); a ausência de timeout no guard é `ajuste` dentro-do-bloco já declarado no plano — cobrá-la como `bloqueia` é reprovação por construção."*

**Registro (K1/K2, Dev-S-2):** a `P-GOV-MANDATO-3-MUTANTES-PREFLIGHT` passa a citar o travamento (ponto, causa, hora da morte, N h acordado) e a fronteira 25; o `…-mutantes.md` §4 publica a matriz **com** a linha bruta e a reclassificação, e §5 ("a rodada achou defeitos na própria ferramenta") ganha o item "sem timeout: um mutante que não termina bloqueia a rodada — medido em 29/09, l.161". **Sucessão inalterada** (§14.12/§14.14); esta §14.15 vai em commit próprio `docs(plano)`.

*Limpeza §C5 (§14.15, 1 linha):* removidos pelo nome `scratchpad/pl15-exp` (cópias, fixture, trace) e `s14-15.lf.md`; o `awk` do meu experimento morreu com o `timeout` (nenhum processo com `tmp.Kw9pVhprQ6` ou `pl15-exp` vivo, `Win32_Process`); nenhum processo da E4 tocado; nada rastreado tocado além deste arquivo; base viva nunca alvo.

### 14.16 EMENDA — o achado do Dev-S-2 no K1 (2026-09-29, 22:2x): `npm test` com banco sai `ec=1` no win32 por causa do skip do `[V18]`; Dev-T-5, E4-refs-3, e as 5 divergências do K1

- **Objeto:** `w-mandato` avançado por fast-forward autorizado para `a737250a` (K1 do Dev-S-2, 22:05: "KPI do #393 recontado pos-integracao, R-A/R-B do #395 e as pendencias do §14.12"); os 5 blobs no head: `mandato-refs.sh` `474c7521` · `mandato-preflight.sh` `faa408c8` · `mandato-mutantes.sh` `37549262` · `mandato-refs.test.ts` **`9e680314`** (pós-Dev-T-4, `395d07c9`) · `mandato-preflight.test.ts` `3d875a54`.
- **Achado (Dev-S-2, `scratchpad/DEV-S2-K1.md` [K1-T8]/[K1-T11], `devs2k1/runs.log`; quem achou não conserta):** RUN1 (21:07→21:36) e RUN2 (21:36→22:02) de `npm test` com `DATABASE_URL` (pg 16 descartável, `CORE_SAAS_PERSISTENCE` não exportado) em `ade74d09`: `# tests 3392 · pass 3389 · fail 0 · skipped 3`, **`ec=1` nas duas** — `[run-backend-tests] GUARD DE SKIP (P8): DATABASE_URL presente e 3 teste(s) pulados > orçamento 2`. CI no mesmo head (ubuntu, 2 jobs `backend`): `3392 · 3390 · 0 · 2`, `ec=0`.
- **Fatos meus (medidos em `a737250a`):** o runner (`scripts/run-backend-tests.mjs` l.67-82, 90-94, 437-442; nascido em `f081b5d0` #359) fixa **`SKIP_BUDGET_DB = 2`** com os **dois skips NOMEADOS** (`tests/permission-catalog-db-parity.test.ts`, gated por `RBAC_DB_PARITY != "1"`) e recusa "orçamento anônimo" por escrito; o 3º skip é o **`[V18]`** de `tests/mandato-refs.test.ts` (l.786-789: `skip: process.platform === "win32" ? "equivalente em win32 (fronteira 23) …" : false`), nascido em **`9d3de5dd`** (Dev-T-3; `git log -S'equivalente em win32 (fronteira 23)'`), único `skip:` do arquivo (`grep -c` = 1); **em win32 a âncora de bit x do caso PASSA**: `writeFileSync(…, {mode: 0o644})` + `chmodSync(0o644)` → `statSync().mode` = `0o100666`, `& 0o111 = 0`, para `.sh`, sem extensão e `.cmd` (node v20.19.5, experimento no scratchpad) — logo o pristino do `[V18]` (status 0, lê a ata) **passa** em win32; o skip existia só porque ali o caso não discrimina o mutante (shim com shebang executa direto), e isso a §14.4 já fechou com `[V18b]`/`[V18c]`. `[P-0]`: `git diff --numstat 34969a81 HEAD -- tests/mandato-refs.test.ts` = **498 0** — o hunk do `[V18]` é deste ciclo; editá-lo continua adição pura contra `34969a81`. E4-refs-2 terminou 22:07 em `395d07c9` (tripla `474c7521`/`9e680314`/`37549262`): `N=46 K=46 NAO-COBERTOS=0 EXCLUIDOS=52 ANOMALIAS=1` (l.164), base `fail=0 de tests=39`, controles OK (`scratchpad/E4B/refs.txt`) — a hipótese da §14.4 confirmou-se.

**Decisões:**

1. **Classificação:** `dentro-do-bloco` (o skip nasceu em `9d3de5dd`, neste ciclo), gravidade **`ajuste`** — não `bloqueia`: o CI está verde nas duas formas, nenhuma suíte `-db` deixou de rodar, e o efeito é restrito a **win32 com `DATABASE_URL`** (a forma canônica 3 do runner na máquina do dev). **Mas fecha-se ANTES da junta 3**, como o `[B8b]` (§13.1): deixado como está, a C3‴ reexecuta o KPI 2× nesta máquina, obtém `ec=1` com `fail 0` e tem de classificar um defeito que o plano já conhece — `bloqueia` fabricado por omissão (§1.1 A8/A13), e legítimo (o bloco deixa a forma canônica 3 vermelha no win32 desde `9d3de5dd`). Os números do K1 (3392/3389/0/3, N=2, denominador idêntico) são **execução real e ficam no history como registro**, com a nota "ec=1 pelo guard P8: 3º skip = `[V18]` em win32; corrigido em T5" — eles são o **vermelho-controle** do remédio (mesmo head menos T5).

2. **Remédio e papel — Dev-T-5** (`dev-t5-mandato-v18-win32`, identidade nova; **só** `tests/mandato-refs.test.ts`; inelegíveis para o papel: Dev-T, Dev-T-3, Dev-T-4, Dev-S, Dev-S-2, orquestrador, planejador, C1′/C2′/C3″; inelegível como jurado depois): o `[V18]` **deixa de pular** — sai o objeto `{ skip: … }` (o caso roda em toda plataforma; a âncora de bit x fica, medida acima) e o comentário passa a dizer: *"roda em toda plataforma; discrimina o mutante `-f`→`-d` só onde há bit x (ubuntu); em win32 a cobertura das l.116/119 é de `[V18b]`/`[V18c]` (plano §14.4) — a fronteira 23 está fechada"*. **Formas rejeitadas, com motivo:** (a) tocar o runner — `scripts/run-backend-tests.mjs` é PROIBIDO (§4: "qualquer outro `scripts/*`"), e a mudança seria errada em si (subir o orçamento para um skip não nomeado é o "orçamento anônimo" que o runner recusa em l.80-81); (b) `return` silencioso em win32 — é o **auto-pulo** que o P8 existe para caçar; (c) pular "sem contar como skip" — não existe: o runner lê `# skipped` do TAP (l.287). **Prova do Dev-T-5 (worktree próprio, `npm ci` próprio):** `node --test --import tsx --test-reporter=tap tests/mandato-refs.test.ts > refs.tap` → `# tests 39 · pass 39 · fail 0 · skipped 0` (lido do arquivo); `bash scripts/mandato-mutantes.sh refs --only 116,119` → **116 e 119 VERMELHOS** (inalterado); ausência 0/39. **⇄ mutação que falsifica o remédio:** repor o `skip:` → `skipped 1` no guard e, na suíte com banco, `skipped 3` + `ec=1` (= RUN1/RUN2 do K1). A prova de que a suíte inteira volta a `ec=0` é a recontagem do item 4.

3. **E4-refs-3 — sim, refaz.** O blob do guard muda de novo → a tripla da matriz do refs muda (§14.8) → o orquestrador reexecuta `bash scripts/mandato-mutantes.sh refs --controle --jobs 4` em worktree detached **novo** (`C:/Users/AMP/w-e4c`, no commit `T5`; `npm ci` próprio) → `scratchpad/E4C/refs.txt`. **Hipótese (derruba: a linha `N=…`):** `N=46 K=46 NAO-COBERTOS=0 EXCLUIDOS=52 ANOMALIAS=1`, base `fail=0 de tests=39` — agora sem skip. Sem exceção "o resultado vai ser igual": matriz prevista é matriz narrada (§9 R10). A E4 do pré-voo em curso **não é afetada** (tripla `faa408c8`/`3d875a54`/`37549262` intocada). O K2 publica a E4-refs-3 como **a** matriz do refs; a E4-refs-2 fica citada como rodada anterior, com tripla e números.

4. **KPI (Dev-S-2 fase 2, K1b — pode ir junto do K2):** `npm test` **N=2** com banco descartável em `T5` (mesma forma do K1); esperado `3392 · 3390 · 0 · 2`, **`ec=0`**, sem a linha do P8 (derruba: `skipped 3`/`ec=1` → o remédio falhou); `kpis-latest.json` = essa recontagem; history: **entrada nova** "recontagem após T5" (a do K1 fica, com a nota do item 1); Δ por arquivo contra `$MB` (`3b1fe0f9`: 3052/3054) e `34969a81` (3103/3105) refeito: pré-voo 33→299, refs 18→39 (+287 = 3392 ✓ — o Dev-S-2 já fechou essa aritmética no K1-T8).

5. **ERRATA nova — E-9** (c2c, c3c e a lista de inelegíveis dos 3 corpos; entra na §14.13; prefixada, dois espelhos). Texto literal: *"ERRATA E-9 (plano §14.16): (a) [C3‴, item 2a] no win32 com `DATABASE_URL`, o head julgado (pós-T5) dá `# skipped 2` e `ec=0` — as duas execuções do K1 (`ade74d09`: `skipped 3`, `ec=1` pelo GUARD DE SKIP (P8) do runner, 3º skip = `[V18]` em win32) são o vermelho-controle do conserto, não uma divergência; `ec=1` com `fail 0` num head PÓS-T5 é achado. (b) [C3‴, item 4b] o commit do Dev-T-5 (`T5`, só `tests/mandato-refs.test.ts`) é classe T sem par de script, como `T4` — fora da ordem por par; o `[P-0]` continua 'só adições' contra `34969a81` (o hunk do `[V18]` nasceu no ciclo). (c) [C2‴, item 2] a matriz do refs publicada é a E4-refs-3, tripla `474c7521` / `<blob do guard em T5>` / `37549262`, com base `fail=0 de tests=39` e `skipped 0`; a E4-refs-2 (`9e680314`) é rodada anterior citada, não a matriz. (d) [os 3 corpos] inelegível a mais: Dev-T-5 (`dev-t5-mandato-v18-win32`, commit `T5`)."* C1‴: só (d).

**As 5 divergências do Dev-S-2 (`DEV-S2-K1.md` [K1-T1]/[K1-T5] e o relato do orquestrador), veredito de cada:**

| # | divergência | veredito |
|---|---|---|
| 1 | "Emenda 6" em vez de "Emenda 4" | **ratificada, e é errata minha na §14.14:** escrevi "hoje Emendas 1–3" lendo uma janela truncada (l.259-300) — a seção já tinha as Emendas 4 e 5 desde `1466c7d9`; a numeração segue o arquivo |
| 2 | marca da R-B **sem** o SHA antigo | **ratificada, e é errata minha na §14.14:** a marca que ditei continha `dd79c96f` e o teste de fechamento exigia `git grep -c dd79c96f … = 0` — incompatíveis; vale o teste; a marca descreve ("commit de ramo squashado, fora da `main`") sem o SHA. O Dev-S-2 mediu no objeto: `dd79c96f` → 0, `b3f0af5f` → 4 (era 2) |
| 3 | fronteira 24 em `…-mutantes.md` §7 no K1 (a §14.4 dizia K2) | **ratificada:** a tabela de ordem do §14.12 (passo 4) já a punha no K1; K1/K2 podem ser um só |
| 4 | `CORE_SAAS_PERSISTENCE` **não exportado** (o prompt mandava `=memory`) | **ratificada:** vale o plano (§7 l.942, citado por §14.11.2); o runner declara "memory — padrão do runner", efeito medido igual ao CI; a C3‴ usa a **mesma** forma e publica a linha de declaração do runner |
| 5 | §8 regra 3 — relatório do dev passado pelo **pré-voo novo** — NÃO feito | **não ratificada:** a regra existe para o dogfooding do próprio artefato em mandato real (§8 "DOGFOODING 1"). O Dev-S-2 roda `bash scripts/mandato-preflight.sh <DEV-S2-K1.md> 393` **e** o do K1b/K2, e cola o `PRE-VOO OK` nos relatórios antes do K2. REJ por regra legítima → corrige o relatório (o texto da R-A cita o nome do campo reservado por extenso: escrever "o campo de aprovação" ou colar a ferramenta — regra 8 do §8, §13.7 D-S-2); REJ por bug do script → achado, reporta, **não conserta** |

**§14.12 — ordem atualizada a partir daqui:** K1 **feito** (`a737250a`) → **T5** (Dev-T-5) → **E4-refs-3** (orquestrador, `w-e4c`) ∥ E4 do pré-voo (em curso; orquestrador: 83 linhas às 22:10, fim ≈ 01:00 — hipótese dele) → **K1b + K2** (Dev-S-2: recontagem em T5; matrizes refs-3 e pré-voo completa; pré-voo dos relatórios; fechar `…-MUTANTES-REFS`/`…-MUTANTES-PREFLIGHT`) → registro + ERRATAs E-9 (orquestrador) → inspetor (corpo do head integrado; ancestralidade `3b1fe0f9 → objeto`) → junta 3. Só K2, o inspetor e a junta dependem do fim da E4 do pré-voo. Esta §14.16 vai em commit próprio `docs(plano)`.

*Limpeza §C5 (§14.16, 1 linha):* removidos pelo nome `scratchpad/pl16-exp` (experimento de bits) e `s14-16.lf.md`; fast-forward de `w-mandato` para `a737250a` feito por autorização escrita do orquestrador (único git de escrita, e sem mudança de conteúdo); nada rastreado tocado além deste arquivo; nenhum processo tocado; base viva nunca alvo.

### 14.17 EMENDA — pós-T5 (2026-09-29, 22:4x): o comentário falso das l.828-830 do guard, a "ausência 0/N", e o blob que a E4-refs-3 mede

- **Fatos (medidos em `w-mandato`, fast-forward autorizado `ea716ad4` → `190e2300`):** T5 = `190e2300` (22:31, "[V18] roda em toda plataforma, sem skip em win32"), pai `ea716ad4`, `git diff --numstat` = `8 12` só em `tests/mandato-refs.test.ts`, blob do guard **`444ce61a`**; o `[V18]` (l.780) diz "RODA EM TODA PLATAFORMA (plano §14.16) — sem `skip` e sem `return` antecipado". Relatório `scratchpad/DEV-T5.md`: TAP 39/39/0 skip; `--only 116,119` → base `fail=0/39`, ambos VERMELHOS; vermelho-controle (skip reposto → `skipped 1`) feito e desfeito; `[P-0]` 494/0. **Divergência declarada por ele (quem achou não conserta):** o cabeçalho do bloco do Dev-T-4 (nascido em `395d07c9`), l.828-830, afirma no presente *"e o [V18], que os mira pelo bit x, e `skip` em win32"* — **falso desde o T5**. Ele não editou (mandato "nada mais no arquivo"); e não rodou a "ausência 0/39" da §14.16(2) — a ferramenta só mede pontos pedidos por `--only`, e o guard não tem matriz de ausência própria (o `[V15]`, l.679, é outra propriedade: zero leitura da fonte).

**Decisões:**

1. **Corrigir AGORA, comentário só, por Dev-T-4** (`dev-t4-mandato-refs-win32` — autor do trecho; o achador é o Dev-T-5; o planejador sou eu: §C7.4-bis intacto) → commit **T6**, só `tests/mandato-refs.test.ts`, só a frase das l.828-830, que passa a: *"e o [V18], que os mira pelo bit x, ERA `skip` em win32 até o T5 (plano §14.16) — desde então roda em toda plataforma"* — nenhuma outra linha; `[P-0]` continua "só adições" contra `34969a81` (o bloco nasceu em `395d07c9`, neste ciclo); `npm run check` e `lint` verdes; TAP 39/39/0 inalterado. **Por que não deixar como narrativa datada:** uma afirmação falsa no presente, num guard rastreado, é a classe *"premissa escrita como fato"* que já obrigou ERRATA em 6 corpos (C3b-02); a C1‴ (item 9, comentários × asserção) e a C3‴ (`[P-0]` hunk a hunk) a leriam — achado real, não fabricado — e o plano já a conhece: fecha-se antes da junta, como o `[B8b]` e o skip do `[V18]`. Custo não é critério; a E4-refs-3 está retida de qualquer modo. **A E4-refs-3 mede a tripla com o blob do guard em T6** — o orquestrador a lança só depois do push do T6 (`w-e4c`, detached em T6). Hipótese (derruba: a linha `N=…`): `N=46 K=46 NAO-COBERTOS=0 EXCLUIDOS=52 ANOMALIAS=1`, base `fail=0 de tests=39`, `skipped 0`.

2. **"Ausência 0/N" — é medição de ARNÊS, não da ferramenta, e já é o item 6 da C2‴** (corpo l.309-314: *"0/N ao artefato apagado … vermelho-controle: com o artefato presente, os mesmos N passam"*): **não é pré-condição da junta** além do que o corpo dela já exige; a omissão do Dev-T-5 é divergência declarada, não defeito. Forma (para o Dev-T-4 na trilha do T6, como prova do dev, e para a C2‴, independente): cópia pristina do head por `git -c core.autocrlf=false archive` + `git init` (a mesma receita do §8 l.961-962), `mv <copia>/scripts/mandato-refs.sh <copia>/scripts/mandato-refs.sh.AUSENTE`, `node --test --import tsx --test-reporter=tap <copia>/tests/mandato-refs.test.ts > ausencia.tap` (o guard resolve `SCRIPT` por `import.meta.dirname/../scripts/…`, l.34-35 — na cópia aponta para o ausente) → **`# pass 0` de 39** (todo caso falha: `spawnSync` de arquivo inexistente); controle: a mesma cópia com o script de volta → 39/39; `hash-object` dos rastreados = blob no fim. A §14.16(2) fica **emendada**: onde diz "ausência 0/39" leia-se "ausência 0/39 **por arnês**, como acima".

3. **ERRATA E-9 — texto final (substitui o da §14.16(5); o orquestrador resolve `<blob-T6>` por `git rev-parse <T6>:tests/mandato-refs.test.ts` — 8 hex — antes de aplicar; `444ce61a` é o blob do T5 e fica como histórico):** *"ERRATA E-9 (plano §14.16/§14.17): (a) [C3‴, item 2a] no win32 com `DATABASE_URL`, o head julgado (pós-T5) dá `# skipped 2` e `ec=0` — as duas execuções do K1 (`ade74d09`: `skipped 3`, `ec=1` pelo GUARD DE SKIP (P8) do runner, 3º skip = `[V18]` em win32) são o vermelho-controle do conserto, não uma divergência; `ec=1` com `fail 0` num head PÓS-T5 é achado. (b) [C3‴, item 4b] os commits do Dev-T-5 (`T5`, `190e2300`) e do Dev-T-4 (`T6`, comentário das l.828-830) são classe T sem par de script, como `T4` — fora da ordem por par; o `[P-0]` continua 'só adições' contra `34969a81` (os hunks nasceram no ciclo). (c) [C2‴, item 2] a matriz do refs publicada é a E4-refs-3, tripla `474c7521` / `<blob-T6>` / `37549262`, com base `fail=0 de tests=39` e `skipped 0`; a E4-refs-2 (`9e680314`) e o blob `444ce61a` (T5) são história citada, não a matriz. (d) [C2‴, item 6] a 'ausência 0/N' do refs é medida por arnês (cópia pristina com `scripts/mandato-refs.sh` renomeado → `# pass 0` de 39; controle 39/39), nunca pela ferramenta. (e) [os 3 corpos] inelegível a mais: Dev-T-5 (`dev-t5-mandato-v18-win32`, commit `T5`); o Dev-T-4 já consta."* C1‴: só (e).

**Ordem a partir daqui:** T5 feito → **T6** (Dev-T-4, comentário + prova de ausência na trilha) → **E4-refs-3** em T6 (orquestrador) ∥ E4 do pré-voo → K1b + K2 (Dev-S-2) → registro + E-9 final → inspetor → junta 3. Esta §14.17 vai em commit próprio `docs(plano)`.

*Limpeza §C5 (§14.17, 1 linha):* removido `s14-17.lf.md`; fast-forward para `190e2300` por autorização escrita; nada rastreado tocado além deste arquivo; nenhum processo tocado; base viva nunca alvo.

### 14.18 EMENDA — a E4 do pré-voo terminou com [M-1] VERMELHO (2026-09-30, 00:4x-01:0x): os 16 não-cobertos classificados por execução, a anomalia 340, a re-medição por DELTA com lema, e o que o K2 espera

- **Objeto:** `w-mandato` em `396643aa` (fast-forward autorizado, já lá); blobs `mandato-preflight.sh` `faa408c8` · `mandato-mutantes.sh` `37549262` · `mandato-preflight.test.ts` `3d875a54` · `mandato-refs.test.ts` `d455ae1a` · `mandato-refs.sh` `474c7521`.
- **Fatos do orquestrador (lidos em `scratchpad/E4/preflight.txt` e `log.txt`, não herdados):** rodada completa do pré-voo (tripla **A** = `faa408c8`/`3d875a54`/`37549262`, `w-e4` detached em `c32f77b5`) terminou 30/09 00:44:53: `N=103 K=87 NAO-COBERTOS=16 EXCLUIDOS=57 ANOMALIAS=2`, base `fail=0 de tests=299`, 162 pontos, controles OK, `[M-4]` ok (contei: 87 VERMELHO, 16 VERDE, 57 EXCLUÍDO, 2 ANOMALIA — 161 `ANOMALIA-DENOMINADOR` = o TIMEOUT da §14.15; 340 `ANOMALIA-DIFF M7(next) linhas-trocadas=0`). E4-refs-3 (`E4C/refs.txt`, tripla `474c7521`/`d455ae1a`/`37549262`, `396643aa`) terminou 00:06: `N=46 K=46 NAO-COBERTOS=0 ANOMALIAS=1` — hipótese da §14.17 confirmada. **O critério do bloco ([M-1] l.720; §7 l.937) está VERMELHO no pré-voo: 16 − 0.** Levado à junta assim, a C2‴ reprova com razão, e é critério do próprio bloco.
- **Medição minha (arnês no scratchpad, nunca em worktree alheio):** cópia pristina pela receita do §8 l.961-962 (`git archive` + `git init`, 335 rastreados; `hash-object` do script = `faa408c8`); os 18 mutantes feitos **com o mesmo `sed` da ferramenta** (l.176-211), cada um com `diff` = 1 linha e `bash -n` ok; scripts colocados **dentro de `copia/scripts/`** para que `RAIZ` (l.121) seja a cópia — a 1ª rodada, com os scripts fora, deu `RAIZ` errado e rejeitou caminhos no pristino: **descartada e registrada** (classe A11, o arnês era a variável); fixtures dirigidas ao ramo de cada ponto; `MANDATO_REFS` = shims meus; `timeout -k 5 60`; veredito por md5 da saída pristino × mutante. Controles: pristino `PRE-VOO OK` em `bullets.md`, `paths.md`, `revpath.md`; REJ esperados nas negativas; rev inexistente (`naoexiste-rev:scripts/mandato-refs.sh`) → REJ.

| ponto | op. | ramo (blob `faa408c8`) | fixture minha | pristino × mutante | classificação | caso novo (Dev-T-6) |
|---|---|---|---|---|---|---|
| 165 | M10 | abertura de cerca FORA das seções → `FORA` | `cerca-fora.md` (cerca l.1-4 antes de `## MEDIDO`, l.3 vazia) | DIFERE: mutante não lista `1: ```` | **teste** | **[F-2d]** cerca fora das seções: a listagem de conteúdo fora nomeia **abertura (l.1), conteúdo (l.2) e fechamento (l.4)** e **não** a linha vazia (l.3) |
| 182 | M10 | fechamento de cerca fora → `FORA` | idem | DIFERE: não lista `4: ```` | **teste** | [F-2d] |
| 189 | M4 | linha de conteúdo dentro de cerca fora | idem | DIFERE: lista `3: ` (vazia) e não `2: conteudo` | **teste** | [F-2d] |
| 190 | M10 | conteúdo dentro de cerca fora → `FORA` | idem | DIFERE: não lista `2: conteudo` | **teste** | [F-2d] |
| 187 | M4 | `## MEDIDO` engolido por cerca → `SWALLOW` | `engolida.md` (só `## HIPOTESE` real; cerca com `linha`/`## MEDIDO`/`outra`) | DIFERE: `DENTRO de cerca, l.7` × `l.6` | **teste** | **[F-1e]** cabeçalho MEDIDO engolido: a checagem 1 nomeia a **linha exata** (a fixture tem outra linha antes dele na cerca) |
| 188 | M4 | `## HIPOTESE` engolido | `engolida-h.md` (espelho) | DIFERE: `l.7` × `l.6` | **teste** | **[F-1f]** idem para HIPOTESE |
| 393 | M10 | cerca como 1ª coisa da seção: `abre()` | `cerca-primeira.md` (`## MEDIDO` → cerca sem unidade antes) | DIFERE: pristino 2 REJ (`unidade … sem 'medido por:'`, `saida colada sem comando`) `ec=1`; **mutante `ec=0`** | **teste** | **[F-AGG-9]** cerca como primeira coisa de MEDIDO, sem `medido por:` → **exatamente 2 REJ**, `ec=1` (I19 + REJ3M) |
| 249 | M3 | cache do refs por N (`[ ! -f refs.$N.rc ]`) | `paste2.md` + shim **com estado** (1ª chamada `S_A`, 2ª `S_B`; 2 blocos gerados da 1ª) | DIFERE: pristino 2 `COLAGEM`; mutante `NAO bate … DESATUALIZADO` no 2º | **teste** | **[F-7j]** o refs é consultado **uma vez por PR por documento**: shim com estado, 2 blocos iguais → 2 COLAGEM, 0 REJ |
| 255 | M7 | `continue` após `referencias indisponiveis` | `paste2.md` + shim **morto** (`exit 1` em modo completo) | DIFERE: mutante acrescenta `NAO bate … DESATUALIZADO` aos 2 blocos | **teste** | **[F-7k]** refs morto para N: a REJ nomeia a indisponibilidade e `doesNotMatch(/NAO bate|DESATUALIZADO/)` — causa certa, nunca "colagem desatualizada" |
| 514 | M3 | diretório só sob `mobile/flutter_app/` | `paths.md` (`lib/core/sync/`) | DIFERE: mutante `diretorio citado nao existe: lib/core/sync/` | **teste** | **[F-6g]** diretório que existe só sob `mobile/flutter_app/` → OK |
| 515 | M3 | `rev:<dir>/` | `paths.md` (`HEAD:docs/revisoes/SAN3/`) | DIFERE: mutante REJ | **teste** | **[F-6h]** `HEAD:<dir>/` existente → OK (não confere a rev para diretório: l.515) |
| 520 | M3 | `rev:<caminho>` com `/` — a rev tem de resolver | `revpath.md` (`HEAD:scripts/mandato-refs.sh`; `HEAD:package.json` **não** serve: sem `/` não é conferido, I13) | DIFERE: mutante REJ | **teste** | **[F-6i]** `HEAD:<caminho/com/barra>` existente → OK; controle `naoexiste-rev:<mesmo>` → REJ |
| 523 | M7 | `continue` do caso `rev:` | `revpath.md` | DIFERE: mutante REJ | **teste** | [F-6i] |
| 245 | M7 | `*) continue ;;` — bloco sem cabeçalho | `semcab.md` (bloco sem `# refs do PR #`) | **IGUAL** | **equivalente**: o `case *)` só é alcançado com `prim` sem o prefixo, logo `N` (l.247) é vazio e a l.248 `[ -n "$N" ] \|\| continue` dá o mesmo salto | — |
| 318 | M10 | `celulaCheia`: `idx<2 \|\| idx>n → 0` | `tabela.md` (linha `\| a \|` com célula a menos) | **IGUAL** | **equivalente**: em awk, `c[idx]` fora do intervalo é `""` e `~ /[^[:space:]]/` é falso — mesmo 0; a linha de tabela começa por `\|`, logo `c[1]` é vazio | — |
| 336 | M7 | `NR==FNR {…; next}` (1º arquivo = oráculo) | `paste2.md`, `bullets.md`, `paths.md` | **IGUAL** (3 fixtures) | **equivalente**: as linhas do oráculo casam `^[0-9]+ [012] [-MHX] [01]$` (l.164/168-171/180/186) e não carregam caminho, SHA, token nem `medido por:`; `L[FNR]` é sobrescrito pelo 2º arquivo no mesmo intervalo | — |
| 161 | M10 | `if (fc == "")` | §14.15 | não termina | **TIMEOUT** (§14.15) — fora de `--only` | — |
| 340 | M7 | `if (isento(FNR)) next` (fim de linha) | `paste2.md`, mutante **à mão** (`next$`→`;`) | DIFERE: mutante rejeita os caminhos de dentro do bloco colado (`J-X.md`) | **ANOMALIA-DIFF da ferramenta** = fronteira 26 (l.202 aceita `next$`, o `sed` da l.203 exige um caractere depois → 0 linhas trocadas); o ponto é **coberto** (hipótese: F-7c vermelho — derruba: guard sobre o mutante manual → `fail 0`); C2‴ [M-EXT] | — |

**Nenhum dos 16 toca fronteira declarada:** as cercas de 165/182/189/190 estão **fora** das seções (checagem 2) e a de 393 é **a primeira coisa** da seção sem `medido por:` (I19) — a fronteira 18 fala de conteúdo de cerca **sob** um `medido por:`; nada toca a 20 (`caixa-exata:`).

**Decisões:**

1. **Para cada um dos 16: 13 casos novos e 3 equivalentes declarados** (tabela). **Dev-T-6** (`dev-t6-mandato-preflight-16`, identidade nova; só `tests/mandato-preflight.test.ts`; inelegíveis para o papel: Dev-T, Dev-T-3/4/5, Dev-S, Dev-S-2, orquestrador, planejador, C1′/C2′/C3″; inelegível como jurado depois) escreve **[F-2d], [F-1e], [F-1f], [F-AGG-9], [F-7j], [F-7k], [F-6g], [F-6h], [F-6i]** com as fixtures da tabela (shims gerados no arnês do guard, como os F-7*; o shim com estado usa um arquivo-contador no `dir` do guard), **SÓ ADIÇÕES**: `test(` novos, helpers com **nomes novos**, nenhuma linha existente tocada, nenhuma declaração duplicada, nenhum efeito colateral de módulo (são as premissas (b)-(d) do lema, item 3). Os **equivalentes** vão num arquivo **NOVO** `docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-equivalentes.txt` (Dev-S-2, K2 — **autorização nominal** aqui e na emenda do comando; formato da ferramenta l.310-311: `id: justificativa (fixture que tentou discriminar)`), com as três justificativas da tabela e as fixtures nomeadas (`semcab.md`, `tabela.md`, `paste2.md`/`bullets.md`/`paths.md`, reproduzidas no arnês). **Prova do Dev-T-6** (worktree próprio, guard editado ainda não commitado): `bash scripts/mandato-mutantes.sh preflight --only 165,182,187,188,189,190,249,255,393,514,515,520,523 --jobs 4` → **13 VERMELHOS**; guard pristino sobre artefato pristino → `fail 0`; `--only 245,318,336 --equivalentes <arq>` → 3 VERDE e `ec=0` (declarados). ⇄ o que falsifica cada caso está na coluna "pristino × mutante".

2. **Anomalia 340 — fronteira 26 da ferramenta, não do guard:** o operador M7 casa `next` em fim de linha no `grep` (l.202, `([^[:alnum:]_]|$)`) mas o `sed` (l.203) exige um caractere depois → mutante idêntico ao pristino → `ANOMALIA-DIFF` (a ferramenta acertou ao não contar). O ponto, medido à mão, **é discriminável e coberto** (hipótese: por F-7c — os caminhos do bloco colado deixam de ser isentos e são rejeitados). Declarada em `…-mutantes.md` §7 (item 8, K2) e em `P-GOV-MANDATO-3-FRONTEIRAS` (26), dono `B-GOV-MANDATO-2` (conserto: `\(…\|$\)` na âncora do `sed`); a C2‴ prova a cobertura no [M-EXT] (mutante manual → guard → `fail ≥ 1`, com o vermelho-controle `fail 0` no pristino).

3. **Re-medição por DELTA com LEMA — não a rodada completa; a régua é poder de falsificação, não custo.** Depois do T7 (commit do Dev-T-6) o blob do guard muda → tripla **B** = `faa408c8`/`<blob-T7>`/`37549262`. **Lema:** para todo ponto `p` fora de `L` (os 16), `veredito_B(p) = veredito_A(p)`. **Prova:** a enumeração de pontos depende só do artefato (l.143-148) — blob igual → os mesmos 162; EXCLUÍDO/ANOMALIA dependem só de artefato e ferramenta — iguais; um VERMELHO em A é `fail_A(p) ≥ 1` produzido por casos que em B **existem inalterados** e recebem o mesmo insumo → `fail_B(p) ≥ fail_A(p) ≥ 1` → VERMELHO. **Premissas, cada uma medida pela C3‴ (a-e) e pela C2‴ (f):** (a) blobs do artefato e da ferramenta iguais em A e B; (b) `git diff --numstat 3d875a54 <blob-T7>` = `+N 0` — **zero remoções e zero modificações** (linha modificada aparece como remoção); (c) nenhuma declaração de topo duplicada (`grep -oE '^(function|const|let|var) [A-Za-z_$][A-Za-z0-9_$]*' \| sort \| uniq -d` vazio — declaração repetida em JS **substitui** a anterior e mudaria casos existentes); (d) toda linha `+` de topo (fora de `test(`) é `test(`, `function` nova ou `const` de nome novo — nada escreve em binding ou caminho pré-existente no carregamento do módulo; (e) base `fail=0` **com o guard inteiro** em B, impressa pela ferramenta na rodada delta; (f) a amostra da C2‴ (≥ 20% dos VERMELHOS de A, semente publicada) roda **em B** — um VERMELHO→VERDE falsifica o lema e obriga a rodada completa. **A mutação que derruba o lema é exatamente o que (b)-(d) medem:** enfraquecer um caso existente (b), redeclarar `roda`/`mandato` (c), escrever no shim `REFS_OK` no topo do módulo (d). **Por que não a rodada completa:** sob (a)-(e) ela **não tem poder de falsificação adicional** (só repetiria os 87 VERMELHOS por construção) e **re-dispara o travamento da l.161** (protocolo §14.15 de novo); a §14.16(3) exigiu rodada completa do refs porque lá a premissa (b) falhava (12 remoções — o skip) — mesma régua, resultado oposto. **Rodada delta (orquestrador, `C:/Users/AMP/w-e4d` detached em T7, `npm ci` próprio):** `bash scripts/mandato-mutantes.sh preflight --controle --only 165,182,187,188,189,190,245,249,255,318,336,393,514,515,520,523 --equivalentes docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-equivalentes.txt --jobs 4` (**161 fora**: TIMEOUT) → esperado 13 VERMELHO + 3 VERDE, `NAO-COBERTOS=3 EQUIVALENTES-DECLARADOS=3`, **`ec=0`**, controles OK, `[M-4]` ok (≈ 16 × 9,5 min ÷ 4 + controles ≈ 1h40 acordada; hipótese, derruba: `FIM` no log). **Matriz publicada (K2):** as 162 linhas, **cada uma com a tripla que a produziu** (146 de A: 87 K + 57 EXCL + 2 ANOM; 16 de B), o lema com as premissas e quem as mediu, e o resumo recomposto: `N=103 K=100 NAO-COBERTOS=3 (equivalentes declarados 3) EXCLUIDOS=57 ANOMALIAS=2` → **[M-1] = 0**. Isto é matriz **derivada**, com comando por linha — não narrada.

4. **O K2 ESPERA** pela rodada delta (e o K1b espera pelo T7: `backend_tests` cresce com os casos novos) — não publica a matriz atual "como histórico" e segue: a §14.3 exige matriz **completa** com [M-1] cumprido, e o K2 é o único lugar onde ela nasce. A rodada A inteira entra no K2 como o que é: a medição que **achou** os 16 (fica verbatim no §4 do `…-mutantes.md`, com a tripla A).

5. **ERRATA E-10** (c2c, c3c e inelegíveis dos 3; entra na §14.13; prefixada, dois espelhos; o orquestrador resolve `<blob-T7>` por `git rev-parse <T7>:tests/mandato-preflight.test.ts`). Texto literal: *"ERRATA E-10 (plano §14.18): (a) [C2‴, itens 1-3] a matriz do pré-voo publicada é COMPOSTA de duas rodadas com tripla declarada por linha: A = `faa408c8`/`3d875a54`/`37549262` (rodada completa, 146 linhas: 87 VERMELHO, 57 EXCLUÍDO, 2 ANOMALIA) e B = `faa408c8`/`<blob-T7>`/`37549262` (rodada delta `--only` nos 16 não-cobertos de A: 13 VERMELHO + 3 equivalentes declarados em `docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-equivalentes.txt`), unidas pelo lema do §14.18(3). A sua amostra de ≥ 20% dos VERMELHOS de A roda **na tripla B** (é o teste empírico do lema): qualquer VERMELHO→VERDE é achado e derruba o lema; `--only` NUNCA inclui 161 (TIMEOUT). Item 7: os 3 equivalentes (245, 318, 336) têm fixture que tentou e falhou (`semcab.md`, `tabela.md`, `paste2.md`/`bullets.md`/`paths.md`, §14.18) — reclassifique com fixture SUA. Item 4 [M-EXT]: inclua o mutante manual da l.340 (`next$`→`;`), fronteira 26 da ferramenta — esperado VERMELHO (F-7c). (b) [C3‴] as premissas (a)-(e) do lema são suas, por execução: blobs de artefato/ferramenta iguais; `git diff --numstat 3d875a54 <blob-T7>` com 0 remoções; nenhuma declaração de topo duplicada; nenhuma linha de topo nova fora de `test(`/`function` nova/`const` nova; base `fail=0` impressa na rodada B. O commit do Dev-T-6 (`T7`, só `tests/mandato-preflight.test.ts`) é classe T sem par de script; o arquivo `…-ciclo3-equivalentes.txt` (Dev-S-2, K2) tem autorização nominal no plano e na emenda do comando; o KPI é o recontado em T7 (K1b). (c) [os 3 corpos] inelegível a mais: Dev-T-6 (`dev-t6-mandato-preflight-16`, commit `T7`)."*

**Ordem a partir daqui:** **T7** (Dev-T-6) → **rodada delta B** em `w-e4d` (orquestrador) → **K1b** (Dev-S-2: `npm test` N=2 em T7) + **K2** (matrizes refs-3 e pré-voo A+B com lema, `…-equivalentes.txt`, fronteira 26, fechar `…-MUTANTES-REFS`/`…-MUTANTES-PREFLIGHT`, pré-voo dos relatórios) → registro + E-10 → inspetor → junta 3. Esta §14.18 vai em commit próprio `docs(plano)`.

*Limpeza §C5 (§14.18, 1 linha):* removido pelo nome `scratchpad/pl18` (cópia pristina, 18 mutantes, 11 fixtures, 3 shims, saídas) e `s14-18.lf.md`; nenhum processo da E4 tocado; nada rastreado tocado além deste arquivo; base viva nunca alvo.

### 14.19 EMENDA — `MSYS_NO_PATHCONV=1` nos runners da E4 (2026-09-30, 03:xx): a rodada A é válida por construção, a delta B refaz-se no ambiente certo, fronteira 27, e a ERRATA E-11

- **Objeto:** `w-mandato` em `4794169a` (fast-forward autorizado; K2a `371961ac` + K1b `4794169a` do Dev-S-2, T7 `9e8cf1cd` do Dev-T-6); blobs: `mandato-preflight.sh` `faa408c8` · `mandato-mutantes.sh` `37549262` · `mandato-preflight.test.ts` **`7a52d37c`** · `…-ciclo3-equivalentes.txt` `9c691363`.
- **Achado do orquestrador (lido em `scratchpad/E4D/preflight-B.txt` e `DIAGF6I/log.txt`, não herdado):** a rodada delta B abortou pela trava do §13.5 — `LINHA DE BASE … fail=2 de tests=312`, `not ok 311 [F-6i/520]`, `not ok 312 [F-6i/523]` (`REJEITADO caminho citado nao existe: HEAD:scripts/mandato-refs.sh`); reproduzido em `9e8cf1cd` e `371961ac`; causa isolada por controle: `env -u MSYS_NO_PATHCONV` → pass 2; `MSYS_NO_PATHCONV=1` → fail 2. Todos os runners da E4 exportam a variável (`rodar-e4*.sh`, 4 arquivos, medido por `grep -n`), que vaza para a ferramenta e para o artefato medido.
- **Medição minha (git só leitura; `env | grep -c '^MSYS_NO_PATHCONV='` = 0 no meu shell — o arnês da §14.18 correu no ambiente certo; git 2.53.0.windows.2, node v20.19.5, MINGW64_NT-10.0-22631):**
  1. **O pré-voo (`faa408c8`) entrega caminho POSIX a binário nativo em UM único ponto:** l.522 `git -C "$RAIZ" rev-parse --verify --quiet "$rev"` (`grep -n -E '(git|node|python|cygpath|pwd)( |$)'` fora de comentários → só l.121 e l.522). Os demais usos de `RAIZ` (l.513-526) são `[ -d ]`/`[ -e ]` do próprio bash; `bash "$REFS"` é MSYS. Sob a variável, **só** o ramo "rev que resolve" (l.520-525) morre.
  2. **A rodada A não alcança esse ramo:** no guard de A (`3d875a54`) a única citação com rev é **`HEAD:package.json`** (l.1290, F-6d) — **sem `/`**, descartada pela I13 (l.377, "sem extensão e sem barra final"/"nome sem `/`") **antes** da checagem 6. `grep -n -E '[^ ]+:[A-Za-z0-9_.-]*/'` fora de comentários → nenhuma citação `rev:caminho/…`. Logo **nenhum veredito de A depende da variável**: a rodada A é **neutra por construção**. Corolário: **a hipótese "520/523 saíram NÃO-COBERTOS por causa da variável" é FALSA** — saíram porque nenhum caso citava `rev:caminho/` (o mesmo motivo com ou sem a variável); é exatamente o buraco que [F-6i/520] e [F-6i/523] fecham.
  3. **`refs.sh` (`474c7521`) e a ferramenta (`37549262`) são neutros:** o refs não usa `RAIZ`, `pwd`, `cygpath` nem `git -C` — só `git` por cwd com refs como argumento (l.160-212); o guard do refs passa caminhos do Windows (`mkdtempSync`, shims) e `cwd` do node; a ferramenta converte `BASE` por `cygpath -m` (l.98), faz `cd "$RAIZ"` (builtin) e chama `git -C "$PRIS"`/`node … "$d/$GUARD"` com caminhos `C:/…`. As rodadas refs-1/2/3 valem.
  4. **Premissas do lema (§14.18(3)) no guard novo:** (b) `git diff --numstat 3d875a54 7a52d37c` = **245 0** — zero remoções; (c) declarações de topo duplicadas = **0**. No guard novo, os casos que alcançam a l.522 são só **[F-6i/520]** e **[F-6i/523]** (l.1948-1952: `HEAD:scripts/mandato-refs.sh`; [F-6h] é diretório, l.515, sem git).
  5. As trilhas `DEV-T6.md` e `DEV-S2-K1b.md` têm **0** menções à variável; a K1b deu 3403/3405 com `fail 0` (os F-6i passaram) — os dois rodaram sem ela.

**Decisões:**

1. **(a) Validade: a rodada A do pré-voo e as rodadas refs-1/2/3 VALEM — sem refazer.** Não por "vai dar igual": por **construção**, medida nos itens 1-3 (a variável só desliga a l.522; nenhum caso de A a alcança; refs e ferramenta não entregam caminho POSIX a binário nativo). **Falsificador:** um caso do guard `3d875a54` com citação `rev:caminho/…` (o grep achou zero) — ou a amostra da C2‴ (≥ 20% dos VERMELHOS de A) rodada **sem** a variável dando outro veredito. **O ambiente entra na identidade da matriz como 4º elemento** para toda rodada cujo guard alcança a l.522 (B e seguintes): *"Git Bash, `MSYS_NO_PATHCONV` NÃO exportado, git 2.53.0.windows.2, node v20.19.5"* — e a trava do §13.5 já o protege fail-closed (foi ela que abortou a delta).

2. **(b) A fragilidade do artefato sob `MSYS_NO_PATHCONV=1` é `ajuste`, `dentro-do-bloco`, fail-closed** (só falso REJ de `rev:caminho/`; nunca falso OK), **fora do ambiente de uso** (Git Bash padrão; CI ubuntu, onde a variável não existe). **Não se conserta agora:** blobs congelados (§14.2.1) — mexer na l.121 recomeça a matriz inteira do pré-voo sem acrescentar propriedade nenhuma no ambiente de uso. Vira **fronteira 27** com dono `B-GOV-MANDATO-2`: *"o pré-voo calcula `RAIZ` em POSIX (l.121) e o entrega ao `git.exe` (l.522); sob `MSYS_NO_PATHCONV=1` a rev nunca resolve e `rev:caminho/…` é rejeitado; conserto: `RAIZ` em forma que o `git.exe` aceite (`pwd -W`/`cygpath -m`, como a ferramenta faz com `BASE`) + caso [F-6j] (spawn com `MSYS_NO_PATHCONV=1` no `env` → `HEAD:scripts/…` segue OK)"* — em `…-mutantes.md` §7 (item 9, K2b) e em `P-GOV-MANDATO-3-FRONTEIRAS` (27). **Sem caso novo agora:** um caso que exigisse o comportamento certo sob a variável **falharia hoje** (é o defeito), e um que fixasse o falso REJ consagraria o defeito.

3. **(c) O lema do §14.18(3) fica de pé** — a base A é válida (item 1) — com a premissa **(g)** acrescentada: *a rodada B corre no ambiente declarado (variável não exportada), e a neutralidade de A a esse ambiente está provada por construção (item 2)*. A delta é **refeita**, não substituída por rodada completa.

4. **(d) Sucessão:** o orquestrador **corrige os runners** (sai o `export MSYS_NO_PATHCONV=1`; onde um `ref:caminho` com `/` na ref precisar dela, **prefixo por comando** — `MSYS_NO_PATHCONV=1 git show origin/main:x` — ou `git cat-file -p <sha>:<caminho>`; o cabeçalho do log passa a gravar `env | grep -c '^MSYS_NO_PATHCONV='` = 0, `git --version`, `node -v`, `uname -srm`) → **delta B** em `C:/Users/AMP/w-e4e` (detached em `4794169a`; tripla `faa408c8`/`7a52d37c`/`37549262`; `--equivalentes docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-equivalentes.txt` = `9c691363`; `--only` os 16, **161 fora**) → esperado `fail=0 de tests=312`, 13 VERMELHO + 3 VERDE, `NAO-COBERTOS=3 EQUIVALENTES-DECLARADOS=3`, `ec=0` (hipótese; derruba: a linha `N=`) → **K2b** (Dev-S-2: matriz A+B com o lema **e** a premissa (g), a linha de ambiente na identidade, fronteira 27 em §7 e na pendência, o registro da delta abortada como o que é — trava do §13.5 pegando ambiente errado) → registro + ERRATAs → inspetor → junta 3. **E-9: inalterada. E-10: substituída pela v2 abaixo. E-11: nova, aos 3 corpos.**

5. **(e) A divergência Dev-T-6 ("base 0/312") × medição do orquestrador (fail=2): explicada pelo ambiente — RATIFICADA.** A trilha dele tem 0 menções à variável (não a exportou); o meu arnês (variável ausente, medido) e o controle do orquestrador (`env -u` → pass 2) concordam. O mesmo vale para a K1b do Dev-S-2.

**ERRATA E-10 — v2 (substitui a da §14.18; c2c, c3c e inelegíveis dos 3; `<blob-T7>` = `7a52d37c`). Texto literal:** *"ERRATA E-10 (plano §14.18/§14.19): (a) [C2‴, itens 1-3] a matriz do pré-voo publicada é COMPOSTA de duas rodadas com tripla declarada por linha: A = `faa408c8`/`3d875a54`/`37549262` (rodada completa, 146 linhas: 87 VERMELHO, 57 EXCLUÍDO, 2 ANOMALIA) e B = `faa408c8`/`7a52d37c`/`37549262` (rodada delta `--only` nos 16 não-cobertos de A: 13 VERMELHO + 3 equivalentes declarados em `docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-equivalentes.txt`), unidas pelo lema do §14.18(3) com a premissa (g) do §14.19. A sua amostra de ≥ 20% dos VERMELHOS de A roda **na tripla B e SEM `MSYS_NO_PATHCONV` exportado** (é o teste empírico do lema e da neutralidade de A): qualquer VERMELHO→VERDE é achado; `--only` NUNCA inclui 161 (TIMEOUT). A rodada A correu com a variável exportada e é VÁLIDA por construção: o único ponto do pré-voo que entrega caminho POSIX a binário nativo é a l.522, e nenhum caso do guard `3d875a54` a alcança (a única citação rev dele é `HEAD:package.json`, sem `/`, filtrada pela I13). Item 7: os 3 equivalentes (245, 318, 336) têm fixture que tentou e falhou (§14.18) — reclassifique com fixture SUA. Item 4 [M-EXT]: inclua o mutante manual da l.340 (`next$`→`;`), fronteira 26 — esperado VERMELHO (F-7c). A identidade de toda matriz cujo guard alcança a l.522 tem um 4º elemento: o ambiente declarado (Git Bash, variável não exportada, versões de git e node). (b) [C3‴] as premissas (a)-(e) do lema são suas, por execução: blobs de artefato/ferramenta iguais; `git diff --numstat 3d875a54 7a52d37c` = 245 0; nenhuma declaração de topo duplicada; nenhuma linha de topo nova fora de `test(`/`function` nova/`const` nova; base `fail=0 de tests=312` impressa na rodada B. O commit do Dev-T-6 (`T7`, `9e8cf1cd`, só `tests/mandato-preflight.test.ts`) é classe T sem par de script; `…-ciclo3-equivalentes.txt` (Dev-S-2, `371961ac`) tem autorização nominal no plano e na emenda do comando; o KPI é o recontado em T7 (K1b `4794169a`, 3403/3405, ec=0). Fronteira 27 (§14.19) está em `P-GOV-MANDATO-3-FRONTEIRAS`; cobrar o conserto da l.121 neste bloco é reprovação por construção. (c) [os 3 corpos] inelegível a mais: Dev-T-6 (`dev-t6-mandato-preflight-16`, commit `T7`)."*

**ERRATA E-11 — nova (os 3 corpos; corrige a 1ª linha de "Terreno": c1c l.149-151, c2c l.169-172, c3c l.162-164). Texto literal:** *"ERRATA E-11 (plano §14.19): NUNCA `export MSYS_NO_PATHCONV=1` no shell que executa o artefato, o guard ou a ferramenta. O pré-voo calcula `RAIZ` em POSIX (l.121) e o entrega ao `git.exe` (l.522): com a variável exportada a rev nunca resolve, `rev:caminho/…` é rejeitado, [F-6i/520] e [F-6i/523] ficam vermelhos no PRISTINO e a ferramenta aborta com 'linha de base suja' (foi assim que a delta B abortou em 30/09). Onde um `ref:caminho` com `/` na ref precisar dela, use PREFIXO POR COMANDO (`MSYS_NO_PATHCONV=1 git show origin/main:x`) ou `git cat-file -p <sha>:<caminho>`. Antes de rodar artefato/guard/ferramenta, publique `env | grep -c '^MSYS_NO_PATHCONV='` = 0, `git --version`, `node -v` e `uname -srm` — o ambiente é parte da identidade da medição. Caminhos para git/node continuam `C:/…` onde você os escreve; o que muda é não envenenar o ambiente do que você mede."*

*Limpeza §C5 (§14.19, 1 linha):* removido `s14-19.lf.md`; fast-forward para `4794169a` por autorização escrita; nada rastreado tocado além deste arquivo; nenhum processo tocado; base viva nunca alvo.

### 14.20 EMENDA — o arquivo `--equivalentes` é contado por linhas, não conferido id a id (2026-09-30, 05:xx): fronteira 28, o que a junta confere, e quem registra o número

- **Objeto:** `w-mandato` em `af8b4eac` (fast-forward autorizado; K2b `7e4ac5d1` + registro da junta `af8b4eac`). Ferramenta `37549262` (a mesma em todas as triplas); `…-ciclo3-equivalentes.txt` `9c691363` com ids **245, 318, 336**.
- **Fato (Dev-S-2, `scratchpad/DEV-S2-K2b.md` e `devs2k2b/t-*`; conferido por mim na fonte — quem achou não conserta):** `scripts/mandato-mutantes.sh` l.309-311 faz `EQN=$(grep -cE '^[0-9]+:.*\(.+\)' "$EQUIV")` — **conta linhas** com fixture entre parênteses — e l.324 `if [ $((NAOCOB - EQN)) -gt 0 ]; then exit 1; fi` **subtrai o número**, sem casar id nenhum contra os NÃO-COBERTOS. Reproduzido (`t-inventado.out`): `--only 245` com um arquivo só `999: … (fixture: nenhuma, …)` → `245 … VERDE  <- NAO-COBERTO`, `NAO-COBERTOS=1 EQUIVALENTES-DECLARADOS=1`, **`ec=0`**; controle (mesmo id sem parênteses) → `EQUIVALENTES-DECLARADOS=0`, `ec=1`; base `0/312` e `[M-4]` ok nas duas. A rodada B real (`FIM preflight-B ec=0 | N=16 K=13 NAO-COBERTOS=3 … EQUIVALENTES-DECLARADOS=3`, base `fail=0 de tests=312`, ambiente sem a variável) tem o `ec=0` **honesto por coincidência de conjuntos**, que o K2b provou por script (`deriva.py`: ids do arquivo `[245, 318, 336]` == NÃO-COBERTOS de B `[245, 318, 336]`; pontos de B == NÃO-COBERTOS de A) e registrou **sem número** em `…-mutantes.md` §7 (l.884), `P-GOV-MANDATO-3-FRONTEIRAS` e Emenda 7.

**Decisões:**

1. **Fronteira 28, da ferramenta** (a 26 é o M7 `next` em fim de linha; a 27 é `RAIZ` POSIX sob `MSYS_NO_PATHCONV`): *"o arquivo `--equivalentes` é contado por linhas com fixture (l.311) e subtraído dos NÃO-COBERTOS (l.324) sem conferência de id: uma linha com id inexistente, ou de ponto já coberto, abate um não-coberto real e o `ec=0` sai falso"*. **Gravidade `ajuste`, escopo `dentro-do-bloco`** (a ferramenta nasceu em `616fd4fa`, E4 deste ciclo). É `ajuste` e não `nota` porque a direção é **fail-open para o verde falso** — a mesma classe do "orçamento anônimo" que o runner recusa por escrito (§14.16) e do "30 mutações executadas" que fundou a E4; não é `bloqueia` porque o efeito **hoje é nulo** (conjuntos iguais, provados por script) e o número publicado ([M-1] = 0) é **derivado da matriz + prova de conjuntos**, nunca do `ec` da ferramenta. **Não se conserta agora:** o blob `37549262` está em **todas** as triplas (refs-3, A, B) — mudá-lo invalida todas as matrizes sem alterar propriedade nenhuma que a junta julga. **Dono `B-GOV-MANDATO-2`; contrato do conserto:** `EQN = |ids do arquivo ∩ NÃO-COBERTOS da rodada|`; id declarado que **não** está entre os não-cobertos → linha `ANOMALIA-EQUIV <id>` (declaração morta ou ponto já coberto) e **não abate**; o resumo imprime os dois conjuntos e `EQUIVALENTES-CONFERIDOS`; **teste de encerramento** = o `t-inventado` do K2b: `--only 245` com `999: … (f)` → `NAO-COBERTOS=1 EQUIVALENTES-CONFERIDOS=0`, **`ec=1`** (hoje `ec=0`), e o controle sem parênteses inalterado.

2. **A prova por conjuntos do K2b É o que a junta confere — e não o `ec`.** C2‴ (itens 1, 2 e 7) e C3‴ (item 3b, "o registro diz o que o arquivo diz"): `diff <(grep -oE '^[0-9]+' docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-equivalentes.txt | sort -n) <(grep -E '^[0-9]+ \| .*VERDE  <- NAO-COBERTO' <matriz B: a saída da rodada B da própria C2‴, ou o verbatim de …-mutantes.md> | cut -d' ' -f1 | sort -n)` → **vazio**; **vermelho-controle:** cópia do arquivo com `999: x (f)` → o `diff` acusa `< 999` **enquanto** `bash scripts/mandato-mutantes.sh preflight --only 245 --equivalentes <cópia>` sai `ec=0` com `NAO-COBERTOS=1 EQUIVALENTES-DECLARADOS=1` — é a fronteira 28 vista falhar, e a razão de a conferência ser por conjuntos. E-5 e E-10 **não** cobrem isto (falam de tripla e de reclassificar com fixture própria) → **ERRATA E-12**, literal (c2c e c3c): *"ERRATA E-12 (plano §14.20): a ferramenta CONTA as linhas do arquivo `--equivalentes` (l.311) e subtrai (l.324) sem conferir id — fronteira 28, dono `B-GOV-MANDATO-2`. O `ec` da ferramenta com `--equivalentes` NÃO é evidência de [M-1]: confira POR CONJUNTOS que os ids do arquivo `docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-equivalentes.txt` são exatamente os NÃO-COBERTOS da rodada B (`diff` das duas listas ordenadas → vazio), com o vermelho-controle de uma cópia do arquivo acrescida de `999: x (f)` (o `diff` acusa; a ferramenta, não). [C2‴] é o seu item 7 e a comparação linha a linha do item 2; [C3‴] é o seu item 3b — o resumo `N=103 K=100 NAO-COBERTOS=3 (equivalentes conferidos por id: 3) … [M-1] = 0` é DERIVADO, e você refaz a derivação. Cobrar o conserto da ferramenta neste bloco é reprovação por construção."*

3. **O número vai por outro papel, não pelo commit de registro do orquestrador:** `…-mutantes.md` §7, `pendencias.md` (`P-GOV-MANDATO-3-FRONTEIRAS`) e a emenda do comando são escopo do **Dev-S** (§4 l.882-885) — e o orquestrador não tem esses arquivos no seu PERMITIDO (§4 l.889-898). **Dev-S-2, commit K2c** (só docs, antes do inspetor): a fronteira **28** numerada nos três lugares (em `…-mutantes.md` §7 como item 10, depois da 26 e da 27), o `pendencias-indice.md` só pelo gerador, `git diff --check` em linha própria. A C3‴ confere por `grep -n 'fronteira 28'` nos três arquivos (controle: `fronteira 99` → 0).

*Limpeza §C5 (§14.20, 1 linha):* removido `s14-20.lf.md`; fast-forward para `af8b4eac` por autorização escrita; nada rastreado tocado além deste arquivo; nenhum processo tocado; base viva nunca alvo.

## §15 — PLANO DO CICLO 4 (2026-10-01): o conserto do BLOCO depois do conserto da MÁQUINA — os seis bloqueantes, a classe A15, a ferramenta que volta a ser medida (e re-identificada), e a boa notícia com conferente

- **Papel:** `planejador-mestre` · **Identidade:** `planejador-ciclo4-b-gov-mandato` (nova: não votou nos ciclos 1–3, não desenvolveu, não auditou, não é o planejador das §1–§14.20 nem o do §8 do parecer) · **Modelo:** Fable 5.1 (`claude-fable-5-1`), sem substituição (`D-PLANEJADOR-MODELO-FABLE`) · **Corpo aplicado:** `origin/main:.claude/agents/planejador-mestre.md`, md5 EOL-neutro `4c912f69a93f07b14d8fd1c49539c778` · **Mandato:** `agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/planejador.md` @ `1d3b5e66` (blob `8c430196`), `mandato_md5` EOL-neutro `55d88d3a09e519e2fc9729711cd7524f` — forma A (`D-MANDATO-FORMA`), `PRE-VOO OK` gravado nele no head `a3e52e37`.
- **Objeto:** `chore/mandato-refs-e-preflight` em **`1d3b5e66`** (`git ls-remote origin` = `git rev-parse HEAD` em `w-mandato` = `w-pl4`; re-medido na retomada pós-429 às 08:19Z: **não andou**). `origin/main` = `5b6e1036` (#396) = `git merge-base origin/main HEAD` — a integração está feita.
- **Insumos lidos integralmente** (como hipóteses a reproduzir, nunca como fato): o parecer `R-B-GOV-MANDATO-ciclo3-auditoria.md` (§0–§8.12; a §8 é o conserto da máquina que este ciclo **respeita**, e a §8.9 diz o que **não** é dele), `R-B-GOV-MANDATO-3.md`, a seção ciclo 3 da ata, o parecer do inspetor da junta 3, os três votos `C{1,2,3}-evidencia.md` (JSON ao fim de cada), os §0/§1/§4/§7/§8/§10/§14–§14.20 deste plano, `…-ciclo3-mutantes.md`, `…-ciclo3-equivalentes.txt`, `P-GOV-MAQUINA-393-*`, `P-GOV-MANDATO-3-FRONTEIRAS`, `D-MANDATO-FORMA`, os 3 scripts inteiros e a estrutura dos 2 guards no head.
- **Separação de papéis (§C7.4-bis):** quem achou — C1‴, C2‴, C3‴ e o auditor (§1.5) — **não** planeja nem conserta; eu planejo e **não desenvolvo**, não escrevo corpo de agente, não versiono; os devs do ciclo 4 são **duas identidades novas** (uma só `scripts/**`, outra só `tests/**`) e **não julgam a validade dos achados**; a boa notícia da ferramenta é conferida por **uma terceira identidade** (§15.5), que não é o runner nem o dev nem eu.
- **Só por adição:** nenhuma linha anterior deste arquivo foi alterada; errata de linha anterior está em §15.11, citando a linha.
- **Terreno:** worktree próprio detached `C:/Users/AMP/w-pl4` @ `1d3b5e66` (`npm ci` próprio, sem junction; removido pelo nome ao fim — §15.12); edição só deste arquivo em `w-mandato` (`git status --porcelain` = 0 antes); git só leitura; `MSYS_NO_PATHCONV` nunca exportada (`env | grep -ic '^MSYS_NO_PATHCONV='` = 0; git 2.53.0.windows.2; node v20.19.5; MINGW64_NT-10.0-22631); `timeout` em tudo que executa artefato mutado; base viva `erp-postgres`/`erp-redis` nunca alvo (nada aqui abre banco). Evidência incremental com hora: `scratchpad/PLANO-393-S15.md` (+ `scratchpad/pl4/`). **Interrupção:** esta instância caiu por limite de sessão (HTTP 429) depois das medições do §15.0 e foi retomada às 08:19Z de 01/10 pela mesma identidade; o job de fundo da amostra dos dois lados **terminou antes da queda** (`== FIM 2026-10-01T03:50:25Z`, `ec=0`, 26/26 pontos, 1400 saídas no disco) — nada foi herdado de saída parcial.

### 15.0 Terreno e LINHA DE BASE — medido por mim no head (comando + saída; tudo em `scratchpad/pl4/`)

**(a) Blobs e guards no head** — medido por: `for f in scripts/mandato-refs.sh scripts/mandato-preflight.sh scripts/mandato-mutantes.sh tests/mandato-refs.test.ts tests/mandato-preflight.test.ts; do git -C C:/Users/AMP/w-pl4 rev-parse HEAD:$f | cut -c1-8; done`
```
474c7521 faa408c8 37549262 d455ae1a 7a52d37c      (= os 5 publicados em …-ciclo3-mutantes.md l.31-32; hipótese 2 do mandato NÃO derrubada)
```
Linha de base dos guards em `w-pl4` (TAP em arquivo, `pl4/base/{refs,preflight}.tap`) — medido por: `node --test --import tsx --test-reporter=tap tests/mandato-<alvo>.test.ts > <tap>; grep -E '^# (tests|pass|fail|skipped)' <tap>`
```
refs:      # tests 39  # pass 39  # fail 0  # skipped 0   ec=0   (03:09:30 → 03:11:06Z = 96 s)
pré-voo:   # tests 312 # pass 312 # fail 0  # skipped 0   ec=0   (03:11:06 → 03:18:22Z = 436 s)
```
Arnês pristino `pl4/arn/pris` = `git -c core.autocrlf=false archive HEAD` das dependências declaradas pela ferramenta (l.107-109) + `tar` pela entrada padrão + `git init` + commit: 336 rastreados; `git hash-object --no-filters` = blob nos 4 artefatos conferidos; CR no pré-voo = 0 — medido por: `tr -cd '\r' < pl4/arn/pris/scripts/mandato-preflight.sh | wc -c`.

**(b) Os seis bloqueantes e o fail-open da §1.5 do parecer, REPRODUZIDOS por mim** (`pl4/repro.sh` → `pl4/repro.out`, 03:14–03:18Z; shim de refs PRÓPRIO `pl4/shim/refs.sh` — PR 4102 = LIDO, 4103 = ND ec=3, 4199 = morto ec=1 —, colagens GERADAS do shim, `timeout -k 5 60`) — medido por: `MANDATO_REFS=$P/shim/refs.sh timeout -k 5 60 bash $PRIS/scripts/mandato-preflight.sh $FX/<fixture>.md [4102]; echo ec=$?`
```
C1c-01  c1c01-lava (linha '# gerado em: … deadbeef×5' INSERIDA no bloco + prosa citando o SHA)   ec=0 rej=0  PRE-VOO OK
        c1c01-lava-par (sem a linha)                                                          ec=1 rej=1  SHA 'deadbeef…' nao esta na saida
        c1c01-abuso-dentro (a MESMA linha sem o prefixo '# gerado em:')                       ec=1 rej=5  NAO bate … DESATUALIZADO
C1c-02  deadbeef×5:CLAUDE.md                                                                  ec=0        PRE-VOO OK
        deadbeef×5:scripts/mandato-preflight.sh                                               ec=0        PRE-VOO OK
        deadbeef×5 CLAUDE.md (espaço em vez de ':')                                           ec=1 rej=1  SHA … nao esta na saida
        git -C $PRIS rev-parse --verify --quiet deadbeef×5 → ec=0 ; git cat-file -e deadbeef×5 → ec=1
C1c-03  'medido por:' só DENTRO da cerca                                                      ec=0        PRE-VOO OK
        a mesma cerca com 'saida'                                                             ec=1 rej=2  REJ3M + saida colada sem comando
C1c-04  '## MEDIDO — cobertura 87,4% …'                                                       ec=0        PRE-VOO OK   (par: texto na linha seguinte → ec=1 REJ3M)
        '## MEDIDO medido por: grep -c "naoaparece" CLAUDE.md'                                ec=0        PRE-VOO OK   (par: na linha seguinte → ec=1 REJ5)
        '## Resumo — suite 3103/3105 …' ANTES de ## MEDIDO                                    ec=0        PRE-VOO OK   (controle '### Resumo …' → ec=1 REJ2)
C2c-01  aplica() VERBATIM (blob 37549262): m305 'if (c == 0) :' e m298 'if (0)) return' — bash -n ok, awk: syntax error (stderr 87 B / 78 B)
        X04 viável (l.298 'if (0) return') sobre colagem verificada com linha 'dica: grep -c':  pristino ec=0 → X04 ec=1 REJ5 l.15 (comportamento muda; o guard 312/312 não vê — C2‴/auditor)
C2c-02  m336 (M7(next), 1 linha) sobre documento de 1 000 003 linhas:  pristino ec=0 PRE-VOO OK em 9 s (03:09:33→03:09:42) ; m336 ec=1 'cita SHA mas nao recebeu o numero do PR' ; com PR 4102: REJ SHA '1000000'…'1000003'
A15     m305 e m298 sobre a15-neg (afirmação SEM 'medido por:'):  PRE-VOO OK ec=0 (awk da passada 2 morto) ; pristino a15-neg → ec=1 rej=1 ; 'set -e|pipefail' no blob = 0
```
Todos reproduzem com par de controle que difere em uma variável, como os votos e o parecer descrevem. **Nenhum é artefato de processo** (A1 hash-object = blob; A2 injeção provada por `cat -A`; A3 LF; A11 arnês com git próprio; A14 o par cai pela mensagem da checagem certa).

**(c) A15 por COMPONENTE — o que morre fail-open HOJE e o que morre pela causa errada** (`pl4/a15.out`; shims no `PATH` em forma POSIX — a 1ª rodada, com `PATH` em `C:/…`, não substituiu nada porque o `:` de `C:` parte a lista: classe A4, minha, descartada antes de ler) — medido por: `PATH="$(cygpath -u $B/<componente>):$PATH" timeout -k 5 60 bash $PRIS/scripts/mandato-preflight.sh <fixture> [PR]`, com o shim de `awk` matando SÓ a invocação cujo programa contém o marcador da passada (`marcaChar` = oráculo l.149; `isento(num)` = passada 2 l.275; `$1==t` = filtros `peg`/`pega`) e `tr`/`sed`/`git` morrendo sempre (`exit 2` + 1 linha no stderr):
```
awk passada 2 (l.275) morto → PRE-VOO OK ec=0 em 6/6 insumos — a15-neg, b11-sha-fabricado, b14-grep-sem-i, b23, b04, a15-pos — FAIL-OPEN (é a §1.5 do parecer)
awk oráculo (l.149) morto   → ec=1 rej=2 "falta a secao '## MEDIDO'" em 6/6 — fecha POR ACIDENTE (ESTRUT vazio), pela causa ERRADA
awk filtro (peg/pega) morto → ec=1 rej=2 "falta a secao '## MEDIDO'" — idem (fecha porque o 1º filtro é a checagem 1)
tr (l.137) morto            → ec=1 rej=2 "falta a secao '## MEDIDO'" — idem (NORM vazio)
sed morto                   → só a colagem é atingida: bloco.raw vazio → o bloco deixa de ser colagem → 3 REJ pela causa errada (b04); nos outros insumos nada muda
git morto                   → só a chk 6 'rev:caminho/': "caminho citado nao existe: HEAD:scripts/mandato-refs.sh" — fecha pela causa errada (b23)
mandato-refs.sh com git morto → PARADO ec=1 "nao estou dentro de um repositorio git" — fail-closed CERTO (a l.160 lê o status)
```
Subprocessos do pré-voo cujo status **não é lido**, enumerados DA FONTE — medido por: `grep -nE '\$\((awk|sed|tr|git|bash|cat|head|printf)|^(tr|sed|awk|git) |\| *(awk|sed|cut|sort|tr|grep|head) ' $PRIS/scripts/mandato-preflight.sh | grep -vE '^\s*[0-9]+:\s*#'` → **24 pontos**: l.123, 137, 149, 199, 203, 204, 211, 224, 225, 235, 242, 247, 252, 263, 275, 438, 462, 468, 471-472, 479, 481, 496, 503, 533 (+ l.522, cujo status é usado como decisão, mas que não distingue "rev não resolve" de "git morreu").

**(d) A amostra dos DOIS LADOS da matriz composta publicada (P1b), por mim** (`pl4/dois-lados.sh` → `pl4/dois-lados.out`, 03:18:19 → 03:50:25Z; identidade `planejador-ciclo4-b-gov-mandato` ≠ runner da E4 = orquestrador ≠ devs da ferramenta = Dev-S/Dev-S-2). Semente **`20261001393`** — medido por: `python random.seed(20261001393); random.sample(sorted(VERMELHOS), ceil(0.2*100))` sobre os 100 VERMELHOS da composta (`grep -E '^[AB] \| [0-9]+ \| [^|]+ \| fail=[0-9]+ \| VERMELHO' …-ciclo3-mutantes.md`), k = 20 → **187 195 219 255 298 327 356 373 390 393 399 431 457 469 470 481 493 520 523 541**; mais 100 % dos VERDES (245 318 336) e os 3 sobreviventes da C2‴ não sorteados (305 364 405) como controle = 26 pontos. Mutante pelo `aplica()` VERBATIM; "é programa?" = `bash -n` E execução sem diagnóstico de interpretador no stderr; "comportamento muda?" = pristino × mutante sobre 50 fixtures próprias (`pl4/fx/b01..b50`, 18 com PR), pristino determinístico (2 execuções, 0 divergência, stderr 0 B) — tudo ANTES de qualquer cor de guard:
```
ponto | operador | diff | bash-n | programa(awk) | comportamento | 1a fixture que difere | 1a linha de stderr
187 | M4(sim>nao) | 2 | ok | PROGRAMA | IGUAL nas 50 → DIFERE com fixture dirigida b52 ('## MEDIDO' engolido: pristino 'l.7' × mutante 'l.6') — a sonda fraca era MINHA (A6), não do guard ([F-1e-linha])
195 | M10 | 2 | ok | PROGRAMA | DIFERE | b01-ok-bullets (ec 0->1) | -
219 | M3(-n>-z) | 2 | ok | PROGRAMA | DIFERE | b30-cerca-aberta | -
245 | M7(salto) | 2 | ok | PROGRAMA | IGUAL | - | -                       ← VERDE/equivalente declarado: resiste
255 | M7(salto) | 2 | ok | PROGRAMA | DIFERE | b07-colagem-refs-morto | -
298 | M10 | 2 | ok | AWK-INVALIDO | DIFERE (= crash: b02-neg-sem-token ec 1->0) | awk: cmd. line:24: if (0)) return
305 | M7(salto) | 2 | ok | AWK-INVALIDO | DIFERE (crash) | awk: cmd. line:31: if (c == 0) :
318 | M10 | 2 | ok | PROGRAMA | IGUAL | - | -                             ← VERDE/equivalente declarado: resiste
327 | M10 | 2 | ok | PROGRAMA | DIFERE | b03-neg-hip-sem-token | -
336 | M7(next) | 2 | ok | PROGRAMA | IGUAL nas 50 — DISCRIMINADO em (b) pelo documento de 10⁶ linhas: NÃO é equivalente
356 | M7(salto) | 2 | ok | AWK-INVALIDO | DIFERE (crash) | awk: cmd. line:82: if (u == "") :
364 | M7(salto) | 2 | ok | AWK-INVALIDO | DIFERE (crash) | awk: cmd. line:90: … { print "HEXLONGO" …
373 | M4(sim>nao) | 2 | ok | PROGRAMA | DIFERE | b05-colagem-sha-trocado | -
390 | M7(salto) | 2 | ok | AWK-INVALIDO | DIFERE (crash) | awk: cmd. line:116: if (sec != "M" && sec != "H") :
393 | M10 | 2 | ok | PROGRAMA | DIFERE | b31-cerca-primeira (ec 1->0) | -
399 | M4(nao>sim) | 2 | ok | PROGRAMA | DIFERE | b01-ok-bullets (ec 0->1) | -
405 | M7(salto) | 2 | ok | AWK-INVALIDO | DIFERE (crash) | awk: cmd. line:131: abre(i, l, 0); … :
431 | M7(salto) | 2 | ok | AWK-INVALIDO | DIFERE (crash) | awk: cmd. line:157: if (k == 0) :
457 | M3(-n>-z) | 2 | ok | PROGRAMA | DIFERE | b31-cerca-primeira | -
469 | M3(-n>-z) | 2 | ok | PROGRAMA | DIFERE | b01-ok-bullets (ec 0->1) | -
470 | M3(-n>-z) | 2 | ok | PROGRAMA | DIFERE | b05-colagem-sha-trocado | -
481 | M9 | 2 | ok | PROGRAMA | DIFERE | b05-colagem-sha-trocado | -
493 | M3(-n>-z) | 2 | ok | PROGRAMA | DIFERE | b05-colagem-sha-trocado | -
520 | M3(-n>-z) | 2 | ok | PROGRAMA | DIFERE | b23-rev-path (ec 0->1) | -
523 | M7(salto) | 2 | ok | PROGRAMA | DIFERE | b23-rev-path (ec 0->1) | -
541 | M5 | 2 | ok | PROGRAMA | DIFERE | b02-neg-sem-token (ec 1->0) | -
```
**Leitura:** dos 20 VERMELHOS sorteados, **4 (20 %) não são programa** (298, 356, 390, 431) — a classe C2c-01 reproduz por amostra independente; 16 são programa e mudam comportamento (15 na bateria + 187 na fixture dirigida); dos 3 VERDES, 245 e 318 resistem (como na C2‴, 30/30 cada) e **336 não** (C2c-02 confirmado). Os 8 pontos que a C2‴ deixou "não classificados" (280, 349, 356, 365, 368, 370, 371, 375), com a versão VIÁVEL do mesmo operador sobre 7 fixtures dirigidas minhas (`pl4/oito/`): **IGUAL em 56/56** — continuam **não classificados** (A6): equivalência só com fixture que tentou e falhou, nomeada (§15.3 E1).

**(e) Histograma de `fail=` dos 100 VERMELHOS publicados** — medido por: `grep -E '^[AB] \| [0-9]+ \| [^|]+ \| fail=[0-9]+ \| VERMELHO' …-ciclo3-mutantes.md | grep -oE 'fail=[0-9]+' | sort | uniq -c | sort -rn`
```
29 fail=196 · 18 fail=1 · 7 fail=2 · 6 fail=9 · 4 fail=23 · 4 fail=192 · 2 fail=8 · 2 fail=6 · (resto ≤ 1 cada) · 1 fail=210 (l.541)
```
`fail ∈ {192, 196, 210}` = 34 pontos = os 33 awk-inválidos do C2c-01 ∪ {541} (= §8.0 M5 do parecer). **Mas `fail=1 × 18` também tem multiplicidade ≥ 10 % de N**, e são 18 pontos legitimamente cobertos por UM caso cada; e o 541 (`exit 1`→`exit 0` no fim do script) derruba 210 casos por mudança **legítima** de comportamento. Logo "valor modal ≥ 10 % = assinatura de crash" (P1a, §8.2) marcaria falsos crashes e absolveria o 541: o discriminador de crash é o **diagnóstico de interpretador no stderr do artefato mutado**, não a multiplicidade (§15.2 C2c-01 e §15.11).

**(f) Vermelho-controle histórico da hipótese 4 do mandato** — medido por: `cd C:/Users/AMP/w-pl4 && timeout -k 30 1800 bash scripts/mandato-mutantes.sh preflight --only 298,305 --jobs 2 | grep -iE '^(298|305) |^== LINHA|^N='` (ferramenta `37549262` do head, 08:25Z):
```
== LINHA DE BASE medida na copia pristina: fail=0 de tests=312
298 | M10 | fail=201 | VERMELHO
305 | M7(salto) | fail=201 | VERMELHO
N=2 K=2 NAO-COBERTOS=0 EXCLUIDOS=0 ANOMALIAS=0 EQUIVALENTES-DECLARADOS=0        (ec=0; [M-4] ok; copia pristina intacta; 08:25:35 -> 08:40:29Z; w-pl4 porcelain 0 antes e depois)
```
Os dois mutantes que **não compilam** saem `VERMELHO fail=201` (o guard cresceu de 299 para 312 casos desde a rodada A; a C2‴ mediu os mesmos `fail=201/205` nos 9 inválidos da amostra dela) e contam em K — é o C2c-01 visto pela própria ferramenta do head.
Na ferramenta consertada (§15.2 C2c-01) a MESMA invocação tem de imprimir `298 | M10 | MUTANTE-INVALIDO | awk: … syntax error` e `305 | M7(salto) | MUTANTE-INVALIDO | …`, com `K=0` — é o ⇄ que o dev e a C2⁗ reexecutam.

**(g) Hipóteses do mandato, estado após o §15.0:** H1 medida (o mandato não publica o valor esperado; o md5 do corpo está na 1ª linha); H2 **não derrubada** ((a)); H3/H5/H6/H7 só são medíveis depois desta seção existir — §15.11; H4: (f) é o lado "antes"; o lado "depois" é do dev.

### 15.1 Classes de artefato de processo A1–A15 — com a coluna "papel por artefato" (P1c), sem célula vazia para matriz e KPI

A tabela §1.1 continua inteira (A1–A14 com instância e controle); esta acrescenta a **A15** e, para cada classe, **quem a aplica a cada artefato de medição que a junta consome** — classe sem papel para um artefato = o artefato **não é insumo** da junta (§8.2 P1c). "Número de ferramenta sem causa por ponto não é fato" (§8.2) vale para as três colunas.

| classe | controle (resumo; o texto completo está em §1.1) | **matriz de mutação** (refs e pré-voo) | **KPI / contagem** (`backend_tests`, casos por arquivo, [M-1]) | **veredito do pré-voo sobre mandatos** |
|---|---|---|---|---|
| A1 arnês corrompe o artefato | `hash-object --no-filters` = blob; mutante = `diff` de 1 linha | runner (cabeçalho do log) · **conferente dos dois lados** (re-mede) · C2⁗ | Dev-S4 (K) · C3⁗ | inspetor (2.4: pré-voo no head do objeto) |
| A2 âncora que não substitui | `diff` não vazio antes de ler qualquer cor | Dev-S4 (ferramenta: `ANOMALIA-DIFF`) · conferente · C2⁗ | — (não há mutação) | Dev-T4 (fixtures por `cat -A`) · C1⁗ |
| A3 CR/EOL | `tr -cd '\r' \| wc -c`; `--no-filters` = blob | runner · conferente · C2⁗ | Dev-S4 · C3⁗ | Dev-T4 ([F-EOL]) · C1⁗ |
| A4 forma de caminho por ferramenta | `C:/…` para git/node; `/c/…` (e `PATH`!) só POSIX | runner · conferente | Dev-S4 | Dev-T4 · C1⁗ (A15: shims no `PATH` em forma POSIX — §15.0(c)) |
| A5 ferramenta responde à pergunta vizinha | zero informativo com controle positivo no mesmo comando | conferente · C2⁗ | C3⁗ (escopo por geração) | C1⁗ (par de controle) |
| A6 sonda fraca → falso "equivalente" | equivalente só com fixture dedicada que tentou e falhou, nomeada | Dev-T4 (fixtures) · **conferente (100 % dos VERDES)** · C2⁗ (fixture própria) | — | C1⁗ |
| A7 premissa herdada | "a re-verificar"; porta prova que ligou | conferente (não lê o K publicado como fato) · inspetor | Dev-S4 (N=2) · C3⁗ | inspetor (mandatos) |
| A8 critério impossível | mutação que o deixa vermelho **e** controle positivo | Dev-S4 (drills t-* com vermelho-controle histórico) · C2⁗ | C3⁗ | Dev-T4 · C1⁗ |
| A9 cor lida do terminal | TAP em arquivo; `ec` por variável | runner · conferente · C2⁗ | Dev-S4 · C3⁗ | Dev-T4 · C1⁗ |
| A10 comando truncado | efeito conferido (linhas antes/depois) | runner | Dev-S4 | orquestrador (apensos de registro) |
| A11 arnês muda o comportamento | controle diferencial cópia × árvore com insumo que PERCORRE o que o arnês altera | Dev-S4 (ferramenta, insumo novo — §15.2 C2c-05) · conferente · C2⁗ | C3⁗ (KPI no worktree real) | C1⁗ |
| A12 número unitário sem a multiplicação | fórmula unitário × N, re-multiplicada por outro papel | Dev-S4 publica; **conferente re-multiplica** | C3⁗ | — |
| A13 operador numa direção só | partir E juntar, disparar E sobre-isentar | — | — | Dev-T4 (um caso de cada) · C1⁗ |
| A14 caso passa/cai por OUTRA causa | mensagem contratual **e** contagem exata; ausência 0/N; título × asserção por outro papel | **Dev-S4 (ferramenta: causa por ponto — 1º `not ok` + 1ª linha do stderr)** · **conferente (≥ 20 % VERMELHOS: a causa publicada reproduz)** · C2⁗ | C3⁗ (Δ por arquivo) | C1⁗ (título × asserção) |
| **A15 falha interna lida como veredito (fail-open por morte)** — *o status de um subprocesso (awk, sed, tr, git, refs, binário no PATH) não é lido e a saída vazia dele vale como "nada a rejeitar"* (instância: §15.0(c) — awk da passada 2 morto ⇒ `PRE-VOO OK`) | **mate o componente** (shim no `PATH` que morre só naquela invocação; `exit 2`; erro de sintaxe) e exija `ec≠0` com mensagem que **nomeia o componente**; `ec` de cada subprocesso lido; `set -o pipefail`; stderr do artefato **vazio** em todo caso positivo; cano sem `pipefail` é suspeito | **Dev-S4 (ferramenta: `MUTANTE-INVALIDO` quando o interpretador recusa; controle falho ⇒ `ec=2`)** · conferente (100 % dos `MUTANTE-INVALIDO` confirmados) · C2⁗ | Dev-S4 (runner `npm test`: `ec` lido, não só `# fail`) · C3⁗ | **Dev-S4 (pré-voo: status de todo subprocesso)** · Dev-T4 (um caso por componente) · **C1⁗ (mata cada componente; vermelho-controle sobre `faa408c8`: tem de reportar o fail-open da l.275 SEM ser mandada)** · inspetor (2.4) |

### 15.2 Os seis bloqueantes + A15 — conserto · critério de aceite ⇄ mutação que o deixa vermelho · ◐ · papel

Convenção de §1: **[X]** critério; **⇄** mutação (no artefato ou no teste) que TEM de deixá-lo vermelho, em cópia, `diff` de 1 linha; **◐** como distinguir defeito real de artefato se o critério falhar. Linhas citadas são do blob `faa408c8` (pré-voo) e `37549262` (ferramenta). **Propriedade, não forma:** cada conserto enuncia o que vale para QUALQUER instância, e o caso novo é a instância que a junta achou — nunca o contrário.

**C1c-01 — a isenção I1 cobre EXATAMENTE as linhas cuja igualdade foi verificada.** Hoje `significativas()` (l.235) descarta `# gerado em:` da comparação, mas `EXENTAS` (l.260-261) isenta `ini..fim` inteiro (inclusive a linha de abertura da cerca, que não é comparada — l.241) e `PROVCOL` (l.262-263) lê SHAs de `bloco.raw` inteiro. **Conserto (Dev-S4):** (i) a comparação cobre **todas** as linhas do corpo do bloco (`ini+1..fim-1`), e a única variação admitida é o **carimbo**: nos DOIS lados, `# gerado em: <carimbo> · repo: <x>` tem o `<carimbo>` substituído por um marcador fixo **só quando tem a forma de carimbo** (`[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:]+Z(-[0-9]+)?`); linha `# gerado em:` com qualquer outro conteúdo é comparada literalmente; (ii) `EXENTAS` = `ini+1..fim-1` e **só** quando o bloco bateu; as linhas-marcador da cerca (`ini`, `fim`) nunca são isentas; (iii) `PROVCOL` vem das linhas **comparadas** menos a linha de carimbo. **[C1c-01a]** `c-gerado-em-inj` (linha `# gerado em: … <SHA fabricado>` inserida) → `REJ NAO bate` + o SHA cobrado pela chk 4 · **[C1c-01b]** `c-gerado-em-edit` (a linha de carimbo EDITADA com um SHA) → `REJ NAO bate` (não tem forma de carimbo) · **[C1c-01c]** abertura de cerca com SHA no info string (`` ```<SHA> ``) → chk 4 cobra · **[C1c-01d]** colagem LEGÍTIMA gerada do shim com carimbos **diferentes** nas duas gerações (o `REFS_COMPLETO` do guard muda o carimbo a cada chamada, de propósito) → `COLAGEM … confere`, 0 REJ. **⇄** (1) voltar ao `grep -v '^# gerado em:'` → [C1c-01a] verde falso (fica vermelho no guard); (2) tirar a normalização do carimbo → [C1c-01d] cai (vermelho-controle positivo: prova que a normalização é a única isenção); (3) `EXENTAS` de `ini` a `fim` → [C1c-01c] passa. **◐** artefato se a colagem foi escrita à mão ou o shim ≠ `MANDATO_REFS` (E2.b): as quatro fixtures são GERADAS do mesmo shim e só a linha atacada difere. **Papel:** Dev-T4 escreve os 4 casos (vermelhos contra `faa408c8` — medido em §15.0(b): `c1c01-lava` ec=0 hoje); Dev-S4 conserta; C1⁗ julga com fixtures próprias.

**C1c-02 — a classificação SHA/caminho é por TOKEN, e `:` não esconde um SHA.** Hoje `<40-hex>:CLAUDE.md` não é hex (tem `:`) nem caminho (sem `/`), e `<40-hex>:scripts/x` entra na chk 6 com `git rev-parse --verify --quiet` (l.522), que aceita QUALQUER 40-hex (§15.0(b): ec=0 para `deadbeef×5`). **Conserto (Dev-S4):** (i) no tokenizador (l.343-377), depois de tirar o sufixo `:<dígitos>` e ANTES da I13, um token com `:` é partido no **primeiro** `:` — se a parte da esquerda é hex de 7–40, ela é emitida como `SHA` (chk 4); o token inteiro segue o caminho atual para a chk 6 (nada muda para `HEAD:…`, `C:/…`, `https://…`); (ii) na chk 6 a revisão só "resolve" se **existe**: `git -C "$RAIZ" cat-file -e "${rev}^{commit}"` (l.522) — `ec=1` = não resolve → `REJ caminho citado nao existe`; `ec≥126` ou `128` = **git morreu** → A15 (abaixo). **[C1c-02a]** `<fabricado>:CLAUDE.md` → 1 REJ chk 4 · **[C1c-02b]** `<fabricado>:scripts/mandato-preflight.sh` → 2 REJ (chk 4 + chk 6) · **[C1c-02c]** `<SHA do commit do arnês>:scripts/mandato-refs.sh` com esse SHA na saída `--sha-only` do shim → 0 REJ (o guard obtém o SHA por `git -C RAIZ rev-parse HEAD`, nunca digitado) · **[C1c-02d]** `<SHA real do arnês, FORA da proveniência>:scripts/mandato-refs.sh` → exatamente 1 REJ (chk 4), nenhuma da chk 6 · **[C1c-02e]** `<fabricado>:scripts/x` com o fabricado NA proveniência (shim) → 1 REJ chk 6 "rev nao existe" — prova que é `cat-file -e`, não `rev-parse --verify` (⇄ trocar de volta → verde). Os casos existentes [F-6c], [F-6d], [F-6i/520], [F-6i/523], [B3] (`<sha>:12`) **não mudam de veredito** (previsto por leitura; o Dev-T4 confirma por execução: §15.3). **⇄** (1) partir no último `:` em vez do primeiro → `a:b:c` muda (nota); (2) emitir SHA só com 40 hex → `<8-hex>:x` escapa → caso com 8 hex; (3) `rev-parse --verify` de volta → [C1c-02e] verde. **◐** artefato se o SHA "fabricado" existir por acaso no arnês (`git cat-file -e` na mesma rodada é o controle). **Papel:** Dev-T4 / Dev-S4 / C1⁗.

**C1c-03 — a cerca é SAÍDA, nunca COMANDO.** `satisfeita()` (l.322) procura o token em `utext`, que acumula as linhas cercadas (l.394). **Conserto (Dev-S4):** a unidade mantém dois textos — `utext` (tudo, para mensagens) e `uprosa` (só linhas **não cercadas**); `satisfeita()` e `REJ19` usam `uprosa`. **[C1c-03a]** token só DENTRO da cerca → exatamente 2 REJ (REJ3M + `saida colada sem comando`) · **[C1c-03b]** saída de `grep` colada contendo a string `medido por:` → idem · **[C1c-03c]** token na prosa + saída cercada → 0 REJ (controle na mesma rodada; é o [B1-correto]). **⇄** `satisfeita()` sobre `utext` → [C1c-03a] verde. **◐** artefato se a cerca não fecha ([F-8a]) ou mistura TAB/espaço: as fixtures são LF, cerca balanceada, só espaços. **Papel:** Dev-T4 / Dev-S4 / C1⁗.

**C1c-04 — toda linha de conteúdo pertence a alguma checagem; o cabeçalho de seção é EXATAMENTE o nome.** Hoje o oráculo reconhece por prefixo (l.168-169: `/^## +MEDIDO/`) e nunca emite `## <outra>` como FORA (l.170); a REC pula a linha de cabeçalho (l.389). **Conserto (Dev-S4):** (i) cabeçalho de seção = `/^## +(MEDIDO|HIPOTESE)[[:space:]]*$/` (nome e nada mais); (ii) **qualquer outra** linha `## …` é conteúdo fora das seções: o oráculo a emite como `FORA` (como já faz para `###` e `>`), com a dica *"cabecalho '## X' nao e '## MEDIDO'/'## HIPOTESE': texto apos o nome e conteudo"* quando começa por `## MEDIDO`/`## HIPOTESE`; (iii) I8 (`# titulo`) inalterada; `HD` (l.389) inalterado — a linha exata não tem conteúdo. **[C1c-04a]** `## MEDIDO — cobertura 87,4% …` → ec=1 com REJ chk 2 nomeando a linha **e** REJ chk 1 (`falta a secao '## MEDIDO'`) — fail-closed nos dois · **[C1c-04b]** `## MEDIDO medido por: grep -c …` → idem · **[C1c-04c]** `## Resumo — suite …` antes de `## MEDIDO` → REJ chk 2 · **[C1c-04d]** `## Conclusao — …` depois de `## HIPOTESE` → REJ chk 2 · **[C1c-04e]** `## MEDIDO   ` (espaços finais) e `## MEDIDO` em CRLF → 0 REJ · **[C1c-04f]** seção `## OUTRA` com conteúdo → REJ chk 2 listando **o cabeçalho e** o conteúdo (M2 revogada: "outra seção" não existe na forma A — `D-MANDATO-FORMA`). **⇄** (1) reconhecedor por prefixo de volta → [C1c-04a] verde; (2) `## X` sem `FORA` → [C1c-04c] verde; (3) `$` sem `[[:space:]]*` → [C1c-04e] cai (vermelho-controle positivo). Casos existentes que a propriedade alcança, por leitura do guard (`grep -n '## ' tests/mandato-preflight.test.ts`): **nenhum** usa `## <outra>` nem `## MEDIDO <texto>` — o Dev-T4 confirma por execução. **◐** artefato se a linha tiver `#` em outra posição (não é cabeçalho). **Papel:** Dev-T4 / Dev-S4 / C1⁗.

**C2c-01 — um mutante só conta quando é um PROGRAMA; a cor do guard só se lê depois disso.** Hoje `bash -n` (l.226) valida o shell e não o awk embutido. **Conserto (Dev-S4, ferramenta):** (i) **estático:** cada programa awk do mutante — o texto entre as aspas simples que seguem a palavra `awk` (o bash proíbe `'` dentro de `'…'`, logo a extração é exata) — é gravado em arquivo e compilado por `awk -f <prog> </dev/null` (`-v` dos nomes usados vazios): `ec≠0` ou `syntax error` no stderr ⇒ linha `N | MUTANTE-INVALIDO | <op> | <1ª linha do stderr>` — **fora de K, fora de NÃO-COBERTOS, fora do denominador**, listada; (ii) **dinâmico:** o mutante é executado sobre os insumos fixos do controle (c) (positivo e negativo) ANTES do guard; diagnóstico de interpretador no stderr (`syntax error`, `unexpected`, `command not found`, `unbound variable`) ⇒ `MUTANTE-INVALIDO` pelo mesmo caminho; (iii) **causa por ponto (P1a):** toda linha VERMELHO traz o **1º caso `not ok`** do TAP e a **1ª linha do stderr** da execução de (ii); toda linha VERDE traz `comportamento NAO medido pela ferramenta — P1b decide`; (iv) **histograma** de `fail=` impresso no resumo, com os valores de multiplicidade ≥ 10 % de N marcados `ATENCAO modal` — **informação para a amostra P1b, não desqualificação** (§15.0(e): `fail=1×18` e o 541 são legítimos); (v) `MUTANTE-INVALIDO` entra no resumo (`INVALIDOS=n`) e no `ec`: `ec=1` também quando `INVALIDOS>0` e o operador tem versão viável conhecida? **Não** — `ec` continua medindo NÃO-COBERTOS; os inválidos são **publicados** e o conferente/C2⁗ os reclassificam com a versão viável, como a C2‴ fez (é o item 2 da conferência, §15.5). **[C2c-01a]** drill `t-invalido`: `preflight --only 298,305` → as duas linhas `MUTANTE-INVALIDO`, `K=0`, histograma impresso (vermelho-controle histórico = §15.0(f)) · **[C2c-01b]** `preflight --only 285,415` (viáveis, cobertos: X03/X05 da C2‴) → VERMELHO com causa (1º `not ok` + stderr vazio) · **[C2c-01c]** os 33 + 2 ids da C2‴ saem `MUTANTE-INVALIDO` na rodada completa, e nenhum outro (a lista é publicada e o conferente confere 100 %). **⇄** (1) tirar a extração do awk → 298 volta VERMELHO `fail=196`; (2) extração que para na primeira `'` **antes** de `awk` → programa vazio compila → inválido passa; (3) classificar por `fail ≥ 50 %` em vez de stderr → o 541 vira "crash" (falso). **◐** o `bash -n` continua (ANOMALIA-SINTAXE para o shell); mutante que compila nos dois e muda comportamento é coberto ou não pelo guard — isso é a matriz. **Papel:** Dev-S4 (ferramenta e drills), conferente (100 % dos inválidos confirmados), C2⁗.

**C2c-02 — equivalência é por fixture que tentou e falhou; o 336 tem fixture que discrimina.** **Conserto (Dev-T4):** caso **[C2c-02/336]** — documento gerado no teste com 1 000 003 linhas (`## MEDIDO`, unidade válida, 10⁶ vazias, `## HIPOTESE`, unidade válida; `writeFileSync`, ≈ 1 MB), `MANDATO_REFS=/bin/false`, sem PR: pristino → `PRE-VOO OK` ec=0 (custo medido: **9 s**, §15.0(b)); ⇄ M7(next) na l.336 → `REJ o mandato cita SHA mas nao recebeu o numero do PR` (os números de linha do oráculo `1000000`…`1000003` viram SHA). O arquivo `docs/revisoes/SAN3/B-GOV-MANDATO-ciclo4-equivalentes.txt` (NOVO, Dev-S4) declara **245 e 318** com as fixtures que tentaram (as 9+6 da C2‴, as minhas 50) — e o 336 **sai** da lista. Os 8 não classificados (§15.0(d)): o Dev-T4 tenta ≥ 3 fixtures dirigidas por ponto (o `aplica()` da ferramenta gera o mutante inválido; a versão viável é a da C2‴: `continue`→`;`, `if (0)` balanceado); DIFERE ⇒ caso novo; IGUAL em todas ⇒ entra no `…-ciclo4-equivalentes.txt` com as fixtures nomeadas (280 `ehex("")` é inalcançável por construção — `us != ""` na l.363 — e entra com essa justificativa + fixture). **Papel:** Dev-T4 / Dev-S4 (arquivo) / conferente (100 % dos equivalentes com fixture própria) / C2⁗.

**A15 — fail-closed inclui a própria morte (§1.5 do parecer; `P-GOV-MAQUINA-393-D-M3-FALHA-INTERNA`).** **Conserto (Dev-S4, pré-voo):** (i) `set -o pipefail`; (ii) `morreu() { printf 'REJEITADO  componente interno morreu: %s (ec=%s)%s\n' "$1" "$2" "$3"; exit 1; }` — e **toda** substituição de comando e **todo** cano dos 24 pontos de §15.0(c) lê o status: `X=$(…) || morreu awk-oraculo $? …`, com o stderr do componente capturado em arquivo e a 1ª linha dele na mensagem; (iii) a chk 6 distingue `git` morto (`ec≥126`/`128`, ou "not a git repository") de rev que não existe (`ec=1`); (iv) o `bash "$REFS"` já lê `RC`; o `[ -f "$F" ]` da l.120 fica. Veredito **nunca** positivo com componente morto: `morreu` sai com `ec=1` imediatamente. **[A15/awk1]** shim de `awk` no `PATH` (helper novo `rodaComPath(fixture, dirDoShim)` no guard — o shim mata só a invocação cujo programa contém `marcaChar`) → `ec=1`, `REJEITADO  componente interno morreu: awk (oraculo)`, `doesNotMatch(/PRE-VOO OK/)` · **[A15/awk2]** marcador `isento(num)` → `… awk (passada 2)` · **[A15/awkfiltro]** marcador `$1==t` → `… awk (filtro)` · **[A15/tr]**, **[A15/sed]**, **[A15/git]** (shims que morrem sempre; o de `git` sobre `b23` — `HEAD:scripts/mandato-refs.sh`) → cada um nomeia o componente · **[A15/refs]** = [B4] existente · **[A15/stderr-limpo]** em 5 controles positivos (bullets, tabela, colagem, rev:path, CRLF) `r.err === ""` (é o controle que teria pego o `syntax error` dos mutantes sem olhar cor). **⇄** (1) `REC=$(awk …)` sem `|| morreu` → [A15/awk2] passa com `PRE-VOO OK` (= `faa408c8` hoje, §15.0(c)); (2) `morreu` sem `exit` → o veredito final pode sair `PRE-VOO OK` com 1 REJ impressa — o caso exige `ec=1` **e** ausência de `PRE-VOO OK`; (3) sem `pipefail` → [A15/awkfiltro] cai pela causa errada (`falta a secao`), e o caso exige a mensagem **nomeando** o componente. **◐** artefato se o shim não foi alcançado (`PATH` em `C:/…` — §15.0(c) é a instância): o caso assere que o stderr contém a linha do shim. **Papel:** Dev-T4 (7 casos + helper) / Dev-S4 / **C1⁗ (mata cada componente com shims PRÓPRIOS; sobre `faa408c8` tem de reportar o fail-open da passada 2 sem ser mandada — teste de encerramento de D-M3)**.

**Ajustes e notas do ciclo 3 — o que ENTRA (medido: 1 linha cada no artefato, 1 caso cada) e o que vira pendência com dono (§15.7):**
- **Entra:** C1c-05 (`contaGrep` l.290 aceita caminho e `.exe` antes do nome: `/usr/bin/grep -c`, `grep.exe -c` → REJ5; caso [C1c-05]); C1c-06 (`\|` escapado em célula é literal, não fronteira: l.312/317 trocam `\|` por `\001` antes do `split`; caso [C1c-06]: `| suite 3103/3105 \| CI 14/14 |  |` → 1 REJ); C1c-10 (só o **título** dos 4 casos — [F-EXT/fronteira-3], [F-1d], [F-EXT/juntar-3], [F-6d] — e do [F-1c-controle], para dizer o que asseram; modificação de linha existente **declarada**, Dev-T4); C2c-03 (os 8 [M-EXT] sobreviventes viram caso: pré-voo [X07] refs `ec=2` numa colagem → `referencias indisponiveis … ec=2`, nunca `DESATUALIZADO`; [X08] `--sha-only` `ec=2` → `referencias indisponiveis (ec=2)`; [X09] SHA de 7 hex na colagem entra na proveniência; [X11] `DICA_APOS` não aparece depois de linha em branco; refs [Y02] ata com `Objeto` de 40 hex e `approved_head` com os 8 primeiros, SHA **inexistente** localmente → `LIDO`; [Y03] `approved_head` que é SHA de **tree** → `ec=3` contradição, nunca `LIDO`; [Y04] duas atas casando → `ec=3 "2 atas casam"`; [Y05] `--sha-only` inclui o `approved_head` — cada um com a mutação da C2‴ que o deixa verde como ⇄); C2c-04 (controle (a)/(b)/(c) falho ⇒ `PARADO … FALHA DO CONTROLE`, **`ec=2`**, nada medido — drill `t-controle` = `rc-texto` da C2‴ → `ec=2`); C2c-05 (o insumo fixo do diferencial passa a citar `scripts/mandato-refs.sh` e `docs/revisoes/SAN3/` — caminhos que dependem de `RAIZ` — e o refs recebe `MANDATO_GH=/bin/false 0` para percorrer até a l.128; drill `t-diferencial`: cópia sem `docs/revisoes/SAN3/` → `DIVERGE`); **fronteiras 25, 26 e 28** (abaixo); **fronteira 27** (vai além da lista do mandato, declarado: `RAIZ` em forma que o `git.exe` aceite — `cygpath -m` quando existir, como a ferramenta faz na l.98 — + caso [F-6j] com `MSYS_NO_PATHCONV=1` no `env` do spawn → `HEAD:scripts/mandato-refs.sh` segue OK; motivo: o blob do pré-voo muda de qualquer modo, o conserto são 2 linhas, e sem ele o "ambiente" fica para sempre como 4º elemento da identidade da matriz).
- **Fronteira 25 (ferramenta e guard):** `--timeout <s>` por mutante (default **1800**; `timeout -k 30 <s>` em volta de `roda_guard`; `ec=124` ⇒ linha `N | TIMEOUT | <op> | nao terminou em <s> s` — contado como **detectado por comportamento**, publicado à parte de K e de NÃO-COBERTOS, fora do `ec`); no guard, `roda()` dos dois arquivos ganha `timeout: 60_000` e `assert.equal(r.signal, null, "artefato nao terminou em 60 s")` (modificação de linha existente, declarada); caso [F-25] (`assert.throws` com `MANDATO_REFS` = shim que dorme 120 s). Drill `t-timeout`: `preflight --only 161 --timeout 120` → `161 | TIMEOUT`, a rodada **continua** (vermelho-controle: hoje a vaga trava — §14.15).
- **Fronteira 26:** `sed` da l.203 com `\(…\|$\)` → o mutante da l.340 é gerado (`diff` = 2 linhas); drill `t-next`: `preflight --only 340` → VERMELHO (F-7c), nunca `ANOMALIA-DIFF`.
- **Fronteira 28:** `EQN = |ids do arquivo ∩ NÃO-COBERTOS da rodada|`; id declarado que não está entre os não-cobertos ⇒ `ANOMALIA-EQUIV <id>` e **não abate**; resumo imprime os dois conjuntos e `EQUIVALENTES-CONFERIDOS=n`; drill `t-inventado` (K2b): `--only 245 --equivalentes <arquivo com 999: … (f)>` → `NAO-COBERTOS=1 EQUIVALENTES-CONFERIDOS=0`, **`ec=1`** (hoje `ec=0`); controle: o mesmo arquivo com `245: … (f)` → `ec=0`.
- **Cabeçalhos (o item "cabeçalho congelado" de `P-GOV-MANDATO-3-FRONTEIRAS` vence agora que o blob muda):** `mandato-preflight.sh` ganha por número 9, 14, 15, 19 (regra da junta), 22 e a 27 **fechada**; `mandato-mutantes.sh` ganha 24 (mantida) e 25, 26, 28 **fechadas**; `mandato-refs.sh` ganha o item "o que mudou no ciclo 4" (cabeçalho só; `git diff` do refs fora de comentários = vazio, conferido pela C3⁗).
- **Pendência com dono (não entra):** C1c-07 (CR solitário apagado por `tr -d '\r'` junta linhas — mudar a normalização muda a numeração que o autor vê; precisa de desenho), C1c-08 (`approved&#95;head`), C1c-09 (`` ```a``` ``) — as três como fronteiras **29, 30 e 31** em `P-GOV-MANDATO-3-FRONTEIRAS`, dono `B-GOV-MANDATO-2`; `P-GOV-MANDATO-4-GUARD-DA-FERRAMENTA` (um guard em `tests/` para `mandato-mutantes.sh`: hoje a linha de base do pré-voo custa ≈ 7 min por invocação e o runner recusa skip anônimo — os drills `t-*` vivem na **bateria**, executados por Dev-S4, conferente e C2⁗, cada um com vermelho-controle histórico sobre `37549262`), dono `B-GOV-MANDATO-2`.

### 15.3 Entregas do ciclo 4 — E1 (testes, Dev-T4) → E2 (scripts, Dev-S4) → E3 (registro, Dev-S4); o que o vermelho-controle tem de mostrar

**Ordem obrigatória (mecanismo 1 do §0.5, sem fallback):** E1 commita antes de E2; Dev-T4 não lê `scripts/**` **novos** (lê os do head, que são o objeto dos casos); Dev-S4 não edita `tests/**`. Se o Dev-S4 medir que um caso está errado, escreve a falsificação e **para** (§8 regra 1). Identidades: **`dev-tests-ciclo4-b-gov-mandato`** e **`dev-scripts-ciclo4-b-gov-mandato`** (novas; mandato de cada um em `00-mandatos/<papel>.md` na forma A, pré-voo OK no head do lançamento — condição 2 da §8.6).

**E1 — `tests/mandato-preflight.test.ts` e `tests/mandato-refs.test.ts` (Dev-T4).** Casos novos: C1c-01 ×4, C1c-02 ×5, C1c-03 ×3, C1c-04 ×6, C2c-02/336 ×1, A15 ×8 (7 componentes + stderr-limpo), C1c-05 ×1, C1c-06 ×1, C2c-03 ×8 (4 no pré-voo, 4 no refs), F-25 ×1, F-6j ×1 = **40** casos (≥ 36 no pré-voo, 4 no refs); helpers novos `rodaComPath`, `docGrande`, `shimQueDorme`. Modificações de linha existente, **todas declaradas no relatório com a propriedade que as justifica**: `roda()` dos dois arquivos (timeout + `signal`); os 5 títulos (C1c-10); e **qualquer caso cujo veredito mude** por C1c-01…04 — esperado **0** (§15.2), e cada um que aparecer é relatado, não decidido. **Prova do Dev-T4, ANTES do commit (vermelho-controle histórico):** guard novo sobre os artefatos do head (`faa408c8`, `474c7521`) em arnês pristino (§8 l.961-962) → TAP em arquivo; a lista de `not ok` tem de ser **exatamente** os casos novos que atacam o head (os de C1c-01…04, A15 exceto [A15/refs], C1c-05/06, C2c-02/336, C2c-03, F-6j, F-25) — nem um a mais (A14) nem a menos; `[A15/stderr-limpo]` e [C1c-01d]/[C1c-02c]/[C1c-03c]/[C1c-04e] verdes no head (são controles positivos). Ausência 0/N por arnês mantida (§14.17(2)). `npm run check`/`lint` verdes. Commit **T4c** só `tests/**`.

**E2 — `scripts/mandato-preflight.sh`, `scripts/mandato-mutantes.sh` (Dev-S4; `scripts/mandato-refs.sh` só cabeçalho).** Tudo de §15.2. **Prova do Dev-S4:** guard inteiro (T4c) sobre o artefato novo → `fail 0` (≥ 352 casos no pré-voo, ≥ 43 no refs — número exato publicado por execução); os 6 pares de §15.0(b) e os 6 componentes de §15.0(c) reexecutados com os shims **dele** → vereditos invertidos (ataques REJ, pares OK, morte nomeada); drills da ferramenta `t-invalido`, `t-inventado`, `t-controle`, `t-timeout`, `t-next`, `t-diferencial` com saída colada e **vermelho-controle histórico** (a mesma invocação sobre `37549262`: §15.0(f), K2b, C2‴); `bash -n` dos dois scripts; `git diff` do refs restrito a comentários. Commits **S4a** (pré-voo) e **S4b** (ferramenta), só `scripts/**`.

**E3 — registro (Dev-S4, commits D4·K4, só docs/KPI):** `docs/revisoes/SAN3/B-GOV-MANDATO-ciclo4-mutantes.md` (NOVO: identidade das matrizes do ciclo 4 — §15.4 —, saída verbatim das duas rodadas, `MUTANTE-INVALIDO`/`TIMEOUT` à parte, histograma, lema **não** usado, custo medido com fórmula); `…-ciclo4-equivalentes.txt` (NOVO); EMENDA — CICLO 4 no comando (escopo nominal de §15.6, **bateria** §15.8, **códigos de saída** novos — pré-voo `ec=1` também por morte interna; ferramenta `ec=2` por controle falho, categorias `MUTANTE-INVALIDO`/`TIMEOUT`/`ANOMALIA-EQUIV` —, autorização de `decisoes.md` repetida se houver linha, K do ciclo 4: fecha C3c-01 e C3c-N5); `pendencias.md` (§15.7) + índice pelo gerador; trilha (`status-geral`, `log-execucao`) com a linha §C5 do ciclo 4; `Kpis/*` só por `kpi-freeze` (§15.7).

### 15.4 A ferramenta volta a ser medida — identidade NOVA das matrizes, rodada COMPLETA (sem lema), e o custo com a fórmula

- **Identidade (§14.8 + §14.19):** o blob da ferramenta **muda** (é objeto do conserto), logo **nenhuma** matriz do ciclo 3 vale como base e o lema do §14.18(3) **não se aplica** (a premissa (a) — artefato e ferramenta iguais — é falsa por construção). Triplas novas: refs = `474c7521` / `<guard-refs@T4c>` / `<mutantes@S4b>`; pré-voo = `<preflight@S4a>` / `<guard-pre@T4c>` / `<mutantes@S4b>`; 4º elemento = ambiente (`MSYS_NO_PATHCONV exportadas=0 | git | node | uname`), mantido **mesmo com a 27 fechada** (a regra é ter a identidade completa, não a fragilidade). Resolução dos blobs: `git rev-parse <commit>:<caminho>`, nunca digitados.
- **Rodada (runner = orquestrador, worktree detached NOVO `C:/Users/AMP/w-e4f` em `K4`, `npm ci` próprio, variável não exportada, cabeçalho do log com `env | grep -c '^MSYS_NO_PATHCONV='`, `git --version`, `node -v`, `uname -srm`):** `bash scripts/mandato-mutantes.sh refs --controle --jobs 4 --timeout 1800` e `… preflight --controle --jobs 4 --timeout 1800 --equivalentes docs/revisoes/SAN3/B-GOV-MANDATO-ciclo4-equivalentes.txt` — **completas**, sem `--only` (não há lema; e o TIMEOUT por mutante torna a l.161/176/431 seguras). Saídas em `scratchpad/E4F/{refs,preflight}.txt`, coladas verbatim no `…-ciclo4-mutantes.md`.
- **Hipóteses (derruba: a linha `N=…` de cada rodada):** refs `N=46 K=46 NAO-COBERTOS=0 INVALIDOS=2→0?` — **não**: os 2 inválidos do refs (240, 251) continuam inválidos como mutantes da ferramenta (é o operador, não o guard) e saem `MUTANTE-INVALIDO`; a C2‴ mediu as versões viáveis cobertas (V240 fail=22, V251 fail=1) — publicados como inválidos com a nota. Pré-voo: `N ≈ 67 + 19 viáveis cobertos − …` — **não projeto K**: a enumeração muda com o artefato (linhas deslocadas, pontos novos de `morreu`); o que se exige é **[M-1] = 0 por conjuntos E por fixture** (equivalentes 245/318 + os que o Dev-T4 provar), `INVALIDOS` listados, `TIMEOUT` listados (esperado: 3 — a classe `marcaLen("")` e o `while (1)`), histograma impresso.
- **Custo (fórmula; unitário re-multiplicado pelo Dev-S4 na 1ª rodada dele — A12):** pré-voo: unitário do guard **436 s** (§15.0(a), máquina livre) a 531 s (§6 do mutantes.md, Dev-S) × ≈ 105 mutantes viáveis (103 de hoje + os pontos novos de `morreu`, menos os que virarem EXCLUIDO) ÷ 2,5 (ganho medido do `--jobs 4`) ≈ **5–6 h acordadas**, + 3 TIMEOUT × 1800 s ÷ 4 ≈ 25 min, + inválidos ≈ 35 × 2 s (não rodam guard); refs ≈ 35 min. Projeção, não medição.
- **Re-medição por quem:** o conferente (§15.5) **antes** do inspetor; a C2⁗ na junta.

### 15.5 A boa notícia tem conferente (P1b) — papel, procedimento, saída versionada, e o que o inspetor e a junta fazem com ela

- **Papel:** `conferente-dois-lados-b-gov-mandato-c4` — identidade **nova**; não é o runner (orquestrador), não é dev da ferramenta (Dev-S4), não é o planejador (eu — medir a boa notícia do meu próprio plano é a assimetria que o §8.1 nomeia), não é cadeira. Corpo escrito pela fábrica (2 espelhos, `sync-agent-agents.mjs --check`), mandato em `00-mandatos/conferente.md` (forma A). Fable por padrão (mede e classifica; não conserta — §C7.4-bis).
- **Procedimento (worktree próprio detached em `K4`; variável não exportada; `timeout` em tudo; arnês próprio por `git archive` + `git init`, `hash-object --no-filters` = blob):** (1) semente **própria** publicada; (2) **lado VERMELHO:** ≥ 20 % dos VERMELHOS de cada matriz: mutante pelo `aplica()` verbatim da ferramenta **nova**; prova que é programa (compila e executa sem diagnóstico); prova que o comportamento muda **antes** da cor (bateria própria de ≥ 30 fixtures + fixture dirigida ao ramo quando a bateria dá IGUAL — §15.0(d) 187); confere que a **causa publicada** (1º `not ok`) reproduz; (3) **lado VERDE:** 100 % dos NÃO-COBERTOS e dos equivalentes declarados, cada um com fixture própria que tentou discriminar; (4) 100 % dos `MUTANTE-INVALIDO`: confirma o diagnóstico e mede a versão viável (coberta / não coberta / sem mudança); (5) 100 % dos `TIMEOUT`: reproduz sob `timeout -k 5 60` o mutante feito à mão; (6) re-multiplica o custo (A12). Publica `agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-conferencia-dois-lados.md` (versionado pelo orquestrador **antes** do inspetor): semente, comandos, saída por ponto, e o veredito **`CONFERIDO`** / **`DIVERGE <pontos>`**. `DIVERGE` em qualquer VERMELHO (não é programa, ou não muda comportamento) ou em qualquer VERDE/equivalente (discriminável) ⇒ volta ao Dev-T4/Dev-S4 **antes** da junta (quem acha ≠ quem conserta: o conferente só reporta).
- **Inspetor (condição 3 da §8.6 + 2.4):** presença da conferência versionada, semente e identidade ≠ runner ≠ dev, e **re-executa 1 ponto de cada lado** com os comandos dela (fail-closed: `DIVERGE` ou conferência ausente ⇒ `BLOQUEADO`).
- **Junta:** a C2⁗ **não herda** a conferência — reexecuta com semente própria e julga se o conferente **executou** (saída colada), não se está nomeado; ponto VERDE não declarado = `bloqueia` ([M-1] l.720), inválido publicado como coberto = `bloqueia`.
- **Esta §15.0(d) é a amostra da matriz do ciclo 3** (o insumo que o conserto da máquina pediu para o plano — condição 3); a do ciclo 4 é do conferente. A diferença de papéis é de propósito (§15.11, divergência 2).

### 15.6 Escopo (§C4) — PERMITIDO e PROIBIDO com caminhos exatos, por papel

**Dev-T4 (`dev-tests-ciclo4-b-gov-mandato`):** `tests/mandato-preflight.test.ts`, `tests/mandato-refs.test.ts` — adições e as modificações **declaradas** de §15.3 (uma linha cada, com a propriedade); commits que tocam **apenas** `tests/**`; relatório próprio pelo pré-voo **do head** (`faa408c8`) com `PRE-VOO OK` colado.
**Dev-S4 (`dev-scripts-ciclo4-b-gov-mandato`; NÃO edita `tests/**`):** `scripts/mandato-preflight.sh`, `scripts/mandato-mutantes.sh`, `scripts/mandato-refs.sh` (só cabeçalho; `git diff` fora de comentários vazio — qualquer edição além vem com falsificação escrita); `docs/revisoes/SAN3/B-GOV-MANDATO-ciclo4-mutantes.md` (NOVO), `docs/revisoes/SAN3/B-GOV-MANDATO-ciclo4-equivalentes.txt` (NOVO); `agent-orchestration/codex/comandos/B-GOV-MANDATO-mandato-verificavel.md` (EMENDA — CICLO 4; e a correção `§7.3`→`§5.3` na l.255, C3c-03); `agent-orchestration/controle/pendencias.md` (§15.7, inclusive as 3 linhas `§7.3` de l.9805/9815/9826 do próprio bloco — nominal) + `pendencias-indice.md` **só pelo gerador**; `agent-orchestration/docs/status-geral.md`, `agent-orchestration/codex/log-execucao.md`; `Kpis/kpis-latest.json`, `kpis-history.json`, `kpis-history.md`, `app.js` **só por `node scripts/kpi-freeze.mjs`**; relatório pelo pré-voo **novo** (dogfooding 1).
**Orquestrador / fábrica / junta — mesmo PR, DECLARADO:** `agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/*.md` (um por papel, **antes** de cada agente nascer, com a cerca do veredito do pré-voo), `…/00-conferencia-dois-lados.md`, `…/00-inspetor-terreno.md`, `…/C{1,2,3}-evidencia.md`; `BRIEFING-B-GOV-MANDATO.md` (seção ciclo 4), `J-B-GOV-MANDATO.md` (seção ciclo 4, `Objeto julgado` e, se APROVADO, `- **approved_head:**`), `R-B-GOV-MANDATO-4.md` só se reprovar; `.claude/agents/especialistas/**` e `.agents/agents/especialistas/**` — os **4 corpos novos** (3 cadeiras + conferente), `git add -f` nos dois espelhos (o ignore global cobre os dois), `sync-agent-agents.mjs --check`; `agent-orchestration/omega/reprovacoes/R-B-GOV-MANDATO-ciclo3-auditoria.md` **só a §9** (atestação do auditor, §8.7); este plano (**só a §15**); corpo do PR. `decisoes.md` só com autorização nominal na emenda.
**PROIBIDO (a todos):** `src/**` · `prisma/**` · `migrations/**` · `frontend/**` · `mobile/**` · `.github/**` · `infra/**` · `.env` · lockfiles JS · `pubspec.*` · Figma · `CLAUDE.md` · `AGENTS.md` · arquivos-base da raiz · `.gitattributes` · qualquer outro `scripts/*` ou `tests/*` além dos nomeados (`scripts/run-backend-tests.mjs` inclusive) · as outras atas `J-*.md` · `TEMPLATE-J-ata.md` · os corpos das **9 cadeiras** dos ciclos 1–3 e do `medidor-de-cobertura-do-artefato`/`guardiao-fail-closed` (as emendas permanentes são do `B-GOV-MAQUINA-PRE-JUNTA`) · `docs/revisoes/SAN3/PLANO_SAN3.md` · worktrees alheios · **`tests/**` para o Dev-S4 e `scripts/**` para o Dev-T4**.

### 15.7 KPI (§C3) e registro — pendências (abrir · transferir · fechar), e o que a C3⁗ confere

- **`backend_tests`:** reexecução **N=2** pelo Dev-S4 (cluster descartável próprio, porta provada por `pg_isready` + `netstat`, `CORE_SAAS_PERSISTENCE` não exportado, TAP em arquivo, denominador idêntico, `ec=0`, sem a linha do P8); Δ por arquivo contra **dois** baselines — `$MB` (`5b6e1036:Kpis/kpis-latest.json` = **3052/3054** — medido por: `MSYS_NO_PATHCONV=1 git show origin/main:Kpis/kpis-latest.json | grep -A2 backend_tests`) e o head de hoje (**3403/3405**, 39 + 312) — esperado `3405 + 40 = 3445` testes (hipótese; derruba: o `# tests` do TAP). `blocks_completed` = `$MB` + 1 = **169** (medido: `origin/main` 168; head 169 — inalterado). `pr` 393, `merge_commit`/`approved_head` **null** na autoria. `frontend_smoke_tests`/`flutter_tests` carregados com nota, provado por `git diff --name-only $MB HEAD -- frontend mobile` = **0** (medido hoje) com controle `-- scripts tests` = 5 (> 0). History: entrada nova "ciclo 4 — recontagem" (última; `latest` = ela); a entrada de mutação cita `…-ciclo4-mutantes.md` com `N/K/NAO-COBERTOS/INVALIDOS/TIMEOUT` brutos e `[M-1]` **derivado por conjuntos e por fixture**. `kpi-freeze --check` ec=0; `node --check Kpis/app.js`; guards `tests/kpi-*.test.ts` verdes.
- **Pendências — abrir (Dev-S4):** `P-GOV-MANDATO-4-GUARD-DA-FERRAMENTA` (BAIXA, dono `B-GOV-MANDATO-2`); fronteiras **29/30/31** (C1c-07/08/09) em `P-GOV-MANDATO-3-FRONTEIRAS` (dono `B-GOV-MANDATO-2`). **Transferir/fechar:** em `P-GOV-MANDATO-3-FRONTEIRAS`, os itens **25, 26, 27, 28** passam a "FECHADA pelo ciclo 4 (`B-GOV-MANDATO`, PR #393, commit S4b/S4a)" com o teste de encerramento executado (drills); o item "cabeçalho congelado" é pago (§15.2). **Reabrir e fechar:** `P-GOV-MANDATO-3-MUTANTES-PREFLIGHT` (hoje FECHADA com `[M-1] = 0`, falsificado pela C2‴: 33 inválidos em K, `[M-1] ≥ 5`) ganha o parágrafo "reaberta pelo ciclo 3; fechada de novo pelo ciclo 4 com a matriz `…-ciclo4-mutantes.md`"; `P-GOV-MANDATO-3-MUTANTES-REFS` idem (2 inválidos em K: 240, 251). **Fechar:** C3c-01, C3c-N5 (emenda), C3c-03 (`§7.3`), C3c-02 (**já paga** — `agent-orchestration/codex/log-execucao.md` l.4982 "Limpeza §C5 do ciclo 3", medido por `grep -n 'Limpeza §C5 do ciclo 3'`; o Dev-S4 só anota). **Não é deste ciclo (dono citado, não duplicado):** `P-GOV-MAQUINA-393-D-M1/D-M2/D-M3` (peças permanentes — `B-GOV-MAQUINA-PRE-JUNTA` / `B-GOV-CICLOS-RESIDUAIS`), fronteiras 9–11, 13–22, 24 (`B-GOV-MANDATO-2`), `B-GOV-ATA-CABECALHO`.
- **A C3⁗ confere:** índice = gerador; cada pendência nomeada acima na seção certa do índice; `grep -n 'fronteira 2[5-8]'` nos cabeçalhos e na pendência; `mandato_md5` de cada papel na ata = `tr -d '\r' < 00-mandatos/<papel>.md | md5sum`; KPI por reexecução.

### 15.8 Bateria de validação (§9) por papel — e as regras dos devs (§8) que continuam inteiras

```bash
# worktree PROPRIO em caminho curto (C:/Users/AMP/w-devt4, w-devs4), npm ci proprio, SEM junction; MSYS_NO_PATHCONV NUNCA exportada;
# base viva (5432/6379) NUNCA alvo; TAP em arquivo; ec por variavel; `timeout` em tudo que executa artefato mutado
# --- Dev-T4, ANTES de commitar: vermelho-controle historico (guard novo x artefatos do head)
T=$(mktemp -d); git -c core.autocrlf=false archive -o "$T/p.tar" HEAD scripts tests src/config mobile/flutter_app/lib/core/sync/sync_action_store.dart docs/revisoes/SAN3 CLAUDE.md package.json
tar -x -C "$T" -f - < "$T/p.tar"; cp tests/mandato-*.test.ts "$T/tests/"; ( cd "$T" && git init -q && git -c core.autocrlf=false add -A && git -c user.name=t -c user.email=t@t -c commit.gpgsign=false commit -q -m arnes )
TW=$(cygpath -m "$T"); for f in scripts/mandato-refs.sh scripts/mandato-preflight.sh; do [ "$(git hash-object --no-filters "$TW/$f")" = "$(git rev-parse HEAD:$f)" ] || echo "ARNES DIVERGE: $f"; done
timeout 2700 node --test --import tsx --test-reporter=tap "$TW/tests/mandato-preflight.test.ts" > vc-pre.tap 2>&1   # not ok == EXATAMENTE os casos novos que atacam o head (§15.3)
timeout 900  node --test --import tsx --test-reporter=tap "$TW/tests/mandato-refs.test.ts"      > vc-refs.tap 2>&1  # not ok == [Y02..Y05] + [F-25]
# --- bateria completa (Dev-S4 no fim; Dev-T4 roda o que existe)
DATABASE_URL=<descartavel> npx prisma generate ; npm run check ; npm run lint ; npm test (2x, TAP em arquivo) ; npm run build ; npm --prefix frontend run check ; npm --prefix frontend run build
timeout 900  node --test --import tsx --test-reporter=tap tests/mandato-refs.test.ts      > refs.tap   # >= 43, 0 fail, 0 skip
timeout 2700 node --test --import tsx --test-reporter=tap tests/mandato-preflight.test.ts > pre.tap    # >= 348, 0 fail
bash -n scripts/mandato-preflight.sh && bash -n scripts/mandato-mutantes.sh
# drills da FERRAMENTA (cada um com o vermelho-controle historico sobre 37549262 colado ao lado):
timeout 1800 bash scripts/mandato-mutantes.sh preflight --only 298,305 --jobs 2                       # t-invalido: 2x MUTANTE-INVALIDO, K=0
timeout 1800 bash scripts/mandato-mutantes.sh preflight --only 245 --equivalentes <arq-com-999> --jobs 1 # t-inventado: ANOMALIA-EQUIV 999, ec=1
timeout 1800 bash scripts/<copia-rc-texto>.sh refs --controle --only 1                                   # t-controle: FALHA DO CONTROLE -> ec=2
timeout 1800 bash scripts/mandato-mutantes.sh preflight --only 161 --timeout 120 --jobs 1              # t-timeout: 161 | TIMEOUT, rodada segue
timeout 1800 bash scripts/mandato-mutantes.sh preflight --only 340 --jobs 1                            # t-next: mutante gerado, VERMELHO
timeout 1800 bash scripts/mandato-mutantes.sh preflight --controle --only 1                            # t-diferencial: IDENTICO; copia sem docs/revisoes/SAN3 -> DIVERGE
# A15 por componente, com shims PROPRIOS no PATH (forma POSIX!) sobre o pre-voo novo e sobre faa408c8 (vermelho-controle)
node scripts/kpi-freeze.mjs --check ; node --test --import tsx tests/kpi-dashboard-charts.test.ts ; node scripts/sync-agent-agents.mjs --check ; node --check Kpis/app.js
python agent-orchestration/controle/gerar-indice-pendencias.py && git diff --stat -- agent-orchestration/controle/pendencias-indice.md
bash scripts/mandato-refs.sh 393 ; echo ec=$?                      # VIVO, colado em CERCA no relatorio
bash scripts/mandato-preflight.sh <relatorio-do-dev>.md 393 ; echo ec=$?   # DOGFOODING: Dev-T4 com o pre-voo do head; Dev-S4 com o NOVO
git diff --cached --check || exit 1
```
A última linha em **linha própria**. Regras 1–9 do §8 valem integralmente (relatório em `## MEDIDO`/`## HIPOTESE`; `approved_head` só na colagem; saída em cerca; mutante = `diff` de 1 linha; head medido no início e no fim; remoção pelo nome; §C5 em 1 linha).

### 15.9 Junta 4 (§C7) — composição, quórum, mandatos como artefato, inspetor, atestação, inelegíveis por nome; §C7.4-bis respondido

**Inelegíveis como jurado, dev, conferente e planejador — conferidos por nome (obituário, atas, `R-*`, `votos/**`, censo de commits):** as 9 cadeiras dos ciclos 1–3 (`jurado-mandato-c1-prevoo-fail-closed`, `jurado-mandato-c2-pergunta-feita`, `jurado-mandato-c3-escopo-kpi-registro`, `guardiao-fail-closed`, `medidor-de-cobertura-do-artefato`, `jurado-mandato-c3b-fronteira-numero-registro`, `jurado-mandato-c1c-invariancia-de-forma`, `jurado-mandato-c2c-cobertura-por-mutacao`, `jurado-mandato-c3c-fronteira-numero-registro`); a instância do inspetor da junta 3; os devs dos ciclos 1–3 (`aa051e8cc3eb1c1a0`, `a4ed42a5e3a81bdd3`, Dev-T e Dev-S do ciclo 3 pela trilha, `dev-t3-mandato-b8-refs`, `dev-t4-mandato-refs-win32`, `dev-t5-mandato-v18-win32`, `dev-t6-mandato-preflight-16`, `dev-s2-mandato-registro`); o planejador das §1–§14.20; as **duas identidades da tabela §8.10 do parecer** — quem auditou (`auditor-maquina-b-gov-mandato-c3`; ele **atesta**, §8.7, e só) e quem desenhou o conserto da máquina (`planejador-conserto-maquina-b-gov-mandato`); o orquestrador; e **esta identidade** (`planejador-ciclo4-b-gov-mandato`) como dev, conferente e cadeira.

**Quórum:** maioria de 3 (§C7.1-ter(b)) — o bloco não toca dinheiro, segurança, permissão nem perda de dado; a C3⁗ confere no diff (`git diff --name-only "$MB" HEAD -- src prisma frontend mobile .github` = 0, com controle `-- scripts tests` > 0). Sem veto individual; sem suplente; queda relança a **mesma** identidade, que não herda nada; voto perdido nunca é aprovação; evidência incremental com hora. O `critico-adversarial` **não** é convocado (não é bloco de invariante — §C7.1-ter(b)); o conserto já foi atacado por três juntas e uma auditoria.

**Cadeiras — três identidades NOVAS (fábrica), corpos nos dois espelhos ANTES da inspeção, cada corpo com "declare `mandato_md5` na 1ª linha":**

| cadeira | identidade (sugerida) | competência | itens por EXECUÇÃO própria (nunca com as amostras deste plano) |
|---|---|---|---|
| **C1⁗** | `jurado-mandato-c1d-invariancia-e-morte-interna` | propriedade × forma (partir E juntar); **morte interna (A15)** | (1) C1c-01…04 com fixtures próprias e ≥ 3 formas novas por bloqueante (A13: um caso de cada operador); (2) **mata cada componente** (awk oráculo/passada 2/filtro, `tr`, `sed`, `git`, refs) com shims próprios no `PATH` POSIX — **sobre `faa408c8` primeiro**, e tem de reportar o fail-open da passada 2 **sem ser mandada** (se não reporta, o item é forma e a cadeira é inválida — §8.4(iii)); sobre o head: `ec=1` nomeando o componente, nunca `PRE-VOO OK`; stderr vazio nos positivos; (3) isenção não inventariada (I1 agora exata; `## X`); título × asserção dos casos novos |
| **C2⁗** | `jurado-mandato-c2d-cobertura-e-dois-lados` | cobertura por mutação; honestidade da matriz; **conferência dos dois lados** | (1) reexecuta a E4 nova: refs inteira; pré-voo por amostra com **semente própria** (≥ 20 % VERMELHOS + 100 % VERDES/equivalentes/INVALIDOS/TIMEOUT), mutante = programa provado, comportamento antes da cor; divergência com a matriz publicada é achado; (2) os 35 inválidos históricos saem `MUTANTE-INVALIDO`; versões viáveis: 298/305/364/405 **cobertas** agora (casos X04/X02/V364/V405 do Dev-T4? — **não**: esses 4 pontos são cobertos pelos casos de C2c-03/A15 e pela isenção exata; a cadeira mede); (3) [M-1] por conjuntos **e** por fixture própria nos equivalentes; (4) o conferente **executou** (saída colada, 1 ponto de cada lado reproduzido pela cadeira); (5) [M-EXT] ≥ 10 próprios; (6) drills `t-*` reexecutados com os vermelhos-controle; `rc-*` → `ec=2` |
| **C3⁗** | `jurado-mandato-c3d-escopo-kpi-registro-mandato` | escopo por geração; número; registro; ordem por par; **mandatos como artefato** | §15.6 por laço (diff → declaração, lista proibida gerada); KPI 2× em cluster descartável; índice pelo gerador; pendências de §15.7 (transferências 25–28 com teste executado; reaberturas; 29–31); cabeçalhos (`grep -n` por número); ordem por par T4c → S4a/S4b; nenhum commit tocando as duas pastas; **`mandato_md5` de cada papel = arquivo** e pré-voo de cada mandato **re-executado no head do objeto** (2.4); linha §C5 do ciclo 4; §9 do parecer presente com `CONSERTO VERIFICADO`; `R-B-GOV-MANDATO-4.md` ausente (só existe se reprovar) |

**Mandatos como artefato (D-M2, condições 2/4/5 da §8.6; `D-MANDATO-FORMA`):** cada papel (devs, conferente, cadeiras, inspetor, auditor-atestação) nasce de `00-mandatos/<papel>.md`, forma A, versionado **antes** do lançamento, com a cerca do veredito (`ec`, head, blob do pré-voo, UTC); o agente declara `mandato_md5` na 1ª linha da evidência; o inspetor **re-executa** o pré-voo de cada mandato no head do objeto (`REJEITADO` ⇒ `BLOQUEADO`; `DESATUALIZADO` porque o head andou ⇒ relançar com mandato novo). Caminho: `<papel>.md` (como `planejador.md` já está), prefixo `NN-` opcional.

**Inspetor de terreno (§C7.1-bis), fail-closed, confere as 7 condições da §8.6 + 2.4 + §15.5:** §8 e §9 (`CONSERTO VERIFICADO`) no parecer; mandatos (um por papel, cerca, `git log` anterior ao 1º artefato do papel); este §15 com §15.0(d) (amostra dos dois lados, semente, identidade) e §15.1 (A15; coluna papel por artefato sem célula vazia para matriz/KPI) — e re-executa 1 ponto de cada lado de §15.0(d) e 1 de cada lado da conferência do ciclo 4; corpos das 4 identidades novas nos 2 espelhos com `grep -c` dos itens ("morte interna", "dois lados", "`mandato_md5`") ≥ 1; pré-voo OK em todos os mandatos no head do objeto; D-M4 pago (log l.4982); inelegibilidades por nome; S0; blobs das triplas = objeto; baseline honesto (guards + `npm run check` com `prisma generate`); worktree próprio por cadeira; 0 processo vivo; plano de perda. Qualquer condição ausente ⇒ `BLOQUEADO`, nomeando-a.

**Atestação (§8.7):** `auditor-maquina-b-gov-mandato-c3` (mesma identidade da auditoria) escreve a **§9** do parecer depois de existirem as condições 2–6 e **antes** do inspetor: re-executa (d) (pré-voo dos mandatos → OK), (c) (§15.0(d) existe; 1 ponto de cada lado reproduz) e (a) quanto à A15 (item "morte interna" no corpo da C1⁗ com vermelho-controle sobre `faa408c8` declarado) → `CONSERTO VERIFICADO — máquina sã para o ciclo 4` ou `CONSERTO INSUFICIENTE — <peça>`.

**§C7.4-bis, respondido por escrito:** (a) **a composição cobre a competência dos achados?** Sim — forma/fail-closed **mais** morte interna (a lacuna que três juntas não viram, §2 do parecer); cobertura **mais** dois lados; escopo/número/registro **mais** mandatos. (b) **quem achou consertou?** Não: C1‴/C2‴/C3‴/auditor não planejam nem consertam; Dev-T4 ≠ Dev-S4; o conferente não é runner nem dev; eu não desenvolvo. (c) **dado podre?** Tudo o que esta §15 afirma foi **medido em §15.0** (os 6 bloqueantes, A15 por componente, a amostra dos dois lados, o histograma, o custo do documento de 10⁶ linhas, os 8 não classificados) ou está marcado hipótese com o comando que a derruba (§15.4, §15.7); os números do ciclo 3 que a §15 cita (33 inválidos, [M-1] ≥ 5, 100 VERMELHOS) foram **recontados** da matriz publicada e reproduzidos por amostra — não herdados dos votos.

### 15.10 Ordem dos próximos passos (sucessão) — dono por papel; riscos e rollback

| # | passo | quem | depende de |
|---|---|---|---|
| 0 | mandatos de **Dev-T4, Dev-S4 e conferente** em `00-mandatos/`, forma A, pré-voo OK no head, versionados | orquestrador | — |
| 1 | fábrica escreve os 4 corpos (C1⁗, C2⁗, C3⁗, conferente); orquestrador versiona (`git add -f`, 2 espelhos, `--check`) | `agente-fabrica` / orquestrador | — (pode andar em paralelo com 2–3) |
| 2 | **E1** — casos novos + modificações declaradas; vermelho-controle histórico; commit **T4c** (só `tests/**`) | Dev-T4 | 0 |
| 3 | **E2** — pré-voo (S4a) e ferramenta (S4b); drills `t-*` com vermelho-controle histórico; bateria; **E3** — registro/KPI (D4, K4) | Dev-S4 | 2 |
| 4 | **E4 do ciclo 4** — `refs` e `preflight` completas, `--controle --jobs 4 --timeout 1800`, worktree `w-e4f` em K4 | orquestrador (runner) | 3 |
| 5 | matrizes verbatim em `…-ciclo4-mutantes.md`; fechar/transferir pendências; emenda ciclo 4; history (commit K4b) | Dev-S4 | 4 |
| 6 | **conferência dos dois lados** → `00-conferencia-dois-lados.md`; `DIVERGE` ⇒ volta a 2/3 | conferente (novo) | 5 |
| 7 | registro da junta: seção ciclo 4 do briefing (inelegíveis por nome, mandatos, conferência), ata (esqueleto), mandatos das 3 cadeiras e do inspetor; corpo do PR | orquestrador | 6 |
| 8 | **atestação §9** do parecer | `auditor-maquina-b-gov-mandato-c3` | 7 |
| 9 | **inspetor** (condições 1–7 + 2.4 + §15.5) | `inspetor-de-terreno-da-junta` | 8 |
| 10 | **junta 4** (C1⁗, C2⁗, C3⁗), votos em `votos/B-GOV-MANDATO-ciclo4/` | as três cadeiras | 9 |

**Riscos e rollback:** (R1) a E4 nova revela NÃO-COBERTOS novos (pontos de `morreu`, deslocamentos) → Dev-T4 acrescenta casos (só adições) e o **lema do §14.18(3)** passa a valer para a rodada delta (artefato e ferramenta iguais; premissas (b)–(g) medidas pela C3⁗) — nunca "vai dar igual"; (R2) um caso existente muda de veredito por C1c-04/02/03 → relatado pelo Dev-T4, decidido aqui por errata (§15.11), nunca estreitado pelo dev; (R3) o `cat-file -e` da chk 6 rejeita citação legítima de SHA que não existe localmente (ex.: head de outro PR não buscado) → é a propriedade certa (fail-closed) e a mensagem diz `rev nao existe localmente — git fetch`; (R4) custo da rodada > projeção (A12) → o Dev-S4 publica o unitário real e re-multiplica; (R5) 429/queda → mesma identidade relança; evidência incremental com hora; nada herdado de parcial (foi assim aqui). **Rollback:** reverter S4a/S4b deixa o guard T4c vermelho nos casos novos — é o vermelho-controle, não um estado válido; o PR não merga com `fail > 0`.

### 15.11 Hipóteses do mandato — estado; divergências com o parecer da auditoria; ERRATAS a linhas anteriores deste plano

**Hipóteses do mandato (`00-mandatos/planejador.md`, seção `## HIPOTESE`):**
1. **H1 (corpo):** medida — md5 `4c912f69a93f07b14d8fd1c49539c778`; **o mandato não publica o valor esperado** (só o comando), logo não há com que comparar; declarado na 1ª linha da evidência e da mensagem final.
2. **H2 (blobs):** **não derrubada** — §15.0(a).
3. **H3 (§15 só por adição; `porcelain` sem o plano = 0):** vale após o apenso — `grep -ic '^## §15'` = 1; `git diff -U0 -- <plano> | grep -c '^-'` = 0 (nenhuma linha removida).
4. **H4 (conserto da ferramenta/pré-voo com teste):** o comando de derrubada do mandato roda a ferramenta **do head** e devolve o vermelho-controle histórico — §15.0(f); o lado "depois" é `MUTANTE-INVALIDO` ×2 (§15.2). **Precisão:** os testes da ferramenta são **drills de bateria** com vermelho-controle histórico, não um guard em `tests/` (custo da linha de base ≈ 7 min por invocação; o runner recusa skip anônimo) — pendência com dono (§15.7).
5. **H5 (identidades novas; nenhum dos 7 corpos, inspetor, planejador do ciclo 3, planejador do conserto, auditor ocupa papel):** **verdadeira pela tabela de papéis** (§15.9/§15.10) — mas o comando de derrubada do mandato (`grep -icE 'dev-t-[1-6]|dev-s-2|planejador-conserto|auditor-maquina'` na §15) **devolve > 0**, porque a §15 **nomeia** esses inelegíveis (condição 7 da §8.6 exige por nome) e nomeia o auditor como quem **atesta** (§8.7). O comando mede **menção**, não **ocupação** (classe A14 do próprio catálogo: cai por outra causa). Comando que mede ocupação: `awk '/^## §15/,0' <plano> | grep -E '^\| (C1⁗|C2⁗|C3⁗|[0-9]+) \|' | grep -icE 'dev-t-[1-6]|dev-s-2|planejador-conserto|auditor-maquina'` = **0** nas linhas de cadeira; e o passo 8 da §15.10 nomeia o auditor **só** para a atestação, que é o papel que o §8.7 lhe dá.
6. **H6 (toda premissa herdada marcada a re-verificar; todo número com comando):** `grep -ic 'medido por'` na §15 ≥ 1 (são dezenas); os números do ciclo 3 citados estão recontados em §15.0.
7. **H7 (sem conserto, sem corpo, sem versionamento; `w-pl4` removido pelo nome):** §15.12; `git worktree list | grep -ic w-pl4` = 0 ao fim.

**Divergências com o parecer da auditoria (lidas como hipótese e medidas):**
1. **§8.2 P1a — "valor modal com multiplicidade ≥ 10 % de N = `ASSINATURA-DE-CRASH`":** falsificado em §15.0(e) — `fail=1 × 18` (18 pontos legitimamente cobertos por um caso) também tem ≥ 10 %, e o 541 (`fail=210`) é mudança legítima. O discriminador adotado é o **diagnóstico de interpretador no stderr** (estático + dinâmico); o histograma fica, como informação e prioridade da amostra.
2. **§8.2(iv) — "runner = orquestrador; conferente = planejador":** para a matriz do **ciclo 4** o conferente é uma **identidade nova** (§15.5): o planejador conferir a boa notícia do próprio plano é a assimetria que o §8.1 nomeia; o planejador mediu a matriz do **ciclo 3** (§15.0(d)), que é o insumo da condição 3.
3. **§8.9 — "fronteiras 25–28 são do ciclo 4" vs R-3/mandato "25, 26, 28":** este plano fecha **as quatro** (a 27 por 2 linhas + 1 caso, declarado como além da lista do mandato), e mantém o ambiente na identidade da matriz.
4. **§8.4(ii)(b) — "mate cada componente":** adotado; medido aqui (§15.0(c)) que **só a passada 2** é fail-open hoje e que os demais fecham pela causa errada — o conserto nomeia o componente em todos.
5. **§8.3 P2a — caminho `00-mandatos/<NN>-<papel>.md`:** o versionado é `<papel>.md` (`planejador.md`); a convenção seguida é a do arquivo existente, prefixo opcional.
6. **§1.5/§8.0 M4 — "o mutante não rejeita tudo: aprova tudo":** confirmado e estendido: aprova também SHA fabricado e `grep` sem `-i` (§15.0(c), 6/6 insumos).

**ERRATAS a linhas anteriores deste plano (citando a linha; o texto acima fica intocado):**
- **§14.18, tabela l.1626 (ponto 336 "equivalente … não carregam caminho, SHA, token")** — falso a partir de 10⁶ linhas (C2c-02; reproduzido em §15.0(b)): o 336 é discriminável; **§14.18 decisão 1, l.1634 ("3 equivalentes declarados")** lê-se "2 (245, 318); o 336 é NÃO-COBERTO e ganha caso no ciclo 4".
- **§14.18 l.1606 ("87 VERMELHO") e §14.20 l.1684/1686 ("[M-1] = 0 … derivado")** — o K de 87/100 contém 33 mutantes que não compilam (C2c-01, reproduzido por amostra em §15.0(d): 4 de 20); o `[M-1]` derivado por conjuntos era sobre um K falso: real ≥ 5 (C2‴). A derivação por conjuntos continua necessária (fronteira 28), mas **não é suficiente**: falta "o mutante é um programa" (§15.2 C2c-01).
- **§14.2.1 l.1344 ("blobs congelados … da rodada E4 até o voto")** e **§14.4 l.1386 ("o `bash -n` pegou, como desenhado")** — o `bash -n` valida o shell, não o awk embutido; o congelamento valeu para o ciclo 3 e **cai no ciclo 4** (a ferramenta é objeto do conserto — §15.4).
- **§10 l.1078 ("§C7.4.4")** — grafia inexistente no `CLAUDE.md`: é o item 4 do §C7.4 (nota do inspetor da junta 3).
- **§7 l.947 ("`blocks_completed` 168, inalterado")** — já superado pela E-4(d)/E-7(a): **169** = `$MB` + 1 (§15.7).

### 15.12 Limpeza (§C5, 1 linha) e fechamento

Removidos pelo nome: worktree `C:/Users/AMP/w-pl4` (`git worktree remove --force`, depois de `status --porcelain` = 0 e 0 processo vivo com `w-pl4|pl4|mandato-mutantes|mandato-preflight` na linha de comando; `npm ci` próprio, sem junction), os arneses e mutantes em `scratchpad/pl4/arn/{m*,dl*,x04}`, `pl4/oito/v*`, `pl4/a15bin/`; ficam, como evidência reexecutável, `scratchpad/PLANO-393-S15.md`, `pl4/{build-fx.sh,repro.sh,dois-lados.sh,repro.out,dois-lados.out,a15.out,fx/,shim/,base/,h4/,dois-lados/out/,arn/pris}`; nenhum contêiner criado; base viva nunca alvo; nenhum arquivo rastreado tocado além deste (§15 apensada ao fim, CRLF como o resto do arquivo; `git diff -U0` sem linha `-`); resíduo alheio (`w-devs393`, `w-devt393`, `.claude/worktrees/{b04a,b11,gov-descuido}`) **reportado, não varrido**.

### 15.13 Precisões medidas DEPOIS do apenso (só adição; corrige a §15.11 item 5 onde ela diz "= 0")

- Apenso conferido — medido por: `wc -l`, `tr -cd '\r' | wc -c`, `git diff -U0 -- <plano> | grep -E '^-' | grep -vE '^---' | wc -l`, `git diff --check`: **1984 linhas, 1984 CR** (CRLF uniforme, como o resto do arquivo), **0 linhas removidas**, 294 acrescentadas, `--check` limpo; `grep -ic '^## §15'` = **1**; `git status --porcelain` sem o plano = **0** (H3 cumprida).
- **H5 pelo comando literal do mandato** (`awk '/^## §15/,0' <plano> | grep -icE 'dev-t-[1-6]|dev-s-2|planejador-conserto|auditor-maquina'`) = **5**: l.56 da §15 (a frase "≠ devs da ferramenta = Dev-S/Dev-S-2" na amostra dos dois lados), a lista de inelegíveis (§15.9), a atestação (§15.9), o passo 8 (§15.10) e o próprio item 5 da §15.11 — **todas menções de inelegibilidade ou da atestação**, nenhuma ocupação de papel de planejador, dev, conferente ou cadeira. Nas linhas de cadeira (`grep -E '^\| \*\*C[123]⁗\*\*'`) o mesmo padrão dá **0**; na tabela de passos dá **1** = o passo 8 (atestação do auditor, que é o papel que o §8.7 do parecer lhe reserva, não um papel do ciclo). A frase "= 0 nas linhas de cadeira" da §15.11 item 5 vale para as cadeiras; para os passos, o número é 1 e a causa é a atestação.
- H6 pelo comando literal (`grep -ic 'medido por'` na §15) = **18**.
