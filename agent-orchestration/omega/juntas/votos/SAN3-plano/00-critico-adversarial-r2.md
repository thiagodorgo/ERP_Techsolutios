# Parecer do critico-adversarial — PR #386 (SAN3) — rodada 2 de 2 (a ultima)
Ref julgada: 544ab67f (docs/san3-plano-saneamento), base origin/main@15ef3fbe. Rodada 1 julgou 31e04f6c.
Gravacao incremental (P2). Achados CR2-NN abaixo, na ordem em que foram medidos.
Terreno: somente leitura; leitura por `git show 544ab67f:<caminho>`; gerador rodado so em copia fora do repo.

## Medicoes de base (a favor do PR, registradas para nao serem remedidas)
- indice commitado em 544ab67f == saida do gerador rodado em copia fora do repo: `cmp` -> BYTE-IDENTICO (md5 896b361e...). Indice da base 15ef3fbe tambem byte-identico ao gerador (310 cab / FECHADA 72 / ABERTA 238).
- `git diff --numstat 15ef3fbe 544ab67f -- agent-orchestration/controle/pendencias.md` -> 1099 +, 57 -. Script difflib: as 57 linhas removidas sao linhas de status/continuacao; todas reaparecem na linha nova apos "Valor anterior, preservado: "..."" (7 so casavam com aspas inseridas; conferidas uma a uma). NADA APAGADO.
- 31 linhas `status: FECHADA` acrescentadas; todas sao a 1a linha de status do seu cabecalho (efetivas no gerador). Nivel cabecalho: FECHADA 72 -> 103 (+31). Nivel ID: 29 transicoes A->F + 2 IDs de cabecalho duplo (P-O6R-B02, P-WORKTREE-INTEROP-ORFAO) que ja tinham 1 cabecalho F.
- Amostragem FECHADA por presenca em 15ef3fbe: 19/31 conferidas, 19 presentes (P-012, P-018, P-029, P-031, SAN-CORE-PRISMA-COV, Ω3F1-ENTITYTYPE, Ω3F6-STATUS-BYPASS, Ω3F6-TERMINAL-GUARD, Ω3F6-ZERO-ATOMICIDADE, Ω4-4-REVERSE-IDEM, Ω4-7-CLEAR-ATOMIC, Ω4-7-ENTRY-OWNERSHIP, Ω4-7-CLEAR-RETRO, CHECKLIST-BUILDER-READONLY, WOTS-FRONT-ACCESS, SCALE-RBAC-OWNER-APPROVAL, PLATFORM-TENANTDETAIL-REAL, ARNES-AUTO-DEFEITOS, GOV-INSPETOR-33). P-PLATFORM-MOCK-WIRING: escopo original = exatamente as 3 paginas; FECHADA correto, com emenda apontando a ficcao restante.
- Amostragem de ausentes por presenca em 15ef3fbe: 6/6 presentes (MINHAS-OS home_screen.dart:120-122 + workOrdersForUser l.88 sem chamador; FILA-OS replayTenant so {create,statusUpdate,assign}, approvalRequest/unableToStart = 0 em core/sync e src/modules/mobile; BAIXA-SEM-TELA /pay e financial-account = 0 em frontend/src; SEGURANCA-FABRICADA PlatformSettingsPage.tsx:43-44 `<Toggle on />`; ESTOQUE-FABRICADO 8 TechnicianStockItem; SYNC-ARGV l.25).
- Fatia AUSENTES: 50 IDs de tabela; 49 registrados; o unico fora e P-GOV-MODELO-CODEX-SEM-NOME. Razao procede: `git show 15ef3fbe:AGENTS.md` l.524-528 nomeia GPT-6 Astra/GPT-5.6 Sol, entrou em 90d30f8a (#381); o sync preserva `model:` por desenho (sync-agent-agents.mjs:49-50). A evidencia da fatia ("AGENTS.md sem ID de modelo OpenAI") era falsa no head medido — a reconfirmacao funcionou.
- Todos os caminhos de ARQUIVO do §5 existem em 15ef3fbe; os 3 marcados "novo" (docs/ROTEIRO-DEMO-E-OPERACAO.md, scripts/bootstrap-platform-admin.ts, fly.clamav.toml) nao existem. (Nota de ferramenta: meu 1o laco conferia so o diretorio pai por `${q%/**}`; refeito arquivo a arquivo.)
- Aritmetica do §9 refeita: F1 3G+2M=49; F2 3G+2M+P=50,5; F3 1G+7M+3P=52,5; F4 1G+7M+1P=49,5 (G=13); esperas: 04a 13h<SAN3-15 15h; 07c 26h<SAN3-16 28h; SAN3-04 31h<SAN3-07 34,5h; 03a 26h<03b ~43h. Contagem 9G/18M/5P=32 confere; todo item 1-44 tem bloco e todo bloco fecha item.

## ACHADOS DA RODADA 2

## CR2-01 - linha 2/3 - BLOQUEIA - dois blocos de dinheiro nao fecham o item dentro da fronteira
- B-SAN3-02 (itens 20-21): migration 20260811000000_add_invoicing l.25-27: UNIQUE INDEX financial_titles_wo_direction_active_key ON (tenant_id, work_order_id, direction) WHERE deleted_at IS NULL AND work_order_id IS NOT NULL. O banco recusa 2o titulo a receber da mesma OS mesmo com o 1o pago; work-order-financial.service.ts:357-359 findActiveByWorkOrder -> already_invoiced. Atomicidade: financial-title.service.ts:122 createForWorkOrder sem variante de unidade (grep uow/unit/ctx = 0) -> exige editar financial-titles/**. Fronteira: work-order-financials/** + -db, sem prisma.
- B-SAN3-20 (item 22): model Cheque so tem account_id/cleared_entry_id/bounce_entry_id, sem title_id; decisoes.md:690-692 D-Ω4-7-NO-TITLE "title_id FORA de escopo". Teste pressupoe o vinculo. Fronteira sem prisma.
- grep no plano: NO-TITLE 0, D-Ω4-C1 0, wo_direction 0, anti-refatur 0; §8.7 sem o conflito.
- motivo: §12 diz da CR1-12 "autorizado pelo nome onde o teste exige" - falso nos dois; o planejador que obedece a fronteira nao chega ao verde; fechar reverte decisao registrada sem conflito escrito (§A2) nem linha no §10.

## CR2-02 - linha 2/3 - BLOQUEIA - o pre-requisito medido do item 9 nao esta no plano
- pendencias.md@544ab67f L7362 P-O6R-B06-LEITURA-PLATAFORMA-SOB-FORCE-RLS (ALTA, ABERTA); fatia A2 l.34: RlsPrismaCloudUsageRepository.listEvents (l.166-173) e listDailyAggregates (l.190-197) sem withTenantRls; migracao 20260611000000 com FORCE RLS.
- fatia B1 l.18 (P-INFRA-RLS), dependencias: "pre-requisito para trocar o papel".
- grep LEITURA-PLATAFORMA no plano = 0. Codigo em cloud-usage/** (fronteira do SAN3-03); a do SAN3-05 nao alcanca; §6 sem aresta.
- motivo: item 9 so fecha com a troca de papel pelo dono; nesse instante a visao de uso de nuvem da plataforma zera (a que o SAN3-06b liga, item 40). Classe da CR1-08.

## CR2-03 - linha 3 - AJUSTE - a regra unica do §2 segue desigual
- P-Ω3F6 (B1, risco 4): work-order.service.ts:1414 "FOR UPDATE (hardening futuro)"; cancel() :1393 sem client_action_id; excluida por "janela sub-ms" (excecao que o §2 proibe). Plano: so §8.5 l.344.
- P-O6R-LISTCOSTLINEITEMS-SEM-ESCOPO-IMPORT (B2, risco 4): cloud-cost-allocation-prisma.repository.ts:208 listCostLineItems(periodStart, periodEnd) sem import_id -> reimport soma custo 2x (cobranca a maior); excluida por "um import por periodo". Plano: 0.
- P-RBAC-CHECKLIST-DRIFT/CATALOG-MATRIZ (B1, risco 3): catalog.ts:572,574 manager com checklist_runs:update/:acknowledge alem de RBAC_MATRIX.md:43-44. Plano: so §8.5 l.343.
- P-KPI-ROADMAP-CONGELADO (L8867, registrada por este PR): roadmap as_of 2026-08-19, B-O6R-02 e B-O6R-07 a_fazer ja mergeados - criterio 8; §7.2 "nenhum bloqueia".
- inverso: item 11 crit.3 (backend ja filtra, work-order.service.ts:409); item 18 crit.3 (emenda: "bloqueia o go-live, nao a demo"); itens 41-43 por "linguagem da UI", fora do crit.12 literal.
## CR2-04 - linha 2 - AJUSTE - fronteiras que existem mas nao cobrem o codigo do item
- B-O6R-12: ImpoundProcess nasce em impound/impound-prisma.repository.ts:69,114; charging le o perfil vivo por JOIN (charge-prisma.repository.ts:229); fronteira sem impound/**.
- B-SAN3-12: tela de conta pede rota em frontend/src/App.tsx (l.110-114, 656) e menu em appSidebarNav.ts:93-97; fronteira so finance/**.
- B-SAN3-18: "middleware (novo) e as rotas dos 27 caminhos" sem caminho; routers em >=12 modulos de outros blocos ou src/app.ts (68 app.use).
- motivo: o §12 conferiu existencia, nao cobertura (§C4).

## CR2-05 - linha 2 - AJUSTE - arestas de mesmo arquivo ausentes (criterio do §6)
- env.ts SAN3-05 (0-13h) x AV-REAL (5-10h); appSidebarNav.ts SAN3-18 (31-44h) x SAN3-06a (36-41h); checklists/** SAN3-03 (36-49h) x SAN3-22 (47,5-52,5h); work-order.routes/service 07c x SAN3-13; mobile/** do 03a x mobile-work-order-sync.ts do 07c (13-26h ambos).

## CR2-06 - linha 5 - AJUSTE - o objeto mergeado carrega numeros e premissas da v1
- kpis-latest.json l.59 e l.122, app.js:1623: "36 bloqueantes" x 44 no plano/status/log.
- pendencias.md L487 e L3296 (deste PR): "tabela de bloqueantes do G1" - v3 sem G1.
- L487: docker-compose.prod.yml "conecta como superusuario, a RLS fica inerte - escondeu a soma do #385" - premissa da CR1-06 que o item 9 retirou.
- status-geral.md:4381 e log-execucao.md:4309 "FECHADAS 73 -> 103": a base e 72.

## CR2-07 - linha 1/4 - AJUSTE - junta do PR declarada contra 3 dos 4 riscos
- plano l.11-12 omite seguranca (CLAUDE.md@ref l.374); o PR fecha P-018, P-SCALE-RBAC-OWNER-APPROVAL, P-Ω4-7-*, P-Ω4-4-REVERSE-IDEM.

## CR2-08 - linha 2 - AJUSTE - guard do B-SAN3-21 verde com o defeito presente
- guard so .tsx; 13 literais sem acento em 9 .ts: auth.adapter.ts:89,216; tenantNavigation.ts:506; platformNavigation.ts:6,76; work-orders.adapter.ts:217.

## CR2-12 - linha 3 - AJUSTE - residuo da CR1-05
- §10.1 l.410-411 "Entram so se o dono pedir: cheques, fechamento..." x §10 l.403-404 "nunca uma reducao" x §2 l.73-74 x mvp_vendavel.note "fechamento de periodo, cheque ... nucleo vendavel +5".
## CR2-09 - linha 4 - NOTA - P-O6R-B07 com status circular no texto (indice certo; flip inverso so de texto; 72+31=103)
## CR2-10 - linha 4 - NOTA - L1088 FECHADA com ressalva material (indice condicional, migration.sql:43; nao medido em base viva)
## CR2-11 - linha 5 - NOTA - prazo publicado exclui os 6 atos; ato Provedor tem default "nada muda"

## DESCARTADAS (a favor do plano)
- O6R-09 cobre o ARQ-004; SAN3-06b cobre o menu da plataforma; SAN3-22 sem migracao procede; premissa da CR1-09 reconfirmada (OS-000101 so no mock); porteiro 0,5-1 h consistente (21 e 29 min medidos); main sem protecao de branch (gh api 404).

## TABELA R1 (17)
- resolvidos (9): CR1-01, 03, 04, 09, 13, 14, 15, 16, 17
- parciais (8): CR1-02 (CR2-04), 05 (CR2-12), 06 (CR2-06), 07 (CR2-02), 08 (CR2-02/05), 10 (CR2-03), 11 (CR2-08), 12 (CR2-01)
- nao resolvidos: 0

## PLACAR R2
- bloqueia 2 (CR2-01, 02) - ajuste 7 (CR2-03, 04, 05, 06, 07, 08, 12) - nota 3 (CR2-09, 10, 11)

## VEREDITO
O plano pode ir a junta: NAO.
