# PLANO SAN3 — saneamento até a versão vendável

> **O que é.** A revisão adversarial do `docs/revisoes/O6R/PLANO_O6R.md` somada ao inventário completo das
> pendências, medida no código em `origin/main@15ef3fbe` (a `main` com o `B-O6R-06`, #385). O `PLANO_O6R.md`
> **não é apagado** (§A2): este plano o **supera para o que resta** e diz, item a item, o que herda, o que
> corrige e o que acrescenta (§8).
>
> **Autoria:** orquestrador (consolida o inventário; não achou os defeitos — os achadores foram 8
> inventariantes somente-leitura). **Revisão adversarial:** `critico-adversarial`, antes da junta. **Junta do
> PR do plano:** maioria de 3 (registro e plano; não toca dinheiro, permissão nem dado diretamente). A junta de
> cada BLOCO segue o quórum do risco dele (§C7.1-ter(b)).
>
> **Estado:** RASCUNHO para a crítica adversarial. Os números do registro (§0) só se tornam finais quando a
> correção dos flips e a inclusão das pendências ausentes no `pendencias.md` forem aplicadas e o índice
> regenerado no mesmo PR.

---

## 0. O resumo que o dono precisa ler

1. **Inventário completo.** As 238 linhas abertas do índice (231 IDs distintos), os 32 achados Ω6R (17 não
   fechados) e **140 candidatos a pendência que não estavam no registro** foram medidos **pelo código**, nunca
   pelo texto da entrada. As tabelas de 13 campos estão em `docs/revisoes/SAN3/inventario/`, uma por fatia.
2. **O registro mente em 24% das entradas medidas, e falta um quinto do que existe.** Das 231, **31 estão
   FECHADAS no código** e o texto as dá como abertas; **25 são PARCIAIS** e o texto não diz. E **50
   pendências reais não tinham entrada** (35 de produto, 15 de governança). A causa dos flips é mecânica
   (§7.1). Este PR corrige as linhas de status e registra as ausentes.
3. **O gate da versão vendável tem 36 bloqueantes em 28 blocos** (§4), e **nenhum dos 28 começou**. Mais 6
   itens são de **go-live** e dependem do dono (§4.2). O que o inventário das ausentes acrescentou pesa: pela
   web um título **nunca é baixado**; no app, "Minhas OS" lista a organização inteira, a perna de entrega do
   guincho e o fluxo Prestador **não têm porta**, o estoque do técnico é **inventado no código** e duas ações
   da fila local **nunca são enviadas**.
4. **Não cabe em 48 horas.** O melhor caso, com 4 frentes em paralelo e **cada bloco G no tempo do mais
   rápido já medido** (12,8 h — e metade dos 8 blocos Ω6R passou de 44 h), é **~58 h de relógio**. O
   realista, pela mediana de 44 h por bloco G, é **7 a 10 dias** (§9). **Não há redução de escopo:** a execução
   segue pela ordem de risco, e o gate só é declarado quando todos os bloqueantes fecharem.
5. **O Traccar não começa antes do gate** — decisão registrada em `D-TRACCAR-HTTP-PRIVADO-AWS` (§11).

## 1. Fonte e método

- **Head medido:** `15ef3fbe` para as 7 fatias do registro; `ca5fd19a` (árvore idêntica, `7883a59e`) para o
  inventário dos achados Ω6R. Somente leitura: `git show`/`log`/`ls-tree`/`grep`; nenhum teste, build ou banco.
- **Fatias:** A1 e A2 (balde A, 63 linhas) · B1 e B2 (balde B, 99 linhas / 92 IDs) · C1 e C2 (balde C, 76) ·
  O6R (32 achados) · **AUSENTES** (9 fontes — atas, pareceres, auditorias, sínteses de produto, dossiês — cruzadas
  com o registro).
- **Placar do registro** (status comprovado pelo código):

| Fatia | IDs | FECHADA (texto diz aberta) | PARCIAL | ABERTA | NÃO MEDIDA |
|---|--:|--:|--:|--:|--:|
| A1 | 32 | 3 | 4 | 25 | 0 |
| A2 | 31 | 2 | 2 | 27 | 0 |
| B1 | 50 | 16 | 3 | 31 | 0 |
| B2 | 42 | 5 | 4 | 33 | 0 |
| C1 | 38 | 2 | 9 | 27 | 0 |
| C2 | 38 | 3 | 3 | 31 | 1 |
| **Total** | **231** | **31** | **25** | **174** | **1** |

  (A1 derivado da própria seção FLIPS da fatia: 3 fechadas + `P-O6R-B07` parcial + 3 parciais que o texto já
  declarava.)
- **Placar das AUSENTES:** 140 candidatos → **37** já registrados · **8** parcialmente (a pendência existe, falta
  um componente nomeado) · **50 ausentes confirmadas por presença**, com 13 campos (35 produto, 15 governança;
  **10 bloqueiam**) · 24 superadas · 13 não são pendência.
- **A coluna de severidade do `pendencias-indice.md` NÃO é usada para ordenar este plano.** Medido em
  `15ef3fbe`: `severidade()` (`gerar-indice-pendencias.py:75-80`) devolve a severidade **mais alta mencionada
  em qualquer ponto do corpo**, inclusive em prosa. Casos: `P-METODO-FERRAMENTA-SINTATICA-COMO-PROVA`
  (campo "informativa" → índice ALTA, por "caixa alta"), `P-O6R-B06-RATEIO-CURSOR-100K` (MÉDIA → ALTA, por
  "recusa alta"), `P-GOV-VEREDITO-SEM-PARSER` (MÉDIA → ALTA), `P-GOV-INSPETOR-33-SEM-NORMA` (BAIXA → ALTA) e,
  no sentido inverso, `P-O6R-B04` (carrega 2 P0 → índice BAIXA). A ordenação usa a severidade **medida pelos
  inventariantes contra o código**.

## 2. O gate da versão vendável — os critérios do dono, literais

A versão só é declarada vendável quando: (1) não existir pendência bloqueante do plano; (2) isolamento
multi-tenant validado; (3) RBAC validado no backend; (4) fluxos financeiros preservam dinheiro exato;
(5) nenhum risco conhecido de perda de dados; (6) backend, frontend e Flutter verdes; (7) fluxos principais
funcionando ponta a ponta; (8) KPIs refletindo execução real; (9) CI verde; (10) juntas registradas;
(11) porteiros pós-merge concluídos; (12) roteiro de demonstração e operação.

**Default de escopo aplicado enquanto o dono não decidir (§10.1):** *tudo o que está construído está à
venda.* É o gate mais estrito. Nenhum módulo sai do gate sem declaração escrita do dono.

**Dois degraus, e por quê.** O gate se divide em:
- **G1 — versão vendável:** tudo o que o código e o processo desta casa controlam. É o que este plano
  executa.
- **G2 — go-live com cliente:** o que depende de ato humano fora do repositório (conta no provedor, cartão,
  domínio, secrets, restore cronometrado, contratação do serviço de antivírus) e da junta que revoga o
  `REPROVADO PARA PRODUÇÃO` da J-6R (`deploy_bloqueado: true` só cai com ata nova). O G1 deixa o G2
  **pronto para executar**; não o executa. Declarar "vendável" com o G1 fechado e o G2 pendente é dizer,
  por escrito, que falta só o ato do dono.

## 3. Ordem — a lista de prioridades do dono é a chave

1 perda/corrupção de dados · 2 isolamento multi-tenant · 3 segurança e permissões · 4 faturamento e dinheiro ·
5 confiabilidade · 6 contratos e testes · 7 fluxos necessários para venda · 8 acabamento web/mobile ·
9 documentação e rastreabilidade. Dentro da mesma prioridade: **bloqueante do gate antes de risco
declarado**; **causa-raiz antes de sintoma**; **frente livre antes de frente com dependência**.

## 4. O gate, item a item

### 4.1 Bloqueantes do G1 — 36 itens

Coluna **reclass.**: o consolidador classificou como bloqueante um item que a fatia dava como não bloqueante
(ou condicional). Cada reclassificação cita o critério do dono que a sustenta e fica **à disposição do ataque
do crítico** (§8, conflitos mantidos).

| # | Item (pendência / achado) | Critério violado | Prova curta (fatia) | Bloco | reclass. |
|--:|---|---|---|---|:-:|
| 1 | `Ω6R-DAT-002` (P0) — saldo de estoque checado por agregado e inserido sem lock; `P-020` é o mesmo sítio | 5 | `inventory-prisma.repository.ts:214-216` sem `FOR UPDATE`/CAS (O6R, B1) | `B-O6R-04a` | |
| 2 | `Ω6R-DAT-003` (P0) — ajuste de contagem aplicado duas vezes / parcial | 5 | O6R §2.2 | `B-O6R-04a` | |
| 3 | `P-O6R-B11` — material do prestador some no restart (`QUA-005`) e o app lê o envelope da OS errado (`QUA-004`, 2 de 3 componentes) | 5 | `prestador_repository.dart:121` `forEach` sem `await`; `work_order_remote_api.dart:99,115,156` (B2; conferido pelo orquestrador) | `B-O6R-11` | ✓ |
| 4 | `P-008` — lista vazia vira 6 OS inventadas com aviso falso de "sem conexão"; create recusado pelo backend vira OS falsa (`OS-FALLBACK`) e o que o operador digitou se perde | 5, 7 | `frontend/.../work-orders.service.ts:28,46-50,60-72` (C1; conferido pelo orquestrador) | `B-SAN3-01` | |
| 5 | `P-MOBILE-FILA-OS-NAO-DRENADA` — "pedir aprovação" e "não consigo iniciar" entram na fila local e nunca saem; o backend nem aceita os dois tipos | 5 | `work_order_repository.dart:474,637` enfileiram; `sync_replay_service.dart:625+` drena só create/status/assign (AUSENTES; tipos conferidos pelo orquestrador) | `B-SAN3-16` | |
| 6 | `P-INFRA-RLS` — o runtime de produção conecta como superusuário; a RLS (segunda barreira) fica inerte — foi exatamente o que escondeu a soma entre organizações achada no #385 | 2 | `docker-compose.prod.yml:35,57` `postgres:postgres` (B1; conferido pelo orquestrador) | `B-SAN3-05` | ✓ |
| 7 | `Ω6R-SEC-002` residual (`P-O6R-SUBRECURSO-OBJECT-SCOPE`) — técnico não atribuído apaga anexo/blob e grava km em OS alheia (10 vias) | 3 | O6R §2.2; A1 | `B-O6R-07c` | |
| 8 | `Ω6R-SEC-004` residual (`P-O6R-B07B-SCANNER-AV-REAL`) — produção e staging respondem 503 a TODO upload (5 vias) | 7, 3 | `evidence-scanner.factory.ts:34` só `noop`/`unavailable`; `fly.*.toml` `NODE_ENV=production` (A2) | `B-AV-REAL` | |
| 9 | `P-027` — Financeiro e Estoque sem `dashboard:read`; a home para onde todo papel vai após o login abre em 403 | 3, 7 | catálogo × `RBAC_MATRIX.md:34` (C1) | `B-SAN3-04` | |
| 10 | `P-Ω4-FINANCE-READ-ORFA` — em modo real, Financeiro/Cobranças/Pagamentos saem do menu dos papéis Financeiro e Gestor | 3, 7 | `navigation.registry.ts:344-393` × catálogo (C2 — **provado por composição de leitura, não executado**) | `B-SAN3-04` | |
| 11 | `P-026` — usuário só `inventory` fica sem papel e recebe o menu inteiro do gestor | 3 | `auth.adapter.ts:220-238`, `appSidebarNav.ts:271-291` (C1) | `B-SAN3-04` | ✓ |
| 12 | `P-MOBILE-MINHAS-OS-SEM-FILTRO` — "Minhas OS" lista a organização inteira (1ª página de 20), sem filtro de atribuição | 3, 7 | `home_screen.dart:122` filtra só `tenantId`; `workOrdersForUser` sem chamador (AUSENTES; conferido pelo orquestrador) | `B-SAN3-13` | |
| 13 | `P-MOBILE-LGPD-GPS-SEM-PORTA` — o consentimento de GPS nunca pode ser dado (`/location` sem porta) | 3, 7 | `router.dart:232,410`; `geolocator_device_location_provider.dart:56-59` exige o consentimento (AUSENTES — efeito na captura: **hipótese forte, ramo não lido**) | `B-SAN3-17` | |
| 14 | `P-WEB-GATE-MODULO-INCOMPLETO` — 27 itens do menu fora do gate de módulo; nenhuma recusa por módulo achada no backend | 3 | `navigation.registry.ts` 36 caminhos × `MVP_NAV_PATHS` 51 (AUSENTES — backend **medido por padrões, não exaustivo**) — **condicional: venda por plano/módulo** (default: sim; o dono já anunciou planos) | `B-SAN3-18` | |
| 15 | `P-WEB-PLATAFORMA-SEGURANCA-FABRICADA` — Configurações da Plataforma mostram "MFA obrigatório para admins" ligado por literal | 3 | `PlatformSettingsPage.tsx:43-44` `<Toggle on />` (AUSENTES; conferido pelo orquestrador) | `B-SAN3-06b` | |
| 16 | `Ω6R-DIN-009` (P0) — replay de despesa paga duas vezes | 4 | O6R §2.2 | `B-O6R-03a` | |
| 17 | `P-Ω4-3-INVOICE-ATOMIC` + `P-Ω4-3-INVOICE-TOCTOU-DELETE` — faturamento grava título e carimba itens sem transação única; item apagado entre leitura e carimbo entra no título | 4 | `work-order-financial.service.ts:362-407` (C2); mesma classe do `Ω6R-DIN-001`, P0 fechado no #371 | `B-SAN3-02` | ✓ |
| 18 | `Ω6R-DAT-004` (P1) — perfil normativo vivo re-tempera diárias de custódia em curso | 4 | O6R §2.2 — **condicional: Pátios à venda** (default: sim) | `B-O6R-12` | |
| 19 | `P-O6R-B06-USAGE-BEST-EFFORT-RESIDUAL` + `P-O6R-B06-BASE-SEM-PRODUTOR` — base do rateio de nuvem perdida em silêncio (storage/jobs) e custo de API sempre `unallocated` | 4 | A2 — **condicional: repasse de custo de nuvem na oferta** (default: sim; Cloud Billing é tela bespoke do produto) | `B-SAN3-03` | ✓ |
| 20 | `P-WEB-FIN-BAIXA-E-CONTA-SEM-TELA` — pela web um título nunca vira pago nem caixa: não há tela de baixa nem de conta financeira, com o backend pronto | 7, 4 | `grep "/pay"` e `financial-account` em `frontend/src` = 0; backend `POST /financial-titles/:id/pay` (AUSENTES; conferido pelo orquestrador) | `B-SAN3-12` | |
| 21 | `Ω6R-QUA-001` — RDV no app nunca sincroniza | 7 | O6R §2.2 ("o fluxo RDV mobile NÃO funciona") | `B-O6R-03b` | ✓ |
| 22 | `Ω6R-QUA-002` — estoque no app não sincroniza | 7 | O6R §2.2 | `B-O6R-04b` | ✓ |
| 23 | `P-MOBILE-GUINCHO-ENTREGA-INALCANCAVEL` — o app cobre só a coleta; a perna de entrega nunca acende | 7 | `work_order_execute_screen.dart:94` sem `kind=delivery`; passos do guincho pulam de 2 para 5 (AUSENTES) | `B-SAN3-14` | |
| 24 | `P-MOBILE-PRESTADOR-SEM-PORTA` — o fluxo Prestador inteiro (diagnóstico, execução, materiais) não tem porta de entrada | 7 | `router.dart:159,339` únicos registros de `/service` (AUSENTES) | `B-SAN3-15` | |
| 25 | `P-MOBILE-CONCLUSAO-SEM-PORTA` — a tela de Conclusão (onde a comissão aparece) é inalcançável | 7 | `router.dart:165,345` sem `push/go` (AUSENTES — dada como condicional) | `B-SAN3-15` | ✓ |
| 26 | `P-MOBILE-ESTOQUE-TECNICO-FABRICADO` — o material faturável é escolhido de 8 SKUs escritos no código; o endpoint não existe | 7, 4 | `prestador_repository.dart:38-87` (AUSENTES; conferido pelo orquestrador) | `B-SAN3-15` | |
| 27 | `P-MOBILE-OS-SEEDS` (componente de purga) — seeds de OS no build padrão; as já gravadas no aparelho nunca são apagadas | 7 | `_upsertRemoteOrders` nunca apaga (AUSENTES, parcial 2c) | `B-SAN3-13` | |
| 28 | `P-PURCHASE-ORDERS-BACKEND-GATE` + `P-RBAC-GATING-MOCKSHELLS` — Pedidos e Relatórios no menu com linhas inventadas, sem endpoint; Console de Despacho com organização fixa | 7 | `PedidosPage.tsx:19`, `ReportsPage.tsx:5`, `DispatchConsolePage.tsx:9` (C2) | `B-SAN3-06a` | |
| 29 | `P-019` — Auditoria Global da plataforma 100% inventada ("0 incidentes", "48 organizações") | 7, 12 | `PlatformAuditPage.tsx:17-38` (C1) | `B-SAN3-06b` | |
| 30 | `P-WEB-CLOUD-BILLING-CARTAZ` + `P-WEB-PLATAFORMA-TELAS-FICCAO` — Cloud Billing é cartaz de literais com selo "IA"; Planos e Módulos, APIs e a lista de Organizações exibem dado inventado | 7, 12 | `PlatformCloudBillingPage.tsx` 245 l. sem um `useEffect`/`fetch`; `PlatformTenantsPage.tsx:18-19` ids fabricados (AUSENTES — dadas como "bloqueiam a demo honesta, não a venda") | `B-SAN3-06b` | ✓ |
| 31 | `P-CHK-SEED-DEMO-SUJO` — a organização da demonstração chama-se "Tenant Demo" na barra, na seleção e no dossiê impresso | 12 | `prisma/seed.ts:214,219` (C2) | `B-SAN3-07` | |
| 32 | `P-MOBILE-FAXINA-TERMOS-TECNICOS` — o app se chama "flutter_app" no Android; o cabeçalho mostra `field_technician`; placeholder técnico | 12 | `home_screen.dart:153-154,407`; `AndroidManifest.xml` (AUSENTES) | `B-SAN3-19` | |
| 33 | `P-Ω3F4C-ACTIVATION-PROMPT` — orçamento de serviço com "Exige endereço de destino" nunca é aprovado pela UI (422) | 7 | C1 | `B-SAN3-08` | |
| 34 | `P-Ω3a` — o papel Financeiro não consegue criar orçamento pela UI, e o select de OS recebe OS fabricadas | 7 | C1; a matriz diz que o Financeiro "constrói o orçamento" | `B-SAN3-08` | ✓ |
| 35 | `P-CHK-DOSSIE-VERSAO-NA-UI` — a vistoria substituída aparece como válida no dossiê | 5 | B1 — **condicional: dossiê vendido como prova** (default: sim) | `B-SAN3-11` | |
| 36 | `P-SAN-E2E` — nenhuma máquina prova os fluxos principais ponta a ponta; e não existe roteiro de demonstração e operação | 7, 12 | B1 | `B-SAN3-10` | |

**Nota — `Ω6R-DIN-005` e `Ω6R-DIN-007`** (P0, dinheiro) fecharam na `main` com o #385. O backfill deles é
pago neste PR (`fechado_por` com hash, `p0_fechados` 11 → 13).

### 4.2 Itens do G2 — go-live, fronteira do dono (6)

| Item | O que o G1 entrega | O que só o dono faz |
|---|---|---|
| `P-GOLIVE-GATES` | checklist de 12 passos de `docs/go-live-readiness.md` pronto (e a linha 76, que ainda diz "nenhum código bloqueia o go-live", corrigida) | R1/R2, staging verde, smoke autenticado, restore cronometrado; a junta que revoga `deploy_bloqueado` |
| `B-AV-REAL` (serviço) | cliente INSTREAM, config, testes, IaC do serviço | contratar/provisionar o serviço na conta do provedor; junta-5 |
| `P-SAN-PROD-BOOTSTRAP` | script idempotente e testado (`B-SAN3-09`) | executá-lo em produção |
| Papel de banco da produção | `B-SAN3-05` entrega o papel `NOSUPERUSER NOBYPASSRLS` e a trava de boot | criá-lo no banco gerenciado e trocar o secret |
| `Ω6R-PERF-003` (portal público) | condição escrita | expor o portal em container separado, ou não expor |
| Provedor (Fly × AWS) | nada muda sem decisão | a decisão (§10.2) |

### 4.3 Risco declarado e condicionais fora do gate — com a condição de cada um

| Item | Por que não bloqueia | Condição declarada |
|---|---|---|
| `Ω6R-ARQ-001/002/003`, `Ω6R-PERF-001` (jobs) → `B-O6R-08` | notificação perdida não é dado de negócio; sweeps idempotentes | **1 réplica**, restart automático; não escalar horizontalmente antes do `B-O6R-08` |
| `Ω6R-ARQ-004` (despacho sem evento) → `B-O6R-09` | visível e corrigível | depende do `B-O6R-08` |
| `Ω6R-PERF-002` → `B-O6R-10` | UX sob degradação, sem perda | p99 do backend < 30 s |
| `P-MOBILE-DESPACHO-SEM-PUSH` | objeção comercial, não defeito: o técnico vê a OS ao abrir o app | declarar o contorno manual; o dono decide se entra (§10.1) |
| `P-CHK-APLICABILIDADE-SEM-ROTA` | o motor existe, mas sem rota, permissão nem tela — não é funcionalidade entregue | entra se "checklist certo por tipo de serviço" for vendido (§10.1) |
| `P-WEB-FIN-CHEQUE-FECHAMENTO-COMISSAO-SEM-TELA` | backend pronto, sem tela — não é funcionalidade entregue ao cliente | entra se cheques/fechamento/política de comissão forem vendidos pela web (§10.1) |
| `P-O6R-B06-LEITURA-PLATAFORMA-SOB-FORCE-RLS` | só a visão de plataforma zera — **mas vira defeito vivo no dia em que o `B-SAN3-05` tirar o superusuário**, por isso entra no escopo dele | tratado no `B-SAN3-05` |
| `P-O6R-B06-RECONCILE-BLOQUEADO` | atinge só vistorias anteriores ao #385 | a junta do `B-O6R-06` decide o predicado; nenhum `--apply` na base viva antes |
| `P-009` (contraste abaixo de AA) | não impede demo | vira bloqueante se a venda exigir WCAG |
| demais ABERTAS (≈190 IDs de processo, arnês, borda e acabamento) | medidas uma a uma nas fatias | fila pós-gate (§7.3) |

### 4.4 O que as AUSENTES trouxeram para o registro

As **50 ausentes** entram no `pendencias.md` neste PR, cada uma com cabeçalho próprio e os campos que a fatia
mediu; as **8 parciais** entram como emenda da pendência que já existe (nunca como ID novo). As 15 de
governança não bloqueiam o gate e vão para a fila do §7.3 — entre elas, duas afirmações falsas que seguem
vivas no head: a skill `backend-review-ts-prisma` diz que teste `-db` "se auto-pula" no job `backend`
(`repo-erp.md:23`), quando o `ci.yml:15` define `DATABASE_URL`; e as receitas dos itens 1.1 e 3.3 do inspetor
seguem com `md5` cru, que fabrica divergência sob `core.autocrlf=true`.

## 5. Os blocos

Molde de cada bloco (todos preenchem): ID e branch · o que fecha · causa-raiz · escopo · DoD e teste de
encerramento (**vermelho hoje, verde depois**, com vermelho-controle no head-base) · KPI · junta · dependência ·
esforço. O **escopo exato em caminhos** (§C4) e o critério de aceite final são escritos pelo
`planejador-mestre` de cada bloco (Fable, §C7.6) a partir desta linha — o plano fixa a fronteira, não o diff.
Onde o plano autoriza um caminho normalmente proibido (`prisma/**`, `infra/**`, `.github/**`), a linha do bloco
diz qual e por quê; fora dessas linhas, o proibido do §C4 vale inteiro.

Esforço pela velocidade medida desta casa (§9): **P** ≈ 1–3 h · **M** ≈ 5 h no melhor caso · **G** ≈ 13 h no
melhor caso, 44–103 h com mais de um ciclo.

### 5.1 Frente 1 — backend de dado e dinheiro

| Bloco · branch | Fecha | Causa-raiz | Escopo (fronteira) | Teste de encerramento | KPI exercido | Junta | Dep. | Esf. |
|---|---|---|---|---|---|---|---|:-:|
| `B-O6R-04a` · `fix/inventory-consistency` | DAT-002, DAT-003, P-020 | leitura-decide-escreve sem lock nem CAS; fechamento de contagem sem guarda de unicidade | `src/modules/inventory/**` + suítes `-db` de estoque; proibido: financeiro, auth, mobile | 20 saídas concorrentes do mesmo item/custódia em Postgres real (2 conexões, barreira) → saldo nunca negativo; fechamento de contagem aplicado 2× → uma vez | backend | **unanimidade de 3** + crítico (invariante de dado) | B01 ✓ | G |
| `B-O6R-03a` · `fix/expense-sync-atomic` | DIN-009 | efeito e recibo de replay não atômicos; chave colide entre usuários | `src/modules/expenses/**`, `src/modules/mobile/*expense*` + `-db`; proibido: mobile | replay concorrente da mesma despesa → 1 lançamento; 2 usuários com a mesma chave local → 2 lançamentos | backend | **unanimidade de 3** + crítico (dinheiro) | B01 ✓ | G |
| `B-SAN3-02` · `fix/invoice-atomic` | INVOICE-ATOMIC, INVOICE-TOCTOU-DELETE | faturamento fora do `financial-uow` | `src/modules/work-orders/work-order-financial.service.ts` e repositórios; `-db` | falha injetada entre título e carimbo → nenhum dos dois persiste; item apagado durante o faturamento → fora do título; refaturamento → recusado | backend | **unanimidade de 3** + crítico | — | M |
| `B-SAN3-03` · `fix/cloud-billing-exato` | USAGE-BEST-EFFORT-RESIDUAL, BASE-SEM-PRODUTOR, AGGREGATE-DAILY-SEM-AGENDA, 2º `take: 100_000` (`cloud-charge-prisma.repository.ts:223`) | métrica de base gravada fora da transação do fato; chaves sem produtor | `src/modules/cloud-usage/**`, `cloud-cost-allocation/**`, `cloud-charges/**`, `src/infra/jobs/job.worker.ts` (só a gravação da métrica) | fault-injection na métrica de anexo/job → o fato e a unidade commitam juntos; toda `basisMetricKeys` tem produtor (censo); rateio com custo de API gera alocação ≠ `unallocated` | backend | **unanimidade de 3** + crítico | — | G |
| `B-O6R-12` · `fix/jurisdiction-profile-versioning` | DAT-004 | o motor de diárias lê o perfil vivo, não o regime do processo | `src/modules/jurisdiction/**`, `impound` (só leitura do regime) | editar o perfil com processo vivo → diárias do processo inalteradas; auditoria campo a campo | backend | **unanimidade de 3** + crítico; aceite provisório do `PLANO_O6R` é ratificado pela junta | — | M |

### 5.2 Frente 2 — isolamento, segurança e permissão

| Bloco · branch | Fecha | Causa-raiz | Escopo (fronteira) | Teste de encerramento | KPI exercido | Junta | Dep. | Esf. |
|---|---|---|---|---|---|---|---|:-:|
| `B-SAN3-05` · `fix/infra-rls-runtime-role` | P-INFRA-RLS; LEITURA-PLATAFORMA-SOB-FORCE-RLS | o runtime usa o papel dono do schema, que ignora a RLS | `docker-compose.prod.yml`, `src/config/env.ts` e `src/database/**` (trava de boot), `docs/deployment.md`, `scripts/` (criação do papel); **censo** de toda leitura de plataforma sem contexto de tenant | produção recusa subir como superusuário ou `BYPASSRLS` (teste de env); **a suíte `-db` inteira roda sob papel `NOSUPERUSER NOBYPASSRLS`** e o que quebrar entra no bloco; `/platform/cloud-usage/summary` soma 2 tenants sob esse papel | backend, backend-postgres | **unanimidade de 3** + `agente-dba-guardiao` + `agente-secops` | — | G |
| `B-O6R-07c` · `fix/o6r07c-subresource-scope` | SEC-002 residual (10 vias) | subrecursos da OS não reutilizam o escopo por objeto do `07a` | `src/modules/work-orders/**` (anexos, comentários, km/sync); **piso: vias 1, 2 e 10** | técnico não atribuído → 403 `not_assigned_to_actor` nas 10 vias, com vermelho-controle; papéis de escritório preservam a moderação de comentário (`D-Ω3F-5-COMMENT`) | backend | **unanimidade de 3** + `coordenador-de-acessos` | 07a ✓ 07b ✓ | G |
| `B-SAN3-04` · `fix/rbac-catalogo-x-matriz` | P-027, P-Ω4-FINANCE-READ-ORFA, P-026, resíduo de P-RBAC-CATALOG-MATRIZ | o catálogo de permissões e o registro de navegação divergem do `RBAC_MATRIX.md` | `src/modules/rbac/catalog.ts` (+ migração de grant aditiva, se o grant vive no banco — autorização de `prisma/migrations/**` só para isso), `navigation.registry.ts`, `frontend/src/modules/auth/auth.adapter.ts`, `appSidebarNav.ts` | teste que monta o menu com as permissões **reais** do catálogo para `finance`/`manager`/`inventory` (hoje vermelho) → Financeiro visível ao Financeiro; `/dashboard/summary` 200 para os dois; `inventory` com menu próprio | backend, frontend | **unanimidade de 3** + `coordenador-de-acessos` | — | M |
| `B-SAN3-18` · `fix/gate-de-modulo-no-backend` | P-WEB-GATE-MODULO-INCOMPLETO | o gate de módulo vive só no menu; o backend não recusa módulo não contratado | `navigation.registry.ts` (os 27 caminhos), middleware de módulo nas rotas, `frontend/src/layouts/appSidebarNav.ts` | organização sem o módulo → rota do módulo responde 403 nomeado (hoje 200) e o item some do menu; guard: todo caminho do menu está no registro | backend, frontend | **unanimidade de 3** + `coordenador-de-acessos` | `B-SAN3-04` (mesmos arquivos de navegação) | G |
| `B-SAN3-09` · `feat/infra-bootstrap-platform-admin` | P-SAN-PROD-BOOTSTRAP | não há caminho versionado para o 1º admin real | `scripts/bootstrap-platform-admin.ts` + teste | 2 execuções = 1 tenant de sistema + 1 admin; recusa sem a trava de produção | backend | **unanimidade de 3** + `agente-secops` | — | P |

### 5.3 Frente 3 — web e antivírus

| Bloco · branch | Fecha | Causa-raiz | Escopo (fronteira) | Teste de encerramento | KPI exercido | Junta | Dep. | Esf. |
|---|---|---|---|---|---|---|---|:-:|
| `B-SAN3-01` · `fix/web-wo-sem-fallback-fabricado` | P-008 (+ a contaminação do select de OS em P-Ω3a) | `catch` que devolve mock no lugar do erro | `frontend/src/modules/work-orders/**`, `useServiceQuoteReferences.ts`, `dispatches.service.ts` | 200 com lista vazia → `items: []`; create 422 → erro na tela, sem navegar; detalhe 404 → estado de erro; `grep OS-FALLBACK` = 0 | frontend | **unanimidade de 3** (perda do que o operador digitou) + `cognicao-visual` | — | M |
| `B-AV-REAL` · `feat/evidence-clamav-scanner` | SEC-004 residual | a factory do scanner não tem desfecho real | cliente INSTREAM próprio em `node:net` (sem dependência npm), `env.ts`, factory, IaC do serviço privado (autorizado `infra/**`/`fly.*.toml` só para isso), service container na CI (autorizado `.github/workflows/ci.yml` só para isso) | em `NODE_ENV=production` com clamd real: arquivo limpo → 201; EICAR montado em tempo de execução → 422; clamd fora → 503; limite estourado → 422 terminal (tabela da PD §4) | backend | **decisão do serviço: junta unânime de 5 + PD** (`PD-O6R-B07B-CLAMD-INSTREAM`, registrada neste PR); **código: unanimidade de 3** + `agente-secops` | junta-5 | M |
| `B-SAN3-08` · `fix/orcamento-destino-e-papel-financeiro` | P-Ω3F4C-ACTIVATION-PROMPT, P-Ω3a | a aprovação não pergunta o destino; o select de serviço do Financeiro vem vazio | `frontend/src/modules/registry/service-quotes/**` | orçamento com destino obrigatório → diálogo → OS criada; Financeiro cria orçamento | frontend | maioria de 3 + `cognicao-visual` | `B-SAN3-01` | M |
| `B-SAN3-12` · `feat/web-financeiro-baixa-e-contas` | P-WEB-FIN-BAIXA-E-CONTA-SEM-TELA | a web emite título e não liquida | `frontend/src/modules/finance/**` (baixa de título e contas financeiras sobre as rotas prontas) | título liquidado pela web → `paid` e lançamento em caixa, com o saldo da conta pelo endpoint real; estados §7; o botão só aparece com a permissão | frontend | **unanimidade de 3** (dinheiro) + `cognicao-visual` + `coordenador-de-acessos` | — | M |
| `B-SAN3-06a` · `fix/menu-sem-tela-ficticia` | PURCHASE-ORDERS-BACKEND-GATE, RBAC-GATING-MOCKSHELLS | telas de protótipo roteadas e no menu, sem dado | `frontend/src/modules/{purchasing,reports}/**`, `DispatchConsolePage.tsx`, `tenantNavigation.ts`, `App.tsx` | nenhuma tela do menu exibe dado constante (teste: sem API → vazio/erro, nunca `ROWS`); ou a tela sai do menu e da rota (default do §10.1) | frontend | maioria de 3 + `coordenador-de-acessos` + `cognicao-visual` | — | M |
| `B-SAN3-06b` · `fix/console-plataforma-sem-ficcao` | P-019, P-WEB-CLOUD-BILLING-CARTAZ, P-WEB-PLATAFORMA-TELAS-FICCAO, P-WEB-PLATAFORMA-SEGURANCA-FABRICADA | o console da plataforma foi montado sobre literais | `frontend/src/modules/platform/**` | Cloud Billing, Auditoria Global, Planos e Módulos, APIs e Organizações ligadas ao backend que existe (ou fora do menu, com o motivo); nenhum controle de segurança exibido sem a configuração real por trás; teste SSR sem API → nunca literal | frontend | **unanimidade de 3** (tela afirma controle de segurança) + `coordenador-de-acessos` + `cognicao-visual` | — | G |
| `B-SAN3-11` · `fix/dossie-versao-da-vistoria` | P-CHK-DOSSIE-VERSAO-NA-UI | o dossiê não distingue vistoria substituída | `frontend/.../vehicle-dossier/**` (+ DTO se preciso) | vistoria substituída aparece rotulada, nunca como vigente | frontend | maioria de 3 | — | P |
| `B-SAN3-07` · `fix/seed-demo-nome-de-negocio` | P-CHK-SEED-DEMO-SUJO | nome técnico no seed | `prisma/seed.ts` (autorizado só nesta linha) | guard: nenhum `name:` de organização do seed contém "Tenant"; re-seed em base descartável | backend | maioria de 3 | — | P |

### 5.4 Frente 4 — app de campo

| Bloco · branch | Fecha | Causa-raiz | Escopo (fronteira) | Teste de encerramento | KPI exercido | Junta | Dep. | Esf. |
|---|---|---|---|---|---|---|---|:-:|
| `B-O6R-11` · `fix/mobile-work-order-contracts` | QUA-004 (2 componentes), QUA-005 | envelope `{data}` parseado como corpo; enfileiramento sem `await` | `mobile/flutter_app/lib/features/{work_orders,prestador}/**` + testes | Dio fake com `{data:{…}}` → detalhe/status/assign corretos; assign envia o campo que o backend lê; N SKUs enfileirados + restart → N ações | flutter | **unanimidade de 3** (perda de dado) | B01 ✓ | M |
| `B-SAN3-13` · `fix/mobile-minhas-os` | P-MOBILE-MINHAS-OS-SEM-FILTRO, purga de P-MOBILE-OS-SEEDS | a lista filtra só por organização; o upsert remoto nunca apaga | `mobile/.../work_orders/**`, `home_screen.dart`; backend: filtro `assignedUserId` + paginação no `GET` de OS do app | técnico A vê só as OS atribuídas a ele (hoje vê as de B); seed gravado no aparelho some no próximo sync | flutter, backend | **unanimidade de 3** (escopo por objeto) + `coordenador-de-acessos` | `B-O6R-11` (mesmos arquivos) | M |
| `B-SAN3-16` · `fix/mobile-fila-os-drenada` | P-MOBILE-FILA-OS-NAO-DRENADA | o replay só conhece 3 tipos; o backend não aceita os outros 2 | `core/sync/sync_replay_service.dart`, `src/modules/mobile/**` (vocabulário de ação) | "pedir aprovação" e "não consigo iniciar" offline → após sync, a aprovação existe no backend e a fila fica vazia; tipo desconhecido → erro visível, nunca silêncio | flutter, backend | **unanimidade de 3** (perda de dado) | `B-SAN3-13` (mesmos arquivos) | M |
| `B-SAN3-14` · `fix/mobile-guincho-entrega` | P-MOBILE-GUINCHO-ENTREGA-INALCANCAVEL | a navegação nunca passa `kind=delivery` | `mobile/.../work_orders/ui/**`, `work_order_steps.dart` | OS de guincho percorre coleta **e** entrega no app, com o checklist de entrega | flutter | maioria de 3 + `cognicao-visual` | `B-SAN3-16` (mesmos arquivos) | M |
| `B-SAN3-15` · `fix/mobile-prestador-porta-e-estoque` | P-MOBILE-PRESTADOR-SEM-PORTA, P-MOBILE-CONCLUSAO-SEM-PORTA, P-MOBILE-ESTOQUE-TECNICO-FABRICADO | telas construídas sem navegação; estoque do técnico sem endpoint | `mobile/.../prestador/**`, router; backend: endpoint de estoque do técnico (`src/modules/inventory/**`, leitura por custódia) | do detalhe da OS se chega ao fluxo Prestador e à Conclusão; o material vem do estoque real da custódia do técnico (teste: SKU fora da custódia não aparece) | flutter, backend | **unanimidade de 3** (material faturável) | `B-O6R-04a` (estoque), `B-SAN3-14` (mesmos arquivos) | G |
| `B-SAN3-17` · `fix/mobile-consentimento-gps` | P-MOBILE-LGPD-GPS-SEM-PORTA | a tela de consentimento não tem porta | `mobile/.../location/**`, Home/Perfil | o técnico dá e revoga o consentimento pelo app; sem consentimento nada é capturado (o ramo é **lido e testado** — a fatia deixou como hipótese) | flutter | **unanimidade de 3** (dado pessoal) | — | M |
| `B-O6R-04b` · `fix/mobile-inventory-sync` | QUA-002 | contrato de estoque do app não persiste | `mobile/.../inventory/**` + contrato | movimento de estoque no app → persistido no Prisma, sobrevive a restart | flutter, backend | **unanimidade de 3** | `B-O6R-04a` | M |
| `B-O6R-03b` · `fix/mobile-rdv-sync` | QUA-001 | RDV do app nunca autentica o sync | `mobile/.../expenses/**` | RDV criado offline → sincroniza com sessão válida; replay → 1 | flutter, backend | **unanimidade de 3** | `B-O6R-03a` | M |
| `B-SAN3-19` · `fix/mobile-faxina-termos` | P-MOBILE-FAXINA-TERMOS-TECNICOS | termos técnicos e nome de template no app | `android/app/src/main/AndroidManifest.xml`, `home_screen.dart`, `module_placeholder_screen.dart` | o app se chama pelo nome do produto; nenhum papel técnico cru na UI (guard de texto) | flutter | maioria de 3 + `cognicao-visual` | — | P |

### 5.5 O bloco que fecha o gate

| Bloco · branch | Fecha | Escopo | Teste de encerramento | Junta | Dep. | Esf. |
|---|---|---|---|---|---|:-:|
| `B-SAN3-10` · `test/e2e-fluxos-e-roteiro` | P-SAN-E2E; critérios 7 e 12 | E2E dos fluxos principais por persona (OS: criar → despachar → executar no app, coleta e entrega → faturar → **baixar**; orçamento → OS; RDV; estoque; checklist com evidência; pátio) em base descartável, com a execução publicada; `docs/ROTEIRO-DEMO-E-OPERACAO.md` | cada fluxo roda ponta a ponta e o resultado é publicado com N e forma; o roteiro é executado uma vez por quem não o escreveu | maioria de 3 + `master-teste-telas-rotas` | **todos os blocos do §5.1–5.4** | M |

**Encerramento de todo bloco (não se pula por urgência):** plano do `planejador-mestre` (Fable) → dev → bateria
exata (§9 do contrato) → KPI no próprio PR com execução real → `inspetor-de-terreno-da-junta` → junta → CI
verde → squash + `--delete-branch` → limpeza §C5 → `porteiro-pos-merge` → backfill no PR seguinte. Blocos em
paralelo **não** dispensam nenhum passo; a colisão em `Kpis/*` e `pendencias.md` é resolvida na absorção do
segundo a mergear (precedente: a colisão de `blocks_completed` do #385).

**KPI da rodada.** Este PR não publica número novo (sem entrada no history — precedente #382): só o backfill do
#385. A rodada SAN3 entra no painel com o primeiro bloco que entregar, com a visualização no mesmo PR
(§C3.1). O `mvp_vendavel` (88%) e o `mvp_demo` (99%) são estimativas **anteriores** a este inventário: ficam
intocados (§C3.4), com nota explícita no card e em `limitations`, e são **recalculados no `B-SAN3-10`** — publicar
88% como se fosse medida, diante de 36 bloqueantes, violaria o critério 8 do dono.

## 6. Dependências

```
B-O6R-04a ──► B-O6R-04b          B-O6R-03a ──► B-O6R-03b          B-SAN3-01 ──► B-SAN3-08
B-O6R-04a ──► B-SAN3-15          B-SAN3-04 ──► B-SAN3-18          junta-5 (serviço) ──► B-AV-REAL
frente 4, em série por tocar os mesmos arquivos: B-O6R-11 ► SAN3-13 ► SAN3-16 ► SAN3-14 ► SAN3-15
todos os blocos do §5.1–5.4 ──► B-SAN3-10 (E2E + roteiro) ──► GATE G1
B-O6R-08 ──► B-O6R-09            (fora do gate — risco declarado)
```

Sem dependência de código entre as frentes, mas uma de honestidade: o `B-SAN3-06b` liga o Cloud Billing ao
backend que existe, e o `B-SAN3-03` conserta a exatidão desse backend — a demonstração do Cloud Billing só é
honesta com os dois mergeados.

## 7. Registro e governança

### 7.1 A causa dos flips — e o que este PR faz com ela

O registro é só-apensar (§A2) e o índice lê **a linha `status:` de cada entrada**. Quando o conserto chega
por outro bloco, ou quando o fechamento é escrito noutra seção, a linha original não muda e a pendência fica
"aberta" para sempre. Formas medidas na fatia B1: (a) bloco posterior fecha sem citar a entrada; (b) guia de
preparação consumido pelo próprio bloco que guiava; (c) fechamento escrito noutra seção, em ID duplicado ou em
`decisoes.md`. **Este PR reescreve a linha canônica** de cada flip (valor antigo preservado na própria linha)
e regenera o índice. A **prevenção** (guard que falha quando um PR fecha achado/pendência sem editar a linha)
é o `B-GOV-GUARD-DERIVADOS`, pós-gate.

### 7.2 Defeitos da ferramenta de registro e da documentação (nenhum bloqueia o gate)

- `severidade()` lê menção, não o campo (§1) → `P-SAN3-INDICE-SEVERIDADE-POR-MENCAO`.
- a coluna "dono" diz `sim` para "a atribuir" → `P-SAN2-2-INDICE-DONO-SEMPRE-SIM` (existente).
- valor de status em negrito é invisível → `P-STATUS-NEGRITO-INVISIVEL-AO-GERADOR` (existente).
- `classificar()` lê **só a primeira** linha de status, e a regra 2 do próprio script ("parcialidade nunca
  fecha") **não está implementada** para ela: a checagem roda sobre `m.group(0)`, que termina na palavra de
  status. **Medido em bancada neste PR** (cópia fora do repo, entradas de teste): duas linhas opostas → decide
  a primeira, sem `CONTRADITORIA`; `status: FECHADA — parcialmente superado` → FECHADA; e o controle
  `status: RESOLVIDO PARCIAL — quatro residuais abertos` — a forma exata que o cabeçalho do script diz ter
  consertado — **sai FECHADA**. É por isso que `P-O6R-B07` sai ABERTA hoje (a linha ABERTA vem antes da
  FECHADA), não pela regra 2. → `P-SAN3-INDICE-SO-PRIMEIRA-LINHA-DE-STATUS`, dono `B-REG-GERADOR`.
- contagens defasadas: `P-O6R-BACKLOG` (29/30 → 32 achados), `P-KPI-RECENT-CONGELADO` (13 PRs de atraso),
  `P-KPI-HISTORY-MD-BACKLOG`, `P-SAN-KPI-BACKFILL` (materializado), o `roadmap` do painel parado em
  2026-08-19 marcando como `a_fazer` blocos já mergeados, e `PROJECT_MEMORY.md` dizendo que o `B-O6R-02` está
  no ciclo 5.
- afirmações falsas vivas: `docs/go-live-readiness.md:76` ("nenhum código bloqueia o go-live"); a skill
  `backend-review-ts-prisma` (`repo-erp.md:23`); o dossiê do `B-GOV-ELENCO` cita `P-GOV-MODELO-CODEX-SEM-NOME`,
  que não existe no registro.
- dono órfão: `P-O6R-B01-RELIGACAO-SEM-REMEDIO` nomeia o `B-O6R-07`, que mergeou em 07a/07b sem tocar o item →
  o `planejador-mestre` do `B-O6R-07c` diz se cabe nele; se não, ganha bloco próprio pós-gate.

### 7.3 Fila pós-gate (prioridades 5–9)

`B-O6R-08` → `B-O6R-09`, `B-O6R-10` (PERF-002), `B-REG-GERADOR`, `B-GOV-GUARD-DERIVADOS`, `B-GOV-CI-AUDITOR`,
`B-ARNES-2`, `B-REG-TYPECHECK-TESTS`, `B-KPI-F-HISTORY-MD`, as 15 ausentes de governança e as ABERTAS de
acabamento e processo, na ordem de prioridade do dono, cada uma com o dono e o teste que a fatia registrou.

## 8. O que este plano corrige no `PLANO_O6R` (a revisão adversarial, item a item)

1. **O `PLANO_O6R` só cobria os 32 achados da auditoria.** Ignorava as 231 pendências do registro e as 50 que
   nem registro tinham. Dessas, **27 dos 36 bloqueantes do gate** vêm de fora da auditoria. Acrescentados, com
   bloco.
2. **O bloco 07 virou três e o plano não sabia.** 07a (#369) e 07b (#380) mergearam; o residual do SEC-002 não
   tem bloco (`B-O6R-07c`) e o do SEC-004 está **fora do plano** (`B-AV-REAL`). Os dois entram. O painel ainda
   marca `B-O6R-07 = a_fazer` — leitura enganosa registrada.
3. **Blocos G foram quebrados em fatias verticais** (`04a/04b`, `03a/03b`, `06a/06b`): o P0 do backend não
   espera o contrato do app, e a ficção do menu das organizações não espera o console da plataforma.
4. **O aceite do `B-O6R-12` era provisório e nunca foi ratificado** (adendo de 2026-08-16). A junta do bloco o
   ratifica antes da primeira linha.
5. **Duplicatas marcadas, sem fusão silenciosa:** `P-020` ≡ `Ω6R-DAT-002`; `P-ARNES-CANONICA1-VERMELHO-
   AMBIENTAL` ≡ `P-O6R-B02-CRASH-NO-LOAD-SEM-SKIP`; `P-REG-BATERIA-NAO-TYPECHECA-TESTS` ≡
   `P-TESTS-FORA-DO-TYPECHECK`; `P-RBAC-GATING-MOCKSHELLS` e `P-PURCHASE-ORDERS-BACKEND-GATE` (mesma causa);
   `P-RBAC-CATALOG-MATRIZ` e `P-RBAC-CHECKLIST-DRIFT` (mesma matéria). O sync de RDV sem `Authorization` das
   sínteses de produto **é** o `Ω6R-QUA-001` — não entrou duplicado.
6. **Pendências que faltavam:** as 50 ausentes (§4.4) e o segundo `take: 100_000` silencioso
   (`cloud-charge-prisma.repository.ts:223`), mesma classe do `Ω6R-DIN-007` — emenda em
   `P-O6R-B06-RATEIO-CURSOR-100K`.
7. **Conflitos mantidos e registrados (§A2), não resolvidos em silêncio:**
   - `P-O6R-B11`: o inventário Ω6R o dava como risco declarado; a fatia B2 e este plano, como bloqueante —
     critério 5 do dono, literal ("nenhum risco **conhecido** de perda de dados").
   - `P-INFRA-RLS`, `P-Ω4-3-INVOICE-*`, `P-Ω3a`, `P-026`, `QUA-001`, `QUA-002`, `USAGE-BEST-EFFORT` +
     `BASE-SEM-PRODUTOR`, `P-MOBILE-CONCLUSAO-SEM-PORTA` e a ficção do console da plataforma: as fatias os
     davam como não bloqueantes ou condicionais; este plano os leva ao gate pelo critério citado em cada linha
     do §4.1 e pelo default de escopo estrito. **Alvo explícito do crítico.** Sobre a ficção da plataforma, a
     fatia AUSENTES escreveu "bloqueia a demo honesta, não a venda"; aqui a leitura é que o critério 12
     (roteiro de demonstração) e o 3 (a tela afirma um controle de segurança que não existe) a alcançam, e que
     tratá-la diferente da Auditoria Global — que a fatia C1 já dava como bloqueante — seria incoerência.
   - `P-GOLIVE-GATES`: a fatia B1 o dava como bloqueante; aqui ele é **G2** — bloqueia o go-live, não a
     declaração da versão vendável, porque depende de ato que só o dono pratica.
   - `P-Ω4-FINANCE-READ-ORFA` foi provado por **composição de leitura**, não por execução: o primeiro passo do
     `B-SAN3-04` é o teste que o reproduz; se ele sair verde no head-base, o item cai do gate e a junta registra.
     O mesmo vale para o efeito na captura do `P-MOBILE-LGPD-GPS-SEM-PORTA` e para a recusa de módulo no
     backend do `P-WEB-GATE-MODULO-INCOMPLETO` (medida por padrões de nome, não exaustiva).
   - `D-INFRA-PROVIDER` (Fly.io, junta 5/5) × `D-TRACCAR-HTTP-PRIVADO-AWS` (dono): registrado em `decisoes.md`.

## 9. Viabilidade — o prazo de 48 horas

**Quantidade exata.** 36 bloqueantes do G1 em **28 blocos**: 8 G (`04a`, `03a`, `07c`, `SAN3-03`, `SAN3-05`,
`SAN3-06b`, `SAN3-15`, `SAN3-18`), 16 M, 4 P. Mais 6 itens de G2 que dependem do dono. Mais este PR (plano +
registro).

**Velocidade real desta casa** (primeiro commit → merge, os 8 PRs da rodada Ω6R, `gh pr view`):
#360 1,3 h · #353 1,4 h · #359 4,9 h · #380 12,8 h · #357 44,1 h · #369 57,0 h · #385 102,7 h · #371 376,7 h.
**Mediana 44,1 h.** Bloco G mais rápido já medido: 12,8 h (#380). **Metade dos 8 (#357, #369, #385, #371)
passou de 44 h** — os quatro tiveram mais de um ciclo de junta, delta ou achado de terreno no caminho.

**Caminho crítico (melhor caso: 4 frentes, cada G em 13 h, cada M em 5 h, cada P em 1,5 h):**
- frente 1: `04a` → `03a` → `SAN3-02` → `SAN3-03` → `B-O6R-12` ≈ **49 h**;
- frente 2: `SAN3-05` → `07c` → `SAN3-04` → `SAN3-18` → `SAN3-09` ≈ 46 h;
- frente 3: `SAN3-01` → `AV-REAL` → `SAN3-08` → `SAN3-12` → `SAN3-06a` → `SAN3-06b` → `SAN3-11` → `SAN3-07` ≈ 41 h;
- frente 4: `11` → `SAN3-13` → `SAN3-16` → `SAN3-14` → `SAN3-15` → `SAN3-17` → `04b` → `03b` → `SAN3-19` ≈ 50 h
  (`04b` e `03b` só começam depois do `04a` e do `03a` da frente 1, que terminam em ≈ 13 h e ≈ 26 h — cabe);
- depois, `B-SAN3-10` (≈ 5 h), e antes de tudo este PR (≈ 3 h): **≈ 58 h de relógio.**

**Mesmo no melhor caso, não cabe em 48 h.** E o melhor caso supõe as quatro frentes rodando juntas, o que
esta sessão já viu falhar: o limite de sessão derrubou 8 agentes em paralelo às 05:10.

**Estimativa realista:** as frentes 1 e 2 têm **3 blocos G em série cada**; com metade dos G passando de 44 h
(a mediana medida), cada uma vai a 3 × 44 h + os M ≈ 150 h, e o caminho crítico a **7–10 dias**.

**Bloqueios fora do código:** junta unânime de 5 do `B-AV-REAL` (serviço com custo recorrente); os 6 itens de
G2; as decisões do §10.1 (se o dono tirar um módulo do escopo, os bloqueantes condicionais dele saem do gate
por escrito); o limite de modelo (Fable) dos 4 gates fixados nele.

**Ordem de execução:**
1. Este PR → junta → merge → porteiro.
2. Quatro frentes em paralelo, cada uma na ordem do seu parágrafo acima. A junta-5 do `B-AV-REAL` roda assim
   que o plano for aprovado, sem esperar vez na frente 3.
3. `B-SAN3-10` (E2E + roteiro) → declaração do G1 com ata.
4. Então, e só então, o Traccar (§11).

## 10. O que só o dono decide

Só entra aqui o que o código, a junta ou o contrato **não podem** resolver. Para cada uma: o que trava e o
**default conservador** aplicado se o dono não responder — nunca uma redução de escopo.

1. **Escopo da versão vendável.** Default: tudo o que está construído está à venda. Os itens que saem do gate
   se o dono tirar o módulo: Pátios/diárias (`B-O6R-12`), dossiê como prova (`B-SAN3-11`), repasse de custo de
   nuvem (`B-SAN3-03`), venda por plano/módulo (`B-SAN3-18`), RDV e estoque no app (`B-O6R-03b`, `B-O6R-04b`).
   E os que só entram se o dono pedir (hoje não há funcionalidade entregue ao cliente): cheques, fechamento e
   política de comissão pela web; checklist por tipo de serviço; push de despacho. E uma escolha própria:
   **Pedidos e Relatórios reais na versão vendável, ou fora do menu até existirem?** Default do `B-SAN3-06a`:
   fora do menu (tela sem dado não é funcionalidade).
2. **Onde a versão vendável roda:** Fly.io (`D-INFRA-PROVIDER`, junta 5/5, config versionada) × AWS (a decisão
   do Traccar pressupõe rede privada AWS). Default: nada muda de provedor sem decisão escrita.
3. **Traccar:** o ERP inteiro vai para a AWS, ou só o Traccar? Trava o Dia 1 do Traccar, não o saneamento.
4. **Convivência app × Traccar** ("quero ver o custo dos dois", 2026-09-08): estudo no Dia 1 do Traccar.
5. **Produto (fora do gate):** vistoria com divergência é faturada? (`P-O6R-B06-DIVERGENCIA-MOBILE-NAO-
   FATURADA`); des-compensar cheque (`P-O6R-B02-CHEQUE-UNCLEAR`); estorno de título em disputa
   (`P-O6R-B02-INDISPUTE-RESTORE`).
6. **Governança (dossiê de 2026-09-09):** onde as sessões nascem (`P-GOV-CAMINHO-REPO-SESSAO`, reincidente
   hoje); destino do assento permanente; PR de governança sem porteiro; `docs/claude-code-handoff/CLAUDE.md`;
   `.claude/agents/especialistas/` no `.gitignore`.

**NÃO é decisão do dono** (para ninguém escalar à toa): (a) `B-O6R-07c` × `D-Ω3F-5-COMMENT` — o guard do 07a
(`assertMutationObjectScope`, `work-order.service.ts:808-840`) escopa o técnico e deixa a moderação dos papéis
de escritório como está; **hipótese** a confirmar pelo `planejador-mestre` no código, e só vira pergunta se
ele medir o contrário. (b) `B-AV-REAL`: serviço novo → junta unânime de 5 + PD; o dono é informado.

## 11. Depois do gate: Traccar

Decisão registrada em `agent-orchestration/controle/decisoes.md` (`D-TRACCAR-HTTP-PRIVADO-AWS`): o Traccar
alimenta os módulos que já existem, por HTTP privado dentro da AWS, sem exposição externa. Arquitetura,
multi-tenant (quarentena, falha fechada), idempotência, segurança do endpoint, confiabilidade e o plano de 4
dias estão lá. **Nenhuma linha de integração nasce antes do G1.**
