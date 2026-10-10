# B-OS-FILTRAR-EXPORTAR — Plano

> **Planejador:** `planejador-b-os-filtrar-exportar` (identidade nova).
> **Modelo que rodou:** Claude **Opus** — **substituição declarada** (§C7.6-bis, `D-FALLBACK-MODELO-FABLE-OPUS`).
> **Por que o Fable faltou:** o bloco **não toca dinheiro**; por decisão do dono (2026-10-08), o Fable fica
> reservado a bloco de dinheiro. O frontmatter do `planejador-mestre` continua `fable` — o fallback é do invocador.
> **Decisão de origem:** `D-OS-CABECALHO-PADRONIZADO`, opção C (dono, 2026-10-08).
> **Base medida:** `main` = `c8af6458` · worktree `C:/Users/AMP/w-osfe` · ramo `feat/web-os-filtrar-exportar`.
> **Executor previsto:** Codex (`gpt-5.6-sol`) no papel `frontend-pixel-master` (`.agents/agents/frontend-pixel-master.md`).

## 0. Fatos medidos (comando → saída) e hipóteses
Todas as medições foram feitas na ref **`c8af6458`** (worktree `C:/Users/AMP/w-osfe`, `git rev-parse HEAD` =
`c8af64580cb85ddf4960fecb2f8604384f8f0328`; a árvore principal está na mesma ref). O catálogo de permissões foi
**executado** a partir da árvore principal, depois de conferir que o arquivo é idêntico ao da ref
(`git diff --quiet c8af6458 -- src/modules/core-saas/permissions/catalog.ts` → sem diferença). Nenhum servidor nem
banco foi ligado. Marcado **[H]** = hipótese, com o comando que a decide.

### 0.1 A tela hoje

| # | Fato | Comando → saída |
|---|---|---|
| F1 | A lista fixa todos os filtros em `STABLE_FILTERS` (l.81) e passa essa constante ao hook (l.138). O cabeçalho só tem "Nova OS", com o gate `work_orders:create` (l.240-258). O comentário das l.29-30 e l.249-251 registra que Filtrar/Exportar foram omitidos por não terem função. | `sed -n 81p;138p;240,258p frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx` |
| F2 | `useWorkOrders(filters)` coloca `filters` nas dependências do `refresh` (`useCallback`, l.33-42), e um `useEffect([refresh])` (l.44-46) dispara a busca. **Objeto de filtros novo a cada render = busca em laço.** É por isso que existe a constante. | `sed -n 33,46p frontend/src/modules/work-orders/useWorkOrders.ts` |
| F3 | Mudar o filtro dispara `refresh()` **em primeiro plano** (`background=false` → `setLoading(true)` → linhas-esqueleto). O auto-refresh chama `refresh(true)` por uma **ref** (`savedRefresh.current`), então usa sempre os filtros do render mais recente e não reinicia o intervalo quando `refresh` muda. | `cat frontend/src/hooks/useAutoRefresh.ts` (l.28-41) |
| F4 | O hook devolve `items: filterWorkOrders(state.data.items, filters)`: aplica **de novo, no cliente**, os mesmos filtros já mandados ao backend. No modo de demonstração (`VITE_USE_MOCKS=true`) o serviço devolve o mock **sem filtrar** (`work-orders.service.ts` l.45), e só o filtro do cliente age. | `sed -n 48,51p frontend/src/modules/work-orders/useWorkOrders.ts`; `sed -n 44,46p frontend/src/modules/work-orders/work-orders.service.ts` |
| F5 | `refresh` **não tem guarda de ordem**: duas buscas em voo podem chegar fora de ordem, e a última a chegar vence (`setState` incondicional, l.39). Hoje o filtro é constante e isso não aparece. Com filtro variável, a troca rápida de prioridade (ou um tick do auto-refresh em voo durante a troca) pode deixar na tela a resposta do filtro anterior. | `sed -n 33,42p frontend/src/modules/work-orders/useWorkOrders.ts` |
| F6 | `buildQuery` já envia `priority`, `from`, `to` (e `status`, `search`, `assignedOperatorId`). **Não envia `limit`.** | `sed -n 332,341p frontend/src/modules/work-orders/work-orders.service.ts` |
| F7 | O backend aceita `priority`, `assignedOperatorId`, `assignedUserId`, `from`, `to` e `search` (`ListWorkOrdersInput`), e o `limit` padrão é **20** (máximo 100). | `sed -n 264,275p src/modules/work-orders/work-order.types.ts`; `sed -n 385,394p src/modules/work-orders/work-order.validators.ts` |
| F8 | **Divergência de semântica do período.** O backend filtra `from`/`to` pela data de **abertura** (`created_at gte/lte`), mas o adaptador do front filtra por **agenda com fallback** (`item.scheduledFor ?? item.createdAt`). Mandar `from`/`to` como estão faria a tela mostrar a **interseção** dos dois critérios. | `sed -n 687,700p src/modules/work-orders/work-order-prisma.repository.ts` (`created_at: { gte, lte }`); `sed -n 135,155p frontend/src/modules/work-orders/work-orders.adapter.ts` (l.146); o repositório em memória concorda com o Prisma (`work-order.repository.ts` l.287-288, `workOrder.createdAt`) |
| F9 | O backend lê `from`/`to` com `new Date(String(value))` (`parseOptionalDate`, validators l.115-124). Uma data **sem hora** (`"2026-10-07"`) vira meia-noite **UTC**: com `lte`, o dia 07 fica **de fora**, e o início desloca 3 h em BRT. Por isso a tela precisa mandar **instantes ISO** (início e fim do dia local), não a string do `<input type="date">`. | `sed -n 115,124p src/modules/work-orders/work-order.validators.ts` |
| F10 | `filterWorkOrders` é usado só por `useWorkOrders` e pelo teste `frontend/tests/work-orders.adapter.test.ts` (que manda `from:""`/`to:""`). `useWorkOrders` tem 4 consumidores: a lista de OS e mais 3 (`DanosPage`, `EstoquePage`, `EstoqueDetailPage`), todos com filtros constantes. | `grep -rn "filterWorkOrders" frontend/src frontend/tests`; `grep -rn "useWorkOrders(" frontend/src` |
| F11 | O DTO da lista (`toWorkOrderListDto`) traz `id, code, title, status, priority, customerName, serviceAddress, serviceLatitude/Longitude, assignedOperatorId, assignedUserId, vehicleId, scheduledFor, slaDueAt, createdAt`, além de `pagination {limit, offset, total}`. **Não traz** `serviceCity`, `serviceState`, `checklistId` nem o nome do técnico. | `sed -n 121,151p src/modules/work-orders/work-order.dto.ts` |
| F12 | Quando a API devolve 0 itens, o reducer marca `status="empty"` (`work-orders.state.ts`, `nextListState`), e a página escolhe a cópia do vazio por `filtered={items.length > 0}` (l.337) e o CTA por `items.length === 0 && canCreate` (l.338). Com um filtro **no servidor** que zere a lista, a tela diria "Nenhuma ordem de serviço" e ofereceria "Nova OS", **cópia errada**. | `sed -n 332,339p frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx`; `sed -n 85,95p frontend/src/modules/work-orders/work-orders.state.ts` |
| F13 | `PRIORITY_LABEL` da página tem acento ("Média"). O do adaptador (`priorityLabels`, l.58-63) diz "Media", sem acento, e é usado pelo Mapa Operacional e pelo `WorkOrderPriorityBadge`. **Pré-existente, fora deste bloco.** | `sed -n 51,56p` da página; `sed -n 58,63p` do adaptador; `grep -rn getWorkOrderPriorityLabel frontend/src` |
| F14 | O selo de atraso da linha usa `isWorkOrderDelayed(scheduledFor, status)`, com o texto visível "Atrasada" (`WorkOrderDelayBadge.tsx` l.24-42). Os rótulos de situação vêm de `WORK_ORDER_STATUS_LABEL` (`work-orders-row.logic.ts` l.11-22). | leitura direta |

### 0.2 O precedente (Auditoria) e o utilitário de CSV

| # | Fato | Comando → saída |
|---|---|---|
| F15 | `frontend/src/lib/csv.ts`: `csvCell` (aspas quando há `;`, aspas ou quebra de linha), `buildCsv` (`;` e `\r\n`) e `downloadCsv(filename, header, rows)` (BOM UTF-8; no-op sem DOM). **Não neutraliza fórmula** (célula que começa com `=`, `+`, `-`, `@`). Tem 7 consumidores. | `cat frontend/src/lib/csv.ts`; `grep -rln downloadCsv frontend/src` → 7 páginas |
| F16 | A Auditoria exporta só os eventos carregados (`exportAuditCsv`, l.39-43, arquivo fixo `auditoria.csv`), com o botão desabilitado quando `events.length === 0` (l.144) e explicação no `title` (l.191). O botão "Filtros" é `pat-btn` com `aria-expanded` e `aria-controls="audit-filtros"` (l.176-185). O cartão de filtros (`pat-filter-card` > `pat-filter-grid` > `pat-filter-field`, com label+`htmlFor`, `<input type="date">` e "Limpar" desabilitado sem filtro ativo) fica **entre os KPIs e a tabela** (l.267-319). | `sed -n 37,43p;144p;161,199p;266,319p frontend/src/modules/audit/pages/AuditTenantPage.tsx` |
| F17 | Os outros 6 exportadores usam nome fixo em kebab-case pt-BR (`acessos.csv`, `remuneracoes.csv`, `dispositivos.csv`…). | `grep -rn "downloadCsv(" frontend/src/modules` |
| F18 | `.pat-filter-grid` tem **5 colunas** `1.2fr 1.2fr 1fr 1fr auto` (2 colunas abaixo de 960px). `.pat-btn` = `flex · gap 7 · padding 9px 14px · #fff · borda 1px #E2E8F0 · raio 9 · 12.5px/700 · #475569`, hover borda e texto `#2563EB`, foco `outline 2px #2563EB offset 2`. Existe `.sr-only` em `global.css`. **Não existe** regra `.pat-btn:disabled`: a Auditoria desabilita com estilo inline (`opacity .55; cursor not-allowed`). | `sed -n 3068,3097p;3322,3330p;3929,3978p frontend/src/styles/app.css`; `sed -n 35,45p frontend/src/styles/global.css` |
| F19 | `tests/pattern-css-guard.test.ts` exige que as regras estruturais sobrevivam ao parser (comentário com `*/` no meio derruba a regra seguinte). | `sed -n 1,60p frontend/tests/pattern-css-guard.test.ts` |

### 0.3 Permissão (premissa A3), medida

| # | Fato | Comando → saída |
|---|---|---|
| F20 | **A lista** é guardada no front por `PermissionGuard permissions={["work_orders:read"]}` (`App.tsx` l.767-773) e no backend por `GET /work-orders` → `requirePermission(WORK_ORDER_PERMISSIONS.read)` = `"work_orders:read"` (`work-order.routes.ts` l.103-109, constante l.30). | `sed -n 767,773p frontend/src/App.tsx`; `sed -n 103,109p src/modules/work-orders/work-order.routes.ts` |
| F21 | **A exportação da Auditoria não tem permissão própria.** O botão depende só de haver eventos (`canExport = events.length > 0`); a página é guardada por `["audit:read","audit.read","audit:view"]` (`App.tsx` l.559-565), e o backend, por `requirePermission("audit.read")` (`audit.routes.ts` l.43-45). Exportar = baixar o que a permissão de leitura já mostrou. | `sed -n 144p` da Auditoria; `sed -n 559,565p frontend/src/App.tsx`; `grep -n requirePermission src/modules/core-saas/routes/audit.routes.ts` |
| F22 | Não existe permissão de exportação em lugar nenhum: `grep -ci export RBAC_MATRIX.md` = **0**; `APPROVAL_LIMITS.md` = **0**; `:export` no catálogo = **0**. | comandos citados |
| F23 | Catálogo **executado**: 13 papéis; **11 têm** `work_orders:read` (`super_admin, tenant_admin, manager, technician, field_dispatcher, viewer, platform_admin, operator, finance, field_technician, auditor`), **2 não têm** (`inventory, support`). Observação lateral: o bullet antigo da l.117 do `RBAC_MATRIX.md` (Ω3F-8a) ainda diz que `finance` não tem `work_orders:read`, mas a l.45 da matriz e o catálogo dão a permissão. A concessão foi decidida (`D-SAN3-PLANO-OPCAO-B`) e feita pelo `B-SAN3-04a` (`pendencias.md` l.9271 e l.9308). É texto defasado da matriz, fora deste bloco. | `node --import tsx <scratchpad>/roles.mts` (importa `ROLE_PERMISSIONS` de `src/modules/core-saas/permissions/catalog.ts`) |

### 0.4 Testes e ambiente

| # | Fato | Comando → saída |
|---|---|---|
| F24 | `frontend/tests/work-orders-page-live.test.tsx` monta a **página real** com o hook real sobre um DOM mínimo, com `fetch` dublado por tabela de rotas (`installFetch`, l.387-395); o intervalo do auto-refresh é **capturado** e disparado à mão (`backgroundTick`, l.505). Ele **não dispara eventos de usuário** (`P-SAN3-01B-PAGINA-FIACAO-DE-INTERACAO`, ABERTA). Assere a ausência de `console.error` por caso. | `sed -n 1,30p;387,470p;505,520p frontend/tests/work-orders-page-live.test.tsx` |
| F25 | O React instalado é **19.2.6**, e o `react-dom` grava as props do elemento em `__reactProps$<sufixo>` no nó DOM (`internalPropsKey`, 16 ocorrências no bundle de desenvolvimento). | leitura de `react/package.json` na árvore principal; `grep -c internalPropsKey frontend/node_modules/react-dom/cjs/react-dom-client.development.js` |
| F26 | `test:smoke` lista os arquivos **explicitamente**. Teste novo só roda no smoke se for **acrescentado** à lista em `frontend/package.json` (precedente: o último item, `tests/san3-04a-…`). | `node -e` imprimindo `scripts["test:smoke"]` de `frontend/package.json` |
| F27 | Só 3 testes da suíte backend leem fonte do front, e **nenhum** lê arquivo que este bloco toca: `approval-frontend-contract` (`WorkOrderDetailPage.tsx`, `GeneralInfoTab.tsx`, `approval.service.ts`), `checklist-editor-blockers-parity` e `san3-04a-menu-front-x-catalogo` (`appSidebarNav.ts`, `auth.adapter.ts`, `App.tsx`). | `grep -rln "frontend/src" tests/*.test.ts` + `grep -on` dos caminhos |
| F28 | `npm test` (raiz) roda `scripts/run-backend-tests.mjs`, que força `CORE_SAAS_PERSISTENCE=memory` quando a variável não está exportada. **Não precisa de banco.** | `sed -n 28,45p scripts/run-backend-tests.mjs` |
| F29 | O worktree **não tem `node_modules`** (nem na raiz nem em `frontend/`). | `ls /c/Users/AMP/w-osfe/node_modules` → ausente |
| F30 | `[G1b]` de `frontend/tests/work-orders-honest-errors.test.tsx` varre `src/modules/work-orders/**` (arquivo novo incluso) e reprova **literal de objeto com `id`/`code` constante** em ramo de falha (`catch`, `.catch(`, `??`, `OR lógico`). | `sed -n 1209,1260p frontend/tests/work-orders-honest-errors.test.tsx` |

### 0.5 Hipóteses abertas (não medidas)

- **[H1]** O `title` de um `<button disabled>` aparece como dica no Chrome e no Edge (o precedente da Auditoria depende
  disso). Não é garantido para leitor de tela. Decide: abrir `/audit` vazio no navegador e passar o mouse sobre
  "Exportar". O plano não depende só do `title` (ver §6).
- **[H2]** O Excel pt-BR abre o arquivo com acento e colunas certas (BOM + `;`). Herdado do D-Ω4C-REM-CSV, não
  re-medido aqui. Decide: abrir o CSV gerado no Excel.
- **[H3]** Uma célula começando com `=`, `+`, `-` ou `@` é interpretada como fórmula pelo Excel/LibreOffice (classe
  "CSV injection", OWASP). Conhecimento de domínio, **não pesquisado nesta sessão**; o plano neutraliza por defesa
  (ver §4.3), sem custo para o dado legítimo. Decide: abrir no Excel um CSV com a célula `=1+1`.

## 0.6 Premissa de permissão (achado A3 do revisor do #408)
**Medido (F20–F23):** a lista abre com `work_orders:read` (front `PermissionGuard` e backend `requirePermission`);
a exportação da Auditoria, o precedente nomeado, **não tem permissão própria**: o botão depende só de haver linha,
e o dado exportado é o que a leitura já trouxe. Não existe permissão de exportação no catálogo, no
`RBAC_MATRIX.md` nem no `APPROVAL_LIMITS.md`.

**Premissa do orquestrador, adotada por este plano (NÃO é decisão do dono):** exportar a lista de OS usa a mesma
permissão que abre a lista (`work_orders:read`) e leva **só o que a tela mostra** (§4). Consequência técnica: a
exportação é **local** (monta o arquivo no navegador a partir das linhas já carregadas). **Não há endpoint novo,
nem chamada de rede nova, nem mudança no backend.** Quem não tem `work_orders:read` não chega à tela (guarda de
rota) e, se o backend responder 403 com a tela aberta, os botões Filtrar e Exportar somem (§3.4).

**O que muda se o dono escolher uma permissão própria (ex.: `work_orders:export`):**

1. **Um gate só no front seria cosmético.** O mesmo dado continua acessível por `GET /work-orders` a quem tem
   `work_orders:read`, e o backend é a autoridade final (§2.4). Uma permissão de exportação com sentido exige uma
   **rota de exportação no backend** (`GET /api/v1/work-orders/export`, `requirePermission("work_orders:export")`,
   tenant do JWT, 403 sem a permissão) e, provavelmente, um **evento de auditoria** da exportação (metadados em
   allowlist: quantidade e filtros; nunca nome de cliente nem id).
2. **Catálogo e matriz:** permissão nova em `src/modules/core-saas/permissions/catalog.ts`, a distribuição por
   papel decidida pelo dono, a linha correspondente no `RBAC_MATRIX.md` e, se for no banco, seed/migração de
   permissão (escopo hoje **proibido** a este bloco).
3. **Front:** o botão passa a ter o gate `permissions.includes("work_orders:export")`, com o mesmo teste papel a
   papel do `[GB1]`.
4. **Governança:** o bloco passa a mexer em **permissão** → **junta completa** (inspetor de terreno, 3 cadeiras,
   unanimidade; §C7 item 8(1)), e este plano deixa de valer para o Exportar. O Filtrar não muda: ele não exporta
   nada e usa só parâmetros que a rota de leitura já aceita.

**Rota de aprovação condicionada à premissa** (detalhe em §10):
- **Premissa vale** → `D-GOV-PROPORCIONAL` regra (1): **um revisor independente** (não escreveu nem planejou) **+ CI
  verde**, sem inspetor e sem ata de junta.
- **Premissa cai** (o dono quer permissão própria) → o Exportar sai deste bloco e vai para um bloco de **junta
  completa**. O Filtrar pode seguir sozinho pela regra (1). Até o dono falar, o dev implementa conforme a premissa,
  e o PR declara a premissa no corpo, em destaque, para o dono poder vetar.

## 1. Objetivo · ator · fluxo
**Objetivo.** O cabeçalho da lista de Ordens de Serviço (`/work-orders`) passa a ter, nesta ordem, **Filtrar ·
Exportar · Nova OS**, como no design padronizado (`sc_os`), e os dois botões novos **funcionam**:
- **Filtrar** abre um cartão com **Prioridade** e **Data de abertura** (atalho + De/Até). Os filtros vão ao backend
  pela rota que já existe, e o botão mostra quantos filtros estão ativos.
- **Exportar** baixa uma planilha CSV com **exatamente as linhas que a pessoa vê** (filtros do cartão + aba + busca,
  todas as páginas do paginador), só com as colunas que a tela mostra.

Fora do bloco: o filtro por **Técnico** (depende de `P-WO-LIST-TECH-NAME`), filtros na URL (§3.2), paginação no
servidor (§9, R3), e qualquer mudança no backend.

**Ator.** Qualquer pessoa cujo perfil tem `work_orders:read` na organização ativa (11 dos 13 papéis do catálogo,
F23; por exemplo Operação de Campo, Gestor, Financeiro, Auditor). A organização vem **do token** (`tenant_id` do
JWT), nunca de parâmetro.

**Fluxo origem → destino.**

*Filtrar:* clique em "Filtrar" → o cartão `#os-filtros` abre entre os KPIs e a tabela → a pessoa escolhe Prioridade
e/ou Data de abertura → a página recalcula os filtros da consulta (memo por valor) → `useWorkOrders` refaz
`GET /api/v1/work-orders?priority=…&from=<ISO início do dia local>&to=<ISO fim do dia local>` em primeiro plano
(esqueleto nas linhas) → o backend filtra por organização do token + `priority` + `created_at` → lista, KPIs, contagem
"N ordens" e paginador mostram o recorte → o botão mostra o selo com o número de filtros ativos → o auto-refresh
(30 s) continua usando os mesmos filtros.

*Exportar:* clique em "Exportar" → função pura monta cabeçalho + linhas a partir da lista **já filtrada na tela** →
`downloadCsv(...)` (`frontend/src/lib/csv.ts`, inalterado) gera o arquivo no navegador → download de
`ordens-de-servico.csv`. **Nenhuma requisição de rede.**

**Contrato.** Nenhuma rota nova. Reusa `GET /api/v1/work-orders` com parâmetros que o backend já aceita (F7):
`priority ∈ {low, medium, high, urgent}` (valor inválido → 400 `invalid_priority`, `work-order.validators.ts` l.63-71), `from`/`to` em ISO-8601
(inválido → 400 `invalid_date`), `403` sem `work_orders:read`. Os códigos do molde **404 cross-tenant / 422 transição
inválida / 409 duplicidade não se aplicam**: não há escrita nem recurso por id, e a organização não é parâmetro.

**Modelagem.** Nenhuma: sem model, sem migration, sem dinheiro. O período usa a coluna `created_at` (`timestamptz`)
que o backend já filtra.

## 2. Escopo permitido / proibido
Regra do espelho: **módulo de referência = Auditoria** (`frontend/src/modules/audit/pages/AuditTenantPage.tsx`) para o
botão de filtros, o cartão e o Exportar; **a própria lista de OS** para estados, KPIs e testes vivos.

### 2.1 Permitido (caminhos exatos; nada além disto)

| # | Caminho | O que pode mudar |
|---|---|---|
| A1 | `frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx` | ações do cabeçalho; estado do cartão; ligação dos filtros ao hook; cópia do vazio com filtro (F12); exportação; remoção de `STABLE_FILTERS` e de `PRIORITY_LABEL` local (vai para A4); comentários das l.29-30 e l.249-251 reescritos |
| A2 | `frontend/src/modules/work-orders/useWorkOrders.ts` | **só** a guarda de ordem das respostas (§3.8). Assinatura e retorno do hook inalterados |
| A3 | `frontend/src/modules/work-orders/work-orders.adapter.ts` | **só** a linha do período em `filterWorkOrders` (l.146): `item.scheduledFor ?? item.createdAt` → `item.createdAt` (§3.9). Nada mais no arquivo, nem o rótulo "Media" (F13) |
| A4 | `frontend/src/modules/work-orders/work-orders-row.logic.ts` | **acrescentar** `WORK_ORDER_PRIORITY_LABEL` (o `PRIORITY_LABEL` da página, movido sem mudar texto) e `workOrderServiceLine(o)` (a composição "título · cidade/UF" da página, l.345-347, movida sem mudar resultado). Nada existente muda |
| A5 | `frontend/src/modules/work-orders/work-orders-list-filters.ts` (**novo**) | estado do cartão, atalhos de período, conversão para a consulta, contagem de filtros ativos, intervalo invertido (§3.1, §3.5) |
| A6 | `frontend/src/modules/work-orders/work-orders-export.ts` (**novo**) | colunas, linhas, neutralização de fórmula, nome do arquivo, disponibilidade+dica do botão (§4) |
| A7 | `frontend/src/modules/work-orders/components/WorkOrdersListFilterCard.tsx` (**novo**) | o cartão de filtros, só apresentação (§3.5) |
| A8 | `frontend/src/styles/app.css` | **só acrescentar** `.pat-btn--engaged` e `.pat-btn__count` logo depois de `.pat-btn--primary:hover` (l.3092-3096). Comentário sem `*/` no meio (F19) |
| A9 | `frontend/tests/work-orders-list-tools.test.ts` (**novo**) | testes puros de A4–A6 (§7.1) |
| A10 | `frontend/tests/work-orders-page-live.test.tsx` | **acrescentar** os casos `[FE*]` (§7.2), o ajudante de evento, a captura de URL e de download. Os 13 casos existentes ficam **como estão**. No arnês existente, só três mudanças, todas inertes para os casos atuais: (a) `installFetch` registra a URL em `requestedUrls` e a passa ao respondedor (`respond(url)`); (b) `mount` zera `requestedUrls`; (c) `MiniElement` ganha `click()`, que só registra `{ download, href }` num array do arnês |
| A11 | `frontend/tests/work-orders.adapter.test.ts` | **acrescentar** o caso do período por abertura (§7.1, `[AD1]`) |
| A12 | `frontend/package.json` | **só** acrescentar ` tests/work-orders-list-tools.test.ts` ao **fim** de `scripts["test:smoke"]` (F26). Nenhuma dependência |
| A13 | `docs/revisoes/B-OS-FILTRAR-EXPORTAR-dev.md` (**novo**) | relatório do dev com o checklist Solicitado · Feito · Não feito · Validação · Próximos passos (`D-CODEX-DISPONIVEL`) e a tabela de mutações (§7.3) |

### 2.2 Proibido (não tocar, nem "de passagem")

- **Backend e banco:** `src/**`, `prisma/**`, `prisma.config.ts`, `migrations/**`, `tests/**` (a suíte backend da
  raiz), `scripts/**`, `infra/**`, `.github/**`.
- **Segredos e travas:** `.env*`, `package-lock.json`, `frontend/package-lock.json`, qualquer `dependencies` ou
  `devDependencies`. **Nenhuma dependência nova** (decisão crítica de junta-5, §C7.1).
- **KPI congelado** (`D-GOV-PROPORCIONAL` (5)): `Kpis/**`.
- **Compartilhados que outras telas usam:** `frontend/src/lib/csv.ts` (7 consumidores, F15),
  `frontend/src/components/patterns/**` (o `PageHeader` serve as 5 telas), `frontend/src/hooks/useAutoRefresh.ts`,
  `frontend/src/App.tsx`, `frontend/src/modules/audit/**`.
- **Resto do módulo de OS:** `work-orders.service.ts` (o `buildQuery` já envia o que precisa, F6),
  `work-orders.state.ts`, `work-orders.types.ts`, `work-orders.mock.ts`, `index.ts` e
  `components/WorkOrdersFilters.tsx`. Este último é um componente **legado, sem nenhum import** (medido:
  `grep -rn "components/WorkOrdersFilters" frontend/src frontend/tests` → 0), com cópia sem acento e "UUID ou user
  ID" na tela. **Não reusar e não apagar.**
- **Guardas existentes:** `frontend/tests/work-orders-honest-errors.test.tsx`, `frontend/tests/pattern-css-guard.test.ts`
  (devem continuar verdes **sem edição**).
- **Governança e registro:** `CLAUDE.md`, `AGENTS.md`, `RBAC_MATRIX.md`, `agent-orchestration/**`, `docs/**`
  (exceto A13), `.claude/**`, `.agents/**`, `screen-refs/**`, `*.dc.html`. O registro (decisões/pendências) é do
  orquestrador, no PR do bloco ou no PR semanal (`D-GOV-PROPORCIONAL` (3)). As pendências a abrir estão em §9.3.

**Verificação de escopo (o dev roda, o revisor re-roda):**
```bash
cd C:/Users/AMP/w-osfe
git diff --name-only c8af6458...HEAD | sort > /tmp/osfe-tocados.txt   # (no Windows: arquivo no scratchpad)
cat /tmp/osfe-tocados.txt
# esperado: subconjunto EXATO de A1..A13 (13 caminhos no máximo; os 4 "novos" aparecem só se criados)
```

## 3. Desenho
### 3.1 Estado do filtro (A5 + A1)

`work-orders-list-filters.ts` (novo, **puro**, sem React) exporta exatamente:

```ts
export type WorkOrdersListFilterState = {
  readonly priority: WorkOrderPriority | "all";
  readonly from: string; // "AAAA-MM-DD" do <input type="date"> (data LOCAL) ou ""
  readonly to: string;   // idem
};
export const EMPTY_LIST_FILTERS: WorkOrdersListFilterState; // { priority: "all", from: "", to: "" }, congelado
export const PRIORITY_FILTER_ORDER: readonly WorkOrderPriority[]; // ["urgent", "high", "medium", "low"]
export type OpeningPeriodKey = "all" | "today" | "7d" | "30d" | "custom";
export const OPENING_PERIOD_OPTIONS: readonly { key: Exclude<OpeningPeriodKey, "custom">; label: string }[];
//   all "Qualquer data" · today "Hoje" · 7d "Últimos 7 dias" · 30d "Últimos 30 dias"
export const CUSTOM_PERIOD_LABEL = "Período personalizado";
export function localDateString(date: Date): string;              // "AAAA-MM-DD" no fuso local
export function openingPeriodRange(key: Exclude<OpeningPeriodKey, "custom">, now: Date): { from: string; to: string };
//   all → {"",""} · today → {hoje, hoje} · 7d → {hoje−6 dias, ""} · 30d → {hoje−29 dias, ""}
//   ARITMÉTICA DE CALENDÁRIO: new Date(a, m, d − 6), nunca now − 6×86 400 000 ms
export function deriveOpeningPeriod(state: WorkOrdersListFilterState, now: Date): OpeningPeriodKey;
export function parseLocalDate(value: string): Date | null;       // meia-noite LOCAL; null se vazio, fora de /^\d{4}-\d{2}-\d{2}$/
                                                                   // ou data inexistente (ida e volta a/m/d tem de bater: 2026-02-31 → null)
export function toApiFilters(state: WorkOrdersListFilterState): WorkOrdersFilters;
//   { search: "", status: "all", assignedOperatorId: "", priority: state.priority,
//     from: parseLocalDate(from) → new Date(a, m, d, 0, 0, 0, 0).toISOString()     | "" ,
//     to:   parseLocalDate(to)   → new Date(a, m, d, 23, 59, 59, 999).toISOString() | "" }
export function countActiveFilters(state: WorkOrdersListFilterState): number;
//   (priority !== "all" ? 1 : 0) + (parseLocalDate(from) || parseLocalDate(to) ? 1 : 0)  → 0, 1 ou 2
export function isRangeInverted(state: WorkOrdersListFilterState): boolean; // as duas datas válidas e from > to
```

Na página (A1):

```ts
const [listFilters, setListFilters] = useState<WorkOrdersListFilterState>(EMPTY_LIST_FILTERS);
const [filtersOpen, setFiltersOpen] = useState(false);            // fechado: a tela inicial = o design
// Memo POR VALOR (F2): objeto novo só quando um dos 3 valores muda → sem busca em laço, sem busca repetida.
const { priority: fPriority, from: fFrom, to: fTo } = listFilters;
const apiFilters = useMemo(() => toApiFilters({ priority: fPriority, from: fFrom, to: fTo }), [fPriority, fFrom, fTo]);
const { items, allItems, pagination, loading, source, status, error, stale, lastUpdatedAt, refresh, context } = useWorkOrders(apiFilters);
const activeFilterCount = countActiveFilters(listFilters);
const updateListFilters = (next: WorkOrdersListFilterState) => { setListFilters(next); setPage(0); };
```

`STABLE_FILTERS` sai da página. Busca e abas **continuam no cliente**, como hoje, aplicadas por cima dos itens que o
hook devolve.

### 3.2 O filtro NÃO vai para a URL, e por quê

Decisão deste plano: o estado do cartão fica **no estado do componente**, como a busca e as abas já ficam.
1. **Consistência:** hoje nem a busca nem a aba vão para a URL. Pôr só Prioridade e Período criaria um estado
   meio-persistido: voltar do detalhe da OS traria o filtro, mas não a aba nem a busca.
2. **Superfície:** parâmetro de URL é entrada não confiável. Exigiria lista branca de prioridade, validação de
   datas, testes de URL maliciosa e um caminho de "semear e limpar" (o padrão `actorId` da Auditoria, l.95-105).
   Nada disso foi pedido.
3. **Pedido do dono:** a opção C pede Filtrar e Exportar funcionando, não links compartilháveis.
4. **Custo de mudar depois:** baixo. O estado já é um objeto serializável (`WorkOrdersListFilterState`), e passar
   para `useSearchParams` é uma troca local na página.

Consequência aceita: ao sair da lista (por exemplo, para o detalhe) e voltar, o filtro zera, como já acontece com a
busca e a aba. Fica como sugestão em "próximos passos", sem pendência.

### 3.3 Interação com o auto-refresh

Nada muda no `useAutoRefresh` (proibido). Ele chama `savedRefresh.current(true)` (F3), e `savedRefresh.current` é o
`refresh` do último render, que fecha sobre os `apiFilters` vigentes. Logo, **o tick de 30 s repete a consulta com
os filtros que a pessoa escolheu**, e um teste fixa isso (`[FE8]`). A troca de filtro faz busca em **primeiro plano**
(esqueleto). O tick continua em **segundo plano** (sem esqueleto). A corrida entre os dois é tratada pela guarda de
ordem (§3.8).

### 3.4 Estados obrigatórios (§7 do contrato), botão a botão

`kind = listStatusKind(status)` (já existe). `total` = linhas visíveis depois de aba + busca (já existe, l.219).

| Estado | Filtrar | Exportar | Cartão (se aberto) | Painel da tabela |
|---|---|---|---|---|
| carregando (1ª carga ou troca de filtro; `loading`) | visível, ativo | visível, **desabilitado**, dica "Aguarde: a lista ainda está carregando." | continua aberto e editável | esqueleto (como hoje) |
| pronto, com linhas | visível | **habilitado**, dica §4.4 | — | linhas |
| pronto, `total === 0` por aba/busca | visível | desabilitado, "Nenhuma ordem na lista para exportar." | — | "Nenhuma OS para os filtros atuais" (como hoje) |
| vazio **sem** filtro do cartão | visível | desabilitado, idem | — | "Nenhuma ordem de serviço" + CTA "Nova OS" (como hoje) |
| vazio **com** filtro do cartão (`activeFilterCount > 0`) | visível, com selo | desabilitado, idem | — | **"Nenhuma OS para os filtros atuais", sem CTA no painel** (corrige F12) |
| erro (`kind === "failure"`, `status === "error"`) | visível | desabilitado, "Nada para exportar: a lista não carregou." | continua (trocar o filtro é uma nova tentativa) | painel de erro (como hoje) |
| **sem permissão** (`status === "forbidden"`) | **não renderiza** | **não renderiza** | **não renderiza** (`filtersOpen` é ignorado) | painel "Sem permissão…" (como hoje) |
| dados desatualizados (`stale`) | visível | habilitado; a dica ganha o aviso de desatualizado | — | faixa + linhas (como hoje) |
| demonstração (`source === "mock"`) | visível | habilitado; arquivo `ordens-de-servico-demonstrativo.csv`; a dica termina em "Dados demonstrativos." | — | pílula "Dados demonstrativos" (como hoje) |
| lista parcial (`pagination.total > allItems.length`, F7/R3) | — | a dica avisa que a tela mostra só as mais recentes | — | — |

**Contêiner de ações vazio:** o `PageHeader` só omite o contêiner quando `actions` é falso. A página passa
`actions={showListActions || canCreate ? <>…</> : undefined}`, com `showListActions = status !== "forbidden"`, para
que **sem permissão e sem `work_orders:create`** o cabeçalho continue sem contêiner, como hoje.

**Cópia do vazio com filtro (F12), na página:**
```tsx
filtered={items.length > 0 || activeFilterCount > 0}
onCreate={items.length === 0 && activeFilterCount === 0 && canCreate ? () => navigate("/work-orders/new") : undefined}
```

### 3.5 O cartão de filtros (A7: `components/WorkOrdersListFilterCard.tsx`)

Componente **só de apresentação**. Recebe o estado e devolve o próximo; não busca nada.

```ts
export function WorkOrdersListFilterCard(props: {
  readonly id: string;                                   // "os-filtros"
  readonly value: WorkOrdersListFilterState;
  readonly now: Date;                                    // para deriveOpeningPeriod e para os atalhos
  readonly onChange: (next: WorkOrdersListFilterState) => void;
  readonly onClear: () => void;
}): JSX.Element
```

Marcação (espelho exato da Auditoria, F16), com 5 filhos na grade de 5 colunas (`1.2fr 1.2fr 1fr 1fr auto`, F18):
**nenhuma regra de grade nova**.

```tsx
<div className="pat-filter-card" id={id} role="group" aria-label="Filtros da lista de ordens de serviço">
  <div className="pat-filter-grid">
    <div className="pat-filter-field">
      <label htmlFor="os-filtro-prioridade">Prioridade</label>
      <select id="os-filtro-prioridade" value={value.priority}
              onChange={(e) => { const p = e.target.value;
                                 if (p !== "all" && !PRIORITY_FILTER_ORDER.includes(p as WorkOrderPriority)) return; /* valor estranho: ignorado */
                                 onChange({ ...value, priority: p as WorkOrdersListFilterState["priority"] }); }}>
        <option value="all">Todas as prioridades</option>
        {PRIORITY_FILTER_ORDER.map((p) => <option key={p} value={p}>{WORK_ORDER_PRIORITY_LABEL[p]}</option>)}
      </select>
    </div>
    <div className="pat-filter-field">
      <label htmlFor="os-filtro-abertura">Data de abertura</label>
      <select id="os-filtro-abertura" value={period /* = deriveOpeningPeriod(value, now), no topo */}
              onChange={(e) => { const option = OPENING_PERIOD_OPTIONS.find((o) => o.key === e.target.value);
                                 if (!option) return; /* "custom" e valor estranho: ignorados */
                                 const r = openingPeriodRange(option.key, new Date()); onChange({ ...value, from: r.from, to: r.to }); }}>
        {OPENING_PERIOD_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        {period === "custom" ? <option value="custom">{CUSTOM_PERIOD_LABEL}</option> : null}
      </select>
    </div>
    <div className="pat-filter-field">
      <label htmlFor="os-filtro-de">De</label>
      <input id="os-filtro-de" type="date" value={value.from} max={value.to || undefined}
             onChange={(e) => onChange({ ...value, from: e.target.value })} />
    </div>
    <div className="pat-filter-field">
      <label htmlFor="os-filtro-ate">Até</label>
      <input id="os-filtro-ate" type="date" value={value.to} min={value.from || undefined}
             onChange={(e) => onChange({ ...value, to: e.target.value })} />
    </div>
    <button type="button" className="pat-btn" disabled={countActiveFilters(value) === 0} onClick={onClear}>Limpar</button>
  </div>
  {isRangeInverted(value) ? (
    <p role="status" style={{ margin: "10px 0 0", fontSize: 12, fontWeight: 600, color: "#B45309" }}>
      A data “De” é posterior à data “Até”: nenhuma ordem cabe nesse intervalo.
    </p>
  ) : null}
</div>
```

Regras:
- No topo do componente: `const period = deriveOpeningPeriod(value, now);`. No `onChange` do atalho:
  `const key = e.target.value; const option = OPENING_PERIOD_OPTIONS.find((o) => o.key === key); if (!option) return;`
  e só então `openingPeriodRange(option.key, new Date())`. O mesmo vale para a prioridade: valor fora de
  `"all"` + `PRIORITY_FILTER_ORDER` é ignorado (`onChange` não é chamado), nunca vai cru para a consulta.
- **Intervalo invertido não é bloqueado nem "corrigido" em silêncio:** a consulta vai ao backend como está, a lista
  volta vazia e o painel diz "Nenhuma OS para os filtros atuais". O aviso âmbar explica por quê.
- "Limpar" chama `onClear` → a página faz `updateListFilters(EMPTY_LIST_FILTERS)`. **Não** fecha o cartão, **não**
  limpa a busca nem a aba (essas ficam na barra da tabela, fora do cartão).
- Posição: na página, **logo depois de `<WorkOrdersKpiGrid …/>` e antes da faixa de desatualizado ou da pílula de
  demonstração**, como na Auditoria (KPIs → cartão → faixa → tabela). Renderiza só com
  `filtersOpen && showListActions`.

### 3.6 O cabeçalho (A1)

```tsx
const headerActions = showListActions || canCreate ? (
  <>
    {showListActions ? (
      <>
        <button type="button"
                className={activeFilterCount > 0 ? "pat-btn pat-btn--engaged" : "pat-btn"}
                aria-expanded={filtersOpen}
                aria-controls={filtersOpen ? "os-filtros" : undefined}
                onClick={() => setFiltersOpen((open) => !open)}>
          <Filter size={15} aria-hidden="true" />
          Filtrar
          {activeFilterCount > 0 ? <span className="pat-btn__count" aria-hidden="true">{activeFilterCount}</span> : null}
          {activeFilterCount > 0 ? <span className="sr-only">{activeFilterCount === 1 ? ", 1 filtro ativo" : `, ${activeFilterCount} filtros ativos`}</span> : null}
        </button>
        <button type="button" className="pat-btn"
                disabled={!exportState.enabled}
                style={exportState.enabled ? undefined : { opacity: 0.55, cursor: "not-allowed" }}
                title={exportState.hint}
                onClick={() => exportWorkOrdersCsv(filtered, source, Date.now())}>
          <Download size={15} aria-hidden="true" />
          Exportar
        </button>
      </>
    ) : null}
    {canCreate ? ( /* o botão "Nova OS" EXATAMENTE como hoje (l.253-256) */ ) : null}
  </>
) : undefined;
```

- Ícones: `Filter` e `Download` do `lucide-react`, os mesmos da Auditoria. O `Download` reproduz o `#i-export` do
  design (bandeja + seta para baixo, §5).
- `exportState = exportAvailability({ loading, failure: kind === "failure", total, stale, demo: source === "mock",
  loaded: allItems.length, serverTotal: pagination.total })` (§4.4).
- O botão Exportar fica **no DOM** quando desabilitado (não some), para a pessoa ver que a função existe e ler o
  motivo.

### 3.7 O que exporta

`filtered`, o mesmo array que alimenta "N ordens" e o paginador (l.214-219): **todas as páginas**, não só a página
corrente, e já com cartão + aba + busca aplicados. A quantidade de linhas do CSV **é igual** ao número mostrado em
"N ordens".

### 3.8 Guarda de ordem das respostas (A2, F5)

Em `useWorkOrders.ts`, e só isto:

```ts
const requestSeq = useRef(0);
const refresh = useCallback(async (background = false) => {
  if (!activeContext) return;
  const seq = ++requestSeq.current;                 // esta é a busca mais recente
  if (background) setIsRefreshing(true);
  else setLoading(true);
  const result = await listWorkOrdersFromApi(context, filters);
  if (seq !== requestSeq.current) return;           // superada por outra busca: descarta SEM tocar estado nem flags
  setState((prev) => nextListState(prev, result, background));
  setLoading(false);
  setIsRefreshing(false);
}, [activeContext, context, filters]);
```

Por que descartar sem baixar `loading`: quem superou é a busca mais recente, e ela baixa as duas flags quando chegar.
Efeito nos outros 3 consumidores (F10): nenhum em operação normal, porque o filtro deles é constante. Só muda o
caso de corrida, e muda para o certo.

Caso-limite aceito e declarado: se o tick de segundo plano supera uma troca de filtro em voo e **falha**, o reducer
mantém a lista anterior marcada como desatualizada (regra do `nextListState` para falha em segundo plano). Nesse
caso o filtro do cliente (§3.9) reaplica os filtros vigentes sobre ela, e a faixa "dados desatualizados" aparece.
Nada é mostrado como atual.

### 3.9 Período por data de abertura no cliente (A3, F8)

Em `filterWorkOrders` (l.146) a data comparada passa a ser `item.createdAt`, a mesma coluna que o backend filtra
(`created_at`). Com isso o filtro do cliente vira **idempotente** sobre a resposta do servidor (modo real) e é o
**único** filtro no modo de demonstração (F4). Os dois modos passam a mostrar o mesmo recorte. Renomear a variável
local para `createdTime`. Nenhuma outra linha do adaptador muda.

O rótulo da tela diz **"Data de abertura"**, porque a tabela mostra a coluna AGENDA e a pessoa poderia supor que o
período é da agenda. O filtro por agenda não existe no backend e está fora do bloco.

### 3.10 Comentários a reescrever (A1)

- l.29-30: trocar "Exportar … OMITIDO … e Filtrar também" por: *"Filtrar (Prioridade + Data de abertura, filtrados
  no servidor) e Exportar (CSV local das linhas visíveis) — D-OS-CABECALHO-PADRONIZADO / B-OS-FILTRAR-EXPORTAR.
  Técnico fica para P-WO-LIST-TECH-NAME."*
- l.249-251: trocar o comentário "Filtrar omitido… Exportar omitido…" por uma linha sobre os gates: Filtrar/Exportar
  somem em `forbidden`, e "Nova OS" mantém o gate `work_orders:create`.

## 4. CSV — colunas e nome do arquivo
`work-orders-export.ts` (novo, **puro**, exceto `exportWorkOrdersCsv`, que só delega ao `downloadCsv`). O formato
(BOM UTF-8, `;`, `\r\n`, aspas) é o do `frontend/src/lib/csv.ts`, **inalterado** (F15).

### 4.1 Colunas (exatamente estas 8, nesta ordem) e de onde cada uma vem

| # | Cabeçalho | Valor | Mesma fonte que a tela usa |
|---|---|---|---|
| 1 | `Código` | `o.code` | coluna CÓDIGO (l.352) |
| 2 | `Prioridade` | `WORK_ORDER_PRIORITY_LABEL[o.priority]` ("Baixa", "Média", "Alta", "Urgente") | rótulo sob o código (l.355), movido para `work-orders-row.logic.ts` (A4) |
| 3 | `Cliente` | `o.customerName` quando verdadeiro, senão `"Sem cliente vinculado"` | coluna CLIENTE (l.361-366) |
| 4 | `Serviço` | `workOrderServiceLine(o)` = `[o.title, cidade/UF].filter(Boolean).join(" · ")` | subtítulo da coluna (l.345-347), movido para A4 |
| 5 | `Técnico` | `o.assignedOperatorId ? "Atribuído" : "Sem técnico"` | coluna TÉCNICO (l.387-409). **Nunca o id** |
| 6 | `Agenda` | `formatAgendaForExport(o.scheduledFor)`: `"dd/mm/aaaa HH:MM"` no fuso local; `"Sem agenda"` sem data; `"—"` com data inválida | coluna AGENDA (l.96-118). Na tela a data é **relativa** ("Hoje, 14:00"); no arquivo é **absoluta**, porque "Hoje" lido amanhã engana |
| 7 | `Atrasada` | `isWorkOrderDelayed(o.scheduledFor, o.status, now).delayed ? "Sim" : "Não"` | selo "Atrasada" (F14) |
| 8 | `Situação` | `WORK_ORDER_STATUS_LABEL[o.status]` | coluna SITUAÇÃO (l.421) |

**Fica de fora, de propósito (§2.8 e "só o que a tela mostra"):** `id`, `assignedOperatorId`, `assignedUserId`,
`vehicleId`, coordenadas, `serviceAddress` (a busca usa, mas a tabela não mostra), `customerPhone`, `slaDueAt`,
`createdAt`, `checklistId`, e **qualquer dado da organização** (`tenant_id`, nome da organização). A coluna
"cidade/UF" isolada não existe: o DTO real não traz cidade (F11), e ela sairia sempre vazia em produção. A cidade
entra **dentro** de `Serviço`, quando vier, exatamente como a tela mostra.

### 4.2 Nome do arquivo

- `ordens-de-servico.csv`: nome fixo em kebab-case pt-BR, a convenção dos 7 exportadores (F17).
- `ordens-de-servico-demonstrativo.csv` quando `source === "mock"`, para o arquivo não perder o aviso que a tela dá
  na pílula "Dados demonstrativos" (D-007).

### 4.3 Neutralização de fórmula (defesa, local a este exportador)

`neutralizeCsvFormula(value)`: se a célula começa com `=`, `+`, `-`, `@`, TAB (`\t`) ou CR (`\r`), prefixa `'`.
Aplicada a **todas** as células das linhas (o cabeçalho é fixo). Por quê: `Cliente` e `Serviço` são texto livre
digitado por gente, e um nome como `=HYPERLINK(…)` viraria fórmula ao abrir no Excel [H3]. O dado legítimo não
perde nada: "-Guincho" vira "'-Guincho", e o Excel mostra "-Guincho".
**Não mexer em `csv.ts`:** o reparo global muda a saída de 7 outras telas e fica para uma pendência própria
(§9.3, P-CSV-FORMULA-GLOBAL).

### 4.4 Disponibilidade e dica do botão: `exportAvailability(input)`

```ts
export function exportAvailability(input: {
  readonly loading: boolean; readonly failure: boolean; readonly total: number;
  readonly stale: boolean; readonly demo: boolean; readonly loaded: number; readonly serverTotal: number;
}): { readonly enabled: boolean; readonly hint: string };
```

Textos **exatos** (a ordem dos testes é a ordem abaixo; a primeira condição verdadeira decide `enabled = false`):

| Condição | `enabled` | `hint` |
|---|---|---|
| `loading` | false | `Aguarde: a lista ainda está carregando.` |
| `failure` | false | `Nada para exportar: a lista não carregou.` |
| `total === 0` | false | `Nenhuma ordem na lista para exportar.` |
| senão | true | `total === 1` → `Baixar a ordem da lista em planilha (CSV).` · senão `Baixar as ${total} ordens da lista em planilha (CSV).` |
| … + `serverTotal > loaded` | true | acrescenta ` A tela mostra as ${loaded} ordens mais recentes de ${serverTotal}; o arquivo leva só as da tela.` |
| … + `stale` | true | acrescenta ` Atenção: a última atualização falhou; os dados podem estar desatualizados.` |
| … + `demo` | true | acrescenta ` Dados demonstrativos.` |

### 4.5 Funções exportadas por `work-orders-export.ts`

```ts
export const WORK_ORDERS_CSV_HEADER: readonly string[]; // as 8 colunas de §4.1
export function workOrdersCsvFilename(source: WorkOrdersSource): string;
export function neutralizeCsvFormula(value: string): string;
export function formatAgendaForExport(iso: string | null | undefined): string;
export function workOrdersCsvRows(items: readonly WorkOrderListItem[], now: number): string[][];
export function exportAvailability(input: …): { enabled: boolean; hint: string };
export function exportWorkOrdersCsv(items: readonly WorkOrderListItem[], source: WorkOrdersSource, now: number): void;
//   = downloadCsv(workOrdersCsvFilename(source), [...WORK_ORDERS_CSV_HEADER], workOrdersCsvRows(items, now))
```

Atenção ao `[G1b]` (F30): nenhum literal de objeto com `id`/`code` constante em ramo `??`, `catch` ou OR lógico.
Os fallbacks deste arquivo são **strings** ("Sem cliente vinculado", "Sem agenda"), e é assim que devem ficar.

## 5. Tokens visuais medidos do design
Fonte: `ERP Web - Telas Padronizadas.dc.html` (rastreado em `c8af6458`): `sc_os`, l.240-251 (cabeçalho), e
`sc_audit`, l.395-437 (cartão de filtros, o único desenho de cartão de filtros do design). Medidas de navegador do
agente de frontend em `item4/ANALISE.md` §1 (botões de 35 px, folga 9/14, ícone 15). O CSS do app foi lido em
`frontend/src/styles/app.css` (F18).

### 5.1 Medido no design × app hoje

| Elemento | Design | App (`app.css`) | O que o dev faz |
|---|---|---|---|
| Filtrar / Exportar | `display:flex; align-items:center; gap:7px; padding:9px 14px; background:#fff; border:1px solid #E2E8F0; border-radius:9px; font-size:12.5px; font-weight:700; color:#475569`; hover `border-color:#2563EB; color:#2563EB`; ícone 15×15 | `.pat-btn`: **idêntico** | usar `className="pat-btn"`; **nenhum** estilo inline além do desabilitado |
| Nova OS | `padding:9px 16px; background:#2563EB; border:none; …; color:#fff`; hover `#1D4ED8` | `.pat-btn--primary` (com borda 1px azul; diferença conhecida, analisada em `ANALISE.md` §2.2, **fora do bloco**) | não mexer |
| Grupo de ações | `display:flex; gap:8px` | `.pat-page-header__actions`: `gap:8px` | ok |
| Ordem | Filtrar · Exportar · Nova OS | — | esta ordem |
| Ícone Filtrar | `#i-filter`: funil, `stroke-width 1.9` | `lucide-react` `Filter` (como a Auditoria) | lucide (Parte B §4); a diferença de traço 1.9 × 2 é a mesma da Auditoria |
| Ícone Exportar | `#i-export`: `M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4` + `M7 10l5 5 5-5M12 15V3` | `lucide-react` `Download` (mesma geometria: bandeja, seta 7-10→12-15→17-10, haste 12/15→12/3) | lucide |
| Cartão | `background:#fff; border:1px solid #E2E8F0; border-radius:14px; padding:15px 18px; margin-bottom:14px` | `.pat-filter-card`: idêntico | reusar |
| Grade | `grid-template-columns:1.2fr 1.2fr 1fr 1fr auto; gap:12px; align-items:end` | `.pat-filter-grid`: idêntico (2 colunas < 960px) | reusar; os 5 filhos (Prioridade · Data de abertura · De · Até · Limpar) ocupam as 5 colunas |
| Rótulo | `11px/700 #64748B; margin-bottom:6px` | `.pat-filter-field label`: idêntico | reusar |
| Campo | `padding:9px 11px; border:1px solid #E2E8F0; border-radius:9px; 12.5px/600 #334155; #fff` | `.pat-filter-field input, select`: idêntico | reusar |
| Limpar | `padding:10px 15px; background:#F8FAFC; …` | a Auditoria do app usa `.pat-btn` (#fff, 9/14) | seguir o **app** (Auditoria), para as duas telas ficarem iguais. Divergência pré-existente da Auditoria, registrada aqui |

### 5.2 Derivado (o design não desenha o estado "filtro ativo")

| Token novo | Valor | Por quê |
|---|---|---|
| `.pat-btn--engaged` | `border-color:#2563eb; color:#2563eb` | é o hover do próprio design, fixado enquanto há filtro ativo; com o cartão fechado, mostra que a lista está recortada |
| `.pat-btn__count` | `display:inline-flex; align-items:center; justify-content:center; min-width:15px; height:15px; padding:0 4px; border-radius:99px; background:#2563eb; color:#fff; font-size:10px; font-weight:800; line-height:15px; font-variant-numeric:tabular-nums` | 15 px de altura para **não aumentar o botão de 35 px**; azul primário do sistema; tipografia da família dos selos (10–10.5 px, 700–800) |
| aviso de intervalo invertido | `margin:10px 0 0; font-size:12px; font-weight:600; color:#B45309` (inline) | o âmbar de atenção que a lista já usa (selo "há atrasos", `TAG_LATE`) |
| Exportar desabilitado | `opacity:0.55; cursor:not-allowed` (inline) | precedente da Auditoria (l.190) |

CSS a acrescentar em `app.css`, **logo depois** de `.pat-btn--primary:hover { … }` (l.3092-3096). Comentário curto e
sem `*/` no meio (F19):

```css
/* B-OS-FILTRAR-EXPORTAR: Filtrar com filtro ativo usa o azul do hover, fixo */
.pat-btn--engaged {
  border-color: #2563eb;
  color: #2563eb;
}
/* B-OS-FILTRAR-EXPORTAR: selo de contagem, 15px de altura para nao crescer o botao */
.pat-btn__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 15px;
  height: 15px;
  padding: 0 4px;
  border-radius: 99px;
  background: #2563eb;
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  line-height: 15px;
  font-variant-numeric: tabular-nums;
}
```

**QA visual (o dev faz, o revisor confere no relatório):** com o Vite em modo de demonstração (`VITE_USE_MOCKS=true`, sem backend e sem banco; servidor encerrado ao fim), abrir `/work-orders` a 1440×900 e
comparar o cabeçalho com `item4/03-design-padronizado-1440-cabecalho.png`. Os três botões ficam alinhados pela
base, com 35 px de altura, inclusive o Filtrar com o selo. Dois residuais **conhecidos e fora do bloco**: a fonte
Inter não é carregada (cai para Segoe UI) e o "Nova OS" tem a borda azul de 1 px (`ANALISE.md` §2). A captura vai
para o relatório do dev (A13), não para o repositório. Se o ambiente do dev não permitir a captura, o relatório diz **"QA visual não feito"**, e o revisor faz a conferência.

## 6. Acessibilidade
| Requisito | Como | Verificado por |
|---|---|---|
| Foco visível | Filtrar, Exportar e Limpar são `.pat-btn` → `outline 2px #2563EB, offset 2` (`app.css` l.3322-3330). Os campos do cartão são `.pat-filter-field input/select` → `outline` (l.3971-3978). **Nenhum `outline: none` novo** | leitura do CSS; `[FE1]` assere as classes |
| Nome acessível | Os botões têm **texto visível** ("Filtrar", "Exportar"), então não precisam de `aria-label`. Os ícones levam `aria-hidden="true"`. Com filtro ativo, o selo é `aria-hidden` e o texto `.sr-only` completa o nome: "Filtrar, 2 filtros ativos". O nome contém o rótulo visível (WCAG 2.5.3) | `[FE4]` lê o texto do botão (com o `.sr-only`) e o `aria-hidden` do ícone e do selo |
| Estado do disclosure | Filtrar tem `aria-expanded` (true/false) e `aria-controls="os-filtros"` **só quando aberto**, para não apontar para id ausente | `[FE4]` |
| Rótulos dos campos | cada `<select>`/`<input>` tem `<label htmlFor>` com id único (`os-filtro-prioridade`, `-abertura`, `-de`, `-ate`); o cartão é `role="group"` com `aria-label` | `[FE4]` conta os 4 pares label↔id |
| Motivo do desabilitado | `title` com a dica de §4.4 (precedente da Auditoria). Botão desabilitado não recebe foco, e por isso o motivo também está **na tela**: "0 ordens", o painel de vazio ou o de erro. Limite declarado: o `title` sozinho não é lido por todo leitor de tela [H1] | `[FE2]` assere `disabled` e o `title` por estado |
| Aviso de intervalo invertido | `role="status"` (anúncio educado), texto, não só cor | `[LT6]` (função) + leitura do componente |
| Cor não é o único sinal | o filtro ativo tem **número** no selo, além do azul; a "Atrasada" no CSV é "Sim/Não" | `[FE4]`, `[EX2]` |
| Alvo de toque ≥ 44 px | **não se aplica integralmente:** é a web de escritório, e o design fixa 35 px de altura para os botões do cabeçalho (o mínimo WCAG 2.2 AA é 24×24, que 35 px cumpre). Os ≥ 44 px do §10 valem para o mobile. Registrado como decisão, não como lacuna | — |
| Teclado | tudo é `<button>`/`<select>`/`<input>` nativo: Tab, Enter e Espaço funcionam sem código extra; **nenhum** `onClick` em `<div>` novo | leitura do componente |
| Sem termo técnico na UI (§3) | "Data de abertura", "Prioridade", "Todas as prioridades", "Qualquer data"; nada de `priority`, `created_at`, `filter` | `[FE4]` assere os rótulos visíveis |

## 7. Testes novos (o que provam · mutação que os deixa vermelhos)
### 7.0 Baseline medido e meta

Medido **na ref `c8af6458`** (árvore principal, código idêntico ao worktree, F29 impede rodar no worktree antes do
`npm ci`):

| Bateria | Comando (em `frontend/`) | Resultado |
|---|---|---|
| página viva + adaptador | `node --test --import tsx tests/work-orders-page-live.test.tsx tests/work-orders.adapter.test.ts` | **21/21** (13 + 8) |
| smoke completo | `npm run test:smoke` | **1242/1242**, 0 falha, 0 pulado |

**N (testes que hoje exercem Filtrar/Exportar da lista) = 0.** A regra M ≥ 2N é vazia com N = 0, então a meta é
pelo **comportamento**: este bloco tem **10 comportamentos** (cabeçalho e ordem · matriz de estados do Exportar ·
conteúdo do arquivo · ligação do filtro · limites ISO do período · vazio com filtro · guarda de ordem · auto-refresh
com filtro · exportar segue aba e busca · sem permissão fecha tudo). **Meta: M ≥ 20 testes novos (≥ 2 por
comportamento). A lista abaixo tem 26: 15 puros (`LT1`–`LT6`, `RL1`, `EX1`–`EX8`) + 1 no adaptador (`AD1`) + 10
na página viva (`FE1`–`FE10`).** Esperado depois: página viva + adaptador = 21 + 10 + 1 = **32**; arquivo novo
`work-orders-list-tools.test.ts` = **15**; smoke = **1242 + 26 = 1268**. Se o dev separar subcasos em `test()`
próprios, o total sobe, e cada um conta. O número exato vem da execução e vai ao relatório; divergência se explica,
não se ajusta.

Convenção: todo teste novo tem o rótulo `[XXn]` no início do título, para o revisor achar por `grep`.

### 7.1 Testes puros: `frontend/tests/work-orders-list-tools.test.ts` (novo) e `[AD1]`

Estilo dos vizinhos: `node:test` + `node:assert/strict`, import direto dos módulos (sem DOM). **Datas sempre
construídas no fuso local** (`new Date(2026, 9, 7, 18, 0)`), nunca com string ISO de horário fixo: o teste tem de
passar no runner da CI (UTC) e nesta máquina (BRT).

| Id | Prova | Mutação que o deixa vermelho |
|---|---|---|
| `[LT1]` | `parseLocalDate`: `"2026-10-07"` → meia-noite local (a/m/d/h = 2026/9/7/0); `""`, `"07/10/2026"`, `"2026-10-7"`, `"2026-02-31"`, `"2026-13-01"` → `null` | tirar a checagem de ida e volta (`2026-02-31` vira 03/03) |
| `[LT2]` | `toApiFilters`: vazio → `{search:"", status:"all", priority:"all", assignedOperatorId:"", from:"", to:""}`; `{high, 2026-10-01, 2026-10-07}` → `priority "high"`, `from === new Date(2026,9,1,0,0,0,0).toISOString()`, `to === new Date(2026,9,7,23,59,59,999).toISOString()` | `N-ISO-CRU` (mandar `state.from/to` cru) · `N-FIM-DO-DIA` (`to` à meia-noite) |
| `[LT3]` | **propriedade, não forma:** com `toApiFilters({…,"2026-10-01","2026-10-07"})`, `filterWorkOrders` mantém OS aberta em `new Date(2026,9,7,18,0)` e em `new Date(2026,9,1,0,0)`, e exclui `new Date(2026,9,8,0,0,0,1)` e `new Date(2026,8,30,23,59)` | `N-FIM-DO-DIA` |
| `[LT4]` | `countActiveFilters`: vazio 0 · só prioridade 1 · só De 1 · só Até 1 · De+Até 1 · prioridade+período 2 · data inválida `"2026-13-01"` 0 | contar De e Até separados (dá 3) |
| `[LT5]` | atalhos com `now = new Date(2026, 2, 31, 10)` (virada de mês): hoje → `{2026-03-31, 2026-03-31}`; 7d → `{2026-03-25, ""}`; 30d → `{2026-03-02, ""}`; `deriveOpeningPeriod` devolve a mesma chave para cada um; `{2026-03-01, ""}` → `"custom"`; vazio → `"all"` | 7d com −7 dias; 30d com −30 |
| `[LT6]` | `isRangeInverted`: `{08/10 → 01/10}` true; mesmo dia false; uma vazia false | comparar com `>=` |
| `[RL1]` | `WORK_ORDER_PRIORITY_LABEL` = `{low:"Baixa", medium:"Média", high:"Alta", urgent:"Urgente"}`; `workOrderServiceLine` → `"Título · Cidade/UF"`, `"Título · Cidade"`, `"Título"` | trocar "Média" por "Media" |
| `[EX1]` | `WORK_ORDERS_CSV_HEADER` **igual** a `["Código","Prioridade","Cliente","Serviço","Técnico","Agenda","Atrasada","Situação"]` | acrescentar coluna `ID` |
| `[EX2]` | `workOrdersCsvRows` com 4 OS fixas e `now` fixo: igualdade **linha a linha** (atribuída/sem técnico, com/sem cliente, com/sem agenda, aberta atrasada/concluída vencida, prioridade média) → "Atribuído"/"Sem técnico", "Sem cliente vinculado", "Sem agenda", "Sim"/"Não", rótulos de situação | `Técnico` com o id; `Atrasada` ignorando a situação |
| `[EX3]` | **allowlist §2.8 (propriedade):** OS com UUIDs distintos em `id`/`assignedOperatorId`/`assignedUserId`/`vehicleId`, coordenadas, `serviceAddress "Rua Segredo 123"` e `customerPhone`: o texto de `buildCsv(HEADER, rows)` não contém **nenhum** desses valores, e nenhuma célula casa `/^[0-9a-f]{8}-[0-9a-f]{4}-/i` | coluna `ID` ou `Endereço` |
| `[EX4]` | `neutralizeCsvFormula`: `=1+1`, `+5531…`, `-x`, `@SUM`, `"\tx"`, `"\rx"` → prefixo `'`; `"Cliente"`, `""`, `"a=b"` intactos; e **pela linha**: `customerName "=HYPERLINK(\"x\")"` → a célula começa com `'` | função identidade; aplicar só ao cabeçalho |
| `[EX5]` | `formatAgendaForExport`: `null` → "Sem agenda"; `"lixo"` → "—"; `new Date(2026,9,7,9,5).toISOString()` → "07/10/2026 09:05" | formato `HH:MM` sem zero à esquerda; data relativa |
| `[EX6]` | `exportAvailability`: as 7 linhas de §4.4, com `enabled` e `hint` **exatos** | `enabled: true` com `total === 0` |
| `[EX7]` | `workOrdersCsvFilename`: `api` e `fallback` → `ordens-de-servico.csv`; `mock` → `ordens-de-servico-demonstrativo.csv` | nome único para os três |
| `[EX8]` | lista vazia não fabrica linha (D-007): `workOrdersCsvRows([], now)` → `[]` | devolver uma linha "Nenhuma ordem" |
| `[AD1]` (em `work-orders.adapter.test.ts`) | `filterWorkOrders` com `from`/`to`: OS com `createdAt` **dentro** e `scheduledFor` fora → mantida; OS com `createdAt` **fora** e `scheduledFor` dentro → excluída | `N-DATA-AGENDA` (voltar a l.146 para `scheduledFor ?? createdAt`) |

### 7.2 Página viva: casos novos em `frontend/tests/work-orders-page-live.test.tsx`

**Acréscimos ao arnês (sem mexer nos 13 casos existentes):**
1. **URLs pedidas:** `installFetch` empurra cada URL para um array do módulo (`requestedUrls`, zerado em `mount`) e
   passa a URL ao respondedor (`respond(url)`; as rotas atuais ignoram o argumento). Ler parâmetro sempre por
   `new URL(url, "http://t").searchParams.get(...)`, nunca por `includes` no texto (o `:` vem codificado).
2. **Evento de usuário** (fecha, para estes casos, a lacuna de `P-SAN3-01B-PAGINA-FIACAO-DE-INTERACAO`):
   `async function fire(el, prop: "onClick" | "onChange", value?: string)`: acha a chave `__reactProps$…` no nó
   (F25), atribui `el.value = value` quando houver e chama `props[prop]({ target: el, currentTarget: el,
   preventDefault() {}, stopPropagation() {} })` **dentro de `act`**, e depois `settle()`. Os handlers da página e do
   cartão leem `e.target.value`. Limite declarado no cabeçalho do teste: o ajudante chama o handler que o React
   registrou, sem passar pela delegação de eventos do React. Prova a fiação da página, não o React.
3. **Download:** por caso, substituir `URL.createObjectURL` (capturando o `Blob`) e `URL.revokeObjectURL` (sem
   efeito), e usar o `click()` do `MiniElement` (A10 (c)), que registra `{ download: this.download, href: this.href }`.
   **Restaurar `URL.*` no `finally`** do caso e zerar o registro de cliques. O texto sai de `await blob.text()`.
4. **Respostas adiadas** (para `[FE7]`): `deferred()` que devolve `{ promise, resolve }`; o respondedor devolve a
   promessa.
5. Corpos novos no `BODIES`: `200x25` (25 itens), `200concl` (3 itens, um `completed`) e `200prio` (itens com
   prioridades mistas), todos no formato de `toWorkOrderListDto` (o `listItem` existente, com overrides).

| Id | Cenário → prova | Mutação que o deixa vermelho |
|---|---|---|
| `[FE1]` | 200x3, `work_orders:read`+`create`: os botões do `header.pat-page-header` são, em ordem, `Filtrar`, `Exportar`, `Nova OS`; Filtrar/Exportar com classe `pat-btn` e ícone `aria-hidden`; Filtrar com `aria-expanded="false"`; `#os-filtros` ausente. Só com `read`: `Filtrar`, `Exportar` | tirar o Exportar; inverter a ordem |
| `[FE2]` | matriz de estados: **403** → nenhum Filtrar/Exportar no cabeçalho e, só com `read`, **nenhum** `.pat-page-header__actions`; **500** → Filtrar presente, Exportar `disabled` com `title` "Nada para exportar: a lista não carregou."; **vazio** → `disabled`, "Nenhuma ordem na lista para exportar."; **pendente** → `disabled`, "Aguarde: a lista ainda está carregando."; **200x3** → habilitado, "Baixar as 3 ordens da lista em planilha (CSV)." | `N-EXP-SEMPRE` (`disabled={false}`); `N-403-MOSTRA` (`showListActions = true`) |
| `[FE3]` | 200x25 (um dos itens com `title "Troca; urgente"`): clicar em Exportar gera **1** download `ordens-de-servico.csv`, texto começando com BOM (`\uFEFF`), 1ª linha = as 8 colunas unidas por `;`, **25** linhas de dado (o paginador mostra 20), e a célula com `;` sai entre aspas (`"Troca; urgente"`, prova de que o arquivo passa por `buildCsv`/`csvCell`). O número de linhas de dado é igual ao de "N ordens" | `N-EXP-PAGINA` (exportar `pageItems`); montar o arquivo com `join(";")` próprio |
| `[FE4]` | 200x3: clicar em Filtrar → `aria-expanded="true"`, `aria-controls="os-filtros"`, cartão `role="group"`, 4 pares `label[for]`↔`id`, Limpar `disabled`, rótulos visíveis "Prioridade", "Data de abertura", "De", "Até". Mudar a prioridade para `high` → **a última URL tem `priority=high`**, o botão ganha `pat-btn--engaged`, o selo "1" e o texto `.sr-only` ", 1 filtro ativo". Limpar → a última URL **não** tem `priority`, e o selo some | `N-STABLE` (a página passa `EMPTY`/constante ao hook); `N-SELO` (selo não renderiza) |
| `[FE5]` | De `2026-10-01` e Até `2026-10-07` → a última URL tem `from === new Date(2026,9,1).toISOString()` e `to === new Date(2026,9,7,23,59,59,999).toISOString()`, e o selo diz "1". Atalho `today` → `from`/`to` = limites de hoje (o esperado é calculado com `localDateString(new Date())` logo antes do evento) | `N-ISO-CRU`; `N-FIM-DO-DIA` |
| `[FE6]` | rota: `priority=high` → vazio, senão 200x3. Prioridade `high` → `data-state="empty"`, painel "Nenhuma OS para os filtros atuais" e **1** "Nova OS" (só o cabeçalho, com `create`). Limpar → 3 linhas | `N-VAZIO` (voltar `filtered`/`onCreate` a `items.length`) |
| `[FE7]` | **corrida:** 1ª busca (sem `priority`) adiada em D1; prioridade `high` → 2ª busca adiada em D2. Resolve D2 com 2 OS `high`, depois D1 com 1 `high` + 1 `low` → a tela termina com **2** linhas e "2 ordens" | `N-SEQ` (tirar a guarda de `useWorkOrders`) |
| `[FE8]` | 200x3: prioridade `urgent`, depois `backgroundTick()` → a URL do tick tem `priority=urgent`, e continua havendo exatamente 1 intervalo vivo | `N-TICK` (no hook, `refresh(true)` buscar com `{}`) |
| `[FE9]` | 200concl: aba "Concluídas" → exportar → **1** linha de dado; aba "Todas" + busca pelo código de uma OS → exportar → **1** linha | `N-EXP-HOOK` (exportar `items` em vez de `filtered`) |
| `[FE10]` | 200x3, cartão aberto; tick em 2º plano com 403 → `data-state="forbidden"`, `#os-filtros` ausente, Filtrar e Exportar ausentes | renderizar o cartão sem checar `showListActions` |

Todo caso roda dentro de `withPage` (desmonta sempre; zero `console.error`), e as asserções são de comportamento
(ordem, `disabled`, `aria-*`, contagens, parâmetros de URL, linhas do arquivo). Nunca "contém OS-000101".

### 7.3 Mutações obrigatórias (rodar no código final, uma de cada vez)

**Protocolo** (registrado no relatório A13, uma linha por mutação):
1. `git hash-object <arquivo>` → `H0`.
2. Aplicar a mutação **por script que opera nos bytes CRLF** (o worktree tem `core.autocrlf=true`, e o arquivo
   rastreado está em CRLF: `useWorkOrders.ts` tem 63 `\r\n` em 63 linhas). O script **falha se a âncora não casar
   exatamente 1 vez**. Âncora sem `\r` não substitui nada e deixa o teste verde por engano.
3. `git diff --stat <arquivo>` **não vazio** (prova de que a mutação entrou).
4. Rodar os testes nomeados e ver **VERMELHO nos ids esperados**.
5. Desfazer pela edição inversa e conferir `git hash-object <arquivo>` = `H0`. Não usar `checkout`/`stash`/`reset`.

| Mutação | Arquivo | Mudança | Fica vermelho |
|---|---|---|---|
| `N-ISO-CRU` | A5 | `toApiFilters` devolve `from: state.from, to: state.to` | `[LT2]` `[LT3]` `[FE5]` |
| `N-FIM-DO-DIA` | A5 | `to` com `0, 0, 0, 0` em vez de `23, 59, 59, 999` | `[LT2]` `[LT3]` `[FE5]` |
| `N-DATA-AGENDA` | A3 | l.146 volta a `item.scheduledFor ?? item.createdAt` | `[AD1]` |
| `N-SEQ` | A2 | remover `if (seq !== requestSeq.current) return;` | `[FE7]` |
| `N-TICK` | A2 | `listWorkOrdersFromApi(context, background ? {} : filters)` | `[FE8]` |
| `N-STABLE` | A1 | o hook recebe uma constante de módulo `toApiFilters(EMPTY_LIST_FILTERS)` em vez de `apiFilters` | `[FE4]` `[FE5]` `[FE6]` `[FE8]` |
| `N-SELO` | A1 | não renderizar o `<span className="pat-btn__count">` nem o `.sr-only` | `[FE4]` |
| `N-EXP-SEMPRE` | A1 | Exportar com `disabled={false}` | `[FE2]` |
| `N-403-MOSTRA` | A1 | `showListActions = true` | `[FE2]` `[FE10]` |
| `N-EXP-PAGINA` | A1 | exportar `pageItems` | `[FE3]` |
| `N-EXP-HOOK` | A1 | exportar `items` | `[FE9]` |
| `N-VAZIO` | A1 | `filtered={items.length > 0}` e `onCreate` sem `activeFilterCount` | `[FE6]` |
| `N-FORMULA` | A6 | `neutralizeCsvFormula = (v) => v` | `[EX4]` |
| `N-ID` | A6 | acrescentar a coluna `ID` (`o.id`) | `[EX1]` `[EX3]` |
| `N-TEC` | A6 | `Técnico` = `o.assignedOperatorId ?? "Sem técnico"` | `[EX2]` `[EX3]` |
| `N-HINT` | A6 | `enabled: true` quando `total === 0` | `[EX6]` |

Comando de cada rodada (em `frontend/`), com o que a mutação toca:
`node --test --import tsx tests/work-orders-list-tools.test.ts tests/work-orders.adapter.test.ts tests/work-orders-page-live.test.tsx`.
Se uma mutação **não** deixar vermelho o id previsto, isso é **achado**: o dev registra no relatório e corrige o
teste (não a mutação).

## 8. Bateria exata
**Onde:** sempre no worktree `C:/Users/AMP/w-osfe` (ramo `feat/web-os-filtrar-exportar`). **Nunca** na árvore
principal: ela tem `.env` com o banco vivo, e o worktree não tem (medido: só `.env.example`). Não copiar `.env` para
o worktree, não exportar `DATABASE_URL` nem `CORE_SAAS_PERSISTENCE` na sessão. Não subir banco. Todo comando longo
leva `timeout`; **sem `tail -f`**, e o sinal de vida é o arquivo de log crescendo. Cada checagem é **trava** em
linha própria (`… || exit 1`), nunca elo de `&&` seguido de commit na linha de baixo.

### 8.0 Preparação (uma vez)

```bash
cd C:/Users/AMP/w-osfe
git rev-parse HEAD                         # anotar; a base é c8af6458
timeout 900 npm ci                         # raiz, próprio (junction de node_modules é PROIBIDA, §C7.1-ter(c))
timeout 900 npm --prefix frontend ci
DATABASE_URL="postgresql://gen:gen@127.0.0.1:5432/gen" timeout 300 npm run db:generate   # só gera o client; não conecta
```

### 8.1 Bateria (nesta ordem; registrar comando, código de saída e a linha `# tests/# pass/# fail/# skipped`)

| # | Comando | Esperado |
|---|---|---|
| 1 | `npm --prefix frontend run check` | ec 0 |
| 2 | `cd frontend && timeout 600 node --test --import tsx tests/work-orders-list-tools.test.ts tests/work-orders.adapter.test.ts tests/work-orders-page-live.test.tsx` | **47/47** (15 + 9 + 23) |
| 3 | `cd frontend && timeout 900 node --test --import tsx tests/work-orders-honest-errors.test.tsx tests/work-orders-row-actions.test.tsx tests/smoke-flow.test.tsx tests/kpi-cards-clickable.test.tsx tests/audit-events.smoke.test.tsx tests/auditoria-sessoes.test.tsx tests/remuneracoes-liquidar.test.tsx tests/telemetria-web.test.tsx tests/pattern-css-guard.test.ts` (regressões: página/guardas de OS, KPIs, e os outros consumidores do `csv.ts`) | 0 falha |
| 4 | `timeout 1200 npm --prefix frontend run test:smoke` | **1268/1268** (1242 de baseline + 26), 0 falha, 0 pulado |
| 5 | `timeout 900 npm --prefix frontend run build` | ec 0 |
| 6 | `timeout 300 node --test --import tsx tests/approval-frontend-contract.test.ts tests/checklist-editor-blockers-parity.test.ts tests/san3-04a-menu-front-x-catalogo.test.ts` (raiz: os testes do backend que leem `.tsx`/`.ts` do front, F27) | 0 falha |
| 7 | `npm run check` (raiz) | ec 0 |
| 8 | `timeout 1800 npm test` (raiz; o runner declara o modo; sem `DATABASE_URL` no ambiente as suítes de Prisma se pulam sozinhas) | 0 falha. Anotar `# skipped` e a linha de modo. Falha aqui, com o bloco sem tocar `src/`, é investigada contra a `main` **no worktree** (`git stash` proibido: usar um 2º worktree limpo em `C:/Users/AMP/w-osfe-base` na `c8af6458`, com `npm ci` próprio) e registrada como pré-existente com evidência, nunca "consertada" aqui |
| 9 | `timeout 600 npm run build` (raiz) | ec 0 |
| 10 | `node scripts/sync-agent-agents.mjs --check` (o CI roda; o bloco não toca agente) | ec 0 |
| 11 | `git diff --check c8af6458...HEAD \|\| exit 1` (e, antes de cada commit, `git diff --cached --check \|\| exit 1`) | sem saída |
| 12 | escopo: `git diff --name-only c8af6458...HEAD` | subconjunto de A1–A13 (§2) |
| 13 | marcadores: `git grep -nE "\[(LT\|EX\|FE\|AD\|RL)[0-9]+\]" -- frontend/tests \| wc -l` | ≥ 26 |
| 14 | mutações de §7.3 (16), com o protocolo | 16 vermelhas nos ids previstos; 16 hashes restaurados |
| 15 | QA visual de §5 (modo demonstração, 1440×900) | captura no relatório, ou "QA visual não feito" declarado |

Nas células acima, `\|` é só o escape de tabela do Markdown: no terminal digita-se `|` (por exemplo `git diff --check c8af6458...HEAD || exit 1` e `git grep -nE "\[(LT|EX|FE|AD|RL)[0-9]+\]" -- frontend/tests | wc -l`).

**Não se aplica, e o relatório diz por quê:** `node --check Kpis/app.js` e qualquer atualização de `Kpis/*` (KPI
congelado, `D-GOV-PROPORCIONAL` (5)); Flutter (sem mobile no bloco); contratos `/api/v1` novos (não há).

### 8.2 Limpeza (§C5), relatada em 1 linha

`frontend/dist/`, `dist/`, `*.tsbuildinfo`, `.vite/` e temporários do scratchpad. Conferir com `git status --porcelain`
(só os arquivos de A1–A13) e `git clean -nxd -- frontend/dist dist` em modo de ensaio antes de apagar. **Nunca**
apagar `node_modules` do worktree durante o bloco; a remoção do worktree, depois do merge, é do orquestrador, por
`git worktree remove --force` (nunca `rm -rf`).

### 8.3 Commit, push e PR

Conforme o mandato do orquestrador. Se ele não disser nada: o dev **não** commita, **não** faz push e **não** abre PR.
Ele deixa as mudanças no worktree e entrega o relatório A13. Se o mandato mandar commitar: Conventional Commits
(`feat(web): Filtrar e Exportar na lista de OS (B-OS-FILTRAR-EXPORTAR)`), um commit de código e um de testes, ou um
só. O corpo do PR **declara a premissa de permissão (§0.6) em destaque**, para o dono poder vetar.

## 9. Riscos e rollback
### 9.1 Riscos

| # | Risco | Mitigação neste bloco | Residual declarado |
|---|---|---|---|
| R1 | **Com filtro ativo, os 4 KPIs passam a contar o recorte** (prioridade e período), não a organização inteira. Eles vêm dos mesmos `items` (D-007: continuam reais) | o botão fica azul (`--engaged`) e mostra o selo com a contagem, mesmo com o cartão fechado | a pessoa pode ler "OS abertas 3" como total. Uma faixa "Filtrado por: …" sobre os KPIs seria a melhoria seguinte, se o dono quiser (próximos passos) |
| R2 | O período é **de abertura** (`created_at`); a tabela mostra **agenda** | rótulo "Data de abertura"; o adaptador passa a usar a mesma coluna do backend (§3.9) | o filtro por agenda ("agendadas para hoje") não existe no backend; fica para um bloco com backend, se pedido |
| R3 | **Pré-existente:** a lista só carrega as **20 OS mais recentes** do recorte (o front não manda `limit`, F6, e o padrão do backend é 20, F7; origem `9f12ea99`/`51238552`, 2026-06-09). KPIs, paginador e exportação só veem essas 20 | a dica do Exportar avisa quando `pagination.total > allItems.length` (§4.4). O filtro no servidor **ajuda**, porque o recorte de 20 passa a ser do conjunto filtrado | o defeito continua. Vira pendência nomeada (§9.3), com escopo `pre-existente` |
| R4 | Corrida entre buscas (troca de filtro × tick) | guarda de ordem (§3.8) + `[FE7]` | caso-limite do tick que falha depois de superar: mostra a lista anterior com a faixa de desatualizado (§3.8), sem fingir atualidade |
| R5 | Texto livre virar fórmula no Excel [H3] | `neutralizeCsvFormula` neste exportador (§4.3) + `[EX4]` | os outros 7 exportadores do `csv.ts` continuam sem neutralizar → pendência (§9.3) |
| R6 | O ajudante `fire` depende da chave interna `__reactProps$` do React (F25) | um só ajudante; **lança** com mensagem clara se a chave não existir (falha alta, nunca verde vazio) | uma troca de versão maior do React pode exigir reescrever o ajudante |
| R7 | Fuso: os limites do período são do fuso **do navegador** | os testes constroem datas no fuso local e passam em UTC (CI) e BRT | quem estiver noutro fuso que a operação vê o "dia" do próprio navegador, o mesmo comportamento da coluna AGENDA |
| R8 | `title` de botão desabilitado não chega a todo leitor de tela [H1] | o motivo também está na tela ("0 ordens", painel de vazio ou de erro) | igual ao precedente da Auditoria |
| R9 | O filtro zera ao voltar do detalhe (não vai para a URL) | decisão explícita (§3.2) | aceito, igual à busca e à aba |
| R10 | Hover azul aparece em botão desabilitado (`.pat-btn:hover` vale também com `disabled`) | — | é o mesmo comportamento da Auditoria. Corrigir em `.pat-btn` muda a Auditoria; fica fora do bloco |
| R11 | A premissa de permissão cair (o dono quer permissão própria) | §0.6: o Exportar sai deste bloco | o Filtrar segue sozinho |

### 9.2 Rollback

O bloco é **só de interface**, sem migration, sem dado persistido (nada em `localStorage`, nada na URL) e sem
contrato novo. **Rollback total:** `git revert <commit de merge do PR>` (squash) e redeploy do front. **Parcial:**
- só o Exportar: remover o botão e o import de `work-orders-export.ts` na página. O resto fica.
- só o Filtrar: a página volta a passar `toApiFilters(EMPTY_LIST_FILTERS)` (constante de módulo) ao hook e não
  renderiza o botão nem o cartão. A guarda de ordem (A2) e a correção do período (A3) podem ficar: são inofensivas
  com filtro constante.

### 9.3 Pendências a abrir (pelo orquestrador, no registro; o dev não edita `controle/`)

| Id sugerido | Escopo | Severidade | Prova (N · forma · causa) | Teste de encerramento |
|---|---|---|---|---|
| `P-WO-LISTA-SO-20-MAIS-RECENTES` | `pre-existente` (origem 2026-06-09, `9f12ea99` front / `51238552` backend) | MÉDIA | N = toda organização com mais de 20 OS no recorte · `GET /work-orders` sem `limit` devolve 20 (`parseLimit` padrão 20, máx. 100) · `buildQuery` não envia `limit` e a tela pagina no cliente | uma organização com 25 OS vê as 25 na lista (paginação no servidor ou "carregar mais"), os KPIs e o Exportar cobrem o recorte inteiro |
| `P-CSV-FORMULA-GLOBAL` | `pre-existente` (`frontend/src/lib/csv.ts`, `D-Ω4C-REM-CSV`) | BAIXA | N = 7 exportadores (Auditoria, Acessos, Acessos do app, Dispositivos, Quilometragem, Recusas, Remunerações; a OS fica coberta por este bloco) · `csvCell` não neutraliza `=`/`+`/`-`/`@` | `csvCell` (ou `buildCsv`) neutraliza, com teste por consumidor que leva texto livre |
| `P-WO-PRIORIDADE-MEDIA-SEM-ACENTO` | `pre-existente` (`work-orders.adapter.ts` l.58-63, 2026-06-09; e `frontend/src/pages/WorkOrderFormPage.tsx` l.55) | BAIXA | "Media" sem acento no Mapa Operacional e no `WorkOrderPriorityBadge` (§11.3) | os rótulos de prioridade têm uma fonte só (`WORK_ORDER_PRIORITY_LABEL`, criada por este bloco) |
| `P-WO-FILTROS-LEGADO-MORTO` | `pre-existente` (`components/WorkOrdersFilters.tsx`) | BAIXA | 0 imports; cópia sem acento e "UUID ou user ID" | apagado num bloco de faxina, com `check` e `smoke` verdes |

E, no fechamento de `P-OS-FILTRAR-EXPORTAR`: "Filtrar (Prioridade, Data de abertura) e Exportar funcionando, com
testes `[FE1]`–`[FE10]`; Técnico segue com `P-WO-LIST-TECH-NAME`". Quando o PR mergear, também pode registrar que o
ajudante `fire` reduz o custo de `P-SAN3-01B-PAGINA-FIACAO-DE-INTERACAO`, **sem fechá-la**: os 9 sítios dela não são
os deste bloco.

## 10. Rota de aprovação
**Classificação pela `D-GOV-PROPORCIONAL` (§C7 item 8(1)), declarada para o revisor poder contestar:**

| Critério de junta completa | Este bloco | Evidência |
|---|---|---|
| dinheiro | **não** | nenhuma tela, rota ou campo financeiro |
| permissão | **não, sob a premissa §0.6** | nenhuma permissão nova; os gates são os de hoje (`work_orders:read` na rota e no backend, `work_orders:create` no "Nova OS") |
| segurança | **não** | autenticação, autorização, isolamento por organização (do JWT) e segredos ficam como estão; nenhum parâmetro de organização. A neutralização de fórmula (§4.3) endurece um **formato de saída** e não cria regra. Se o revisor a considerar "segurança", a rota vira junta completa, e isso se registra |
| perda de dado | **não** | nenhuma escrita: só leitura e um download local |

**Rota (premissa vale) → regra (1):**
1. **Revisor independente**, uma identidade que não escreveu nem planejou (≠ `planejador-b-os-filtrar-exportar`,
   ≠ o dev Codex). Ele confere o checklist de §11 **por execução** (re-roda a bateria §8.1 no head do PR e pelo menos
   3 mutações de §7.3, à escolha dele).
2. **CI verde no head do PR**, com check-runs **concluídos** (`gh api repos/<owner>/<repo>/commits/<sha>/check-runs`):
   **todos** os jobs do workflow, inclusive `backend`, `backend-postgres` e `frontend`. Run `cancelled`/`queued` conta como ausente.
3. **Sem** inspetor de terreno, **sem** ata de junta e **sem** KPI (congelado, regra (5)).
4. **Registro** no próprio PR do bloco ou no PR semanal (regra (3)): fechar `P-OS-FILTRAR-EXPORTAR` e abrir as
   pendências de §9.3.
5. **Porteiro pós-merge:** sim, porque o merge é de **produto** (regra (3)).
6. **Se o revisor reprovar:** quem achou não conserta, quem planeja não desenvolve (§C7.4-bis). O replanejamento volta
   a um planejador, em **Opus declarado** (`D-FABLE-ASTRA-SO-DINHEIRO`: o Fable fica para bloco de dinheiro). A partir
   da 3ª rodada, só bloqueia defeito de produto grave (regra (2)); o resto vira pendência com dono e o bloco mergeia.

**Rota (premissa cai: o dono quer permissão própria para exportar) → junta completa para o Exportar:**
o Exportar sai deste PR (rollback parcial, §9.2) e vira bloco próprio com backend (rota de exportação +
`requirePermission` + evento de auditoria + catálogo/`RBAC_MATRIX.md`), inspetor de terreno, 3 cadeiras e
**unanimidade**. O Filtrar segue nesta rota (1).

## 11. Checklist de aceite do revisor
O revisor marca cada item **com o comando que executou** (nada copiado do relatório do dev). Item sem comando =
não conferido.

**Escopo e governança**
- [ ] `git diff --name-only c8af6458...<head>` ⊆ A1–A13 (§2.1); nada de §2.2 tocado (`src/**`, `prisma/**`,
      lockfiles, `Kpis/**`, `csv.ts`, `patterns/**`, `App.tsx`, `audit/**`, `useAutoRefresh.ts`, `work-orders.service.ts`,
      `.state.ts`, `.types.ts`, `components/WorkOrdersFilters.tsx`, as duas guardas).
- [ ] `frontend/package.json`: diff = **só** o acréscimo de ` tests/work-orders-list-tools.test.ts` no fim de `test:smoke`.
- [ ] Corpo do PR declara a **premissa de permissão** (§0.6) em destaque.

**Comportamento (ver na tela em modo de demonstração ou pelos testes vivos)**
- [ ] Cabeçalho: **Filtrar · Exportar · Nova OS**, nesta ordem; sem `work_orders:create`, só Filtrar · Exportar
      (`[FE1]`). Com 403: nenhum dos dois; sem `create` e com 403, nenhum contêiner de ações (`[FE2]`).
- [ ] Filtrar abre/fecha o cartão entre os KPIs e a tabela; `aria-expanded`/`aria-controls` corretos; 4 campos
      rotulados + Limpar (`[FE4]`).
- [ ] Prioridade e Data de abertura vão ao backend como `priority` e `from`/`to` **ISO** (início e fim do dia local)
      (`[FE4]`, `[FE5]`, `[LT2]`, `[LT3]`); o auto-refresh repete os filtros (`[FE8]`).
- [ ] Selo de contagem no Filtrar (0–2), botão azul com filtro ativo, texto `.sr-only` (`[FE4]`, `[LT4]`).
- [ ] Vazio com filtro: "Nenhuma OS para os filtros atuais", sem CTA no painel (`[FE6]`).
- [ ] Exportar desabilitado com a dica certa em carregando/erro/vazio e habilitado com linhas (`[FE2]`, `[EX6]`).
- [ ] O arquivo tem **as 8 colunas** de §4.1, BOM, `;`, e **o mesmo número de linhas que "N ordens"**, inclusive
      com mais de uma página (`[FE3]`) e seguindo aba e busca (`[FE9]`).
- [ ] Nenhum id, UUID, endereço, telefone ou dado da organização no arquivo (`[EX3]`); fórmula neutralizada
      (`[EX4]`); nome `ordens-de-servico.csv` (`-demonstrativo` em mock) (`[EX7]`).
- [ ] Corrida: a resposta superada não sobrescreve a mais nova (`[FE7]`).
- [ ] Período por **abertura** no cliente e no servidor (`[AD1]`).

**Visual e a11y**
- [ ] Filtrar/Exportar usam `.pat-btn` sem estilo inline (exceto o desabilitado); ícones `Filter`/`Download` com
      `aria-hidden`; tokens de §5 (o CSS novo é **só** `.pat-btn--engaged` e `.pat-btn__count`).
- [ ] O botão com selo continua com a altura dos outros (35 px), conferido na captura do relatório ou pelo próprio
      revisor; sem termo técnico na tela; acentos certos ("Média", "Até", "Período").

**Bateria e prova**
- [ ] §8.1 re-executada pelo revisor no head: `check` ec 0; bloco **47/47**; smoke **1268/1268** (ou o número
      do relatório, com a diferença explicada); `build` ec 0; os 3 testes do backend que leem o front verdes;
      `npm run check`/`npm test`/`npm run build` da raiz verdes; `git diff --check` limpo.
- [ ] Pelo menos 3 mutações de §7.3, escolhidas pelo revisor, ficam vermelhas nos ids previstos, e o arquivo volta
      ao hash original.
- [ ] Os 13 casos existentes da página viva, o `[G1]`/`[G1b]` e o guard de CSS continuam verdes **sem edição**.
- [ ] CI com check-runs **concluídos e verdes** no head (§10).
- [ ] Relatório do dev (A13) com o checklist Solicitado · Feito · Não feito · Validação · Próximos passos, a tabela de
      mutações (16 linhas, com hashes) e a linha de limpeza.

## 12. Ordem de execução sugerida e tamanho

Tamanho: **pequeno a médio**. São 3 arquivos novos de código (~250 linhas somadas), ~80 linhas mudadas na página,
5 no hook, 1 no adaptador, ~20 de CSS e ~450 de teste (a maior parte é o arnês da página viva). Sem backend, sem
banco, sem dependência.

Ordem (cada passo fecha com o teste dele verde antes do próximo):
1. A4: mover `WORK_ORDER_PRIORITY_LABEL` e `workOrderServiceLine` para `work-orders-row.logic.ts`, e a página passa
   a importá-los. Comportamento idêntico: `test:smoke` continua 1242/1242.
2. A5 + A9 (`LT*`, `RL1`).
3. A6 + A9 (`EX*`).
4. A3 + A11 (`AD1`).
5. A2 (guarda de ordem). Os 13 casos vivos seguem verdes.
6. A7 (cartão) + A8 (CSS).
7. A1 (cabeçalho, estado, ligação, vazio com filtro, exportação, comentários).
8. A10 (`FE1`–`FE10`) + A12 (`test:smoke`).
9. Bateria §8.1 completa → mutações §7.3 → QA visual §5 → limpeza §8.2 → relatório A13.

Se algum passo revelar que uma premissa deste plano é falsa (por exemplo, um consumidor de `filterWorkOrders` que
não está em F10, ou uma regressão que o plano não previu), **o dev para, registra no relatório com o comando e a
saída, e não improvisa o remédio**. A correção do plano é do planejador.
