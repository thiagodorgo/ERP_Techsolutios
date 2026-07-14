# DOSSIÊ INICIAL DE DIVERGÊNCIA — Paridade Painel Logístico × ERP (Ω3F-0)

**Agente:** fid-analista (rodada Ω3F) · **Data:** 2026-07-13
**Fonte da matriz:** `docs/referencia/alinhamento-painel-logistico.md` (auditada em 13/jul, seção 2).
**Método:** revisão de CADA linha por grep no `main` de hoje. Nunca afirmo sem evidência
`arquivo:linha`. Onde o repo divergiu da spec (PRs mergeados DEPOIS da auditoria), reclassifico e
marco `(revisado: era X → agora Y por <PR/módulo>)`.

Estado do repo consultado: HEAD `7d5d984` (feat(map): Google Maps no Mapa Operacional #179).
PRs relevantes mergeados após a auditoria da spec: #164–#169 (Ω2-a..e), #170 (Ω3-a ServiceQuote),
#171 (Ω3-b comentários), #172 (Ω3-c checklist snapshot), #173 (Ω3-d anexos de OS), #178 (Junta de
Mapas), #179 (Google Maps no Mapa Operacional).

---

## 1. Matriz de 35 capacidades — REVISADA

Classes: ✅ existe · 🟡 fundação pronta, falta a feature · 🔴 não existe.

| # | Capacidade da referência | Repo hoje (evidência `arquivo:linha`) | Classe |
|---|---|---|---|
| 1 | Lista de OS com KPI cards + tabela | `frontend/.../work-orders/pages/WorkOrdersPage.tsx`, `components/WorkOrdersSummaryCards.tsx`, `WorkOrdersFilters.tsx`, `WorkOrdersTable.tsx` | ✅ |
| 2 | Envio ao profissional c/ aceite no app | `src/modules/field-dispatch/` + `FieldDispatch`/`FieldDispatchEvent` (`prisma/schema.prisma:1525,1560`); aceite mobile B-1xx | ✅ |
| 3 | Timeline de eventos da OS | `WorkOrderEvent` (`schema.prisma:1479`); `frontend/.../work-orders/components/WorkOrderTimeline.tsx` | ✅ |
| 4 | Tipo de serviço amarrado à tabela de valores do cliente | `service-catalog` + `PriceTable`/`Tariff` (`schema.prisma:1146,1174`); resolver `resolveApplicableTariff` já existe em `service-quote.service.ts:88` MAS `WorkOrder.create` só valida existência do catálogo (`work-order.service.ts:211`), **não** exige que o tipo esteja na tabela do cliente | 🟡 |
| 5 | Detalhe da OS em hub de 11 abas + barra de ações | `WorkOrderDetailPage.tsx` = **296 linhas, card único, sem abas** (grep `tab/Tabs/aba` = 0 hits); só botões "Abrir checklist"/status | 🔴 |
| 6 | Financeiro da OS (itens da tabela, total) | tabela de valores existe; **não há model `WorkOrderFinancialItem`** nem lançamento na OS (grep 0 hits) — Ω4/Ω3F-3 | 🟡 |
| 7 | Orçamento na OS + aprovar→novo serviço | **`src/modules/service-quotes/` existe** (congela preço da tarifa, `service-quote.service.ts:64`), status `draft→approved/rejected/void` (`service-quote.types.ts:78`), FK opcional `work_order_id` (`schema.prisma:1216`), front `OrcamentosPage.tsx` com Aprovar/Recusar (`OrcamentosPage.tsx:173`). FALTA: multi-item, número/data/validade, item = produto do estoque, aprovar→**cria OS**, compartilhar | 🟡 *(revisado: era 🔴 → 🟡 por Ω3-a #170 + front OrcamentosPage)* |
| 8 | Orçamento standalone + compartilhar e-mail/link | ServiceQuote aceita `work_order_id = null` (standalone no dado, `service-quote.service.ts:66`) + página `OrcamentosPage.tsx` autônoma. FALTA: compartilhar link/e-mail, protocolo, abrir OS a partir dele | 🟡 *(revisado: era 🔴 → 🟡 por Ω3-a #170; workflow standalone ainda ausente)* |
| 9 | Venda de estoque na OS (origem base/viatura/prof. + flag financeiro) | `src/modules/inventory/` + `StockMovement` com `work_order_id`+`vehicle_id` (`schema.prisma:1049,1050`); mobile-inventory-sync. FALTA vínculo OS+financeiro e flag "cadastrar no financeiro"; origem "base" não modelada | 🟡 |
| 10 | Comentários da OS com tags | **Comentários EXISTEM**: `work-order.service.ts:507 addComment`, rota `POST /work-orders/:id/comments` (`work-order.routes.ts:137`), evento `work_order_comment` (`work-order.types.ts:27`), corpo livre ≤4000 (`work-order.validators.ts:36`). FALTA **tags no comentário** | 🟡 *(revisado: era 🔴 → 🟡 por Ω3-b #171; só falta tags)* |
| 11 | Arquivos da OS (app sobe, base vê/baixa/sobe) | **`WorkOrderAttachment`** (`schema.prisma:956`) + rotas list/create/download/delete (`work-order.routes.ts:147-171`), `work-order-attachment.{service,controller,storage}.ts`; status AV-scan (`stored`) + `client_action_id` (upload mobile) (`schema.prisma:967,968`) | ✅ *(revisado: era 🟡 → ✅ por Ω3-d #173; UI-aba pende no hub Ω3F-5, mas capacidade/rota/AV-scan/mobile prontos)* |
| 12 | Aba Mobile: etapas c/ data/hora + posição no mapa por etapa | `FieldDispatchEvent` (`schema.prisma:1560`) + `FieldOperatorLocation` (`schema.prisma:731`) existem; falta a tela composta | 🟡 |
| 13 | Checklist compartilhável (PDF/link/imagem/e-mail/WhatsApp) c/ registro | execução + evidências (`src/modules/checklists/`, `evidence/`) + `checklist_snapshot` na OS (`schema.prisma:1433`); compartilhamento multi-formato não | 🟡 |
| 14 | Mensagens base↔profissional na OS | inexistente (grep 0); comentários são base→base, não canal com o profissional | 🔴 |
| 15 | KM inicial/final (app preenche, base corrige) | inexistente — `WorkOrder` não tem campos de km (`schema.prisma:1409-1477`, grep `km` 0 hits) | 🔴 |
| 16 | Base/pátio (guarda, estadia, liberação, leilão) | inexistente — domínio novo (grep `patio/estadia/leilao` 0 hits) | 🔴 |
| 17 | Mapa da OS: rota c/ partida real/base/POI + km calculado | **POI backend** `src/modules/pois/` + model `Poi` (`schema.prisma:1292`); **Mapa Operacional com Google Maps** `GoogleMapsCanvas.tsx`, `useGoogleMapsLoader.ts` (#179) + geocode OS (`schema.prisma:1422-1425`). FALTA rota origem→destino, partida selecionável (real/base/POI) e km calculado **na OS** | 🟡 *(fundação reforçada por Ω2-d #168 POI + #179 Google Maps; feature de rota da OS ainda ausente)* |
| 18 | Logs (auditoria por OS) | **`AuditLog` global** (`schema.prisma:253`) + `src/modules/core-saas/audit/audit-log.service.ts`; **não há rota de leitura/visão filtrada por OS** (grep de rotas audit = só *writers*: commission, cycle-count) | 🟡 |
| 19 | Cancelar com decisão financeira (manter/sem remunerar/zerar) | cancel simples c/ motivo (`WorkOrder.cancellation_reason` `schema.prisma:1443`); sem decisão financeira | 🟡 |
| 20 | Imprimir configurável por seção | inexistente (grep 0) | 🔴 |
| 21 | Duplicar com opções (nº novo, data, comentários, checklist) | inexistente (grep 0) | 🔴 |
| 22 | Copiar URL (deep link da OS) | rota por id existe (`WorkOrderDetailPage`); **sem botão copiar** (grep `copy/clipboard` no detail = 0) | 🟡 |
| 23 | Campos dinâmicos por tipo (socorro/reboque/residencial) | create genérico; `WorkOrder` tem só `service_address` único, **sem destino** (`schema.prisma:1418`) | 🔴 |
| 24 | Origem E destino na OS (reboque) | `service_address` único no schema (`schema.prisma:1418`); sem `origin_*`/`destination_*` | 🔴 |
| 25 | Beneficiário ≠ cliente pagador (obrigatoriedade configurável) | `customer_name`/`customer_phone` inline separados de `customer_id` (`schema.prisma:1415,1417,1434`); `TenantSetting` key-value (Ω2-e, `schema.prisma:1317`) é fundação p/ a config, mas obrigatoriedade não está ligada | 🟡 |
| 26 | Recorrência de serviço (+ itens financeiros e tarefas) | inexistente (grep `recorren/recurrence` 0) | 🔴 |
| 27 | Tags coloridas custom por OS | **`src/modules/tags/` + model `Tag` com `color`** hex (`schema.prisma:1269,1273`) + front `TagsPage.tsx`. FALTA junção OS↔Tag: `Tag` só relaciona com `Tenant` (`schema.prisma:45`), sem `work_order_tags` | 🟡 *(revisado: era 🔴 → 🟡 por Ω2-d #168; registry pronto, falta vínculo na OS)* |
| 28 | Ocorrências por beneficiário c/ alerta em novo cadastro | inexistente (grep 0) | 🔴 |
| 29 | Dar andamento manual (base avança etapa) | máquina de estados + transições existem (`field-dispatch`, `work-order.service.ts`); falta expor ação "forçar etapa" auditada | 🟡 |
| 30 | Cancelar operação logística (desfazer envio p/ reenviar) | `FieldDispatch` com `cancelled_at`/`reason` (`schema.prisma:1532,1540`); expor "revogar envio" a verificar | 🟡 |
| 31 | Atraso (estouro da previsão de chegada) sinalizado na lista | `scheduled_for`/`arrived_at` existem (`schema.prisma:1438,1440`); falta previsão de chegada (ETA) + badge | 🟡 |
| 32 | Copiar texto pronto p/ WhatsApp | trivial client-side; não implementado (grep `whatsapp` no front WO = 0) | 🔴 |
| 33 | SMS de rastreio p/ beneficiário → vira avaliação | inexistente (fase 2/3, canal cliente final) | 🔴 |
| 34 | Visualizar finalizados: colunas configuráveis + Excel + busca avançada | lista existe; export/colunas/busca avançada não | 🟡 |
| 35 | Importar serviços da plataforma da assistência/seguradora | inexistente (integração externa, pós-piloto) | 🔴 |

### Placar

| | ✅ | 🟡 | 🔴 |
|---|---|---|---|
| **Spec (13/jul)** | 3 | 15 | 17 |
| **Repo hoje (revisado)** | **4** | **18** | **13** |

**Delta:** 5 linhas mudaram de classe — 4 subiram 🔴→🟡 (#7, #8, #10, #27) e 1 subiu 🟡→✅ (#11).
Nenhuma regrediu. Os "novos de verdade" (🔴 sem fundação) caíram para: hub de abas (#5, é UI sobre
dados existentes), campos dinâmicos/origem-destino (#23/#24), mensagens ao profissional (#14), KM
(#15), Base/pátio (#16), imprimir (#20), duplicar (#21), recorrência (#26), ocorrências (#28),
WhatsApp text (#32, trivial), SMS (#33), importação (#35).

---

## 2. Blocos da Fase 1 (Ω3F-1..9) — capacidades, delta e dependências

### Ω3F-1 — Hub da OS (abas + barra de ações + Copiar URL + texto WhatsApp)
- **Capacidades:** #5 (hub de abas), #22 (copiar URL), #32 (texto WhatsApp).
- **Delta:** `WorkOrderDetailPage.tsx` (296 linhas) é card único sem abas — precisa virar shell com
  menu lateral interno + barra `Cancelar/Imprimir/Duplicar/Copiar` (esqueleto). Copiar URL e texto
  WhatsApp são client-side triviais (0 no repo hoje).
- **Fundações que já existem:** `WorkOrderDetailPage.tsx`, `WorkOrderTimeline.tsx`,
  `WorkOrderStatusActions.tsx`, `WorkOrderDetailPanel.tsx` — viram conteúdo das abas.
- **Dependências:** **é o container** das abas entregues por Ω3F-3, -4, -5, -7, -8. Deve vir 1º; os
  demais penduram conteúdo nele. Sem back-end novo.

### Ω3F-2 — Origem/destino + campos dinâmicos por tipo
- **Capacidades:** #23 (campos dinâmicos), #24 (origem E destino).
- **Delta:** migração **aditiva** `origin_*`/`destination_*` no `WorkOrder` (hoje só
  `service_address` único, `schema.prisma:1418`); formulário dirigido por `service_catalog`
  (reboque = 2 endereços; socorro = placa/veículo/cor; residencial = senha/objeto/descrição).
- **Fundações:** `service_catalog` (`schema.prisma:1120`) já classifica tipo; geocode de OS já
  aceita endereço (`schema.prisma:1422`).
- **Dependências:** toca `prisma/**` (fora do escopo padrão — exige autorização C4). **Alimenta
  Ω3F-8** (rota origem→destino no mapa). Independente do hub.

### Ω3F-3 — Financeiro da OS
- **Capacidades:** #6 (itens da tabela + total), #4 (validação "tipo na tabela do cliente" no create).
- **Delta:** novo model `WorkOrderFinancialItem` (inexistente) ligado à `PriceTable`/`Tariff` do
  cliente; lançamento/edição inline/total automático; "+" item avulso (ex.: pedágio).
- **Fundações:** `PriceTable`/`Tariff` (`schema.prisma:1146,1174`); **resolver reutilizável**
  `resolveApplicableTariff` em `service-quote.service.ts:88,212` (mesma lógica do congelamento).
- **Dependências:** back-end novo + prisma. **Alimenta Ω3F-4** (itens do orçamento) e **Ω3F-6**
  (decisão financeira do cancelamento). Renderiza como aba dentro do hub Ω3F-1.

### Ω3F-4 — Orçamento (na OS + standalone)
- **Capacidades:** #7 (orçamento na OS + aprovar→cria OS), #8 (standalone + compartilhar).
- **Delta:** hoje `ServiceQuote` é **item único** com `draft→approved/rejected/void`
  (`service-quote.types.ts:78`) e SEM criação de OS. Falta: multi-item, número/data/validade,
  item = produto do estoque, `approved`→**cria OS** com modo de acionamento, compartilhar link/e-mail.
- **Fundações:** `src/modules/service-quotes/` completo (back) + `OrcamentosPage.tsx`/
  `ServiceQuoteFormModal.tsx` (front) com Aprovar/Recusar (`OrcamentosPage.tsx:173`); FK
  `work_order_id` opcional já existe (`schema.prisma:1216`).
- **Dependências:** reusa itens de **Ω3F-3** (financeiro); item = produto do estoque cruza com **#9
  (Fase 2)**. Aprovar→cria OS depende do create de OS (Ω3F-2 para origem/destino). Aba no hub Ω3F-1.

### Ω3F-5 — Comentários (c/ tags) + Arquivos da OS
- **Capacidades:** #10 (comentários com tags), #11 (arquivos — **já ✅ no back**), parte de #14.
- **Delta:** comentários existem (`work-order.service.ts:507`) mas **sem tags** — falta relacionar
  `Tag`↔comentário; anexos de OS estão **completos no back** (`WorkOrderAttachment` + rotas
  `work-order.routes.ts:147-171` + AV-scan) — falta só **a aba/UI** (app→base e base→app já
  suportados por `client_action_id`/status).
- **Fundações:** `addComment`, `work_order_comment` event; `work-order-attachment.*`; `Tag` com
  `color` (`schema.prisma:1269`).
- **Dependências:** tags no comentário reusa o registry de #27; ambas as abas moram no hub Ω3F-1.

### Ω3F-6 — Cancelar c/ decisão financeira + Duplicar + Imprimir
- **Capacidades:** #19 (cancelar c/ decisão financeira), #21 (duplicar c/ opções), #20 (imprimir).
- **Delta:** cancel hoje só grava `cancellation_reason` (`schema.prisma:1443`) — falta o pop-up de
  decisão (manter valores / manter sem remunerar / zerar itens). Duplicar e Imprimir inexistentes.
- **Fundações:** máquina de cancelamento no `work-order.service.ts`; `checklist_snapshot`
  (`schema.prisma:1433`) e comentários são copiáveis no duplicar.
- **Dependências:** decisão financeira do cancelamento depende de **Ω3F-3** (existir item financeiro
  para manter/zerar). Barra de ações vive no hub Ω3F-1.

### Ω3F-7 — KM real + aba Mobile
- **Capacidades:** #15 (km inicial/final app+base), #12 (etapas c/ hora + posição por etapa), #13
  (preview do checklist).
- **Delta:** `WorkOrder` **não tem campos de km** (`schema.prisma:1409-1477`) — migração aditiva +
  app preenche + base corrige. Aba Mobile é tela composta ainda inexistente.
- **Fundações:** `FieldDispatchEvent` (`schema.prisma:1560`) = timeline de etapas;
  `FieldOperatorLocation` (`schema.prisma:731`) = posição por validação; `checklist_snapshot`
  (`schema.prisma:1433`) = preview.
- **Dependências:** aba mora no hub Ω3F-1; toca prisma (km). Independente de Ω3F-2..6.

### Ω3F-8 — Aba Mapa da OS + aba Logs
- **Capacidades:** #17 (rota origem→destino, partida real/base/POI, km estimado), #18 (Logs
  filtrados por OS).
- **Delta:** Mapa Operacional já usa Google Maps (`GoogleMapsCanvas.tsx`, #179) e POI existe
  (`src/modules/pois/`, `schema.prisma:1292`) — falta **cálculo de rota origem→destino na OS**,
  partida selecionável (posição real/base/POI) e km estimado. Logs: `AuditLog` global existe
  (`schema.prisma:253`) mas **não há rota de leitura filtrada por OS**.
- **Fundações:** Google Maps + `useGoogleMapsLoader.ts`; POI back+front; `AuditLog` +
  `audit-log.service.ts`.
- **Dependências:** rota depende de **Ω3F-2** (origem/destino no modelo). Passa pela **Junta de
  Mapas** (#178). Logs exige nova rota de leitura de `AuditLog` por `entity_id` da OS. Abas no hub.

### Ω3F-9 — Ações de linha (dar andamento, revogar envio, badge de atraso)
- **Capacidades:** #29 (forçar etapa auditada), #30 (revogar envio p/ reenviar), #31 (badge de atraso).
- **Delta:** expor ação "forçar etapa" com auditoria; expor "revogar envio" (`FieldDispatch` já tem
  `cancelled_at`/`reason`, `schema.prisma:1532,1540`); computar ETA + badge de atraso (hoje só
  `scheduled_for`/`arrived_at`, `schema.prisma:1438,1440`, sem previsão de chegada).
- **Fundações:** máquina de estados + `FieldDispatch`; `WorkOrderEvent` p/ registrar a ação.
- **Dependências:** badge aparece na lista (#1, já ✅); ações reusam o menu ⋮ da linha. Menor
  acoplamento — pode correr em paralelo ao hub.

---

## 3. Pendências / divergências da análise

1. **ServiceQuote cobre "orçamento" só parcialmente (relação com Ω3F-4).** O que existe é um
   **item único** que congela preço da tarifa (anti-refaturamento, `service-quote.service.ts:64`) com
   `draft→approved/rejected/void` — NÃO é o orçamento multi-item da referência (número/data/validade,
   itens de tabela OU produto de estoque, aprovar→**nasce OS**). Decisão para a Junta: Ω3F-4 **estende**
   o `ServiceQuote` (adiciona itens/cabeçalho/ação criar-OS) ou cria uma entidade `Quote`+`QuoteItem`
   nova mantendo o `ServiceQuote` como o congelador de preço por item? Recomendo estender/agrupar para
   não duplicar a lógica de congelamento.

2. **#8 standalone x #7 embutido.** O mesmo model serve os dois (FK `work_order_id` nullable). Falta
   decidir se "standalone" e "na OS" são a mesma tela filtrada por contexto ou duas rotas — a spec
   (seções 1.3 e 1.5) trata como fluxos distintos com logs/compartilhamento próprios.

3. **Base/pátio (#16) é o único domínio 100% novo** (Fase 2, não Fase 1). A pendência §5.1 da spec
   (validar modelagem em junta antes de construir) segue aberta — nenhum bloco da Fase 1 depende dele.

4. **Recorrência (#26)** — pendência §5.2 da spec (entra no v1?) segue aberta; nenhum outro item
   depende dela. Fora da Fase 1.

5. **Tags: registry x vínculo (#27 e #10).** `Tag` com `color` existe (Ω2-d) mas só liga a `Tenant`
   (`schema.prisma:45`). Precisa de junção para DOIS consumidores: tags na OS (#27) e tags no
   comentário (#10, Ω3F-5). Vale um único modelo polimórfico de vínculo ou duas junções — decidir na
   modelagem do Ω3F-5.

6. **Logs por OS (#18) precisa de rota de leitura.** Há `AuditLog` gravado, mas o grep não encontrou
   endpoint de leitura de auditoria (só *writers*). Ω3F-8 terá de **criar a rota** de listagem por
   `entity='work_order'`/`entity_id`, não só uma tela.

7. **#4 validação "tipo na tabela do cliente".** O resolver já existe (`resolveApplicableTariff`,
   `service-quote.service.ts:88`) mas o `WorkOrder.create` só checa existência do catálogo
   (`work-order.service.ts:211`). Ω3F-3 deve **reusar** o resolver no create — não reimplementar.

8. **Migrações Prisma em Ω3F-2/-3/-7.** Três blocos tocam `prisma/**` (origem/destino, financial
   item, km) — cada um exige autorização explícita de escopo (C4) e migração aditiva/nullable.
