# P-record — P-INV-LEGACY-QTY-CONTRACT (achado PRÉ-EXISTENTE, não bloqueia PR-08)

**Data:** 2026-07-22 · **Origem:** escalado pelo omega4c-dev-frontend durante o PR-08 (divergência #1).

## Achado
O modal genérico legado `StockMovementFormModal` (montado em EstoquePage:514 e EstoqueDetailPage:339) usa `buildStockMovementPayload` que envia **`quantidadeSinalizada` NEGATIVO** para `saida`/`consumo` (`quantidadeSinalizada: sign * quantidade`, adapter l.358 na main). O backend do movimento genérico lê `parseQuantidade(body.quantidade ?? body.quantidade_sinalizada ?? body.quantidadeSinalizada, type)` (service l.195 na main) e `parseQuantidade` **rejeita ≤0 para entrada/saida/consumo** (validators l.145-152) → o payload legado de saída/consumo é rejeitado com 400 `invalid_quantidade`. (Para `ajuste`, parseQuantidade aceita sinalizado — só entrada/saida/consumo quebram.)

## Prova de que é PRÉ-EXISTENTE (não regressão do PR-08)
`git show main:` confirma que **na main** o service já usava `parseQuantidade(body.quantidade ?? ... ?? body.quantidadeSinalizada)` (l.195) E o `buildStockMovementPayload` já enviava `quantidadeSinalizada: sign * quantidade` (l.358). O PR-08 **não tocou** nenhum dos dois (o `const quantidade = parseQuantidade(...)` aparece como CONTEXTO no diff; o `+` no service é só o `createTransfer` novo do LINK/UNLINK). Os testes de rota do backend passam porque enviam `quantidade` (magnitude positiva), não o payload do modal legado.

## Por que não entra no PR-08 (§C4)
O fix correto é type-dependente: entrada/saida/consumo devem enviar `quantidade` (magnitude, o backend deriva o sinal via signQuantity); **ajuste** precisa do valor SINALIZADO (direção escolhida pelo usuário). Corrigir o `buildStockMovementPayload` exige essa distinção + atualizar `inventory.adapter.test.ts:273-283` (que assere `quantidadeSinalizada`). É uma fatia própria (P-INV-LEGACY-QTY-FIX), fora do escopo "estoque custódia" do PR-08. Os sub-modais NOVOS do PR-08 (Entrada/Vincular/Saída) enviam `quantidade` magnitude corretamente — não afetados.

## Recomendação
Fatia de correção dedicada (front: `buildStockMovementPayload` envia `quantidade` magnitude p/ entrada/saida/consumo e mantém sinalizado só p/ ajuste; + ajustar o teste do adapter). Prioridade MÉDIA (fluxo legado; o fluxo novo por custódia é o caminho preferencial AutEM).
