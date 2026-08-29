# POSTMORTEM — 14 quedas de agente em uma sessão (2026-08-28/29)

> Forense encomendada pelo dono: *"veja contexto e tarefa de cada agente, analise o papel da junta, procure
> o possível bug nos arquivos de orquestração, analise profundamente o que está sendo feito e por que está
> sendo reprovado, arquitete um plano para acabar com isso."* Este arquivo é a análise; o plano é o
> `PROTOCOLO-JUNTA-RESILIENTE.md` (`juntas/`), decidido em `D-JUNTA-RESILIENTE`.

## 1. As 14 quedas, uma a uma

Na sessão de 28–29/08 foram disparados ~28 agentes; **14 morreram** — taxa de **~50%**. Todos os erros são
da mesma família: `server_error` de streaming da API (*"connection lost mid-response"* / *"the response
stopped arriving"*). A tabela registra o que cada um era, o que fazia, e **onde** morreu:

| # | Agente | Modelo | Mandato | Morreu em | Erro |
|---|---|---|---|---|---|
| 1 | Explore cronograma/roadmap | herdado da sessão | 6 itens | meio (lendo KPIs) | response stopped |
| 2 | Jurado trilha `B-O6R-REG` (veto) | herdado | 6 itens | após medir 28/28 blobs — **parcial favorável** | connection lost |
| 3 | Jurado KPI `B-O6R-REG` | herdado | 6 itens | **mensagem 1** | connection lost |
| 4 | Suplente KPI `B-O6R-REG` | herdado | 4 itens | **mensagem 1** | connection lost |
| 5 | Explore agentes/atas | herdado | 8 itens | meio (cruzamento por grep) | response stopped |
| 6 | Explore disco | herdado | 7 itens | meio (após achar o AVD de 9,41 GB) | response stopped |
| 7 | Plan simulação da rodada | herdado | 6 entregas | **mensagem 1** | response stopped |
| 8 | Inspetor de terreno `SAN2-1` (1ª) | **pin `fable`** | 8 itens | **fase de limpeza — inspeção pronta** | connection lost |
| 9 | Jurado KPI `SAN2-1` c1 | herdado | 6 itens | item 3, backfill já conferido | connection lost |
| 10 | Jurado diff `SAN2-1` c1 (veto) | herdado | 5 itens | **após medir 1–5, indo escrever o voto** | connection lost |
| 11 | Suplente diff `SAN2-1` c1 | herdado | 4 itens | item 2–3 | response stopped |
| 12 | Jurado triagem `SAN2-1` c2 (veto) | herdado | 5 itens | **mensagem 1** | connection lost |
| 13 | Jurado diff `SAN2-1` c2 (veto) | herdado | 4 itens | **logo após ACHAR um defeito real** (o placar do summary contradizendo o índice — conferido depois: ele estava certo) | response stopped |
| 14 | Jurado KPI `SAN2-1` c2 | herdado | 3 itens | item 3 | response stopped |

**Sobreviventes, para contraste:** 14 conclusões na mesma sessão — entre elas corridas de **154k, 137k,
121k e 109k tokens** (longas e bem-sucedidas), e o mandato de **2 itens** que completou em **151 s** com 6
chamadas, depois de a mesma cadeira ter morrido três vezes.

## 2. Os seis fatos que a tabela prova

**F1 — Não há bug nos arquivos de orquestração.** Os 14 erros são cortes de streaming do lado do serviço.
Nenhum script do repositório dispara agentes (a junta é orquestrada pela sessão, via Agent tool); briefings
e corpos de agente moldam **tamanho de prompt e de mandato** — não conseguem derrubar um stream. A prova
definitiva: agentes **Explore e Plan, que não leem arquivo de junta nenhum**, morreram do mesmo jeito
(quedas #1, #5, #6, #7).

**F2 — "Mandato longo morre" era uma simplificação, e parcialmente errada.** Quatro mortes na **mensagem 1**
(#3, #4, #7, #12) — antes de qualquer trabalho — provam **falha por request, independente do mandato**. A
relação verdadeira: *probabilidade de morte ≈ exposição (tempo × requests) × taxa de falha da janela*.
Mandato curto continua sendo a prática certa, mas pelo motivo certo: reduz a exposição **e** reduz o custo
de cada perda. (Errata da lição registrada nas atas de 29/08, que afirmava a causa no mandato.)

**F3 — As mortes mais caras são no FIM.** O inspetor (#8) morreu na limpeza com a inspeção pronta; dois
jurados (#10, #13) morreram indo compor o voto; um deles **depois de achar um defeito real e verificável**.
Trabalho ~90% feito → **100% perdido** — porque, no desenho atual, tudo viaja na mensagem final.

**F4 — A regra R2 é o amplificador de custo.** *"Voto perdido não conta; o suplente refaz o mandato inteiro;
parcial não é insumo"* está **certa epistemicamente** — foi herança de parcial que contaminou juntas
anteriores. Mas, a 50% de mortalidade, ela converte cada queda em redo total e dobra ou triplica o custo de
toda junta. O defeito não é a regra; é ela não distinguir **afirmação herdada** (proibida, sempre) de
**medição registrada re-executável** (que pode ser re-verificada em segundos).

**F5 — Hipótese de modelo, com n pequeno, declarada como hipótese e não como conclusão.** Agentes **pinados
em `fable`** morreram 1 em 5 (~20%); os que **herdavam o modelo da sessão** (`opus-5[1m]` até 29/08),
~13 em 23 (~57%). O n não sustenta conclusão. A sessão passou a `fable-5[1m]` em 29/08 — a próxima junta
mede a hipótese de graça, pela série do registro de quedas.

**F6 — Quedas agrupam no tempo.** Os dois disparos de 3 jurados em paralelo perderam 2–3 membros cada, e
houve janelas com quedas consecutivas em minutos. Paralelismo não causa o erro — mas **multiplica os streams
expostos** dentro da janela ruim, e redisparar imediatamente dentro dela foi o que multiplicou as perdas.

## 3. O papel da junta: faz sentido? (a pergunta do dono, respondida com o que ela pegou)

**Sim.** Na mesma sessão das 14 quedas, as juntas pegaram **quatro classes reais** de defeito que releitura
não pegaria:

1. O *"piso 0"* sobrevivendo vivo no corpo do `kpis-history.md`, 98 linhas abaixo da frase que anunciava sua
   correção.
2. A etiqueta de leveza carimbada **verbatim em 79 pendências** — "79 verificações" que eram um único carimbo.
3. A `P-036`, descrita como cosmética, sendo **duplicata de um bug real já resolvido em 02/08**.
4. O placar do `summary` contradizendo o índice **do mesmo commit** (achado por um jurado que morreu 30
   segundos depois de enunciá-lo).

As duas reprovações do `SAN2-1` foram **corretas**, e ambas rejeitaram a mesma doença — **asserção coletiva
publicada como se fosse verificação item a item**, cometida pelo orquestrador. As quedas são **ortogonais**
às reprovações: encarecem os ciclos, não geram os vereditos. O que não fazia sentido era o **modelo de
custo**: o desenho da junta assumia que agente sobrevive. O protocolo resiliente conserta isso sem
enfraquecer nada — quóruns, vetos, identidade nova e o teto de 2 ciclos ficam intactos.

## 4. O que muda (resumo; o normativo é o protocolo)

| Fato | Resposta |
|---|---|
| F3 — morte no fim perde tudo | **P1** evidência incremental em arquivo, item a item · **P2** voto-arquivo-primeiro |
| F4 — R2 converte queda em redo total | **P3** emenda ao R2: evidência registrada é roteiro de re-execução barata |
| F2 — exposição × taxa | **P4** mandato ≤3 itens, medição ≠ voto, saída final curta |
| F6 — janelas ruins | **P5** disparo escalonado (máx 2) + pausa de 15 min após 2 quedas em 30 min |
| F5 — hipótese de modelo | **P6** registro padronizado de quedas → série histórica decide |
