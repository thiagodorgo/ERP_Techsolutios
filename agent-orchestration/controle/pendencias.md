# Pendencias

> **Leia primeiro o índice: [`pendencias-indice.md`](./pendencias-indice.md).**
> Este arquivo tem **226 cabeçalhos** e mais de 3.500 linhas. Ele é a **fonte** — o índice é a **resposta**
> para "o que está aberto, com que gravidade e de quem é". O índice é **gerado por script** a partir daqui,
> nunca digitado; se os dois divergirem, vale este arquivo e o índice se regenera.
>
> **Triagem SAN2-1 (2026-08-29).** Antes dela, **97 entradas não tinham linha de `status:`** (régua: linha
> começando por `status:` **ou** `Estado:`), 131 não tinham severidade e apenas 9 tinham dono — e foi nesse
> escuro que o status de `P-O6R-B04` e `P-O6R-B05` ficou **trocado por 13 dias**, fazendo o bloco de estoque
> parecer fechado com 2 P0 abertos. **Hoje, pela MESMA régua: zero.** A régua está dita porque a primeira
> redação desta frase publicou “zero” medindo com uma régua **mais estrita** que a do “97 antes” — e o
> número não fechava (achado A-4 da junta). Num arquivo que existe para matar número que a execução não
> produz, publicar um assim era a própria doença.
>
> A regra da triagem é conservadora e está escrita no índice. **Ela falhou uma vez e foi corrigida:** a
> primeira passada fechou duas entradas por conta própria — uma porque o título dizia *“período **fechado**”*
> (vocabulário de **domínio**, não de status) e outra porque dizia *“RESOLVIDO **PARCIAL**”* enquanto
> carregava **quatro residuais abertos**. As duas foram **reabertas**, e o classificador passou a decidir
> **só pela linha de status**, nunca pelo título.
>
> **`DIFERIDO-LEVE`** marca o balde C — cosmético/polimento, sem consequência de produto, dado, segurança ou
> número. São **diferidas, não descartadas**, e a lista é **nominal e vetável**: o dono lê os IDs no índice e
> derruba qualquer um que discorde.

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

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

## P-005 - ui-ux-pro-max search.py ausente (2026-07-07)

- descricao: `.claude/skills/ui-ux-pro-max/.../scripts` e `data` sao symlinks quebrados; `search.py` nao existe.
- impacto: checklist pre-merge aplicado manualmente (conteudo extraido do SKILL.md).
- status: aberto (nao bloqueante)

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

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

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

## P-009 - Contraste de texto muted (#94A3B8) abaixo de 4.5:1 no DS (2026-07-07)

- descricao: token muted DS-wide (#94A3B8 sobre branco ~2.6:1) e usado tambem como CONTEUDO (ex.: afordancias
  "Sem ... vinculado" no Detalhe de OS, datas de timeline, helpers). Abaixo de WCAG AA para texto de conteudo.
- impacto: a11y (§11 contraste 4.5:1). DS esta congelado -> correcao e follow-up transversal do DS (trocar por
  ~#64748B nos textos de conteudo), fora do escopo de C2.
- status: aberto (proposta de a11y do DS)

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

## P-010 - Codigo morto do adapter de dashboard (pre-C3) (2026-07-07)

- descricao: apos C3, `dashboard.adapter.ts` ainda exporta a engine de derivacao client-side B-124
  (`deriveDashboardKpis`, `deriveEnrichedDashboardKpis`, `buildCriticalQueue`, `deriveDashboardAlerts`,
  `deriveDashboardEvents` etc.), consumida SO pelos testes; a pagina usa apenas o summary real +
  `deriveActiveDispatchRows`/`deriveFieldStatusRows`. Tree-shaken no bundle, mas e codigo morto e
  contem PT-BR sem acento no trecho inativo.
- impacto: manutencao/rot; sem efeito em runtime.
- status: aberto (limpeza — remover funcoes/tipos/testes B-124 obsoletos num bloco de chore)

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

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

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

## P-013 - F2: guard de disponibilidade so na criacao de OS, nao no assign (2026-07-08)

- descricao: R2.3 (viatura em `em_execucao` = indisponivel) foi aplicada em `work-order.service.create()`
  (OS nova), conforme a spec ("OS nova" + "nao mexer no field-dispatch"). O fluxo `work_order.assign`
  (D1/mobile, que seta viatura numa OS existente) NAO passa pelo guard.
- impacto: e teoricamente possivel vincular via assign uma viatura que entrou em manutencao depois da
  criacao da OS. Baixo risco (janela pequena; despachante ve o estado). Consistente com o escopo aprovado.
- status: aberto (se o negocio exigir bloquear no assign, abrir bloco dedicado tocando o fluxo de assign
  com a regressao field-dispatch/registry-assign coberta). Nao bloqueia F2.

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

## P-014 - F3: cancelamento de multa gateado so por papel (sem permissao dedicada) (2026-07-08)

- descricao: "Cancelar" multa (`→cancelada`) e restrito a `tenant_admin`/`super_admin` via checagem de
  PAPEL (UI: `usePermissions().roles` vs `["Super Admin","Administrador"]`, convencao do `tenantNavigation`;
  backend: 403 `cancel_requires_admin`). Nao existe permissao dedicada `fines:cancel` no `catalog.ts`.
- impacto: correto e consistente (backend e autoridade); porem menos granular que uma permissao dedicada.
- status: aberto (se quiser RBAC mais granular no futuro, criar `fines:cancel` no catalogo + trocar o
  gate de papel por permissao). Nao bloqueia F3.

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

## P-015 - F3: `driver_id` parser afrouxado (string) x coluna UUID (2026-07-08)

- descricao: `fine.validators.ts:parseOptionalUserId` aceita string limitada (nao-UUID estrito) porque em
  modo memoria os ids de usuario sao `usr_`-prefixados; a coluna `fines.driver_id` no Postgres e `UUID`.
- impacto: nenhum hoje — os dois espacos de id nao se cruzam (memoria nao usa Postgres; em modo persistente
  os usuarios tem id UUID). Risco latente: se o cadastro de usuarios emitir id nao-UUID em modo persistente,
  um condutor valido falharia no insert Prisma (500). Registrado pelo validador-mestre (BAIXA).
- status: aberto (se/quando unificar o formato de id de usuario, alinhar o parser a UUID ou a coluna a TEXT).
  Nao bloqueia F3 (veredito APROVADO).

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

## P-016 - F4 (R4.3): indicador "viatura sem apolice vigente" na tela Viaturas + Mapa adiado (2026-07-08)

- descricao: `docs/pd-controle.md` §F4 R4.3 pede indicador de atencao para viatura sem apolice vigente na
  tela de **Viaturas** (`registry/vehicles`) e no **Mapa** (F6). F4 entrega o modulo `InsurancePolicy` +
  tela `/fleet/insurance`, mas NAO altera a tela Viaturas mergeada (fora do escopo do plano-mestre F4;
  evita regressao no registry) nem o Mapa (que so vira real em F6).
- impacto: nenhum na entrega do F4; o indicador cross-tela fica para quando F6 (mapa real) ou um bloco
  dedicado ligar `hasActivePolicy` (helper read-only exportavel pelo backend F4) na Viaturas/Mapa.
- status: aberto (F6 ou bloco dedicado). Nao bloqueia F4.

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

## P-017 - F4: barra de vigencia de apolice cancelada usa tom neutro/verde (2026-07-08)

- descricao: em `/fleet/insurance`, `computeVigencia` neutraliza o tom de apolices `cancelada` para
  `default` (verde no mapa da barra); a barra fica verde com rotulo cinza. O Chip da coluna Situacao ja
  mostra "Cancelada" (audit/mudo), entao a informacao correta esta presente. Nit de semantica (pixel-master).
- impacto: baixo/cosmetico; nao e card morto nem engana (Chip e autoridade). Teste assere `tone==="default"`.
- status: aberto (F12/cera — introduzir 4º tom "muted" so para canceladas, ajustando o teste em lockstep).
  Nao bloqueia F4.

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

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

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

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

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

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

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

## P-026 - F11: front `UserRole` nao cobre os 9 papeis canonicos (menu visual aproxima) (2026-07-09)

- descricao: a uniao `UserRole` (frontend) + `mapBackendRole` nao tem rotulo para `inventory` (cai em null)
  e `support`/`field_dispatcher` colapsam. Por isso F11 gate os itens NOVOS por PERMISSAO (nao por
  `allowedRoles`), e o menu VISUAL de `inventory` aproxima (cai no kind `gestor`). A autoridade de acesso e
  o route-guard/backend (correto); so o menu visual nao honra 100% a matriz para esses papeis.
- impacto: baixo — acesso e correto (permissao); estetica de menu aproxima p/ inventory/support.
- status: aberto (bloco futuro: adicionar `inventory` (+ representacoes distintas) a `UserRole`+`mapBackendRole`).

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

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

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

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

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

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

- **status:** ABERTA · **agendamento:** DIFERIDO-LEVE · **severidade:** a classificar · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Diferida, não descartada**, e listada nominalmente no PR para o dono vetar se discordar. Ver `pendencias-indice.md`.</sub>

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

- **status:** ABERTA · **agendamento:** DIFERIDO-LEVE · **severidade:** a classificar · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Diferida, não descartada**, e listada nominalmente no PR para o dono vetar se discordar. Ver `pendencias-indice.md`.</sub>

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

- **status:** FECHADA · **severidade:** era MEDIA · **dono:** encerrado
  <sub>**FECHADA em 2026-09-02 (validacao pedida pelo dono, executada pelo orquestrador).** O corpo desta entrada ja dizia *"RESOLVIDO no fechamento do bloco (ciclo 2)"* para o **P-034** e *"CORRIGIDA"* para o **P-035**, mas a linha de status seguia `ABERTA/MEDIA` — e o indice, obedecendo a propria regra 3 (*"a linha de status vence o cabecalho"*), a contava como **diferida com severidade material**, que foi como ela chegou aos olhos do dono. **O indice fez o trabalho dele; o defeito era o rotulo.** Verificado por EXECUCAO, nas tres pernas que a correcao exige: (1) `src/modules/dashboard/dashboard-prisma.repository.ts:95` -> `where: { tenant_id, event_type: { not: "work_order_comment" } }`; (2) `src/modules/dashboard/dashboard.repository.ts:183` -> `.filter((event) => event.eventType !== "work_order_comment")` — **paridade memory x prisma**, que e onde este tipo de correcao costuma ficar pela metade; (3) `tests/work-order-comments-routes.test.ts:228` — o teste `[P-034]` existe **e passa**: `node --test --import tsx tests/work-order-comments-routes.test.ts` devolve `15/15, fail 0, ec=0`. O risco descrito — corpo livre de comentario (PII possivel) alcancando o papel `support`, que tem `dashboard:read` e NAO tem `work_orders:read` — esta fechado nos DOIS caminhos. **Classe do defeito de registro:** entrada corrigida no corpo e nao no status, exatamente como a `P-036`, que ficou 27 dias aberta depois de a gemea dela fechar. A subnota de triagem abaixo diz, ela mesma, *"adiada por triagem automatica; NAO verificada item a item"* — esta e uma das **79** que levaram carimbo em massa em 29/08 (`P-SAN2-LEITURA-DAS-79`), e a verificacao item a item que faltava esta acima. O texto original segue preservado (§A2).</sub>
  <sub>Triagem SAN2-1 (2026-08-29): balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Diferida, não descartada**, e listada nominalmente no PR para o dono vetar se discordar. Ver `pendencias-indice.md`.</sub>

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

- **status:** FECHADA · **severidade:** era ALTA · **dono:** encerrado
  <sub>**FECHADA em 2026-08-29 (resgate da opção C) como DUPLICATA da `P-CHK-TEMPLATE-PRISMA-V7`, resolvida em 2026-08-02.** Achado A-C1 da junta do SAN2-1, conferido pelo orquestrador: mesma chamada (`checklistTemplate.create`), mesma causa (`tenant_id` explícito no nested-create do Prisma v7), mesma correção — o fix vive em `src/modules/checklists/checklist-prisma.repository.ts` com o comentário “NÃO passar tenant_id aqui”. Esta entrada ficou 27 dias aberta após o gêmeo fechar, e a triagem ainda a carimbou de “cosmética” — as duas afirmações erradas estão registradas na ata. O texto original segue abaixo (§A2).</sub>
  <sub>Triagem SAN2-1 (2026-08-29): balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Diferida, não descartada**, e listada nominalmente no PR para o dono vetar se discordar. Ver `pendencias-indice.md`.</sub>

## P-037 (Ω3-c, BAIXA — validador) — assimetria memory×prisma em freezeChecklistSnapshot
- Prisma grava `updated_by: actorUserId ?? null`; InMemory grava `updatedBy: actorUserId ?? current.updatedBy`.
  Inócuo no fluxo real (o despacho SEMPRE tem `actor.userId`). É o MESMO padrão pré-existente de
  `updateGeocode` (memory `?? current.updatedBy` × prisma `?? null`) — mantido por consistência com o
  irmão. Alinhar ambos (freeze + geocode) num bloco de higiene futuro. Não bloqueia.
- (A asserção tautológica em checklist-snapshot-dispatch.test.ts — 2º achado BAIXA — foi REMOVIDA no fechamento.)

- **status:** ABERTA · **agendamento:** DIFERIDO-LEVE · **severidade:** BAIXA · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Diferida, não descartada**, e listada nominalmente no PR para o dono vetar se discordar. Ver `pendencias-indice.md`.</sub>

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

- **status:** ABERTA · **agendamento:** DIFERIDO-LEVE · **severidade:** a classificar · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Diferida, não descartada**, e listada nominalmente no PR para o dono vetar se discordar. Ver `pendencias-indice.md`.</sub>

## P-INFRA-RLS (transversal — apontado pelo coordenador no Ω3-d) — RLS não enforçada em runtime (dev)
- O app conecta no Postgres como `postgres` (`rolsuper=true`, `rolbypassrls=true`), então as policies RLS
  (ENABLE+FORCE) de TODAS as tabelas são BYPASSADAS em runtime dev. O isolamento multi-tenant é sustentado
  pela camada de APLICAÇÃO (filtros `tenant_id` + `assertX` + `withTenantRls` que seta `app.current_tenant_id`).
  PRÉ-EXISTENTE e plataforma-wide (não do Ω3-d). RLS fica como defense-in-depth para quando o app conectar
  com role NÃO-superusuário. **Forte candidato para a rodada de saneamento-infra.**

- **status:** ABERTA · **severidade:** a classificar · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

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

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

## P-SAN-PROD-WEBIMG - Rollback do frontend sem imagem GHCR (Ω-INFRA-3, 2026-07-14)
- descricao: o job docker do `ci.yml` publica só `erp-backend` no GHCR; o web nao tem imagem → o rollback-por-imagem
  (simetrico ao backend) nao se aplica ao frontend (hoje: `fly releases` nativo ou rebuild do SHA). Apontado por
  devops (C3).
- acao: publicar a imagem do web no GHCR num bloco futuro de infra para simetria total do rollback.
- status: aberto (mitigado por `fly releases`; nao bloqueia o merge)

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

## P-SAN-INFRA1-NITS - Nits não-bloqueantes do Ω-INFRA-1 (J-SAN-4, 2026-07-13)
- (1) Imagem do backend 837MB (engine Prisma + node slim): aceitável p/ MVP; otimizar (distroless/alpine +
  binaryTargets enxutos) em bloco futuro. (2) `docker-compose.prod.yml` roda `CORE_SAAS_PERSISTENCE=memory` —
  valida containers/nginx/proxy/migrate/health, NÃO exercita o caminho prisma do core-saas (soma-se à
  P-SAN-CORE-PRISMA-COV). (3) `web depends_on: api` sem `condition: service_healthy` → 502 transitório até a api
  subir (cosmético). (4) Custo do Fly na PD levemente otimista pós-cobrança de snapshots (jan/2026, $0.08/GB) —
  não muda o ranking. (5) `/health` cru é liveness; o profundo é `/health/ready` (documentado).
- status: aberto (nits; nenhum bloqueia)

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

## P-Ω3F1-ENTITYTYPE - Enum técnico cru na linha "Entidade" da aprovação (J-OMEGA3F-1, 2026-07-14)
- descricao: `GeneralInfoTab.tsx` (aprovação operacional) exibe `${approval.entityType} · ${code}` → o enum
  técnico `work_order|checklist_run|evidence` aparece cru na UI ("work_order · OS-123"). PRE-EXISTENTE (veio
  1:1 da página de detalhe antiga; NÃO introduzido pelo Ω3F-1). Apontado por cognicao-visual (J-OMEGA3F-1).
- acao: humanizar (mapa enum→rótulo PT-BR) no **Ω3F-3** (dono da superfície Financeiro/aprovação).
- status: aberto (não bloqueia; fora do escopo UI-shell do Ω3F-1)

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

## P-Ω3F2B-ACENTOS - Varredura de acentuação no WorkOrderForm + validador (J-OMEGA3F-2B, 2026-07-14)
- descricao: labels de Input e mensagens do validador de OS são sem-acento pré-existentes ("Identificacao",
  "Titulo", "Endereco do atendimento", "Titulo obrigatorio.") — débito §11.3 NÃO imputável ao Ω3F-2b (que
  seguiu a família certa p/ não criar dissonância lado a lado). Microcopy nova já acentua.
- acao: bloco de varredura único acentuando labels + mensagens de `WorkOrderForm.tsx` e
  `work-orders.adapter.ts` (validateWorkOrderForm) de uma vez, destravando a convenção p/ os próximos Ω3F.
- status: aberto (apontado por cognicao-visual)

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

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

- **status:** ABERTA · **severidade:** MÉDIA (reclassificada) · **dono:** a atribuir
- **agendamento:** ~~DIFERIDO-LEVE~~ → **RETIRADO DO BALDE C em 2026-08-29** (achado A-C2 da junta)
  <sub>É um **tripwire de bypass de TARIFA**: existe exclusivamente para ser VISTO no dia em que alguém tornar `customer_id`/`service_catalog_id` mutáveis no update — o modo de falha declarado é cobrança errada. Enterrá-lo num balde rotulado “sem consequência de dinheiro” anulava a única função que ele tem. O invariante segue valendo hoje (medido pela junta: `UpdateWorkOrderInput` não expõe os dois campos).</sub>
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

## P-Ω3F4B-SHARE-TOKEN-UNIQUE - share_token sem unicidade/índice; endpoint público adiado (J-OMEGA3F-4B, 2026-07-15)
- descricao: o Ω3F-4b gera `service_quotes.share_token` (randomUUID) mas a coluna NÃO tem `@@unique`/índice.
  Enquanto a leitura pública por token está ADIADA (D-Ω3F-4B-SHARE), é inerte. Apontado por validador-mestre
  (BAIXA) e fid-avaliador (não-bloqueante).
- acao: a fatia que abrir o endpoint público de leitura-por-token (`GET /orcamentos/compartilhado/:token`)
  DEVE adicionar unicidade + índice de lookup do share_token (migration) e passar por revisão secops
  (superfície não-autenticada; §2.8; sem vazar tenant/dados internos).
- status: aberto (não-bloqueante; guarda para a fatia do consumo público).

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

## P-Ω3F4B-APPROVE-CRASH - Crash duro entre reserva e carimbo do approve (J-OMEGA3F-4B ciclo1, 2026-07-15)
- descricao: o CAS fecha o duplo-faturamento concorrente (1 OS + 1×409), mas um crash DURO do processo ENTRE
  o claimForApproval (orçamento já approved) e o carimbo de created_work_order_id deixaria o orçamento
  approved-SEM-OS, irrecuperável pela máquina de estado. É FALHA SEGURA (nunca gera 2ª OS), não duplo-
  faturamento. Apontado pelo critico como residual de durabilidade cross-agregado (não-bloqueante).
- acao: resolver com transação única / outbox / job de reconciliação (orçamento approved sem OS há N min →
  reabrir ou reconciliar) numa fatia futura de robustez. A compensação atual só cobre erro do create (volta a
  draft), não crash entre passos.
- status: aberto (não-bloqueante; falha segura).

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

## P-Ω3F4C-ACTIVATION-PROMPT - Aprovar dispara sem diálogo de modo de acionamento/origem-destino (J-OMEGA3F-4C, 2026-07-15)
- descricao: no QuoteTab/OrcamentosPage o botão Aprovar chama approveServiceQuote(context, id, {}) — clique único,
  sem coletar `activation_mode` nem origem/destino (que o backend aceita como OPCIONAIS). O vídeo §1.3 mostra o
  approve perguntando "criar novo serviço?" + modo de acionamento. Apontado por fid-avaliador (não-bloqueante:
  o plano do -4c escopou "Aprovar→cria OS, mostra link"; activation_mode é opcional server-side).
- acao: fatia de UX subsequente — diálogo de confirmação no approve coletando modo de acionamento + origem/
  destino (para tipos que exigem, ex. reboque), passando ao corpo do approve. Fecha a fidelidade fina do #7.
- status: aberto (não-bloqueante).

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

## P-Ω3F5-DOC-TYPE - Categoria de documento no upload manual de anexo (Ω3F-5, 2026-07-15)
- descricao: o back de anexos (Ω3-d) deriva nome=fileName e tipo=mimeType; NÃO tem campo de categoria
  selecionável pelo usuário (só `description` livre, que nem é exposto no DTO). O vídeo §1.3 1:46–2:09 pode
  mostrar "tipo" como categoria. Decisão D-Ω3F-5-UPLOAD-TYPE: a aba usa `description` como rótulo por ora.
- acao: se a fidelidade exigir categoria, estender `WorkOrderAttachment.metadata.documentType` (aditivo, sem
  migration) + expor no DTO + selector na UI, numa fatia futura tocando o módulo de anexos.
- status: aberto (não-bloqueante).

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

## P-Ω3F5A-TAG-TOCTOU - Comentário pode persistir com uma tag a menos sob delete concorrente de tag (J-OMEGA3F-5A, 2026-07-15)
- descricao: addComment pré-valida todas as tags (422) e cria o comentário + attach das tags em transações
  RLS SEPARADAS. Se uma tag for HARD-deletada na janela entre a pré-validação e o attach, a FK RESTRICT
  rejeita (agora traduzido para 422 tag_not_found, não mais 500 — corrigido no PR), mas o comentário JÁ foi
  gravado → persiste com uma tag a menos + cliente recebe 422. Janela estreitíssima; estado resultante válido
  (comentário existe). Apontado pelo critico (não-bloqueante).
- acao: robustez — envolver create-do-comentário + attach-das-tags numa ÚNICA transação (ou reordenar) para
  atomicidade total, numa fatia futura. Hoje: 500→422 corrigido; orfandade residual só sob corrida rara.
- status: aberto (não-bloqueante; falha seseg — o 500 já foi eliminado).

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

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

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

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

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

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

- **status:** ABERTA · **agendamento:** DIFERIDO-LEVE · **severidade:** a classificar · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Diferida, não descartada**, e listada nominalmente no PR para o dono vetar se discordar. Ver `pendencias-indice.md`.</sub>

## P-Ω3F-9-DISPATCH-DTO — Expor "envio ativo" no DTO da lista de OS (aberta, Ω3F-9)
A visibilidade de "Revogar envio" na linha é heurística (permissão + status não-terminal); a existência real do
despacho só é confirmada no clique (descoberta lazy). Follow-up opcional: expor `hasActiveDispatch`/
`activeDispatchId` no DTO da lista de OS para visibilidade exata sem o GET extra. Rejeitado no PR do -9 para
manter 100% front (tocaria o serializer da lista + suíte de contrato). Baixo impacto (o clique já trata
ausência com mensagem benigna e a corrida GET→PATCH cai em 409/terminal_dispatch).

- **status:** ABERTA · **agendamento:** DIFERIDO-LEVE · **severidade:** a classificar · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Diferida, não descartada**, e listada nominalmente no PR para o dono vetar se discordar. Ver `pendencias-indice.md`.</sub>

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

- **status:** ABERTA · **agendamento:** DIFERIDO-LEVE · **severidade:** BAIXA · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Diferida, não descartada**, e listada nominalmente no PR para o dono vetar se discordar. Ver `pendencias-indice.md`.</sub>

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

- **status:** FECHADA · **severidade:** BAIXA · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status, mas **ela própria já se declarava resolvida** no cabeçalho — a linha é **transcrição**, não juízo novo. [Nota corrigida em 2026-08-29 pelo achado A-3 da junta: aqui estava colado o boilerplate *“Marcada ABERTA por padrão conservador”*, que contradizia o próprio `status: FECHADA` logo acima. A nota é a prova de auditoria da regra — colada sem discriminar, transformava o registro numa afirmação dupla.]</sub>

## P-Ω4-ACCOUNT-ACTIVE — Título pode referenciar conta financeira INATIVA (BAIXA — decidir no Ω4-4)
O resolver de conta (InMemory findById não filtra is_active; Prisma FK aponta para a row que sobrevive ao
soft-delete) aceita account_id de conta desativada. Agenda-se liquidação para conta inativa. Relevante ao Ω4-4
(Caixa/pagamentos): decidir se a conta de liquidação precisa estar ativa (rejeitar → 400/422).

- **status:** ABERTA · **agendamento:** DIFERIDO-LEVE · **severidade:** BAIXA · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Diferida, não descartada**, e listada nominalmente no PR para o dono vetar se discordar. Ver `pendencias-indice.md`.</sub>

## P-Ω4-2A-COBERTURA — Nits menores do Ω4-2a (BAIXA)
- GET /:id de título soft-deletado → 200 (a list esconde; as mutações dão 404). Decidir se detalhe de excluído
  deve aparecer; hoje inconsistente e não testado.
- Sem índice `(tenant_id, created_at)` (ordenação default faz sort em memória) — perf quando o volume crescer.
- `nullable()` no prisma-repo é dead code (service nunca passa null; campos opcionais não limpáveis — nit conhecido).

- **status:** ABERTA · **agendamento:** DIFERIDO-LEVE · **severidade:** BAIXA · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Diferida, não descartada**, e listada nominalmente no PR para o dono vetar se discordar. Ver `pendencias-indice.md`.</sub>

## P-Ω4-FINANCE-READ-ORFA — /finance (dashboard) ainda gated pela órfã finance:read (BAIXA, Ω4-8)
O Ω4-2b moveu as rotas-filhas /finance/charges e /finance/payments para a perm real financial_titles:read, mas
o dashboard-pai /finance (FinanceiroPage, ainda MOCK) e o item de menu FINANCEIRO seguem na órfã finance:read/
finance.read. Resolver no Ω4-8 (dashboard real): trocar o gate por uma perm real (financial_titles:read ou uma
finance_dashboard:read dedicada) quando a FinanceiroPage consumir o backend.

- **status:** ABERTA · **agendamento:** DIFERIDO-LEVE · **severidade:** BAIXA · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Diferida, não descartada**, e listada nominalmente no PR para o dono vetar se discordar. Ver `pendencias-indice.md`.</sub>

## P-Ω4-2B-KPI-AGREGADO — KPIs/tabs somam só as linhas carregadas (MÉDIO, Ω4-8 Dashboard)
Os KPIs e as tabs de Cobranças/Pagamentos somam sobre as linhas carregadas (agora limit=100, antes 20) e
apresentavam o headline como total da org. Mitigado no Ω4-2b pós-análise: limit=100 + faixa honesta "Somando
os N de M" quando total>carregado. Cobertura COMPLETA (endpoint de agregados/summary no backend, ou paginação
real) fica para o Ω4-8 (Dashboard financeiro real). Relacionado: "Recebidas/Pagos (mês)" usa competencia (mês
contábil), não a data de baixa (que não existe no DTO — Ω4-4 introduz pagamento/baixa) — rótulo impreciso até lá.

- **status:** ABERTA · **severidade:** BAIXA · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

## P-Ω4-2B-A11Y — Menu ⋮ e modais sem dismiss por Escape/clique-fora + focus-trap (BAIXA)
TitleRowActions (menu sem outside-click/Escape, dois menus podem ficar abertos) e TitleFormModal/TitleCancelPrompt
(role=dialog/aria-modal sem focus-trap/foco inicial/Escape; backdrop fecha mesmo em submit). Padrão leve herdado
do Ω3F-6; endurecer quando houver um componente de menu/modal compartilhado do DS.

- **status:** ABERTA · **agendamento:** DIFERIDO-LEVE · **severidade:** BAIXA · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Diferida, não descartada**, e listada nominalmente no PR para o dono vetar se discordar. Ver `pendencias-indice.md`.</sub>

## P-Ω4-3-REFATURAR-DELTA — Faturar o delta de itens adicionados após o 1º faturamento (BAIXA, fatia futura)
A idempotência do faturamento é por (tenant_id, work_order_id, direction) — 1 título receivable por OS. Um item
lançado no Financeiro da OS APÓS o 1º faturamento fica "a faturar", mas o 2º POST /invoice dá 409 already_invoiced
(não fatura o delta). Faturar o delta (2º título com Σ dos itens não-faturados, ou aditar o título) é fatia futura.
Item novo pós-faturamento permanece editável (invoiced_at NULL); só os já carimbados travam (item_invoiced 422).

- **status:** ABERTA · **severidade:** MÉDIA (reclassificada) · **dono:** a atribuir
- **agendamento:** ~~DIFERIDO-LEVE~~ → **RETIRADO DO BALDE C em 2026-08-29** (achado A-5 da junta do SAN2-1)
  <sub>A cadeira de triagem amostrou 6 das 81 diferidas e provou que esta **não é cosmética**: item lançado no Financeiro da OS depois do 1º faturamento **nunca é faturado**: o 2º `POST /invoice` devolve `409 already_invoiced` e o delta fica “a faturar” para sempre. É **receita executada que o produto não consegue cobrar** — produto e dinheiro, não polimento. A etiqueta colada aqui afirmava *“sem consequência de produto, dado, segurança ou número”* — e o próprio texto da pendência desmente. **Não era o adiamento que estava errado, era a etiqueta**, e é ela que o dono lê ao decidir se veta. Volta ao balde por severidade real.</sub>


## P-Ω4-3-TEST-HERMETIC — createMemoryWorkOrderInvoicingService não é puramente memory (BAIXA)
O WorkOrderInvoicingService.invoke() alcança createDefaultWorkOrderService()/createDefaultFinancialTitleService()
por dynamic import — que honram o env (congelado no import). Sob `.env` prisma, tests/work-order-invoicing.test.ts
falha 15/16 (CI é verde porque roda com CORE_SAAS_PERSISTENCE=memory). Fix: injetar work-order/title services no
construtor do invoicing service (como o WorkOrderFinancialService faz) para o factory memory ser hermético.

- **status:** ABERTA · **agendamento:** DIFERIDO-LEVE · **severidade:** BAIXA · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Diferida, não descartada**, e listada nominalmente no PR para o dono vetar se discordar. Ver `pendencias-indice.md`.</sub>

## P-Ω4-3-INVOICE-ATOMIC — Título↔carimbo não-atômico (BAIXA)
createForWorkOrder (título) e markInvoiced (itens) são 2 statements sem $transaction. Crash entre eles: título
criado com itens não-travados (invoiced_at NULL → editáveis). A idempotência (índice parcial) preserva "1 título
ativo/OS", mas a divergência amount↔itens fica possível nesse recorte raro. Ideal: envolver em $transaction.
Distinto de P-Ω4-3-REFATURAR-DELTA (que é o delta de itens pós-faturamento).

- **status:** ABERTA · **agendamento:** DIFERIDO-LEVE · **severidade:** BAIXA · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Diferida, não descartada**, e listada nominalmente no PR para o dono vetar se discordar. Ver `pendencias-indice.md`.</sub>

## P-Ω4-3-CURRENCY-BRL — Item da OS aceita moeda ≠ BRL, mas faturar exige BRL (MÉDIA-BAIXA)
work-order-financials (Ω3F) usa parseCurrency da shape compartilhada (aceita QUALQUER ISO de 3 letras) + trava
só de homogeneidade ("todos iguais ao 1º"), então uma OS inteira em USD/EUR é construível. No faturamento (Ω4-3),
o título só aceita BRL (v1) → 400 invalid_currency vindo de OUTRO módulo, beco sem saída. Fix: alinhar
work-order-financials ao allowlist {BRL} v1 (ou o título aceitar a moeda congelada quando o multi-currency chegar).
Reachable só via item manual não-BRL (baixa prob). Ω3F-module — mudar toca módulo mergeado + seus testes.

- **status:** ABERTA · **severidade:** MEDIA · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

## P-Ω4-3-INVOICE-TOCTOU-DELETE — DELETE de item durante o faturamento infla o título (BAIXA)
Entre listInvoiceableByWorkOrder (lê o agregado) e markInvoiced, um item ainda-não-faturado pode ser soft-deleted
(assertItemNotInvoiced passa: invoiced_at ainda null). O título nasce com a Σ que INCLUÍA o item, mas markInvoiced
pula deletados → title.amount > Σ dos itens carimbados. TOCTOU no READ (distinto de P-Ω4-3-INVOICE-ATOMIC = crash
título↔carimbo). Fix: ler o agregado + carimbar na MESMA $transaction com lock. Estreito, mas o dano é dinheiro.

- **status:** ABERTA · **agendamento:** DIFERIDO-LEVE · **severidade:** BAIXA · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Diferida, não descartada**, e listada nominalmente no PR para o dono vetar se discordar. Ver `pendencias-indice.md`.</sub>

## P-Ω4-3-INVOICE-LEASTPRIV — Rota invoice não exige work_order_financials:read (BAIXA)
POST /work-orders/:id/invoice gateia só financial_titles:create mas LÊ os itens financeiros da OS. finance tem
ambas, impacto baixo; por least-privilege, considerar exigir também work_order_financials:read.

- **status:** ABERTA · **severidade:** BAIXA · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

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

- **status:** ABERTA · **severidade:** a classificar · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

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

- **status:** ABERTA · **severidade:** a classificar · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

## P-Ω4-4-LIQUID-ATOMIC — Liquidação lançamento↔título não-atômica (MÉDIA)
payTitle faz assertPayable → entry.create → applyPayment (3 statements, sem $transaction). Numa corrida REAL de 2
pagamentos do MESMO título SEM client_action_id: ambos passam assertPayable, ambos criam lançamento (saldo da CONTA
+= ambos), e o 2º applyPayment recusa (422 overpayment) COM o lançamento já persistido → saldo inflado enquanto o
título fica consistente (nunca sobre-pago — applyPayment re-valida guardPayable). Mitigação existente: com
client_action_id o 2º entry.create dá 409 duplicate_payment ANTES do applyPayment. Fix: envolver entry.create +
applyPayment em prisma.$transaction (documentar limitação InMemory). Só o cenário sem token idempotente + concorrência
genuína abre a janela.

- **status:** ABERTA · **severidade:** MEDIA · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

## P-Ω4-4-REVERSE-MUTABLE — reverse() não chama assertMutable — ✅ RESOLVIDO no Ω4-5
update/delete barram lançamento reconciled (422), mas reverse não. **Fechado no bloco Ω4-5**
(branch feat-omega4-5-reconciliation): reverse() agora chama `this.assertMutable(original)` logo após
`getWritable`, ANTES do guard B1 (espelha a ordem de delete()). Estornar um lançamento conciliado → 422
entry_reconciled (exige desconciliar antes). Precedência documentada: um contra-lançamento conciliado que
for estornado dispara `entry_reconciled` (422) ANTES de `reversal_pair_immutable` (422) — mesma classe HTTP,
reason diferente. Sem regressão em A1/B1 (testes de estorno operam sobre lançamentos não conciliados).

- **status:** FECHADA · **severidade:** a classificar · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status, mas **ela própria já se declarava resolvida** no cabeçalho — a linha é **transcrição**, não juízo novo. [Nota corrigida em 2026-08-29 pelo achado A-3 da junta: aqui estava colado o boilerplate *“Marcada ABERTA por padrão conservador”*, que contradizia o próprio `status: FECHADA` logo acima. A nota é a prova de auditoria da regra — colada sem discriminar, transformava o registro numa afirmação dupla.]</sub>

## P-Ω4-4-REVERSE-IDEM — Idempotência do estorno é app-level sem rede no banco (MÉDIA)
reverse faz check-then-act (findActiveReversalOf → create) SEM índice único em reversal_of (diferente da
liquidação, que tem índice parcial). 2 reverse(A) concorrentes → 2 contra-lançamentos → saldo estornado em dobro.
Fix: índice único parcial (tenant_id, reversal_of) WHERE reversal_of IS NOT NULL AND deleted_at IS NULL +
$transaction. Casa com o tratamento de atomicidade do P-Ω4-4-LIQUID-ATOMIC.

- **status:** ABERTA · **severidade:** MEDIA · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

## P-Ω4-4-CHOKEPOINT-CLOSING — chokepoint só bloqueia 'closed', não 'closing' — ✅ RESOLVIDO no Ω4-6 (M2)
isPeriodClosed (financial-title.repository) só reconhecia status='closed'; o enum tem open|closing|closed|reopened.
**Fechado no bloco Ω4-6** (branch feat-omega4-6-period-close): `isPeriodClosed` (InMemory + Prisma) agora trata
status ∈ {closing, closed} como bloqueante (M2) e {open, reopened} como escrivível. Endpoints close/reopen entregues
(módulo financial-period-closes). `reconcile` NÃO chama assertPeriodOpen → segue exento por construção (extrato
pós-fechamento; D-Ω4-5-RECONCILE-META) — confirmado por teste. O ramo 'closing' é DEFENSIVO/futuro: o close v1 é
atômico open→closed e NUNCA escreve 'closing' (a coluna closing_started_at é reservada). **M1 (liquidar título de
período fechado) NÃO é bug** — é D-Ω4-POS-FECHAMENTO ratificada (pagamento é evento da competência corrente;
paid_amount é acumulador vitalício; applyPayment gated só pelo período do caixa).

- **status:** FECHADA · **severidade:** a classificar · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status, mas **ela própria já se declarava resolvida** no cabeçalho — a linha é **transcrição**, não juízo novo. [Nota corrigida em 2026-08-29 pelo achado A-3 da junta: aqui estava colado o boilerplate *“Marcada ABERTA por padrão conservador”*, que contradizia o próprio `status: FECHADA` logo acima. A nota é a prova de auditoria da regra — colada sem discriminar, transformava o registro numa afirmação dupla.]</sub>

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

- **status:** ABERTA · **severidade:** MEDIA · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

## P-Ω4-6-REOPEN-FOUR-EYES — reopen sem segundo ator (risco residual conhecido, BAIXA)
reopen ∈ {super_admin, platform_admin, tenant_admin} + reason obrigatório (RN-FIN-009). Risco residual (ataque emenda h,
anotado, não bloqueia): um `tenant_admin` sozinho pode reopen→editar→reclose com auto-auditoria (sem four-eyes). Aceitável
no MVP; eventual notificação/segundo ator no reopen. A trilha é preservada (snapshot.history append-only + AuditLog de
cada close/reopen — d/ataque), então o ciclo fica AUDITÁVEL mesmo sem four-eyes.

- **status:** ABERTA · **agendamento:** DIFERIDO-LEVE · **severidade:** BAIXA · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Diferida, não descartada**, e listada nominalmente no PR para o dono vetar se discordar. Ver `pendencias-indice.md`.</sub>

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

- **status:** FECHADA · **severidade:** a classificar · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status, mas **ela própria já se declarava resolvida** no cabeçalho — a linha é **transcrição**, não juízo novo. [Nota corrigida em 2026-08-29 pelo achado A-3 da junta: aqui estava colado o boilerplate *“Marcada ABERTA por padrão conservador”*, que contradizia o próprio `status: FECHADA` logo acima. A nota é a prova de auditoria da regra — colada sem discriminar, transformava o registro numa afirmação dupla.]</sub>

## P-Ω4-5-BATCH — conciliação em LOTE (importar extrato CSV/OFX → casar N lançamentos) — ADIADO
O Ω4-5 entrega só o reconcile UNITÁRIO por lançamento (PATCH /financial-entries/:id/reconcile). Conciliação em lote
(upload de extrato bancário CSV/OFX, matching automático de N lançamentos, tabela ReconciliationBatch com linhas
importadas e status de casamento) é fatia futura — não cria tabela/endpoint de lote nesta fatia. Quando priorizada,
avaliar: modelo ReconciliationBatch + ReconciliationLine, parser de OFX/CSV, heurística de matching (valor+data+ref),
e resolução manual de linhas não casadas.

- **status:** ABERTA · **severidade:** a classificar · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

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

- **status:** ABERTA · **severidade:** a classificar · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

## P-Ω4-5-CATEGORY-CASE — Filtro ?category= é case-sensitive (BAIXA, pré-existente Ω4-4)
parseFilterToken faz toLowerCase() mas category é gravada preservando caixa → ?category=Servico não casa "Servico".
Paridade InMemory×Prisma preservada (ambos iguais). direction/payment_method/divergence_type não sofrem (lowercase na escrita).
Fix: lowercar category na escrita OU no filtro usar ILIKE/case-insensitive. Baixíssimo, herdado do Ω4-4.

- **status:** ABERTA · **agendamento:** DIFERIDO-LEVE · **severidade:** BAIXA · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Diferida, não descartada**, e listada nominalmente no PR para o dono vetar se discordar. Ver `pendencias-indice.md`.</sub>

## P-Ω4-COMPETENCIA-TZ — STATUS: RESOLVIDO (2026-07-18)
deriveCompetencia agora formata em `America/Sao_Paulo` (Intl, IANA — acompanha DST se voltar) e parseBusinessDate
(src/config/business-time.ts, compartilhado por título/lançamento) ANCORA date-only à MEIA-NOITE BR-local (-03:00,
Brasil sem DST desde 2019) + datetime sem offset → BR-local + **round-trip que rejeita dia fora de range** (2026-06-31
etc. → 400, não rola p/ o mês seguinte — furo ALTA do critico corrigido). Testes de fronteira de fuso (financial-titles
+ financial-entries). Escolha: meia-noite BR-local (não meio-dia) — funcionalmente correto (offset de verão histórico
-02:00 < -03:00 em magnitude → âncora sempre no MESMO dia civil BR mesmo se DST voltar; provado pelo critico). Junta
verify APROVADO (validador + critico), casos d/e cumpridos.

- **status:** FECHADA · **severidade:** ALTA · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status, mas **ela própria já se declarava resolvida** no cabeçalho — a linha é **transcrição**, não juízo novo. [Nota corrigida em 2026-08-29 pelo achado A-3 da junta: aqui estava colado o boilerplate *“Marcada ABERTA por padrão conservador”*, que contradizia o próprio `status: FECHADA` logo acima. A nota é a prova de auditoria da regra — colada sem discriminar, transformava o registro numa afirmação dupla.]</sub>

## P-Ω4-OVERDUE-TZ — isTitleOverdue + parseDueDate no fuso de negócio (BAIXA, sintoma-irmão)
Ainda pendente (fora do escopo do fix de competência): (1) isTitleOverdue compara due_date.getTime() < now (naïve) →
título "vencido" ~24-27h cedo no fim do dia BR; o correto é vencer quando o DIA de due_date TERMINA no fuso de negócio
(due_date + 1 dia, 00:00 America/Sao_Paulo). (2) parseDueDate ainda usa UTC-midnight enquanto issue_date/occurred_at
viraram BR-anchored (parseBusinessDate) — inconsistência (caso h do critico). Fix bundle: parseDueDate usar
parseBusinessDate + isTitleOverdue comparar contra fim-do-dia BR. Baixo impacto (borda de virada de dia).

- **status:** ABERTA · **agendamento:** DIFERIDO-LEVE · **severidade:** BAIXA · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Diferida, não descartada**, e listada nominalmente no PR para o dono vetar se discordar. Ver `pendencias-indice.md`.</sub>

## P-Ω4-6-FRONT-RESOLVE-NAME — /financial-periods expõe closedBy/reopenedBy UUID (BAIXA, para a fatia de FRONT)
O DTO/snapshot de fechamento expõe closedBy/reopenedBy como UUID cru (padrão backend, §2.8 OK — não vaza tenant/nome).
A futura tela de Fechamento (front) DEVE resolver UUID→nome antes de renderizar (precedente R-Ω3F-5b §11.2: UUID cru na UI = veto)
— reusar o UserNameResolver do Ω3F-5b.

- **status:** ABERTA · **agendamento:** DIFERIDO-LEVE · **severidade:** BAIXA · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Diferida, não descartada**, e listada nominalmente no PR para o dono vetar se discordar. Ver `pendencias-indice.md`.</sub>

## P-Ω4-6-NITS — Nits da pós-análise do Ω4-6 (BAIXA)
- L-4: pg_advisory_xact_lock(hashtext(tenant:period)) é int4 (2^32) — colisão serializa close/reopen cross-tenant
  (só throughput, nunca correção — a tx re-lê o estado). Considerar chave 64-bit (pg_advisory_xact_lock(int,int)) se o nº de tenants crescer.
- CORRIGIDOS nesta pós-análise: M-1 (balance.receivableOpen/payableOpen excluíam cancelados → agora sumOpen exclui;
  material mantém p/ checksum), L-1 (reclose deixava reopened_* obsoleto no DTO → nula quando status≠reopened),
  L-2 (forced:true só quando houve override real), L-3 (comentário "tabela vazia e nunca bloqueia" — falso desde Ω4-6, corrigido).

- **status:** ABERTA · **agendamento:** DIFERIDO-LEVE · **severidade:** BAIXA · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Diferida, não descartada**, e listada nominalmente no PR para o dono vetar se discordar. Ver `pendencias-indice.md`.</sub>

## P-Ω4-8-READINESS — Guia do Dashboard financeiro real (Ω4-8)
- GET /financial-periods/:period NÃO computa agregados de dinheiro AO VIVO para período ABERTO (só o checklist de
  pendências). O Dashboard precisa de A receber/A pagar/saldo do mês CORRENTE (não fechado). Barato de adicionar: um
  computeMaterialSnapshot preview ao vivo p/ período aberto (as linhas já são carregadas p/ o checklist). (L-5)
- Para período REOPENED, snapshot é o corpo pré-reabertura (stale-by-design) + checklist ao vivo — documentar p/ o Dashboard não tratar como corrente.
- snapshotHistory volta INTEIRO no GET/:period (cresce a cada reabertura) — o Dashboard deve pedir só o latest/paginar (L-6).
- balance.* já EXCLUI cancelados (M-1 corrigido) → o Dashboard pode consumir receivableOpen/payableOpen direto.
- P-Ω4-6-FRONT-RESOLVE-NAME: resolver closedBy/reopenedBy UUID→nome (UserNameResolver do Ω3F-5b) antes de renderizar.
- P-Ω4-2B-KPI-AGREGADO: os KPIs de Cobranças/Pagamentos somam só a página carregada — o Dashboard deve usar agregados de verdade.

- **status:** ABERTA · **severidade:** a classificar · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

## P-Ω4-7-READINESS — Guia do Cheque (Ω4-7)
- Cheque = meio de pagamento com status próprio (issued→deposited→cleared/bounced). Ao lançar caixa passa pelo
  chokepoint/competência automaticamente (via occurred_at do lançamento) — sem plumbing novo p/ o happy path.
- DECIDIR no comando: (a) competência de cheque PRÉ-DATADO ("bom para") — mês de EMISSÃO (occurred_at) vs mês de
  COMPENSAÇÃO — determina qual período o trava; (b) transições que flipam/revertem um lançamento (bounced) DEVEM ir
  pelo caminho de ESTORNO (chokepoint-guarded), NUNCA update destrutivo de lançamento de período possivelmente fechado.

- **status:** ABERTA · **severidade:** a classificar · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

## P-Ω4-7-CLEAR-ATOMIC — Resíduo de atomicidade do clear/bounce do cheque (BAIXA — espelha P-Ω4-4-LIQUID-ATOMIC)
O MUTEX (flip condicional) ELIMINA a dupla-postagem concorrente e o rollback trata falha do post. Resíduo: crash entre
o create do lançamento (sucesso) e o attach do id → cheque fica 'cleared' com cleared_entry_id=null (ou 'bounced' com
bounce_entry_id=null) e um lançamento posto sem back-link. Recuperável/detectável (cleared sem entry). Mesma classe do
payTitle (P-Ω4-4-LIQUID-ATOMIC). Ideal futuro: create+attach na MESMA $transaction Prisma (o InMemory já é atômico no
event-loop). Não bloqueia — a conservação de dinheiro nunca é violada (o post não duplica).

- **status:** ABERTA · **severidade:** MÉDIA (reclassificada) · **dono:** a atribuir
- **agendamento:** ~~DIFERIDO-LEVE~~ → **RETIRADO DO BALDE C em 2026-08-29** (achado A-5 da junta do SAN2-1)
  <sub>A cadeira de triagem amostrou 6 das 81 diferidas e provou que esta **não é cosmética**: crash entre o create do lançamento e o attach do id deixa o cheque `cleared` com `cleared_entry_id=null` e um lançamento postado sem back-link — **consequência de DADO no razão financeiro**. A própria entrada diz *“Mesma classe do payTitle”* e *“espelha `P-Ω4-4-LIQUID-ATOMIC`”* — e o índice deste mesmo bloco põe `P-Ω4-4-LIQUID-ATOMIC` no **balde A**. O espelho declarado de um item A havia ido para o C. A etiqueta colada aqui afirmava *“sem consequência de produto, dado, segurança ou número”* — e o próprio texto da pendência desmente. **Não era o adiamento que estava errado, era a etiqueta**, e é ela que o dono lê ao decidir se veta. Volta ao balde por severidade real.</sub>


## P-Ω4-7-ENTRY-OWNERSHIP — Lançamento de cheque manipulável direto por /financial-entries (BAIXA)
cleared_entry_id/bounce_entry_id apontam FinancialEntry comuns. Um ator com financial_entries:update pode delete/reverse
esses lançamentos DIRETO pela API de lançamentos, dessincronizando o estado do cheque (o cheque exibiria 'cleared' com o
caixa removido). Mitigado por RBAC (financial_entries:update é finance/admin — mesma fronteira de confiança de
cheques:update) e pelo desenho D-Ω4-7-BOUNCE-NEW-ENTRY (o bounce NÃO depende mais de reverter cleared_entry_id — posta
contra-lançamento fresco). Fechamento forte (flag owned_by='cheque' bloqueando delete/reverse fora do orquestrador)
inverteria a dependência entries→cheques → adiado. Conservação de dinheiro do LEDGER é preservada (o guard de par de
estorno já impede re-estorno).

- **status:** ABERTA · **agendamento:** DIFERIDO-LEVE · **severidade:** BAIXA · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Diferida, não descartada**, e listada nominalmente no PR para o dono vetar se discordar. Ver `pendencias-indice.md`.</sub>

## P-Ω4-7-DUPLA-CONTAGEM — cheque-register vs payTitle p/ o mesmo dinheiro (BAIXA — risco de PROCESSO)
Nada no backend impede registrar+compensar um cheque E liquidar o mesmo título com payTitle(payment_method='check') p/ o
mesmo dinheiro físico → dois lançamentos independentes. É disciplina do usuário (fluxos distintos). Quando title_id
entrar em escopo do cheque, vincular cheque↔título e impedir liquidação dupla. Fora do escopo do Ω4-7 (title_id não modelado).

- **status:** ABERTA · **severidade:** BAIXA · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

## P-Ω4-7-CLEAR-RETRO — Compensação retroativa a período fechado (BAIXA)
O clear sempre usa server-now → competência CORRENTE. Se o banco compensou de fato num mês já FECHADO, a data verdadeira
não é escriturável (usar now posta no mês corrente, coerente com caixa quando registrado). Política: compensação sempre no
período corrente aberto; retroação a período fechado exigiria reabertura (D-Ω4-6). Espelha D-Ω4-POS-FECHAMENTO. Documentado, não é dead-end silencioso (o clear falha com 422 period_closed se o mês corrente estiver fechado → cheque fica 'deposited').

- **status:** ABERTA · **severidade:** BAIXA · **dono:** a atribuir
  <sub>**REABERTA em 2026-08-29 — achado A-2 da junta do SAN2-1.** Foi marcada FECHADA porque o cabeçalho diz
  *"Compensação retroativa a período **fechado**"* — e o classificador da primeira passada casou a palavra
  "fechado", que ali qualifica o **período contábil**, não a pendência. **Vocabulário de domínio lido como
  vocabulário de status.** A entrada não se declara resolvida em linha nenhuma: descreve uma **política
  aceita** (compensação sempre no período corrente; retroação exigiria reabertura). Fica **ABERTA por padrão
  conservador** — se a política é para encerrá-la, isso é decisão a registrar, não inferência de regex.</sub>
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

## P-Ω4-8-SUMMARY-SCALE — /financial-summary faz full-scan das linhas (BAIXA)
O agregado carrega TODAS as linhas de título/lançamento/cheque do tenant em memória e soma em JS (espelha o dashboard
operacional; correto e com paridade InMemory↔Prisma). Para tenants grandes, otimizar com agregados SQL (SUM/COUNT/GROUP BY
por status/direção/competência direto no Postgres) — hoje só o saldo por conta já usa groupBy. Não bloqueia (data set de
dashboard); correção é performance, nunca correção de valor.

- **status:** ABERTA · **agendamento:** DIFERIDO-LEVE · **severidade:** BAIXA · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Diferida, não descartada**, e listada nominalmente no PR para o dono vetar se discordar. Ver `pendencias-indice.md`.</sub>

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

- **status:** ABERTA · **agendamento:** DIFERIDO-LEVE · **severidade:** MEDIA · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Diferida, não descartada**, e listada nominalmente no PR para o dono vetar se discordar. Ver `pendencias-indice.md`.</sub>

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

- **status:** ABERTA · **severidade:** BAIXA · **dono:** a atribuir
  <sub>**REABERTA em 2026-08-29 — achado A-1 da junta do SAN2-1, gravidade `bloqueia`.** Esta entrada foi
  marcada FECHADA pela primeira passada da triagem porque o cabeçalho diz "RESOLVIDOS". **Está errado:** o
  cabeçalho fala dos **três** defeitos do cluster, e o corpo, logo abaixo, diz textualmente *"Residuais BAIXA
  **abertos**:"* e lista **quatro** — `P-Ω3F6-CANCEL-RACE`, `P-Ω3F6-LEGACY-NULL`, `P-Ω3F6-CANCEL-IDEM`,
  `P-Ω3F6-MOBILE-DEADLETTER` — que **não têm cabeçalho próprio em lugar nenhum deste arquivo**. Fechar aqui
  sumia com os quatro da resposta a "o que está aberto?" — a **mesma classe** do `P-O6R-B04`, que originou
  esta rodada, cometida pelo bloco que existia para exterminá-la. Causa-raiz do classificador: ele lia
  "RESOLVIDO **PARCIAL**" e ignorava o qualificador. **Enquanto os quatro residuais não tiverem entrada
  própria, esta entrada é a única coisa que os mantém visíveis — e por isso fica ABERTA.**</sub>
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

## P-GOLIVE-SECRET-ROTATE — ~~Chave Google Maps: rotação humana obrigatória~~ — **FECHADA (2026-08-29): rotação DISPENSADA pelo dono**

- **status:** FECHADA · **severidade:** era CRÍTICA · **dono:** encerrado
  <sub>**Fechada por decisão do dono**, registrada em `decisoes.md` → `D-GOLIVE-MAPS-ROTACAO-DISPENSADA`
  (decidida em 2026-08-13, **registrada em 2026-08-29**). Motivo medido: o projeto **não usa Google Maps** —
  o mapa é MapLibre + OpenFreeMap desde o #338 —, a chave vivia num arquivo de **protótipo**, foi redigida do
  HEAD no #229 e **não tem uso ativo**. Era a **única CRÍTICA aberta da trilha**, e a dispensa existia só na
  memória do agente, fora do repositório, o que o §A1 proíbe. **A dispensa é da AÇÃO de rotação, não da
  exposição**: a chave segue no histórico git e a decisão **caduca** se o projeto voltar a usar Google Maps
  Platform.</sub>

Texto original preservado abaixo (§A2 — registro histórico, não reescrito):
Chave Google Maps API ativa estava hardcoded em docs/claude-code-handoff/ERP Web.dc.html:2670 (arquivo rastreado). REDIGIDA do
HEAD neste bloco (placeholder). Como a chave SEGUE no histórico git, deve ser considerada COMPROMETIDA → o dono DEVE revogar/
rotacionar no Google Cloud Console e restringir a nova chave (referer/HTTP + API + cota). Parada irredutível (exposição de segredo).

> **ERRATA DA PRÓPRIA TRIAGEM (2026-08-29).** Aqui existia, até agora, uma **segunda linha de status** —
> `status: ABERTA · severidade: CRITICA` — que **eu mesmo apensei** na passada em massa deste bloco, antes de
> fechar a pendência por decisão do dono. A seção ficou **se contradizendo**: dizia FECHADA no topo e ABERTA
> logo abaixo, e a linha obsoleta ainda carregava **CRÍTICA**, de modo que um `grep` por críticas abertas
> continuaria encontrando esta. **Removida** — e a remoção é de texto que nasceu hoje, nesta mesma triagem,
> não de registro histórico (§A2 preservado). Achado por auditoria do próprio orquestrador sobre o próprio
> classificador, e é literalmente a classe que este bloco existe para exterminar: **registro que afirma duas
> coisas incompatíveis ao mesmo tempo.**

## P-GOLIVE-VALIDATE-CONSTRAINT — Operacionalizar VALIDATE CONSTRAINT do CHECK do cancelamento (MÉDIA, go-live)
O CHECK work_orders_cancelled_decision_check é NOT VALID (não valida linhas legadas). Hoje há 0 linhas cancelled+NULL no banco →
o VALIDATE passaria de imediato. Após aplicar 13..16 em produção e confirmar zero cancelled+NULL, rodar `ALTER TABLE work_orders
VALIDATE CONSTRAINT work_orders_cancelled_decision_check` (bloco de follow-up rastreado). Até lá, o consumidor de comissões trata
NULL-em-cancelled como "segurar para revisão" (P-Ω3F6-LEGACY-NULL). Ver docs/go-live-readiness.md.

- **status:** ABERTA · **severidade:** MEDIA · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

## P-GOLIVE-GATES — Gates humanos de go-live (R1 provedor, R2 restore cronometrado, smoke autenticado) — docs/go-live-readiness.md
Readiness config-as-code = GO; ativação viva é fronteira humana. Gates que só existem no ambiente real: R1 (ratificar "dados no
Brasil"), R2 (drill de restore cronometrado com app vivo + login + RPO no runbook), staging verde antes de prod, PROD_SMOKE_EMAIL/
PASSWORD para cobrir rota autenticada no smoke. Checklist ordenado (12 passos) + custo (~US$47-110/mês) em docs/go-live-readiness.md.

- **status:** ABERTA · **severidade:** a classificar · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

## P-UI-REFRESH-LIVENESS — indicador sutil de auto-atualização nas telas (WS-UI-REFRESH, 2026-07-19)
- descricao: WS-UI-REFRESH removeu o botão manual "Atualizar" e ligou auto-refresh silencioso em 30 telas (o dono pediu
  explicitamente "o sistema faz isso automatico"). 29/30 telas NÃO exibem sinal visual de que a tela se atualiza sozinha —
  só OperationsMapPage mostra chips "Atualizando…"/"Atualizado {data}". Os hooks já expõem `isRefreshing` (não consumido nas
  páginas). Inclui a divergência cosmética de NotificationsPage (loadNotifications não expõe isRefreshing).
- acao: OPCIONAL (não-bloqueante; comportamento silencioso é o que o dono pediu). Se desejado, adicionar um indicador sutil e
  uniforme (chip/spinner via `isRefreshing` ou label "Atualizado às HH:MM") para paridade com o padrão-ouro do mapa e sensação
  de "tela viva". Cruza com WS-UI-CARDS/WS-UI-CHARTS (mesma passada de vitalidade de UI).
- status: aberto (não-bloqueante; sancionado pela junta como comportamento pedido).

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

## P-UI-REFRESH-ERROR-COPY — cópia de erro referencia refresh manual que não existe mais (WS-UI-REFRESH, 2026-07-19)
- descricao: alguns toasts/cópias de erro em ADAPTERS (fora do escopo do WS, não tocados) instruem recarregar manualmente,
  agora que o botão sumiu e a tela atualiza sozinha a cada 30s: `users.adapter.ts` ("Atualize a lista e tente novamente"),
  `damages`/`fines`/`maintenance`/`cycle-counts` adapters ("Recarregue a lista"), `DuplicateWorkOrderModal.tsx` ("Atualize a
  lista de ordens para encontrá-la"). Levemente enganoso.
- acao: passada de cópia futura — reescrever para refletir o auto-refresh (ex.: "a lista se atualiza automaticamente" / remover
  a instrução manual). São mensagens de erro (não empty-states).
- status: aberto (não-bloqueante; cosmético).

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

## P-RBAC-GATING-MOCKSHELLS — gating RBAC das 3 telas-casca fica com a ligação a dados (WS-SCALE-8TELAS, 2026-07-19)
- descricao: a auditoria RBAC listou 5 telas com botões de escrita expostos. WS-RBAC-GATING-CHECKLISTS gateou as 2 REAIS
  (service-backed): TenantChecklistsPage + ChecklistRunsPage. As outras 3 — DispatchConsolePage, TablePage (purchase-orders),
  PedidosPage — são CASCAS 100% mock (dados hardcoded, sem service/estado); seus botões não fazem nada.
- acao: gatear essas 3 JUNTO da ligação a dados reais (gate-on-wiring) em WS-SCALE-8TELAS — quando ganharem hook + service +
  usePermissions, aplicar o mesmo padrão (usePermissions + can + render condicional dos botões de escrita).
- status: aberto (não-bloqueante; hoje são mocks sem efeito).

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

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

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

## P-CHECKLIST-RUNS-STATUS-COPY — status técnico cru na cópia da tela de execuções (2026-07-19)
- descricao: ChecklistRunsPage.tsx (~linha 105) renderiza `{item.status}` cru dentro de frase PT-BR ("… componentes ·
  {item.status}"), expondo valor técnico (ex.: "published") — roça §3/§11.2 (sem termo técnico na UI). PRÉ-EXISTENTE, fora do
  diff do gating RBAC (achado da cognicao-visual).
- acao: mapear status → rótulo PT-BR (ex.: published→"Publicado") numa passada de cópia. Cruza com P-UI-REFRESH-ERROR-COPY
  (mesmo lote de polish de cópia).
- status: aberto (não-bloqueante; cosmético).

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

## P-FINANCE-HEADER-ACTIONS — page header do Financeiro sem ações à direita (§11 #4, pré-existente, 2026-07-19)
- descricao: o header da FinanceiroPage tem só título+subtítulo, sem as ações à direita do protótipo ("Conciliar NF-e" +
  "Novo lançamento", ERP Web.dc.html:904) — contraria §11 regra #4 ("página header = título+subtítulo+ações à direita").
  PRÉ-EXISTENTE (não introduzido por WS-UI-CARDS+CHARTS; o botão "Atualizar" foi removido em WS-UI-REFRESH). Achado BAIXA
  da cognicao-visual.
- acao: restaurar ações significativas no header (Novo lançamento; Conciliar quando a trilha NF-e existir — cruza com a
  parada NF-e do scale-roadmap). Passada de fidelidade §11.
- status: aberto (não-bloqueante; cosmético/pré-existente).

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

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

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

## P-WOTS-SCALE — otimização de agregação (full-scan) no work-order-timeseries (2026-07-19)
- descricao: o agregado GET /operations/work-orders-timeseries varre as OS do tenant (só status+3 timestamps) e agrega no
  compute puro. Correto e completo; em tenants com muita OS, filtrar por janela na query + GROUP BY seria mais eficiente.
  Espelha a mesma escolha de technician-performance/financial-summary. NÃO é pendência funcional.
- acao: OTIMIZAÇÃO FUTURA (filtro SQL por from/to + agregação no banco) quando o volume exigir. Sem mudança de contrato.
- status: aberto (otimização; feature funcionando).

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

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

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

## P-PLATFORM-TENANTDETAIL-REAL - Detalhe da Organizacao (plataforma) ainda mock (2026-07-20)

- descricao: `PlatformTenantDetailPage` segue com consts hardcoded (STATS/CONTRACTED/HEALTH/USERS; nao le useParams tenantId).
  O agregado real /platform/overview (PR-5a) ja da a lista; falta um endpoint de DETALHE por org (tenant + contagem/lista de
  usuarios + modulos) real para wirar o detalhe. Backend: reusar listUsersForTenant(withTenantRls) + listTenantModules; sem
  migracao. MRR/uptime/saude-do-sistema por org = sem fonte (omitir, como no overview).
- status: ABERTA (follow-up do WS-SCALE; PR-5a entregou o overview; detalhe fica para PR proprio).

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

## P-PURCHASE-ORDERS-BACKEND-GATE - Gate server-side de Pedidos/Relatórios pendente (2026-07-21, PR-SCALE-1)

- descricao: o PR-SCALE-1 adicionou `purchase_orders:read/create` e `reports:read` ao catálogo RBAC + gateou as AÇÕES DE UI das
  telas mock (DispatchConsole por field_dispatch:*; Pedidos "Novo pedido" por purchase_orders:create). Mas as rotas /purchase-orders
  e /reports ainda são TELAS MOCK — não há endpoint de domínio no backend enforçando essas permissões (o gate atual é só UX).
- impacto: nenhum dado protegido é exposto (as telas não têm dado real). CLAUDE.md §2.4/DoD: backend é a autoridade final.
- proximo: quando os endpoints reais de Pedidos de Compra e Relatórios forem construídos (Onda 4/3 do scale-roadmap), eles DEVEM
  aplicar `requirePermission("purchase_orders:*"/"reports:read")` server-side. O catálogo + gating de UI desta fatia já preparam o
  terreno (fecha o gap pré-existente em que App.tsx/navegação referenciavam permissões ausentes do catálogo).
- status: ABERTA (nasce junto com o endpoint; gating de UI isolado é cosmético mas correto).

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

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

- **status:** ABERTA · **severidade:** a classificar · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

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

- **status:** ABERTA · **severidade:** a classificar · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

## P-CHK-TEMPLATE-PRISMA-V7 (2026-08-01) — createTemplate falha no runtime do Prisma v7 (bug REAL de produção) — **RESOLVIDO (2026-08-02)**

> **RESOLVIDO** na fatia de limpeza-de-pendências (antes do CHECKLIST P1). Fix: removido `tenant_id` explícito dos
> nested-creates de `createTemplate`, `updateTemplate` **e `createRun` (bug IRMÃO, achado da junta dba — mesmo defeito,
> alcançável por `POST /checklists/:id/runs` com answers → 500)** — o Prisma v7 infere `tenant_id` do pai (relation-scalar
> compartilhado). Teste DB-gated `tests/checklist-template-prisma-db.test.ts` (3 testes) prova: FALHA contra o código
> antigo com o `Unknown argument tenant_id` exato, PASSA contra o corrigido; RAW-verificado que o `tenant_id` do
> componente/resposta é o do pai (tenant do ator), sem vazamento. dba-guardião APROVADO_CONDICIONADO → irmão fechado no
> mesmo PR. Varredura confirmou: nenhum outro nested-relation-create com relation-scalar compartilhado no codebase (os
> demais `create:` são ramos de `upsert` top-level, seguros). Ver [[P-CHK-PRISMA-CLIENT-TYPING]].

- **status:** FECHADA · **severidade:** a classificar · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status, mas **ela própria já se declarava resolvida** no cabeçalho — a linha é **transcrição**, não juízo novo. [Nota corrigida em 2026-08-29 pelo achado A-3 da junta: aqui estava colado o boilerplate *“Marcada ABERTA por padrão conservador”*, que contradizia o próprio `status: FECHADA` logo acima. A nota é a prova de auditoria da regra — colada sem discriminar, transformava o registro numa afirmação dupla.]</sub>

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

- **status:** ABERTA · **severidade:** MEDIA · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

## P-DS-TABS-ARIA — Padrão WAI-ARIA de abas incompleto no `Tabs` do design system (BAIXA)

Junta do Ω-VID PR-07 (`cognicao-visual`). O `Tabs` (`frontend/src/components/ui/index.tsx`) tem `role=tablist/tab` +
`aria-selected` (piso atendido), e o dossiê renderiza o painel com `role=tabpanel` + `aria-label`. **Falta** a amarração
completa: botões sem `aria-controls` apontando o id do painel, `tabpanel` sem `id`/`aria-labelledby` apontando a aba
ativa, e sem roving-tabindex/navegação por ArrowLeft/ArrowRight (só `Tab` entre os 6 botões nativos). **Transversal**
(todo consumidor do `Tabs`), não desvio do PR-07. Corrigir numa passada de a11y do DS: `id` no tabpanel +
`aria-labelledby ↔ aria-controls` + (opcional) navegação por setas. Ver também **[P-Ω4-2B-A11Y]** (focus-trap/Esc no
`Modal` compartilhado — mesma classe transversal, herdada pelo modal grande do dossiê).

- **status:** ABERTA · **agendamento:** DIFERIDO-LEVE · **severidade:** BAIXA · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Diferida, não descartada**, e listada nominalmente no PR para o dono vetar se discordar. Ver `pendencias-indice.md`.</sub>

## P-PATIOS-HEX-TOKENS — Hex inline no módulo pátios contra J-002 (BAIXA)

Junta do Ω-VID PR-07 (`cognicao-visual`). `VehicleDossieModal`/`ProcessIdentityCard` e os irmãos do módulo
(`InspectionSection`, `OccupancyMap`, `TransicaoFsmPanel`…) usam hex hardcoded (`#0F172A`, `#64748B`, `#2563EB`) nos
estilos inline, contra a regra "nunca hex solto em componente" (J-002). **Não é desvio introduzido pelo PR-07** — segue
a convenção já estabelecida em TODO o módulo pátios (consistente com os irmãos). Corrigir numa passada de tokenização
do módulo: promover para as variáveis já usadas em outras telas (`var(--text-primary)` / `var(--text-secondary)` /
`var(--color-core-primary)`). Registrado para rastreabilidade (§A2); fora do escopo de qualquer PR de feature.

- **status:** ABERTA · **agendamento:** DIFERIDO-LEVE · **severidade:** BAIXA · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Diferida, não descartada**, e listada nominalmente no PR para o dono vetar se discordar. Ver `pendencias-indice.md`.</sub>

## P-CHK-RUN-DTO-NARROW — Estreitar o resumo de ChecklistRun removendo UUIDs não-usados (BAIXA)

Junta do Ω-VID PR-08 (coordenador-de-acessos, observação BAIXA não-bloqueante). O DTO
`toChecklistRunSummaryListDto` ainda carrega `templateId` e `relatedEntityId` (UUIDs de recurso interno — FORA das
classes proibidas do §2.8: não são token/path/bucket/storage-key/base64/binário/tenant), embora a UI **nunca** os
renderize (o painel usa `templateName`/`templateVersion`/status/datas). Poder-se-ia reduzir a superfície removendo-os
do DTO. **Não é violação §allowlist** — é aperto opcional. Fora do escopo do PR-08 (mudar o DTO exigiria reconferir
eventuais consumidores futuros — PR-09 Histórico pode querer `relatedEntityId` para agrupar). Registrado para a
rodada de custódia decidir junto de [P-IMPOUND-CHK-VISIBILITY].

- **status:** ABERTA · **agendamento:** DIFERIDO-LEVE · **severidade:** BAIXA · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Diferida, não descartada**, e listada nominalmente no PR para o dono vetar se discordar. Ver `pendencias-indice.md`.</sub>

## P-CHK-RUN-ASSIGNEE-SCOPE — `listChecklistRunsForProcess` não escopa por assignee (BAIXA, → junta de custódia)

Junta do Ω-VID PR-08 (coordenador-de-acessos). O `checklist_runs:read` do `field_technician` tem intenção
"answer-assigned" (run designada a ele), mas `listChecklistRunsForProcess` (impound.checklist-link.service.ts) devolve
**todas** as runs vinculadas ao processo, sem escopar por assignee. Continua **tenant-scoped** (sem vazamento
cross-tenant — 404 provado nos testes 4/5); a nuance é apenas se o guincheiro deveria ver só as runs dele ou todas as
do processo. É exatamente a decisão que [P-IMPOUND-CHK-VISIBILITY] defere à **junta de custódia**: (a) exigir permissão
de custódia dedicada além de `impound:read`? (b) escopar por assignee para alinhar à intenção "answer-assigned"? PR-08
não é o lugar de decidir. Registrado (§A2).

- **status:** ABERTA · **agendamento:** DIFERIDO-LEVE · **severidade:** BAIXA · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Diferida, não descartada**, e listada nominalmente no PR para o dono vetar se discordar. Ver `pendencias-indice.md`.</sub>

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

- **status:** FECHADA · **severidade:** BAIXA · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status, mas **ela própria já se declarava resolvida** no cabeçalho — a linha é **transcrição**, não juízo novo. [Nota corrigida em 2026-08-29 pelo achado A-3 da junta: aqui estava colado o boilerplate *“Marcada ABERTA por padrão conservador”*, que contradizia o próprio `status: FECHADA` logo acima. A nota é a prova de auditoria da regra — colada sem discriminar, transformava o registro numa afirmação dupla.]</sub>

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

- **status:** FECHADA · **severidade:** ALTA · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status, mas **ela própria já se declarava resolvida** no cabeçalho — a linha é **transcrição**, não juízo novo. [Nota corrigida em 2026-08-29 pelo achado A-3 da junta: aqui estava colado o boilerplate *“Marcada ABERTA por padrão conservador”*, que contradizia o próprio `status: FECHADA` logo acima. A nota é a prova de auditoria da regra — colada sem discriminar, transformava o registro numa afirmação dupla.]</sub>

## P-CHK-CATALOG-EXHAUSTIVE (2026-08-03) — Catálogo de componentes é array, não Record (tsc não garante cobertura) (BAIXA)

Junta do CHECKLIST P1 PR-01 (critico-adversarial, menor). `CHECKLIST_COMPONENT_CATALOG` (`checklist.components.ts`) é
um ARRAY hand-ordered, não um `Record<ChecklistComponentType, ...>` — então o `tsc` NÃO garante que todo tipo da união
tenha entrada no catálogo (um tipo novo sem entrada passaria silencioso; hoje está completo). Considerar reestruturar
para um Record keyed por tipo (o `tsc` passa a exigir cobertura), preservando a ordem via um array de ordenação. Fora
do escopo do PR-01. Registrado.

- **status:** ABERTA · **agendamento:** DIFERIDO-LEVE · **severidade:** BAIXA · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Diferida, não descartada**, e listada nominalmente no PR para o dono vetar se discordar. Ver `pendencias-indice.md`.</sub>

## P-WO-LIST-TECH-NAME (2026-08-04) — DTO da lista de OS sem o nome do técnico atribuído (BAIXA, UX)

Rodada TELAS PADRONIZADAS PR-B. O design do dono (sc_os) mostra avatar+NOME do técnico na coluna TÉCNICO, mas o DTO
da lista de work-orders só carrega `assignedOperatorId` — a tela degrada honestamente para "Atribuído" (sem inventar
iniciais). Fatia pequena de backend: incluir `assignedOperatorName` no DTO de lista (join leve) + adapter/coluna.

- **status:** ABERTA · **agendamento:** DIFERIDO-LEVE · **severidade:** BAIXA · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Diferida, não descartada**, e listada nominalmente no PR para o dono vetar se discordar. Ver `pendencias-indice.md`.</sub>

## P-USERS-LAST-ACCESS (2026-08-04) — DTO de usuários sem "último acesso" (BAIXA, UX)

TELAS PR-C. O design mostra ÚLTIMO ACESSO ("14/07/2026 · há 21 dias"), mas `User` só tem `createdAt` — a tela usa
"CRIADO EM" honesto. Fatia backend: gravar/expor last_login (a base já tem sessões/auditoria de login para derivar).

- **status:** ABERTA · **agendamento:** DIFERIDO-LEVE · **severidade:** BAIXA · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Diferida, não descartada**, e listada nominalmente no PR para o dono vetar se discordar. Ver `pendencias-indice.md`.</sub>

## P-AUD-ACTOR-NAME (2026-08-04) — DTO de auditoria sem nome/perfil do ator (BAIXA, UX)

TELAS PR-C. O design mostra avatar+nome+perfil do ator; o DTO expõe só `actor_user_id` (id opaco). A tela mostra
"Usuário"+cor determinística (nunca UUID; chip no filtro). Fatia backend: incluir displayName/role do ator no DTO
(join leve), respeitando a allowlist §2.8 (nome é rótulo, não PII sensível no contexto do próprio tenant).

- **status:** ABERTA · **agendamento:** DIFERIDO-LEVE · **severidade:** BAIXA · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Diferida, não descartada**, e listada nominalmente no PR para o dono vetar se discordar. Ver `pendencias-indice.md`.</sub>

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

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

## P-CHK-PREVIEW-DOCK-LIMIAR (2026-08-08) — limiar de 1600px é constante, não medição do contêiner (BAIXA)

Junta do PR-02d. O `resolveChecklistPreviewMode` decide dock × modal por `window.innerWidth >= 1600`, mas a
grade do dock precisa de **1198px de conteúdo** — com a barra lateral COLAPSADA (74px em vez de 236px) o dock
caberia bem antes de 1600. O número está certo para o layout expandido e errado como regra geral.
- **Correção:** medir o contêiner (`ResizeObserver` ou `clientWidth` da grade) contra os 1198px reais, em vez
  da janela. De quebra, trocar o listener de `resize` por `matchMedia` elimina o re-render por pixel.
- status: ABERTA.

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

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

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

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

- **status:** ABERTA · **severidade:** a classificar · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

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
- **status:** FECHADA · **severidade:** MÉDIA · **dono:** encerrado
  <sub>Resolução de contradição (2026-08-29). O texto original desta linha era *“status: ABERTA — pré-requisito de merge da PR-04b, não item de backlog”*, preservado no parágrafo abaixo.</sub>
- ~~status: ABERTA — pré-requisito de merge da PR-04b~~ *(texto de 10/08, obsoleto — ver acima)*
  <sub>**Contradição PRÉ-EXISTENTE, resolvida por DATA e não por regex.** Esta linha é de **10/08** e dizia ABERTA; o cabeçalho desta mesma seção, de **11/08**, diz **RESOLVIDA na PR-04b**. A linha era pré-requisito *daquela* PR — e ela mergeou, o que a tornou obsoleta no dia seguinte. Vence o texto **mais novo**. O classificador do índice **não decide isto sozinho**: ele emitia `CONTRADITÓRIA` e exigia decisão humana, porque comparar datas não é coisa que um regex faça — foi exatamente chutar aqui que reprovou a primeira passada. Escopo: `pre-existente`, nasceu 19 dias antes deste bloco.</sub>
  <sub>**Contradição PRÉ-EXISTENTE, nomeada pela triagem SAN2-1 (2026-08-29), não corrigida por reescrita.**
  Esta linha é de **10/08** e diz ABERTA; o **cabeçalho** desta mesma seção diz **RESOLVIDA na PR-04b
  (2026-08-11)**. A linha ficou obsoleta quando a PR-04b mergeou — era pré-requisito *dela*, e ela entrou.
  O índice classifica como **FECHADA**, seguindo o cabeçalho, que é o mais novo. O texto de 10/08 fica como
  registro histórico (§A2). Escopo: `pre-existente` — nasceu 19 dias antes deste bloco.</sub>

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

- **status:** FECHADA · **severidade:** a classificar · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status, mas **ela própria já se declarava resolvida** no cabeçalho — a linha é **transcrição**, não juízo novo. [Nota corrigida em 2026-08-29 pelo achado A-3 da junta: aqui estava colado o boilerplate *“Marcada ABERTA por padrão conservador”*, que contradizia o próprio `status: FECHADA` logo acima. A nota é a prova de auditoria da regra — colada sem discriminar, transformava o registro numa afirmação dupla.]</sub>

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
  rotação de e-mails (o balde por e-mail não a fecha — idêntico ao login de hoje, não regride).
  **FECHADA pelo B-O6R-07a (2026-09-02) na metade que era dele, com o residual RE-NOMEADO em vez de escondido:**
  entrou balde por **IP** (`TokenBucket` REUTILIZADO de `portal-shared` — zero dependência nova; chave HMAC
  derivada de `JWT_SECRET` sobre o IP) nas **duas** rotas de login, estouro → **429 `RATE_LIMITED`**. Evidência:
  `o6r07a-login-rate-limit` **6/6**, vermelho-controle `6 · pass 2 · fail 4` com os quatro `not ok` nomeados,
  entre eles *e-mails DIFERENTES no mesmo IP → 429* (fecha a rotação de e-mails) e *IPs distintos NÃO
  compartilham balde* (o vizinho de NAT não derruba o outro). **NÃO fechados, e por isso vivem agora em
  `P-O6R-B07-RATE-LIMIT-DISTRIBUIDO`:** multi-réplica/Redis, política de `X-Forwarded-For` e a enumeração pelo
  `400 TENANT_ID_REQUIRED`. status: FECHADA (residual distribuído migrado, não perdido).
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

### P-O6R-B01-PORTEIRO-357-A109FD7 (2026-08-20) — ressalvas implementadas localmente, ainda não publicadas

O commit `a109fd7` (`chore/ressalvas-porteiro-357`) declara fechar quatro ressalvas do porteiro do PR #357,
mas a medição de 2026-08-20 mostrou que ele está apenas em branch local, não é ancestral da `main` nem de
`feat/o6r-b02-financial-uow` e não possui PR. Portanto, as ressalvas **não estão fechadas na linha publicada**.

**Artefato de destino exato:** PR dedicado com head `chore/ressalvas-porteiro-357`, sem misturar o diff
financeiro, mais ata independente em
`agent-orchestration/omega/juntas/J-O6R-B01-PORTEIRO-357-RESSALVAS.md`.

**Gate `G-A109FD7-PUBLICADO`:** bloqueia push/abertura do PR B-O6R-02 e seu merge até: CI e junta verdes; PR
dedicado mergeado na `main`; número, `headRefOid` e `mergeCommit.oid` registrados aqui; branch B-O6R-02
atualizada; `git merge-base --is-ancestor <merge_commit> HEAD` com exit 0; e bateria/contagens B-O6R-02
reexecutadas depois da atualização. Evidência: `gh pr view <PR> --json
number,state,mergedAt,headRefOid,mergeCommit,url` + ancestralidade no task-history. O parecer anterior
`LIBERADO COM RESSALVA` permite desenvolver a F6; não permite publicar B-O6R-02 sem este gate. Cherry-pick
silencioso de `a109fd7` no PR financeiro é proibido. **status: ABERTA — BLOQUEIA PUBLICAÇÃO B-O6R-02.**

**FECHAMENTO (2026-09-04) — o gate `G-A109FD7-PUBLICADO` foi SATISFEITO, condição a condição.**

O gate foi **achado por conferência ativa antes de o merge do ciclo 5 ser proposto** — não por acaso: a
verificação de gate passou a ser passo explícito depois de eu quase propor um merge sobre um bloqueio
formal que não tinha lido.

| condição literal do gate | evidência medida |
|---|---|
| CI e junta verdes | junta do ciclo 5 **APROVADO 3×0** (`J-B-O6R-02-ciclo5.md`); CI do PR dedicado **7/7 jobs pass** (run `33922531004`) |
| PR dedicado mergeado na `main` | **PR #370**, `state: MERGED`, `mergedAt: 2026-09-04T22:22:32Z` |
| número, `headRefOid` e `mergeCommit.oid` registrados **aqui** | `pr` **370** · `headRefOid` **`a1d5d2d1c0619bc43ea08b4e547649c9d30d74ad`** · `mergeCommit.oid` **`54a41947f82ab7405ab1aabdf4b1761da70fe815`** |
| branch `B-O6R-02` atualizada | merge de absorção **`099f71f`**, dois pais (`9f37f61` + `54a4194`) |
| `git merge-base --is-ancestor <merge_commit> HEAD` ec=0 | **ec=0** para `54a4194` — e `12c3825` (head julgado do ciclo 4) segue ancestral, também ec=0 |
| bateria/contagens reexecutadas **depois** da atualização | reexecutada no head pós-absorção — números publicados no KPI e no `kpis-history` deste PR |

**Nota de forma, para não confundir quem medir depois:** o merge do #370 foi **squash** (política §8.5 do
`CLAUDE.md`), então `a109fd7` **não** é ancestral da `main` — o que é ancestral é o `mergeCommit`
`54a4194`, que é exatamente o que a cláusula do gate pede. O **conteúdo** chegou íntegro, conferido por
execução na `main`: o `guard 11` (`catalog.ts não pode ganhar import`) está presente, o comentário de
precisão em `core-saas-role-authority-db.test.ts` está presente, e as duas atribuições de dono
(`B-O6R-07`, `B-O6R-08`) estão presentes.

**O que o PR #370 precisou além do previsto, registrado porque é dado de terreno:** a branch estava
parada em **19/08** e tinha **3 conflitos** com a `main` — por isso o evento `pull_request` sequer
disparava CI. Foi atualizada por **merge da `main` dentro dela** (nunca rebase, para não mover
`a109fd7`), com `Kpis/app.js` e `kpis-latest.json` resolvidos **main-integral** (a branch só mudava um
`as_of` de 08-17 para 08-19, e a `main` já estava em 09-02 — preservar o lado dela **regrediria o
painel**) e `pendencias.md` por **união**, preservando as 10 linhas de atribuição de dono. Diff final
contra a `main`: **3 arquivos, +40 −1** — o mérito, sem regressão.

- **status:** **FECHADA (2026-09-04, PR #370 — `54a4194`)** · o gate `G-A109FD7-PUBLICADO` **deixa de bloquear** a publicação do `B-O6R-02`
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
- status: **ABERTA — 2 P0 (Ω6R-DAT-002, Ω6R-DAT-003) + 1 P1 (Ω6R-QUA-002). NÃO INICIADO.**
  Dependência (B-O6R-01) **satisfeita** desde o #357 — é **frente livre**, e o porteiro pós-merge do #359
  a nomeia como tal ("B-04 e B-07 declaram dependência só do B-01").

> **CORREÇÃO DE REGISTRO (2026-08-28, bloco de registro).** Esta linha continha, até hoje, o status
> `FECHADA (2026-08-15, PR #353 a8901ff)` com o texto *"os dois P0 viraram gate de boot: produção recusa
> subir com o agregado core-saas em memória, sem banco, sem worker e com Redis apontando para host local"*.
> Esse texto é do **`P-O6R-B05`** (portões de runtime de produção, `Ω6R-DAT-001` + `Ω6R-DIN-006`) — o #353
> se chama literalmente *"fix(infra): produção não sobe mais sem persistir e sem worker (B-O6R-05)"* e nada
> nele toca estoque. O status ficou ancorado na seção errada e o `P-O6R-B05` seguiu marcado `ABERTA`: os dois
> se anulavam. **Consequência material do defeito:** quem lesse a `pendencias.md` concluiria que os dois P0 de
> estoque (saldo concorrente e fechamento de contagem cíclica) estavam fechados e **pularia o B-04 inteiro**.
> Contraprova que fixa a leitura correta: `Kpis/kpis-latest.json` → `roadmap.blocos` marca `B-O6R-04`
> `"estado": "a_fazer"` e `B-O6R-05` `"estado": "concluido", "pr": 353`; e `production_readiness.fechados`
> credita `Ω6R-DAT-001`/`Ω6R-DIN-006` ao `B-O6R-05` (PR #353), nunca `DAT-002`/`DAT-003`.

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
- status: **FECHADA (2026-08-15, PR #353 `a8901ff`)** — os dois P0 viraram gate de boot:
  produção recusa subir com o agregado core-saas em memória, sem banco, sem worker e com Redis apontando
  para host local. O texto acima descreve o estado **anterior** ao PR e fica como registro histórico; a
  `main` de hoje já não o reproduz. Ata: `omega/juntas/J-O6R-B05-PR353-merge.md` (3×0, sem veto).
  Rascunho arquitetural correlato: `docs/revisoes/O6R/D-003-jobs-duraveis.md` (**pauta do dono, não decisão**).
  [Status devolvido a esta seção em 2026-08-28 pelo bloco de registro — estava ancorado na seção do
  `P-O6R-B04`, que por sua vez seguia marcado como fechado sem nunca ter sido iniciado.]

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
**METADE FECHADA pelo B-O6R-07a (2026-09-02) — e a entrada NÃO fecha por isso.** `Ω6R-SEC-002` (P0) e
`Ω6R-SEC-003` (P1) estão fechados **na autoria** (rastro em `docs/revisoes/O6R/achados.jsonl` e
`REGISTRO_ACHADOS_O6R.md`; o painel os põe em `production_readiness.aguardando_merge` e **não** move
`p0_fechados`/`p1_fechados`, que só contam conserto na `main`). **`Ω6R-SEC-004` segue ABERTO** — é o sub-bloco
**07b** (`fix/o6r07b-uploads`): scanner fail-closed por ambiente, sniff de magic bytes in-house e download
endurecido, nas **5 vias** medidas (mobile evidence, attachments, checklists, damages, work-order-attachments).
**Consequência de gate, dita em voz alta:** o título "1 P0 + 2 P1" só zera com o 07b, e o gate da CHECKLIST P1
(`J-CHK-04C-EMENDA`) exige **`B-O6R-06` E os DOIS sub-blocos do `B-O6R-07`** mergeados. O `Bloqueia:` de
auth/OS/aprovações/RBAC **cai** com o merge do 07a; o de evidências/anexos/upload mobile **permanece** até o 07b.
- status: ABERTA — resta 1 P1 (`Ω6R-SEC-004`, sub-bloco 07b). Os outros 2 (1 P0 + 1 P1) fecharam no 07a.

## P-O6R-B07-APPROVAL-BY-POLICY (2026-09-02) — `finance`/`inventory` sem `work_orders:approve` — MÉDIA

Aberta pelo B-O6R-07a (§3.1 do plano), no PR que criou a permissão dedicada `work_orders:approve`.

`RBAC_MATRIX.md:46` classifica finance e inventory como **"approval-by-policy"** em Workflow/approvals — isto
é, aprovam *conforme a política*. A política em questão é **de VALOR**, e ela não existe como dado: o agregado
de aprovação (`src/modules/work-orders/approval.types.ts`) tem `entityType ∈ {work_order, checklist_run,
evidence}` e **nenhum campo monetário** — medido, lido o arquivo inteiro. Conceder a chave a esses dois papéis
hoje seria transformar "aprova conforme a alçada" em "aprova sempre", que é justamente a classe do achado
Ω6R-SEC-002 com outro papel no lugar do técnico.

Por isso a concessão do 07a é a MÍNIMA: `manager` explícito + `tenant_admin`/`super_admin`/`platform_admin`
por herança do catálogo. finance e inventory ficam de fora **por ausência de modelo**, não por esquecimento.

**Fecha quando:** existir alçada monetária ancorada no agregado (valor da OS/pendência + limite por papel, na
linha do `APPROVAL_LIMITS.md`) e a concessão puder ser condicionada a ela.
- status: ABERTA — MÉDIA. Dono natural: o bloco que introduzir alçada por valor.

## P-O6R-B07A-PROVISIONAMENTO-DA-CHAVE (2026-09-02) — `work_orders:approve` exige migração e 3 snapshots fora do §5 — **BLOQUEIA o merge do 07a**

Registrada sob §A2 (conflito não se consolida em silêncio) pelo dev do 07a, com medição, não com suposição.

O §3.1 do plano manda criar a chave `work_orders:approve` no catálogo em CÓDIGO. Medido no head `c421f9f`,
acrescentar a chave torna **quatro** verificações vermelhas, e **as quatro vivem fora do §5 PERMITIDO do
próprio plano**:

1. `tests/permission-catalog-migration-parity.test.ts` — *"Permissão nova no catálogo e SEM migração de dados:
   work_orders:approve"*. Exige uma migração aditiva em `prisma/migrations/`, no padrão
   `20260861000000_grant_checklist_run_reopen_permission`. **`prisma/**` é PROIBIDO INTEIRO no §5** ("zero
   migration neste bloco"). A válvula de escape (acrescentar a chave a `PERMISSOES_HERDADAS_DO_SEED`) está
   **fechada por medição**: a lista tem 189 chaves e `TAMANHO_CONGELADO` é 189 — crescer reprova o próprio
   guard, que documenta em voz alta que essa lista "NÃO CRESCE".
2. `tests/core-saas.test.ts` — literal `expectedPermissionCatalog` (l.48). Uma linha após
   `"work_orders:mileage_correct"`.
3. `tests/fixtures/role-catalog-contract.snapshot.json` — snapshot papel→permissões consumido por
   `tests/core-saas-role-authority.test.ts` (que **não** é o `-db` do ciclo 5).
4. — (o quarto vermelho é de D3, registrado na pendência seguinte.)

O §3.10 do plano previu o caso ("se a paridade RBAC persistente exigir seed, o seed correspondente entra no
diff do 07a"), mas nomeou **seed** — e `prisma/seed.ts` também é `prisma/**`. Não há caminho dentro do escopo
declarado: o plano pede a chave e proíbe o único lugar onde ela pode ser provisionada.

**Decisão pendente (do orquestrador/junta, não do dev):** (a) ampliar o §5 do 07a para os 3 arquivos + a
migração; ou (b) mover D1 para sub-bloco próprio com escopo que os inclua. O código de D1 já está escrito e a
prova de papel (6 casos + vermelho-controle) já está verde.
**FECHADA no próprio 07a (2026-09-02).** A decisão pendente foi resolvida pela **EMENDA E1** do plano, que
escolheu a opção (a) — ampliar o §5 de forma **nominal e fechada** — e rejeitou a (b) com quatro razões, a mais
forte sendo que mover o D1 para PR próprio obrigaria a **desfazer código pronto e provado**, que é a classe
medida pela `D-JUNTA-SEPARACAO-DE-PAPEIS`. **O instrumento é MIGRAÇÃO, não seed** — quem prescreve é o próprio
guard (mensagem + `PADRAO_A_SEGUIR`), e `prisma/seed.ts` itera o `PERMISSION_CATALOG`, de modo que a mudança do
catálogo flui ao seed sozinha; produção nunca semeia. **Entregue:**
`prisma/migrations/20260871000000_grant_work_orders_approve_permission/migration.sql` (diretório NOVO, aditivo e
idempotente, com runbook de `down`), mais a linha do literal em `tests/core-saas.test.ts` e a chave nos 4 arrays
de `tests/fixtures/role-catalog-contract.snapshot.json`. **Evidência de fechamento, re-executada no head
`73a351c` por agente que não a implementou:** `permission-catalog-migration-parity` **3/3, skipped 0, `ec=0`**;
`permission-catalog-db-parity` **2/2, skipped 0, `ec=0`** com `RBAC_DB_PARITY=1` e banco semeado; num banco
**só-migrado, sem seed**, `select key from permissions where key='work_orders:approve'` devolve a chave (quem
inseriu foi a migração); num banco semeado, os grants caem em **manager, super_admin, tenant_admin** e em mais
ninguém. `PERMISSOES_HERDADAS_DO_SEED` **não cresceu** (segue 189). Suíte canônica **255 arq · 2647 · pass 2645
· fail 0 · skipped 2**, `ec=0` — as três vermelhas desta pendência fecharam e nenhuma nova nasceu.
- status: FECHADA — o bloqueio do merge do 07a cai por esta entrega. Severidade: ALTA. Dono: B-O6R-07a.

## P-O6R-B07A-STICKY-409-VIRA-403 (2026-09-02) — o escopo por objeto muda o código de um teste fora do §5 — **BLOQUEIA o merge do 07a**

`tests/work-order-checklists-sticky.test.ts:612` assere que um `field_technician` que desvia pelo update
genérico com corpo `checklists` recebe **409 `checklist_set_requires_endpoint`**. Com o guard de escopo por
objeto do §3.3, esse mesmo ator (não atribuído àquela ordem) passa a receber **403 `WORK_ORDER_NOT_ASSIGNED`**.

**Não é regressão — é a porta fechando antes.** A intenção declarada do teste ("o desvio pelo update genérico é
porta fechada, não 200") continua satisfeita; muda só o código, porque um controle mais forte passou a disparar
primeiro. **A ordem não é escolha de estilo:** o 409 é lançado dentro de `applyChecklistSelectionOnUpdate`, que
é o ponto de ESCRITA do conjunto (`rewriteChecklistSet`) — medido. Pôr o guard de autorização depois dele seria
autorizar depois de gravar.

O arquivo **não está no §2.5** do plano (a lista de testes que o dev pode editar), então o dev parou e devolveu
em vez de ajustar. Correção necessária: **uma asserção**, `409 → 403`, com a razão `not_assigned_to_actor`.
**FECHADA no próprio 07a (2026-09-02) — E COM CORREÇÃO DE RUMO: o título desta pendência ficou INVERTIDO.**
O sticky **não virou 403**; ele **VOLTOU a 409**. O que a **EMENDA E2** mediu é que renumerar as asserções
consertaria o sintoma e **mutilaria o caso**: com as três requisições em 403, todas morreriam no guard de
escopo, e a cobertura declarada (o desvio pela rota genérica com papéis REAIS do catálogo, fechado pelo
SERVIÇO) desapareceria em silêncio — nenhum teste HTTP provaria mais a porta única do conjunto. **O defeito
era do ARRANJO do teste, não do guard:** o arranjo nunca atribuiu a OS a ninguém. Entregue: bloco de arranjo
novo (perfil de operador + `POST /work-orders/:id/assign` + `tecnicoHeaders`), as três requisições passando a
usar um técnico ATRIBUÍDO, e as 2 linhas que a E1 havia autorizado **REVERTIDAS ao texto byte-exato pré-E1**
(`git show 2d54ea2:...`). l.620 fica **409** e l.628 fica **200** — este é o ponto da emenda. Zero linha de
`src/**`: o contrato de produto (403 `not_assigned_to_actor` para ator de campo não atribuído) **não muda**.
**Fundamento, medido e não preferido:** `RBAC_MATRIX.md:45` já dizia `field_technician =
execute/update-assigned` — o guard **cumpre** a matriz; o **200 antigo é que a contrariava**. **Evidência de
fechamento:** `tests/work-order-checklists-sticky.test.ts` **15/15, fail 0, skipped 0, `ec=0`** (denominador
inalterado — o arquivo tinha 15 antes), com vermelho-controle registrado no head `a37a9dd` (`14/15`, `403 !==
409`). **Fica com a junta**, e não com esta entrada: a leitura de contrato do F2 (escopo por objeto cobre TODA
mutação do ator de campo, inclusive a edição comum) e a tensão §A2 da semântica de `assigned_operator_id`.
- status: FECHADA — o bloqueio do merge do 07a cai por esta entrega. Severidade: ALTA. Dono: B-O6R-07a.

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

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

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

- **status:** ABERTA · **severidade:** a classificar · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

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

- **status:** ABERTA · **severidade:** a classificar · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

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

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

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

- **status:** ABERTA · **severidade:** a classificar · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

## P-REDIS-DEV-LIXO-DE-FILA (2026-08-15 — achado lateral da junta do PR #353)

O Redis de desenvolvimento desta máquina carrega **42.393 chaves de payload de fila** (`erp:jobs:data:*`) de
suítes antigas, presentes antes de qualquer execução da rodada. Não é resíduo de bloco nenhum e não afeta
veredito, mas com disco escasso (§C5) vale uma faxina **escopada** — é payload de fila, não dado de domínio.
- **Cuidado:** faxina por padrão de chave em base viva já causou incidente nesta rodada. Fazer com escopo
  explícito e contagem antes/depois, nunca por curinga solto.
- status: ABERTA.

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>

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

**FECHADA pelo B-O6R-07a (2026-09-02), como o próprio registro previa (`dono natural: B-O6R-07`).**
`verifyAnonymousCandidate` passa a chamar o **MESMO `incrementFailedAttempts` atômico do B-O6R-01** — nenhum
contador novo, nenhum read-modify-write novo, por exigência do §3.4 do plano — e a falha anônima passa a deixar
**rastro de auditoria**. A RESPOSTA anônima segue **401 uniforme**: o 423 **nunca** vaza por essa via, o que
preserva o anti-enumeração entregue pelo B01. **Trade-off consignado para a junta, não escondido:** armar
lockout por via anônima cria vetor de negação de acesso à conta a custo baixo; mitigações medidas são o TTL de
15 min, o balde por e-mail já existente e o rastro auditável — a alternativa (não armar) mantém força bruta
ilimitada **sem rastro**, que é exatamente o achado. **Evidência de fechamento:** `o6r07a-anon-lockout` **7/7**
e `o6r07a-anon-lockout-db` **6/6**, com **vermelho-controle conjunto** de `13 · pass 4 · fail 9` — e o caso que
reproduz a medição original do `agente-secops` (as 12 tentativas anônimas que não moviam o contador) está entre
as sondas. Os três vermelhos-controle desta trilha foram **refeitos do zero** por agente de identidade nova,
depois de o primeiro dev cair sem gravá-los (`00-quedas.md`).
- **status:** FECHADA · **severidade:** ALTA · **dono:** B-O6R-07a
  <sub>Fechada em 2026-09-02 com evidência executada e vermelho-controle registrado. A triagem SAN2-1 a mantivera ABERTA por padrão conservador; agora há verificação.</sub>

## P-O6R-B01-RELIGACAO-SEM-REMEDIO (2026-08-19) — **ALTA** · assimetria sem via de saída

**Achado por:** `agente-secops`, medido: depois da religação, o titular da conta **provada** perde acesso
direto à própria organização e **não tem caminho** para romper o vínculo que não dependa de credencial de
outra organização da identidade.

**A propriedade que falta:** *"o titular da conta provada numa religação precisa de caminho para romper o
vínculo que NÃO dependa de credencial de outra organização."*

**Dono:** `B-O6R-07` (autorização e anexos) — atribuído em 2026-08-19 por ressalva 2 do porteiro pós-merge do
#357, que apontou esta entrada como órfã. O bloco 07 já mexe na superfície de autorização e no
`Ω6R-SEC-002`/`SEC-003`, e a via de saída da religação é decisão de autorização, não de identidade.
**PR-alvo:** o do `B-O6R-07`, ainda não aberto.

**Não bloqueou** porque a religação exige prova de credencial para acontecer — não é tomada de conta; é
ergonomia de saída. Mas é assimetria real, e o `§5.3` do plano v6 declarava bidirecionalidade que a execução
não entrega inteira.

- **status:** ABERTA · **severidade:** ALTA · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

## P-O6R-B01-LOGERROR-MORTO (2026-08-19) — **ALTA (observabilidade)** · a falha da fonte de candidatos é invisível

**Achado por:** `agente-secops`: `logError` do `AnonymousLoginService` é **código morto** — declarado em
`anonymous-login.service.ts:77`, usado em `:131-135`, e **nenhum** consumidor o lê.

**A propriedade que falta:** *"a falha da fonte de candidatos do login sem organização tem de ser OBSERVÁVEL
na composição que roda em produção"* — log, métrica ou alarme. Sem isso, a sonda de prontidão pode dizer
`inactive` e ninguém saber por quê.

- **status:** ABERTA · **severidade:** ALTA · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

**Dono:** `B-O6R-08` (tarefas duráveis e tempo real) — atribuído em 2026-08-19 por ressalva 2 do porteiro
pós-merge do #357. É o bloco que traz o processo dedicado e o canal de observabilidade que hoje não existe;
consertar o `logError` sem consumidor seria mover o problema, não fechá-lo.
**PR-alvo:** o do `B-O6R-08`, ainda não aberto.

## P-O6R-B01-ROUTE-ERROR-LEAK — **EMENDA de escopo (2026-08-19)**

O escopo registrado no ciclo 2 citava só o `DELETE`. A junta do ciclo 3 **mediu o `GET` da mesma rota**
devolvendo a mensagem **crua do Postgres** no corpo público (`400` com `Raw query failed…`). O escopo real é
a rota inteira, e a causa é o fallback de `sendRouteError` (`http.ts:51-60`), compartilhado por dezenas de
módulos — o que mantém a decisão de tratá-lo como bloco próprio.

- **status:** ABERTA · **severidade:** a classificar · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

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

- **status:** ABERTA · **severidade:** a classificar · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

## P-O6R-ARNES-ISOLAMENTO — **EMENDAS do bloco B-O6R-ARNES (2026-08-28)** — o bloco próprio existiu e rodou

Bloco `B-O6R-ARNES`, branch `fix/o6r-arnes-catalogo-unico` sobre `origin/main` `6efe5ad`. A classe saiu do
`B-O6R-02` por decisão do dono (`D-JUNTA-ESCOPO-E-CALIBRACAO` §5): ela é **anterior** a todos os blocos O6R de
código, e o financeiro foi reprovado no ciclo 4 por um defeito que não criou e estava proibido de consertar.
Registro **apensado**, nunca reescrito (§A2).

### O que FECHA

- **P3 — mecanismo único entre TODAS as criadoras — FECHA.** Os três escritores que rodavam fora do lock
  (`audit-security.test.ts` / `audit_rls_`, `vehicle-identity-schema.test.ts` / `vid_rls_test_`,
  `impound-process-checklist-link-schema.test.ts` / `vid_link_rls_`) passaram a executar **toda** a sequência
  de catálogo dentro de `withRoleCatalogLock`, em janelas curtas. A enumeração de escritores de `tests/**` já
  não tem exceção, e o ratchet perdeu as três razões *"fora do lock — destino: P-O6R-ARNES-ISOLAMENTO"*.

  **O fato que justificou fechar a classe inteira, e não só "trazer os 3 para dentro":** serialização parcial
  não protegia nem os serializados. Bateria barata dos 6 arquivos na base (forma declarada:
  `node scripts/run-backend-tests.mjs` sobre `audit-security` · `auth-identity-backfill-db` ·
  `auth-identity-links-db` · `rls-tenant-isolation` · `vehicle-identity-schema` ·
  `impound-process-checklist-link-schema`; `DATABASE_URL`→:55950, `REDIS_URL`→:56950,
  `CORE_SAAS_PERSISTENCE` não exportada, Node v20.19.5, cluster descartável `arnes-dev-pg` com 103
  migrations), **N=13 PRÉ-correção: 7/13 vermelhas**, todas com `XX000 tuple concurrently updated`, e **1
  queda de denominador (37→32)**. As vítimas incluem **quem TOMAVA o lock**: `rls-tenant-isolation` (3×) e
  `auth-identity-backfill-db` via `createEphemeralRole` (1×) — além de `audit-security` (3×) e
  `vehicle-identity-schema` (3×). **N=13 PÓS-correção: 13/13 ec=0, 0 `XX000`, denominador 37 IDÊNTICO nas 13.**

- **P5 — varredor cobre todo prefixo — AMPLIA** (não fecha). As três famílias novas entraram em
  `SWEPT_ROLE_FAMILIES` com o mesmo corte de 60 min e o mesmo relatório em stderr. Provado nas duas metades
  (recolhe a órfã velha das 3 famílias; **não** toca prefixo não registrado nem timestamp novo). Continua
  valendo o limite já declarado: o varredor depende do RELÓGIO, não do teardown de quem morreu.

  **Efeito medido no vaza-metro:** 10 rodadas completas da canônica 3 terminaram com **Δroles = 0 em todas** e
  **nenhuma role nova ao fim** — contra as **2 órfãs com LOGIN e INSERT/UPDATE/DELETE em todas as tabelas**
  (inclusive `financial_entries`) que o ciclo 4 mediu em 10 rodadas.

- **P8 — "verde em N execuções" não é prova sem N e forma — ATENDIDA NESTA TRILHA.** Todo número publicado por
  este bloco carrega comando, forma, env, versão do Node e N. Não é o fechamento do P8 como propriedade do
  repositório; é o cumprimento dele nesta entrega.

### O que PERMANECE aberto aqui

P1 (paralelismo não declarado) · P2 · P4 (DDL de esquema compartilhado — `checklist-applicability`) · P6 · P7
(divergência entre as três formas) · teto da fila do lock (35–41 s a 2× contenção) · prefixos legados · dados
de fixture órfãos do aborto duro (o varredor cobre **roles**; organizações/usuários deixados por `SIGKILL`
seguem sem caminho de remoção) · `P-O6R-B02-SUITES-LIST-CI`.

- **status:** ABERTA · **severidade:** a classificar · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

## P-ARNES-RLS-TEST-FORA-DO-SWEEP (2026-08-28 — B-O6R-ARNES, C-C) — MÉDIA · decisão CONSCIENTE, não esquecimento

**Estado:** ABERTO · **Dono:** junta, junto do destino dos prefixos legados.

A família `rls_test_` **não** entrou no varredor, embora seja a de maior volume: há **68 órfãs vivas** dessa
família na base do dono, todas com LOGIN. Um sweep que as alcançasse seria exatamente a classe do **incidente
de mass-delete de 26/07** caso alguém apontasse `DATABASE_URL` para a base errada — a diferença entre "limpo o
meu lixo" e "apago 68 objetos que não sei de quem são". As cinco famílias com dono conhecido entraram
(`o6r_b01_`, `o6r_clone_owner_`, `audit_rls_`, `vid_rls_test_`, `vid_link_rls_`); esta ficou de fora **por
escrito**, com contraprova permanente (o caso do prefixo não registrado prova que o varredor não adivinha de
quem é o lixo).

**O que falta decidir:** se as 68 legadas são recolhidas por uma rotina única e supervisionada (fora do lote de
teste) ou se a família entra no sweep depois de a base do dono ser limpa uma vez à mão.

### APENSO 2026-08-31 — bloco `SAN2-4b` (correcao C3): a familia entrou no sweep; **as 68 seguem CARREGADAS**

**A entrada acima fica intocada, e esta pendencia permanece ABERTA.** O que a correcao C3 muda e o
**calculo** dela, nao o seu estado: o que resta decidir e o mesmo de antes — o destino das **68 orfas
vivas na base do dono**.

**O que a medicao 3 do `SAN2-4a` apurou e esta entrada nao registrava: a exclusao era DUPLA.** (a)
`rls_test_` estava fora de `SWEPT_ROLE_FAMILIES` — a decisao consciente que esta pendencia ja
registrava; e (b) `sweepOrphanEphemeralRoles` tinha **chamador unico** (`createEphemeralRole`), e o
criador da familia (`tests/rls-tenant-isolation.test.ts`) importava apenas `withRoleCatalogLock` —
**nunca invocava o sweep**. Fechar so a porta (a) nao mudaria nada observavel: com a familia registrada
mas sem chamador no criador, rodar o criador sozinho continuaria sem varrer nada. Origem:
`medicao-3-censo-roles.md` §F6.3 / §F8.2 / §F9.

**O que a correcao C3 fez (commit `ecfdb24`) — as duas portas no MESMO commit.** A familia `rls_test`
entrou em `SWEPT_ROLE_FAMILIES`, **e** o criador passou a invocar o varredor sob o `withRoleCatalogLock`
que ja detinha, antes do `CREATE ROLE`. A ancoragem (`^` no regex, `LIKE` por prefixo), que ja separava
`vid_rls_test_` de `rls_test_`, **nao** foi tocada. **Prova:** orfa sintetica retrodatada 2 h
**sobrevivia 2/2** nas duas portas antes e passou a ser **recolhida 2/2** depois; vermelho-controle
`audit_rls_` recolhido **2/2** (prova de que o sweep rodou mesmo); prefixo **nao registrado**
sobrevivendo **2/2** (contraprova anti-mass-delete); e `rls_test_` da **rodada corrente** sobrevivendo
**2/2** (o corte de 60 min protege os processos irmaos). Mutacao de **uma metade de cada vez** confirmou
o §F6.3: com meia correcao a orfa sobrevive **2/2** em cada metade. Diario:
`votos/SAN2-4b/dev-c3-sweep.md`.

**Consequencia para o calculo desta pendencia.** De agora em diante, orfa **nova** da familia morre em
**<=60 min** a partir de qualquer suite-gatilho — e os gatilhos passaram de **5 para 6**, porque o
proprio criador virou um. Os cinco medidos: `auth-identity-backfill-db`, `auth-identity-link-events-db`,
`auth-identity-role-real-db`, `auth-login-candidates-fn-db` e `db-catalog-write-guard` — este ultimo
achado pela **errata C2-A2** apensa a medicao-3 §F6.3 (eram *cinco* gatilhos, nao quatro, com 8 chamadas
de `createEphemeralRole`).

**O que este bloco NAO fez, e a razao.** **As 68 continuam CARREGADAS — nao foram recontadas, nem
lidas.** O §5.2 do `SAN2-4b-plano.md` proibe **qualquer** comando em `erp-postgres`/`erp-redis`,
**inclusive leitura**; todo o trabalho do bloco rodou em cluster descartavel (`:56432`). O dono
designado pela medicao 3 (O-3) e **a junta desta pendencia**, em recontagem **supervisionada e so
`SELECT`** — e toda orfa e **datavel pelo proprio nome**, que embute `Date.now()`, sem consultar
catalogo. O numero **68** segue sendo o de 18/08 e **nao** foi re-verificado por este bloco.

**Assinatura e genese, medidas (M3-O-5).** 5/5 orfas produzidas deliberadamente sairam identicas: com
`LOGIN`, **sem expiracao**, **460 grants = 115 tabelas x 4** — a mesma assinatura das 68. A genese foi
reproduzida por `SIGKILL` na janela de ~70% do tempo de vida do processo (1883-1970 ms), quando o
`finally` do teardown ainda nao rodou.

**Risco residual que a junta dona precisa pesar (§7.3 do plano).** Registrar a familia no sweep **nao**
toca a base viva agora, mas cria um vetor **futuro**: uma violacao de `DATABASE_URL` que aponte uma
suite-gatilho para `erp-postgres` varreria as 68 (todas com mais de 60 min) **antes** de a junta as
datar e contar. Seria perda de **evidencia**, nao de dado de produto (sao roles de arnes), e a datacao
vive nos nomes. O mesmo vetor de violacao **ja** varreria hoje as outras cinco familias: a correcao
**nao cria** o vetor — iguala a `rls_test_` as irmas, que era a assimetria que a medicao 3 nomeou. Se a
junta preferir **sequenciar** (recontar antes de manter a familia registrada), o voto dela o diz.

**Armadilha de nomenclatura (M3-O-4), fechada como registro + drill.** `rls_test_` e **substring** de
`vid_rls_test_`; quem varrer por substring em vez de **prefixo ancorado** recolhe a familia irma. A
ancoragem ja existia e agora fica **exercitada por execucao para sempre**: a familia nova entrou nos
dois drills PD de sweep de `tests/db-catalog-write-guard.test.ts` (recolhe-o-que-deve /
nao-toca-no-que-nao-deve), **sem `test()` novo** — o laco e interno, e o denominador do guard nao se
moveu.

**Registro canonico das medicoes:** os diarios de
`agent-orchestration/omega/juntas/votos/SAN2-4a/` (`medicao-1-authority-portal.md`,
`medicao-2-bateria-barata.md`, `medicao-3-censo-roles.md`), e **nao** um consolidado em
`omega/medicoes/`.

## P-ARNES-VAZAMENTO-LINEAR-IDENTIDADES — **ATRIBUÍDO POR EXECUÇÃO** (2026-08-28, B-O6R-ARNES) — fora do escopo deste bloco

O vaza-metro da canônica 3 mede, em toda rodada, **+5 `auth_identities` e +5 `auth_identity_link_events`** —
o mesmo vazamento linear que o ciclo 4 registrou sem atribuição completa. **Atribuído aqui por execução
isolada minha**, no cluster descartável, forma `node scripts/run-backend-tests.mjs <arquivo>`:

| Arquivo | Δ por execução | Evidência |
|---|---|---|
| `tests/core-saas-prisma.test.ts` | **+4 / +4** | 2 execuções isoladas, linear (67→71→75→79) |
| `tests/core-saas-role-authority-db.test.ts` | **+1 / +1** | 3 execuções isoladas, linear (61→62→63→64) |
| **soma** | **+5 / +5** | **bate exatamente com o residual medido na canônica 3** |

Contraprova: os outros **14** candidatos -db medidos isoladamente deram **0** (`auth-identity-backfill-db`,
`auth-identity-links-db`, `auth-identity-revocation-db`, `auth-identity-role-real-db`,
`auth-identity-link-events-db`, `auth-login-candidates-fn-db`, `auth-login-anonymous-db`,
`core-saas-persistence-restart-db`, `persistent-rbac-middleware`, `auth-prisma`, `auth-login`, `auth-session`,
`persistent-rbac-authorization`, `sessions-admin`, `authority-portal-rls`, `owner-portal-rls`). E a canônica 2
(lista `SUITES` do `ci.yml`, que contém `core-saas-role-authority-db` mas **não** `core-saas-prisma`) mede
exatamente **+1/+1** por rodada — o que fecha a conta pelos dois lados.

**Não consertado, e por quê:** os dois arquivos estão **fora da §5** deste bloco; `core-saas-role-authority-db`
é nominalmente PROIBIDO no plano (a atribuição é do `B-O6R-02` ciclo 5). Fica NOMEADO, com a medição pronta
para quem receber a classe. O mecanismo já está descrito na `P-O6R-B01-TRILHA-ORFA-LIMPEZA`: o caminho de
produção normaliza o par do token preguiçosamente (`normalizePairIdentity`, por desenho) criando vínculo +
evento na trilha append-only, e o teardown apaga o tenant sem conhecer a trilha.

- **status:** ABERTA · **severidade:** a classificar · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

## P-ARNES-CANONICA1-VERMELHO-AMBIENTAL (2026-08-28 — B-O6R-ARNES) — pré-existente, NOMEADO, fora do escopo

**Dono:** próximo bloco que tocar `tests/core-saas-role-authority.test.ts` ou o gate de `DATABASE_URL` das
suítes não-`-db`. **PR-alvo:** ainda não aberto.

Canônica 1 (`npm test` **sem** `DATABASE_URL`, N=3, Node v20.19.5): **ec=1 nas 3**, denominador **2359
IDÊNTICO nas 3**, **58 pulos declarados** idênticos, e o piso de denominador **dispara 1 vez, nomeando este
mesmo arquivo** — o pulo declarado **não** cai nele (os 58 passam limpos), que é o que mantém esta forma
utilizável; o que cai é o arquivo que morre no LOAD sem registrar teste nem declarar skip.

> **CORRIGIDO em 2026-08-28 (bloco de registro).** O texto mergeado no #359 dizia denominador **2358** e
> **piso 0**. Os dois vinham de medição em commit intermediário, anterior a `1676a5b` — o commit que abriu os
> olhos do piso para dentro do repo. A junta corrigiu o denominador para 2359 na frase vizinha e **esqueceu
> esta**; a reexecução independente do porteiro pós-merge no head final mede 2359 e o piso disparando
> (achado C de `omega/juntas/votos/B-O6R-ARNES/00c-porteiro-pos-merge-359.md`). É a mesma classe de defeito
> que a junta pegou — corrigir um número e deixar o gêmeo vivo ao lado.

O vermelho é **sempre o mesmo arquivo**: `tests/core-saas-role-authority.test.ts` (sem sufixo `-db`).
**Causa medida, não inferida:** ele importa — transitivamente — `src/database/prisma.ts`, que **lança no LOAD
do módulo** quando `DATABASE_URL` está ausente (`Error: DATABASE_URL is required to initialize Prisma
Client.`, `src/database/prisma.ts:12`). O arquivo não é DB-gated e não declara skip, então sem banco ele
**quebra** em vez de pular.

**Pré-existência provada:** `git diff 6efe5ad HEAD` é **vazio** para esse arquivo e **vazio** para `src/`
inteiro. Nada neste PR o alcança. **Consertá-lo é PROIBIDO aqui** (§10.3 do plano — bloco irmão): ou ele ganha
o gate de `DATABASE_URL` como as suítes `-db`, ou deixa de importar Prisma no load. Decisão de quem receber.

- **status:** ABERTA · **severidade:** a classificar · **dono:** declarado acima
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

## P-ARNES-DIVERGENCIA-RUNNER-SUMICO-NAO-EXISTE-NA-MAIN (2026-08-28) — divergência do plano, registrada ANTES de consolidar (§A2)

O plano (§12) mandava **fechar** `P-O6R-B02-RUNNER-SUMICO-SEM-SKIP` com este PR. **Medido:** essa pendência
**não existe na base deste bloco**. `grep -c` em `agent-orchestration/controle/pendencias.md`: **0** em
`origin/main` `6efe5ad` (2973 linhas) e **presente** na árvore `demo/investidor` (3128 linhas) — ela nasceu em
28/08 na trilha de orquestração, que tem 33 commits sem PR para a main.

**O que fiz, e por quê:** não fabriquei na main um registro histórico que nunca existiu lá, e não fechei em
silêncio uma pendência ausente. A **correção** que ela pedia foi entregue e provada (C-E + D40); quem
reconciliar a trilha `demo/investidor` com a main deve marcar a pendência como fechada **lá**, apontando para
este PR. O defeito, não o registro, é o que importa — e o defeito está fechado.

**A correção entregue:** piso de denominador no `scripts/run-backend-tests.mjs`. Arquivo expandido que termina
sem registrar teste e **sem declarar skip** é ERRO que **NOMEIA o arquivo**. Assinatura usada (medida no Node
v20.19.5): arquivo que não registra teste ganha um ponto TOP-LEVEL cujo NOME é o CAMINHO do arquivo, com
`# suites 0`; arquivo com testes não ganha ponto de arquivo. Piso ESTRUTURAL, não por contagem fixa.

**D40, mesma fixture e mesmo comando nas duas pontas:** ANTES (F0(b), pré-correção) `ec=0`,
`"2 arquivo(s) · 3 teste(s) · pass 3"`, guard mudo; DEPOIS `ec=1` com `PISO DE DENOMINADOR` nomeando o
arquivo. Pulo DECLARADO **não** cai no piso — caso permanente próprio, e a canônica 1 confirma em execução
real: os **58 pulos declarados não caem no piso**, e o piso dispara 1 vez nomeando
`tests/core-saas-role-authority.test.ts`, que morre no LOAD sem declarar skip. [Frase corrigida em 2026-08-28
pelo bloco de registro — o "piso 0" original media commit intermediário; ver `P-ARNES-CANONICA1-VERMELHO-AMBIENTAL`.]

**Fechamento (2026-09-02 — B-O6R-02 ciclo 5, F6):** o ask desta divergência cumpriu-se — a pendência
`P-O6R-B02-RUNNER-SUMICO-SEM-SKIP` agora EXISTE na linha publicada (chegou pela rodada SAN2) e foi marcada
**FECHADA apontando o #359** como autor da correção, com o resíduo carvado em pendência própria
(`P-O6R-B02-CRASH-NO-LOAD-SEM-SKIP`). Nenhum histórico foi fabricado: a entrada e o fechamento carregam as
datas e os autores reais.

- **status:** FECHADA (2026-09-02, PR do B-O6R-02 ciclo 5 — o ask se cumpriu) · **severidade:** MEDIA · **dono:** B-O6R-02 c5
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

## P-ARNES-DIVERGENCIA-KPI-APP-JS-FORA-DA-§5 (2026-08-28) — divergência do plano, registrada ANTES de consolidar

A §5 lista `Kpis/kpis-latest.json`, `kpis-history.json`, `kpis-history.md` e `index.html`, mas **não**
`Kpis/app.js`. Acontece que a cópia congelada do painel (o fallback de `file://`) mora dentro do `app.js`, e o
guard permanente `tests/kpi-dashboard-charts.test.ts` **compara as duas** — atualizar o JSON sem reinjetar
deixa a bateria vermelha, por desenho (`D-KPI-INDEX-PAINEL`: o número nunca mora em dois lugares divergentes).

**O que fiz:** rodei o gerador do próprio repositório, `node scripts/kpi-freeze.mjs` — a cópia é **gerada,
nunca digitada**, e o diff em `app.js` fica restrito à linha `var FROZEN = …`, conferível. Não editei lógica
do painel. `Kpis/index.html` **não** precisou mudar: ele hidrata dos JSON em runtime e este bloco não inaugura
dimensão nova de métrica (§C3) — não mexer nele é a opção honesta, não uma omissão.

- **status:** ABERTA · **severidade:** a classificar · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

## P-ARNES-AUTO-DEFEITOS-DO-PROPRIO-BLOCO (2026-08-28) — DOIS achados por execução CONTRA a própria correção

Registro honesto da classe que a `D-JUNTA-SEPARACAO-DE-PAPEIS` descreve — desta vez apanhada **duas vezes**
dentro da própria correção, e nas duas quem pegou foi **execução**, não releitura.

**(1) O `.catch(() => undefined)` renasceu na correção.** Os casos -db novos nasceram com o **mesmo
anti-padrão** que este bloco removeu de `vehicle-identity-schema` e `impound-…`. Não ficou como hipótese:
durante o **D43** a mutação fez `ORPHAN_ROLE_NAME_PATTERN` deixar de casar `audit_rls_*`,
`dropSyntheticOrphanRole` lançou o assert de namespace, o catch engoliu, e **uma role `audit_rls_*` ficou viva
no cluster sem que nada dissesse**. Quem a encontrou foi o **vaza-metro**. Corrigido no mesmo PR
(`limparOuGritar`: reporta no stderr e não mascara o erro original do `finally`); depois da correção, roles no
cluster **antes=0 / depois=0**.

**(2) O piso de denominador nasceu CEGO exatamente dentro de `tests/`** — o mais grave. A 1ª versão comparava
o nome do ponto de arquivo do TAP **apenas** com a forma passada ao `node --test`. Para alvo dentro do
repositório o runner encurta para **relativo** (`shortenPath`), mas o `node --test` nomeia o ponto de arquivo
pelo **absoluto**: as duas formas nunca batiam. **Por que os drills não pegaram:** a fixture do D40 morava em
`os.tmpdir()`, **fora** do repositório — o único arranjo em que as duas formas coincidem. O drill provava o
mecanismo justamente onde o defeito não aparece. **Quem pegou foi a canônica 1**, ao reportar
`not ok 84 - C:\…\tests\core-saas-role-authority.test.ts` para um alvo passado como
`tests\core-saas-role-authority.test.ts`. Corrigido (o mapa carrega as duas formas) + **caso permanente novo
com fixture DENTRO do repositório**, sob `test-results/` (gitignored), que é o único arranjo que exercita o
`shortenPath`. Drill D40b: remover a forma absoluta deixa **dois** casos vermelhos.

**A lição, para a ata:** um drill cuja fixture não reproduz o arranjo real prova o mecanismo, não a
propriedade. Os dois auto-defeitos nasceram em correção, nenhum no código original — exatamente o que a
decisão do dono prevê.

---

- **status:** ABERTA · **severidade:** a classificar · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

## Registros do ciclo 4 do `B-O6R-02`, reconciliados da trilha para a `main` (2026-08-28)

> Estas entradas nasceram em 25–28/08 na branch `demo/investidor` e **nunca existiram na `main`**. O bloco
> `B-O6R-ARNES` tropeçou exatamente nisso: o plano dele mandava *fechar* a `P-O6R-B02-RUNNER-SUMICO-SEM-SKIP`
> e ela **não existia na base** — o dev registrou a divergência em vez de fabricar histórico
> (`P-ARNES-DIVERGENCIA-RUNNER-SUMICO-NAO-EXISTE-NA-MAIN`). O ciclo 5 do financeiro referencia as nove
> `P-O6R-B02-*` como insumo; sem esta reconciliação ele repetiria o mesmo tropeço.

## P-O6R-B02 — CICLO 4 REPROVADO 4×1 (2026-08-28) — a classe que reprova é de ARNÊS, não de dinheiro

Ata `agent-orchestration/omega/juntas/J-B-O6R-02-ciclo4.md`; relatório do achador
`agent-orchestration/omega/reprovacoes/R-B-O6R-02-ciclo4.md`; votos verbatim em `omega/juntas/votos/B-O6R-02-ciclo4/`.
Head `12c3825`. **Fechado por execução independente:** B-1 (corrida `delete×reverse`) não fabrica dinheiro em nenhuma
camada/ordem/intercalação — 3 cadeiras, 590+140+66 iterações, saldo 0; C2/C3/C4/C5 confirmados. **Reprova:** a cadeira
do arnês — o número publicado da canônica 3 (`2745/2743/0/2`) é o desfecho de **7/10** rodadas (`XX000 tuple concurrently
updated` em `CREATE ROLE`, `audit-security.test.ts:158` ×2 e `auth-identity-fixture.ts:150`), denominador **2740×2745**
numa rodada, **2 roles órfãs com LOGIN+DML nas 115 tabelas** persistindo, +5 `auth_identities`/rodada. É a classe
pré-existente `P-O6R-ARNES-ISOLAMENTO`, agora medida **dentro** da forma canônica com N=10.

**Próximo passo (§C7.4, ciclos 4–5):** junta ampliada replaneja a fatia — plano novo (Fable), crítico e jurados com
**identidade nova** (pool esgotado). Deliberação obrigatória por escrito: fechar a classe do arnês dentro do B-O6R-02 ou
destacar bloco próprio e publicar o número com N e forma honestos. Parada + dossiê ao dono **só** após o ciclo 5 falho.

### Pendências nomeadas pelo ciclo 4 (ajustes A1–A8 da ata; sem correção proposta)

- **status:** ABERTA · **severidade:** a classificar · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

## P-O6R-B02-OVERCLAIM-ORFA-SQL-CRU (2026-08-28 — cadeira de ataque, ajuste A1) — MÉDIA
`API_CONTRACTS.md` l.426–428 (head `12c3825`) e o cabeçalho de `20260870000000_add_reversal_pair_atomicity` afirmam *"impossível
por construção, mesmo para escritor que não passa pelo serviço"*. Medido: `DELETE` físico do original com estorno vivo é
**aceito** (rows=1; `GET /financial-accounts/:id/balance` = 100, correto 0) e `UPDATE id` do original deixa a contrapartida
pendurada (DELETE HTTP legítimo do renomeado → 200, saldo 100). Não há FK em `reversal_of`; trigger A é só BEFORE UPDATE.
Nenhuma rota do produto faz DELETE físico (grep em `src` = 0) — é **defeito de TEXTO e de guarda ausente**, não de caminho do
produto. Propriedade a decidir: o contrato só pode afirmar o que os triggers garantem.

**Fechamento (2026-09-02 — B-O6R-02 ciclo 5, F4/F6):** as duas portas cruas fecharam **por construção** —
FK composta `financial_entries_reversal_pair_fk` (migration `20260871000000_add_reversal_pair_fk`,
`(tenant_id, reversal_of) → (tenant_id, id)` `ON DELETE/UPDATE RESTRICT`), sondas (v)/(vii) recusadas com
`23503` em casos permanentes `[C9/P13]` da suíte -db, vermelho-controle provado no down (D35: só os 2 caem,
`pg_constraint` 5→4→5). E o TEXTO passou a afirmar só o que triggers+FK sustentam: contrato re-versionado
`financial_entry_undo@2026-09-02.b-o6r-02-c5`, com o limite que resta NOMEADO (`UPDATE amount`/`account_id`
cru, DELETE físico da contrapartida — nenhum desenho de par os fecha).

- **status:** FECHADA (2026-09-02, PR do B-O6R-02 ciclo 5; nº no backfill pós-merge) · **severidade:** MEDIA · **dono:** B-O6R-02 c5
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

## P-O6R-B02-TESTE-RLS-SUPERUSER (2026-08-28 — cadeira de banco, ajuste A2) — MÉDIA
O teste `[C1/P9][db][RLS] estorno LEGÍTIMO sob o contexto RLS do app: trigger enxerga o original vivo` roda como `postgres`
(`rolsuper=t`, `rolbypassrls=t`) no local, na CI (`ci.yml` `postgres:postgres`) e no compose — e **passou com os triggers
derrubados** (controle DOWN: ok 6). O título afirma o que a execução não sustenta (classe do C5). A propriedade trigger×RLS
**é verdadeira** — provada pelo jurado com role `NOBYPASSRLS` sob RLS forçada ((c1)(c2)(c4) P0001 DIN-002; (c3) legítimo comita).

**Fechamento (2026-09-02 — B-O6R-02 ciclo 5, F5):** o caso foi REFORMULADO — `[C10/P14][db][RLS real]` roda
sob papel efêmero `NOBYPASSRLS` criado pelo mecanismo único do arnês (`createEphemeralRole`, sem editar o
fixture), com a postura asserida por execução (`pg_roles` f/f), a política provada mordendo (0 linhas sem
contexto / 1 com) e as DUAS portas de órfão recusando `Ω6R-DIN-002` sob a política. Drill D34 provado nas
duas pontas: triggers no down → o caso fica VERMELHO (no ciclo 4 ficava verde); re-up → 9/9.

- **status:** FECHADA (2026-09-02, PR do B-O6R-02 ciclo 5; nº no backfill pós-merge) · **severidade:** MEDIA · **dono:** B-O6R-02 c5
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

## P-O6R-B02-DIVERGENCIA-D27-D21 (2026-08-28 — cadeira de validação, ajuste A3) — BAIXA (registro §A2)
**D27 como enunciado no plano é insatisfazível** (remover a chamada do construtor = mutante equivalente: 87/87 verde; a
propriedade do parecer #2 foi provada por outra via — M2 corpo do guard → exit 1; M3 estado perigoso real → 2 fails).
**D21**: uma ordem de disparo fica verde sob a mutação (não determinística — HTTP delete-first para o dev, memória
delete-first para o validador/ataque) enquanto o plano exige "as DUAS ordens" vermelhas; a suíte -db pega a mutação nas duas
ordens deterministicamente. As duas divergências estavam **só no corpo dos commits** `b7de4c9`/`db5b047`; ficam registradas aqui
e na ata para que ninguém herde "D27/D21 vermelhos como escritos" como fato.

- **status:** ABERTA · **severidade:** BAIXA · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

## P-O6R-B02-BATERIA-CANONICAS-1-2 (2026-08-28 — validação, ajuste A4) — MÉDIA
O KPI do ciclo 4 publica só a canônica 3 e os focados; **canônicas 1 e 2** (§9.2, §9.6 — N≥15, denominador constante) não
foram executadas/publicadas pelo dev. Validador mediu N=1: canônica 1 = 2465/2400/**1 fail ambiental** (`core-saas-role-authority`
inicializa o Prisma Client após o skip sem `DATABASE_URL` — pré-existente)/64 skip; canônica 2 = 194/194, 0 skip, 0 hits
`unhandledRejection|XX000|23505|40P01`. Falta a publicação com N e forma, não há número falso.

**Fechamento (2026-09-03 — B-O6R-02 ciclo 5, F6; registro completado após o ACHADO-2 do
`critico-c5-adversarial`, que mediu esta entrada como o ÚNICO dos 7 itens do §12 sem fechamento no
head).** As duas canônicas foram executadas e publicadas com N e forma neste PR: **canônica 1** — `npm
test` sem `DATABASE_URL`, **N=3**, com o vermelho ambiental DECLARADO por nome
(`core-saas-role-authority`, que o piso de denominador do #359 nomeia); **canônica 2** — `db:seed` + as
**34** suítes da lista `SUITES` extraída do `ci.yml` do head, **N=15**, `15/15 ec=0`, denominador **225
constante**, 0 hit de `unhandledRejection|XX000|23505|40P01`. Ambas em cluster descartável próprio, Node
v20.19.5, 106 migrations, com a forma declarada no KPI e no diário (B.2, B.5). A substância foi
re-medida de forma independente pelo crítico (A10 do parecer).

- **status:** FECHADA (2026-09-03, PR do B-O6R-02 ciclo 5; nº no backfill pós-merge) · **severidade:** MEDIA · **dono:** B-O6R-02 c5
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

## P-O6R-B02-SUITES-LIST-CI (2026-08-28 — validação A5 + arnês #6) — MÉDIA
`tests/financial-entry-delete-reverse-race-db.test.ts` (corrida em Postgres real, 2 ordens + SQL cru + barrier + RLS) **não
está na lista SUITES do job `backend-postgres`** do `ci.yml` (0 hits no head; denominador da canônica 2 = 194 sem ela). Roda só
pela canônica 3 (job `backend`) e isolada. `ci.yml` era PROIBIDO no ciclo 4 (§5) — a inclusão é pendência nomeada, não emenda.

- **status:** ABERTA · **severidade:** MEDIA · **dono:** **o PR que mergear o `B-O6R-02`** (ciclo 5 do financeiro) — re-atribuído em 2026-08-30 pelo `SAN2-2`, ver apenso abaixo
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

### Apenso de 2026-08-30 (`SAN2-2`, Fase 2 — `02ced85`): parte entrou, o resto tem dono

**A pendência continua ABERTA, e isso é o resultado certo** — não se fecha o que não se pode executar.
O que mudou é que ela deixou de ser um item sem dono.

**O que ENTROU.** A Fase 2 do `SAN2-2` levou para a lista curada do job `backend-postgres` **4 suítes `-db`
que existem na `main` e estavam fora dela**: `impound-custody-history-db`, `vehicle-identity-merge-db`,
`work-order-checklists-freeze-links-db` e `work-order-checklists-sticky-db`. Rodavam só no job `backend`,
onde a **única** condição de skip delas é a ausência de `DATABASE_URL` — ou seja, se o env quebrasse, elas
pulavam **em silêncio** e o job ficava verde. É a classe verde-cego que a lista curada e o guard de zero
pulos existem para punir. Cada uma foi **medida antes de entrar**: 3 execuções em Postgres descartável, nas
condições exatas do job, **0 falha e 0 pulo nas 3**, denominador constante — **3 + 5 + 6 + 8 = 22 casos**.
Intermitência desqualificaria a linha; nenhuma teve.

**Lista `SUITES` de 23 → 27**, conferido nesta fase pela régua da linha de atribuição:

```
$ git show 02ced85^:.github/workflows/ci.yml | grep -cE '^\s*SUITES='   -> 23
$ git show 02ced85:.github/workflows/ci.yml  | grep -cE '^\s*SUITES='   -> 27
```

> **Nota de régua (a primeira medição estava errada e fica registrada).** `grep -c "test.ts"` no mesmo par de
> arquivos dá **24 → 29**, porque casa ocorrências fora do bloco `SUITES`. Os dois pares são "verdadeiros"
> para réguas diferentes, e é por isso que a régua vai escrita junto do número — a mesma disciplina que o
> cabeçalho deste arquivo cobra do "97 antes / zero hoje".

**O que NÃO entrou, e por quê.** `tests/financial-entry-delete-reverse-race-db.test.ts` — a suíte que
originou esta pendência — **continua fora**, com um **lugar reservado e comentado** no `ci.yml`. Medido em
2026-08-30:

```
$ git ls-tree main -- tests/financial-entry-delete-reverse-race-db.test.ts
(vazio  ->  o arquivo NAO existe na main)
$ git ls-tree feat/o6r-b02-financial-uow -- tests/financial-entry-delete-reverse-race-db.test.ts
100644 blob e52950837ae3e97b1fb3272c159c1a5887d37a12
```

A suíte vive **apenas** na branch não-mergeada `feat/o6r-b02-financial-uow` (blob `e5295083`). Pôr a linha
hoje **quebraria o job de imediato**. Fechar a pendência seria mentir; incluir a linha seria trocar um job
verde-cego por um job vermelho-por-arquivo-ausente.

**A contradição que este apenso resolve.** O `ci.yml` entregue na Fase 2 **já afirma**, no comentário do
lugar reservado, que a pendência *"segue ABERTA, com esse PR como dono"* — enquanto o registro aqui dizia
`dono: a atribuir`. Um dono declarado no código e ausente no registro é um dono que ninguém cobra. A linha de
status acima passa a nomeá-lo: **o PR que mergear o `B-O6R-02`**, para quem a inclusão da linha vira **DoD**.

**Critério de fechamento:** a linha `SUITES="$SUITES tests/financial-entry-delete-reverse-race-db.test.ts"`
presente no `ci.yml`, com a suíte existente na `main` e o job `backend-postgres` verde sob o guard de zero
pulos.

### Apenso de 2026-08-31 (`SAN2-5`, bloqueio B3): a contradição entre DOIS mergeados, resolvida por escrito

**A pendência continua ABERTA e o dono continua sendo o PR do ciclo 5** — o que este apenso resolve é uma
contradição que tornava a pendência **inexecutável**: os dois documentos que mandavam no dev do ciclo 5
diziam coisas opostas, e ele violaria um deles fizesse o que fizesse.

**Ponta A — `.github/workflows/ci.yml` na main (`df496d2`), l.217-220**, escrito pelo **#363** (`d283903`,
2026-08-30), o mesmo PR que criou o lugar reservado: *"Sua inclusão é **DoD do PR que mergear o B-O6R-02
(ciclo 5 financeiro)**; a pendência `P-O6R-B02-SUITES-LIST-CI` segue ABERTA, **com esse PR como dono**"*.

**Ponta B — `agent-orchestration/omega/planos/B-O6R-02-ciclo5-plano.md`**, de 2026-08-27/28, em **três**
lugares: **§5 l.134** (`ci.yml` no PROIBIDO + *"Arquivo fora das listas → o dev PARA e devolve"*) · **§10.5
l.234** (*"PROIBIDO; `P-O6R-B02-SUITES-LIST-CI` é do bloco seguinte"*) · **§12 l.256** (*"Manter abertas:
… bloco seguinte, `ci.yml`"*).

**Resolução (decidida no `SAN2-5-plano.md` §3-E3, executada por apenso ao plano do ciclo 5): VALE O
`ci.yml`.** Razões: (1) é o documento **mergeado e mais recente**, escrito por quem **criou** o lugar
reservado; (2) a justificativa original do PROIBIDO caducou por **inversão de risco** — ela foi escrita
quando acrescentar a linha quebraria o job (o arquivo não existia na main), e o #363 inverteu isso: agora é
**não** acrescentá-la que deixa a suíte de corrida entrar na main **fora** do subconjunto Postgres do CI,
auto-pulando em silêncio no job `backend` — o exato verde-cego que o guard de zero pulos existe para matar;
(3) o `pipefail` já contém o risco do `tee`.

**O que passa a valer** (apenso B3 ao plano do ciclo 5, que **emenda** §5 l.134, §10.5 l.234 e §12 l.256):
a única mudança permitida em `.github/workflows/ci.yml` no PR do ciclo 5 é **UMA linha** —
`SUITES="$SUITES tests/financial-entry-delete-reverse-race-db.test.ts"`, no formato literal das vizinhas
(l.**213-216** — as l.208-212 são comentário; errata pós-voto do PR #367, achado C2-A2), entre a l.216
e o comentário do LUGAR RESERVADO — **no MESMO PR** que traz o arquivo de teste
para a main; o comentário do lugar reservado é **atualizado, nunca apagado**; **nada mais** do `ci.yml`
muda, e quem confere linha a linha é a cadeira **C3 `jurado-c5-validador-diff-plano`**. Para todo o resto do
arquivo, o PROIBIDO e o *"PARA e devolve"* seguem **inteiros**.

**Esta pendência FECHA no PR do ciclo 5** (sai de "Manter abertas" e entra em "Fechar com o PR", §12 do
plano do c5 emendado). **Critério de fechamento — inalterado**, é o já escrito no apenso de 2026-08-30: a
linha presente no `ci.yml`, com a suíte existente na `main` e o job `backend-postgres` verde sob o guard de
zero pulos.

**Registrado, não consolidado em silêncio (§A2).** O `SAN2-5` **não tocou** `.github/workflows/ci.yml`;
resolveu por texto. Diário: `agent-orchestration/omega/juntas/votos/SAN2-5/dev-b3-b4-dividas.md`.

**Fechamento (2026-09-02 — B-O6R-02 ciclo 5, S0-zero + F6):** a inclusão aconteceu no commit de merge do
S0-zero (`84bb90b`), sob o **ruling do CP-1** que emendou a cláusula "UMA linha" do apenso B3/E3.3 para
**7 linhas** (as 6 suítes dos ciclos 1–4, vivas só na branch, + esta) — união dirigida, fundamento =
a mesma inversão de risco do E3.2 aplicada às 6 (main-integral as poria na main roteadas em lugar nenhum);
registro completo no terreno pós-absorção §7 e no diário do ciclo 5 (segundo registro + adendo). O
comentário do LUGAR RESERVADO foi substituído pelo comentário de fechamento (l.240 em `84bb90b`); o rastro
integral vive no histórico git e aqui. **Critério cumprido na parte local:** as 7 linhas presentes,
`git cat-file -e` ec=0 nas 7, e as 7 suítes exercidas SEM pulo no cluster descartável nas condições do job
(P4: 3× `52/52`, 0 pulo, 0 XX000; canônica 2 da bateria re-exercita com N≥15). **A prova final** — job
`backend-postgres` verde sob o guard de zero pulos — é do CI do PR, e o fechamento fica condicionado a ela.

- **status:** FECHADA condicionada ao CI do PR (2026-09-02, PR do B-O6R-02 ciclo 5; nº no backfill pós-merge) · **severidade:** MEDIA · **dono:** B-O6R-02 c5

## P-O6R-B02-REGISTRO-STATUS-LOG (2026-08-28 — validação A5) — BAIXA
No head `12c3825`, `agent-orchestration/docs/status-geral.md` e `agent-orchestration/codex/log-execucao.md` ainda dizem que a
junta do ciclo 3 "ainda não ocorreu" e não têm autoria do ciclo 4. Reconciliar no PR (a árvore principal recebe a entrada de
2026-08-28 nesta mesma rodada de registro).

**Fechamento (2026-09-02 — B-O6R-02 ciclo 5, F6):** `status-geral.md` e `log-execucao.md` reconciliados
neste PR — o REPROVADO do ciclo 4, a absorção S0-zero (`84bb90b`) e a autoria do ciclo 5 registrados; a
crônica dos ciclos 1–4 da branch, descartada conscientemente na resolução main-integral (60/80 e 16/45
linhas — ver terreno pós-absorção §6), foi recomposta com os números DESTE head.

- **status:** FECHADA (2026-09-02, PR do B-O6R-02 ciclo 5; nº no backfill pós-merge) · **severidade:** BAIXA · **dono:** B-O6R-02 c5
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

## P-O6R-B02-CENSO-CASO-PERMANENTE (2026-08-28 — validação A6) — BAIXA
O componente *"1 censo de legado"* do piso §6 da P9 não tem caso permanente: nenhuma suíte exercita o bloco `DO` da migration
(WARNING com órfão semeado); só o drill D28 o exerce (validador executou: WARNING nomeado com 1 órfão). Os demais componentes
(≥6 corrida, ≥2 SQL cru) e o total (≥21) estão acima do piso.

**Fechamento (2026-09-02 — B-O6R-02 ciclo 5, F5):** caso permanente `[A6][db][censo]` na suíte -db — semeia
o órfão em tenant PRÓPRIO (modo réplica na mesma sessão crua), executa o bloco `DO $censo$` **extraído do
.sql da migration 20260870** (nunca cópia digitada), observa o WARNING nomeado (`P-O6R-B02-ORFAOS-LEGADOS`,
contagem publicada) por listener de notice, e prova o controle negativo (par restaurado → censo MUDO).
Teardown escopado por tenant.

- **status:** FECHADA (2026-09-02, PR do B-O6R-02 ciclo 5; nº no backfill pós-merge) · **severidade:** BAIXA · **dono:** B-O6R-02 c5
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

## P-O6R-B02-S0-ESPELHO-NO-HEAD (2026-08-28 — validação A7) — **FECHADA POR NÃO-REPRODUÇÃO em 2026-08-28** (era ALTA)

> **Não reproduz.** O `--check` no worktree real do head e num **checkout LF puro** (o que a CI Linux vê) dá
> **ec=0, 0 DIVERGE, "25 agentes, espelho consistente"**. Os 15 (validador do c4) e os 25 (planejador do c5) vieram de
> `git archive`+`tar` numa máquina com `core.autocrlf=true`, que injeta 64 CR no arquivo do espelho (blob = 0 CR nos dois
> lados, 26+25 arquivos, sem `.gitattributes`); o script compara com o gerado (LF) e acusa divergência inexistente.
> Errata completa, com as 4 medições, na ata do ciclo 4 e no plano do ciclo 5. **S0(i) do ciclo 5 = NO-OP.**
> Registro original preservado abaixo (§A2 — não se reescreve):
`git archive 12c3825 .claude/agents .agents/agents scripts/sync-agent-agents.mjs` → `node scripts/sync-agent-agents.mjs --check`
→ **ec=1, 15 DIVERGE** (12 agentes-base + 3 especialistas). Na árvore principal → OK 32. A R4 do inspetor mediu o espelho VIVO,
não o head; o S0 do plano ("`--check` até o espelho fechar") **não fecha em `12c3825`**. `5e321ac` segue não-ancestral. A CI não
executa o `--check` (0 hits em `ci.yml`). Fechar antes do PR/porteiro (rebase ou sync na branch), fora do dev.

- **status:** FECHADA · **severidade:** ALTA · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status, mas **ela própria já se declarava resolvida** no cabeçalho — a linha é **transcrição**, não juízo novo. [Nota corrigida em 2026-08-29 pelo achado A-3 da junta: aqui estava colado o boilerplate *“Marcada ABERTA por padrão conservador”*, que contradizia o próprio `status: FECHADA` logo acima. A nota é a prova de auditoria da regra — colada sem discriminar, transformava o registro numa afirmação dupla.]</sub>

## P-O6R-B02-RUNNER-SUMICO-SEM-SKIP (2026-08-28 — arnês #4 / D26b) — MÉDIA (mesma classe do B-2c4)
Suíte -db que sai limpa **sem registrar teste** (mutação `if (true) {} else if (!connectionString)`) → `npm test` **ec=0**,
"260 arquivo(s) · 2740 teste(s) · pass 2738 · skipped 2", guard mudo. O D26 literal (auto-pulo com `skip:`) fica vermelho e
nomeia a contagem — cumprido; o buraco que resta é o denominador sem piso.

**Fechamento (2026-09-02 — B-O6R-02 ciclo 5, F6, por decisão do CP-3 — ATO DE REGISTRO, não de
implementação):** a correção que esta pendência pedia — **piso de denominador no runner** — foi entregue e
provada pelo `B-O6R-ARNES` (**PR #359**): D40 nas duas pontas, e a canônica 1 real mostra o piso disparando
1× e NOMEANDO `tests/core-saas-role-authority.test.ts` (ver
`P-ARNES-DIVERGENCIA-RUNNER-SUMICO-NAO-EXISTE-NA-MAIN`, que pedia exatamente esta reconciliação). Este PR
não tocou runner nenhum: apenas reconcilia o registro, como o dev do ARNES deixou instruído. **O resíduo
NÃO fecha** e ganha pendência própria: `P-O6R-B02-CRASH-NO-LOAD-SEM-SKIP` (o arquivo nomeado morre no LOAD
sem declarar skip — o piso o pega, mas o defeito do arquivo continua; fim deste arquivo).

- **status:** FECHADA (2026-09-02 — corrigida pelo #359; registro reconciliado pelo PR do B-O6R-02 c5) · **severidade:** MEDIA · **dono da correção:** B-O6R-ARNES (#359)
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

### Apenso de 2026-08-30 (`SAN2-2`, Fase 4) — a causa REAL nesta árvore não é auto-pulo, é **crash no load**

**Escopo: `pre-existente`** (o arquivo e o `throw` antecedem o `SAN2-2`; a entrada de 2026-08-28
`P-O6R-B02-BATERIA-CANONICAS-1-2` já nomeava o mesmo arquivo — *"inicializa o Prisma Client após o skip sem
`DATABASE_URL` — pré-existente"*). **Não corrigido aqui**: `src/**` e `tests/**` estão fora do escopo do
`SAN2-2`, e quem acha não conserta (`D-JUNTA-SEPARACAO-DE-PAPEIS`).

**O que a entrada acima descreve** é uma suíte que sai **limpa** sem registrar teste — cenário obtido por
**mutação** (`if (true) {} else if (!connectionString)`). **O que acontece de verdade** ao rodar `npm test`
**sem** `DATABASE_URL`, sem mutação nenhuma, é outra coisa: o arquivo **estoura no carregamento**.

```
$ env -u DATABASE_URL npm test
...
# C:\...\src\database\prisma.ts:12
#     at <anonymous> (...\src\database\prisma.ts:12:9)
#   Error: DATABASE_URL is required to initialize Prisma Client.      (2 ocorrências)
```

`src/database/prisma.ts:12` é o `throw` em **escopo de módulo** (l.9 lê `process.env.DATABASE_URL`, l.11–13
lançam se ausente). Ele dispara no *import*, **antes** de qualquer `test()` se registrar — por isso o arquivo
some inteiro do denominador em vez de aparecer como falha ou como pulo. **Arquivo culpado nomeado pela própria
execução:** `tests/core-saas-role-authority.test.ts`.

**Medição (execução real, 2026-08-30, neste worktree, sem `.env` — só `.env.example`):**

```
[run-backend-tests] 248 arquivo(s) · 2371 teste(s) · pass 2312 · fail 1 · skipped 58
EXIT=1
```

`2371 · fail 1 · skipped 58` — **idêntico** às 2 execuções que o orquestrador mediu antes desta; esta é a
**terceira**, feita de forma independente pela Fase 4, e o número não se moveu.

**O que o apenso MUDA na entrada acima, e o que confirma.**

- **MUDA a causa:** nesta árvore o sumiço não vem de auto-pulo silencioso, vem de **exceção no load**. Quem
  for consertar procurando por `skip:` não vai achar nada.
- **CONFIRMA o diagnóstico central** ("o buraco que resta é o denominador sem piso") e mostra que **ele já
  foi tampado**. O piso de denominador entregue pelo `B-O6R-ARNES` (#359) **morde neste caso real**:

  ```
  [run-backend-tests] PISO DE DENOMINADOR: 1 arquivo(s) expandido(s) terminaram sem registrar um único
  teste e sem declarar skip:
  [run-backend-tests]   tests\core-saas-role-authority.test.ts
  [run-backend-tests] O total acima (2371) é MENOR do que a suíte de verdade e não dá para saber quanto —
  testes que não rodaram não aparecem como falha. Sair 0 aqui é publicar um denominador que a execução não
  sustenta (P-O6R-B02-RUNNER-SUMICO-SEM-SKIP).
  ```

  **`ec=1`, com o arquivo nomeado e esta pendência citada pelo ID.** O "guard mudo / `ec=0`" descrito acima
  vale para o head em que a entrada foi escrita, **não** para o head de hoje.

**O que resta ABERTO, portanto,** não é mais a detecção — é a **causa**: `tests/core-saas-role-authority.test.ts`
não declara skip quando falta `DATABASE_URL` (ao contrário do irmão `-db`), então a bateria sem banco não
consegue sair verde legitimamente. Trabalho de bloco que possa tocar `tests/**`.
## P-O6R-ARNES-ISOLAMENTO — EMENDAS medidas pela junta do ciclo 4 (2026-08-28, cadeira do arnês, N=10)

- **A classe `XX000` reaparece DENTRO da forma canônica 3**, não fora dela: 3/10 rodadas do mesmo `npm test` com `DATABASE_URL`,
  em cluster próprio onde só o jurado conectava (contenção de CPU de outras baterias na máquina, nunca o mesmo banco).
  Produtores medidos: `tests/audit-security.test.ts:158` (CREATE ROLE, ×2) e `tests/helpers/auth-identity-fixture.ts:150`
  (`createEphemeralRole`, via `auth-identity-backfill-db.test.ts:115`).
- **Denominador 2740×2745** numa rodada (5 subtestes do teste 120 não correram; o arquivo abortou no `XX000` antes de os
  registrar); o runner não tem piso de `# tests`.
- **Roles órfãs nascem no caminho de falha do `CREATE ROLE`** e persistem com LOGIN + DML total nas 115 tabelas (2 em 10 rodadas);
  **vazamento linear** de `auth_identities`/`auth_identity_link_events` (+5/rodada) mesmo em rodadas verdes; `permissions` 1→15 uma vez (idempotente).
- **Aborto duro (SIGKILL) na corrida -db** deixa 1 tenant/1 user/1 conta/1 lançamento sem varredura (não contamina: slugs únicos);
  o teardown no caminho de `assert.fail` está provado (resíduo 0).
- **ERRATA do rótulo (28/08):** nas linhas apontadas, `audit-security.test.ts:158` é `DROP OWNED BY` (teardown, FORA do
  `withRoleCatalogLock`) e `auth-identity-fixture.ts:150` é `GRANT USAGE ON SCHEMA public` (DENTRO do lock) — escritas em
  `pg_namespace.nspacl`/`pg_class.relacl`, não `pg_authid`. Objeto disputado a nomear por execução no ciclo 5 (ver errata da ata).

- **status:** ABERTA · **severidade:** a classificar · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

## P-O6R-ARNES-ISOLAMENTO — EMENDAS do bloco `SAN2-4b` (2026-08-31) — mecanismo da orfa e denominadores por arquivo

**Emenda, nao reabertura: o texto das entradas anteriores fica intocado (§A2).** Tres coisas que as
medicoes do `SAN2-4a` (#365) provaram e que esta pendencia ainda nao registrava, mais uma que o plano do
4a §5.1 previa e nunca foi aplicada.

**1. A assinatura das orfas liga o mecanismo as 68 (M3-O-5).** Cinco de cinco orfas produzidas
deliberadamente em cluster descartavel sairam **identicas**: com `LOGIN`, **sem expiracao**, e com
**460 grants = 115 tabelas x 4** — exatamente a assinatura das **68** que esta pendencia conta desde
18/08. A genese foi reproduzida por `SIGKILL` na janela de ~70% do tempo de vida do processo
(1883-1970 ms), que e quando o `finally` do teardown ainda nao rodou: **5/5**. Cada nome embute
`Date.now()`, logo **toda orfa e datavel pelo nome**, sem consultar catalogo. Origem:
`medicao-3-censo-roles.md` §F7/§F8/§F10. A base viva **nao foi tocada** e as 68 seguem **CARREGADAS**.

**2. Armadilha de nomenclatura (M3-O-4).** `rls_test_` e **substring** de `vid_rls_test_`. Varredura por
substring recolheria a familia irma; a defesa e **prefixo ancorado** (`^` no regex, `LIKE` por prefixo),
que ja existia e foi conferida por execucao (2/2 na forma F9). A partir do `SAN2-4b` a ancoragem fica
exercitada permanentemente, com a familia nova dentro dos dois drills PD de sweep do
`tests/db-catalog-write-guard.test.ts`.

**3. Os denominadores por arquivo da bateria barata, medidos** — o que o plano do 4a §5.1 previa e nunca
foi aplicado (o 4a nao tocou `pendencias.md`). `N=5` por arquivo, forma
`node scripts/run-backend-tests.mjs <arquivo>`, Node **v20.19.5**, cluster descartavel com **103**
migrations, head `116aa46`: `tests/audit-security.test.ts` **1** ·
`tests/auth-identity-backfill-db.test.ts` **6** · `tests/auth-identity-link-events-db.test.ts` **5** ·
`tests/auth-identity-role-real-db.test.ts` **10** ·
`tests/impound-process-checklist-link-schema.test.ts` **5** · `tests/rls-tenant-isolation.test.ts` **1** ·
`tests/vehicle-identity-schema.test.ts` **9** = **37**. As **sete contagens estao todas certas**. O que
**nao** estava certo era a inferencia de exclusao que o `status-geral.md` l.33 tirava delas — ver a
**errata E-1** apensa la pelo mesmo bloco.

**4. Replicacao nao e corroboracao (M2-O-3).** A lista de **6** arquivos registrada nesta pendencia e a
do §0.a do `B-O6R-02-ciclo5-plano.md` sao **a mesma lista em dois lugares** (`B ≡ C`) — **uma**
afirmacao replicada, nao duas confirmacoes independentes. Lista-6 e lista-7 sao **particoes diferentes
do mesmo total 37**, unidas pela coincidencia aritmetica exata
`link-events(5) + role-real(10) == links(15)`; e o par `(arquivos, testes)` **nao identifica** a lista,
porque **tres** listas de 6 distintas produzem `(6, 37)`. A receita reprodutivel por terceiro e a lista
**NOMEADA** do **§V.3** da `medicao-2-bateria-barata.md`, apensa por este bloco ao criterio **D29** do
plano do ciclo 5.

**5. Gatilhos do sweep: sao 5, nao 4** (errata C2-A2 a medicao-3 §F6.3) — cinco arquivos e **8** chamadas
de `createEphemeralRole`; o quinto e `tests/db-catalog-write-guard.test.ts`, justamente o guard que
exercita o sweep de proposito. Com a correcao C3 do `SAN2-4b`, o criador `tests/rls-tenant-isolation.test.ts`
tambem passou a invocar o varredor: **6** gatilhos.

**Registro canonico das medicoes:** os diarios de `agent-orchestration/omega/juntas/votos/SAN2-4a/`
(`medicao-1-authority-portal.md`, `medicao-2-bateria-barata.md`, `medicao-3-censo-roles.md`), e **nao**
um consolidado em `omega/medicoes/` — divergencia mandato x plano do 4a, fechada por decisao escrita:
copiar verbatim criaria um quarto registro da mesma verdade, e a medicao 2 acabou de provar que
replicacao nao corrobora.

- **status:** ABERTA · **severidade:** a classificar · **dono:** a atribuir
  <sub>Emenda do `SAN2-4b` (2026-08-31): cabecalho NOVO, apenso a serie de emendas desta pendencia (§A2) — nao altera o estado da pendencia-mae, so acrescenta o que foi medido. Severidade deixada como **a classificar** de proposito: este bloco mediu mecanismo e contagens, nao impacto.</sub>

## Pendências do porteiro pós-merge do #359 (`B-O6R-ARNES`) — 2026-08-28, `LIBERADO COM RESSALVA`

Parecer completo em `agent-orchestration/omega/juntas/votos/B-O6R-ARNES/00c-porteiro-pos-merge-359.md`.
O porteiro reexecutou por conta própria: canônica 3 **2597/2595/0 fail/2 skip, ec=0, zero papel órfão**
(`pg_roles` = 15, só built-ins + `postgres`), bateria focada **34/34**, canônica 1 com denominador **2359**
— os números do KPI **reproduzem**. Escopo e promessas conferidos contra o diff real.

### FECHADAS agora pelo orquestrador

- **Branch remota `fix/o6r-arnes-catalogo-unico` apagada** (achado B): o `--delete-branch` do `gh pr merge`
  falhou porque a branch estava presa ao worktree do dev; `git push origin --delete` executado e conferido
  por `git ls-remote` (vazio).
- **Trilha tornada durável** (achado D): `demo/investidor` **não existia no remoto** — 46 commits, com a ata,
  os votos, o briefing e os planos da junta que autorizou um merge da `main` vivendo só em disco local.
  Push executado (`a6dffcd`). **Não** abre PR e **não** move a `main`; é durabilidade da prova, não merge.

## P-ARNES-CONEXAO-SEM-ASSEVERACAO-DE-IDENTIDADE (2026-08-28) — BAIXA · **Dono:** bloco de arnês seguinte

Achado `pre-existente` da cadeira de catálogo na junta do `B-O6R-ARNES` (voto `01`, achado 4), sem entrada
própria até aqui (achado E do porteiro). Nenhum dos 3 escritores movidos para o mecanismo único assevera a
**identidade da conexão sob teste** (`SELECT current_user` / `rolsuper` / `rolbypassrls`) dentro do próprio
teste. Consequência: um teste que se declara "sob a role X" pode estar rodando como `postgres` e ninguém
percebe — a mesma classe do `[RLS]` que rodava como superusuário e passava com os triggers derrubados
(`P-O6R-B02-TESTE-RLS-SUPERUSER`).

- **status:** ABERTA · **severidade:** BAIXA · **dono:** declarado acima
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

## P-ARNES-AUTHORITY-PORTAL-INTERMITENTE (2026-08-28) — MÉDIA · **Dono: a atribuir por execução** (candidato: bloco de arnês seguinte) — **FECHADA em 2026-08-31**

> **FECHADA em 2026-08-31 pelo bloco `SAN2-4b` (correcoes C1 e C2).** Esta entrada exigia, como
> pre-condicao de qualquer correcao, **atribuir por execucao** (N>=10 isolado) antes de consertar — e
> foi exatamente isso que o `SAN2-4a` (#365) fez, sem consertar nada.
>
> **Causa medida, em 7 elos.** O tamper da l.161 **nunca via** `"A"` (o hash termina em `=` em
> 100.000/100.000 amostras): ele trocava o **padding** do base64, nao o dado. 44 chars sem padding
> decodificam para **33 bytes** — os 32 originais **intactos** mais um `0x00`; `parseStored`
> re-derivava `keylen` do stored **recebido**, o que deixava o guard de comprimento cego (33===33); e
> `timingSafeEqual` passava sse o 33o byte derivado fosse `0x00`. Taxa: **1/256 por execucao, sem elo
> temporal** (nao era "flaky por concorrencia"). Previsao byte a byte conferida contra o
> `verifyPassword` REAL em **20.000/20.000** (sonda E3 do 4a) e **40.000/40.000** e
> **200.000/200.000** (cadeira C1 da J-SAN2-4a). Origem: `medicao-1-authority-portal.md` §F3.
>
> **Correcao (commit `f6631d0` deste bloco).** **C1** — `parseStored`
> (`src/modules/authority/authority-password.ts`) deixou de derivar `keylen` do dado de entrada e passou
> a pina-lo em `AUTHORITY_SCRYPT_PARAMS.keylen`, somando rejeicao de base64 nao-canonico; o defeito era
> de `src/`, nao so do teste. **C2** — o tamper passou a adulterar **dado** (primeiro caractere do
> payload, que carrega 6 bits), e **dois casos novos** pinam a classe: o denominador do arquivo foi
> **12 -> 14**.
>
> **Prova executada.** Vermelho-controle contra o `src/` sem a C1: **79/20 000** e **18/5 000**
> aceitacoes indevidas -> **0/100 000** com a C1. Controle positivo **100 000/100 000** (nenhum stored
> legitimo passou a ser rejeitado) e caminho de producao OWASP `N=2^17` **3/3**. No arquivo:
> **30/30 vermelhas** sem a C1 -> **30/30 verdes** com ela. A deteccao da classe saiu de **1/256 por
> execucao para 100%**. Diarios: `votos/SAN2-4b/dev-c1-parsestored.md` e `dev-c2-tamper-guard.md`.
>
> **Licao de metodo que fica registrada (OBS-3 da medicao-1).** Nesta classe, *"ficou verde"* nao prova
> nada: `P(0 em 40 | 1/256)` = **85,5%**, e o **N=10** que esta propria entrada prescrevia tinha
> **96,2%** de chance de sair verde **com o defeito presente**. O N de prova se deriva do **poder**,
> nunca de numero redondo (~766 execucoes para 95%).
>
> **Ressalva herdada, NAO fechada por esta correcao, dita por extenso.** O **1/2** do jurado (suite
> inteira, maquina dele) **nao fica totalmente explicado**: sob 1/256, ver ao menos 1 falha em 2
> execucoes tem `P` = **0,78%**. Ou foi azar de 1-em-128, ou existe uma **segunda contribuicao** que so
> aparece no arranjo de suite inteira — e as medicoes do 4a **nao decidem entre as duas**. Medir a
> hipotese custaria ~766 execucoes da suite inteira contra um objeto que, pos-correcao, **ja e outro**.
> Consequencia pratica, que e o motivo de isto poder fechar assim mesmo: o caminho 1/256 **deixa de
> existir**, portanto qualquer recorrencia da assinatura naquela linha e **por construcao defeito
> NOVO** e nasce como **pendencia nova** — nunca como reabertura desta.
>
> **Registro canonico das medicoes:** os diarios
> `agent-orchestration/omega/juntas/votos/SAN2-4a/medicao-1-authority-portal.md`,
> `medicao-2-bateria-barata.md` e `medicao-3-censo-roles.md` — **nao** um consolidado em
> `omega/medicoes/` (divergencia mandato x plano do 4a, fechada aqui por decisao escrita: copiar
> verbatim criaria um quarto registro da mesma verdade).

Achado `pre-existente` da cadeira do runner (voto `02`, achado 2), **sem dono na ata** — o porteiro cobrou
(achado E). `tests/authority-portal.test.ts:162` (*"hashing: scrypt round-trip … rejeita hash adulterado"*)
falhou com `ERR_ASSERTION true !== false` em **1 de 2** rodadas da suíte inteira do jurado. Está **fora da
classe** deste bloco (não é catálogo, não é denominador, não é teardown de papel). **Quem receber precisa
primeiro atribuir por execução** — N≥10 isolado — antes de qualquer correção; hoje há uma medição de 1/2 e
nada mais.

- **status:** FECHADA · **severidade:** MEDIA · **dono:** bloco `SAN2-4b` (correcoes C1+C2, commit `f6631d0`) — fechada em 2026-08-31, ver bloco no topo da entrada
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`. [Superada em 2026-08-31 pelo `SAN2-4b`: a triagem marcou ABERTA por nao ter verificado; agora foi verificado, e o que fechou a entrada foi **execucao** — 0/100 000 na sonda contra o `verifyPassword` real e 30/30 no arquivo —, nao o cabecalho.]</sub>

## P-ARNES-REGISTROS-DEFASADOS-NA-MAIN (2026-08-28) — BAIXA · **FECHADA (2026-08-29, este PR — ver errata)**

> **ERRATA DE FECHAMENTO (2026-08-29, achado A-1 da cadeira de KPI).** Esta pendência foi marcada `FECHADA`
> em 28/08 **antes de estar fechada**. A frase `piso **0**` sobreviveu **viva** em `Kpis/kpis-history.md:122`
> — no corpo da entrada do `B-O6R-ARNES`, 98 linhas **abaixo** da entrada nova que anunciava a correção, no
> mesmo arquivo que este bloco havia editado. O bloco editou o topo do arquivo e **não varreu o corpo dele**.
> A junta pegou; a linha foi corrigida em 29/08, com o texto antigo preservado e datado; e só **agora** a
> pendência está de fato fechada. Registrado por inteiro porque é a própria classe que este bloco existe para
> exterminar — declarar fechado o que a execução mostra aberto — cometida pelo bloco que a estava fechando.

Achados C e F do porteiro. Na `main` mergeada sobrevivem três frases que a execução contradiz — a **mesma
classe** que a junta corrigiu em `0c37fa2`, na frase vizinha:

1. **"piso 0 nas 3"** (canônica 1): medido no head final, o piso **dispara nomeando** um arquivo
   (`tests/core-saas-role-authority.test.ts`, que morre no load sem registrar teste nem declarar skip). A
   direção do erro é **a favor** da entrega — o mecanismo nomeia o morto em vez de silenciar —, mas a frase
   está errada. Era medição anterior a `1676a5b`, que abriu os olhos do piso para dentro do repositório.
2. **"6 arquivos"** sobrevive em `agent-orchestration/codex/log-execucao.md:38` e
   `agent-orchestration/docs/status-geral.md:37`, contradizendo a lista dos **7** no mesmo arquivo.
3. **`P-ARNES-CANONICA1-VERMELHO-AMBIENTAL`** mantém **2358** (não foi alcançada pela correção de `0c37fa2`)
   e não tem linha `Dono:`.

- **status:** FECHADA · **severidade:** BAIXA · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status, mas **ela própria já se declarava resolvida** no cabeçalho — a linha é **transcrição**, não juízo novo. [Nota corrigida em 2026-08-29 pelo achado A-3 da junta: aqui estava colado o boilerplate *“Marcada ABERTA por padrão conservador”*, que contradizia o próprio `status: FECHADA` logo acima. A nota é a prova de auditoria da regra — colada sem discriminar, transformava o registro numa afirmação dupla.]</sub>

## P-ARNES-BACKFILL-359 (2026-08-28) — MÉDIA · **FECHADA (2026-08-28, este PR)**

`Kpis/kpis-latest.json` e a entrada nova do `kpis-history.json` na `main` têm `pr: 359` preenchido e
`merge_commit`/`approved_head` **`null`** — legal na autoria, dívida agora. Backfill: `merge_commit` =
**`f081b5d`**; `approved_head` = **`d4cf978`** (o head que a junta aprovou) com nota do head final
**`0c37fa2`** (correções de registro exigidas pela própria junta) — a ata §6 registra os dois.

- **status: FECHADA (2026-08-28, bloco de registro `B-O6R-REG`).** Backfill aplicado em
  `Kpis/kpis-latest.json` (`release`) e na entrada `#359` do `Kpis/kpis-history.json`:
  `merge_commit` = `f081b5d`, `approved_head` = `d4cf978`, com nota do head final `0c37fa2`.

---

## Fechamento das ressalvas do porteiro do #359 — feito por este bloco (2026-08-28)

Das **seis** ressalvas (A–F), duas já haviam sido fechadas pelo orquestrador no próprio dia (B: branch remota
apagada; D: trilha pushada). Este bloco fecha as **quatro** restantes:

| Achado | O que era | Estado |
|---|---|---|
| **A** | backfill §C3.5 (`merge_commit`/`approved_head` = `null`) | **FECHADO** — `P-ARNES-BACKFILL-359` |
| **C** | "piso 0" não reproduz no head final | **FECHADO** — corrigido em `log-execucao.md`, `status-geral.md`, `P-ARNES-CANONICA1`, na `description` do `kpis-history.json` **e em `Kpis/kpis-history.md:122`**, esta última só em 29/08, depois de a junta a achar viva (achado A-1) |
| **E** | 2 achados `pre-existente` da ata sem entrada própria | **FECHADO** — `P-ARNES-CONEXAO-SEM-ASSEVERACAO-DE-IDENTIDADE` e `P-ARNES-AUTHORITY-PORTAL-INTERMITENTE` agora existem na `main`, com dono |
| **F** | "6 arquivos"→7 e "2358"→2359 sem `Dono:` | **FECHADO** — as três frases corrigidas |

**Achado não previsto pelo porteiro, encontrado por este bloco:** o status de `P-O6R-B04` e `P-O6R-B05`
estava **trocado** na `pendencias.md` da `main` — o bloco de estoque figurava como FECHADO pelo #353 (que é
do B-05) e o B-05, de fato mergeado, figurava como ABERTO. Corrigido nas duas seções, com a contraprova do
`Kpis/kpis-latest.json`. Era o defeito de registro de maior consequência da varredura: fazia pular um bloco
com 2 P0 abertos.

---

## P-REG-DIVERGENCIA-SEM-PLANEJADOR-MESTRE (2026-08-28) — divergência de processo, registrada ANTES de consolidar (§A2)

**O que divergiu.** O papel do `planejador-mestre` é obrigatório antes de código: o contrato o institui no
§C7 (`D-PLANEJADOR-MODELO-FABLE`, §C7.6) e o **corpo do agente** o enuncia na forma curta —
`.claude/agents/planejador-mestre.md`, frontmatter: *"Escreve o plano obrigatório antes de qualquer código.
Nenhuma linha de código sem plano dele."* Este bloco (`B-O6R-REG`) foi implementado **sem** plano dele.

> **ERRATA (2026-08-29, achado REG-DIFF-1 da cadeira de diff/escopo).** A primeira redação desta pendência
> atribuía a frase *"nenhuma linha de código sem plano dele"*, como citação verbatim, ao `CLAUDE.md` §C7 — e
> `grep` no `CLAUDE.md` não a devolve em ponto algum: ela vive no `description` do frontmatter do agente. A
> substância não muda (a regra existe, vincula, e foi divergida), mas **um bloco cuja tese é "o registro passa
> a dizer o que a execução diz" não pode citar errado a fonte da regra que confessa ter violado** — e quem for
> escrever a carve-out precisa saber onde a regra mora de fato.

**Por que, dito sem maquiagem.** É um bloco de **registro**: o diff em `src/`, `prisma/`, `tests/`,
`scripts/`, `frontend/`, `mobile/` e `.github/` é **vazio** — não há linha de código. O conteúdo é a lista
fechada e já escrita das quatro ressalvas do porteiro pós-merge do #359, mais duas tarefas nomeadas
explicitamente pelo dono (sincronizar o cronograma; reconciliar os registros das juntas para a `main`). O
"plano" deste bloco é o próprio parecer do porteiro, que enumera item a item o que tem de entrar no próximo PR
— `omega/juntas/votos/B-O6R-ARNES/00c-porteiro-pos-merge-359.md`, fecho do documento.

**O que NÃO é desculpa.** A regra não abre exceção por escrito para blocos de registro. Duas saídas possíveis,
e a escolha é da junta: (a) a junta ratifica esta divergência como pontual, ou (b) o contrato ganha a carve-out
explícita para blocos sem diff de código — o que **entra na lista do §6 da `D-JUNTA-ESCOPO-E-CALIBRACAO`**, que
já nomeia pendências de contrato não fechadas. Recomendação registrada: **(b)**, porque a regra tal como escrita
é violada por todo bloco de registro que este repositório já fez, incluindo os que a junta aprovou.

**O que NÃO divergiu:** a junta (§C7.1) e o inspetor de terreno (§C7.1-bis) continuam obrigatórios e não foram
pulados. Quórum deste bloco: **maioria de 3** — não toca dinheiro, segurança, permissão nem perda de dado
(`D-JUNTA-ESCOPO-E-CALIBRACAO` §2).

- **Dono:** a junta deste PR · **PR-alvo:** este.

---

- **status:** ABERTA · **severidade:** a classificar · **dono:** declarado acima
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

## P-REG-S0-GUARD-FALSO-VERMELHO (2026-08-29) — MÉDIA · **Dono:** próximo bloco que puder tocar `scripts/` — **FECHADA em 2026-08-30**

> **FECHADA em 2026-08-30 pelo `SAN2-2` (Fase 1, commit `db2d291`).** A correção aplicada é exatamente a
> indicada no fim desta entrada — normalizar o alvo como já se normaliza a fonte (`scripts/sync-agent-agents.mjs`,
> +7/−1) — e ela **não entrou por releitura**: entrou com os dois drills que a própria entrada exigia.
>
> - **Drill A — o falso-vermelho reproduzido e morto.** Script da `main` no worktree fresco →
>   **22 `DIVERGE`, exit 1**. Script corrigido, mesmo worktree → **0 divergências / 0 `FALTA` / 0 `SOBRA`,
>   exit 0**. O vermelho era do guard, não do espelho — como o inspetor já havia medido nos blobs.
> - **Drill B — o guard ainda morde.** **8 mutações** injetadas (fonte e espelho) → **8 vermelhas**. Esta é
>   a metade que importa: uma "correção" que apenas apagasse o vermelho passaria no Drill A e **falharia
>   aqui**. Verde-cego refutado **por execução**, não por argumento.
> - **12 casos permanentes** em `tests/agents-mirror-guard.test.ts`: os três arranjos de EOL (CRLF nas duas
>   pontas, fonte CRLF + espelho LF, fonte LF + espelho CRLF), mutação em cada ponta, `FALTA`, `SOBRA`, o
>   `README.md` como KEEP, as **três** provas de que a normalização é *só* de EOL (espaço no fim da linha,
>   caixa e linha em branco a mais continuam reprovando) e a preservação de `model:` (`D-PLANEJADOR-MODELO-FABLE`).
> - **O `--check` passou a rodar no CI:** `.github/workflows/ci.yml:69-70`, job `backend`. Antes não rodava
>   em lugar nenhum — e era por isso que um gate fail-closed de toda junta dependia de alguém lembrar de
>   executá-lo à mão.
>
> **Por que fechar importa, e não é formalidade.** Enquanto o registro dissesse ABERTA, o próximo
> `inspetor-de-terreno-da-junta` leria que o gate S0 ainda mente — e faria uma de duas coisas: bloquearia
> junta sem motivo, ou **aprenderia a ignorar a pendência**. A segunda é o dano real, e é a mesma frase que
> esta entrada já usa sobre o `.env` do #355: *"o risco maior não era o vermelho — era alguém aprender a
> ignorá-lo."* Um registro que continua vermelho **depois** do conserto ensina exatamente isso.
>
> **Origem de cada número (§A2 — fato separado de herança).** Os drills A e B são do `dev-fase1-log.md`
> (953 linhas, commit `db2d291`) e **não foram reexecutados** nesta fase de registro — reproduzi-los exige
> checkout fresco, fora do mandato da Fase 4. O que esta fase **mediu por conta própria**, em 2026-08-30:
> os 12 casos (`grep -cE "^\s*(test|it)\(" tests/agents-mirror-guard.test.ts` → 12), o passo do CI
> (2 hits em `ci.yml`), o diffstat do `db2d291` (+7/−1 no script, +345 no teste, +9 no `ci.yml`) e
> `node scripts/sync-agent-agents.mjs --check` → `OK — 23 agentes, espelho consistente`, **exit 0**.
>
> Registro original preservado abaixo (§A2 — não se reescreve).

**Achador:** `inspetor-de-terreno-da-junta` do `B-O6R-REG` (ressalva R1), **confirmado por execução** pelo
orquestrador. **Quem achou não conserta** (`D-JUNTA-SEPARACAO-DE-PAPEIS`) — e `scripts/` está **fora do escopo**
do `B-O6R-REG`, cuja promessa central é diff de código vazio. Por isso fica nomeado, não remendado.

**O defeito.** `scripts/sync-agent-agents.mjs --check` dá **falso-vermelho universal em checkout fresco no
Windows**. A causa é uma assimetria de duas linhas:

- **l.39** (`transform`): `rawInput.replace(/\r\n/g,'\n')` — normaliza CRLF→LF **na fonte**.
- **l.80**: `readFileSync(to,'utf8') !== want` — compara o **alvo CRU**, sem normalizar.

Sob `core.autocrlf=true` (o caso desta máquina), um checkout fresco materializa **origem e alvo com CRLF**. A
origem é normalizada dentro do `transform`; o alvo não. Resultado: **todo** arquivo diverge.

**Medido nas duas pontas (2026-08-29):** no worktree fresco `.claude/worktrees/reg-359` → `DIVERGE` em 22
agentes; na árvore principal (onde os alvos foram escritos pelo próprio script, em LF) → `OK — 40 agentes,
espelho consistente`. O inspetor mediu os **blobs commitados** com transform replicado e eol-neutro: **0/22
divergências reais**. O espelho está consistente; **o guard é que mente**.

**Por que isto importa mais do que parece.** O S0 (consistência do espelho Codex) é **gate fail-closed de toda
junta** (`D-INSPETOR-TERRENO-JUNTA`). Como está, qualquer junta futura instruída a rodar o `--check` num
worktree novo — o arranjo que o próprio contrato **exige** para isolamento de jurado — vê vermelho e ou bloqueia
sem motivo, ou aprende a ignorar o vermelho. O segundo é o dano real, e é a mesma classe do `.env` que sequestrava
a bateria local (PR #355): *"o risco maior não era o vermelho — era alguém aprender a ignorá-lo."*

**É também exatamente a armadilha que a `D-JUNTA-ESCOPO-E-CALIBRACAO` §3 nomeia** — medir conteúdo versionado
sem neutralizar eol sob `core.autocrlf=true` fabrica divergência. Ali foi `git archive`+`tar`; aqui é um
`readFileSync` cru. A decisão proibiu a ferramenta; a classe sobreviveu em outra.

**Correção indicada (não aplicada aqui):** normalizar o alvo como já se normaliza a fonte — comparar
`readFileSync(to,'utf8').replace(/\r\n/g,'\n')` com `want`. Quem receber deve provar por **mutação**: em
checkout fresco, `--check` verde; e com um arquivo do espelho realmente adulterado, vermelho.

---

- **status:** FECHADA · **severidade:** MEDIA · **dono:** `SAN2-2` (Fase 1, `db2d291`) — fechada em 2026-08-30, ver bloco no topo da entrada
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`. [Superada em 2026-08-30 pela Fase 4 do `SAN2-2`: a triagem marcou ABERTA por não ter verificado; agora foi verificado, e o que fechou a entrada foi **execução** (drills A e B), não o cabeçalho.]</sub>

## P-REG-BATERIA-BARATA-DUAS-LISTAS (2026-08-29) — MÉDIA · **Dono:** `B-O6R-02` ciclo 5 (é quem vai reusar a forma) — **FECHADA em 2026-08-31**

> **FECHADA em 2026-08-31 pelo bloco `SAN2-4b` (correcao C5), com a errata como condicao de
> fechamento.** A entrada abaixo fica **intocada**: ela descreve com precisao o que se via em 29/08.
> O que a medicao 2 do `SAN2-4a` (#365) mostrou e que **a natureza do problema nao era a que a entrada
> supunha** — nao havia **conflito a arbitrar** entre duas listas; havia **uma sentenca falsa a
> corrigir** (achado O-4 da `medicao-2-bateria-barata.md` §V.5).
>
> **O que foi medido.** As **duas** listas fecham **37**. As sete contagens por arquivo da lista-7
> estao **todas certas** (N=5 por arquivo); a lista-6 deu `(6 arquivos, 37 testes)` em **10/10**
> rodadas. Lista-6 e lista-7 sao **particoes diferentes do mesmo total**, unidas pela coincidencia
> aritmetica exata `link-events(5) + role-real(10) == links(15)`. Forma:
> `node scripts/run-backend-tests.mjs <lista>`, Node **v20.19.5**, cluster descartavel com **103**
> migrations, `CORE_SAAS_PERSISTENCE` **nao exportada**, rodadas sequenciais, head `116aa46`.
>
> **A unica sentenca FALSA, e onde ela mora.** `agent-orchestration/docs/status-geral.md` l.33 afirmava
> que *"nenhuma combinacao de 6 que contenha as vitimas nomeadas fecha 37"*. Existem **duas**
> combinacoes de 6 que contem as 4 vitimas e fecham 37 (contraexemplos **executados**, §R.5), e a
> cadeira C2 da junta do #365 executou **tres** listas de 6 distintas dando `(6, 37)`. A **errata E-1**
> foi apensa ao `status-geral.md` por este mesmo bloco, com o paragrafo original preservado (§A2).
>
> **O achado maior, que muda o criterio do proximo bloco (errata-da-errata E-2, achado C2-A1).** O
> denominador **37 nao identifica a lista** — e o par `(arquivos, testes)` **tambem nao**, porque tres
> listas de 6 distintas produzem `(6, 37)`. O par e **necessario e insuficiente**. A receita
> reprodutivel por terceiro exige **NOMEAR os arquivos**, e a receita canonica e o **§V.3** da
> `medicao-2-bateria-barata.md`. Este bloco a apensou ao criterio **D29** do
> `agent-orchestration/omega/planos/B-O6R-02-ciclo5-plano.md`, que e quem vai reusar a forma.
>
> **B ≡ C: replicacao nao e corroboracao (achado O-3).** A lista de 6 registrada em `pendencias.md` e a
> do §0.a do plano do ciclo 5 sao **a mesma lista em dois lugares**. Duas ocorrencias do mesmo texto
> nao sao duas confirmacoes independentes — sao **uma** afirmacao replicada. Fica registrado aqui e na
> emenda `P-O6R-ARNES-ISOLAMENTO` deste mesmo bloco.
>
> **Registro canonico das medicoes:** os diarios de
> `agent-orchestration/omega/juntas/votos/SAN2-4a/` (`medicao-1-authority-portal.md`,
> `medicao-2-bateria-barata.md`, `medicao-3-censo-roles.md`), e **nao** um consolidado em
> `omega/medicoes/`.

**Achador:** orquestrador, em varredura **pós-voto** do `B-O6R-REG` (nenhum jurado a nomeou). **Escopo:
`pre-existente`** — as duas frases já estavam na `main` em `f081b5d`, antes deste bloco. **Não corrigida
aqui**: decidir qual lista é a certa exige **executar** a bateria em cluster descartável, o que está fora do
escopo de um bloco com diff de código vazio; e quem acha não conserta.

**O defeito.** A "bateria barata" é a **forma declarada** que torna o denominador 37 reproduzível por
terceiro — foi criada exatamente para isso, por exigência da cadeira de catálogo na junta do `B-O6R-ARNES`.
Existem hoje na `main` **duas listas diferentes**, ambas afirmando o **mesmo denominador 37**:

| | `agent-orchestration/docs/status-geral.md` (l.33) | `agent-orchestration/controle/pendencias.md`, seção `P-O6R-ARNES-ISOLAMENTO — EMENDAS` |
|---|---|---|
| Rótulo | **sete** arquivos | **6 arquivos** |
| `audit-security` | ✔ (1) | ✔ |
| `auth-identity-backfill-db` | ✔ (6) | ✔ |
| `auth-identity-link-events-db` | ✔ (5) | — |
| `auth-identity-role-real-db` | ✔ (10) | — |
| `auth-identity-links-db` | — | ✔ |
| `impound-process-checklist-link-schema` | ✔ (5) | ✔ |
| `rls-tenant-isolation` | ✔ (1) | ✔ |
| `vehicle-identity-schema` | ✔ (9) | ✔ |
| **Total declarado** | **37** | **37** |

**Medido:** os quatro arquivos em disputa **existem todos** (`tests/auth-identity-links-db.test.ts`,
`auth-identity-link-events-db.test.ts`, `auth-identity-role-real-db.test.ts`, `auth-identity-backfill-db.test.ts`)
— não é erro de digitação de um nome inexistente. E `git show f081b5d:.../pendencias.md | grep -c` = **1**: a
lista de 6 já estava na `main`.

**Por que importa.** O `status-geral.md` afirma que *"nenhuma combinação de 6 que contenha as vítimas nomeadas
fecha 37"*. Se isso é verdade, a lista de 6 **não pode** ter dado 37 — e ela é a forma declarada no §0.a do
plano do ciclo 5, que é o insumo de auditoria do **próximo** bloco do financeiro. Um terceiro que tentar
reproduzir o 37 hoje pega uma das duas listas ao acaso e não sabe qual. É a mesma classe do "piso 0", do
"6 arquivos" e do "2358" — número publicado cuja **forma** não sobrevive à conferência —, só que aqui o
conflito é entre **dois registros vivos**, não entre registro e execução.

**Como fechar (não feito aqui):** rodar `node scripts/run-backend-tests.mjs` sobre **cada** uma das duas
listas, em cluster descartável, N≥3, e publicar os dois denominadores com N e forma. A lista que não fechar 37
recebe errata apensada (§A2 — o texto original fica), nomeando qual medição a produziu.

- **status:** FECHADA · **severidade:** MEDIA · **dono:** bloco `SAN2-4b` (correcao C5) — fechada em 2026-08-31, ver bloco no topo da entrada
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

---

## Reconciliação da governança da `main`, trazida da trilha (SAN2-1, 2026-08-29)

> Estas duas entradas nasceram em 24–25/08 na branch `demo/investidor` e **nunca existiram na `main`**.
> O porteiro pós-merge do #360 registrou isso como **achado C — "reconciliação declaradamente parcial"**:
> quem lesse a `main` seguia sem saber que a proteção dela foi discutida **e instalada**. Texto verbatim,
> preservado como estava (§A2).

## P-GOV-MAIN-SEM-PROTECAO — a `main` não tem proteção nenhuma (2026-08-24)

- **status:** FECHADA · **severidade:** ALTA · **dono:** encerrado pela atualização de 25/08
  <sub>Linha de status acrescentada na reconciliação SAN2-1 (2026-08-29). O texto veio verbatim da `demo/investidor` e não trazia nem `status:` nem `Estado:` — o índice o marcava SEM-STATUS, que é um estado visível e não um palpite. **Fechada** porque a entrada seguinte, de 25/08, registra o ruleset instalado.</sub>

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

---

## P-GOV-MAIN-SEM-PROTECAO — ATUALIZAÇÃO (2026-08-25): ruleset INSTALADO

- **status:** ABERTA · **severidade:** MÉDIA · **dono:** workstream de governança (`docs/governanca-porteiro-pre-merge-sol`)
  <sub>Linha acrescentada na reconciliação SAN2-1 (2026-08-29). O ruleset foi instalado, mas **fica aberto** o que a própria entrada nomeia: versionar `.github/rulesets/` (hoje o ruleset vive **só no servidor**) e encolher a branch de governança de 46 commits para o tripwire.</sub>

O dono respondeu a pergunta do ciclo 3: **DESCUIDADO** (`D-GOV-AMEACA-DESCUIDO`). Com isso o desenho
de tripwire foi instalado NA HORA:

```
$ gh api repos/thiagodorgo/ERP_Techsolutios/rulesets
21453239  active  "main — PR + CI verde (tripwire, D-GOV-AMEACA-DESCUIDO)"

$ gh api repos/.../rules/branches/main       # regras EFETIVAS na ref
deletion · non_fast_forward · pull_request ·
required_status_checks: backend · backend-postgres · frontend · flutter · docker · owner-portal · authority-portal
```

Desenho: PR obrigatório (squash; 0 aprovações — o dono é o único humano) · os 7 checks REAIS do
`ci.yml` verdes no head atualizado (`strict`) · `integration_id` 15368 pinado · sem force-push · sem
delete · bypass list VAZIA. O check do porteiro NÃO entrou: o workflow não existe na `main`, e exigi-lo
bloquearia todo merge (e era o overclaim que o ciclo 3 derrubou).

**Nota honesta de método:** `git push --dry-run` foi tentado como prova e descartado — dry-run não
avalia ruleset no servidor; a prova registrada é a API de regras efetivas acima. O "morde de verdade"
será medido no primeiro merge por PR.

**RESTA da pendência:** o redesenho da branch `docs/governanca-porteiro-pre-merge-sol` (46 commits →
encolher para tripwire declarado, tirar "prova"/"independente" do vocabulário, pin de modelo vira
registro). Trabalho de ciclo próprio, com plano novo — não bloqueia mais nada.


---

## P-SAN2-LEITURA-DAS-79 (2026-08-29) — MÉDIA · **Dono:** bloco próprio, DEPOIS do ciclo 5 do financeiro

- **status:** ABERTA · **severidade:** MÉDIA · **dono:** bloco próprio, após o ciclo 5

**O compromisso da opção C, escrito para não evaporar.** O dono decidiu (dossiê do `SAN2-1`, 2026-08-29):
salvar agora o que as juntas verificaram e **adiar** a leitura real do balde C — não descartá-la. Este é o
registro do adiamento com dono.

**O que o bloco futuro faz:** ler as **79 pendências** marcadas `DIFERIDO-LEVE`, **uma a uma**, e
classificar cada uma com evidência própria (a etiqueta atual diz honestamente: *"adiada por triagem
automática; NÃO verificada item a item"*). A taxa medida de contaminação nas duas amostragens independentes
foi **~40% — 4 materiais em 11 lidas** (A-5 do ciclo 1: `P-Ω4-7-CLEAR-ATOMIC`, `P-Ω4-3-REFATURAR-DELTA`;
A-C1/A-C2 do ciclo 2: `P-036`, `P-Ω3F3B-UPDATE-VALIDA4` — todas já retiradas/fechadas individualmente).
Extrapolando a taxa, **o balde deve conter mais ~25–30 materiais escondidos** — é por isso que a severidade
desta pendência é MÉDIA e não BAIXA.

**Por que depois do ciclo 5:** decisão do dono na escolha da opção C — a leitura custa ~4–6 h e não pode
ficar no caminho crítico do teto do §C7.4. **Critério de fechamento:** as 79 com veredito individual e
evidência; as materiais promovidas de balde; o índice regenerado; e a etiqueta de triagem automática
removida (porque a leitura terá acontecido).


---

## P-C7-BIS-TER-FORA-DA-MAIN (2026-08-30) — MÉDIA · **FECHADA no mesmo PR que a abriu**

**Aberta e fechada no mesmo PR, e isso é deliberado.** Este ID era citado por nome em **três** artefatos da
junta do `SAN2-1R` e no plano do `SAN2-2` — mas **não tinha entrada aqui nem no índice**. Um ID citado como
se existisse, sem registro, é pior do que um ID ausente: quem consultasse o índice para saber o que estava
aberto **não o veria**, e quem lesse a ata acharia que veria. A entrada é criada para que o fechamento tenha
onde constar — §A2: não se consolida em silêncio.

Conferido em 2026-08-30, antes de escrever esta entrada:

```
$ grep -c "P-C7-BIS-TER-FORA-DA-MAIN" agent-orchestration/controle/pendencias.md        -> 0
$ grep -c "P-C7-BIS-TER-FORA-DA-MAIN" agent-orchestration/controle/pendencias-indice.md -> 0
$ git grep -n "P-C7-BIS-TER-FORA-DA-MAIN" -- .
   votos/SAN2-1R/00-quedas-pos-merge.md · 00c-porteiro-evidencia.md · 00c-porteiro-pos-merge-362.md
   planos/SAN2-2-plano.md
```

### O defeito

**§C7.1-bis** (`D-INSPETOR-TERRENO-JUNTA` — o inspetor de terreno que libera ou bloqueia o *start* de toda
junta) e **§C7.1-ter** (`D-JUNTA-ESCOPO-E-CALIBRACAO` — todo voto declara `escopo` além de `gravidade`, e o
quórum por risco) são **decisões do dono que regem como toda junta começa e como todo voto é emitido**. Elas
existiam **apenas** na branch `demo/investidor`. Os **dois** contratos espelhados da `main` não as tinham —
e a regra de espelhamento exige que Claude Code e Codex sigam as mesmas regras.

Medido pelo porteiro pós-merge do #362 e **re-medido nesta fase**, nos 4 pontos:

| ponto | `grep -c "1-bis\|1-ter"` |
|---|--:|
| `main:CLAUDE.md` | **0** |
| `main:AGENTS.md` | **0** |
| `demo/investidor:CLAUDE.md` | 2 |
| `demo/investidor:AGENTS.md` | 2 |

**Escopo: `pre-existente`** — `74430cc` já media 0; o #362 não removeu nada. **Agravante:** a ausência de
registro descrita acima. As duas decisões governavam na prática e não constavam do contrato que a `main`
publica; um inspetor de terreno instanciado a partir da `main` não encontraria a norma que o torna
obrigatório.

### O fechamento — commit `2e4985b` (`SAN2-2`, Fase 3)

```
$ git show --numstat --format= 2e4985b
121  0  .agents/agents/inspetor-de-terreno-da-junta.md
115  0  .claude/agents/inspetor-de-terreno-da-junta.md
 45  0  AGENTS.md
 45  0  CLAUDE.md
525  0  .../votos/SAN2-2/dev-fase3-log.md
```

- **Inserção pura: +45 / −0 em CADA contrato.** Zero linhas removidas — o transporte não pisou em nenhuma
  regra existente. É o que separa "trouxe a norma" de "trouxe a branch".
- **O §C7.4 revogado não voltou de carona.** `git show 2e4985b:CLAUDE.md | grep -c "ciclo 5 falho"` → **0**;
  idem em `AGENTS.md` → **0**. Era o risco concreto de puxar texto de uma branch de demo para a `main`, e
  ele não se materializou.
- **O instrumento veio junto, verbatim:** `.claude/agents/inspetor-de-terreno-da-junta.md`, **115 linhas** —
  norma sem o agente que a executa seria letra morta. O espelho Codex tem 121 (as 6 linhas do cabeçalho de
  emulação que o gerador acrescenta).
- **Espelho consistente e provado hoje:** `node scripts/sync-agent-agents.mjs --check` →
  `OK — 23 agentes, espelho consistente`, **exit 0**. São **23 agentes espelhados** em **24 arquivos** de
  `.agents/agents/` (o 24º é o `README.md`, que é KEEP e não vira `SOBRA`).
- **Head desta branch:** `git show 2e4985b:CLAUDE.md | grep -c "1-bis\|1-ter"` → **2**; `AGENTS.md` → **2**.
  Os dois pontos que mediam 0 medem 2.

### Severidade — classificação desta entrada, não herdada

**MÉDIA.** Nenhuma junta atribuiu severidade a este achado (ele nasceu no gate pós-merge do #362 e nunca teve
entrada), então classifico aqui e digo o critério, em vez de carimbar um rótulo emprestado: **é governança e
registro** — não toca dinheiro, dado, permissão nem código de produto (a régua de quórum da própria
§C7.1-ter) — mas atinge o contrato que decide **como toda junta começa**, o que a põe acima de cosmético.

- **status:** FECHADA · **severidade:** MÉDIA · **dono:** `SAN2-2` — Fase 3 (`2e4985b`) executou, Fase 4 registrou


---

## P-SAN2-2-PORTA-55432-RESERVADA (2026-08-30) — armadilha de terreno, não defeito de produto — **FECHADA em 2026-08-31**

> **FECHADA em 2026-08-31 pelo bloco `SAN2-4b` (correcao C5).** O **criterio de fechamento** escrito
> nesta propria entrada — *"a receita de cluster descartavel (plano ou `docs/`) manda consultar as
> faixas excluidas antes de fixar a porta, e nenhuma linha rastreada prescreve 55432 como se fosse
> livre"* — esta cumprido nas duas metades.
>
> **Metade 1 — a receita passou a mandar consultar, e foi executada e transcrita DUAS vezes.** O
> `SAN2-4a` (#365) fez da consulta ao `netsh` o **primeiro** comando de terreno de cada fase, e as duas
> transcricoes estao em `agent-orchestration/omega/juntas/votos/SAN2-4a/`:
> `medicao-2-bateria-barata.md` §T2 e `medicao-3-censo-roles.md` §T2 — as duas reproduzem **por
> execucao** a faixa `55353-55452`, que e a que contem a 55432, e as duas escolheram **56432/56379**,
> fora de toda faixa listada. O `SAN2-4b` executou a mesma consulta antes de subir o seu cluster. A
> licao duravel continua sendo a que a entrada ja dizia: **nao** e "use 56432", e sim consultar
> `netsh interface ipv4 show excludedportrange protocol=tcp` **antes** de fixar a porta, porque as
> faixas sao dinamicas e mudam entre reinicializacoes do Hyper-V/WinNAT.
>
> **Metade 2 — a linha rastreada que prescrevia 55432 ganhou nota datada.** O §6 do
> `agent-orchestration/omega/planos/SAN2-2-plano.md` (l.221 e l.223) recebeu **errata apensa** apontando
> a consulta ao `netsh`, **sem apagar as linhas originais** (§A2). Era exatamente a metade que a Fase 4
> do `SAN2-2` **nao podia** fazer, e disse por escrito que nao podia — o plano estava fora do escopo
> dela, e por isso ela se recusou, corretamente, a nomear um dono que nao havia combinado.

**O que é.** A porta **55432** — prescrita no mandato do bloco e no §6 do `SAN2-2-plano.md` (l.221 e l.223)
para o Postgres descartável — **não pode ser aberta nesta máquina**. Ela cai dentro de uma **faixa de
exclusão dinâmica reservada pelo Windows/Hyper-V**, e o `docker run` falha no *bind*, não no Docker:

```
docker: Error response from daemon: ports are not available: exposing port TCP 0.0.0.0:55432 -> 127.0.0.1:0:
listen tcp 0.0.0.0:55432: bind: Foi feita uma tentativa de acesso a um soquete de uma maneira que é proibida
```

**Verificado por consulta ao sistema (2026-08-30), não deduzido da mensagem de erro:**

```
$ netsh interface ipv4 show excludedportrange protocol=tcp
...
     55253       55352
     55353       55452      <- 55432 cai AQUI
...
```

**O contorno que a Fase 2 tomou:** o par descartável subiu em **56432** (Postgres) e **56379** (Redis) —
ambos fora de toda faixa excluída na mesma listagem. Containers `san2-2-pg` / `san2-2-redis`. Nada mais
mudou: só host:porta.

**Por que isto vira registro em vez de morrer no log.** A porta é o **primeiro** comando de qualquer bloco
que precise de cluster descartável — o arranjo que a `D-INSPETOR-TERRENO-JUNTA` **exige** de todo jurado que
muta. O plano do `SAN2-2` continua prescrevendo 55432 em duas linhas rastreadas; o próximo agente que o
seguir ao pé da letra bate na mesma parede e gasta o mesmo tempo diagnosticando um erro que **parece** do
Docker e é do Windows. Foi exatamente o que aconteceu aqui.

**Faixas são dinâmicas.** Os intervalos variam por máquina e mudam entre reinicializações do Hyper-V/WinNAT.
A lição durável **não** é "use 56432": é **consultar `netsh interface ipv4 show excludedportrange` antes de
escolher a porta**, e escolher fora do que a listagem mostrar.

### Severidade e dono — honestos, e por isso modestos

- **Severidade: BAIXA.** É a mesma classificação que a Fase 2 registrou no `dev-fase2-log.md` (l.319), e
  concordo com o critério: **não é defeito de produto**. Nada em `src/`, `tests/`, `prisma/` ou `.github/`
  está errado; nenhum número publicado depende disto; nenhum dado, dinheiro ou permissão é tocado. O custo é
  tempo de terreno de quem vier depois — real, mas limitado.
- **Escopo: `pre-existente`.** A reserva é configuração da máquina do dono e antecede o bloco; o `SAN2-2` não
  a criou. Evidência de origem: a faixa aparece na listagem do sistema, não em nada que este PR tenha tocado.
- **Dono: a atribuir — e não vou fingir que tenho um.** O trabalho que fecharia isto é documental (corrigir
  as duas linhas do `SAN2-2-plano.md`, ou somar a consulta do `netsh` à receita de cluster descartável em
  `docs/`), e **ambos os arquivos estão fora do escopo desta fase**, que só pode tocar `pendencias.md`.
  Nomear um dono que não combinei seria inventar compromisso alheio.

**Critério de fechamento:** a receita de cluster descartável (plano ou `docs/`) manda consultar as faixas
excluídas antes de fixar a porta, e nenhuma linha rastreada prescreve 55432 como se fosse livre.

- **status:** FECHADA · **severidade:** BAIXA · **dono:** bloco `SAN2-4b` (correcao C5) — fechada em 2026-08-31, ver bloco no topo da entrada


---

## P-SAN2-2-INDICE-DONO-SEMPRE-SIM (2026-08-30) — MÉDIA · a coluna "dono" do índice diz **sim** para quem não tem dono

**Registrado por §A2** (não esconder conflito), fora das cinco ações do mandato da Fase 4: o defeito foi
encontrado **enquanto se executava** a ação 3 desta fase, e cala-lo tornaria a própria ação 3 inconsequente.
**Não corrigido aqui** — `gerar-indice-pendencias.py` está fora do escopo desta fase (que só pode tocar
`pendencias.md` e o índice gerado), e quem acha não conserta (`D-JUNTA-SEPARACAO-DE-PAPEIS`).

**Como apareceu.** A ação 3 da Fase 4 re-atribuiu o dono de `P-O6R-B02-SUITES-LIST-CI`, que era
`a atribuir`, para *"o PR que mergear o `B-O6R-02`"*. Regenerado o índice, a linha **não mudou**: dizia `sim`
antes e diz `sim` depois. A coluna que existe para responder *"de quem é"* não distinguia dono nomeado de
dono ausente.

**O tamanho, medido em 2026-08-30 sobre este arquivo:**

| | qtde |
|---|--:|
| cabeçalhos `## P-` | 231 |
| marcados `dono = sim` pelo classificador | **108** |
| — dos quais o campo diz literalmente `a atribuir` (**falso sim**) | **91** |
| — com dono de verdade | 17 |

**Oitenta e quatro por cento** dos "sim" são falsos.

**O mecanismo — são DUAS faltas independentes, e cada uma sozinha já bastaria:**

```python
dono = bool(re.search(r'\*\*dono:\*\*\s*(?!a atribuir)', body, re.I)) \
    or bool(re.search(r'\*\*Dono:?\*\*', body, re.I))
```

1. **O lookahead negativo não protege**, porque `\s*` **retrocede para zero espaços**: a engine casa
   `**dono:**`, recua o `\s*` até vazio e avalia `(?!a atribuir)` diante de `" a atribuir"` — que começa com
   **espaço** e portanto não é `a atribuir`. O lookahead passa. Reproduzido isolado:
   `re.search(r'\*\*dono:\*\*\s*(?!a atribuir)', '- **dono:** a atribuir', re.I)` → **casa**.
2. **A segunda alternativa não tem filtro nenhum e roda sob `re.I`**, então `\*\*Dono:?\*\*` casa o
   `**dono:**` de qualquer entrada. Mesmo que a falta 1 fosse consertada, o `or` reintroduziria o defeito.

**Por que isto é da mesma família que o índice já foi reprovado por cometer.** O cabeçalho deste arquivo
promete que o índice responde *"o que está aberto, com que gravidade **e de quem é**"*. As duas primeiras
respostas foram endurecidas depois da reprovação da junta do `SAN2-1` (só a linha de status decide;
parcialidade nunca fecha; contradição não vira palpite). **A terceira nunca foi auditada** — e é a que diz a
231 leitores futuros que 91 pendências têm responsável quando não têm. É o mesmo dano do guard que dava
falso-vermelho: um sinal que não significa o que promete ensina o leitor a ignorá-lo.

**Correção indicada (não aplicada aqui):** decidir o campo pelo **texto do valor**, não pela presença do
rótulo — capturar `\*\*dono:?\*\*\s*([^
·]*)` e testar se o valor casa `a atribuir`. Quem receber deve
provar **por mutação**, como o `agents-mirror-guard` prova o seu: uma entrada com dono nomeado tem de sair
`sim`, e a **mesma** entrada com `a atribuir` tem de sair `a atribuir`. Enquanto não for corrigido, **a
coluna `dono` do `pendencias-indice.md` não deve ser citada** — vale ler o campo na fonte.

**Severidade: MÉDIA**, classificada aqui com o critério dito: não toca produto, dado, dinheiro nem permissão,
mas corrompe um terço da resposta do artefato de controle que a rodada inteira usa para saber o que está
pendente e com quem.

- **status:** ABERTA · **severidade:** MÉDIA · **dono:** bloco **SAN2-5** — "ferramentas de registro honestas", **parte 2**: as duas faltas medidas do classificador de dono em `agent-orchestration/controle/gerar-indice-pendencias.py` (dono NOMEADO pelo `SAN2-3`, §3.5 do plano, quitando a ressalva do porteiro do #363; se o dono humano redirecionar, re-atribui-se com registro)


---

## P-KPI-PAINEL-NAO-RENDERIZA-SUMMARY (2026-08-30) — MÉDIA · o painel não renderiza `release.summary` nem a `description` do history: a honestidade do bloco mora fora do artefato principal

**Origem: junta do `SAN2-2` (PR #363), cadeira C4 `auditor-do-kpi-honesto`** — achado **A-2** de
`agent-orchestration/omega/juntas/votos/SAN2-2/04-kpi-voto.json`, campo `achados`. Escopo declarado
**`pre-existente`** com evidência de origem, e por isso **publicado como pendência em vez de reprovar**
(`D-JUNTA-ESCOPO-E-CALIBRACAO`(a), §C7.1-ter). **Não foi consertado no `SAN2-2`:** `Kpis/index.html` não
está no diff do bloco e a junta já havia votado quando o achado foi tratado. Quem registra aqui **não é
quem achou e não conserta** (§C7.4-bis, `D-JUNTA-SEPARACAO-DE-PAPEIS`).

**O que é.** Todo bloco escreve, no `release.summary` do `Kpis/kpis-latest.json` e na `description` da sua
entrada do `Kpis/kpis-history.json`, o texto em que declara o que entregou **e o que NÃO fechou**. Esse
texto **não tem consumidor de render**: não chega ao `Kpis/index.html`, que a `D-KPI-INDEX-PAINEL` define
como **o artefato**.

### A medição da C4, citada como ela a registrou

> "Removi a linha do FROZEN (l.1623, que e dado congelado e nao codigo de render) e procurei consumidores em
> `Kpis/app.js`: `release.` / `.summary` / `.description` -> UMA unica ocorrencia,
> `if (latest.release && latest.release.status_label) bits.push(latest.release.status_label);` (l.932) — e
> `status_label` NEM EXISTE no JSON, logo nem essa dispara. O `Kpis/index.html` tem 172 linhas e suas secoes
> sao state / charts / conclusion / recent / findings / roadmap: nenhuma para o texto do release. A prosa da
> 'Conclusao' e MONTADA pelo app.js a partir de `metrics` (l.1150-1180), nao do summary."

E a evidência de origem que sustenta o escopo `pre-existente`, também dela:

> "A MESMA medicao sobre `git show main:Kpis/app.js` (main = 87f6ae6, o merge do #362, mergeado em
> 2026-08-29) devolve a MESMA unica ocorrencia `latest.release.status_label`. A propriedade antecede a branch
> em qualquer leitura, e o diff deste PR em `Kpis/app.js` e regeneracao do FROZEN (item 3e:
> `JSON.stringify(FROZEN) === JSON.stringify(latest)` = true), nao codigo de render."

### Re-medição própria (2026-08-30) — não herdei a conclusão, reproduzi

Excluída a linha `var FROZEN` (l.1623, dado congelado, não código de render), varrendo `summary`,
`description`, `release.` e `release[` nas **três** árvores:

| árvore | ocorrências fora do FROZEN |
|---|---|
| `main` = `87f6ae615c07872c820b3a0dda771a6b48fb4d0d` (merge do #362, 2026-08-29) | **1** — `l.932: latest.release.status_label` |
| head julgado `c8dc716` | **1** — a mesma, `l.932` |
| árvore de trabalho (já com a correção do A-1) | **1** — a mesma, `l.932` |

E a única ocorrência **não dispara**: `grep -c status_label Kpis/kpis-latest.json` = **0**. O
`Kpis/index.html` (172 linhas) não contém as palavras `summary`, `description` nem `release` — nem na
árvore, nem em `git show main:Kpis/index.html`. **Idêntico na `main`, anterior a este bloco: o escopo
`pre-existente` se sustenta na medição, não na declaração.**

**O tamanho do que não chega, medido:** `release.summary` tem **5.988 caracteres**, e a `description` da
entrada `SAN2-2` do history tem os **mesmos 5.988** — é o mesmo texto nos dois lugares, e nenhum dos dois
tem consumidor.

**O que o painel mostra no lugar (medido, para não confundir o próximo leitor).** A seção "Últimas demandas"
existe, mas hidrata de `latest.recent.itens[]` (`Kpis/app.js` l.1195-1234) — um array **curado à mão**, com
campo próprio `resumo` (8 itens hoje, resumos de 203 a 588 caracteres, o mais novo o PR #359). Não é o
`release.summary` nem a `description` do history. Ou seja: o painel **não é mudo**, ele conta outra coisa,
escrita em outro campo — e o parágrafo onde o bloco declara o que ficou aberto não é essa coisa.

### Por que importa

A `D-KPI-INDEX-PAINEL` (§C3.0) estabelece que **o `Kpis/index.html` é o ARTEFATO** e os JSON são só a
**fonte de dados** — "é ele que o dono abre para ver onde o projeto está". O `summary` é justamente onde
cada bloco declara **o que NÃO fechou**; no `SAN2-2` ele traz um bloco próprio intitulado *"O QUE ESTE BLOCO
NÃO FECHOU, dito antes que perguntem"*, com três itens. **Nada disso chega ao painel.**

A consequência é assimétrica e é o ponto: enquanto isto valer, *"o painel é a entrega"* vale **para os
números** — que hidratam, têm card, têm gráfico e têm guard — e **não vale para as ressalvas**, que existem,
são escritas com evidência, são cobradas pela junta… e ficam invisíveis no artefato principal. A honestidade
do registro tem custo de produção e **zero alcance** em quem o painel serve. É também o que derruba a segunda
perna do argumento que os blocos vêm usando sobre o §C3.0 — *"o lugar honesto delas é a `description`"* —:
a `description` não é um lugar do painel.

### Severidade

**MÉDIA**, e a classificação é **da C4** (`gravidade: "MEDIA"`, `bloqueia: false` no voto), não um carimbo
deste registro. O que eu verifiquei é o **mecanismo** — as três medições acima — e ele é compatível com o
critério que este arquivo já vem usando para MÉDIA: não toca produto, dado, dinheiro nem permissão, e nenhum
valor de `metrics` depende disto; mas corrompe o alcance do artefato de controle que a rodada inteira usa
para dizer onde o projeto está. Quem discordar da gravidade tem a medição inteira acima para reclassificar
sem refazer o trabalho.

### Dono e o que falta

**Dono: bloco `SAN2-5`** — "ferramentas de registro honestas", **parte 1**: o bloco que toca
`Kpis/app.js` e `Kpis/index.html`. O registro original não nomeava bloco ("a atribuir", por não querer
afirmar compromisso sem execução atrás); o `SAN2-3` **nomeou** o dono (§3.5 do seu plano, quitando a
ressalva do porteiro do #363), e a **linha de status** ao final desta pendência é o campo canônico.
Se o dono humano redirecionar, re-atribui-se com registro.

O que a C4 aponta como correção natural, **registrado como direção e não como plano** (quem acha e quem
registra não consertam): uma seção no painel que renderize `release.summary` — e a `description` por entrega
no histórico —, **hidratada do JSON** como a §C3.1.0 exige, com o fallback `file://` honesto e rotulado. Quem
receber deve provar por **mutação**, como os guards de KPI já provam os seus: mudar o texto no JSON tem de
mudar o painel, e texto ausente não pode virar seção vazia mentindo que não havia ressalva.

**Critério de fechamento:** abrir o `Kpis/index.html` com dado real mostra o texto em que o bloco declarou o
que não fechou, hidratado do JSON, e um guard permanente falha se essa seção sumir ou defasar do snapshot.

- **status:** ABERTA · **severidade:** MÉDIA · **dono:** bloco **SAN2-5** — "ferramentas de registro honestas", **parte 1**: `Kpis/app.js` e `Kpis/index.html` passam a renderizar o `release.summary` e a `description` do history (dono NOMEADO pelo `SAN2-3`, §3.5 do plano, quitando a ressalva do porteiro do #363; se o dono humano redirecionar, re-atribui-se com registro)


---

## P-OBITUARIO-DERIVADO-DO-DIRETORIO (2026-08-31) — MÉDIA · o `OBITUARIO-IDENTIDADES.md` cobre quem tinha ARQUIVO, não quem VOTOU: 15 identidades queimadas ficaram fora do registro

**Origem: junta do `SAN2-3` (PR #364), cadeira C1 `auditor-do-obituario`** — achado **A-1** de
`agent-orchestration/omega/juntas/votos/SAN2-3/01-obituario-voto.json`, campo `achados`. Escopo declarado
**`pre-existente`** com evidência de data e de origem, e por isso **publicado como pendência em vez de
reprovar** (`D-JUNTA-ESCOPO-E-CALIBRACAO`(a), §C7.1-ter) — a junta fechou **APROVADO 3×0**. Quem registra
aqui **não é quem achou e não conserta** (§C7.4-bis, `D-JUNTA-SEPARACAO-DE-PAPEIS`); a cadeira C1 fechou o
achado com `correcao_proposta: null`, e nada abaixo é plano de conserto.

**O que é.** O `agent-orchestration/omega/juntas/OBITUARIO-IDENTIDADES.md` foi derivado do **diretório**
`.claude/agents/especialistas/` (17 arquivos, vivos em `demo/investidor` nas duas pontas do espelho), não
das **atas**. O universo que ele cobre é, portanto, "identidade que existiu como **arquivo de agente**" — e
não "identidade que **votou**". Como as juntas dos últimos dias foram compostas por cadeiras que nunca
tiveram arquivo em `especialistas/`, elas assinaram voto, queimaram-se, e **não entraram no registro**.

### A medição da C1, com N, forma e causa

- **N = 15** identidades queimadas fora do registro.
- **Forma:** contadas **só** nos `agent-orchestration/omega/juntas/votos/*/*.json` que têm **campo de autor**
  (`jurado`/`identidade`/`cadeira`), e **só** em juntas **concluídas**.
- **Causa:** o registro derivou do **diretório**, não das atas — `git ls-tree demo/investidor --
  .claude/agents/` devolve **0 ocorrências para cada um dos 15 nomes**: essas identidades **nunca existiram
  como arquivo de agente**, e por construção não podiam aparecer numa lista extraída de `especialistas/`.
- **O número real é MAIOR que 15**, e isto faz parte do achado: **jurados caídos** (nomeados em briefing,
  que não chegaram a assinar) e **inspetores de terreno** de cada junta **não foram contados** — a forma da
  medição exigia campo de autor em voto de junta concluída.

**Evidência de data (o que sustenta o escopo `pre-existente`):** `J-B-O6R-REG.md` (`74430cc`, 2026-08-29),
`J-SAN2-1R.md` (`87f6ae6`, 2026-08-29), `J-SAN2-R.md` (`a0a1075`, 2026-08-29) e `J-SAN2-2.md` (`d283903`,
2026-08-30) — **todas anteriores** ao head julgado `23d9227` (2026-08-30). **Evidência de origem:** o
mandato escrito do bloco era registrar os de `.claude/agents/especialistas/` (`omega/planos/SAN2-3-plano.md`
l.54-57, citando os porteiros do #362 e do #363); identidade sem arquivo **nunca esteve no enunciado**.

### As 15, nomeadas

Do `B-O6R-REG` e da série `SAN2-1`/`SAN2-1R`: `jurado-reg-diff-escopo` · `jurado-kpi-numeros-B-O6R-REG` ·
`jurado-suplente-trilha-append-only-B-O6R-REG` · `jurado-san2-1-kpi-registro-ciclo2` ·
`jurado-triagem-classificacao-san2-1-c2` · `jurado-san2-1r-fidelidade-opcao-c` ·
`jurado-san2-1r-diff-portagem-2026-08-29` · `jurado-suplente-kpi-registro-san2-1r`.

Da série `SAN2-R`: `jurado-san2r-diff-espelho-2026-08-29` · `jurado-forense-san2r-c1-2026-08-29` ·
`jurado-san2r-kpi-registro`.

**E as quatro cadeiras que julgaram o `SAN2-2` (PR #363)** — as mais recentes, e as que mais custam num
descuido de composição: `provador-de-mutacao-do-espelho` · `curador-da-lista-suites-ci` ·
`zelador-do-contrato-canonico` · `auditor-do-kpi-honesto`.

### O atenuante MEDIDO — e é ele que salva o documento

O obituário **não produz falsa segurança escrita**, e a C1 mediu os dois motivos:

1. **Ele declara a própria fronteira.** O §4 ("Papéis permanentes — o obituário NÃO os cobre") diz, no
   texto, que o registro cobre **identidades descartáveis de caso** e que para o resto **aponta as atas**.
2. **Ele se recusa a absolver por ausência** — §1.4, **fail-closed**: *"Ausência do nome aqui NÃO absolve:
   as atas do caso continuam sendo a prova... nome não listado exige a conferência nas atas, não um passe
   livre."* O mesmo texto foi inserido no `inspetor-de-terreno-da-junta` (bloco `3.1-bis`), de modo que o
   gate que consulta o obituário **continua obrigado ao `grep` nas atas**.

Ou seja: o defeito é de **cobertura**, não de **confiabilidade**. Quem seguir o documento como ele está
escrito **não** compõe junta com identidade queimada — só não recebe do documento a ajuda que poderia
receber. É por isso que a gravidade é MÉDIA e o achado não reprovou.

### Por que importa mesmo assim

A regra que o registro serve é dura: identidade `SEPULTADA` **não entra em junta nenhuma, nunca** (§1.2). O
custo de errar é recompor uma junta inteira depois de ela ter votado — foi para evitar isso que o obituário
existe. Enquanto ele responder "quem tinha arquivo", a pergunta que o orquestrador faz na composição
("posso usar este nome?") continua dependendo de uma varredura manual nas atas, que é justamente o trabalho
que o §1.1 promete ter resolvido em **0 colisões** como condição de partida. E o conjunto ausente não é
marginal: inclui **a junta imediatamente anterior**.

### Dono e o que falta

**Dono: bloco `SAN2-5`** — mesma família de trabalho documental já atribuída a ele nas duas outras
pendências desta rodada ("ferramentas de registro honestas"), **parte 3**. Nomeado pelo bloco `SAN2-3` no
tratamento pós-junta; se o dono humano redirecionar, re-atribui-se **com registro**.

A direção que o achado permite registrar — **como direção, não como plano**, porque quem acha e quem
registra não consertam: uma **segunda passada do obituário derivada das ATAS** (varredura dos
`omega/juntas/votos/**/*.json` e das `J-*.md` pelo campo de autor e pelos briefings), somando as identidades
sem arquivo às 17 já listadas, e nomeando explicitamente as classes que a medição da C1 **não** contou
(jurados caídos, suplentes que não assinaram, inspetores de terreno).

**Critério de fechamento:** o `OBITUARIO-IDENTIDADES.md` passa a ser **derivado das atas**, não do
diretório — a lista contém as 15 nomeadas acima **mais** as classes hoje não contadas, cada linha com a
evidência do voto/ata que a queimou; e o §5 (divergência §A2) é reconciliado com o placar novo. Enquanto
isso não acontecer, o §1.4 **fail-closed** permanece o que garante que a lacuna não vire passe livre.

- **status:** ABERTA · **severidade:** MÉDIA · **dono:** bloco **SAN2-5** — "ferramentas de registro honestas", **parte 3**: segunda passada do obituário **derivada das atas** (não do diretório `especialistas/`), absorvendo as 15 identidades nomeadas acima e as classes não contadas pela medição da C1 (dono NOMEADO no tratamento pós-junta do `SAN2-3`; se o dono humano redirecionar, re-atribui-se com registro)

## P-ARNES-RATCHET-POR-CONTAGEM-CEGO-A-PROSA (2026-08-31 — achado do `SAN2-4b`, correcoes C3/C4) — `pre-existente`, NOMEADO, **sem correcao proposta**

**Achador:** a instancia dev das correcoes C3/C4 do `SAN2-4b`, por execucao. **Quem acha nao conserta**
(§C7.4-bis): esta entrada relata **defeito, evidencia e motivo**, e **nao** propoe correcao.

**O defeito do instrumento.** A `FROZEN_ALLOWLIST` de `tests/db-catalog-write-guard.test.ts` e um
**ratchet por CONTAGEM**: congela, por arquivo, quantos padroes de escrita de catalogo
(`CREATE ROLE` / `DROP ROLE` / `GRANT` / `REVOKE` / `OWNER TO`) o arquivo contem, e fica vermelho quando
o numero se move. A regex conta **ocorrencias de texto** — e por isso conta **igual** uma linha de SQL
executavel e uma mencao em **comentario**. Consequencia: trocar SQL por prosa em quantidade igual **nao
move o numero**, e o ratchet **nao ve**.

**Medido, nao deduzido** (regexes do proprio guard, head base `f6631d0` x estado com C3+C4):

| arquivo | base `f6631d0` | com C3+C4 | composicao base | composicao depois |
|---|---|---|---|---|
| `tests/rls-tenant-isolation.test.ts` | **8** | **8** | CREATE ROLE 2 · DROP ROLE 2 · GRANT 4 | CREATE ROLE 2 · DROP ROLE 2 · GRANT 4 |
| `tests/helpers/auth-identity-fixture.ts` | **30** | **30** | CR 9 · DR 8 · GRANT 10 · REVOKE 1 · OWNER TO 2 | idem |

O total identico e **coincidencia de composicao**, nao ausencia de mudanca: a correcao C4 **removeu** o
`DROP ROLE IF EXISTS` do SQL de `tests/rls-tenant-isolation.test.ts` (migrou para
`dropEphemeralRoleResilient`), e a **prosa** que explica a migracao **menciona** `DROP ROLE`. Dois -> dois,
com o SQL virando comentario. O `SAN2-4b` registrou o fato na `reason` da entrada, no formato do
precedente escrito no repo, para o proximo auditor nao ler "8" e concluir que nada aconteceu — mas **a
trava nao teria pego esta migracao sozinha**.

**Por que nao foi corrigido aqui.** O desenho do ratchet esta **fora da lista fechada do §5.1** do
`SAN2-4b-plano.md`, que so autorizava atualizar as **entradas afetadas** da allowlist com contagem medida
e motivo. Corrigir o instrumento e mudanca de desenho, com alternativas que precisam ser escolhidas e
provadas (contagem sobre o SQL depois de remover comentarios? contagem por AST? separar SQL de comentario
na propria regex?) — nao e uma linha, e nao cabe a quem achou.

**Escopo: `pre-existente`, com evidencia de origem — CORRIGIDA em 2026-08-31 (achado C3-A2 da junta
J-SAN2-4b).** O ratchet por contagem **nasceu em `0a39824`, 2026-08-19, bloco `B-O6R-01` (#357)** — nao
no `B-O6R-ARNES`, como esta entrada declarava na sua primeira redacao. A classificacao `pre-existente`
**fica de pe e mais forte**: sao **12 dias** antes do inicio desta branch, nao 3.

Medido (re-executado por quem escreve esta emenda, nao copiado do voto):

```
git log --diff-filter=A -- tests/db-catalog-write-guard.test.ts   -> 0a39824  2026-08-19  (B-O6R-01, #357)
git log -S 'FROZEN_ALLOWLIST' -- tests/db-catalog-write-guard.test.ts -> so 0a39824
git log -- tests/db-catalog-write-guard.test.ts -> 3 commits: 0a39824 (19/08) - f081b5d (28/08) - ecfdb24 (31/08)
```

E `git show 0a39824:tests/db-catalog-write-guard.test.ts` mostra o mecanismo **inteiro** ja la:
`CATALOG_WRITE_PATTERNS` (l.48), `FROZEN_ALLOWLIST` com `count` (l.60), `countCatalogWrites` sobre o
**texto cru** lido por `readFileSync` (l.144/166) e o `count !== frozen.count` (l.185) — inclusive a
propria entrada `rls-tenant-isolation.test.ts` ja com `count: 8` e a **mesma** `reason` (l.71-74). Isto e,
a cegueira a prosa ja estava completa no dia em que o arquivo nasceu.

O `B-O6R-ARNES` (`f081b5d`, 2026-08-28) **atualizou contagens e razoes de uma allowlist herdada** — o
diff dele nao toca uma linha de `countCatalogWrites`, `CATALOG_WRITE_PATTERNS`, `readFileSync` nem do
comparador `count !== frozen.count` (grep sobre `git diff f081b5d~1 f081b5d` do arquivo: saida vazia). O
`SAN2-4b` (`ecfdb24`, 31/08) apenas **exercitou** a cegueira, ao migrar um `DROP ROLE` para o helper.
Nenhum dos dois a criou.

**Por que a correcao valia a pena** (nenhum numero, codigo ou veredito muda com ela): sob um rotulo que
promete *evidencia de origem*, a atribuicao errada mandava o futuro dono desta pendencia procurar o
desenho do ratchet no **#359**, onde ele **nao esta**. Um `git log --diff-filter=A` de dois segundos no
arquivo da o bloco certo. Registrado aqui em vez de reescrito em silencio (§A2).

**Criterio de fechamento:** o guard passa a distinguir **SQL executavel de comentario** (por qualquer
mecanismo que o bloco dono escolher), e a distincao e provada **por mutacao** — trocar um `DROP ROLE`
executavel por uma mencao em comentario deixa o guard **vermelho**.

- **status:** ABERTA · **severidade:** a classificar · **dono:** a atribuir — candidato natural e o
  proximo bloco autorizado a tocar o desenho de `tests/db-catalog-write-guard.test.ts` (o `B-O6R-02`
  ciclo 5 ja tem, no seu §C6, mandato escrito para mexer nas contagens e razoes do ratchet). Nao nomeio
  dono que nao combinei.

## P-REG-BATERIA-NAO-TYPECHECA-TESTS (2026-08-31 — achado do `SAN2-4b`, correcao C2) — `pre-existente`, NOMEADO, **sem correcao proposta**

**Achador:** a instancia dev da correcao C2 do `SAN2-4b`, por execucao. **Quem acha nao conserta**
(§C7.4-bis).

**O defeito.** `npm run check` e `npm run lint` sao **o mesmo comando** (`lint` -> `check` ->
`tsc -p tsconfig.json --noEmit`), e o `tsconfig.json` declara `"include": ["src/**/*.ts"]`. Logo, **a
bateria oficial do repositorio nao faz typecheck de `tests/`**. Erro de tipo em arquivo de teste nao
aparece em `check` nem em `lint`.

**Conferido por execucao, nao lido do `tsconfig`:**
`npx tsc -p tsconfig.json --noEmit --listFiles | grep -c authority-portal.test.ts` = **0** — o arquivo de
teste **nao entra** no programa que o typecheck monta.

**Por que importa.** `tests/` e onde vivem os guards que esta governanca usa como prova (o ratchet de
catalogo, o piso de denominador do runner, os drills PD de sweep, os contratos de frontend lidos por
texto). Um guard com erro de tipo pode atravessar a bateria e falhar so na execucao. O `SAN2-4b`
contornou rodando um typecheck **avulso** do arquivo que tocou (ec=0, log `T1-typecheck-teste.log`), para
nao entregar codigo nao checado — mas o contorno vale para **um** arquivo e **uma** vez, nao para a
bateria.

**Por que nao foi corrigido aqui.** `tsconfig.json` e **explicitamente proibido** pelo §5.2 do
`SAN2-4b-plano.md`. E a correcao nao e trivial: incluir `tests/` no programa muda de uma vez o que o
`check` cobre em todo o repositorio, podendo acender erros pre-existentes em muitos arquivos. Precisa de
bloco proprio, com o vermelho medido antes.

**Escopo: `pre-existente`, com evidencia de origem.** O `include` restrito a `src/**/*.ts` ja estava no
`tsconfig.json` antes desta branch, e **nenhuma** das correcoes do `SAN2-4b` o tocou — o `tsconfig.json`
nao aparece no diff do bloco.

**Criterio de fechamento:** `npm run check` passa a typechecar `tests/`, com o vermelho pre-existente
medido e publicado antes (quantos arquivos, quantos erros, quais classes), e a prova e **por mutacao**:
introduzir um erro de tipo num arquivo de `tests/` deixa `npm run check` vermelho.

- **status:** ABERTA · **severidade:** a classificar · **dono:** a atribuir — o trabalho toca
  `tsconfig.json` e potencialmente muitos arquivos de `tests/`; nomear dono sem combinar seria inventar
  compromisso alheio.

---

## P-KPI-RECENT-CONGELADO (2026-08-31) — MÉDIA · a seção "Últimas demandas" do painel está parada em 28/08: renderiza um estado que já não é verdade

**Origem: junta do `SAN2-4b` (PR #366), cadeira C3 `zelador-do-escopo-do-registro-e-do-kpi`** — achado
**A-3** de `agent-orchestration/omega/juntas/votos/SAN2-4b/03-escopo-registro-kpi-voto.json`, campo
`achados`. Escopo declarado **`pre-existente`** com evidência de origem, e por isso **publicado como
pendência em vez de reprovar** (`D-JUNTA-ESCOPO-E-CALIBRACAO`(a), §C7.1-ter) — a junta fechou
**APROVADO 3×0, unanimidade**. Quem registra aqui **não é quem achou e não conserta** (§C7.4-bis,
`D-JUNTA-SEPARACAO-DE-PAPEIS`); a C3 fechou o achado com `correcao_proposta: null`, e **nada abaixo é
plano de conserto**.

**O que é.** O objeto `recent` do `Kpis/kpis-latest.json` — o array **curado à mão** que alimenta a seção
"Últimas demandas" do painel — está **congelado em `as_of 2026-08-28`, com PR-topo 359**. De lá para cá
mergearam o **#364** (`SAN2-3`) e o **#365** (`SAN2-4a`), e ambos **estão** no `Kpis/kpis-history.json`.
A seção **é renderizada**: não é dado morto, é dado velho exibido.

**Re-medido por quem registra (não herdei a conclusão da C3 — reproduzi):**

| árvore | `recent.as_of` | itens | PRs listados | `recent` idêntico ao de `main`? |
|---|---|---|---|---|
| `main` | `2026-08-28` | 8 | 359 · (sem pr) · 355 · 354 · 353 · 352 · 347 · 351 | — |
| head julgado `2d2d16d` | `2026-08-28` | 8 | os mesmos 8 | **sim**, byte a byte |
| árvore de trabalho | `2026-08-28` | 8 | os mesmos 8 | **sim** |

E o consumo é real, não hipotético:

```
Kpis/app.js  l.1195  var rec = latest.recent;
Kpis/app.js  l.1233  setHTML("recent-list", html);
Kpis/app.js  l.1234  reveal("recent-section");
Kpis/app.js  l.1558  if (latest.recent) addSource(latest.recent.source);
Kpis/index.html l.106 <section class="section" id="recent-section" …>   l.114 <ol id="recent-list">
                l.23  <a href="#recent-section" …>Últimas demandas</a>   (item de navegação)
```

Contraprova do outro lado: `Kpis/kpis-history.json` tem **149** entradas na árvore, com as três últimas
mergeadas sendo `pr 363` · `pr 364` · `pr 365`, mais a entrada de autoria deste bloco (`pr: null`, §C3.5).
Ou seja, o histórico **sabe** de #364 e #365; a seção que o dono vê, **não**.

**Escopo `pre-existente`, com evidência de origem.** O objeto `recent` do blob de `main` já trazia
`as_of 2026-08-28` e PR-topo 359 **enquanto o history de `main` já continha `SAN2-3` (#364) e `SAN2-4a`
(#365)** — a classe nasce, no mínimo, no bloco que mergeou o #364, antes desta branch. `main` e head são
**idênticos** nesse objeto: o `SAN2-4b` não criou nem agravou nada aqui, e o §5.1 do plano dele escopou o
trabalho de KPI à dívida dupla mais a entrada do próprio bloco.

**Por que importa — e por que casa com `P-KPI-PAINEL-NAO-RENDERIZA-SUMMARY`.** As duas são a mesma família:
**o artefato principal contando o que não é mais verdade.** A `D-KPI-INDEX-PAINEL` (§C3.0) diz que o
`Kpis/index.html` **é a entrega** — "é ele que o dono abre para ver onde o projeto está" — e que o painel
**hidrata em runtime dos JSON**, de modo que atualizar o JSON já move o painel. As duas pendências são as
duas metades do furo dessa promessa:

- a **irmã** (`P-KPI-PAINEL-NAO-RENDERIZA-SUMMARY`): o texto em que cada bloco declara **o que NÃO fechou**
  existe no JSON e **não tem seção** — honestidade produzida com alcance zero;
- **esta**: a seção **existe, tem navegação e hidrata** — só que de um array **curado à mão** que ninguém
  atualiza. O painel não está mudo nem vazio; ele está **afirmando** que a última entrega é o #359.

A irmã falha por omissão; esta falha por **afirmação desatualizada**, que é a metade visível. E as duas se
explicam pelo mesmo desenho: o que o painel mostra não deriva da fonte que os blocos são obrigados a
atualizar — deriva de um campo paralelo, mantido por lembrança.

**Severidade: MÉDIA**, pelo mesmo critério que este arquivo já aplicou à irmã: não toca produto, dado,
dinheiro nem permissão, nenhum valor de `metrics` depende dela, os guards de KPI (`kpi-freeze --check`,
`kpi-dashboard-charts`) seguem verdes porque **não é divergência de série** — mas corrompe o alcance do
artefato de controle que a rodada inteira usa para dizer onde o projeto está. A gravidade que a C3
declarou no voto é `observa` (`bloqueia: false`), que é a escala da **junta**; **MÉDIA** é a tradução para
a escala **deste arquivo**, feita por quem registra, com a medição inteira acima para quem quiser
reclassificar sem refazer o trabalho.

**Critério de fechamento:** abrir o `Kpis/index.html` com dado real mostra as últimas entregas **de fato**
(incluindo #364, #365 e #366), e a atualização **não depende de alguém lembrar** — ou a seção passa a
derivar do `history`, ou um guard permanente fica **vermelho** quando o PR-topo de `recent` fica atrás do
PR-topo do `history`. Prova **por mutação**, como os outros guards de KPI já se provam: mergear uma entrega
sem tocar `recent` tem de acender vermelho.

- **status:** ABERTA · **severidade:** MÉDIA · **dono:** bloco **SAN2-5** — "ferramentas de registro honestas", **parte 2**: o mesmo bloco que já detém `Kpis/app.js` e `Kpis/index.html` pela `P-KPI-PAINEL-NAO-RENDERIZA-SUMMARY` (parte 1). É a atribuição coerente com a irmã, não um dono inventado: o conserto mora nos mesmos dois arquivos. Se o dono humano redirecionar, re-atribui-se com registro.

---

## P-AUTHORITY-N-NAO-CANONICO-NO-STORED (2026-08-31) — BAIXA · os campos numéricos do `stored` do authority aceitam forma não-canônica: ` 1024`, `0x400` e `+1024` passam por `N = 1024`

**Origem: junta do `SAN2-4b` (PR #366), cadeira C1 `auditor-do-produto`** — achado **C1-I3-A1** de
`agent-orchestration/omega/juntas/votos/SAN2-4b/01-produto-voto.json` (`itens` → `C1-I3` → `achados`).
Escopo declarado **`pre-existente`** com evidência de data, e por isso **publicado como pendência em vez
de reprovar** (`D-JUNTA-ESCOPO-E-CALIBRACAO`(a), §C7.1-ter) — a junta fechou **APROVADO 3×0**. Quem
registra aqui **não é quem achou e não conserta** (§C7.4-bis, `D-JUNTA-SEPARACAO-DE-PAPEIS`); a C1 fechou
o achado com `bloqueia: false` e sem correção proposta, e **nada abaixo é plano de conserto**.

**O que é.** A correção C1 do `SAN2-4b` fechou a canonicidade dos campos **base64** do `stored`
(`parseStored` passou a exigir round-trip em `salt` e `hash`, e a pinar o `keylen` como constante do
sistema). Os campos **numéricos** ficaram como estavam: `src/modules/authority/authority-password.ts:74-76`
lê `N`, `r` e `p` com `Number(parts[n])`, e `Number` é **tolerante** — aceita espaço em volta, notação
hexadecimal e sinal explícito. O guard de canonicidade que o bloco introduziu vale para `parts[4]` e
`parts[5]`; **não** alcança `parts[1..3]`.

**Vetor W08, re-medido por quem registra** (a C1 nomeou espaço, `0x400` e `1e3`; reproduzi e a lista saiu
maior):

```
node -e '…Number(s), Number.isInteger(Number(s))…'
 "1024"       -> 1024   isInteger=true    (canônico)
 " 1024"      -> 1024   isInteger=true    <- aceito como N=1024
 "1024 "      -> 1024   isInteger=true    <- aceito como N=1024
 "	1024
"   -> 1024   isInteger=true    <- aceito como N=1024
 "0x400"      -> 1024   isInteger=true    <- aceito como N=1024
 "+1024"      -> 1024   isInteger=true    <- aceito como N=1024
 "1e3"        -> 1000   isInteger=true    (parseia, mas vira OUTRO custo: 1000 != 1024)
```

Isto é: **cinco** grafias distintas do mesmo `stored` verificam `true` contra o mesmo hash. `1e3` é caso
à parte — atravessa o parse, mas com `N` diferente, logo a derivação não bate.

**O que isto NÃO é — e a C1 foi explícita.** **Não é bypass de autenticação.** A senha correta segue
exigida; os 32 bytes seguem comparados inteiros; e mudar o **valor** de `N` quebra a verificação
(`N=2` → `false`). O vetor só é alcançável por quem **já tem escrita no banco** — quem tem isso já pode
trocar o hash inteiro. O efeito prático é de **canonicidade de formato**, não de controle de acesso.

**Escopo `pre-existente`, com evidência de data.** A linha `const N = Number(parts[1])` nasce em
**`5a6a91b`, 2026-07-28**, `Ω5P PR-18a` (#306) — **34 dias** antes do início desta branch. E ela está
**intocada** no diff do bloco: `git diff 45c3b97 2d2d16d | grep 'Number(parts'` = **saída vazia**
(`ec 1`). O `SAN2-4b` não criou, não moveu e não agravou; ele fechou uma classe **vizinha** (base64 e
keylen) e, ao fazê-lo, tornou visível o que sobrou. Dos 21 vetores que a C1 testou, **20 fecharam**; este
é o único sobrevivente, e é de outra classe.

**Critério de fechamento:** `parseStored` passa a exigir que `parts[1..3]` sejam a **forma canônica**
decimal do número que representam (isto é, o round-trip `String(Number(x)) === x`, o mesmo teste barato já
usado para o base64), e a exigência é provada **por mutação**: um `stored` com ` 1024`, `0x400` ou `+1024`
no lugar de `1024` passa a ser **rejeitado**, e o `stored` legítimo continua aceito.

- **status:** ABERTA · **severidade:** BAIXA · **dono:** a atribuir — candidato natural é o próximo bloco autorizado a tocar `src/modules/authority/authority-password.ts`, onde a correção cabe em `parseStored` junto do guard de base64 que o `SAN2-4b` acabou de introduzir. Não nomeio bloco que não combinei.

---

## P-ARNES-SWEEP-DEPENDE-DA-DISCIPLINA-DO-OPERADOR (2026-08-31) — MÉDIA · "as 68 órfãs da base viva seguem intocadas" é propriedade do **operador**, não do **código**: verdadeiro como executado, não garantido por construção

**Origem: junta do `SAN2-4b` (PR #366), cadeira C2 `auditor-do-arnes-e-da-suite`** — achado **A-C2-1** de
`agent-orchestration/omega/juntas/votos/SAN2-4b/02-arnes-suite-voto.json`, campo `achados`. Escopo
declarado **`pre-existente`** com evidência de data, e por isso **publicado como pendência em vez de
reprovar** (`D-JUNTA-ESCOPO-E-CALIBRACAO`(a), §C7.1-ter) — a junta fechou **APROVADO 3×0**. Quem registra
aqui **não é quem achou e não conserta** (§C7.4-bis, `D-JUNTA-SEPARACAO-DE-PAPEIS`); a C2 fechou o achado
declarando `disposicao: pendência nomeada` e **sem** propor correção, e **nada abaixo é plano de conserto**.

**O que é.** A correção C3/C4 do `SAN2-4b` acrescentou a família `rls_test` à `SWEPT_ROLE_FAMILIES` do
`tests/helpers/auth-identity-fixture.ts`, fechando "as duas portas do varredor". O registro do bloco
afirma, ao lado disso, que **"as 68 órfãs da base viva seguem intocadas"**. A afirmação é **verdadeira como
executado** — nenhum comando foi enviado a `erp-postgres` durante o bloco nem durante a junta — mas ela
descreve **o que o operador fez**, e não **o que o código impede**. Não há nada no código que impeça o
varredor de alcançar aquelas 68 roles: o que houve foi disciplina.

**Re-medido por quem registra, só em arquivo — nenhum comando enviado à base viva, nem de leitura:**

```
grep -o "@[^/]*" .env            (raiz do repo)  ->  @localhost:5432     = a base viva
ls .claude/worktrees/san2-r/.env                 ->  não existe          = o worktree não tem .env próprio
head -1 tests/rls-tenant-isolation.test.ts       ->  import "dotenv/config";
tests/helpers/auth-identity-fixture.ts l.117-124 ->  SWEPT_ROLE_FAMILIES inclui "rls_test"
```

Encadeado: `npm test` **da raiz** é a forma **documentada** de rodar a bateria (CLAUDE.md §9); o teste
carrega `dotenv/config`; o `.env` da raiz aponta para a base viva; e o sweep, desde esta correção, cobre a
família `rls_test`. Logo, **após o merge, um `npm test` da raiz varre a base viva e recolhe as 68** — que
é exatamente o dado que `P-ARNES-RLS-TEST-FORA-DO-SWEEP` reserva para **recontagem supervisionada**.

**Escopo `pre-existente`, com evidência de data** (blame conferido por mim, linha a linha):

| quando | commit | o que entrou |
|---|---|---|
| 2026-08-19 | `0a39824` (#357, `B-O6R-01`) | o mecanismo de sweep, o corte de idade e o `ORPHAN_ROLE_NAME_PATTERN` |
| 2026-08-28 | `f081b5d` (#359, `B-O6R-ARNES`) | as **cinco** famílias irmãs da `SWEPT_ROLE_FAMILIES` (l.117-122) |
| 2026-08-31 | `ecfdb24` (**este** bloco) | a linha `"rls_test"` (l.123) — a **sexta** família |

Desde **28/08**, portanto, um `npm test` da raiz **já** dropava as roles velhas de cinco famílias na base
viva. O `SAN2-4b` estendeu a uma sexta o que já valia para cinco — que é **o que o plano lhe mandou
fazer**. E o `.env` da raiz apontando `localhost:5432` é anterior a tudo isso (configuração de ambiente do
dono). Segundo braço do §C7.1-ter(a): **consertar isto estava fora do escopo permitido** — o §5.1 do plano
deu às correções C3/C4 exatamente três arquivos de `tests/` e interditou `.env`, base viva e a resolução da
pendência irmã.

**Por que não reprova, e por que mesmo assim fica registrado.** Nenhum número publicado depende disto;
nenhum comportamento medido muda; sob a regra vigente da rodada (cluster descartável por jurado, base viva
intocável) o caminho **não dispara**. O bloco **declarou** a pendência irmã aberta e **não** alegou tê-la
resolvido — não há "carimbar o que não se mediu". O dado em risco é **forense** (a contagem e os
timestamps das 68), não de produto: as roles não possuem objetos, só grants.

O que fica registrado é a **classe do enunciado**: uma garantia escrita no registro como se fosse
propriedade do sistema, quando o que a sustenta é a conduta de quem roda o comando. É a mesma família de
defeito que esta rodada vem perseguindo — afirmação que sobrevive porque ninguém executou o caminho que a
derrubaria. Enquanto a frase valer só por disciplina, ela **não** é insumo válido para a recontagem
supervisionada que a pendência irmã planeja: quem for recontar precisa saber que qualquer `npm test` da
raiz feito nesse intervalo pode ter mudado o denominador.

**Critério de fechamento:** a propriedade deixa de depender de conduta — o sweep **recusa-se a rodar**
contra um banco que não seja descartável (ou exige opt-in explícito para varrer), de modo que rodar
`npm test` da raiz com o `.env` do dono **não** alcance as 68; e a recusa é provada **por mutação**:
apontar o `DATABASE_URL` para a base viva deixa o caminho **vermelho** em vez de silenciosamente
produtivo. Enquanto isso não existir, a frase "seguem intocadas" só pode ser publicada com a qualificação
"**como executado**", nunca como garantia.

- **status:** ABERTA · **severidade:** MÉDIA · **dono:** a junta de `P-ARNES-RLS-TEST-FORA-DO-SWEEP` (l.3473) — é ela que já detém a recontagem supervisionada das 68 e a decisão consciente sobre a família `rls_test`; separar as duas criaria dois donos para o mesmo dado. Atribuição feita conforme a disposição declarada pela própria cadeira C2 no voto, não inventada aqui.

---

## P-SYNC-AGENTS-NAO-RECURSIVO (2026-08-31 — medido pelo dev do `SAN2-5`, entrega E2d) — MÉDIA · `pre-existente` · o espelho Codex é **cego** a `.claude/agents/especialistas/**`, e por isso o `ec=0` do S0 **não prova nada** sobre os corpos de jurado

**Origem: `SAN2-5`, bloqueio B2 (corpos das cadeiras do ciclo 5).** Registrada por quem **não** vai
consertá-la e **sem** propor correção (§C7.4-bis, `D-JUNTA-SEPARACAO-DE-PAPEIS`): editar
`scripts/sync-agent-agents.mjs` é `scripts/**`, **proibido** pelo §5 do plano deste bloco.

**O que é, medido por leitura do arquivo, l.66:**

```js
const files = readdirSync(SRC).filter((f) => f.endsWith('.md')).sort();
```

`readdirSync` **plano, sem recursão**. O diretório `especialistas` não termina em `.md`, logo o filtro o
descarta — e **todo o conteúdo de `.claude/agents/especialistas/**` é invisível ao espelho**. O script
espelha, hoje, os **23** corpos-base de `.claude/agents/*.md` e mais nada.

**Consequência dupla, e a segunda é a que importa:**

1. **Benigna** — trazer os corpos de especialista para a linhagem **não quebra o S0**:
   `node scripts/sync-agent-agents.mjs --check` continua `ec=0`, "23 agentes", porque não os enxerga.
2. **Perigosa — conforto falso.** O `inspetor-de-terreno-da-junta` é **fail-closed** e tem a "fatia S0"
   (`--check` consistente) entre as condições de LIBERADO (§C7.1-bis). Um inspetor que leia o `ec=0`
   como prova de que os corpos de jurado estão íntegros **estará lendo um verde que não foi medido
   sobre eles**. É a classe de defeito desta rodada: afirmação que sobrevive porque ninguém executou o
   caminho que a derrubaria.

**Divergência de convenção entre as duas trilhas, registrada e NÃO resolvida em silêncio (§A2).**
Contado por `git ls-tree -r`: `demo/investidor` **TEM** `.agents/agents/especialistas/` com **17 de 41**
arquivos — ou seja, aquela branch espelhou os especialistas por **algum mecanismo que a `main` não tem**
(não pode ter sido este script). A `main` não espelha nenhum. As duas trilhas divergem na convenção do
espelho de especialistas, e **nenhum lado foi escolhido aqui**.

**Por que não se espelha à mão.** Reproduzir manualmente a transformação do script (limpeza de
frontmatter + preâmbulo de emulação Codex) é reproduzir à mão **exatamente a classe de erro que o script
existe para evitar** — e um espelho escrito à mão diverge do gerado no primeiro `--check` que alguém
rodar em modo escrita.

**Critério de fechamento (o que fecha, não como fazer):** (a) uma decisão **escrita** sobre se
`.claude/agents/especialistas/**` **deve** ou **não deve** ser espelhado para o Codex — as duas
respostas são legítimas, o que não é legítimo é a ausência; (b) se **deve**, o espelho passa a ser
gerado pelo mesmo mecanismo dos 23 corpos-base, e `--check` fica **vermelho por mutação** quando um
corpo de especialista muda sem o espelho acompanhar; (c) se **não deve**, o `--check` (ou o corpo do
`inspetor-de-terreno-da-junta`) passa a **declarar por escrito o que ele NÃO cobre**, para que nenhum
inspetor futuro leia o `ec=0` como cobertura que ele não tem; (d) e, em qualquer dos dois caminhos, a
divergência de convenção com `demo/investidor` fica reconciliada por escrito.

**Enquanto isto não fechar, a prova dos corpos de jurado é a TABELA DE HASHES** (`git hash-object`, que
aplica a normalização de fim de linha) publicada no **APENSO DE COMPOSIÇÃO, §E1.8**, de
`agent-orchestration/omega/planos/B-O6R-02-ciclo5-plano.md` — **nunca** o `ec=0` do S0. O apenso E1.6 já
diz isso ao inspetor do ciclo 5, com todas as letras.

- **status:** ABERTA · **severidade:** MÉDIA · **escopo:** `pre-existente` (evidência: o `readdirSync`
  plano é o mecanismo original do script, anterior à existência de `.claude/agents/especialistas/`, que
  nasceu nos ciclos de especialistas deste bloco; nenhum bloco desta rodada o alterou) · **dono:** a
  atribuir — candidato natural é o próximo bloco autorizado a tocar `scripts/sync-agent-agents.mjs`.
  **Não nomeio bloco que não combinei**, e não atribuo ao ciclo 5: `scripts/sync-agent-agents.mjs`
  **não está na allowlist fechada** do dev do ciclo 5 — o §5 do plano dele (l.129-134) lista os arquivos
  permitidos **um a um** e fecha com *“Arquivo fora das listas → o dev PARA e devolve”* —, e o ciclo 5 é a
  **última tentativa** do `B-O6R-02` (`D-TETO-DOIS-CICLOS`); carregá-lo com matéria alheia é exatamente o
  que consumiu o ciclo 4.

**ERRATA (2026-09-01 — tratamento pós-voto do PR #367, achado `C3-A4` da cadeira C3; §A2, nada apagado;
escrita por quem **não** achou o defeito, §C7.4-bis):** a linha de status acima dizia, até aqui, que *“o §5 do
plano dele congela `scripts/**`”*. **É falso, e a medição é reproduzível:** `grep -n 'scripts/\*\*'` em
`agent-orchestration/omega/planos/B-O6R-02-ciclo5-plano.md` sai **vazio** nas **783** linhas do arquivo — a
string não existe lá. Mais: o §5 **l.131** lista `scripts/run-backend-tests.mjs` como arquivo **PERMITIDO** ao
dev do ciclo 5, e o §5 **l.133** manda o S0 rodar `scripts/sync-agent-agents.mjs` **em modo escrita** + commit.
O PROIBIDO da **l.134** congela `src/**` inteiro, os demais `tests/**`, o `ci.yml`, `prisma/schema.prisma`,
migrations existentes, `CLAUDE.md`/`AGENTS.md`, `.env`, lockfiles, `infra/**`, frontend, mobile, RBAC e
`mvp_*` — **`scripts/**` não está na lista**, e nenhum apenso o acrescentou.

**Corrigi a JUSTIFICATIVA, não a CONCLUSÃO.** A atribuição fica onde estava (fora do ciclo 5, dono *a
atribuir*) porque nunca dependeu daquela premissa: ela se sustenta pelo outro pé, que agora é o único
escrito — o arquivo **não está na allowlist fechada** do dev do ciclo 5, e a regra do §5 é *“Arquivo fora
das listas → o dev PARA e devolve”*, num ciclo que é a **única tentativa** restante (`D-TETO-DOIS-CICLOS`).
A **outra** alegação de escopo desta mesma pendência — *editar o script é `scripts/**`, proibido pelo §5 do
plano **deste** bloco* — foi re-conferida e **é verdadeira**: `SAN2-5-plano.md` **l.427** traz `scripts/**` no
PROIBIDO, com o parêntese *“executar `kpi-freeze`/`sync`/`run-backend-tests` sim; EDITAR não”*. Essa fica.

---

## P-CLAUDE-ABERTURA-PRECEDENCIA-DESATUALIZADA (2026-09-01 — medido pelo dev do `SAN2-6`, §3.7.1 do plano) — BAIXA · `pre-existente` · **dono: o dono** · a abertura do contrato canônico ainda manda valer o `AGENTS.md`; a regra de espelhamento, 25 linhas abaixo, manda o contrário

**O que está escrito hoje, com linha e literal** (medido no worktree `san2-r`, sobre `CLAUDE.md` já com
as edições do SAN2-6 — a abertura não foi tocada por este bloco):

- `CLAUDE.md` **l.3-6** (blockquote de abertura): *"Onde este arquivo divergir do `AGENTS.md` ou das
  fontes de verdade, **valem o `AGENTS.md` e as fontes de verdade** — nunca a memória do agente."*
- `CLAUDE.md` **l.28-30** (regra de espelhamento, `D-INTEROP-CLAUDE-CODEX`, 2026-07-28): *"**Em
  qualquer divergência, prevalece o `CLAUDE.md`.** Isto **atualiza** o parágrafo de abertura acima (que
  dizia \"valem o `AGENTS.md` e as fontes de verdade\"): as **fontes de verdade** (§A1) seguem valendo
  acima de tudo; entre os **dois contratos espelhados**, o canônico é o `CLAUDE.md`."*
- `AGENTS.md` **l.7-8** já está certo: *"ele é a fonte da verdade; este `AGENTS.md` é o espelho
  adaptado. Em divergência, prevalece o `CLAUDE.md`."* — o espelho **não** replica o defeito.

**Por que isto é uma pendência e não um erro de leitura.** A l.28 é honesta: ela **se declara** uma
atualização do parágrafo de abertura, e cita a frase que revoga. Ou seja, o contrato não se contradiz
sem saber — ele carrega a errata inline. O problema é operacional, não lógico: **a errata está 25
linhas depois da afirmação que ela revoga**, e a afirmação revogada é a **primeira** coisa que um
executor lê. Quem parar na l.6 — e o parágrafo seguinte manda "ler o arquivo inteiro", o que já é
admissão de que ninguém para lá por acidente — sai com a precedência **invertida**: acreditará que, em
choque entre os dois contratos, vale o `AGENTS.md`. Exatamente a hipótese que o `SAN2-6` passou o bloco
inteiro tentando eliminar em dois outros pontos (P1–P6 e o teto), pela mesma razão: **norma que exige
salto de referência não é lida sob pressão**.

**Superfície real do risco, medida:** os dois contratos ficaram, neste PR, com o bloco §C7.4→§C7.7
**idêntico** (diff de 0 linhas, eol-neutro) — então, para o trecho que este bloco tocou, a precedência
não decide nada hoje. O risco é o **próximo** drift: no momento em que os dois divergirem de novo, o
leitor da l.6 e o leitor da l.28 resolvem o conflito para lados opostos.

**O que este bloco NÃO fez, e por quê.** Não corrigiu. Mexer no **parágrafo de abertura do contrato
canônico** é decisão do dono, não de dev: (a) está fora do §5 deste plano, que autoriza em `CLAUDE.md`
**só** o §C7.4 e o §C7.7; (b) a abertura é o texto que todo agente lê primeiro, e reescrevê-la muda o
enquadramento de todos os blocos futuros; (c) `D-INTEROP-CLAUDE-CODEX` é decisão registrada do dono
(2026-07-28) e o desenho de duas camadas — "fontes de verdade acima de tudo" + "entre os espelhados,
o `CLAUDE.md`" — pode ser intencional na forma em que está.

**Sem correção proposta (§C7.4-bis: quem acha não conserta).** As opções que existem são visíveis por
si só a quem decidir; nomeá-las aqui seria escrever o conserto com a confiança de quem achou o defeito,
que é a classe que a separação de papéis existe para cortar.

**Critério de fechamento:** uma decisão escrita do dono sobre a redação da abertura do `CLAUDE.md`, e o
`AGENTS.md` conferido contra ela **no mesmo trabalho** (regra de espelhamento: alterou um, altera o
outro no mesmo bloco/commit/PR).

- **status:** ABERTA · **severidade:** BAIXA · **escopo:** `pre-existente` (evidência de origem: o
  texto da abertura é de 2026-07-28, data de `D-INTEROP-CLAUDE-CODEX`; nenhum bloco desta rodada o
  alterou — `git log -1 --format=%ad -L3,6:CLAUDE.md` e o diff deste PR, que não toca as 30 primeiras
  linhas do arquivo) · **dono:** o dono (decisão humana — nenhum agente).

---

## Registro §A2 do bloco `SAN2-6` (2026-09-01) — o que foi consolidado, e as cinco divergências plano × terreno

> **Onde este registro deveria estar, e por que está aqui.** O mandato do dev pedia a entrada em
> `agent-orchestration/controle/decisoes.md`. O **§5 do plano do SAN2-6 é uma lista fechada de 9
> alvos**, e `decisoes.md` **não está nela** — `controle/pendencias.md` está, e o próprio §3.7.2 do
> plano manda gravar o "Registro §A2 (SAN2-6)" **neste** arquivo, no mesmo append da pendência. Entre
> o mandato e o plano, **o plano vence** (é a regra que o próprio mandato repete). Nada do conteúdo
> foi perdido: ele está inteiro abaixo, mais na `description` da entrada 151 do `kpis-history.json` e
> no diário do dev. **Sexta divergência, portanto, e é esta.**

**(1) Consolidação de micro-drift entre os contratos espelhados (§A2 — nada em silêncio).** O §C7.4 do
`AGENTS.md` dizia *"A fábrica de agentes **continua** a existir…"*; o `CLAUDE.md`, canônico, diz *"A
`agente-fabrica` **continua**…"*. Divergência de **redação**, não de norma — mas divergência entre
espelhos, e a regra manda registrar antes de consolidar. **Consolidada para o canônico** (`CLAUDE.md`),
com re-quebra de linha para acompanhá-lo. Prova: o bloco do §C7 que vai do item 4 ao item 7, extraído
dos dois contratos e comparado eol-neutro, passou de **2 linhas divergentes** para **0 linhas de diff**
(110 linhas de cada lado).

**(2) Reatribuição das 3 dívidas de KPI do porteiro pós-merge do #367.** O parecer
(`agent-orchestration/omega/juntas/votos/SAN2-5/00c-porteiro-pos-merge-367.md`) nomeou-as para "o PR do
ciclo 5": (a) backfill §C3.5 do #367; (b) `blocks_completed` 156→157; (c) ancorar ao head as provas
"442 0"/"100 0". **As três foram pagas pelo `SAN2-6`**, que entrou na fila antes por ordem literal do
dono (fonte de verdade nº 1, §A1). A inserção **não contorna o gate**: o parecer do porteiro continua
valendo integralmente para o ciclo 5. Razão de mérito: o ciclo-teto tem **uma** tentativa
(`D-TETO-DOIS-CICLOS`) e não deve gastá-la pagando dívida alheia. Precedente idêntico e recente: o
`SAN2-5` reatribuiu a si o item B.10 do porteiro do #366.

**(3) As cinco divergências plano × terreno** — quatro medidas pelo dev das entregas §3.1–§3.5 e uma
pelo dev do §3.6/§3.7. **Todas são de descrição no plano; nenhuma de norma**, e nenhuma mudou uma
linha do texto que passou a valer:

| # | O plano afirma | O terreno mede | Efeito |
|---|---|---|---|
| i | `PROTOCOLO-JUNTA-RESILIENTE.md` tem **97** linhas (§3.5, §4.6) | **96** (`wc -l` = `awk END{NR}` = 96; termina com CRLF completo) | **Nulo.** A prova de append-only foi refeita com `head -96` (0 linhas de diff) e com `numstat` **14 0** |
| ii | o bloco do §C7.7 tem **59** linhas; líquido **+48**, total **+53** (§3.2) | o texto que o próprio plano transcreve tem **52** linhas (27+25); líquido **+41**, total **+46** por contrato (`numstat` 57 11) | **Nulo.** Copiou-se o **texto** (normativo), não o número (descritivo). O orçamento do D-a é um **teto** (≤60) e ficou cumprido com folga — nenhuma linha de *Caso* precisou ser cortada |
| iii | "**0** referências a `omega5p` fora do README" (§3.4.5, R7) | **161 ocorrências em 39 arquivos** (atas `J-OMEGA5P`, `omega/reprovacoes/R-omega5p-*`, `docs/kpis/omega5p/*`, `kpis-history.json`) | **Nulo sobre a ação, corrigido na medição.** Todas são **registro histórico**, não ponteiro operacional; e `ls .claude/agents/omega5p* .agents/agents/omega5p*` devolve *No such file* nos dois lados — **nenhum corpo de papel Ω5P existe em disco**. A tabela do README era o único lugar **vivo** que mandava invocá-los. Remover as 5 linhas não orfanou nada e não reescreveu história |
| iv | a tabela do README tem **24** papéis | **26** linhas de papel (`git show HEAD:.agents/agents/README.md \| grep -cE '^\| \`[a-z0-9-]+\`'`) | **Nulo.** O título era falso por dois motivos, não um. 26 − 5 (Ω5P) + 2 (gates) = **23**, o mesmo destino que o plano previu por outro caminho ("21 + 2") |
| v | o §5 põe no PROIBIDO `agent-orchestration/codex/comandos/B-O6R-02-ciclo5-plano.md` | esse caminho **não existe** (`ls` → *No such file or directory*); o arquivo é `agent-orchestration/omega/planos/B-O6R-02-ciclo5-plano.md` | **Nulo sobre a ação** (não foi tocado sob nenhum dos dois nomes), **não nulo como norma**: um PROIBIDO que aponta para o vazio não protege nada, e a próxima junta mede pelo caminho |

**(4) O que fica ABERTO e com dono nomeado, para não se perder no fim do bloco:**
`P-CLAUDE-ABERTURA-PRECEDENCIA-DESATUALIZADA` (acima, **dono: o dono**) ·
`P-SYNC-AGENTS-NAO-RECURSIVO` (ABERTA, dono a atribuir — **não** é do ciclo 5) · o guard **E2c**
(`tests/junta-voto-escopo-guard.test.ts`) segue **não-nascido**, e a re-medição manual na abertura de
cada junta continua sendo a única rede — consignação do porteiro do #367, preservada.

**(5) A SÉTIMA divergência — achada pela JUNTA, não pelo dev, e FECHADA aqui.** Apensa em 2026-09-02,
pós-voto de `J-SAN2-6` (**APROVADO 3×0, zero achado `bloqueia`**), a partir dos achados **C2-A1** e
**C3-A1** — gravidade **alta**, escopo `dentro-do-bloco`, encontrados **por duas cadeiras independentes**.

*O que divergiu:* o `Kpis/*` deste bloco foi escrito **uma única vez**, em `53e44d3`
(2026-09-01 23:00:44), e **nunca mais tocado**, enquanto `2c1eee1` (+1.702) e `41e2316` (+43) traziam
**depois** o maior artefato do PR — o comando do Codex para o ciclo 5 (`B-O6R-02-ciclo5.md`, 1.301 l.) e
o plano do `B-O6R-07` (444 l.). A `description` da entrada 151 inventariava **45,4%** do PR e omitia
**2.067 das 3.783 linhas adicionadas (54,6%)**, das quais **1.745 (46,1%) descritíveis** — violação do
**§C3.1** sobre quase metade do próprio PR, num artefato que o §C3.0 define como **o principal**.

*A ordem que autorizou o alargamento de escopo, agora num controle durável:* ordem literal do dono, na
mesma sessão — *"o proximo bloco mergea isso me passe o handoff do codex e seu prompt … planeje tambem
um bloco para vc atacar"* — **fonte de verdade nº 1 (§A1), que vence o §5 de um plano**. Até esta
correção ela existia **só** no §1 do `BRIEFING-SAN2-6.md`, que é **insumo de junta** e é ele próprio um
dos arquivos fora da lista fechada do §5 — isto é, a autorização morava dentro da coisa que ela
autorizava.

*A CONSEQUÊNCIA ACEITA, que passa a valer como norma de processo:* **escopo permitido de um plano não é
emendável por ordem verbal sem registro.** Ordem do dono que amplie o escopo de um bloco **em curso**
entra no **Registro §A2** *e* na `description` do KPI do bloco, **no mesmo PR, antes do merge** — não em
insumo de junta, não só no chat.

*Estado:* **FECHADA neste mesmo trabalho** — a `description` da entrada 151 e o `release.summary` do
`kpis-latest.json` passaram a inventariar as três peças omitidas (o comando do Codex, o plano do
`B-O6R-07`, o briefing e os artefatos da junta), com a autorização transcrita, e o item (4) da seção *"O
QUE ESTE BLOCO NAO FECHOU"* ganhou a ressalva da C3-A1. Correção executada pelo `dev-san2-6-correcoes`
(identidade nova) sob o plano `agent-orchestration/omega/planos/SAN2-6-correcoes-pos-voto.md`, com
diário em `agent-orchestration/omega/juntas/votos/SAN2-6/dev-correcoes-pos-voto.md` — **§C7.4-bis
respeitado: quem achou (C1/C2/C3) não consertou.**

**(6) As duas pendências nomeadas que a junta abriu e que este bloco NÃO fecha** (`C1-A3` e `C3-N1`,
ambas `nota`, ambas `pre-existente`): registradas logo abaixo, com **bloco dono** nomeado.

---

## P-ESPELHO-C7-3-MECANISMO-PESQUISADOR (2026-09-02 — achado `C1-A3` da junta `J-SAN2-6`) — BAIXA · `pre-existente` · **não corrigir sem tocar o §C7.3 do espelho**

**O que é.** Diffando o **§C7 inteiro** dos dois contratos espelhados no head (167 linhas de cada lado,
eol-neutro) — e não só o bloco que o `SAN2-6` alterou —, sobra **exatamente uma** linha divergente: o
item 3 (*Regra da dúvida*) nomeia **`agente-pesquisador-web`** no `CLAUDE.md` e **"subagente pesquisador
web"** no `AGENTS.md`.

**Medição, re-executada em 2026-09-02 sobre o head `e545e64`** (idêntico a `d90fbbb` nos dois contratos —
`git diff --numstat d90fbbb HEAD -- CLAUDE.md AGENTS.md` sai vazio):

```
$ diff <(git show HEAD:CLAUDE.md | tr -d '\r' | sed -n '323,489p') \
       <(git show HEAD:AGENTS.md | tr -d '\r' | sed -n '351,517p')
56c56
< 3. **Regra da dúvida:** qualquer dúvida → `agente-pesquisador-web` (≥3 fontes) → registro PD em
---
> 3. **Regra da dúvida:** qualquer dúvida → subagente pesquisador web (≥3 fontes) → registro PD em
ec=1   (uma unica linha em 167)
```

**Por que NÃO é divergência de regra, e por que mesmo assim fica registrada.** É diferença
estritamente de **mecanismo** (como se invoca um subagente), o caso **explicitamente permitido** por
`D-INTEROP-CLAUDE-CODEX`: *"Diferenças permitidas apenas quando forem estritamente específicas da
ferramenta."* A **regra** é idêntica dos dois lados — ≥3 fontes, registro PD **antes** da decisão, dúvida
sem pesquisa = veto. Registra-se para que uma passada futura **não a redescubra como achado** e gaste um
ciclo com ela.

**Evidência de escopo `pre-existente`:** a divergência já está no blob da **base** `e6a6461` e nasceu em
`39eb46c`, **2026-07-28** — `chore(governance): interoperabilidade Claude Code ↔ Codex … (#303)` —,
medido por `git log -1 -S'subagente pesquisador web' -- AGENTS.md`. Nenhum hunk do `SAN2-6` toca essas
linhas.

**Sem correção proposta (§C7.4-bis).** A cadeira que achou não conserta, e este bloco não a corrige.

**Critério de fechamento:** quando algum bloco tocar o **§C7.3 do espelho** por outro motivo, decidir
conscientemente entre (a) manter a diferença de mecanismo e **anotá-la inline** como permitida por
`D-INTEROP-CLAUDE-CODEX`, ou (b) uniformizar a redação. Fechar sem tocar o §C7.3 seria mexer no contrato
só para calar uma nota.

- **status:** ABERTA · **severidade:** BAIXA · **escopo:** `pre-existente` (evidência de origem:
  `39eb46c`, 2026-07-28, PR #303) · **dono:** o bloco que tocar o §C7.3 do `AGENTS.md`.

---

## P-KPI-CARIMBO-MVP-DEFASADO-SAN2-5 (2026-09-02 — achado `C3-N1` da junta `J-SAN2-6`) — BAIXA · `pre-existente` · **bloco dono: SAN2-5**

**O que é.** As `note` de `metrics.mvp_demo` e `metrics.mvp_vendavel` do `Kpis/kpis-latest.json`
terminavam no carimbo **`[SAN2-4b: INTOCADO — …]`**, **dois blocos atrasado**: o `SAN2-5` **não** apensou
o seu. Um leitor do `kpis-latest.json` via `version: "SAN2-6"` com carimbo de `mvp_*` dizendo `SAN2-4b`.

**Não é violação do §C3.4** — que exige justificativa **quando o valor muda**, e os valores **99% / 88%
não mudaram**. É defasagem de **carimbo**, não de número.

**Medição, re-executada em 2026-09-02** (blob da base × blob do head, para não medir a árvore já
corrigida):

```
mvp_demo     | value base 99 -> head 99 | note BYTE-IDENTICA base<->head: true | 442 chars
mvp_vendavel | value base 88 -> head 88 | note BYTE-IDENTICA base<->head: true | 421 chars
base version: SAN2-5   head version: SAN2-6
ambas terminando em: "... nova ao usuario (§C3.4).]"
```

A `note` do blob de `e6a6461` (o merge do **#367 / SAN2-5**) é **byte-idêntica** à do head: é por isso
que `mvp_*` **não aparece** entre as folhas alteradas do `kpis-latest.json` neste PR. **A defasagem
nasceu no SAN2-5, não neste bloco** — daí o escopo `pre-existente` e o bloco dono.

**O que o SAN2-6 fez, e o que deliberadamente NÃO fez.** Apensou o **seu** carimbo —
`[SAN2-6: INTOCADO — o bloco não move escopo de produto]` — **sem apagar** o do `SAN2-4b`. **NÃO forjou o
carimbo do `SAN2-5`**: ele nunca foi posto, e escrevê-lo agora seria **fabricar registro** de um bloco
que não o escreveu. O vão `SAN2-4b → SAN2-5` fica **visível e nomeado** nesta pendência, que é o lugar
honesto para ele.

**Critério de fechamento:** decisão consciente de (a) deixar o vão como registro histórico — a leitura
que este bloco recomenda, por ser o que de fato aconteceu — ou (b) o dono autorizar uma nota de errata
no `kpis-history.json` da entrada do `SAN2-5` dizendo que o carimbo não foi posto. **Em nenhuma hipótese
por retro-escrita de um carimbo `[SAN2-5: …]` que ninguém escreveu na época.**

- **status:** ABERTA · **severidade:** BAIXA · **escopo:** `pre-existente` (evidência de origem: a `note`
  no blob da base `e6a6461`, merge do #367, é byte-idêntica à do head) · **dono:** SAN2-5.

---

## P-O6R-B02-INDISPUTE-RESTORE (2026-08-22) — estorno devolve `in_dispute` para `open`

Achado menor da `J-B-O6R-02-ciclo1`. Um título em **disputa**, pago e depois estornado, volta para `open`: o
`restorePaymentGuarded` recalcula o status a partir do `paid_amount` (`= 0 → open`, parcial →
`partially_paid`) e não tem como saber que o estado anterior era `in_dispute`.

**Por que NÃO foi corrigido neste ciclo.** Preservar o estado anterior exige (a) **coluna aditiva** que guarde
o status pré-liquidação — e o plano do ciclo 2 é explícito: nenhuma migration nova, nenhuma coluna, nenhum
índice — e (b) **regra de negócio** que ninguém decidiu: um título em disputa que recebe pagamento continua
em disputa? o estorno reabre a disputa ou a encerra? São perguntas de domínio, não de implementação.

Encaminhamento: **decisão do dono/junta** antes de qualquer código. status: ABERTA.

## P-O6R-B02-CHEQUE-UNCLEAR (2026-08-22) — não existe des-compensar um cheque compensado por engano

Consequência **declarada** do guard `cheque_entry_immutable` (C2 do ciclo 2, fecha `Ω6R-DIN-011`). Com a regra
"movimento de cheque só se desfaz pela máquina de estados do cheque", some o único caminho que existia para
desfazer um `clear` — o `reverse` do lançamento de compensação. E era justamente esse caminho que devolvia
dinheiro em dobro, então tirá-lo é a correção, não o defeito.

**O caso bancário real está coberto:** cheque compensado que depois volta do banco é `bounce`
(`cleared → bounced`), que posta contra-lançamento e leva o líquido a zero. O que NÃO tem porta é o **erro de
operação** — compensar o cheque errado. Hoje a saída é operacional (lançamento avulso de ajuste, que fica no
razão com trilha), não uma transição de estado.

Encaminhamento: se o dono/junta quiserem uma transição `cleared → deposited` (des-compensar), ela precisa de
desenho próprio — quem pode, com que trilha, e o que acontece com a conciliação do lançamento compensado.
Registrado para não virar surpresa em produção. status: ABERTA.

## D-DIVERGENCIA-C4-PONTA-AUSENTE (2026-08-25) — plano do ciclo 4 (C4.1) REABRE um invariante do ciclo 3

**Registrada pelo desenvolvedor do ciclo 4 (§C7.4-bis: quem implementa registra a divergência plano×código,
não a resolve por conta própria). §A2: conflito registrado ANTES da consolidação.**

O plano `B-O6R-02-ciclo4-plano.md` §C4.1 manda: *"ponta DECLARADA ausente do razão é ERRO em TODOS os status
(nunca skip silencioso)"*, e o §0.6 nomeia `reversalClosure` (financial-ledger.ts:75) como *"a mecânica exata
do B-4"*. **Medido por mim, por execução**, o comportamento ATUAL do helper para ponta declarada + razão
vazio: `cleared` → ACUSA (vermelho de regra "e vale 0"); `bounced`/`deposited`/`registered`/`cancelled` →
**PASSA em silêncio** (4/5 mudos). Isso CONFIRMA o B-4.

**A divergência:** existe teste committado do CICLO 3 — `tests/financial-ledger-helper.test.ts`,
*"[P6] ponta declarada que não existe no razão não inventa membro nem quebra a travessia"* — que assere,
com racional escrito (*"um id órfão não pode virar exceção de runtime — tem de virar o vermelho de REGRA...
ponta sem linha no razão é ausência de dinheiro, não erro de programa"*), EXATAMENTE o oposto do C4.1: que a
ponta ausente NÃO é erro, e sim o vermelho de regra do `cleared`. O plano do ciclo 4 **não menciona** esse
teste ao mandar transformar a ponta ausente em erro.

**Como foi resolvido (seguindo o plano, não julgando-o):** implementei o C4.1 (ponta ausente = `assert.fail`
nomeando as duas causas, nos 5 status — ainda AssertionError, não exceção de runtime, então o espírito
"não crash de programa" do ciclo 3 é preservado) e ATUALIZEI o teste "ponta órfã" do ciclo 3 para a nova
regra (agora espera o erro de ponta ausente). O plano §5 lista `financial-ledger-helper.test.ts` como arquivo
que o dev do C4 modifica, então a atualização está no escopo. **A JUNTA decide se a reabertura é aceita** —
este registro existe para que a reversão do invariante do ciclo 3 seja consciente, com evidência, e não passe
silenciosa. status: REGISTRADA (aguarda ata da junta do ciclo 4).

## P-O6R-ARNES-ISOLAMENTO — EMENDA do ciclo 5 do B-O6R-02 (2026-09-02) — o objeto disputado NOMEADO, por determinação do §12 do plano

**Emenda, não reabertura: o texto das entradas anteriores fica intocado (§A2).** O plano do ciclo 5 (§12)
mandou emendar esta pendência com o que o §0.a/§0.b dele mediu, para que a informação viva AQUI e não só
no corpo do plano:

- **O objeto disputado do `XX000` tem nome:** a **tupla de ACL** — `pg_namespace.nspacl` e
  `pg_class.relacl` —, escrita pelas concessões/remoções de privilégio e pelo descarte de objetos de
  papel efêmero. **`pg_authid` NÃO colide**: sonda de par criação×criação = **0/150**; sondas de par nas
  ACLs = **200/200**. Isto fecha o "a nomear por execução no ciclo 5" da ERRATA de 28/08 acima.
- **O `XX000` atinge inclusive quem toma o lock** (medido na bateria barata do §0.a do plano: as vítimas
  incluem `rls-tenant-isolation` ×3 e `auth-identity-backfill-db` via o arnês) — a propriedade correta é
  "mecanismo ÚNICO entre TODOS os escritores", jamais "os de fora entram no lock". O mecanismo único foi
  entregue pelo `B-O6R-ARNES` (#359); a expectativa pós-#359 confere no head pós-absorção: **D29 13/13**,
  forma `(6, 37)` constante, 0 `XX000` (terreno pós-absorção §3).
- **O que segue AQUI (fora do B-O6R-02):** P1 (paralelismo declarado do runner), P4 (DDL de esquema
  compartilhado), a divergência das TRÊS formas de execução (seed/detrito), as 68 órfãs `rls_test_` da
  base do dono (`P-ARNES-RLS-TEST-FORA-DO-SWEEP`), o teto da fila do lock e o vermelho ambiental da
  canônica 1 (este último agora com pendência própria: `P-O6R-B02-CRASH-NO-LOAD-SEM-SKIP`).

- **status:** ABERTA (emenda registrada) · **severidade:** a classificar · **dono:** a atribuir

## P-O6R-B02-CRASH-NO-LOAD-SEM-SKIP (2026-09-02 — carve-out do CP-3 do ciclo 5) — MÉDIA · escopo `pre-existente`

`tests/core-saas-role-authority.test.ts` **morre no CARREGAMENTO** quando falta `DATABASE_URL` — o
`throw` em escopo de módulo de `src/database/prisma.ts:12` dispara no import, antes de qualquer `test()`
se registrar — em vez de declarar skip como o irmão `-db`. Consequências medidas (apenso SAN2-2 de
2026-08-30 em `P-O6R-B02-RUNNER-SUMICO-SEM-SKIP`): o arquivo some inteiro do denominador; o **piso de
denominador do #359 o pega e o NOMEIA** (é o vermelho ambiental declarado da canônica 1), mas o defeito
do arquivo continua — a bateria sem banco não consegue sair verde legitimamente.

**Por que não fechou no B-O6R-02 c5:** a correção exige tocar `src/database/prisma.ts` (ou o teste fora
da lista §5) — `src/**` é PROIBIDO no bloco (o produto financeiro está fechado por 3 cadeiras) e o
arquivo de teste está fora do escopo permitido. Escopo `pre-existente` com produtor nomeado por execução
(§C7.1-ter(a)).

**Critério de fechamento:** sem `DATABASE_URL`, o arquivo declara skip (ou registra os testes e pula) —
canônica 1 com **0 fail ambiental** e os pulos DECLARADOS; o piso do runner continua mudo para ele.

- **status:** ABERTA · **severidade:** MEDIA · **dono:** a atribuir (bloco que possa tocar `src/database/prisma.ts` ou o teste)

## P-O6R-ARNES-ISOLAMENTO — EMENDA de PRECISÃO do ciclo 5 (2026-09-03) — o vazamento +5/+5 tem TABELA nomeada, não ARQUIVO

**Emenda, não reabertura: o texto das entradas anteriores fica intocado (§A2).** Corrige, no registro
canônico, uma frase que este bloco publicou afirmando mais do que a execução exercitou — apanhada pelo
`critico-c5-adversarial` (ACHADO-4) **antes** do voto da junta, e aceita sem contestação.

**O que foi medido por execução (vale):** rodada instrumentada da canônica 3 com snapshot **por tabela**
antes e depois — `auth_identities` **+5** e `auth_identity_link_events` **+5** por rodada verde, mais
`permissions` 1 → 15 uma única vez (idempotente, o que explica os +24 da primeira rodada).

**O que NÃO foi medido, e foi publicado como se fosse (o defeito):** os quatro *arquivos* apontados como
produtores saíram de **grep** pelo nome da tabela. O crítico executou cada um isolado, com snapshot de
linhas antes/depois, no cluster próprio dele:

| suíte | resultado | Δ `auth_identities` / Δ `auth_identity_link_events` |
|---|---|---|
| `auth-identity-backfill-db` | 6/6 pass, 0 skip | **0 / 0** |
| `auth-identity-links-db` | 15/15 pass, 0 skip | **0 / 0** |
| `auth-identity-link-events-db` | 5/5 pass, 0 skip | **0 / 0** |
| `auth-identity-role-real-db` | 10/10 pass, 0 skip | **0 / 0** |
| **`core-saas-role-authority-db`** — a atribuição de 2026-08-19, citada pelo §0.a do plano do c5 e **ausente** da lista publicada | 5/5 pass, 0 skip | **+1 / +1** |

**Por que o grep falhou:** o escritor entra pela **camada de serviço** (`core-saas.service.ts` e os
repositórios de identity-link), não pelo nome literal da tabela — os quatro arquivos que *contêm* a
string limpam atrás de si, e um que **não** a contém vaza.

**O que fica ABERTO, nomeado:** os **+4/+4 restantes por rodada completa** seguem **sem produtor
nomeado** — há ~12 suítes `-db` exercitando `core-saas` e elas **não foram varridas**; o limite fica
declarado, não escondido. Matéria segue `pre-existente` (EMENDA item 1, trilha de identidades): o achado
é de **precisão do registro**, não de reabertura de classe.

**Por que isto importa mais do que parece:** é a mesma família de defeito — *a frase afirma mais do que a
execução exercitou* — pela qual este bloco foi reprovado no ciclo 4. Desta vez foi apanhada por execução
de um papel independente, antes do voto, e corrigida nas cinco publicações (`Kpis/kpis-latest.json`,
`kpis-history.json`, `kpis-history.md`, `docs/status-geral.md`, `codex/log-execucao.md`).

- **status:** ABERTA (emenda registrada; os +4/+4 sem produtor nomeado seguem aqui) · **severidade:** a classificar · **dono:** a atribuir

## P-O6R-B02-RULINGS-SEM-DESTINO (2026-09-03 — ACHADO-1 do `critico-c5-adversarial`) — BAIXA · registro §A2

Dois rulings de checkpoint deste bloco criaram, **por escrito**, uma obrigação que o PR não cumpriu e que
não foi declarada como descarte: o do **CP-0** (item 2) e o do **CP-1** (item C) prometeram que o conserto
do arquivo do comando — passo 3 do preflight §3.3 (checava `HEAD`, devia checar `origin/main`) e o
`head -120` da sonda §7.1.b, que trunca 2 dos 9 arquivos — "entra no PR deste bloco, no fim".

**Medido pelo crítico:** `git log 84bb90b..bcf6460 -- agent-orchestration/codex/comandos/B-O6R-02-ciclo5.md`
sai **vazio**; no blob do head, o passo 3 segue lendo `HEAD` (l.176-178) e o `head -120` segue na l.579.

**Agravante estrutural, e é a parte que interessa:** o **§5.1 do próprio comando não lista o arquivo-mãe**
— o glob `B-O6R-02-ciclo5-*.md` casa os arquivos de registro (`-execucao`, `-auditoria`), mas **não**
`B-O6R-02-ciclo5.md`. O ruling criou uma obrigação que o escopo escrito **proibia** cumprir, e ninguém
nomeou a contradição na hora.

**Destino, declarado agora por escrito (era o que faltava):** o conserto **NÃO entra neste PR** — tocar o
arquivo-mãe seria violação de escopo §5.3, e violar escopo no ciclo-teto para consertar um comando já
executado é trocar risco alto por benefício nulo. Fica para quem escrever o próximo comando de bloco, com
os dois defeitos já diagnosticados e com evidência: o preflight deve checar marcadores de governança em
`origin/main` (não em `HEAD`, que numa branch antiga é falso-positivo por construção), e a sonda de
insumo vivo **não pode truncar** a evidência que existe para achar.

**Propriedade que o crítico nomeia e que este registro adota:** *toda obrigação criada por ruling de
checkpoint tem destino verificável no próprio PR — cumprida, ou descartada POR ESCRITO com motivo; e
ruling não cria obrigação fora do escopo §5 sem emendá-lo na mesma linha.*

- **status:** ABERTA · **severidade:** BAIXA · **escopo:** `dentro-do-bloco` (a promessa é dos meus rulings) · **dono:** o próximo comando de bloco da rodada Ω6R

## P-JUNTA-RECURSO-EFEMERO-POR-BLOCO (2026-09-04 — incidente de terreno entre sessões simultâneas) — MÉDIA · `dentro-do-bloco`

**Incidente, sem dano, medido pelas duas pontas.** Durante o teardown do mandato dela, a cadeira **C1**
(`jurado-c5-arnes-catalogo-postgres`) do `B-O6R-02` ciclo 5 **removeu o worktree
`.claude/worktrees/jur-c1v2-drill`, que pertencia a uma jurada do `B-O6R-07a`** (sessão simultânea, bloco
irmão) e estava **em uso**. Reportado pela sessão vizinha; **dano zero confirmado por ela**: a jurada já
havia migrado para worktree próprio, o `b07` seguiu intacto em `9989c62`, e os `node_modules` da árvore
principal e do `b07` seguiram com 222 pacotes cada — **não havia junction**, então nada foi arrastado.

**Causa raiz — não é "limpeza de resíduo", é INFERÊNCIA SOBRE NOME ALHEIO.** O voto da C1 (l.188) diz, com
estas letras: *"o resíduo `jur-c1v2-drill` **das encarnações caídas**"*. Ela havia caído duas vezes por
limite de sessão; ao ver `jur` + `c1` + `v2` leu como *"jurado C1, segunda encarnação"* — quer dizer, dela.
Era do 07a. **E o mesmo parágrafo erra na direção oposta:** classifica `jur-c2v2-red` como *"da cadeira C2"*
(do ciclo 5) quando também é do vizinho. **Duas inferências de nome, ambas erradas**; só não houve dano na
segunda porque o erro caiu do lado seguro.

**O que funcionou, e não deve ser confundido com o que falhou:** a C1 varreu reparse points antes
(`dir /AL /S` = zero), usou `cmd rmdir /S /Q` (que **não** atravessa junction) e nunca `rm -rf` do Git
Bash — exatamente a disciplina nascida do incidente de 26/08 (`D-JUNTA-ESCOPO-E-CALIBRACAO(c)`). Foi ela
que impediu isto de virar destruição de `node_modules` alheio. Mas essa disciplina protege **contra a
propagação por junction**, não **contra remover o alvo errado**: a jurada vizinha perdeu terreno vivo, e só
não perdeu trabalho por já ter migrado. **Sorte, não desenho.**

**Responsabilidade:** do **orquestrador**, não da cadeira. O mandato que emiti mandava derrubar containers
e remover worktrees no fecho, e **não escreveu o limite**. Uma cadeira instruída a "limpar o que é seu",
sem critério de propriedade escrito, vai inferir — e nomes de cadeira colidem entre blocos simultâneos por
construção (a C1 do ciclo 5 e a C1-v2 do 07a são cadeiras diferentes com a mesma letra).

### A regra que passa a valer

1. **Recurso efêmero (worktree, container, cluster, volume) leva no nome o identificador do BLOCO, nunca
   só o da cadeira** — `o6r-c5`, `o6r07a`. Cadeiras homônimas coexistem em blocos simultâneos; o nome da
   cadeira **não** é identificador único. Os recursos que seguiram isso neste ciclo
   (`claude-o6r-c5-*`, `jur-c5-*`, `jur-c5-bfk-*`) não colidiram com nada.
2. **Só se remove recurso cujo nome bate com o identificador do próprio bloco.** Nome que não bate é
   **intocável** — mesmo parecendo resíduo próprio, mesmo órfão, mesmo sem `.git`. **Resíduo alheio se
   REPORTA, não se varre.**
3. **Quem convoca escreve o limite no mandato**, por extenso e com o prefixo literal. Mandato que diz
   "remova seus worktrees" sem dizer *quais nomes são seus* delega ao subordinado uma inferência que ele
   não tem como fazer com segurança.
4. **Antes de qualquer remoção, `git worktree list` e `docker ps` são leitura obrigatória** — e o que não
   estiver na lista do próprio bloco fica.

**Evidência de origem (escopo):** `dentro-do-bloco` — o mandato defeituoso é meu, emitido nesta rodada; a
remoção ocorreu no teardown desta junta. **Não** é `pre-existente`: a classe de 26/08 é vizinha, mas aquela
era propagação por junction, e esta é seleção de alvo.

**Aviso registrado da sessão vizinha (prefixos declarados, para quem vier depois):** do `B-O6R-07a` são
`b07`, `jur-c1v2*`, `jur-c2v2*`, `dev-c2*`; do `B-O6R-02` ciclo 5 são `agent-af6ea*`, `jur-c5-*`,
containers `claude-o6r-c5-*` e `jur-c5-arnes-*`, portas 15501/15502 e 32779–32782.

- **status:** ABERTA · **severidade:** MEDIA · **escopo:** `dentro-do-bloco` · **dono:** a regra vale já; a consolidação no contrato (§C7.1-ter(c), ao lado da regra de junction) é do próximo bloco de governança

### Emenda de 2026-09-04 — a vítima nomeada, e como o incidente ficou VISÍVEL

Dados fornecidos pela sessão do `B-O6R-07a` após o registro acima; entram por precisão, não por cortesia.

**A jurada atingida tem nome:** `jurado-b07a-c2-autorizacao-s` — a **sucessora**, instalada depois que a
titular `jurado-b07a-c2-autorizacao` caiu. Ou seja, o worktree destruído pertencia a uma cadeira que já
era ela própria produto de uma queda: a rede de resiliência do `D-JUNTA-RESILIENTE` estava em uso quando
a minha cadeira passou por cima dela.

**O que tornou o incidente visível — e esta é a parte que vale como lição positiva:** a jurada
**registrou a destruição no próprio voto**, em vez de apenas sofrê-la e seguir. Foi assim que a sessão
vizinha soube, e foi assim que eu soube. É o **P1** (gravar incrementalmente, com o que aconteceu de
fato) fazendo um trabalho que ninguém tinha desenhado para ele: um jurado que anota a anomalia do terreno
no voto transforma um acidente silencioso entre sessões em achado rastreável. Sem esse registro, a
remoção teria sido invisível para as duas pontas, e a regra deste bloco não existiria.

**Sobre a forma da regra, com o crédito devido:** a sessão vizinha havia proposto, como proteção, uma
**lista de prefixos declarados** de cada lado. Ela mesma reconheceu, ao adotar a regra acima, que a lista
**deixa a inferência viva do lado de quem lê** — quem varre continua tendo de julgar se um nome alheio é
resíduo. A regra de identificador-do-bloco **elimina a inferência** em vez de informá-la, e é por isso que
prevaleceu. Registrado porque a diferença entre "informar melhor quem infere" e "remover a necessidade de
inferir" é exatamente a distinção que faz uma regra de terreno funcionar.

**Dívida simétrica, declarada pela outra ponta:** o mandato da jurada dizia *"remova o que você criar"* —
mesma classe do meu, e mesmo defeito: instrução de teardown sem critério de propriedade escrito. **As duas
sessões emitiram mandatos com o mesmo buraco**, o que confirma que isto é defeito de desenho de mandato, e
não descuido de uma cadeira em particular. A regra foi adotada nos dois lados, inline nos mandatos
seguintes.

### FORMULAÇÃO COMO CLASSE (2026-09-04) — para referência de outros blocos

> Escrito a pedido da sessão do `B-O6R-07a`, que referencia esta entrada. O incidente acima é **um caso**;
> o que segue é a **classe**, enunciada para ser conferível sem conhecer o caso.

**CLASSE: mandato de teardown sem critério de propriedade escrito.**

**Enunciado.** Um mandato que ordena a um agente subordinado destruir recursos ("remova seus worktrees",
"derrube o que você criar", "limpe os temporários") **sem enumerar o critério literal de propriedade**
delega ao subordinado uma **inferência sobre nomes** que ele não tem informação para fazer. Em ambiente
com **blocos simultâneos**, nomes de papel colidem por construção — a cadeira "C1" existe em todo bloco
que tenha uma primeira cadeira —, então a inferência **vai** errar; a única variável é para que lado.

**Por que o defeito é do mandato, e não do agente.** O subordinado recebe uma ordem verdadeira ("limpe o
que é seu") cuja aplicação exige um dado que só o convocante tem: **quais nomes pertencem a este bloco**.
Ele não pode consultar o outro bloco, não sabe que o outro bloco existe, e um nome plausível é
indistinguível de um nome próprio. Culpar a cadeira é confundir *quem executou* com *quem projetou a
armadilha*.

**Propriedade ausente (é isto que se confere):** *toda ordem de destruição num mandato nomeia o prefixo
literal que delimita o alvo, e declara que tudo fora dele é intocável — inclusive o que parecer resíduo
próprio, órfão, ou sobra de encarnação anterior do próprio agente.*

**Teste de detecção, aplicável a qualquer mandato antes de disparar:** localize toda ordem de remoção; para
cada uma, pergunte **"o subordinado consegue decidir o alvo sem inferir?"**. Se a resposta depender de ele
reconhecer um nome como seu, o mandato tem o defeito. O conserto é uma linha: o prefixo literal.

**Duas materializações independentes, na mesma semana (é o que a torna classe, e não acidente):**

| | `B-O6R-02` ciclo 5 | `B-O6R-07a` ciclo 2 |
|---|---|---|
| texto do mandato | "remova seus worktrees" (sem prefixo) | "remova o que você criar" (sem prefixo) |
| orquestrador | Claude Code (esta sessão) | sessão irmã, independente |
| resultado | cadeira removeu worktree alheio **em uso** | mesmo buraco, sem materializar |

**Orquestradores diferentes, mandatos escritos em separado, defeito idêntico.** Nenhuma das duas sessões
copiou o texto da outra. É defeito de **forma de mandato**, não de disciplina de cadeira.

**Correção, nos dois lados:** a regra dos 4 itens da entrada acima passou a valer inline nos mandatos
seguintes das duas sessões.

**Corolário sobre o P1 — uma segunda função da mesma regra, e barata.** O `P1` (`D-JUNTA-RESILIENTE`)
existe para que **o voto sobreviva à morte do jurado**. Neste caso ele fez outra coisa: a cadeira atingida
**anotou a anomalia de terreno no próprio voto**, embora ela não afetasse o mérito do que ela julgava — e
foi **só por isso** que o acidente ficou visível. Nenhuma das duas sessões o veria sozinha: quem destruiu
achava que limpava resíduo próprio; quem foi destruída poderia simplesmente ter migrado e seguido.
**Regra que decorre, adotada pelas duas sessões:** *o jurado registra anomalia de terreno mesmo quando ela
não afeta o mérito do seu voto.* Custo: uma linha no voto. Benefício: acidentes **entre sessões** deixam
de ser invisíveis por construção.

**Enunciado que a sessão irmã pediu para citar, e que é o resumo do caso:** *o worktree destruído não era
resíduo de uma cadeira morta — era o terreno da rede que substituiu a cadeira morta. A resiliência estava
em uso quando foi atropelada.*

## P-METODO-FERRAMENTA-SINTATICA-COMO-PROVA (2026-09-04 — dado de método das rodadas Ω6R simultâneas) — registro, sem dono de correção

**Origem:** troca entre as sessões do `B-O6R-02` c5 e do `B-O6R-07a` c2, que rodaram em paralelo. A sessão
irmã levantou a ressalva metodológica que motiva esta entrada: *"os três meus são de superfície de rota e
os seus são de atribuição de causa — pode ser a mesma classe ou podem ser duas; sete numa tabela só é mais
persuasivo do que honesto"*. **Ela está certa, e conferir mudou a contagem.** Registro com as colunas
separadas; **não somo antes de separar**.

**Classe candidata, enunciada depois de conferir caso a caso:** *ferramenta sintática (grep, leitura,
lembrança do autor) usada para sustentar afirmação semântica (causa, completude, exaustividade) — e
publicada com o verbo da afirmação forte.* O defeito não é usar grep; é **publicar o resultado dele como
se fosse execução**.

### Coluna A — completude de superfície (o censo enumera o que o autor lembrou)

| # | achado | quem achou | o que a leitura afirmava | o que a execução mediu |
|---|---|---|---|---|
| A1 | P0 declarado fechado com técnico apagando anexo alheio (`DELETE` → 204) | C1 do c1 (07a) | superfície coberta | só apareceu atacando **14 rotas** |
| A2 | dono com e-mail em duas orgs se trancava **logando corretamente** | C2 do c1 (07a) | fluxo coberto | só apareceu em cenário multi-org que o arnês não tinha |
| A3 | décima via (`POST /mobile/sync/work-order-actions`, `mileage` em OS alheia) | C1-v2 do c2 (07a) | censo de 2 routers, feito por leitura | via fora do censo |

**O mais incômodo é o A3**, e a sessão irmã o nomeia: o censo foi refeito **depois** de a junta já ter
cobrado precisão — e ficou incompleto de novo, **por não executar**.

### Coluna B — proveniência do método (grep publicado como execução, ou como prova de completude)

| # | achado | quem achou | o que eu publiquei | o que a execução mediu |
|---|---|---|---|---|
| B1 | "produtor NOMEADO por execução", 4 arquivos vindos de `grep` | `critico-c5-adversarial` | os 4 como produtores | **0/0 nos quatro**; o vazador real (`core-saas-role-authority-db`, +1/+1) estava fora da lista |
| B2 | manchete residual contradizendo a nota do mesmo artefato | cadeira **C1** (c5) | correção "feita nas cinco publicações", **verificada por `grep`** | o `grep` era **case-sensitive** e a manchete estava em caixa alta — 3 instâncias sobreviveram |

**O B2 é o caso mais instrutivo das duas colunas**, e por isso não o descartei: ali o `grep` não foi fonte
da afirmação, foi **a prova de que a correção estava completa**. A ferramenta que falhou era a que eu usei
para me convencer de que não havia falhado.

### O que ficou de FORA, e por que a exclusão importa

**"Dois commits novos" × **um** medido** (achado do `inspetor-de-terreno-da-junta`, R5a) **não pertence a
esta classe.** Não houve ferramenta sintática nem verbo de execução: foi uma declaração factual que eu
**podia** ter conferido com um comando e não conferi. É a classe vizinha *"afirmação de conveniência não
conferida"* — parente, mas distinta, e somá-la aqui inflaria a série. **5 casos, não 6, e não 7.**

### O dado que falta, e que a sessão irmã ofereceu registrar

A série só vale com o **denominador**: quantas vezes a execução foi aplicada **sem** achar nada. A sessão
irmã ofereceu registrar também o caso negativo da cadeira C3 dela — *"conto também se ela **não** achar,
que é o dado que a série precisa e ninguém costuma registrar"*. **Sem isso, esta tabela mede a
disponibilidade dos achados, não a taxa de acerto do método.** Fica declarado como limite desta entrada:
o que ela sustenta hoje é *"execução achou o que leitura não acharia em 5 ocasiões medidas"*, e **não**
*"execução acha sempre"* nem *"leitura nunca acha"*.

- **status:** ABERTA (registro de método, coletivo; sem correção associada) · **severidade:** informativa · **dono:** nenhum — é dado para calibrar mandatos futuros

### Emenda de 2026-09-04 (ii) — a coluna C, o denominador parcial e o viés declarado

**A sessão irmã depurou os próprios casos com a mesma régua e separou uma coluna nova.** O caso do dono
multi-org **não é falha de censo**: ninguém enumerou uma superfície e esqueceu um item — o arnês inteiro
do PR era **mono-organização**, e o defeito só existe na forma multi-org. *"Não é 'o autor lembrou de 9 e
havia 10' — é 'o autor testou uma forma e o defeito vive na outra'."*

**Coluna C — completude de FORMA do arnês: 1 caso.** Coluna A cai para **2**.

**Decisão sobre a fusão A+C: NÃO FUNDIR — e o argumento é o conserto, não a aparência.**

| | Coluna A (superfície) | Coluna C (forma) |
|---|---|---|
| o que falta | um **item** de uma lista que existe | uma **dimensão** do espaço de configuração; não há lista |
| detecção | *"sua enumeração bate com a superfície medida?"* — **conferível mecanicamente** (enumere por execução e compare) | *"que dimensões o seu arnês fixa num único valor?"* — exige **imaginar a dimensão** antes de poder testá-la |
| conserto | enumerar por execução em vez de por leitura | **variar** algo que ninguém tinha pensado em variar |

Fundi-las esconderia justamente a que é mais difícil de pegar: a A tem procedimento mecânico de detecção;
a C não tem — depende de alguém perceber que o arnês inteiro vive num ponto do espaço. **Séries úteis
separam por conserto, não por sintoma.** Total: **coluna A 2 · coluna B 2 · coluna C 1 = 5**, e nunca 7.

**Sobre a coluna B, refinamento aceito da sessão irmã (a aplicar se a série crescer):** nos quatro outros
casos a ferramenta falhou **produzindo** a afirmação; no B2 ela falhou **verificando** a afirmação. *"É uma
classe de segundo grau, e a mais difícil de pegar, porque a verificação sente-se como prova."* Separar-se-á
em `grep como fonte` × `grep como verificação` quando houver casos bastantes.

### O DENOMINADOR PARCIAL QUE ESTE LADO JÁ TEM — e que enfraquece a narrativa fácil

Registrado porque a entrada anterior declarou a falta e **metade do dado já existe deste lado**. Nesta
junta, execução independente foi aplicada sobre afirmações do bloco **e CONFIRMOU a grande maioria**:

- `critico-c5-adversarial`: re-mediu **D29 N=13** (13/13, `(6,37)` idêntico) e a **canônica 3** — bateram
  com o publicado; re-mediu o containment de F1–F3 (zero linha ausente) e o critério `src/**` re-baseado
  **até o blob** — bateram. Refutou **1** afirmação (B1).
- **C1**: canônica 3 **N=10** com denominador idêntico ao publicado; vaza-metro **+5/+5** idêntico; D29
  13/13. Tudo **confirmou**. Refutou **1** (B2), e ainda assim votou APROVADO.
- **C2**: **97 operações adversariais em 11 caminhos**, endpoint real, 2 ordens × 20 na corrida —
  **0 fabricado**, `maxAbs=0`. **Confirmou integralmente**; nenhuma refutação de mérito.
- **C3**: re-executou canônicas 1 e 2 — bateram; conferiu escopo 13/13 e PROIBIDO 8/8 — bateram.

**Leitura honesta:** neste bloco a execução independente **confirmou o publicado na esmagadora maioria das
medições** e refutou em **duas**. A afirmação que a série sustenta é *"execução pega o que releitura não
pegaria, e o custo se paga quando pega"* — **não** *"o publicado costuma estar errado"*.

### VIÉS DECLARADO (levantado pela sessão irmã, e a parte mais importante desta emenda)

*"Nós dois somos partes interessadas na conclusão 'execução > leitura', porque foi ela que justificou o
custo das nossas juntas."* **Procede, e fica escrito na entrada.** As duas sessões que compilam esta série
são as que gastaram cadeiras, clusters e horas com base nessa premissa; um resultado que a desmentisse nos
custaria a justificativa do método. **Consequências adotadas:**

1. o denominador deve ser levantado **por quem não torce** — de preferência um terceiro papel, não
   nenhuma das duas sessões;
2. o **caso negativo** (execução aplicada que não achou nada) é dado de primeira classe e **entra na
   série**, não em nota de rodapé — a sessão irmã já se comprometeu a reportar o da cadeira C3 dela;
3. esta entrada **não conclui**; ela **inventaria**, com colunas separadas por conserto e o denominador
   parcial acima. Quem for concluir que o faça com a série fechada e sabendo quem a compilou.

### Emenda de 2026-09-04 (iii) — os dois limites do compilador, e o fecho desta linha

Acordado entre as duas sessões. **O `porteiro-pos-merge` compila o recorte da série, com dois limites
escritos — e os dois protegem contra o registro comer a coisa que ele deveria servir.**

**Limite 1 — a série é ADICIONAL e SUBORDINADA ao gate.** O porteiro existe para **autorizar ou barrar o
início do próximo bloco**; essa é a função cara. A contagem metodológica entra **depois** de ele fechar o
mandato próprio, com esta forma: *"além do seu mandato, e depois de fechá-lo, informe quantas
re-execuções você fez, quantas confirmaram e quantas refutaram"*. **Se ele BARRAR o start, o parecer é
sobre isso** — não diluído por contagem. Formulação da sessão irmã, adotada aqui: *"se o mandato dele
crescer ao ponto de a série competir com o gate, perdemos a coisa mais cara para ganhar a mais barata."*

**Limite 2 — o porteiro é neutro quanto à premissa, mas NÃO é externo ao processo.** Ele nasce do mesmo
contrato que criou as juntas. **Não é o terceiro ideal; é o menos interessado disponível.** Fica escrito
para que quem ler depois **não tome por independência o que é só distância**.

**Compromissos registrados da sessão irmã** (para o denominador não ficar no ar): ao fechar a ata do ciclo
2 do `B-O6R-07a`, informa (a) total de execuções adversariais das três cadeiras, (b) quantas confirmaram ×
quantas refutaram, e (c) **o caso negativo da C3, se ela não achar nada** — *"a metade que falta e a única
que ninguém tem incentivo para reportar"*.

**Estado desta entrada:** inventário aberto, com 5 casos em 3 colunas separadas por conserto, denominador
parcial de um lado, denominador do outro lado prometido, compilador nomeado com dois limites e viés dos
compiladores declarado. **Não conclui — e não deve concluir até ter as duas metades.**
## P-O6R-B07-RATE-LIMIT-DISTRIBUIDO (2026-09-02) — freio de login por IP é IN-PROCESS — MÉDIA

**Origem:** B-O6R-07a §3.5. Sucede a metade "IP/distribuído" de `P-O6R-B01-RATE-LIMIT-IP`, que fica
**parcialmente fechada** por este bloco: o balde por IP passou a existir e a rotação de e-mails na
mesma origem deixou de escapar do freio (medido: `401 !== 429` no head-base × `429 RATE_LIMITED` com
a correção — evidência em `omega/juntas/votos/O6R-07a/dev-a1-a3-auth.md` §II.2/A2).

**O que SEGUE ABERTO, e é o que esta pendência carrega:**

1. **Multi-réplica.** O `TokenBucket` de `portal-shared` roda com `InMemoryTokenBucketStore` — o balde
   vive **por instância do processo**. Com N réplicas atrás de um balanceador, o teto efetivo por IP
   é N × 30/5 min, não 30/5 min. O store já é plugável (interface `TokenBucketStore`); o fecho é uma
   implementação Redis. **Não é regressão** — antes deste bloco o teto por IP era infinito.
2. **Política de proxy / `X-Forwarded-For`.** O IP vem do **socket** (`trust proxy` DESLIGADO, default
   do Express), de propósito: com `trust proxy` ligado sem allowlist, o header é spoofável e o freio
   vira decorativo. Atrás de um proxy confiável, porém, todo tráfego chega com o IP do proxy e cai num
   balde único. Ligar `trust proxy` com a allowlist certa é **decisão de INFRA**, fora do §5 do bloco.
3. **NAT corporativo.** Um escritório inteiro compartilha um IP; por isso o teto adotado é o mesmo de
   `AUTHORITY_ANTI_ABUSE_DEFAULTS.ipBucket` (30/5 min), e não algo mais apertado. O fecho fino depende
   de (1) e (2).

**Residual irmão, registrado aqui por dependência direta — `P-O6R-B07A-RASTRO-ANONIMO-SEM-IP`:** a
linha de auditoria de falha anônima criada pelo §3.4 **não carrega `ipAddress`/`userAgent`**.
Encaminhá-los exigiria alterar `src/modules/auth/auth-runtime.ts` (o adaptador que envolve cada
candidato em `withTenantRls`), **fora do §5 PERMITIDO** do B-O6R-07a. O rastro do SUCESSO anônimo já
carrega o contexto; o da FALHA, não. Consequência prática: hoje dá para saber **que** houve força
bruta anônima contra uma conta, não **de onde**. Fecha junto com (2), que é quando "de onde" passa a
ter resposta confiável.

> **§A2 — divergência declarada, não escondida.** O ID `P-O6R-B07A-RASTRO-ANONIMO-SEM-IP` é citado
> **pelo comentário de produção** em `local-auth-login.service.ts` ("Fica registrado em
> `pendencias.md`"), escrito pelo `dev-o6r07a-auth-residuais` antes de cair. O mandato do sucessor
> (`dev-o6r07a-auth-provas`) autorizava editar este arquivo nominalmente para
> `P-O6R-B07-RATE-LIMIT-DISTRIBUIDO` — só. Deixá-lo sem registro faria o **código mentir**; abrir
> uma seção própria excederia o mandato. Registrado, então, como residual **dentro** da seção
> autorizada, com esta nota. A junta decide se promove a seção própria.

- **status:** ABERTA · **severidade:** MÉDIA · **escopo:** `dentro-do-bloco` (nasce com o §3.5/§3.4
  do B-O6R-07a) · **dono:** B-O6R-07a → trilha de infra.

---

## D-DIVERGENCIA-B07A-A3-METODO-DA-PROVA — o §4 pedia espião de scrypt; a prova saiu por testemunha de efeito

**Registro §A2 (orquestrador, 2026-09-02) — bloco dono: `B-O6R-07a`. Não é pendência aberta: é
divergência plano × terreno, declarada para a junta validar ou reprovar.**

**O que o plano pedia.** §4, linha 6: o vermelho-controle do A3 (pino N/r/p no `parseScryptHash`) seria
provado por **espião de scrypt** — um contador de derivações, no idioma do `B-O6R-01` §6.4.4 — mostrando
que a base **deriva** com o N vindo do dado armazenado.

**O que o dev mediu, e por que divergiu.** `dev-o6r07a-auth-provas` reportou que **não existe ponto de
injeção** para o espião sem **alargar `password.service.ts` só para o arnês** — isto é, mudar código de
produção para acomodar o teste. Em vez disso, provou por **testemunha de efeito**, em duas pernas:

1. `actual: true` na base — o parse **aceita** um stored com `N=2` e **deriva** com ele;
2. `ERR_CRYPTO_INVALID_SCRYPT_PARAMS` **subindo até o serviço de login** com N gigante — erro não tratado
   atravessando a camada.

Com o pino: `6 casos · pass 6 · fail 0`.

**Decisão do orquestrador: ACEITO, e a razão é de mérito, não de conveniência.** A testemunha de efeito
prova **mais** que o contador, não menos: o espião responderia *"scrypt rodou N vezes"*; a testemunha
responde *"o parse aceitou parâmetro do atacante E derivou com ele"*, que é **o defeito em si**, e ainda
mostra a segunda porta (o `RangeError` não tratado) que um contador não veria. E preserva um invariante
que vale mais que a literalidade do §4: **não se alarga código de produção para acomodar arnês** — foi
exatamente a classe de erro do `SAN2-4b`, onde o `keylen` virava função do input.

**O que a junta do 07a tem de validar (não presuma que está fechado):**
(a) a testemunha de efeito é de fato **≥** o espião em poder de detecção, ou há caminho que só o contador
pegaria? (b) o `ERR_CRYPTO_INVALID_SCRYPT_PARAMS` chegando ao serviço de login era **defeito próprio**
que este bloco fechou de brinde — e, se sim, ele merece número e nota próprios? (c) o §4 do plano deve
ser emendado para admitir testemunha de efeito como forma canônica, ou este caso é exceção nomeada?

**Precedente que isto cria, se a junta aceitar:** *"o vermelho-controle é sobre PROVAR QUE A SONDA MORDE,
não sobre um instrumento específico — instrumento que exige alargar produção é instrumento errado."*

## P-O6R-B07A-REGISTRO-A2-DIVIDA-368 (2026-09-02) — reatribuição da dívida de backfill do #368 — **REGISTRO, não pendência aberta**

Registro **§A2** (conflito não se consolida em silêncio), gravado pelo B-O6R-07a no PR que paga a dívida.

**O conflito:** o `kpis-latest.json` do SAN2-6 atribuía o próximo backfill §C3.5 ao *"PR seguinte, que é o ciclo
5"*; o parecer do porteiro pós-merge do #368 (`agent-orchestration/omega/juntas/votos/SAN2-6/`
`00c-porteiro-pos-merge-368.md`, veredito **LIBERADO COM RESSALVA**) reformulou para *"o PR que mergear
primeiro carrega o backfill"*, liberando **dois** blocos em paralelo: o ciclo 5 do `B-O6R-02` (Codex, UMA
tentativa) e o `B-O6R-07` (Claude Code).

**A decisão, e ela é do §7.1 do plano `B-O6R-07`:** vale a **REGRA DO PRIMEIRO-QUE-MERGE**. **Este PR paga.**
Aplicado na entrada **151** (`SAN2-6`) de `Kpis/kpis-history.json`: `pr` **368** · `merge_commit` **`f895dd2`** ·
`approved_head` **`d90fbbb`**, e `blocks_completed` **157 → 158** no cartão do painel.

**A razão do `approved_head`, exigida pela ressalva R1 do porteiro e transcrita ao lado do valor na própria
entrada 151:** grava-se **o head da ATA**, nunca o `headRefOid` — a ata `J-SAN2-6.md` nomeia `d90fbbb` (3
ocorrências) e **não nomeia** `9051e9b` nem `85a9058` (0 ocorrências); o precedente é **provado** pela cadeira C3
do `J-SAN2-6` em **3 de 3** casos com hashes divergentes (#363, #364, #366). O head final `9051e9b` tem árvore
idêntica à do squash e carrega o **delta pós-voto** que a ata declara **em prosa, sem pinar por hash**.

**O que o ciclo 5 deve fazer:** **VERIFICAR e NÃO duplicar.** Ao rebasear, se a entrada 151 já vier com os três
campos preenchidos, a dívida está quitada — reescrevê-los criaria divergência onde não há.

- status: FECHADA — registro de reatribuição consumado no mesmo PR que paga a dívida. Dono: B-O6R-07a.

---

# Registros do CICLO 2 do B-O6R-07a (2026-09-03) — sete registros, bloco único de APPEND

> Mecânica declarada (§A2): `pendencias.md` tem EOL MISTO — o apenso C2·5 item 11 exige SÓ APPEND e o
> mandato do dev autoriza "Write de bloco ao fim". Os sete registros abaixo foram APENSADOS ao fim do
> arquivo, cada um nomeando a entrada-alvo por título e linha; NENHUMA linha pré-existente foi editada.
> Autor: `dev-o6r07a-ciclo2-c` (fecha registro; não achou, não planejou — §C7.4-bis). Fonte: apenso
> `## CICLO 2` de `agent-orchestration/omega/planos/B-O6R-07-plano.md` (C2·2, C2·3, C2·4) e diário
> `agent-orchestration/omega/juntas/votos/O6R-07a/dev-ciclo2.md`.

## APPEND (registro 1/7) à `D-DIVERGENCIA-B07A-A3-METODO-DA-PROVA` (l.5631) — a RAZÃO registrada era FALSA; a DECISÃO estava certa

A junta do ciclo 1 (cadeira C2) devolveu o reparo que este append consuma. A razão registrada na
entrada original — *"não existe ponto de injeção para o espião sem alargar `password.service.ts`"* —
é **FALSA por demonstração**: a C2 montou espião de TEMPO **de fora**, ~30 linhas, ZERO alteração de
produção, e publicou a MARGEM: derivação canônica **49,08 ms** × todo trio fora do pino
**0,04–0,40 ms** (razão **>=120x**), inclusive `N=32768` respondido em **0,09 ms** — exatamente o
caminho "derivar primeiro, pinar depois" que a testemunha de retorno não pegaria. A **DECISÃO** de
não alargar produção para acomodar arnês estava **CERTA** (classe do `SAN2-4b`); a razão certa é
*"desnecessário por dentro"*, não *"impossível"*. Consuma-se também a resposta à pergunta (c) da
entrada original: o §4 do plano fica **EMENDADO pela errata E-b do apenso C2·7** — vale a
PROPRIEDADE (*provar que a derivação NÃO ocorreu, por qualquer testemunha que a decida — contador,
exceção distintiva ou relógio — DESDE QUE a evidência publique a margem medida ou o controle
distintivo; testemunha sem margem publicada não é testemunha*). Nenhum código muda por este registro.

## P-O6R-SUBRECURSO-OBJECT-SCOPE (registro 2/7, 2026-09-03) — 9 rotas mutantes alcançáveis pelo técnico sobre OS ALHEIA — **ALTA**

**Dono nomeado: `B-O6R-07c` (branch `fix/o6r07c-subresource-scope`)** — bloco novo, a planejar após o
merge do 07b. **Origem do registro:** achado `C1-A1` da junta do ciclo 1 do B-O6R-07a; a declaração de
fechamento do `Ω6R-SEC-002` foi revertida para `parcialmente_superado` (C2·2, caminho (i)) e esta
pendência é a dona da parte aberta.

**As 9 rotas, cada uma com N/forma/causa** (paridade com `docs/revisoes/O6R/achados.jsonl` l.9 e com
o drill da cadeira C1, conferida no diário `dev-ciclo2.md` D2.d):

1. `POST /work-orders/:id/attachments` — anexa em OS alheia (gate `create` OU `update`).
   **EXECUÇÃO: HTTP 201.** Causa: `bf456b0` (2026-07-13, PR #173) — subrecurso nasceu sem escopo por
   objeto, ANTES do B-O6R-07a.
2. `DELETE /work-orders/:id/attachments/:attachmentId` — apaga anexo alheio; blob sai do storage.
   **EXECUÇÃO: HTTP 204 + download 200->404.** Causa: `bf456b0` #173.
3. `POST /work-orders/:id/comments` — comenta em OS alheia (gate `comment`). **EXECUÇÃO: HTTP 201.**
   Causa: agregado próprio (`work-order-comment.routes.ts`), sem guard de objeto.
4. `PATCH /work-orders/:id/comments/:commentId` — edita comentário de OUTRO autor.
   **LEITURA DE CÓDIGO** (`assertCanMutate` = autor OU `work_orders:update`; o técnico porta
   `update`). Causa: `D-Ω3F-5-COMMENT` — desenho deliberado da casa.
5. `DELETE /work-orders/:id/comments/:commentId` — soft-delete de comentário alheio. **LEITURA.**
   Causa: `D-Ω3F-5-COMMENT`.
6. `POST /work-orders/:id/comments/:commentId/tags/:tagId` — taggeia comentário alheio. **LEITURA.**
   Causa: `D-Ω3F-5-COMMENT`.
7. `DELETE /work-orders/:id/comments/:commentId/tags/:tagId` — destaggeia (hard-delete da
   associação). **LEITURA.** Causa: `D-Ω3F-5-COMMENT`.
8. `POST /work-orders/:id/geocode` — alcançável em OS alheia (gate `update`). **ALCANCE por
   EXECUÇÃO (HTTP 200 `geocoded=false`, provider Noop); EFEITO CONDICIONADO a `GEOCODING_ENABLED`**,
   nunca medido ligado. Causa: rota anterior ao bloco, sem guard de objeto.
9. `POST /work-orders/:id/geocode-destination` — idem: mesma guarda, mesma forma (drill mediu 422 de
   validação de domínio — passou o gate e morreu no domínio; alcance provado, efeito por env).

**Distribuição das formas: 3 execução · 4 leitura · 2 condicionadas a env.** Das 14 rotas mutantes do
router principal, 6 passam o gate com as chaves do técnico (`read/comment/update/status`): 2 ficaram
GUARDADAS pelo 07a (PATCH `/:id`, PATCH `/:id/status`) e 4 abertas; as 5 do router de comentários
passam todas.

**Item explícito do plano do 07c:** a cláusula `autor OU update` do `D-Ω3F-5-COMMENT` é decisão de
PRODUTO deliberada — escopá-la por objeto a reverte em parte; medir o fluxo do despachante e do
gestor moderando comentário ANTES de codar. **Consequências declaradas:** o gate da CHECKLIST P1
continua *"07a E 07b (e B-O6R-06) mergeados"* (a deliberação J-6R fala de BLOCOS, não de achados);
fatia de P1 que amplie superfície de anexo/comentário de OS **herda a trava** desta pendência.

- **status:** ABERTA · **severidade:** ALTA · **escopo:** `pre-existente` (origens `bf456b0` #173 e
  `D-Ω3F-5-COMMENT`, ambas anteriores ao bloco; evidência de data na própria causa) · **dono:**
  `B-O6R-07c`.

## P-AUTH-KDF-ROTACAO-V2 (registro 3/7, 2026-09-03) — rotação de KDF `v=2` é promessa sem mecanismo — **MÉDIA**

**Dono nomeado: `B-AUTH-KDF-V2`** (bloco de auth a agendar pós-O6R). Consolida dois achados da
cadeira C2 do ciclo 1 do B-O6R-07a, ambos declarados `pre-existente` com evidência:

- **C2-A2:** o comentário do pino N/r/p em `password.service.ts` promete *"rotação via v=2"*, mas não
  existe mecanismo: nenhum caminho de coexistência v1/v2, nenhum re-hash no login, nenhum teste. A
  promessa é anterior ao 07a; o pino do ciclo 1 (aprovado) apenas a tornou visível.
- **C2-A3:** a l.45 (`scryptSync` do caminho de verificação) não tem defesa própria (try/catch); o
  500 por `ERR_CRYPTO_INVALID_SCRYPT_PARAMS` ficou fechado SÓ por consequência do pino do parse — se
  a rotação um dia aceitar trio variável, a porta reabre.

**Escopo do bloco dono:** coexistência v1/v2 + re-hash no login + defesa própria na l.45. **NENHUM
código de KDF muda no ciclo 2 do 07a** — o item C2-3 foi APROVADO pela junta e está CONGELADO
(C2·5-PROIBIDO: `password.service.ts`).

- **status:** ABERTA · **severidade:** MÉDIA · **escopo:** `pre-existente` · **dono:** `B-AUTH-KDF-V2`.

## P-KPI-HISTORY-MD-BACKLOG (registro 4/7, 2026-09-03) — espelho `Kpis/kpis-history.md` com backlog #361–#368 — **BAIXA**

Achado `C3-A1` da junta do ciclo 1: o espelho `.md` do history parou antes das entradas dos PRs
**#361–#368** (o `.json` as tem). O ciclo 2 do 07a **apensa a PRÓPRIA entrada** no espelho (D3.e do
diário) — o backlog das oito anteriores fica com esta pendência. **Dono: o próximo bloco `…F` de
KPI** (correção documental §C1). Forma do número: 8 entradas ausentes, contadas por diff de IDs entre
`kpis-history.json` e o espelho.

- **status:** ABERTA · **severidade:** BAIXA · **escopo:** `pre-existente` · **dono:** próximo `…F` de KPI.

## APPEND (registro 5/7) à entrada do sticky (l.2896-2924) — a tensão §A2 de `assigned_operator_id`, devolvida MEDIDA e resolvida por DUAL-MATCH

A entrada original fechou dizendo *"Fica com a junta ... a tensão §A2 da semântica de
`assigned_operator_id`"*. A junta do ciclo 1 a devolveu **medida** (achado `C1-A4`): o write do
assign grava **user id** dentro de `assigned_operator_id` (campo de perfil —
`work-order.service.ts:1669`, `body.operatorId ?? body.userId`; o app Flutter manda `userId`,
componente `assignWorkOrder` do `Ω6R-QUA-004`), e o guard do ciclo 1 comparava SÓ contra o perfil —
o técnico LEGITIMAMENTE atribuído recebia **403** no PATCH e no PATCH `/status` (a fila offline do
mobile). O 403 nasceu com o guard DESTE bloco.

**Resolução (ciclo 2, C2·4 opção (c) — implementada e provada):** DUAL-MATCH no READ, dentro de
`assertMutationObjectScope` e em nenhum outro lugar: a atribuição prova-se por
`assignedOperatorId === operatorProfileId` **OU** `assignedOperatorId === actor.userId` (~2 linhas).
Fail-closed preservado (sem match nos dois ramos -> 403; OS órfã não casa com nenhum); 404
cross-tenant intocado; só quem porta `work_orders:assign` escreve o campo, logo o segundo ramo só
concede ao usuário que um ATRIBUIDOR nomeou. Cura as linhas históricas por leitura. Provas no diário
`dev-ciclo2.md` D3.a/D3.b: 3 casos novos VERMELHOS no código pré-correção (`ec=1`, o técnico nomeado
recebia 403) -> **8/8 verde N=3** com denominador idêntico. Erratas E-f do apenso C2·7.
**`Ω6R-QUA-004` SEGUE ABERTO com o dono dele** — o write continua torto; o read passa a aceitar as
duas formas canônicas que DE FATO existem no banco.

## FECHAMENTO (registro 6/7) do residual `P-O6R-B07A-RASTRO-ANONIMO-SEM-IP` (registrado dentro do `P-O6R-B07-RATE-LIMIT-DISTRIBUIDO`, l.5610-5623)

O residual dizia: a linha de auditoria da falha anônima não carrega `ipAddress`/`userAgent`, porque
encaminhá-los exigiria alterar `auth-runtime.ts`, fora do §5 de então. **O ciclo 2 abriu a porta
nominalmente** (C2·5 item 4: ampliação nominal de `auth-runtime.ts` — só o espelho `withTenantRls`
do método novo `registerAnonymousFailure`) e o C2·3 encaminhou `ipAddress`/`userAgent` ao
`recordLoginFailure` da falha anônima. **Evidência de fechamento (diário D1.g):** caso -db multi-org
pela fiação REAL (`auth.routes` -> `auth-runtime`/`withTenantRls` -> `registerAnonymousFailure`)
asserta os DOIS campos no metadata da linha — `ok 6 - CICLO 2: ... 1 requisição falhada = 1
incremento + 1 linha, com ipAddress/userAgent` — **3/3, `ec=0`**, com vermelho-controle no código
pré-correção (`ec=1`, `2 !== 1`). Consequência prática: passa a dar para saber **de onde** veio a
força bruta anônima, na medida do IP de socket — a política de `X-Forwarded-For` continua sendo o
item 2 da pendência-mãe, que segue ABERTA.

- **status do residual:** FECHADO no ciclo 2 do B-O6R-07a · a pendência-mãe
  `P-O6R-B07-RATE-LIMIT-DISTRIBUIDO` **não muda de status** (segue ABERTA, MÉDIA).

## APPEND (registro 7/7) ao `P-O6R-B07-RATE-LIMIT-DISTRIBUIDO` (l.5589) — 1 linha do ciclo 2

`C2-A4` (nota da junta): a folga do piso de 400 ms sob banco CARREGADO não foi medida — a medição sob
carga pertence ao fecho distribuído desta pendência. Nota a favor: o ciclo 2 REDUZIU as escritas do
ramo de falha anônima de 2xN para **<=2 por requisição** (<=1 UPDATE + <=1 INSERT, ato único
pós-veredicto — C2·3), o que só melhora a folga.
