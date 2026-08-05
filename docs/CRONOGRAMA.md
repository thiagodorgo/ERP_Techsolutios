# CRONOGRAMA — onde estamos, para onde vamos

> Documento vivo. Fonte dos números: `Kpis/kpis-latest.json` + `Kpis/kpis-history.json` (contagem de
> **execução real por PR**, §C3). O **painel** que materializa isto é `Kpis/index.html` — abra-o
> **servido por HTTP** (`npx serve Kpis` ou o dev server) para ver os gráficos hidratados; em `file://`
> a visão gráfica se esconde em vez de mentir (D-007).
> Atualizado em **2026-08-05** (último snapshot: `KPI-INDEX-PAINEL`).

---

## 1. Onde estamos — número redondo

| Métrica | Hoje | Nota |
|---|---:|---|
| Testes backend | **2.110 / 2.110** | 0 falhas, 6 skips DB-gated; inclui o guard novo do painel (nota de reconciliação −11 vs #330 no history) |
| Smoke frontend | **1.003 / 1.003** | |
| Testes Flutter | **839 / 839** | |
| Blocos concluídos | **136** | |
| MVP demo | **99%** | estimativa de escopo, sujeita a revisão |
| MVP vendável | **88%** | estimativa de escopo, sujeita a revisão |
| Snapshots de KPI no history | **123** | 15/06/2026 → 05/08/2026 |

**PRs mergeados:** #335 é o último; o PR do painel de KPI (este) está em fechamento.

---

## 2. O que já está de pé (rodadas concluídas)

| Rodada | Período | O que entregou |
|---|---|---|
| **Blocos B** (B-076→B-123R) | jun/2026 | Fundação: multi-tenant, RBAC, OS, despacho, app de campo, sync offline |
| **BLOCO-AUTO A→F** | 07/07 → 07/07 | 28 PRs de automação/fechamento de lacunas do MVP |
| **Ω v3 / Ω2 / Ω3F** | jul/2026 | Cadastros completos (tabela de valores, tarifas, filiais, fornecedores, profissionais, tags, POIs, parâmetros) + painel logístico |
| **Ω4 — Financeiro do tenant** | 18/07 | 8 agregados: contas, títulos AR/AP com chokepoint, faturamento anti-refaturamento, caixa, extrato, conciliação, fechamento com trava retroativa, cheque, dashboard real |
| **Saneamento / Infra** | 14/07 | Ω-GATE/GOV/DOCS/INFRA-1..4 — containerização, CD, secrets; **config INERTE até o hand-off humano** |
| **Onda 1 (Scale/UI/Mapa)** | 19/07 → 22/07 | Sidebar, comissões, auto-refresh, gráficos SVG, 8 telas de escala + RBAC, **mapa operacional redesenhado** (MapLibre, US$ 0) |
| **Ω4C — Controle & Frota** | 21/07 → 25/07 | 17 PRs: anexos, contas a pagar, extrato, motor de notificação, abastecimento, manutenção, multas, seguros, estoque em custódia, danos, remunerações, auditoria+sessões, telemetria (back+Flutter+web+mapa), Central de Notificações |
| **Ω5P — Pátios (SIGPRV)** | 25/07 → 30/07 | Módulo de pátios de recolhimento sob a Res. CONTRAN 1025/2026: pátio, jurisdição, tarifas, custódia com hash-chain + FSM, débitos, liberação, leilão, liquidação, painel gerencial, interop Sivec-ready — **mais os 2 PWAs públicos isolados** (`owner-portal`, para o dono do veículo consultar o dossiê e solicitar liberação; `authority-portal`, para a autoridade) com BFF próprio, `D-Ω5P-11` |
| **Ω-VID — Dossiê do veículo** | 31/07 → 02/08 | Identidade do veículo de terceiro como entidade de 1ª classe, merge/unmerge, dossiê em abas num modal grande, clique-na-vaga, deep-link, checklist do guincho, histórico de custódias, imprimir/salvar |
| **CHECKLIST P0** | 01/08 → 02/08 | Fecha o **data-loss** despacho→guincheiro (a run agora nasce no despacho e o app baixa/sincroniza) |
| **TELAS PADRONIZADAS** | 04/08 | 5 telas recriadas do design do dono (Dashboard, OS, Usuários, Auditoria, Pátios) + biblioteca de componentes `pat-*` + guard permanente de CSS |

---

## 3. Onde estamos AGORA — rodada em curso

### CHECKLIST P1 — builder real de checklist (`docs/juntas/J-CHECKLIST-P1.md`)

Decisões do dono já cravadas: a run **trava ao concluir/assinar** (`D-CHK-P1-RUN-LIFECYCLE`); aplicabilidade
por **serviço concreto + tipo de serviço**, **um ou vários checklists por OS** definidos pelo operador no envio,
**custódia dentro do escopo**, **vínculo fixado na criação da OS** (`D-CHK-P1-APPLICABILITY`).

| PR | Escopo | Situação |
|---|---|---|
| PR-01 | Tipos `single_choice`/`multi_choice`/`signature` no enum + catálogo + validator + builder web | ✅ **#330** |
| — | Fatia render-envelope: o app parou de cair nos SEEDS e renderiza o que a web authora + item de menu do builder | ✅ **#335** |
| **PR-02** | **Inspector tipado** no builder (editor de opções, config de foto min/max, assinatura) | ⏭️ **próximo** |
| PR-03 | **Imutabilidade pós-conclusão** — guard em `updateRun`/`completeRun` | invariante forte → junta crítico+dba |
| PR-04 | **Aplicabilidade** (regras + junção N:N `work_order_checklist` + ajuste no envio + custódia + `available` real) | maior fatia; migração aditiva |
| PR-05 | Tela de execuções realizadas (histórico do tenant) | |
| PR-06 | Impressão da execução (PDF) — reusa o padrão do dossiê com `@media print` **escopado** | |
| PR-07 | Config de imagens de referência (fundo do mapa de danos) | |
| PR-08 | Reconciliar os 2 modelos de checklist do Flutter | |

**Nota do dono em aberto:** a tela do builder "não ficou legal". O brief de doutorado está pronto em
`docs/design/brief-checklist-builder.md` e existe um protótipo **`Modelos de Checklist.dc.html`** no projeto do
Claude Design que **ainda não foi importado**. Recomendação: importar e recriar a tela **antes** do PR-02, para o
inspector nascer já no desenho certo em vez de ser refeito duas vezes.

---

## 4. Para onde vamos — fila priorizada

### Faixa 1 — fechar o checklist (rodada corrente)
1. Importar e implementar `Modelos de Checklist.dc.html` (tela do builder no desenho do dono).
2. CHECKLIST P1 PR-02 → PR-08 na ordem da tabela acima.

### Faixa 2 — fidelidade visual (§11)
3. Varrer as **35 telas** de `screen-refs/web/` contra o padrão `pat-*` recém-criado — 5 já estão; a auditoria
   anterior (`docs/frontend-fidelity-audit.md`) apontava 23/35 fiéis no critério antigo.
4. Três pendências BAIXA que travam 100% de fidelidade e são **backend**: `P-WO-LIST-TECH-NAME` (nome do técnico
   na lista de OS), `P-USERS-LAST-ACCESS` (último acesso), `P-AUD-ACTOR-NAME` (nome/perfil do ator na auditoria).
5. Passada de a11y `role="table"` nas 5 telas padronizadas (BAIXA herdada da junta).

### Faixa 3 — dívida registrada (`agent-orchestration/controle/pendencias.md`)
| Pendência | Severidade | Nota |
|---|---|---|
| `P-CHK-PRISMA-CLIENT-TYPING` | MÉDIA sistêmica | o repo de checklist descarta os tipos gerados do Prisma — foi o que deixou o bug v7 passar |
| `P-IMPOUND-CHK-VISIBILITY` / `P-CHK-RUN-ASSIGNEE-SCOPE` | MÉDIA | defere à **junta de custódia** |
| `P-PLATFORM-TENANTDETAIL-REAL` | MÉDIA | detalhe da organização (plataforma) ainda mock |
| `P-PURCHASE-ORDERS-BACKEND-GATE` | MÉDIA | gate server-side de Pedidos/Relatórios |
| `P-KPI-PR18A-MVP-VENDAVEL` | BAIXA | divergência 88% × 92% entre latest e history |
| `P-DS-TABS-ARIA`, `P-PATIOS-HEX-TOKENS`, `P-CHK-RUN-DTO-NARROW`, `P-CHK-CATALOG-EXHAUSTIVE` | BAIXA | polimento |

### Faixa 4 — bloqueada por decisão humana (não avanço sozinho)
| Item | Por quê |
|---|---|
| **Ativação cloud / go-live** | `docs/go-live-readiness.md` — junta deu `GO_WITH_GAPS`; ativar exige credencial, domínio e **provedor pago** (parada irredutível §C7). A config está pronta e **inerte**. |
| **Rotacionar a chave do Google Maps** | uma chave foi exposta e **redigida** por mim no PR #229; o dono precisa **rotacionar** no console. |
| `P-SCALE-RBAC-OWNER-APPROVAL` | expandir RBAC para `purchase_orders`/`reports` exige o dono **nomear** as permissões/papéis. |
| Emulador Android | o app instala sozinho quando a instância subir (watcher armado). |

---

## 5. Como acompanhar (o painel é o artefato principal)

`Kpis/index.html` deixou de ser um HTML congelado: ele **hidrata em runtime** dos JSON e agora traz a
**visão gráfica** (`D-KPI-INDEX-PAINEL`, §C3.0):

- **Cobertura de testes ao longo das entregas** — 3 séries (backend, smoke, Flutter) com o valor corrente na legenda.
- **Blocos entregues** — acumulado das fatias concluídas.
- **Entregas por rodada** — quantos snapshots cada rodada registrou.
- **Ritmo de entrega** — testes adicionados por PR: mede o esforço de **prova** de cada fatia, não só o de código.

Tudo em **SVG inline, zero dependência** (PD-004). O guard `tests/kpi-dashboard-charts.test.ts` executa o
`app.js` de verdade e falha se o painel defasar do último snapshot ou se algum gráfico sumir.

```bash
npx serve Kpis     # depois abra a porta indicada — em file:// os gráficos ficam escondidos de propósito
```
