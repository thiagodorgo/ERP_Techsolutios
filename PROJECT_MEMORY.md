# PROJECT_MEMORY.md — Estado real do repositório (ERP Techsolutions)

> Resumo vivo, **fundado no repositório** (código, `prisma/`, `Kpis/`, `agent-orchestration/`), do
> estado material do ERP Techsolutions. É referenciado pelo `CLAUDE.md` (Parte A, cabeçalho): leia-o
> **antes de qualquer bloco**, junto do contrato. Snapshot deste documento: **2026-07-28**
> (versão de KPI `OMEGA5P-PR-17`).
>
> **Regra de precedência:** este arquivo é um *resumo*. A **trilha viva** em
> `agent-orchestration/` (controle/decisões/pendências), nas atas `docs/juntas/` e nos KPIs
> `Kpis/*` é a fonte de verdade. **Onde este resumo divergir da trilha, vale a trilha no repo** —
> nunca a memória do agente. As fontes de verdade de produto/permissão/alçada continuam sendo as
> do `CLAUDE.md` §A1 (decisões do dono → arquivos-base → `docs/` → `agent-orchestration/` → `src/`).

---

## 1. O que é este arquivo

Documento de **estado**, não de contrato. Descreve o que EXISTE hoje no repositório: a stack
confirmada em código, o mapa dos **62 módulos** de `src/modules/`, o histórico das rodadas já
mergeadas até a rodada em curso (**Ω5P — Pátios de Recolhimento / SIGPRV**), os **invariantes de
arquitetura** que os blocos preservam, e os **KPIs reais** do último snapshot. Datas foram
convertidas para absolutas (hoje = **2026-07-28**). Sempre que houver conflito entre este resumo e
a trilha operacional (`agent-orchestration/controle/`, `docs/juntas/`, `Kpis/`), **a trilha vence**;
este arquivo é conveniência de leitura, não autoridade.

---

## 2. Stack confirmada (fundada no código)

| Camada | Tecnologia | Evidência no repo |
|---|---|---|
| Backend | **Node.js + TypeScript**, **Express 5** | `package.json` (`express ^5.1.0`); monólito modular em `src/modules/` |
| ORM/DB | **Prisma 7 + PostgreSQL** | `package.json` (`@prisma/client ^7.8.0`); `prisma/schema.prisma` (**102 models**, ~3.282 linhas), `provider = "postgresql"` |
| Isolamento | **RLS ENABLE + FORCE + POLICY** por tenant | **62 migrations** com `ENABLE/FORCE ROW LEVEL SECURITY` + `CREATE POLICY … USING/WITH CHECK (tenant_id = current_setting('app.current_tenant_id'))`; helper `src/database/rls.ts` (`withTenantRls`) |
| Cache/infra | **Redis** | `src/infra/redis/redis.client.ts`, `src/config/env.ts` (`REDIS_URL`) |
| Auth | **JWT via `jose`**; **Cognito em prod**, contrato-compatível local em dev | `package.json` (`jose ^6.2.3`); contexto vem dos claims (`sub·tenant_id·tenant_role·permissions…`); **backend é a autoridade final** de autorização |
| Eventos/trilha | Eventos de domínio + auditoria; **hash-chain append-only** onde há custódia | `WorkOrderEvent`, `AuditLog`; `src/modules/impound/impound.hashchain.ts` (CustodyEvent encadeado); `PortalAccessLog` append-only (trigger bloqueia UPDATE/DELETE) — padrão Outbox de eventos conforme `CLAUDE.md` |
| Web | **React** (Vite + TS + Tailwind) | `frontend/` (console ERP, 5 papéis); PWAs públicos isolados em `portals/` (Ω5P) |
| Mobile | **Flutter 3.x** offline-first | `mobile/flutter_app/` (fila de sync local, Drift) |

Arquitetura: **monólito modular multi-tenant** (shared-schema PostgreSQL, isolamento por
`tenant_id` + RLS), `/api/v1` REST. O conflito histórico "backend em C" está **resolvido**
(`decisoes.md` D-002/D-003): vale **Node.js + TypeScript**.

---

## 3. Mapa de módulos por domínio (62 módulos de `src/modules/`)

| Domínio | Módulos | O que cobre |
|---|---|---|
| **Core SaaS / Auth / Nav / Plataforma** | `core-saas`, `auth`, `navigation`, `platform`, `tenant-settings`, `branches`, `teams` | Tenants, usuários, papéis/permissões (RBAC de 9 papéis), sessões, provisionamento de menu/rota, console de plataforma, filiais/equipes |
| **Operações (OS / campo / serviço)** | `work-orders`, `work-order-comments`, `work-order-audit-logs`, `work-order-financials`, `work-order-timeseries`, `field-dispatch`, `field-location`, `field-ops-realtime`, `service-catalog`, `service-quotes`, `service-quote-items`, `operator-profiles`, `technician-performance`, `checklists`, `evidence`, `attachments`, `mobile` | Hub da Ordem de Serviço (ciclo/estados, timeline, comentários, financeiro-da-OS), despacho e assign, localização/telemetria de campo em tempo real, catálogo e orçamentos de serviço, checklists/evidências/anexos, sync mobile |
| **Cadastros / Registry** | `customers`, `suppliers`, `vehicles`, `price-tables`, `tariffs`, `tags`, `tag-assignments`, `pois` | Clientes, fornecedores, viaturas, tabelas de valores, tarifas (vigência × categoria × serviço), etiquetas e pontos de interesse |
| **Financeiro do tenant** | `financial-accounts`, `financial-titles`, `financial-entries`, `financial-period-closes`, `financial-summary`, `cheques`, `commissions`, `professional-statements`, `expense-management` | Contas, títulos AR/AP com chokepoint, lançamentos/extrato, fechamento de período (trava retroativa), cheques, comissões, remunerações/extratos de prestador, despesas/RDV |
| **Frota (controle)** | `fuel-logs`, `maintenance-orders`, `fines`, `insurance-policies`, `damages` | Abastecimento (km/L derivado, odômetro monotônico), manutenção (FSM + indisponibilidade), multas (FSM + cancelamento admin), seguros (status `vencida` derivado + alertas), danos (fotos + desconto parcelado) |
| **Estoque** | `inventory` | Itens + movimentos imutáveis, saldo/custo-médio em transação, ABC (Pareto 12m), ponto de pedido derivado, contagem cíclica |
| **Custódia / Pátios (Ω5P — SIGPRV)** | `yard`, `jurisdiction`, `impound`, `charging`, `release`, `auction`, `owner-portal`, `portal-shared` | Pátios/áreas/vagas/ocupação, perfis normativos, processo de custódia (CustodyEvent hash-chain + FSM), motor de diárias, liberação, leilão/liquidação (cascata art.328 §6º), portal público do proprietário (BFF isolado) e utilitários compartilhados dos portais (PoW/HMAC/rate-limit zero-dep) |
| **Cloud (billing SaaS)** | `cloud-charges`, `cloud-usage`, `cloud-costs`, `cloud-cost-allocation` | Cobrança/uso/custos da plataforma e rateio (telas bespoke Cloud Billing / Visão da Plataforma) |
| **Transversais** | `dashboard`, `notifications`, `telemetry` | Dashboard com agregados reais por tenant, Central de Notificações (produtores idempotentes de frota + fleet-alerts runner), telemetria (heartbeat/km/recusas, consent-gate LGPD) |

---

## 4. Rodadas concluídas / estado das fases

Blocos entregues (`blocks_completed`) evoluíram de **49** (pré-Ω, até B-124) até **110** (snapshot atual).
Trilha resumida (fonte: `Kpis/kpis-history.json` + `agent-orchestration/controle/decisoes.md` +
`docs/juntas/`):

- **Pré-Ω (até B-124):** hub inicial de OS mobile + dashboard web enriquecido. `blocks=49`.
- **Rodada Saneamento (2026-07-13/14, PRs #174–#183):** Ω-GATE/GOV/DOCS/INFRA-1..4 — suíte inteira no CI
  (backend 766/766), **política KPI-por-PR** (D-KPI-PER-PR revoga o gate humano por PR), descontaminação
  Kryos (D-DOCS-KRYOS), config-as-code de infra **inerte** até hand-off (provedor **Fly.io** gru/SP 1º,
  AWS 2º — D-INFRA-PROVIDER).
- **Ω3F — Hub operacional da OS (Fase 1, PRs #184–#205):** orçamento→OS, despacho endurecido,
  timeline/comentários, checklist congelado no despacho, anexos de OS. backend →989, smoke →486.
- **Ω4 — Financeiro do tenant ×1,5 (PRs #206–#226):** 8 agregados (Contas, Títulos AR/AP + chokepoint,
  Faturamento anti-refaturamento, Caixa/Extrato, Conciliação, Fechamento com trava retroativa, Cheque,
  Dashboard real). backend 989→**1242**, smoke 486→**514**, blocks 58→**66**, mvp 98→**99** / 83→**88**.
- **Onda 1 (escala + UI transversal + Mapa, #231–#241):** sidebar/comissões/auto-refresh, cards+charts
  SVG inline, redesenho do Mapa full-bleed (**MapLibre GL + OpenFreeMap**, custo zero; Google só onde agrega).
- **Ω4C — Controle & Frota (ENCERRADA, 2026-07-25, PRs #262–#279):** 17 PRs — anexos/contas-a-pagar/extrato/
  motor-notif; abastecimento/manutenção/multas+seguros/danos; estoque custódia + baixa-automática; remunerações;
  auditoria+sessões; telemetria (backend + Flutter + web + mapa) + Central de Notificações. backend 1296→**1521**,
  smoke 673→**850**, flutter →**807**, blocks 71→**88**. Padrão **efeito-de-domínio não-amplificador**. Ata:
  `docs/juntas/J-OMEGA4C.md`.
- **Ω5P — Pátios de Recolhimento / SIGPRV (EM CURSO, PRs #280+):** módulo de custódia jurídica (ref.
  Res. CONTRAN 1025/2026). Estado por fase (fonte: `docs/rodadas/omega5p/PLANO_OMEGA5P.md` + `docs/juntas/J-OMEGA5P.md`):
  - **Fase 0 (PR-00) — recon:** ✅ concluída.
  - **Fase 1 — fundações físicas/normativas (PR-01→04):** ✅ `yard`, `jurisdiction`, `tariffs` estendido, UI `/patios`.
  - **Fase 2 — custódia (PR-05→09):** ✅ `impound` (processo + CustodyEvent hash-chain + FSM), recepção/vistoria, `charging` (motor de diárias), UI operação, notificações legais.
  - **Fase 3 — liberação (PR-10→11):** ✅ `release` + UI/fila.
  - **Fase 4 — leilão (PR-12→15):** ✅ elegibilidade/preparação, edital/arrematação, liquidação (cascata art.328 §6º — I7), UI funil + dossiê. **FECHADA no PR-15b.**
  - **Fase 5 — Portal do Proprietário (PR-16→18):** 🚧 EM CURSO. ✅ PR-16 (owner-portal **BFF público isolado** + consulta placa+Renavam, anti-enumeração/rate-limit/PoW/`PortalAccessLog` I10) e ✅ PR-17 (owner-PWA dossiê completo + solicitar liberação; a **sessão JWE é a autorização**, `processId` sempre da sessão). **Pendentes:** PR-17b (fotos minimizadas/marca-d'água server-side — **junta-5 + PD-Ω5P-FOTOS**, depende de lib de imagem = dependência nova), PR-18 (authority-portal BFF + credencial + solicitar remoção + SoD + hardening LGPD).
  - **Fase 6 — gestão e encerramento (PR-19→20):** ⬜ pendente (painel gerencial + interop Sivec-ready outbox + ata final + deleção dos agentes efêmeros).

> **Nota de divergência:** o índice de memória do agente ainda descreve Ω5P como "Fase 1 completa";
> a **trilha viva** (`kpis-history` + `J-OMEGA5P.md`) mostra Fases 0–4 fechadas e a Fase 5 em curso no
> PR-17. Vale a trilha.

**Última migração aplicada:** `prisma/migrations/20260848000000_add_portal_release_request`
(PortalReleaseRequest — RLS FORCE + FK tenant-first RESTRICT + partial-unique anti-spam + widening
aditivo dos CHECKs de `portal_access_logs`). Total de **84 migrations**; `migrate status` up-to-date.

---

## 5. Invariantes vivos (preservar em todo bloco)

Arquitetura (transversais, extraídos de `CLAUDE.md`, `decisoes.md` e do código):

1. **Multi-tenant RLS tenant-first.** Toda tabela nova nasce com `ENABLE+FORCE ROW LEVEL SECURITY` +
   `POLICY` em `app.current_tenant_id`; FKs **compostas tenant-first** (`(tenant_id, …)`); acesso via
   `withTenantRls`. Tenant sempre resolvido pelo **ator autenticado**, nunca pelo corpo/query.
   (Em dev o app conecta como superusuário → RLS é bypassada em runtime; o isolamento é sustentado
   pela camada de aplicação — ver P-INFRA-RLS. RLS = defense-in-depth para role não-superusuário.)
2. **Backend é a autoridade de autorização.** A UI só molda/esconde; permissão validada no backend
   conforme `RBAC_MATRIX.md`. `X-Tenant-Id` só resolve org ativa em multi-org.
3. **Dinheiro exato, nunca float.** `Decimal(20,6)` no schema; agregados **single-currency por OS**
   (`currency_mismatch` 422); **dinheiro em superfície pública = tolerância zero** (total do dossiê do
   portal **byte-idêntico** ao da consulta — lição reforçada no PR-17).
4. **§2.8 — allowlist de payload/auditoria.** Nunca expor `token`, `path`, `bucket`, `storage_key`,
   `file_url`, `base64`, binário nem `tenant_id` externo em resposta pública ou metadados de auditoria
   (regex UUID + allowlist de campos nos DTOs públicos).
5. **Append-only / hash-chain onde há custódia.** CustodyEvent encadeado por hash
   (`impound.hashchain.ts`); `PortalAccessLog` imutável (trigger bloqueia UPDATE/DELETE). Correções por
   **novo evento**, nunca edição.
6. **Idempotência.** Sync mobile = `tenant + usuário + client_action_id`; produtores de notificação de
   domínio idempotentes por chave estável (`maintenance_due:<id>`, `insurance:<id>:30d`…); portais com
   **partial-unique** (1 solicitação aberta por processo).
7. **Migrações aditivas up-only.** Prisma é forward-only; rollback documentado como SQL manual (`DROP`);
   alteração de CHECK provada **superset** via `tx-ROLLBACK` (sem DROP). Escopo proibido de feature:
   `prisma/**`, `infra/**`, `.env`, lockfiles — salvo autorização explícita do bloco.
8. **Derivado-não-armazenado.** Saldo de estoque, km/L, status `vencida` de seguro e ponto de pedido são
   **calculados na leitura**, nunca colunas; movimentos de estoque são **imutáveis** (correção = ajuste).
9. **Efeito-de-domínio não-amplificador** (padrão Ω4C): multa/dano/remuneração/baixa-de-estoque geram
   efeito no extrato/custódia sem re-disparar cascatas.
10. **Invariantes normativos Ω5P (I1–I10):** ocupação consistente sob concorrência (I1), custódia
    append-only/hash (I2–I3), congelamento de diárias na liberação (I5), cascata de liquidação art.328 §6º
    (I7), reclassificação 2-strikes (I8), retenção/anonimização + FK RESTRICT anti-órfão (I9),
    `PortalAccessLog` probatório por tentativa (I10).

---

## 6. KPIs atuais (snapshot 2026-07-28 · `Kpis/kpis-latest.json` · versão `OMEGA5P-PR-17`)

| KPI | Valor |
|---|---|
| **backend_tests** | **1871 / 1877** (6 skip DB-gated que rodam no CI) |
| **frontend_smoke_tests** | **937 / 937** |
| **flutter_tests** | **807 / 807** |
| **blocks_completed** | **110** |
| **mvp_demo** | **99 %** (estimado, sujeito a revisão humana) |
| **mvp_vendavel** | **88 %** (estimado, sujeito a revisão humana) |

Política **KPI-por-PR** (D-KPI-PER-PR): todo PR que altere código/teste/escopo atualiza `Kpis/*` no
próprio PR com **contagem de execução real**; PR que toca Flutter/mobile atualiza também
`Kpis/*` (painel ÚNICO — a política dupla foi revogada em 2026-08-12, `D-KPI-DUPLA-REVOGADA`, e o painel do Flutter foi apagado). `merge_commit`/`approved_head` nascem `null` na autoria e recebem
**backfill pós-merge**. A **junta do PR valida os números**; o humano audita pelo history.

---

## 7. Onde está a trilha viva (fonte de verdade)

Este resumo é conveniência. **A autoridade está no repo:**

- `agent-orchestration/controle/` — `decisoes.md` (D-001…, D-KPI-PER-PR, D-SAN-AUTONOMIA, D-Ω3F/Ω4…),
  `pendencias.md` (P-001…, P-INFRA-RLS, backlog Ω5P), `status-geral.md`.
- `agent-orchestration/codex/` e `agent-orchestration/omega/` — comandos, logs, juntas e relatórios de rodada.
- `docs/juntas/` — atas por rodada (`J-OMEGA4C.md`, `J-OMEGA5P.md`).
- `docs/rodadas/omega5p/` — `ESTUDO_SIGPRV_PATIOS.md`, `FASE0_RECON.md`, `PLANO_OMEGA5P.md`.
- `Kpis/` — `kpis-latest.json`, `kpis-history.json`, `index.html` (painel ÚNICO desde 2026-08-12).
- Fontes de verdade de produto/UI: `PRODUCT_CONTEXT.md`, `RBAC_MATRIX.md`, `APPROVAL_LIMITS.md`,
  `DESIGN_SYSTEM.md`, `COMPONENT_LIBRARY.md`, `screen-refs/`, `docs/`.

**Em qualquer divergência entre este PROJECT_MEMORY.md e a trilha acima, vale a trilha no repo.**
