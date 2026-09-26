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
