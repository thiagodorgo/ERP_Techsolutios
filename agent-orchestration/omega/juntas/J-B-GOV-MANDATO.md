# J-B-GOV-MANDATO (PR #393) — ciclo 1

> *Título emendado em 2026-09-26 pelo orquestrador, autor da ata, para **nomear o PR** — exigência E3.c do
> plano do ciclo 2. **Veredito e objeto intocados.** Sem o `#393` no título, `mandato-refs.sh` não acha esta
> ata; com ele, a ata vira o caso vivo do critério C8 (ata única REPROVADA → `NÃO DETERMINÁVEL`, nunca
> `approved_head`). A ferramenta atual lista atas só em `origin/$BASE` e não enxerga o ramo, logo esta
> emenda não abre janela de falha — medido pelo `planejador-mestre`, que derrubou a premissa contrária do
> orquestrador.*

- **Objeto julgado:** `7462b75bfb7768556a2da2ee13f9ac92e9198872`, resolvido **independentemente pelas três
  cadeiras** (`git rev-parse`, cruzado por C2 com `mandato-refs.sh 393` e `gh pr view --json headRefOid`).
- **Base:** `origin/main` em `fc3363e3`. **CI:** 14/14, 0 não-verdes, 0 pendentes — medido pelo inspetor e
  reconfirmado por C2 e C3.
- **Quórum:** maioria de 3, sem crítico (§C7.1-ter(b) — o bloco não toca dinheiro, segurança, permissão nem
  perda de dado). Nenhuma cadeira tem veto.

## VEREDITO: **REPROVADO — 2 × 1**

| cadeira | md5 do corpo | modelo | voto | achados |
|---|---|---|---|---|
| C1 — fail-closed do pré-voo | `9613b278…` | Opus 5 | **REPROVADO** | 1 bloqueia · 4 ajuste · 2 nota |
| C2 — a ferramenta responde à pergunta feita | `8861de32…` | Opus 5 | **REPROVADO** | 3 bloqueia · 1 ajuste · 2 nota |
| C3 — escopo, KPI e registro | `56d92615…` | Opus 5 | APROVADO | 0 bloqueia · 1 ajuste · 3 nota |

## Os bloqueantes

**C1-01 — a trava não é invariante à forma da linha.** A checagem 3 só inspeciona `^[-*] ` na coluna 0 e a
checagem 2 admite conteúdo não-bullet; junto, nada inspeciona o resto. Oito afirmações numéricas reais deste
bloco, sem `medido por:`, dentro de `## MEDIDO`: como itens `- ` → ec=1; **como tabela → ec=0, PRE-VOO OK**.
Passam 5 de 7 formas. A restrição a bullets não está declarada em lugar nenhum e contradiz o contrato escrito
duas vezes. **O mandato que originou este bloco passaria intacto trocando hífen por pipe** — e o `MEDIDO` do
dev foi publicado em tabela.

**C2-01 — o guard não exerce o matcher do artefato que nomeia.** Quebrar o matcher do `.sh` deixa **6/6 verde,
ec=0**; quebrar a réplica TypeScript deixa 4/6, ec=1; **4 dos 6 casos passam com o script apagado**; e
reescrever só um comentário deixa vermelho. O teste mede a réplica, não a ferramenta.

**C2-02 — a ferramenta FABRICA `approved_head`.** Com `$RAMO` vazio, `grep -q ""` casa tudo: o #393, que **não
tem ata**, recebeu `7822deaf…` rotulado *"LIDO DA ATA: J-B-SAN3-00.md"*. É o valor cuja fabricação esta
ferramenta existe para impedir, fabricado por ela.

**C2-03 — `python` é dependência não declarada** em `ver()`; na falha sai **ec=0** com campos vazios, afirmando
falsamente que a junta não votou, e `--sha-only` devolve 0 linhas.

## Ajustes e notas (viram pendência, não reprovam)

C1: SHA aceito pela pontuação vizinha (7 vizinhanças; **2 SHAs separados por 1 espaço escondem o segundo**) ·
checagem 5 **cega a acento** ("nao aparece" reprova, "não aparece" passa) · checagem 6 não cobre `.sh` ·
morte da ferramenta virada em culpa do mandato · l.67 inalcançável · **zero cobertura automatizada do pré-voo**.
C2-04: `grep -m1`/`head -1` escolhem o primeiro candidato sem sinalizar ambiguidade — **#387 devolve o objeto do
ciclo 1, que a própria ata rotula REPROVADO**. C2-06 (`pre-existente`, com evidência: as atas estão em
`origin/main@fc3363e3` e o ramo não adiciona nem altera ata): só **5 das 107 atas** têm linha de Objeto.
C3-01 (`ajuste`): 6 dos 19 arquivos — os corpos de jurado — estão **fora do Escopo PERMITIDO** do comando e a
divergência **não foi declarada**. **Fica declarada aqui pelo orquestrador**, que a cometeu.

## As emendas, e o defeito da própria emenda

**Emenda 1** (ressalva R2 do inspetor): os corpos afirmavam que o briefing declara o objeto como `1c5437daa`;
no head isso é falso. As três cadeiras verificaram e classificaram como **não-aplicável**.
**Mas o comando de falsificação que o orquestrador escreveu na emenda respondia à pergunta vizinha** — "o token
aparece?" em vez de "o briefing o declara como objeto?". O token **aparece**, narrado como o defeito retirado;
lido pelo `ec`, teria invertido a conclusão. **C2 e C3 registraram isso de forma independente**, e ambas leram
a substância em vez do código de saída. A emenda escrita para proteger contra premissa vencida carregava a
classe da rodada.

**Emenda 2** (ressalva R3): sem suplente; queda relança a mesma identidade; voto perdido nunca conta como
aprovação. Não foi acionada — as três cadeiras concluíram.

## Terreno

`inspetor-de-terreno-da-junta`: **LIBERADO COM RESSALVA**, 0 bloqueios, 7 ressalvas (R1 corpos só por emulação ·
R2 premissa vencida · R3 sem plano de perda · R4 autoria não verificável · R5 resíduo alheio · R6 CI do briefing
datado · R7 bateria §9 sem forma completa). As três cadeiras trabalharam em worktree próprio de caminho curto,
removido ao fim; C3 subiu Postgres e Redis descartáveis próprios. **A base viva nunca recebeu um comando.**
**Nenhuma cadeira escreveu no repositório** — verificado durante a votação e no fim.

## Separação de papéis para o ciclo 2 (§C7.4-bis)

- **Quem achou:** C1 e C2. **Não escrevem o plano nem a correção.**
- **Quem planeja:** `planejador-mestre` (**Fable obrigatório** — `D-PLANEJADOR-MODELO-FABLE`: é o passo em que
  um plano fraco reintroduz o defeito que a junta acabou de pegar).
- **Quem desenvolve:** dev **novo**. **O orquestrador está INELEGÍVEL** — escreveu o código original; seria a
  terceira contaminação do mesmo bloco.
- **Teto:** `D-TETO-DOIS-CICLOS` — o ciclo 2 é o último.

## Dono da pendência nova (C3-02, que a junta mandou nomear)

`P-GOV-MANDATO-PREFLIGHT-CAMINHO-POR-BASENAME` → **dono: `B-GOV-MANDATO` ciclo 2**. Justificativa: a classe que
C1-01 e C2-01 nomeiam é a mesma — **guarda que reconhece FORMA conhecida em vez de enunciar PROPRIEDADE**. O
basename é a terceira instância dela. Consertar as três em separado repetiria o erro que este bloco diagnostica.

---

# Ciclo 2 (PR #393)

- **Objeto julgado:** `4c8819effd0b9f7a1ef8040eaa1707ca8342fdad` — resolvido **independentemente** pelas três
  cadeiras; C3″ cruzou **quatro** fontes concordantes (`git rev-parse` local = `origin` = `gh pr view 393` =
  `bash scripts/mandato-refs.sh 393`). Base `origin/main` em `fc3363e3`. **CI 14/14, 0 não-verdes.**
- **Quórum:** maioria de 3, sem crítico (§C7.1-ter(b)); conferido contra o diff pelo inspetor e por C3″.

## VEREDITO: **REPROVADO — 2 × 1**

| cadeira | identidade | md5 do corpo | voto | achados |
|---|---|---|---|---|
| C1′ | `guardiao-fail-closed` | `5b0f7f5d` | **REPROVADO** | 2 bloqueia · 3 ajuste · 2 nota |
| C2′ | `medidor-de-cobertura-do-artefato` | `2b3db945` | **REPROVADO** | 4 bloqueia · 3 ajuste · 1 nota |
| C3″ | `jurado-mandato-c3b-fronteira-numero-registro` | `3e48f8d2` | APROVADO | 0 bloqueia · 2 ajuste · 1 nota |

## O que ESTÁ fechado — medido pelas cadeiras, não alegado pelo dev

- **C2-01 FECHADO.** `0 de 51` casos sobrevivem ao artefato apagado (pré-voo 0/33, refs 0/18). No ciclo 1 eram
  **4 de 6**. Vermelho-controle cumprido: com o artefato presente, 33/33 e 18/18.
- **O guard não está preso ao texto.** C2′ reescreveu **todos** os comentários (178 e 226 linhas) e renomeou
  variáveis internas: **4 de 4 no-ops VERDES**, com a saída do artefato provada byte-idêntica *antes* de olhar
  a cor.
- **C1-01 fechado para a classe "forma da linha"** — C1′ gerou **seis formas próprias** (`+`, task list,
  definition list, `<li>`, `<details>`, blockquote aninhado, TAB) e todas rejeitam.
- **A pendência do basename fecha duas vezes, com amostras independentes:** 25/25 (C1′) e 20/20 (C3″, de
  classe diferente), contra 0/20 antes. C3″ provou que a propriedade decidida é **existência no caminho**:
  caminho Flutter legítimo aceito, 6 basenames inexistentes rejeitados.
- **KPI íntegro.** C3″ reexecutou 2× em cluster descartável próprio: `# tests 3105 · # pass 3103 · # fail 0 ·
  # skipped 2`, denominador constante, Δ decomposto por arquivo (18+33) fechando contra **os dois** baselines
  nomeados (+51 sobre a `main`, +45 sobre o ciclo 1).

## Os bloqueantes

**C2-central — o conserto do C2-02 não tem teste, e removê-lo ressuscita a fabricação em silêncio.**
**6 das 7 cláusulas** do bloco de validação de insumo do `mandato-refs.sh` **não têm caso nenhum**.
Neutralizando a validação de `origin/$BASE`, a ferramenta deixa de **PARAR** (ec=1) e passa a emitir
`approved_head: ea696f15 ^ LIDO DA ATA` com **ec=0** sob premissa quebrada — **a ferramenta que existe para não
inventar `approved_head` volta a inventá-lo** — e o guard fica **18/18 VERDE**. Idem com `headRefOid` sem 40
hex e com check-runs malformado.

**Dois fail-open a mais:** a checagem 1 é coberta **só pela metade** (documento sem `## HIPOTESE` →
`PRE-VOO OK`, ec=0, guard verde) e a checagem 6 não tem caso negativo de diretório (→ `PRE-VOO OK`, ec=0,
guard verde) — esta última na checagem cuja pendência o ciclo fecha.

**A cobertura não é a que a entrega afirma.** Matriz sobre **195 pontos enumerados da fonte**: N efetivo
(comportamento comprovadamente alterado) = **123**, K (guard vermelho) = **107**, **16 não cobertos** — 87,0%
no total, **74,0% no `mandato-refs.sh`**.

**Uma cerca de código não fechada desliga a checagem 3 do resto do documento.** Par controle/mutação diferindo
em **uma linha**: cerca fechada = 10 rejeições; cerca aberta = `PRE-VOO OK`, ec=0, com as mesmas 10 afirmações
sem `medido por:`, e MEDIDO/HIPÓTESE colapsados. **Acontece sem má-fé** — basta colar saída que contenha a
cerca. Nada avisa.

**A checagem 7, introduzida NESTE ciclo, nasceu dependente da FORMA.** Mesmo rótulo `approved_head`, mesmo
objeto reprovado `7462b75b`: **bullet rejeita; tabela, quebra de linha e prosa dão `PRE-VOO OK`**. Os três
casos B8a/b/c usam uma única forma. É literalmente *"bullet rejeita, tabela passa"* — **a frase que reprovou o
ciclo 1**, dentro da checagem escrita para fechá-la. E o cabeçalho afirma que o gatilho por linha "só APERTA":
a medição falsifica a frase.

## Ajustes e notas

**C1′:** intervalo `A..B` do git escapa a checagem 4 com SHA fabricado; o `-i` é procurado na LINHA e não na
INVOCAÇÃO (`sort -ui && grep` passa, `egrep`/`fgrep` invisíveis); na tabela qualquer caractere não-branco
satisfaz a coluna de evidência, inclusive `-`, `n/a`, `TODO`; `### ` isenta afirmação numérica (declarado);
`(novo)` isenta a linha inteira.

**C2′:** **3 de 11 alegações do CORPO DO PR são falsas** — ele ainda descreve o ciclo 1: "Seis casos"
(execução: **18**), "um vermelho-controle que prova que o matcher errado quebra as fixtures" (`grep -ic` =
**0**), e silêncio total sobre `tests/mandato-preflight.test.ts` (33 casos) e a checagem 7. **O KPI está
certo; o corpo do PR é que está velho — e é do orquestrador.** Duas das três mutações novas dela o guard
**não** pegou.

**C3″:** `decisoes.md` está no diff **sem linha de autorização no §4 e sem divergência declarada** (C3b-01);
**a retratação das duas falsidades sobre as portas chegou ao briefing e NÃO aos corpos de jurado rastreados**
— 4 blobs ainda dizem "5432 é de outro projeto" e 6 citam a faixa inventada, **inclusive o corpo da C2′,
cadeira viva desta junta** (C3b-02); ponteiro de seção errado e "106 outras atas" contra 107 enumeradas
(C3b-03).

## Terreno

1ª passada **BLOQUEADO**, 2 bloqueios. **B1** — a cadeira C3 designada pelo plano era a **mesma que votou no
ciclo 1** e **autora dos achados C3-01/C3-02**; julgaria o atendimento do próprio achado e re-mediria números
que publicou. A exceção alegada não existia em norma (`grep` em `decisoes.md` e `CLAUDE.md` = 0), e há
precedente executado (`J-B-O6R-02-ciclo4`: inelegíveis **todos** os votantes). **B2** — o briefing do ciclo 2
não existia, e três enunciados viviam só em mensagem. Os dois foram fechados e reconferidos na 2ª passada.

**Ressalva R2 (FORTE), contra o orquestrador:** *"a 5432 é de outro projeto"* e *"a faixa 58284–58483 é
excluída pelo Windows"* são **FALSAS** — a 5432 é o `erp-postgres` **vivo deste projeto**, e o `netsh` lista 24
faixas, nenhuma delas. A primeira era falsa **na direção perigosa**. Corrigida no briefing em `4c8819ef`.
**Nenhum agente tocou a base viva** — C3″ mediu: contêineres `Up 17h` ininterruptas, sem restart, e nenhum
contêiner de jurado desta noite existe.

## Erros do orquestrador neste ciclo, para não virarem fato herdado

1. **Duas falsidades repetidas em TODOS os mandatos da noite** (porta 5432 e faixa excluída) — derrubadas por
   execução pelo inspetor, não por mim.
2. **A retratação não propagou** para os corpos de jurado rastreados (C3b-02): corrigi o artefato que eu leio,
   não a fonte que os atores leem como contrato.
3. **O corpo do PR #393 descreve o ciclo 1** e afirma três coisas falsas sobre a entrega atual.
4. **`decisoes.md` entrou no diff sem declaração de escopo** (C3b-01) — o mesmo defeito que o C3-01 do ciclo 1
   apontou contra mim, repetido.
5. **Ponteiro de seção errado e "106" contra 107** (C3b-03) — a mesma classe do "cinco contra oito" que eu
   tinha acabado de consertar.
6. **A ferramenta de heartbeat que escrevi para supervisionar a noite media a idade do transcript como sinal
   de vida.** Medido: o `.output` do subagente nasce com **0 bytes** e só é preenchido no fim. O sinal nunca
   mediu nada. Corrigido para atividade no worktree.

## Separação de papéis para o ciclo 3 (§C7.4-bis)

- **Quem achou:** C1′ e C2′. **Não planejam e não consertam.**
- **Quem planeja:** `planejador-mestre`, **Fable obrigatório** (`D-PLANEJADOR-MODELO-FABLE`).
- **Quem desenvolve:** dev **novo**. O dev do ciclo 2 (`a4ed42a5e3a81bdd3`) e **o orquestrador** estão
  inelegíveis.
- **Quem NÃO pode julgar o ciclo 3:** C1′, C2′ e C3″ — todas votaram (precedente `J-B-O6R-02-ciclo4`).
- **Teto:** `D-NOITE-SEM-TETO` suspende o `D-TETO-DOIS-CICLOS` até **2026-09-26T10:00Z**. Este ciclo nasceu sob
  ela. **O teto não entrou em nenhum voto.**

---

# Ciclo 3 — junta 3 (PR #393)

- **Objeto julgado:** `28b4defdc067387f384e06614e033e0976e9912b` — resolvido **independentemente** pelas três
  cadeiras (`git ls-remote` × `gh pr view 393 --json headRefOid`); não andou do início ao fim do voto, nem
  durante a queda e a retomada da C2‴. Base `origin/main` em `3b1fe0f9`, integrada **por merge** em `7d02d8da`;
  `merge-base` = `origin/main`, conferido por C3‴. **CI 14/14 no objeto.**
- **Legalidade do ciclo 3:** `D-SEM-TETO-AUDITORIA-NO-3` em `origin/main` (`b3f0af5f`), conferida por C1‴ e C2‴.
- **Inspetor de terreno:** `LIBERADO COM RESSALVA` (0 bloqueios, 5 ressalvas; Fable 5.1, corpo `de80b2a9…`).
- **Quórum:** maioria de 3, sem veto, sem suplente (§C7.1-ter(b)).

## VEREDITO: **REPROVADO — 2 × 1**

| cadeira | identidade | md5 do corpo | modelo | voto | achados |
|---|---|---|---|---|---|
| C1‴ — invariância de forma | `jurado-mandato-c1c-invariancia-de-forma` | `35765f76…` | Opus 5.5 | **REPROVADO** | 4 bloqueia · 3 ajuste · 3 nota |
| C2‴ — cobertura por mutação | `jurado-mandato-c2c-cobertura-por-mutacao` | `71415699…` | Opus 5.5 | **REPROVADO** | 2 bloqueia · 3 ajuste · 1 nota |
| C3‴ — fronteira, número e registro | `jurado-mandato-c3c-fronteira-numero-registro` | `f12be570…` | Opus 5.5 | APROVADO | 0 bloqueia · 3 ajuste · 7 nota |

**Todos os achados `bloqueia` e `ajuste` são `dentro-do-bloco`**; só duas notas da C3‴ são `pre-existente`.

### Terreno da votação — declarado, porque muda o que a ata pode afirmar
- As três cadeiras votaram em **2ª instância**: a 1ª de cada uma **morreu por volta das 06:50 de 30/09 sem
  veredito e sem notificação do harness**. O orquestrador só percebeu às 13:11, pela lista de agentes do
  harness, e relatou "votando" por 6 h. Os parciais da 1ª instância foram preservados fora do repositório e
  **nenhuma 2ª instância os leu**.
- A **C2‴ (2ª instância) foi interrompida pelo limite semanal da conta (HTTP 429)** no fim do mandato e
  **retomada na mesma instância** às 21:34, depois de medido que nenhum job dela sobrevivera (0 processos);
  ela re-verificou no disco o que estava incompleto e reexecutou. A retomada preserva o contexto só das
  medições dela mesma. Está registrada na evidência dela com a hora.

## O que ESTÁ fechado — medido pelas cadeiras
- **`[B8b]` fechado por propriedade** (C1‴): item de lista com o token reservado sob `LIDO` → `ec=1` com
  exatamente 1 REJ no head; vermelho-controle no pai do Dev-S-2 (2/1/2).
- **A E4 do `refs` é reproduzível**: C2‴ rodou o `refs` inteiro e obteve `N=46 K=46 NC=0`, **igual à
  E4-refs-3 linha a linha, os 99 `#fail` iguais**. A amostra do pré-voo (34 pontos: os 16 de B + 18 dos 87
  VERMELHOS de A, semente `20260930393`, tripla B, sem `MSYS_NO_PATHCONV`) deu **0 divergência** com a matriz
  publicada; o `[M-2]` histórico achou os 5 pontos do §0.3.
- **KPI íntegro** (C3‴): 2 execuções em cluster descartável próprio (portas 55493/56493 provadas):
  `# tests 3405 · # pass 3403 · # fail 0 · # skipped 2 · ec=0`, igual ao CI; refs 39 e pré-voo 312 por
  arquivo; `blocks_completed` 169 = MB 168 + 1.
- **Escopo**: 0 de 41 arquivos fora de autorização (lista proibida gerada, 22 entradas, vermelhos-controle
  acusando). **Merge `7d02d8da`** conferido contra os dois pais: 9 arquivos resolvidos, nenhuma entrada
  perdida, índice = gerador, `Kpis/*` = 2º pai.
- **A legalidade, a ancestralidade, os blobs congelados e as 12 ERRATAs** nos corpos, conferidos.

## Os bloqueantes

**C2c-01 — a ferramenta de mutação publica como "coberto" mutante que nem compila.** `bash -n` (l.226)
valida o shell, não o programa awk embutido: M7 (`continue`/`break` → `:`) e M10 com parênteses aninhados
geram awk inválido, que derruba o guard por erro e sai VERMELHO. **33 dos 100 VERMELHOS do pré-voo e 2 dos
46 do `refs`** são dessa classe. Refeitos com mutante **viável**, **4 pontos publicados como cobertos não
são** (l.298, 305, 364, 405): guard 312/312 verde com cada um mutado, confirmado em 2 arneses distintos.

**C2c-02 — o ponto 336 declarado equivalente é discriminável.** Documento de 1.000.003 linhas: pristino
`OK`, mutante `REJ`. Logo o `[M-1]` derivado por conjuntos é **1**, não 0 (≥ 5 somando C2c-01).

**C1c-01 — a isenção da colagem absolve o que não verificou.** Linhas `# gerado em:` são ignoradas na
igualdade (l.235) mas isentas das checagens 4/5/6/7 (l.260-261) e **lidas para a proveniência**; a linha de
abertura da cerca idem. Linha injetada ou editada dentro da colagem passa, e um SHA fabricado nela entra na
proveniência e absolve prosa fora do bloco. Nasceu no ciclo 3 (`33356358`); o script de `34969a81`
rejeitava as quatro formas.

**C1c-02 — a checagem 4 não é invariante a JUNTAR o SHA a um caminho por `:`.** `<sha>:CLAUDE.md` tira o
SHA da checagem 4 (o token deixa de ser hex); com `/` a checagem 6 aceita, porque `git rev-parse --verify`
(l.522) aceita **qualquer** 40-hex — um SHA fabricado passa.

**C1c-03 — a cerca, declarada SAÍDA, é usada como COMANDO.** `satisfeita()` (l.322) busca o token em texto
que inclui as linhas cercadas (l.394): uma afirmação FORA da cerca é satisfeita por um `medido por:` DENTRO
dela, e "saída colada sem comando" silencia.

**C1c-04 — a linha de cabeçalho `## …` escapa das checagens 2, 3 e 5** sem entrada no inventário (o oráculo
nunca a emite como FORA, l.170; a REC a pula, l.389).

Em cada bloqueante há um **par `ec=0` × `ec=1` que difere só na variável atacada**, reproduzido na árvore
real, e **o guard inteiro (312/312) passa verde com os seis presentes**. Controles da §1.1 (i)–(iv) aplicados
e declarados em cada um.

## Ajustes e notas (viram pendência, não reprovam)
- **C2‴:** 8 mutantes próprios ([M-EXT]) que mudam comportamento deixam o guard verde fora do alcance da
  ferramenta (10 de 19 sobrevivem no total) · controle que falha não muda o `ec` da ferramenta (só o texto
  acusa) · o insumo fixo do diferencial (c) não percorre o que o arnês altera.
- **C1‴:** família da checagem 5 não reconhece `/usr/bin/grep` nem `grep.exe` · pipe escapado `\|` em célula
  é lido como fronteira · CR solitário apagado por `tr -d '\r'` junta duas linhas · `approved&#95;head`
  escapa do token · `` ```a``` `` abre cerca que a CommonMark não abre.
- **C3‴:** a EMENDA — CICLO 3 do comando não traz a bateria §8, "códigos de saída inalterados" nem a
  autorização de `decisoes.md` (E5) · falta a linha §C5 de limpeza do ciclo 3 · o ponteiro `§7.3` segue vivo
  no comando (l.255) e em 3 pendências. Notas: 2 `pre-existente` (mecanismo 1 do ciclo 1; registro do 2º pai).

## A classe se repetiu? — o relato que o §C7.4 manda o orquestrador fazer
**Sim, com informação nova.** Pela terceira vez a classe é *"guarda que reconhece forma em vez de enunciar
propriedade"* (C1c-01…04 no pré-voo; C2c-01 na ferramenta — ela mede se o guard ficou vermelho, não se o
mutante é um programa). A informação nova deste ciclo: a classe agora está **na ferramenta de medição**, não
só no artefato medido, e o número publicado ([M-1] = 0, 100% de K) era **reproduzível e errado ao mesmo
tempo** — a reprodução da C2‴ bateu linha a linha, e é por isso que o processo precisou de um mutante viável,
não de mais reprodução. Este é o sinal de não-convergência que o §C7.4 manda relatar, e é o gatilho da
auditoria da máquina.

## §C7.4-bis — quem ocupou cada papel no ciclo 3
| papel | quem |
|---|---|
| planejador | `planejador-mestre` (Fable 5.1): v3, §12, §13, §14 a §14.20 |
| achadores (pareceres e votos) | o inspetor; C1‴, C2‴, C3‴ |
| devs | Dev-T, Dev-S (ciclo 3), Dev-T-3, Dev-S-2 (K1, K2a, K1b, K2b, K2c), Dev-T-4 (T4, T6), Dev-T-5 (T5), Dev-T-6 (T7) |
| orquestrador | registro, integração (`M`), versionamento de corpos e erratas, medições da E4; **não escreveu código** |

**O que acontece agora (texto da `main`, §C7.4 item 4):** reprovação do ciclo 3 com `bloqueia` → **antes de
abrir o ciclo 4**, auditoria da orquestração e da junta, por identidade que não votou, não planejou e não
desenvolveu, respondendo (a)–(e) **por execução**, com parecer em
`omega/reprovacoes/R-B-GOV-MANDATO-ciclo3-auditoria.md`. Sem ele, o inspetor não libera o ciclo 4.
Evidência das cadeiras e do inspetor em `agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo3/`.

---

# Ciclo 4 — junta 4 (PR #393)

> Esqueleto escrito pelo orquestrador antes da junta (2026-10-02). Cada linha `EM APURAÇÃO` é preenchida com o
> que as cadeiras e o inspetor gravaram, nunca com o que o orquestrador espera.

- **Objeto julgado:** EM APURAÇÃO — o head que as três cadeiras resolverem, cada uma por `git` e por `gh`.
- **Base:** `origin/main` em `b404815c`, integrada por merge em `325030c8` e `4535ebb3`.
- **Legalidade do ciclo 4:** EM APURAÇÃO — §9 do parecer `R-B-GOV-MANDATO-ciclo3-auditoria.md` (atestação).
- **Inspetor de terreno:** EM APURAÇÃO — `votos/B-GOV-MANDATO-ciclo4/00-inspetor-terreno.md`.
- **Quórum:** maioria de 3, sem veto, sem suplente (§15.9).

## VEREDITO: EM APURAÇÃO

| cadeira | identidade | md5 do corpo | modelo | voto | achados |
|---|---|---|---|---|---|
| C1⁗ — invariância e morte interna | `jurado-mandato-c1d-invariancia-e-morte-interna` | `fa887726…` | EM APURAÇÃO | EM APURAÇÃO | EM APURAÇÃO |
| C2⁗ — cobertura e dois lados | `jurado-mandato-c2d-cobertura-e-dois-lados` | `0bb59aa2…` | EM APURAÇÃO | EM APURAÇÃO | EM APURAÇÃO |
| C3⁗ — escopo, KPI, registro e mandato | `jurado-mandato-c3d-escopo-kpi-registro-mandato` | `34aac689…` | EM APURAÇÃO | EM APURAÇÃO | EM APURAÇÃO |

## Mandatos como artefato

Um por papel em `votos/B-GOV-MANDATO-ciclo4/00-mandatos/`, versionado antes do lançamento, com a cerca do veredito
do pré-voo. O `mandato_md5` declarado por cada papel na 1ª linha do seu artefato: EM APURAÇÃO (conferido pela C3⁗,
item 4).

## Quedas e substituições de modelo (P6, §C7.6-bis)

EM APURAÇÃO — `votos/B-GOV-MANDATO-ciclo4/00-quedas.md`, se houver queda.

## §C7.4-bis — quem ocupou cada papel no ciclo 4

| papel | quem |
|---|---|
| auditor da máquina (ciclo 3 → 4) | `auditor-maquina-b-gov-mandato-c3` — parecer §0–§7; atestação §9 |
| quem desenhou o conserto da máquina | `planejador-conserto-maquina-b-gov-mandato` — §8 do parecer |
| planejador | `planejador-ciclo4-b-gov-mandato` (Fable): §15 e as erratas §15.14, §15.15, §15.16 e §15.17 |
| devs | `dev-tests-ciclo4-b-gov-mandato` (T4c, T4c-2, T4c-3, T4c-4, T4c-5) · `dev-scripts-ciclo4-b-gov-mandato` (S4a, S4b, D4, K4, K4b, K4b-2, K4b-3, K4b-4) |
| conferente dos dois lados | `conferente-dois-lados-b-gov-mandato-c4` (Fable): conferência (DIVERGE 263) e reconferência (CONFERIDO) |
| achadores (pareceres e votos) | o inspetor da junta 4; C1⁗, C2⁗, C3⁗ |
| orquestrador | registro, integrações por merge, versionamento de corpos e mandatos, rodadas da E4; **não escreveu código** |
