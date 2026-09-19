# DOSSIÊ AO DONO — `B-SAN3-01` (PR #387) parou no teto de dois ciclos

> `D-TETO-DOIS-CICLOS`: "entregou, foi reprovado, corrigiu, foi reprovado de novo → para e chama o dono". Este é o dossiê que a
> regra exige: o que foi entregue, o que cada junta achou, o que foi corrigido, **por que a correção não bastou**, e as opções
> com custo. Data: 2026-09-19. Objeto do ciclo 2: `8adaaa31`. CI: 7 jobs verdes.

## 1. O que o bloco entrega (medido, não prometido)

Fecha a `P-008` (item 4 do gate, perda de dado). Em modo real, a web inventava dado no lugar do erro: lista vazia virava 6 OS
falsas com aviso de "sem conexão"; um create recusado pelo backend virava `OS-FALLBACK`, navegava para uma OS inexistente e
**perdia o que o operador tinha digitado**; detalhe 404/403/5xx virava `OS-000101` com timeline inventada; o service de
despachos tinha a mesma classe e alimentava o Dashboard.

Hoje, no objeto julgado: erro, vazio, sem permissão, não encontrado e desatualizado são estados distintos, recriados do
protótipo; o create recusado mantém o digitado e não navega; a verdade "sem permissão" tem uma fonte só. Números de execução
real: teste do bloco **67/67** (15 vermelhos no objeto do ciclo 1), smoke **1193/1193**, backend **2996/2998**, e2e E1–E3
**3/3** em base vazia e com OS.

## 2. O que as juntas acharam

**Ciclo 1 — REPROVADO 2 × 2** (`R-B-SAN3-01-ciclo1.md`). A fidelidade dos estados divergia do protótipo (cor, ícone,
espaçamento; erro e sem permissão só se distinguiam pelo texto) e três defeitos de fail-closed: o 403 virava "vazio" com a
suíte verde; o guard do mock era léxico (o `?? getMock…` no `else` de `if (isMockMode())`, num service novo, ou com comentário,
passava); um status novo na lista nascia "vazio" com KPIs 0.

**Correção (ciclo 2):** planejada pelo `planejador-mestre` em Fable e feita por um agente novo. Uma fonte só para "sem
permissão"; enumeração fechada com default erro; guard por alcance (não por texto da linha); estados recriados do protótipo com
estilo computado; o 2xx malformado passou a virar erro. As mutações dos jurados do ciclo 1 ficaram vermelhas.

**Ciclo 2 — REPROVADO.** C1, C2 e C3 aprovaram (só notas). A C4 (jurado de fail-closed criado para a cadeira, por ressalva do
inspetor) reprovou com **dois bloqueios dentro do bloco**:

1. **A página não está amarrada ao estado.** Uma linha em `frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx` faz a
   página real mostrar o 403 como `data-state="empty"`, "Nenhuma ordem de serviço" e KPIs `0|0|0|0`, com o bloco 67/67, `tsc`
   ec=0 e smoke 1193/1193. Os testes amarram o **reducer**; nada amarra a decisão da página.
2. **O alcance do guard é menor que a fronteira.** Um arquivo NOVO nas raízes do guard devolve `OS-000101` e
   `id="" code="OS-FALLBACK"` em modo real com o `[G1]` verde (o controle com barrel de 1 nível fica vermelho) — o cabeçalho do
   service afirma cobertura que a mutação desmente.

## 3. Por que a correção não bastou

As duas são a **mesma classe do ciclo 1, um nível mais fundo**: o ciclo 1 fechou as instâncias que os jurados nomearam (o
reducer, o barrel de um nível); o ciclo 2 fechou a propriedade **onde ela foi enunciada** — no reducer e nas duas raízes
declaradas — mas não onde ela é decidida de fato (a página) nem em profundidade arbitrária de import. É a terceira aparição da
lição `feedback-correcao-por-instancia-nao-propriedade` nesta rodada.

**O que isso significa hoje, sem suavizar:** o produto **não fabrica** dado nos caminhos medidos — as duas provas da C4 são
mutações, não o estado atual do código. O que falha é a garantia de que a **próxima** linha escrita por alguém não reintroduza a
fabricação sem nada ficar vermelho.

## 4. Opções, com custo

| # | Opção | O que entra na `main` | Custo | Risco |
|---|---|---|---|---|
| A | **Mergear como está**, com as duas propriedades registradas como pendências com dono e sem bloco novo | a correção inteira | ~30 min (ata, merge, porteiro) | a promessa do cabeçalho do service fica maior que o guard; regressão futura não fica vermelha |
| B | **Mergear e abrir um bloco no gate** só para as duas propriedades (guard por alcance em profundidade arbitrária + teste que amarra a página ao estado), planejado do zero | a correção inteira | ~30 min agora + 1 bloco (plano, dev, junta) depois | menor: a dívida fica nomeada, bloqueante e com dono |
| C | **Ciclo 3, por exceção ao teto**, só para as duas propriedades, antes de mergear | nada agora | 1 rodada completa (plano + dev + junta), ~meio dia de sessão | a própria decisão que criou o teto mediu que escalar reduz a chance de aprovação a cada ciclo |
| D | **Parar o bloco** e reordenar a fila: o `B-SAN3-04a` (#390, junta APROVADA 3×0) passa a ser o primeiro a mergear | nada da web | ~1 h (mover para o #390 as dívidas do #386, que o porteiro exige do primeiro PR de execução) | a web fica sem o conserto da perda de dado por mais tempo |

**Recomendação do orquestrador: B.** O defeito de perda de dado que motivou o bloco está fechado e provado por execução; o que
resta é a força do guard, que é trabalho de propriedade e merece bloco próprio, no gate, com dono — em vez de mais um ciclo
sobre o mesmo objeto, que a evidência do próprio teto diz render menos a cada rodada.

## 5. O que acontece em qualquer opção

O `B-SAN3-04a` (#390) está aprovado e espera rebase; o `B-O6R-04a` (#389) e o `B-O6R-11` (#388) estão no ciclo 2, com os planos
de correção prontos e os desenvolvedores trabalhando agora. As dívidas do #386 (backfill, aposentadoria, manchete do gate) estão
no #387: se ele não mergear primeiro, elas se mudam para o primeiro PR que mergear.
