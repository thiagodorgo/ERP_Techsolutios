# Junta J-ws-scale-comissao — WS-SCALE-COMISSAO (comissões consomem `financial_cancellation_decision`)

- **Data:** 2026-07-19
- **Entrega:** Onda 1 do `docs/scale-roadmap.md` — resolve PARCIAL `P-Ω3F6-COMISSAO`. As comissões passam a honrar
  `work_orders.financial_cancellation_decision` no chokepoint de ELEGIBILIDADE (criação do basis event de OS).
- **Tipo:** bloco normal (sem dependência nova, sem serviço externo tarifado, sem deploy de produção) → **maioria de ≥3**.
- **Branch:** `feat/commissions-ws-scale-comissao`.

## Processo (governança §C7)
1. **Ataque de desenho 3-lentes** (workflow, ANTES de codar) — lentes idempotência/corretude, acoplamento-RLS-tenant,
   contrato-semântica. Veredito unânime **AJUSTAR**; pegou 3 furos críticos que anulariam o objetivo:
   - **#1 fail-open por RLS fora de contexto** (gate no service → `work_orders` filtrado por FORCE RLS → read vazio → permite-tudo);
   - **#2 flip 201↔422 no replay** (idempotência-primeiro não realizável no service);
   - **#3 null lido como keep** (mapper devolve `undefined`, não `null`; viola J-Ω3F-6A).
   Fechados por **uma realocação**: gate DENTRO de `createBasisEvent` do repo (após existing-check, dentro da tx
   `withTenantRls`) + contrato **201 + status persistido** (`ineligible`/`pending_review`, já no enum) em vez de 422.
2. **Implementação** + bateria verde (tsc/lint/build/diff-check; 11 testes novos; 20/20 regressão; 0 regressão provada
   por baseline em `git stash`).
3. **Junta de avaliação** (3 agentes especializados, veredito estruturado).

## Composição e votos
| Agente | Lente | Veredito |
|---|---|---|
| validador-mestre | diff × regras do projeto (escopo/RLS/PT-BR/§2.8/§C3/DoD) | **APROVADO_CONDICIONADO** |
| agente-ci-doutor | história de teste / honestidade de KPI / regressão | **APROVADO_CONDICIONADO** |
| critico-adversarial | ataque ao resultado (furo vivo? entrega enganosa?) | **APROVADO_CONDICIONADO** |

**Resultado: 3/3 APROVADO_CONDICIONADO — 0 BLOQUEIA, 0 REPROVADO. Maioria clara → MERGE após sanar condições.**

Confirmações independentes da junta: os 3 furos do ataque estão fechados no código real; sem ciclo de módulo
(import type erasado); model/coluna do gate Prisma batem com `schema.prisma:1736-1788` e são checados por tsc; enum
`ineligible`/`pending_review` pré-existente (diff vazio vs main); as 77 falhas locais são **byte-idênticas** ao baseline
(pré-existentes, DB-não-migrado), delta = **+11 pass**, 0 comissão.

## Condições sanadas (antes do commit)
- **MEDIA (unânime) — nota de KPI com decomposição invertida** ("3 unid + 7 HTTP"): corrigida para **7 unidade + 4 HTTP**
  (após adicionar o teste cross-tenant); total revisto **1248→1259 (+11)** em `Kpis/{latest,history.json,history.md,index.html}`.
- **BAIXA (CI-doutor) — faltava teste cross-tenant negativo:** adicionado (`isolamento cross-tenant…`) → 11 testes.
- **MEDIA (CI/crítico) — caminho Prisma real não coberto por teste DB:** registrado `P-Ω3F6-COMISSAO-PRISMA-COV`
  (não-bloqueante; coberto por tsc+revisão; teste DB-gated fica para a lane de DB migrado).
- **MEDIA (crítico) — deixar explícito que só a INGESTÃO foi coberta:** `P-Ω3F6-COMISSAO` reforçada — supressão efetiva
  (engine + reversão pós-conclusão) **100% pendente** (`P-Ω3F6-COMISSAO-REVERSAL`); não ler como "quase pronta".
- **BAIXA (crítico) — premissa do contrato do produtor** (`sourceId`=UUID da OS, `sourceType` canônico): registrada.
- **BAIXA (validador) — untracked `.claude/skills/*`:** fora do escopo desta fatia; **excluídos do commit** (staging só dos 11 arquivos).

## Rastreabilidade
- ID: WS-SCALE-COMISSAO · PR: (preenchido após `gh pr create`) · merge_commit/approved_head: null na autoria (backfill pós-merge).
- Atas correlatas: ataque de desenho `wf_1c91965b-99c`; junta `wf_419239f9-291`.
- Pendências: `P-Ω3F6-COMISSAO` (RESOLVIDO PARCIAL) · `P-Ω3F6-COMISSAO-REVERSAL` (novo) · `P-Ω3F6-COMISSAO-PRISMA-COV` (novo).
