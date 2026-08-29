# CRONOGRAMA — onde estamos, para onde vamos

> Documento vivo. Fonte dos números: `Kpis/kpis-latest.json` + `Kpis/kpis-history.json` (contagem de
> **execução real por PR**, §C3). O **painel** que materializa isto é `Kpis/index.html` — abra-o
> **servido por HTTP** (`npx serve Kpis` ou o dev server) para ver os gráficos hidratados; em `file://`
> a visão gráfica se esconde em vez de mentir (D-007).
> Atualizado em **2026-08-28** (último snapshot: `B-O6R-ARNES`, PR #359).

---

## 0. A informação que governa todas as outras

> ## ⛔ **REPROVADO PARA PRODUÇÃO — deploy bloqueado**
>
> Junta **J-6R**, **5×0**, em **2026-08-12**. Ata: `docs/revisoes/O6R/ATA_J6R.md`.
> Origem: **auditoria adversarial total** encomendada pelo próprio time (PR #347), não por incidente —
> 70/70 unidades varridas, **30 achados: 15 P0 + 15 P1**, cada um com módulo, evidência e bloco dono.
>
> | | Total | Fechados | **Abertos** |
> |---|---:|---:|---:|
> | **P0 (críticos)** | 15 | 4 | **11** |
> | **P1 (relevantes)** | 15 | 0 | **15** |
>
> Fechados até aqui: `Ω6R-SEC-001` + `Ω6R-TEN-001` (B-O6R-01, PR #357) · `Ω6R-DAT-001` + `Ω6R-DIN-006`
> (B-O6R-05, PR #353). `Ω6R-QUA-004` está **parcialmente** superado (PR #351), não fechado.
>
> **Nada reverte esse veredito senão fechar os achados.** A régua de escopo (`mvp_demo`/`mvp_vendavel`,
> abaixo) mede **o que foi construído**; prontidão para produção é a **outra** dimensão, e é esta.

Este bloco existe porque o cronograma anterior — de 05/08 — descrevia a trilha CHECKLIST P1 como "rodada
em curso" e **não mencionava a auditoria Ω6R nem a reprovação**. Quem o abrisse concluiria que o projeto
estava fechando vistorias, quando o deploy estava travado por 11 achados críticos.

---

## 1. Onde estamos — número redondo

| Métrica | Hoje | Nota |
|---|---:|---|
| Testes backend | **2.595 / 2.597** | 0 falhas, 2 pulos declarados; canônica 3 em **N=10 idênticas** (#359) |
| Smoke frontend | **1.126 / 1.126** | valor carregado desde #357 — trilha web não tocada pelos blocos de correção (§C3.3) |
| Testes Flutter | **864 / 864** | idem, trilha Flutter não tocada (§C3.3) |
| Blocos concluídos | **152** | |
| MVP demo | **99%** | estimativa de **escopo construído**, não de prontidão |
| MVP vendável | **88%** | idem — ver o bloco §0 |
| Snapshots de KPI no history | **142** | 15/06/2026 → 28/08/2026 |

**Último PR mergeado:** **#359** (`B-O6R-ARNES`), em 28/08. Antes dele: #358 (backfill), #357 (B-O6R-01),
PRs #356, #355, #354 e #353 (B-O6R-05).

> **Ritmo, dito com honestidade:** entre **19/08** (#358) e **28/08** (#359) passaram **9 dias sem
> snapshot mergeado**. Não foi ociosidade — foi o custo dos **quatro ciclos de reprovação** do
> `B-O6R-02` (atomicidade do financeiro) e do bloco de arnês que precisou nascer para destravá-lo.

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
| **Painel de KPI repaginado** | 17/08 | `Kpis/index.html` refeito do zero com visão gráfica SVG zero-dependência hidratada dos JSON (#356); e a `D-JUNTA-SEPARACAO-DE-PAPEIS` — quem acha um defeito não é quem o conserta |
| **Ω6R — auditoria adversarial total** | 12/08 → 14/08 | 70/70 unidades varridas, **30 achados**, junta J-6R **reprova para produção 5×0** (#347). Gera o plano de **12 blocos de correção** |

---

## 3. Onde estamos AGORA — rodada em curso: **Ω6R (correção)**

A rodada corrente **não é** o CHECKLIST P1. É a **Ω6R**: fechar os 26 achados que travam a produção.
Plano: `docs/revisoes/O6R/PLANO_O6R.md` · verdade dos achados: `docs/revisoes/O6R/achados.jsonl`
(com guard de paridade `tests/kpi-achados-paridade.test.ts`).

**Ordem vinculante** (emenda `J-CHK-04C`): `B-O6R-05 → 01 → 02 → 07 → 06`. Depois 03/04 (dep. 01),
08 (dep. 05), 09 (dep. 08), 10 (dep. 05), 11 (dep. 01), 12 (órfão).

| Bloco | O que fecha | Situação |
|---|---|---|
| **B-O6R-05** Portões de runtime | DAT-001, DIN-006 | ✅ **#353** (15/08) |
| **B-O6R-01** Identidade e autoridade | SEC-001, TEN-001 | ✅ **#357** (19/08) — 3 ciclos |
| **B-O6R-ARNES** Arnês de teste | — (pré-requisito de confiança) | ✅ **#359** (28/08) — junta 3×0 |
| **B-O6R-02** Atomicidade do financeiro | 5 P0 + QUA-003 | 🚧 **ciclo 5, o TETO** — ver abaixo |
| **B-O6R-07** Autorização e anexos | SEC-002, SEC-003, SEC-004 | ⏭️ frente **livre** (dep. 01 satisfeita) |
| **B-O6R-04** Consistência de estoque | DAT-002, DAT-003, QUA-002 | ⏭️ frente **livre** (dep. 01 satisfeita) |
| **B-O6R-06** Durabilidade do faturamento | DIN-005, DIN-007 | ⛔ dep. 02 + 05 |
| **B-O6R-03 · 08 · 09 · 10 · 11 · 12** | 1 P0 + 11 P1 | ⛔ não iniciados |

### O caso do `B-O6R-02` — por que ele é o gargalo

Quatro ciclos de reprovação. O dinheiro **já não fabrica** em camada nenhuma — o achado central (corrida
`delete × reverse`) foi confirmado fechado por **três cadeiras independentes**, com vermelho-controle. O que
reprovou o ciclo 4 foi a **forma do número publicado**: a suíte não sobrevivia a si mesma sob paralelismo.

Esse defeito **não era do financeiro** — era do arnês de teste, e o próprio plano do bloco **proibia**
consertá-lo. Foi o que motivou a `D-JUNTA-ESCOPO-E-CALIBRACAO` (28/08): o voto passou a declarar **escopo**,
achado `pre-existente` não reprova (vira pendência com dono), e o arnês virou o bloco próprio que rodou
primeiro. **Ciclo 5 é o teto do §C7.4**: se esta junta reprovar, é parada e dossiê ao dono — não há ciclo 6.

### CHECKLIST P1 — **BLOQUEADA**, não em curso (`docs/juntas/J-CHECKLIST-P1.md`)

> A deliberação da junta **veda features** nos módulos atingidos enquanto houver achado crítico aberto neles.
> A trilha só destrava quando **B-O6R-06 e B-O6R-07** mergearem. As fatias PR-01 e render-envelope
> (#330/#335) entraram **antes** da auditoria; o resto está parado por decisão, não por falta de plano.

Decisões do dono já cravadas: a run **trava ao concluir/assinar** (`D-CHK-P1-RUN-LIFECYCLE`); aplicabilidade
por **serviço concreto + tipo de serviço**, **um ou vários checklists por OS** definidos pelo operador no envio,
**custódia dentro do escopo**, **vínculo fixado na criação da OS** (`D-CHK-P1-APPLICABILITY`).

| PR | Escopo | Situação |
|---|---|---|
| PR-01 | Tipos `single_choice`/`multi_choice`/`signature` no enum + catálogo + validator + builder web | ✅ **#330** |
| — | Fatia render-envelope: o app parou de cair nos SEEDS e renderiza o que a web authora + item de menu do builder | ✅ **#335** |
| **PR-02** | **Inspector tipado** no builder (editor de opções, config de foto min/max, assinatura) | ⛔ **bloqueado** — era "próximo" no cronograma de 05/08; a vedação da junta é posterior |
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

### Faixa 1 — fechar a Ω6R (rodada corrente, é o que destrava tudo)
1. **`B-O6R-02` ciclo 5** — atomicidade do financeiro. **Teto do §C7.4.** Plano escrito e emendado
   (`omega/planos/B-O6R-02-ciclo5-plano.md`): com o arnês fora, resta a FK composta
   `(tenant_id, reversal_of)`, o caso RLS sob papel `NOBYPASSRLS` real, o texto do contrato e os registros.
   Junta de **3 unânimes** (toca dinheiro). Identidades novas obrigatórias — o pool anterior está queimado.
2. **`B-O6R-07`** (autorização e anexos) e **`B-O6R-04`** (consistência de estoque) — frentes **livres**,
   podem correr em paralelo ao 02.
3. **`B-O6R-06`** (durabilidade do faturamento) assim que 02 e 05 permitirem. **06 + 07 destravam o
   CHECKLIST P1.**
4. Depois: 03, 08, 09, 10, 11, 12.

### Faixa 1-bis — retomar o CHECKLIST P1 (só depois de 06 e 07)
5. Importar e implementar `Modelos de Checklist.dc.html` (a tela do builder no desenho do dono; nota do
   dono em aberto: "não ficou legal"). Brief em `docs/design/brief-checklist-builder.md`.
6. CHECKLIST P1 PR-02 → PR-08 (inspector tipado · imutabilidade pós-conclusão · aplicabilidade ·
   histórico · impressão · imagens de referência · reconciliar os 2 modelos do Flutter).

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
| **Ativação cloud / go-live** | `docs/go-live-readiness.md` — junta deu `GO_WITH_GAPS`; ativar exige credencial, domínio e **provedor pago** (parada irredutível §C7). A config está pronta e **inerte**. **Independente disso, o deploy está bloqueado pela J-6R** (§0) — go-live não é decidível antes de fechar os P0. |
| ~~Rotacionar a chave do Google Maps~~ | **DISPENSADO pelo dono em 2026-08-13.** O projeto não usa Google Maps: o mapa é **MapLibre + OpenFreeMap** (US$ 0) desde o #338. A chave exposta foi redigida no #229 e não tem uso ativo. Item mantido riscado para não renascer numa releitura. |
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
