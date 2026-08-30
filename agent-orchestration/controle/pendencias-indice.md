# Indice de pendencias — GERADO, nao digitado

> Produzido por `agent-orchestration/controle/gerar-indice-pendencias.py`.
> **Se este arquivo divergir do `pendencias.md`, vale o `pendencias.md`** e o indice se regenera.

> **Este classificador ja foi REPROVADO por uma junta, e o que ele aprendeu esta escrito no
> cabecalho do script.** A primeira versao decidia "fechada" por substring no cabecalho, e isso
> confundia **vocabulario de dominio com vocabulario de status** (*"periodo **fechado**"* fechou
> uma pendencia) e **resolucao parcial com resolucao** (*"RESOLVIDO **PARCIAL**"* fechou uma
> entrada que lista quatro residuais abertos). Ambas eram a classe que esta rodada existe para
> exterminar, cometidas pelo bloco que existia para extermina-la.

## As regras, ditas por inteiro

1. **So conta status em contexto de status** — linha que comeca por `status:` ou `Estado:`.
   Texto corrido nao decide estado.
2. **Qualificador de parcialidade nunca fecha** (PARCIAL / PARCIALMENTE / RESIDUAL).
3. **A linha de status vence o cabecalho** — a linha e o campo canonico.
4. **Contradicao nao vira palpite.** Quando linha e cabecalho se opoem, o indice emite
   **`CONTRADITORIA`**. Decidir qual vence exige a **data** de cada afirmacao, que um regex nao
   tem — e chutar aqui foi exatamente o defeito anterior.
5. **Severidade material sinaliza o balde C.** Item CRITICA/ALTA/MEDIA marcado como diferido
   aparece **sinalizado**, para o dono ver que ha peso material sendo adiado.
6. **`DIFERIDO-LEVE` e agendamento, nao status** — diferida **continua ABERTA**.

## Placar

| | qtde |
|---|---:|
| Cabecalhos `## P-` | **232** |
| IDs distintos | 224 |
| **ABERTAS** | **185** |
| — das quais **diferidas** (balde C) | 77 |
| — das quais **ativas nesta rodada** | **108** |
| **CONTRADITORIAS** (exigem decisao) | **0** |
| FECHADAS | 47 |

> O placar conta **cabecalhos**, nao pendencias distintas: **232 cabecalhos para 224 IDs**, porque
> **6 IDs aparecem mais de uma vez** (emendas apensadas, §A2). Quem citar "N pendencias abertas"
> deve dizer qual das duas reguas esta usando.

## Diferidas com severidade MATERIAL — 2 (o dono deve olhar)

| ID | linha | severidade | titulo |
|---|--:|---|---|
| `P-Ω3b` | 405 | **MÉDIA** | P-Ω3b (Ω3-b Despacho endurecido + Comentário/Timeline da OS) — validador-mestre |
| `P-Ω4-8-DASHBOARD-FIDELITY` | 1286 | **MÉDIA** | P-Ω4-8-DASHBOARD-FIDELITY — Reduções de composição do dashboard vs financeiro.pn |

## SEM STATUS — nenhuma linha `status:`/`Estado:` (o indice NAO chuta) — 0

| ID | linha | severidade | dono | titulo |
|---|--:|---|---|---|

## CONTRADITORIAS — cabecalho e linha de status se opoem — 0

| ID | linha | severidade | dono | titulo |
|---|--:|---|---|---|

## ABERTAS · balde A — material — 31

| ID | linha | severidade | dono | titulo |
|---|--:|---|---|---|
| `P-029` | 339 | MÉDIA | **a atribuir** | P-029 - Ω2-a.2: modal de edicao de Tarifa mantem selects de referencia habilitados, mas  |
| `P-Ω3F3B-UPDATE-VALIDA4` | 608 | MÉDIA | sim | P-Ω3F3B-UPDATE-VALIDA4 - Validação #4 depende da imutabilidade de customer/service no up |
| `P-Ω4-3-REFATURAR-DELTA` | 940 | MÉDIA | sim | P-Ω4-3-REFATURAR-DELTA — Faturar o delta de itens adicionados após o 1º faturamento (BAI |
| `P-Ω4-3-CURRENCY-BRL` | 969 | MÉDIA | sim | P-Ω4-3-CURRENCY-BRL — Item da OS aceita moeda ≠ BRL, mas faturar exige BRL (MÉDIA-BAIXA) |
| `P-Ω4-4-LIQUID-ATOMIC` | 1030 | MÉDIA | sim | P-Ω4-4-LIQUID-ATOMIC — Liquidação lançamento↔título não-atômica (MÉDIA) |
| `P-Ω4-4-REVERSE-IDEM` | 1053 | MÉDIA | sim | P-Ω4-4-REVERSE-IDEM — Idempotência do estorno é app-level sem rede no banco (MÉDIA) |
| `P-Ω4-6-CLOSE-RACE` | 1075 | MÉDIA | sim | P-Ω4-6-CLOSE-RACE — read-skew entre a leitura do snapshot e o commit do 'closed' (MÉDIA, |
| `P-Ω4-7-CLEAR-ATOMIC` | 1231 | MÉDIA | sim | P-Ω4-7-CLEAR-ATOMIC — Resíduo de atomicidade do clear/bounce do cheque (BAIXA — espelha  |
| `P-GOLIVE-VALIDATE-CONSTRAINT` | 1351 | MÉDIA | sim | P-GOLIVE-VALIDATE-CONSTRAINT — Operacionalizar VALIDATE CONSTRAINT do CHECK do cancelame |
| `P-AUDIT-FOLLOWUPS` | 1531 | MÉDIA | **a atribuir** | P-AUDIT-FOLLOWUPS - Melhorias de Auditoria (2026-07-20, PR-SCALE-3, todas BAIXA/MEDIA) |
| `P-CHK-PRISMA-CLIENT-TYPING` | 1689 | MÉDIA | sim | P-CHK-PRISMA-CLIENT-TYPING (2026-08-02) — repo prisma de checklist descarta os tipos ger |
| `P-MOBILE-BANNER-INTEGRACAO` | 1894 | MÉDIA | **a atribuir** | P-MOBILE-BANNER-INTEGRACAO (2026-08-06) — banner "Integração remota ainda não ativa" é E |
| `P-MOBILE-OS-SEEDS` | 1908 | ALTA | **a atribuir** | P-MOBILE-OS-SEEDS (2026-08-06) — lista de OS do app mostra SEEDS locais como se fossem d |
| `P-CHK-PATCH-SEM-LOCK` | 1976 | MÉDIA | **a atribuir** | P-CHK-PATCH-SEM-LOCK (2026-08-07) — PATCH de checklist é last-write-wins sem guarda de v |
| `P-CHK-CHIPS-SEM-CONSUMIDOR` | 1996 | MÉDIA | **a atribuir** | P-CHK-CHIPS-SEM-CONSUMIDOR (2026-08-08) — inspector grava config que NINGUÉM lê (MÉDIA,  |
| `P-JUNTA-LIMPEZA-BASE-VIVA` | 2035 | MÉDIA | **a atribuir** | P-JUNTA-LIMPEZA-BASE-VIVA (2026-08-08) — 2º incidente de limpeza ad-hoc por subagente na |
| `P-O6R-B01-ANONIMO-SEM-LOCKOUT` | 3347 | ALTA | sim | P-O6R-B01-ANONIMO-SEM-LOCKOUT (2026-08-19) — **ALTA** · o caminho anônimo não arma o loc |
| `P-O6R-B01-RELIGACAO-SEM-REMEDIO` | 3364 | ALTA | sim | P-O6R-B01-RELIGACAO-SEM-REMEDIO (2026-08-19) — **ALTA** · assimetria sem via de saída |
| `P-O6R-B01-LOGERROR-MORTO` | 3380 | ALTA | sim | P-O6R-B01-LOGERROR-MORTO (2026-08-19) — **ALTA (observabilidade)** · a falha da fonte de |
| `P-ARNES-RLS-TEST-FORA-DO-SWEEP` | 3473 | MÉDIA | sim | P-ARNES-RLS-TEST-FORA-DO-SWEEP (2026-08-28 — B-O6R-ARNES, C-C) — MÉDIA · decisão CONSCIE |
| `P-ARNES-DIVERGENCIA-RUNNER-SUMICO-NAO-EXISTE-NA-MAIN` | 3547 | MÉDIA | sim | P-ARNES-DIVERGENCIA-RUNNER-SUMICO-NAO-EXISTE-NA-MAIN (2026-08-28) — divergência do plano |
| `P-O6R-B02-OVERCLAIM-ORFA-SQL-CRU` | 3650 | MÉDIA | sim | P-O6R-B02-OVERCLAIM-ORFA-SQL-CRU (2026-08-28 — cadeira de ataque, ajuste A1) — MÉDIA |
| `P-O6R-B02-TESTE-RLS-SUPERUSER` | 3661 | MÉDIA | sim | P-O6R-B02-TESTE-RLS-SUPERUSER (2026-08-28 — cadeira de banco, ajuste A2) — MÉDIA |
| `P-O6R-B02-BATERIA-CANONICAS-1-2` | 3681 | MÉDIA | sim | P-O6R-B02-BATERIA-CANONICAS-1-2 (2026-08-28 — validação, ajuste A4) — MÉDIA |
| `P-O6R-B02-SUITES-LIST-CI` | 3690 | MÉDIA | sim | P-O6R-B02-SUITES-LIST-CI (2026-08-28 — validação A5 + arnês #6) — MÉDIA |
| `P-O6R-B02-RUNNER-SUMICO-SEM-SKIP` | 3779 | MÉDIA | sim | P-O6R-B02-RUNNER-SUMICO-SEM-SKIP (2026-08-28 — arnês #4 / D26b) — MÉDIA (mesma classe do |
| `P-ARNES-AUTHORITY-PORTAL-INTERMITENTE` | 3890 | MÉDIA | sim | P-ARNES-AUTHORITY-PORTAL-INTERMITENTE (2026-08-28) — MÉDIA · **Dono: a atribuir por exec |
| `P-REG-BATERIA-BARATA-DUAS-LISTAS` | 4070 | MÉDIA | sim | P-REG-BATERIA-BARATA-DUAS-LISTAS (2026-08-29) — MÉDIA · **Dono:** `B-O6R-02` ciclo 5 (é  |
| `P-GOV-MAIN-SEM-PROTECAO` | 4155 | MÉDIA | sim | P-GOV-MAIN-SEM-PROTECAO — ATUALIZAÇÃO (2026-08-25): ruleset INSTALADO |
| `P-SAN2-LEITURA-DAS-79` | 4188 | MÉDIA | sim | P-SAN2-LEITURA-DAS-79 (2026-08-29) — MÉDIA · **Dono:** bloco próprio, DEPOIS do ciclo 5  |
| `P-SAN2-2-INDICE-DONO-SEMPRE-SIM` | 4345 | MÉDIA | sim | P-SAN2-2-INDICE-DONO-SEMPRE-SIM (2026-08-30) — MÉDIA · a coluna "dono" do índice diz **s |

## ABERTAS · balde B — processo/registro — 77

| ID | linha | severidade | dono | titulo |
|---|--:|---|---|---|
| `P-006` | 73 | — | **a atribuir** | P-006 - RLS por-tenant e rate-limit por-tenant (proposta, nao implementar) |
| `P-007` | 80 | — | **a atribuir** | P-007 - Prisma forward-only: rollback via SQL manual (2026-07-07) |
| `P-018` | 213 | — | **a atribuir** | P-018 - Attachments: allowlist de mime confia no Content-Type declarado (sem sniffing) ( |
| `P-020` | 239 | BAIXA | **a atribuir** | P-020 - F7a: check de saldo sem SELECT FOR UPDATE (corrida teorica de debito) (2026-07-0 |
| `P-031` | 370 | — | **a atribuir** | P-031 - Higiene: diretorios untracked .claude/skills/* fora do escopo das PRs (2026-07-1 |
| `P-INFRA-RLS` | 464 | — | sim | P-INFRA-RLS (transversal — apontado pelo coordenador no Ω3-d) — RLS não enforçada em run |
| `P-SAN-E2E` | 474 | — | **a atribuir** | P-SAN-E2E - Playwright e2e fora do gate obrigatório (Ω-GATE, 2026-07-13) |
| `P-SAN-CORE-PRISMA-COV` | 486 | — | **a atribuir** | P-SAN-CORE-PRISMA-COV - Adapter prisma do Core SaaS não é exercido pelo gate (Ω-GATE, 20 |
| `P-SAN-KPI-BACKFILL` | 496 | — | **a atribuir** | P-SAN-KPI-BACKFILL - Backfill de merge_commit/approved_head nos KPIs pode persistir null |
| `P-Ω3F6-COMISSAO-REVERSAL` | 716 | — | **a atribuir** | P-Ω3F6-COMISSAO-REVERSAL - dual-gate na engine de cálculo + reversão de comissão de OS c |
| `P-Ω3F6-COMISSAO-PRISMA-COV` | 728 | — | **a atribuir** | P-Ω3F6-COMISSAO-PRISMA-COV - caminho Prisma do gate de supressão só coberto por tsc+revi |
| `P-Ω3F6-STATUS-BYPASS` | 737 | — | **a atribuir** | P-Ω3F6-STATUS-BYPASS - Cancelamento legado por PATCH /status não grava decisão financeir |
| `P-Ω3F6-TERMINAL-GUARD` | 762 | — | **a atribuir** | P-Ω3F6-TERMINAL-GUARD - Itens financeiros podem ser lançados em OS cancelada (J-OMEGA3F- |
| `P-Ω3F6-ZERO-ATOMICIDADE` | 800 | — | **a atribuir** | P-Ω3F6-ZERO-ATOMICIDADE - `zero` do cancel: N deletes sequenciais sem transação (+ N+1)  |
| `P-Ω3F7B-MAPA-ETAPA` | 822 | — | **a atribuir** | P-Ω3F7B-MAPA-ETAPA - Mapa de posição por etapa: falta a FONTE DE DADOS (Ω3F-7b, 2026-07- |
| `P-Ω3F7-MOBILETAB-NITS` | 835 | — | **a atribuir** | P-Ω3F7-MOBILETAB-NITS - Nits da pós-análise da MobileTab (Ω3F-7, 2026-07-17) |
| `P-Ω4-2B-KPI-AGREGADO` | 922 | BAIXA | sim | P-Ω4-2B-KPI-AGREGADO — KPIs/tabs somam só as linhas carregadas (MÉDIO, Ω4-8 Dashboard) |
| `P-Ω4-3-INVOICE-LEASTPRIV` | 988 | BAIXA | sim | P-Ω4-3-INVOICE-LEASTPRIV — Rota invoice não exige work_order_financials:read (BAIXA) |
| `P-Ω4-4-READINESS` | 995 | — | sim | P-Ω4-4-READINESS — O que o Ω4-4 (Caixa/liquidação) precisa construir (GUIA, não bug) |
| `P-Ω4-4-EDGES` | 1010 | — | sim | P-Ω4-4-EDGES — Bordas do Ω4-4 (Caixa/Extrato + liquidação) — implementado, com decisões  |
| `P-Ω4-5-BATCH` | 1133 | — | sim | P-Ω4-5-BATCH — conciliação em LOTE (importar extrato CSV/OFX → casar N lançamentos) — AD |
| `P-Ω4-6-READINESS` | 1143 | — | sim | P-Ω4-6-READINESS — O que o Ω4-6 (Fechamento) precisa construir + a exceção reconcile (GU |
| `P-Ω4-8-READINESS` | 1208 | — | sim | P-Ω4-8-READINESS — Guia do Dashboard financeiro real (Ω4-8) |
| `P-Ω4-7-READINESS` | 1221 | — | sim | P-Ω4-7-READINESS — Guia do Cheque (Ω4-7) |
| `P-Ω4-7-DUPLA-CONTAGEM` | 1255 | BAIXA | sim | P-Ω4-7-DUPLA-CONTAGEM — cheque-register vs payTitle p/ o mesmo dinheiro (BAIXA — risco d |
| `P-Ω4-7-CLEAR-RETRO` | 1263 | BAIXA | sim | P-Ω4-7-CLEAR-RETRO — Compensação retroativa a período fechado (BAIXA) |
| `P-Ω3F6` | 1300 | BAIXA | sim | P-Ω3F6 — cluster de cancelamento: STATUS-BYPASS/TERMINAL-GUARD/ZERO-ATOMICIDADE RESOLVID |
| `P-GOLIVE-GATES` | 1360 | — | sim | P-GOLIVE-GATES — Gates humanos de go-live (R1 provedor, R2 restore cronometrado, smoke a |
| `P-RBAC-CATALOG-MATRIZ` | 1404 | — | **a atribuir** | P-RBAC-CATALOG-MATRIZ — divergências pré-existentes catalog.ts × RBAC_MATRIX.md em check |
| `P-WOTS-FRONT-ACCESS` | 1494 | — | **a atribuir** | P-WOTS-FRONT-ACCESS — gráfico temporal deve tratar 403 (papel sem work_orders:read) no D |
| `P-PLATFORM-MOCK-WIRING` | 1501 | — | **a atribuir** | P-PLATFORM-MOCK-WIRING - Telas de Plataforma 100% mock hardcoded (2026-07-20, WS-CARDS-C |
| `P-SCALE-RBAC-OWNER-APPROVAL` | 1514 | — | **a atribuir** | P-SCALE-RBAC-OWNER-APPROVAL - Expansao de RBAC (purchase_orders/reports) requer o dono N |
| `P-SCREEN-REFS-PATH` | 1586 | — | **a atribuir** | P-SCREEN-REFS-PATH — screen-refs/ na raiz × docs/claude-code-handoff/screen-refs/ (2026- |
| `P-ERP-MOBILE-DC-HTML` | 1593 | — | **a atribuir** | P-ERP-MOBILE-DC-HTML — protótipo `ERP Mobile.dc.html` ausente (2026-07-28) |
| `P-CLAUDE-COMPANIONS-DRAFTS` | 1600 | — | **a atribuir** | P-CLAUDE-COMPANIONS-DRAFTS — arquivos companheiros criados como drafts fundados (2026-07 |
| `P-KPI-PR18A-MVP-VENDAVEL` | 1627 | — | **a atribuir** | P-KPI-PR18A-MVP-VENDAVEL — latest 88% × history 92% (2026-07-29) |
| `P-RBAC-CHECKLIST-DRIFT` | 1640 | — | sim | P-RBAC-CHECKLIST-DRIFT (2026-08-01) — reconciliação residual da matriz de checklist (fol |
| `P-IMPOUND-CHK-VISIBILITY` | 1653 | — | sim | P-IMPOUND-CHK-VISIBILITY (2026-08-01) — consequência de RBAC no endpoint de custódia (co |
| `P-CHK-DOSSIE-VERSAO-NA-UI` | 2152 | — | sim | P-CHK-DOSSIE-VERSAO-NA-UI (2026-08-10 — junta do CHK P1 PR-03, 2ª rodada) |
| `P-CHK-AUTOLINK-FASE-REAL` | 2229 | — | **a atribuir** | P-CHK-AUTOLINK-FASE-REAL (2026-08-11 — junta `J-CHK-P1-PR04B-autolink`, nascida da decis |
| `P-IMPOUND-LINK-SEM-UNLINK` | 2246 | — | **a atribuir** | P-IMPOUND-LINK-SEM-UNLINK (2026-08-11 — junta `J-CHK-P1-PR04B-autolink`, fato comum aos  |
| `P-WORKTREE-INTEROP-ORFAO` | 2285 | — | **a atribuir** | P-WORKTREE-INTEROP-ORFAO — registro original (achado do `porteiro-pos-merge` no gate do  |
| `P-O6R-BACKLOG` | 2304 | — | **a atribuir** | P-O6R-BACKLOG (2026-08-14) — os 29 achados da auditoria Ω6R entram no controle operacion |
| `P-O6R-B02` | 2484 | BAIXA | **a atribuir** | P-O6R-B02 (2026-08-14) — `fix/financial-uow` — Ω6R-DIN-001..004, DIN-008 (5 P0) + QUA-00 |
| `P-O6R-B03` | 2560 | — | **a atribuir** | P-O6R-B03 (2026-08-14) — `fix/expense-sync-atomic` — Ω6R-DIN-009 (P0) + QUA-001 (P1) — * |
| `P-O6R-B04` | 2593 | BAIXA | **a atribuir** | P-O6R-B04 (2026-08-14) — `fix/inventory-consistency` — Ω6R-DAT-002, DAT-003 (2 P0) + QUA |
| `P-O6R-B12` | 2653 | — | sim | P-O6R-B12 (2026-08-18) — `fix/jurisdiction-profile-versioning` — Ω6R-DAT-004 (1 P1) — ** |
| `P-O6R-B06` | 2723 | — | **a atribuir** | P-O6R-B06 (2026-08-14) — `fix/billing-durability` — Ω6R-DIN-005 + Ω6R-DIN-007 (2 P0) — * |
| `P-O6R-B07` | 2766 | — | **a atribuir** | P-O6R-B07 (2026-08-14) — `fix/authorization-and-uploads` — Ω6R-SEC-002 (P0) + SEC-003, S |
| `P-O6R-B08` | 2815 | — | **a atribuir** | P-O6R-B08 (2026-08-14) — `fix/durable-jobs-realtime` — Ω6R-ARQ-001..003 + PERF-001 (4 P1 |
| `P-O6R-B09` | 2861 | — | **a atribuir** | P-O6R-B09 (2026-08-14) — `fix/dispatch-atomic-timeline` — Ω6R-ARQ-004 (P1) — **BLOQUEIA  |
| `P-O6R-B10` | 2882 | — | **a atribuir** | P-O6R-B10 (2026-08-14) — `fix/client-load-shedding` — Ω6R-PERF-002, PERF-003 (2 P1) — ** |
| `P-O6R-B11` | 2914 | — | **a atribuir** | P-O6R-B11 (2026-08-14) — `fix/mobile-work-order-contracts` — Ω6R-QUA-004, QUA-005 (2 P1) |
| `P-TESTS-FORA-DO-TYPECHECK` | 2961 | — | **a atribuir** | P-TESTS-FORA-DO-TYPECHECK (2026-08-14 — ciclo 3 da revisão do CHK P1 PR-04c-A) |
| `P-CHK-DEFERRED-SEM-LEITURA` | 2979 | BAIXA | **a atribuir** | P-CHK-DEFERRED-SEM-LEITURA (2026-08-14 — ciclo 4 da revisão do CHK P1 PR-04c-A) |
| `P-O6R-B05-WORKER-EXTERNO-DIFERIDO` | 3087 | — | sim | P-O6R-B05-WORKER-EXTERNO-DIFERIDO (2026-08-15 — bloco B-O6R-05, decisão C4) |
| `P-O6R-B05-HEARTBEAT-NAO-DETECTA-HANDLER-TRAVADO` | 3111 | — | **a atribuir** | P-O6R-B05-HEARTBEAT-NAO-DETECTA-HANDLER-TRAVADO (2026-08-15 — bloco B-O6R-05) |
| `P-O6R-B05-README-ATIVACAO` | 3119 | — | sim | P-O6R-B05-README-ATIVACAO (2026-08-15 — bloco B-O6R-05) |
| `P-O6R-B05-DATABASE-URL-SEM-FORMA-NEM-HOST` | 3213 | — | sim | P-O6R-B05-DATABASE-URL-SEM-FORMA-NEM-HOST (2026-08-15 — junta do PR #353, ressalva do `a |
| `P-O6R-B01-ROLE-LITERAIS` | 3249 | — | **a atribuir** | P-O6R-B01-ROLE-LITERAIS (2026-08-18 — ciclo 2 do B-O6R-01, plano §9) |
| `P-O6R-B01-ROUTE-ERROR-LEAK` | 3267 | — | **a atribuir** | P-O6R-B01-ROUTE-ERROR-LEAK (2026-08-18 — ciclo 2 do B-O6R-01, plano §9; achado B-7 do R- |
| `P-O6R-ARNES-ISOLAMENTO` | 3278 | — | sim | P-O6R-ARNES-ISOLAMENTO (2026-08-18) — o arranjo do lote de testes contra Postgres, **ant |
| `P-O6R-B01-ROUTE-ERROR-LEAK` | 3392 | — | sim | P-O6R-B01-ROUTE-ERROR-LEAK — **EMENDA de escopo (2026-08-19)** |
| `P-O6R-ARNES-ISOLAMENTO` | 3402 | — | sim | P-O6R-ARNES-ISOLAMENTO — **EMENDAS medidas pela junta do ciclo 3** |
| `P-O6R-ARNES-ISOLAMENTO` | 3424 | — | sim | P-O6R-ARNES-ISOLAMENTO — **EMENDAS do bloco B-O6R-ARNES (2026-08-28)** — o bloco próprio |
| `P-ARNES-VAZAMENTO-LINEAR-IDENTIDADES` | 3488 | — | sim | P-ARNES-VAZAMENTO-LINEAR-IDENTIDADES — **ATRIBUÍDO POR EXECUÇÃO** (2026-08-28, B-O6R-ARN |
| `P-ARNES-CANONICA1-VERMELHO-AMBIENTAL` | 3517 | — | sim | P-ARNES-CANONICA1-VERMELHO-AMBIENTAL (2026-08-28 — B-O6R-ARNES) — pré-existente, NOMEADO |
| `P-ARNES-DIVERGENCIA-KPI-APP-JS-FORA-DA-` | 3574 | — | sim | P-ARNES-DIVERGENCIA-KPI-APP-JS-FORA-DA-§5 (2026-08-28) — divergência do plano, registrad |
| `P-ARNES-AUTO-DEFEITOS-DO-PROPRIO-BLOCO` | 3589 | — | sim | P-ARNES-AUTO-DEFEITOS-DO-PROPRIO-BLOCO (2026-08-28) — DOIS achados por execução CONTRA a |
| `P-O6R-B02` | 3630 | — | sim | P-O6R-B02 — CICLO 4 REPROVADO 4×1 (2026-08-28) — a classe que reprova é de ARNÊS, não de |
| `P-O6R-B02-DIVERGENCIA-D27-D21` | 3670 | BAIXA | sim | P-O6R-B02-DIVERGENCIA-D27-D21 (2026-08-28 — cadeira de validação, ajuste A3) — BAIXA (re |
| `P-O6R-B02-REGISTRO-STATUS-LOG` | 3747 | BAIXA | sim | P-O6R-B02-REGISTRO-STATUS-LOG (2026-08-28 — validação A5) — BAIXA |
| `P-O6R-B02-CENSO-CASO-PERMANENTE` | 3755 | BAIXA | sim | P-O6R-B02-CENSO-CASO-PERMANENTE (2026-08-28 — validação A6) — BAIXA |
| `P-O6R-ARNES-ISOLAMENTO` | 3843 | — | sim | P-O6R-ARNES-ISOLAMENTO — EMENDAS medidas pela junta do ciclo 4 (2026-08-28, cadeira do a |
| `P-ARNES-CONEXAO-SEM-ASSEVERACAO-DE-IDENTIDADE` | 3878 | BAIXA | sim | P-ARNES-CONEXAO-SEM-ASSEVERACAO-DE-IDENTIDADE (2026-08-28) — BAIXA · **Dono:** bloco de  |
| `P-REG-DIVERGENCIA-SEM-PLANEJADOR-MESTRE` | 3960 | — | sim | P-REG-DIVERGENCIA-SEM-PLANEJADOR-MESTRE (2026-08-28) — divergência de processo, registra |
| `P-SAN2-2-PORTA-55432-RESERVADA` | 4289 | BAIXA | sim | P-SAN2-2-PORTA-55432-RESERVADA (2026-08-30) — armadilha de terreno, não defeito de produ |

## ABERTAS · balde C — DIFERIDO-LEVE (lista nominal, vetavel) — 77

| ID | linha | severidade | dono | titulo |
|---|--:|---|---|---|
| `P-004` | 53 | — | **a atribuir** | P-004 - Codigo morto e sidebar dupla no frontend (2026-07-07) |
| `P-005` | 64 | — | **a atribuir** | P-005 - ui-ux-pro-max search.py ausente (2026-07-07) |
| `P-008` | 87 | — | **a atribuir** | P-008 - Fallback mock-first do modulo work-orders permanece fabricado (2026-07-07) |
| `P-009` | 100 | — | **a atribuir** | P-009 - Contraste de texto muted (#94A3B8) abaixo de 4.5:1 no DS (2026-07-07) |
| `P-010` | 111 | — | **a atribuir** | P-010 - Codigo morto do adapter de dashboard (pre-C3) (2026-07-07) |
| `P-012` | 135 | BAIXA | **a atribuir** | P-012 - F1: tile "km/L medio da frota" e agregado nao-clicavel (2026-07-08) |
| `P-013` | 150 | — | **a atribuir** | P-013 - F2: guard de disponibilidade so na criacao de OS, nao no assign (2026-07-08) |
| `P-014` | 163 | — | **a atribuir** | P-014 - F3: cancelamento de multa gateado so por papel (sem permissao dedicada) (2026-07 |
| `P-015` | 175 | BAIXA | **a atribuir** | P-015 - F3: `driver_id` parser afrouxado (string) x coluna UUID (2026-07-08) |
| `P-016` | 188 | — | **a atribuir** | P-016 - F4 (R4.3): indicador "viatura sem apolice vigente" na tela Viaturas + Mapa adiad |
| `P-017` | 201 | — | **a atribuir** | P-017 - F4: barra de vigencia de apolice cancelada usa tom neutro/verde (2026-07-08) |
| `P-019` | 224 | — | **a atribuir** | P-019 - Ocorrencias residuais de persona demo "Marina Costa" fora do mapa (2026-07-08) |
| `P-023` | 269 | — | **a atribuir** | P-023 - F9: "ultimo acesso" do usuario nao tem fonte de dado (2026-07-09) |
| `P-028` | 301 | — | **a atribuir** | P-028 - Divida sistemica de acentuacao em strings de UI antigas (2026-07-09) |
| `P-026` | 312 | — | **a atribuir** | P-026 - F11: front `UserRole` nao cobre os 9 papeis canonicos (menu visual aproxima) (20 |
| `P-027` | 324 | — | **a atribuir** | P-027 - F11: divergencias matriz x catalog + perms `purchase_orders:read`/`reports:read` |
| `P-030` | 353 | BAIXA | **a atribuir** | P-030 - Ω2-a.2: residuais BAIXA do gate (comentario 422 enganoso; mapeamento P2003 espec |
| `P-032` | 377 | — | sim | P-032 (Ω2-e) — item de menu Configurações ainda gateado por tenant.manage |
| `P-Ω3a` | 389 | — | sim | P-Ω3a (Ω3-a ServiceQuote) — pendências declaradas |
| `P-Ω3b` | 405 | MÉDIA | sim | P-Ω3b (Ω3-b Despacho endurecido + Comentário/Timeline da OS) — validador-mestre |
| `P-037` | 440 | BAIXA | sim | P-037 (Ω3-c, BAIXA — validador) — assimetria memory×prisma em freezeChecklistSnapshot |
| `P-Ω3d` | 450 | — | sim | P-Ω3d (Ω3-d Anexos de OS) — coverage/cosmético (junta APROVOU; não-veto) |
| `P-SAN-PROD-BOOTSTRAP` | 536 | — | **a atribuir** | P-SAN-PROD-BOOTSTRAP - Bootstrap idempotente do 1o platform_admin real (Ω-INFRA-3, 2026- |
| `P-SAN-PROD-WEBIMG` | 547 | — | **a atribuir** | P-SAN-PROD-WEBIMG - Rollback do frontend sem imagem GHCR (Ω-INFRA-3, 2026-07-14) |
| `P-SAN-INFRA1-NITS` | 557 | — | **a atribuir** | P-SAN-INFRA1-NITS - Nits não-bloqueantes do Ω-INFRA-1 (J-SAN-4, 2026-07-13) |
| `P-Ω3F1-ENTITYTYPE` | 569 | — | **a atribuir** | P-Ω3F1-ENTITYTYPE - Enum técnico cru na linha "Entidade" da aprovação (J-OMEGA3F-1, 2026 |
| `P-Ω3F2B-ACENTOS` | 579 | — | **a atribuir** | P-Ω3F2B-ACENTOS - Varredura de acentuação no WorkOrderForm + validador (J-OMEGA3F-2B, 20 |
| `P-Ω3F4B-SHARE-TOKEN-UNIQUE` | 625 | BAIXA | **a atribuir** | P-Ω3F4B-SHARE-TOKEN-UNIQUE - share_token sem unicidade/índice; endpoint público adiado ( |
| `P-Ω3F4B-APPROVE-CRASH` | 637 | — | **a atribuir** | P-Ω3F4B-APPROVE-CRASH - Crash duro entre reserva e carimbo do approve (J-OMEGA3F-4B cicl |
| `P-Ω3F4C-ACTIVATION-PROMPT` | 650 | — | **a atribuir** | P-Ω3F4C-ACTIVATION-PROMPT - Aprovar dispara sem diálogo de modo de acionamento/origem-de |
| `P-Ω3F5-DOC-TYPE` | 662 | — | **a atribuir** | P-Ω3F5-DOC-TYPE - Categoria de documento no upload manual de anexo (Ω3F-5, 2026-07-15) |
| `P-Ω3F5A-TAG-TOCTOU` | 673 | — | **a atribuir** | P-Ω3F5A-TAG-TOCTOU - Comentário pode persistir com uma tag a menos sob delete concorrent |
| `P-Ω3F6B-MENUITEM-INLINE` | 771 | — | **a atribuir** | P-Ω3F6B-MENUITEM-INLINE - `.ui-menu-item` com background inline mata o hover (J-OMEGA3F- |
| `P-Ω3F6B-DS-NITS` | 785 | — | **a atribuir** | P-Ω3F6B-DS-NITS - Nits de DS/A11y apontados na J-OMEGA3F-6B (2026-07-17) |
| `P-Ω3F-9-SLA-FIELD` | 848 | — | sim | P-Ω3F-9-SLA-FIELD — Campo de prazo/SLA real na OS (aberta, Ω3F-9) |
| `P-Ω3F-9-DISPATCH-DTO` | 857 | — | sim | P-Ω3F-9-DISPATCH-DTO — Expor "envio ativo" no DTO da lista de OS (aberta, Ω3F-9) |
| `P-Ω4-2A-NITS` | 867 | BAIXA | sim | P-Ω4-2A-NITS — Observações da junta do Ω4-2a (2026-07-17) |
| `P-Ω4-ACCOUNT-ACTIVE` | 896 | BAIXA | sim | P-Ω4-ACCOUNT-ACTIVE — Título pode referenciar conta financeira INATIVA (BAIXA — decidir  |
| `P-Ω4-2A-COBERTURA` | 904 | BAIXA | sim | P-Ω4-2A-COBERTURA — Nits menores do Ω4-2a (BAIXA) |
| `P-Ω4-FINANCE-READ-ORFA` | 913 | BAIXA | sim | P-Ω4-FINANCE-READ-ORFA — /finance (dashboard) ainda gated pela órfã finance:read (BAIXA, |
| `P-Ω4-2B-A11Y` | 932 | BAIXA | sim | P-Ω4-2B-A11Y — Menu ⋮ e modais sem dismiss por Escape/clique-fora + focus-trap (BAIXA) |
| `P-Ω4-3-TEST-HERMETIC` | 951 | BAIXA | sim | P-Ω4-3-TEST-HERMETIC — createMemoryWorkOrderInvoicingService não é puramente memory (BAI |
| `P-Ω4-3-INVOICE-ATOMIC` | 960 | BAIXA | sim | P-Ω4-3-INVOICE-ATOMIC — Título↔carimbo não-atômico (BAIXA) |
| `P-Ω4-3-INVOICE-TOCTOU-DELETE` | 979 | BAIXA | sim | P-Ω4-3-INVOICE-TOCTOU-DELETE — DELETE de item durante o faturamento infla o título (BAIX |
| `P-Ω4-6-REOPEN-FOUR-EYES` | 1094 | BAIXA | sim | P-Ω4-6-REOPEN-FOUR-EYES — reopen sem segundo ator (risco residual conhecido, BAIXA) |
| `P-Ω4-5-CATEGORY-CASE` | 1160 | BAIXA | sim | P-Ω4-5-CATEGORY-CASE — Filtro ?category= é case-sensitive (BAIXA, pré-existente Ω4-4) |
| `P-Ω4-OVERDUE-TZ` | 1180 | BAIXA | sim | P-Ω4-OVERDUE-TZ — isTitleOverdue + parseDueDate no fuso de negócio (BAIXA, sintoma-irmão |
| `P-Ω4-6-FRONT-RESOLVE-NAME` | 1190 | BAIXA | sim | P-Ω4-6-FRONT-RESOLVE-NAME — /financial-periods expõe closedBy/reopenedBy UUID (BAIXA, pa |
| `P-Ω4-6-NITS` | 1198 | BAIXA | sim | P-Ω4-6-NITS — Nits da pós-análise do Ω4-6 (BAIXA) |
| `P-Ω4-7-ENTRY-OWNERSHIP` | 1243 | BAIXA | sim | P-Ω4-7-ENTRY-OWNERSHIP — Lançamento de cheque manipulável direto por /financial-entries  |
| `P-Ω4-8-SUMMARY-SCALE` | 1277 | BAIXA | sim | P-Ω4-8-SUMMARY-SCALE — /financial-summary faz full-scan das linhas (BAIXA) |
| `P-Ω4-8-DASHBOARD-FIDELITY` | 1286 | MÉDIA | sim | P-Ω4-8-DASHBOARD-FIDELITY — Reduções de composição do dashboard vs financeiro.png (BAIXA |
| `P-UI-REFRESH-LIVENESS` | 1368 | — | **a atribuir** | P-UI-REFRESH-LIVENESS — indicador sutil de auto-atualização nas telas (WS-UI-REFRESH, 20 |
| `P-UI-REFRESH-ERROR-COPY` | 1381 | — | **a atribuir** | P-UI-REFRESH-ERROR-COPY — cópia de erro referencia refresh manual que não existe mais (W |
| `P-RBAC-GATING-MOCKSHELLS` | 1393 | — | **a atribuir** | P-RBAC-GATING-MOCKSHELLS — gating RBAC das 3 telas-casca fica com a ligação a dados (WS- |
| `P-CHECKLIST-BUILDER-READONLY` | 1414 | — | **a atribuir** | P-CHECKLIST-BUILDER-READONLY — builder interativo no modo "Visualizar" para papel só-lei |
| `P-CHECKLIST-RUNS-STATUS-COPY` | 1425 | — | **a atribuir** | P-CHECKLIST-RUNS-STATUS-COPY — status técnico cru na cópia da tela de execuções (2026-07 |
| `P-FINANCE-HEADER-ACTIONS` | 1436 | BAIXA | **a atribuir** | P-FINANCE-HEADER-ACTIONS — page header do Financeiro sem ações à direita (§11 #4, pré-ex |
| `P-JMAPAS7-PERF-SCALE` | 1473 | — | **a atribuir** | P-JMAPAS7-PERF-SCALE — otimização de agregação (groupBy SQL vs full-scan) no technician- |
| `P-WOTS-SCALE` | 1484 | — | **a atribuir** | P-WOTS-SCALE — otimização de agregação (full-scan) no work-order-timeseries (2026-07-19) |
| `P-PLATFORM-HEALTH-OBSERVABILITY` | 1547 | — | **a atribuir** | P-PLATFORM-HEALTH-OBSERVABILITY - Saude da Plataforma = parada honesta ate observabilida |
| `P-PLATFORM-TENANTDETAIL-REAL` | 1561 | — | **a atribuir** | P-PLATFORM-TENANTDETAIL-REAL - Detalhe da Organizacao (plataforma) ainda mock (2026-07-2 |
| `P-PURCHASE-ORDERS-BACKEND-GATE` | 1572 | — | **a atribuir** | P-PURCHASE-ORDERS-BACKEND-GATE - Gate server-side de Pedidos/Relatórios pendente (2026-0 |
| `P-DS-TABS-ARIA` | 1713 | BAIXA | sim | P-DS-TABS-ARIA — Padrão WAI-ARIA de abas incompleto no `Tabs` do design system (BAIXA) |
| `P-PATIOS-HEX-TOKENS` | 1726 | BAIXA | sim | P-PATIOS-HEX-TOKENS — Hex inline no módulo pátios contra J-002 (BAIXA) |
| `P-CHK-RUN-DTO-NARROW` | 1738 | BAIXA | sim | P-CHK-RUN-DTO-NARROW — Estreitar o resumo de ChecklistRun removendo UUIDs não-usados (BA |
| `P-CHK-RUN-ASSIGNEE-SCOPE` | 1751 | BAIXA | sim | P-CHK-RUN-ASSIGNEE-SCOPE — `listChecklistRunsForProcess` não escopa por assignee (BAIXA, |
| `P-CHK-CATALOG-EXHAUSTIVE` | 1822 | BAIXA | sim | P-CHK-CATALOG-EXHAUSTIVE (2026-08-03) — Catálogo de componentes é array, não Record (tsc |
| `P-WO-LIST-TECH-NAME` | 1833 | BAIXA | sim | P-WO-LIST-TECH-NAME (2026-08-04) — DTO da lista de OS sem o nome do técnico atribuído (B |
| `P-USERS-LAST-ACCESS` | 1842 | BAIXA | sim | P-USERS-LAST-ACCESS (2026-08-04) — DTO de usuários sem "último acesso" (BAIXA, UX) |
| `P-AUD-ACTOR-NAME` | 1850 | BAIXA | sim | P-AUD-ACTOR-NAME (2026-08-04) — DTO de auditoria sem nome/perfil do ator (BAIXA, UX) |
| `P-CHK-SEED-DEMO-SUJO` | 2055 | BAIXA | **a atribuir** | P-CHK-SEED-DEMO-SUJO (2026-08-08) — dados de demonstração com nomes técnicos e lixo de t |
| `P-CHK-PREVIEW-DOCK-LIMIAR` | 2072 | BAIXA | **a atribuir** | P-CHK-PREVIEW-DOCK-LIMIAR (2026-08-08) — limiar de 1600px é constante, não medição do co |
| `P-RBAC-PROVISION-DESCRICOES` | 2138 | BAIXA | **a atribuir** | P-RBAC-PROVISION-DESCRICOES (2026-08-08) — descrição curada das permissões duplicada no  |
| `P-CHK-CREATE-RAZAO-NAO-NORMALIZADA` | 2997 | — | **a atribuir** | P-CHK-CREATE-RAZAO-NAO-NORMALIZADA (2026-08-14 — ciclo 4 da revisão do CHK P1 PR-04c-A) |
| `P-O6R-B05-REDIS-HOST-DNS-DIFERIDO` | 3193 | — | **a atribuir** | P-O6R-B05-REDIS-HOST-DNS-DIFERIDO (2026-08-15 — bloco B-O6R-05) |
| `P-REDIS-DEV-LIXO-DE-FILA` | 3237 | — | **a atribuir** | P-REDIS-DEV-LIXO-DE-FILA (2026-08-15 — achado lateral da junta do PR #353) |

## FECHADAS — 47

| ID | linha | severidade | dono | titulo |
|---|--:|---|---|---|
| `P-001` | 26 | — | **a atribuir** | P-001 - Validacao de stack |
| `P-002` | 32 | — | **a atribuir** | P-002 - Push remoto |
| `P-003` | 38 | — | **a atribuir** | P-003 - 2 testes de backend vermelhos na baseline `main` (2026-07-07) |
| `P-011` | 124 | — | **a atribuir** | P-011 - Badge de aprovacoes no sidebar e constante hardcoded (2026-07-07) |
| `P-021` | 249 | MÉDIA | **a atribuir** | P-021 - F7b: fechar contagem nao duplica ajustes em retry (RESOLVIDO no bloco) (2026-07- |
| `P-022` | 261 | BAIXA | **a atribuir** | P-022 - F7b: AuditLog na contagem do item (RESOLVIDO no bloco) (2026-07-09) |
| `P-024` | 281 | — | **a atribuir** | P-024 - F9/F11: vocabulario RBAC de usuarios (users:read x users.read) parcialmente reco |
| `P-025` | 291 | BAIXA | **a atribuir** | P-025 - NotificationList EmptyState com termo tecnico "tenant" + acentos (pre-existente) |
| `P-036` | 425 | ALTA | sim | P-036 (PRÉ-EXISTENTE — descoberto no smoke do Ω3-c) — create de checklist quebrado no li |
| `P-SAN-KRYOS` | 505 | — | **a atribuir** | P-SAN-KRYOS - Descontaminação Kryos (Ω-DOCS, 2026-07-13) — RESOLVIDA |
| `P-SAN-CORS` | 513 | — | **a atribuir** | P-SAN-CORS - CORS bare (`app.use(cors())` = `*`) e CORS_ORIGIN é config morta (Ω-INFRA-1 |
| `P-SAN-SEED-GUARD` | 527 | MÉDIA | **a atribuir** | P-SAN-SEED-GUARD - Seed demo sem guarda de runtime contra produção (J-SAN-5, 2026-07-14) |
| `P-Ω3F3A-MOEDA-AGREGADO` | 590 | MÉDIA | **a atribuir** | P-Ω3F3A-MOEDA-AGREGADO - Total agregado somava moedas heterogêneas (J-OMEGA3F-3A, 2026-0 |
| `P-Ω3F6-COMISSAO` | 686 | MÉDIA | **a atribuir** | P-Ω3F6-COMISSAO - `keep_unpaid` grava a decisão mas não suprime a comissão (Ω3F-6, 2026- |
| `P-Ω3F6B-MENU-GATE-SEM-TESTE` | 812 | — | **a atribuir** | P-Ω3F6B-MENU-GATE-SEM-TESTE - Gate do menu ⋮ não é coberto (provado por mutação) (pós-an |
| `P-Ω4-COMPETENCIA-TZ` | 881 | BAIXA | sim | P-Ω4-COMPETENCIA-TZ — RESOLVIDO (fix-omega4-competencia-tz, pré-Ω4-6) |
| `P-Ω4-4-REVERSE-MUTABLE` | 1042 | — | sim | P-Ω4-4-REVERSE-MUTABLE — reverse() não chama assertMutable — ✅ RESOLVIDO no Ω4-5 |
| `P-Ω4-4-CHOKEPOINT-CLOSING` | 1062 | — | sim | P-Ω4-4-CHOKEPOINT-CLOSING — chokepoint só bloqueia 'closed', não 'closing' — ✅ RESOLVIDO |
| `P-Ω4-5-DIVERGENCE` | 1103 | — | sim | P-Ω4-5-DIVERGENCE — Ω4-5 Conciliação (divergence_type + write-path de reconcile) — ✅ RES |
| `P-Ω4-COMPETENCIA-TZ` | 1168 | ALTA | sim | P-Ω4-COMPETENCIA-TZ — STATUS: RESOLVIDO (2026-07-18) |
| `P-GOLIVE-SECRET-ROTATE` | 1326 | CRÍTICA | sim | P-GOLIVE-SECRET-ROTATE — ~~Chave Google Maps: rotação humana obrigatória~~ — **FECHADA ( |
| `P-MAPA-GOOGLE-PADDING-RESIZE` | 1448 | — | **a atribuir** | P-MAPA-GOOGLE-PADDING-RESIZE — GoogleMapsCanvas não re-enquadra ao expandir rail (WS-MAP |
| `P-MAPA-TERM-OPERADORES` | 1460 | — | **a atribuir** | P-MAPA-TERM-OPERADORES — terminologia residual "operadores" no subtítulo/aria dos canvas |
| `P-NAV-MENU-PLATFORM` | 1607 | — | **a atribuir** | P-NAV-MENU-PLATFORM — menu `scope=platform` falhava sob JWT/Prisma (2026-07-28) |
| `P-CHK-TEMPLATE-PRISMA-V7` | 1675 | — | sim | P-CHK-TEMPLATE-PRISMA-V7 (2026-08-01) — createTemplate falha no runtime do Prisma v7 (bu |
| `P-DOSSIE-PAGE-TABS` | 1764 | BAIXA | sim | P-DOSSIE-PAGE-TABS — Página fallback /patios/processos/:id não reflete as abas Checklist |
| `P-CHK-RENDER-ENVELOPE` | 1786 | ALTA | sim | P-CHK-RENDER-ENVELOPE (2026-08-03) — O run screen mobile renderiza dos SEEDS, não do bac |
| `P-SUITE-ENV-PERSISTENCE` | 1859 | MÉDIA | **a atribuir** | P-SUITE-ENV-PERSISTENCE (2026-08-05) — suíte backend depende de `CORE_SAAS_PERSISTENCE=m |
| `P-CHK-COMPONENT-TYPE-CHECK` | 1919 | ALTA | **a atribuir** | P-CHK-COMPONENT-TYPE-CHECK (2026-08-08) — CHECK do banco recusava os 3 tipos do PR-01 —  |
| `P-CHK-PATCH-SEM-TYPE` | 1950 | ALTA | **a atribuir** | P-CHK-PATCH-SEM-TYPE (2026-08-06) — o PATCH de modelo de checklist não carrega `type` (M |
| `P-CHK-INATIVAR-COM-RUN-ATIVA` | 2015 | MÉDIA | **a atribuir** | P-CHK-INATIVAR-COM-RUN-ATIVA (2026-08-08) — inativar um modelo derruba quem já está no c |
| `P-RBAC-CATALOGO-NAO-CHEGA-AO-BANCO` | 2084 | ALTA | **a atribuir** | P-RBAC-CATALOGO-NAO-CHEGA-AO-BANCO (2026-08-08) — permissão declarada em código nasce MO |
| `P-RBAC-PROVISIONAMENTO-CONVERGENTE` | 2116 | ALTA | **a atribuir** | P-RBAC-PROVISIONAMENTO-CONVERGENTE (2026-08-08) — migração de dados de RBAC era no-op SI |
| `P-CHK-FLUTTER-KIND-COLAPSA` | 2169 | MÉDIA | sim | P-CHK-FLUTTER-KIND-COLAPSA (2026-08-10 — junta do CHK P1 PR-04, voto vencido do `coorden |
| `P-CHK-CUSTODIA-AUTOLINK-SEM-FILTRO` | 2201 | — | **a atribuir** | P-CHK-CUSTODIA-AUTOLINK-SEM-FILTRO (2026-08-10 — junta do CHK P1 PR-04, achado A3 do `cr |
| `P-WORKTREE-INTEROP-ORFAO` | 2260 | — | sim | P-WORKTREE-INTEROP-ORFAO (2026-08-12) — **RESOLVIDA no mesmo dia: DESCARTADA por decisão |
| `P-O6R-B01` | 2380 | — | **a atribuir** | P-O6R-B01 (2026-08-14) — `fix/identity-authority` — Ω6R-SEC-001 + Ω6R-TEN-001 (2 P0) — * |
| `P-O6R-B05` | 2683 | — | **a atribuir** | P-O6R-B05 (2026-08-14) — `fix/production-runtime-gates` — Ω6R-DAT-001 + Ω6R-DIN-006 (2 P |
| `P-NPM-TEST-VERDE-VAZIO-NO-WINDOWS` | 3012 | — | **a atribuir** | P-NPM-TEST-VERDE-VAZIO-NO-WINDOWS (2026-08-15 — porteiro pós-merge do #352) |
| `P-O6R-B05-STAGING-SCALE-ZERO` | 3100 | — | **a atribuir** | P-O6R-B05-STAGING-SCALE-ZERO (2026-08-15 — bloco B-O6R-05, questão Q5) |
| `P-SUITE-NAO-SUPORTA-ENV-PRISMA` | 3130 | — | **a atribuir** | P-SUITE-NAO-SUPORTA-ENV-PRISMA (2026-08-15 — bloco B-O6R-05, revelado ao consertar o `np |
| `P-O6R-B02-S0-ESPELHO-NO-HEAD` | 3763 | ALTA | sim | P-O6R-B02-S0-ESPELHO-NO-HEAD (2026-08-28 — validação A7) — **FECHADA POR NÃO-REPRODUÇÃO  |
| `P-ARNES-REGISTROS-DEFASADOS-NA-MAIN` | 3902 | BAIXA | sim | P-ARNES-REGISTROS-DEFASADOS-NA-MAIN (2026-08-28) — BAIXA · **FECHADA (2026-08-29, este P |
| `P-ARNES-BACKFILL-359` | 3927 | MÉDIA | **a atribuir** | P-ARNES-BACKFILL-359 (2026-08-28) — MÉDIA · **FECHADA (2026-08-28, este PR)** |
| `P-REG-S0-GUARD-FALSO-VERMELHO` | 3998 | MÉDIA | sim | P-REG-S0-GUARD-FALSO-VERMELHO (2026-08-29) — MÉDIA · **Dono:** próximo bloco que puder t |
| `P-GOV-MAIN-SEM-PROTECAO` | 4122 | ALTA | sim | P-GOV-MAIN-SEM-PROTECAO — a `main` não tem proteção nenhuma (2026-08-24) |
| `P-C7-BIS-TER-FORA-DA-MAIN` | 4212 | MÉDIA | sim | P-C7-BIS-TER-FORA-DA-MAIN (2026-08-30) — MÉDIA · **FECHADA no mesmo PR que a abriu** |
