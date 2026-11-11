# B-SAN3-08 — aprovar orçamento com destino e o Financeiro cria orçamento pela tela (itens 40 e 41)

- **Tipo:** feature · **Fase:** Execution · **Trilha:** frontend + testes da raiz · **Data:** 2026-11-11
- **Branch:** `feat/web-orcamento-aprovar-destino` (o plano v1 citava `fix/orcamento-destino-e-papel-financeiro`; o ramo é o que o
  orquestrador nomeou) · **Frente:** plano SAN3, §4.1 itens 40 e 41; trava de arquivo "QuoteTab (`SAN3-01` → `SAN3-08`)" (§6),
  satisfeita (#387 na `main`).
- **Autor do comando:** `dev-san3-08-cl` (Claude Opus 5.5, subagente da sessão, dev). Plano: `plano-B-SAN3-08-api` (Claude
  Opus 5.5 pela API, topo declarado pelo §C7.6-bis). Emenda 1: `emenda-B-SAN3-08-api`. Crítica: `crit-08-cl` (Claude da sessão).
- **Nível de revisão:** revisão reforçada (1 revisor que executa testes e mutações + CI) + conferência visual do diálogo
  (§C7 item 10(1)). A divergência com o §5 do `PLANO_SAN3.md` (l.283, "unanimidade + `cognicao-visual`") está registrada em
  `controle/decisoes.md` (`D-SAN3-08-NIVEL-DE-REVISAO`). A trava automática do 10(2) roda sobre o diff do PR.

## Objetivo

1. **Item 40 (`P-Ω3F4C-ACTIVATION-PROMPT`):** orçamento de serviço que exige destino vira OS pela web. As duas telas que aprovam
   (aba Orçamento da OS e tela Orçamentos) abrem um diálogo único que pergunta origem e destino, e a web passa a mandar os campos
   com o nome que o servidor lê (camelCase).
2. **Item 41 (`P-Ω3a`, parte do item 41):** prova, com as permissões gravadas no banco, que o Financeiro cria orçamento (manual e
   por tarifa) e que outro usuário do Financeiro o aprova até a OS nascer com o destino.

## Contratos / Endpoints (sem mudança no servidor)

- `POST /api/v1/service-quotes/:id/approve` — corpo em camelCase (`serviceAddress`, `serviceCity`, `serviceState`,
  `serviceZipCode`, `serviceLatitude`, `serviceLongitude`, `destination…` iguais, `activationMode`, `priority`, `title`), lido em
  `src/modules/service-quotes/service-quote.service.ts:281-296`. Resposta `200 { data: { …orçamento, workOrderId } }`.
- `GET /api/v1/service-catalog/:id` — o diálogo lê `requiresDestination` (permissão `service_catalog:read`, que todo papel que
  aprova tem).
- Recusas: `422 destination_required | quote_expired | quote_empty`, `409 quote_already_approved | quote_not_approvable`, `403`,
  `404`.

## Regras (decisões do dono)

- `D-PORTAO-7-RECOMENDACOES-1011`: o diálogo herda a aparência da tela que o abre, **sem as 3 opções** (a DoD "3 opções
  aprovadas" fica dispensada para este diálogo por decisão do dono); "Modo de acionamento (opcional)" é texto livre, até 120
  caracteres, que nunca bloqueia; aprovar cria uma OS nova, e o diálogo avisa "Será criada uma nova ordem de serviço.".
- `D-PORTAO-3-RECOMENDACOES-1111`: Q1 (c) — a OS em dobro ou órfã na falha no meio da aprovação
  (`P-SAN3-08-APPROVE-OS-NAO-ATOMICA`) vai para o `B-O6R-09`, **fora deste bloco**; Q2 (c) — vale a `RBAC_MATRIX.md` até existir
  alçada, e **este bloco não muda permissão**.
- Destino real = endereço OU latitude e longitude válidas fora de 0/0. A regra de destino tem três estados (`required`,
  `optional`, `unknown`); o desconhecido não bloqueia, e o servidor decide.

## Escopo PERMITIDO

- `frontend/src/modules/registry/service-quotes/service-quotes.service.ts` (só o corpo de `approveServiceQuote`)
- `frontend/src/modules/registry/service-quotes/service-quotes.types.ts` (só `ServiceQuoteApprovePayload`/`Result`)
- `frontend/src/modules/registry/service-quotes/service-quote-approve.model.ts` (**novo**, puro)
- `frontend/src/modules/registry/service-quotes/components/ServiceQuoteApproveDialog.tsx` (**novo**)
- `frontend/src/modules/registry/service-quotes/pages/OrcamentosPage.tsx` (só a aprovação, `messageForQuoteError` e o aviso)
- `frontend/src/modules/work-orders/components/tabs/QuoteTab.tsx` (só a aprovação e `messageForError`)
- `frontend/src/modules/registry/pois/pois.adapter.ts` e `frontend/src/modules/registry/service-catalog/**`: só import
- `frontend/tests/service-quotes.smoke.test.tsx`, `frontend/tests/work-order-quote-tab.test.tsx`,
  `frontend/tests/work-orders-honest-errors.test.tsx` (só `GUARDED_FILES`, as 2 constantes e as 2 asserções)
- `tests/san3-08-aprovar-orcamento-destino.test.ts` e `tests/san3-08-financeiro-cria-orcamento-db.test.ts` (**novos**)
- Registro: este comando, `agent-orchestration/codex/log-execucao.md`, `agent-orchestration/controle/pendencias.md` (e o índice
  gerado), `agent-orchestration/controle/decisoes.md`; o diário `docs/revisoes/SAN3/B-SAN3-08-dev.md` (por ordem do orquestrador)

## Escopo PROIBIDO

- `src/**` (as mutações M12 ficam só no worktree e nunca são commitadas) · `prisma/**` · `migrations/**` · `.github/**` ·
  `Kpis/**` (congelado, §C7.8(5)) · `catalog.ts`, `RBAC_MATRIX.md`, `frontend/src/modules/auth/**`, `frontend/src/navigation/**`,
  `frontend/src/layouts/**`, `frontend/src/App.tsx` · `frontend/src/modules/work-orders/pages/**` e `work-orders/*.ts` ·
  `useServiceQuoteReferences.ts` · `frontend/package.json`, lockfiles, `pubspec.*`, `infra/**`, `.env` ·
  `frontend/src/modules/finance/**` e `FinancialTab.tsx`.

## Testes de encerramento

- Item 40: `tests/san3-08-aprovar-orcamento-destino.test.ts` ([P1], [P1-b], [P1-pino]); `frontend/tests/service-quotes.smoke.test.tsx`
  ([G-APPROVE], [P2], [R-A4], [R-A5] ×3, [P3], [R-A2] ×2, [R-A9], [acabamento]); `frontend/tests/work-order-quote-tab.test.tsx`
  ([R-A5] ×2, [R-A9], [§7]); `frontend/tests/work-orders-honest-errors.test.tsx` ([G1] com o diálogo e o modelo nas raízes).
- Item 41: `tests/san3-08-financeiro-cria-orcamento-db.test.ts`, passos (i) a (v), nos dois braços.

## Validações

```bash
npm ci && npm --prefix frontend ci            # no worktree próprio, sem junction
npm run check && npm run lint && npm test && npm run build
CORE_SAAS_PERSISTENCE=memory node --test --import tsx tests/san3-08-aprovar-orcamento-destino.test.ts tests/service-quote-approve.test.ts
DATABASE_URL=<cluster descartável> node --test --import tsx tests/san3-08-financeiro-cria-orcamento-db.test.ts tests/san3-04a-menu-com-permissoes-do-banco-db.test.ts
npm --prefix frontend run check && npm --prefix frontend run build && npm --prefix frontend run test:smoke
node --check Kpis/app.js && git diff --check && git diff --name-only origin/main...HEAD
```

Vermelho-controle e mutações (M1, M1b, M2, M3a a M14) estão no diário `docs/revisoes/SAN3/B-SAN3-08-dev.md`.

## Limites

- Sem mudança no servidor, no banco, nas permissões, no CI nem nos KPIs.
- Não preenche origem e destino a partir da OS-mãe (o `WorkOrderDetailPage.tsx` está fora da fronteira).
- Pendências novas (fora do bloco, com dono proposto) registradas em `controle/pendencias.md`.
