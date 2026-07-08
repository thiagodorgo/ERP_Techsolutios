# Lista de execução — Blocos A→D (checklist vivo)

> Atualizado a cada PR concluída (entra junto do plano na PR seguinte). Formato da linha após
> conclusão: `[x] <id> <nome> — PR #NN, merge <hash>, gates X/X, testes N/M, skills:..., concluída <data>`.
> Rodada BLOCO-AUTO v3 · parte de `main@ebc3e82` (B-124K) · 2026-07-07.

## Fase 0 — Documentação + Skills
- [x] A0 Plano-mestre + lista + skills versionadas + controle atualizado — PR #127, merge `bb35341`, gates 3/3 CI verdes (backend/frontend/flutter), skills: (documental), concluída 2026-07-07

## Bloco A — Cadastros (banco + API + tela)
- [x] A1 Cliente `Customer` `/api/v1/customers` — PR #128, merge `4a9b4de`, gates 3/3 CI verdes, testes 12 (backend) +7 (web), skills: saas-multi-tenant + ts-frontend-full + ui-ux-pro-max + frontend-pixel-master, concluída 2026-07-07
- [x] A2 Viatura `Vehicle` `/api/v1/vehicles` — PR #129, merge `3ee4af3`, gates 3/3 CI verdes, testes 13 (backend) +7 (web), skills: saas-multi-tenant + ts-frontend-full + ui-ux-pro-max + frontend-pixel-master, concluída 2026-07-07
- [x] A3 Equipe `Team`+`TeamMember` `/api/v1/teams` — PR #130, merge `9b9ab52`, gates 3/3 CI verdes, testes 18 (backend) +7 (web), skills: saas-multi-tenant + ts-frontend-full + ui-ux-pro-max + frontend-pixel-master, concluída 2026-07-07
- [x] A4 Catálogo de Serviço `ServiceCatalog` `/api/v1/service-catalog` — PR #131, merge `67e47ee`, gates 3/3 CI verdes, testes 15 (backend) +7 (web), skills: saas-multi-tenant + ts-frontend-full + ui-ux-pro-max + frontend-pixel-master, concluída 2026-07-07
- [x] A5 Menu Cadastros (nav RBAC — `AppShell` + `tenantNavigation`) — PR #132, merge `9461e1f`, gates 3/3 CI verdes, 5 testes de navegação, skills: ts-frontend-full + ui-ux-pro-max + frontend-pixel-master, concluída 2026-07-07

## Bloco B — OS integrada
- [x] B1 OS integrada + snapshot (FKs opcionais em `WorkOrder` + cópia de snapshot) — PR #133, merge `842cd58`, gates 3/3 CI verdes, testes 10 (snapshot) + regressão WO+FD 6/6 + 3 (web), skills: saas-multi-tenant + ts-frontend-full + ui-ux-pro-max + frontend-pixel-master, concluída 2026-07-07
- [x] B2 Cadastro rápido via modal na OS — PR #134, merge `1b683da`, gates 3/3 CI verdes, cadastro rápido + gating por permissão, skills: ts-frontend-full + ui-ux-pro-max + frontend-pixel-master, concluída 2026-07-07

## Bloco C — Densidade & Dashboard
- [x] C1 Listas densas (número tabular, ordenação, paginação, filtros preservados) — PR #135, merge `34500f6`, gates 3/3 CI verdes, 9 testes de lógica, skills: ts-frontend-full + ui-ux-pro-max + frontend-pixel-master, concluída 2026-07-07
- [x] C2 Detalhe de OS enriquecido (cliente/viatura/equipe/serviço) — PR #136, merge `13b1fcb`, gates 3/3 CI verdes, 5 (backend) + 6 (web), regressão WO+FD 16/16, skills: saas-multi-tenant + ts-frontend-full + ui-ux-pro-max + frontend-pixel-master, concluída 2026-07-07
- [x] C3 Dashboard gap-fill (rotas agregadas reais por tenant, sem mock) — PR #137, merge `6d060e7`, gates 3/3 CI verdes, endpoint /dashboard/summary (8 testes backend + 4 web), skills: saas-multi-tenant + ts-frontend-full + ui-ux-pro-max + frontend-pixel-master, concluída 2026-07-07

## Bloco D — Mobile (Flutter, aditivo)
- [ ] D1 Mobile: seleção viatura/equipe (sync action aditivo, offline-safe)
- [ ] D2 Mobile: dados de cliente na OS (customer document/phone aditivos)

## Relatório final
- [ ] Resumo por bloco, contratos criados, rollback por PR, testes antes→depois, `git branch -a` limpo (KPIs NÃO publicados)

---

### Baseline de testes (antes da rodada, verificado 2026-07-07)
- Backend CI `npm test` (core-saas): **15/15**
- Backend dir completo: **203 pass / 2 fail (pré-existentes, P-003) / 6 skip (sem DATABASE_URL)**
- Frontend `test:smoke`: **44/44**
- Flutter (`main`): **764** (branch b123r não mergeada: 770)
