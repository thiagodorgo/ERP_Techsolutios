# J-B-O6R-07c-b1 — junta do ciclo 1 (2026-10-17) · PR #440, o despacho grava a atribuição e as 23 vias respeitam o escopo do técnico (último P0, `Ω6R-SEC-002`)

- **Objeto:** `b198fe358b41186b2598ab258ccb735da8c04cbc` (head do PR com a trava `D-07CB1-TRAVA-ATE-B2`, os corpos das 3 cadeiras e a migração renomeada para `20260877000000_…`; CI 14/14 concluída e verde).
- **Régua:** bloco de PERMISSÃO, junta completa, unanimidade de 3 com veto, ciclo 1 (§C7 item 8): todo `bloqueia` dentro do bloco reprova.
- **Inspetor de terreno:** `inspetor-07cb1-opus` (Claude Opus 5.5), **LIBERADO COM RESSALVA** (`votos/B-O6R-07c-b1/insp-07cb1-parecer.md`), R1–R8 levadas ao briefing de cada cadeira. **R4, decisão do orquestrador:** sucessor de jurado caído tem identidade NOVA (CLAUDE.md §C7.7 P3 vale sobre "relança a MESMA identidade" dos corpos).
- **Mandatos:** forma A, pré-voo OK nos 4 (`votos/B-O6R-07c-b1/00-mandatos/`); bloco de refs gerado por `mandato-refs.sh` (ramo `chore/mandato-refs-e-preflight`).
- **Corpos:** do blob do objeto, md5 EOL-neutro conferido por cada cadeira. **R5:** o dev editou o corpo da C3 no objeto só para trocar o carimbo da migração (20260874 → 20260877), 4 linhas por espelho.

## VEREDITO: REPROVADO (1 × 2)

| cadeira | identidade que votou | executor e modelo | voto | bloqueia |
|---|---|---|---|---|
| C1 escopo e RBAC | `jurado-07cb1-c1-opus` (sucessor P3 de `jurado-07cb1-c1-argon`) | Claude Code, Claude Opus 5.5 | **REPROVADO** | 2 |
| C2 mobile e conflito | `jurado-07cb1-c2-opus` (sucessor P3 do ocupante Gemini 3.1 Pro) | Claude Code, Claude Opus 5.5 | **APROVADO** | — |
| C3 despacho, censo e persistência | `jurado-07cb1-c3-opus` | Claude Code, Claude Opus 5.5 | **REPROVADO** | 1 |

**Os bloqueios (todos `dentro-do-bloco`, classe grave: quebra de permissão):**
- **C1-A1 — a trava é contornável.** Com o "No local" no DESPACHO (`arrived`/`in_service`) e a OS ainda antes de `on_site`, os 4 papéis que alocam (manager, field_dispatcher, tenant_admin, platform_admin) trocam o técnico da OS por 5 caminhos do próprio bloco: reatribuir duas vezes o mesmo despacho, criar despacho novo, ativar rascunho, cancelar e falhar o despacho (`c1-voto.json`).
- **C1-A2 — a atribuição pela OS passa por fora da trava:** com o despacho em `arrived` e a OS em `assigned`, `POST /work-orders/:id/assign` e o lote `work_order.assign` trocam o técnico sem a recusa.
- **C3-A1 — a compensação do despacho não desfaz a atribuição da OS** quando a falha vem depois da transação OS+linha (no INSERT do evento `work_order_assigned`): criar deixa a OS atribuída sem despacho; reatribuir deixa o despacho com o técnico antigo e a OS com o novo; ativar deixa o rascunho em `draft` e a OS atribuída. Confirmado no Postgres por gatilho, com controle (`c3-voto.json`). Origem: `assignFromDispatch` nasceu no bloco (`67e5cb1c`).

**Ajustes (não graves, dentro do bloco):** C1-A3, o Operador passa a mudar o técnico da OS ao ativar rascunho e ao falhar despacho (a emenda M4 diz "o Operador NÃO aloca"); C3-A2, o instantâneo do censo commitado diverge do que o gerador do objeto produz para as 3 vias de evidência por lote, e nenhum T acusa; C2, K2 da vistoria já aplicada volta como conflito em vez de `already_applied` depois de reinício e troca.

**Notas e pré-existentes (não reprovam; viram pendência com dono):** C2: "usar a do servidor" marca a ação offline como sincronizada sem estado do servidor; evidência `field_*` aceita `work_order_id` alheio e o ecoa; idempotência durável da vistoria não confere o ator; o app não emite `work_order.mileage` pela fila. C1: técnico sem `field_dispatch:update` no próprio despacho; 403 `evidence_tenant_mismatch` em vez de 404. C3: o `-db` chama `assignFromDispatch`/`restoreState` direto sem falha injetada; o corpo do PR cita a migração e a pergunta 1 antigas; `tests/o6r07c-census-guard.test.ts` fora da lista permitida e não declarado.

## Terreno, quedas e substituições (P6, `votos/B-O6R-07c-b1/00-quedas.md`)
- **C3** caiu uma vez (~04:20Z, o VS Code fechou) e foi RETOMADA pela mesma identidade com o contexto preservado (não é sucessão: nada se perdeu).
- **C1:** designada ao Codex e parada por ordem do dono antes de medir (05:09–05:10Z, nada gravado); depois ao Argon, que caiu às 07:55Z por login/cota do Antigravity (401 e "Individual quota reached") com 916 linhas de evidência e o voto "EM APURAÇÃO"; o sucessor Opus re-executou o roteiro com saída idêntica e mediu a cauda.
- **C2:** o Gemini 3.1 Pro caiu às 05:14Z porque a conta do dono atingiu o teto MENSAL de gasto da API (US$ 1,76 gastos), com 2 linhas de evidência; o sucessor Opus partiu do zero.
- **O orquestrador falhou em assumir a tempo** (o dono tinha mandado: "se alguém falhar vc assume o lugar e continua"): as quedas dos braços externos não acordam a sessão; as substituições só ocorreram às ~09:55Z. Custo: ~4–5 h.
- O daemon do Docker reiniciou 3 vezes na madrugada, derrubando a base viva (religada pelo orquestrador). Limite de 3 trabalhos com container respeitado.

## Separação de papéis (§C7.4-bis) e as três perguntas da reprovação
- achou: C1 e C3; planejou o ciclo 1: a emenda do 07c-b (API Claude, 15/10) e a crítica; desenvolveu: `dev-b-o6r-07c-b1-argon` (herdado) e `dev-b-o6r-07c-b1-opus` (sucessor).
- (a) a composição cobriu a competência: sim — escopo/RBAC na C1, contrato de sync na C2, persistência e compensação na C3.
- (b) quem achou NÃO conserta: o ciclo 2 nasce de auditoria e plano no modelo de TOPO (Fable) e de um dev que não é nenhuma das cadeiras.
- (c) dado podre no planejamento: a trava foi pedida pelo dono depois do plano (`D-07CB1-TRAVA-ATE-B2`, 17/10) e implementada só no caminho do `reassign` do serviço de despacho; o plano não tinha o critério "a trava vale para TODO caminho que muda o técnico da OS" nem a atomicidade evento × atribuição. Fica para a auditoria de topo responder.

**Próximo (`D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`):** o Fable audita a reprovação (achados reais ou artefatos?) e escreve o plano do ciclo 2. Ciclo 2 é o último em que achado não grave reprova (§C7 item 8(2)).
