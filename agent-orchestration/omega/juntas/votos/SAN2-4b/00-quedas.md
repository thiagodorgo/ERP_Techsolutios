# Quedas e incidentes de terreno — junta do SAN2-4b

## INCIDENTE DE TERRENO — duas cadeiras no mesmo worktree, uma mutando

**O que aconteceu.** A cadeira **C3** detectou, no meio das próprias medições, que a árvore estava **mutada
por outra cadeira**: o drill **M1 da C2** havia removido `"rls_test"` de `SWEPT_ROLE_FAMILIES` e subido o
cluster `c2-arnes-pg`. A C3 **não tocou na mutação alheia** e decidiu **remedir a partir dos blobs do HEAD**,
imunes a ela — decisão correta, e ela caiu logo depois por `server_error`.

**A culpa é do orquestrador, não das cadeiras.** O §C7.1-bis exige **worktree próprio para cada jurado que
muta**. Eu despachei C1, C2 e C3 **no mesmo worktree** (`san2-r`), e a C2 tinha mandato explícito de mutar
código (a mutação de uma metade de cada vez). O inspetor liberou o terreno sem que esse arranjo estivesse
declarado, e eu não o corrigi ao despachar.

**Dano medido: nenhum.** A C2 restaurou a mutação (`git status` limpo de código no momento da apuração), e a
C1 já havia concluído com a árvore íntegra (`git diff --exit-code -- src/ tests/` ec=0, sha256 `f68bcfd0…`
conferido). O único arquivo modificado restante é o `pendencias-indice.md`, efeito **conhecido e inócuo** da
regeneração (`P-SAN2-2-INDICE-DONO-SEMPRE-SIM`).

**O que salvou:** não foi a regra — foi o **juízo da C3**, que reconheceu mutação alheia em vez de medir por
cima dela. Se ela tivesse medido sem olhar, teria produzido números de uma árvore que não é o head julgado,
e o voto seria inválido sem que ninguém percebesse.

**Correção aplicada agora:** o sucessor da C3 mede **a partir dos blobs do HEAD** (`git show HEAD:<path>`),
não da árvore de trabalho, e isso fica escrito no mandato. Para o próximo bloco, a regra que faltou: **cadeira
com mandato de mutação recebe worktree próprio, e isso é item do briefing, não do improviso.**
