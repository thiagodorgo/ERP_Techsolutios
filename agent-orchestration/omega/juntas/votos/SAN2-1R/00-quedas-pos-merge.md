# Quedas pós-merge do #362 (formato P6) — registradas no worktree da main, a commitar no próximo PR

| # | agente | modelo | mandato | fase da morte | erro | custo do redo |
|---|---|---|---|---|---|---|
| 1 | porteiro #362 (1ª) | gp (endpoint da sessão) | 3 itens | após medir o item 1, antes de escrever — nada no disco | connection lost | item 1 do zero (barato). **De novo o vão medir→escrever**: 4ª ocorrência da classe no dia, mesmo com a regra de ouro no mandato — anotar para o protocolo: a instrução sozinha não basta quando o agente "conclui" o item mentalmente antes de escrever |
| 2 | porteiro #362 (sucessor 1) | gp (endpoint da sessão) | 3 itens | meio do item 1b — **terreno + 1a ESCRITOS e verificados (P1, granularidade por comando)** | **rate_limit (429, limite de sessão)** — classe NOVA na série, não é server_error | re-executar 2 comandos do roteiro + continuar de 1b. **A granularidade por comando pagou na primeira queda**: contra "nada escrito" das 4 anteriores da mesma fase |
| 3 | porteiro #362 (sucessor 2) | gp (endpoint da sessão) | retomada | após avançar de 1a até **1d** (5 seções escritas) e **enunciar um indício** | connection lost | continuar de 1e. **O indício virou ACHADO REAL** (ver abaixo) — o P1/P2 fez um agente morto entregar valor pela 3ª vez no dia |

## ACHADO nascido de agente caído — §C7.1-bis e §C7.1-ter NUNCA chegaram à `main`

O porteiro morreu logo após dizer *"vou verificar se `1-bis`/`1-ter` sobrevivem no §C7 da main"*. O
orquestrador verificou e **procede**:

```
git show demo/investidor:CLAUDE.md | grep -c "1-bis\|1-ter"   → 2   (l.333 e l.365)
git show main:CLAUDE.md            | grep -c "1-bis\|1-ter"   → 0
git show 74430cc:CLAUDE.md         | grep -c "1-bis\|1-ter"   → 0   (antes de tudo hoje)
```

| Seção | Decisão do dono | Estado |
|---|---|---|
| **§C7.1-bis** | `D-INSPETOR-TERRENO-JUNTA` (2026-08-24) — inspeção de terreno **fail-closed** antes de toda junta | texto só na `demo/investidor` |
| **§C7.1-ter** | `D-JUNTA-ESCOPO-E-CALIBRACAO` (2026-08-28) — voto declara **escopo**; quórum **calibrado por risco** | texto só na `demo/investidor` |

**Gravidade.** As *decisões* foram reconciliadas para `decisoes.md` no #360; o **texto normativo do contrato**
não. E **operamos sob essas regras o dia inteiro**: toda junta desta sessão teve inspetor de terreno
(§C7.1-bis) e todo voto declarou `escopo` (§C7.1-ter) — seguindo seções que o **contrato canônico da `main`
não contém**. É a mesma classe da `P-GOV-MAIN-SEM-PROTECAO`: regra vivendo fora do lugar onde o §A1 manda.

**Não corrigido aqui** (`quem acha não conserta`, e o worktree da `main` não commita): vira pendência com
dono — **`P-C7-BIS-TER-FORA-DA-MAIN`**, alvo **SAN2-2**, que já toca contrato e espelho.

## Queda 4 — porteiro do #362 (registro P6)

| agente | modelo | mandato | fase da morte | erro | custo do redo |
|---|---|---|---|---|---|
| porteiro #362 (3º sucessor) | `general-purpose` (exceção de modelo) | 3 itens (1e, 1f, 2, 3) | **meio** — itens 1e/1f/2 medidos e escritos; morreu escrevendo o item 3, num heredoc | `server_error` / connection lost mid-response | **zero medição perdida** — o roteiro subiu de 153 → 320 linhas |

**A série P6 agora tem 4 quedas na MESMA cadeira** (porteiro do #362) — a maior concentração já registrada
num único papel. E a mesma cadeira é a que mais avançou por queda: 153 → 320 → 417 linhas de evidência,
sempre continuando de onde o anterior parou. Sob a regra R2 original (sucessor refaz o mandato inteiro), as
quatro mortes teriam custado quatro mandatos completos e a cadeira provavelmente nunca fecharia.

**Decisão do orquestrador nesta queda, declarada:** em vez de disparar um 4º sucessor com o mesmo mandato,
o orquestrador **mediu ele mesmo o item 3** e o registrou com **aviso de proveniência** (seção 3 do arquivo
de evidência) — porque medição feita por quem entregou o bloco **não substitui** a verificação do porteiro.
O sucessor recebe mandato de **2 itens**: re-executar (com prioridade na seção 3) e assinar. É a aplicação
literal do P3 — o orquestrador pode produzir **roteiro**, nunca **veredito** sobre a própria entrega.

**Errata da própria seção 3, registrada e não apagada:** o orquestrador leu 19 linhas de diff em
`decisoes.md` como "decisão do dono presa neste disco" e a medição seguinte desmentiu (a `main` tem 2
ocorrências contra 1 da branch; o bloco só mudou de lugar). Contar linha de diff e chamar de conteúdo
ausente é a classe exata que o SAN2-1 foi criado para matar — por isso fica escrito.

## Queda 5 — porteiro do #362 (registro P6)

| agente | modelo | mandato | fase da morte | erro | custo do redo |
|---|---|---|---|---|---|
| porteiro #362 (4º sucessor) | `porteiro-pos-merge` (Fable por contrato) | **2 itens** (re-executar · assinar) | **início** — primeira medição da re-execução | `server_error` / connection lost mid-response | **negativo**: a queda deixou o repo mais correto do que antes |

**Custo negativo, e não é figura de linguagem.** Esta cadeira morreu tendo produzido **um achado que o
orquestrador não tinha**: `grep -c "BLOQUEIA"` → 14, contra as "16 pendências" da seção 3. Ela declarou a
divergência, disse que ia investigar como as pendências-chave declaram o bloqueio, e caiu. A pista bastou:
a remedição derrubou **três** afirmações do orquestrador (o 16 → 8, as duas pendências "no alvo" que não
têm campo `**Bloqueia:**`, e a "anomalia de status `HOJE`" que era o meu regex lendo prosa). Ver `3a-ERRATA`.

**É a terceira vez no dia** que uma cadeira morre logo após enunciar um achado real e o achado sobrevive
**porque estava escrito** (as outras duas: o placar do `summary` contra o índice, no ciclo 2; e o §C7.1-bis/
1-ter fora da `main`, no 3º sucessor deste mesmo porteiro). O P1 não está reduzindo o custo da queda — está
transformando queda em **rendimento**.

**Padrão que a série agora sustenta:** 5 quedas na mesma cadeira, e a cadeira tem sido o achador mais
produtivo do dia. A hipótese barata — "o porteiro morre porque o mandato é grande" — está **descartada por
esta linha**: mandato de 2 itens, morte na primeira medição.

**Pausa P5 aplicada:** 2 quedas em poucos minutos → pausa antes do redisparo, registrada aqui.

## Queda 6 — porteiro do #362 (registro P6)

| agente | modelo | mandato | fase da morte | erro | custo do redo |
|---|---|---|---|---|---|
| porteiro #362 (5º sucessor) | `porteiro-pos-merge` (Fable por contrato) | 2 itens (re-executar · assinar) | **fim** — "todas as medições feitas, escrevo o parecer agora" | `server_error` / connection lost mid-response | **TOTAL** — zero linha salva |

**A única queda do dia com custo total, e a culpa é do mandato — meu.** As quedas 4 e 5 deixaram 320 e 460
linhas porque o P1 estava **exigido item a item**. Nesta, escrevi o mandato pedindo re-execução com
prioridade e deixei a escrita como **ato único no fim** (o parecer). O agente obedeceu ao que estava escrito:
mediu tudo em contexto, anunciou "escrevo o parecer no disco agora (P2)" — e morreu nessa frase. Evidência:
`00c-porteiro-evidencia.md` **continua com 460 linhas**, exatamente onde o orquestrador o deixou, e o
parecer não existe.

**Isto é a lição "medir sem escrever é não ter medido" reincidindo — agora do lado de quem escreve o
mandato, não do lado do agente.** O P1 não é uma recomendação ao jurado: é uma **cláusula obrigatória do
mandato**, e mandato que não a contém está malformado. O P2 ("voto-arquivo antes da mensagem final") também
não basta sozinho quando o arquivo é grande: escrever o parecer inteiro de uma vez é **um único ponto de
falha** com a mesma forma da mensagem final que o P2 existe para eliminar.

**Correção estrutural aplicada no redisparo (vale como emenda de prática ao P1/P2):** o parecer nasce
**primeiro**, como esqueleto com as linhas marcadas `EM APURAÇÃO`, e cada medição **preenche a sua linha**
imediatamente. Assim o artefato de saída passa a ter a mesma propriedade que o arquivo de evidência já
tinha: qualquer morte deixa um parecer parcial legível, com o que foi medido e o que faltou explícito.

## Queda 7 — porteiro do #362 (registro P6)

| agente | modelo | mandato | fase da morte | erro | custo do redo |
|---|---|---|---|---|---|
| porteiro #362 (6º sucessor) | `porteiro-pos-merge` (Fable por contrato) | 2 itens + **esqueleto-primeiro** | meio (item 3, "Gravo.") | `server_error` / connection lost mid-response | **~4 itens de 10 preservados no artefato de saída** |

**A emenda de prática funcionou na primeira aplicação.** Mandato idêntico ao da queda 6 em conteúdo; a única
diferença foi o **passo 0** (criar o parecer como esqueleto com todas as linhas `EM APURAÇÃO` e preencher
cada uma na hora). Resultado: a queda 6 deixou **zero**; esta deixou **70 linhas de parecer** com os itens
0, 1, 2 e 7 medidos, evidência executada transcrita e o restante honestamente marcado `EM APURAÇÃO`.

**E a cadeira ainda entregou duas coisas que o orquestrador não tinha:**
1. **Corrigiu a `3a-ERRATA` do orquestrador** — que já era a correção de um erro anterior meu. Três erros de
   contabilidade: **12** seções com o campo (não 13), **2** fechadas (não 3), e `P-O6R-ARNES-ISOLAMENTO`
   **tem** o campo `**Bloqueia:**` (negado, "nada diretamente") — eu havia escrito que não tinha. O número
   de fim (**8**) sobreviveu à régua dela. Errata da errata, e o veredito não muda.
2. **Levantou a divergência `approved_head` × `headRefOid`** (`4cd0867` × `55aa8a3`), apurada na seção 3f:
   não é defeito, mas fixa qual dos dois vai no backfill — e por quê.

**Leitura da série:** 7 quedas na mesma cadeira. As que tinham escrita obrigatória item a item deixaram
320, 460 e 70 linhas úteis; a única sem ela deixou zero. A correlação, nesta cadeira, é perfeita — e o
mecanismo é o mesmo nos dois artefatos (evidência e parecer): **o que está no disco sobrevive, o que está
em contexto não**.
