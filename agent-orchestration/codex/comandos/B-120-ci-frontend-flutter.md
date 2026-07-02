# B-120 — CI: jobs de frontend e Flutter

> Autor: Claude Code. Fecha a Fase 2 adicionando cobertura de CI que faltava
> (só existia o job backend), garantindo gate automático para web e mobile.

## Objetivo

Adicionar ao GitHub Actions os jobs `frontend` (check/test:smoke/build) e `flutter`
(pub get/format/analyze/test), além do `backend` já existente.

## Escopo permitido

- `.github/workflows/ci.yml`
- `agent-orchestration/**`

## Escopo proibido

- Código de aplicação (backend/frontend/mobile) · `prisma/**` · `.env` · lockfiles · KPI.

## Validações

```bash
# Estrutura YAML validada localmente; execução real ocorre no GitHub Actions ao abrir o PR.
git diff --check
```

## Limites

- **E2E Playwright contra backend vivo** (Docker) fica para bloco futuro — aqui é CI unit/smoke.
- KPI publicado uma vez ao final desta rodada.

## KPI (proposto, não publicado)

- Consolidado no fechamento desta rodada (Fase 2).
