# KPI-DASHBOARD-001 - Painel permanente de KPIs e analises

## Objetivo

Criar a estrutura permanente `Kpis/` no mesmo nivel de `src/`, com dashboard HTML/CSS/JS e historico Markdown para consolidar KPIs tecnicos, funcionais, operacionais, previsoes, lacunas, riscos e evolucao do ERP Techsolutions a cada execucao futura.

## Base

- Base obrigatoria: `origin/main` atualizado apos merge do PR #85.
- Merge commit esperado do B-098D: `cd1f839e4435fbb2c2e94aa33549b7e47ea9fdbc`.
- Branch: `feature/project-kpis-dashboard`.
- Worktree: `ERP_Techsolutios-codex-kpis-dashboard-001`.

## Escopo permitido

- `Kpis/index.html`
- `Kpis/styles.css`
- `Kpis/app.js`
- `Kpis/kpis-history.md`
- `agent-orchestration/docs/status-geral.md`
- `agent-orchestration/codex/log-execucao.md`

## Escopo proibido

- `mobile/**`
- comandos Flutter
- Figma
- secrets, `.env`, migrations ou infra
- B-098E ou outro contrato funcional

## Entrega esperada

- Dashboard visual responsivo, executivo e sem dependencia externa obrigatoria.
- Dados estruturados em `Kpis/app.js`.
- Historico permanente em `Kpis/kpis-history.md`.
- Regra operacional: todo bloco futuro deve atualizar `Kpis/index.html`, `Kpis/app.js` e `Kpis/kpis-history.md`.

## Validacoes esperadas

- `npm run check`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm --prefix frontend run check`
- `npm --prefix frontend run test:smoke`
- `npm --prefix frontend run build`
- `DATABASE_URL=dummy npx prisma validate`
- `git diff --check`
- confirmar que `git diff --name-only` nao contem `mobile/`
