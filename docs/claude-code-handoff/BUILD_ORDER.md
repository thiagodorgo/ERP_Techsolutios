# BUILD_ORDER.md — Plano de implementação em blocos/PRs pequenos

Cada item = **um bloco vertical** (`B-NNN`) → **uma PR** (UI + camada de API + tipos + estados),
com comando em `agent-orchestration/codex/comandos/` (molde: `comando-template.md`), bateria de
validação própria e **KPI proposto** (não publicado na PR). Ordem pensada para provar o MVP e
minimizar dependências. **MVP Mobile primeiro**, depois Web. Modelo completo em
`EXECUTION_MODEL.md`; detalhe por tela em `Handoff MVP Mobile.dc.html` (mobile) e
`Catálogo de Telas e Endpoints.dc.html` (web).

## Fase 0 — Fundação (backend + camadas de API)
- **PR-0.1** Backend: middleware multi-tenant (`X-Tenant-Id`) + auth JWT (`/auth/login`,
  `/refresh`, `/logout`, `/me`, `/mobile/bootstrap`). Prisma: `Tenant`, `User`, `Role`.
- **PR-0.2** Web: cliente de API (React Query/SWR) + interceptor de auth + guarda de rota por
  papel. Shell (sidebar 236/74px + topbar) já com navegação por papel.
- **PR-0.3** Mobile: cliente HTTP + `SyncQueue` local (Hive/Isar) + `AuthRepository` +
  tema Claro/Escuro/Alto contraste.

## Fase 1 — MVP Mobile (11 telas) — **prioridade**
1. **PR-1.1** Login + Splash (`/auth/login`, `/google`) — fora do shell.
2. **PR-1.2** Seleção de Organização (`/mobile/bootstrap`, `/auth/active-tenant`; pula se 1 org).
3. **PR-1.3** Home operacional (bootstrap + `/work-orders`; banner de aprovações só Gestor).
4. **PR-1.4** Lista de OS (`/work-orders`; filtros + badges tipo/sync).
5. **PR-1.5** Detalhe da OS / Check-in — **validação 2 dígitos (placa/nº série) + geo**;
   `PATCH /:id/status`, `POST /mobile/field-locations`. (ver `CLAUDE.md` §5)
6. **PR-1.6** Execução — stepper guincho 6 / prestador 4 (`/mobile/sync/work-order-actions`).
7. **PR-1.7** Checklist de **coleta** schema-driven (`/checklists/:id/render`, runs, markers,
   attachments, complete) + assinatura persistida.
8. **PR-1.8** Checklist de **entrega** (run separado `e_`, assinatura "quem recebeu",
   comparison/divergence).
9. **PR-1.9** Prestador: Diagnóstico → Execução → **Estoque do técnico** (`/mobile/technician/stock`,
   `/work-orders/:id/materials`).
10. **PR-1.10** Evidências (upload + estados de sync) + Conclusão (resumo/comissão/sync silenciosa).
11. **PR-1.11** Localização: consentimento + status (LGPD, manual) e envio via popup.
12. **PR-1.12** Sync / fila offline (3 canais + card de conflito **manual**).

> Opcional MVP: **Lista de checklists por OS** (tela 7) — hoje abrimos direto; construir só
> se necessário (endpoint marcado "futuro").

## Fase 2 — Web núcleo operacional (Gestor)
- **PR-2.1** Dashboard Operacional · **PR-2.2** OS Lista + drawer Nova OS · **PR-2.3** OS
  Detalhe (timeline, atribuição, status) · **PR-2.4** Despachos (rota animada) · **PR-2.5**
  Mapa Operacional · **PR-2.6** Aprovações lista+detalhe (alçada por `APPROVAL_LIMITS.md`).

## Fase 3 — Web estoque, financeiro, admin
- Estoque lista+detalhe (barra interna de módulo) · Checklists Operacionais/Builder ·
  Financeiro · Cobranças (drawer) · Faturas · Pagamentos · Pedidos · Usuários · Auditoria ·
  Configurações · Notificações · Relatórios.

## Fase 4 — Plataforma (Admin Plataforma)
- Visão Geral · Organizações lista+detalhe · Planos e Módulos · Cloud Billing · APIs ·
  Auditoria Global · Health · Configurações.

## Regras de PR / bloco
- **1 bloco = 1 branch = 1 PR**, com comando (`comando-template.md`), **escopo permitido/proibido**
  explícito e bateria de validação (`CLAUDE.md` §9).
- Sem termos técnicos na UI · papel conferido no `RBAC_MATRIX.md` · estados
  loading/empty/error/sem-permissão (+ offline no mobile) · dados via `/api/v1` (mock atrás de
  flag só se o endpoint não existir) · testes do fluxo crítico.
- **KPIs propostos só no corpo do PR/relatório** — publicação real em bloco `B-NNNK`/`B-NNNF`
  após avaliação humana + merge + gate (`EXECUTION_MODEL.md` §4). Limpar artefatos ao final.
- **GitHub Flow:** branch por bloco → push → **Pull Request no GitHub** → CI (GitHub Actions)
  verde → **squash merge** na `main`, com DoD (`CLAUDE.md` §10) cumprida. Ao fechar uma **fase**,
  tag + GitHub Release (ex.: `mvp-mobile`). Fluxo completo em `CLAUDE.md` §8.
