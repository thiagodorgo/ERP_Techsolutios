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
tem só adições + esses dois hunks.

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
6. `--controle`: injeta na cópia do artefato uma cláusula `[ -n "$SONDA_INEXISTENTE" ] || parado "sonda"` **sem guard** e exige
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
só tem linhas adicionadas **mais exatamente duas fixtures reescritas na FORMA, por divergência declarada** (B-1/B-3): `[B1-correto]`
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
8. Toda afirmação numérica do relatório vem com `medido por:` **na mesma unidade** — e o token `approved_head` **só** dentro da colagem verbatim da ferramenta (a checagem 7 nova cobra isso do próprio relatório — inclusive em `medido por: grep …`; escreva `approved_h[e]ad`).
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
| R3 | E4 leva **≈4,2–5,0 h serial** (unitários medidos por dois papéis: refs 2,56–2,92 s, pré-voo 0,49–0,64 s; fórmula em E4) | `--jobs 4` → ≈1,0–1,3 h; `--only`; background | **nenhum — E4 fica** |
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
`jurado-mandato-c3-escopo-kpi-registro` (ciclo 1); o orquestrador; o `planejador-mestre`; Dev-T e Dev-S; os devs dos ciclos 1
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

---

*Limpeza §C5 do planejador (v1–v3, 1 linha):* removidos pelo nome o worktree `C:/Users/AMP/w-plan393c`, `scratchpad/plan393c/{H,R,mut,parts}`,
o repo-sonda `plan393c/R3`, o shim `plan393c/mut3` e `plan393c-npmci.log`; **mantidos como evidência declarada**: `plan393c/proto/` (`ah.awk` v1, `fence.awk`,
`reserved.awk` v2, `reserved3.awk`, `secoes.awk`, `chk5.awk`, `pre.pristino.sh`, `pre.v2-*.sh`, `pre.v3-agg.sh`, `tool*.txt`),
`plan393c/fx`, `fx2`, `fx3`, `fx4` (fixtures de §0.3/§0.6/§12), `plan393c/arnes8` (arnês da receita do §8, D-4) e `plan393c/v2`, `v3`, `v4` (partes + `apply*.py`); nenhum rastreado tocado; resíduo
alheio (`b04a`, `b11`, `gov-descuido`, `gov-elenco`, `w-mandato` com ` M .agents/agents/*.md` fantasmas, `w-teto`, `crit393c/`,
`crit393d/`, `TEMPLATE-J-ata.md`) só reportado. Base viva nunca alvo.
