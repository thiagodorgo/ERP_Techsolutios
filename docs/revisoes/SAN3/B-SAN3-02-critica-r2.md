# B-SAN3-02 — 2ª rodada de crítica do plano v2 (critico-san3-02-opus, rodada 2 de 2)

- **Papel:** crítico adversarial; Claude Opus 5.5 (`claude-opus-5-5`), nível menor, declarado. Não escrevi o plano, não implemento, não voto.
- **Objeto:** `C:/Users/AMP/erp-pausa-2026-10-03/planos/B-SAN3-02-plano.md` v2.
- **Veredito:** APROVA COM AJUSTES — 0 bloqueia · 5 ajuste

## Evidência incremental (P1)

### E1 — objeto e ref
- `md5sum B-SAN3-02-plano.md` → `ad4e92fad7b2006b8f11523460f018c3`, 500 linhas (bate com o mandato).
- `git fetch -q origin && git rev-parse origin/main` → `3fbcaea2ba3cd1d39a42ff8943a2cc0086ef010d` (inalterada desde a r1).

### E2 — afirmações novas da v2, medidas na ref
- `git show origin/main:src/modules/financial-titles/financial-title.service.ts | sed -n 225,240p` → o comentário l.232-233 lista `direction` como imutável pós-create, e `work_order_id` não está entre os editáveis. A premissa "ON UPDATE CASCADE inerte" procede.
- `git show origin/main:src/modules/checklists/checklist-prisma.repository.ts | sed -n 1166,1200p` → transiente por código (P2028, P2034, 40001, 40P01, 55P03…), dois níveis (P2010 + `meta.code`). O precedente do 503 procede.
- `MSYS_NO_PATHCONV=1 git show origin/main:.github/workflows/ci.yml | grep -n -i -E "migrate (diff|status)|drift"` → nenhuma checagem de drift do Prisma na CI (a única ocorrência, l.84, é do espelho de agentes). `git grep -n -i "migrate diff" origin/main -- scripts tests package.json` → vazio.
- `git show origin/main:prisma/schema.prisma | sed -n 1876,1882p` e l.2028-2033 → FKs "só no SQL" (`WorkOrderComment`) e índices PARCIAIS que "o Prisma NÃO modela" já existem na ref.
- Veredito parcial: insumo de B4. As demais premissas novas procedem.

### E3 — análise de corrida das mutações novas (leitura do §7 da v2 + semântica de READ COMMITTED da r1/E5, docs PG 16 §13.2.1)
- **M17 em T-A4:** o perdedor lê `findActiveByWorkOrder` antes do `FOR UPDATE` e não vê nada (T1 ainda não existe). Depois bloqueia em i1. O vencedor insere T1, carimba e commita. O perdedor fica com {i2}, tenta INSERT de um 2º original e recebe 23505 imediato contra o T1 já commitado: P2002, 409 ≠ 201. **Morre como o plano diz.**
- **M2 em T-A4:** o perdedor NÃO espera na leitura e decide "original". O INSERT dele passa, porque o vencedor está na barreira ANTES do INSERT de T1. O `markInvoiced([i1,i2])` bloqueia em i1. O vencedor então faz INSERT de T1 e espera a chave única ainda não commitada do perdedor: **ciclo, deadlock (40P01)**, com vítima dependente de tempo. A descrição do plano ("bloqueia no índice, 23505 → 409") está errada; ver B2.
- **M21 em T-C10:** se a mutação valer no InMemory, a simulação do índice também deixa de ver T1, o título nasce original com `parentTitleId` null e a asserção "pai = T1" fica vermelha. No db, o índice dá 23505 e a resposta é 409. **Morre** nas duas formas.
- **M6 em T-C9a/b:** T1 removido e T2 ativo. Sem o predicado, `find`/`findFirst` só acha T2, o pai vira T2 (a) ou a resposta vira 409 (b). **Morre.** No db, a FK de 4 colunas aceita T2 (mesma OS e direção), logo o 201 com pai T2 chega à asserção e fica vermelho.
- **M23 em T-PREC2/3:** sem o passo 0, a trava de período dentro da unidade vem primeiro e a resposta é 422 `period_closed`. **Morre.**
- **M18 em T-PREC:** **morre** (201 em mês fechado). É mutação composta; tirar só o passo 1 fica verde por causa da re-checagem da variante. O plano declara isso.
- **M4″ em T-Z1:** o SELECT/UPDATE sem `invoiced_at IS NULL` reavalia, acha as linhas carimbadas e as apaga. **Morre.**
- **M20 em T-A6:** **morre** (erro cru ≠ 503).
- **M22 em T-D(e):** **morre** nos casos outra OS, outra direção e pai avulso. O caso "outro tenant" continua 23503 sob a M22 (o `tenant_id` já estava na FK de 2 colunas): esse subcaso não mata a M22, mas os outros três matam.
- **M16 removida:** reconfirmada como EQUIVALENTE. `work_orders.id` é PK UUID e a FK `(tenant_id, work_order_id) → work_orders(tenant_id, id)` está em `20260803000000` l.51-52 (r1/E4). Com o `wo.id` resolvido no tenant, `work_order_id = X` já fixa a organização, com ou sem RLS e com ou sem BYPASSRLS.
- **Ordem total no `softDeleteAllByWorkOrder` (A4):** em T-Z1/T-Z2, o vencedor segura TODAS as linhas antes de o perdedor começar, então o `updateMany` sem ordem de hoje também não fecha ciclo ali. Os dois testes passam com e sem o `ORDER BY`; ver B3.
- Veredito parcial: as mutações novas morrem, exceto pelo mecanismo da M2 no T-A4 (B2) e pela falta de mutação para a ordem total (B3).

---

## 1. Os achados da r1 fecharam?

| achado r1 | fechou? | por quê (E2/E3) |
|---|---|---|
| A1 (bloqueia) | **SIM** | O T-A4 passa a esperar o desfecho do desenho (201 complementar, 2 títulos), e a M17 o derruba. O T-A4b exercita o P2002 dentro da unidade e a H2 (`reason` exato), e a M5b morre ali. O §4 ganhou a linha da corrida. Resíduo: B2 (mecanismo da M2 no T-A4). |
| A2 (bloqueia) | **SIM** | T-C9a/b é o cenário que distingue "original ativo" de "qualquer ativo", e a M6 morre nele, em memória e no db. |
| A3 | **SIM** | A M18 é a mutação própria do T-PREC, e a tabela não atribui mais a M1 ao T-PREC. |
| A4 | **PARCIAL** | A ordem total foi escrita (D2), o 503 foi mapeado (a M20 morre no T-A6) e a M4″ morre no T-Z1. Mas o remédio central, a ordem `(created_at, id)` no `zero`, não tem teste que falhe sem ele (B3). |
| A5 | **SIM** | Comportamento declarado em D3, T-C10 com a M21 e a pendência `P-SAN3-02-PAI-CANCELADO`. |
| A6 | **SIM**, com ressalva de registro (B5) | FK de 4 colunas + índice auxiliar; a M22 morre no T-D(e); "pai é original" foi rebaixado a aplicação (P3″). Com MATCH SIMPLE e `work_order_id` NOT NULL forçado pelo CHECK, a FK é sempre avaliada no complementar; um pai avulso (`work_order_id` NULL) nunca casa, então dá 23503. |
| A7 | **SIM** | Só a frase da l.122 entra no PERMITIDO; a divergência fica registrada sob a `D-SAN3-02`. |
| A8 | **SIM** | O passo 0 restaura a precedência de hoje; a M23 morre em T-PREC2/3. |
| G2 (Gemini) | **SIM** | A M16 sai, e a equivalência foi reconfirmada (E3). |
| G1 (Gemini, contestado) | contestação **procede** | Mesma conclusão da r1: a guarda é o que torna a M2 observável no T-R2 e no T-Z2 (E3). |

## 2. Ataque ao que a v2 trouxe de novo

### B1 — `translateUnitFailure` "por `isConflictError`" converte TODO 409 da unidade em `already_invoiced`
- **Gravidade:** `ajuste` · **Escopo:** `dentro-do-bloco`.
- **Evidência:** v2 §3 D1 l.192-195: a unidade termina em `.catch(translateUnitFailure)`, com "P2002 (índice novo) → 409 already_invoiced (isConflictError, l.440, já existe)". Na ref, `work-order-financial.service.ts:440-442`: `isConflictError` = `statusCode === 409`, por duck-type, sem olhar `reason`. Dentro da unidade nascem TRÊS 409 distintos: `invoice_items_changed` (passo 7), `already_invoiced` (passo 3) e o novo `invalid_parent_title` (v2 §5 l.295, "409 … FINANCIAL_TITLE_CONFLICT").
- **Motivo:** Lido ao pé da letra, o desenho troca `invoice_items_changed` e `invalid_parent_title` por `already_invoiced`. Hoje o duck-type só envolve a chamada a `createForWorkOrder` (l.390-395); a v2 o leva para o perímetro da unidade inteira. O T-A3 (que assere `invoice_items_changed`) pegaria isso, e por isso o achado é `ajuste`. Mas o `invalid_parent_title` não tem teste pela rota: uma violação de invariante interna (pai incoerente) seria entregue ao cliente como "já faturado", o que esconde um defeito atrás de uma resposta de negócio. Classificar a falha de FK como 409 de conflito também contraria o resto da tradução P2003 da casa (400 de referência inválida, l.474-480).

### B2 — O "mata" da M2 no T-A4 descreve o mecanismo errado; o desfecho real é um deadlock com vítima dependente de tempo
- **Gravidade:** `ajuste` · **Escopo:** `dentro-do-bloco`.
- **Evidência:** E3 (M2 em T-A4). No arranjo da v2 §7.1 l.344, o vencedor está na barreira ANTES do INSERT de T1. Sob a M2, o perdedor insere o original primeiro e bloqueia no `markInvoiced` em i1. O vencedor, ao inserir T1, espera a chave única do perdedor: ciclo. O plano diz "bloqueia no índice, 23505 → 409".
- **Motivo:** O teste fica vermelho de qualquer jeito (o desfecho difere de 201 complementar), mas por exceção na conexão do vencedor ou por 503 do perdedor, conforme quem o detector de deadlock escolher. No relatório do dev, o vermelho-controle da M2 no T-A4 não terá a forma que o plano prevê, e um erro na conexão de arnês pode ser lido como falha de ambiente, e não como vermelho funcional (lição do 03a). A morte determinística da M2 continua no T-R2 e no T-Z2; só a linha do T-A4 está errada.

### B3 — O remédio do A4 (ordem total no `softDeleteAllByWorkOrder`) não tem teste nem mutação que o derrube
- **Gravidade:** `ajuste` · **Escopo:** `dentro-do-bloco`.
- **Evidência:** E3 (última linha). Em T-Z1 e T-Z2, um lado já segura TODAS as linhas antes de o outro começar, e o `updateMany` sem ordem da ref (`work-order-financial-prisma.repository.ts:104-109`) também não fecha ciclo nesse arranjo. Nenhuma das 24 mutações é "tirar o ORDER BY / voltar ao updateMany". A v2 diz que o ciclo "deixa de existir por construção" (D2 l.207) e, no §11, que não há teste determinístico.
- **Motivo:** Revertida a mudança do D2 no `zero`, os 24 vermelhos continuam como estão e as 38 asserções continuam verdes. É o critério "incapaz de falhar" para o próprio conserto do A4. Ele está declarado (por isso é `ajuste`), mas a afirmação "por construção" fica como prosa, sem prova. HIPÓTESE, não medida: um arranjo determinístico parece viável, com o vencedor cru travando só a primeira linha na ordem `(created_at, id)` e o `zero` em tabela pequena, cuja ordem física foi invertida por um PATCH prévio (a tupla atualizada vai para o fim do heap). Fica para quem planeja decidir.

### B4 — Item do mandato da C2 impossível de passar: "`prisma migrate diff` limpo"
- **Gravidade:** `ajuste` · **Escopo:** `dentro-do-bloco` (o item nasceu na v2, §9 l.443; não está no mandato da v1).
- **Evidência:** E2. A ref já tem índices PARCIAIS que o Prisma não modela (`schema.prisma` l.2028-2033) e FKs "só no SQL" (l.1876-1880). A FK nova de 4 colunas também fica só no SQL (v2 §5 l.297, "scalar-only"). Não há checagem de drift na CI nem script `migrate diff` no repo. Não executei `migrate diff` (exige banco descartável ou sombra; Docker proibido nesta crítica): a conclusão é por leitura, não por execução.
- **Motivo:** Um diff entre as migrações e o datamodel vai mostrar esses objetos como drift no head do bloco, como já mostraria na `main`. Uma cadeira que leve o item a sério reprova por construção, e é essa a patologia que o §C7.4(a) do CLAUDE.md nomeia ("critério impossível de passar") e que a auditoria de 2026-08-28 mediu em 11 de 16 bloqueantes. A própria v2 levanta a dúvida no §8(2) e mesmo assim põe o item como obrigatório no mandato.

### B5 — O texto da decisão atribui ao dono a FK "de 4 colunas", e o índice auxiliar é objeto de `prisma/` que o dono não nomeou
- **Gravidade:** `ajuste` · **Escopo:** `dentro-do-bloco`.
- **Evidência:** respostas do dono: "sim para tudo" às Q1-Q3, com Q2 = coluna `parent_title_id` "(FK composta RESTRICT), além da troca do índice", e a instrução de registrar "com estas palavras". A v2 §2 l.146, no parágrafo que se apresenta como "decisão do dono, 2026-10-19", insere "na forma de 4 colunas do §5, que amarra organização, OS e direção". O §2 l.150 e o §11 R8 tratam o índice auxiliar como "ampliação nominal" que a C2 ratifica.
- **Motivo:** O mérito é bom: a FK de 4 colunas fecha o A6 e o índice é aditivo e inerte. O problema é de registro. O texto que vai para `decisoes.md` como palavra do dono passa a conter algo que o dono não viu, e isso mistura fato com derivação, o que o §A6 proíbe e o §C7.6-bis exemplifica ("um contrato de execução não pode apresentar derivação como declaração"). E o §C4 exige autorização explícita para `prisma/**`: a v2 transfere essa autorização para uma cadeira de junta, sem que o texto da decisão diga que houve transferência.

## 3. As mudanças de alvo são legítimas?

| mudança | legítima? | por quê |
|---|---|---|
| T-A4: 409/1 título → 201 complementar/2 títulos | **SIM** | O alvo antigo contradizia o desenho que o dono aprovou (Q1). O novo é o que o PG 16 entrega sob `FOR UPDATE` + READ COMMITTED (E3, M17). Não se afrouxou nada: a recusa do 2º original passou ao T-A4b, com o P2002 de verdade. |
| Passo 0 fora da unidade | **SIM** | Restaura a precedência viva (409/422 antes do período). Conferi a H11: o passo 0 só LANÇA erro, nunca grava. Se ele passa e o conjunto esvazia na corrida, o passo 3 decide sobre dado travado. Se ele recusa e um item chega logo depois, a resposta é 409/422 sem efeito, e a repetição fatura. Nenhum desfecho de dinheiro depende dele. |
| FK de 4 colunas + índice auxiliar | **SIM no mérito**, ressalva B5 | Fecha a parte do A6 que é de banco (mesma OS, direção e organização). Inerte para o legado (`parent` NULL). O down está completo (FK e índice saem antes da coluna). |
| 503 `invoice_transient_conflict` | **SIM** | Mesma classificação por código, em dois níveis, do `checklist-prisma.repository.ts:1166-1200` (E2), e o 03a já responde 503 a transitório. Repetir é seguro independentemente do desfecho, porque o carimbo impede faturar o mesmo item duas vezes. Nenhum consumidor quebra (H6). |
| `RBAC_MATRIX.md` l.122 no escopo | **SIM** | Fecha o A7. Escopo cirúrgico (só a frase); o texto novo descreve o mecanismo real. |

## Veredito
**APROVA COM AJUSTES**: 0 `bloqueia` e 5 `ajuste` (B1–B5), todos `dentro-do-bloco`. Os dois `bloqueia` da r1 (A1, A2) fecharam com teste e mutação que os derrubam (E3). O desenho e a migração resistem a esta rodada. O que sobra é a precisão da prova e do registro: a tradução de 409 perto demais da unidade (B1); um "mata" com mecanismo errado (B2); o conserto do A4 sem teste que o derrube (B3); um item de mandato impossível de passar (B4); e o texto da decisão atribuído ao dono (B5). Nenhum deles mexe em dinheiro, isolamento ou permissão. Pelo protocolo do plano, ajustes não exigem v3 para o dev começar, mas devem virar emenda escrita. Este crítico não propõe as correções (§C7.4-bis). Esta é a última rodada de crítica (máximo de 2).

Limpeza: nenhum artefato além deste arquivo; nenhum worktree, contêiner, porta ou banco; repositório não editado.
