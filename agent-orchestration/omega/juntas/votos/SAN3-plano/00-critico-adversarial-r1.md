# Parecer do critico-adversarial — PR #386 (SAN3) — rodada 1
Ref julgada: 31e04f6c (docs/san3-plano-saneamento), base origin/main@15ef3fbe
Gravacao incremental (P2). Achados CR1-NN abaixo, na ordem em que foram medidos.

## CR1-01 · linha 6 · BLOQUEIA — a promessa central do PR nao esta no diff
- evidencia: `git diff --name-only 15ef3fbe 31e04f6c | grep pendencias` -> NENHUM. `git diff --stat ... -- agent-orchestration/controle/` -> so aposentadoria-especialistas.md e decisoes.md.
- o plano afirma: §0.2 "Este PR corrige as linhas de status"; §7.1 "Este PR reescreve a linha canonica de cada flip ... e regenera o indice". Cabecalho: "RASCUNHO ... numeros do registro (§0) so se tornam finais quando a correcao dos flips ... for aplicada". §4.4 AUSENTES "ainda nao concluiu" e pode recontar §4.1 e §9. §7.2 "hipotese ... em verificacao em bancada neste PR".
- motivo: a junta votaria um plano cujo proprio texto declara incompletos o inventario (fatia AUSENTES), o registro (flips) e a contagem do gate. O objeto julgado nao e o objeto que sera mergeado.

## CR1-02 · linha 8/7 · BLOQUEIA — cinco fronteiras de escopo apontam para caminhos que nao existem
- evidencia (`git cat-file -e 15ef3fbe:<p>`): AUSENTE src/modules/rbac/catalog.ts (real: src/modules/core-saas/permissions/catalog.ts) [B-SAN3-04]; AUSENTE src/modules/work-orders/work-order-financial.service.ts (real: src/modules/work-order-financials/) [B-SAN3-02]; AUSENTE frontend/src/modules/purchasing (real: purchase-orders) [B-SAN3-06]; AUSENTE frontend/src/modules/vehicle-dossier (real: patios/processes) [B-SAN3-11]; AUSENTE src/modules/expenses (real: src/modules/expense-management) [B-O6R-03a]. DispatchConsolePage vive em frontend/src/modules/dispatch/pages/ — fora do glob {purchasing,reports,platform} do B-SAN3-06.
- motivo: o plano diz "fixa a fronteira, nao o diff" (§5); a fronteira fixada nao cobre o codigo do item em 5 dos 19 blocos. §C4 exige caminhos exatos; um planejador que obedeca a fronteira nao pode fechar o item.

## CR1-03 · linha 4/6 · AJUSTE — a mediana do §9 esta errada
- evidencia: `gh pr view <n> --json commits,mergedAt` (primeiro commit -> merge): #360 1,27h · #353 1,43h · #359 4,94h · #380 12,83h · #357 44,06h · #369 57,04h · #385 102,73h · #371 376,70h. Os 8 valores batem com o plano.
- Mediana de 8 valores = media do 4o e 5o = (12,83+44,06)/2 = 28,4h, nao 44,1h (44,1 e a mediana superior).
- motivo: "O realista, pela mediana de 44 h por bloco, e 5 a 7 dias" deriva de numero errado. A metrica tambem nao mede o bloco: exclui plano/inspetor antes do 1o commit e porteiro+backfill depois do merge (§C2.8 gate do proximo start).

## CR1-04 · linha 6 · AJUSTE — §0 e §8 nao fecham com as proprias tabelas
- A1: coluna status_comprovado da tabela da fatia = FECHADA 3 · PARCIAL 3 (JUNTA-LIMPEZA, O6R-B07, JUNTA-RECURSO) · ABERTA 26 (P-CHK-PATCH-SEM-LOCK = "ABERTA (mitigada)"). O plano publica 3/4/25.
- §0.2 "25 sao PARCIAIS e o texto nao diz isso" e "mente em 24%": a nota do §1 admite que 3 parciais da A1 o texto JA declarava; B2 diz que B06-DECIMAL "ja se declara parcialmente resolvida, nao e flip". Flips que as fatias contam: A1 4 + A2 4 + B1 19 + B2 8 + C1 11 + C2 6 = 52 -> 22,5%, nao 56/24%.
- §8.1 "13 bloqueiam o gate (itens 4, 5, 8-10, 12, 14, 17-23)": a lista tem 14 itens.
- §9 "23 bloqueantes do G1 em 19 blocos": o B-SAN3-09 nao fecha item do §4.1 (P-SAN-PROD-BOOTSTRAP esta no §4.2/G2) -> 18 blocos fecham o G1.

## CR1-05 · linha 2 · BLOQUEIA — o degrau G1/G2 e reducao de escopo, e o §0.4 diz que nao ha
- evidencia: B1 da P-GOLIVE-GATES como BLOQUEIA; o plano a move para G2 (§4.2) e escreve em §0.4 "Nao ha reducao de escopo". §10 ("O que so o dono decide") NAO lista a aceitacao do degrau G1/G2 — o plano o decide sozinho.
- criterio (12) "roteiro de demonstracao e OPERACAO": `git show 15ef3fbe:docs/go-live-readiness.md` l.58-59 — R2 "drill de restore CRONOMETRADO no ambiente real ... escrever o RPO/RTO reais no runbook" (l.67: "nao executavel fora do ambiente real"). O B-SAN3-10 executa o roteiro "em base descartavel". A metade "operacao" do criterio 12 (deploy, restore, bootstrap do 1o admin, rotacao de segredo) fica no G2.
- criterio (7) via item 7 (SEC-004): o G1 fecha o B-AV-REAL com clamd em service container da CI; o servico real e G2 (§4.2). Com G1 "vendavel", producao segue respondendo 503 a todo upload — o defeito exato que o item 7 cita.
- motivo: nao e silencioso (esta no §2 e §8.7), mas e reducao de escopo decidida pelo plano e negada pelo proprio plano; o dono pediu "nao reduza silenciosamente" e o default "mais estrito" do §2 nao se aplica a producao.

## CR1-06 · linha 6 · AJUSTE — "o runtime de PRODUCAO conecta como superusuario" e premissa nao medida
- evidencia: a prova do item 5 e `docker-compose.prod.yml:35,57`. `git grep docker-compose.prod 15ef3fbe -- docs/deployment.md` -> l.200-233: e o compose de subida local e do smoke `erp-o6r-smoke`. A producao e Fly (`D-INFRA-PROVIDER`, decisoes.md:422); `fly.production.toml:9` "DATABASE_URL -> Postgres gerenciado de PRODUCAO" (secret). A propria B1: "O papel de producao (Fly) e secret: NAO MEDI". A "soma entre organizacoes" do #385 foi em dev/CI (B1: "dev/CI rodam como postgres").
- motivo: a reclassificacao ✓ do item 5 para o criterio 2 se apoia numa afirmacao sobre producao que ninguem mediu; o que esta medido e: nada no repo IMPOE NOBYPASSRLS. O defeito real e mais estreito que o escrito.

## CR1-07 · linha 3/5/7 · BLOQUEIA — o teste de encerramento do B-SAN3-05 e inexequivel como escrito, e o escopo e aberto
- evidencia: `git grep -l -E "CREATE ROLE|DROP ROLE|ALTER TABLE|RENAME COLUMN|createEphemeralRole|ALTER ROLE" 15ef3fbe -- tests` -> 15 arquivos (rls-tenant-isolation, audit-security, db-catalog-write-guard, checklist-applicability-prisma-db, o6r06-*-db, auth-identity-*-db, helpers/auth-identity-fixture.ts ...). Todos exigem CREATEROLE ou dono de tabela.
- o plano: "a suite -db INTEIRA roda sob papel NOSUPERUSER NOBYPASSRLS e o que quebrar entra no bloco".
- motivo: (a) por construcao, 15 suites nao rodam sob esse papel sem reescrever o arnes — trabalho do B-ARNES-2, que o plano poe pos-gate; (b) "o que quebrar entra no bloco" e escopo sem fronteira (§C4 exige caminhos exatos); (c) as suites -db novas da frente 1 (04a, 03a, SAN3-02, SAN3-03), escritas em paralelo, entram ou saem desse regime conforme quem mergear primeiro — dependencia de ordem que o §6 nao tem; (d) "producao recusa subir como superusuario (teste de env)": o env so ve a URL; superusuario com nome "app" passa. Detectar exige consultar pg_roles no boot.

## CR1-08 · linha 3 · BLOQUEIA — "sao modulos disjuntos" (§6) e falso no codigo; ha dependencias fora do grafo
- SAN3-04 (frente 2) x SAN3-06 (frente 3), em paralelo: a sidebar renderizada vem de `appSidebarNav.ts` (`AppShell.tsx:12,43-44` buildSidebarNav + computeHiddenNavPaths do menu do backend); `/purchase-orders` e `/reports` estao em `appSidebarNav.ts:92,94,247,249`. `tenantNavigation.ts` (escopo do SAN3-06) so alimenta command-palette e erp/index. Tirar Pedidos/Relatorios do menu exige `appSidebarNav.ts` ou `navigation.registry.ts` — os dois no escopo do SAN3-04. Colisao sem aresta no §6.
- SAN3-08 nao fecha nenhum dos seus 2 itens no proprio escopo (`frontend/src/modules/registry/service-quotes/**`): P-Omega3a nasce no catalogo (finance sem service_catalog:read/customers:read/work_orders:read, C1 l.50) = arquivo do SAN3-04; a aprovacao com corpo vazio tambem esta em `frontend/src/modules/work-orders/components/tabs/QuoteTab.tsx:106` (`approveServiceQuote(context, quote.id, {})`) = escopo do SAN3-01. Falta a aresta SAN3-04 -> SAN3-08.
- 03b, 04b e 11 precisam de `mobile/flutter_app/lib/core/sync/**`, que nenhum dos tres tem no escopo: QUA-001 e `core/sync/sync_providers.dart:51,109-112` (executado: `const ApiConfig()` sem token); QUA-002 e `core/sync/auto_sync_coordinator.dart:90-118` + backend `src/modules/mobile/mobile-inventory-sync.ts` (Map em memoria); QUA-005 e `core/sync/sync_queue_repository.dart:17-34`.
- 07c: vias 3-7 em `src/modules/work-order-comments/` e via 10 em `src/modules/mobile/mobile-work-order-sync.ts` (existem no head) — fora do glob `src/modules/work-orders/**`. O PISO declarado ("vias 1, 2 e 10") inclui uma via fora do escopo.
- SAN3-03: as metricas nascem em `src/infra/events/domain-event.publisher.ts:59` e `src/modules/notifications/notification.service.ts:135,150` (fora do escopo); o fato de origem e o upload de anexo de checklist (`src/modules/checklists/**`). A propria A2 registra a dependencia "P-O6R-B08 ... ; outbox generico da Omega6R D-002 (nao deliberado)" — o plano poe "Dep. —". Um bloco do gate passa a depender de um bloco pos-gate e de uma decisao de arquitetura nao tomada.

## CR1-09 · linha 1/5 · BLOQUEIA — o B-SAN3-10 nao fecha a P-SAN-E2E como registrada, e o E2E existente consagra o P-008
- evidencia: a pendencia (B1) e "Testes e2e Playwright FORA DO GATE OBRIGATORIO DO CI"; `git grep -i -E "playwright|test:e2e" 15ef3fbe -- .github` -> 0. O teste de encerramento do SAN3-10 ("roda ponta a ponta e o resultado e publicado") nao poe nada no CI. O teste que a B1 registrou ("job e2e bloqueante ... com vermelho-controle") some do plano.
- `git show 15ef3fbe:tests/e2e/critical-flows.spec.ts` l.196-220: "Ordens de Servico ... com fallback seguro" exige `OS-000101`, `Atlas Refrigeracao` e abre `/work-orders/1111...0001` esperando `OS-000101` — a OS inventada do P-008. O conserto do SAN3-01 deixa este spec vermelho; `tests/e2e/**` nao esta no escopo do SAN3-01, e o spec nao roda no CI, entao ninguem ve.
- "executar no app" (Flutter) dentro de um E2E Playwright: mecanismo nao dito. Esforco M (~5h) para 6 fluxos x personas + app + roteiro executado por terceiro.

## CR1-10 · linha 1 · AJUSTE — a regra de reclassificacao nao e aplicada por igual (o gate e ao mesmo tempo inflado e incompleto)
- criterio 5 lido "literal" para levar o B11 ao gate (§8.7). Pela mesma leitura ficam de fora: P-CHK-PATCH-SEM-LOCK (A1: risco 1-perda; executado `git grep -i -E "If-Match|expectedUpdatedAt|optimistic" 15ef3fbe -- src/modules/checklists | wc -l` -> 0, last-write-wins) e Omega6R-ARQ-004 (inventario O6R: risco "1-perda/corrupcao-de-dados", despacho sem evento probatorio) — este no §4.3 como "visivel e corrigivel".
- criterio 4 usado para USAGE-BEST-EFFORT (A2: "esporadico, sempre para menos, o cliente nunca e cobrado a maior"). Fica de fora P-Omega4-3-REFATURAR-DELTA, que e DETERMINISTICO: `work-order-financial.service.ts` "409 already_invoiced — mesmo que todos os itens ja estejam carimbados" -> item lancado apos o 1o faturamento nunca e faturado. E P-Omega4-7-DUPLA-CONTAGEM (B1: nada impede pagar titulo por cheque e compensar o mesmo cheque).
- criterio 12 usado para o nome "Tenant Demo". Ficam de fora: `mobile/.../shared/ui/sync_screen.dart:92` `_BackendPendingNotice()` renderizado sem condicao com `:269 'Integracao remota ainda nao ativa'` (frase falsa em toda tela de sync do app); P-MOBILE-OS-SEEDS (A1 ALTA, `work_order_repository.dart:750,766,779` OS-1042/43/44); P-028/P-Omega3F2B (sem acento no formulario central de Nova OS e em TODA tela de acesso negado — §11.3 proibe o mesmo que §11.1).
- inverso: o item 10 (P-026, ✓) cita o criterio 3 "RBAC validado no BACKEND", e a prova da propria C1 diz "o backend nega corretamente" — o criterio citado nao e violado. O item 3 poe QUA-004 sob o criterio 5; o inventario O6R o classifica "6-contratos" ("o caminho de campo e o sync, que esta correto").

## CR1-11 · linha 5 · AJUSTE — testes de encerramento que ficam verdes com o defeito presente
- B-SAN3-04: "se ele sair verde no head-base, o item cai do gate" — sem vermelho-controle definido, quem escreve o teste pode tirar um bloqueante do gate com um teste fraco. E o teste usa "permissoes REAIS do catalogo", mas o menu em modo prisma e montado com `tenantContext.permissions` vindas do BANCO: `persistent-rbac-context.middleware.ts:90-107` (withTenantRls + RoleRepository) -> `role.repository.ts:118` `rolePermission.findMany`; `navigation.routes.ts` usa `tenantContext?.permissions`. O banco so converge do catalogo por `db:provision-rbac` no deploy de producao (`deploy-production.yml:155`); a base de demonstracao vem do seed. Teste no catalogo verde + base demo com grant antigo = defeito vivo na demo.
- B-SAN3-07: guard "nenhum `name:` de organizacao do seed contem Tenant" — verde se o nome for para uma constante (`name: DEMO_ORG_NAME`).
- B-SAN3-01: "grep OS-FALLBACK = 0" — verde renomeando o literal (os outros asserts do bloco sao comportamentais e seguram; so o grep e cego).
- B-SAN3-03: "toda basisMetricKeys tem produtor (censo)" — censo de presenca de escritor nao prova que o escritor roda no caminho do fato.
- B-SAN3-05: ver CR1-07(d).

## CR1-13 · linha 3/7 · AJUSTE — quorum abaixo do §C7.1-ter(b) em 3 blocos
- norma na ref (CLAUDE.md l.374-375): "Unanimidade de 3 quando o bloco toca dinheiro, seguranca, PERMISSAO ou PERDA DE DADO".
- B-SAN3-11: o §4.1 item 22 o poe sob o criterio 5 (perda de dado) e o §5.3 da "maioria de 3".
- B-SAN3-06: fecha P-RBAC-GATING-MOCKSHELLS (gate de permissao de UI) e remove rotas com PermissionGuard — "maioria de 3".
- B-SAN3-08: fechar P-Omega3a exige grant no catalogo (CR1-08) — "maioria de 3".

## CR1-14 · linha 4 · AJUSTE — o que a estimativa esconde
- §C2.8 na ref: "Sem parecer dele [porteiro], nenhum bloco novo comeca". Com 3 frentes, cada um dos 19 merges gera um porteiro que, lido literalmente, segura as tres frentes. O plano diz "blocos em paralelo nao dispensam nenhum passo" e nao reconcilia a regra com o paralelismo nem poe o porteiro no caminho critico.
- a metrica "1o commit -> merge" exclui plano do planejador (Fable), inspetor e porteiro (Fable), e backfill; 4 gates fixados em Fable x 19 blocos contra a cota que o proprio §9 diz ja ter derrubado agentes.
- colisao em `Kpis/*`: o segundo a mergear precisa reexecutar as suites para publicar contagem real (§C3.3) — nao e so "resolver na absorcao".
- frente 3: 04b espera o 04a (~13h) e 03b espera o 03a (~26h); na ordem da tabela a frente 3 chega a ~45h, nao ~33h (nao muda o caminho critico, mas o numero publicado esta errado).

## CR1-12 · linha 7 · AJUSTE — autorizacao de prisma/** onde nao precisa, e ausente onde o proprio teste de encerramento a exige
- B-O6R-03a: o teste do plano "2 usuarios com a mesma chave local -> 2 lancamentos". `git show 15ef3fbe:prisma/schema.prisma` model MobileActionReceipt: `@@id([tenant_id, client_action_id])` — a chave nao tem usuario; o teste so fica verde mudando a PK -> migracao. Escopo do bloco: `src/modules/expenses/**` (inexistente) + `src/modules/mobile/*expense*` (casa 0 arquivos) — sem prisma.
- B-O6R-04a: o inventario O6R exige "unicidade de reversao ativa"; schema.prisma:1482/1508 `reverses_movement_id` so tem `@@index` -> indice unico parcial = migracao. Fronteira: `src/modules/inventory/** + suites -db` — sem prisma.
- B-O6R-12: "o motor le o regime do processo" — model ImpoundProcess so tem `profile_id` (nenhuma coluna de regime/snapshot); versionar ou carimbar exige schema. Fronteira: `src/modules/jurisdiction/**, impound (so leitura)` — sem prisma.
- B-SAN3-04 recebe o inverso: "+ migracao de grant aditiva, SE o grant vive no banco". Medido: vive no banco (`role.repository.ts:118`) e converge do catalogo por `npm run db:provision-rbac` a cada deploy (`deploy-production.yml:155`, `docs/deployment.md:94`) — migracao nao e o mecanismo; a autorizacao condicional de prisma/** contraria §C4 ("autorizacao explicita").
- B-AV-REAL: "IaC do servico privado, service container na CI". `git ls-tree 15ef3fbe infra/` -> nao existe; a CI ja tem `services:` em `ci.yml:26,122` -> o bloco edita `.github/workflows/ci.yml` e cria IaC num caminho nao nomeado. Nada disso esta autorizado por caminho.
- B-SAN3-07: `prisma/seed.ts` "autorizado so nesta linha" — este esta correto e minimo.

## CR1-17 · linha 4/6 · NOTA — "5 de 8 blocos tiveram pelo menos uma [reprovacao]" sem fonte
- `git ls-tree -r --name-only 15ef3fbe agent-orchestration/omega/reprovacoes` -> R- so para B-O6R-01 (3 ciclos + CI) e B-O6R-02; `omega/juntas` -> ciclos so do 02 (1-5) e 06 (+delta); o titulo do #369 diz "ciclo 2". Confirmaveis: 3 (01, 02, 07a), talvez 4 com o delta do 06. O "5 de 8" alimenta a estimativa realista e nao cita de onde vem.

## CR1-15 · linha 6/8 · AJUSTE — conflito real entre fatias (fonte da permissao) nao registrado; exclusao apoiada em premissa refutada
- C1 (P-032/P-033): "a autorizacao em runtime vem do CATALOGO, nao do banco (auth.routes.ts:26-33)". C2 (FINANCE-READ-ORFA): "permissoes vem do banco". Medido: `auth.routes.ts:26-33` so monta o CORPO do login; em modo prisma o request usa `persistent-rbac-context.middleware.ts:90-107` -> `role.repository.ts:118 rolePermission.findMany`. A C2 esta certa; a C1 descartou o "403 ao vivo para auditor" (P-033) por premissa falsa.
- `grep -c P-033 PLANO_SAN3.md` -> 0; o §8.7 (conflitos mantidos) nao registra este. §A2: conflito entre fontes nao se consolida em silencio.

## CR1-16 · linha 8 · AJUSTE — duplicatas nao declaradas (o §8.5 lista 5 pares; faltam estes)
- P-023 (C1) = P-USERS-LAST-ACCESS (C2): mesmas ancoras nas duas fatias (`local-auth-credential.repository.ts:146` e `lastAccessByTenant` aparecem 2x cada).
- P-AUD-ACTOR-NAME (C2) = item 1 de P-AUDIT-FOLLOWUPS (A1): mesma funcao `audit.routes.ts:70-77`/`:74`.
- P-Omega3F6 (resido LEGACY-NULL, B1) = P-GOLIVE-VALIDATE-CONSTRAINT (A1): mesmo `VALIDATE CONSTRAINT` nunca rodado para `work_orders_cancelled_decision_check`.
- P-FINANCE-HEADER-ACTIONS subconjunto de P-Omega4-8-DASHBOARD-FIDELITY (a propria C2: "consolidar"); P-Omega3F2B-ACENTOS subconjunto de P-028 (a propria C1: "subconjunto").
- `grep -c` no plano: P-023 0 · P-USERS-LAST-ACCESS 0 · P-AUD-ACTOR-NAME 0 · P-AUDIT-FOLLOWUPS 0 · P-GOLIVE-VALIDATE-CONSTRAINT 0 · P-FINANCE-HEADER-ACTIONS 0 · P-Omega3F2B-ACENTOS 0 · P-028 0.
- a duplicata DECLARADA "MOCKSHELLS = PURCHASE-ORDERS (mesma causa)" e parcial: MOCKSHELLS inclui o DispatchConsolePage (`frontend/src/modules/dispatch/pages/`, so por URL, organizacao fixa "Techsolutions Industrial"), que o PURCHASE-ORDERS nao tem e o glob do SAN3-06 nao alcanca.
- motivo: o denominador 231 e os percentuais do §0 contam duplicatas como entradas distintas.

## Linhas de ataque medidas e DESCARTADAS (a favor do plano)
- "tirar o superusuario quebra em silencio a varredura de diarias": `charge.accrual.service.ts` lista `prisma.tenant.findMany` (tenants sem RLS) e processa cada tenant sob `withTenantRls` — sobrevive.
- "o console de plataforma zera": `platform-overview-prisma.repository.ts` usa `withTenantRls` 3x — sobrevive.
- "backfill p0_fechados 11 -> 13 prometido e nao feito": feito (`Kpis/kpis-latest.json:129` 11 -> 13; achados.jsonl DIN-005/007 alterados).
- duracoes dos 8 PRs do §9: todas conferem com `gh pr view` (so a mediana esta errada, CR1-03).

## PLACAR
- bloqueia: 6 (CR1-01, 02, 05, 07, 08, 09)
- ajuste: 10 (CR1-03, 04, 06, 10, 11, 12, 13, 14, 15, 16)
- nota: 1 (CR1-17)

## VEREDITO (1 linha)
O plano pode ir a junta: NAO.
