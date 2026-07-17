# Lista de execução — RODADA Ω3-FIDELIDADE (Ω3F)

**Agente:** fid-planejador · **Insumo:** `agent-orchestration/omega/fidelidade/dossie-paridade.md`
(fid-analista, 2026-07-13) + `docs/referencia/alinhamento-painel-logistico.md` (matriz de 35).
**HEAD de referência:** `7d5d984`. **Placar do dossiê:** 4 ✅ · 18 🟡 · 13 🔴.
**Só há plano porque há dossiê** (sem dossiê = veto do papel). Formato de cada bloco = template do
`planejador-mestre` (8 campos). Após conclusão de cada linha:
`[x] <bloco> — PR #NN, merge <hash>, junta X/X, veredito, testes N→M, data`.

---

## 0. Meta da rodada

Fidelidade de **COMPORTAMENTO** (workflows, campos, regras, densidade de informação) + **identidade
visual NOSSA** (design system próprio — shadcn/tokens/tipografia da casa) sobre a **MESMA arquitetura
de informação** da referência. **Não clonar aparência/trade dress** (§4 da spec): clonar o *modelo
mental* do usuário é estratégia; clonar pixels do concorrente é risco. Alvo do usuário-piloto: não
sentir downgrade.

## 0.1 Governança herdada (não renegociável)

- **Juntas autônomas** aprovam merge (CLAUDE.md §C7) — cada bloco fecha com sua junta e ata em
  `agent-orchestration/omega/juntas/J-OMEGA3F-<n>.md`; reprovação → `reprovacoes/R-omega3f-<n>.md` +
  **plano NOVO consolidando pareceres** (regra do planejador-mestre).
- **KPI por PR**: feature **não toca** arquivos KPI; KPIs vão **só no relatório final** (C3). Bloco
  `…K`/`…F` publica depois do gate humano.
- **Migrations aditivas** com `up/down/re-up`, `nullable`/`default`, **Decimal p/ dinheiro**,
  **`Timestamptz(6)`** p/ tempo, **delete lógico** (`deleted_at`), **consolidadas 1 por bloco**.
- **1 branch = 1 PR = 1 bloco** (`feat/omega3f-<n>-<slug>` a partir de `main`, `git pull --rebase`
  antes). **Fatia ≤ ~400 linhas úteis**; se estourar, dividir o bloco em `-a/-b` declarados.
- **Testes ≥ 2× baseline** por superfície tocada (baseline N → meta M ≥ 2N; ver §3).
- **PT-BR de negócio** na UI — "Organização", nunca "Tenant"; sem andaime de dev (`PLANNED`/rota como
  subtítulo); acentuação correta (CLAUDE.md §11).
- **Sidebar global e Design System INTOCADOS** — o hub da OS usa **menu lateral interno próprio**, não
  mexe na navegação global; componentes sempre do DS atual (`components/ui`, `components/erp`).
- **Mapa/rota/POI ⇒ DESIGNA a Junta de Mapas** (`J-JUNTA-MAPAS`, cadeia
  `planejador-mapas → dev-mapas → avaliador-mapas`). O plano **aciona, não edita** mapa. MapLibre+
  OpenFreeMap seguem base web; SKU pago Google = PD + junta 5 (regra de ouro da junta).
- **Financeiro conta ×1,5** (Ω-GOV): estimativa e buffer do Ω3F-3 (e da parte financeira do Ω3F-4/-6)
  multiplicados por 1,5; invariantes fortes (idempotência, imutabilidade) → fatiar em PRs menores e
  tratar como candidatos a reprovação em junta.
- **Multi-tenant** (skill `saas-multi-tenant`): toda rota nova com teste de isolamento **404
  cross-tenant** obrigatório; toda alteração de `prisma/schema.prisma` rechecada.

## 0.2 Regras de reconciliação (REUSAR, não recriar)

O dossiê provou que várias capacidades **já foram parcialmente entregues**. Cada bloco abaixo declara o
que **aproveita**; recriar o que existe = veto.

| Já entregue (PR) | Onde | Bloco que REUSA |
|---|---|---|
| ServiceQuote congela preço (Ω3-a #170) | `src/modules/service-quotes/**` + `resolveApplicableTariff` (`service-quote.service.ts:88`) | **Ω3F-3** (resolver) e **Ω3F-4** (estende o módulo) |
| Comentários da OS (Ω3-b #171) | `work-order.service.ts:507 addComment`, `POST /work-orders/:id/comments`, evento `work_order_comment` | **Ω3F-5** (só adiciona tags) |
| Anexos de OS (Ω3-d #173) | `WorkOrderAttachment` (`schema.prisma:956`) + rotas `work-order.routes.ts:147-171` + AV-scan + `client_action_id` | **Ω3F-5** (só a aba/UI) |
| Tags coloridas + POI (Ω2-d #168) | `src/modules/tags/**` (`Tag.color` `schema.prisma:1269`), `src/modules/pois/**` (`Poi` `schema.prisma:1292`) | **Ω3F-5** (tag↔comentário), **Ω3F-8** (POI como partida) |
| Checklist snapshot congelado (Ω3-c #172) | `work_orders.checklist_snapshot` (`schema.prisma:1433`) | **Ω3F-7** (preview na aba Mobile) |
| Google Maps no Mapa Operacional (#179) | `GoogleMapsCanvas.tsx`, `useGoogleMapsLoader.ts` | **Ω3F-8** (via Junta de Mapas) |
| Detalhe/timeline/status atuais | `WorkOrderDetailPage.tsx`, `WorkOrderTimeline.tsx`, `WorkOrderStatusActions.tsx`, `WorkOrderDetailPanel.tsx` | **Ω3F-1** (viram conteúdo de aba) |
| `resolveApplicableTariff` (anti-refaturamento) | `service-quote.service.ts:88,212` | **Ω3F-3** (reusa no create; #4) |

---

## 1. ORDEM FINAL (por dependência) — Fase 1

> Regra de ordenação: **hub antes das abas · origem/destino antes do mapa · financeiro antes do
> orçamento e da decisão de cancelamento**. Blocos sem aresta de dependência correm em paralelo.

```
Ω3F-1 Hub (container das abas) ──────┬─► Ω3F-3 Financeiro ──┬─► Ω3F-4 Orçamento (aprovar→cria OS)
   (nenhum back novo)                │      (×1,5)          └─► Ω3F-6 Cancelar(decisão fin.)+Dup+Impr
                                     ├─► Ω3F-5 Comentários(tags)+Arquivos (back pronto)
                                     ├─► Ω3F-7 KM + aba Mobile
                                     └─► Ω3F-8 Mapa da OS + Logs
Ω3F-2 Origem/destino ────────────────────────────────────────► Ω3F-8 (rota origem→destino)
                └─► Ω3F-4 (aprovar→cria OS herda origem/destino)
Ω3F-9 Ações de linha (lista) ── paralelo, sem dependência ──────────────────────────────────
```

**Sequência recomendada de merge:**
1. **Ω3F-1 Hub** — 1º sempre (container; abas entram **ocultas** até cada bloco entregar).
2. **Ω3F-2 Origem/destino** — cedo (schema aditivo; alimenta o mapa e o create do orçamento).
3. **Ω3F-3 Financeiro** ×1,5 — antes de Ω3F-4 e Ω3F-6.
4. **Ω3F-5 Comentários+Arquivos** — paralelizável com -2/-3 (back já pronto; risco baixo).
5. **Ω3F-9 Ações de linha** — paralelizável a qualquer momento (menor acoplamento).
6. **Ω3F-4 Orçamento** — depois de -3 (itens) e -2 (aprovar→cria OS com origem/destino).
7. **Ω3F-6 Cancelar+Duplicar+Imprimir** — depois de -3 (decisão financeira precisa de item).
8. **Ω3F-7 KM+aba Mobile** — depois do hub; independente de -2..-6.
9. **Ω3F-8 Mapa da OS+Logs** — **por último** na fase (depende de -2 origem/destino; **Junta de Mapas**).

---

## 2. PLANOS DE PR — Fase 1 (Ω3F-1..9)

Cada plano segue o template do `planejador-mestre`: **objetivo · ator · fluxo · contrato · modelagem ·
arquivos (regra do espelho) · baseline+meta · aceite (vídeo+timestamp) · riscos+rollback · reuso**.

---

### Ω3F-1 — Hub da OS (PRIORIDADE — é o container; vem 1º)

> **[x] CONCLUÍDO — junta J-OMEGA3F-1 3/3 APROVADO** (fid-avaliador + cognicao-visual + master-teste, sem veto/
> condição). Shell de abas + menu lateral interno + barra de ações (Copiar #22 + ⋮ WhatsApp #32); C2 revelação
> progressiva (só "Informações gerais" visível; ocultas AUSENTES). UI-only. Front detalhe 6 → +13 (smoke 378→391),
> tsc/build verdes. Pendência P-Ω3F1-ENTITYTYPE → Ω3F-3. **PR #NN, merge `<hash>` — pendente push/merge.**

Capacidades **#5** (hub de 11 abas + barra de ações), **#22** (Copiar URL), **#32** (texto WhatsApp).

- **Objetivo:** transformar `WorkOrderDetailPage.tsx` (296 linhas, card único, 0 abas) em **shell de
  abas com menu lateral interno** + **barra de ações** (`Cancelar · Imprimir · Duplicar · Copiar`,
  esqueleto/desabilitado onde o bloco dono ainda não entregou). As abas nascem **ocultas por flag** e
  cada bloco seguinte "acende" a sua. Copiar URL e texto WhatsApp são 100% client-side.
- **Ator:** operador de despacho / gestor (papéis com `work_orders:read`); barra de ações respeita
  `work_orders:update`/`:cancel`. Backend é autoridade — a UI só molda.
- **Fluxo:** lista → abre OS → **hub** com abas `Informações gerais · Financeiro · Orçamento · Estoque
  · Comentários · Arquivos · Mobile · Quilometragem · Base · Mapa · Logs` (as 11 da spec §1.3) — nesta
  fatia só **Informações gerais** tem conteúdo (migra o card atual + timeline + status actions); as
  demais renderizam **estado vazio "em breve"** do DS (sem badge `TODO`/`PLANNED`). Aba na URL
  (`?aba=<slug>`) para deep-link. **Copiar** → `navigator.clipboard` da URL + toast. **⋮ / WhatsApp**
  → monta texto pronto (protocolo, cliente, endereço) e copia.
- **Contrato:** **sem back-end novo.** Deep-link de aba inexistente → cai em "Informações gerais"
  (não 404 de rota). Acesso sem permissão de aba → estado "acesso não permitido" (§7).
- **Modelagem:** **nenhuma migration.** Só React.
- **Arquivos (espelho = padrão de página com abas do DS):**
  `frontend/src/modules/work-orders/pages/WorkOrderDetailPage.tsx` (vira shell),
  `frontend/src/modules/work-orders/components/WorkOrderTabsShell.tsx` (novo),
  `frontend/src/modules/work-orders/components/tabs/GeneralInfoTab.tsx` (novo; encapsula
  `WorkOrderDetailPanel`+`WorkOrderTimeline`),
  `frontend/src/modules/work-orders/components/WorkOrderActionBar.tsx` (novo; barra + Copiar + WhatsApp),
  `frontend/src/modules/work-orders/tabs.config.ts` (novo; registro das 11 abas + flags de visibilidade).
  **Reusa:** `WorkOrderDetailPanel.tsx`, `WorkOrderTimeline.tsx`. (CORREÇÃO Ω3F-6b/coordenador J-Ω3F-6B: o
  `WorkOrderStatusActions.tsx` NUNCA foi reusado pelo GeneralInfoTab — era código morto e foi REMOVIDO, pois
  oferecia "Cancelada" sem gate e reabriria a porta dos fundos do cancelamento.)
- **Baseline+meta:** front detalhe N=6 (`work-order-registry-links-detail.test.tsx` + smoke atual) →
  **M ≥ 12** (roteamento de aba, deep-link `?aba`, Copiar URL, texto WhatsApp, estado "acesso não
  permitido", estado vazio de aba futura). Sem novos testes back.
- **Aceite (vídeo+timestamp):** bate com **spec §1.3** (hub de 11 abas + barra
  `Cancelar/Imprimir/Duplicar/Copiar`) e **`Menu_Superior 2:04–2:12`** (Copiar = deep link da URL);
  texto WhatsApp = **§1.1** (menu ⋮ "copiar texto pronto p/ WhatsApp"). Menu lateral interno com as
  11 abas na ordem exata; identidade visual = DS da casa (não copiar layout do concorrente).
- **Riscos+rollback:** risco = regressão da tela de detalhe atual. Mitigação: "Informações gerais"
  reusa componentes existentes 1:1. Rollback = reverter o PR (UI-only, sem dado). Flags de aba
  default-OFF garantem que abas incompletas não vazam para o piloto.

---

### Ω3F-2 — Origem/destino + campos dinâmicos por tipo

> **[x] Ω3F-2a (backend) CONCLUÍDO — junta J-OMEGA3F-2 3/3** (fid-avaliador + validador-mestre APROVADO;
> critico APROVADO_CONDICIONADO, furo #2/#2b CORRIGIDO antes do merge). Schema+migration aditiva
> (`20260802000000`, drill up/down/re-up comprovado 2×) + discriminador C4 (service_type + requires_destination)
> + destination_* + service_details + 422 destination_required (create+update lendo tipo persistido) + §2.8
> access_code fora do metadata. Baseline back 5 → +12; suíte 794→806. D-Ω3F-2-DESTINATION-UPDATE registrada.
> **[x] Ω3F-2b (front) CONCLUÍDO — junta J-OMEGA3F-2B 3/3** (fid-avaliador + cognicao-visual + master-teste,
> todos APROVADO_CONDICIONADO; condições APLICADAS: C1 acentuação nas strings novas + D-Ω3F-KPI-RELATORIO
> registrada). WorkOrderForm dirigido pelo tipo (card Destino revelado; campos dinâmicos socorro/residencial;
> espelho do 422); ServiceFormModal ganha o discriminador. +5 front (smoke 391→396). **Ω3F-2 COMPLETO (2a+2b).**

Capacidades **#24** (origem E destino), **#23** (campos dinâmicos por tipo). **Toca `prisma/**` →
exige autorização C4.**

- **Objetivo:** hoje `WorkOrder` tem só `service_address` único (`schema.prisma:1418`). Adicionar
  **origem e destino** e um formulário de create **dirigido pelo `service_catalog`** (reboque = 2
  endereços; socorro = placa/veículo/cor; residencial = senha/objeto/descrição).
- **Ator:** operador de despacho no cadastro/edição de OS (`work_orders:create`/`:update`).
- **Fluxo:** create → escolhe cliente → **tipo de serviço** → o form revela os campos do tipo
  (spec §1.2); reboque exige **origem** (reusa `service_address*` atuais como origem) **e destino**
  novo. Geocode já existente passa a rodar para os dois pontos (alimenta Ω3F-8).
- **Contrato:** `POST/PUT /api/v1/work-orders` aceita `origin_*`/`destination_*` opcionais;
  **422** se o tipo exigir destino e ele faltar (validação por catálogo); **404** cross-tenant no
  catálogo/cliente; **409** mantém a unicidade de `code`.
- **Modelagem (aditiva):** migration `2026xxxx_workorder_origin_destination` — renomeia
  **conceitualmente** `service_*` para papel de **origem** (mantém colunas, sem quebra) e adiciona
  `destination_address/city/state/zip_code`, `destination_latitude/longitude Decimal(10,7)`,
  `destination_geocoded_at Timestamptz(6)`, `destination_geocode_source`. Tudo **nullable**;
  `up/down/re-up`. Campos dinâmicos por tipo em `service_details Json?` (aditivo, evita explosão de
  colunas por tipo). Sem delete físico.
- **Arquivos (espelho = módulo work-orders existente):** `prisma/schema.prisma` (model `WorkOrder`),
  `prisma/migrations/2026xxxx_workorder_origin_destination/migration.sql`,
  `src/modules/work-orders/work-order.types.ts`, `work-order.validators.ts`, `work-order.service.ts`,
  `work-order.dto.ts`, `work-order-prisma.repository.ts`;
  front `frontend/src/modules/work-orders/components/WorkOrderForm.tsx`, `types.ts`,
  `work-orders.adapter.ts`. **Reusa:** geocode de OS (`src/modules/work-orders/geocoding/`),
  `service-catalog` para classificar o tipo.
- **Baseline+meta:** back N=5 (`work-orders.test.ts` 2 + `work-orders-routes.test.ts` 3) → **M ≥ 10**
  (422 destino faltante no reboque, persistência origem+destino, campos dinâmicos por tipo,
  isolamento 404 cross-tenant, geocode dos 2 pontos).
- **Aceite (vídeo+timestamp):** **spec §1.2 "Como cadastrar" 0:20–2:56** — tipo obrigatoriamente da
  tabela do cliente; **reboque = origem E destino**; socorro = placa/veículo/cor; residencial =
  senha/objeto. O form revela campos por tipo.
- **Riscos+rollback:** risco = migration em `WorkOrder` (tabela quente). Mitigação: 100% aditiva/
  nullable, sem backfill obrigatório; `down` derruba só as colunas novas. Rollback = revert + `down`.

---

### Ω3F-3 — Financeiro da OS **(×1,5)**

Capacidades **#6** (itens da tabela + total), **#4** (validação "tipo na tabela do cliente" no create).
**Toca `prisma/**` → C4. Peso financeiro ×1,5 (buffer + fatiar se > ~400 linhas).**

- **Objetivo:** lançar **itens financeiros** na OS a partir da **tabela de valores do cliente** com
  edição inline, item avulso ("+", ex.: pedágio) e **total automático**; e **exigir no create** que o
  tipo de serviço esteja na tabela do cliente (#4), **reusando** `resolveApplicableTariff` — não
  reimplementar.
- **Ator:** gestor/financeiro (`work_orders:update` + permissão financeira nova
  `work_order_financials:*` espelhando `service_catalog`/RBAC).
- **Fluxo:** aba **Financeiro** do hub → "lançar item" (escolhe tarifa do cliente OU avulso) → qtd ×
  valor **congelado** no lançamento (anti-refaturamento, mesma lógica do ServiceQuote) → total soma
  automático. Editar valor inline; observação por item; delete lógico.
- **Contrato:** `POST /api/v1/work-orders/:id/financial-items`, `PATCH .../:itemId`,
  `DELETE .../:itemId` (lógico), `GET .../financial-items`. **422** transição/valor inválido
  (qty ≤ 0, tarifa não aplicável ao cliente); **404** cross-tenant na OS/tarifa; **409** idempotência
  de lançamento (tenant+os+`client_action_id`). No create de OS: **422** se `service_catalog_id` não
  tiver tarifa vigente na tabela do cliente (via resolver).
- **Modelagem (aditiva):** novo model **`WorkOrderFinancialItem`** — `id`, `tenant_id`, `work_order_id`,
  `tariff_id` nullable, `description`, `quantity Decimal`, `unit_amount Decimal`,
  `total_amount Decimal` (congelado), `source` (`tariff`|`manual`), `notes`, `created_by`,
  `created_at/updated_at Timestamptz(6)`, `deleted_at Timestamptz(6)` (**delete lógico**). Índices
  `@@unique([tenant_id, id])`, `@@index([tenant_id, work_order_id])`. Migration `up/down/re-up`.
- **Arquivos (espelho = `src/modules/tariffs/` e `src/modules/service-quotes/`):** novo módulo
  `src/modules/work-order-financials/` (`*.types.ts`, `*.validators.ts`, `*.service.ts`,
  `*.dto.ts`, `*.controller.ts`, `*.routes.ts`, `*-prisma.repository.ts`, `index.ts`);
  `prisma/schema.prisma` + migration; alteração em `src/modules/work-orders/work-order.service.ts`
  (create reusa `resolveApplicableTariff`); front nova aba
  `frontend/src/modules/work-orders/components/tabs/FinancialTab.tsx` + `repository`/`service` do
  módulo. **Reusa:** `resolveApplicableTariff` (`service-quote.service.ts:88,212`),
  `price-tables`/`tariffs` (`schema.prisma:1146,1174`).
- **Baseline+meta (×1,5):** back N=8 (create 5 + resolver reuse ~3) → **M ≥ 16** (lançar/editar/deletar
  item, total automático, congelamento de valor, 422 qty≤0, 422 tarifa fora da tabela do cliente no
  create #4, 404 cross-tenant, 409 idempotência). Buffer ×1,5 no cronograma.
- **Aceite (vídeo+timestamp):** **spec §1.3 "Informações gerais" 0:24–1:08** — itens da tabela de
  valores (saída/km já entram), edição inline, "+" pedágio com valor+observação, **total automático**;
  **§1.2** — tipo obrigatoriamente na tabela do cliente.
- **Riscos+rollback:** invariante forte (anti-refaturamento) → **candidato a reprovação em junta**;
  se estourar 400 linhas, fatiar `-3a` (model+lançamento) / `-3b` (validação #4 no create + total).
  Rollback = revert + `down` (tabela nova isolada, sem impacto em OS existentes).

---

### Ω3F-4 — Orçamento (na OS + standalone) **(parte financeira ×1,5)**

Capacidades **#7** (orçamento na OS + aprovar→cria OS), **#8** (standalone + compartilhar).
**Depende de Ω3F-3 (itens) e Ω3F-2 (aprovar→cria OS com origem/destino). Toca `prisma/**` → C4.**

- **Objetivo:** **ESTENDER o `ServiceQuote` existente** (Ω3-a) de item único para **orçamento
  multi-item com cabeçalho** (número/data/validade), itens = **tarifa OU produto do estoque**,
  **aprovar → cria OS** (com modo de acionamento) e **compartilhar link/e-mail**. Decisão de
  modelagem para a junta (dossiê §1): estender/agrupar o `ServiceQuote` (recomendado) vs. novo
  `Quote`+`QuoteItem` — **este plano recomenda estender** para reusar o congelamento de preço.
- **Ator:** gestor/comercial (`service_quotes:*` já existente + `:approve`).
- **Fluxo:** aba **Orçamento** do hub (contexto OS) **ou** rota standalone (`work_order_id = null`,
  já suportado `schema.prisma:1216`) → cabeçalho (nº/data/validade) → **lançar itens** (tarifa do
  cliente ou produto do estoque; qtd × valor congelado) → **Aprovar/Recusar** (front já tem,
  `OrcamentosPage.tsx:173`). Aprovar pergunta "criar novo serviço?" → define modo de acionamento →
  **nasce a OS** no painel. Standalone: **compartilhar por e-mail/link** + **abrir OS a partir dele**.
- **Contrato:** `POST /service-quotes/:id/items`, `PATCH/DELETE` item; `POST /service-quotes/:id/approve`
  → cria OS (idempotente: tenant+quote+`client_action_id`, **409** em replay); `POST .../share`
  (gera token de link, **§2.8** — sem storage key/token em resposta pública). **422** aprovar quote
  vencido/vazio; **404** cross-tenant; **409** duplo-approve. Transições `draft→approved/rejected/void`
  já existem (`service-quote.types.ts:78`).
- **Modelagem (aditiva):** novo model **`ServiceQuoteItem`** (espelho de `WorkOrderFinancialItem`:
  `quantity/unit_amount/total_amount Decimal`, `tariff_id?`, `product_id?`, `kind`
  apoio/estadia/pneu, `deleted_at`). Em `ServiceQuote`: adicionar `number`, `issued_at Timestamptz(6)`,
  `valid_until Timestamptz(6)`, `share_token?`, `created_work_order_id?` (aditivos/nullable).
  Migration `up/down/re-up`.
- **Arquivos (espelho = `src/modules/service-quotes/` — ESTENDER, não recriar):**
  `prisma/schema.prisma` + migration; `src/modules/service-quotes/service-quote.{types,validators,
  service,dto,controller,routes}.ts`, `service-quote-prisma.repository.ts`; front
  `frontend/src/modules/registry/service-quotes/pages/OrcamentosPage.tsx` (multi-item + share),
  `ServiceQuoteFormModal.tsx`, + aba `frontend/src/modules/work-orders/components/tabs/QuoteTab.tsx`.
  **Reusa:** todo o módulo service-quotes (back+front), FK `work_order_id` nullable, itens do Ω3F-3,
  create de OS do Ω3F-2, `inventory` para produto (cruza com #9/Fase 2 — só leitura de produto aqui).
- **Baseline+meta:** back N=14 (`service-quotes-routes.test.ts`) → **M ≥ 28** (multi-item, cabeçalho
  nº/validade, aprovar→cria OS idempotente 409, recusar, compartilhar link §2.8, 422 quote vencido,
  404 cross-tenant). Módulo já tem 43 back — landing esperado ~65.
- **Aceite (vídeo+timestamp):** **spec §1.3 "Orçamento na OS" 1:10–2:34** (nº/data/validade → itens
  tabela OU produto → aprovar pergunta "criar novo serviço?" → nasce OS) + **§1.5 standalone
  1:01–2:24** (compartilhar e-mail/link, abrir OS, logs próprios).
- **Riscos+rollback:** risco = duplicar lógica de congelamento (mitigado por estender ServiceQuote);
  aprovar→cria OS é operação composta → idempotência obrigatória. Fatiar `-4a` (multi-item+cabeçalho)
  / `-4b` (aprovar→cria OS + compartilhar). Rollback = revert + `down`.

---

### Ω3F-5 — Comentários (com tags) + Arquivos da OS

Capacidades **#10** (comentários com tags), **#11** (arquivos — **back já ✅**, falta a aba).
**Back de anexos pronto; back de comentários pronto — este bloco é majoritariamente UI + junção de
tags. Junção de tags toca `prisma/**` → C4 (migration mínima).**

- **Objetivo:** (a) **acender a aba Arquivos** (o back `WorkOrderAttachment` + rotas
  `work-order.routes.ts:147-171` + AV-scan já existem — só falta UI app→base/base→app); (b) adicionar
  **tags no comentário** (comentários existem via `addComment`; falta o vínculo `Tag`↔comentário).
- **Ator:** operador/gestor (`work_orders:comment`, `work_order_attachments:*`).
- **Fluxo:** aba **Comentários** → escreve comentário → anexa **tags coloridas** (registry Ω2-d) →
  editar/excluir; aba **Arquivos** → lista anexos (do app ou manuais), **download**, **upload manual
  com tipo+nome**, exclusão (respeitando status AV-scan `stored`).
- **Contrato:** tags no comentário via `POST /work-orders/:id/comments` estendido com `tag_ids[]`;
  **422** tag inexistente/cross-tenant; **404** OS cross-tenant. Anexos: rotas já existem (só consumo
  no front). **§2.8**: DTO/audit sem `storage_key`/checksum/`tenant_id` externo (já provado em Ω3-d).
- **Modelagem (aditiva):** junção **`WorkOrderCommentTag`** (ou vínculo polimórfico `TagAssignment` —
  decisão de junta, dossiê §5: um modelo polimórfico serve OS **e** comentário). `tenant_id`,
  `comment_id`/`work_order_id`, `tag_id`, `created_at Timestamptz(6)`, `@@unique` anti-duplicata.
  Migration `up/down/re-up`. Resolve a pendência **P-Ω2d (TagAssignment)**.
- **Arquivos (espelho = `src/modules/tags/` + módulo comments existente):** `prisma/schema.prisma` +
  migration; `src/modules/work-orders/work-order.service.ts` (`addComment` aceita tags),
  `work-order.validators.ts`, `work-order.dto.ts`; front abas
  `frontend/src/modules/work-orders/components/tabs/CommentsTab.tsx` (novo) e
  `AttachmentsTab.tsx` (novo, consome rotas Ω3-d) + `repository`. **Reusa:** `addComment`
  (`work-order.service.ts:507`), evento `work_order_comment`, `work-order-attachment.*` (todo),
  registry de `Tag` (`schema.prisma:1269`).
- **Baseline+meta:** back N=17 (`work-order-comments*` 9+8) → **M ≥ 34** somando o consumo de anexos
  (comentário com tags, 422 tag cross-tenant, junção única, aba de anexos: list/upload/download/delete
  na UI + §2.8). Anexos back já em 23 testes (Ω3-d) — não re-testar back, cobrir a UI/junção.
- **Aceite (vídeo+timestamp):** **spec §1.3 "Comentários" 1:21–1:46** (comentário com tags, editar,
  excluir) + **"Arquivos" 1:46–2:09** (app sobe → base vê/baixa; upload manual com tipo+nome).
- **Riscos+rollback:** risco baixo (back pronto). Migration só cria junção. Rollback = revert + `down`.

---

### Ω3F-6 — Cancelar (decisão financeira) + Duplicar + Imprimir

Capacidades **#19** (cancelar c/ decisão financeira), **#21** (duplicar c/ opções), **#20** (imprimir
configurável). **Depende de Ω3F-3 (itens financeiros existirem para manter/zerar).**

- **Objetivo:** trocar o cancel simples (`cancellation_reason` `schema.prisma:1443`) por um **pop-up de
  decisão financeira** (manter valores / manter sem remunerar o profissional / **zerar itens**) +
  motivo; **duplicar** com opções (novo nº, data/hora atual, copiar comentários, copiar checklist);
  **imprimir** com checkboxes de seções.
- **Ator:** gestor (`work_orders:cancel`, `:create` para duplicar).
- **Fluxo:** barra de ações do hub (Ω3F-1) → **Cancelar** abre modal (em andamento? → decisão
  financeira → motivo); **Duplicar** abre opções → gera nova OS **sem** copiar quotes congelados
  (invariante Ω3-e: duplicar não copia F1/quote congelado); **Imprimir** → seleção de seções → layout.
- **Contrato:** `POST /work-orders/:id/cancel` com `financial_decision` (`keep`|`keep_unpaid`|`zero`) +
  `reason`; **422** decisão inválida ou OS já cancelada; `POST /work-orders/:id/duplicate` com opções →
  **201** nova OS (**409** idempotente por `client_action_id`); **404** cross-tenant. Imprimir =
  client-side (sem rota nova) sobre o GET da OS.
- **Modelagem (aditiva):** `work_orders.financial_cancellation_decision String?` (aditivo/nullable);
  duplicar **não** cria model novo (reusa create). Migration mínima `up/down/re-up`. Sem delete físico.
- **Arquivos (espelho = módulo work-orders):** `prisma/schema.prisma` + migration;
  `src/modules/work-orders/work-order.service.ts` (cancel c/ decisão + duplicate),
  `work-order.validators.ts`, `work-order.controller.ts`, `work-order.routes.ts`; front
  `frontend/src/modules/work-orders/components/WorkOrderActionBar.tsx` (Ω3F-1) + modais
  `CancelDecisionModal.tsx`, `DuplicateOptionsModal.tsx`, `PrintSectionsModal.tsx`. **Reusa:** máquina
  de cancelamento atual, `checklist_snapshot` (`schema.prisma:1433`) e comentários como copiáveis,
  itens financeiros do Ω3F-3 (o que "manter/zerar" opera).
- **Baseline+meta:** back N=5 (create/cancel em `work-orders*`) → **M ≥ 10** (3 decisões financeiras,
  422 decisão inválida, duplicar com/sem checklist+comentários, duplicar NÃO copia quote congelado,
  409 idempotência, 404 cross-tenant).
- **Aceite (vídeo+timestamp):** **spec §1.3 "Cancelar" 0:54–1:20** (decisão: manter / manter sem
  remunerar / zerar + motivo) + **"Imprimir" 1:28–1:39** (checkboxes de seções) + **"Duplicar"
  1:39–2:04** (novo nº, data atual, copiar comentários/checklist; caso "pernoitou na base").
- **Riscos+rollback:** decisão financeira mexe em receita → junta atenta; duplicar deve respeitar o
  veto Ω3-e (não copiar congelados). Rollback = revert + `down`.

---

### Ω3F-7 — KM real + aba Mobile

Capacidades **#15** (km inicial/final app+base), **#12** (etapas c/ hora + posição por etapa), **#13**
(preview do checklist). **Toca `prisma/**` (km) → C4. Independente de Ω3F-2..6.**

- **Objetivo:** adicionar **km inicial/final** (app preenche, base corrige) e a **aba Mobile** composta:
  timeline de etapas com data/hora + **mapa da posição em cada validação** + **preview do checklist**
  preenchido no app.
- **Ator:** técnico de campo (app, via sync) preenche km; base (`work_orders:update`) corrige.
- **Fluxo:** aba **Mobile** do hub → timeline `enviado→aceito→iniciado→origem→destino`
  (de `FieldDispatchEvent`) com hora de cada validação; ao lado, mapa com **onde** o profissional
  estava por etapa (de `FieldOperatorLocation`); aba **Quilometragem** mostra km do app e permite
  correção da base; preview do `checklist_snapshot`.
- **Contrato:** km chega por `POST /api/v1/mobile/sync/*` (idempotência tenant+usuário+
  `client_action_id`, já é o padrão §6); base corrige via `PATCH /work-orders/:id/mileage`; **422**
  km final < inicial; **404** cross-tenant. Etapas/posição = **leitura** de dados existentes.
- **Modelagem (aditiva):** `work_orders.mileage_start Decimal?`, `mileage_end Decimal?`,
  `mileage_source String?` (app/base), `mileage_corrected_at Timestamptz(6)`. Migration `up/down/re-up`.
- **Arquivos (espelho = módulo work-orders + geocoding):** `prisma/schema.prisma` + migration;
  `src/modules/work-orders/work-order.{types,validators,service,dto,routes}.ts`; front abas
  `frontend/src/modules/work-orders/components/tabs/MobileTab.tsx`, `MileageTab.tsx` (novas);
  **mapa da posição por etapa ⇒ DESIGNA a Junta de Mapas** (aciona `planejador-mapas`, não edita).
  **Reusa:** `FieldDispatchEvent` (`schema.prisma:1560`), `FieldOperatorLocation` (`schema.prisma:731`),
  `checklist_snapshot` (`schema.prisma:1433`).
- **Baseline+meta:** back N=14 (`checklist-snapshot-dispatch` 9 + `work-order-checklist-snapshot-dto`
  5) → **M ≥ 28** (km app→base, correção da base, 422 final<inicial, timeline de etapas com hora,
  preview do snapshot, idempotência de sync).
- **Aceite (vídeo+timestamp):** **spec §1.3 "Mobile" (Mobile/KM/Base) 0:24–1:35** (timeline de etapas
  + mapa da posição por validação + checklist em tempo real) + **"Quilometragem" 1:38–1:58** (app
  preenche, base corrige).
- **Riscos+rollback:** mapa por etapa passa pela Junta de Mapas (não editar mapa diretamente).
  Migration aditiva/nullable. Rollback = revert + `down`.

---

### Ω3F-8 — Aba Mapa da OS + aba Logs

Capacidades **#17** (rota origem→destino, partida real/base/POI, km estimado), **#18** (Logs por OS).
**Depende de Ω3F-2 (origem/destino no modelo). Mapa/rota/POI ⇒ Junta de Mapas. Logs precisa de rota
de leitura NOVA de `AuditLog`.**

- **Objetivo:** aba **Mapa da OS** com **rota origem→destino**, **ponto de partida selecionável**
  (posição real / base / POI cadastrado) e **km estimado**; aba **Logs** com a auditoria filtrada por
  OS.
- **Ator:** operador/gestor (`work_orders:read`); Logs pode exigir `auditor`/`manager`.
- **Fluxo:** aba **Mapa** → escolhe partida (real/base/POI Ω2-d) → traça rota até origem→destino
  (Ω3F-2) → exibe **km estimado**; aba **Logs** → lista eventos de auditoria (quem editou/alterou/
  excluiu, quando) da OS.
- **Contrato:** **rota de leitura NOVA** `GET /api/v1/work-orders/:id/audit-logs` (o grep só achou
  *writers* de `AuditLog` — dossiê §6) filtrando `entity='work_order'`/`entity_id`; **404**
  cross-tenant; **§2.8** (sem `tenant_id` externo/segredo no payload). Cálculo de rota/km ⇒ pela Junta
  de Mapas (provedor conforme regra de ouro; SKU pago = PD+junta 5).
- **Modelagem:** **sem model novo** — Logs lê `AuditLog` (`schema.prisma:253`). POI já existe. Se a
  Junta de Mapas exigir cache de rota, ela declara (fora deste escopo).
- **Arquivos (espelho = módulo audit + operations/map):** back nova rota de leitura em
  `src/modules/core-saas/audit/` (`audit-log.controller.ts`/`.routes.ts` — **reusa**
  `audit-log.service.ts`) exposta sob work-orders; front abas
  `frontend/src/modules/work-orders/components/tabs/MapTab.tsx`, `LogsTab.tsx` (novas). **Mapa/rota/km
  ⇒ DESIGNA a Junta de Mapas** (`planejador-mapas → dev-mapas → avaliador-mapas`; reusa
  `GoogleMapsCanvas.tsx`/`useGoogleMapsLoader.ts` #179, `src/modules/pois/`). **Reusa:** `AuditLog`,
  POI back+front, Google Maps.
- **Baseline+meta:** back N=13 (`work-order-geocode-route.test.ts`) + POI 18 na fundação → **M ≥ 26**
  (rota origem→destino, partida real/base/POI, km estimado, GET audit-logs por OS filtrado, 404
  cross-tenant do audit, §2.8).
- **Aceite (vídeo+timestamp):** **spec §1.3 "Mapa" (Menu_Superior) 0:19–0:41** (partida selecionável
  real/base/POI → origem → destino, calculando km) + **"Logs" 0:41–0:54** (auditoria de tudo na OS).
- **Riscos+rollback:** dependência de provedor de mapa (Junta de Mapas decide; nada de SKU pago sem
  PD+junta 5); rota de leitura de auditoria deve respeitar RBAC + §2.8. Rollback = revert (Logs sem
  migration; mapa conforme parecer da junta).

---

### Ω3F-9 — Ações de linha (dar andamento · revogar envio · badge de atraso)

Capacidades **#29** (forçar etapa auditada), **#30** (revogar envio p/ reenviar), **#31** (badge de
atraso na lista). **Menor acoplamento — corre em PARALELO ao hub.**

- **Objetivo:** expor no menu **⋮ da linha** da lista: **dar andamento** (base avança etapa
  manualmente, auditado), **cancelar operação logística** (desfaz o envio p/ reenviar a outro
  profissional) e **badge de atraso** (estouro da previsão de chegada) na tabela.
- **Ator:** operador de despacho (`work_orders:update`, `field_dispatch:cancel`).
- **Fluxo:** lista de OS → ⋮ → "dar andamento" (avança etapa, registra `WorkOrderEvent`); "revogar
  envio" (usa `FieldDispatch.cancelled_at/reason` `schema.prisma:1532,1540` → volta ao pool);
  badge "Atrasado" aparece quando `now > ETA`.
- **Contrato:** `POST /operations/dispatches/:id/advance` (força etapa, auditado; **422** transição
  inválida); `POST /operations/dispatches/:id/revoke` (**422** se já aceito/finalizado; **404**
  cross-tenant). ETA/atraso = derivado no DTO da lista (sem rota nova) — usa `scheduled_for`/
  `arrived_at` + previsão.
- **Modelagem (aditiva):** `work_orders.eta_at Timestamptz(6)?` (previsão de chegada) se não derivável;
  ação "forçar etapa" registra em `WorkOrderEvent` (existente). Migration mínima `up/down/re-up`.
- **Arquivos (espelho = `src/modules/field-dispatch/` + work-orders):**
  `src/modules/field-dispatch/*.service.ts`/`*.routes.ts` (advance/revoke), `work-order.dto.ts`
  (flag de atraso), `prisma/schema.prisma` (eta, se necessário); front
  `frontend/src/modules/work-orders/components/WorkOrdersTable.tsx` (menu ⋮ + badge). **Reusa:**
  máquina de estados + `FieldDispatch` (`schema.prisma:1525`), `WorkOrderEvent` (`schema.prisma:1479`),
  timeline `GET /operations/dispatches/:id/timeline` (Ω3-b).
- **Baseline+meta:** back N=12 (`field-dispatch` 2 + `field-dispatch-routes` 2 + `field-dispatch-
  target-role` 8) → **M ≥ 24** (forçar etapa auditada, 422 transição inválida, revogar envio → pool,
  422 revogar já-aceito, badge de atraso derivado, 404 cross-tenant).
- **Aceite (vídeo+timestamp):** **spec §1.1** — menu ⋮ com "cancelar operação logística (desfaz envio)"
  e "dar andamento (base avança quando o técnico fica sem bateria)"; indicador de **atraso** (estourou
  a previsão de chegada) na linha.
- **Riscos+rollback:** forçar etapa fura a máquina de estados → auditoria obrigatória + guard 422.
  Rollback = revert + `down`.

---

## 2.10 Fatiamento e paralelismo (resumo operacional)

- Blocos que tocam `prisma/**` (**Ω3F-2, -3, -4, -5(junção), -6, -7, -9**): cada um **1 migration
  consolidada**, aditiva/nullable, com autorização C4 no comando do bloco.
- Se um bloco passar de **~400 linhas úteis**: dividir em `-a/-b` **declarados** na abertura do PR
  (ex.: Ω3F-3a/-3b, Ω3F-4a/-4b).
- Paralelizáveis sem aresta: **Ω3F-5** e **Ω3F-9** podem correr junto de -2/-3.
- **Ω3F-8** é o último da fase (depende de -2 + Junta de Mapas).

---

## 3. Baseline e meta de testes por bloco

| Bloco | Superfície (baseline) | N | Meta M (≥2N) | Peso |
|---|---|---|---|---|
| Ω3F-1 Hub | front detalhe (`work-order-registry-links-detail` + smoke) | 6 | **≥12** | 1,0 |
| Ω3F-2 Origem/destino | `work-orders` 2 + `work-orders-routes` 3 | 5 | **≥10** | 1,0 |
| Ω3F-3 Financeiro | create 5 + resolver reuse ~3 | 8 | **≥16** | **1,5** |
| Ω3F-4 Orçamento | `service-quotes-routes` 14 (módulo já 43) | 14 | **≥28** | **1,5**\* |
| Ω3F-5 Coment.+Arquivos | `work-order-comments` 9+8 (anexos back já 23) | 17 | **≥34** | 1,0 |
| Ω3F-6 Cancelar+Dup+Impr | create/cancel `work-orders*` | 5 | **≥10** | **1,5**\* |
| Ω3F-7 KM+Mobile | `checklist-snapshot-dispatch` 9 + dto 5 | 14 | **≥28** | 1,0 |
| Ω3F-8 Mapa+Logs | `work-order-geocode-route` 13 (POI 18 fund.) | 13 | **≥26** | 1,0 |
| Ω3F-9 Ações de linha | `field-dispatch`(2+2+8) | 12 | **≥24** | 1,0 |

\* peso ×1,5 aplicado só à **parte financeira** do bloco (itens do orçamento; decisão financeira do
cancelamento). Suíte back atual = **101 arquivos de teste**; front smoke = **62** casos — regressão
integral verde é DoD de cada bloco.

---

## 4. Fase 2 — Paridade completa (durante/pós-piloto) — planos-esboço

> Detalhamento completo em bloco quando a Fase 1 fechar. Todos herdam a governança §0.1.

- **Ω3F-10 Estoque→OS com flag financeiro** (#9): venda de produto na OS com origem
  **profissional/viatura/base** + checkbox **"cadastrar no financeiro"** (sem ele = só saída física).
  Reusa `src/modules/inventory/` + `StockMovement` (`schema.prisma:1049,1050`). Aceite: spec §1.3
  "Estoque" 0:18–1:21. Toca `prisma/**` (origem "base" + flag). ~2 PRs.
- **Ω3F-11 Tags de OS + Ocorrências por beneficiário** (#27, #28): junção OS↔Tag (reusa/generaliza a
  `TagAssignment` do Ω3F-5) + ocorrências vinculadas ao beneficiário com **alerta no próximo cadastro**.
  Aceite: spec §1.2. ~2 PRs.
- **Ω3F-12 Visualizar finalizados** (#34): colunas configuráveis + **export Excel** + busca avançada
  (período/CNPJ/filial/protocolo/empresa). Aceite: spec §1.4 "Visualizar" 0:10–1:01. ~2 PRs.
- **Ω3F-13 Base/pátio** (#16): domínio **100% novo** (guarda/estadia/liberação/leilão) — **junta de
  modelagem ANTES de construir** (dossiê §3 / spec §5.1; validar com cliente-alvo). Aceite: spec §1.3
  "Base" 1:58–2:35. ~3 PRs. **Bloqueado por pendência de modelagem.**
- **Ω3F-14 Recorrência** (#26): relança serviço + itens financeiros + tarefas
  (diária/semanal/quinzenal/mensal/anual). **Decisão pendente: entra no v1?** (spec §5.2 / dossiê §4 —
  maior custo/benefício duvidoso; nenhum item depende). Aceite: spec §1.2. ~2 PRs.
- **Ω3F-15 Compartilhar checklist multi-formato** (#13): PDF/link/imagem/e-mail/WhatsApp **com registro
  de quem compartilhou e em que formato**. Reusa execução+evidências existentes. Aceite: spec §1.3
  "Mobile" 0:24–1:35. ~1–2 PRs.
- **Ω3F-16 Beneficiário obrigatório configurável + Mensagens ao profissional** (#25 parte config, #14):
  liga obrigatoriedade de beneficiário a `TenantSetting` (Ω2-e) + canal de mensagens base↔profissional
  na OS. Aceite: spec §1.2 / §1.3 Mobile. ~2 PRs.

**Fase 3 (pós-venda, já no plano):** SMS de rastreio → avaliação do beneficiário (#33, canal cliente
final + WhatsApp BSP) · Importação de serviços de plataformas de assistência/seguradora (#35,
integração externa — PD + junta).

---

## 5. Pendências / decisões abertas para as juntas

1. **Ω3F-4 — estender `ServiceQuote` vs. novo `Quote`+`QuoteItem`** (dossiê §1). Recomendação do plano:
   **estender** para reusar o congelamento de preço. Confirmar na junta do Ω3F-4.
2. **Ω3F-5 — vínculo de tags: `WorkOrderCommentTag` específico vs. `TagAssignment` polimórfico** (dossiê
   §5 / P-Ω2d). Recomendação: **polimórfico**, já servindo OS (#27) e comentário (#10). Confirmar.
3. **#8 standalone × #7 embutido** — mesma tela filtrada por contexto vs. duas rotas (dossiê §2). Decidir
   no Ω3F-4.
4. **Ω3F-13 Base/pátio** — único domínio 100% novo; **junta de modelagem antes de construir**
   (spec §5.1). Fase 2.
5. **Ω3F-14 Recorrência** — decidir se entra no v1 (spec §5.2). Fase 2.
6. **Ω3F-8 provedor de rota/km** — decisão da **Junta de Mapas** (regra de ouro: MapLibre base; SKU pago
   Google = PD + junta 5).

## 6. Encerramento

Ao fechar o Ω3F: matriz **vídeo→timestamp→tela→PR→junta→veredito**, suíte antes→depois, task-history
íntegro, reprovações + atas, KPIs marco `…K` **só após gate humano**. **Descomissionar os agentes de
rodada** (`fid-analista`, `fid-planejador`, `fid-avaliador`) no encerramento (regra do papel).

---

## §6 — DECISÕES E CONDIÇÕES DA JUNTA J-Ω3F-0 (ratificadas, unânime 5/5 — 2026-07-13)

Junta: planejador-mestre · estrategista · critico-adversarial · fid-analista · fid-planejador → **5/5 APROVADO**.
As condições abaixo são **vinculantes** para os comandos B-Ω3F-N dos blocos afetados (não reabrem a lista).

### 6 decisões abertas (§5) — RESOLVIDAS
- **D1 — Orçamento: ESTENDER `ServiceQuote` (não criar `Quote` novo).** Criar filho `ServiceQuoteItem`; **backfill**
  de cada quote single-item existente em 1 item; colunas de item no header viram deprecadas/read-only. Entrega o
  "QuoteItem" da spec sem entidade paralela. (Ω3F-4)
- **D2 — Tags: `TagAssignment` POLIMÓRFICO** (`entity_type` + `entity_id`, tenant-scoped, `@@unique` anti-duplicata),
  nasce no Ω3F-5 já servindo #10 (comentário) e #27 (OS, Fase 2) — polimórfico DESDE já para não retrabalhar.
  Integridade referencial em nível de app/constraint (sem FK nativa). Resolve P-Ω2d.
- **D3 — #7×#8: UM modelo, DUAS superfícies.** Um `ServiceQuote` (`work_order_id` nullable) → rota standalone
  (`OrcamentosPage`) + aba `QuoteTab` na OS; service compartilhado; logs/share por contexto. (Ω3F-4)
- **D4 — Base/pátio (#16): Fase 2, junta de modelagem com o cliente-piloto ANTES de qualquer código.** Não bloqueia a Fase 1.
- **D5 — Recorrência (#26): FORA do v1.** Maior custo, benefício duvidoso, zero dependentes → Fase 2/pós-piloto.
  Registrar **D-Ω3F-RECORRENCIA-ADIADA** em decisoes.md no bloco que a tocar.
- **D6 — Rota/km (Ω3F-8): a Junta de Mapas decide o provedor**, com o precedente #179 explícito: se o SKU do Google
  foi ratificado (J-MAPAS #178/#179), REUSAR o mesmo provedor p/ rota/km da OS (evitar 2 stacks); senão
  MapLibre + engine de rota. **Nenhum SKU pago novo sem PD + junta de 5.**

### Condições C1–C4 (critico-adversarial) — vinculantes
- **C1 (Ω3F-4):** a migração single→multi de `ServiceQuote` **NÃO é puramente aditiva** — o comando DEVE documentar
  o backfill (1 quote → 1 `ServiceQuoteItem`) e o destino das colunas legadas do header (deprecar/read-only).
- **C2 (Ω3F-1):** eliminar a contradição visível×oculto. **PROIBIDO "em breve"/PLANNED na UI do piloto** (§11).
  **Revelação progressiva:** só as abas prontas APARECEM no menu interno; as não-entregues não aparecem (flag OFF
  = ausente, não "em breve").
- **C3 (Ω3F-3/-4):** `ServiceQuoteItem` e `WorkOrderFinancialItem` com **shape/validator COMPARTILHADO** (evita 2
  models divergentes de item quase idêntico).
- **C4 (Ω3F-8 + Ω3F-2):** ANTES da aba Logs, decidir o substrato de auditoria — `AuditLog` (prisma) × `AuditEvent`
  (store core-saas, router `/audit-events` já montado em `core-saas/routes/index.ts:19`) — e **REUSAR o router
  existente filtrando por entidade**, não construir rota paralela às cegas. **Ω3F-2** adiciona um **discriminador
  de tipo em `ServiceCatalog`** (hoje só `category?`) para o "422 se o tipo exigir destino" + campos dinâmicos.

### Condições do fid-planejador (âncora de fidelidade) — vinculantes
- **Ω3F-9** (e **#32 WhatsApp do Ω3F-1**): §1.1 da spec não tem timestamp; ancorar o critério de aceite no quadro
  real **`Detalhes_do_serviço ~0:14`** (matriz linha 20 — frame do badge de atraso e menu ⋮). Sem âncora concreta = veto.
- **Ω3F-5:** contrato DEVE incluir **409** (junção `TagAssignment` `@@unique` já atribuída) e declarar delete lógico
  vs hard-delete da associação (resolver na junta de modelagem da D2).

### Refinamentos menores (registrados; aplicar nos comandos, não bloqueiam)
- **estrategista:** hotspot de merge no registro de abas (`tabs.config.ts` + shell) — cada bloco possui só seu
  `tabs/<x>.tsx` + flip de 1 linha, rebase frequente; **serializar** as migrations aditivas na tabela quente
  `WorkOrder` (-2,-6,-7,-9 rebaseiam sobre a migration anterior, não branches paralelas verdadeiras); **Ω3F-2 pode
  ramificar de main em concorrência com Ω3F-1** (encurta o caminho crítico 1→3→4).
- **fid-analista:** riscar a etiqueta "parte de #14" no dossiê §Ω3F-5 (#14 é entregue inteiro em Ω3F-16/Fase 2).
- **critico:** a matriz pode ler **#11 "✅ back / 🟡 UI"** para não superestimar prontidão de piloto (a aba é Ω3F-5).

**Caminho crítico a vigiar (burnup):** `Ω3F-1 → Ω3F-3 → Ω3F-4`. Reprovou/escorregou -3/-4 → puxar -5/-9/-7 (folga).
