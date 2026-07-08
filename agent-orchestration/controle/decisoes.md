# Decisoes

## D-001 - Estrutura documental v1 incorporada

- status: aplicada
- origem: documentacao enviada pelo usuario em 2026-05-07
- impacto: produto, requisitos, backlog e organizacao do repositorio

## D-002 - Repositorio organizado pelo estado real do GitHub

- status: aplicada
- origem: leitura do README e do `package.json` do repositorio oficial
- impacto: documentacao, esqueleto tecnico e organizacao local
- observacao: conflito historico (backend em C) foi preservado em registro, mas baseline vigente foi consolidada como Node.js + TypeScript

## D-003 - Baseline oficial de backend consolidada no repositorio

- status: aplicada
- origem: alinhamento documental e operacional desta execucao
- impacto: README, PRODUCT_CONTEXT, docs de frontend e trilha operacional
- observacao: C permanece apenas como historico, sem efeito na stack atual


## D-004 - Rodada Fase 2 com auto-merge e merge unico (2026-07-02) [Claude Code]

- status: aplicada nesta rodada
- origem: instrucao do usuario
- impacto: nesta rodada o Claude Code executa o ciclo ate o merge (gate = testes verdes),
  com merge UNICO ao final do B-120 e KPIs publicados no mesmo PR. Fora desta rodada,
  vale o gate humano padrao do contrato de blocos.

## D-005 - Rodada BLOCO-AUTO A-D com auto-merge por PR (2026-07-07) [Claude Code]

- status: aplicada nesta rodada
- origem: instrucao do usuario (prompt BLOCO-AUTO v3)
- impacto: execucao automatica A1..D2, 1 item = 1 branch = 1 PR na `main`, merge automatico
  SOMENTE com todos os criterios do plano-mestre §9 verdes (CI incluido). `main` sem branch
  protection; squash + delete branch. Plano em `agent-orchestration/execucao-blocos-A-D/`.
- observacao: KPIs NAO publicados nesta rodada (so apos avaliacao humana, padrao C3 do CLAUDE.md).

## D-006 - Normalizacao do layout de skills do projeto (2026-07-07) [Claude Code]

- status: aplicada em A0
- origem: recon — skills em `.claude/skills/<outer>/<inner>/SKILL.md` (double-nested) nao carregam;
  alvo do prompt e `.claude/skills/<nome>/SKILL.md`.
- impacto: mover para caminho single-level (nome do frontmatter), corrigindo
  `skillflutter-ai-architect`->`flutter-ai-architect`. Versionadas apenas as skills desta iniciativa
  (saas-multi-tenant, ts-frontend-full, ui-ux-pro-max, flutter-expert, flutter-ai-architect,
  erp-techsolutions-code-auditor) + agent `frontend-pixel-master`. Skills genericas nao referenciadas
  ficam untracked.

## D-007 - Reconciliacao "servico completo sem mock" x repo mock-first (2026-07-07) [Claude Code]

- status: aplicada (conflito registrado, sem consolidacao silenciosa — CLAUDE.md A2)
- origem: prompt exige "sem mock/placeholder/constante local"; repo web e mock-first
  (isMockMode + fallback com dados fabricados) em todos os modulos.
- impacto: endpoint real e o caminho primario e unico de dados das telas novas. Estados
  obrigatorios offline/erro usam estado VAZIO + banner de erro, SEM linhas demonstrativas
  fabricadas. Nada novo em `frontend/src/mocks/`. Mantem a forma service->adapter->hook do repo.
- observacao: se o usuario preferir manter o fallback com dados de exemplo (padrao do repo),
  reabrir esta decisao.

## D-008 - C3: Dashboard com agregados reais + simplificacao de paineis (2026-07-07) [Claude Code]

- status: aplicada (registrada para confirmacao humana no gate — CLAUDE.md A2)
- origem: a premissa da tarefa C3 descrevia o dashboard PRE-B-124; o dashboard vigente (B-124)
  derivava KPIs client-side de uma pagina de OS + fan-out de 5 endpoints.
- impacto: C3 substitui a linha de KPIs (antes client-side/fraca) pelo agregado REAL por tenant
  (`GET /api/v1/dashboard/summary`: OS por status, contagens de cadastros, OS criticas, eventos,
  alertas). Paineis Despachos + Status de campo (B-124) preservados dos seus proprios endpoints
  reais. O painel de "aprovacoes pendentes" e o card de "nao lidas" foram removidos do dashboard.
- nao ha perda de feature: notificacoes nao-lidas seguem no shell (badge do topbar/sidebar);
  aprovacoes seguem acessiveis via pagina `/approvals` + item de menu (com badge).
- observacao: se o usuario quiser o painel de aprovacoes de volta NO dashboard, reabrir (restaurar
  o fetch `/approvals/pending` + painel) ou incluir a contagem de aprovacoes no summary.
