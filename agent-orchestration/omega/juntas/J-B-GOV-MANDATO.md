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
