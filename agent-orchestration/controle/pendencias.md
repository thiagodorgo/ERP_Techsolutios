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
- status: aberto (baseline conhecida; correcao fora do escopo desta rodada)

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
- status: aberto (ligar a uma contagem real de aprovacoes pendentes ou remover o numero — chore)

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
