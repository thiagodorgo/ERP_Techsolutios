# Pendencias

## P-001 - Validacao de stack

- descricao: conflito historico entre memoria (C) e repositorio (Node.js + TypeScript) foi registrado e consolidado documentalmente
- impacto: historico preservado para rastreabilidade; sem impacto na baseline tecnica vigente
- status: resolvido

## P-002 - Push remoto

- descricao: checkout local atual nao possui remoto `origin` configurado; push depende de configuracao de remoto
- impacto: commits locais existem, mas publicacao remota nao foi executada nesta sessao
- status: resolvido (2026-07-07) — `origin` GitHub configurado e em uso; `gh` autenticado (thiagodorgo)

## P-003 - 2 testes de backend vermelhos na baseline `main` (2026-07-07)

- descricao: `tests/approval-frontend-contract.test.ts` e `tests/platform-routes.test.ts` falham na `main`
  (arquivos identicos entre `main` e a branch b123r; fonte platform nao mudou). Nao rodam no CI (`npm test`
  so executa `core-saas.test.ts`).
- impacto: rodada BLOCO-AUTO monitora "sem NOVAS falhas" no dir completo; essas 2 nao contam como regressao.
- status: **RESOLVIDO (2026-07-13, PR Ω-GATE)**. Causa raiz de cada um:
  - `platform-routes` ("legacy headers disabled in production"): o me-router monta em `/api/v1` (largo) ANTES
    de `/api/v1/platform` e seu `tenantContextMiddleware` interceptava /platform/* em produção com motivo
    genérico `legacy_headers_disabled`. Corrigido reordenando `src/app.ts` (platform antes de me).
  - `approval-frontend-contract`: afirmava contrato obsoleto (OperationalApprovalCard / `can("work_orders:update")`);
    a tela foi refatorada para `ApprovalPanel` inline com gate `work_orders:approve`/`canDecide`. Teste reescrito
    para o contrato vivo (mais forte). Além destes 2, o gate real revelou e corrigiu `cloud-usage-routes` (fixture
    que apodrecia no relógio — período default de 30d). Suíte inteira agora roda no CI: 0 fail (~761-766 pass).

## P-004 - Codigo morto e sidebar dupla no frontend (2026-07-07)

- descricao: `src/pages/WorkOrdersListPage.tsx` (e irmaos) nao sao roteados (mortos); pagina viva e
  `src/modules/work-orders/pages/WorkOrdersPage.tsx`. Sidebar montada = `src/layouts/AppShell.tsx`
  (`NAV_BY_ROLE`+`MVP_NAV_PATHS`), enquanto `src/navigation/tenantNavigation.ts` dirige RBAC/testes.
- impacto: A5 edita AMBOS para o grupo Cadastros aparecer e passar nos testes; espelhar sempre a pagina viva.
- status: aberto (tratado por A5; limpeza do codigo morto fora de escopo)

## P-005 - ui-ux-pro-max search.py ausente (2026-07-07)

- descricao: `.claude/skills/ui-ux-pro-max/.../scripts` e `data` sao symlinks quebrados; `search.py` nao existe.
- impacto: checklist pre-merge aplicado manualmente (conteudo extraido do SKILL.md).
- status: aberto (nao bloqueante)

## P-006 - RLS por-tenant e rate-limit por-tenant (proposta, nao implementar)

- descricao: skill saas-multi-tenant orienta PROPOR, nao implementar (mudanca de infra = condicao de parada).
  Migration `20260608000000_enable_tenant_rls` ja existe; ampliacao/rate-limit ficam como proposta.
- impacto: modelos novos de Cadastros herdam o padrao de RLS existente via `RlsPrisma*Repository`+`withTenantRls`.
- status: aberto (proposta)

## P-007 - Prisma forward-only: rollback via SQL manual (2026-07-07)

- descricao: Prisma Migrate nao tem "down" nativo; criterio de merge exige up E down testados.
- impacto: cada migration aditiva desta rodada documenta o rollback como `DROP TABLE ...` manual, testado no
  `erp-postgres` local (aplicar migration -> validar -> DROP -> confirmar). Ordem respeita FKs (junçoes antes).
- status: aberto (procedimento padrao da rodada)

## P-008 - Fallback mock-first do modulo work-orders permanece fabricado (2026-07-07)

- descricao: o modulo `work-orders` e pre-existente e mock-first; seu fallback de API-down (`getMockWorkOrderDetail`)
  ja fabricava a OS inteira. C2 apenas estendeu esse mock local com o objeto `links`. D-007 (sem dados fabricados)
  mira as telas NOVAS de Cadastros (A1-A4), nao `frontend/src/mocks/`; o mock do work-orders e module-local e fora
  desse escopo.
- impacto: em modo mock/offline o Detalhe de OS mostra vinculos ilustrativos; o endpoint real continua primario.
  Os testes constroem o detail diretamente (nao dependem do mock).
- status: aberto (aceito por convencao do modulo; reabrir se o usuario quiser zerar o fallback do work-orders)

## P-009 - Contraste de texto muted (#94A3B8) abaixo de 4.5:1 no DS (2026-07-07)

- descricao: token muted DS-wide (#94A3B8 sobre branco ~2.6:1) e usado tambem como CONTEUDO (ex.: afordancias
  "Sem ... vinculado" no Detalhe de OS, datas de timeline, helpers). Abaixo de WCAG AA para texto de conteudo.
- impacto: a11y (§11 contraste 4.5:1). DS esta congelado -> correcao e follow-up transversal do DS (trocar por
  ~#64748B nos textos de conteudo), fora do escopo de C2.
- status: aberto (proposta de a11y do DS)

## P-010 - Codigo morto do adapter de dashboard (pre-C3) (2026-07-07)

- descricao: apos C3, `dashboard.adapter.ts` ainda exporta a engine de derivacao client-side B-124
  (`deriveDashboardKpis`, `deriveEnrichedDashboardKpis`, `buildCriticalQueue`, `deriveDashboardAlerts`,
  `deriveDashboardEvents` etc.), consumida SO pelos testes; a pagina usa apenas o summary real +
  `deriveActiveDispatchRows`/`deriveFieldStatusRows`. Tree-shaken no bundle, mas e codigo morto e
  contem PT-BR sem acento no trecho inativo.
- impacto: manutencao/rot; sem efeito em runtime.
- status: aberto (limpeza — remover funcoes/tipos/testes B-124 obsoletos num bloco de chore)

## P-011 - Badge de aprovacoes no sidebar e constante hardcoded (2026-07-07)

- descricao: `AppShell.tsx` mostra `badge: 3` fixo no item "Aprovacoes" (e no grupo). Apos C3 remover o
  painel de aprovacoes do dashboard, o sidebar e a superficie que carrega o sinal — e o numero e falso
  (o dot de nao-lidas do topbar, por contraste, e real via `getUnreadNotificationCount`).
- impacto: numero fabricado na UI (§ REGRA-MESTRA); pre-existente, fora do escopo C3.
- status: **RESOLVIDO** — F10 (D-020) fez o badge de **Notificacoes** real (`unread`); F11 (D-021) fez o
  badge de **Aprovacoes** real (`getPendingApprovals`/`GET /approvals/pending`) e removeu TODO badge
  numerico literal do AppShell (grep `badge: [0-9]` = 0). Badges de dominio (vencendo/reposicao) omitidos
  (sem numero fabricado) — enhancement futuro, nao fabricado.

## P-012 - F1: tile "km/L medio da frota" e agregado nao-clicavel (2026-07-08)

- descricao: em `frontend/src/modules/fleet/fuel/pages/AbastecimentoPage.tsx`, o tile "km/L medio da
  frota" (padrao `.work-orders-kpi`) e um agregado real da janela filtrada, mas nao e clicavel. O
  `docs/screen-element-map.md` §F1 menciona de forma solta "card 'consumo medio da frota' → lista
  filtrada". Registrado pelo validador-mestre (achado BAIXA no gate do F1).
- impacto: nao e card morto (nao clicavel, nao engana; replica o padrao aceito dos KPIs do dashboard/OS);
  requisito substantivo (agregados reais, R1.1) cumprido; a tabela de elementos OBRIGATORIOS do mapa nao
  exige navegacao em KPI. Cosmetico/affordance.
- status: aberto (reavaliar o affordance na F12/cera — tornar o card um atalho para a janela filtrada,
  ou manter como indicador). Nao bloqueia F1 (veredito APROVADO).

## P-013 - F2: guard de disponibilidade so na criacao de OS, nao no assign (2026-07-08)

- descricao: R2.3 (viatura em `em_execucao` = indisponivel) foi aplicada em `work-order.service.create()`
  (OS nova), conforme a spec ("OS nova" + "nao mexer no field-dispatch"). O fluxo `work_order.assign`
  (D1/mobile, que seta viatura numa OS existente) NAO passa pelo guard.
- impacto: e teoricamente possivel vincular via assign uma viatura que entrou em manutencao depois da
  criacao da OS. Baixo risco (janela pequena; despachante ve o estado). Consistente com o escopo aprovado.
- status: aberto (se o negocio exigir bloquear no assign, abrir bloco dedicado tocando o fluxo de assign
  com a regressao field-dispatch/registry-assign coberta). Nao bloqueia F2.

## P-014 - F3: cancelamento de multa gateado so por papel (sem permissao dedicada) (2026-07-08)

- descricao: "Cancelar" multa (`→cancelada`) e restrito a `tenant_admin`/`super_admin` via checagem de
  PAPEL (UI: `usePermissions().roles` vs `["Super Admin","Administrador"]`, convencao do `tenantNavigation`;
  backend: 403 `cancel_requires_admin`). Nao existe permissao dedicada `fines:cancel` no `catalog.ts`.
- impacto: correto e consistente (backend e autoridade); porem menos granular que uma permissao dedicada.
- status: aberto (se quiser RBAC mais granular no futuro, criar `fines:cancel` no catalogo + trocar o
  gate de papel por permissao). Nao bloqueia F3.

## P-015 - F3: `driver_id` parser afrouxado (string) x coluna UUID (2026-07-08)

- descricao: `fine.validators.ts:parseOptionalUserId` aceita string limitada (nao-UUID estrito) porque em
  modo memoria os ids de usuario sao `usr_`-prefixados; a coluna `fines.driver_id` no Postgres e `UUID`.
- impacto: nenhum hoje — os dois espacos de id nao se cruzam (memoria nao usa Postgres; em modo persistente
  os usuarios tem id UUID). Risco latente: se o cadastro de usuarios emitir id nao-UUID em modo persistente,
  um condutor valido falharia no insert Prisma (500). Registrado pelo validador-mestre (BAIXA).
- status: aberto (se/quando unificar o formato de id de usuario, alinhar o parser a UUID ou a coluna a TEXT).
  Nao bloqueia F3 (veredito APROVADO).

## P-016 - F4 (R4.3): indicador "viatura sem apolice vigente" na tela Viaturas + Mapa adiado (2026-07-08)

- descricao: `docs/pd-controle.md` §F4 R4.3 pede indicador de atencao para viatura sem apolice vigente na
  tela de **Viaturas** (`registry/vehicles`) e no **Mapa** (F6). F4 entrega o modulo `InsurancePolicy` +
  tela `/fleet/insurance`, mas NAO altera a tela Viaturas mergeada (fora do escopo do plano-mestre F4;
  evita regressao no registry) nem o Mapa (que so vira real em F6).
- impacto: nenhum na entrega do F4; o indicador cross-tela fica para quando F6 (mapa real) ou um bloco
  dedicado ligar `hasActivePolicy` (helper read-only exportavel pelo backend F4) na Viaturas/Mapa.
- status: aberto (F6 ou bloco dedicado). Nao bloqueia F4.

## P-017 - F4: barra de vigencia de apolice cancelada usa tom neutro/verde (2026-07-08)

- descricao: em `/fleet/insurance`, `computeVigencia` neutraliza o tom de apolices `cancelada` para
  `default` (verde no mapa da barra); a barra fica verde com rotulo cinza. O Chip da coluna Situacao ja
  mostra "Cancelada" (audit/mudo), entao a informacao correta esta presente. Nit de semantica (pixel-master).
- impacto: baixo/cosmetico; nao e card morto nem engana (Chip e autoridade). Teste assere `tone==="default"`.
- status: aberto (F12/cera — introduzir 4º tom "muted" so para canceladas, ajustando o teste em lockstep).
  Nao bloqueia F4.

## P-018 - Attachments: allowlist de mime confia no Content-Type declarado (sem sniffing) (2026-07-08)

- descricao: o upload de anexos (checklist E danos F5, mesmo storage provider) valida o mime SO pelo
  Content-Type declarado no multipart, sem magic-byte/content sniffing. Achado LOW do workflow adversarial
  de seguranca do F5. Herdado do modulo de checklist (comportamento pre-existente, nao introduzido pelo F5).
- impacto: baixo — o download serve com o mime DECLARADO armazenado (nao text/html), entao payload HTML
  falso nao renderiza (sem stored-XSS); path de storage e sanitizado (sem traversal). Nao e exploravel p/
  escrever fora do diretorio nem executar.
- status: aberto (hardening futuro do storage compartilhado: sniffing de magic bytes + Content-Disposition
  attachment + talvez X-Content-Type-Options nosniff). Vale p/ checklist e danos. Nao bloqueia F5.

## P-019 - Ocorrencias residuais de persona demo "Marina Costa" fora do mapa (2026-07-08)

- descricao: F6 matou o mock do mapa (0 pins fabricados), mas restam 3 ocorrencias de "Marina Costa"
  FORA do escopo do mapa: `frontend/src/mocks/auth/context.ts:18` (persona demo do login, amarrada ao
  e-mail demo) e linhas demo estaticas em `PlatformAuditPage.tsx` / `PlatformTenantDetailPage.tsx`
  (telas bespoke de plataforma que espelham `screen-refs/` §11).
- impacto: telas de PLATAFORMA (fora do AppShell do tenant) e persona de login demo — nao violam o D-007
  operacional do tenant, mas sao dados estaticos que eventualmente devem virar reais (mesmo espirito do
  P-011). Renomear agora divergiria das referencias visuais aprovadas.
- status: aberto (tratar quando as telas de plataforma forem conectadas a dados reais; a persona demo do
  login e intencional em modo mock). Nao bloqueia F6.

## P-020 - F7a: check de saldo sem SELECT FOR UPDATE (corrida teorica de debito) (2026-07-08)

- descricao: R7.1 checa o saldo com `aggregate` -> valida -> insere na MESMA `$transaction` (READ COMMITTED),
  mas sem `SELECT ... FOR UPDATE` nas linhas de movimento; dois debitos estritamente concorrentes do mesmo
  item podem, em teoria, passar ambos (nenhum ve o outro ainda nao commitado). Achado BAIXA do validador.
- impacto: baixo — atende o contrato R7.1 declarado e e coerente com o resto do repo; janela de corrida
  estreita e o saldo negativo seria visivel/corrigivel por ajuste. Nao ha lock de linha.
- status: aberto (hardening futuro: `FOR UPDATE` no agregado por item, ou isolamento SERIALIZABLE no
  create de movimento, ou uma tabela de saldo materializado com advisory lock). Nao bloqueia F7a.

## P-021 - F7b: fechar contagem nao duplica ajustes em retry (RESOLVIDO no bloco) (2026-07-09)

- descricao: achado MEDIA do validador — `close()` gera ajustes um a um (cada `createMovement` commita na
  propria transacao) e so marca `concluida` no fim; uma falha no meio deixava a sessao `aberta` com ajustes
  parciais, e um novo "Fechar" duplicaria os ajustes (variancia identica), corrompendo o saldo.
- correcao (neste PR): `close()` agora e IDEMPOTENTE — antes do laco, le os ajustes ja ligados a sessao
  (`listMovements({cycleCountId})`, novo filtro) e PULA os itens ja ajustados (reaproveita o movimento
  existente no relatorio, sem recriar). Filtro `cycle_count_id` exposto tambem no `GET /stock-movements`
  (util + testavel). Teste reforcado (a sessao gera exatamente 1 ajuste por item divergente).
- status: **resolvido** (guard de idempotencia). Hardening opcional futuro: envolver todo o close numa
  unica transacao (rollback total em falha parcial) — vale junto de P-020.

## P-022 - F7b: AuditLog na contagem do item (RESOLVIDO no bloco) (2026-07-09)

- descricao: achado BAIXA do validador — `recordEntry` (PATCH `counted_quantity`) nao gravava AuditLog,
  divergindo do resto do modulo (todas as demais mutacoes auditam).
- correcao (neste PR): `recordEntry` grava `cycle_count.entry_counted` (resourceType `cycle_count_entry`,
  metadata cycleCountId/itemId/countedQuantity) no padrao existente.
- status: **resolvido**.

## P-023 - F9: "ultimo acesso" do usuario nao tem fonte de dado (2026-07-09)

- descricao: `screen-element-map` §F9 lista "ultimo acesso" na lista de usuarios, mas o modelo `User`
  (core-saas) so tem `createdAt` — nao ha `last_login`/`last_access`. F9 exibe "Criado em" (real) em vez de
  inventar ultimo acesso. Coluna de ultimo acesso OMITIDA (nao renderiza "—" perpetuo).
- impacto: nenhum; entrega honesta. Falta uma fonte de ultimo login (o modulo auth tem sessoes/audit — um
  bloco futuro pode derivar o ultimo `auth_session`/login por usuario).
- status: aberto (quando quiser ultimo acesso real, derivar do audit/sessoes de auth). Nao bloqueia F9.

## P-024 - F9/F11: vocabulario RBAC de usuarios (users:read x users.read) parcialmente reconciliado (2026-07-09)

- descricao: o guard da rota `/users` foi corrigido de `users:read` (mock, sem grant em nenhum papel) para
  `users.read` (vocabulario real do backend) — a tela estava inacessivel a todos. Mas o item de sidebar em
  `frontend/src/navigation/tenantNavigation.ts` ainda usa `users:read`.
- impacto: baixo; a rota agora funciona. A reconciliacao completa do vocabulario (sidebar + demais telas
  religadas) e escopo do F11 (ver `navigation-matrix.md`).
- status: **RESOLVIDO** por F11 (D-021): sidebar/tenantNavigation + guards reconciliados ao vocab do backend
  (com alias legado retrocompativel). Residual de reconciliacao de CATALOGO (backend) rastreado em P-027.

## P-025 - NotificationList EmptyState com termo tecnico "tenant" + acentos (pre-existente) (2026-07-09)

- descricao: `frontend/src/modules/notifications/components/NotificationList.tsx` (EmptyState) usa "tenant"/
  "inbox" e strings sem acento ("notificacao/exibira/usuario") — viola CLAUDE.md §3 (sem termo tecnico na
  UI) e §11.1 (PT-BR de negocio/acentuacao). Achado BAIXA do validador no gate do F10, mas o arquivo e
  PRE-EXISTENTE (fora do diff F10 — nao introduzido por este bloco).
- impacto: cosmetico/copy; "tenant" na UI e uma quebra de regra-de-ouro, porem pre-existente.
- status: **RESOLVIDO** por F12 (D-022): NotificationList -> "Nenhuma notificação encontrada" / "A central
  exibirá eventos relevantes da sua organização aqui." (+4 outras telas com "tenant" corrigidas).

## P-028 - Divida sistemica de acentuacao em strings de UI antigas (2026-07-09)

- descricao: varias telas pre-existentes tem strings sem acento ("Situacao" ~x12, "usuario" ~x7,
  "Operacao"/"indisponivel"/"Auditoria" espalhados). F12 corrigiu as violacoes de §3 ("tenant"/"inbox") +
  acentos DENTRO dessas strings, mas nao fez a reescrita ampla (fora do escopo do bloco de cera).
- impacto: cosmetico/§11.1; nao afeta funcao. Concentrado em telas bespoke de plataforma/legado.
- status: aberto (bloco dedicado de copy/i18n varrendo `frontend/src/**` por acentuacao de UI). Nao bloqueia F12.

## P-026 - F11: front `UserRole` nao cobre os 9 papeis canonicos (menu visual aproxima) (2026-07-09)

- descricao: a uniao `UserRole` (frontend) + `mapBackendRole` nao tem rotulo para `inventory` (cai em null)
  e `support`/`field_dispatcher` colapsam. Por isso F11 gate os itens NOVOS por PERMISSAO (nao por
  `allowedRoles`), e o menu VISUAL de `inventory` aproxima (cai no kind `gestor`). A autoridade de acesso e
  o route-guard/backend (correto); so o menu visual nao honra 100% a matriz para esses papeis.
- impacto: baixo — acesso e correto (permissao); estetica de menu aproxima p/ inventory/support.
- status: aberto (bloco futuro: adicionar `inventory` (+ representacoes distintas) a `UserRole`+`mapBackendRole`).

## P-027 - F11: divergencias matriz x catalog + perms `purchase_orders:read`/`reports:read` ausentes (2026-07-09)

- descricao: `navigation-matrix.md` concede a `finance`/`inventory` o Dashboard e a `finance` as Aprovacoes,
  mas o `catalog.ts` nao lhes da `dashboard:read`/`work_orders:read`; e `support` tem `dashboard:read` no
  catalogo mas a matriz o oculta. Alem disso `purchase_orders:read` e `reports:read` NAO existem no
  `catalog.ts` (a matriz os marca como novos a adicionar ao backend). F11 (frontend) seguiu a MATRIZ nos
  fixtures do teste e a PERMISSAO real no gate, sem inventar nem tocar `catalog.ts`.
- impacto: os itens Pedidos/Relatorios usam as strings que os guards de rota do App.tsx ja usavam; ate o
  backend adicionar as perms, esses itens so aparecem para quem ja as tiver — honesto, sem fabricar acesso.
- status: aberto (**bloco backend de reconciliacao de permissoes**: adicionar `purchase_orders:read`/
  `reports:read` ao `PERMISSION_CATALOG` + alinhar grants de dashboard/aprovacoes a matriz). Nao bloqueia F11.

## P-029 - Ω2-a.2: modal de edicao de Tarifa mantem selects de referencia habilitados, mas o backend os ignora (2026-07-12)

- descricao: achado MEDIA do validador-mestre no gate de Ω2-a.2. Referencias da Tarifa (Tabela de Valores/
  Servico/Cliente) sao IMUTAVEIS no update por design (oraculo T-OMEGA2A-2): `tariff.service.ts:update()`
  nao le `price_table_id`/`service_catalog_id`/`customer_id` do body. Porem `TariffFormModal.tsx` em modo
  edicao mantem os tres selects habilitados e envia os valores no PATCH — o backend responde 200 mantendo
  o original (verificado ao vivo: PATCH trocando `price_table_id` devolveu 200 com o priceTableId original).
  O usuario altera a referencia, ve sucesso, e nada muda (edicao silenciosamente descartada).
- impacto: honestidade de UX (intencao do usuario descartada sem feedback); sem corrupcao de dado (a lista
  re-busca e mostra o estado real). Sem impacto de seguranca/isolamento.
- correcao sugerida: `disabled={isEdit}` + hint ("referencia nao pode ser alterada; crie outra tarifa")
  nos tres selects em modo edicao — ou 400 no backend para tentativa de alteracao de referencia.
- status: aberto. Nao bloqueia Ω2-a.2 (veredito APROVADO).

## P-030 - Ω2-a.2: residuais BAIXA do gate (comentario 422 enganoso; mapeamento P2003 especifico nao dispara; A6 fora deste arquivo) (2026-07-12)

- descricao: (a) `frontend/src/modules/registry/tariffs/tariffs.types.ts:74` comenta que `status` tem
  "transicao validada no backend → 422" — Tarifa NAO tem maquina de estado (status e texto livre max 40;
  o proprio types.ts diz isso no topo). (b) o mapeamento P2003→`invalid_price_table_reference`/`invalid_
  service_catalog_reference`/`invalid_customer_reference` em `tariff-prisma.repository.ts` nao dispara no
  ambiente vivo (Prisma 7 nao expoe o nome da constraint no meta da forma esperada); cai no generico
  `invalid_reference` (400 com mensagem clara — o proprio oraculo declara `invalid_reference` no teste
  live, sem divergencia declarada x real; os ramos especificos sao codigo morto hoje). (c) a pendencia A6
  (busca server-side nos selects para tenants >100 registros) esta registrada em D-OMEGA2A-tabela-valores-
  tarifas.md, mas nao espelhada aqui — fica espelhada por esta entrada.
- impacto: cosmetico/manutencao; nenhum efeito funcional.
- status: aberto (limpar comentario e ramos mortos num chore; A6 vira bloco de UX quando houver tenant >100).

## P-031 - Higiene: diretorios untracked .claude/skills/* fora do escopo das PRs (2026-07-12)

- descricao: working tree contem `.claude/skills/{blockchain-developer,cloud-architect,cloud-devops,
  payment-integration,skill-creator}` untracked, alheios ao diff de Ω2-a.2 (pre-existentes ao gate).
- impacto: risco de entrarem por acidente num commit futuro (`git add -A`).
- status: aberto (decidir: versionar deliberadamente em bloco proprio ou adicionar ao .gitignore).

## P-032 (Ω2-e) — item de menu Configurações ainda gateado por tenant.manage
- `frontend/src/navigation/tenantNavigation.ts` (item tenant-settings) segue com `tenant.manage`/allowedRoles
  [Super Admin, Administrador], enquanto App.tsx (guard da rota) e as matrizes já usam `tenant_settings:read`
  (manager lê). Efeito de RENDER é inerte (sidebar vem de NAV_BY_ROLE; o path não está no /navigation/menu).
  Alinhar tenantNavigation ao `tenant_settings:read` em bloco futuro (revisar cadastros-nav/sidebar-nav).
- P-033 (transversal): `prisma/seed.ts` só concede permissões aos STANDARD_ROLES; `auditor` não recebe no
  banco os `*:read` que o catalog.ts lhe dá (tags/pois/tenant_settings) → GET 403 ao vivo p/ auditor. A
  matriz promete R. Alinhar o seed de role_permissions ao catálogo (afeta blocos Ω2-b→e).

## P-Ω3a (Ω3-a ServiceQuote) — pendências declaradas
- **Aditivo `quotes[]` no detalhe da OS** (`GET /work-orders/:id`) DEFERIDO para Ω3-e (consumidor natural;
  H1 do crítico: exige novo parâmetro opcional em `toWorkOrderDto`, não cabe em `links`). O filtro
  `/service-quotes?workOrderId=` já entrega quotes-por-OS por ora.
- **Degradação por permissão (ressalva cognicao-visual):** um papel com `service_quotes:read` mas SEM
  `service_catalog:read`/`customers:read`/`work_orders:read` verá as colunas Serviço/OS/Cliente caírem no
  fallback `shortRef` (UUID truncado, id completo no `title`) — degradação graciosa, não bug. Caso concreto:
  **finance** tem quotes:read/create/update mas NÃO tem service_catalog:read/customers:read → o modal de novo
  orçamento e as colunas ficam sem rótulo humano para finance. Decidir: conceder a finance
  `service_catalog:read`+`customers:read`+`work_orders:read`, ou aceitar a degradação. Não bloqueia (junta 5/5).
- **Achados validador-mestre resolvidos no ciclo 2:** quantity sem teto → guard `assertMoneyInRange(quantity)`
  (422, paridade InMemory×Prisma) + 2 testes; contagem de smoke documentada corrigida (13→12).

## P-Ω3b (Ω3-b Despacho endurecido + Comentário/Timeline da OS) — validador-mestre
- **P-034 (MÉDIA — granularidade RBAC, não isolamento):** o feed `recentEvents` do dashboard
  (`dashboard-prisma.repository.ts:91` — `workOrderEvent.findMany({ where: { tenant_id } })`) NÃO
  filtra por `event_type`. Com `work_order_comment` agora sendo evento de timeline da OS, o CORPO
  livre do comentário passa a aparecer no dashboard para papéis com `dashboard:read` mas SEM
  `work_orders:read` — hoje **apenas `support`** (verificado: support = dashboard:read Y / work_orders:read N).
  É TENANT-ISOLADO (RLS por tenant_id; sem vazamento cross-tenant) e estende comportamento
  pré-existente (mensagens de sistema created/status/assigned já vazavam a support pelo mesmo feed);
  o novo é o texto livre do usuário poder conter PII. Cenário concreto: manager comenta "cliente com
  CPF X reclamou" → support (sem work_orders:read) lê no dashboard. Mitigar em bloco futuro: filtrar
  `work_order_comment` do `recentEvents`, OU alinhar a exposição do feed a `work_orders:read`. Não bloqueia.
  **RESOLVIDO no fechamento do bloco (ciclo 2):** `dashboard-prisma.repository.ts` e `dashboard.repository.ts`
  (memory, paridade) agora filtram `event_type != work_order_comment` no feed; teste de regressão
  `[P-034]` em `work-order-comments-routes.test.ts` prova que o comentário (com marcador) não aparece no
  `/dashboard/summary`. Auditoria (§2.8) provada AO VIVO: `SELECT count(*) FROM audit_logs WHERE metadata LIKE '%marker%'` = 0.
- **P-035 (BAIXA — doc):** contagem por arquivo do task-history — **CORRIGIDA** para 8+9+8=25 (após +P-034).

## P-036 (PRÉ-EXISTENTE — descoberto no smoke do Ω3-c) — create de checklist quebrado no live/prisma
- `POST /api/v1/tenant/checklists` (live, CORE_SAAS_PERSISTENCE=prisma) → 400 `invalid_request`:
  "Unknown argument `tenant_id`" em `checklist-prisma.repository.ts:105` (`checklistTemplate.create`).
  Causa provável: conflito checked×unchecked do Prisma (v7.8.0) ao misturar o FK escalar `tenant_id`
  com o nested `components: { create }`. **NÃO introduzido pelo Ω3-c** (esse arquivo é intocado por
  este bloco; o schema de ChecklistTemplate é intocado). Corroborado: `mobile-checklists-available`
  falha no baseline. O smoke do Ω3-c contornou seedando o template publicado via psql — o CONGELAMENTO
  no despacho, o §2.8 (sem tenant_id) e a imutabilidade foram provados no live prisma path com esse seed.
- Correção (bloco futuro): usar `tenant: { connect: { id } }` no create OU o unchecked create explícito.
  Afeta toda criação/edição de template de checklist no live prisma.

## P-037 (Ω3-c, BAIXA — validador) — assimetria memory×prisma em freezeChecklistSnapshot
- Prisma grava `updated_by: actorUserId ?? null`; InMemory grava `updatedBy: actorUserId ?? current.updatedBy`.
  Inócuo no fluxo real (o despacho SEMPRE tem `actor.userId`). É o MESMO padrão pré-existente de
  `updateGeocode` (memory `?? current.updatedBy` × prisma `?? null`) — mantido por consistência com o
  irmão. Alinhar ambos (freeze + geocode) num bloco de higiene futuro. Não bloqueia.
- (A asserção tautológica em checklist-snapshot-dispatch.test.ts — 2º achado BAIXA — foi REMOVIDA no fechamento.)

## P-Ω3d (Ω3-d Anexos de OS) — coverage/cosmético (junta APROVOU; não-veto)
- **413 too_large:** COBERTO no fechamento (teste com blob 11MB > default 10MB).
- **file_required:** COBERTO no fechamento (multipart sem part `file` → 400 file_required); título do teste corrigido.
- **Cleanup de órfão (service.ts catch pós-store):** só código + revisão de 3 agentes; falta teste que force
  falha de insert pós-store e prove `deleteObject`. Follow-up (precisa de repo-stub injetável no service).
- **Auditoria §2.8 no caminho prisma:** `recordRequestAuditBestEffort` faz early-return em memory
  (audit-request-context.ts:39) → o allowlist de metadados curados só roda em prisma. §2.8 provado no DTO
  (API+DB, ao vivo) e por código; falta um teste prisma-mode do registro de auditoria. Follow-up.
- **Migration name:** RENOMEADA de `20260732000000` (dia 32 inválido) → `20260801000000` (2026-08-01) + registro
  do _prisma_migrations do dev atualizado; `migrate status` = up to date. RESOLVIDO.

## P-INFRA-RLS (transversal — apontado pelo coordenador no Ω3-d) — RLS não enforçada em runtime (dev)
- O app conecta no Postgres como `postgres` (`rolsuper=true`, `rolbypassrls=true`), então as policies RLS
  (ENABLE+FORCE) de TODAS as tabelas são BYPASSADAS em runtime dev. O isolamento multi-tenant é sustentado
  pela camada de APLICAÇÃO (filtros `tenant_id` + `assertX` + `withTenantRls` que seta `app.current_tenant_id`).
  PRÉ-EXISTENTE e plataforma-wide (não do Ω3-d). RLS fica como defense-in-depth para quando o app conectar
  com role NÃO-superusuário. **Forte candidato para a rodada de saneamento-infra.**

## P-SAN-E2E - Playwright e2e fora do gate obrigatório (Ω-GATE, 2026-07-13)
- descricao: `npm run test:e2e` (Playwright) NÃO entra no gate obrigatório do CI neste PR Ω-GATE — exige app
  servido + seed e é lento/frágil sem staging. O gate backend agora roda a SUÍTE INTEIRA (`node --test tests/*.test.ts`)
  com Postgres+Redis service containers + `prisma migrate deploy`.
- impacto: cobertura e2e não bloqueia merge até haver staging no ar.
- acao: promover o Playwright e2e para job bloqueante rodando CONTRA o staging na trilha Ω-INFRA-2 (PR 5).
- status: aberto (planejado p/ Ω-INFRA-2)

- ATUALIZACAO (Ω-INFRA-2, 2026-07-14): o CD de staging (deploy-staging.yml + smoke-staging.mjs) foi ENTREGUE
  como config-as-code (gated por STAGING_DEPLOY_ENABLED). O Playwright e2e bloqueante roda contra o staging APOS a
  ATIVACAO (hand-off: conta Fly + secrets no Environment staging). Ate la, e2e segue fora do gate obrigatorio.

## P-SAN-CORE-PRISMA-COV - Adapter prisma do Core SaaS não é exercido pelo gate (Ω-GATE, 2026-07-13)
- descricao: o gate força `CORE_SAAS_PERSISTENCE=memory`; testes que precisam de banco (auth-*/*-prisma/RLS/
  audit) usam `DATABASE_URL` direto, mas o **adapter prisma do Core SaaS** (`createCoreSaasService` no modo
  `prisma`) nunca é executado na suíte. Apontado pelo critico J-SAN-1.
- impacto: o caminho prisma do core é "experimental/controlado" (env.ts) e sem cobertura automatizada; regressões
  nele passariam pelo gate.
- acao: bloco futuro adiciona um teste do adapter prisma do core (subir contra Postgres do CI, um smoke de
  createTenant/listUsers no modo prisma) OU decisão explícita de manter o core em memory até a migração completa.
- status: aberto (cobertura; não bloqueante — modo controlado)

## P-SAN-KPI-BACKFILL - Backfill de merge_commit/approved_head nos KPIs pode persistir null (Ω-GOV, 2026-07-13)
- descricao: na politica KPI-por-PR (D-KPI-PER-PR), `merge_commit`/`approved_head` da entrada de KPI do PR nascem
  `null` (so existem pos-merge) e sao preenchidos no BACKFILL do bloco seguinte (junto da reconciliacao PR#/hash).
  Se um bloco for o ULTIMO antes de uma pausa, o `null` pode persistir sem backfill. Apontado pelo critico (J-SAN-2).
- impacto: rastreabilidade — uma entrada de history com merge_commit null fica sem link de commit ate o proximo
  bloco reconciliar. Baixo (o `pr` e o merge sao recuperaveis pelo git/gh).
- acao: ao encerrar uma rodada/pausa, rodar um backfill final dos campos null das ultimas entradas de KPI.
- status: aberto (trade-off documentado da politica per-PR)

## P-SAN-KRYOS - Descontaminação Kryos (Ω-DOCS, 2026-07-13) — RESOLVIDA
- descricao: conteudo do projeto Kryos (refrigeracao/SCADA) vazou para o repo (estudo-doutoral-interfaces-10-saas.md
  citado como fonte de UI; 4 linhas de 09-mapa-telas com SCADA/DeviceDetail/Kryos).
- resolucao: arquivo + pasta docs/research/ removidos; 09-mapa-telas reescrito; 6 citacoes historicas retificadas;
  D-DOCS-KRYOS registrada. Grep de auditoria zerado (exceto registro da limpeza + notas de retificacao + falso
  positivo "fluido refrigerante" em WorkOrderDetailPage.tsx).
- status: **RESOLVIDA** (Ω-DOCS, PR3 da rodada saneamento).

## P-SAN-CORS - CORS bare (`app.use(cors())` = `*`) e CORS_ORIGIN é config morta (Ω-INFRA-1, 2026-07-13)
- descricao: `src/app.ts` usa `cors()` sem opcoes → `Access-Control-Allow-Origin: *` em todos os ambientes; a env
  `CORS_ORIGIN` (compose/.env.example) nao e consumida em lugar nenhum. PRE-EXISTENTE (fora do diff Ω-INFRA-1).
  Mitigado hoje: auth 100% Bearer (sem cookie; cors() default nao seta Allow-Credentials) e a topologia
  containerizada e same-origin (nginx faz proxy /api → api:3000).
- impacto: aceitavel em dev/validacao local; INACEITAVEL em producao real.
- acao: **GATE do Ω-INFRA-3 (go-live)** — ligar o CORS a allowlist por env lendo `CORS_ORIGIN` (sem `*`), com
  teste. Apontado pelo agente-secops (J-SAN-4). TLS/HSTS terminados no provedor tambem entram na config do PR5/6.
- status: **RESOLVIDO (Ω-INFRA-3, 2026-07-14).** `src/app.ts` usa `cors({ origin: env.CORS_ORIGINS.length>0 ?
  array : true })`; `env.ts` adiciona `CORS_ORIGIN` (CSV) + gate no superRefine que REJEITA vazio/`*` (e qualquer
  entrada contendo `*`) em produção (fail-closed, espelha o gate do JWT). Testes: `tests/cors-env.test.ts` (gate) +
  `tests/cors-routes.test.ts` (integração no express: origem permitida refletida, proibida não). `force_https`
  nos tomls de produção. Prova viva de CORS restritivo no `smoke-production.mjs`.

## P-SAN-SEED-GUARD - Seed demo sem guarda de runtime contra produção (J-SAN-5, 2026-07-14)
- descricao: `db:seed:demo` nao tinha guarda de runtime `NODE_ENV=production`; a protecao dependia so da ausencia
  do passo no CD. Apontado pelo agente-secops (J-SAN-5, obs MÉDIA).
- status: **RESOLVIDO (Ω-INFRA-3, 2026-07-14).** `prisma/seed-guard.ts` (`assertSeedAllowed`) chamado no topo de
  `seed.ts`/`seed-users.ts`/`seed-fleet.ts`: aborta em `NODE_ENV=production` salvo opt-in ESTRITO one-shot
  `ALLOW_PROD_SEED` (só `1/true/yes/on` — sem o footgun `Boolean("false")`). Teste `tests/seed-guard.test.ts`.
  HONESTIDADE: no RUNNER do CI o `NODE_ENV` NAO e production → a guarda cobre container/manual; no vetor de
  pipeline a protecao primaria e a AUSENCIA do passo de seed no `deploy-production.yml`.

## P-SAN-PROD-BOOTSTRAP - Bootstrap idempotente do 1o platform_admin real (Ω-INFRA-3, 2026-07-14)
- descricao: o seed atual so cria o tenant DEMO; `User.tenant_id` e NOT NULL/FK Restrict (nao existe platform_admin
  tenant-less). Um bootstrap de produção precisa criar tenant de SISTEMA + role super_admin + admin + credencial,
  idempotente, verificado contra banco prod-like. Fora do escopo do PR6 (config-as-code) — apontado por critico (C9).
- acao: entregar o script de bootstrap dedicado na ATIVACAO (Runbook B), rodado one-shot com `ALLOW_PROD_SEED=1`
  inline (removido em seguida). NUNCA usa `db:seed`/demo.
- status: aberto (follow-up de ativacao; nao bloqueia o merge da config inerte)

## P-SAN-PROD-WEBIMG - Rollback do frontend sem imagem GHCR (Ω-INFRA-3, 2026-07-14)
- descricao: o job docker do `ci.yml` publica só `erp-backend` no GHCR; o web nao tem imagem → o rollback-por-imagem
  (simetrico ao backend) nao se aplica ao frontend (hoje: `fly releases` nativo ou rebuild do SHA). Apontado por
  devops (C3).
- acao: publicar a imagem do web no GHCR num bloco futuro de infra para simetria total do rollback.
- status: aberto (mitigado por `fly releases`; nao bloqueia o merge)

## P-SAN-INFRA1-NITS - Nits não-bloqueantes do Ω-INFRA-1 (J-SAN-4, 2026-07-13)
- (1) Imagem do backend 837MB (engine Prisma + node slim): aceitável p/ MVP; otimizar (distroless/alpine +
  binaryTargets enxutos) em bloco futuro. (2) `docker-compose.prod.yml` roda `CORE_SAAS_PERSISTENCE=memory` —
  valida containers/nginx/proxy/migrate/health, NÃO exercita o caminho prisma do core-saas (soma-se à
  P-SAN-CORE-PRISMA-COV). (3) `web depends_on: api` sem `condition: service_healthy` → 502 transitório até a api
  subir (cosmético). (4) Custo do Fly na PD levemente otimista pós-cobrança de snapshots (jan/2026, $0.08/GB) —
  não muda o ranking. (5) `/health` cru é liveness; o profundo é `/health/ready` (documentado).
- status: aberto (nits; nenhum bloqueia)

## P-Ω3F1-ENTITYTYPE - Enum técnico cru na linha "Entidade" da aprovação (J-OMEGA3F-1, 2026-07-14)
- descricao: `GeneralInfoTab.tsx` (aprovação operacional) exibe `${approval.entityType} · ${code}` → o enum
  técnico `work_order|checklist_run|evidence` aparece cru na UI ("work_order · OS-123"). PRE-EXISTENTE (veio
  1:1 da página de detalhe antiga; NÃO introduzido pelo Ω3F-1). Apontado por cognicao-visual (J-OMEGA3F-1).
- acao: humanizar (mapa enum→rótulo PT-BR) no **Ω3F-3** (dono da superfície Financeiro/aprovação).
- status: aberto (não bloqueia; fora do escopo UI-shell do Ω3F-1)

## P-Ω3F2B-ACENTOS - Varredura de acentuação no WorkOrderForm + validador (J-OMEGA3F-2B, 2026-07-14)
- descricao: labels de Input e mensagens do validador de OS são sem-acento pré-existentes ("Identificacao",
  "Titulo", "Endereco do atendimento", "Titulo obrigatorio.") — débito §11.3 NÃO imputável ao Ω3F-2b (que
  seguiu a família certa p/ não criar dissonância lado a lado). Microcopy nova já acentua.
- acao: bloco de varredura único acentuando labels + mensagens de `WorkOrderForm.tsx` e
  `work-orders.adapter.ts` (validateWorkOrderForm) de uma vez, destravando a convenção p/ os próximos Ω3F.
- status: aberto (apontado por cognicao-visual)

## P-Ω3F3A-MOEDA-AGREGADO - Total agregado somava moedas heterogêneas (J-OMEGA3F-3A, 2026-07-15) — RESOLVIDO NO PR
- descricao: o GET de itens financeiros da OS agrega `totalAmount = roundMoney(items.reduce(...))` e emite
  `currency: items[0]?.currency`. Sem trava, itens de moedas diferentes na MESMA OS produziriam um total sem
  sentido (soma de BRL+USD sob o rótulo do 1º item). Apontado por **validador-mestre** (achado MÉDIA) na junta
  J-OMEGA3F-3A.
- decisao: **correção imediata** (não adiado). `WorkOrderFinancialService.create` passa a exigir homogeneidade de
  moeda por OS — o 1º item fixa a moeda; lançamento com moeda divergente → 422 `currency_mismatch`
  (`work-order-financial.service.ts`). Assim o agregado é SEMPRE single-currency e o rótulo `items[0].currency`
  é fiel. PATCH não altera moeda (congelada no lançamento).
- status: RESOLVIDO neste PR (Ω3F-3a) para acesso SEQUENCIAL + teste de regressão `currency_mismatch`.
- ressalva TOCTOU (critico J-Ω3F-3A, C1 — não bloqueia): a trava é um read-then-write não-transacional sem
  backstop de banco (diferente da idempotência, que tem o unique parcial). Dois POST concorrentes numa OS vazia
  podem ver ambos `length===0` e inserir moedas distintas. Dano restrito: cada linha preserva sua própria moeda
  no DTO; só o rótulo/soma do agregado do GET fica sem sentido nessa janela. Caminho interativo de finance/manager
  (baixa concorrência); mesmo padrão TOCTOU já aceito no codebase.
- follow-up: guarda em nível de banco (CHECK/trigger de moeda única por `work_order_id` ativo) num bloco futuro,
  se a janela vier a importar. Aberto (não-bloqueante).

## P-Ω3F3B-UPDATE-VALIDA4 - Validação #4 depende da imutabilidade de customer/service no update (J-OMEGA3F-3B, 2026-07-15)
- descricao: a validação #4 (tarifa vigente na tabela do cliente) roda SÓ no create de OS. Hoje é sólida
  porque `UpdateWorkOrderInput` NÃO inclui `customerId`/`serviceCatalogId` (imutáveis pós-create) — o update
  é fisicamente incapaz de introduzir um par serviço+cliente novo sem tarifa. Apontado pelo critico-adversarial
  como INVARIANTE a registrar.
- acao: se um bloco futuro tornar `customer_id`/`service_catalog_id` MUTÁVEIS no update, a validação #4 DEVE
  ser replicada no update (senão abre bypass). Recomendação adicional (critico): adicionar teste explícito de
  ORDEM — serviceCatalogId bem-formado-mas-inexistente → 400 invalid_service_catalog_reference ANTES do 422
  tariff_not_found_for_service (a ordem é garantida pela posição do código; um teste trava regressão de
  reordenação).
- status: aberto (não-bloqueante; guarda de invariante para blocos futuros).

## P-Ω3F4B-SHARE-TOKEN-UNIQUE - share_token sem unicidade/índice; endpoint público adiado (J-OMEGA3F-4B, 2026-07-15)
- descricao: o Ω3F-4b gera `service_quotes.share_token` (randomUUID) mas a coluna NÃO tem `@@unique`/índice.
  Enquanto a leitura pública por token está ADIADA (D-Ω3F-4B-SHARE), é inerte. Apontado por validador-mestre
  (BAIXA) e fid-avaliador (não-bloqueante).
- acao: a fatia que abrir o endpoint público de leitura-por-token (`GET /orcamentos/compartilhado/:token`)
  DEVE adicionar unicidade + índice de lookup do share_token (migration) e passar por revisão secops
  (superfície não-autenticada; §2.8; sem vazar tenant/dados internos).
- status: aberto (não-bloqueante; guarda para a fatia do consumo público).

## P-Ω3F4B-APPROVE-CRASH - Crash duro entre reserva e carimbo do approve (J-OMEGA3F-4B ciclo1, 2026-07-15)
- descricao: o CAS fecha o duplo-faturamento concorrente (1 OS + 1×409), mas um crash DURO do processo ENTRE
  o claimForApproval (orçamento já approved) e o carimbo de created_work_order_id deixaria o orçamento
  approved-SEM-OS, irrecuperável pela máquina de estado. É FALHA SEGURA (nunca gera 2ª OS), não duplo-
  faturamento. Apontado pelo critico como residual de durabilidade cross-agregado (não-bloqueante).
- acao: resolver com transação única / outbox / job de reconciliação (orçamento approved sem OS há N min →
  reabrir ou reconciliar) numa fatia futura de robustez. A compensação atual só cobre erro do create (volta a
  draft), não crash entre passos.
- status: aberto (não-bloqueante; falha segura).

## P-Ω3F4C-ACTIVATION-PROMPT - Aprovar dispara sem diálogo de modo de acionamento/origem-destino (J-OMEGA3F-4C, 2026-07-15)
- descricao: no QuoteTab/OrcamentosPage o botão Aprovar chama approveServiceQuote(context, id, {}) — clique único,
  sem coletar `activation_mode` nem origem/destino (que o backend aceita como OPCIONAIS). O vídeo §1.3 mostra o
  approve perguntando "criar novo serviço?" + modo de acionamento. Apontado por fid-avaliador (não-bloqueante:
  o plano do -4c escopou "Aprovar→cria OS, mostra link"; activation_mode é opcional server-side).
- acao: fatia de UX subsequente — diálogo de confirmação no approve coletando modo de acionamento + origem/
  destino (para tipos que exigem, ex. reboque), passando ao corpo do approve. Fecha a fidelidade fina do #7.
- status: aberto (não-bloqueante).

## P-Ω3F5-DOC-TYPE - Categoria de documento no upload manual de anexo (Ω3F-5, 2026-07-15)
- descricao: o back de anexos (Ω3-d) deriva nome=fileName e tipo=mimeType; NÃO tem campo de categoria
  selecionável pelo usuário (só `description` livre, que nem é exposto no DTO). O vídeo §1.3 1:46–2:09 pode
  mostrar "tipo" como categoria. Decisão D-Ω3F-5-UPLOAD-TYPE: a aba usa `description` como rótulo por ora.
- acao: se a fidelidade exigir categoria, estender `WorkOrderAttachment.metadata.documentType` (aditivo, sem
  migration) + expor no DTO + selector na UI, numa fatia futura tocando o módulo de anexos.
- status: aberto (não-bloqueante).

## P-Ω3F5A-TAG-TOCTOU - Comentário pode persistir com uma tag a menos sob delete concorrente de tag (J-OMEGA3F-5A, 2026-07-15)
- descricao: addComment pré-valida todas as tags (422) e cria o comentário + attach das tags em transações
  RLS SEPARADAS. Se uma tag for HARD-deletada na janela entre a pré-validação e o attach, a FK RESTRICT
  rejeita (agora traduzido para 422 tag_not_found, não mais 500 — corrigido no PR), mas o comentário JÁ foi
  gravado → persiste com uma tag a menos + cliente recebe 422. Janela estreitíssima; estado resultante válido
  (comentário existe). Apontado pelo critico (não-bloqueante).
- acao: robustez — envolver create-do-comentário + attach-das-tags numa ÚNICA transação (ou reordenar) para
  atomicidade total, numa fatia futura. Hoje: 500→422 corrigido; orfandade residual só sob corrida rara.
- status: aberto (não-bloqueante; falha seseg — o 500 já foi eliminado).

## P-Ω3F6-COMISSAO - `keep_unpaid` grava a decisão mas não suprime a comissão (Ω3F-6, 2026-07-17)
- descricao: o cancel com `financial_decision='keep_unpaid'` ("manter valores sem remunerar o profissional")
  grava a decisão em `work_orders.financial_cancellation_decision`, mas o módulo `src/modules/commissions/`
  NÃO a consome — a supressão da remuneração ainda não acontece de fato. Decisão D-Ω3F-6-CANCEL: a OS é a
  fonte de verdade; o consumo fica para quem calcula comissão.
- acao: fatia futura — o cálculo de comissão deve ler `financial_cancellation_decision` da OS e suprimir a
  remuneração quando `keep_unpaid` (e quando `zero`, avaliar). Cruza com Ω4 (Financeiro do tenant).
- REQUISITO (critico J-Ω3F-6A): decisão `NULL` NÃO pode ser lida como `keep` por default — OS cancelada pelo
  caminho legado (P-Ω3F6-STATUS-BYPASS) é AMBÍGUA e exige tratamento explícito, senão vira cobrança errada.
- status: **RESOLVIDO PARCIAL (WS-SCALE-COMISSAO, Onda 1)** — o chokepoint de ELEGIBILIDADE (criação do basis event
  de OS) passou a honrar a decisão: `src/modules/commissions/work-order-cancellation.gate.ts` lê o estado da OS
  DENTRO da tx `withTenantRls` (no `createBasisEvent` do repo — RLS satisfeito, atômico, idempotência-primeiro) e a
  regra pura `evaluateWorkOrderCommissionEligibility` marca o evento: `zero`/`keep_unpaid` → `ineligible` (suprime);
  `NULL`/ausente/desconhecida em OS cancelada → `pending_review` (segura, J-Ω3F-6A); `keep`/não-cancelada → elegível.
  Contrato = **201 + status persistido** (fila de revisão via `GET /commissions/basis-events?status=pending_review|ineligible`),
  não 422 (retry-safe, auditável). Ataque de desenho 3-lentes (idempotência/RLS/contrato) + junta 3/3 APROVADO_CONDICIONADO.
  Sem migration/schema/permissão nova.
- ESCOPO COBERTO (explícito, achado MEDIA do crítico-adversarial): **APENAS a INGESTÃO** (o basis event nasce marcado
  quando a OS JÁ está cancelada no momento do POST). A **supressão efetiva de remuneração continua 100% pendente** —
  depende de (a) a engine de cálculo (que NÃO existe: só `seedCalculationForTests`) honrar o status, e (b) reverter OS
  cancelada DEPOIS da conclusão (o fluxo comum: OS conclui → basis event `received` → OS cancelada depois mantém
  `received`). NÃO ler esta pendência como "quase pronta": o mecanismo principal de pagamento é o dual-gate (abaixo).
- COBERTURA DE TESTE (achado MEDIA CI-doutor/crítico → P-Ω3F6-COMISSAO-PRISMA-COV): o caminho Prisma real
  (`readWorkOrderCancellationPrisma` no client real, dentro da tx `withTenantRls`) é coberto só por tsc + revisão; os
  11 testes exercitam o dublê InMemory. Adicionar teste DB-gated quando houver lane de DB migrado (não-bloqueante;
  alinhado a P-SAN-CORE-PRISMA-COV).
- CONTRATO DO PRODUTOR (achado BAIXA crítico): a supressão só dispara se o produtor do basis event usar `sourceType`
  canônico `work_order` e `sourceId` = **UUID da OS**. `sourceId` não-UUID (ex.: código `OS-100`) → no-op silencioso
  (eligible). Premissa a validar contra qualquer produtor real de basis events.

## P-Ω3F6-COMISSAO-REVERSAL - dual-gate na engine de cálculo + reversão de comissão de OS cancelada pós-conclusão (WS-SCALE-COMISSAO, 2026-07-19)
- descricao: o gate de WS-SCALE-COMISSAO fecha só o chokepoint de ELEGIBILIDADE (basis event). Dois furos ficam para a
  fatia da engine de cálculo (que HOJE não existe em produção — só `seedCalculationForTests`): (a) **cancel pós-conclusão**
  — basis event criado com OS `completed` (elegível) e a OS cancelada DEPOIS: o evento sobrevive `eligible` e uma futura
  engine pagaria; (b) a materialização do valor (calculation/statement) não re-resolve o estado FINAL da OS.
- acao: quando a engine de cálculo for construída ela DEVE (dual-gate) re-resolver a decisão da OS via a MESMA regra pura
  `evaluateWorkOrderCommissionEligibility` (reusar, não reescrever) antes de materializar valor, e refutar/reverter
  calculations de basis events cujo estado virou `ineligible`/`pending_review`. Alternativa complementar: hook no
  `work-order.service.cancel()` que marca os basis events `eligible` da OS como `superseded` (o enum já tem o status) —
  via port injetado em app.ts (SEM import commissions→work-orders no runtime, evita ciclo).
- status: aberto (não-bloqueante; nenhuma engine paga hoje — o furo é latente, não ativo).

## P-Ω3F6-COMISSAO-PRISMA-COV - caminho Prisma do gate de supressão só coberto por tsc+revisão (WS-SCALE-COMISSAO, 2026-07-19)
- descricao: `readWorkOrderCancellationPrisma` (findFirst em `work_orders` dentro da tx `withTenantRls`, guarda `isUuid`
  contra P2023) NÃO é exercido por nenhum teste de regressão — os 11 testes da fatia batem no dublê `InMemoryWorkOrderCancellationGate`.
  A alegação central (read dentro da tx RLS → FORCE RLS satisfeito → sem fail-open), que é o furo #1 do ataque de desenho,
  fica travada só por tsc (valida model/coluna contra o client gerado) + revisão de código.
- acao: adicionar teste prisma-mode DB-gated (na lane de DB migrado do CI) do shape da query e do comportamento RLS,
  junto da fatia da engine/reversão (P-Ω3F6-COMISSAO-REVERSAL). Alinhado a P-SAN-CORE-PRISMA-COV.
- status: aberto (não-bloqueante; chokepoint de supressão de remuneração — priorizar quando a engine for construída).

## P-Ω3F6-STATUS-BYPASS - Cancelamento legado por PATCH /status não grava decisão financeira (J-OMEGA3F-6A, 2026-07-17)
- descricao: o `PATCH /work-orders/:id/status` (perm `work_orders:status`; usado também pela fila offline do
  mobile via `mobile-work-order-sync.ts`) ainda aceita `status=cancelled` e NÃO grava
  `financial_cancellation_decision` (fica NULL) — contornando o gate do `POST /cancel`. Repro executado pela
  junta (coordenador-de-acessos + critico): operator cancelava por lá com decisão null e itens financeiros
  intactos.
- mitigado NESTE PR: `changeStatus` passa a exigir `work_orders:cancel` para o destino `cancelled` (403
  `cancel_requires_permission`) — cumpre o que o catálogo já dizia e barra operator/technician/
  field_technician/field_dispatcher (inclusive pelo mobile). **Resíduo:** quem TEM :cancel (manager/
  tenant_admin/super_admin) ainda cancela pelo legado sem decisão → NULL.
- acao: antes de Ω4/comissões, FECHAR o cancelamento pelo legado (422 redirecionando para `POST /cancel`) —
  exige coordenar o contrato da fila offline do mobile (o app precisaria enviar a decisão ou perder a
  capacidade de cancelar, o que é defensável: técnico de campo não arbitra cobrança).
- IRREPARABILIDADE (critico J-Ω3F-6A, rodada 2 — muda a FORMA da correção): a OS cancelada pelo legado fica
  irreparável — `POST /cancel` responde 422 em OS já cancelada, logo NÃO existe caminho de API que grave a
  decisão depois; o dinheiro fica de pé (itens intactos, total > 0). Consequência: quando Ω4/comissões chegar,
  NÃO basta "ler o campo e tratar NULL" — vai exigir BACKFILL/migração das OSs já canceladas pelo legado,
  decidido caso a caso. A irreparabilidade NASCE deste PR (antes não havia rota /cancel): é dívida por omissão
  cujo custo CRESCE a cada cancelamento legado → o prazo "antes de Ω4/comissões" é prazo COM JUROS, não desejo.
- MOBILE (coordenador J-Ω3F-6A, não-bloqueante): `mobile/flutter_app/lib/features/work_orders/ui/
  work_order_execute_screen.dart:241` ainda renderiza `allowedTransitions` incluindo `cancelled` (models:67-92) —
  o técnico VÊ o botão "Cancelada", enfileira local-first e só descobre o 403 no sync (a fila rejeita limpo via
  actionErrorResult, não envenena). Remover a afordância no app junto do fechamento do bypass.
- status: aberto (mitigado; resíduo conhecido).

## P-Ω3F6-TERMINAL-GUARD - Itens financeiros podem ser lançados em OS cancelada (J-OMEGA3F-6A, 2026-07-17)
- descricao: `work-order-financial.service.create` só valida a existência da OS (`assertWorkOrder`), sem guarda
  de estado terminal → POST de item numa OS já cancelada retorna 201. Isso quebra a invariante criada pelo
  Ω3F-6a (`decision=zero ⇒ total=0`): basta lançar um item depois do cancel. Repro do critico: decision=zero +
  total=999. Não é regressão deste PR (a porta já existia), mas a invariante é nova.
- acao: guarda de estado terminal em work-order-financials (e avaliar em service-quote-items): recusar
  create/update quando a OS está `cancelled` (422). Coordenar com Ω4/comissões.
- status: aberto (não-bloqueante hoje — não há consumidor de comissão ainda).

## P-Ω3F6B-MENUITEM-INLINE - `.ui-menu-item` com background inline mata o hover (J-OMEGA3F-6B, 2026-07-17)
- descricao: a classe `.ui-menu-item` do DS só tinha `:hover`/`:focus-visible`, SEM regra base — então cada
  consumidor setava `background: transparent` INLINE para não herdar o cinza do UA. Como style inline vence
  seletor de classe, o `:hover` NUNCA disparava. A cognicao MEDIU no app vivo: hover morto no ⋮ da OS **e**
  em `DanosPage.tsx:77-86`, `MultasPage`, `ManutencaoPage` (todas copiaram o mesmo padrão quebrado).
- corrigido NESTE PR (Ω3F-6b): regra base `.ui-menu-item { background: transparent }` em `app.css` (a classe
  virou auto-suficiente) + remoção do inline no `WorkOrderActionBar`.
- acao: remover o `background: "transparent"` inline dos menus de `DanosPage`/`MultasPage`/`ManutencaoPage`
  (agora desnecessário e nocivo) — hover volta a viver nelas também. Fatia de chore no front.
- status: aberto (o DS já está consertado; falta limpar os consumidores legados).

## P-Ω3F6B-DS-NITS - Nits de DS/A11y apontados na J-OMEGA3F-6B (2026-07-17)
- (1) **CTA navy × azul**: `.ui-button--primary` = `#12385c` (tokens) enquanto a MESMA barra usa `#2563EB`
  inline no "Abrir checklist" (e o protótipo usa #2563EB). Divergência SISTÊMICA (atinge WorkOrderForm) →
  promoção de token merece junta própria, não contrabando num PR de cancelar/duplicar/imprimir.
- (2) **⋮ não fecha com Esc nem clique fora** (medido: ambos deixam o menu aberto) — e o menu tem item
  destrutivo. Precedente pronto em `DanosPage.tsx:529-566` (Escape + foco + clique-fora).
- (3) **`Modal` sem foco inicial/trap/Esc** (`components/ui/index.tsx:121-136`) — gap pré-existente do DS.
- (4) Ícones da barra ANTIGA sem `aria-hidden` (os do Ω3F-6b já têm).
- (5) `WorkOrderStatusPayload` ficou órfão em types (o `updateWorkOrderStatus` foi removido) — limpar no
  próximo bloco que tocar o arquivo (coordenador, cosmético).
- status: aberto (nenhum bloqueia; a cognicao deferiu todos como pendência).

## P-Ω3F6-ZERO-ATOMICIDADE - `zero` do cancel: N deletes sequenciais sem transação (+ N+1) (pós-análise Ω3F-6, 2026-07-17)
- descricao: `WorkOrderService.zeroFinancialItems` percorre os itens e chama `financials.delete` um a um, SEM
  transação. Se o k-ésimo delete falhar, os anteriores já foram soft-deletados e a OS **não** é cancelada →
  OS VIVA com itens financeiros destruídos silenciosamente + 500 para o gestor (pior dos dois mundos). O
  comentário do código chegou a afirmar que a ordem impedia isso — corrigido para dizer a verdade.
  Além disso é N+1: cada `financials.delete` refaz `assertWorkOrder` (re-busca a OS inteira) + findById +
  softDelete → 2+3N queries, com a OS já resolvida no `cancel`.
- acao: `softDeleteAllByWorkOrder(tenantId, workOrderId, actorUserId)` no repositório de work-order-financials
  (uma query, atômica no Postgres) consumido pelo `zeroFinancialItems` — mata a parcialidade E o N+1 de uma vez.
  Casar com P-Ω3F6-TERMINAL-GUARD (a outra direção do par cancelado↔total 0).
- status: aberto (N é pequeno hoje; falha no meio é rara — mas o dano é destrutivo e silencioso).

## P-Ω3F6B-MENU-GATE-SEM-TESTE - Gate do menu ⋮ não é coberto (provado por mutação) (pós-análise Ω3F-6, 2026-07-17)
- descricao: os predicados `canCancelWorkOrder`/`canDuplicateWorkOrder` são testados, mas **nada prova que o
  JSX os usa**: o menu só monta com `menuOpen=true` e os testes são SSR sem interação. A pós-análise trocou
  `{canDuplicate ?` e `{canCancel ?` por `{true ?` (removendo o gate dos dois itens destrutivos) e a suíte
  ficou **427/427 verde**. Os testes que pareciam cobrir isso miram títulos de MODAL (que só existem com o
  modal aberto) ou um caminho que a ActionBar nem renderiza.
- corrigido NESTE PR de chore: menu extraído para `WorkOrderActionsMenu` (componente puro, exportado) +
  teste SSR que monta o menu com/sem permissão. A mutação agora quebra.
- status: RESOLVIDO (mantido o registro: a lição é que predicado testado ≠ predicado ligado).

## P-Ω3F7B-MAPA-ETAPA - Mapa de posição por etapa: falta a FONTE DE DADOS (Ω3F-7b, 2026-07-17)
- descricao: a spec do Ω3F-7 pede na aba Mobile um "mapa da posição do técnico em cada etapa" (enviado/aceito/
  origem/destino). Mas `FieldOperatorLocation` é localização AO VIVO (Mapa Operacional), não um snapshot
  histórico por etapa de despacho — NÃO existe endpoint/agregação que devolva lat/lng do operador em cada
  validação de uma OS. O `OperationsMapLibreCanvas` consome FieldLocationItem[] ao vivo, não posições por etapa.
- decisão (D-Ω3F-7B-MAPA): o mapa por etapa fica DIFERIDO para a Junta de Mapas (mais central ao Ω3F-8, aba
  Mapa da OS). A MobileTab NÃO mostra andaime "em breve" (§11.2) — a seção do mapa simplesmente não existe até
  haver dado. Entregou timeline de etapas (com hora) + preview do checklist.
- acao (Junta de Mapas): (a) definir a fonte — snapshot de FieldOperatorLocation por etapa do despacho
  (migration/agregação backend nova, ou capturar a posição no momento de cada FieldDispatchEvent); (b) modo
  read-only do canvas (markers estáticos por etapa, sem cluster/animação/pulso); (c) fallback sem WebGL.
- status: aberto (endereçar no Ω3F-8 com o planejador-mapas).

## P-Ω3F7-MOBILETAB-NITS - Nits da pós-análise da MobileTab (Ω3F-7, 2026-07-17)
- (M2) A defesa contra vazamento de mock na MobileTab (filtro `item.workOrderId === workOrder.id` quando o
  dispatch service cai em fallback-mock) NÃO é testada: os testes SSR não rodam useEffect, então o estado
  `ready` (onde o filtro age) nunca renderiza. Vale um teste que injete um DispatchListItem de outra OS e prove
  que ele não aparece. Baixo risco (o filtro está correto por inspeção), mas é anteparo load-bearing sem rede.
- (M4) Divergência memory×Prisma de precisão não coberta: os testes de km rodam em memory (guarda o number JS
  verbatim); no Postgres DECIMAL(10,1) arredonda p/ 1 casa. Borda invisível ao teste (km é 1-casa por design);
  registrar a lacuna de fidelidade.
- corrigido NESTE chore: M1 (a MobileTab disparava um GET da lista INTEIRA de OS que nunca usava → opt-out
  `enrich:false` em listDispatchesFromApi) e M3 (cap do front alinhado ao MILEAGE_MAX do backend + comentário
  impreciso do service).
- status: aberto (M2/M4 são cobertura/fidelidade de teste; M1/M3 resolvidos).

## P-Ω3F-9-SLA-FIELD — Campo de prazo/SLA real na OS (aberta, Ω3F-9)
O badge de atraso do Ω3F-9 é DERIVADO de `scheduled_for` (não há `due_at`/SLA no schema). O protótipo mostra
"Xh restantes" (deadline real), que o dado atual não sustenta — por isso o selo é binário "Atrasada". Reabrir
para adicionar um campo de prazo/SLA real (migration) + recompor o "restantes" fiel ao protótipo. Não é bug;
é fidelidade adiada por decisão explícita (D-Ω3F-9-BADGE).

## P-Ω3F-9-DISPATCH-DTO — Expor "envio ativo" no DTO da lista de OS (aberta, Ω3F-9)
A visibilidade de "Revogar envio" na linha é heurística (permissão + status não-terminal); a existência real do
despacho só é confirmada no clique (descoberta lazy). Follow-up opcional: expor `hasActiveDispatch`/
`activeDispatchId` no DTO da lista de OS para visibilidade exata sem o GET extra. Rejeitado no PR do -9 para
manter 100% front (tocaria o serializer da lista + suíte de contrato). Baixo impacto (o clique já trata
ausência com mensagem benigna e a corrida GET→PATCH cai em 409/terminal_dispatch).

## P-Ω4-2A-NITS — Observações da junta do Ω4-2a (2026-07-17)
- **Para Ω4-6 (informativo do validador-mestre):** o chokepoint `assertPeriodOpen` hoje bloqueia só
  `financial_period_closes.status='closed'`. O estado intermediário `'closing'` (que o Ω4-6 introduz) NÃO
  trava escritas. Decidir no Ω4-6 se `closing` também deve congelar a competência durante o fechamento em curso.
- **(BAIXA) Ordem de erro em request duplamente-inválido:** create/update rodam o resolver de conta + chokepoint
  ANTES da validação de campos (parseAmount etc. nos args do repository.*). Request com conta inválida + amount
  inválido pode devolver `invalid_account_reference`/`period_closed` (InMemory) vs `invalid_amount` (Prisma) —
  mesma classe, código divergente só em edge duplamente-inválido. Sem impacto de correção/segurança.
- **(BAIXA) Campos opcionais não podem ser LIMPOS via PATCH** (document/category/account_id="" preserva o
  valor) — consistente entre os dois repos e com o Ω4-1; limitação conhecida, intencional no v1.

## P-Ω4-COMPETENCIA-TZ — RESOLVIDO (fix-omega4-competencia-tz, pré-Ω4-6)
`deriveCompetencia` (financial-title.validators.ts) usa `getUTCMonth`. Um título emitido 31/07 23h BRT (UTC-3)
= 01/08 02:00 UTC → competência "2026-08" (deveria ser "2026-07"). Isso ALIMENTA o chokepoint assertPeriodOpen
(consulta financial_period_closes por competência) e o relatório financeiro — classificar no mês errado fura a
trava retroativa do Ω4-6. Sutileza: date-only ("2026-07-01") parseado como UTC-midnight dá o mês CORRETO com
getUTCMonth, mas converter naïve para BR-local daria June (errado); e o default `new Date()` (instante real) dá
o mês errado com getUTCMonth. Nenhum dos dois (naïve-UTC / naïve-local) é correto p/ ambos os casos. Fix
recomendado: decidir a semântica de issue_date (data contábil vs timestamp) + derivar competência no fuso de
negócio (America/Sao_Paulo, possivelmente tenant-configurável), ancorando date-only ao meio-dia local para não
cruzar a fronteira do dia. **Bloco dedicado com decisão + testes de fuso antes do Ω4-6.** Sintoma-irmão (BAIXA):
`isTitleOverdue` compara `due_date.getTime() < now` (naïve UTC) → título "vencido" ~27h cedo no fim do dia BR.

## P-Ω4-ACCOUNT-ACTIVE — Título pode referenciar conta financeira INATIVA (BAIXA — decidir no Ω4-4)
O resolver de conta (InMemory findById não filtra is_active; Prisma FK aponta para a row que sobrevive ao
soft-delete) aceita account_id de conta desativada. Agenda-se liquidação para conta inativa. Relevante ao Ω4-4
(Caixa/pagamentos): decidir se a conta de liquidação precisa estar ativa (rejeitar → 400/422).

## P-Ω4-2A-COBERTURA — Nits menores do Ω4-2a (BAIXA)
- GET /:id de título soft-deletado → 200 (a list esconde; as mutações dão 404). Decidir se detalhe de excluído
  deve aparecer; hoje inconsistente e não testado.
- Sem índice `(tenant_id, created_at)` (ordenação default faz sort em memória) — perf quando o volume crescer.
- `nullable()` no prisma-repo é dead code (service nunca passa null; campos opcionais não limpáveis — nit conhecido).

## P-Ω4-FINANCE-READ-ORFA — /finance (dashboard) ainda gated pela órfã finance:read (BAIXA, Ω4-8)
O Ω4-2b moveu as rotas-filhas /finance/charges e /finance/payments para a perm real financial_titles:read, mas
o dashboard-pai /finance (FinanceiroPage, ainda MOCK) e o item de menu FINANCEIRO seguem na órfã finance:read/
finance.read. Resolver no Ω4-8 (dashboard real): trocar o gate por uma perm real (financial_titles:read ou uma
finance_dashboard:read dedicada) quando a FinanceiroPage consumir o backend.

## P-Ω4-2B-KPI-AGREGADO — KPIs/tabs somam só as linhas carregadas (MÉDIO, Ω4-8 Dashboard)
Os KPIs e as tabs de Cobranças/Pagamentos somam sobre as linhas carregadas (agora limit=100, antes 20) e
apresentavam o headline como total da org. Mitigado no Ω4-2b pós-análise: limit=100 + faixa honesta "Somando
os N de M" quando total>carregado. Cobertura COMPLETA (endpoint de agregados/summary no backend, ou paginação
real) fica para o Ω4-8 (Dashboard financeiro real). Relacionado: "Recebidas/Pagos (mês)" usa competencia (mês
contábil), não a data de baixa (que não existe no DTO — Ω4-4 introduz pagamento/baixa) — rótulo impreciso até lá.

## P-Ω4-2B-A11Y — Menu ⋮ e modais sem dismiss por Escape/clique-fora + focus-trap (BAIXA)
TitleRowActions (menu sem outside-click/Escape, dois menus podem ficar abertos) e TitleFormModal/TitleCancelPrompt
(role=dialog/aria-modal sem focus-trap/foco inicial/Escape; backdrop fecha mesmo em submit). Padrão leve herdado
do Ω3F-6; endurecer quando houver um componente de menu/modal compartilhado do DS.

## P-Ω4-3-REFATURAR-DELTA — Faturar o delta de itens adicionados após o 1º faturamento (BAIXA, fatia futura)
A idempotência do faturamento é por (tenant_id, work_order_id, direction) — 1 título receivable por OS. Um item
lançado no Financeiro da OS APÓS o 1º faturamento fica "a faturar", mas o 2º POST /invoice dá 409 already_invoiced
(não fatura o delta). Faturar o delta (2º título com Σ dos itens não-faturados, ou aditar o título) é fatia futura.
Item novo pós-faturamento permanece editável (invoiced_at NULL); só os já carimbados travam (item_invoiced 422).

## P-Ω4-3-TEST-HERMETIC — createMemoryWorkOrderInvoicingService não é puramente memory (BAIXA)
O WorkOrderInvoicingService.invoke() alcança createDefaultWorkOrderService()/createDefaultFinancialTitleService()
por dynamic import — que honram o env (congelado no import). Sob `.env` prisma, tests/work-order-invoicing.test.ts
falha 15/16 (CI é verde porque roda com CORE_SAAS_PERSISTENCE=memory). Fix: injetar work-order/title services no
construtor do invoicing service (como o WorkOrderFinancialService faz) para o factory memory ser hermético.

## P-Ω4-3-INVOICE-ATOMIC — Título↔carimbo não-atômico (BAIXA)
createForWorkOrder (título) e markInvoiced (itens) são 2 statements sem $transaction. Crash entre eles: título
criado com itens não-travados (invoiced_at NULL → editáveis). A idempotência (índice parcial) preserva "1 título
ativo/OS", mas a divergência amount↔itens fica possível nesse recorte raro. Ideal: envolver em $transaction.
Distinto de P-Ω4-3-REFATURAR-DELTA (que é o delta de itens pós-faturamento).

## P-Ω4-3-CURRENCY-BRL — Item da OS aceita moeda ≠ BRL, mas faturar exige BRL (MÉDIA-BAIXA)
work-order-financials (Ω3F) usa parseCurrency da shape compartilhada (aceita QUALQUER ISO de 3 letras) + trava
só de homogeneidade ("todos iguais ao 1º"), então uma OS inteira em USD/EUR é construível. No faturamento (Ω4-3),
o título só aceita BRL (v1) → 400 invalid_currency vindo de OUTRO módulo, beco sem saída. Fix: alinhar
work-order-financials ao allowlist {BRL} v1 (ou o título aceitar a moeda congelada quando o multi-currency chegar).
Reachable só via item manual não-BRL (baixa prob). Ω3F-module — mudar toca módulo mergeado + seus testes.

## P-Ω4-3-INVOICE-TOCTOU-DELETE — DELETE de item durante o faturamento infla o título (BAIXA)
Entre listInvoiceableByWorkOrder (lê o agregado) e markInvoiced, um item ainda-não-faturado pode ser soft-deleted
(assertItemNotInvoiced passa: invoiced_at ainda null). O título nasce com a Σ que INCLUÍA o item, mas markInvoiced
pula deletados → title.amount > Σ dos itens carimbados. TOCTOU no READ (distinto de P-Ω4-3-INVOICE-ATOMIC = crash
título↔carimbo). Fix: ler o agregado + carimbar na MESMA $transaction com lock. Estreito, mas o dano é dinheiro.

## P-Ω4-3-INVOICE-LEASTPRIV — Rota invoice não exige work_order_financials:read (BAIXA)
POST /work-orders/:id/invoice gateia só financial_titles:create mas LÊ os itens financeiros da OS. finance tem
ambas, impacto baixo; por least-privilege, considerar exigir também work_order_financials:read.

## P-Ω4-4-READINESS — O que o Ω4-4 (Caixa/liquidação) precisa construir (GUIA, não bug)
Notas de prontidão do título para a liquidação dirigir partially_paid/paid:
- **paid_amount é IMUTÁVEL** hoje: não entra em UpdateFinancialTitleInput e o update o exclui. Ω4-4 precisa de um
  WRITE-PATH NOVO no repo (ex. applyPayment) — NÃO reusar o update genérico.
- **partially_paid/paid são INALCANÇÁVEIS** por mutador atual: FINANCIAL_TITLE_STATUS_TRANSITIONS não tem aresta
  ENTRANDO neles e changeStatus os rejeita como destino manual. Ω4-4 precisa de um caminho de LIQUIDAÇÃO dedicado
  (que seta status+paid_amount juntos, contornando assertStatusTransition), com invariante paid_amount<=amount.
- **createForWorkOrder não seta accountId** (título faturado nasce accountId=null): a liquidação captura em qual
  conta o dinheiro entrou (FinancialEntry → conta). A conta de liquidação deve estar ATIVA (P-Ω4-ACCOUNT-ACTIVE).
- **Prontos:** ida-e-volta título↔OS exposto (workOrderId no DTO do título; titleId/invoiced no DTO do item);
  título faturado nasce due_date hoje+30d, status open, competencia derivada, paid_amount 0. Estorno=contra-lançamento.

## P-Ω4-4-EDGES — Bordas do Ω4-4 (Caixa/Extrato + liquidação) — implementado, com decisões e limites
Entregue no bloco Ω4-4 (branch feat-omega4-4-cash). Decisões e bordas que ficam como pendência de fatias futuras:
- **Estorno de uma LIQUIDAÇÃO não reverte o título.** O contra-lançamento (POST /financial-entries/:id/reverse)
  nasce SEM title_id (pura correção de caixa) e NÃO decrementa paid_amount / reabre o status do título. Reverter o
  estado do título ao estornar seu pagamento é concern de fatia futura (Ω4-5+). O saldo da CONTA volta ao anterior.
- **currency_mismatch é defensivo no v1.** Conta e título são BRL-only (allowlist), então a igualdade de moeda
  (lançamento=conta=título) nunca dispara com entrada válida no create/pay a não ser moeda divergente no corpo do
  create (ex.: currency=USD → 422). Novas moedas exigem decisão de escopo (câmbio/saldo multi-moeda).
- **Editáveis do lançamento = category/description apenas.** amount/direction/account/occurred_at/competencia são
  IMUTÁVEIS pós-create (mexer em occurred_at moveria a competência e furaria o chokepoint de período fechado).
- **Erros da liquidação são bi-modais por origem** (mesmo shape HTTP): título (cancelado/pago/overpayment/404) →
  FinancialTitleError; conta/moeda/idempotência/chokepoint → FinancialEntryError. reason/statusCode idênticos ao contrato.
- **Reconciliação (reconciled=true) já trava mutação** (422 entry_reconciled), mas NÃO há endpoint que concilie nesta
  fatia (reconciled nasce false; conciliação bancária é Ω4-5). A trava está fiada e testável por construção do repo.
- **Paridade InMemory×Prisma** é estrutural (mesmo contrato de repo/DTO/erros); a suíte roda só em memory
  (CORE_SAAS_PERSISTENCE=memory) — o caminho Prisma não é exercido sem banco, como nos vizinhos Ω4-1/4-2a.

## P-Ω4-4-LIQUID-ATOMIC — Liquidação lançamento↔título não-atômica (MÉDIA)
payTitle faz assertPayable → entry.create → applyPayment (3 statements, sem $transaction). Numa corrida REAL de 2
pagamentos do MESMO título SEM client_action_id: ambos passam assertPayable, ambos criam lançamento (saldo da CONTA
+= ambos), e o 2º applyPayment recusa (422 overpayment) COM o lançamento já persistido → saldo inflado enquanto o
título fica consistente (nunca sobre-pago — applyPayment re-valida guardPayable). Mitigação existente: com
client_action_id o 2º entry.create dá 409 duplicate_payment ANTES do applyPayment. Fix: envolver entry.create +
applyPayment em prisma.$transaction (documentar limitação InMemory). Só o cenário sem token idempotente + concorrência
genuína abre a janela.

## P-Ω4-4-REVERSE-MUTABLE — reverse() não chama assertMutable — ✅ RESOLVIDO no Ω4-5
update/delete barram lançamento reconciled (422), mas reverse não. **Fechado no bloco Ω4-5**
(branch feat-omega4-5-reconciliation): reverse() agora chama `this.assertMutable(original)` logo após
`getWritable`, ANTES do guard B1 (espelha a ordem de delete()). Estornar um lançamento conciliado → 422
entry_reconciled (exige desconciliar antes). Precedência documentada: um contra-lançamento conciliado que
for estornado dispara `entry_reconciled` (422) ANTES de `reversal_pair_immutable` (422) — mesma classe HTTP,
reason diferente. Sem regressão em A1/B1 (testes de estorno operam sobre lançamentos não conciliados).

## P-Ω4-4-REVERSE-IDEM — Idempotência do estorno é app-level sem rede no banco (MÉDIA)
reverse faz check-then-act (findActiveReversalOf → create) SEM índice único em reversal_of (diferente da
liquidação, que tem índice parcial). 2 reverse(A) concorrentes → 2 contra-lançamentos → saldo estornado em dobro.
Fix: índice único parcial (tenant_id, reversal_of) WHERE reversal_of IS NOT NULL AND deleted_at IS NULL +
$transaction. Casa com o tratamento de atomicidade do P-Ω4-4-LIQUID-ATOMIC.

## P-Ω4-4-CHOKEPOINT-CLOSING — chokepoint só bloqueia 'closed', não 'closing' — ✅ RESOLVIDO no Ω4-6 (M2)
isPeriodClosed (financial-title.repository) só reconhecia status='closed'; o enum tem open|closing|closed|reopened.
**Fechado no bloco Ω4-6** (branch feat-omega4-6-period-close): `isPeriodClosed` (InMemory + Prisma) agora trata
status ∈ {closing, closed} como bloqueante (M2) e {open, reopened} como escrivível. Endpoints close/reopen entregues
(módulo financial-period-closes). `reconcile` NÃO chama assertPeriodOpen → segue exento por construção (extrato
pós-fechamento; D-Ω4-5-RECONCILE-META) — confirmado por teste. O ramo 'closing' é DEFENSIVO/futuro: o close v1 é
atômico open→closed e NUNCA escreve 'closing' (a coluna closing_started_at é reservada). **M1 (liquidar título de
período fechado) NÃO é bug** — é D-Ω4-POS-FECHAMENTO ratificada (pagamento é evento da competência corrente;
paid_amount é acumulador vitalício; applyPayment gated só pelo período do caixa).

## P-Ω4-6-CLOSE-RACE — read-skew entre a leitura do snapshot e o commit do 'closed' (MÉDIA, v1 aceita)
O close lê títulos+lançamentos da competência e grava a linha `closed` na MESMA withTenantRls tx (atômico
INTERNAMENTE). O furo é o read-skew vs WRITERS concorrentes: o write-path (create de título/lançamento) checa o guard
`isPeriodClosed` numa transação SEPARADA do INSERT (RlsPrisma…isPeriodClosed abre um withTenantRls próprio; o create
abre OUTRO) e NÃO pega lock em (tenant,period). Um writer que leu 'open' mas cujo INSERT confirma logo APÓS o close
vaza um título no período fechado, fora do snapshot. **Correção do texto (ataque emenda a):** SERIALIZABLE só no close
NÃO aborta esse writer (o insert-tx do writer não lê a linha de close → sem dangerous structure para o SSI); e 'closing'
como especificado é INERTE em v1 (nada o escreve, e não ajudaria writers que já leram 'open'). O fix REAL exige o
guard-read do writer NA MESMA tx do write compartilhando lock em (tenant,period) — ex.: `pg_advisory_xact_lock(hashtext(
tenant||':'||period))` pego por AMBOS os lados — escopo que toca os write-paths Ω4-2..4 (fora deste bloco). Mitigação
parcial entregue: o close JÁ pega o advisory lock em (tenant,period) (serializa fechamentos concorrentes) e documenta que
a proteção fica completa quando o writer também o pegar. **Controle compensatório REAL (D1):** a re-derivação MATERIAL
(computeMaterialSnapshot, que exclui paid_amount/status/reconciled/updated_*) flagra a posteriori um título vazado por
corrida (count/sumAmount extra vs o snapshot congelado), mantendo-se imune a pagamentos cross-mês/reconcile legítimos.
Espelha o precedente P-Ω4-4-LIQUID-ATOMIC.

## P-Ω4-6-REOPEN-FOUR-EYES — reopen sem segundo ator (risco residual conhecido, BAIXA)
reopen ∈ {super_admin, platform_admin, tenant_admin} + reason obrigatório (RN-FIN-009). Risco residual (ataque emenda h,
anotado, não bloqueia): um `tenant_admin` sozinho pode reopen→editar→reclose com auto-auditoria (sem four-eyes). Aceitável
no MVP; eventual notificação/segundo ator no reopen. A trilha é preservada (snapshot.history append-only + AuditLog de
cada close/reopen — d/ataque), então o ciclo fica AUDITÁVEL mesmo sem four-eyes.

## P-Ω4-5-DIVERGENCE — Ω4-5 Conciliação (divergence_type + write-path de reconcile) — ✅ RESOLVIDO
**Entregue no bloco Ω4-5** (branch feat-omega4-5-reconciliation). Migration aditiva 20260813000000_add_reconciliation
(4 colunas nullable divergence_type/reconciliation_ref/reconciled_at/reconciled_by + @@index(tenant_id,reconciled)),
typing, PATCH /financial-entries/:id/reconcile (reusa financial_entries:update, sem permissão nova) + 2 filtros de
lista (?reconciled=, ?divergence_type=). Decisões endurecidas pelo ataque adversarial:

- **D-Ω4-5-DIVERGENCE-NARROW (allowlist {value,date}, não {value,date,missing,duplicate}):** o guia original
  misturava duas naturezas — value/date são "conciliado com ressalva" (reconciled=true faz sentido), enquanto
  missing/duplicate são razões de NÃO conciliar (estado reconciled=false). Como o write-path só grava divergence
  quando reconciled=true, missing/duplicate seriam inalcançáveis e a semântica ficaria contraditória. Estreitado
  para {value,date}. missing/duplicate agora → 400 invalid_divergence_type. Anotar "razão de não-conciliação" num
  lançamento desconciliado é fatia futura (exigiria desacoplar divergence_type da flag).
- **D-Ω4-5-RECONCILE-META (conciliar/desconciliar ATRAVESSA período fechado):** reconcile NÃO chama assertPeriodOpen.
  Conciliação é META-DADO (não altera amount/direction/deleted → não mexe na soma da competência que o chokepoint
  protege). Coerente com D-Ω4-POS-FECHAMENTO. Racional decisivo: o extrato bancário chega DEPOIS do fechamento do
  mês — gate-ar por período fechado travaria o caso de uso nº1 (conciliar lançamento de competência já fechada) e
  congelaria o estado de conciliação para sempre (nem update/delete/reverse por assertMutable, nem desconciliar pelo
  gate). O teste-guia que esperava 422 period_closed foi INVERTIDO para asseverar sucesso.
- **D-Ω4-5-RECONCILE-REVERSAL-PAIR (conciliar par de estorno é permitido):** reconcile NÃO checa reversal-pair
  (conciliar é sobre o EXTRATO; o original estornado E o contra-lançamento podem casar no extrato). update/delete
  de reconciliado seguem 422 via assertMutable (inalterado).
- **§2.8:** reconciledBy (UUID) exposto no DTO de detalhe (paridade com createdBy/updatedBy já expostos); lista
  expõe só divergenceType (enxuta). Auditoria financial_entry.reconciled carrega só {reconciled, divergence_type}
  — reconciliation_ref (texto/ref externa) FICA FORA da auditoria (conservador com §2.8, como audit() omite amount).

Testes de overpayment na borda de centavo + chokepoint bloqueando pay/reverse já cobertos no Ω4-4; nada pendente aqui.

## P-Ω4-5-BATCH — conciliação em LOTE (importar extrato CSV/OFX → casar N lançamentos) — ADIADO
O Ω4-5 entrega só o reconcile UNITÁRIO por lançamento (PATCH /financial-entries/:id/reconcile). Conciliação em lote
(upload de extrato bancário CSV/OFX, matching automático de N lançamentos, tabela ReconciliationBatch com linhas
importadas e status de casamento) é fatia futura — não cria tabela/endpoint de lote nesta fatia. Quando priorizada,
avaliar: modelo ReconciliationBatch + ReconciliationLine, parser de OFX/CSV, heurística de matching (valor+data+ref),
e resolução manual de linhas não casadas.

## P-Ω4-6-READINESS — O que o Ω4-6 (Fechamento) precisa construir + a exceção reconcile (GUIA CRÍTICO)
- **M1 (SNAPSHOT):** reconcile é EXENTO do chokepoint (D-Ω4-5-RECONCILE-META) e MEXE em updated_at/updated_by +
  reconciled/divergence_type/reconciliation_ref/reconciled_at/reconciled_by de lançamentos de competência FECHADA
  (reconcile pós-fechamento é o caso de uso nº1). Logo o snapshot/checksum do fechamento DEVE ser computado SÓ sobre
  colunas financeiramente materiais (amount, direction, deleted_at, competencia) e EXCLUIR explicitamente as colunas
  de reconcile + updated_at/updated_by. Senão um reconcile pós-fechamento faria o snapshot divergir das linhas vivas.
- **M2 (GUARD 'closing'):** o guard futuro de 'closing' (P-Ω4-4-CHOKEPOINT-CLOSING) deve nascer DENTRO de
  assertPeriodOpen/isPeriodClosed (a cadeia que create/update/delete/reverse/payTitle atravessam) — assim reconcile
  fica EXENTO automaticamente (nunca chama assertPeriodOpen), que é o comportamento desejado. NÃO fazer um check
  separado de 'closing' que esqueça de excluir reconcile.
- **Ω4-6 a construir:** endpoints close/reopen sobre financial_period_closes (status open|closing|closed|reopened já
  existe, SEM service/endpoints); snapshot de pendências (RN-FIN-008 checklist); fechar atômico ($transaction: snapshot
  + flip status); reabertura exige permissão dedicada + motivo + auditoria (RN-FIN-009/RN-AUD-005). ANTES: resolver P-Ω4-COMPETENCIA-TZ.

## P-Ω4-5-CATEGORY-CASE — Filtro ?category= é case-sensitive (BAIXA, pré-existente Ω4-4)
parseFilterToken faz toLowerCase() mas category é gravada preservando caixa → ?category=Servico não casa "Servico".
Paridade InMemory×Prisma preservada (ambos iguais). direction/payment_method/divergence_type não sofrem (lowercase na escrita).
Fix: lowercar category na escrita OU no filtro usar ILIKE/case-insensitive. Baixíssimo, herdado do Ω4-4.

## P-Ω4-COMPETENCIA-TZ — STATUS: RESOLVIDO (2026-07-18)
deriveCompetencia agora formata em `America/Sao_Paulo` (Intl, IANA — acompanha DST se voltar) e parseBusinessDate
(src/config/business-time.ts, compartilhado por título/lançamento) ANCORA date-only à MEIA-NOITE BR-local (-03:00,
Brasil sem DST desde 2019) + datetime sem offset → BR-local + **round-trip que rejeita dia fora de range** (2026-06-31
etc. → 400, não rola p/ o mês seguinte — furo ALTA do critico corrigido). Testes de fronteira de fuso (financial-titles
+ financial-entries). Escolha: meia-noite BR-local (não meio-dia) — funcionalmente correto (offset de verão histórico
-02:00 < -03:00 em magnitude → âncora sempre no MESMO dia civil BR mesmo se DST voltar; provado pelo critico). Junta
verify APROVADO (validador + critico), casos d/e cumpridos.

## P-Ω4-OVERDUE-TZ — isTitleOverdue + parseDueDate no fuso de negócio (BAIXA, sintoma-irmão)
Ainda pendente (fora do escopo do fix de competência): (1) isTitleOverdue compara due_date.getTime() < now (naïve) →
título "vencido" ~24-27h cedo no fim do dia BR; o correto é vencer quando o DIA de due_date TERMINA no fuso de negócio
(due_date + 1 dia, 00:00 America/Sao_Paulo). (2) parseDueDate ainda usa UTC-midnight enquanto issue_date/occurred_at
viraram BR-anchored (parseBusinessDate) — inconsistência (caso h do critico). Fix bundle: parseDueDate usar
parseBusinessDate + isTitleOverdue comparar contra fim-do-dia BR. Baixo impacto (borda de virada de dia).

## P-Ω4-6-FRONT-RESOLVE-NAME — /financial-periods expõe closedBy/reopenedBy UUID (BAIXA, para a fatia de FRONT)
O DTO/snapshot de fechamento expõe closedBy/reopenedBy como UUID cru (padrão backend, §2.8 OK — não vaza tenant/nome).
A futura tela de Fechamento (front) DEVE resolver UUID→nome antes de renderizar (precedente R-Ω3F-5b §11.2: UUID cru na UI = veto)
— reusar o UserNameResolver do Ω3F-5b.

## P-Ω4-6-NITS — Nits da pós-análise do Ω4-6 (BAIXA)
- L-4: pg_advisory_xact_lock(hashtext(tenant:period)) é int4 (2^32) — colisão serializa close/reopen cross-tenant
  (só throughput, nunca correção — a tx re-lê o estado). Considerar chave 64-bit (pg_advisory_xact_lock(int,int)) se o nº de tenants crescer.
- CORRIGIDOS nesta pós-análise: M-1 (balance.receivableOpen/payableOpen excluíam cancelados → agora sumOpen exclui;
  material mantém p/ checksum), L-1 (reclose deixava reopened_* obsoleto no DTO → nula quando status≠reopened),
  L-2 (forced:true só quando houve override real), L-3 (comentário "tabela vazia e nunca bloqueia" — falso desde Ω4-6, corrigido).

## P-Ω4-8-READINESS — Guia do Dashboard financeiro real (Ω4-8)
- GET /financial-periods/:period NÃO computa agregados de dinheiro AO VIVO para período ABERTO (só o checklist de
  pendências). O Dashboard precisa de A receber/A pagar/saldo do mês CORRENTE (não fechado). Barato de adicionar: um
  computeMaterialSnapshot preview ao vivo p/ período aberto (as linhas já são carregadas p/ o checklist). (L-5)
- Para período REOPENED, snapshot é o corpo pré-reabertura (stale-by-design) + checklist ao vivo — documentar p/ o Dashboard não tratar como corrente.
- snapshotHistory volta INTEIRO no GET/:period (cresce a cada reabertura) — o Dashboard deve pedir só o latest/paginar (L-6).
- balance.* já EXCLUI cancelados (M-1 corrigido) → o Dashboard pode consumir receivableOpen/payableOpen direto.
- P-Ω4-6-FRONT-RESOLVE-NAME: resolver closedBy/reopenedBy UUID→nome (UserNameResolver do Ω3F-5b) antes de renderizar.
- P-Ω4-2B-KPI-AGREGADO: os KPIs de Cobranças/Pagamentos somam só a página carregada — o Dashboard deve usar agregados de verdade.

## P-Ω4-7-READINESS — Guia do Cheque (Ω4-7)
- Cheque = meio de pagamento com status próprio (issued→deposited→cleared/bounced). Ao lançar caixa passa pelo
  chokepoint/competência automaticamente (via occurred_at do lançamento) — sem plumbing novo p/ o happy path.
- DECIDIR no comando: (a) competência de cheque PRÉ-DATADO ("bom para") — mês de EMISSÃO (occurred_at) vs mês de
  COMPENSAÇÃO — determina qual período o trava; (b) transições que flipam/revertem um lançamento (bounced) DEVEM ir
  pelo caminho de ESTORNO (chokepoint-guarded), NUNCA update destrutivo de lançamento de período possivelmente fechado.

## P-Ω4-7-CLEAR-ATOMIC — Resíduo de atomicidade do clear/bounce do cheque (BAIXA — espelha P-Ω4-4-LIQUID-ATOMIC)
O MUTEX (flip condicional) ELIMINA a dupla-postagem concorrente e o rollback trata falha do post. Resíduo: crash entre
o create do lançamento (sucesso) e o attach do id → cheque fica 'cleared' com cleared_entry_id=null (ou 'bounced' com
bounce_entry_id=null) e um lançamento posto sem back-link. Recuperável/detectável (cleared sem entry). Mesma classe do
payTitle (P-Ω4-4-LIQUID-ATOMIC). Ideal futuro: create+attach na MESMA $transaction Prisma (o InMemory já é atômico no
event-loop). Não bloqueia — a conservação de dinheiro nunca é violada (o post não duplica).

## P-Ω4-7-ENTRY-OWNERSHIP — Lançamento de cheque manipulável direto por /financial-entries (BAIXA)
cleared_entry_id/bounce_entry_id apontam FinancialEntry comuns. Um ator com financial_entries:update pode delete/reverse
esses lançamentos DIRETO pela API de lançamentos, dessincronizando o estado do cheque (o cheque exibiria 'cleared' com o
caixa removido). Mitigado por RBAC (financial_entries:update é finance/admin — mesma fronteira de confiança de
cheques:update) e pelo desenho D-Ω4-7-BOUNCE-NEW-ENTRY (o bounce NÃO depende mais de reverter cleared_entry_id — posta
contra-lançamento fresco). Fechamento forte (flag owned_by='cheque' bloqueando delete/reverse fora do orquestrador)
inverteria a dependência entries→cheques → adiado. Conservação de dinheiro do LEDGER é preservada (o guard de par de
estorno já impede re-estorno).

## P-Ω4-7-DUPLA-CONTAGEM — cheque-register vs payTitle p/ o mesmo dinheiro (BAIXA — risco de PROCESSO)
Nada no backend impede registrar+compensar um cheque E liquidar o mesmo título com payTitle(payment_method='check') p/ o
mesmo dinheiro físico → dois lançamentos independentes. É disciplina do usuário (fluxos distintos). Quando title_id
entrar em escopo do cheque, vincular cheque↔título e impedir liquidação dupla. Fora do escopo do Ω4-7 (title_id não modelado).

## P-Ω4-7-CLEAR-RETRO — Compensação retroativa a período fechado (BAIXA)
O clear sempre usa server-now → competência CORRENTE. Se o banco compensou de fato num mês já FECHADO, a data verdadeira
não é escriturável (usar now posta no mês corrente, coerente com caixa quando registrado). Política: compensação sempre no
período corrente aberto; retroação a período fechado exigiria reabertura (D-Ω4-6). Espelha D-Ω4-POS-FECHAMENTO. Documentado, não é dead-end silencioso (o clear falha com 422 period_closed se o mês corrente estiver fechado → cheque fica 'deposited').

## P-Ω4-8-SUMMARY-SCALE — /financial-summary faz full-scan das linhas (BAIXA)
O agregado carrega TODAS as linhas de título/lançamento/cheque do tenant em memória e soma em JS (espelha o dashboard
operacional; correto e com paridade InMemory↔Prisma). Para tenants grandes, otimizar com agregados SQL (SUM/COUNT/GROUP BY
por status/direção/competência direto no Postgres) — hoje só o saldo por conta já usa groupBy. Não bloqueia (data set de
dashboard); correção é performance, nunca correção de valor.

## P-Ω4-8-DASHBOARD-FIDELITY — Reduções de composição do dashboard vs financeiro.png (BAIXA/MÉDIA)
Junta do Ω4-8b (cognicao-visual) apontou 2 reduções HONESTAS de composição vs a referência (não bloqueantes):
- Tabela "Títulos recentes" tem 4 colunas (PARTE/VALOR/VENC./STATUS) em vez de 5 — a coluna DOCUMENTO (NF-e/Fatura) foi
  omitida porque o DTO GET /financial-summary não expõe tipo/número de documento do título. Follow-up: expor `document`
  no recentTitles do agregado e restaurar a coluna. Omissão honesta (não fabrica), mas diverge da §11 regra 6.
- Header expõe só "Atualizar" (refresh) em vez do CTA primário "Novo lançamento" + "Conciliar NF-e" da referência — não há
  fluxo de criação de lançamento no front ainda. Follow-up: reintroduzir o CTA quando o modal de novo lançamento existir.
CORRIGIDO na junta (MÉDIA): o adapter agora NORMALIZA status/direction dos recentTitles contra o enum (fallback seguro) →
o chip/label nunca recebe valor fora do mapa e quebra o render. Re-etiquetagem de KPI ("aberto" em vez de "30d"; "Saldo em
caixa" em vez de "projetado"; subtítulo sem org hardcoded) é MAIS honesta aos agregados reais (D-007) — mantida de propósito.

## P-Ω3F6 — cluster de cancelamento: STATUS-BYPASS/TERMINAL-GUARD/ZERO-ATOMICIDADE RESOLVIDOS (D-CANCEL-INTEGRITY, 2026-07-18)
Os três (bypass legado sem decisão; item em OS cancelada; N deletes não-atômicos) foram FECHADOS. Residuais BAIXA abertos:
- **P-Ω3F6-CANCEL-RACE:** cancel(zero) e financial.create não compartilham lock de linha — janela sub-ms em que um item
  posto entre o zero e o flip sobrevive (OS cancelled + total>0). Mesma classe dos TOCTOU aceitos (P-Ω4-4-LIQUID-ATOMIC,
  currency-mismatch). Fechar via SELECT ... FOR UPDATE da OS na tx do cancel + FOR SHARE no create (hardening futuro).
- **P-Ω3F6-LEGACY-NULL:** OSs canceladas pelo bypass ANTES deste bloco ficam com financial_cancellation_decision NULL (o
  CHECK é NOT VALID, não faz backfill). O consumidor de comissões (P-Ω3F6-COMISSAO) DEVE tratar NULL-em-cancelled como
  "sem decisão — segurar para revisão humana", nunca honrar como keep. `VALIDATE CONSTRAINT` só após reconciliar as legadas.
- **P-Ω3F6-CANCEL-IDEM:** cancel() não é idempotente por client_action_id — retry de rede após um /cancel efetivado cai em
  422 (transição inválida). Sem dano de dado; só ruído de retry. Aceitar client_action_id → 200 idempotente (futuro).
- **P-Ω3F6-MOBILE-DEADLETTER:** ações status=cancelled já enfileiradas OFFLINE (antes do update do app) recebem 422 no sync e
  o replay marca failed+retry até maxRetry. Mapear cancel_via_status_forbidden para estado terminal não-retryable (dead-letter)
  para drenar a fila. Não-bloqueante (sistema novo não tem fila legada com cancels).

## P-GOLIVE-SECRET-ROTATE — Chave Google Maps exposta redigida do HEAD; ROTAÇÃO humana obrigatória (CRÍTICA, secops go-live junta 2026-07-19)
Chave Google Maps API ativa estava hardcoded em docs/claude-code-handoff/ERP Web.dc.html:2670 (arquivo rastreado). REDIGIDA do
HEAD neste bloco (placeholder). Como a chave SEGUE no histórico git, deve ser considerada COMPROMETIDA → o dono DEVE revogar/
rotacionar no Google Cloud Console e restringir a nova chave (referer/HTTP + API + cota). Parada irredutível (exposição de segredo).

## P-GOLIVE-VALIDATE-CONSTRAINT — Operacionalizar VALIDATE CONSTRAINT do CHECK do cancelamento (MÉDIA, go-live)
O CHECK work_orders_cancelled_decision_check é NOT VALID (não valida linhas legadas). Hoje há 0 linhas cancelled+NULL no banco →
o VALIDATE passaria de imediato. Após aplicar 13..16 em produção e confirmar zero cancelled+NULL, rodar `ALTER TABLE work_orders
VALIDATE CONSTRAINT work_orders_cancelled_decision_check` (bloco de follow-up rastreado). Até lá, o consumidor de comissões trata
NULL-em-cancelled como "segurar para revisão" (P-Ω3F6-LEGACY-NULL). Ver docs/go-live-readiness.md.

## P-GOLIVE-GATES — Gates humanos de go-live (R1 provedor, R2 restore cronometrado, smoke autenticado) — docs/go-live-readiness.md
Readiness config-as-code = GO; ativação viva é fronteira humana. Gates que só existem no ambiente real: R1 (ratificar "dados no
Brasil"), R2 (drill de restore cronometrado com app vivo + login + RPO no runbook), staging verde antes de prod, PROD_SMOKE_EMAIL/
PASSWORD para cobrir rota autenticada no smoke. Checklist ordenado (12 passos) + custo (~US$47-110/mês) em docs/go-live-readiness.md.

## P-UI-REFRESH-LIVENESS — indicador sutil de auto-atualização nas telas (WS-UI-REFRESH, 2026-07-19)
- descricao: WS-UI-REFRESH removeu o botão manual "Atualizar" e ligou auto-refresh silencioso em 30 telas (o dono pediu
  explicitamente "o sistema faz isso automatico"). 29/30 telas NÃO exibem sinal visual de que a tela se atualiza sozinha —
  só OperationsMapPage mostra chips "Atualizando…"/"Atualizado {data}". Os hooks já expõem `isRefreshing` (não consumido nas
  páginas). Inclui a divergência cosmética de NotificationsPage (loadNotifications não expõe isRefreshing).
- acao: OPCIONAL (não-bloqueante; comportamento silencioso é o que o dono pediu). Se desejado, adicionar um indicador sutil e
  uniforme (chip/spinner via `isRefreshing` ou label "Atualizado às HH:MM") para paridade com o padrão-ouro do mapa e sensação
  de "tela viva". Cruza com WS-UI-CARDS/WS-UI-CHARTS (mesma passada de vitalidade de UI).
- status: aberto (não-bloqueante; sancionado pela junta como comportamento pedido).

## P-UI-REFRESH-ERROR-COPY — cópia de erro referencia refresh manual que não existe mais (WS-UI-REFRESH, 2026-07-19)
- descricao: alguns toasts/cópias de erro em ADAPTERS (fora do escopo do WS, não tocados) instruem recarregar manualmente,
  agora que o botão sumiu e a tela atualiza sozinha a cada 30s: `users.adapter.ts` ("Atualize a lista e tente novamente"),
  `damages`/`fines`/`maintenance`/`cycle-counts` adapters ("Recarregue a lista"), `DuplicateWorkOrderModal.tsx` ("Atualize a
  lista de ordens para encontrá-la"). Levemente enganoso.
- acao: passada de cópia futura — reescrever para refletir o auto-refresh (ex.: "a lista se atualiza automaticamente" / remover
  a instrução manual). São mensagens de erro (não empty-states).
- status: aberto (não-bloqueante; cosmético).

## P-RBAC-GATING-MOCKSHELLS — gating RBAC das 3 telas-casca fica com a ligação a dados (WS-SCALE-8TELAS, 2026-07-19)
- descricao: a auditoria RBAC listou 5 telas com botões de escrita expostos. WS-RBAC-GATING-CHECKLISTS gateou as 2 REAIS
  (service-backed): TenantChecklistsPage + ChecklistRunsPage. As outras 3 — DispatchConsolePage, TablePage (purchase-orders),
  PedidosPage — são CASCAS 100% mock (dados hardcoded, sem service/estado); seus botões não fazem nada.
- acao: gatear essas 3 JUNTO da ligação a dados reais (gate-on-wiring) em WS-SCALE-8TELAS — quando ganharem hook + service +
  usePermissions, aplicar o mesmo padrão (usePermissions + can + render condicional dos botões de escrita).
- status: aberto (não-bloqueante; hoje são mocks sem efeito).

## P-RBAC-CATALOG-MATRIZ — divergências pré-existentes catalog.ts × RBAC_MATRIX.md em checklists (2026-07-19)
- descricao: a junta (coordenador-de-acessos) achou 2 divergências PRÉ-EXISTENTES (não introduzidas pelo gating): (1) matriz
  linha 44 diz manager em execuções = 'read/complete-by-scope' (sem create), mas catalog.ts:328 concede `checklist_runs:create`
  a manager → manager vê "Iniciar execução" e o backend aceita (a UI espelha o backend, correto por §2.4, mas o backend
  over-concede vs a matriz); (2) matriz linha 43 diz finance/inventory = 'read' em templates, mas o catalog NÃO concede
  `tenant_checklists:read` a esses papéis → bloqueados já na rota (under-grant vs matriz).
- acao: reconciliar `catalog.ts` × `RBAC_MATRIX.md` (fonte de verdade da matriz) em WS-SCALE-8TELAS. Nenhuma das duas é
  exposição de ESCRITA — não é risco imediato.
- status: aberto (não-bloqueante; pré-existente).

## P-CHECKLIST-BUILDER-READONLY — builder interativo no modo "Visualizar" para papel só-leitura (2026-07-19)
- descricao: em TenantChecklistsPage, ao "Visualizar" um checklist, o builder interno (palette/canvas/inspector) permanece
  interativo para papel só-leitura. SEM impacto de segurança: são mutações apenas do `builderDraft` LOCAL (sem caminho de
  persistência — "Salvar builder"/"Publicar" já ocultos por canUpdate/canPublish). Comportamento PRÉ-EXISTENTE (view reusa o
  builder), não introduzido por esta fatia.
- acao: quando houver um modo somente-leitura real do builder, desabilitar as interações locais no view. Cosmético.
- status: aberto (não-bloqueante; sem persistência).

## P-CHECKLIST-RUNS-STATUS-COPY — status técnico cru na cópia da tela de execuções (2026-07-19)
- descricao: ChecklistRunsPage.tsx (~linha 105) renderiza `{item.status}` cru dentro de frase PT-BR ("… componentes ·
  {item.status}"), expondo valor técnico (ex.: "published") — roça §3/§11.2 (sem termo técnico na UI). PRÉ-EXISTENTE, fora do
  diff do gating RBAC (achado da cognicao-visual).
- acao: mapear status → rótulo PT-BR (ex.: published→"Publicado") numa passada de cópia. Cruza com P-UI-REFRESH-ERROR-COPY
  (mesmo lote de polish de cópia).
- status: aberto (não-bloqueante; cosmético).

## P-FINANCE-HEADER-ACTIONS — page header do Financeiro sem ações à direita (§11 #4, pré-existente, 2026-07-19)
- descricao: o header da FinanceiroPage tem só título+subtítulo, sem as ações à direita do protótipo ("Conciliar NF-e" +
  "Novo lançamento", ERP Web.dc.html:904) — contraria §11 regra #4 ("página header = título+subtítulo+ações à direita").
  PRÉ-EXISTENTE (não introduzido por WS-UI-CARDS+CHARTS; o botão "Atualizar" foi removido em WS-UI-REFRESH). Achado BAIXA
  da cognicao-visual.
- acao: restaurar ações significativas no header (Novo lançamento; Conciliar quando a trilha NF-e existir — cruza com a
  parada NF-e do scale-roadmap). Passada de fidelidade §11.
- status: aberto (não-bloqueante; cosmético/pré-existente).

## P-MAPA-GOOGLE-PADDING-RESIZE — GoogleMapsCanvas não re-enquadra ao expandir rail (WS-MAPA layout, 2026-07-19)
- descricao: no redesign de layout (overlays de vidro), o MapLibre reaplica `setPadding` (persistente) no resize, mas o
  GoogleMapsCanvas só aplica `padding` no `fitBounds` inicial; ao EXPANDIR um rail (ex.: técnicos colapsado→aberto) o Google
  dispara `trigger("resize")` mas NÃO re-enquadra → um pin de borda pode ficar sob o rail de vidro até a próxima interação.
- acao: em M-3, re-executar `fitBounds(bounds, mapPadding)` (ou `panBy`) no GoogleMapsCanvas quando `mapPadding` mudar. Só
  afeta o path Google (secundário/pago, chave redigida no go-live); no MVP MapLibre está correto.
- status: RESOLVIDO em M-3 (WS-MAPA, 2026-07-19). O GoogleMapsCanvas passou a guardar os pontos do cluster vencedor
  (`winnerPointsRef`) e re-executa `fitBounds(bounds, mapPadding)` via `fitInnerMapToWinner(innerMap, mapPaddingRef.current)`
  no efeito de resize (após `trigger("resize")`, ~220ms) — `resizeSignal` incrementa no mesmo toggle em que `mapPadding` muda,
  então o re-enquadramento usa sempre o padding atual. Espelha o `setPadding`+`resize()` persistente do MapLibre. Coberto por
  teste (`operations-map-technicians.test.ts`: "Google re-enquadra com o padding atual no resize").

## P-MAPA-TERM-OPERADORES — terminologia residual "operadores" no subtítulo/aria dos canvases (WS-MAPA M-3, 2026-07-19)
- descricao: M-3 reconciliou o card do rail de técnicos ("Técnicos de Campo"/"Técnico"), mas o subtítulo visível dos canvases
  ("X operadores e Y chamados no mapa", GoogleMapsCanvas.tsx:201/204) e os aria-label ("operadores em campo", GoogleMapsCanvas:218 /
  OperationsMapLibreCanvas:580) ainda dizem "operadores". "Operador de campo" é PT-BR de negócio legítimo (§3), não é vazamento
  técnico — por isso NÃO bloqueou o M-3; mas o dono pediu (req.3) consistência de terminologia nesta view.
- acao: reconciliar subtítulo + aria-labels para "técnicos"/"Técnicos de Campo" num bloco seguinte (M-4 ou touch-up), atualizando
  o teste operations-map-google-canvas que asserta o texto do subtítulo.
- status: RESOLVIDO (WS-MAPA M-4, 2026-07-19). Subtítulo do GoogleMapsCanvas → "N técnicos e M chamados no mapa"; aria-label do
  gmaps → "Mapa com a posição dos Técnicos de Campo"; aria-label do MapLibre → "Mapa dos Técnicos de Campo". Teste
  operations-map-google-canvas ganhou guarda de terminologia (subtítulo "técnicos" + aria "Técnicos de Campo" + doesNotMatch
  /operador/i). Obs.: o subtítulo da PÁGINA (OperationsMapPage header "…dos operadores em campo") ficou FORA do escopo M-4
  (canvases apenas) — segue como touch-up cosmético menor se o dono quiser.

## P-JMAPAS7-PERF-SCALE — otimização de agregação (groupBy SQL vs full-scan) no technician-performance (2026-07-19)
- descricao: o agregado GET /operations/technician-performance faz full-scan das OS ATRIBUÍDAS do tenant (3 colunas) e agrega no
  compute puro. Funciona CORRETO (feature completa, testada); em tenants com MUITA OS, um `groupBy` SQL (assigned_user_id, status)
  seria mais eficiente. Espelha a mesma escolha do financial-summary (agrega em memória sobre a leitura RLS).
- acao: OTIMIZAÇÃO FUTURA (não-bloqueante; NÃO é pendência funcional — a feature entrega o índice correto agora). Trocar por
  `prisma.workOrder.groupBy` quando/se o volume exigir. Sem mudança de contrato.
- status: aberto (otimização; feature funcionando).

## P-WOTS-SCALE — otimização de agregação (full-scan) no work-order-timeseries (2026-07-19)
- descricao: o agregado GET /operations/work-orders-timeseries varre as OS do tenant (só status+3 timestamps) e agrega no
  compute puro. Correto e completo; em tenants com muita OS, filtrar por janela na query + GROUP BY seria mais eficiente.
  Espelha a mesma escolha de technician-performance/financial-summary. NÃO é pendência funcional.
- acao: OTIMIZAÇÃO FUTURA (filtro SQL por from/to + agregação no banco) quando o volume exigir. Sem mudança de contrato.
- status: aberto (otimização; feature funcionando).

## P-WOTS-FRONT-ACCESS — gráfico temporal deve tratar 403 (papel sem work_orders:read) no Dashboard (2026-07-19)
- descricao: a série usa `work_orders:read` (mais restritiva que o `dashboard:read` do /dashboard/summary). Um papel com
  dashboard:read mas SEM work_orders:read (ex.: support) veria o Dashboard mas o gráfico temporal 403. O backend 403 corretamente.
- acao: no PR frontend do gráfico temporal, tratar o 403/erro com o estado obrigatório §7 ("acesso não permitido"/vazio honesto),
  nunca card quebrado. (A ser feito no próprio PR frontend do gráfico.)
- status: aberto (tratar no frontend do gráfico).

## P-PLATFORM-MOCK-WIRING - Telas de Plataforma 100% mock hardcoded (2026-07-20, WS-CARDS-CHARTS-F2 PR2b)

- descricao: `PlatformOverviewPage`, `PlatformHealthPage` e `PlatformTenantDetailPage` sao 100% andaime — KPIs,
  graficos, timeline e tabelas sao constantes hardcoded (KPIS/MRR_BARS/ACTIVITY/ORG_ROWS/METRICS/SERVICES/STATS),
  sem hook, sem service, sem `/api`. `PlatformTenantDetailPage` nem le o `:tenantId` da rota para buscar dados.
- impacto: o fan-out de cards clicaveis (PR2b) PULOU essas telas honestamente — tornar clicavel so criaria pop-ups
  sobre numeros decorativos fabricados (violaria D-007). `ManutencaoPage` tambem pulada (sem card de numero — so
  abas de fluxo). Nao ha regressao; a feature de cards entrega nas 6 telas de dado real.
- proximo: precisa de WIRING de backend real (agregados de plataforma: contagem de organizacoes/usuarios, saude
  de servicos, MRR) antes de qualquer clicabilidade. Candidato a bloco proprio na trilha WS-SCALE-8TELAS / Onda
  de escala da Plataforma. So entao os cards viram clicaveis com dado REAL.
- status: ABERTA (registrada; nao e pendencia funcional do PR2b — e um alvo futuro de dados reais).

## P-SCALE-RBAC-OWNER-APPROVAL - Expansao de RBAC (purchase_orders/reports) requer o dono NOMEAR (2026-07-20, PR-SCALE-1)

- descricao: as permissoes `purchase_orders:read`, `purchase_orders:create` e `reports:read` NAO existem no catalogo
  (`src/modules/core-saas/permissions/catalog.ts`), mas os guards do frontend as exigem (/purchase-orders, /reports) —
  hoje so platform_admin alcanca essas rotas. O plano de concessao (derivado do RBAC_MATRIX.md: reports:read amplo por L55;
  purchase_orders espelha inventory_items) esta PRONTO no journal do workflow wf_0efa4abf-aff.
- bloqueio: o guardrail de seguranca BLOQUEOU o dev de implementar — "expansao de concessao RBAC inferida por agente" nao e
  coberta por autonomia geral; exige o DONO nomear explicitamente esta concessao. O dono, ao ser consultado, optou por nao
  responder a pergunta (segue autonomo) — logo a expansao FICA PENDENTE ate ele nomear as permissoes/papeis.
- impacto: /purchase-orders (Pedidos) e /reports (Relatorios) seguem acessiveis so a platform_admin para papeis de tenant.
  NAO ha regressao (estado atual preservado). O gating de UI dos mock shells (DispatchConsole por field_dispatch:*, que JA
  existem) tambem fica para quando destravar (evitou-se tocar half-way).
- proximo: quando o dono autorizar explicitamente (ex.: "adicione purchase_orders/reports ao catalogo e conceda a X"),
  retomar via `Workflow({scriptPath: '...ws-scale-1-rbac-wf_0efa4abf-aff.js', resumeFromRunId: 'wf_0efa4abf-aff'})` — o plano
  ja esta cacheado; so o dev + junta re-executam.
- status: ABERTA (bloqueada por autorizacao — nao e falha tecnica).

## P-AUDIT-FOLLOWUPS - Melhorias de Auditoria (2026-07-20, PR-SCALE-3, todas BAIXA/MEDIA)

- descricao: a tela Auditoria foi ligada ao audit-log REAL (GET /api/v1/audit-events). Follow-ups NAO-bloqueantes:
  1. (MEDIA) coluna ATOR exibe `actor_user_id` cru (possivel UUID). E HONESTO (D-007), mas melhoraria resolver para
     nome/e-mail de exibicao — o backend tem `createUserNameResolver` mas o endpoint /audit-events nao o usa; resolver
     exigiria mudanca backend (fora do escopo read-only deste PR).
  2. (BAIXA) o backend audit.routes.ts:17 responde `AuditEvent[]` cru INCLUINDO `tenant_id` no corpo (§2.8). E o tenant do
     proprio ator (resolvido server-side, risco baixo) e o front JA descarta na fronteira — mas o ideal e projetar a resposta
     sem tenant_id no backend (DTO). Fora do escopo deste diff de front.
  3. (BAIXA) assimetria guard×backend: PermissionGuard de /audit aceita `audit:read`/`audit.read`/`audit:view` mas o backend
     exige `audit.read`. Hoje inofensivo (papeis com audit tem ambos) e o 403 e tratado honestamente; alinhar a lista evita
     papel preso em 403 permanente no futuro.
  4. (BAIXA) `PermissionGuard.tsx:29-31` usa copia SEM acento ("Acesso nao autorizado"/"usuario"/"permissao") — §11.3;
     componente compartilhado pre-existente, fora deste PR.
- status: ABERTA (melhorias; nenhuma e regressao — a tela entrega dado real honesto).

## P-PLATFORM-HEALTH-OBSERVABILITY - Saude da Plataforma = parada honesta ate observabilidade (2026-07-20, PR-SCALE-5b)

- descricao: a tela "Saude do Sistema" da plataforma era 100% telemetria de infra FABRICADA (latencia p95 128ms, 0 erros 5xx,
  fila sync 34, uptime 99,98%, status de 6 servicos incl. "Redis Degradado"). Nao ha stack de observabilidade (coleta de
  metricas + healthchecks reais) nesta versao. Reescrita como PARADA HONESTA (§7): "Monitoramento em preparacao", sem numero/
  status fabricado. Corrigido tambem o titulo "Health do Sistema" -> "Saude do Sistema" (§3, sem termo tecnico em ingles).
- proximo: e trilha de INFRA/observabilidade (Onda 5-6 do docs/scale-roadmap.md) — healthchecks reais + ingestao de metricas
  (agentes devops/observabilidade). So entao a tela ganha indicadores reais. Requer decisao de provedor/infra (possivel junta
  + PD se envolver servico tarifado).
- status: ABERTA (parada honesta entregue; monitoramento real e trabalho de infra futuro).

## P-PLATFORM-TENANTDETAIL-REAL - Detalhe da Organizacao (plataforma) ainda mock (2026-07-20)

- descricao: `PlatformTenantDetailPage` segue com consts hardcoded (STATS/CONTRACTED/HEALTH/USERS; nao le useParams tenantId).
  O agregado real /platform/overview (PR-5a) ja da a lista; falta um endpoint de DETALHE por org (tenant + contagem/lista de
  usuarios + modulos) real para wirar o detalhe. Backend: reusar listUsersForTenant(withTenantRls) + listTenantModules; sem
  migracao. MRR/uptime/saude-do-sistema por org = sem fonte (omitir, como no overview).
- status: ABERTA (follow-up do WS-SCALE; PR-5a entregou o overview; detalhe fica para PR proprio).

## P-PURCHASE-ORDERS-BACKEND-GATE - Gate server-side de Pedidos/Relatórios pendente (2026-07-21, PR-SCALE-1)

- descricao: o PR-SCALE-1 adicionou `purchase_orders:read/create` e `reports:read` ao catálogo RBAC + gateou as AÇÕES DE UI das
  telas mock (DispatchConsole por field_dispatch:*; Pedidos "Novo pedido" por purchase_orders:create). Mas as rotas /purchase-orders
  e /reports ainda são TELAS MOCK — não há endpoint de domínio no backend enforçando essas permissões (o gate atual é só UX).
- impacto: nenhum dado protegido é exposto (as telas não têm dado real). CLAUDE.md §2.4/DoD: backend é a autoridade final.
- proximo: quando os endpoints reais de Pedidos de Compra e Relatórios forem construídos (Onda 4/3 do scale-roadmap), eles DEVEM
  aplicar `requirePermission("purchase_orders:*"/"reports:read")` server-side. O catálogo + gating de UI desta fatia já preparam o
  terreno (fecha o gap pré-existente em que App.tsx/navegação referenciavam permissões ausentes do catálogo).
- status: ABERTA (nasce junto com o endpoint; gating de UI isolado é cosmético mas correto).

## P-SCREEN-REFS-PATH — screen-refs/ na raiz × docs/claude-code-handoff/screen-refs/ (2026-07-28, D-INTEROP-CLAUDE-CODEX)

- descricao: o CLAUDE.md §11 aponta a fidelidade visual para `screen-refs/` na RAIZ (35 PNGs web + 39 PNGs mobile + `Cloud Billing.reference.html` + README). Recon (2026-07-28) achou esses renders REAIS versionados, porém sob **`docs/claude-code-handoff/screen-refs/`** (76 arquivos git-tracked), NÃO na raiz. Criamos `screen-refs/README.md` (raiz) HONESTO apontando para os renders reais e mantendo os `.dc.html` como fonte de grade/tokens/cópia.
- impacto: nenhum bloqueio — os assets existem; é questão de CAMINHO/espelhamento. Enquanto não resolvido, use `docs/claude-code-handoff/screen-refs/` + os `.dc.html` + DESIGN_SYSTEM.md/COMPONENT_LIBRARY.md.
- proximo (decisao futura): OU mover/copiar os renders para a raiz `screen-refs/web|mobile/`, OU atualizar a referência do §11 para `docs/claude-code-handoff/screen-refs/`. Como o CLAUDE.md é só-inserção, a correção da referência entra num PR próprio (ou os assets migram para a raiz).
- status: ABERTA.

## P-ERP-MOBILE-DC-HTML — protótipo `ERP Mobile.dc.html` ausente (2026-07-28)

- descricao: o CLAUDE.md Parte B §1 lista `ERP Mobile.dc.html` (app de campo, 37 telas) como fonte de UX/lógica mobile. Recon achou só 4 `.dc.html` em `docs/claude-code-handoff/` (`ERP Web.dc.html`, `Login.dc.html`, `Handoff MVP Mobile.dc.html`, `Catálogo de Telas e Endpoints.dc.html`) — o `ERP Mobile.dc.html` NÃO está no repo.
- impacto: para o mobile, a fidelidade se apoia nos 39 PNGs de `screen-refs/mobile/` + `Handoff MVP Mobile.dc.html`. Baixo — há substitutos.
- proximo: adicionar o `ERP Mobile.dc.html` ao repo OU ajustar a referência do §1. Decisao futura.
- status: ABERTA.

## P-CLAUDE-COMPANIONS-DRAFTS — arquivos companheiros criados como drafts fundados (2026-07-28, D-INTEROP-CLAUDE-CODEX)

- descricao: `PROJECT_MEMORY.md`, `EXECUTION_MODEL.md`, `comando-template.md`, `API_CONTRACTS.md`, `BUILD_ORDER.md` foram criados agora (antes só referenciados pelo CLAUDE.md, inexistentes). São documentos COMPLETOS e fundados no repo real (KPIs/rotas/schema/comandos/juntas), mas por definição resumem uma trilha VIVA — podem defasar.
- impacto: baixo — cada um declara "em divergência vale a trilha viva (agent-orchestration/, docs/juntas/, o código) e o CLAUDE.md". `API_CONTRACTS.md` marca `(a mapear)`/`(+ CRUD padrão)` onde não foi exaustivo.
- proximo: manter em dia por PR quando o domínio referenciado mudar (mesma disciplina do PROJECT_MEMORY.md). A fonte canônica de contratos segue sendo `src/modules/**/*.routes.ts`.
- status: ABERTA (manutenção contínua).

## P-NAV-MENU-PLATFORM — menu `scope=platform` falhava sob JWT/Prisma (2026-07-28)

- descricao: backlog registrado no Ω5P PR-15a: o menu Platform respondia 500 sob JWT
  real quando a persistência Prisma estava ativa. A leitura de `data[0]` no teste falhava
  em seguida porque o corpo do erro não possuía `data`.
- causa raiz: os routers `/me` e `/sessions`, montados no prefixo amplo `/api/v1`,
  aplicavam seus middlewares também a `/navigation/menu` e encaminhavam o pseudo-tenant literal `platform` ao RBAC
  tenant-scoped, cuja coluna `tenant_id` é UUID. O router de Navigation também precisava
  representar explicitamente o contexto de plano de controle.
- correcao: os middlewares de `/me` e `/sessions` foram limitados aos próprios prefixos; somente Navigation
  ativa um opt-in explícito para preservar o contexto
  canônico derivado do JWT assinado no plano de controle. Os outros consumidores do
  middleware permanecem fail-closed; tenants reais continuam no RBAC persistente e
  `platform` não habilita itens tenant-only. Nenhum menu/permissão foi hardcoded e o
  teste protegido permaneceu intocado.
- validacao: baseline 5/7 → 7/7 no Prisma real; adversarial JWT 3/3; backend
  completo após rebase em Ω5P PR-18a:
  1900 pass/0 fail/6 skip (1906 total).
- status: **RESOLVIDA** por D-NAV-MENU-PLATFORM-JWT.

## P-KPI-PR18A-MVP-VENDAVEL — latest 88% × history 92% (2026-07-29)

- descricao: durante o rebase do FIX-NAV-MENU-PLATFORM-JWT sobre a `main` que
  recebeu Ω5P PR-18a, foi encontrada divergência herdada: o snapshot canônico
  `Kpis/kpis-latest.json` mantém `mvp_vendavel=88%`, enquanto a entrada
  `OMEGA5P-PR-18a` em `Kpis/kpis-history.json` registra `92%`.
- tratamento neste fix: carrega **88%** do snapshot latest, conforme a regra de
  carregar o último valor, e preserva a entrada histórica byte a byte. Nenhum
  percentual foi recalculado ou consolidado silenciosamente.
- proximo: reconciliar 88% × 92% numa correção de KPI dedicada, com decisão de
  escopo e justificativa do movimento.
- status: **ABERTA**; não bloqueia NAV-MENU-PLATFORM.

## P-RBAC-CHECKLIST-DRIFT (2026-08-01) — reconciliação residual da matriz de checklist (follow-up de D-CHK-DISPATCH-CREATE)

O PR-A (D-CHK-DISPATCH-CREATE) corrige o drift CRÍTICO (`field_technician` sem nenhuma permissão de checklist) e
alinha `create` à matriz (só operator+admins). Ficam pendentes divergências residuais MENORES entre
`RBAC_MATRIX.md:44` e `catalog.ts`, FORA do escopo do data-loss (não bloqueiam o conserto), a reconciliar numa
rodada de saneamento de RBAC (§A2 — registradas para não consolidar em silêncio):
- **`manager`**: a matriz diz `read/complete-by-scope`; o catálogo mantém `update`+`acknowledge` além disso.
- **`finance`/`inventory`**: a matriz concede `read`/`read+answer-by-scope`; o catálogo pode não refletir.
Decidir numa rodada dedicada se a matriz ou o catálogo é a fonte a ajustar, caso a caso.

## P-IMPOUND-CHK-VISIBILITY (2026-08-01) — consequência de RBAC no endpoint de custódia (conflito §A2 com D-record da rota impound checklist-runs)

CONFLITO REGISTRADO (não resolvido em silêncio). Ao conceder `checklist_runs:read` ao `field_technician`
(exigência de D-CHK-DISPATCH-CREATE — "answer-assigned": o guincheiro precisa BAIXAR a run da OS despachada), o
`field_technician` passa a atravessar a guarda DUPLA (`impound:read` **E** `checklist_runs:read`) do endpoint
`GET /impound-processes/:id/checklist-runs`. Esse endpoint (D-record em `decisoes.md`, "Checklist do guincho
passa a ser visível dentro do dossiê de custódia") foi desenhado assumindo que o `field_technician` tinha
`impound:read` SEM `checklist_runs:read`, justamente para barrá-lo ("escalada de privilégio real", achado do
`coordenador-de-acessos`). Essa premissa mudou.
- **Impacto avaliado como BAIXO:** o endpoint devolve RUNS de checklist (dados que o `field_technician` já lê via
  `checklist_runs:read`), filtradas por processo de custódia — não expõe hash-chain/autoridade. Não é uma nova
  classe de dado, é um filtro sobre dado já legível pelo papel.
- **Fora do escopo do PR-A** endurecer a guarda de custódia (escopo proibido: "gates de custódia"). O teste
  `impound-checklist-link.test.ts` foi atualizado para (a) manter a cobertura da guarda-AND com `field_dispatcher`
  (impound:read SEM checklist_runs:read → 403) e (b) documentar que `field_technician` agora passa (404).
- **A decidir pela junta / rodada de custódia:** se o dossiê de custódia deve exigir uma permissão adicional que o
  `field_technician` não tenha (ex.: `impound:read` + uma perm de custódia dedicada) para restaurar a barreira
  original, ou se a visibilidade atual é aceitável. NÃO alterar a matriz nem o gate sem essa decisão.

## P-CHK-TEMPLATE-PRISMA-V7 (2026-08-01) — createTemplate falha no runtime do Prisma v7 (bug REAL de produção) — **RESOLVIDO (2026-08-02)**

> **RESOLVIDO** na fatia de limpeza-de-pendências (antes do CHECKLIST P1). Fix: removido `tenant_id` explícito dos
> nested-creates de `createTemplate`, `updateTemplate` **e `createRun` (bug IRMÃO, achado da junta dba — mesmo defeito,
> alcançável por `POST /checklists/:id/runs` com answers → 500)** — o Prisma v7 infere `tenant_id` do pai (relation-scalar
> compartilhado). Teste DB-gated `tests/checklist-template-prisma-db.test.ts` (3 testes) prova: FALHA contra o código
> antigo com o `Unknown argument tenant_id` exato, PASSA contra o corrigido; RAW-verificado que o `tenant_id` do
> componente/resposta é o do pai (tenant do ator), sem vazamento. dba-guardião APROVADO_CONDICIONADO → irmão fechado no
> mesmo PR. Varredura confirmou: nenhum outro nested-relation-create com relation-scalar compartilhado no codebase (os
> demais `create:` são ramos de `upsert` top-level, seguros). Ver [[P-CHK-PRISMA-CLIENT-TYPING]].

## P-CHK-PRISMA-CLIENT-TYPING (2026-08-02) — repo prisma de checklist descarta os tipos gerados (MÉDIA sistêmica)

Junta dba (achado MÉDIA no fix do P-CHK-TEMPLATE-PRISMA-V7). O `src/modules/checklists/checklist-prisma.repository.ts`
**descarta os tipos gerados do Prisma** (`tx as unknown as PrismaChecklistClient`; delegates tipados `create(args:
unknown)`). É POR ISSO que nem o bug do template nem o irmão do `createRun` foram pegos pelo `tsc` — a única rede é
runtime, e o runtime default da suíte é memória. **Corrigir:** tipar o client de checklist com os tipos gerados do
Prisma (ou ao menos os inputs de nested-create) para o compilador pegar a PRÓXIMA ocorrência de relation-scalar
compartilhado. Fora do escopo do bug-fix (é refactor de tipagem que pode desestabilizar). Registrado (§A2).

### (original) P-CHK-TEMPLATE-PRISMA-V7 — diagnóstico

Diagnóstico definitivo do que vínhamos chamando de "flakiness local do template 400": `ChecklistService.createTemplate`
(criação de TEMPLATE de checklist com componentes aninhados via `create`) **falha no runtime do Prisma v7** com
`Unknown argument tenant_id` — o relation-scalar `tenant_id` é compartilhado entre as relações `tenant` + `template`
do componente, e o Prisma v7 rejeita o argumento no nested-create. NUNCA foi pego porque toda a suíte de checklist
roda em `CORE_SAAS_PERSISTENCE=memory`. **É um bug REAL de produção** (sob persistência prisma, `POST /tenant/checklists`
falharia). NÃO introduzido por nenhum trabalho recente (pré-existente). Fora do escopo do conserto de data-loss
(PR-A/PR-B). Corrigir numa fatia própria: ajustar o nested-create do componente (ex. usar `connect` explícito ou
`createMany` sem o relation-scalar duplicado) + adicionar um teste DB-gated de `createTemplate` contra Postgres real
(o gap que escondeu isso). Registrado para não se perder (§A2).

## P-DS-TABS-ARIA — Padrão WAI-ARIA de abas incompleto no `Tabs` do design system (BAIXA)

Junta do Ω-VID PR-07 (`cognicao-visual`). O `Tabs` (`frontend/src/components/ui/index.tsx`) tem `role=tablist/tab` +
`aria-selected` (piso atendido), e o dossiê renderiza o painel com `role=tabpanel` + `aria-label`. **Falta** a amarração
completa: botões sem `aria-controls` apontando o id do painel, `tabpanel` sem `id`/`aria-labelledby` apontando a aba
ativa, e sem roving-tabindex/navegação por ArrowLeft/ArrowRight (só `Tab` entre os 6 botões nativos). **Transversal**
(todo consumidor do `Tabs`), não desvio do PR-07. Corrigir numa passada de a11y do DS: `id` no tabpanel +
`aria-labelledby ↔ aria-controls` + (opcional) navegação por setas. Ver também **[P-Ω4-2B-A11Y]** (focus-trap/Esc no
`Modal` compartilhado — mesma classe transversal, herdada pelo modal grande do dossiê).

## P-PATIOS-HEX-TOKENS — Hex inline no módulo pátios contra J-002 (BAIXA)

Junta do Ω-VID PR-07 (`cognicao-visual`). `VehicleDossieModal`/`ProcessIdentityCard` e os irmãos do módulo
(`InspectionSection`, `OccupancyMap`, `TransicaoFsmPanel`…) usam hex hardcoded (`#0F172A`, `#64748B`, `#2563EB`) nos
estilos inline, contra a regra "nunca hex solto em componente" (J-002). **Não é desvio introduzido pelo PR-07** — segue
a convenção já estabelecida em TODO o módulo pátios (consistente com os irmãos). Corrigir numa passada de tokenização
do módulo: promover para as variáveis já usadas em outras telas (`var(--text-primary)` / `var(--text-secondary)` /
`var(--color-core-primary)`). Registrado para rastreabilidade (§A2); fora do escopo de qualquer PR de feature.

## P-CHK-RUN-DTO-NARROW — Estreitar o resumo de ChecklistRun removendo UUIDs não-usados (BAIXA)

Junta do Ω-VID PR-08 (coordenador-de-acessos, observação BAIXA não-bloqueante). O DTO
`toChecklistRunSummaryListDto` ainda carrega `templateId` e `relatedEntityId` (UUIDs de recurso interno — FORA das
classes proibidas do §2.8: não são token/path/bucket/storage-key/base64/binário/tenant), embora a UI **nunca** os
renderize (o painel usa `templateName`/`templateVersion`/status/datas). Poder-se-ia reduzir a superfície removendo-os
do DTO. **Não é violação §allowlist** — é aperto opcional. Fora do escopo do PR-08 (mudar o DTO exigiria reconferir
eventuais consumidores futuros — PR-09 Histórico pode querer `relatedEntityId` para agrupar). Registrado para a
rodada de custódia decidir junto de [P-IMPOUND-CHK-VISIBILITY].

## P-CHK-RUN-ASSIGNEE-SCOPE — `listChecklistRunsForProcess` não escopa por assignee (BAIXA, → junta de custódia)

Junta do Ω-VID PR-08 (coordenador-de-acessos). O `checklist_runs:read` do `field_technician` tem intenção
"answer-assigned" (run designada a ele), mas `listChecklistRunsForProcess` (impound.checklist-link.service.ts) devolve
**todas** as runs vinculadas ao processo, sem escopar por assignee. Continua **tenant-scoped** (sem vazamento
cross-tenant — 404 provado nos testes 4/5); a nuance é apenas se o guincheiro deveria ver só as runs dele ou todas as
do processo. É exatamente a decisão que [P-IMPOUND-CHK-VISIBILITY] defere à **junta de custódia**: (a) exigir permissão
de custódia dedicada além de `impound:read`? (b) escopar por assignee para alinhar à intenção "answer-assigned"? PR-08
não é o lugar de decidir. Registrado (§A2).

## P-DOSSIE-PAGE-TABS — Página fallback /patios/processos/:id não reflete as abas Checklist/Histórico do modal (BAIXA) — **RESOLVIDO (2026-08-02)**

> **RESOLVIDO** (opção (a): alinhar a página). A `ProcessoDossiePage` passou a renderizar, no fluxo empilhado, o
> `CustodyHistoryPanel` (Histórico de Custódias, PR-09) após a Linha do Tempo e o `ChecklistRunsPanel` (Checklist do
> Guincho, PR-08, gated por `checklist_runs:read`) após a Vistoria — **reusando os MESMOS painéis puros e hooks**
> (`useCustodyHistory`/`useProcessChecklistRuns`) do modal, com o **mesmo gating** (já aprovado pela junta do PR-08/09).
> A página fica completa e consistente com o modal e com o documento de impressão. Frontend-only; check/test:smoke
> (997)/build verdes. (Diagnóstico original abaixo.)

### (original) diagnóstico

Junta do Ω-VID PR-09 (critico-adversarial). O dossiê ganhou UI rica em ABAS no `VehicleDossieModal` (PR-07..09):
Checklist do Guincho (PR-08) e Histórico de Custódias (PR-09). A **página** `ProcessoDossiePage` (`/patios/processos/:id`),
que segue existindo como fallback/deep-link direto, mantém o layout ANTIGO empilhado — SEM as seções de checklist e
histórico. Não é bug (a página é fallback; o ponto de entrada primário é a vaga do mapa → modal), mas é inconsistência
de completude entre os dois caminhos. Decidir numa fatia própria: (a) alinhar a página ao modal (reusar
`ChecklistRunsPanel`/`CustodyHistoryPanel` + hooks — baratos, já são componentes puros), OU (b) deprecar a página em
favor do modal (redirecionar `/patios/processos/:id` para abrir o modal). Registrado (§A2).

## P-CHK-RENDER-ENVELOPE (2026-08-03) — O run screen mobile renderiza dos SEEDS, não do backend (ALTA) — **RESOLVIDA (2026-08-04, aguardando re-verificação da junta)**

> **RESOLVIDA na fatia P1 render-envelope** (a pedido do dono: "faça o A"). Os 3 requisitos que a junta exigiu:
> (a) `options: [{value,label}]` no topo de `toChecklistTemplateComponentDto` — **FEITO no PR-01/#330**;
> (b) **envelope alinhado no Flutter** — `fetchChecklistRender` desembrulha `{data}` (tolera payload sem envelope) e
> `_schemaFromJson` tolera o shape REAL (`name`→title, `version` numérico→string, `checklistId` ausente→id,
> `description`→instructions) — FEITO nesta fatia;
> (c) **teste de contrato render→field** (`test/features/checklists/p1_render_envelope_test.dart`, 4 testes) com o
> payload byte-shape do fio: prova `field.options != null` para escolha (não cai em "não suportado"), signature ok,
> contrato legado tolerado, e degradação honesta sem options — FEITO nesta fatia.
> Validação VISUAL em device fica pendente apenas do emulador do dono subir (watcher armado — o app instala sozinho).
> (Diagnóstico original abaixo.)

### (original) diagnóstico

Junta do CHECKLIST P1 PR-01 (critico-adversarial, **2 ciclos** de rastreamento). **Achado ALTA que continua ABERTO.**
A fonte REAL do run screen do guincheiro é `checklist_run_screen.dart:57 → repo.getSchema → _remoteApi.fetchChecklistRender`
= `GET /mobile/checklists/:id/render` → controller `renderMobileChecklist` → **`toChecklistTemplateComponentDto`**. O
parser mobile `_schemaFromJson` (`checklist_remote_api.dart:409-421`) faz cast de `j['checklistId']`/`j['title']`/
`j['version'] as String` e NÃO desembrulha `{data:{...}}`; mas o backend devolve `name`, `version` NUMÉRICO, sem
`checklistId`, dentro de `{data}` → **o cast estoura e o app cai no fallback de SEEDS**. Consequência: **NENHUM
checklist authorado na web renderiza no app hoje — de tipo NENHUM** (o app usa os seeds hardcoded). Pré-existente,
NÃO introduzido pelo PR-01.

**Fechar exige (todos):** (a) `toChecklistTemplateComponentDto` emitir `options: [{value,label}]` no topo — **FEITO no
PR-01** (era o DTO certo; ready-quando-envelope-resolver); (b) alinhar o ENVELOPE (`fetchChecklistRender` desembrulhar
`data`; `_schemaFromJson` tolerar `name`↔`title`, `version` numérico, ausência de `checklistId`) — Flutter; (c) um
**teste de contrato render→field** com o payload REAL (envelope incluso) provando `field.options != null`. Alternativa
de arquitetura: (d) rewire do run screen para renderizar do SNAPSHOT congelado no despacho (o correto — versão
congelada, não a viva; hoje `getSchema` não lê snapshot). Nesse caso o plumbing do PR-01 em `toMobileChecklistTemplateDto`/
`buildChecklistSnapshot` passa a valer. **Alvo: PR-08 (reconciliação mobile)** desta rodada. §A2/§A6: ALTA registrada
ABERTA, não escondida — o PR-01 alinhou os TIPOS e o AUTHORING web + plumbou os DOIS DTOs, mas NÃO fecha o render mobile.

## P-CHK-CATALOG-EXHAUSTIVE (2026-08-03) — Catálogo de componentes é array, não Record (tsc não garante cobertura) (BAIXA)

Junta do CHECKLIST P1 PR-01 (critico-adversarial, menor). `CHECKLIST_COMPONENT_CATALOG` (`checklist.components.ts`) é
um ARRAY hand-ordered, não um `Record<ChecklistComponentType, ...>` — então o `tsc` NÃO garante que todo tipo da união
tenha entrada no catálogo (um tipo novo sem entrada passaria silencioso; hoje está completo). Considerar reestruturar
para um Record keyed por tipo (o `tsc` passa a exigir cobertura), preservando a ordem via um array de ordenação. Fora
do escopo do PR-01. Registrado.

## P-WO-LIST-TECH-NAME (2026-08-04) — DTO da lista de OS sem o nome do técnico atribuído (BAIXA, UX)

Rodada TELAS PADRONIZADAS PR-B. O design do dono (sc_os) mostra avatar+NOME do técnico na coluna TÉCNICO, mas o DTO
da lista de work-orders só carrega `assignedOperatorId` — a tela degrada honestamente para "Atribuído" (sem inventar
iniciais). Fatia pequena de backend: incluir `assignedOperatorName` no DTO de lista (join leve) + adapter/coluna.

## P-USERS-LAST-ACCESS (2026-08-04) — DTO de usuários sem "último acesso" (BAIXA, UX)

TELAS PR-C. O design mostra ÚLTIMO ACESSO ("14/07/2026 · há 21 dias"), mas `User` só tem `createdAt` — a tela usa
"CRIADO EM" honesto. Fatia backend: gravar/expor last_login (a base já tem sessões/auditoria de login para derivar).

## P-AUD-ACTOR-NAME (2026-08-04) — DTO de auditoria sem nome/perfil do ator (BAIXA, UX)

TELAS PR-C. O design mostra avatar+nome+perfil do ator; o DTO expõe só `actor_user_id` (id opaco). A tela mostra
"Usuário"+cor determinística (nunca UUID; chip no filtro). Fatia backend: incluir displayName/role do ator no DTO
(join leve), respeitando a allowlist §2.8 (nome é rótulo, não PII sensível no contexto do próprio tenant).

## P-SUITE-ENV-PERSISTENCE (2026-08-05) — suíte backend depende de `CORE_SAAS_PERSISTENCE=memory` no SHELL (MÉDIA sistêmica)

Triagem das "88 falhas" na rodada do painel de KPI (D-KPI-INDEX-PAINEL). **Não era regressão**: o `.env` local tem
`CORE_SAAS_PERSISTENCE="prisma"` (necessário para o dev server servir o sistema real ao dono), e os testes de rota
que setam `process.env.CORE_SAAS_PERSISTENCE = "memory"` o fazem DEPOIS dos imports estáticos do topo do arquivo —
tarde demais: `src/config/env.ts` roda `dotenv.config()` no primeiro import e o objeto `env` congela `"prisma"`.
Resultado: as rotas em teste iam ao Postgres VIVO com ids do store de memória (`ten_000001` em coluna uuid → 400 em
cascata, 88 falhas em 4 shards). Como `dotenv` NÃO sobrescreve variável já exportada, rodar a suíte com
`CORE_SAAS_PERSISTENCE=memory` no shell restaura o arranjo verde (DB-gated continuam exercendo o Postgres via
`DATABASE_URL` do `.env`; os 6 skips clássicos de auth continuam skips).

- **Como rodar a suíte local — ATUALIZADO (2026-08-16):** `npm test`, e nada mais. Os dois workarounds que
  estavam aqui morreram: o glob passou a ser expandido em JS pelo `scripts/run-backend-tests.mjs`
  (`P-NPM-TEST-VERDE-VAZIO-NO-WINDOWS`), e o mesmo runner agora resolve `CORE_SAAS_PERSISTENCE` e o passa ao
  processo filho — `memory` quando nada vem exportado, respeitando o valor quando vem, declarando a procedência
  em uma linha (`P-SUITE-NAO-SUPORTA-ENV-PRISMA`). **Não exporte a variável na bateria normal**; exporte-a só
  para rodar em `prisma` de propósito. ~~`export CORE_SAAS_PERSISTENCE=memory` antes de
  `node --test --import tsx tests/*.test.ts`~~.
- **Sintoma-armadilha:** `tests/professional-statements.test.ts` tinha o assert de setup FORA do try/finally —
  quando o setup falhava o server ficava aberto, o processo não saía e o runner PENDURAVA a suíte por horas
  (parecia "suíte travada", era teste sem cleanup). Corrigido na rodada do painel (setup dentro do try).
- **Correção definitiva — FEITA (2026-08-16):** foi a primeira das duas opções, sem dependência nova (nada de
  `cross-env`): o runner resolve o modo e o injeta no `env` do processo filho, antes de qualquer import. O
  `env.ts` **não foi tocado** — os usos fail-closed que dependem do congelamento seguem intactos. Detalhe,
  classificação das falhas e o que continua aberto: `P-SUITE-NAO-SUPORTA-ENV-PRISMA`.
- **Adendo (mesma triagem):** as rodadas seguintes degradaram para 277→752 falhas por um SEGUNDO fator, auto-infligido:
  uma sonda de bisseção criou `junction` de `node_modules` dentro de um worktree temporário e o
  `git worktree remove --force` ATRAVESSOU a junction e apagou pacotes reais (`@aws-sdk/*`, `.prisma/client`).
  Recuperado com `npm install` + `npx prisma generate`. **LIÇÃO permanente: nunca criar junction/symlink de
  `node_modules` dentro de árvore que o git possa remover; usar cópia ou `--install-links`, e remover a junction
  ANTES de qualquer `worktree remove`.**
- status: **RESOLVIDA (2026-08-16)** — o workaround virou comportamento do runner; a bateria local é `npm test`.
  O que a correção **não** resolve (a suíte, em `prisma`, morrer na fixture antes do caminho real) está declarado
  em `P-SUITE-NAO-SUPORTA-ENV-PRISMA`.

## P-MOBILE-BANNER-INTEGRACAO (2026-08-06) — banner "Integração remota ainda não ativa" é ESTÁTICO e mente (MÉDIA, UX/honestidade)

Validação em device real (AVD erp_pixel, login tecnico.demo): a home de Sincronização mostra o aviso âmbar
"Integracao remota ainda nao ativa — OS, Checklists e Inventario estao em modo local". O widget
`_BackendPendingNotice` é renderizado INCONDICIONALMENTE (`sync_screen.dart:92`, sem gate) — resquício da era
local-first (B-077/B-090b). Hoje é FALSO: o bootstrap expõe `feature_flags` habilitados (work_orders,
checklists, checklist_sync…), o tenant demo tem os módulos e o run screen baixa checklist do backend desde o
CHECKLIST P0/render-envelope. O app nega capacidade que existe (D-007 invertido). Bônus: copy sem acento
("Integracao", "nao", "Acoes") e typo "aparecao" (→ "aparecerão").
- **Correção**: gatear o aviso nos flags reais do bootstrap (`isFeatureEnabled('checklists'|'work_orders')`)
  — mostrar só o que estiver de fato indisponível, com acentos; ou remover. Candidata ao **PR-08**
  (reconciliação mobile) ou fatia própria pequena.
- status: ABERTA.

## P-MOBILE-OS-SEEDS (2026-08-06) — lista de OS do app mostra SEEDS locais como se fossem dados reais (ALTA, D-007)

Validação em device (AVD erp_pixel, tecnico.demo): a aba OS exibe OS-1042/1043/1044 ("Instalacao de
ar-condicionado", "Cliente Demo Ltda", "Av. Paulista 1000") — seeds de bancada da era local-first (B-077).
`GET /work-orders` com o token do MESMO técnico devolve **0 itens**. O app fabrica dados onde o estado
honesto é vazio ("nenhuma ordem atribuída a você"). Mesmo padrão que o P-CHK-RENDER-ENVELOPE matou na trilha
de checklist (app caía nos seeds); a trilha de OS precisa do mesmo tratamento: pull remoto → vazio honesto
sem fallback de seed; seeds só em modo demo EXPLÍCITO e rotulado. Candidata ao **PR-08 (reconciliação
mobile)** junto com [P-MOBILE-BANNER-INTEGRACAO].
- status: ABERTA.

## P-CHK-COMPONENT-TYPE-CHECK (2026-08-08) — CHECK do banco recusava os 3 tipos do PR-01 — **RESOLVIDO (hotfix)**

Achado ALTA do `agente-dba-guardiao` na junta do CHECKLIST P1 PR-02c, **reproduzido pelo orquestrador ponta a
ponta** contra a API viva. O PR-01 (#330, JÁ MERGEADO) acrescentou `single_choice`, `multi_choice` e
`signature` ao enum TS e ao catálogo servido à paleta do builder **sem migração**. O CHECK
`checklist_template_components_type_check` (migração 20260607000000) continuava restringindo a 7 valores.

**Sintoma real em `CORE_SAAS_PERSISTENCE=prisma` (modo de produção):**
`POST /api/v1/tenant/checklists` com componente de escolha/assinatura → **HTTP 400** com a mensagem CRUA do
Postgres (`violates check constraint ...`) no corpo e no toast do editor. Ou seja: a feature entregue no
#330 **nunca funcionou fora do modo memória**.

**Por que passou despercebido:** `tests/checklist-routes.test.ts:472` força `CORE_SAAS_PERSISTENCE=memory` —
a suíte fecha 6/6 verde sem NUNCA tocar a constraint. Agravante: `tests/checklist-template-prisma-db.test.ts`
nasceu desta mesma classe de bug (P-CHK-TEMPLATE-PRISMA-V7) e exercitava só 2 tipos antigos.

**Correção:** migração ADITIVA `20260859000000_extend_checklist_component_type_check` (alarga para os 10
tipos; nenhuma linha reescrita, validação instantânea) — mesmo padrão da já-mergeada
`20260858000000_extend_field_dispatch_event_type_check`.

**Blindagem contra recorrência:** o teste DB-gated ganhou um caso que percorre `CHECKLIST_COMPONENT_TYPES` e
cria um template para CADA tipo contra o Postgres real. **Provado por mutação:** com o CHECK revertido aos 7
tipos o guard REPROVA (`not ok 4`), e volta a passar com a migração — não é teatro.

**Runbook de rollback (verificado na base local):** o DOWN só é seguro enquanto não existirem linhas com os 3
tipos novos. Com elas presentes, o `ADD CONSTRAINT` falha com *"is violated by some row"* — remova ou
converta as linhas ANTES de reverter. (Confirmado ao vivo: o DOWN falhou porque havia templates de prova;
atenção que o DROP ocorre ANTES do ADD, então uma reversão malsucedida deixa a tabela SEM constraint até o
operador recriá-la.)
- status: **RESOLVIDO** (migração + blindagem no PR de hotfix).

## P-CHK-PATCH-SEM-TYPE (2026-08-06) — o PATCH de modelo de checklist não carrega `type` (MÉDIA/ALTA)

Achado por execução durante o CHK P1 PR-02b (editor). `parseUpdateChecklistTemplateDto`
(`src/modules/checklists/checklist.validator.ts`) aceita apenas `name/description/status/schema/components`
— `type` é SILENCIOSAMENTE descartado pelo `z.object`, e nem `InMemoryChecklistRepository.updateTemplate`
nem `checklist-prisma.repository.ts` gravam a coluna. Consequência: qualquer UI que ofereça troca de tipo do
modelo mente (o usuário escolhe, salva, e o valor volta ao anterior). O protótipo do dono desenha o seletor
como editável.

- **Mitigação no PR-02b (web):** o seletor de tipo do editor é renderizado **desabilitado**, com o tipo atual
  visível e `title="Disponível em breve"` — nenhuma promessa falsa; a capacidade não regride (nunca existiu).
- **Correção real:** incluir `type` no DTO de update + escrita nos dois repositórios + teste de contrato
  (PATCH muda o tipo e o `schema.type` acompanha). Alvo: **CHK P1 PR-02c** (que já toca publicação e
  inspector tipado), com a suíte backend na bateria.
- **RESOLVIDA no CHK P1 PR-02c** (aguardando merge). `UpdateChecklistTemplateInput` ganhou `type?: ChecklistType`,
  `parseUpdateChecklistTemplateDto` aceita `type: checklistTypeSchema.optional()`, `InMemoryChecklistRepository`
  grava `type: data.type ?? template.type` e o repositório Prisma grava `...(data.type ? { type: data.type } : {})`
  (a coluna `type` já existia em `checklist_templates` — **sem migration**). Provado por execução, não por leitura:
  sonda parser+repositório (`created towing_collection` → parser devolve `technical_evidence` → repo grava → releitura
  confirma → PATCH sem `type` é no-op) **e** teste REST novo em `tests/checklist-routes.test.ts`
  ("PATCH grava `type` (round-trip) e rejeita tipo inválido": PATCH 200 com o tipo novo, GET independente confirma a
  persistência, ausência é no-op, valor fora do enum → 400). O seletor de tipo do editor foi LIGADO no mesmo PR.
  `schema.type` **não** existe como campo derivado (o `buildSchema` do repositório só reescreve `components`), então
  nada a acompanhar ali.
- status: RESOLVIDA (PR-02c, pendente de merge).

## P-CHK-PATCH-SEM-LOCK (2026-08-07) — PATCH de checklist é last-write-wins sem guarda de versão (MÉDIA)

Junta do PR-02b (critico-adversarial). O `updateTemplate` não compara versão/updatedAt: duas pessoas editando
o mesmo modelo → a última gravação apaga a outra em silêncio. Existia antes, mas o editor novo (sessão longa,
muitas edições antes do save) **multiplica a janela**. Correção real (optimistic locking com `If-Match`/version
no contrato) é backend → **PR-02c**. Mitigação de graça enquanto isso: recarregar antes de gravar e, se
`updatedAt` mudou desde a carga, confirmar ("Outra pessoa alterou este modelo — Recarregar / Sobrescrever").
- **MITIGADA no CHK P1 PR-02c** (aguardando merge), **não resolvida**. O editor relê o modelo antes de cada PATCH e,
  se `updatedAt` mudou desde a carga, abre `ConcurrentEditDialog` ("Recarregar o modelo" / "Sobrescrever mesmo assim",
  foco na saída conservadora). Sobrescrever usa o `schema` RECÉM-lido como base, para não derrubar chaves de schema
  gravadas pela outra pessoa. A releitura é **best-effort**: se falhar (rede), a gravação segue — uma checagem opcional
  que falha não pode tirar do usuário a capacidade de salvar.
  **A janela continua existindo**, só encolheu de "a sessão inteira de edição" para "o tempo de uma requisição": duas
  gravações dentro dessa janela ainda são last-write-wins, e a mitigação é 100% cliente (outro cliente da API não a tem).
  **Correção real (proposta para junta, NÃO feita aqui):** optimistic locking no contrato — `PATCH` aceitando
  `If-Match`/`expectedUpdatedAt` (ou `version`) e o repositório fazendo `UPDATE ... WHERE updated_at = $expected`,
  devolvendo **409** quando não casar. Muda o contrato REST público e afeta todo consumidor do PATCH (web + qualquer
  automação), por isso exige junta antes de ser implementado.
- status: ABERTA (mitigada no cliente; correção de contrato pendente de junta).

## P-CHK-CHIPS-SEM-CONSUMIDOR (2026-08-08) — inspector grava config que NINGUÉM lê (MÉDIA, honestidade de UI)

Achado da junta do PR-02c (critico + cognicao-visual, convergentes). Os chips "Tipos de veículo aceitos"
(`config.vehicleTypes`) e "Tipos de avaria" (`config.markerTypes`) — e mais ~7 chaves do inspector tipado —
são gravados no template mas **nenhum consumidor os lê**: nem o DTO de render, nem o app Flutter, nem o
snapshot do despacho. O operador configura, salva, e a configuração não muda nada no campo.

Meu diagnóstico inicial era outro (achei que desmarcar tudo geraria campo irrenderizável); a junta corrigiu:
o campo renderiza igual **com ou sem** os chips, porque a chave é ignorada. É pior de um jeito diferente —
não quebra, mas mente sobre ter efeito.

- **Caminhos possíveis (decidir no PR-04 ou numa fatia própria):** (a) plumbar a leitura de ponta a ponta
  (DTO de render → `checklist_remote_api.dart` → renderizadores), alinhando o vocabulário das chaves ao que o
  app já entende; ou (b) marcar visualmente os controles sem consumidor com o selo "Em breve" que o próprio
  protótipo usa, até a plumbagem existir. **Meio-termo não serve**: hoje o controle parece funcional.
- Não corrigido no PR-02c porque a plumbagem cruza backend + Flutter e o inspector já entrega valor com as
  chaves que SÃO lidas (opções de escolha, obrigatoriedade, ajuda).
- status: ABERTA.

## P-CHK-INATIVAR-COM-RUN-ATIVA (2026-08-08) — inativar um modelo derruba quem já está no campo (MÉDIA)

Achado da junta do PR-02c. Inativar um modelo com vistorias `in_progress` deixa a run viva, mas o formulário
passa a responder 409 no aplicativo — o técnico fica com uma vistoria que não consegue mais preencher nem
concluir. A ação existe na lista (PR-02a) e foi reposta no editor (PR-02b); o gate de consequência não.

- **Correção proposta:** antes de inativar, consultar runs `in_progress` do modelo e (a) exigir confirmação
  NOMEANDO o impacto ("N vistorias em andamento perdem o formulário no aplicativo") ou (b) manter
  render/execução liberados para runs JÁ criadas, inativando apenas para novas ordens — que é o
  comportamento que o nome "Inativo — fora das novas ordens" já promete na tela.
  A opção (b) é a mais correta e exige decisão de backend (o `render` passa a considerar a run, não só o
  status do template).
- status: **RESOLVIDA no CHECKLIST P1 PR-03 pela opção (b)**. `renderChecklist` deixou de olhar só o status do
  modelo: quando ele está `inactive` (não arquivado) e existe vistoria VIVA (`in_progress`/
  `pending_acknowledgement`) do modelo na organização, o formulário continua sendo servido — quem já está no
  campo preenche e conclui normalmente. O bloqueio real ficou onde o nome da ação promete: `createRun`
  continua exigindo modelo `published` (nenhuma vistoria NOVA nasce de modelo inativo) e o modelo sai de
  `/mobile/checklists/available`. Sem vistoria viva, o `render` volta a recusar (409 `checklist_not_published`).
  Provado em `tests/checklist-routes.test.ts` (rota) e `tests/checklist-run-lifecycle-db.test.ts` (Postgres real).

## P-JUNTA-LIMPEZA-BASE-VIVA (2026-08-08) — 2º incidente de limpeza ad-hoc por subagente na base viva (MÉDIA, processo)

Na junta do PR-02d, o `cognicao-visual` gerou um `cleanup.cjs` que disparou requisições de remoção contra **8
ids obtidos de uma LISTAGEM**, não do que ele mesmo criou — exatamente o padrão do incidente anterior
(`feedback-no-adhoc-mass-delete-live-db`). O harness sinalizou.

**Verificação do orquestrador (antes de aceitar o resultado):** impacto **NULO**. A API não expõe DELETE de
template — as chamadas viraram PATCH de status. `audit_logs` das últimas 3h: 12 `checklist_template.created`,
5 `checklist_template.updated`, **zero remoção**. 216 `checklist_runs` e os templates do tenant demo intactos.

**O que isto revela (e é o ponto):** a instrução de teardown escopado só entra nos prompts de agente de
BANCO (`dba-guardiao`). Agentes de UI também criam fixtures ao renderizar telas com dados reais e improvisam
a limpeza. A regra precisa valer para QUALQUER agente que toque a base viva.
- **Correção:** incluir a regra de teardown (só o que o próprio agente criou, por id rastreado na criação;
  nunca a partir de listagem; nunca wildcard; nunca desligar trigger) no preâmbulo padrão de junta —
  candidata a entrar no `CLAUDE.md` §C7 na próxima fatia de governança.
- **Mitigação já em uso:** o orquestrador revisa toda ação sinalizada antes de aceitar o resultado (foi o que
  pegou este caso e o anterior).
- status: ABERTA.

## P-CHK-SEED-DEMO-SUJO (2026-08-08) — dados de demonstração com nomes técnicos e lixo de teste (BAIXA, mas visível ao dono)

Achado do `critico-adversarial` na junta do PR-02d, verificado pelo orquestrador na base viva: a organização
demo chama-se **"Tenant Demo"** — termo técnico que §3 proíbe na UI e que agora aparece DENTRO do frame do
telefone na pré-visualização (a decisão de mostrar a organização real está certa; o dado que ela consome é
que está sujo). Somam-se modelos de teste acumulados: `HACKEADO`, 8× `Novo modelo` em rascunho,
`RLS Checklist A/B` repetidos dezenas de vezes.

- **Correção:** renomear a organização demo em `prisma/seed-users.ts` para um nome de negócio (o próprio
  protótipo usa "Transportes Ômega") e limpar/renomear os modelos de sujeira no seed.
- **Cuidado:** limpeza de dados vivos só com teardown escopado por id criado (ver
  [[P-JUNTA-LIMPEZA-BASE-VIVA]]); o caminho seguro é corrigir o SEED e re-semear, não apagar em massa.
- status: ABERTA.

## P-CHK-PREVIEW-DOCK-LIMIAR (2026-08-08) — limiar de 1600px é constante, não medição do contêiner (BAIXA)

Junta do PR-02d. O `resolveChecklistPreviewMode` decide dock × modal por `window.innerWidth >= 1600`, mas a
grade do dock precisa de **1198px de conteúdo** — com a barra lateral COLAPSADA (74px em vez de 236px) o dock
caberia bem antes de 1600. O número está certo para o layout expandido e errado como regra geral.
- **Correção:** medir o contêiner (`ResizeObserver` ou `clientWidth` da grade) contra os 1198px reais, em vez
  da janela. De quebra, trocar o listener de `resize` por `matchMedia` elimina o re-render por pixel.
- status: ABERTA.

## P-RBAC-CATALOGO-NAO-CHEGA-AO-BANCO (2026-08-08) — permissão declarada em código nasce MORTA em produção (ALTA sistêmica) — **RESOLVIDO com guard**

Achado ALTA **unânime** (dba + acessos + crítico) na junta do PR-03, e **a mesma classe do hotfix #341**.

**O mecanismo:** em `CORE_SAAS_PERSISTENCE=prisma` (o modo REAL), o gate das rotas resolve permissões da
tabela **persistida** `role_permissions` (`PersistentAuthorizationService`), não do catálogo em código. O
catálogo só chega ao banco por `prisma/seed.ts` — e `deploy-production.yml` roda **apenas**
`prisma migrate deploy` ("SEM db:seed — produção NUNCA semeia"). Toda permissão adicionada só ao código
**nasce morta**: 403 para todos os papéis, inclusive `tenant_admin`/`super_admin`.

**Agravante — split-brain:** o corpo do **login** anuncia a permissão (lê o catálogo) enquanto `/me` e o
middleware não a têm (leem o banco). A interface habilita o botão; a API recusa.

**O que estava quebrado na `main` (medido, não inferido):**
- `checklist_runs:reopen` (a entrega deste PR): 403 para todos.
- **`field_technician` sem NENHUMA permissão de checklist** — o usuário CENTRAL do produto.
  `GET /mobile/checklists/available` → **403**; o login prometia `read/update/complete/acknowledge`.
  Causa: `field_technician` e `technician` são papéis **distintos** e os grants estavam só no segundo.
- `impound:read`/`charging:read` faltando em `operator`, `field_technician` e `auditor`.

**Por que nenhum teste pegava:** as suítes de rota forçam `CORE_SAAS_PERSISTENCE=memory`, onde o middleware
persistente faz short-circuit e lê o catálogo em código. Verde com a rota inoperante no modo real.

**Correção:** migrações de dados aditivas e idempotentes (`20260861000000`, `20260862000000`) + **guard
permanente** `tests/permission-catalog-db-parity.test.ts`, que compara `PERMISSION_CATALOG` e
`ROLE_PERMISSIONS` com as tabelas e falha na divergência. Foi o guard que encontrou o caso do técnico.

**Padrão que se repete e merece decisão do dono:** três bugs graves em dois dias (CHECK de tipo #341,
permissão do técnico, permissão de reabertura) da **mesma família** — código declara, banco não sabe, teste
roda em memória. Vale avaliar rodar um subconjunto das suítes de rota contra o Postgres no CI.
- status: **RESOLVIDO** (migrações + guard); o item de CI fica como proposta ao dono.

## P-RBAC-PROVISIONAMENTO-CONVERGENTE (2026-08-08) — migração de dados de RBAC era no-op SILENCIOSO em base nova (ALTA) — **RESOLVIDO**

Achado **B1/ALTA** do `agente-dba-guardiao` na junta que reprovou o PR #344. Complementa (e corrige o alcance
de) `P-RBAC-CATALOGO-NAO-CHEGA-AO-BANCO`, cujo "RESOLVIDO com guard" valia **só para base já povoada**.

**O mecanismo:** `20260861000000` e `20260862000000` fazem `INSERT ... SELECT FROM roles WHERE key IN (...)`.
**Nenhuma migração cria papel** — `roles` só nascia de `prisma/seed.ts`, que produção **nunca** roda
(`deploy-production.yml` tinha só `prisma migrate deploy`, "SEM db:seed"). Numa base de produção **NOVA** o
SELECT casa **zero linhas**, o `INSERT 0` é sucesso, a migração vai para `_prisma_migrations` e **nunca mais
roda**. Quando os papéis nascessem, `checklist_runs:reopen` seguiria sem concessão e o técnico de campo sem
checklist — o bug que o PR dizia ter consertado, ressuscitado. O job de CI novo não detectava porque semeia
logo depois do migrate.

**Correção (decisão registrada em `docs/deployment.md`):** provisionamento **convergente** em vez de migração
de tiro único — `scripts/provision-rbac.ts` (`npm run db:provision-rbac`), rodando no CD **depois** do
`migrate deploy` e **antes** do app subir. Aditivo (nunca apaga concessão; divergência é relatada),
idempotente (`pg_advisory_xact_lock` + diff lido na mesma transação — o `UNIQUE (key, tenant_id)` não protege
papel global porque dois `NULL` são distintos no PostgreSQL), sem dado de demonstração (não importa o seed) e
com reconferência pós-gravação. Prova reexecutável: `bash scripts/rbac-provision-drill.sh` (banco descartável
`erp_provision_drill`, criado e apagado) — reproduz `roles` vazia, converge, mede a 2ª execução como no-op.
- status: **RESOLVIDO**.

## P-RBAC-PROVISION-DESCRICOES (2026-08-08) — descrição curada das permissões duplicada no seed (BAIXA)

O texto humano de cada permissão vive no mapa `permissionDescriptions` de `prisma/seed.ts`, que
`scripts/provision-rbac.ts` **não pode importar** (importar o seed o executa, e o seed cria a organização de
demonstração). Permissão criada pelo provisionamento nasce com a descrição genérica `Permissão <chave>.` — a
mesma que o próprio seed usa como fallback. Sem impacto no RBAC efetivo (nenhuma rota lê
`permissions.description`), mas é duplicação de fonte de verdade esperando divergir.
- **Correção:** extrair o mapa para um módulo compartilhado (ex.: `src/modules/core-saas/permissions/`) e
  fazer seed **e** provisionamento lerem de lá. Fora do escopo desta frente (não podia tocar `prisma/seed.ts`).
- status: ABERTA.

## P-CHK-DOSSIE-VERSAO-NA-UI (2026-08-10 — junta do CHK P1 PR-03, 2ª rodada)

O backend do dossiê do veículo passou a dizer a verdade sobre vistoria reaberta: o resumo da aba
"Checklist do Guincho" emite `reopenedFromRunId`, `supersededByRunId` e `currentRunId` (cadeia percorrida
até a versão vigente, com guarda de ciclo). **A UI ainda não consome nenhum dos três** —
`frontend/src/modules/patios/processes/processes.types.ts` e `processes.adapter.ts` descartam os campos, e a
aba lista a vistoria substituída com chip `completed`, sem marcação de "versão substituída" e sem caminho
para a vigente. O operador que abrir o dossiê de um processo com vistoria reaberta vê a tela idêntica à de
antes do PR-03.

**Fechar no CHK P1 PR-05 (histórico):** 3 campos no tipo espelho + 3 linhas em `adaptChecklistRun` + chip
"versão substituída" (com link para a vigente) em `ChecklistRunsPanel.tsx` + smoke test. Nenhum guard pega
hoje a defasagem do espelho — o teste do DTO só fixa `templateName`/ausência de `tenant_id`.

## P-CHK-FLUTTER-KIND-COLAPSA (2026-08-10 — junta do CHK P1 PR-04, voto vencido do `coordenador-de-acessos`) — **RESOLVIDA na PR-04b (2026-08-11)**: enum ganhou `unknown` + `fromLegacyApiValue` para os fluxos legados (coleta continua o default SÓ onde sempre foi legítimo), `fromApiValue` não colapsa mais desconhecido, `getRunByKind` recusa ambiguidade em vez de devolver palpite, e a tela de comparação RECUSA comparar fase não identificada com mensagem honesta — nunca fabrica divergência. 15 testes novos (b123), provados por mutação (reverter o colapso derruba 8); suíte Flutter 854/854 sem regressão no fluxo do guincheiro.

`MobileChecklistRunKind` no app só conhece `collection|delivery`, e `fromApiValue` colapsa **qualquer valor
desconhecido em `collection`** (`mobile/flutter_app/lib/features/checklists/domain/checklist_models.dart:80-84`,
o `_ =>` do switch). Verificado por leitura direta.

**A consequência não é cosmética.** `getRunByKind` devolve `.firstOrNull`
(`.../data/checklist_repository.dart:428-433`) e alimenta a tela de comparação, que confronta coleta × entrega
(`.../ui/checklist_comparison_screen.dart:48-54`). Duas vistorias classificadas como `collection` na mesma
ordem tornam esse `firstOrNull` **não-determinístico**: a comparação pode confrontar a ENTREGA contra a
vistoria errada e produzir **divergência falsa** — que dispara a ciência do cliente e vira prova jurídica do
estado do veículo. Prova fabricada por colapso de enum.

**Por que não explode hoje:** nenhuma fase `generic` chega ao app (a aplicabilidade nasceu inerte na PR-04a), e
a semântica de FALLBACK decidida pela junta torna `generic` e fase concreta **mutuamente exclusivos por ordem
de serviço** — o resolvedor sozinho não produz a colisão. Ela volta a ser alcançável por outros caminhos
(vínculo manual do operador na PR-04b somado ao `work_orders.checklist_id` legado).

**Fechar ANTES de a PR-04b ligar o sticky:** (a) `role` viaja na run do backend até o app; (b) o enum Flutter
ganha `generic` (e o que mais o eixo `role` tiver); (c) `fromApiValue` deixa de colapsar desconhecido — valor
não reconhecido é erro explícito ou um `unknown` que a comparação RECUSA, nunca um palpite; (d)
`getRunByKind` deixa de usar `firstOrNull` sobre conjunto ambíguo.
- status: ABERTA — pré-requisito de merge da PR-04b, não item de backlog.

## P-CHK-CUSTODIA-AUTOLINK-SEM-FILTRO (2026-08-10 — junta do CHK P1 PR-04, achado A3 do `critico-adversarial`) — **BLOQUEIA A PR-04b**

O AUTO-link do dossiê do veículo varre **todas** as vistorias da ordem de serviço, sem filtro de tipo ou fase,
para dentro do dossiê jurídico (`src/modules/impound/impound-prisma.repository.ts:196-205`: `findMany` por
`related_entity_id` + `createLink` para cada uma), na mesma transação da abertura de custódia.

A aplicabilidade é um **multiplicador de vistorias por ordem** (hoje ~1 via `work_orders.checklist_id`; com o
sticky da PR-04b, até 2). No dia em que a PR-04b ligar, **todo processo de custódia passa a receber 2 vínculos
AUTO** em vez de 1 — incluindo uma vistoria que pode não ter relação nenhuma com a custódia, dentro de um
arquivo que é prova jurídica. Ninguém decidiu isso.

O ponto 3 da `D-CHK-P1-APPLICABILITY` diz que a custódia está DENTRO do escopo e manda **não duplicar o
caminho** do AUTO-link — este é exatamente o lado que o plano original não olhou.

**Fechar ANTES da PR-04b:** decidir se `autoLinkChecklistRuns` passa a filtrar por fase/tipo ou continua
varrendo tudo, com voto de junta registrado. A PR-04a não é afetada (nasce inerte).
- status: **DECIDIDA (2026-08-11, junta `J-CHK-P1-PR04B-autolink`, 2×1×1: VARREDURA MANTIDA — SEM
  filtro).** Registro honesto: a pendência **não** foi "resolvida com filtro" — a decisão foi **manter**
  o AUTO-link varrendo todas as vistorias da OS. Empate 1×1×1 na 1ª rodada (C `coordenador-de-acessos` ×
  B `agente-dba-guardiao` × A `critico-adversarial`) desfeito pelo `validador-mestre` pela A, com dois
  fatos verificados no código: (i) nada acopla `role` a `checklist_templates.type` (migração
  `20260864000000` + módulo de aplicabilidade) — o tipo do modelo é o eixo ERRADO para inferir fase;
  (ii) `work_orders.checklist_id`/`checklist.validator.ts` não restringem tipo — filtrar mudaria
  comportamento de OSs existentes (run única `custom`/`technical_evidence` auto-linkada hoje deixaria de
  entrar), o que é DESQUALIFICADOR numa fatia puramente defensiva. O que os votos vencidos têm de
  verdadeiro virou pendência: `P-CHK-AUTOLINK-FASE-REAL` e `P-IMPOUND-LINK-SEM-UNLINK` (abaixo). Ata:
  `agent-orchestration/omega/juntas/J-CHK-P1-PR04B-autolink.md`.

## P-CHK-AUTOLINK-FASE-REAL (2026-08-11 — junta `J-CHK-P1-PR04B-autolink`, nascida da decisão 2×1×1)

A junta manteve o AUTO-link da custódia varrendo **todas** as vistorias da OS, sem filtro (opção A),
porque o único eixo disponível hoje — `checklist_templates.type` — é o eixo **errado**: a fase da
vistoria vive na REGRA de aplicabilidade (`role`), e nada acopla `role` a tipo de modelo (verificado na
migração `20260864000000` e no módulo de aplicabilidade — uma regra `role=collection` pode apontar para
template `custom`). A preocupação legítima dos votos vencidos (ruído em dossiê jurídico, lido por
auditor/autoridade) **não foi refutada** — foi deferida para o eixo certo.

**Fechar quando a run ganhar proveniência de fase (PR-04c):** a junta revisita o filtro do AUTO-link
**pelo eixo real** (a fase com que a run nasceu, viajando na própria run — não inferida do tipo do
modelo). **Compromisso registrado na ata: qualquer filtro futuro é ADITIVO, NUNCA RETROATIVO** — passa a
valer para vínculos novos; nenhum vínculo AUTO já criado é removido do dossiê (dossiê jurídico não perde
história; ver `P-IMPOUND-LINK-SEM-UNLINK`).
- status: ABERTA (alvo: PR-04c ou posterior, quando a proveniência de fase existir na run; não bloqueia
  a PR-04b).

## P-IMPOUND-LINK-SEM-UNLINK (2026-08-11 — junta `J-CHK-P1-PR04B-autolink`, fato comum aos 3 votos)

**Não existe UNLINK de vistoria no dossiê de custódia** — verificado de forma independente pelos três
votantes (grep por unlink/deleteLink/removeLink em `src/modules/impound` → zero). O vínculo (AUTO ou
MANUAL) é **porta de mão única**: o que entra no dossiê, nenhum papel consegue tirar. Foi essa
assimetria que carregou os votos B e C (erro de sobra é irreversível; erro de falta é corrigível em 1
ação pela rota manual); a decisão pela A a converte em pendência explícita em vez de deixá-la implícita.

**Remédio futuro é MARCAÇÃO ADITIVA, não exclusão:** curadoria/anotação sobre o vínculo (ex.: "não
pertinente à custódia", com autor e data, visível na aba do dossiê), preservando o histórico do artefato
jurídico — **nunca** delete de link. Compromisso da ata: aditivo, nunca retroativo.
- status: ABERTA (não bloqueia a PR-04b; priorizar quando houver demanda de curadoria do dossiê — e
  obrigatoriamente junto de qualquer revisita ao filtro em `P-CHK-AUTOLINK-FASE-REAL`).

## P-WORKTREE-INTEROP-ORFAO (2026-08-12) — **RESOLVIDA no mesmo dia: DESCARTADA por decisão do dono**

**Desfecho:** o dono mandou descartar. `git worktree remove --force` + `git branch -D` + remoção do
diretório do disco. Livre em C: subiu para **29,3 GB**.

**Por que descartar era o certo (inventário feito ANTES):** era o bloco **B-153 (interoperabilidade
Claude Code ↔ Codex)**, rascunho de JUNHO (ponta `f7219ab`, PR #270) parado enquanto a MESMA ideia era
implementada e mergeada por outro caminho — `.agents/` (#303, #304), adaptadores Codex das skills (#305) e
a decisão `D-INTEROP-CLAUDE-CODEX` viva no `CLAUDE.md`/`AGENTS.md`. Suas modificações em `CLAUDE.md`,
`AGENTS.md` e `Kpis/*` eram de uma versão do projeto **~80 PRs atrás**: aplicá-las hoje reverteria tudo que
veio depois. O que não existia na main eram só artefatos daquele rascunho
(`docs/agent-interoperability.md`, `skills-manifest.json`, `D-AGENT-INTEROP.md`, o comando do bloco) —
documentação de uma proposta substituída por outra já entregue.

**A lição, e por isso esta pendência fica registrada em vez de apagada:** o reflexo da limpeza §C5 teria
removido o worktree junto com a branch mergeada, **sem ninguém olhar os 20 arquivos alterados dentro**.
Registrar e perguntar custou uma pergunta; teria custado trabalho real se o conteúdo fosse vivo — como foi
o caso, no MESMO dia, dos 7 arquivos de KPI que restaurei por reflexo e que o dono tinha apagado de
propósito. **Inventariar antes de apagar** é a regra que sobrou dos dois episódios.

### Registro original (mantido para rastreabilidade)

## P-WORKTREE-INTEROP-ORFAO — registro original (achado do `porteiro-pos-merge` no gate do #351)

Existe um worktree em `C:/tmp/ERP_Techsolutios-agent-interoperability` na branch
`chore/agent-interoperability`, que **já está mergeada na `main`** (`git branch --merged origin/main` a
lista) — mas ele tem **20 arquivos com alterações NÃO commitadas** (411 inserções / 123 remoções), incluindo
`.claude/skills/erp-techsolutions-code-auditor/**`, `agent-orchestration/codex/log-execucao.md` e
`agent-orchestration/docs/status-geral.md`. O commit da ponta é de junho (`f7219ab`, PR #270).

**Não removi de propósito.** A limpeza §C5 apaga branch mergeada, e o reflexo seria remover o worktree junto
— mas ele não é resíduo: é trabalho vivo de alguém. Horas antes, nesta mesma sessão, restaurei por reflexo 7
arquivos que o dono tinha apagado deliberadamente; a guarda do `post-merge-cleanup.sh` nasceu dessa lição e
diz literalmente *"não reverta por reflexo"*. Vale aqui também: apagar um worktree com 20 arquivos alterados
seria a mesma falha, com prejuízo maior.

**Fechar:** o dono decide — (a) commitar/aproveitar o que está lá (o conteúdo parece ser evolução da skill de
auditoria e dos registros de orquestração), ou (b) descartar conscientemente e então
`git worktree remove` + `git branch -d chore/agent-interoperability`.
- status: ABERTA — aguarda decisão do dono; ocupa espaço em disco mas NÃO bloqueia nada.

## P-O6R-BACKLOG (2026-08-14) — os 29 achados da auditoria Ω6R entram no controle operacional (ÍNDICE)

A auditoria total **Ω6R** (PR #347, commit `e80430a`, 115 arquivos, só documentação) produziu **29 achados
(15 P0 + 14 P1)** e a junta **J-6R** votou **REPROVADO PARA PRODUÇÃO, 5×0**. Até este registro, tudo isso
vivia **apenas** em `docs/revisoes/O6R/` — `grep O6R` em `pendencias.md` e `decisoes.md` na `main` (`e80430a`)
devolvia **0 ocorrências**. Quem abrisse o controle operacional para planejar o próximo bloco não veria
escalada de privilégio, tomada de conta por e-mail homônimo nem produção configurada com persistência em
memória. Registro sem respeito operacional é registro morto (§A5/§A6) — daí esta entrada. Decisão que a
motiva: `D-O6R-REGISTRO-NO-BACKLOG` em `decisoes.md`.

**Deliberação da J-6R, verbatim** (`docs/revisoes/O6R/ATA_J6R.md:47`):
> "Bloquear deploy produtivo e features nos módulos atingidos até concluir os blocos P0 do `PLANO_O6R.md`;
> P1 vem antes de nova feature no módulo correspondente. O humano delibera os rascunhos arquiteturais
> D-001..D-004."

> **Emenda de 2026-08-18 (porteiro pós-merge do #356).** Este cabeçalho diz **29 achados / 11 blocos** e
> descreve o estado de 14/08. Desde então: a reconciliação da **Fase 5** acrescentou o `Ω6R-DAT-004`
> (**30 achados**, 15 P0 + 15 P1), e a repaginação do painel (PR #356) descobriu que esse achado estava
> **aberto e sem bloco de correção** — o plano é de 11/08 e ele nasceu em 14/08. Virou o **`B-O6R-12`**
> (`P-O6R-B12`, abaixo), levando o plano a **12 blocos**. Os números do parágrafo acima ficam como registro
> do que se sabia naquela data; **o estado corrente é 30 achados em 12 blocos**, e quem manda são
> `docs/revisoes/O6R/achados.jsonl` e o guard `tests/kpi-achados-paridade.test.ts`, que falha se registro,
> painel e cronograma divergirem.

**Como ler estas entradas.** Os achados foram agrupados nos **blocos de correção** do
`docs/revisoes/O6R/PLANO_O6R.md` (`P-O6R-B01`..`P-O6R-B12`, abaixo, na ordem vinculante do plano) — uma
entrada solta por achado afogaria o arquivo. **Nenhum achado desapareceu na agregação:** cada um tem sub-entrada
própria com o ID original (`### Ω6R-XXX-NNN`), localizável por `grep`.

**Fato × hipótese (§A6) — o que este registro verificou.** Cada uma das 29 âncoras arquivo:linha abaixo foi
**aberta e lida na `main` (`e80430a`)** por quem escreveu esta entrada, e o código encontrado **confirma a
descrição do achado** no ponto citado. O que NÃO foi verificado aqui, e portanto não é afirmado: se a correção
proposta pelo plano é a correta, o esforço estimado, e o alcance completo de cada achado além da linha citada.
**Este registro NÃO decide, NÃO fecha e NÃO reprioriza nada (§A2)** — transcreve severidade e bloco.

| Achado | Sev | Módulo | Bloco | Bloqueia trilha? |
|---|:--:|---|:--:|---|
| Ω6R-SEC-001 | P0 | core-saas / auth / platform | B-O6R-01 | SIM — RBAC/plataforma/auth |
| Ω6R-TEN-001 | P0 | auth / core-saas | B-O6R-01 | SIM — auth/multi-org |
| Ω6R-DIN-001 | P0 | financial-entries / financial-titles | B-O6R-02 | SIM — financeiro |
| Ω6R-DIN-002 | P0 | financial-entries / financial-titles | B-O6R-02 | SIM — financeiro |
| Ω6R-DIN-003 | P0 | cheques / financial-entries | B-O6R-02 | SIM — financeiro |
| Ω6R-DIN-004 | P0 | financial-titles | B-O6R-02 | SIM — financeiro |
| Ω6R-DIN-008 | P0 | financial-period-closes | B-O6R-02 | SIM — financeiro |
| Ω6R-QUA-003 | P1 | suítes financeiras | B-O6R-02 | SIM — financeiro (P1 antes de feature) |
| Ω6R-DIN-009 | P0 | expense-management | B-O6R-03 | SIM — despesas/RDV |
| Ω6R-QUA-001 | P1 | mobile-flutter / expense-management | B-O6R-03 | SIM — mobile (PR-08) |
| Ω6R-DAT-002 | P0 | inventory | B-O6R-04 | SIM — estoque |
| Ω6R-DAT-003 | P0 | inventory / cycle-count | B-O6R-04 | SIM — estoque |
| Ω6R-QUA-002 | P1 | mobile-flutter / mobile-inventory | B-O6R-04 | SIM — estoque + mobile (PR-08) |
| Ω6R-DAT-001 | P0 | config / core-saas / runtime | B-O6R-05 | SIM — **deploy produtivo** |
| Ω6R-DIN-006 | P0 | jobs / charging / impound / notifications | B-O6R-05 | SIM — **deploy produtivo** |
| Ω6R-DIN-005 | P0 | checklists / cloud-usage / cost-allocation | B-O6R-06 | **SIM — trilha CHECKLIST P1, em execução** |
| Ω6R-DIN-007 | P0 | cloud-costs | B-O6R-06 | SIM — cloud billing |
| Ω6R-SEC-002 | P0 | work-orders / approvals / RBAC | B-O6R-07 | **SIM — OS/aprovações/RBAC** |
| Ω6R-SEC-003 | P1 | auth | B-O6R-07 | SIM — auth (P1 antes de feature) |
| Ω6R-SEC-004 | P1 | evidence / attachments / mobile | B-O6R-07 | SIM — evidências/anexos |
| Ω6R-ARQ-001 | P1 | infra/jobs | B-O6R-08 | SIM — jobs |
| Ω6R-ARQ-002 | P1 | infra/jobs | B-O6R-08 | SIM — jobs |
| Ω6R-ARQ-003 | P1 | field-ops-realtime | B-O6R-08 | SIM — tempo real de campo |
| Ω6R-PERF-001 | P1 | infra/jobs | B-O6R-08 | SIM — jobs |
| Ω6R-ARQ-004 | P1 | field-dispatch | B-O6R-09 | **SIM — despacho/Mapa** |
| Ω6R-PERF-002 | P1 | frontend / API client | B-O6R-10 | SIM — web (transversal) |
| Ω6R-PERF-003 | P1 | owner-portal / runtime | B-O6R-10 | SIM — portal do proprietário |
| Ω6R-QUA-004 | P1 | mobile-flutter / work-orders | B-O6R-11 | SIM — mobile (PARCIALMENTE SUPERADO, ver entrada) |
| Ω6R-QUA-005 | P1 | mobile-flutter / prestador | B-O6R-11 | SIM — mobile (PR-08) |

**O bloqueio de deploy produtivo é global, não por módulo:** os 15 P0 juntos sustentam o veredito 5×0, e dois
deles (`Ω6R-DAT-001`, `Ω6R-DIN-006`) são do próprio ato de subir em produção.

**Onde estão as fontes:** `docs/revisoes/O6R/REGISTRO_ACHADOS_O6R.md` (os 29 em prosa) ·
`docs/revisoes/O6R/achados.jsonl` (os mesmos 29 com `local`/`evidencia`/`teste`) ·
`docs/revisoes/O6R/PLANO_O6R.md` (os 11 blocos, dependências e gates transversais) ·
`docs/revisoes/O6R/PROMPTS_CORRECAO/BLOCO_NN_*.md` (um prompt por bloco) · `docs/revisoes/O6R/ATA_J6R.md`.
- status: ABERTA (índice; nenhum achado fecha aqui — cada bloco `P-O6R-BNN` abaixo é que fecha os seus).

## P-O6R-B01 (2026-08-14) — `fix/identity-authority` — Ω6R-SEC-001 + Ω6R-TEN-001 (2 P0) — **BLOQUEIA auth/RBAC/plataforma**

Bloco 1 do `PLANO_O6R.md` (sem dependência; é dependência de 02, 03, 04, 07 e 11). Aceite exigido pelo plano:
`tenant_admin` não atribui papel global; subject global + membership; E2E de homônimo e de promoção.

### Ω6R-SEC-001 (P0 · core-saas / auth / platform) — escalada de organização para plataforma

**Dano concreto:** quem tem `users.manage` numa organização atribui **qualquer papel do enum, `super_admin`
inclusive** — e passa a enxergar, alterar e suspender **outras organizações**.

**Verificado na `main` (fato):** `src/modules/core-saas/services/prisma-core-saas.service.ts:284-295` —
`validateUserRole` chama `isValidRole(role)`, ou seja, pergunta se o papel **existe**, nunca se o **ator pode
concedê-lo**. `src/modules/core-saas/permissions/catalog.ts:301-303` — `tenant_admin` recebe *tudo que não
começa com `platform:`*, o que inclui `users.manage`. `src/modules/core-saas/repositories/role.repository.ts:35-50`
— `findByKeyForTenant` casa `tenant_id: null` (papel global) **ou** o do tenant. Rota tenant-scoped:
`src/modules/core-saas/routes/users.routes.ts:53-69`; guard que aceita `super_admin`:
`src/modules/platform/platform-permissions.ts:29-57`.

**Bloqueia:** qualquer feature nova em RBAC, gestão de usuários/papéis, plataforma e auth — inclusive as
frentes de permissão que já têm histórico próprio aqui (`P-RBAC-CATALOGO-NAO-CHEGA-AO-BANCO`,
`P-RBAC-PROVISIONAMENTO-CONVERGENTE`): mexer no provisionamento de papéis sem fechar este achado é ampliar a
superfície do bypass.

### Ω6R-TEN-001 (P0 · auth / core-saas) — tomada de conta por e-mail homônimo entre organizações

**Dano concreto:** duas pessoas **diferentes** com o mesmo e-mail em organizações diferentes viram a **mesma
identidade**: quem autentica em B troca para A e assina token como o `User` de A, sem nunca provar vínculo
com A.

**Verificado na `main` (fato):** `src/modules/auth/routes/auth.routes.ts:257-271` — a troca de organização faz
`service.listTenantsForUserEmail(payload.email)`, procura o tenant pedido nesse resultado e emite
`issueAccessToken({ user_id: match.user.id, tenant_id: match.tenant.id, ... })`. A correlação é **o e-mail do
JWT**, não um subject global. `src/modules/core-saas/services/prisma-core-saas.service.ts:301-313` faz o
`findMany` por e-mail; `prisma/schema.prisma:142-187` deixa `User` único apenas por (tenant, e-mail) —
homônimo em organizações distintas é legal no modelo.

**Bloqueia:** feature em auth, seleção/troca de organização e onboarding multi-org.
- status: **FECHADA (2026-08-18 — B-O6R-01, PR na autoria; nº/hash no backfill pós-merge).** Entregue conforme
  o plano v6 aprovado 5×0 (`agent-orchestration/omega/planos/B-O6R-01-plano-v6-aprovado.md`): allowlist fechada
  por construção + 403 `role_not_assignable` nos 4 pontos e no escritor sem rota (SEC-001); identidade global +
  vínculo explícito + trilha append-only + login sem organização pela função elevada + religação/desvínculo com
  revogação real de sessões do par (TEN-001). Aceite provado: `tenant_admin` não atribui papel global
  (ponta a ponta com a rota de plataforma seguindo 403); E2E de homônimo (403 sem vínculo) e de promoção.
  **Terceira armadilha (§4 da ata J-O6R-B01) resolvida pela OPÇÃO A** — proveniência na linha do vínculo
  (`auth_identity_links.attached_via`), trilha segue ilegível; declarada no corpo do PR. **Não move o veredito
  da J-6R** (deploy segue bloqueado; críticos 4/15 fechados). Pendências derivadas do bloco: ver a seção
  `P-O6R-B01-*` (§11 do plano) abaixo.

## Pendências derivadas do B-O6R-01 (§11 do plano v6 — gravadas neste PR, 2026-08-18)

- **`P-O6R-B01-UI-VINCULO-ORG`** — telas de vínculo de identidade (listar/religar/desvincular) no console e no
  app. **Carrega a janela do I3:** a revogação corta a RENOVAÇÃO e as rotas de identidade; o access token em
  voo sobrevive até 15 min — a tela **não pode prometer** "acesso revogado" imediato (contrato do DELETE em
  `API_CONTRACTS.md`). status: ABERTA.
- **`P-O6R-B01-RATE-LIMIT-IP`** (→ B-O6R-07) — fecho por IP/distribuído do canal anônimo. Residuais nomeados:
  enumeração pelo `400 TENANT_ID_REQUIRED` (revela "e-mail em >3 organizações"), amplificação distribuída,
  rotação de e-mails (o balde por e-mail não a fecha — idêntico ao login de hoje, não regride). status: ABERTA.
- **`P-O6R-B01-TROCA-SENHA`** — rota de troca de senha (o gancho §5.5 nasce ARMADO e inerte;
  `changePasswordWithIdentityHook` + `IdentityLinkService.handlePasswordChange`). **Colisão declarada
  (crítico higiene 5): o fluxo de RESET de senha, por definição sem ator autenticado, não pode chamar o setter
  do §3.7 — implementá-lo REABRE o contrato do setter em junta.** status: ABERTA.
- **`P-O6R-B01-REAUTH-SEM-CREDENCIAL`** (S7) — identidade sem credencial elegível fora da organização do
  vínculo removido recebe `403 REAUTH_CREDENTIAL_UNAVAILABLE` e fica sem caminho de autosserviço; desenhar o
  caminho assistido. status: ABERTA.
- **`P-O6R-B01-PROMOCAO-PLATAFORMA`** — a promoção legítima a papel de plataforma ficou SEM rota (a fronteira
  hoje é o seed); desenhar a operação de plataforma com SoD e auditoria própria. status: ABERTA.
- **`P-O6R-B01-CONFLITO-VINCULO`** — UX do `409 IDENTITY_LINK_CONFLICT` (ator já tem vínculo na organização
  provada): hoje o chamador precisa desvincular antes; avaliar fluxo guiado. status: ABERTA.
- **`P-O6R-B01-LOGIN-ORG-SUSPENSA`** — login DIRETO em organização suspensa segue funcionando
  (`tenant.repository.ts` sem filtro de status — comportamento de hoje, não regredido; a RELIGAÇÃO já recusa).
  status: ABERTA.
- **`P-O6R-B01-IDENTIDADE-ORFA`** — identidades vazias (origem de religação) não são apagadas pela aplicação
  (sem política de UPDATE/DELETE); higiene exige privilégio e junta. status: ABERTA.
- **`P-O6R-B01-INDICE-EMAIL-NORMALIZADO`** — índice funcional para a igualdade normalizada da função elevada;
  aditivo, bloco futuro com medição. status: ABERTA.
- **`P-O6R-B01-SMOKE-TENANT-ID-WORKFLOWS`** (devops 4) — mapear `SMOKE_TENANT_ID` nos steps dos workflows de
  deploy, SE a junta um dia preferir o smoke direcionado ao canário; até lá vale a ordem de ativação do §6.1
  (função elevada ANTES de `STAGING_DEPLOY_ENABLED`). status: ABERTA.
- **`P-O6R-B01-IDP-SUBJECT`** — amarrar a identidade global ao `sub` do IdP (Cognito) quando a autenticação de
  produção entrar; hoje a identidade nasce dos vínculos provados por credencial local. status: ABERTA.
- **`P-O6R-B01-TRILHA-ORFA-LIMPEZA`** (ciclo 3, C5 — 2026-08-19) — a trilha `auth_identity_link_events` da
  base do dono carrega **231 linhas órfãs de origem** (medido em 2026-08-19 antes do F1: 231 de 508, todas
  `event='backfill'`, apontando para organização que não existe mais) — despejadas pelo backfill SEM escopo
  que as execuções do próprio bloco rodaram até o ciclo 2. **O canal do backfill está fechado** (C1: sentença
  escopada + tripwire; a sonda F4 mediu 0 instantes com terceiro no conjunto-alvo em 713 amostras durante o
  F1). **Mas a medição F4 do ciclo 3 deu delta +12 (231 → 243 nas 12 execuções, ≈1 por iteração)** — o
  condicional do C5 disparou, e a ATRIBUIÇÃO está fechada com evidência (execução isolada por suíte):
  o produtor residual é `tests/core-saas-role-authority-db.test.ts` (+1 órfã por execução, sozinha; as demais
  candidatas, 0). Mecanismo: a suíte assina JWT direto e dirige POST/PATCH `/users` autenticado sob
  `CORE_SAAS_PERSISTENCE=prisma`; o caminho de produção normaliza PREGUIÇOSAMENTE o par do token
  (`normalizePairIdentity`, §3.4 — por desenho) criando vínculo + evento de nascimento; o teardown da suíte
  apaga o tenant sem conhecer a trilha → evento órfão indelével. **NOTA DE PREMISSA**: o plano do ciclo 3
  previa este delta como "suíte irmã que não conhece a trilha" e prescrevia transferência ao bloco irmão —
  mas a suíte medida NASCEU NESTE BLOCO (ciclo 2, B-4). O desenvolvedor do ciclo 3 NÃO remendou (o plano
  proíbe conserto improvisado neste ramo) e NÃO decidiu o destino: cabe à junta escolher entre (a) o teardown
  da suíte adotar o idioma escopado do arnês (`cleanupIdentityFixture`) — o que toca a trilha e exige a
  bênção da junta pela garantia declarada — ou (b) transferir a `P-O6R-ARNES-ISOLAMENTO`. Evidência
  espelhada lá. **As existentes FICAM** (244 no ato deste registro: 231 de origem + 12 do F1 + 1 da execução
  de atribuição; o número cresce ≈1 por execução da suíte contra a base viva até a junta decidir o destino):
  alcançá-las exige contornar o trigger append-only — a quebra de garantia que o próprio bloco declara
  inviolável — e isso é **decisão de junta com privilégio** (higiene na base viva, mesma classe de
  `P-O6R-B01-IDENTIDADE-ORFA`), nunca linha de teardown. A CI **não é afetada**: o banco do job nasce limpo
  a cada execução. status: ABERTA.

## P-O6R-B02 (2026-08-14) — `fix/financial-uow` — Ω6R-DIN-001..004, DIN-008 (5 P0) + QUA-003 (P1) — **BLOQUEIA o financeiro**

Bloco 2 do plano (depende do B01). Aceite: Unit of Work tenant-scoped, locks, e pay/reverse/cheque/title/close
exercitados em **PostgreSQL concorrente** — não em adapter de memória.

**Reconciliação com o que este arquivo já registrava:** quatro destes achados **já tinham pendência antiga**
sob outro nome, aberta e citada no próprio código — `P-Ω4-4-LIQUID-ATOMIC` (DIN-001), `P-Ω4-4-EDGES` (DIN-002),
`P-Ω4-6-CLOSE-RACE` (DIN-008) e `P-021` (DAT-003, bloco 04). A auditoria não os "descobriu": ela os
**reclassificou como P0 e os juntou num bloco**. Registrar aqui não duplica trabalho — dá a eles a severidade e
o dono (bloco) que não tinham.

### Ω6R-DIN-001 (P0 · financial-entries / financial-titles) — pagamento concorrente infla o saldo da conta

**Dano concreto:** duas confirmações simultâneas sem `client_action_id` criam **dois lançamentos**; o segundo
`applyPayment` recusa por overpayment, mas o lançamento já persistiu — o título fica certo e **o saldo da conta
fica inflado**.

**Verificado na `main` (fato):** `src/modules/financial-entries/financial-entry.service.ts:277-282` — o próprio
comentário do serviço descreve a corrida e aponta o ideal (`entry.create` + `applyPayment` na mesma
`$transaction`); o `applyPayment` só é chamado **depois** do `create`.

### Ω6R-DIN-002 (P0 · financial-entries / financial-titles) — estorno devolve o dinheiro e deixa o título quitado

**Dano concreto:** estornar a liquidação reverte o caixa, mas **`paid_amount` e status do título não voltam** —
o recebível/obrigação continua quitado. Cobrança, aging, conciliação e fechamento passam a mentir.

**Verificado na `main` (fato):** `src/modules/financial-entries/financial-entry.service.ts:158-162` — comentário
do método `reverse` declara que o estorno **não** reverte `paid_amount` do título e que o contra-lançamento
nasce **sem `title_id`**.

### Ω6R-DIN-003 (P0 · cheques / financial-entries) — compensação de cheque em três etapas, rollback best-effort

**Dano concreto:** crash entre postar o lançamento e vinculá-lo ao cheque deixa **movimentação financeira
órfã**; o retry duplica.

**Verificado na `main` (fato):** `src/modules/cheques/cheque.service.ts:170-186` — `postEntry` em `try`, e no
`catch` a volta de estado é `.catch(() => {})` (best-effort, explicitado no comentário); o
`attachClearingEntry` acontece **depois** do lançamento já persistido, fora de qualquer transação comum.

### Ω6R-DIN-004 (P0 · financial-titles) — título pode virar "pago além do valor" ou sumir com pagamento

**Dano concreto:** PATCH aceita reduzir `amount` para abaixo do `paid_amount`, e o DELETE lógico não barra
título com movimento — o título sai das consultas ativas deixando lançamentos para trás.

**Verificado na `main` (fato):** `src/modules/financial-titles/financial-title.service.ts:226-243` — `amount` é
editável e a chamada ao repositório **não compara com `paid_amount`**; o comentário lista `amount` entre os
editáveis. Delete lógico em `:317-325`; `prisma/schema.prisma:1762-1767` **comenta** a desigualdade sem CHECK.

### Ω6R-DIN-008 (P0 · financial-period-closes) — writer entra em período já fechado

**Dano concreto:** o fechamento serializa **fechamentos** entre si, mas os writers só fazem um "período aberto?"
solto — um pagamento em voo commita **depois** do snapshot e entra num período fechado.

**Verificado na `main` (fato):**
`src/modules/financial-period-closes/financial-period-close-prisma.repository.ts:49-52` — comentário admite,
com todas as letras, que a proteção completa exige o **mesmo advisory lock no write-path**, e que o controle
compensatório é apenas re-derivação *a posteriori*. Writer correlato: `financial-title.service.ts:338-344`.

### Ω6R-QUA-003 (P1 · suítes financeiras) — os P0 acima passam verdes no CI

**Dano concreto:** as suítes financeiras montam adapters **Memory**; nenhum dos P0 de atomicidade é exercido
contra PostgreSQL concorrente. **Verde no CI não é evidência de atomicidade** — e foi exatamente isso que
deixou os quatro achados envelhecerem como pendência de baixa pressão.

**Verificado na `main` (fato):** `tests/financial-entries.test.ts:53-59` — `setup()` cria
`createMemoryFinancialEntryService/AccountService/TitleService`; `tests/financial-entries.test.ts:436-439` — o
próprio comentário diz que "a suíte roda só em memory … o caminho Prisma da conciliação não é exercido sem
banco". Vizinhas na mesma condição: `tests/cheques.test.ts:59-65`, `tests/financial-period-closes.test.ts:49-59`,
`tests/expense-management-routes.test.ts:182-204`. Correlato já registrado: `P-SUITE-ENV-PERSISTENCE`.

**Bloqueia (todos os seis):** feature nova em financeiro (lançamentos, títulos, cheques, fechamento,
conciliação, faturamento). O P1 `Ω6R-QUA-003` vem **antes** de nova feature financeira, por deliberação da
J-6R — não depois.
- status: ABERTA — 5 P0 + 1 P1. Rascunho arquitetural correlato: `docs/revisoes/O6R/D-002-uow-outbox.md`
  (**pauta do dono, não decisão**).

## P-O6R-B03 (2026-08-14) — `fix/expense-sync-atomic` — Ω6R-DIN-009 (P0) + QUA-001 (P1) — **BLOQUEIA despesas/RDV e mobile**

Bloco 3 do plano (depende do B01). Aceite: efeito + recibo atômicos com fingerprint; Flutter autenticado;
provas de crash, corrida e refresh de token.

### Ω6R-DIN-009 (P0 · expense-management) — replay de despesa duplica valor

**Dano concreto:** o efeito é aplicado **antes** do recibo, em transações separadas, e a chave de idempotência
não inclui usuário nem fingerprint do payload — crash entre os dois faz o replay **pagar duas vezes**, e
payloads divergentes com o mesmo `client_action_id` colidem em silêncio.

**Verificado na `main` (fato):** `src/modules/expense-management/expense-management.service.ts:169-190` — a
ordem é `findMobileActionReceipt` → `processSyncAction` → `createMobileActionReceipt`; a chave consultada é
`{ tenantId, clientActionId }`, **sem `actorUserId`** (que existe no registro, mas só é gravado depois) e sem
hash do payload. Transações separadas por método:
`expense-management-prisma.repository.ts:238-278`; modelo em `prisma/schema.prisma:2696-2713`.

### Ω6R-QUA-001 (P1 · mobile-flutter / expense-management) — a fila de RDV nunca converge

**Dano concreto:** o replay da fila de despesas sobe **sem token**: as ações offline do técnico batem em
401/403 e ficam presas na fila para sempre.

**Verificado na `main` (fato):** `mobile/flutter_app/lib/core/sync/sync_providers.dart:51` —
`final apiConfigProvider = Provider<ApiConfig>((ref) => const ApiConfig());` (config **const**, sem sessão), e
`:109-119` — `syncBatchApiProvider` lê justamente esse provider para construir o cliente do replay. O endpoint
exige permissão (`src/modules/expense-management/expense-management.routes.ts:110-115`) e o cliente HTTP só
manda `Bearer` se houver token (`mobile/flutter_app/lib/core/network/http_client.dart:33-47`).

**Bloqueia:** feature em despesas/RDV/comissões e a fatia mobile correspondente. `Ω6R-QUA-001` entra na
mesma fila do **PR-08 (reconciliação mobile)** já prevista em `P-MOBILE-OS-SEEDS` e
`P-MOBILE-BANNER-INTEGRACAO` (ambas ABERTAS) — quem abrir o PR-08 fecha este achado junto ou explica por quê.
- status: ABERTA — 1 P0 + 1 P1.

## P-O6R-B04 (2026-08-14) — `fix/inventory-consistency` — Ω6R-DAT-002, DAT-003 (2 P0) + QUA-002 (P1) — **BLOQUEIA estoque**

Bloco 4 do plano (depende do B01). Aceite: lock/CAS de saldo, fechamento único de contagem, contrato mobile
persistido em Prisma e sobrevivência a restart.

### Ω6R-DAT-002 (P0 · inventory) — saldo negativo por saída concorrente

**Dano concreto:** a saída lê o saldo, valida e insere **sem lock nem CAS**: saídas simultâneas do mesmo item
furam o guarda de não-negativo, e a reversão (check → insert, sem unicidade) **duplica a compensação**.

**Verificado na `main` (fato):** `src/modules/inventory/inventory-prisma.repository.ts:214-236` —
`saldoOfCustody` (agregado), depois `wouldOverdraw`, depois `insertMovement`, tudo dentro da transação RLS mas
**sem travar a linha de saldo**; o comentário confirma que o guarda roda sobre um agregado. Reversão em
`:410-426`; migração da custódia em
`prisma/migrations/20260828000000_add_stock_custody_ledger/migration.sql:74-81`.

### Ω6R-DAT-003 (P0 · inventory / cycle-count) — fechamento de contagem duplica ajuste

**Dano concreto:** cada ajuste do fechamento **commita em transação própria**; a sessão não é travada e não há
unicidade (sessão, item) — dois fechamentos concorrentes duplicam ajuste, e a falha no meio deixa contagem
parcial (o remendo atual é *pular o que já gravou*, não impedir).

**Verificado na `main` (fato):** `src/modules/inventory/cycle-count.service.ts:150-158` — o comentário de
idempotência declara que "cada `createMovement` commita na própria transação" e que um fechamento anterior pode
ter falhado no meio do laço; a mitigação é ler `listMovements` da sessão **antes** do laço e pular. Fechamento
só no fim (`:207`); repositório em `cycle-count-prisma.repository.ts:100-119`. Pendência antiga correlata neste
arquivo: `P-021`.

### Ω6R-QUA-002 (P1 · mobile-flutter / mobile-inventory / inventory) — movimento de estoque do app não existe para o backend

**Dano concreto:** o app enfileira um tipo de ação que o backend **não aceita**; mesmo que chegasse, o
coordinator de auto-sync não replaya estoque, e o backend guarda o estado num `Map` de processo separado do
Prisma. O estoque do campo diverge do real e **nada acusa**.

**Verificado na `main` (fato):**
`mobile/flutter_app/lib/features/inventory/data/inventory_repository.dart:92-105` — enfileira
`InventorySyncActionTypes.entryCreate`; `src/modules/mobile/mobile-inventory-sync.ts:101-105` —
`supportedActionTypes` = `inventory.reserve`, `inventory.consume`, `inventory.shortage_report`, e o estado vive
em `const inventoryByTenant = new Map<...>()` (`:100`). Coordinator sem estoque:
`mobile/flutter_app/lib/core/sync/auto_sync_coordinator.dart:90-118`.

**Bloqueia:** feature em estoque (entradas/saídas, custódia, contagem cíclica, baixa automática) e a fatia
mobile de inventário. Sem fila de trabalho **verificada por mim** hoje em estoque — a proibição vale igualmente
se surgir.
- status: **FECHADA (2026-08-15, PR #353 `a8901ff`)** — os dois P0 viraram gate de boot:
  produção recusa subir com o agregado core-saas em memória, sem banco, sem worker e com Redis apontando
  para host local. O texto acima descreve o estado **anterior** ao PR e fica como registro histórico; a
  `main` de hoje já não o reproduz. Ata: `omega/juntas/J-O6R-B05-PR353-merge.md` (3×0, sem veto).

## P-O6R-B12 (2026-08-18) — `fix/jurisdiction-profile-versioning` — Ω6R-DAT-004 (1 P1) — **achado ÓRFÃO, sem bloco até hoje**

**Estado:** ABERTO · **Dono:** próximo agente que puxar a trilha `jurisdiction`/`impound` · **PR-alvo:** ainda
não aberto · **Bloqueia:** nada (não é pré-requisito de outro bloco) · **É bloqueado por:** nada.

**Por que esta entrada nasceu depois de todas as outras.** O `PLANO_O6R.md` é de **2026-08-11** e cobria os 29
achados então conhecidos. O `Ω6R-DAT-004` entrou na **reconciliação da Fase 5** (2026-08-14), ao revisar de
fato o módulo `jurisdiction` — que a matriz marcava ✅ nas cinco lentes **sem relatório correspondente**. Ele
não foi votado pela J-6R e, até **2026-08-17**, **não tinha bloco de correção**: um achado aberto que o
cronograma não cobria, invisível para quem lesse o plano.

**Quem encontrou:** o guard `tests/kpi-achados-paridade.test.ts`, escrito ao repaginar o painel de KPI, **na
primeira execução** — ele exige que todo achado aberto esteja coberto por um bloco. Antes dele, registro,
painel e cronograma eram mantidos em paridade **à mão**, e já haviam divergido duas vezes.

### Ω6R-DAT-004 — editar o perfil normativo re-tempera custódias em curso, e a auditoria não registra o quê

`PATCH` do perfil normativo altera escopo, prazos legais, modelo e teto de diária e requisitos de liberação
**in place**, sem versão e sem data de vigência, inclusive para perfis já referenciados por processos vivos. O
motor de diárias resolve o teto lendo o perfil **corrente** no instante do cálculo, não o regime vigente na
entrada do veículo — enquanto o comentário canônico declara que o teto é intertemporal "por DATA DE ENTRADA".
A auditoria da edição grava apenas `{scope, active}`: não o campo alterado, nem o valor anterior, nem o novo.

**Aceite provisório** (escrito por quem fechou a lacuna, **não ratificado por junta** — a junta do próprio
bloco o revisa antes da primeira linha de código): carimbar no processo o snapshot normativo vigente na
entrada, ou versionar o perfil e referenciar a versão; motores lêem o regime **do processo**, não o perfil
corrente; auditoria campo a campo com valor anterior e novo (todos numéricos/enums, cabem na allowlist §2.8).

**Severidade P1 mantida como registrada** — reclassificar exigiria junta.

## P-O6R-B05 (2026-08-14) — `fix/production-runtime-gates` — Ω6R-DAT-001 + Ω6R-DIN-006 (2 P0) — **BLOQUEIA o deploy produtivo, literalmente**

Bloco 5 do plano (**sem dependência** — é o único par que pode começar em paralelo ao B01; é dependência do
B06, B08 e B10). Aceite: produção exige Prisma **e** worker; heartbeat/gate; smoke de persistência real no
compose/fly.

### Ω6R-DAT-001 (P0 · config / core-saas / runtime) — produção configurada para perder os dados no restart

**Dano concreto:** o serviço sobe **saudável**, aceita escrita e **perde usuários, papéis e tudo que os
adapters mantêm** no primeiro restart — com PostgreSQL disponível ao lado.

**Verificado na `main` (fato):** `docker-compose.prod.yml:48-50` traz, na **mesma estrofe `environment`**,
`NODE_ENV: production` e `CORE_SAAS_PERSISTENCE: memory`. `src/config/env.ts:28` define
`CORE_SAAS_PERSISTENCE: z.enum(["memory","prisma"]).default("memory")` — **memória é o default**. O gate de
produção (`src/config/env.ts:112-208`, o mesmo que exige allowlist de CORS) **não menciona a variável**.
Runtime que instancia o adapter em RAM: `src/modules/core-saas/core-saas-runtime.ts:6-16`.
**Nota honesta:** `fly.production.toml` **está correto** (`CORE_SAAS_PERSISTENCE = "prisma"`, verificado) — o
defeito é o compose produtivo somado à ausência de gate; o gate é o que impede o próximo manifesto de errar.

### Ω6R-DIN-006 (P0 · jobs / charging / impound / notifications) — o worker nunca sobe em produção

**Dano concreto:** diárias de pátio, reconciliação OS↔custódia e a trilha de notificações legais **nunca são
materializadas**, e o boot não acusa erro nenhum — o sistema fica em silêncio deixando de cobrar e de notificar.

**Verificado na `main` (fato):** `src/config/env.ts:33` — `JOBS_WORKER_ENABLED: booleanFlag(false)` (default
DESLIGADO). `src/server.ts:16` — `if (!env.JOBS_WORKER_ENABLED || env.CORE_SAAS_PERSISTENCE !== "prisma") return;`,
e logo abaixo (`:21-24` e `:33-39`) os **quatro** ticks iniciais que ficam de fora: `notifications.scan-due`,
reconciliação de custódia, diárias de cobrança e notificações legais devidas. `grep JOBS_WORKER_ENABLED` em
`fly.production.toml`, `fly.staging.toml` e `docker-compose.prod.yml` na `main` = **0 ocorrências nos três**.

**Bloqueia:** **o deploy produtivo em si** (é a razão material do 5×0) e qualquer feature que dependa de sweep
— cobrança por diária, notificação agendada, reconciliação de custódia.
- status: ABERTA — 2 P0. Rascunho arquitetural correlato: `docs/revisoes/O6R/D-003-jobs-duraveis.md`
  (**pauta do dono, não decisão**).

## P-O6R-B06 (2026-08-14) — `fix/billing-durability` — Ω6R-DIN-005 + Ω6R-DIN-007 (2 P0) — **BLOQUEIA a trilha CHECKLIST P1 (em execução AGORA) e o cloud billing**

Bloco 6 do plano (depende do B02 e do B05). Aceite: Outbox/Inbox para a medição de uso; SUM/GROUP BY sem
truncamento; fault injection e o caso das 10.001 linhas.

### Ω6R-DIN-005 (P0 · checklists / cloud-usage / cloud-cost-allocation) — vistoria concluída que ninguém fatura

**Dano concreto:** a vistoria é confirmada ao usuário e a **unidade faturável correspondente pode simplesmente
não existir**: a gravação da métrica é best-effort e engole a falha num `.catch()` com um `warn`. Como o replay
idempotente devolve `created:false` e **não republica**, o subfaturamento é **permanente e irreparável por
retry** — e `checklist_runs_count` é insumo direto do rateio de custo.

**Verificado na `main` (fato):** `src/modules/cloud-usage/cloud-usage.service.ts:156-168` —
`recordCloudUsageBestEffort` encadeia `.then(service.recordUsageEvent).catch(...)`, e o `catch` apenas
`logger.warn(...)`; o comentário acima (`:149-153`) declara o desenho "BEST-EFFORT e fire-and-forget".
Publicação fora da transação: `src/infra/events/domain-event.publisher.ts:48-60`. Gatilho que só publica quando
`created`: `src/modules/checklists/checklist.service.ts:247-269`. Consumo no rateio:
`src/modules/cloud-cost-allocation/cloud-cost-allocation.rules.ts:61-66`.

**BLOQUEIA — e este é o caso mais urgente da lista.** A trilha **CHECKLIST P1 está em execução neste
repositório neste momento** (árvore de trabalho na branch `feat/chk-p1-pr04c-a-aplicabilidade-ligada`, com
pendências `P-CHK-*` abertas mirando PR-04c/PR-05 — verificado). Pela deliberação da J-6R, **feature nova em
`checklists` está bloqueada** até o bloco P0 que fecha este achado. Pior: a `D-CHK-P1-APPLICABILITY` faz da
aplicabilidade um **multiplicador de vistorias por ordem de serviço** — ligar o sticky **multiplica o volume
de unidades faturáveis que este achado deixa cair**. Porteiro do próximo merge: este campo é para você.

### Ω6R-DIN-007 (P0 · cloud-costs) — custo de nuvem truncado em 10.000 linhas, sem aviso

**Dano concreto:** o resumo soma **no processo** apenas as linhas que voltaram sob um teto **cravado** de
10.000: períodos maiores produzem custo e rateio **subestimados** — e o número é base de cobrança.

**Verificado na `main` (fato):** `src/modules/cloud-costs/aws-cur.service.ts:190` — dentro de
`normalizeSummaryFilters`, `limit: 10_000` literal; `sumCosts` (`:194-196`) reduz **só o array retornado**.
Repositório aplica o `take`: `aws-cur-prisma.repository.ts:136-157`.

**Divergência preservada (§A2):** a J-6R manteve P0 por **3×2** — A3 (dados) e A4 (performance) defenderam P1,
por o erro subestimar relatório/rateio sem mutar o ledger; a maioria manteve P0 porque o valor **é base de
cobrança** e o truncamento é determinístico. Registrado como P0, com a divergência à vista
(`docs/revisoes/O6R/ATA_J6R.md`, seção "Severidades contestadas").

**Bloqueia:** feature em cloud billing / cobrança de nuvem / rateio de custo.
- status: ABERTA — 2 P0.

## P-O6R-B07 (2026-08-14) — `fix/authorization-and-uploads` — Ω6R-SEC-002 (P0) + SEC-003, SEC-004 (2 P1) — **BLOQUEIA OS/aprovações/RBAC, auth e anexos**

Bloco 7 do plano (depende do B01). Aceite: escopo por objeto e SoD, lockout atômico, scanner fail-closed com
magic bytes.

### Ω6R-SEC-002 (P0 · work-orders / approvals / RBAC) — o técnico aprova a própria ordem

**Dano concreto:** **aprovar e rejeitar** uma aprovação usam **a mesma permissão de editar OS**
(`work_orders:update`), que o técnico de campo tem. Resultado: técnico **decide aprovação tenant-wide** e
altera OS que não é dele — sem escopo por objeto, sem alçada, sem segregação de funções.

**Verificado na `main` (fato):** `src/modules/work-orders/work-order.routes.ts:70-83` —
`POST /approvals/:approvalId/approve` e `.../reject` montados com
`requirePermission(WORK_ORDER_PERMISSIONS.update)`, **exatamente** a mesma guarda do
`PATCH /work-orders/:workOrderId` (`:110-116`). Concessão ao técnico:
`src/modules/core-saas/permissions/catalog.ts:784-820`. Services que filtram só por tenant/id/estado:
`work-order.service.ts:759-804` e `approval.service.ts:61-97`. Contraste documental:
`RBAC_MATRIX.md:44-46,66` e `APPROVAL_LIMITS.md:38-52`.

**Bloqueia:** feature nova em ordens de serviço, aprovações e RBAC. **Atenção do porteiro:** a trilha
CHECKLIST P1 grava no caminho de **criação de ordem de serviço** (vínculo sticky, `D-CHK-P1-APPLICABILITY-SEMANTICA`
ponto 3) — qualquer fatia que amplie superfície de OS/aprovação cai neste bloqueio, não só as fatias que se
declaram "de OS". Pendências de OS já abertas aqui e afetadas pela mesma trava: `P-013`, `P-WO-LIST-TECH-NAME`.

### Ω6R-SEC-003 (P1 · auth) — o bloqueio de conta não existe; o 423 é caminho morto

**Dano concreto:** força bruta e credential stuffing **ilimitados**: o login lê `locked_until`, mas o caminho
de falha só incrementa um contador — nada escreve o lock, não há threshold nem rate-limit.

**Verificado na `main` (fato):** `src/modules/auth/services/local-auth-login.service.ts:124-137` — há
`if (credential.locked_until && ... ) return { ok:false, reason:"locked" }`, e no ramo de senha errada apenas
`await this.credentials.incrementFailedAttempts(credential.id, tenantId)` seguido do retorno
`invalid_credentials`; **nenhuma comparação com limite, nenhuma escrita de `locked_until`**. Repositório sem
escrita do lock: `local-auth-credential.repository.ts:101-112`. Rota: `auth.routes.ts:53-91`.

### Ω6R-SEC-004 (P1 · evidence / attachments / mobile) — scanner que sempre diz "limpo", MIME do cliente, download inline

**Dano concreto:** bytes hostis podem ser **armazenados e entregues inline** ao usuário: o scanner default
devolve `clean` sempre, o MIME vem do cliente e o download usa esse MIME em `inline`.

**Verificado na `main` (fato):** `src/modules/evidence/evidence-storage.ts:50-53` —
`class NoopEvidenceScanner { async scan() { return { status: "clean" }; } }`. Usos do default:
`src/modules/mobile/mobile-evidence-upload.ts:52-54` e `src/modules/attachments/attachment.storage.ts:52-61`;
MIME vindo do cliente e download em `attachment.storage.ts:90-105` + `attachment.routes.ts:71-83`.

**Bloqueia:** feature em auth (SEC-003) e em evidências/anexos/upload mobile (SEC-004) — P1 antes de feature no
módulo, por deliberação.
- status: ABERTA — 1 P0 + 2 P1.

## P-O6R-B08 (2026-08-14) — `fix/durable-jobs-realtime` — Ω6R-ARQ-001..003 + PERF-001 (4 P1) — **BLOQUEIA jobs e tempo real de campo**

Bloco 8 do plano (depende do B05). Aceite: lease/reclaim, schedule singleton, concorrência com deadline,
broadcast/replay de SSE.

### Ω6R-ARQ-001 (P1 · infra/jobs) — job perdido para sempre no crash

**Dano concreto:** matar o worker entre o `LPOP` e o fim do handler **perde o job definitivamente** —
notificação legal, reconciliação, diária. Não há lease, lista de processing nem reclaim.

**Verificado na `main` (fato):** `src/infra/jobs/job.queue.ts:57-75` — `dequeue` faz
`LPOP this.pendingKey` (remoção **destrutiva**) e só **depois** grava o envelope com `status: "processing"`;
entre as duas linhas não existe registro durável. Worker: `job.worker.ts:24-41`.

### Ω6R-ARQ-002 (P1 · infra/jobs) — cada restart multiplica as varreduras

**Dano concreto:** restarts e réplicas **multiplicam cadeias de sweep** indefinidamente: não há deduplicação
por nome nem eleição de líder.

**Verificado na `main` (fato):** `src/modules/charging/charge.jobs.ts:14-16` — o handler re-enfileira no
`finally`, **sempre** ("mesmo se a varredura falhar"), e `enqueueInitialChargingAccrueScan` (`:22-23`) enfileira
outro tick a cada boot; `src/server.ts:32-39` chama **quatro** desses `enqueueInitial*`; `job.queue.ts:20-49`
gera ID novo a cada enqueue.

### Ω6R-ARQ-003 (P1 · field-ops-realtime) — atualização de campo some entre réplicas

**Dano concreto:** cliente conectado em **outra réplica** perde a atualização operacional **em silêncio** —
sem replay, sem cursor, sem `Last-Event-ID`.

**Verificado na `main` (fato):** `src/modules/field-ops-realtime/field-ops-realtime.broker.ts:25-27` —
`subscribersByTenant`, `recentEventIds` e `recentEventIdSet` são estruturas **do processo**; `publish` (`:42-48`)
entrega apenas a `this.subscribersByTenant.get(...)` local.

### Ω6R-PERF-001 (P1 · infra/jobs) — worker sem trava de tick nem deadline

**Dano concreto:** job lento ou travado **acumula concorrência, conexões e memória** nos fluxos críticos, sem
timeout nem cancelamento.

**Verificado na `main` (fato):** `src/infra/jobs/job.worker.ts:86-90` —
`this.timer = setInterval(() => { this.processNextJob().catch(...) }, pollIntervalMs)`: a Promise não é
aguardada e **não há guarda de in-flight**; handlers (`:24-78`) rodam sem deadline.

**Bloqueia:** feature em jobs/agendamento e no tempo real de campo (SSE/mapa ao vivo).
- status: ABERTA — 4 P1. Rascunho arquitetural correlato: `docs/revisoes/O6R/D-003-jobs-duraveis.md`
  (**pauta do dono, não decisão**).

## P-O6R-B09 (2026-08-14) — `fix/dispatch-atomic-timeline` — Ω6R-ARQ-004 (P1) — **BLOQUEIA field-dispatch e a trilha do Mapa**

Bloco 9 do plano (depende do B08). Aceite: despacho + evento atômicos e idempotentes, com fault injection.

### Ω6R-ARQ-004 (P1 · field-dispatch) — despacho sem linha do tempo, ou despacho em dobro

**Dano concreto:** o despacho e o **evento obrigatório** de timeline são gravados por **dois métodos com
transação própria**: falha no segundo deixa o agregado **sem história**, e o retry, por não haver chave
idempotente, **cria um segundo despacho**.

**Verificado na `main` (fato):** `src/modules/field-dispatch/field-dispatch.service.ts:138-161` —
`await this.repository.create({...})` e, em seguida, `await this.repository.createEvent({...})`: duas chamadas
independentes, sem transação comum e sem `client_action_id`. Wrapper que abre transação por método:
`field-dispatch-prisma.repository.ts:150-174`.

**Bloqueia:** feature em despacho de campo — **inclusive a trilha do Mapa**: a pendência `P-Ω3F7B-MAPA-ETAPA`
(ABERTA, verificada) tem como ação da Junta de Mapas *"definir a fonte — snapshot de `FieldOperatorLocation`
por etapa do despacho"*, ou seja, trabalho em fila que grava/lê exatamente o agregado defeituoso. Construir
histórico por etapa sobre um agregado que pode nascer sem evento é construir sobre buraco.
- status: ABERTA — 1 P1.

## P-O6R-B10 (2026-08-14) — `fix/client-load-shedding` — Ω6R-PERF-002, PERF-003 (2 P1) — **BLOQUEIA web (transversal) e owner-portal**

Bloco 10 do plano (depende do B05). Aceite: single-flight/Abort no cliente; pipeline de imagem isolado; testes
de p99/RSS/out-of-order.

### Ω6R-PERF-002 (P1 · frontend / API client) — polling empilha requisição e a resposta velha vence

**Dano concreto:** sob lentidão, as requisições de auto-refresh **empilham** e uma resposta antiga pode
**sobrescrever** o estado novo na tela do operador — sem trava in-flight, sem timeout, sem cancelamento.

**Verificado na `main` (fato):** `frontend/src/hooks/useAutoRefresh.ts:34-40` — o tick faz
`void savedRefresh.current(true)` (Promise ignorada) dentro de um `window.setInterval` de intervalo fixo;
`frontend/src/services/api/client.ts:118-140` — os `fetch` não recebem `signal`/timeout. O achado registra 54
arquivos consumidores desse padrão (contagem da auditoria, **não reconferida aqui**).

### Ω6R-PERF-003 (P1 · owner-portal / runtime) — o portal público derruba o ERP junto

**Dano concreto:** a superfície **pública** decodifica imagens de até 40 milhões de pixels, **três em
paralelo**, no **mesmo processo** do ERP; o timeout de 4s desiste de esperar mas **não cancela** a CPU já em
curso — rotas autenticadas travam junto.

**Verificado na `main` (fato):** `src/modules/owner-portal/image-header-guard.ts:14` —
`MAX_DECODED_PIXELS = 40_000_000`; `src/modules/owner-portal/photo-concurrency-guard.ts:12` —
`PHOTO_PIPELINE_MAX_CONCURRENCY = 3`, com o comentário declarando que "o timeout de 4000ms **NÃO cancela**
trabalho síncrono já em curso"; pipeline em `owner-portal.photo-pipeline.ts:57-103`; um único processo em
`src/server.ts:43-65`. **Nota honesta:** as defesas existentes (header-guard e semáforo) são **anteriores** e
foram exigidas por junta-5 unânime (Ω5P PR-17b) — o achado Ω6R não as ignora, ele diz que **não bastam
enquanto o pipeline dividir processo com o ERP**.

**Bloqueia:** feature no portal do proprietário e mudanças transversais do cliente web de dados.
- status: ABERTA — 2 P1.

## P-O6R-B11 (2026-08-14) — `fix/mobile-work-order-contracts` — Ω6R-QUA-004, QUA-005 (2 P1) — **BLOQUEIA mobile (PR-08)**

Bloco 11 do plano (depende do B01). Aceite: envelope/casing/payload reais, `enqueueAll` durável, testes
Dio/Drift/restart.

### Ω6R-QUA-004 (P1 · mobile-flutter / work-orders) — **PARCIALMENTE SUPERADO pelo PR #351** (1 de 3 componentes)

**Estado hoje, conferido de primeira mão na `main` (`e80430a`) — não herdado de relato:**

- **Componente "timeline" — CORRIGIDO.** `mobile/flutter_app/lib/features/work_orders/data/work_order_remote_api.dart:122-138`
  hoje pede `Map<String,dynamic>` e lê `resp.data?['data'] as List<dynamic>?`, com comentário explicando que
  pedir `List<dynamic>` fazia o Dio devolver `null` e a linha do tempo remota vir **sempre vazia**. Entregue
  pelo PR **#351** (`7e60b90`, "fix(mobile): a linha do tempo remota da ordem de serviço nunca funcionou (B-127)").
- **Componente "envelope/casing" — ATIVO.** `:99`, `:115` e `:156` seguem chamando
  `_workOrderFromJson(resp.data!)` nos caminhos de **detalhe**, **status** e **assign** — passando o envelope
  `{ data: {...} }` inteiro ao parser, enquanto o backend serializa em camelCase
  (`src/modules/work-orders/work-order.dto.ts:15-24`, `customerName` etc.) dentro de `{ data }`
  (`work-order.controller.ts:52-58`).
- **Componente "assign envia campo não lido" — PARCIALMENTE VERIFICADO.** Confirmei que o app envia
  `{'user_id': userId, ...}` (`:146-153`). **Não** reconferi se o service do backend lê esse nome — o
  controller apenas repassa `request.body` (`work-order.controller.ts:165-169`). Fica como **não-verificado
  por mim**; a afirmação original está em `achados.jsonl` (`Ω6R-QUA-004`, com âncora
  `work-order.service.ts:1079-1088`).

**Consequência para o registro:** `REGISTRO_ACHADOS_O6R.md` e `achados.jsonl` ainda marcam este achado como
`ativo` e o `KPI_O6R.md` declara superados = 0. **Este arquivo não é o dono daquele registro** e não o altera
(escopo: `controle/`). O achado permanece **ABERTO com escopo reduzido**: fecha com os dois componentes
restantes, não com os três.

### Ω6R-QUA-005 (P1 · mobile-flutter / prestador) — material lançado em campo some no restart

**Dano concreto:** o método retorna **antes** de a fila estar gravada, e cada `enqueue` faz
read-modify-write da fila inteira: crash logo após o retorno perde ações, e vários SKUs em sequência podem
**sobrescrever** uns aos outros.

**Verificado na `main` (fato):** `mobile/flutter_app/lib/features/prestador/data/prestador_repository.dart:121-133` —
`selection.forEach((sku, qty) { ... _syncQueue.enqueue(action); });` — `forEach` **não aguarda** a Future
(contraste imediato: o laço logo acima, `for (final material in merged) await ...`, aguarda). Fila com
read-modify-write: `mobile/flutter_app/lib/core/sync/sync_queue_repository.dart:26-33` e
`core/local_db/drift_sync_action_store.dart:28-55`.

**Bloqueia:** feature no app de campo (OS mobile, prestador). Junta-se à fila do **PR-08 (reconciliação
mobile)** já apontada por `P-MOBILE-OS-SEEDS` e `P-MOBILE-BANNER-INTEGRACAO`, ambas ABERTAS.
- status: ABERTA — 2 P1, sendo `Ω6R-QUA-004` com **1 de 3 componentes já superado** pelo PR #351.
  Rascunho arquitetural correlato: `docs/revisoes/O6R/D-004-contratos-clientes.md` (**pauta do dono, não
  decisão**).

## P-TESTS-FORA-DO-TYPECHECK (2026-08-14 — ciclo 3 da revisão do CHK P1 PR-04c-A)

`npm run check` é `tsc -p tsconfig.json --noEmit`, e o `include` do `tsconfig.json` é `["src/**/*.ts"]`:
**os arquivos de `tests/` nunca são typecheckados**. Confirmado por injeção deliberada — um
`const ERRO: number = "isto e uma string";` em `tests/field-dispatch.test.ts` sai com **exit 0**.

**O dano concreto** (foi assim que o achado nasceu): um dublê de teste pode divergir do porto que ele
finge implementar sem quebrar build nenhum. No ciclo 2 desta fatia, um dublê usava `as never` para
escapar da checagem — e o parâmetro obrigatório do construtor, criado justamente para que compor sem
porto virasse **erro de compilação**, não alcançava o dublê. A correção em `src/` é real; o que não
está guardado é o lado do teste, e é ali que a divergência aparece primeiro.

- **Correção:** um segundo projeto de typecheck cobrindo `tests/**` (ex.: `tsconfig.tests.json` com
  `include: ["src/**/*.ts", "tests/**/*.ts"]`, `noEmit`), somado à bateria §9 e ao job `backend` do CI.
  Fora do escopo desta fatia: mexer no `tsconfig` da raiz muda o contrato de build de todo o repo e
  merece bloco próprio, com a junta olhando quantos erros latentes existem hoje em `tests/`.
- status: ABERTA.

## P-CHK-DEFERRED-SEM-LEITURA (2026-08-14 — ciclo 4 da revisão do CHK P1 PR-04c-A)

O ciclo 4 fechou o ponto cego do laço de vistorias ausentes trocando inferência por **leitura**
(`hasChecklistRun`). O ramo **vizinho** — o das vistorias *diferidas* — continua afirmando na timeline da
**ORDEM** (a que o app de campo baixa) que a vistoria *"ainda não foi enviada ao técnico"* **sem fazer a mesma
pergunta**. É exatamente a classe de defeito que acabou de custar dois ciclos, uma linha acima no mesmo arquivo.

**Hoje é inalcançável, e foi verificado** (não presumido): `appendAfterExisting: true` em `adjustChecklists` e em
`rewriteChecklistSet` impede que uma adição desloque linha que já tem execução, e `assertChecklistNotDispatched`
barra retirar linha com execução. As duas travas juntas garantem que uma linha diferida nunca tem execução viva.

- **O que reabre:** qualquer porta futura que **insira antes** de linha existente ou **reordene** `order_index`.
  Quem mexer nisso reabre a classe inteira, e o sintoma é um documento de prova afirmando o oposto do que
  aconteceu.
- **Correção quando reabrir (ou preventivamente):** o ramo diferido faz a mesma pergunta read-only antes de
  declarar.
- status: ABERTA (latente).

## P-CHK-CREATE-RAZAO-NAO-NORMALIZADA (2026-08-14 — ciclo 4 da revisão do CHK P1 PR-04c-A)

O `reassign` **normaliza** a razão da falha de provisão (`normalizeChecklistProvisionReason`); o `create` usa a
classificação crua. Sob despublicação dentro da janela do despacho, a timeline do DESPACHO recebe
`checklist_not_published` enquanto o caminho irmão grava `template_not_published` — o "um fato, dois códigos"
que esta mesma fatia consertou do outro lado, e que ninguém somaria seis meses depois.

- **Alcance:** pré-existente, janela estreita, e **só** na timeline do despacho (a tela do escritório) — não
  chega ao app de campo. Por isso não bloqueou o merge.
- **Correção:** o `create` passa a normalizar, como o `reassign`.
- status: ABERTA.

## P-NPM-TEST-VERDE-VAZIO-NO-WINDOWS (2026-08-15 — porteiro pós-merge do #352)

`package.json:19` define `"test": "node --test --import tsx tests/*.test.ts"`. **No Windows o shell não expande o
glob**, `node --test` não encontra nada, e **o processo sai com código 0**. Reproduzido nesta máquina:

```
> node --test --import tsx tests/*.test.ts
Could not find 'C:\...\ERP_Techsolutios\tests\*.test.ts'
EXIT=0
```

**O dano:** `npm test` é o comando da bateria §9 e da DoD §10. Toda execução local que confiou nele foi **verde
sem rodar um único teste** — a classe exata de "verde que não exercita nada" que o veto de especialidade do
`agente-ci-doutor` existe para matar (§C7). Na CI (`ubuntu-latest`) o glob expande e a suíte roda de verdade, e é
por isso que o defeito sobreviveu: o único lugar onde ele aparece é a máquina do dono.

Descoberto pelo porteiro do #352 ao **reexecutar** as contagens em vez de copiá-las — que é literalmente a razão
de o papel existir.

- **Correção:** trocar o script por uma forma que funcione nos dois sistemas **sem dependência nova** (o próprio
  `node --test` aceita diretório desde o Node 20; ou um runner mínimo em `scripts/`), **somada a um guard que
  falhe quando a suíte executar zero testes** — sem o guard, a próxima variação do mesmo defeito passa de novo.
- **Alvo:** **B-O6R-05** (`fix/production-runtime-gates`), por ser o bloco de gates e por já carregar as
  correções de bateria da junta `J-O6R-B05`.
- status: **FECHADA** em 2026-08-15 pela Frente C do **B-O6R-05** — ver o fechamento abaixo.

### Fechamento (B-O6R-05, Frente C — 2026-08-15)

**Correção entregue.** `package.json:19` passa a invocar `scripts/run-backend-tests.mjs` (novo, **zero dependência
nova** — §C7). O runner expande `tests/*.test.ts` com `fs.readdirSync` **em JS**, ordena (determinismo), e passa a
**lista explícita** ao `node --test` — a mesma forma que a CI já usa no subconjunto contra o Postgres, e que
funciona nos dois sistemas porque não depende de shell nenhum. Guards, ambos **monotônicos** (só transformam
verde em vermelho, nunca o contrário): (1) zero arquivo casado ⇒ falha alto; (2) TAP sem `# tests`, ou com
`# tests 0` ⇒ falha alto. Guard novo em `tests/npm-test-runner-guard.test.ts` — **13 testes**: nove sobre as
funções puras, e **quatro que executam a própria `main()` do runner** por processo filho, contra fixtures
isoladas num diretório temporário (nunca `tests/`, então **não há recursão**). Os quatro existem porque um
crítico mediu que, sem eles, quatro mutações na `main()` sobreviviam à suíte inteira — inclusive trocar a
propagação do código de saída, o que deixaria a CI verde com a suíte vermelha.

**A armadilha que esta própria pendência sugeria foi verificada e RECUSADA.** "O próprio `node --test` aceita
diretório desde o Node 20" **não resolve**: no Node 20 os padrões default de descoberta do test runner **não
incluem `.ts`**, então o diretório resolveria para zero arquivo — o mesmo verde vazio com outra roupa. Por isso a
lista explícita.

**CORREÇÃO DO REGISTRO — o `EXIT=0` acima está errado.** Reexecutado nesta máquina (Node v20.19.5), o comando
antigo sai com **código 1**, não 0:

```
$ npm test ; echo "EXIT=$?"          -> EXIT=1     (medição direta)
$ npm test 2>&1 | tail -3 ; echo "EXIT=$?"  -> EXIT=0     (medição ATRAVÉS DE PIPE)
```

O `0` registrado veio de `$?` estar lendo o código de saída do **`tail`**, não o do `npm`. O defeito de fundo é
real e permanece integralmente — **nenhum teste era executado** —, mas ele era **barulhento**, não silencioso:
quem lesse o código de saída diretamente veria vermelho. Quem medisse através de um pipe (`| tail`, `| head`,
`| grep`) veria zero e leria como verde. Essa distinção **estreita o dano** e vale registrar em vez de deixar a
frase mais assustadora no arquivo.

**Dano histórico, delimitado com honestidade.** As contagens oficiais de KPI vêm de **execução em CI**
(ubuntu, onde o glob expande) e de **invocações com arquivos explícitos** (`node --test --import tsx tests/x.test.ts`),
que nunca passaram por este defeito. O que o comando quebrado contaminou foram **baterias locais desta máquina**
que rodaram `npm test` — e, dessas, apenas as que leram o resultado através de um pipe puderam confundi-lo com
verde. Nenhum número publicado é retirado por causa disto.

**Efeito colateral revelado na primeira execução honesta.** Com o runner novo, `npm test` passou a executar de
verdade nesta máquina. Medição na configuração da CI (`CORE_SAAS_PERSISTENCE=memory`) no momento deste fechamento:
**2413 testes · 2404 pass**. A contagem **final do bloco**, depois dos ciclos de correção que somaram testes,
é **231 arquivos · 2438 testes · 2429 pass · 0 fail · 9 skip · exit 0** — é ela que está no KPI.

**E na configuração que o `.env` desta máquina impõe (`prisma`), a mesma suíte dá 89 falhas.** Não é regressão
deste bloco — provado por A/B: os mesmos arquivos falham com e sem as mudanças daqui (89 e 89), e passam
(86/86) quando a persistência é forçada para memória. A CI não tem `.env`, então cai no default de memória e o
job fica verde. Ou seja: **a suíte não suporta a configuração que o `.env` do dono impõe**, e isso era invisível
enquanto o `npm test` não rodava. Registrado em pendência própria — ver `P-SUITE-NAO-SUPORTA-ENV-PRISMA`.

## P-O6R-B05-WORKER-EXTERNO-DIFERIDO (2026-08-15 — bloco B-O6R-05, decisão C4)

A flag "outro processo roda o worker", o ramo que **lê** o sinal de vida no Redis e a topologia de processo
separado ficaram **fora** do B-O6R-05 por `D-O6R-B05-WORKER-INCONDICIONAL`: sem um processo worker dedicado no
repositório, a flag seria satisfazível só no nome. A **escrita** do sinal foi entregue e testada — é o contrato
que o consumidor vai ler.
- **Correção:** entregar a flag **junto** do processo que a torna verificável, com prova no boot ou a disciplina
  de cinco itens de contenção.
- **Alvo:** B-O6R-08 (`fix/durable-jobs-realtime`). status: ABERTA.

## P-O6R-B05-STAGING-SCALE-ZERO (2026-08-15 — bloco B-O6R-05, questão Q5)

O staging escala a zero (`fly.staging.toml`: paradas automáticas ligadas, mínimo de máquinas em execução = 0).
**Máquina dormindo ⇒ o worker não roda**, então as varreduras periódicas não acontecem em staging mesmo depois
deste bloco ligar o gate. Subir o mínimo para 1 **custa dinheiro do dono** — nada foi alterado.
- **Decisão:** do **dono**, não da junta.
- status: **RESOLVIDA (2026-08-15)** — o dono **autorizou o custo** e a máquina fixa foi ligada
  (`min_machines_running = 1`), em PR próprio e isolado. Registro: `D-O6R-B05-STAGING-MAQUINA-FIXA`
  em `decisoes.md`. Nota: com os gates do B-O6R-05, a máquina **só sobe com os segredos postos** —
  ligar o mínimo não provisiona segredo, e isso segue sendo ação humana.

## P-O6R-B05-HEARTBEAT-NAO-DETECTA-HANDLER-TRAVADO (2026-08-15 — bloco B-O6R-05)

O sinal de vida do worker prova que **o laço completou um ciclo recentemente, incluindo a ida à fila** — não
prova que um job **conclui**. Um handler travado deixa o laço girando e o sinal fresco.
- **Correção:** prazo por job e limite de concorrência (achado `Ω6R-PERF-001`). **Alvo:** B-O6R-08.
- status: ABERTA. O limite está declarado no corpo da resposta do endpoint (`measures`), para o monitor não
  afirmar mais do que mede.

## P-O6R-B05-README-ATIVACAO (2026-08-15 — bloco B-O6R-05)

Os cabeçalhos dos manifestos do provedor enumeravam os segredos exigidos na ativação **sem nenhuma variável do
portal público** — quem seguisse as instruções do próprio arquivo receberia um processo que sai com erro antes
de escutar a porta. Este bloco completou os cabeçalhos com os **nomes**. Falta o dossiê de hand-off humano
(`docs/deployment.md`, seção de ativação) **herdar a mesma lista corrigida**, para não divergir de novo.
- **Alvo:** hand-off de ativação. status: ABERTA.

## P-SUITE-NAO-SUPORTA-ENV-PRISMA (2026-08-15 — bloco B-O6R-05, revelado ao consertar o `npm test`)

Com o `npm test` finalmente executando de verdade, apareceu um fato que estava escondido: **a suíte falha 89
testes quando a persistência é `prisma`**, que é exatamente o que o `.env` desta máquina impõe. Na configuração
da CI (sem `.env`, default `memory`) a mesma suíte dá **2413 testes, 0 falhas**.

**Não é regressão de bloco nenhum** — provado por A/B durante o B-O6R-05: os mesmos arquivos falham com e sem as
mudanças do bloco (89 e 89), e passam (86/86) com a persistência forçada para memória.

**Por que importa.** O dono roda a bateria na máquina dele, com o `.env` dele. Até agora o `npm test` não
executava nada, então a divergência nunca apareceu; a partir de agora ela aparece como 89 vermelhos toda vez, e
quem não souber disso vai caçar um defeito que não existe — ou, pior, vai aprender a ignorar vermelho.

### Classificação das falhas (2026-08-16, medida na branch `fix/runner-modo-declarado`, base `main` @ `56c84d6`)

Agrupadas por assinatura de erro, **todas** — não por amostra. Nenhuma é defeito:

| Classe | Quantas | O que é |
|---|---|---|
| Fixture semeada em memória × runtime resolvido em `prisma` | ~86 | Causa raiz única e mecânica: `src/config/env.ts` carrega o `.env` e **congela o snapshot no import**; o ESM hasteia os imports estáticos, então os arquivos que escrevem `process.env.CORE_SAAS_PERSISTENCE = "memory"` no próprio corpo chegam **tarde**. O serviço vai ao Postgres real procurar fixture que só existe em memória: "Work order was not found", 400/500 em rota e — o mais revelador — `invalid input syntax for type uuid: "ten_000001"`, porque os IDs de fixture **nem são UUIDs**. Teste **desenhado para memória** que o ambiente sequestrou, não teste "que precisaria de banco". |
| Meta-testes do default do env (`core-saas-runtime.test.ts`) | 3 | Afirmam "defaults to memory when unset" lendo o ambiente da máquina. Falham porque o `.env` daqui define `prisma`. Mesma família: suposição de ambiente. |
| Poluição entre suítes | 0 | As falhas reproduzem igual em arquivo isolado. |
| Defeito real de produção escondido | 0 encontrado | Nenhuma das assinaturas tem cara de defeito do caminho prisma (coluna errada, enum divergente, constraint disparando em dado válido). **Limite declarado abaixo.** |

Medição desta rodada, com a correção aplicada: `CORE_SAAS_PERSISTENCE=prisma npm test` → **231 arquivos · 2446
testes · 2348 pass · 89 fail · 9 skip · exit 1**, concentradas em **15 arquivos** (`work-order-mileage` e
`financial-entries` 40 cada; `work-order-invoicing` e `professional-statements` 24; `mobile-checklists-available`
20; `inventory-abc` e `actor-aware-routes` 12; `telemetry` e `service-quote-approve` 7; `work-order-map` e
`work-order-cancel-duplicate` 6; `work-order-checklists-sticky` 5; `work-order-financials` e `core-saas-runtime` 3;
`aws-cur-cost-import` 1). O dossiê que embasou o bloco mediu **90 em 16 arquivos** na mesma base — a contagem
oscila em ±1 entre execuções (a pendência nasceu registrando 89). **A classe é idêntica; o número exato não é
estável e não deve ser citado como se fosse.**

**Correção entregue (2026-08-16, branch `fix/runner-modo-declarado`) — recomendação (c) do dossiê.**
`scripts/run-backend-tests.mjs` (que já é o `npm test`) passou a **resolver o modo de persistência e a passá-lo no
`env` do processo FILHO**, que é onde o `env.ts` congela o snapshot:
- variável **não exportada** → o runner define `memory`, exatamente o que o job `backend` da CI faz;
- variável **exportada** (qualquer valor, inclusive `prisma`) → o runner **respeita** e não sobrescreve;
- valor **vazio** conta como não exportada (repassar string vazia só derrubaria o enum do `env.ts`);
- o modo resolvido é **declarado em uma linha**, com a procedência (`herdado do ambiente` × `padrão do runner`) —
  silêncio aqui repetiria a classe de defeito que o runner existe para matar (`P-NPM-TEST-VERDE-VAZIO-NO-WINDOWS`
  nasceu porque o `npm test` não executava nada **e não dizia**).

Coberto por `tests/npm-test-runner-guard.test.ts` (5 casos puros + 3 que executam a `main()` por processo filho e
aferem `process.env.CORE_SAAS_PERSISTENCE` **de dentro da fixture** — declarar um modo e passar outro é a mentira
que o guard não deixa passar). Provado por 5 mutações, todas derrubadas.

**Medições da entrega:** `npm test` sem exportar nada → **231 arquivos · 2446 testes · 2437 pass · 0 fail · 9 skip
· exit 0**. Suítes de banco (as 13 do job `backend-postgres` + as demais `*-db*`, 17 arquivos) com `DATABASE_URL`
exportada → **100/100, 0 pulos**, tanto no modo resolvido pelo runner quanto com `prisma` exportado.

- status: **RESOLVIDA quanto ao dano imediato** — o dono não vê mais 89/90 vermelhos falsos, e a bateria local
  passou a ser a mesma da CI nas duas plataformas, sem depender de ninguém lembrar de exportar variável.
- **O que CONTINUA ABERTO, com honestidade:** esta correção **não prova que o caminho de persistência real está
  correto**. Ela prova que aquelas falhas não são defeito — e nada além disso. Naquele modo a suíte **morre na
  fixture antes de chegar ao caminho real**: o que ela exercita é o driver rejeitando `ten_000001`, não a query da
  rota. Quem prova o caminho real são as **suítes dedicadas de banco** (`*-db*` e o job `backend-postgres`), e
  fechar o ponto cego estrutural (`Ω6R-DAT-001`) segue sendo **crescer o subconjunto curado que roda contra o
  Postgres, módulo a módulo** — não rodar a mesma suíte duas vezes com variáveis diferentes, que não mede nada
  novo. Os 15 arquivos acima continuam **não-herméticos** (imports estáticos de `src/`): hermetizá-los
  oportunisticamente, quando cada um for tocado por outro motivo, é o resíduo — o dano vivo era a bateria, e esse
  fechou.

## P-O6R-B05-REDIS-HOST-DNS-DIFERIDO (2026-08-15 — bloco B-O6R-05)

O gate que recusa Redis apontando para host local decide por **endereço**, não por literal: normaliza o
hostname e recusa qualquer notação que resolva numericamente para o bloco de loopback inteiro ou para o
endereço não-especificado — incluindo as formas curtas, octais, hexadecimais, o ponto final da raiz e o IPv4
mapeado em IPv6. Duas famílias ficam **de fora**, e isto está declarado no comentário do predicado **e cravado
como teste** (o caso nomeia a pendência), justamente para a afirmação não poder divergir do código outra vez:

1. **Host que só se revela local na resolução de nome** — alias de `hosts` e DNS curinga do tipo que devolve um
   endereço de loopback. Fechar exigiria resolver DNS **no boot**, o que troca um gate determinístico por um que
   depende da rede no momento de subir.
2. **IPv4 embutido sob prefixo diferente do mapeado comum** (traduzido e o prefixo de NAT64). Nenhum desses
   chega a destino sem um tradutor na frente.

- **Correção, se um dia valer:** resolução no boot, com o custo declarado (falha de DNS passa a impedir o boot).
- status: ABERTA (limitação conhecida e declarada, não defeito silencioso).

## P-O6R-B05-DATABASE-URL-SEM-FORMA-NEM-HOST (2026-08-15 — junta do PR #353, ressalva do `agente-dba-guardiao`)

O B-O6R-05 nasceu para fechar a assimetria "banco blindado, Redis aberto" e **entregou o inverso**: o `REDIS_URL`
recebeu validação **estrutural** (forma de URL) **e semântica** (recusa de qualquer notação que resolva para
loopback), enquanto o `DATABASE_URL` recebeu só **presença não-vazia**.

Medido pela cadeira, em produção plenamente válida: `DATABASE_URL=nao-e-url`, `DATABASE_URL=x` e até
`DATABASE_URL=redis://localhost:6379` **passam no boot**.

**Por que não bloqueou o merge:** o P0 era a perda **silenciosa** de identidade, e essa está fechada — um gate
impede memória, o outro impede vazio. URL malformada quebra **alto** no primeiro acesso ao banco, que é ruído,
não perda de dado. E o plano §2.2 especificou este gate como "presente e não-vazia": o código faz o que o plano
diz — **não é superdeclaração**.

**Correção:** exigir do `DATABASE_URL` em produção a mesma disciplina do Redis — forma de URL e recusa de host
de loopback. Um Postgres de produção apontado para o loopback do próprio contêiner é **o mesmo dano** que o do
Redis: some no restart, que é literalmente o `Ω6R-DAT-001` entrando por outra porta.
- **Alvo:** B-O6R-08. status: ABERTA.
- Já feito neste PR: o comentário do campo em `src/config/env.ts` foi reescrito para declarar o que ele **não**
  faz, a pedido da junta — a frase anterior prometia mais rigor do que as duas linhas seguintes entregavam.

## P-REDIS-DEV-LIXO-DE-FILA (2026-08-15 — achado lateral da junta do PR #353)

O Redis de desenvolvimento desta máquina carrega **42.393 chaves de payload de fila** (`erp:jobs:data:*`) de
suítes antigas, presentes antes de qualquer execução da rodada. Não é resíduo de bloco nenhum e não afeta
veredito, mas com disco escasso (§C5) vale uma faxina **escopada** — é payload de fila, não dado de domínio.
- **Cuidado:** faxina por padrão de chave em base viva já causou incidente nesta rodada. Fazer com escopo
  explícito e contagem antes/depois, nunca por curinga solto.
- status: ABERTA.

## P-O6R-B01-ROLE-LITERAIS (2026-08-18 — ciclo 2 do B-O6R-01, plano §9)

A fatia 1 do ciclo 2 fez do `ROLE_AUTHORITY` (em `src/modules/core-saas/permissions/catalog.ts`) a fonte
única de "qual papel é de plataforma", com guard 10a travando literais em `src/modules/platform/**`
(baseline 0). Ficaram **de fora, de propósito**, literais de papel de plataforma em 4 arquivos de
**feature** — medidos na fatia 3:

- `src/modules/fines/fine.types.ts`
- `src/modules/navigation/navigation.service.ts`
- `src/modules/notifications/fleet-alerts.runner.ts`
- `src/modules/notifications/notification.recipient-resolver.ts`

**Por que não fechou no ciclo:** esses literais não são o gate de autoridade (o gate é o
`assertAssignableRole` do serviço, agora testado no caminho Prisma); mexer em 4 features fora do foco de um
ciclo de correção é risco sem prova nova. **Correção, quando vier:** importar as constantes derivadas do
`ROLE_AUTHORITY` (ou classificar via mapa), com o guard 10a estendendo a fronteira arquivo a arquivo.
- status: ABERTA.

## P-O6R-B01-ROUTE-ERROR-LEAK (2026-08-18 — ciclo 2 do B-O6R-01, plano §9; achado B-7 do R-ciclo1)

O fallback de `sendRouteError` (`src/modules/core-saas/routes/http.ts`) devolve `error.message` **cru** no
corpo público (`400 invalid_request`) para qualquer `Error` que não seja `CoreSaasError`/`RouteError` — foi
por aí que a mensagem do Postgres (`Raw query failed. Code … invalid input syntax for type uuid`) vazou no
DELETE de vínculo com `reauthTenantId` malformado. O ciclo 2 fechou **só a borda da rota do bloco**
(validação de forma antes do banco em `identity-links.routes.ts`, com teste que reprova corpo com erro cru);
a **classe** — dezenas de módulos passam pelo mesmo fallback — é bloco próprio: mudar o fallback altera o
contrato de erro de todas as rotas de uma vez e precisa de plano e junta próprios.
- status: ABERTA.

## P-O6R-ARNES-ISOLAMENTO (2026-08-18) — o arranjo do lote de testes contra Postgres, **anterior ao B-O6R-01**

**Estado:** ABERTO · **Dono:** bloco próprio, ainda não aberto · **Bloqueia:** nada diretamente — mas mantém a
CI instável e **envenena tabela append-only a cada execução**.

**Por que é bloco próprio e não parte do B-O6R-01** (decisão de escopo registrada em
`agent-orchestration/omega/reprovacoes/R-B-O6R-01-ciclo3-premissa.md`): atinge **seis suítes de quatro trilhas
diferentes**, tem defeito **anterior** ao bloco, e **já reincidiu uma vez** — o `ci.yml:106-111` documenta,
por escrito, que a variável `RBAC_DB_PARITY` existe porque a versão anterior deduzia o provisionamento por
uma sentinela *"que o paralelismo do npm test polui (várias suítes criam papéis)"*. Mesmo arranjo, mesma
classe, e a resposta de então foi uma variável de ambiente.

### O que fica aqui (o que o B-O6R-01 **não** criou)

- **`ALTER TABLE … RENAME COLUMN` sobre tabela compartilhada dentro do lote** —
  `tests/checklist-applicability-prisma-db.test.ts:355/373`, com duas suítes irmãs do **mesmo lote** usando a
  tabela. Medido por sonda somente-leitura: 19.081 amostras, **6 janelas de 17–20 ms por rodada em que a
  coluna não existia** (`42703 undefined_column` para quem cair nelas).
- **Cinco prefixos de role sem varredor:** `rls_test_` (**68 órfãs vivas, todas com LOGIN**), `audit_rls_`,
  `vid_link_rls_`, `vid_rls_test_`. Total medido na base do dono: **81 roles não-sistema, 74 com LOGIN, até
  460 privilégios de tabela cada.**
- **Grau de paralelismo não declarado** — `node --test` roda `availableParallelism() - 1` arquivos (7 nesta
  máquina), e nem o `ci.yml` nem o `scripts/run-backend-tests.mjs` o fixam. Logo **nenhuma taxa medida numa
  máquina é afirmável sobre outra**.
- **Divergência entre as três formas de execução** — job `backend`, job `backend-postgres` e `npm test` local:
  só uma roda `db:seed`, e a base local carrega detrito (294 organizações, 274 usuários, 81 roles) que a da CI
  não tem. Foi essa divergência que fez o mesmo lote medir **12/12 verde** para um agente e **4/12 vermelho**
  para outro — nenhum dos dois número errado; o arranjo é que não tem veredito.

### Entrada de pesquisa

`docs/omega-pd.md` → **`PD-O6R-B01-ISOLAMENTO`** (9 fontes, 3 primárias). Conclusão que este bloco herda:
**nenhuma técnica isolada cobre as três classes** deste lote — linhas de tabela, catálogo de **cluster**
(role, função) e esquema de tabela compartilhada. Transação-com-rollback não serve ao que se prova aqui;
schema-por-worker não isola `pg_authid`; banco-por-worker resolve `23503`/`23505` e **não** resolve o `XX000`.
Só cluster/contêiner por worker isola catálogo — e o advisory lock é, na fonte primária, um *workaround* que
falha exatamente por **quem não sabe que deveria tomá-lo**.

### As propriedades exigidas

**P1** paralelismo declarado, não função do hardware · **P2** statement sem escopo roda sozinho, ou não é o
statement que se prova · **P3** objeto de cluster exige mecanismo único entre **todas** as criadoras — hoje
**nada fica vermelho** quando uma suíte nova escreve catálogo fora do lock · **P4** nenhuma suíte altera
esquema de tabela compartilhada durante o lote · **P5** varredor cobre todo prefixo, **inclusive quando o
processo morre** · **P6** escrita fora de escopo não pode ser irreversível · **P7** a prova é verde ou
vermelha pelo mesmo motivo nas três formas · **P8** *"verde em N execuções"* não é prova sem N e forma
declarados · **P9** o plano não afirma propriedade que a entrega não tem.

Enunciadas na íntegra em `agent-orchestration/omega/reprovacoes/R-B-O6R-01-ciclo3-premissa.md`.

### Evidência do condicional C5 do ciclo 3 (2026-08-19) — o produtor residual da trilha órfã, ATRIBUÍDO

A medição F4 do ciclo 3 (contador de órfãs antes/depois de 12 execuções F1 na forma exata do job
`backend-postgres`) deu **delta +12 (231 → 243, ≈1 por iteração)** — MESMO com o backfill escopado (C1) e a
sonda medindo **0 instantes** com terceiro no conjunto-alvo (713 amostras). Atribuição por execução isolada:
**`tests/core-saas-role-authority-db.test.ts`** sozinha produz **+1 órfã por execução**
(`persistent-rbac-middleware` e `checklist-routes-db`: 0). Mecanismo: JWT assinado direto + POST/PATCH
`/users` autenticado sob `CORE_SAAS_PERSISTENCE=prisma` → o caminho de produção normaliza preguiçosamente o
par do token (`normalizePairIdentity`, §3.4 — comportamento de produção por desenho) criando vínculo +
evento de nascimento na trilha; o teardown da suíte apaga o tenant sem conhecer a trilha → evento órfão
indelével.

**Nota de premissa, sem maquiagem:** o plano do ciclo 3 prescrevia para este ramo "atribuição e
transferência para cá", assumindo o produtor como *suíte irmã que não conhece a trilha* — mas a suíte medida
**nasceu no próprio B-O6R-01** (ciclo 2, B-4). O desenvolvedor do ciclo 3 registrou a evidência nas duas
pontas (aqui e em `P-O6R-B01-TRILHA-ORFA-LIMPEZA`) e **não remendou nem decidiu o destino** — a escolha
entre (a) teardown da suíte adotar o idioma escopado do arnês (`cleanupIdentityFixture`) ou (b) tratar aqui
junto do arranjo é da junta.

## P-O6R-B01-ANONIMO-SEM-LOCKOUT (2026-08-19) — **ALTA** · o caminho anônimo não arma o lockout nem deixa rastro

**Achado por:** `agente-secops`, junta do ciclo 3, **medido em banco real**: 12 tentativas anônimas com senha
errada **não** avançam o contador de bloqueio e **não** produzem linha de auditoria.

**Por que importa:** o login sem organização (Forma B, §6 do plano v6) é superfície **deste bloco**. O caminho
com organização arma o lockout; o anônimo não. Quem souber o e-mail tem tentativas ilimitadas por um caminho
que não deixa rastro — e o `Ω6R-SEC-003` (*"senha errada não trava a conta"*) é um achado **aberto** da
auditoria, no `B-O6R-07`.

**Não bloqueou o merge** porque a própria cadeira que o achou votou `APROVADO_COM_CORREÇÕES` sem veto: o
caminho anônimo tem piso de latência e balde por e-mail, e o achado é **soma** ao `SEC-003`, não regressão.
**Dono natural:** `B-O6R-07` (autorização e anexos), que já fecha o `SEC-003`.

## P-O6R-B01-RELIGACAO-SEM-REMEDIO (2026-08-19) — **ALTA** · assimetria sem via de saída

**Achado por:** `agente-secops`, medido: depois da religação, o titular da conta **provada** perde acesso
direto à própria organização e **não tem caminho** para romper o vínculo que não dependa de credencial de
outra organização da identidade.

**A propriedade que falta:** *"o titular da conta provada numa religação precisa de caminho para romper o
vínculo que NÃO dependa de credencial de outra organização."*

**Não bloqueou** porque a religação exige prova de credencial para acontecer — não é tomada de conta; é
ergonomia de saída. Mas é assimetria real, e o `§5.3` do plano v6 declarava bidirecionalidade que a execução
não entrega inteira.

## P-O6R-B01-LOGERROR-MORTO (2026-08-19) — **ALTA (observabilidade)** · a falha da fonte de candidatos é invisível

**Achado por:** `agente-secops`: `logError` do `AnonymousLoginService` é **código morto** — declarado em
`anonymous-login.service.ts:77`, usado em `:131-135`, e **nenhum** consumidor o lê.

**A propriedade que falta:** *"a falha da fonte de candidatos do login sem organização tem de ser OBSERVÁVEL
na composição que roda em produção"* — log, métrica ou alarme. Sem isso, a sonda de prontidão pode dizer
`inactive` e ninguém saber por quê.

## P-O6R-B01-ROUTE-ERROR-LEAK — **EMENDA de escopo (2026-08-19)**

O escopo registrado no ciclo 2 citava só o `DELETE`. A junta do ciclo 3 **mediu o `GET` da mesma rota**
devolvendo a mensagem **crua do Postgres** no corpo público (`400` com `Raw query failed…`). O escopo real é
a rota inteira, e a causa é o fallback de `sendRouteError` (`http.ts:51-60`), compartilhado por dezenas de
módulos — o que mantém a decisão de tratá-lo como bloco próprio.

## P-O6R-ARNES-ISOLAMENTO — **EMENDAS medidas pela junta do ciclo 3**

Acrescentar ao registro existente, com evidência executada:

- **O paralelismo do runner é 1, não 7.** `ubuntu-latest` tem 2 vCPU e `node --test` usa
  `availableParallelism() - 1`. **Todas** as medições de contenção desta trilha foram feitas com 7 workers.
  A garantia de serialização é exercida onde o lote é **mais denso** e **não** é exercida na CI, que é onde
  ela é afirmada. Isto reforça `P1` e muda o peso das medições: elas são conservadoras, não representativas.
- **O aborto deixa dados, não só roles.** `SIGKILL` aos 6 s deixou **26 organizações órfãs**, ainda presentes
  após duas rodadas completas. E a base já trazia 8 organizações `fn-*` de um aborto anterior à sessão. O
  varredor cobre **roles**; **dados de fixture não têm caminho de remoção nenhum**.
- **O denominador não é asserido em lugar nenhum.** O job afere apenas `skipped == 0`. Medido: **60 contra 65
  testes no mesmo comando** num arranjo denso — um arquivo abortado subtrai casos e nada declara isso como
  falha própria. É o modo de falha do ciclo 1, ainda sem guarda estrutural.
- **A fila do lock tem teto medido.** A ~2× a contenção do job, o arranjo reprova em 35–41 s contra orçamento
  de 30 s, e o denominador cai de 148 para 134. A falha se manifesta como **arquivo abortado**, não como
  espera declarada. Folga atual quantificada: amostrador a 10 Hz durante uma bateria inteira nunca pegou mais
  de 1 titular do lock.

---

## P-GOV-MAIN-SEM-PROTECAO — a `main` não tem proteção nenhuma (2026-08-24)

**Medido agora**, no ciclo 3 do protocolo de dificuldade:

```
$ gh api repos/thiagodorgo/ERP_Techsolutios/rulesets
[]
$ gh api repos/thiagodorgo/ERP_Techsolutios/branches/main/protection
{"message":"Branch not protected","status":"404"}
```

**Consequência:** hoje `gh pr merge --squash` funciona sem junta, sem porteiro e sem CI. Todo o aparato de
governança dos §C7 e §C2.8 é **voluntário** — não "quase voluntário": literalmente. Cada regra do contrato
depende de o agente escolher obedecer.

Isso não invalida o contrato — invalida a leitura de que o contrato está *sendo imposto*. Onde um documento
disser "o gate impede", hoje a frase correta é "o gate constrange quem já decidiu obedecer".

**Segundo fato, do mesmo levantamento:** o repositório é de **usuário**, não de organização
(`owner.id = MDQ6VXNlcjQyOTE1NTYz` = `04:User42915563`). A regra `workflows` de ruleset — a única construção
que a `PD-GOV-PORTEIRO-RECIBO` identificou como não-forjável pelo autor — é **org + Enterprise** e **não
existe** em repositório de usuário.

**BLOQUEIA** qualquer afirmação de que o merge é controlado. Não bloqueia trabalho de produto.

**Decisão do dono pendente** (ver `R-GOV-PORTEIRO-PRE-MERGE-ciclo3.md`): defender-se de agente **descuidado**
ou de agente **malicioso**? A resposta muda o tamanho da entrega em uma ordem de grandeza.
