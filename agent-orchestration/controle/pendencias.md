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
