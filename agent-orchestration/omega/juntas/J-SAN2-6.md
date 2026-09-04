# J-SAN2-6 — ata da junta do bloco SAN2-6 (PR #368)

> **Quórum: MAIORIA de 3** (§C7.1-ter(b) — o bloco **não toca dinheiro, segurança, permissão nem perda de
> dado**; diff de código **0 byte**, provado por mutação).
> **Head julgado:** `d90fbbb` · **Base:** `origin/main` = `e6a6461` (#367) · **Branch:**
> `docs/san2-6-contrato-p1p6-teto`.
> **Terreno:** `LIBERADO COM RESSALVA` — R1 todo comando de dentro de `san2-r` · R2 drills em worktree
> descartável · R3 merge só com CI 7/7 no head final.
> **Briefing:** `BRIEFING-SAN2-6.md` · **Votos e evidência:** `votos/SAN2-6/` · **Quedas:**
> `votos/SAN2-6/00-quedas.md`.

## Votos

| Cadeira | Veredito | Achados |
|---|---|---|
| **C1 — `auditor-da-insercao-e-da-paridade`** (sem veto) | **APROVADO** | 3 · todos `nota` |
| **C2 — `provador-do-espelho-e-do-comando`** (VETO) | **APROVADO** | 4 · 1 alta · 1 baixa · 2 nota |
| **C3 — `suplente-conferente-do-kpi-e-das-dividas`** (VETO) | **APROVADO** | 4 · 1 alta · 3 nota |

**RESULTADO: APROVADO 3×0.** Quórum exigia maioria; saiu unânime. **Nenhum achado `bloqueia`.**
**1 queda de jurado, 0 voto perdido.**

## O que o bloco existe para impedir

O próximo bloco é o **ciclo 5 do `B-O6R-02`**, que tem **UMA tentativa** (`D-TETO-DOIS-CICLOS`) e vai para
o **Codex**. Duas lacunas do contrato só apareceriam sob pressão, e as duas custariam essa tentativa:

1. **`P1`–`P6` não estava inline em contrato nenhum** — os dois resumiam e **apontavam** para
   `PROTOCOLO-JUNTA-RESILIENTE.md`. Medido antes: `grep -cE '\bP[1-6]\b'` = **0/0**. Um executor sob pressão
   não dá o salto de referência, e P1/P2 são exatamente o que protege trabalho contra perda por queda.
2. **Nenhum contrato dizia que o ciclo 5 é a última tentativa.** Os dois diziam que o teto é 2 e que o
   `B-O6R-02` "chegou ao ciclo 5" — lido isoladamente, isso sugere que o bloco **já estourou** o teto. A
   ordem real vivia fora do contrato. **O próprio orquestrador errou essa premissa e a repetiu ao dono
   várias vezes** antes de a revisão de prontidão corrigi-la.
3. Efeito colateral obrigatório: o `.agents/agents/README.md` — que o **Codex** lê — ensinava *"ciclos 4–5
   replanejam"*, **o teto revogado**.

## O que cada cadeira mediu por conta própria

**C1 não aceitou a paridade §A2 como afirmação: provou-a.** Extraiu o bloco §C7.4→§C7.7 dos dois contratos
(110 linhas de cada lado, fronteiras achadas por âncora) e mediu **o mesmo sha256**
(`7add0137…`) — identidade de conteúdo, não semelhança de diff. Provou o **append-only** da fonte por
**identidade de prefixo**: o sha256 do `PROTOCOLO-JUNTA-RESILIENTE.md` base inteiro (96 l.) é igual ao do
`head[1..96]`. E foi além do mandato: diffou o **§C7 INTEIRO** (167 linhas cada) para caçar divergência que
o bloco alterado esconderia — sobrou **uma** linha, de mecanismo (C1-A3).

**C2 provou o que o guard do espelho NÃO prova — e essa é a medição mais valiosa da junta.**
`sync-agent-agents.mjs --check` sai `ec=0` ("23 agentes") e **morde a fatia que enxerga** (mutar um corpo →
`ec=1` nomeando o arquivo). Mas: **(a)** plantou um **corpo falso** em `.agents/agents/especialistas/` e o
`--check` **seguiu `ec=0`**, e o gerador **não o removeu** — `readdirSync` plano nas l.66/74/101; **(b)**
injetou no README a frase revogada *"ciclos 4-5 replanejam"* e o `--check` **seguiu `ec=0`**, porque o
README está em `KEEP` (l.27) e **o script não o gera**. **Conclusão: as 9 edições do README, que são o
núcleo do bloco, são inteiramente NÃO-GUARDADAS.** O bloco declarou as duas cegueiras com precisão em
quatro lugares, com `P-SYNC-AGENTS-NAO-RECURSIVO` aberta e dono fora deste bloco — a honestidade está
provada; o buraco na rede permanece.
C2 também conferiu **11 citações** do comando do Codex contra o **blob** do head (o mandato pedia ≥5): a
cláusula do teto é **transcrição, não paráfrase** — diff de **0 linhas** entre o comando e o `CLAUDE.md`. E
**re-mediu a §11.11 nesta máquina**: correta linha a linha.

**C3 caiu e a suplente re-executou sob o P3.** O roteiro da caída **reproduziu integralmente** (1a/1b/1c/1d,
saída idêntica). `approved_head` `5256b49` confirmado como o **certo**: em **3 de 3** precedentes onde os
hashes divergem (#363, #364, #366), o gravado segue **a ata**, nunca o `headRefOid` — gravar `657928f`
declararia que a junta aprovou 17 arquivos que ela não viu. As **149 entradas anteriores do history: zero
alteração**. Na cauda que ninguém tinha medido: a âncora `442 0`/`100 0`/`506 0`/`121 0` é **verdadeira nos
quatro números**; §C3.3 carregado com marcador nas quatro métricas; §C3.4 intocado. E os cinco drills do
painel saíram verdes — **o guard MORDE** (JSON do head × `app.js` da `main` → `ec=1`), o `FROZEN` foi
**gerado** (71.933 chars idênticos ao `JSON.stringify`), e o índice de pendências regenerou
**byte-idêntico**: a dessincronia `C3-A5` do `J-SAN2-5` **não se repetiu**.

**C3 ainda corrigiu a C2, por medição.** O parecer do porteiro `votos/SAN2-5/00c-…-367.md` entrou em
`b324258`, **20h49 ANTES** do `Kpis/*` — não "depois"; e a C2 **não contou** os 2 arquivos do inspetor.
Onde as duas divergem, **vale a C3**.

## Os achados

| # | Cadeira | Grav. | Escopo | O quê |
|---|---|---|---|---|
| **C2-A1 · C3-A1** | C2 **e** C3, **independentes** | **alta** | `dentro-do-bloco` | O `Kpis/*` foi escrito **uma vez** (`53e44d3`) e **nunca mais tocado**, enquanto `2c1eee1`/`41e2316` traziam o maior artefato do PR. A `description` da entrada 151 inventariava **45,4%** do PR e omitia **1.745 linhas descritíveis (46,1%)** — o comando do ciclo 5 (1.301 l.) e o plano do `B-O6R-07` (444 l.). Agravante: a seção *"o que este bloco NÃO fechou"* diz *"Nada do ciclo 5 em si… não move nenhuma peça do jogo"*. **6ª materialização** da classe *"número medido cedo, publicado tarde"* — fechou para a entrada 150 e **reabriu na 151** |
| **C2-A2** | C2 | baixa | `dentro-do-bloco` | O §4.1 do comando citava `§C7.4 l.388-397`; o §C7.4 vai de **l.380 a l.405**, e o intervalo citado deixava de fora o **núcleo do teto** (*"Reprovou no ciclo 2 → PARA. Não há ciclo 3"*), terminando numa linha em branco. Mesma classe que a C2 do #367 pegou **duas vezes** |
| **C1-A1** | C1 | nota | `dentro-do-bloco` | A tabela do §3.4 do diário do dev **subdeclara** a edição 9a (`+5` declarado × `+6 -0` real; soma 25 × numstat 26) e traz **duas âncoras off-by-one**. **Nenhuma linha pré-existente tocada** — os hunks seguem inserção pura; é contabilidade de registro, não defeito de conteúdo |
| **C1-A2** | C1 | nota | `dentro-do-bloco` | A tabela de EOL do diário mede a **árvore de trabalho**, não o blob. Os blobs são **LF puro dos dois lados** (CR=0 em `e6a6461` e em `d90fbbb`) — logo **não existe delta de EOL possível dentro deste commit**, e a prova de ausência de conversão é **mais forte** que a apresentada. A frase *"CRLF preservado"* descreve o checkout local, não o conteúdo mergeado |
| **C3-N2** | C3 | nota | `dentro-do-bloco` | A `description` da entrada **150** **não é apenso puro**: há **reescrita in loco** a partir do char 3775. Declarada no próprio texto e rastreável — **não é defeito**, mas registre-se: uma entrada **já mergeada** teve texto publicado **reescrito**, não só acrescido |
| **C3-N3** | C3 | nota | `dentro-do-bloco` | Dos quatro marcadores §C3.3, o do `backend_tests` era o **único** sem a frase literal que desarma *"Execucao real DESTE PR"* — e é justamente a métrica cuja abertura afirma execução em primeira pessoa |
| **C1-A3** | C1 | nota | `pre-existente` (`39eb46c`, 2026-07-28, #303) | No §C7 inteiro sobra **uma** linha divergente: o item 3 nomeia `agente-pesquisador-web` no `CLAUDE.md` e *"subagente pesquisador web"* no `AGENTS.md`. **Diferença de mecanismo**, explicitamente permitida pelo `D-INTEROP` — a regra é idêntica. **Não reprova** |
| **C2-A3** | C2 | nota | `pre-existente` | O README l.7 descrevia o frontmatter portátil como *"(name + description)"*, omitindo **`model:`**, que o script **preserva por contrato**. Um Codex que lesse só o README concluiria que o Fable obrigatório do `planejador-mestre` **não vale** no espelho — e o ciclo 5 depende disso |
| **C2-A4** | C2 | nota | `pre-existente` | Tensão **apenas literal**: o README diz que o caminho de emulação é *"sempre válido"* e o §2.1 do comando declara que 5 dos 6 passos *"não se aplicam"*. Em contexto, *"sempre válido"* qualifica o **mecanismo**; o comando mantém o contrato acima de si (l.5) e os dois invariantes do README sobrevivem. **Consignado, não tratado como defeito** |
| **C3-N1** | C3 | nota | `pre-existente` (dono: **SAN2-5**) | As `note` de `mvp_*` terminam em `[SAN2-4b: INTOCADO]`, **dois blocos atrasado**. **Não** é violação de §C3.4 (que só exige justificativa quando o valor muda), mas o leitor vê `version: "SAN2-6"` com carimbo dizendo `SAN2-4b` |

## Delta pós-voto — declarado, não silencioso

Nenhum achado bloqueia; o merge estava autorizado como estava. Ainda assim, **C2-A1/C3-A1 é violação do
§C3.1 sobre 46,1% do próprio PR**, e o `Kpis/index.html` é o **artefato principal** (§C3.0). Mergear assim
publicaria um painel que não sabe que o handoff existe. Corrigido **depois do voto**, com papéis separados
(§C7.4-bis): **acharam** C1/C2/C3 (sem propor correção) · **planejou** o orquestrador
(`omega/planos/SAN2-6-correcoes-pos-voto.md`) · **desenvolveu** o `dev-san2-6-correcoes`, identidade nova,
sem julgar a validade dos achados.

**Corrigidos:** C2-A1/C3-A1 (§1-§2) · C2-A2 (§3) · C2-A3 (§4) · C3-N3 (§5) · C3-N1 na parte que é deste
bloco (§6) · C1-A1 por **errata apensa, nunca reescrita** (§7) — apagar o número errado apagaria a
evidência do erro. **Registro §A2** ganhou a **sétima** divergência, com a consequência que passa a valer:
**escopo permitido de um plano não é emendável por ordem verbal sem registro** — ordem do dono que amplie
escopo de bloco em curso entra no Registro §A2 **e** no `description` do KPI, no mesmo PR, antes do merge.
**Só registrados aqui (§8 do plano de correções):** C1-A2, C2-A4, C3-N2 — os três estão na tabela acima com
o texto medido, e **nenhum** pedia mudança de arquivo.
**Duas pendências novas**, ambas BAIXA, `pre-existente`, com bloco dono: `P-ESPELHO-C7-3-MECANISMO-PESQUISADOR`
(C1-A3) e `P-KPI-CARIMBO-MVP-DEFASADO-SAN2-5` (C3-N1). Índice regenerado **pelo gerador**: 242→**244**
cabeçalhos, 233→**235** IDs, ABERTAS 192→**194** — só o balde B (processo/registro) subiu.
**Bateria verde nos 9 passos**, com um `ec=1` que é bom: o `kpi-freeze --check` deu **`ec=1` antes** da
reinjeção e `ec=0` depois — **o guard mordendo**.

## §C7.4-bis — separação de papéis, respondida por escrito

- **(a) A composição cobre a competência que o bloco exige?** **Sim.** As três competências do bloco são
  edição de contrato (C1), espelho/guard e o artefato do handoff (C2), e KPI/registro (C3). A prova de que
  a composição foi adequada é que **as três cadeiras acharam coisas que as outras não acharam** — e que a
  única de gravidade alta foi achada por **duas independentes**, o que é convergência, não redundância.
- **(b) Quem achou é quem consertou?** **Não.** As cadeiras acharam e **não propuseram correção** (a C3
  escreve isso explicitamente: *"NÃO PROPONHO CORREÇÃO (§C7.4-bis)"*). O plano é do orquestrador; a
  implementação é de um dev de identidade nova, cujo mandato o proíbe de julgar a validade dos achados.
  **Ciclo não contaminado.**
- **(c) O planejador usou dado podre?** **Uma vez, e o próprio processo pegou.** O plano de correções
  transcreveu percentuais medidos pelas cadeiras (45,4% · 54,6% · 46,1% · 34,4%) sem re-medi-los; o dev
  **declarou** que não os re-mediu — *"digo que não medi em vez de fingir que medi"* — e re-mediu o que era
  barato (1.301 / 444 / 162 linhas e as datas dos commits). É a conduta certa: a alternativa seria publicar
  número herdado como se fosse próprio, que é a classe que este bloco combate.

## Quedas de agente (P6) — registro em `votos/SAN2-6/00-quedas.md`

**1 queda, 0 voto perdido, custo real 1/3 de um mandato.** A titular da C3 caiu por **`rate_limit` HTTP 429
(teto de sessão)** na transição C3-1 → C3-2. **Classe de erro NOVA**: todas as ~50 quedas anteriores da
rodada foram corte de streaming. Registrada como **linha própria** e explicitamente **fora do numerador**
que decide a hipótese `endpoint pinado × endpoint da sessão` — cota não é estabilidade de conexão, e somar
as duas contaminaria a série.

**É a primeira queda da série em que o protocolo funcionou como desenhado, sem não-conformidade a
registrar:** a cadeira criou o esqueleto **antes** de medir, nasceu com o item 3 já **fatiado em 5
sub-provas**, e gravou o item 1 **inteiro ao terminá-lo**. Morreu no vão que matou cinco cadeiras no
`J-SAN2-2`. **124 linhas sobreviveram**, a suplente re-executou o roteiro sob o **P3** e ele **reproduziu
integralmente**. Sob a R2 original, tudo isso seria descartado.

**Hipótese que a queda sugere à série** — registrada como hipótese, não como norma: **em junta de 3,
disparar a cadeira mais cara primeiro.** A C3 tinha 5 sub-provas e dois drills de worktree, foi disparada
**por último**, depois de ~338k tokens gastos pelas outras duas, e foi ela que bateu no teto. Cota é
**previsível**, ao contrário do streaming — logo a ordem de disparo é uma alavanca real do orquestrador.

## Incidentes de terreno, declarados

1. **Correção de head no meio da inspeção** (`41e2316` → `1115aeb` → `d90fbbb`): o orquestrador despachou o
   inspetor nomeando um head e **commitou o briefing depois**, movendo a branch. Corrigido por mensagem; o
   inspetor re-mediu tudo contra o head novo. **Assumido pelo orquestrador** — é a mesma classe que este
   bloco combate, cometida dentro dele.
2. **O dev editou `.agents/agents/README.md` da ÁRVORE PRINCIPAL por engano** e **declarou por conta
   própria**, não por ter sido pego. Desfez pela **edição inversa exata** — não por `git checkout`/`reset`/
   `stash`, os três proibidos pelo mandato, e o `checkout` ainda re-materializaria CRLF. Conferido pelo
   orquestrador **depois**: a árvore principal segue com exatamente os 3 arquivos que já estavam
   modificados antes, e o README com `status` e `diff` **vazios**.
   **Lição operacional que passa a valer para a rodada:** a ferramenta `Edit` recebe **caminho absoluto** e
   **não herda o `cd` do Bash** — prefixar `cd <worktree> &&` protege o **Bash**, não o `Edit`. O prefixo de
   worktree tem de ser conferido em **toda** chamada de `Edit`/`Write`.

## O que este bloco declaradamente NÃO fechou

- **`P-SYNC-AGENTS-NAO-RECURSIVO` (ABERTA)** — o guard segue cego a `especialistas/` e o README segue
  não-guardado. `scripts/**` é escopo de outro bloco; reescrever o sincronizador na véspera de uma
  tentativa única seria mudança não testada no caminho crítico do gate. **Neutralizado para o handoff sem
  tocar `scripts/`**: o comando manda o Codex ler os corpos direto de `.claude/agents/especialistas/`, e
  o Codex **não julga**, então não depende do espelho.
- **Guard `E2c`** (`tests/junta-voto-escopo-guard.test.ts`) segue **não-nascido** — `tests/**` está no
  proibido. A propriedade *"todo corpo de jurado que declare `gravidade` declara também `escopo`"* segue
  conferida por **leitura**, não por execução.
- **`P-CLAUDE-ABERTURA-PRECEDENCIA-DESATUALIZADA`** — a abertura do `CLAUDE.md` (l.3-6) ainda diz que
  prevalece o `AGENTS.md`, auto-corrigindo-se 25 linhas depois. **Dono: o dono.** Mexer na abertura do
  contrato canônico é decisão humana.
- **Nada do ciclo 5 em si** — nenhuma **peça de execução** foi movida (S0, a linha do `ci.yml`, os corpos
  `*-c5-*`, drills, censo). O que este PR entrega é o **tabuleiro documental**, incluindo o **comando de
  bloco** do ciclo 5.
