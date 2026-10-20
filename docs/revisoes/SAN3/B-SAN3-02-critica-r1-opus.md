# B-SAN3-02 — 2ª crítica adversarial do plano (critico-san3-02-opus)

- **Papel:** crítico adversarial (2º crítico; o Gemini não é revisor único — decisão de 14/10). **Modelo:** Claude Opus 5.5 (`claude-opus-5-5`), nível menor, declarado. Identidade nova; não escrevi o plano, não implemento, não voto.
- **Objeto:** `C:/Users/AMP/erp-pausa-2026-10-03/planos/B-SAN3-02-plano.md` + respostas do dono (Q1/Q2/Q3 = SIM) + 1ª crítica (Gemini) lida como DADO.
- **Veredito:** VOLTA AO PLANO — 2 bloqueia · 7 ajuste (6 próprios + 1 do Gemini confirmado)

## Evidência incremental (P1)

### E1 — ref
- `git fetch -q origin && git rev-parse origin/main` → `3fbcaea2ba3cd1d39a42ff8943a2cc0086ef010d` (a mesma do plano).
- Veredito parcial: medição na ref do plano.

### E2 — serviço e repositório de itens
- `git show origin/main:src/modules/work-order-financials/work-order-financial.service.ts | cat -n | sed -n '150,460p'` → pré-check l.357, leitura l.362, `createForWorkOrder` l.378, `markInvoiced` l.400, `assertItemNotInvoiced` l.174/l.230: batem com o plano.
- `git show origin/main:src/modules/work-order-financials/work-order-financial-prisma.repository.ts | cat -n` → `update` l.76-77 e `softDelete` l.95-96 sem `invoiced_at`; `softDeleteAllByWorkOrder` l.106 com; `markInvoiced` l.116-126 filtra `deleted_at`/`invoiced_at` e devolve `count`: batem.
- Veredito parcial: as premissas F2/F4 procedem.

### E3 — títulos (repositório Prisma e InMemory) e UoW
- `git show origin/main:src/modules/financial-titles/financial-title-prisma.repository.ts | cat -n | sed -n '89,94p;287,296p;463,482p'` → `findActiveByWorkOrder` filtra só `deleted_at: null` (status ignorado; título `cancelled` conta como ATIVO); wrapper RLS do `create` toma a trava SHARED in-tx; P2002 sem "source" no alvo → `workOrderAlreadyInvoicedError`; P2003 sem "work_order" no alvo → `invalidAccountReferenceError`.
- `git show origin/main:src/modules/financial-titles/financial-title.repository.ts | cat -n | sed -n '161,212p'` → InMemory `findActiveByWorkOrder` = `[...this.titles.values()].find(...)` (ordem de INSERÇÃO do Map; devolve o 1º título ativo).
- `git show origin/main:src/modules/financial-titles/financial-title.service.ts | grep -n -E 'cancel|changeStatus|async delete'` → cancelar = `changeStatus` (status `cancelled`, `deleted_at` continua NULL); remover = `delete` lógico.
- `git show origin/main:prisma/migrations/20260811000000_add_invoicing/migration.sql | cat -n` → l.5-6 diz que `deleted_at IS NULL` "deixa de fora os títulos cancelados (delete lógico)"; o código trata cancelado por status como ativo.
- `git show origin/main:src/modules/financial-uow/financial-uow-prisma.ts` → 3 repositórios no mesmo `tx` de `withTenantRls`; sem opção de timeout.
- Veredito parcial: F3/F5/F7 procedem; achado novo sobre `cancelled` (ver A5) e sobre a ordem do Map (ver A2).

### E4 — integridade, RLS e contrato vivo
- `git show origin/main:prisma/migrations/20260803000000_add_work_order_financial_items/migration.sql` l.51-52, 63-65 → FK composta `(tenant_id, work_order_id) → work_orders(tenant_id, id)`; policy `tenant_isolation` USING/WITH CHECK por `app.current_tenant_id`. `work_orders.id` é PK UUID → `work_order_id = X` já fixa o tenant.
- `git show origin/main:prisma/migrations/20260810000000_add_financial_titles/migration.sql` l.50, 65-68 → `financial_titles_tenant_id_id_key` existe (alvo da FK composta do `parent_title_id`); ENABLE+FORCE RLS.
- `git show origin/main:src/database/financial-period-lock.ts | sed -n '1,50p'` → advisory SHARED só em `financial-title-prisma.repository.ts:281`; EXCLUSIVO só no close/reopen; regra "advisory antes de row lock" l.29-30.
- `git grep -n -E 'zeroActiveItems|hasActiveInvoicedItems' origin/main -- src` → `work-order.service.ts:1525/1535` (cancel `zero` = `softDeleteAllByWorkOrder`, um `updateMany` multi-linha sem ORDER BY).
- `git show origin/main:RBAC_MATRIX.md | sed -n '122p'` → arquivo-base diz "faturar = mintar 1 título … idempotente por OS (índice PARCIAL … WHERE deleted_at IS NULL) → replay 409".
- `git show origin/main:src/modules/work-order-financials/work-order-financial.controller.ts | sed -n '19,44p'` → auditoria `{titleId, invoicedItemCount, currency}`; bate com F9.
- `git show origin/main:tests/work-order-invoicing.test.ts | grep -n '^test('` → 16 testes; l.233 fecha a competência COM item (não cobre replay em mês fechado).
- Veredito parcial: premissas citadas batem; achados A3–A8 abaixo.

### E5 — semântica de READ COMMITTED (fonte externa)
- WebFetch `https://www.postgresql.org/docs/16/transaction-iso.html` §13.2.1 → `SELECT FOR UPDATE` "só acha linhas commitadas no início do comando"; se a linha estiver travada, ESPERA; após o commit do outro, o WHERE é reavaliado contra a versão nova e é ESSA versão que volta travada (a linha que deixou de casar fica de fora).
- Veredito parcial: base do A1.

---

## Achados

### A1 — O T-A4 espera o resultado errado, e nenhum teste do plano chega ao caminho "P2002 dentro da unidade" (nem à H2)
- **Gravidade:** `bloqueia` · **Escopo:** `dentro-do-bloco` (é o §7.1 do próprio plano).
- **Evidência:** o plano, §7.1 T-A4: "dois primeiros faturamentos concorrentes com itens distintos (o 2º item é inserido após o vencedor travar o 1º): vencedor segura após o INSERT do título; perdedor real tenta → perdedor: 409 `already_invoiced`; 1 título". A convenção do §7 diz que o vencedor é "conexão crua com as peças do produto na ordem do produto (… → `acquirePeriodLockShared` → `SELECT … FOR UPDATE` → …)". O passo 2 de D1 é `SELECT … WHERE deleted_at IS NULL AND invoiced_at IS NULL … FOR UPDATE` sobre TODOS os itens não carimbados da OS. E5 (docs do PG 16): o comando do perdedor enxerga i1 (commitado, ainda sem carimbo) e i2, ESPERA a trava de i1, e depois do commit do vencedor reavalia o WHERE: i1 sai (carimbado), i2 fica travado. O passo 3 (`findActiveByWorkOrder`, novo comando em READ COMMITTED) já enxerga o original do vencedor. Resultado do desenho correto: **201 complementar com i2, 2 títulos**, e não 409 com 1 título.
- **Motivo:** (1) O teste, como escrito, falha contra a implementação correta. O dev fica entre dobrar o código para bater com o teste (reintroduzindo a recusa do delta numa corrida) e reescrever o teste por emenda implícita, que o §8 do plano proíbe. (2) Generalizando: duas faturas do produto na mesma OS sempre se serializam pelo `FOR UPDATE` dos itens, porque o conjunto do perdedor contém o do vencedor. Pelo caminho do produto, o P2002 do índice dentro da unidade é inalcançável. Assim, a afirmação da P1/K1 ("P2002 na unidade → rollback completo → 409") e a H2 (`meta.target` → `already_invoiced`) ficam sem teste que as exercite. O T-C5-db "pela rota" também não chega lá: com um original cru já commitado, a rota acha o original e gera complementar (201), ou devolve 409 pelo `findActiveByWorkOrder` (sem P2002). O §4 ("corrida entre dois primeiros faturamentos → um 201 original; o outro 409 … ou 422/409") omite o desfecho real "201 complementar". (3) A M5b não é morta pelo T-A4 (o desfecho é o mesmo com ou sem índice); só o INSERT cru do T-C5-db a mata.

### A2 — A M6 não é morta por nenhum dos testes que o plano cita (T-C2, T-C4)
- **Gravidade:** `bloqueia` · **Escopo:** `dentro-do-bloco`.
- **Evidência:** `git show origin/main:src/modules/financial-titles/financial-title.repository.ts | sed -n 204,211p`: o InMemory `findActiveByWorkOrder` é `[...this.titles.values()].find(...)`, ou seja, devolve o 1º título ativo na ordem de inserção do `Map`. O T-C2 (m) monta T1 → T2 → T3 e assere `T3.parentTitleId === T1.id`. Sob a M6 (sem o predicado de original), `find` devolve T1, o 1º inserido, e o teste fica **verde**. No T-C4, T1 está removido e não há complementar ativo; sob a M6, `find` não acha nada, `parentTitleId` fica null e o teste fica **verde**. A própria célula do T-C4 no plano registra a dúvida ("acharia T1 deletado? não"). No Prisma, `findFirst` sem `ORDER BY` tende a devolver a ordem física, também T1.
- **Motivo:** O §7 declara que as 18 mutações são "vermelho-controle obrigatório", e a C3 da junta confere "18 mutações com vermelho registrado". Como está escrito, esse passo não tem como ser cumprido para a M6. Mais: a mudança semântica que o plano introduz em `findActiveByWorkOrder` (H7, "original ativo") decide (i) se o título novo nasce original, ou seja, dentro do backstop do índice, ou complementar, fora dele, e (ii) o ramo 409 × 422 quando não há itens. Nenhum teste observa essa mudança. O cenário observável existe e não está no plano: original removido com complementar ainda ativo, seguido de um novo faturamento (com item → deve nascer ORIGINAL; sem item → 422, não 409). Efeito em dinheiro: nenhum (o carimbo segura). O que fica sem prova é a premissa "complementar nunca vira pai".

### A3 — O T-PREC não mata a M1, ao contrário do que a tabela diz
- **Gravidade:** `ajuste` · **Escopo:** `dentro-do-bloco`.
- **Evidência:** `…work-order-financial.service.ts | sed -n 373,407p`: no caminho sequencial, `createForWorkOrder` checa o período (`financial-title.service.ts:125`) ANTES de criar o título e de carimbar. Com o mês fechado, o código lança 422 sem efeito nenhum.
- **Motivo:** Sob a M1 ("voltar ao sequencial"), o T-PREC continua verde (422, nenhum T2, item sem carimbo). A M1 segue morta pelo T-A1 e pelo T-A2, então a cobertura não cai. Mas a tabela "mata" do §7 está errada nessa linha, e o T-PREC não tem mutação própria declarada.

### A4 — Nova superfície de deadlock: `FOR UPDATE … ORDER BY created_at, id` do faturamento × `softDeleteAllByWorkOrder` do cancelamento `zero`
- **Gravidade:** `ajuste` · **Escopo:** `dentro-do-bloco` (a trava multi-linha ordenada nasce neste bloco; hoje o faturamento não segura trava de item ao longo de uma transação).
- **Evidência:** `git grep -n -E zeroActiveItems origin/main -- src` → `work-order.service.ts:1535` → `work-order-financial-prisma.repository.ts:104-109`, um `updateMany` multi-linha sem ordem, que trava na ordem de varredura (física ou de índice). Depois de qualquer PATCH (tupla nova fora de lugar no heap), essa ordem difere de `created_at, id`. A H9 e o R2 do plano só analisam a advisory × close/reopen.
- **Motivo:** Uma fatura e um cancelamento `zero` concorrentes na mesma OS podem travar i1→i2 e i2→i1. O PG detecta (40P01) e aborta um dos dois. O dado está a salvo (rollback), mas o erro sai sem mapeamento (500), e o risco não está nem declarado nem coberto pela H9. Isso entra na mesma classe da pendência `P-SAN3-02-OS-NAO-TRAVADA`, mas o mecanismo é outro.

### A5 — "Original ativo" inclui título com status `cancelled`: o complementar nasce filho de um cancelado, e nenhum teste cobre isso
- **Gravidade:** `ajuste` · **Escopo:** `dentro-do-bloco` para a regra de escolha do pai (D3, nova). A semântica do índice ("cancelado por status conta como ativo") é `pre-existente`: evidência em `20260811000000/migration.sql` l.5-6 (2026-08-11), que já supunha "cancelado = delete lógico", e no `findActiveByWorkOrder` da ref (l.89-94), que só filtra `deleted_at`.
- **Evidência:** `financial-title.service.ts` → cancelar é `changeStatus` (status `cancelled`, `deleted_at` NULL). `financial-title-prisma.repository.ts:89-94` não olha o status. O D3 do plano diz "pai = o original ATIVO", e os T-C* cobrem pago (T-C3) e removido (T-C4), mas não cancelado.
- **Motivo:** OS com T1 cancelado por status e item novo: pelo desenho, nasce um complementar com `parentTitleId = T1` (cancelado). A rastreabilidade que a tela `SAN3-25` vai exibir ("complementar de T1") passa a apontar para uma cobrança anulada, e o operador não tem como faturar de novo os itens de T1 (D-Ω4-C1). O plano não declara esse comportamento, não o testa e não abre pendência para ele.

### A6 — O banco não amarra o complementar ao ORIGINAL da MESMA OS, e o índice isenta qualquer linha com `parent_title_id` preenchido
- **Gravidade:** `ajuste` · **Escopo:** `dentro-do-bloco`.
- **Evidência:** §5 do plano: a FK é `(tenant_id, parent_title_id) → financial_titles(tenant_id, id)`, o que fecha o caso de OUTRA ORGANIZAÇÃO (as checagens de FK não passam pela RLS, mas o `tenant_id` está na chave). O CHECK é só `work_order_id IS NOT NULL AND parent_title_id <> id`. Nada impede `parent_title_id` de apontar para um título de OUTRA OS, de outra direção, para um título avulso (sem OS) ou para outro complementar. O índice novo tem `… AND parent_title_id IS NULL`. Em `financial-title-prisma.repository.ts:474-479`, um P2003 da FK nova (alvo sem "work_order") seria traduzido como `invalid_account_reference`.
- **Motivo:** O "no máximo um ORIGINAL ativo" (P4), que o §5 do SAN3 exige como backstop de banco, só vale para quem não preenche `parent_title_id`. Qualquer escrita que preencha a coluna escapa do índice. Hoje só o caminho de faturamento escreve nela, então a garantia de "pai = original da mesma OS" é **app-level**, e o plano a vende como âncora de banco ("três delas no banco"). O dinheiro continua protegido pelo carimbo do item; o que fica fraco é a afirmação. O §8 (6) do próprio plano levanta o CHECK de direção, mas não responde.

### A7 — Arquivo-base `RBAC_MATRIX.md` l.122 contradiz o comportamento novo, e o plano não o atualiza nem registra a divergência
- **Gravidade:** `ajuste` · **Escopo:** `dentro-do-bloco`.
- **Evidência:** `git show origin/main:RBAC_MATRIX.md | sed -n 122p` → "faturar = mintar 1 título … idempotente por OS (índice PARCIAL `(tenant_id,work_order_id,direction) WHERE deleted_at IS NULL` → replay 409 already_invoiced)". O §6.1 PERMITIDO do plano não lista `RBAC_MATRIX.md`, e o §10 registra só `decisoes.md`/`pendencias.md`.
- **Motivo:** Pela §A1, `RBAC_MATRIX.md` é fonte nº 2, acima da implementação. Depois do bloco, a fonte de verdade descreverá o índice velho e "1 título por OS". O próximo agente que medir pela fonte vai acusar o código de violá-la. A §A2 exige registrar o conflito antes de consolidar, e a decisão do dono (fonte nº 1) cobre o mérito, mas não o registro.

### A8 — "Única diferença de precedência" é falsa: replay em mês fechado passa de 409 para 422
- **Gravidade:** `ajuste` · **Escopo:** `dentro-do-bloco`.
- **Evidência:** ref l.357-359: hoje o pré-check `already_invoiced` vem ANTES do período (que só é checado em `createForWorkOrder`). D1 põe `assertPeriodOpenShared` como passo 1, antes do ramo 409/422. O plano (§3 D1) diz: "Única diferença contra hoje: `period_closed` passa a vir antes de `nothing_to_invoice`".
- **Motivo:** O replay de uma OS já faturada, com a competência corrente fechada, hoje responde 409 `already_invoiced` e passa a responder 422 `period_closed`. A diferença é pequena, mas é premissa não medida num contrato que o plano declara "como hoje". Nenhum teste vivo cobre esse caso (l.233 fecha o mês com item e sem título).

---

## Conferência da 1ª crítica (Gemini), lida como DADO

### G1 — M3/T-A3 "código inalcançável usado como critério" → **NÃO PROCEDE como defeito**
- Comando: `…work-order-financial-prisma.repository.ts | sed -n 112,127p` + E5. É verdade que, sob `FOR UPDATE`, o `if (stamped !== items.length)` é inalcançável, mas o próprio plano já declara isso (§7.5: "M3 só morre em memória … declarado, não escondido"). A conclusão do Gemini, porém, está errada: essa guarda é justamente o que torna a M2 OBSERVÁVEL no T-R2. Sob a M2 (sem `FOR UPDATE`), o perdedor lê o item ainda vivo, cria o título, o `markInvoiced` espera a trava do DELETE e, depois do commit deste, o WHERE é reavaliado, o item sai, a contagem fica em n−1 e a resposta é 409 em vez de 201. O T-R2 fica vermelho. Sem a guarda, a M2 produziria o defeito original (título maior que o lastro), visível só pelas asserções de valor. É defesa em profundidade que tem teste e efeito. Fica.

### G2 — M16/T-RLS "teste de implementação em vez de comportamento" → **PROCEDE** (`ajuste`, `dentro-do-bloco`)
- Comando: E4 (`20260803000000` l.51-52: FK composta `(tenant_id, work_order_id) → work_orders(tenant_id, id)`, com `work_orders.id` PK UUID). Tirar `tenant_id` do WHERE do `FOR UPDATE` é uma **mutação equivalente**: `work_order_id = X` já confina o resultado a um único tenant, com ou sem RLS e mesmo sob papel com BYPASSRLS. Nenhum efeito observável pode matá-la. O plano diz que o teste "assere a forma do SQL", e isso é a patologia que o CLAUDE.md §C7.4(a) nomeia como artefato de processo ("guarda que reconhece forma em vez de enunciar propriedade"). O Gemini acerta no diagnóstico. O motivo exato é ser mutante equivalente, mais do que "a RLS esconde".
- Observação: o restante da avaliação do Gemini ("o índice impede de verdade dois originais sob corrida", "T-A4 cobre a corrida") herda o erro do A1. A corrida não chega ao índice.

---

## Premissas conferidas que PROCEDEM (sem achado)
- Todas as linhas de código citadas no §0 e no §3 batem com `origin/main = 3fbcaea2` (E2, E3, E4).
- H5: o legado tem `parent_title_id` NULL, então o conjunto de chaves do índice novo é idêntico ao do velho, que já é único. A migração não quebra por dado legado. ADD COLUMN/FK/CHECK são aditivos, e o DROP do índice velho estava autorizado pelo §5 do SAN3. O down está documentado nas duas pontas.
- Ordem de travas: advisory SHARED (passo 1) antes do `FOR UPDATE` (passo 2). A re-chamada do mesmo advisory em `createForWorkOrderInUnit` é reentrante e não cria auto-deadlock. Close/reopen só tomam o EXCLUSIVO e não travam itens.
- CAS de PATCH/DELETE (D2) com releitura → 422/404: correto sob EvalPlanQual. O T-R1 e o T-R4 matam a M4 e a M4′.
- Complementar de OUTRA organização: fechado pela FK composta com `tenant_id`.
- Q3: a ampliação (repositório de itens no contexto, mapa `satisfies` com 11 membros, journal) é a mínima para a causa-raiz "fora do `financial-uow`". A interface tem `reset?` (l.28), o que bate com `test_reset`. Os 4 pontos de construção (`financial-uow.ts:392`, `financial-entries.test.ts:519`, `financial-uow-memory.test.ts:37`, harness `repos()`) estão confirmados.
- `APPROVAL_LIMITS.md` não tem alçada por valor de título ou de faturamento (grep vazio), então quebrar a cobrança em complementares não contorna nenhuma alçada.

## Veredito
**VOLTA AO PLANO**: 2 `bloqueia` (A1, A2), 6 `ajuste` próprios (A3–A8) + 1 `ajuste` do Gemini confirmado (G2); G1 não procede. O desenho (D1–D5, a migração, Q1–Q3) é sólido. O que falha é a prova: o §7 promete um teste de corrida cujo desfecho contradiz o próprio desenho e uma mutação que nenhum teste derruba. As duas coisas viram emenda ESCRITA do §7 antes do dev (§8 do plano), por quem planeja. Este crítico não propõe a correção (§C7.4-bis).

Limpeza: nenhum artefato criado fora deste arquivo; nenhum worktree, contêiner, porta ou banco. Repositório não editado.
