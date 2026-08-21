# BUILD_ORDER.md — Mapa de fases e PRs (ordem de construção do MVP)

> Índice **factual** da ordem de construção do ERP Techsolutions, fundado na trilha real do
> repositório (KPI history + git history + planos das rodadas + atas de junta). Referenciado pelo
> `CLAUDE.md` como "o mapa de fases/PRs".
>
> **Este arquivo é um índice, não a fonte canônica.** A ordem real vive na trilha viva de
> `agent-orchestration/` + `docs/juntas/` + `docs/rodadas/` + o git history. Em qualquer
> divergência, **valem a trilha e o `CLAUDE.md`** — nunca este resumo. Números sem certeza estão
> marcados `(aprox.)`.
>
> Última reconciliação: **2026-07-28** (rodada Ω5P, PR-17 mergeado — #302).

---

## 1. Fases do projeto (as 6 fases do `CLAUDE.md` §A5)

O projeto percorre um pipeline de seis fases. Cada uma é um estágio de maturidade, não uma
data no calendário.

1. **Discovery** — levantamento de contexto, atores, domínio (o *quê* e *para quem*).
2. **Definition** — regras de negócio, papéis/permissões (`RBAC_MATRIX`), alçadas (`APPROVAL_LIMITS`), contratos de UX.
3. **Architecture** — stack, contratos REST (`API_CONTRACTS`), modelo de dados, multi-tenant, offline-first.
4. **Execution** — implementação em blocos verticais pequenos (Parte C), 1 bloco = 1 branch = 1 PR.
5. **Validation** — bateria de validação por bloco, juntas de agentes, gates, KPI por PR.
6. **Persistence** — tudo materialmente relevante vira arquivo/estrutura operacional (não fica só no chat/PR).

> **Onde este handoff se situa:** **Execution / Validation** — construção contínua por blocos com
> validação por juntas de agentes (autonomia por juntas, §C7) e KPI atualizado no próprio PR (§C3).

---

## 2. Trilha de rodadas concluídas (o que já está mergeado)

Uma linha por rodada, na ordem cronológica real. Intervalos de PR conforme o git history; contagens
conforme o `Kpis/kpis-history.json`.

| # | Rodada | Intervalo (blocos / PR#) | O que entregou | Marco de KPI |
|---|---|---|---|---|
| 1 | **Fundação Flutter + contratos backend mobile** | `B-076 → B-108` (PRs até ~#104) | App de campo offline-first: UX HTML→Flutter, persistência local, migração Drift/SQLite, sync/replay HTTP, auth foundation, work-orders, checklist configurável, inventário, evidências câmera/galeria, GPS/mapa operacional, criação remota de OS + resolução de conflitos, hardening de evidências/storage (referência opaca, MIME, SHA-256, auditoria segura). | blocks → 38 · flutter 662/662 |
| 2 | **Integração MVP Web + Mobile** | `B-109 → B-124` (PRs ~#105–#125) | Aprovação real, `auth/me` com tenant ativo, seleção de contexto (multi-org) web, API client web, dashboard web real e enriquecido (despachos + localizações), CI frontend+Flutter, fidelidade visual (Perfil do operador, fluxo de OS mobile). | blocks → 49 · flutter 764/764 · smoke 44/44 |
| 3 | **BLOCO-AUTO A→D e F** | PRs `#127–#140` (A→D) e `#141–#154` (F1–F12) | Rodadas autônomas por blocos. KPIs ficaram sob a política antiga (publicação pós-avaliação humana); o ledger de blocos permaneceu em 49 até o re-baseamento nas rodadas seguintes. | (ledger congelado em 49) |
| 4 | **Saneamento + Juntas de Mapas** | `Ω-GATE/GOV/DOCS/INFRA-1..4` + `JUNTA-MAPAS` + `google-maps-frontend` (PRs `#174–#183`) | CI verde de verdade (suíte backend inteira no gate), descontaminação de docs, containerização (Dockerfile multi-stage + `/health` liveness/readiness), staging e produção **config-as-code inerte** no Fly.io/gru, backup+restore comprovado + observabilidade, política **KPI-por-PR** (D-KPI-PER-PR) e **autonomia por juntas** (D-SAN-AUTONOMIA). Junta de Mapas + Google Maps no Mapa Operacional. | backend 766→799 · smoke 44→378 |
| 5 | **Ω3F — Fidelidade (hub operacional da OS)** | Fase 1+2 (PRs `#184–#205`) | Paridade com o painel logístico aprovado; hub operacional da OS completo. Reconciliação de KPI diferida para um snapshot único (D-Ω3F-KPI-RELATORIO). | backend → 989 · smoke → 486 · blocks 49→58 (aprox.) |
| 6 | **Ω4 — Financeiro do tenant ×1,5** | 8 agregados (PRs `#206–#226`) | Módulo Financeiro completo: Contas, Títulos AR/AP com chokepoint, Faturamento anti-refaturamento, Caixa/Extrato, Conciliação, Fechamento com trava retroativa, Cheque, Dashboard real. Junta adversarial por agregado. | backend 989→1242 · smoke 486→514 · blocks 58→66 · mvp 98→99 / 83→88 |
| 7 | **Onda 1 — Scale + UI transversal + Mapa** | `WS-*` / `PR-SCALE-*` / `M7-SLA-*` / `ONDA1-APPROVALS` (PRs ~`#231–#260`) | Sidebar, comissões, auto-refresh, cards+charts (SVG inline zero-dep), 8 telas de plataforma + gating RBAC, redesign do Mapa (M1–M7, SLA real, MapLibre US$0), Aprovações ligadas a dados reais e ações gated. | (WS-* por PR) |
| 8 | **Ω4C — Controle & Frota** | 17 PRs de feature + PR-00 + encerramento (PRs `#261–#279`) | Fase 1 (anexos genéricos · contas a pagar por origem · extrato do profissional · motor de notificações · abastecimento · manutenção · multas+seguros) · Fase 2 (estoque com custódia/ledger imutável + baixa automática · danos · remunerações) · Fase 3 (auditoria global + sessões com revogação real · telemetria backend/Flutter/web + mapa/rastreamento · Central de Notificações). Padrão "efeito-de-domínio não-amplificador". | backend 1296→1521 · smoke 673→850 · flutter 764→807 · blocks 71→88 |

> Ata de encerramento de cada rodada em `docs/juntas/` (ex.: `J-OMEGA4C.md`) e no
> `agent-orchestration/omega/` (relatórios). Contagens de blocos anteriores ao re-baseamento
> KPI-por-PR carregam o último valor oficial com nota — não copie sem checar o history.

---

## 3. Rodada corrente — Ω5P "Pátios de Recolhimento" (SIGPRV)

Módulo de custódia jurídica de veículos recolhidos (referência **Res. CONTRAN 1025/2026**),
com **10 invariantes** (I1–I10) cobertos por teste. Plano canônico em
`docs/rodadas/omega5p/PLANO_OMEGA5P.md`; estudo de domínio em `ESTUDO_SIGPRV_PATIOS.md`; atas e
votos de junta em `docs/juntas/J-OMEGA5P.md`. Escopo do MVP: núcleo de custódia + portais + leilões
(fora do MVP: pagamento online, NFS-e, Sivec/SNE real — só adapter-ready).

**Estado atual (2026-07-28):** Fases 0–4 **mergeadas**; Fase 5 (Portais) **em curso**;
Fase 6 **pendente**. KPI no PR-17: backend **1871/1877**, smoke **937/937**, flutter **807/807**,
blocks **110**.

### Mapa de PRs por fase (com PR# reais do git history)

**Fase 0 — Governança + recon**
- ✅ PR-00 (#280) — junta J-Ω5P + 5 agentes efêmeros; recon do repo; ratificação dos D-records.

**Fase 1 — Fundações físicas e normativas** — ✅ COMPLETA
- ✅ PR-01 (#281) `yard` — pátio físico + áreas hierárquicas + vagas + ocupação (I1).
- ✅ PR-02 (#282) `jurisdiction` — perfis normativos por UF/órgão/contrato + defaults federais.
- ✅ PR-03 (#283) `tariffs` **estende** — dupla natureza (escopo público/privado + categoria de veículo).
- ✅ PR-04 (#284) — UI de administração `/patios` (FECHA a Fase 1; primeiro frontend do módulo).

**Fase 2 — Custódia** — ✅ COMPLETA
- ✅ PR-05 (#285) `impound` — o **núcleo**: agregado-raiz + `CustodyEvent` hash-chain (I2) + máquina de estados.
- ✅ PR-06 (#286) — recepção/vistoria (I3 real) + gatilho OS→custódia durável (sweep) + alocação atômica (I1) + FK dura.
- ✅ PR-07 (#287) `charging` — motor de diárias (I4), cobrança regulada (Res.1025 art.21).
- ✅ PR-08a (#288) — UI de operação do pátio (ocupação real + Processos + Dossiê probatório + movimentação de vaga).
- ✅ PR-08b (#289) — guia de débitos (F4 periodSeq) + painel de transições da FSM.
- ✅ PR-09 (#290) — trilha de notificações legais (I6) (FECHA a Fase 2).

**Fase 3 — Liberação** — ✅ COMPLETA
- ✅ PR-10a (#291) `release` — liberação do veículo (núcleo I5) (ABRE a Fase 3).
- ✅ PR-10b (#292) — `RELEASED_FOR_REPAIR` (reparo-do-dono, art.271 §2) (FECHA o núcleo backend da Fase 3).
- ✅ PR-11 (#293) — UI de liberação (dossiê + quitação + aprovação da autoridade + gate visível + reparo + comprovante art.24 + fila) (FECHA a Fase 3).

**Fase 4 — Leilão** — ✅ COMPLETA
- ✅ PR-12 (#294) — elegibilidade ao leilão + ledger 2-strikes (I8) (ABRE a Fase 4).
- ✅ PR-13a (#295) — edital de leilão + reciclagem gated (I8; sucata protegida) + dashboard KPI honesto.
- ✅ PR-13b (#296) — máquina de venda do leilão (registra o certame; base do I7) (FECHA a realização do leilão).
- ✅ PR-14a (#297) — liquidação em cascata §6º (núcleo I7) — distribuição do produto do leilão.
- ✅ PR-14b (#298) — ciclo do saldo do ex-proprietário (claim-balance + revert-funset) (FECHA o I7).
- ✅ PR-15a (#299) — UI do funil de leilão (`/patios/leiloes` + AuctionPanel no dossiê).
- ✅ PR-15b (#300) — dossiê de liquidação (cascata §6º I7 + ciclo do saldo + comprovante) (FECHA a Fase 4).

**Fase 5 — Portais isolados (dois PWAs mobile-first)** — 🔄 EM CURSO
- ✅ PR-16 (#301) — `owner-portal` BFF público **isolado** + consulta placa+Renavam (ABRE a Fase 5; emite a sessão JWE, secret próprio ≠ ERP).
- ✅ PR-17 (#302) — owner-PWA completo (dossiê detalhado + solicitar liberação) consumindo a sessão JWE do PR-16 (a sessão **é** a autorização; total do dossiê byte-idêntico à consulta). Junta pesada 5/5.
- ⏳ PR-17b (pendente) — **fotos + upload** do portal do proprietário. **Cortado** do PR-17 (D-Ω5P-PR17-SPLIT + PD-Ω5P-FOTOS): minimização de imagem = dependência nova → exige **junta-5 unânime**.
- ⏳ PR-18 (próximo) — `authority-portal` BFF credenciado + solicitar remoção + aprovação de liberação in-system + hardening LGPD (I9). **secops obrigatório.**

**Fase 6 — Gestão e encerramento** — ⏳ PENDENTE
- ⏳ PR-19 — painel gerencial (ocupação por pátio/área, permanência média, aging 30/60/90+, receita de diárias, funil liberação/leilão) + exportações.
- ⏳ PR-20 — interop **Sivec-ready** (outbox + contratos versionados) + varredura dos invariantes + **ata final** + deleção dos 5 agentes efêmeros.

> **Nota de honestidade:** a numeração da Fase 5 comprimiu/expandiu conforme a fatia (o plano
> original previa PR-16..18 só para o portal do proprietário; a execução real subdividiu em
> owner-portal `a/b` e reservou o `authority-portal` para PR-18). O que vale é o git history +
> `J-OMEGA5P.md`, não a numeração do plano.

---

## 4. Como ler / manter este arquivo

- **Cada bloco/PR segue a Parte C do `CLAUDE.md`** — escopo cirúrgico (permitido/proibido), bateria exata,
  KPI no próprio PR (§C3), branch por bloco, junta + CI verdes, **porteiro pré-merge independente** em
  `gpt-5.6-sol`/`ultra` autorizando o head exato (§C7), merge e fechamento pós-merge factual por outro agente
  (backfill, reconciliação, limpeza/compactação §C5).
- **A fonte canônica da ordem** é a trilha viva em `agent-orchestration/` (status/controle/log) +
  `docs/juntas/` (atas e votos) + `docs/rodadas/<rodada>/` (planos) + o **git history**. Em
  divergência, **valem a trilha e o `CLAUDE.md`** — este arquivo é apenas um índice.
- **Ao fechar uma rodada:** acrescente uma linha na seção 2 (intervalo de PRs + entrega + marco de
  KPI), promova a rodada corrente da seção 3, e atualize a data de reconciliação no topo.
- **Números marcados `(aprox.)`** ou omitidos são aqueles sem certeza factual na trilha no momento
  da escrita — confirme no `Kpis/kpis-history.json` antes de citá-los como oficiais.
</content>
</invoke>
