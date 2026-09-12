# PLANO SAN3 — saneamento até a versão vendável

> **O que é.** A revisão adversarial do `docs/revisoes/O6R/PLANO_O6R.md` somada ao inventário completo das
> pendências, medida no código em `origin/main@15ef3fbe` (a `main` com o `B-O6R-06`, #385). O `PLANO_O6R.md`
> **não é apagado** (§A2): este plano o **supera para o que resta** e diz, item a item, o que herda, o que
> corrige e o que acrescenta (§8).
>
> **Autoria:** orquestrador (consolida o inventário; não achou os defeitos — os achadores foram 8
> inventariantes somente-leitura). **Revisão adversarial:** `critico-adversarial`, 2 rodadas — a rodada 1 (17
> achados, 6 `bloqueia`) está respondida no §12, a rodada 2 (12 achados, 2 `bloqueia`) no §13. **Junta do PR do
> plano: unanimidade de 3** — o PR não toca código, mas fecha por presença pendências de segurança, permissão e
> dinheiro, e o quórum é o da classe (§C7.1-ter(b); crítico r2, CR2-07). A junta de cada BLOCO segue o quórum
> do risco dele.

---

## 0. O resumo que o dono precisa ler

1. **Inventário completo.** As 238 linhas abertas do índice (231 IDs distintos), os 32 achados Ω6R (17 não
   fechados) e **140 candidatos a pendência que não estavam no registro** foram medidos **pelo código**, nunca
   pelo texto da entrada. As tabelas de 13 campos estão em `docs/revisoes/SAN3/inventario/`, uma por fatia.
2. **O registro errava o status de 52 das 231 entradas (22,5%)** — 31 fechadas no código que o texto dava como
   abertas e 21 parciais que o texto não declarava — **e faltavam 49 pendências reais** (35 de produto, 14 de
   governança; a fatia confirmou 50, uma caiu na reconfirmação). Este PR corrige as 52 linhas de status, registra
   as 49 e corrige os dados das duas pendências do painel de KPI, que seguem ABERTAS (PARCIAL) até o guard do item
   54. Índice (gerador, depois do ciclo 2): 366 cabeçalhos (355 IDs); FECHADAS 72 → 103; ABERTAS 263.
3. **O gate da versão vendável tem 54 bloqueantes, fechados por 37 blocos, e 6 atos que só o dono pratica**
   (§4). **Nenhum dos 37 blocos começou.** O que o inventário acrescentou à auditoria pesa: pela web um título
   **nunca é baixado** e cheques, fechamento de período e política de comissão **não têm tela**; no app, o
   fluxo Prestador e a entrega do guincho **não têm porta**, o estoque do técnico é **inventado no código** e
   duas ações da fila local **nunca são enviadas**; no faturamento, item lançado depois do primeiro faturamento
   **nunca é cobrado**.
4. **Não cabe em 48 horas.** O melhor caso — 4 frentes em paralelo, cada bloco no tempo do mais rápido já
   medido, sem reprovação — é **≈ 120–130 h de relógio**, contadas desde a abertura deste PR. O realista, pela
   mediana medida dos blocos grandes (57 h), é **≈ 14 dias com 4 frentes simultâneas e ≈ 20,5 a 21 dias com 2**
   (§9), sem contar o tempo dos atos do dono. **Não há redução de escopo:** a execução segue pela ordem de risco; o
   gate só é declarado quando os 54 bloqueantes fecharem **e** os 6 atos estiverem feitos.
5. **O Traccar não começa antes do gate** — decisão registrada em `D-TRACCAR-HTTP-PRIVADO-AWS` (§11).

## 1. Fonte e método

- **Head medido:** `15ef3fbe` para as 7 fatias do registro; `ca5fd19a` (árvore idêntica, `7883a59e`) para o
  inventário dos achados Ω6R. Somente leitura: `git show`/`log`/`ls-tree`/`grep`; nenhum teste, build ou banco.
- **Fatias:** A1 e A2 (balde A, 63 linhas) · B1 e B2 (balde B, 99 linhas / 92 IDs) · C1 e C2 (balde C, 76) ·
  O6R (32 achados) · **AUSENTES** (9 fontes — atas, pareceres, auditorias, sínteses de produto, dossiês — cruzadas
  com o registro).
- **Placar do registro** (status comprovado pelo código, lido da coluna de cada fatia):

| Fatia | IDs | FECHADA | PARCIAL | ABERTA | NÃO MEDIDA | flips (status errado no texto) |
|---|--:|--:|--:|--:|--:|--:|
| A1 | 32 | 3 | 3 | 26 | 0 | 4 |
| A2 | 31 | 2 | 2 | 27 | 0 | 4 |
| B1 | 50 | 16 | 3 | 31 | 0 | 19 |
| B2 | 42 | 5 | 4 | 33 | 0 | 8 |
| C1 | 38 | 2 | 9 | 27 | 0 | 11 |
| C2 | 38 | 3 | 3 | 31 | 1 | 6 |
| **Total** | **231** | **31** | **24** | **175** | **1** | **52** |

  Nem toda PARCIAL é flip: 3 parciais (2 da A1 e `P-O6R-B06-DECIMAL-NA-BORDA`) já se declaravam parciais no
  texto. `P-O6R-B07` (A1) é flip no sentido inverso — o texto dizia FECHADA, o código é parcial.
- **Placar das AUSENTES:** 140 candidatos → 37 já registrados · 8 parcialmente (falta um componente nomeado) ·
  **58 linhas AUSENTE (= 50 IDs) confirmadas por presença** (35 produto, 15 governança; 10 bloqueiam pelo critério
  da fatia) · 24 superadas · 13 não são pendência — 37 + 8 + 58 + 24 + 13 = 140 (C3-05). **Registradas: 49** — `P-GOV-MODELO-CODEX-SEM-NOME` caiu na reconfirmação: o `AGENTS.md`
  traz os IDs de modelo desde o #381 (l.524).
- **A coluna de severidade do `pendencias-indice.md` NÃO é usada para ordenar este plano.** `severidade()`
  (`gerar-indice-pendencias.py:75-80`) devolve a severidade mais alta **mencionada em qualquer ponto do corpo**
  (§7.2). A ordenação usa a severidade medida contra o código.

## 2. O gate da versão vendável — os critérios do dono, literais

A versão só é declarada vendável quando: (1) não existir pendência bloqueante do plano; (2) isolamento
multi-tenant validado; (3) RBAC validado no backend; (4) fluxos financeiros preservam dinheiro exato;
(5) nenhum risco conhecido de perda de dados; (6) backend, frontend e Flutter verdes; (7) fluxos principais
funcionando ponta a ponta; (8) KPIs refletindo execução real; (9) CI verde; (10) juntas registradas;
(11) porteiros pós-merge concluídos; (12) roteiro de demonstração e operação.

**(13) "O produto tem que sair polido e testado"** — palavras do dono nesta rodada, fonte §A1.1. Lido junto com a
Definition of Done do contrato (§3 linguagem da UI, §7 estados obrigatórios, §11 fidelidade — "sem andaime de dev
na UI", "acentuação correta"), que é arquivo-base (§A1.2). É o critério que sustenta os itens de linguagem e de
tela inventada (itens 17, 45–49 e 53), que nenhum dos 12 alcança ao pé da letra (crítico r2, CR2-03).

**Default de escopo aplicado enquanto o dono não decidir (§10.1):** *tudo o que está construído — ou que o
próprio produto diz entregar — está à venda.* É o gate mais estrito. Nenhum módulo sai do gate sem declaração
escrita do dono.

**Regra de classificação, aplicada por igual a todo item medido:** um item entra no gate quando viola, **no
código medido**, um dos 13 critérios lidos ao pé da letra — sem exceção por severidade herdada, por "janela
pequena" ou por "mitigado no cliente". Um item só fica fora com **condição medida** que o torne inaplicável a um
cliente novo (§4.3), e a condição fica escrita. Onde a fatia deu outra leitura, a divergência fica registrada
(§8.7).

**Os atos do dono estão DENTRO do gate.** Seis itens dependem de ato fora do repositório (§4.2). O plano os
**prepara** — cada um sai dos blocos pronto para executar, com o roteiro de operação dizendo como — mas **não os
dispensa**: o gate não é declarado enquanto faltarem. Declarar antes é decisão do dono (§10.0).

## 3. Ordem — a lista de prioridades do dono é a chave

1 perda/corrupção de dados · 2 isolamento multi-tenant · 3 segurança e permissões · 4 faturamento e dinheiro ·
5 confiabilidade · 6 contratos e testes · 7 fluxos necessários para venda · 8 acabamento web/mobile ·
9 documentação e rastreabilidade. Dentro da mesma prioridade: **causa-raiz antes de sintoma**; **frente livre
antes de frente com dependência**.

## 4. O gate, item a item

### 4.1 Bloqueantes — 54 itens

Coluna **reclass.**: a fatia dava o item como não bloqueante (ou condicional); a regra do §2 o leva ao gate. Todo
`✓` está no §8.7 e é alvo da junta.

| # | Item (pendência / achado) | Crit. | Prova curta (fatia) | Bloco | reclass. |
|--:|---|:-:|---|---|:-:|
| | **Prioridade 1 — perda ou corrupção de dados** | | | | |
| 1 | `Ω6R-DAT-002` (P0) — saldo de estoque checado por agregado e inserido sem lock; `P-020` é o mesmo sítio | 5 | `src/modules/inventory/inventory-prisma.repository.ts:199-236` (O6R, B1) | `B-O6R-04a` | |
| 2 | `Ω6R-DAT-003` (P0) — ajuste de contagem aplicado duas vezes ou parcial | 5 | `src/modules/inventory/cycle-count.service.ts:137-218` (O6R) | `B-O6R-04a` | |
| 3 | `Ω6R-QUA-005` (em `P-O6R-B11`) — material do prestador some no restart; o `QUA-004` (envelope da OS lido errado, crit. 7) vai no mesmo bloco | 5 | `mobile/flutter_app/lib/features/prestador/data/prestador_repository.dart:117-136` `forEach` sem `await` (O6R, B2; conferido pelo orquestrador) | `B-O6R-11` | ✓ |
| 4 | `P-008` — lista vazia vira 6 OS inventadas com aviso falso; create recusado pelo backend vira OS falsa (`OS-FALLBACK`) e o que o operador digitou se perde | 5, 7 | `frontend/src/modules/work-orders/work-orders.service.ts:28,46-50,60-72` (C1; conferido) | `B-SAN3-01` | |
| 5 | `P-MOBILE-FILA-OS-NAO-DRENADA` — "pedir aprovação" e "não consigo iniciar" entram na fila e nunca saem; o backend nem aceita os dois tipos | 5 | `work_order_repository.dart:474,637`; `sync_replay_service.dart:625+` (AUSENTES; tipos conferidos) | `B-SAN3-16` | |
| 6 | `P-CHK-PATCH-SEM-LOCK` — PATCH de modelo de checklist é last-write-wins, sem guarda de versão no backend | 5 | `src/modules/checklists/checklist.service.ts:119` sem comparação; mitigação só no editor web (A1) | `B-SAN3-22` | ✓ |
| 7 | `Ω6R-ARQ-004` — despacho e evento obrigatório em transações separadas, sem chave idempotente | 5 | `src/modules/field-dispatch/field-dispatch.service.ts:138-161` (O6R: risco "perda/corrupção") | `B-O6R-09` | ✓ |
| 8 | `P-CHK-DOSSIE-VERSAO-NA-UI` — a vistoria substituída aparece como válida no dossiê | 5 | B1 — **condicional: dossiê vendido como prova** (default: sim) | `B-SAN3-11` | |
| | **Prioridade 2 — isolamento multi-tenant** | | | | |
| 9 | `P-INFRA-RLS` — nada no repositório impõe `NOSUPERUSER NOBYPASSRLS` ao papel de runtime; o compose de subida/smoke (`docker-compose.prod.yml:35,57`) conecta como `postgres`; o papel real da produção é secret do Fly e **não foi medido** | 2 | B1; `docs/deployment.md:200-233`; `fly.production.toml:9` | `B-SAN3-05` | ✓ |
| 10 | `P-O6R-B06-LEITURA-PLATAFORMA-SOB-FORCE-RLS` — leituras de uso de nuvem da plataforma sem contexto de tenant devolvem **zero** sob papel sem `BYPASSRLS`: é **pré-requisito do item 9** (no dia da troca de papel, o resumo de uso e o Cloud Billing zeram) | 2, 7 | `src/modules/cloud-usage/cloud-usage-prisma.repository.ts` (`RlsPrismaCloudUsageRepository`, `listEvents`/`listDailyAggregates`) (A2; crítico r2, CR2-02) | `B-SAN3-05` | ✓ |
| | **Prioridade 3 — segurança e permissões** | | | | |
| 11 | `Ω6R-SEC-002` residual (`P-O6R-SUBRECURSO-OBJECT-SCOPE`) — técnico não atribuído apaga anexo e grava km em OS alheia (10 vias: 9 nos routers de OS e comentários, 1 no sync mobile) | 3 | O6R §2.2; A1 | `B-O6R-07c` | |
| 12 | `P-027` — Financeiro e Estoque sem `dashboard:read`; a home pós-login abre em 403 | 3, 7 | catálogo × `RBAC_MATRIX.md:34` (C1) | `B-SAN3-04b` | |
| 13 | `P-Ω4-FINANCE-READ-ORFA` — em modo real, Financeiro/Cobranças/Pagamentos saem do menu dos papéis Financeiro e Gestor | 3, 7 | `src/modules/navigation/navigation.registry.ts:344-393` (C2 — por composição de leitura; o bloco mede antes de consertar) | `B-SAN3-04a` | |
| 14 | `P-033` — o papel `auditor` não é semeado; com as permissões vindo do banco, o 403 ao vivo que a fatia C1 descartou volta a ser plausível | 3, 7 | `prisma/seed.ts:252`; `persistent-rbac-context.middleware.ts:90-107` — **condicional à medição em modo banco no bloco** | `B-SAN3-04a` | ✓ |
| 15 | `P-RBAC-CHECKLIST-DRIFT` — o papel `manager` tem `checklist_runs:acknowledge` no catálogo além do que a matriz concede | 3 | `src/modules/core-saas/permissions/catalog.ts:574` × `RBAC_MATRIX.md:43-44` (B1; crítico r2) | `B-SAN3-04a` | ✓ |
| 16 | `P-WEB-GATE-MODULO-INCOMPLETO` — **38** itens do menu fora do gate de módulo: os 27 do método MVP menos registro **mais** as 11 entradas registradas sem `requiredModules` (`/patios/*` ×6, `/telemetria/*` ×5), liberadas por `hasModule`; nenhuma recusa por módulo achada no backend; sem chave de módulo para Pátios, Telemetria e Frota | 3 | AUSENTES (backend medido por padrões, não exaustivo); `src/modules/navigation/navigation.service.ts:114-115`; `src/modules/platform/platform-modules.service.ts` (C2-02) — **condicional: venda por plano/módulo** (default: sim) | `B-SAN3-18` | |
| 17 | `P-WEB-PLATAFORMA-SEGURANCA-FABRICADA` — "MFA obrigatório para admins" ligado por literal (a tela declara controle inexistente — C2-11) | 13 | `frontend/src/modules/platform/pages/PlatformSettingsPage.tsx:43-44` `<Toggle on />` (conferido) | `B-SAN3-06b` | |
| 18 | `P-MOBILE-LGPD-GPS-SEM-PORTA` — o consentimento de GPS nunca pode ser dado (crit. 7 pela porta; crit. 3 pelo backend, item 52 — C2-11) | 7, 3 | `mobile/flutter_app/lib/app/router.dart:232,410`; `mobile/flutter_app/lib/core/location/geolocator_device_location_provider.dart:56-59` (efeito na captura **a medir no bloco**) | `B-SAN3-17` | |
| 51 | `P-SAN3-CHECKLIST-RUN-SEM-ESCOPO-POR-OBJETO` — técnico responde, conclui e dá ciência em vistoria de OS alheia | 3 | `src/modules/checklists/checklist.routes.ts:164-202` só por permissão (C2-09, pre-existente) | `B-O6R-07c` (ampliado) | ✓ |
| 52 | `P-FIELD-LOCATION-SEM-CONSENTIMENTO-NO-BACKEND` — o backend grava posição sem conferir consentimento | 3 | `src/modules/field-location/field-location.service.ts:21-38` (C2-12) | `B-SAN3-17` (ampliado ao backend) | ✓ |
| | **Prioridade 4 — faturamento e dinheiro** | | | | |
| 19 | `Ω6R-DIN-009` (P0) — replay de despesa paga duas vezes; dois usuários colidem na chave | 4 | `src/modules/expense-management/expense-management.service.ts:155-193` (O6R) | `B-O6R-03a` | |
| 20 | `P-Ω4-3-INVOICE-ATOMIC` + `P-Ω4-3-INVOICE-TOCTOU-DELETE` — título e carimbo dos itens sem transação única; item apagado entre leitura e carimbo entra no título | 4 | `src/modules/work-order-financials/work-order-financial.service.ts:362-407`; `src/modules/financial-titles/financial-title.service.ts:122` sem variante transacional (C2; crítico r2) | `B-SAN3-02` | ✓ |
| 21 | `P-Ω4-3-REFATURAR-DELTA` — item lançado depois do 1º faturamento **nunca é faturado**: o índice único parcial admite um título ativo por OS e direção. **Conflito com `D-Ω4-C2`** (registrado) | 4 | `prisma/migrations/20260811000000_add_invoicing/migration.sql:25-27` (crítico r1/r2) | `B-SAN3-02` | ✓ |
| 22 | `P-Ω4-7-DUPLA-CONTAGEM` — nada impede baixar o título e compensar o cheque do mesmo dinheiro. **Conflito com `D-Ω4-7-NO-TITLE`** (registrado) | 4 | B1; `decisoes.md` (`D-Ω4-7-NO-TITLE`) | `B-SAN3-20` | ✓ |
| 23 | `P-Ω3F6-CANCEL-RACE` — o cancelamento e a criação de item financeiro não compartilham lock de linha: item nasce em OS cancelada | 4 | `src/modules/work-orders/work-order.service.ts:1414` ("hardening futuro"); `pendencias.md` `P-Ω3F6` (crítico r2) | `B-SAN3-23` | ✓ |
| 24 | `Ω6R-DAT-004` — perfil normativo vivo re-tempera diárias de custódia em curso | 4 | `src/modules/jurisdiction/jurisdiction.service.ts:76-98`; `src/modules/charging/charge.accrual.ts:159-164` (O6R) — **condicional: Pátios à venda** (default: sim) | `B-O6R-12` | |
| 25 | `P-O6R-B06-USAGE-BEST-EFFORT-RESIDUAL` + `P-O6R-B06-BASE-SEM-PRODUTOR` — base do rateio de nuvem perdida em silêncio e custo de API sempre `unallocated` | 4 | A2 — **condicional: repasse de custo de nuvem na oferta** (default: sim) | `B-SAN3-03` | ✓ |
| 26 | `P-O6R-LISTCOSTLINEITEMS-SEM-ESCOPO-IMPORT` — o rateio lê linhas de custo por sobreposição de período, sem `import_id`: uma reimportação soma o custo em dobro | 4 | `src/modules/cloud-cost-allocation/cloud-cost-allocation-prisma.repository.ts:208` (crítico r2) | `B-SAN3-03` | ✓ |
| | **Prioridade 7 — fluxos necessários para venda** | | | | |
| 27 | `Ω6R-SEC-004` residual (`P-O6R-B07B-SCANNER-AV-REAL`) — produção e staging respondem 503 a TODO upload | 7 | `src/modules/evidence/evidence-scanner.factory.ts:34` (A2) — **fecha só com o serviço respondendo no ambiente (ato do dono, §4.2)** | `B-AV-REAL` | |
| 28 | `P-WEB-FIN-BAIXA-E-CONTA-SEM-TELA` — a web emite título e não liquida: sem tela de baixa nem de conta | 7, 4 | nenhuma chamada a `/financial-titles/:id/pay` em `frontend/src`, e `financial-account` em `frontend/src` = 0 (AUSENTES; conferido) — o `grep "/pay"` cru acha 34 linhas de `/payable`, `/payable-source`, `/payments`, `/payee`, `/payload` (C3-04) | `B-SAN3-12` | |
| 29 | `P-WEB-FIN-CHEQUE-FECHAMENTO-COMISSAO-SEM-TELA` — cheques, fechamento de período e política de comissão têm backend pronto e nenhuma tela; o próprio `mvp_vendavel` os conta como núcleo vendável | 7 | AUSENTES; nota do `mvp_vendavel` (crítico r2, CR2-12) | `B-SAN3-24` | ✓ |
| 30 | `Ω6R-QUA-001` — RDV no app nunca sincroniza | 7 | `mobile/flutter_app/lib/core/sync/sync_providers.dart:51,109-119` (O6R) | `B-O6R-03b` | ✓ |
| 31 | `Ω6R-QUA-002` — estoque no app não sincroniza | 7 | `mobile/flutter_app/lib/features/inventory/data/inventory_repository.dart:92-105`; `src/modules/mobile/mobile-inventory-sync.ts:98-105` (O6R) | `B-O6R-04b` | ✓ |
| 32 | `P-MOBILE-MINHAS-OS-SEM-FILTRO` — "Minhas OS" filtra só por organização no cache local; o app não envia o `assignedUserId` que o backend oferece, nem pagina; e o backend **não impõe** escopo de leitura por papel (`src/modules/work-orders/work-order.service.ts:402-418`) — o §10.7 pergunta ao dono, com default estrito: o técnico lista só as atribuídas, imposto no backend (C2-10) | 7 | `mobile/flutter_app/lib/shared/ui/home_screen.dart:122`; `src/modules/work-orders/work-order.service.ts:409` (filtro opcional) (AUSENTES; crítico r2) | `B-SAN3-13` | |
| 33 | `P-MOBILE-OS-SEEDS` (purga) — as OS semente gravadas no aparelho nunca são apagadas | 7 | `mobile/flutter_app/lib/features/work_orders/data/work_order_repository.dart:750,766,779` (A1, AUSENTES 2c) | `B-SAN3-13` | |
| 34 | `P-MOBILE-GUINCHO-ENTREGA-INALCANCAVEL` — o app cobre só a coleta | 7 | `work_order_execute_screen.dart:94`; `work_order_steps.dart` (AUSENTES) | `B-SAN3-14` | |
| 35 | `P-MOBILE-PRESTADOR-SEM-PORTA` — o fluxo Prestador não tem porta de entrada | 7 | `mobile/flutter_app/lib/app/router.dart:159,339` (AUSENTES) | `B-SAN3-15` | |
| 36 | `P-MOBILE-CONCLUSAO-SEM-PORTA` — a tela de Conclusão é inalcançável | 7 | `router.dart:165,345` (AUSENTES — condicional na fatia) | `B-SAN3-15` | ✓ |
| 37 | `P-MOBILE-ESTOQUE-TECNICO-FABRICADO` — material faturável escolhido de 8 SKUs escritos no código | 7, 4 | `prestador_repository.dart:38-87` (conferido) | `B-SAN3-15` | |
| 38 | `P-026` — usuário só `inventory` recebe o menu inteiro do gestor, cheio de itens que o backend nega | 7 | `frontend/src/modules/auth/auth.adapter.ts:220-238`, `frontend/src/layouts/appSidebarNav.ts:271-291` (C1 — o backend nega corretamente; o defeito é de fluxo) | `B-SAN3-04a` | ✓ |
| 39 | `P-PURCHASE-ORDERS-BACKEND-GATE` + `P-RBAC-GATING-MOCKSHELLS` — Pedidos e Relatórios no menu com linhas inventadas, sem endpoint; Console de Despacho com organização fixa | 7 | `PedidosPage.tsx:19`, `ReportsPage.tsx:5`, `DispatchConsolePage.tsx:9` (C2) | `B-SAN3-06a` | |
| 40 | `P-Ω3F4C-ACTIVATION-PROMPT` — orçamento com "Exige endereço de destino" nunca é aprovado pela UI | 7 | C1; `frontend/src/modules/work-orders/components/tabs/QuoteTab.tsx:106` aprova com corpo vazio | `B-SAN3-08` | |
| 41 | `P-Ω3a` — o Financeiro não consegue criar orçamento pela UI | 7 | C1; a matriz diz que o Financeiro "constrói o orçamento" | `B-SAN3-08` | ✓ |
| 42 | `P-SAN-E2E` — os testes e2e Playwright não rodam no gate obrigatório da CI | 7 | `git grep playwright -- .github` = 0 (B1) | `B-SAN3-10` | |
| 50 | `P-WEB-FATURAR-OS-SEM-TELA` — a web não fatura OS; a `InvoicesPage` afirma que fatura | 7, 4 | `src/modules/work-order-financials/work-order-financial.routes.ts:78`; 0 chamada em `frontend/src`; `frontend/src/modules/work-orders/components/tabs/FinancialTab.tsx`; `frontend/src/modules/finance/pages/InvoicesPage.tsx:53` (C1-02) | `B-SAN3-25` (novo) | |
| | **Critério 8 — KPIs refletindo execução real** | | | | |
| 54 | `P-KPI-ROADMAP-CONGELADO` + `P-KPI-RECENT-CONGELADO` — resíduo: nenhum guard impede o painel de defasar do último merge (os dados foram corrigidos neste PR; as duas entradas seguem ABERTAS (PARCIAL)) | 8 | `Kpis/kpis-latest.json` (`roadmap`, `recent`) sem guard de frescor contra o último merge do history; critério de fechamento registrado nas duas entradas de `agent-orchestration/controle/pendencias.md` (C3-03) | `B-SAN3-10` | ✓ |
| | **Critério 12 — roteiro de demonstração e operação** | | | | |
| 43 | `P-SAN-PROD-BOOTSTRAP` — não há caminho versionado para o 1º admin real; é passo do roteiro de operação | 12 | C1 | `B-SAN3-09` | |
| 44 | `P-SAN3-ROTEIRO-DEMO-OPERACAO` — não existe roteiro de demonstração nem de operação | 12 | `docs/go-live-readiness.md:58-67` (restore cronometrado só no ambiente real) | `B-SAN3-10` | |
| | **Critério 13 — polido e testado (linguagem e tela inventada)** | | | | |
| 45 | `P-019` — Auditoria Global da plataforma 100% inventada | 13 | `frontend/src/modules/platform/pages/PlatformAuditPage.tsx:17-38` (C1) | `B-SAN3-06b` | |
| 46 | `P-WEB-CLOUD-BILLING-CARTAZ` + `P-WEB-PLATAFORMA-TELAS-FICCAO` — Cloud Billing é cartaz de literais; Planos e Módulos, APIs e a lista de Organizações exibem dado inventado | 13 | `PlatformCloudBillingPage.tsx` sem um `fetch`; `PlatformTenantsPage.tsx:18-19` (AUSENTES — "demo honesta") | `B-SAN3-06b` | ✓ |
| 47 | `P-CHK-SEED-DEMO-SUJO` — a organização da demonstração chama-se "Tenant Demo" | 13 | `prisma/seed.ts:214,219` (C2) | `B-SAN3-07` | |
| 48 | `P-MOBILE-FAXINA-TERMOS-TECNICOS` + o aviso falso "Integração remota ainda não ativa" renderizado sem condição em toda tela de sync | 13 | `home_screen.dart:153-154`; `mobile/flutter_app/lib/shared/ui/sync_screen.dart:92,269` (AUSENTES; conferido) | `B-SAN3-19` | ✓ |
| 49 | `P-028` + `P-Ω3F2B-ACENTOS` — texto sem acento em telas e em rótulos vindos de `.ts` (formulário de Nova OS, acesso negado, navegação) | 13 | C1; `auth.adapter.ts:89,216`, `tenantNavigation.ts:506`, `platformNavigation.ts:6,76`, `work-orders.adapter.ts:217` (crítico r2) | `B-SAN3-21` | ✓ |
| 53 | `P-MOBILE-CHECKIN-CONFERE-CODIGO-DA-OS` — o check-in pede a placa e confere o fim do código da OS; o backend não confere | 13, 3 | `mobile/flutter_app/lib/features/work_orders/ui/work_order_detail_screen.dart:918-931` (C2-01) | `B-SAN3-26` (novo) | ✓ |

**Dados corrigidos por este PR (critério 8); as duas entradas seguem ABERTAS (PARCIAL) — item 54:**
`P-KPI-ROADMAP-CONGELADO` (o roadmap do painel marcava `B-O6R-02` e `B-O6R-07` como `a_fazer` depois do merge —
agora `concluido` e `parcial`; no ciclo 2, `roadmap.as_of` 2026-09-11 e `B-O6R-06` com o #385) e
`P-KPI-RECENT-CONGELADO` (a seção "Últimas demandas" parada em 28/08 — atualizada até o #386). O critério de
fechamento das duas — guard que falha quando o painel defasa do último merge, provado por mutação — é o teste (g)
do `B-SAN3-10` (item 54). A causa comum — nenhum PR de entrega é obrigado a alimentar essas duas seções — fica com
o `B-GOV-GUARD-DERIVADOS`. **`Ω6R-DIN-005` e `Ω6R-DIN-007`** fecharam na
`main` com o #385; o backfill deles é pago neste PR.

### 4.2 Os 6 atos do dono — dentro do gate

| Ato | O que os blocos entregam pronto | O que só o dono faz |
|---|---|---|
| Go-live (`P-GOLIVE-GATES`) | checklist de 12 passos de `docs/go-live-readiness.md` atualizado (a linha 76, que diz "nenhum código bloqueia o go-live", corrigida) e ensaiado fora do ambiente real (`B-SAN3-10`) | R1/R2 no ambiente real (restore cronometrado, RPO/RTO no runbook), staging verde, smoke autenticado; a junta que revoga `deploy_bloqueado` |
| Antivírus no ambiente | cliente, config, testes e `fly.clamav.toml` (`B-AV-REAL`) | contratar/provisionar o serviço (junta-5 antes) — o item 27 só fecha com ele respondendo |
| Papel de banco da produção | trava de boot e procedimento (`B-SAN3-05`) | criar o papel `NOSUPERUSER NOBYPASSRLS` no banco gerenciado e trocar o secret — os itens 9 e 10 só fecham com a trava verde no ambiente |
| 1º admin real | script testado (`B-SAN3-09`) | executá-lo em produção |
| Portal público (`Ω6R-PERF-003`) | a condição escrita no roteiro | expor em container separado, ou não expor |
| Provedor | nada muda sem decisão | Fly × AWS (§10.2) |

### 4.3 Fora do gate — com a condição medida de cada um

| Item | Por que não alcança um cliente novo, ou por que não bloqueia | Condição |
|---|---|---|
| `Ω6R-ARQ-001/002/003`, `Ω6R-PERF-001` (jobs) → `B-O6R-08` | notificação perdida não é dado de negócio; sweeps idempotentes | **1 réplica**, restart automático |
| `Ω6R-PERF-002` → `B-O6R-10` | UX sob degradação, sem perda | p99 do backend < 30 s |
| `P-Ω3F6-MOBILE-DEADLETTER` | a perda só acontece com ação de cancelamento enfileirada **antes** da atualização do app que mudou o fluxo; um cliente novo instala a versão atual e não tem essa fila | no go-live, aparelho de demonstração com versão antiga do app tem a fila drenada ou limpa antes (passo do roteiro de operação) |
| `P-Ω3F6-LEGACY-NULL` (≡ `P-GOLIVE-VALIDATE-CONSTRAINT`) | linhas de OS canceladas antes do #228; a base de produção nasce vazia | conferir no go-live (ato do dono R1) |
| `P-Ω3F6-CANCEL-IDEM` | o retry de rede depois de um cancelamento efetivado recebe erro, mas nada se perde nem se duplica | fila pós-gate |
| `P-MOBILE-DESPACHO-SEM-PUSH` | funcionalidade não construída: o técnico vê a OS ao abrir o app | o dono decide se entra (§10.1) |
| `P-CHK-APLICABILIDADE-SEM-ROTA` | funcionalidade não exposta: o próprio código diz que entre o 04c-A e o 04c-B não existe rota nem permissão | entra se o dono pedir (§10.1) |
| `P-O6R-B06-RECONCILE-BLOQUEADO` | atinge só vistorias anteriores ao #385 | a junta do `B-O6R-06` decide o predicado; nenhum `--apply` na base viva antes |
| `P-032` (atalho de Configurações no Ctrl+K) | acabamento: a rota funciona | fila pós-gate |
| `P-009` (contraste abaixo de AA) | não impede demo | vira bloqueante se a venda exigir WCAG |
| demais ABERTAS (≈ 200 IDs de processo, arnês, borda e acabamento) | medidas uma a uma nas fatias | fila pós-gate (§7.3) |

### 4.4 O que as AUSENTES trouxeram para o registro

**49 das 50 ausentes** entraram no `pendencias.md` neste PR, cada uma com cabeçalho próprio e os campos que a fatia
mediu; as **8 parciais** entraram como **9 emendas** da pendência existente (a mesma parcial vale para duas entradas
da plataforma — C3-07). As 14 de governança vão para a fila do §7.3 —
entre elas duas afirmações falsas vivas no head: a skill `backend-review-ts-prisma`
(`.claude/skills/backend-review-ts-prisma/references/repo-erp.md:23`, "teste `-db` se auto-pula" no job `backend`)
e as receitas dos itens 1.1 e 3.3 do inspetor, com `md5` cru.

## 5. Os blocos

Cada linha fixa a **fronteira em caminhos reais** (conferidos contra a árvore de `15ef3fbe`; "novo" = arquivo a
criar). O `planejador-mestre` de cada bloco (Fable, §C7.6) escreve o diff dentro dela. **Caminho proibido pelo §C4
só é tocado onde a linha o autoriza pelo nome**; migração autorizada é **aditiva** (ou troca de índice que não
remove linha), com up/down testados pelo `agente-dba-guardiao` — migração que remova linha é parada irredutível
(§C7.5). **Onde o conserto contraria decisão registrada, o conflito está no `decisoes.md`
(`REGISTRO-SAN3-CONFLITOS`) e a junta do bloco revê a decisão antes da primeira linha de código.**

**Quórum:** unanimidade de 3 em todo bloco que toca dinheiro, segurança, permissão ou perda de dado; maioria de 3
só onde o bloco é texto/fluxo sem esses quatro (`SAN3-07`, `SAN3-14`, `SAN3-19`, `SAN3-21`). Crítico
adversarial nos blocos de invariante.

**Esforço:** P ≈ 1,5 h · M ≈ 5 h · G ≈ 13 h no melhor caso medido (§9).

### 5.1 Frente 1 — backend de dado e dinheiro

| Bloco · branch | Fecha | Causa-raiz | Fronteira | Teste de encerramento (vermelho hoje → verde) | KPI | Junta | Dep. | Esf. |
|---|---|---|---|---|---|---|---|:-:|
| `B-O6R-04a` · `fix/inventory-consistency` | 1, 2 | leitura-decide-escreve sem lock nem CAS; fechamento de contagem sem unicidade | `src/modules/inventory/**` + suítes `-db` novas; **autorizado** `prisma/schema.prisma` + `prisma/migrations/**` só para o índice único parcial de `reverses_movement_id` (hoje só `@@index`, `schema.prisma:1508`) | 20 saídas concorrentes do mesmo item/custódia em Postgres real (2 conexões, barreira) → saldo nunca negativo; fechamento de contagem 2× → aplicado 1× | backend | unanimidade + crítico | B01 ✓ | G |
| `B-O6R-03a` · `fix/expense-sync-atomic` | 19 | efeito e recibo de replay não atômicos; a chave não separa usuários | `src/modules/expense-management/**` + `-db`. Caminho preferido: a chave do replay de despesa ganha o usuário **dentro** do módulo, sem migração. **Se o planejador medir que exige mudar a chave de `MobileActionReceipt`** (`schema.prisma:2847-2859`, compartilhada por todo sync mobile), o bloco para e o plano ganha arestas com `07c`, `SAN3-16` e `04b` antes de seguir | replay concorrente da mesma despesa → 1 lançamento; 2 usuários com a mesma chave local → 2 lançamentos | backend | unanimidade + crítico | B01 ✓; `04a` (trava de `prisma/`, §6) | G |
| `B-SAN3-02` · `fix/faturamento-atomico-e-delta` | 20, 21 | faturamento fora do `financial-uow`; um título ativo por OS e direção impede faturar o delta | `src/modules/work-order-financials/**`, `src/modules/financial-titles/**` (variante transacional de `createForWorkOrder`, `financial-title.service.ts:122`); **autorizado** `prisma/schema.prisma` + `prisma/migrations/**` só para o índice `financial_titles_wo_direction_active_key` (`prisma/migrations/20260811000000_add_invoicing/migration.sql:25-27`), trocado por um que **siga impedindo** dois títulos originais ativos e admita o complementar. **Conflito com `D-Ω4-C2`:** revisão pela junta antes do código (§10.5) | falha injetada entre título e carimbo → nenhum persiste; item apagado durante o faturamento → fora do título; item lançado após o 1º faturamento → faturado num título complementar, sem refaturar o carimbado; refaturar o carimbado → recusado | backend | unanimidade + crítico | `03a` (trava de `prisma/`, §6) | G |
| `B-SAN3-20` · `fix/cheque-x-baixa` | 22 | o mesmo dinheiro tem duas portas sem vínculo entre elas | `src/modules/cheques/**`, `src/modules/financial-titles/**`; **autorizado** `prisma/schema.prisma` + `prisma/migrations/**` só para o vínculo aditivo e anulável cheque → título. **Conflito com `D-Ω4-7-NO-TITLE`:** revisão pela junta antes do código (§10.5) | título baixado por cheque → compensar o mesmo cheque não gera segundo lançamento (e o inverso); saldo pela rota real bate | backend | unanimidade + crítico | `SAN3-02` (mesmo módulo) | M |
| `B-SAN3-03` · `fix/cloud-billing-exato` | 25, 26 | métrica de base gravada fora da transação do fato; chaves sem produtor; custo lido sem escopo de importação. **Decisão de desenho ratificada pela junta do bloco:** captura por fato na transação (padrão do `B-O6R-06`), sem outbox genérico — se não der, o bloco para e replaneja | `src/modules/cloud-usage/**`, `src/modules/cloud-cost-allocation/**`, `src/modules/cloud-charges/**`, e **só a gravação da métrica** em `src/infra/events/domain-event.publisher.ts`, `src/modules/notifications/notification.service.ts`, `src/modules/checklists/**` (upload de anexo) e `src/infra/jobs/job.worker.ts` | por produtor: executar o fato com falha injetada na métrica → fato e métrica commitam juntos ou nenhum; rateio com custo de API ≠ `unallocated`; dois imports na mesma janela → o rateio de um não soma o outro; o 2º `take: 100_000` sai | backend | unanimidade + crítico | `SAN3-05` (mesmos repositórios de `cloud-usage` e `cloud-charges`), `SAN3-22` (`src/modules/checklists/**`) | G |

### 5.2 Frente 2 — isolamento, segurança e permissão

| Bloco · branch | Fecha | Causa-raiz | Fronteira | Teste de encerramento | KPI | Junta | Dep. | Esf. |
|---|---|---|---|---|---|---|---|:-:|
| `B-SAN3-04a` · `fix/rbac-catalogo-banco-matriz` | 13, 14, 15, 38 | catálogo, banco e registro de navegação divergem do `RBAC_MATRIX.md` (arquivo-base, fonte §A1.2 — o catálogo é que se ajusta) | `src/modules/core-saas/permissions/catalog.ts`, `src/modules/navigation/navigation.registry.ts`, `frontend/src/layouts/appSidebarNav.ts`, `frontend/src/modules/auth/auth.adapter.ts`, `frontend/src/modules/auth/types.ts` (a união `UserRole`, para o rótulo de estoque — C2-06), `prisma/seed.ts` (**autorizado** só para semear o papel `auditor`) e `scripts/provision-rbac.ts` (só se a convergência não cobrir); **sem migração** — as permissões convergem do catálogo por `db:provision-rbac` (`deploy-production.yml:155`) | menu montado com as permissões **do banco**, numa base descartável depois de `db:provision-rbac` + `db:seed`: Financeiro vê Financeiro; auditor sem 403; `inventory` com menu próprio; as **quatro** divergências do item 15 convergem à matriz (`manager` com `update`/`acknowledge`; `finance` e `inventory` sem permissão de checklist; `field_technician` sem `tenant_checklists:read` — C2-04). **Vermelho-controle obrigatório no head-base** — o do `P-033` numa base preparada como a CI (`db:seed` só, `.github/workflows/ci.yml:169`) e o verde depois do `db:provision-rbac` (C2-07); item que sair verde lá só deixa o gate por ata da junta | backend, frontend | unanimidade + `coordenador-de-acessos` | — (primeiro da frente 2 e da trava do menu — C1-06) | M |
| `B-SAN3-05` · `fix/runtime-role-sem-bypass` | 9, 10 | nenhuma trava impõe o papel de runtime; leituras de plataforma dependem de superusuário | `src/database/**` e `src/config/env.ts` (trava de boot), `docker-compose.prod.yml`, `docs/deployment.md`, `scripts/` (procedimento do papel, novo) e `src/modules/cloud-usage/cloud-usage-prisma.repository.ts` (`listEvents`/`listDailyAggregates` sob contexto) e `src/modules/cloud-charges/cloud-charge-prisma.repository.ts` (`replaceTenantCharges`/`listTenantCharges`, l.24-25, 166-212 e 238-240 — C2-03). Outras leituras de plataforma: **lista fechada no plano do bloco** (hoje a lista medida tem estas quatro); achado fora dela vira pendência nomeada | no boot de produção, `SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user` com qualquer `true` → recusa (mutação: papel superusuário com outro nome também é recusado); sob papel efêmero `NOSUPERUSER NOBYPASSRLS` (`createEphemeralRole`), `/platform/cloud-usage/summary` soma 2 tenants (hoje 0), e `replaceTenantCharges`/`listTenantCharges` calculam e leem a cobrança de nuvem dos 2 tenants (C2-03). **Fora do bloco:** a suíte `-db` inteira sob esse papel (15 suítes exigem `CREATEROLE`/dono de tabela) → `B-ARNES-2` | backend, backend-postgres | unanimidade + `agente-dba-guardiao` + `agente-secops` | — | G |
| `B-O6R-07c` · `fix/o6r07c-subresource-scope` | 11, 51 | subrecursos da OS e o sync mobile não reutilizam o escopo por objeto do 07a | `src/modules/work-orders/work-order.routes.ts`, `src/modules/work-orders/work-order.service.ts`, `src/modules/work-order-comments/**`, `src/modules/mobile/mobile-work-order-sync.ts`, `src/modules/checklists/checklist.routes.ts` e o serviço de vistoria `src/modules/checklists/checklist.service.ts` (item 51), `src/modules/mobile/mobile-evidence-sync.ts` e `src/modules/mobile/mobile-checklist-sync.ts` (vias que o censo vai achar — C2-08); **censo vinculante da superfície de sync** antes de declarar fechado. **Regra de saída:** via achada fora da fronteira no censo vira pendência nomeada com dono, e o `Ω6R-SEC-002` só fecha quando **todas** as vias do censo tiverem dono | técnico não atribuído → 403 `not_assigned_to_actor` nas 10 vias (piso: 1, 2 e 10), com vermelho-controle; técnico não atribuído à OS → 403 ao responder, concluir e dar ciência na vistoria dela, com vermelho-controle no head-base (item 51); moderação de comentário dos papéis de escritório preservada (`D-Ω3F-5-COMMENT`) | backend | unanimidade + `coordenador-de-acessos` | 07a ✓ 07b ✓; `SAN3-13` (`src/modules/work-orders/work-order.service.ts`, §6) | G |
| `B-SAN3-04b` · `fix/painel-com-recorte-por-papel` | 12 | Financeiro e Estoque sem `dashboard:read`, e o painel sem recorte por papel (a matriz dá `scoped`) | `src/modules/dashboard/**` + o grant `dashboard:read` no catálogo (`src/modules/core-saas/permissions/catalog.ts`) | `/dashboard/summary` com as permissões **do banco**: Financeiro e Estoque recebem 200 **com o recorte da matriz** (`RBAC_MATRIX.md:34`, `scoped`), não o painel inteiro (C2-05); vermelho-controle no head-base | backend | unanimidade + `coordenador-de-acessos` | `SAN3-04a` (catálogo) | M |
| `B-SAN3-09` · `feat/bootstrap-platform-admin` | 43 | não há caminho versionado para o 1º admin | `scripts/bootstrap-platform-admin.ts` (novo) + teste | 2 execuções = 1 tenant de sistema + 1 admin; recusa sem a trava de produção | backend | unanimidade + `agente-secops` | — | P |
| `B-SAN3-22` · `fix/checklist-patch-com-versao` | 6 | PATCH de modelo sem guarda de versão | `src/modules/checklists/**`, `frontend/src/modules/checklists/**`, `API_CONTRACTS.md` (contrato REST muda: `expectedUpdatedAt`); **sem migração** (o modelo já tem `updated_at @updatedAt`) | PATCH com `expectedUpdatedAt` defasado → 409 (hoje 200 sobrescreve) | backend, frontend | unanimidade | `B-O6R-07c` (`src/modules/checklists/**`, §6) | M |
| `B-O6R-12` · `fix/jurisdiction-profile-versioning` | 24 | o motor de diárias lê o perfil vivo | `src/modules/jurisdiction/**`, `src/modules/charging/**` (leitura do regime), `src/modules/auction/auction.eligibility.ts`, `src/modules/impound/impound-prisma.repository.ts` (o processo nasce ali, l.69 e 114 — carimbo do regime na entrada); **autorizado** `prisma/schema.prisma` + `prisma/migrations/**` só para o snapshot aditivo do regime no processo | editar o perfil com processo vivo → diárias do processo inalteradas; auditoria campo a campo; o aceite provisório do `PLANO_O6R` é ratificado pela junta antes do código | backend | unanimidade + crítico | `SAN3-20` (trava de `prisma/`, §6) | M |
| `B-SAN3-18` · `fix/gate-de-modulo-no-backend` | 16 | o gate de módulo vive só no menu | `src/modules/navigation/navigation.registry.ts`, `src/modules/navigation/navigation.service.ts` (o `hasModule` sem módulo deixa de liberar), `src/modules/platform/platform-modules.service.ts` (chaves de Pátios, Telemetria e Frota), `src/app.ts` (a recusa entra no **ponto de montagem** das rotas, por um middleware novo em `src/modules/navigation/`, não nos 12 routers), `frontend/src/layouts/appSidebarNav.ts`; o provisionamento das chaves novas para as organizações existentes é script aditivo do bloco em `scripts/` (novo), com contagem antes e depois (C2-02). A lista dos 38 caminhos: os 27 da **diferença medida** entre `MVP_NAV_PATHS` (51) e o registro (36), gerada por script no plano do bloco, mais as 11 entradas do registro sem `requiredModules` | organização sem o módulo → rota responde 403 nomeado (hoje 200) e o item some; guard **fail-closed**: toda entrada do registro tem `requiredModules` **ou** está numa lista fechada de núcleo, e o guard falha para entrada sem módulo fora da lista; todo caminho do menu está no registro | backend, frontend | unanimidade + `coordenador-de-acessos` | `SAN3-04a`, `SAN3-06a` (mesmo arquivo de menu) | G |

### 5.3 Frente 3 — web e antivírus

| Bloco · branch | Fecha | Causa-raiz | Fronteira | Teste de encerramento | KPI | Junta | Dep. | Esf. |
|---|---|---|---|---|---|---|---|:-:|
| `B-SAN3-01` · `fix/web-wo-sem-fallback-fabricado` | 4 | `catch` que devolve mock no lugar do erro | `frontend/src/modules/work-orders/**`, `frontend/src/modules/registry/service-quotes/useServiceQuoteReferences.ts`, `frontend/src/modules/operations/dispatches/dispatches.service.ts`, `tests/e2e/critical-flows.spec.ts` (o caso "com fallback seguro", l.196-220, exige a OS inventada) | 200 com lista vazia → `items: []`; create 422 → erro na tela, sem navegar; detalhe 404 → estado de erro (asserções de comportamento, nenhuma por literal) | frontend | unanimidade + `cognicao-visual` | — | M |
| `B-SAN3-12` · `feat/web-financeiro-baixa-e-contas` | 28 | a web emite título e não liquida | `frontend/src/modules/finance/**` sobre `POST /financial-titles/:id/pay` e as rotas de conta, `frontend/src/App.tsx` (rota), `frontend/src/layouts/appSidebarNav.ts` (menu) | título baixado pela web → `paid` e lançamento em caixa; saldo pela rota real; estados §7; ação só com a permissão | frontend | unanimidade + `cognicao-visual` + `coordenador-de-acessos` | `SAN3-04a` (mesmo arquivo de menu; as permissões do Financeiro — C1-06) | M |
| `B-SAN3-24` · `feat/web-cheques-fechamento-comissao` | 29 | backend pronto sem tela | `frontend/src/modules/finance/cheques/**` (novo), `frontend/src/modules/finance/period-closes/**` (novo), `frontend/src/modules/finance/commissions/**` (política e base de cálculo), `frontend/src/App.tsx`, `frontend/src/layouts/appSidebarNav.ts` | cada tela opera sobre as rotas reais (registrar/compensar/devolver cheque; fechar/reabrir período; editar política de comissão) com estados §7 e a permissão de cada ação; teste por tela contra a API | frontend | unanimidade + `cognicao-visual` + `coordenador-de-acessos` | `SAN3-12` (mesmos arquivos) | G |
| `B-AV-REAL` · `feat/evidence-clamav-scanner` | 27 (com o ato do dono) | a factory não tem desfecho real | cliente INSTREAM próprio em `node:net` (sem dependência npm) em `src/modules/evidence/**`, `src/config/env.ts`, `fly.clamav.toml` (novo) e **só o service container `clamd`** em `.github/workflows/ci.yml` | com clamd real: limpo → 201; EICAR montado em tempo de execução → 422; clamd fora → 503; limite estourado → 422 terminal (PD §4) | backend | **serviço: junta unânime de 5 + PD** (`PD-O6R-B07B-CLAMD-INSTREAM`); código: unanimidade + `agente-secops` | junta-5; `SAN3-05` (`env.ts`) | M |
| `B-SAN3-11` · `fix/dossie-versao-da-vistoria` | 8 | o dossiê não distingue vistoria substituída | `frontend/src/modules/patios/processes/**` (+ DTO em `src/modules/impound/**` se preciso) | vistoria substituída aparece rotulada, nunca como vigente | frontend | unanimidade | — | P |
| `B-SAN3-06a` · `fix/menu-sem-tela-ficticia` | 39 | telas de protótipo roteadas e no menu, sem dado | `frontend/src/modules/{purchase-orders,reports}/**`, `frontend/src/modules/dispatch/pages/DispatchConsolePage.tsx`, `frontend/src/layouts/appSidebarNav.ts`, `frontend/src/navigation/tenantNavigation.ts`, `frontend/src/App.tsx` | nenhuma tela do menu exibe dado constante; ou a tela sai do menu e da rota (default do §10.1) | frontend | unanimidade + `coordenador-de-acessos` + `cognicao-visual` | `SAN3-24` (mesmo arquivo de menu) | M |
| `B-SAN3-07` · `fix/seed-demo-nome-de-negocio` | 47 | nome técnico no seed | `prisma/seed.ts` (**autorizado** só para o nome) | re-seed numa base descartável e `SELECT name FROM tenants` → nenhum contém "Tenant" (medido no banco, não no fonte) | backend | maioria | `SAN3-04a` (mesmo arquivo) | P |
| `B-SAN3-08` · `fix/orcamento-destino-e-papel-financeiro` | 40, 41 | a aprovação não pergunta o destino; o Financeiro não tem as permissões de leitura do orçamento | `frontend/src/modules/registry/service-quotes/**`, `frontend/src/modules/work-orders/components/tabs/QuoteTab.tsx`; os grants chegam pelo `SAN3-04a` | orçamento com destino obrigatório → diálogo → OS criada; Financeiro cria orçamento na base com as permissões do banco | frontend | unanimidade + `cognicao-visual` | `SAN3-01`, `SAN3-04a` | M |
| `B-SAN3-25` · `feat/web-faturar-os` | 50 | a rota de faturamento existe e nenhuma tela a chama | `frontend/src/modules/work-orders/components/tabs/FinancialTab.tsx`, o serviço de OS em `frontend/src/modules/work-orders/**` (chamada a `POST /work-orders/:id/invoice`), `frontend/src/modules/finance/pages/InvoicesPage.tsx` | OS com itens → faturar → título criado e itens carimbados; refaturar → recusado; o delta do item 21 (título complementar) faturável pela mesma ação depois do `SAN3-02` | frontend | unanimidade (dinheiro) + `cognicao-visual` | `SAN3-01` (mesmo módulo), `SAN3-02` (o delta), `SAN3-24` (`frontend/src/modules/finance/**`, §6) | M |
| `B-SAN3-06b` · `fix/console-plataforma-sem-ficcao` | 17, 45, 46 | o console da plataforma foi montado sobre literais | `frontend/src/modules/platform/**`, `frontend/src/navigation/platformNavigation.ts` | cada tela ligada ao backend que existe, ou fora do menu com o motivo; nenhum controle de segurança exibido sem a configuração real; teste sem API → nunca literal | frontend | unanimidade + `coordenador-de-acessos` + `cognicao-visual` | — | G |
| `B-SAN3-21` · `fix/web-acentuacao` | 49 | literais antigos sem acento | literais de texto em `frontend/src/**/*.ts` **e** `*.tsx` (só strings) | guard: lista de termos sem acento (Situacao, Nao, Configuracoes, Operacao…) em `.ts` e `.tsx` = 0 — cobre os 13 textos de `.ts` que o crítico mediu | frontend | maioria | todos os blocos de `frontend/` (é o último a tocar texto) | P |

### 5.4 Frente 4 — app de campo (em série: os blocos tocam os mesmos arquivos)

| Bloco · branch | Fecha | Causa-raiz | Fronteira | Teste de encerramento | KPI | Junta | Dep. | Esf. |
|---|---|---|---|---|---|---|---|:-:|
| `B-O6R-11` · `fix/mobile-work-order-contracts` | 3 | envelope `{data}` parseado como corpo; enfileiramento sem `await` | `mobile/flutter_app/lib/features/work_orders/data/work_order_remote_api.dart`, `mobile/flutter_app/lib/features/prestador/data/prestador_repository.dart`, `mobile/flutter_app/lib/core/sync/sync_queue_repository.dart`, `mobile/flutter_app/lib/core/local_db/drift_sync_action_store.dart` + testes | Dio fake com `{data:{…}}` → detalhe/status/assign corretos; assign envia o campo que o backend lê; N SKUs enfileirados + restart → N ações | flutter | unanimidade | B01 ✓ | M |
| `B-SAN3-13` · `fix/mobile-minhas-os` | 32, 33 | a lista filtra só por organização; o app não pede o filtro que o backend oferece; o upsert remoto nunca apaga | `mobile/flutter_app/lib/shared/ui/home_screen.dart`, `mobile/flutter_app/lib/features/work_orders/data/{work_order_repository,work_order_remote_api}.dart`; backend `src/modules/work-orders/work-order.service.ts` (listagem — impõe o escopo do técnico se o dono mantiver o default do §10.7, C2-10) | "Minhas OS" chama o `GET` com o `assignedUserId` da sessão e pagina; mostra só as atribuídas; OS semente gravada no aparelho some no próximo sync; como técnico, o GET de OS devolve só as atribuídas, imposto no backend (se o dono mantiver o default do §10.7) | flutter, backend (§10.7) | unanimidade + `coordenador-de-acessos` | `B-O6R-11` | M |
| `B-SAN3-14` · `fix/mobile-guincho-entrega` | 34 | a navegação nunca passa `kind=delivery` | `mobile/flutter_app/lib/features/work_orders/ui/work_order_execute_screen.dart`, `mobile/flutter_app/lib/features/work_orders/domain/work_order_steps.dart`, `mobile/flutter_app/lib/app/router.dart` | OS de guincho percorre coleta **e** entrega no app, com o checklist de entrega | flutter | maioria + `cognicao-visual` | `SAN3-13` | M |
| `B-SAN3-15` · `fix/mobile-prestador-porta-e-estoque` | 35, 36, 37 | telas construídas sem navegação; estoque do técnico sem endpoint | `mobile/flutter_app/lib/features/prestador/**`, `mobile/flutter_app/lib/app/router.dart`, a tela de detalhe da OS em `mobile/flutter_app/lib/features/work_orders/ui/`; backend: rota de estoque por custódia em `src/modules/inventory/**` | do detalhe da OS se chega ao Prestador e à Conclusão; o material vem do estoque real da custódia (SKU fora dela não aparece) | flutter, backend | unanimidade | `B-O6R-04a`, `SAN3-14` | G |
| `B-SAN3-16` · `fix/mobile-fila-os-drenada` | 5 | o replay só conhece 3 tipos; o backend não aceita os outros 2 | `mobile/flutter_app/lib/core/sync/sync_replay_service.dart`, `mobile/flutter_app/lib/features/work_orders/data/work_order_repository.dart`; backend `src/modules/mobile/mobile-work-order-sync.ts` | "pedir aprovação" e "não consigo iniciar" offline → após o sync, a aprovação existe no backend e a fila está vazia; tipo desconhecido → erro visível | flutter, backend | unanimidade | `SAN3-15`, `B-O6R-07c` (mesmo arquivo do backend) | M |
| `B-SAN3-17` · `fix/mobile-consentimento-gps` | 18, 52 | a tela de consentimento não tem porta | `mobile/flutter_app/lib/core/location/**`, `mobile/flutter_app/lib/shared/ui/home_screen.dart`, `mobile/flutter_app/lib/app/router.dart`; backend `src/modules/field-location/field-location.service.ts` (recusa sem consentimento, como a telemetria já faz — item 52) | o técnico dá e revoga o consentimento pelo app; sem consentimento nada é capturado (o ramo é lido e testado); no backend, envio de posição de operador sem consentimento → recusado e nada gravado, com consentimento → gravado (item 52) | flutter, backend | unanimidade (dado pessoal) | `SAN3-16` | M |
| `B-SAN3-26` · `fix/mobile-checkin-confere-placa` | 53 | o app confere os dígitos digitados contra o fim do código da OS, não contra a placa, e o backend não confere | `mobile/flutter_app/lib/features/work_orders/ui/work_order_detail_screen.dart` e a conferência no backend (a placa ou o número de série vêm da OS/veículo do lado do servidor; o planejador do bloco nomeia o arquivo do backend no plano dele, dentro de `src/modules/work-orders/**` ou `src/modules/mobile/**`) | dígitos da placa certos → check-in aceito; dígitos do código da OS → recusado; o backend recusa check-in sem conferência | flutter, backend | unanimidade (segurança) | `SAN3-13` (mesmos arquivos de OS no app) | M |
| `B-O6R-04b` · `fix/mobile-inventory-sync` | 31 | o contrato de estoque do app não persiste | `mobile/flutter_app/lib/features/inventory/**`, `mobile/flutter_app/lib/core/sync/{auto_sync_coordinator,sync_providers}.dart`; backend `src/modules/mobile/mobile-inventory-sync.ts` | movimento de estoque no app → persistido no Prisma e sobrevive a restart | flutter, backend | unanimidade | `B-O6R-04a`, `SAN3-17` | M |
| `B-O6R-03b` · `fix/mobile-rdv-sync` | 30 | o sync de RDV sai sem token | `mobile/flutter_app/lib/features/expenses/**`, `mobile/flutter_app/lib/core/sync/sync_providers.dart`, `mobile/flutter_app/lib/core/auth/auth_notifier.dart`, `mobile/flutter_app/lib/core/network/http_client.dart`; backend `src/modules/expense-management/expense-management.routes.ts` | RDV criado offline sincroniza com sessão válida; replay → 1 | flutter, backend | unanimidade | `B-O6R-03a`, `B-O6R-04b` | M |
| `B-SAN3-19` · `fix/mobile-faxina-termos` | 48 | termos técnicos, nome de template e aviso falso fixo | `mobile/flutter_app/android/app/src/main/AndroidManifest.xml`, `mobile/flutter_app/lib/shared/ui/{home_screen,module_placeholder_screen,sync_screen}.dart` | o app se chama pelo nome do produto; nenhum papel técnico cru; o aviso de integração só aparece quando ela está de fato desligada | flutter | maioria + `cognicao-visual` | `B-O6R-03b` | P |
| `B-SAN3-23` · `fix/wo-cancel-race` | 23 | cancelamento e criação de item financeiro sem lock de linha comum | `src/modules/work-orders/work-order.service.ts` (caminho do cancelamento), `src/modules/work-order-financials/**` (criação sob o lock da OS) | cancelamento e criação de item concorrentes em Postgres real (2 conexões, barreira) → nunca item financeiro em OS cancelada | backend | unanimidade + crítico | `B-O6R-07c`, `SAN3-02` (mesmos arquivos) | M |
| `B-O6R-09` · `fix/dispatch-atomic-timeline` | 7 | despacho e evento em transações separadas, sem chave idempotente | `src/modules/field-dispatch/**`; **autorizado** `prisma/schema.prisma` + `prisma/migrations/**` só para a chave idempotente de criação | falha injetada entre despacho e evento → nenhum persiste; mesma chave 2× → 1 despacho | backend | unanimidade + crítico | **revista:** o `PLANO_O6R` pôs o `B-O6R-08` antes; a atomicidade na mesma transação não precisa de lease de job — hipótese que o planejador confirma; se cair, o `B-O6R-08` entra no gate; trava de `prisma/` depois do `B-O6R-12` (§6) | M |

### 5.5 O bloco que fecha o gate

| Bloco · branch | Fecha | Fronteira | Teste de encerramento | Junta | Dep. | Esf. |
|---|---|---|---|---|---|:-:|
| `B-SAN3-10` · `test/e2e-no-ci-e-roteiro` | 42, 44, 54 | `tests/e2e/**`, `playwright.config.ts`, **job e2e** em `.github/workflows/ci.yml` (autorizado só para ele), `docs/ROTEIRO-DEMO-E-OPERACAO.md` (novo), `docs/go-live-readiness.md`, `tests/kpi-painel-frescor.test.ts` (novo — o único arquivo de `tests/` do teste (g)) | (a) job e2e na CI, com vermelho-controle (um fluxo quebrado de propósito deixa o job vermelho) — obrigatório por regra de processo: a `main` não tem proteção de branch (`gh api` → 404); torná-lo check exigido no GitHub é pergunta ao dono (§10.6); (b) fluxos web por persona ponta a ponta (OS criar → despachar → faturar → **baixar**; orçamento → OS; checklist com evidência; pátio; cheque e fechamento); (c) **o app:** fluxos Flutter provados por testes de integração contra contrato e **uma execução no emulador `erp_pixel`** com evidência no roteiro — Playwright não roda Flutter, e o mecanismo fica escrito; (d) roteiro de **demonstração** executado por quem não o escreveu; (e) roteiro de **operação** (deploy, restore cronometrado, bootstrap do 1º admin, rotação de segredo, drenagem de fila de aparelho antigo) escrito e ensaiado fora do ambiente real — a execução no ambiente real é ato do dono; (f) `mvp_demo`/`mvp_vendavel` recalculados com método escrito; (g) guard de frescor do painel (`roadmap` e `recent` com o último merge do history), com mutação que o deixa vermelho (item 54) | unanimidade + `master-teste-telas-rotas` | **todos os blocos do §5.1–5.4** | G |

**Encerramento de todo bloco (não se pula por urgência):** plano do `planejador-mestre` (Fable) → dev → bateria
exata (§9 do contrato) → KPI no próprio PR com execução real → `inspetor-de-terreno-da-junta` → junta → CI
verde → squash + `--delete-branch` → limpeza §C5 → `porteiro-pos-merge` → backfill no PR seguinte.

**Paralelismo × porteiro (§C2.8, leitura literal).** Blocos já em voo continuam; **nenhum bloco novo começa**, em
nenhuma frente, antes do parecer do porteiro do último merge. O porteiro está no caminho crítico (§9). Um porteiro
por frente mudaria o contrato — é pergunta ao dono (§10.6).

**Colisão em `Kpis/*`.** O segundo a mergear absorve a `main` e **reexecuta** as suítes que o PR exerce antes de
publicar a contagem (§C3.3).

**KPI da rodada.** Este PR não publica número novo de teste (sem entrada no history — precedente #382): paga o
backfill do #385, corrige o roadmap e a seção "Últimas demandas" do painel e anota os `mvp_*`. A rodada SAN3 entra
no painel com o primeiro bloco que entregar (§C3.1). O `mvp_vendavel` (88%) e o `mvp_demo` (99%) são estimativas
**anteriores** a este inventário: ficam intocados (§C3.4), com nota explícita, e são **recalculados no `B-SAN3-10`**.

## 6. Dependências e a agenda do melhor caso

A tabela abaixo é a agenda **com as travas de mesmo arquivo** (dois blocos não tocam o mesmo arquivo ao mesmo
tempo) e as dependências de dado. Horas desde o início das frentes; G = 13 h, M = 5 h, P = 1,5 h. **Calculada por
script** (ciclo 2): cada frente executa os blocos na ordem abaixo; um bloco começa quando a frente está livre, as
dependências da coluna Dep. do §5 terminaram e o antecessor de cada trava listada abaixo terminou — 0 violações, e
nenhum par de blocos de frentes diferentes com arquivo comum (fronteiras do §5 expandidas na árvore) tem janelas
sobrepostas.

| Frente | Sequência (início–fim, em h) |
|---|---|
| 1 — dado e dinheiro | `04a` 0–13 · `03a` 13–26 · `SAN3-02` 26–39 · `SAN3-20` 39–44 · `SAN3-03` 44–57 |
| 2 — isolamento e permissão | `SAN3-04a` 0–5 · `SAN3-05` 5–18 · `07c` 18–31 · `SAN3-04b` 31–36 · `SAN3-09` 36–37,5 · `SAN3-22` 37,5–42,5 · `SAN3-18` 42,5–55,5 · `B-O6R-12` 55,5–60,5 |
| 3 — web e antivírus | `SAN3-01` 0–5 · `SAN3-12` 5–10 · `SAN3-24` 10–23 · `AV-REAL` 23–28 · `SAN3-11` 28–29,5 · `SAN3-06a` 29,5–34,5 · `SAN3-07` 34,5–36 · `SAN3-08` 36–41 · `SAN3-25` 41–46 · `SAN3-06b` 46–59 · `SAN3-21` 59–60,5 |
| 4 — app de campo | `11` 0–5 · `SAN3-13` 5–10 · `SAN3-14` 10–15 · `SAN3-15` 15–28 · (espera o `07c`) · `SAN3-16` 31–36 · `SAN3-17` 36–41 · `SAN3-26` 41–46 · `04b` 46–51 · `03b` 51–56 · `SAN3-19` 56–57,5 · `SAN3-23` 57,5–62,5 · `B-O6R-09` 62,5–67,5 |
| fecho | `SAN3-10` 67,5–80,5 |

**Travas de mesmo arquivo respeitadas pela agenda:** `prisma/schema.prisma` e `prisma/migrations/**` (`04a` → `03a`
→ `SAN3-02` → `SAN3-20` → `B-O6R-12` → `B-O6R-09`; junta do ciclo 1, C1-01) · `src/config/env.ts` (`SAN3-05` →
`AV-REAL`) · `frontend/src/layouts/appSidebarNav.ts` e `frontend/src/App.tsx` (`SAN3-04a` → `SAN3-12` → `SAN3-24` →
`SAN3-06a` → `SAN3-18`) · `frontend/src/modules/finance/**` (`SAN3-12` → `SAN3-24` → `SAN3-25`) · `prisma/seed.ts`
(`SAN3-04a` → `SAN3-07`) · `src/modules/core-saas/permissions/catalog.ts` (`SAN3-04a` → `SAN3-04b`) ·
`src/modules/checklists/**` (`07c` → `SAN3-22` → `SAN3-03`) · `src/modules/cloud-usage/cloud-usage-prisma.repository.ts`
e `src/modules/cloud-charges/cloud-charge-prisma.repository.ts` (`SAN3-05` → `SAN3-03`) ·
`src/modules/work-orders/work-order.service.ts` (`SAN3-13` → `07c` → `SAN3-23`) ·
`src/modules/mobile/mobile-work-order-sync.ts` (`07c` → `SAN3-16`) · `src/modules/work-order-financials/**` e
`src/modules/financial-titles/**` (`SAN3-02` → `SAN3-20`, `SAN3-02` → `SAN3-23`) · `src/modules/inventory/**`
(`04a` → `SAN3-15`) · `src/modules/expense-management/**` (`03a` → `03b`) · QuoteTab (`SAN3-01` → `SAN3-08`) · a
aba Financeiro e o serviço de OS da web (`SAN3-01` → `SAN3-25`) · `tests/e2e/**` (`SAN3-01` → `SAN3-10`) · textos de
`frontend/` (todos → `SAN3-21`).

**Pré-requisito de ato do dono:** a junta-5 do serviço antes do `AV-REAL`. **Fora do gate:** `B-O6R-08` (e o
`B-O6R-09` volta a depender dele se a hipótese do §5.4 cair). As suítes `-db` novas de qualquer frente fazem as
asserções de RLS pelo padrão de drill do `B-O6R-06` (papel efêmero `NOSUPERUSER NOBYPASSRLS`) — por isso nenhuma
depende da ordem em relação ao `B-SAN3-05`.

## 7. Registro e governança

### 7.1 A causa dos flips — e o que este PR faz com ela

O registro é só-apensar (§A2) e o índice lê **a primeira linha `status:` de cada entrada**. Quando o conserto chega
por outro bloco, ou quando o fechamento é escrito noutra seção, a linha original não muda e a pendência fica
"aberta" para sempre. Formas medidas na fatia B1: (a) bloco posterior fecha sem citar a entrada; (b) guia de
preparação consumido pelo próprio bloco que guiava; (c) fechamento escrito noutra seção, em ID duplicado ou em
`decisoes.md`. **Este PR reescreve a linha canônica** de cada flip (valor antigo preservado na própria linha) e
regenera o índice. A **prevenção** é o `B-GOV-GUARD-DERIVADOS`, pós-gate.

### 7.2 Defeitos da ferramenta de registro e da documentação (nenhum bloqueia o gate)

- `severidade()` lê menção, não o campo → `P-SAN3-INDICE-SEVERIDADE-POR-MENCAO`. Exemplos: campo "informativa" →
  índice ALTA por "caixa alta"; entrada com 2 P0 → índice BAIXA.
- `classificar()` lê **só a primeira** linha de status, e a regra 2 do script ("parcialidade nunca fecha") não
  está implementada para ela. **Medido em bancada neste PR:** duas linhas opostas → decide a primeira, sem
  `CONTRADITORIA`; `status: FECHADA — parcialmente superado` → FECHADA; e `status: RESOLVIDO PARCIAL — quatro
  residuais abertos`, a forma que o cabeçalho do script diz ter consertado, **sai FECHADA** →
  `P-SAN3-INDICE-SO-PRIMEIRA-LINHA-DE-STATUS`.
- a coluna "dono" diz `sim` para "a atribuir" (`P-SAN2-2-INDICE-DONO-SEMPRE-SIM`); status em negrito é invisível
  (`P-STATUS-NEGRITO-INVISIVEL-AO-GERADOR`).
- o ID de pendência com ponto é cortado no índice (`P-GOV-INSPETOR-RECEITAS-1.1-E-3.3` sai
  `P-GOV-INSPETOR-RECEITAS-1`): a regex do cabeçalho não aceita `.` — mesma dona, `B-REG-GERADOR`.
- contagens defasadas: `P-O6R-BACKLOG` (29/30 → 32 achados), `P-KPI-HISTORY-MD-BACKLOG`, `P-SAN-KPI-BACKFILL`
  (materializado: 35 `merge_commit` nulos em 134 entradas), `PROJECT_MEMORY.md` dizendo que o `B-O6R-02` está no
  ciclo 5.
- afirmações falsas vivas: `docs/go-live-readiness.md:76`; `.claude/skills/backend-review-ts-prisma/references/repo-erp.md:23`, da skill
  `backend-review-ts-prisma`; o dossiê do `B-GOV-ELENCO` cita `P-GOV-MODELO-CODEX-SEM-NOME`, que não existe no
  registro — e a ausente com esse nome caiu na reconfirmação (§1).
- `P-O6R-B07` tem duas linhas de status (a primeira PARCIAL, que o índice lê; a segunda FECHADA com a marca de
  superada); a redação circular vem de um APPEND anterior a este PR e fica — o registro não reescreve texto antigo.
- dono órfão: `P-O6R-B01-RELIGACAO-SEM-REMEDIO` nomeia o `B-O6R-07`, que mergeou em 07a/07b sem tocar o item → o
  planejador do `B-O6R-07c` diz se cabe nele; se não, ganha bloco próprio pós-gate.

### 7.3 Fila pós-gate (prioridades 5–9)

`B-O6R-08` (e `B-O6R-09`, se a hipótese cair), `B-O6R-10` (PERF-002), `B-ARNES-2` (inclui a suíte `-db` inteira
sob papel sem `BYPASSRLS`), `B-REG-GERADOR`, `B-GOV-GUARD-DERIVADOS` (inclui a causa dos painéis congelados),
`B-GOV-CI-AUDITOR`, `B-REG-TYPECHECK-TESTS`, `B-KPI-F-HISTORY-MD`, as 14 ausentes de governança e as ABERTAS de
acabamento e processo, na ordem de prioridade do dono, cada uma com o dono e o teste que a fatia registrou.

## 8. O que este plano corrige no `PLANO_O6R` (a revisão adversarial, item a item)

1. **O `PLANO_O6R` só cobria os 32 achados da auditoria.** Ignorava as 231 pendências do registro e as 49 que nem
   registro tinham. **44 dos 54 bloqueantes** vêm de fora da auditoria (contados por script: 10 itens do §4.1 trazem achado Ω6R na
   coluna Item — 1, 2, 3, 7, 11, 19, 24, 27, 30 e 31).
2. **O bloco 07 virou três e o plano não sabia.** 07a (#369) e 07b (#380) mergearam; o residual do SEC-002 não tinha
   bloco (`B-O6R-07c`) e o do SEC-004 estava **fora do plano** (`B-AV-REAL`). O painel marcava `B-O6R-07 = a_fazer`
   — corrigido neste PR para `parcial`.
3. **Blocos G quebrados em fatias verticais** (`04a/04b`, `03a/03b`, `06a/06b`).
4. **O aceite do `B-O6R-12` era provisório e nunca foi ratificado.** A junta do bloco o ratifica antes do código.
5. **Duplicatas marcadas, sem fusão silenciosa:** `P-020` ≡ `Ω6R-DAT-002`; `P-ARNES-CANONICA1-VERMELHO-AMBIENTAL` ≡
   `P-O6R-B02-CRASH-NO-LOAD-SEM-SKIP`; `P-REG-BATERIA-NAO-TYPECHECA-TESTS` ≡ `P-TESTS-FORA-DO-TYPECHECK`;
   `P-RBAC-CATALOG-MATRIZ` e `P-RBAC-CHECKLIST-DRIFT` (mesma matéria — a segunda entra no gate pelo item 15);
   `P-023` ≡ `P-USERS-LAST-ACCESS`; `P-AUD-ACTOR-NAME` ≡ item 1 de `P-AUDIT-FOLLOWUPS`; o resíduo LEGACY-NULL de
   `P-Ω3F6` ≡ `P-GOLIVE-VALIDATE-CONSTRAINT`; `P-FINANCE-HEADER-ACTIONS` ⊂ `P-Ω4-8-DASHBOARD-FIDELITY`;
   `P-Ω3F2B-ACENTOS` ⊂ `P-028`; `P-RBAC-GATING-MOCKSHELLS` cobre `P-PURCHASE-ORDERS-BACKEND-GATE` **mais** o Console
   de Despacho. O sync de RDV sem `Authorization` das sínteses de produto **é** o `Ω6R-QUA-001`. O denominador 231
   conta cada duplicata como entrada distinta — o placar do §1 é do registro como ele está.
6. **Pendências que faltavam:** as 49 ausentes (§4.4) e o segundo `take: 100_000` silencioso
   (`cloud-charge-prisma.repository.ts:223`) — emenda em `P-O6R-B06-RATEIO-CURSOR-100K`.
7. **Conflitos mantidos e registrados (§A2), não resolvidos em silêncio:**
   - **Duas pendências de dinheiro contra decisões registradas** (crítico r2, CR2-01): `P-Ω4-3-REFATURAR-DELTA` ×
     `D-Ω4-C2` (um título ativo por OS e direção) e `P-Ω4-7-DUPLA-CONTAGEM` × `D-Ω4-7-NO-TITLE` (cheque sem vínculo a
     título). Registrados em `decisoes.md` (`REGISTRO-SAN3-CONFLITOS`); a junta de cada bloco revê a decisão com o
     desenho medido; a política de produto por trás é pergunta ao dono (§10.5), com default **sim**. Até a revisão,
     as decisões seguem valendo.
   - **As reclassificações `✓` do §4.1** (itens 3, 6, 7, 9, 10, 14, 15, 20–23, 25, 26, 29–31, 36, 38, 41, 46, 48, 49,
     51, 52, 53, 54): as fatias as davam como não bloqueantes, condicionais ou "demo honesta, não venda"; os itens 51–54
     foram levados ao gate pela junta do ciclo 1 (C2-09, C2-12, C2-01, C3-03). A regra do §2 as leva ao gate. A regra também
     **corrigiu critérios**: `P-026` (item 38) e "Minhas OS" (item 32) saíram do critério 3 — o backend nega ou
     oferece o filtro corretamente, o defeito é de fluxo; o bootstrap (item 43) saiu do 3 para o 12; a linguagem da UI
     e as telas inventadas (45–49) passaram ao critério 13, as palavras do dono, porque nenhum dos 12 as alcança ao pé
     da letra. No ciclo 2 (C2-11), o item 17 passou ao critério 13 (a tela declara controle inexistente) e o item 18
     aos critérios 7 e 3 — o 7 pela porta, o 3 agora pelo backend (item 52).
   - **Três resíduos do `P-Ω3F6` ficaram fora com condição medida** (§4.3): a regra proíbe excluir por janela, e
     nenhum deles foi excluído por janela — `MOBILE-DEADLETTER` e `LEGACY-NULL` não alcançam um cliente novo;
     `CANCEL-IDEM` não perde nem duplica nada. O `CANCEL-RACE`, excluído antes "por janela sub-ms", entrou (item 23).
   - **Fatia C1 × fatia C2 sobre de onde vêm as permissões em runtime.** A C1 escreveu "vêm do catálogo" e por isso
     descartou o `P-033`; a C2 escreveu "vêm do banco". Medido (crítico r1): **a C2 está certa** —
     `persistent-rbac-context.middleware.ts:90-107` → `role.repository.ts:118`. O `P-033` volta ao gate como
     condicional, medido no `B-SAN3-04a` em modo banco.
   - **`P-O6R-B11`:** o inventário Ω6R o dava como risco declarado; a fatia B2 e este plano, como bloqueante
     (critério 5, pelo `QUA-005`).
   - **Itens provados por composição de leitura, não por execução** (`P-Ω4-FINANCE-READ-ORFA`, o efeito na captura
     do `P-MOBILE-LGPD-GPS-SEM-PORTA`, a recusa de módulo do `P-WEB-GATE-MODULO-INCOMPLETO`): o primeiro passo do
     bloco é o teste que reproduz, com vermelho-controle; se sair verde no head-base, o item só deixa o gate por ata
     da junta.
   - **`D-INFRA-PROVIDER`** (Fly.io, junta 5/5) × **`D-TRACCAR-HTTP-PRIVADO-AWS`** (dono): registrado em `decisoes.md`.

## 9. Viabilidade — o prazo de 48 horas

**Quantidade exata.** 54 bloqueantes em **37 blocos** — 11 G (`04a`, `03a`, `SAN3-02`, `SAN3-03`, `SAN3-05`, `07c`,
`SAN3-18`, `SAN3-24`, `SAN3-06b`, `SAN3-15`, `SAN3-10`), 21 M, 5 P (contados por script na coluna Esf. do §5) — mais
os 6 atos do dono e este PR.

**Velocidade medida** (primeiro commit → merge, os 8 PRs da rodada Ω6R, `gh pr view`): #360 1,27 h · #353 1,43 h ·
#359 4,94 h · #380 12,83 h · #357 44,06 h · #369 57,04 h · #385 102,73 h · #371 376,70 h. **Mediana dos 8: 28,4 h.**
Dos 5 blocos grandes (#380, #357, #369, #385, #371) a **mediana é 57,0 h** e o mais rápido, 12,8 h. A métrica
**subestima**: exclui o plano e o inspetor antes do primeiro commit e o porteiro e o backfill depois do merge.

**Melhor caso** (a agenda do §6: 4 frentes, cada G em 13 h — o mais rápido medido, 12,8 h, arredondado; o mesmo G da
agenda —, M em 5 h, P em 1,5 h, nenhuma reprovação): as frentes fecham em 57 / 60,5 / 60,5 / 67,5 h; o `B-SAN3-10`
vai de 67,5 a 80,5 h; este PR, aberto desde 2026-09-11 14:54Z (1º commit), soma **29 h medidas** até 2026-09-12
19:54Z e ainda não mergeou (o que falta — junta do ciclo 2, merge, porteiro — não está somado); o porteiro no caminho
crítico (≈ 12 inícios na frente mais longa, 21–29 min medidos por parecer, mais a espera pelos porteiros das outras
frentes) e a reexecução de suítes nas colisões de `Kpis/*` somam ≈ 10–20 h → 80,5 + 29 + 10–20 = **≈ 120–130 h de
relógio**, contadas desde a abertura deste PR.

**Não cabe em 48 h, nem no melhor caso.** E ele supõe 4 frentes rodando juntas, o que já falhou nesta sessão: o
limite de sessão derrubou 8 agentes em paralelo às 05:10; e cada bloco passa por 3 gates fixados em Fable
(planejador, inspetor, porteiro), 37 vezes, contra a mesma cota.

**Estimativa realista** (G = 57 h, a mediana medida dos grandes; M ≈ 10 h, **assumido** — a amostra de M é pequena
demais para medir; P ≈ 2 h). **Com 4 frentes simultâneas** — a mesma premissa do melhor caso, que já falhou nesta
sessão —, a agenda do §6 com essas durações fecha as frentes em 238 / 213 / 240 / 223 h (a frente 1 tem **4 G em
série**; a frente 3 espera o `SAN3-02` para o `SAN3-25`) e o `B-SAN3-10` em 297 h; somando este PR (29 h) e os
porteiros (≈ 10–20 h), ≈ 336–346 h, **≈ 14 dias**. **Com 2 frentes simultâneas** (a soma do trabalho sem o fecho,
790 h, dividida por 2, mais o `B-SAN3-10`): 452 h; com este PR e os porteiros, ≈ 491–501 h, **≈ 20,5 a 21 dias**.
Nos dois casos, **sem** o tempo dos 6 atos do dono, que não estimamos.

**Bloqueios fora do código:** a junta unânime de 5 do `B-AV-REAL`; os 6 atos do §4.2; as decisões do §10 (as duas
revisões de decisão do §10.5 destravam os blocos `SAN3-02` e `SAN3-20`); a cota do Fable.

**Ordem de execução:** (1) este PR → junta → merge → porteiro; (2) as quatro frentes na agenda do §6, a junta-5 do
`B-AV-REAL` assim que o plano for aprovado; (3) `B-SAN3-10`; (4) os atos do dono, com o roteiro de operação;
(5) declaração do gate com ata; (6) só então o Traccar (§11).

## 10. O que só o dono decide

Só entra aqui o que o código, a junta ou o contrato **não podem** resolver. Para cada uma: o **default** aplicado se o
dono não responder — nunca uma redução de escopo.

0. **Declarar "versão vendável" com algum dos 6 atos do §4.2 ainda pendente?** Default: **não**.
1. **Escopo da versão vendável.** Default: tudo o que está construído — ou que o próprio produto diz entregar — está
   à venda. Saem do gate só se o dono tirar o módulo: Pátios/diárias (item 24), dossiê como prova (8), repasse de
   custo de nuvem (25, 26), venda por plano/módulo (16), RDV e estoque no app (30, 31), cheques/fechamento/comissão
   pela web (29). Entram só se o dono pedir, porque não há funcionalidade construída exposta: checklist por tipo de
   serviço (`P-CHK-APLICABILIDADE-SEM-ROTA`) e push de despacho. E: **Pedidos e Relatórios reais, ou fora do menu
   até existirem?** Default do `B-SAN3-06a`: fora do menu (tela sem dado não é funcionalidade).
2. **Onde a versão vendável roda:** Fly.io (`D-INFRA-PROVIDER`) × AWS. Default: nada muda sem decisão escrita — e sem
   essa decisão o ato "Provedor" do §4.2 não se completa, logo o gate não fecha.
3. **Traccar:** o ERP inteiro vai para a AWS, ou só o Traccar? Trava o Dia 1 do Traccar, não o saneamento.
4. **Convivência app × Traccar** ("quero ver o custo dos dois"): estudo no Dia 1 do Traccar.
5. **Produto — duas perguntas que destravam blocos do gate:** (a) **faturar o item lançado depois do 1º faturamento**
   da OS (título complementar, mantendo o anti-refaturamento do que já foi faturado)? Default: **sim** — a junta do
   `B-SAN3-02` revê `D-Ω4-C2`. (b) **vincular o cheque ao título** que ele paga, para travar a dupla contagem?
   Default: **sim** — a junta do `B-SAN3-20` revê `D-Ω4-7-NO-TITLE`. Fora do gate: vistoria com divergência é
   faturada?; des-compensar cheque; estorno de título em disputa.
6. **Governança:** um porteiro por frente, em vez de um por merge segurando todas? Default: a leitura literal do
   §C2.8. Tornar os checks da CI (inclusive o e2e) obrigatórios por proteção de branch da `main`? Hoje não há
   proteção (`gh api` → 404). E o dossiê de 2026-09-09: onde as sessões nascem (`P-GOV-CAMINHO-REPO-SESSAO`,
   reincidente hoje); destino do assento permanente; PR de governança sem porteiro;
   `docs/claude-code-handoff/CLAUDE.md`; política de versionamento de `.claude/agents/especialistas/`.
7. **Leitura de OS pelo técnico** (C2-10): o técnico lê todas as OS da organização ou só as atribuídas? Hoje o
   backend não impõe escopo de leitura por papel (`src/modules/work-orders/work-order.service.ts:402-418`). Default:
   **só as atribuídas, imposto no backend** (`B-SAN3-13`, item 32).

**NÃO é decisão do dono:** (a) `B-O6R-07c` × `D-Ω3F-5-COMMENT` — o guard do 07a (`assertMutationObjectScope`,
`work-order.service.ts:808-840`) escopa o técnico e preserva a moderação dos papéis de escritório; **hipótese** que o
planejador confirma no código. (b) `B-AV-REAL`: serviço novo → junta unânime de 5 + PD.

## 11. Depois do gate: Traccar

Decisão registrada em `agent-orchestration/controle/decisoes.md` (`D-TRACCAR-HTTP-PRIVADO-AWS`): o Traccar alimenta
os módulos que já existem, por HTTP privado dentro da AWS, sem exposição externa. **Nenhuma linha de integração
nasce antes do gate.**

## 12. Resposta à rodada 1 do crítico (17 achados)

| Achado | Grav. | Resposta |
|---|---|---|
| CR1-01 objeto julgado ≠ objeto mergeado | bloqueia | A correção dos flips, as 49 ausentes e o índice regenerado entraram antes da rodada 2 e da junta. |
| CR1-02 caminhos inexistentes | bloqueia | Todo caminho do §5 conferido contra a árvore de `15ef3fbe`; "novo" onde o arquivo nasce no bloco. A cobertura foi refeita na v4 (CR2-04). |
| CR1-03 mediana | ajuste | 28,4 h (8 PRs) e 57,0 h (5 grandes); a subestimação da métrica declarada (§9). |
| CR1-04 contagens | ajuste | A1 = 3/3/26; flips = 52 (22,5%); "38 dos 49" conferido; todo bloco fecha item do §4.1. |
| CR1-05 G1/G2 era redução de escopo | bloqueia | O degrau saiu. Os 6 atos do dono estão **dentro** do gate (§2, §4.2); declarar antes deles é a decisão 0. O resíduo que a r2 achou no §10.1 foi retirado (CR2-12). |
| CR1-06 "produção conecta como superusuário" | ajuste | Reescrito para o que foi medido (item 9), no plano **e** nas emendas do registro (CR2-06). |
| CR1-07 teste do `SAN3-05` inexequível | bloqueia | Trava por `pg_roles` no boot (com mutação de nome); leituras de plataforma numa lista fechada que já nomeia as duas medidas (item 10); a suíte inteira sob papel sem bypass foi para o `B-ARNES-2`. |
| CR1-08 frentes não disjuntas | bloqueia | Fronteiras refeitas com os arquivos que o defeito exige e agenda com travas de mesmo arquivo (§6). |
| CR1-09 E2E | bloqueia | Job e2e com vermelho-controle; o spec que exige a OS inventada entra no `SAN3-01`; o mecanismo do app escrito; esforço G. |
| CR1-10 reclassificação desigual | ajuste | Regra única (§2) com condição medida como única saída (§4.3); critérios corrigidos nos dois sentidos (§8.7). |
| CR1-11 testes verdes com o defeito | ajuste | `SAN3-04` com vermelho-controle e permissões do banco; `SAN3-07` medido no banco; `SAN3-01` só por comportamento; `SAN3-03` por produtor no caminho do fato; `SAN3-21` com `.ts` (CR2-08). |
| CR1-12 `prisma/**` | ajuste | Autorizado pelo nome onde o teste exige — agora também no `SAN3-02` e no `SAN3-20`, com o conflito de decisão registrado (CR2-01); removido do `SAN3-04`. |
| CR1-13 quórum | ajuste | Unanimidade em todo bloco de dinheiro/segurança/permissão/perda de dado; e na junta deste PR (CR2-07). |
| CR1-14 o que a estimativa escondia | ajuste | Porteiro e reexecução de KPI no caminho crítico; cota do Fable nomeada; frentes recalculadas com as esperas. |
| CR1-15 conflito C1 × C2 | ajuste | Registrado (§8.7); `P-033` volta ao gate como condicional. |
| CR1-16 duplicatas | ajuste | Declaradas (§8.5), inclusive o Console de Despacho. |
| CR1-17 "5 de 8" sem fonte | nota | A frase saiu; o §9 usa só tempos medidos. |

## 13. Resposta à rodada 2 do crítico (12 achados)

| Achado | Grav. | Resposta |
|---|---|---|
| CR2-01 dois blocos de dinheiro não fecham dentro da fronteira | bloqueia | `SAN3-02` ganhou `src/modules/financial-titles/**` e a troca nominal do índice `financial_titles_wo_direction_active_key` (G); `SAN3-20` ganhou o vínculo aditivo cheque → título. Os dois conflitos (`D-Ω4-C1` (corrigido no ciclo 2: é a `D-Ω4-C2` — C3-01), `D-Ω4-7-NO-TITLE`) estão registrados em `decisoes.md` (`REGISTRO-SAN3-CONFLITOS`), a revisão é da junta de cada bloco antes do código, e a política de produto é a pergunta 10.5, com default sim. |
| CR2-02 pré-requisito do item 9 omitido | bloqueia | Item 10 no gate; a leitura está na fronteira do `SAN3-05`, com trava de mesmo arquivo `SAN3-05` → `SAN3-03`. |
| CR2-03 regra desigual | ajuste | Entraram `CANCEL-RACE` (23, `SAN3-23`), `LISTCOSTLINEITEMS` (26), `CHECKLIST-DRIFT` (15) e cheques/fechamento/comissão (29); o roadmap e as "Últimas demandas" do painel foram corrigidos neste PR; os resíduos restantes do `P-Ω3F6` saíram só com condição medida; critérios corrigidos nos itens 32, 38, 43 e 45–49 (critério 13). |
| CR2-04 fronteiras que não cobrem o item | ajuste | `B-O6R-12` + `impound-prisma.repository.ts`; `SAN3-12` + `App.tsx` e `appSidebarNav.ts`; `SAN3-18` com a recusa no ponto de montagem (`src/app.ts`, middleware novo) e a lista dos 27 caminhos gerada por diferença medida. |
| CR2-05 arestas de mesmo arquivo | ajuste | Agenda do §6 com as travas: `src/config/env.ts`, menu e `frontend/src/App.tsx`, `src/modules/checklists/**`, e o `03a` estreitado a `src/modules/expense-management/**` (a mudança de chave compartilhada vira parada com arestas, não escopo). |
| CR2-06 números e premissas da v1 no que será mergeado | ajuste | Painel com 49; as duas emendas do registro corrigidas (L487 sem a premissa derrubada; ambas citando o §4.1); status e log com FECHADAS 72 → 105. |
| CR2-07 quórum deste PR | ajuste | Unanimidade de 3 (cabeçalho e briefing). |
| CR2-08 guard do `SAN3-21` cego a `.ts` | ajuste | O guard cobre `.ts` e `.tsx`, com os 13 textos medidos. |
| CR2-09 texto circular do `P-O6R-B07` | nota | O índice lê a primeira linha (PARCIAL); o texto antigo fica (§7.2). |
| CR2-10 índice condicional do `REVERSE-IDEM` | nota | Ressalva escrita na entrada; conferir no go-live. |
| CR2-11 prazo sem os atos do dono | nota | O §0 e o §9 dizem que os atos não estão estimados; o ato "Provedor" depende da decisão 10.2. |
| CR2-12 default que reduzia escopo | ajuste | Cheques, fechamento e comissão pela web entraram no gate (item 29, `SAN3-24`); ficaram como "se o dono pedir" só as duas funcionalidades não construídas nem expostas. |

## 14. Resposta à junta do ciclo 1 (26 achados, 7 `bloqueia`)

Votos em `agent-orchestration/omega/juntas/votos/SAN3-plano/` (C1 `estrategista`, C2 `coordenador-de-acessos`, C3
`validador-mestre`). Correção planejada pelo orquestrador e aplicada por agente distinto (§C7.4-bis).

| Achado | Grav. · escopo | Resposta |
|---|---|---|
| C1-01 trava de `prisma/` não declarada | ajuste · dentro | Trava de `prisma/schema.prisma` + `prisma/migrations/**` declarada no §6 (`04a` → `03a` → `SAN3-02` → `SAN3-20` → `B-O6R-12` → `B-O6R-09`) e na coluna Dep. do §5; agenda recalculada por script: 0 violações, nenhum par com arquivo comum e janelas sobrepostas. |
| C1-02 o passo "faturar" do `B-SAN3-10` não existe na web | bloqueia · dentro | Item 50 (`P-WEB-FATURAR-OS-SEM-TELA`, crit. 7 e 4) e bloco novo `B-SAN3-25` (`feat/web-faturar-os`, frente 3, M; dep. `SAN3-01`, `SAN3-02`). |
| C1-03 "este PR, ≈ 3 h" | nota · dentro | Trocado pelo medido: aberto desde 2026-09-11 14:54Z, 29 h até a v5, somado ao melhor caso e ao realista (§9). |
| C1-04 dois valores de G | nota · dentro | G = 13 h no texto do §9 e na agenda (o mais rápido medido, 12,8 h, arredondado). |
| C1-05 o realista pressupõe 4 frentes | nota · dentro | Declarado no §9, com o número para 2 frentes (soma do trabalho / 2 + fecho): ≈ 20,5 a 21 dias. |
| C1-06 `SAN3-12`/`SAN3-24` antes das permissões do Financeiro | nota · dentro | `SAN3-04` dividido; o `SAN3-04a` (catálogo) é o primeiro da frente 2 e da trava do menu (`SAN3-04a` → `SAN3-12` → `SAN3-24` → `SAN3-06a` → `SAN3-18`). |
| C2-01 check-in que confere o código da OS fora do gate | bloqueia · dentro | Item 53 (`P-MOBILE-CHECKIN-CONFERE-CODIGO-DA-OS`, crit. 13 e 3, ✓) e bloco novo `B-SAN3-26` (`fix/mobile-checkin-confere-placa`, frente 4, M, unanimidade). |
| C2-02 11 itens de menu sem módulo; guard fail-open | bloqueia · dentro | Item 16 com 38 itens; `SAN3-18` com guard fail-closed (lista fechada de núcleo), `src/modules/navigation/navigation.service.ts` e `src/modules/platform/platform-modules.service.ts` na fronteira e script aditivo de provisionamento com contagem antes e depois. |
| C2-03 lista de leituras de plataforma incompleta | ajuste · dentro | `SAN3-05` com `replaceTenantCharges`/`listTenantCharges` (`src/modules/cloud-charges/cloud-charge-prisma.repository.ts`) na fronteira e no teste; trava `SAN3-05` → `SAN3-03` no mesmo arquivo. |
| C2-04 teste do item 15 cobre 1 de 4 divergências | ajuste · dentro | O teste do `SAN3-04a` cobre as quatro. |
| C2-05 painel sem recorte por papel | ajuste · dentro | `B-SAN3-04b` (`fix/painel-com-recorte-por-papel`): `src/modules/dashboard/**` + o grant; 200 **com o recorte** `scoped` da matriz (`RBAC_MATRIX.md:34`). |
| C2-06 união `UserRole` fora da fronteira | ajuste · dentro | `frontend/src/modules/auth/types.ts` na fronteira do `SAN3-04a`. |
| C2-07 vermelho-controle impossível na receita do teste | ajuste · dentro | Vermelho do `P-033` numa base preparada como a CI (`db:seed` só, `.github/workflows/ci.yml:169`); verde depois do `db:provision-rbac`. |
| C2-08 vias do censo fora da fronteira do `07c` | ajuste · dentro | `07c` + `src/modules/mobile/mobile-evidence-sync.ts` e `src/modules/mobile/mobile-checklist-sync.ts`; regra de saída: via fora da fronteira → pendência nomeada com dono; o `Ω6R-SEC-002` só fecha com todas as vias com dono. |
| C2-09 vistoria sem escopo por objeto | bloqueia · pre-existente | Item 51 (✓) no `B-O6R-07c` ampliado (`src/modules/checklists/checklist.routes.ts` + `src/modules/checklists/checklist.service.ts`), com teste de 403 e vermelho-controle. |
| C2-10 o backend oferece o filtro, não impõe | nota · pre-existente | Item 32 registra que o backend não impõe escopo de leitura; pergunta 10.7 ao dono, com default estrito; `SAN3-13` + `src/modules/work-orders/work-order.service.ts` (listagem) sob o default. |
| C2-11 critério dos itens 17 e 18 | nota · dentro | Item 17 → crit. 13; item 18 → crit. 7 e 3 (o 3 pelo backend, item 52); registrado no §8.7. |
| C2-12 posição gravada sem consentimento no backend | ajuste · pre-existente | Item 52 (✓); `SAN3-17` ampliado ao backend (`src/modules/field-location/field-location.service.ts`), com teste do backend. |
| C3-01 decisão errada no `REGISTRO-SAN3-CONFLITOS` | bloqueia · dentro | Item 1 do REGISTRO → `P-Ω4-3-REFATURAR-DELTA` × `D-Ω4-C2`, com a nota da correção; o plano troca a referência do índice (item 21, `SAN3-02`, §8.7, §10.5) e a linha CR2-01 ganha a nota. |
| C3-02 números do índice no `agent-orchestration/docs/status-geral.md` | bloqueia · dentro | Gerador rodado depois de todas as mudanças: 366 cabeçalhos (355 IDs), 103 FECHADAS, 263 ABERTAS — os mesmos números no `agent-orchestration/docs/status-geral.md`, no `agent-orchestration/codex/log-execucao.md` e no §0. |
| C3-03 duas pendências do painel FECHADAS pela metade | bloqueia · dentro | As duas voltam a ABERTA (PARCIAL), com o valor anterior preservado; item 54 no §4.1; o `B-SAN3-10` ganha o teste (g). |
| C3-04 a prova do item 28 não se reproduz | nota · dentro | Prova reescrita no item 28 e emenda de 1 linha em `P-WEB-FIN-BAIXA-E-CONTA-SEM-TELA`: nenhuma chamada a `/financial-titles/:id/pay` em `frontend/src`. |
| C3-05 o placar das AUSENTES não soma 140 | nota · dentro | §1: 58 linhas AUSENTE (= 50 IDs); 37 + 8 + 58 + 24 + 13 = 140. |
| C3-06 o painel com o `B-O6R-06` segurando a trilha | nota · pre-existente | `roadmap.as_of` 2026-09-11; `B-O6R-06` com o #385 (`15ef3fbe`) e `B-O6R-02` com o #371; `B-O6R-06` fora de `trilha_bloqueada.bloqueada_por`, com nota (a mãe `P-O6R-B06` está FECHADA). |
| C3-07 8 parciais × 9 emendas | nota · dentro | §4.4: as 8 parciais entraram como 9 emendas (a mesma parcial vale para duas entradas da plataforma). |
| C3-08 diretório de worktree órfão `san2-r` | nota · pre-existente | Não mexido — resíduo alheio, reportado na ata. |

**Consequências mecânicas aplicadas pelo aplicador (aceitas pelo planejador):** antecessores de trava do §6 escritos na coluna Dep. do §5; ordem das travas que ganharam membros novos inferida da agenda proposta (`src/modules/checklists/**`: `07c` → `SAN3-22` → `SAN3-03`; `src/modules/work-orders/work-order.service.ts`: `SAN3-13` → `07c` → `SAN3-23`; `frontend/src/modules/finance/**`: `SAN3-12` → `SAN3-24` → `SAN3-25`; `src/modules/core-saas/permissions/catalog.ts`: `SAN3-04a` → `SAN3-04b`; a aba Financeiro e o serviço de OS da web: `SAN3-01` → `SAN3-25`); o serviço de vistoria do `B-O6R-07c` nomeado como `src/modules/checklists/checklist.service.ts`; "38 caminhos" e `scripts/` (novo) no `B-SAN3-18`; "backend" na coluna KPI do `B-SAN3-13` e do `B-SAN3-17`; os testes de encerramento dos itens 51 e 52 copiados das próprias pendências; os itens 17 e 18 mantidos no lugar da tabela do §4.1, só com o critério trocado.
