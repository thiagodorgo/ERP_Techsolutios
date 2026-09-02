# Perda de inspetor de terreno — 1ª tentativa (2026-08-29)

Registro do orquestrador, feito **no momento da perda**.

**O que houve.** O `inspetor-de-terreno-da-junta` do SAN2-1 **caiu por erro de infraestrutura**
(`API Error: Connection lost mid-response`) já na **fase de limpeza** — a última coisa que disse foi
*"derrubo o que eu criei para medir"*. Ou seja: provavelmente **terminou a inspeção e morreu antes de
entregar o parecer**.

**O que foi feito.** O parecer perdido **não conta** — nem o que ele possa ter medido. Um novo inspetor de
**identidade nova** refez o mandato **do zero**, com a instrução explícita de que nada do anterior é insumo.

**Antes de redisparar, o orquestrador conferiu o terreno** (porque um inspetor que morre na limpeza pode
deixar resíduo, e resíduo contamina o próximo): `git worktree list` = as 4 esperadas, nenhuma órfã;
`docker ps -a` = só `erp-postgres`/`erp-redis`, a base viva, nenhum container de medição; árvore do bloco com
`git status --porcelain` **vazio**. A limpeza dele foi concluída antes da queda.

**O mandato foi ENCURTADO no segundo disparo**, por evidência acumulada e não por palpite: **esta é a quinta
queda de agente na sessão de hoje**, e a regularidade medida na junta do B-O6R-REG foi que **as cadeiras com
mandato grande são as que morrem** — as duas que morreram no início tinham 6 itens com execução de teste
embutida; a que completou com folga tinha os itens mais baratos. O segundo mandato tem **6 itens em sequência
fixa**, com ordem de **emitir o parecer ao terminar o item 6** e proibição de explorar fora da lista.

---

## Segunda perda nesta junta — cadeira de KPI (2026-08-29)

O jurado de KPI/registro **caiu por erro de infraestrutura** (`Connection lost mid-response`) no **item 3 de
4**, depois de já ter confirmado o backfill. **O parcial NÃO conta** — nem esse, que era favorável. Suplente
de identidade nova refez do zero, com mandato cortado para **3 itens** e ordem de votar ao terminar.

**Placar de infraestrutura do dia: 6 quedas.** Já não é ruído; é regularidade, e ela tem uma direção só:
**quem teve mandato longo morreu, quem teve mandato curto entregou.** As perdas de hoje foram o planejador da
simulação (mandato de 6 entregas), dois exploradores de levantamento (mandatos de 7 e 8 itens), o inspetor da
1ª passada (8 itens), o jurado de KPI do B-O6R-REG (6 itens, duas vezes) e este (4 itens). Os que completaram
tinham 3 a 6 itens baratos.

**Recomendação para a ata da rodada:** **cadeira de junta deve ser dimensionada como fatia de bloco.** Se a
competência não cabe num mandato curto, são **duas cadeiras**, não uma grande — o custo de uma cadeira a mais
é muito menor que o de perder e refazer, e uma cadeira que morre no meio ainda contamina o suplente com um
parcial que não pode ser usado.
