# J-SAN-2 — Ata: PR Ω-GOV (KPI por PR + autonomia por juntas como norma permanente)

Mudança de **governança PERMANENTE** → junta **UNÂNIME de 5**. Branch `feat-omega-gov-kpi`. Um ciclo de
reprovação (protocolo v3) antes da unanimidade.

## Veredictos finais (5/5 APROVADO)
| Agente | Round 0 | Após ciclo 1 | Núcleo |
|---|---|---|---|
| estrategista | **APROVADO** | — | KPI-por-PR elimina o gargalo dos blocos …K sem perder rastreabilidade (history+CI real). |
| agente-ci-doutor | **APROVADO** | — | Reproduziu o gate: **766/766, 0 fail, 0 skip**; explicou 766 vs 761 (env load-order dos 6 guards de DB). 766 honesto vs 15/15 (que hoje já seriam 26). |
| planejador-mestre | REPROVADO | **APROVADO** | Bloqueava §C4 ("nenhum arquivo KPI" em feature) contradizia §C3 — corrigido. |
| critico-adversarial | REPROVADO | **APROVADO** | Achou o que o grep não pegou: §8.4/§8.7(rail autobloqueante)/§9(null-check) restatavam a política antiga — corrigidos. |
| validador-mestre | REPROVADO | **APROVADO** | `index.html` estático ainda mostrava 15/15 + "pos-avaliacao humana"; `kpis-latest.json` header contradizia a métrica — corrigidos. |

## O que o PR grava (norma permanente)
- **KPI-por-PR (D-KPI-PER-PR):** todo PR que altere código/teste/escopo atualiza `Kpis/*` (e mobile quando
  couber) no próprio PR, com contagem de execução real; a **junta do PR valida**; o humano audita pelo history.
  Blocos `…K`/`…F` viram resumo de marco opcional. Reescrito em `/CLAUDE.md` (§C1/§C2/§C3/§C4/DoD), `Kpis/README`,
  `mobile/.../Kpis/README`, `plano-mestre.md`. Handoff-package + logs = banner "revogada".
- **Autonomia por juntas (§C7 CLAUDE.md + plano-mestre, D-SAN-AUTONOMIA):** verde da junta = merge; protocolo de
  dificuldade (ciclos 1-2 = fábrica CRIA agentes antes de parar); **paradas irredutíveis encolhidas** para
  {migration destrutiva, exposição de segredo, ação irreversível em produção sem junta unânime}; junta-5 unânime
  para dependência/serviço externo/**chamada tarifada**; fronteira externa (credencial/pagamento/domínio) mantida.
- **KPI aplicado:** `backend_tests` **15/15 → 766/766** (suíte backend inteira que o Ω-GATE fez o CI rodar) em
  `kpis-latest.json` + `app.js` + `index.html` + history. `merge_commit`/`approved_head` = null na autoria + backfill.
- **Ω4 ×1,5** + fatiar Conciliação/Fechamento (nota em `lista-execucao.md`).

## Ciclo 1 de reprovação — achados corrigidos
CLAUDE.md §C4 (KPI deixa de ser escopo proibido de feature), §8.4, §8.7 (rail autobloqueante), §9 (null-check
reconciliado), §C3.3 (contagens do que o PR exerceu), §C3.5 (null-na-autoria + backfill), §C7 (serviço tarifado);
EXECUTION_MODEL.md banner no topo; `index.html`/`app.js`/`kpis-latest.json` reenquadrados para Ω-GOV.

## Watch-item (não bloqueia — critico)
O backfill de `merge_commit`/`approved_head` depende da reconciliação no bloco seguinte; se um bloco for o último
antes de uma pausa, o `null` pode persistir. Trade-off aceito e documentado (P-SAN-KPI-BACKFILL).

## Evidência
`node --check` dos 2 `app.js` OK; JSON válidos; `npm run check` verde; `git diff --check` limpo; grep confirma
**zero ocorrência normativa viva** da política antiga em `/CLAUDE.md` §8/§9/§10; suíte do gate 766/0 (ci-doutor).
Escopo: só docs/KPI/orquestração (nenhum `src/`/teste de produto). **APROVADO — merge do Ω-GOV.**
