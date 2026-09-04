# SAN2-2 — insumos do KPI (acumulado por fase; a Fase 4 escreve, não recalcula)

> Existe porque a Fase 4 (§3.4 do plano) tem de publicar **números de execução real** (§C3.3) e a ordem
> corrigida pelo crítico põe a **Fase 5 ANTES da Fase 4** — medir primeiro, publicar depois. Este arquivo
> é a memória entre elas. **Número sem comando executado aqui não vai para o painel.**

## Estado medido do KPI HOJE (2026-08-30, orquestrador)

```
history: 145 entradas · entrada pr=362 → merge_commit=null, approved_head=null   (DÍVIDA)
latest.release: ainda SAN2-1R (pr 362)                                            (a substituir)
node scripts/kpi-freeze.mjs --check → "em dia (snapshot 2026-08-29)"
painel http://localhost:5050 → HTTP 200 (servido do worktree san2-r)
```

## 1. Backfill §C3.5 do #362 — OBRIGATÓRIO neste PR

- `merge_commit`: **`87f6ae6`**
- `approved_head`: **`4cd0867`**

**Não é o `headRefOid`.** O GitHub registra `55aa8a3` como ponta mergeada; a diferença para o `4cd0867`
são **dois commits pós-voto de registro puro** (`3d85618` a ata da J-SAN2-1R, `55aa8a3` o nº do PR no KPI).
`approved_head` é o head que a **junta julgou**, consignado na ata — gravar `55aa8a3` seria declarar que a
junta aprovou dois commits que nunca viu. Apuração completa em `00c-porteiro-evidencia.md` §3f.

Vai na entrada `pr: 362` do `kpis-history.json` **e** no `release` do `kpis-latest.json`.

## 2. Números da Fase 1 (medidos, commit `db2d291`)

| Métrica | Valor | Comando |
|---|---|---|
| Casos novos em `tests/agents-mirror-guard.test.ts` | **12** (12 pass · 0 fail · 0 skip) | `node --test --import tsx tests/agents-mirror-guard.test.ts` |
| Drill A (checkout fresco) | script da `main` → **22 DIVERGE / exit 1**; consertado → **0/0/0 / exit 0** | worktree descartável, uma única variável trocada |
| Drill B (árvore real, 22 papéis) | **8 mutações, 8 vermelhas, 0 verdes** | verde-cego REFUTADO |
| Passo novo no CI | `Agents mirror guard` no job `backend`, l.69, sem `continue-on-error` | `git diff main...HEAD -- .github/workflows/ci.yml` |

## 3. Números da Fase 2 (medidos, `dev-fase2-log.md`)

4 suítes `-db` que estavam **fora** da lista `SUITES`, cada uma executada **3×** em banco descartável nas
condições do job `backend-postgres` — **0 falhas e 0 pulos nas três**:

| Suíte | Casos |
|---|---|
| `impound-custody-history-db` | 3 |
| `vehicle-identity-merge-db` | 5 |
| `work-order-checklists-freeze-links-db` | 6 |
| `work-order-checklists-sticky-db` | 8 |
| **Total que passa a ser protegido pelo CI** | **22** |

Lista `SUITES`: **23 → 27**. A suíte de corrida do financeiro **não entra** (não existe na `main`; vive só
em `feat/o6r-b02-financial-uow`) — comentário-reserva no `ci.yml`, dono reatribuído ao PR do B-O6R-02.

**Achado de terreno novo:** `P-SAN2-2-PORTA-55432-RESERVADA` — a porta 55432 cai em **faixa excluída do
Windows**; o par descartável subiu em **56432/56379**. Não estava documentado em lugar nenhum.

## 4. Fase 5 — o denominador (A MEDIR, não presumir)

Baseline oficial: **2595/2597**. O crítico mediu que o modo prescrito no plano (sem `DATABASE_URL`) é
**VERMELHO** por causa alheia ao bloco — `src/database/prisma.ts:12` derruba
`tests/core-saas-role-authority.test.ts` no load (2371 tests · fail 1 · skipped 58, idêntico em 2 execuções).
Isso é a pendência **pré-existente** `P-O6R-B02-RUNNER-SUMICO-SEM-SKIP` (`pendencias.md` l.3730) — escopo
`pre-existente` pelo `D-JUNTA-ESCOPO-E-CALIBRACAO`(a), **não reprova**, mas entra na ata com N, forma e
causa (e a causa medida hoje é **informação nova** frente ao que a entrada descreve).

**Forma correta da Fase 5 (canônica 3):** `DATABASE_URL` exportada (par descartável de pé desde a Fase 2),
`db:generate` **feito** (o orquestrador rodou hoje — o client nunca existira neste worktree),
`migrate deploy` feito, `CORE_SAAS_PERSISTENCE` **não** exportada, `RBAC_DB_PARITY` **ausente** (é o que
preserva os 2 pulos do orçamento do runner).

**Esperado honesto:** `2595 + 12 = 2607` de **2609**, `fail 0`, `skipped 2`. Divergência = causa nomeada.

> **Preencher aqui quando a Fase 5 rodar:** backend `___/___`, fail `__`, skip `__`, comando e N.

## 5. Trilhas NÃO tocadas (§C3.3 — carregam com nota, nunca copiadas em silêncio)

`frontend_smoke` **1126** e `flutter_tests` **864** seguem do último valor oficial: este PR não toca
`frontend/` nem `mobile/`. A nota do history tem de dizer isso explicitamente.

## 6. O painel é o artefato (§C3.0 — `D-KPI-INDEX-PAINEL`)

- `Kpis/index.html` **hidrata dos JSON**; atualizar os JSON já move o painel.
- Depois de editar os JSON: **`node scripts/kpi-freeze.mjs`** (reinjeta o `FROZEN` no `app.js` — esquecer
  derruba o guard) e então `node --test --import tsx tests/kpi-dashboard-charts.test.ts`.
- `blocks_completed`: **152** hoje. Sobe para 153 só quando o SAN2-2 mergear.
- `mvp_demo` / `mvp_vendavel`: **INTOCADOS** — este PR não move escopo de produto.
