# Lista de execução — Blocos A→D (checklist vivo)

> Atualizado a cada PR concluída (entra junto do plano na PR seguinte). Formato da linha após
> conclusão: `[x] <id> <nome> — PR #NN, merge <hash>, gates X/X, testes N/M, skills:..., concluída <data>`.
> Rodada BLOCO-AUTO v3 · parte de `main@ebc3e82` (B-124K) · 2026-07-07.

## Fase 0 — Documentação + Skills
- [x] A0 Plano-mestre + lista + skills versionadas + controle atualizado — PR #127, merge `bb35341`, gates 3/3 CI verdes (backend/frontend/flutter), skills: (documental), concluída 2026-07-07

## Bloco A — Cadastros (banco + API + tela)
- [ ] A1 Cliente `Customer` `/api/v1/customers`
- [ ] A2 Viatura `Vehicle` `/api/v1/vehicles`
- [ ] A3 Equipe `Team`+`TeamMember` `/api/v1/teams`
- [ ] A4 Catálogo de Serviço `ServiceCatalog` `/api/v1/service-catalog`
- [ ] A5 Menu Cadastros (nav RBAC — `AppShell` + `tenantNavigation`)

## Bloco B — OS integrada
- [ ] B1 OS integrada + snapshot (FKs opcionais em `WorkOrder` + cópia de snapshot)
- [ ] B2 Cadastro rápido via modal na OS

## Bloco C — Densidade & Dashboard
- [ ] C1 Listas densas (número tabular, ordenação, paginação, filtros preservados)
- [ ] C2 Detalhe de OS enriquecido (cliente/viatura/equipe/serviço)
- [ ] C3 Dashboard gap-fill (rotas agregadas reais por tenant, sem mock)

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
