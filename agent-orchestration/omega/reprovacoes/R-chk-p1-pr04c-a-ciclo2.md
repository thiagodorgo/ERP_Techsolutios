# R-CHK-P1-PR04C-A — ciclo 2 de reprovação da implementação

- **Entrega:** CHECKLIST P1 **PR-04c-A** — junção N:N `work_order_checklists`, aplicabilidade ligada de ponta a
  ponta, provisão de execução no despacho.
- **Data:** 2026-08-14 · **Ciclo:** 2 (implementação). Os ciclos de **plano** desta fatia (v1 e v2) estão
  registrados à parte; a contagem do §C7.4 aqui é da implementação.
- **Quem reprovou:** `critico-adversarial` em duas frentes independentes (despacho backend · tela web), cada uma
  reproduzindo as mutações do implementador e somando ataques próprios na composição **real**.

---

## Por que o ciclo 1 não bastou

O ciclo 1 fechou os achados que lhe foram dados (porta única de escrita da junção, atomicidade em requisição
recusada, porto do conjunto ligado nas raízes de composição, evento na timeline que o app de campo lê,
`freezeChecklistLinkSnapshots` implementado). Tudo isso ficou **provado por mutação** e foi confirmado pelo
crítico: 11 mutações amostradas, todas caem; suíte backend 2289 · 2281 pass · 0 fail · 8 skip; 12 suítes `-db`
85/85; resíduo zero na base viva.

O que o ciclo 1 **não** viu foi o que só aparece no **re-despacho** — caminho que nenhuma suíte da frente
exercitava.

## Os achados do ciclo 2

### Frente despacho

| # | Sev | O defeito |
|---|---|---|
| 1 | **BLOQUEANTE** | **O re-despacho apaga o formulário congelado.** `resolveChecklistSnapshot` devolve `null` quando o modelo saiu de circulação, e esse `null` é escrito **por cima** do congelamento anterior (`field-dispatch.service.ts:211-226`), no espelho+primária e em cada linha secundária. OS com coleta+entrega, modelo da entrega arquivado entre dois despachos → o congelado vira NULL e é **irrecuperável**. Mata a garantia Ω3-c E1/E3 que o docblock do porto promete. **É regressão nova desta branch**: em `HEAD` o `freezeChecklistSnapshot` só zerava a coluna da ordem; esta fatia o fez zerar também a linha primária da junção, que é a prova por linha. |
| 2 | **ALTA** | **O `create` afirma ao guincheiro um fato negativo falso.** Execução já criada e na mão do técnico; modelo arquivado depois; re-despacho → a timeline da ordem recebe "Uma vistoria da coleta não foi enviada ao técnico". Ela foi. É a classe que o comentário do próprio arquivo (`:529-535`) condena e que a mutação M9 prova ter sido eliminada — **só no `reassign`**. |
| 3 | MÉDIA | Guard do BLOQ 3 no `reassign` é `return` mudo: com o defeito 1 zerando o congelado, passa a valer em toda reatribuição e mata em silêncio o caminho de recuperação. |
| 4 | MÉDIA | **O dublê cego — a causa-raiz dos outros.** `tests/field-dispatch-multi-checklist.test.ts:474`: `link()` **sempre** grava `checklistSnapshot: {frozen:true}`, inclusive em linha nunca despachada. Logo o dublê **não distingue** "congelada por despacho anterior" de "nunca congelada" — o discriminador exato dos achados 1 e 2. Foi por isso que 10/10 seguiram verdes enquanto os ataques caíam. |
| 5 | BAIXA | 12 linhas de **bookkeeping de rodada** dentro de fonte de produção (`work-order.service.ts:903-914`), narrando o incidente da mutação de um verificador. Diário de bordo não é comentário de comportamento; o lugar é aqui. |
| 6 | BAIXA | `as never` num dublê (`tests/field-dispatch.test.ts:307`) anula a checagem de tipo que o parâmetro obrigatório do construtor existe para garantir. |

### Frente tela

| # | Sev | O defeito |
|---|---|---|
| 1 | **ALTA** | **O chip "adicionada manualmente" afirma mais do que o dado sustenta.** `source: "manual"` é o **balde do resto** — a própria definição de domínio o diz: override no create/update, ajuste do operador, **cópia do duplicate**, e a visão sintética da ordem legada. Provado E2E: toda ordem pré-04c (isto é, **todas** as existentes, porque a decisão do dono é sem backfill) renderiza "Vistoria geral · adicionada manualmente"; e `copyChecklistSetFrom` carimba `manual` sobre linhas que eram `resolved`, então duplicar uma OS transforma "definida por regra" em "adicionada manualmente". É esse chip que um advogado lê no dossiê. |
| 2 | **ALTA** | O comentário afirma precedência "a MESMA do backend" (não é: a do backend passa pela visão sintética) e o teste chamado "ordem legada" cobre um caminho que a produção **nunca** percorre — `getWithLinks` sempre resolve `effectiveChecklistSet`, então `GET /work-orders/:id` nunca omite `checklists`. O caso legado real ficou **sem teste**, sob a aparência de coberto. |
| 3 | BAIXA | Chave React duplicada quando duas linhas do mesmo modelo têm `role: null` — exatamente o caminho de compatibilidade (`custody_field`/`custody_yard`) que o autor diz proteger. |

## O padrão que atravessa os dois ciclos

Três reprovações desta fatia têm o **mesmo mecanismo**: um artefato afirma um resultado que a execução não
produz. No ciclo 1 era comentário de código ("congela TODAS as vistorias vivas" com o porto solto). No ciclo 2
aparece em três formas — comentário (despacho ALTA 2 e tela ALTA 2), **rótulo de UI** (tela ALTA 1) e **dublê de
teste** (despacho MÉDIA 4, que afirma um estado impossível e por isso não consegue falhar).

O dublê é o mais instrutivo: não é um teste faltando, é um teste **incapaz de falhar** no estado que importa.
Verde de suíte cega custou dois ciclos.

## Ação do §C7.4 (ciclos 1–2: criar especialista)

O ciclo 2 incorporou uma **lente dedicada a fidelidade de dublê/fixture** na fase de verificação, com o mandato
de perguntar, para cada dublê tocado: *ele consegue expressar o estado que faria o teste falhar?* A correção
exigida do MÉDIA 4 leva a regra adiante — depois de tornar o `link()` honesto, a suíte inteira é re-executada, e
**todo teste que passe a falhar estava passando pelo motivo errado**; conserta-se o teste, nunca o dublê de
volta.

## Estado

- Ciclo 2 **despachado** em 2026-08-14 com os 9 achados, cada um com a correção mínima que o crítico já aplicou
  e viu ficar verde. Verificação adversarial por frente + a lente de dublê.
- **Nenhuma parada ao humano.** O §C7.4 só a prevê após o ciclo 5 falho ou em parada irredutível; não é o caso.
- O merge desta fatia está liberado nominalmente pela `J-CHK-04C-EMENDA` (opção B, 4×1) — mas a liberação é de
  governança, **não** de qualidade: o veredito adversarial continua sendo condição de merge.

## Registro do incidente que o BAIXA 5 documentava no lugar errado

Durante a verificação do ciclo 1, uma mutação (M1) aplicada por um verificador em `work-order.service.ts`
permaneceu na árvore de trabalho depois da checagem, e foi encontrada na revisão seguinte. A árvore foi
restaurada e a suíte da frente voltou a 15/15. O implementador registrou o episódio em **comentário de código de
produção**; o registro correto é este. Regra reafirmada: mutação de verificação se desfaz por **cópia de backup
conferida byte a byte** — nunca por `git checkout`, que numa árvore inteiramente não-commitada apaga o trabalho
das outras frentes.
