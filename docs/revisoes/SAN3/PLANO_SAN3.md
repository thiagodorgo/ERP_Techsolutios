# PLANO SAN3 — saneamento até a versão vendável

> **O que é.** A revisão adversarial do `docs/revisoes/O6R/PLANO_O6R.md` somada ao inventário completo das
> pendências, medida no código em `origin/main@15ef3fbe` (a `main` com o `B-O6R-06`, #385). O `PLANO_O6R.md`
> **não é apagado** (§A2): este plano o **supera para o que resta** e diz, item a item, o que herda, o que
> corrige e o que acrescenta (§8).
>
> **Autoria:** orquestrador (consolida o inventário; não achou os defeitos — os achadores foram 8
> inventariantes somente-leitura). **Revisão adversarial:** `critico-adversarial`, 2 rodadas; a rodada 1
> (17 achados, 6 `bloqueia`) está respondida item a item no §12. **Junta do PR do plano:** maioria de 3
> (registro e plano; não toca dinheiro, permissão nem dado diretamente). A junta de cada BLOCO segue o quórum
> do risco dele (§C7.1-ter(b)).

---

## 0. O resumo que o dono precisa ler

1. **Inventário completo.** As 238 linhas abertas do índice (231 IDs distintos), os 32 achados Ω6R (17 não
   fechados) e **140 candidatos a pendência que não estavam no registro** foram medidos **pelo código**, nunca
   pelo texto da entrada. As tabelas de 13 campos estão em `docs/revisoes/SAN3/inventario/`, uma por fatia.
2. **O registro errava o status de 52 das 231 entradas (22,5%)** — 31 fechadas no código que o texto dava como
   abertas e 21 parciais que o texto não declarava — **e faltavam 50 pendências reais** (35 de produto, 15 de
   governança). A causa dos flips é mecânica (§7.1). Este PR corrige as linhas de status e registra as ausentes.
3. **O gate da versão vendável tem 44 bloqueantes, fechados por 32 blocos, e 6 atos que só o dono pratica**
   (§4). **Nenhum dos 32 blocos começou.** O que o inventário acrescentou à auditoria pesa: pela web um título
   **nunca é baixado**; no app, "Minhas OS" lista a organização inteira, a perna de entrega do guincho e o fluxo
   Prestador **não têm porta**, o estoque do técnico é **inventado no código** e duas ações da fila local
   **nunca são enviadas**; no faturamento, item lançado depois do primeiro faturamento **nunca é cobrado**.
4. **Não cabe em 48 horas.** O melhor caso — 4 frentes em paralelo, cada bloco no tempo do mais rápido já
   medido, sem reprovação — é **~80–85 h de relógio**. O realista, pela mediana medida dos blocos grandes
   (57 h), é **10 a 12 dias** (§9). **Não há redução de escopo:** a execução segue pela ordem de risco; o gate
   só é declarado quando os 44 bloqueantes fecharem **e** os 6 atos do dono estiverem feitos.
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
  texto. E `P-O6R-B07` (A1) é flip no sentido inverso — o texto dizia FECHADA, o código é parcial.
- **Placar das AUSENTES:** 140 candidatos → **37** já registrados · **8** parcialmente (a pendência existe, falta
  um componente nomeado) · **50 ausentes confirmadas por presença**, com 13 campos (35 produto, 15 governança;
  **10 bloqueiam** pelo critério da fatia) · 24 superadas · 13 não são pendência.
- **A coluna de severidade do `pendencias-indice.md` NÃO é usada para ordenar este plano.** `severidade()`
  (`gerar-indice-pendencias.py:75-80`) devolve a severidade **mais alta mencionada em qualquer ponto do corpo**,
  inclusive em prosa (`P-METODO-FERRAMENTA-SINTATICA-COMO-PROVA`: campo "informativa" → índice ALTA, por "caixa
  alta"; `P-O6R-B04`: carrega 2 P0 → índice BAIXA). A ordenação usa a severidade **medida contra o código**.

## 2. O gate da versão vendável — os critérios do dono, literais

A versão só é declarada vendável quando: (1) não existir pendência bloqueante do plano; (2) isolamento
multi-tenant validado; (3) RBAC validado no backend; (4) fluxos financeiros preservam dinheiro exato;
(5) nenhum risco conhecido de perda de dados; (6) backend, frontend e Flutter verdes; (7) fluxos principais
funcionando ponta a ponta; (8) KPIs refletindo execução real; (9) CI verde; (10) juntas registradas;
(11) porteiros pós-merge concluídos; (12) roteiro de demonstração e operação.

**Default de escopo aplicado enquanto o dono não decidir (§10.1):** *tudo o que está construído está à
venda.* É o gate mais estrito. Nenhum módulo sai do gate sem declaração escrita do dono.

**Regra de classificação, aplicada por igual a todo item medido:** um item entra no gate quando viola, **no
código medido**, um dos 12 critérios lidos ao pé da letra — sem exceção por severidade herdada, por "janela
pequena" ou por "mitigado no cliente". Onde a fatia deu outra leitura, a divergência fica registrada (§8.7).

**Os atos do dono estão DENTRO do gate.** Seis itens dependem de ato fora do repositório (conta, secrets,
serviço contratado, restore no ambiente real — §4.2). O plano os **prepara** — cada um sai dos blocos pronto para
executar, com o roteiro de operação dizendo como — mas **não os dispensa**: o gate não é declarado enquanto
faltarem. Declarar antes é decisão do dono (§10.0), nunca do plano.

## 3. Ordem — a lista de prioridades do dono é a chave

1 perda/corrupção de dados · 2 isolamento multi-tenant · 3 segurança e permissões · 4 faturamento e dinheiro ·
5 confiabilidade · 6 contratos e testes · 7 fluxos necessários para venda · 8 acabamento web/mobile ·
9 documentação e rastreabilidade. Dentro da mesma prioridade: **causa-raiz antes de sintoma**; **frente livre
antes de frente com dependência**.

## 4. O gate, item a item

### 4.1 Bloqueantes — 44 itens

Coluna **reclass.**: a fatia dava o item como não bloqueante (ou condicional); a regra do §2 o leva ao gate. Todo
`✓` está no §8.7 e é alvo do crítico e da junta.

| # | Item (pendência / achado) | Crit. | Prova curta (fatia) | Bloco | reclass. |
|--:|---|:-:|---|---|:-:|
| | **Prioridade 1 — perda ou corrupção de dados** | | | | |
| 1 | `Ω6R-DAT-002` (P0) — saldo de estoque checado por agregado e inserido sem lock; `P-020` é o mesmo sítio | 5 | `inventory-prisma.repository.ts:199-236` (O6R, B1) | `B-O6R-04a` | |
| 2 | `Ω6R-DAT-003` (P0) — ajuste de contagem aplicado duas vezes ou parcial | 5 | `cycle-count.service.ts:137-218` (O6R) | `B-O6R-04a` | |
| 3 | `Ω6R-QUA-005` (em `P-O6R-B11`) — material do prestador some no restart; o `QUA-004` (envelope da OS lido errado, crit. 7) vai no mesmo bloco | 5 | `prestador_repository.dart:117-136` `forEach` sem `await` (O6R, B2; conferido pelo orquestrador) | `B-O6R-11` | ✓ |
| 4 | `P-008` — lista vazia vira 6 OS inventadas com aviso falso; create recusado pelo backend vira OS falsa (`OS-FALLBACK`) e o que o operador digitou se perde | 5, 7 | `frontend/src/modules/work-orders/work-orders.service.ts:28,46-50,60-72` (C1; conferido) | `B-SAN3-01` | |
| 5 | `P-MOBILE-FILA-OS-NAO-DRENADA` — "pedir aprovação" e "não consigo iniciar" entram na fila e nunca saem; o backend nem aceita os dois tipos | 5 | `work_order_repository.dart:474,637`; `sync_replay_service.dart:625+` (AUSENTES; tipos conferidos) | `B-SAN3-16` | |
| 6 | `P-CHK-PATCH-SEM-LOCK` — PATCH de modelo de checklist é last-write-wins, sem guarda de versão no backend | 5 | `checklist.service.ts:119` sem comparação; mitigação só no editor web (A1) | `B-SAN3-22` | ✓ |
| 7 | `Ω6R-ARQ-004` — despacho e evento obrigatório persistidos em transações separadas, sem chave idempotente | 5 | `field-dispatch.service.ts:138-161`, `field-dispatch-prisma.repository.ts:150-174` (O6R: risco "perda/corrupção") | `B-O6R-09` | ✓ |
| 8 | `P-CHK-DOSSIE-VERSAO-NA-UI` — a vistoria substituída aparece como válida no dossiê | 5 | B1 — **condicional: dossiê vendido como prova** (default: sim) | `B-SAN3-11` | |
| | **Prioridade 2 — isolamento multi-tenant** | | | | |
| 9 | `P-INFRA-RLS` — nada no repositório impõe `NOSUPERUSER NOBYPASSRLS` ao papel de runtime; o compose de subida/smoke (`docker-compose.prod.yml:35,57`) conecta como `postgres`; o papel real da produção é secret do Fly e **não foi medido**. Sem isso a RLS não está validada como segunda barreira | 2 | B1; `docs/deployment.md:200-233`; `fly.production.toml:9` | `B-SAN3-05` | ✓ |
| | **Prioridade 3 — segurança e permissões** | | | | |
| 10 | `Ω6R-SEC-002` residual (`P-O6R-SUBRECURSO-OBJECT-SCOPE`) — técnico não atribuído apaga anexo e grava km em OS alheia (10 vias: 9 nos routers de OS e comentários, 1 no sync mobile) | 3 | O6R §2.2; A1 | `B-O6R-07c` | |
| 11 | `P-MOBILE-MINHAS-OS-SEM-FILTRO` — "Minhas OS" lista a organização inteira, sem filtro de atribuição | 3, 7 | `home_screen.dart:122`; `workOrdersForUser` sem chamador (AUSENTES; conferido) | `B-SAN3-13` | |
| 12 | `P-027` — Financeiro e Estoque sem `dashboard:read`; a home pós-login abre em 403 | 3, 7 | catálogo × `RBAC_MATRIX.md:34` (C1) | `B-SAN3-04` | |
| 13 | `P-Ω4-FINANCE-READ-ORFA` — em modo real, Financeiro/Cobranças/Pagamentos saem do menu dos papéis Financeiro e Gestor | 3, 7 | `navigation.registry.ts:344-393` (C2 — **por composição de leitura**; o bloco mede antes de consertar) | `B-SAN3-04` | |
| 14 | `P-033` — o papel `auditor` não é semeado; com as permissões vindo do banco, o 403 ao vivo que a fatia C1 descartou volta a ser plausível | 3, 7 | `prisma/seed.ts:252`; permissões do banco (`persistent-rbac-context.middleware.ts:90-107`) — **condicional à medição em modo banco no bloco** | `B-SAN3-04` | ✓ |
| 15 | `P-WEB-GATE-MODULO-INCOMPLETO` — 27 itens do menu fora do gate de módulo; nenhuma recusa por módulo achada no backend | 3 | AUSENTES (backend medido por padrões, não exaustivo) — **condicional: venda por plano/módulo** (default: sim) | `B-SAN3-18` | |
| 16 | `P-WEB-PLATAFORMA-SEGURANCA-FABRICADA` — "MFA obrigatório para admins" ligado por literal | 3 | `PlatformSettingsPage.tsx:43-44` `<Toggle on />` (conferido) | `B-SAN3-06b` | |
| 17 | `P-MOBILE-LGPD-GPS-SEM-PORTA` — o consentimento de GPS nunca pode ser dado | 3, 7 | `router.dart:232,410`; `geolocator_device_location_provider.dart:56-59` (AUSENTES; efeito na captura **a medir no bloco**) | `B-SAN3-17` | |
| 18 | `P-SAN-PROD-BOOTSTRAP` — não há caminho versionado para o 1º admin real | 3 | C1 | `B-SAN3-09` | |
| | **Prioridade 4 — faturamento e dinheiro** | | | | |
| 19 | `Ω6R-DIN-009` (P0) — replay de despesa paga duas vezes; dois usuários colidem na chave | 4 | `expense-management.service.ts:155-193` (O6R) | `B-O6R-03a` | |
| 20 | `P-Ω4-3-INVOICE-ATOMIC` + `P-Ω4-3-INVOICE-TOCTOU-DELETE` — título e carimbo dos itens sem transação única; item apagado entre leitura e carimbo entra no título | 4 | `src/modules/work-order-financials/work-order-financial.service.ts:362-407` (C2) | `B-SAN3-02` | ✓ |
| 21 | `P-Ω4-3-REFATURAR-DELTA` — item lançado depois do 1º faturamento **nunca é faturado** (409 `already_invoiced`) — determinístico | 4 | `work-order-financial.service.ts` (crítico, r1) | `B-SAN3-02` | ✓ |
| 22 | `P-Ω4-7-DUPLA-CONTAGEM` — nada impede baixar o título e compensar o cheque do mesmo dinheiro | 4 | B1 | `B-SAN3-20` | ✓ |
| 23 | `Ω6R-DAT-004` — perfil normativo vivo re-tempera diárias de custódia em curso | 4 | `jurisdiction.service.ts:76-98`, `charge.accrual.ts:159-164` (O6R) — **condicional: Pátios à venda** (default: sim) | `B-O6R-12` | |
| 24 | `P-O6R-B06-USAGE-BEST-EFFORT-RESIDUAL` + `P-O6R-B06-BASE-SEM-PRODUTOR` — base do rateio de nuvem perdida em silêncio e custo de API sempre `unallocated` | 4 | A2 — **condicional: repasse de custo de nuvem na oferta** (default: sim) | `B-SAN3-03` | ✓ |
| | **Prioridade 7 — fluxos necessários para venda** | | | | |
| 25 | `Ω6R-SEC-004` residual (`P-O6R-B07B-SCANNER-AV-REAL`) — produção e staging respondem 503 a TODO upload | 7 | `evidence-scanner.factory.ts:34`; `fly.*.toml` `NODE_ENV=production` (A2) — **fecha só com o serviço respondendo no ambiente (ato do dono, §4.2)** | `B-AV-REAL` | |
| 26 | `P-WEB-FIN-BAIXA-E-CONTA-SEM-TELA` — a web emite título e não liquida: sem tela de baixa nem de conta, com o backend pronto | 7, 4 | `grep "/pay"` e `financial-account` em `frontend/src` = 0 (AUSENTES; conferido) | `B-SAN3-12` | |
| 27 | `Ω6R-QUA-001` — RDV no app nunca sincroniza | 7 | `mobile/flutter_app/lib/core/sync/sync_providers.dart:51,109-119` (O6R) | `B-O6R-03b` | ✓ |
| 28 | `Ω6R-QUA-002` — estoque no app não sincroniza | 7 | `mobile/flutter_app/lib/features/inventory/data/inventory_repository.dart:92-105`; `src/modules/mobile/mobile-inventory-sync.ts:98-105` (O6R) | `B-O6R-04b` | ✓ |
| 29 | `P-MOBILE-GUINCHO-ENTREGA-INALCANCAVEL` — o app cobre só a coleta | 7 | `work_order_execute_screen.dart:94`; `work_order_steps.dart` (AUSENTES) | `B-SAN3-14` | |
| 30 | `P-MOBILE-PRESTADOR-SEM-PORTA` — o fluxo Prestador não tem porta de entrada | 7 | `router.dart:159,339` (AUSENTES) | `B-SAN3-15` | |
| 31 | `P-MOBILE-CONCLUSAO-SEM-PORTA` — a tela de Conclusão é inalcançável | 7 | `router.dart:165,345` (AUSENTES — condicional na fatia) | `B-SAN3-15` | ✓ |
| 32 | `P-MOBILE-ESTOQUE-TECNICO-FABRICADO` — material faturável escolhido de 8 SKUs escritos no código | 7, 4 | `prestador_repository.dart:38-87` (conferido) | `B-SAN3-15` | |
| 33 | `P-MOBILE-OS-SEEDS` (purga) — as OS semente gravadas no aparelho nunca são apagadas | 7 | `work_order_repository.dart:750,766,779` (A1, AUSENTES 2c) | `B-SAN3-13` | |
| 34 | `P-026` — usuário só `inventory` recebe o menu inteiro do gestor, cheio de itens que o backend nega | 7 | `auth.adapter.ts:220-238`, `appSidebarNav.ts:271-291` (C1 — o backend nega corretamente, o defeito é de fluxo, não de RBAC) | `B-SAN3-04` | ✓ |
| 35 | `P-PURCHASE-ORDERS-BACKEND-GATE` + `P-RBAC-GATING-MOCKSHELLS` — Pedidos e Relatórios no menu com linhas inventadas, sem endpoint; Console de Despacho com organização fixa | 7 | `PedidosPage.tsx:19`, `ReportsPage.tsx:5`, `DispatchConsolePage.tsx:9` (C2) | `B-SAN3-06a` | |
| 36 | `P-Ω3F4C-ACTIVATION-PROMPT` — orçamento com "Exige endereço de destino" nunca é aprovado pela UI | 7 | C1; `QuoteTab.tsx:106` aprova com corpo vazio | `B-SAN3-08` | |
| 37 | `P-Ω3a` — o Financeiro não consegue criar orçamento pela UI | 7 | C1; a matriz diz que o Financeiro "constrói o orçamento" | `B-SAN3-08` | ✓ |
| 38 | `P-SAN-E2E` — os testes e2e Playwright não rodam no gate obrigatório da CI | 7 | `git grep playwright -- .github` = 0 (B1) | `B-SAN3-10` | |
| | **Critério 12 — demonstração, operação e linguagem da UI** | | | | |
| 39 | `P-019` — Auditoria Global da plataforma 100% inventada | 12 | `PlatformAuditPage.tsx:17-38` (C1) | `B-SAN3-06b` | |
| 40 | `P-WEB-CLOUD-BILLING-CARTAZ` + `P-WEB-PLATAFORMA-TELAS-FICCAO` — Cloud Billing é cartaz de literais; Planos e Módulos, APIs e a lista de Organizações exibem dado inventado | 12 | `PlatformCloudBillingPage.tsx` sem um `fetch`; `PlatformTenantsPage.tsx:18-19` (AUSENTES — "demo honesta") | `B-SAN3-06b` | ✓ |
| 41 | `P-CHK-SEED-DEMO-SUJO` — a organização da demonstração chama-se "Tenant Demo" | 12 | `prisma/seed.ts:214,219` (C2) | `B-SAN3-07` | |
| 42 | `P-MOBILE-FAXINA-TERMOS-TECNICOS` + o aviso falso "Integração remota ainda não ativa" renderizado sem condição em toda tela de sync | 12 | `home_screen.dart:153-154`; `sync_screen.dart:92,269` (AUSENTES; aviso conferido) | `B-SAN3-19` | ✓ |
| 43 | `P-028` + `P-Ω3F2B-ACENTOS` — texto sem acento no formulário central de Nova OS e nas telas de acesso negado (§11.3) | 12 | C1 | `B-SAN3-21` | ✓ |
| 44 | roteiro de demonstração e **operação** — não existe | 12 | critério 12; `docs/go-live-readiness.md:58-67` (restore cronometrado só no ambiente real) | `B-SAN3-10` | |

**`Ω6R-DIN-005` e `Ω6R-DIN-007`** (P0, dinheiro) fecharam na `main` com o #385; o backfill deles é pago neste PR.

### 4.2 Os 6 atos do dono — dentro do gate

| Ato | O que os blocos entregam pronto | O que só o dono faz |
|---|---|---|
| Go-live (`P-GOLIVE-GATES`) | checklist de 12 passos de `docs/go-live-readiness.md` atualizado (a linha 76, que diz "nenhum código bloqueia o go-live", corrigida) e ensaiado fora do ambiente real (`B-SAN3-10`) | R1/R2 no ambiente real (restore cronometrado, RPO/RTO no runbook), staging verde, smoke autenticado; a junta que revoga `deploy_bloqueado` |
| Antivírus no ambiente | cliente, config, testes e `fly.clamav.toml` (`B-AV-REAL`) | contratar/provisionar o serviço (junta-5 antes) — o item 25 só fecha com ele respondendo |
| Papel de banco da produção | trava de boot e procedimento (`B-SAN3-05`) | criar o papel `NOSUPERUSER NOBYPASSRLS` no banco gerenciado e trocar o secret — o item 9 só fecha com a trava verde no ambiente |
| 1º admin real | script testado (`B-SAN3-09`) | executá-lo em produção |
| Portal público (`Ω6R-PERF-003`) | a condição escrita no roteiro | expor em container separado, ou não expor |
| Provedor | nada muda sem decisão | Fly × AWS (§10.2) |

### 4.3 Fora do gate — risco declarado, com a condição de cada um

| Item | Por que não bloqueia | Condição |
|---|---|---|
| `Ω6R-ARQ-001/002/003`, `Ω6R-PERF-001` (jobs) → `B-O6R-08` | notificação perdida não é dado de negócio; sweeps idempotentes | **1 réplica**, restart automático |
| `Ω6R-PERF-002` → `B-O6R-10` | UX sob degradação, sem perda | p99 do backend < 30 s |
| `P-MOBILE-DESPACHO-SEM-PUSH` | objeção comercial: o técnico vê a OS ao abrir o app | o dono decide se entra (§10.1) |
| `P-CHK-APLICABILIDADE-SEM-ROTA`, `P-WEB-FIN-CHEQUE-FECHAMENTO-COMISSAO-SEM-TELA` | backend sem rota ou sem tela: não é funcionalidade entregue ao cliente | entram se o dono vender (§10.1) |
| `P-O6R-B06-RECONCILE-BLOQUEADO` | atinge só vistorias anteriores ao #385 | a junta do `B-O6R-06` decide o predicado; nenhum `--apply` na base viva antes |
| `P-032` (atalho de Configurações no Ctrl+K) | acabamento: a rota funciona | fila pós-gate |
| `P-009` (contraste abaixo de AA) | não impede demo | vira bloqueante se a venda exigir WCAG |
| demais ABERTAS (≈180 IDs de processo, arnês, borda e acabamento) | medidas uma a uma nas fatias | fila pós-gate (§7.3) |

### 4.4 O que as AUSENTES trouxeram para o registro

As **50 ausentes** entram no `pendencias.md` neste PR, cada uma com cabeçalho próprio e os campos que a fatia
mediu; as **8 parciais** entram como emenda da pendência que já existe (nunca como ID novo). As 15 de
governança vão para a fila do §7.3 — entre elas duas afirmações falsas vivas no head: a skill
`backend-review-ts-prisma` (`.claude/skills/backend-review-ts-prisma/references/repo-erp.md:23`, "teste `-db` se auto-pula" no job `backend`, quando o
`ci.yml:15` define `DATABASE_URL`) e as receitas dos itens 1.1 e 3.3 do inspetor, com `md5` cru.

## 5. Os blocos

Cada linha fixa a **fronteira em caminhos reais** (conferidos contra a árvore de `15ef3fbe`; "novo" = arquivo a
criar). O `planejador-mestre` de cada bloco (Fable, §C7.6) escreve o diff dentro dela. **Caminho proibido pelo
§C4 só é tocado onde a linha o autoriza pelo nome**; migração autorizada é **aditiva**, com up/down testados pelo
`agente-dba-guardiao` — migração que remova linha é parada irredutível (§C7.5).

**Quórum:** unanimidade de 3 em todo bloco que toca dinheiro, segurança, permissão ou perda de dado; maioria de 3
só onde o bloco é texto/fluxo sem esses quatro (`SAN3-07`, `SAN3-14`, `SAN3-19`, `SAN3-21`). Crítico adversarial
nos blocos de invariante (§C7.1-ter(b)).

**Esforço:** P ≈ 1,5 h · M ≈ 5 h · G ≈ 13 h no melhor caso medido (§9).

### 5.1 Frente 1 — backend de dado e dinheiro

| Bloco · branch | Fecha | Causa-raiz | Fronteira | Teste de encerramento (vermelho hoje → verde) | KPI | Junta | Dep. | Esf. |
|---|---|---|---|---|---|---|---|:-:|
| `B-O6R-04a` · `fix/inventory-consistency` | 1, 2 | leitura-decide-escreve sem lock nem CAS; fechamento de contagem sem unicidade | `src/modules/inventory/**` + suítes `-db` novas; **autorizado** `prisma/schema.prisma` + `prisma/migrations/**` só para o índice único parcial de `reverses_movement_id` (hoje só `@@index`, `schema.prisma:1508`) | 20 saídas concorrentes do mesmo item/custódia em Postgres real (2 conexões, barreira) → saldo nunca negativo; fechamento de contagem 2× → aplicado 1× | backend | unanimidade + crítico | B01 ✓ | G |
| `B-O6R-03a` · `fix/expense-sync-atomic` | 19 | efeito e recibo de replay não atômicos; o recibo mobile tem chave `(tenant_id, client_action_id)`, sem usuário | `src/modules/expense-management/**`, `src/modules/mobile/**` (recibo de ação); **autorizado** `prisma/schema.prisma` + `prisma/migrations/**` só para a chave de `MobileActionReceipt` (`schema.prisma:2847-2859`) — ou, sem migração, `client_action_id` com namespace por usuário: o planejador escolhe e mede | replay concorrente da mesma despesa → 1 lançamento; 2 usuários com a mesma chave local → 2 lançamentos | backend | unanimidade + crítico | B01 ✓ | G |
| `B-SAN3-02` · `fix/invoice-atomic-e-delta` | 20, 21 | faturamento fora do `financial-uow`; o refaturamento recusa em vez de faturar o delta | `src/modules/work-order-financials/**` + `-db` | falha injetada entre título e carimbo → nenhum persiste; item apagado durante o faturamento → fora do título; item lançado após o 1º faturamento → faturado no 2º, sem refaturar o carimbado | backend | unanimidade + crítico | — | M |
| `B-SAN3-20` · `fix/cheque-x-baixa` | 22 | o mesmo dinheiro tem duas portas (baixa do título e compensação do cheque) sem trava mútua | `src/modules/cheques/**`, `src/modules/financial-titles/**` | título baixado → compensar cheque do mesmo título recusa (e o inverso); saldo da conta pelo endpoint real bate | backend | unanimidade + crítico | — | M |
| `B-SAN3-03` · `fix/cloud-billing-exato` | 24 | métrica de base gravada fora da transação do fato; chaves sem produtor. **Decisão de desenho do bloco, ratificada pela junta dele:** captura por fato na transação (padrão do `B-O6R-06`, `cloud-usage.capture.ts`), sem outbox genérico — se o planejador medir que não dá, o bloco para e replaneja | `src/modules/cloud-usage/**`, `src/modules/cloud-cost-allocation/**`, `src/modules/cloud-charges/**`, e **só a gravação da métrica** em `src/infra/events/domain-event.publisher.ts`, `src/modules/notifications/notification.service.ts`, `src/modules/checklists/**` (upload de anexo) e `src/infra/jobs/job.worker.ts` | por produtor: executar o fato de origem com falha injetada na métrica → o fato e a métrica commitam juntos ou nenhum; rateio com custo de API gera alocação ≠ `unallocated`; o 2º `take: 100_000` sai | backend | unanimidade + crítico | — | G |

### 5.2 Frente 2 — isolamento, segurança e permissão

| Bloco · branch | Fecha | Causa-raiz | Fronteira | Teste de encerramento | KPI | Junta | Dep. | Esf. |
|---|---|---|---|---|---|---|---|:-:|
| `B-SAN3-05` · `fix/runtime-role-sem-bypass` | 9 | nenhuma trava impõe o papel de runtime; leituras de plataforma dependem de superusuário | `src/database/**` e `src/config/env.ts` (trava de boot), `docker-compose.prod.yml`, `docs/deployment.md`, `scripts/` (procedimento do papel, novo); leituras de plataforma **listadas por nome no plano do bloco** (lista fechada — achado fora dela vira pendência nomeada, nunca escopo crescido) | no boot de produção, `SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user` com qualquer `true` → recusa (mutação: papel superusuário com outro nome também é recusado); os drills da lista, sob papel efêmero `NOSUPERUSER NOBYPASSRLS` (`createEphemeralRole`), leem 2 tenants com o contexto certo e zero sem ele. **Não é teste deste bloco** rodar a suíte `-db` inteira sob esse papel: 15 suítes exigem `CREATEROLE`/dono de tabela — é o `B-ARNES-2`, pós-gate | backend, backend-postgres | unanimidade + `agente-dba-guardiao` + `agente-secops` | — | G |
| `B-O6R-07c` · `fix/o6r07c-subresource-scope` | 10 | subrecursos da OS e o sync mobile não reutilizam o escopo por objeto do 07a | `src/modules/work-orders/work-order.routes.ts`, `work-order.service.ts`, `src/modules/work-order-comments/**`, `src/modules/mobile/mobile-work-order-sync.ts`; **censo vinculante da superfície de sync** antes de declarar fechado | técnico não atribuído → 403 `not_assigned_to_actor` nas 10 vias (piso: vias 1, 2 e 10), com vermelho-controle no head-base; moderação de comentário dos papéis de escritório preservada (`D-Ω3F-5-COMMENT`) | backend | unanimidade + `coordenador-de-acessos` | 07a ✓ 07b ✓ | G |
| `B-SAN3-04` · `fix/rbac-catalogo-banco-matriz` | 12, 13, 14, 34 | catálogo, banco e registro de navegação divergem do `RBAC_MATRIX.md` | `src/modules/core-saas/permissions/catalog.ts`, `src/modules/navigation/navigation.registry.ts`, `frontend/src/layouts/appSidebarNav.ts`, `frontend/src/modules/auth/auth.adapter.ts`, `prisma/seed.ts` (**autorizado** só para semear o papel `auditor`) e `scripts/provision-rbac.ts` (só se a convergência não cobrir); **sem migração** — as permissões convergem do catálogo por `db:provision-rbac` (`deploy-production.yml:155`) | menu e `/dashboard/summary` montados com as permissões **do banco**, numa base descartável depois de `db:provision-rbac` + `db:seed`: Financeiro vê Financeiro, `/dashboard/summary` 200 para Financeiro e Estoque, auditor não toma 403, `inventory` tem menu próprio. **Vermelho-controle obrigatório no head-base**; item que sair verde lá só deixa o gate por ata da junta, com o teste revisado pela cadeira de acessos | backend, frontend | unanimidade + `coordenador-de-acessos` | — | M |
| `B-SAN3-18` · `fix/gate-de-modulo-no-backend` | 15 | o gate de módulo vive só no menu | `src/modules/navigation/navigation.registry.ts`, middleware de módulo (novo) e as rotas dos 27 caminhos, `frontend/src/layouts/appSidebarNav.ts` | organização sem o módulo → rota responde 403 nomeado (hoje 200) e o item some; guard: todo caminho do menu está no registro | backend, frontend | unanimidade + `coordenador-de-acessos` | `SAN3-04` | G |
| `B-SAN3-09` · `feat/bootstrap-platform-admin` | 18 | não há caminho versionado para o 1º admin | `scripts/bootstrap-platform-admin.ts` (novo) + teste | 2 execuções = 1 tenant de sistema + 1 admin; recusa sem a trava de produção | backend | unanimidade + `agente-secops` | — | P |
| `B-O6R-12` · `fix/jurisdiction-profile-versioning` | 23 | o motor de diárias lê o perfil vivo | `src/modules/jurisdiction/**`, `src/modules/charging/**` (leitura do regime), `src/modules/auction/auction.eligibility.ts`; **autorizado** `prisma/schema.prisma` + `prisma/migrations/**` só para o snapshot aditivo do regime no processo (`ImpoundProcess` só tem `profile_id`) | editar o perfil com processo vivo → diárias do processo inalteradas; auditoria campo a campo; o aceite provisório do `PLANO_O6R` é ratificado pela junta antes do código | backend | unanimidade + crítico | — | M |

### 5.3 Frente 3 — web e backend avulso

| Bloco · branch | Fecha | Causa-raiz | Fronteira | Teste de encerramento | KPI | Junta | Dep. | Esf. |
|---|---|---|---|---|---|---|---|:-:|
| `B-SAN3-01` · `fix/web-wo-sem-fallback-fabricado` | 4 | `catch` que devolve mock no lugar do erro | `frontend/src/modules/work-orders/**`, `frontend/src/modules/registry/service-quotes/useServiceQuoteReferences.ts`, `frontend/src/modules/operations/dispatches/dispatches.service.ts`, `tests/e2e/critical-flows.spec.ts` (o caso "com fallback seguro", l.196-220, exige a OS inventada) | 200 com lista vazia → `items: []`; create 422 → erro na tela, sem navegar; detalhe 404 → estado de erro (asserções de comportamento — nenhum teste por literal) | frontend | unanimidade + `cognicao-visual` | — | M |
| `B-AV-REAL` · `feat/evidence-clamav-scanner` | 25 (com o ato do dono) | a factory não tem desfecho real | cliente INSTREAM próprio em `node:net` (sem dependência npm) em `src/modules/evidence/**`, `src/config/env.ts`, `fly.clamav.toml` (novo) e **só o service container `clamd`** em `.github/workflows/ci.yml` | com clamd real: limpo → 201; EICAR montado em tempo de execução → 422; clamd fora → 503; limite estourado → 422 terminal (PD §4) | backend | **serviço: junta unânime de 5 + PD** (`PD-O6R-B07B-CLAMD-INSTREAM`, neste PR); código: unanimidade + `agente-secops` | junta-5 | M |
| `B-SAN3-12` · `feat/web-financeiro-baixa-e-contas` | 26 | a web emite título e não liquida | `frontend/src/modules/finance/**` sobre `POST /financial-titles/:id/pay` e as rotas de conta | título baixado pela web → `paid` e lançamento em caixa; saldo pela rota real; estados §7; ação só com a permissão | frontend | unanimidade + `cognicao-visual` + `coordenador-de-acessos` | — | M |
| `B-SAN3-06b` · `fix/console-plataforma-sem-ficcao` | 16, 39, 40 | o console da plataforma foi montado sobre literais | `frontend/src/modules/platform/**`, `frontend/src/navigation/platformNavigation.ts` | cada tela ligada ao backend que existe, ou fora do menu com o motivo; nenhum controle de segurança exibido sem a configuração real; teste sem API → nunca literal | frontend | unanimidade + `coordenador-de-acessos` + `cognicao-visual` | — | G |
| `B-SAN3-11` · `fix/dossie-versao-da-vistoria` | 8 | o dossiê não distingue vistoria substituída | `frontend/src/modules/patios/processes/**` (+ DTO em `src/modules/impound/**` se preciso) | vistoria substituída aparece rotulada, nunca como vigente | frontend | unanimidade | — | P |
| `B-SAN3-07` · `fix/seed-demo-nome-de-negocio` | 41 | nome técnico no seed | `prisma/seed.ts` (**autorizado** só para o nome) | re-seed numa base descartável e `SELECT name FROM tenants` → nenhum contém "Tenant" (medido no banco, não no fonte) | backend | maioria | `SAN3-04` (mesmo arquivo) | P |
| `B-SAN3-06a` · `fix/menu-sem-tela-ficticia` | 35 | telas de protótipo roteadas e no menu, sem dado | `frontend/src/modules/{purchase-orders,reports}/**`, `frontend/src/modules/dispatch/pages/DispatchConsolePage.tsx`, `frontend/src/layouts/appSidebarNav.ts`, `frontend/src/navigation/tenantNavigation.ts`, `frontend/src/App.tsx` | nenhuma tela do menu exibe dado constante; ou a tela sai do menu e da rota (default do §10.1) | frontend | unanimidade + `coordenador-de-acessos` + `cognicao-visual` | `SAN3-04` (mesmo arquivo) | M |
| `B-SAN3-08` · `fix/orcamento-destino-e-papel-financeiro` | 36, 37 | a aprovação não pergunta o destino; o Financeiro não tem as permissões de leitura do orçamento | `frontend/src/modules/registry/service-quotes/**`, `frontend/src/modules/work-orders/components/tabs/QuoteTab.tsx`; os grants chegam pelo `SAN3-04` | orçamento com destino obrigatório → diálogo → OS criada; Financeiro cria orçamento na base com as permissões do banco | frontend | unanimidade + `cognicao-visual` | `SAN3-01`, `SAN3-04` | M |
| `B-SAN3-21` · `fix/web-acentuacao` | 43 | literais antigos sem acento | literais de texto em `frontend/src/**` (só strings) | guard: lista de termos sem acento (Situacao, Nao, Configuracoes…) em `.tsx` = 0 | frontend | maioria | `SAN3-06a`, `SAN3-08` | P |
| `B-O6R-09` · `fix/dispatch-atomic-timeline` | 7 | despacho e evento em transações separadas, sem chave idempotente | `src/modules/field-dispatch/**`; **autorizado** `prisma/schema.prisma` + `prisma/migrations/**` só para a chave idempotente de criação | falha injetada entre despacho e evento → nenhum persiste; mesma chave 2× → 1 despacho | backend | unanimidade + crítico | **revista:** o `PLANO_O6R` pôs `B-O6R-08` antes; a atomicidade na mesma transação não precisa de lease de job — hipótese que o planejador confirma; se não, o `B-O6R-08` entra no gate | M |
| `B-SAN3-22` · `fix/checklist-patch-com-versao` | 6 | PATCH de modelo sem guarda de versão | `src/modules/checklists/**`, `frontend/src/modules/checklists/**`, `API_CONTRACTS.md` (contrato REST muda: `expectedUpdatedAt`); **sem migração** (usa `updated_at`) | PATCH com `expectedUpdatedAt` defasado → 409 (hoje 200 sobrescreve) | backend, frontend | unanimidade | — | M |

### 5.4 Frente 4 — app de campo (em série: os blocos tocam os mesmos arquivos)

| Bloco · branch | Fecha | Causa-raiz | Fronteira | Teste de encerramento | KPI | Junta | Dep. | Esf. |
|---|---|---|---|---|---|---|---|:-:|
| `B-O6R-11` · `fix/mobile-work-order-contracts` | 3 | envelope `{data}` parseado como corpo; enfileiramento sem `await` | `mobile/flutter_app/lib/features/work_orders/data/work_order_remote_api.dart`, `mobile/flutter_app/lib/features/prestador/data/prestador_repository.dart`, `mobile/flutter_app/lib/core/sync/sync_queue_repository.dart`, `mobile/flutter_app/lib/core/local_db/drift_sync_action_store.dart` + testes | Dio fake com `{data:{…}}` → detalhe/status/assign corretos; assign envia o campo que o backend lê; N SKUs enfileirados + restart → N ações | flutter | unanimidade | B01 ✓ | M |
| `B-SAN3-13` · `fix/mobile-minhas-os` | 11, 33 | a lista filtra só por organização; o upsert remoto nunca apaga | `mobile/flutter_app/lib/shared/ui/home_screen.dart`, `mobile/flutter_app/lib/features/work_orders/data/{work_order_repository,work_order_remote_api}.dart`; backend `src/modules/work-orders/work-order.routes.ts` e `work-order.service.ts` (filtro `assignedUserId` + paginação) | técnico A vê só as OS atribuídas a ele (hoje vê as de B); OS semente gravada no aparelho some no próximo sync | flutter, backend | unanimidade + `coordenador-de-acessos` | `B-O6R-11` | M |
| `B-SAN3-14` · `fix/mobile-guincho-entrega` | 29 | a navegação nunca passa `kind=delivery` | `mobile/flutter_app/lib/features/work_orders/ui/work_order_execute_screen.dart`, `mobile/flutter_app/lib/features/work_orders/domain/work_order_steps.dart`, `mobile/flutter_app/lib/app/router.dart` | OS de guincho percorre coleta **e** entrega no app, com o checklist de entrega | flutter | maioria + `cognicao-visual` | `SAN3-13` | M |
| `B-SAN3-15` · `fix/mobile-prestador-porta-e-estoque` | 30, 31, 32 | telas construídas sem navegação; estoque do técnico sem endpoint | `mobile/flutter_app/lib/features/prestador/**`, `mobile/flutter_app/lib/app/router.dart`, a tela de detalhe da OS em `mobile/flutter_app/lib/features/work_orders/ui/`; backend: rota de estoque por custódia em `src/modules/inventory/**` | do detalhe da OS se chega ao Prestador e à Conclusão; o material vem do estoque real da custódia (SKU fora dela não aparece) | flutter, backend | unanimidade | `B-O6R-04a`, `SAN3-14` | G |
| `B-SAN3-16` · `fix/mobile-fila-os-drenada` | 5 | o replay só conhece 3 tipos; o backend não aceita os outros 2 | `mobile/flutter_app/lib/core/sync/sync_replay_service.dart`, `mobile/flutter_app/lib/features/work_orders/data/work_order_repository.dart`; backend `src/modules/mobile/mobile-work-order-sync.ts` | "pedir aprovação" e "não consigo iniciar" offline → após o sync, a aprovação existe no backend e a fila está vazia; tipo desconhecido → erro visível | flutter, backend | unanimidade | `SAN3-15`, `B-O6R-07c` (mesmo arquivo do backend) | M |
| `B-SAN3-17` · `fix/mobile-consentimento-gps` | 17 | a tela de consentimento não tem porta | `mobile/flutter_app/lib/core/location/**`, `mobile/flutter_app/lib/shared/ui/home_screen.dart`, `mobile/flutter_app/lib/app/router.dart` | o técnico dá e revoga o consentimento pelo app; sem consentimento nada é capturado (o ramo é lido e testado — a fatia deixou como hipótese) | flutter | unanimidade (dado pessoal) | `SAN3-16` | M |
| `B-O6R-04b` · `fix/mobile-inventory-sync` | 28 | o contrato de estoque do app não persiste | `mobile/flutter_app/lib/features/inventory/**`, `mobile/flutter_app/lib/core/sync/{auto_sync_coordinator,sync_providers}.dart`; backend `src/modules/mobile/mobile-inventory-sync.ts` | movimento de estoque no app → persistido no Prisma e sobrevive a restart | flutter, backend | unanimidade | `B-O6R-04a`, `SAN3-17` | M |
| `B-O6R-03b` · `fix/mobile-rdv-sync` | 27 | o sync de RDV sai sem token | `mobile/flutter_app/lib/features/expenses/**`, `mobile/flutter_app/lib/core/sync/sync_providers.dart`, `mobile/flutter_app/lib/core/auth/auth_notifier.dart`, `mobile/flutter_app/lib/core/network/http_client.dart`; backend `src/modules/expense-management/expense-management.routes.ts` | RDV criado offline sincroniza com sessão válida; replay → 1 | flutter, backend | unanimidade | `B-O6R-03a`, `B-O6R-04b` | M |
| `B-SAN3-19` · `fix/mobile-faxina-termos` | 42 | termos técnicos, nome de template e aviso falso fixo | `mobile/flutter_app/android/app/src/main/AndroidManifest.xml`, `mobile/flutter_app/lib/shared/ui/{home_screen,module_placeholder_screen,sync_screen}.dart` | o app se chama pelo nome do produto; nenhum papel técnico cru; o aviso de integração só aparece quando a integração está de fato desligada | flutter | maioria + `cognicao-visual` | `B-O6R-03b` | P |

### 5.5 O bloco que fecha o gate

| Bloco · branch | Fecha | Fronteira | Teste de encerramento | Junta | Dep. | Esf. |
|---|---|---|---|---|---|:-:|
| `B-SAN3-10` · `test/e2e-no-ci-e-roteiro` | 38, 44 | `tests/e2e/**`, `playwright.config.ts`, **job e2e bloqueante** em `.github/workflows/ci.yml` (autorizado só para ele), `docs/ROTEIRO-DEMO-E-OPERACAO.md` (novo), `docs/go-live-readiness.md` | (a) job e2e obrigatório na CI, com vermelho-controle (um fluxo quebrado de propósito deixa o job vermelho); (b) fluxos web por persona ponta a ponta (OS criar → despachar → faturar → **baixar**; orçamento → OS; checklist com evidência; pátio); (c) **o app:** fluxos Flutter provados por testes de integração contra contrato e **uma execução no emulador `erp_pixel`** com evidência no roteiro — Playwright não roda Flutter, e o mecanismo fica escrito; (d) roteiro de **demonstração** executado por quem não o escreveu; (e) roteiro de **operação** (deploy, restore cronometrado, bootstrap do 1º admin, rotação de segredo) escrito e ensaiado fora do ambiente real — a execução no ambiente real é o ato do dono do §4.2; (f) `mvp_demo`/`mvp_vendavel` recalculados com método escrito | unanimidade + `master-teste-telas-rotas` | **todos os blocos do §5.1–5.4** | G |

**Encerramento de todo bloco (não se pula por urgência):** plano do `planejador-mestre` (Fable) → dev → bateria
exata (§9 do contrato) → KPI no próprio PR com execução real → `inspetor-de-terreno-da-junta` → junta → CI
verde → squash + `--delete-branch` → limpeza §C5 → `porteiro-pos-merge` → backfill no PR seguinte.

**Paralelismo × porteiro (§C2.8, leitura literal).** Blocos já em voo continuam; **nenhum bloco novo começa**, em
nenhuma frente, antes do parecer do porteiro do último merge. O porteiro está no caminho crítico (§9). Um
porteiro por frente mudaria o contrato — é pergunta ao dono (§10.6), não decisão do plano.

**Colisão em `Kpis/*`.** O segundo a mergear absorve a `main` e **reexecuta** as suítes que o PR exerce antes de
publicar a contagem (§C3.3) — não é resolver conflito de texto.

**KPI da rodada.** Este PR não publica número novo (sem entrada no history — precedente #382): só o backfill do
#385. A rodada SAN3 entra no painel com o primeiro bloco que entregar, com a visualização no mesmo PR (§C3.1).
O `mvp_vendavel` (88%) e o `mvp_demo` (99%) são estimativas **anteriores** a este inventário: ficam intocados
(§C3.4), com nota explícita no card e em `limitations`, e são **recalculados no `B-SAN3-10`**.

## 6. Dependências

```
frente 1:  B-O6R-04a ► B-O6R-03a ► B-SAN3-02 ► B-SAN3-20 ► B-SAN3-03
frente 2:  B-SAN3-05 ► B-O6R-07c ► B-SAN3-04 ► B-SAN3-18 ► B-SAN3-09 ► B-O6R-12
frente 3:  B-SAN3-01 ► B-AV-REAL ► B-SAN3-12 ► B-SAN3-06b ► B-SAN3-11 ► B-O6R-09 ► B-SAN3-07 ► B-SAN3-06a
           ► B-SAN3-08 ► B-SAN3-21 ► B-SAN3-22
           (o B-O6R-09 vem antes do B-SAN3-07 porque o 07, o 06a e o 08 esperam o B-SAN3-04 da frente 2,
           que termina em ≈ 31 h no melhor caso; nesta ordem a frente não espera)
frente 4:  B-O6R-11 ► B-SAN3-13 ► B-SAN3-14 ► B-SAN3-15 ► B-SAN3-16 ► B-SAN3-17 ► B-O6R-04b ► B-O6R-03b ► B-SAN3-19

arestas entre frentes (mesmo arquivo ou pré-requisito de dado):
  B-O6R-04a ► B-SAN3-15, B-O6R-04b          B-O6R-03a ► B-O6R-03b
  B-SAN3-04 ► B-SAN3-06a, B-SAN3-07, B-SAN3-08, B-SAN3-18
  B-SAN3-01 ► B-SAN3-08                     B-O6R-07c ► B-SAN3-16 (mobile-work-order-sync.ts)
  junta-5 do serviço ► B-AV-REAL            todos ► B-SAN3-10 ► GATE (+ os 6 atos do §4.2)
fora do gate: B-O6R-08 (e o B-O6R-09 volta a depender dele se a hipótese do §5.3 cair)
```

As suítes `-db` novas de qualquer frente fazem as asserções de RLS pelo padrão de drill do `B-O6R-06` (papel
efêmero `NOSUPERUSER NOBYPASSRLS`) — por isso nenhuma depende da ordem em relação ao `B-SAN3-05`.

## 7. Registro e governança

### 7.1 A causa dos flips — e o que este PR faz com ela

O registro é só-apensar (§A2) e o índice lê **a linha `status:` de cada entrada**. Quando o conserto chega por
outro bloco, ou quando o fechamento é escrito noutra seção, a linha original não muda e a pendência fica
"aberta" para sempre. Formas medidas na fatia B1: (a) bloco posterior fecha sem citar a entrada; (b) guia de
preparação consumido pelo próprio bloco que guiava; (c) fechamento escrito noutra seção, em ID duplicado ou em
`decisoes.md`. **Este PR reescreve a linha canônica** de cada flip (valor antigo preservado na própria linha) e
regenera o índice. A **prevenção** é o `B-GOV-GUARD-DERIVADOS`, pós-gate.

### 7.2 Defeitos da ferramenta de registro e da documentação (nenhum bloqueia o gate)

- `severidade()` lê menção, não o campo (§1) → `P-SAN3-INDICE-SEVERIDADE-POR-MENCAO`.
- `classificar()` lê **só a primeira** linha de status, e a regra 2 do script ("parcialidade nunca fecha") não
  está implementada para ela. **Medido em bancada neste PR:** duas linhas opostas → decide a primeira, sem
  `CONTRADITORIA`; `status: FECHADA — parcialmente superado` → FECHADA; e `status: RESOLVIDO PARCIAL — quatro
  residuais abertos`, a forma que o cabeçalho do script diz ter consertado, **sai FECHADA** →
  `P-SAN3-INDICE-SO-PRIMEIRA-LINHA-DE-STATUS`.
- a coluna "dono" diz `sim` para "a atribuir" (`P-SAN2-2-INDICE-DONO-SEMPRE-SIM`); status em negrito é invisível
  (`P-STATUS-NEGRITO-INVISIVEL-AO-GERADOR`).
- contagens defasadas: `P-O6R-BACKLOG` (29/30 → 32 achados), `P-KPI-RECENT-CONGELADO`, `P-KPI-HISTORY-MD-BACKLOG`,
  `P-SAN-KPI-BACKFILL` (materializado), o `roadmap` do painel parado em 2026-08-19, e `PROJECT_MEMORY.md`
  dizendo que o `B-O6R-02` está no ciclo 5.
- afirmações falsas vivas: `docs/go-live-readiness.md:76`; `references/repo-erp.md:23`; o dossiê do
  `B-GOV-ELENCO` cita `P-GOV-MODELO-CODEX-SEM-NOME`, que não existe no registro.
- dono órfão: `P-O6R-B01-RELIGACAO-SEM-REMEDIO` nomeia o `B-O6R-07`, que mergeou em 07a/07b sem tocar o item → o
  planejador do `B-O6R-07c` diz se cabe nele; se não, ganha bloco próprio pós-gate.

### 7.3 Fila pós-gate (prioridades 5–9)

`B-O6R-08` (e `B-O6R-09`, se a hipótese cair), `B-O6R-10` (PERF-002), `B-ARNES-2` (inclui a suíte `-db` inteira
sob papel sem `BYPASSRLS`), `B-REG-GERADOR`, `B-GOV-GUARD-DERIVADOS`, `B-GOV-CI-AUDITOR`, `B-REG-TYPECHECK-TESTS`,
`B-KPI-F-HISTORY-MD`, as 15 ausentes de governança e as ABERTAS de acabamento e processo, na ordem de prioridade
do dono, cada uma com o dono e o teste que a fatia registrou.

## 8. O que este plano corrige no `PLANO_O6R` (a revisão adversarial, item a item)

1. **O `PLANO_O6R` só cobria os 32 achados da auditoria.** Ignorava as 231 pendências do registro e as 50 que nem
   registro tinham. **33 dos 44 bloqueantes** vêm de fora da auditoria.
2. **O bloco 07 virou três e o plano não sabia.** 07a (#369) e 07b (#380) mergearam; o residual do SEC-002 não tinha
   bloco (`B-O6R-07c`) e o do SEC-004 estava **fora do plano** (`B-AV-REAL`). O painel ainda marca
   `B-O6R-07 = a_fazer`.
3. **Blocos G quebrados em fatias verticais** (`04a/04b`, `03a/03b`, `06a/06b`).
4. **O aceite do `B-O6R-12` era provisório e nunca foi ratificado.** A junta do bloco o ratifica antes do código.
5. **Duplicatas marcadas, sem fusão silenciosa:** `P-020` ≡ `Ω6R-DAT-002`; `P-ARNES-CANONICA1-VERMELHO-AMBIENTAL` ≡
   `P-O6R-B02-CRASH-NO-LOAD-SEM-SKIP`; `P-REG-BATERIA-NAO-TYPECHECA-TESTS` ≡ `P-TESTS-FORA-DO-TYPECHECK`;
   `P-RBAC-CATALOG-MATRIZ` e `P-RBAC-CHECKLIST-DRIFT` (mesma matéria); `P-023` ≡ `P-USERS-LAST-ACCESS`;
   `P-AUD-ACTOR-NAME` ≡ item 1 de `P-AUDIT-FOLLOWUPS`; o resíduo LEGACY-NULL de `P-Ω3F6` ≡
   `P-GOLIVE-VALIDATE-CONSTRAINT`; `P-FINANCE-HEADER-ACTIONS` ⊂ `P-Ω4-8-DASHBOARD-FIDELITY`; `P-Ω3F2B-ACENTOS` ⊂
   `P-028`; e `P-RBAC-GATING-MOCKSHELLS` cobre `P-PURCHASE-ORDERS-BACKEND-GATE` **mais** o Console de Despacho.
   O sync de RDV sem `Authorization` das sínteses de produto **é** o `Ω6R-QUA-001`. O denominador 231 conta cada
   duplicata como entrada distinta — o placar do §1 é do registro como ele está, não de defeitos únicos.
6. **Pendências que faltavam:** as 50 ausentes (§4.4) e o segundo `take: 100_000` silencioso
   (`cloud-charge-prisma.repository.ts:223`) — emenda em `P-O6R-B06-RATEIO-CURSOR-100K`.
7. **Conflitos mantidos e registrados (§A2), não resolvidos em silêncio:**
   - **As reclassificações `✓` do §4.1** (itens 3, 6, 7, 9, 14, 20–22, 24, 27, 28, 31, 34, 37, 40, 42, 43): as
     fatias as davam como não bloqueantes, condicionais ou "demo honesta, não venda". A regra do §2 — critério
     literal, aplicado por igual, com o default estrito — as leva ao gate. A regra também **tirou** um critério
     errado: o `P-026` saiu do critério 3 (o backend nega corretamente, como a fatia C1 provou) e ficou no 7.
   - **Fatia C1 × fatia C2 sobre de onde vêm as permissões em runtime.** A C1 escreveu "vêm do catálogo" e por
     isso descartou o `P-033`; a C2 escreveu "vêm do banco". Medido (crítico, r1): **a C2 está certa** —
     `persistent-rbac-context.middleware.ts:90-107` → `role.repository.ts:118`. O `P-033` volta ao gate como
     condicional, medido no `B-SAN3-04` em modo banco.
   - **`P-O6R-B11`:** o inventário Ω6R o dava como risco declarado; a fatia B2 e este plano, como bloqueante (critério
     5, pelo `QUA-005`).
   - **Itens provados por composição de leitura, não por execução** (`P-Ω4-FINANCE-READ-ORFA`, o efeito na captura
     do `P-MOBILE-LGPD-GPS-SEM-PORTA`, a recusa de módulo do `P-WEB-GATE-MODULO-INCOMPLETO`): o primeiro passo do
     bloco é o teste que reproduz, com vermelho-controle; se sair verde no head-base, o item só deixa o gate por
     ata da junta.
   - **`D-INFRA-PROVIDER`** (Fly.io, junta 5/5) × **`D-TRACCAR-HTTP-PRIVADO-AWS`** (dono): registrado em
     `decisoes.md`.

## 9. Viabilidade — o prazo de 48 horas

**Quantidade exata.** 44 bloqueantes em **32 blocos** — 9 G (`04a`, `03a`, `SAN3-03`, `SAN3-05`, `07c`,
`SAN3-18`, `SAN3-06b`, `SAN3-15`, `SAN3-10`), 18 M, 5 P — mais os 6 atos do dono e este PR.

**Velocidade medida** (primeiro commit → merge, os 8 PRs da rodada Ω6R, `gh pr view`): #360 1,27 h · #353 1,43 h ·
#359 4,94 h · #380 12,83 h · #357 44,06 h · #369 57,04 h · #385 102,73 h · #371 376,70 h. **Mediana dos 8: 28,4 h.**
Dos 5 blocos grandes (#380, #357, #369, #385, #371) a **mediana é 57,0 h** e o mais rápido, 12,8 h. A métrica
**subestima**: exclui o plano e o inspetor antes do primeiro commit e o porteiro e o backfill depois do merge.

**Melhor caso** (4 frentes em paralelo; G = 12,8 h, M = 5 h, P = 1,5 h; nenhuma reprovação):
- frente 1 ≈ 49 h · frente 2 ≈ 50,5 h · frente 3 ≈ 52,5 h · frente 4 ≈ 49,5 h (as esperas entre frentes cabem:
  o `04a` termina em ≈ 13 h, o `03a` em ≈ 26 h, o `07c` em ≈ 26 h e o `SAN3-04` em ≈ 31 h);
- `+ B-SAN3-10` (G ≈ 13 h) `+` este PR (≈ 3 h) = ≈ 68 h;
- `+` o porteiro no caminho crítico (≈ 11 merges na frente mais longa × 0,5–1 h, mais a espera pelos porteiros das
  outras frentes) e a reexecução de suítes nas colisões de `Kpis/*` ≈ **+12–17 h → ≈ 80–85 h de relógio.**

**Não cabe em 48 h, nem no melhor caso.** E ele supõe 4 frentes rodando juntas, o que já falhou nesta sessão: o
limite de sessão derrubou 8 agentes em paralelo às 05:10; e cada bloco passa por 3 gates fixados em Fable
(planejador, inspetor, porteiro), 32 vezes, contra a mesma cota.

**Estimativa realista** (G = 57 h, a mediana medida dos grandes; M ≈ 10 h, **assumido** — a amostra de M é pequena
demais para medir): as frentes 1 e 2 têm **3 G em série cada** → ≈ 190 h; somando o `B-SAN3-10` e o porteiro,
**≈ 10 a 12 dias.**

**Bloqueios fora do código:** a junta unânime de 5 do `B-AV-REAL`; os 6 atos do §4.2; as decisões do §10; a cota
do Fable.

**Ordem de execução:** (1) este PR → junta → merge → porteiro; (2) as quatro frentes do §6, cada uma na ordem da
sua linha, a junta-5 do `B-AV-REAL` assim que o plano for aprovado; (3) `B-SAN3-10`; (4) os atos do dono, com o
roteiro de operação; (5) declaração do gate com ata; (6) só então o Traccar (§11).

## 10. O que só o dono decide

Só entra aqui o que o código, a junta ou o contrato **não podem** resolver. Para cada uma: o **default** aplicado se
o dono não responder — nunca uma redução de escopo.

0. **Declarar "versão vendável" com algum dos 6 atos do §4.2 ainda pendente?** Default: **não**. O plano não decide
   isso — só o prepara.
1. **Escopo da versão vendável.** Default: tudo o que está construído está à venda. Saem do gate só se o dono tirar
   o módulo: Pátios/diárias (item 23), dossiê como prova (8), repasse de custo de nuvem (24), venda por
   plano/módulo (15), RDV e estoque no app (27, 28). Entram só se o dono pedir: cheques, fechamento e política de
   comissão pela web; checklist por tipo de serviço; push de despacho. E: **Pedidos e Relatórios reais, ou fora do
   menu até existirem?** Default do `B-SAN3-06a`: fora do menu.
2. **Onde a versão vendável roda:** Fly.io (`D-INFRA-PROVIDER`) × AWS. Default: nada muda sem decisão escrita.
3. **Traccar:** o ERP inteiro vai para a AWS, ou só o Traccar? Trava o Dia 1 do Traccar, não o saneamento.
4. **Convivência app × Traccar** ("quero ver o custo dos dois"): estudo no Dia 1 do Traccar.
5. **Produto (fora do gate):** vistoria com divergência é faturada?; des-compensar cheque; estorno de título em
   disputa.
6. **Governança:** um porteiro por frente, em vez de um por merge segurando todas (§5, paralelismo)? Default: a
   leitura literal do §C2.8. E o dossiê de 2026-09-09: onde as sessões nascem (`P-GOV-CAMINHO-REPO-SESSAO`,
   reincidente hoje); destino do assento permanente; PR de governança sem porteiro;
   `docs/claude-code-handoff/CLAUDE.md`; `.claude/agents/especialistas/` no `.gitignore`.

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
| CR1-01 objeto julgado ≠ objeto mergeado | bloqueia | A correção dos flips, as 50 ausentes e o índice regenerado entram **antes** da rodada 2 e da junta; o texto não declara mais nada "em andamento". |
| CR1-02 caminhos inexistentes | bloqueia | Todo caminho do §5 conferido contra a árvore de `15ef3fbe` (script sobre o próprio plano); "novo" onde o arquivo nasce no bloco. |
| CR1-03 mediana | ajuste | 28,4 h (8 PRs) e 57,0 h (5 grandes); a subestimação da métrica declarada (§9). |
| CR1-04 contagens | ajuste | A1 = 3/3/26; flips = 52 (22,5%); "33 dos 44" conferido; bloco sem item (o `SAN3-09`) agora fecha o item 18. |
| CR1-05 G1/G2 era redução de escopo | bloqueia | O degrau saiu. Os 6 atos do dono estão **dentro** do gate (§2, §4.2); declarar antes deles é a decisão 0 do dono. |
| CR1-06 "produção conecta como superusuário" | ajuste | Reescrito para o que foi medido (item 9): nada impõe o papel; o compose de subida usa `postgres`; o papel da produção não foi medido. |
| CR1-07 teste do `SAN3-05` inexequível | bloqueia | Trava por `pg_roles` no boot (com mutação de nome); drills numa lista fechada, sob papel efêmero; a suíte inteira sob papel sem bypass foi para o `B-ARNES-2`, declarado. |
| CR1-08 frentes não disjuntas | bloqueia | Fronteiras refeitas com os arquivos que o defeito exige (`mobile/flutter_app/lib/core/sync/**`, `src/modules/work-order-comments/**`, `mobile-work-order-sync.ts`, publisher e notificação) e arestas entre frentes no §6. |
| CR1-09 E2E | bloqueia | Job e2e bloqueante na CI com vermelho-controle; o spec que exige a OS inventada entra no `SAN3-01`; o mecanismo do app escrito; esforço G. |
| CR1-10 reclassificação desigual | ajuste | Regra única (§2) aplicada: entram `P-CHK-PATCH-SEM-LOCK`, `ARQ-004`, `REFATURAR-DELTA`, `DUPLA-CONTAGEM`, o aviso falso do sync e a acentuação; `P-026` corrigido para o critério 7; `QUA-004` explicitado como carona do item 3. |
| CR1-11 testes verdes com o defeito | ajuste | `SAN3-04` com vermelho-controle e permissões do banco; `SAN3-07` medido no banco; `SAN3-01` só por comportamento; `SAN3-03` por produtor no caminho do fato. |
| CR1-12 `prisma/**` | ajuste | Autorizado pelo nome onde o teste exige (`04a`, `03a`, `B-O6R-12`, `B-O6R-09`, `seed.ts` no `SAN3-04`/`SAN3-07`); removido do `SAN3-04` (convergência por `db:provision-rbac`); `AV-REAL` com `fly.clamav.toml` e só o service container da CI. |
| CR1-13 quórum | ajuste | Unanimidade em todo bloco de dinheiro/segurança/permissão/perda de dado; maioria só em `SAN3-07/14/19/21`. |
| CR1-14 o que a estimativa escondia | ajuste | Porteiro e reexecução de KPI no caminho crítico; cota do Fable nomeada; frentes recalculadas com as esperas. |
| CR1-15 conflito C1 × C2 | ajuste | Registrado (§8.7); `P-033` volta ao gate como condicional. |
| CR1-16 duplicatas | ajuste | Declaradas (§8.5), inclusive o Console de Despacho. |
| CR1-17 "5 de 8" sem fonte | nota | A frase saiu; o §9 usa só os tempos medidos. |
