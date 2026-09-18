## 9. Baseline N · meta M ≥ 2N · KPI no PR (K-01, A-DAT)

**N medido (v2 `[03]`, código inalterado no HEAD):** as 7 suítes de estoque em memória = **67/67** (0 fail, 0 skip); suítes `-db` que exercem o ledger de estoque = **0**. Valor oficial de
`backend_tests` = **2995/2997** (`Kpis/kpis-latest.json`, release `pr 385`; os 2 skips são os do orçamento `SKIP_BUDGET_DB = 2` `[03]`); `blocks_completed` = 163; history com 158 entradas.

**Meta M:** N sob Postgres é 0 → a meta vira piso absoluto: **≥ 50 casos `-db`/guard novos** (§6 prevê 53), **≥ 2 casos por via** das 9 do mapa (V1: A1,A2,A4,A5,A9,A13,A14 · V2: A3,A7b · V3:
A7,A7b,C7 · V4: A6,A10 · V5: A8,C8 · V6: B1,B2,B8,B10,B11,B13–B15 · V7: B3,B5,B16 · V8: B4,B5,B17 · **V9: B9,B6**), **67 → 67** em memória sem morte, e `backend_tests` **≥ 3048/3050** na forma
canônica 3 (`DATABASE_URL` presente: 2997 + 53; os 2 skips permanecem). Sem `DATABASE_URL` (forma 1): +9 pass (T-D) e +4 skips declarados (um por arquivo `-db`).

**KPI no PR (§C3):** `backend_tests` com N e forma do §10 passo 3 (nota com o passo 4 e a tripla execução); `blocks_completed` 163 → 164; `status: published_per_pr`; `pr` após `gh pr create`;
`merge_commit`/`approved_head` `null` na autoria. **`production_readiness` (K-01, forma exata do #385 `[06]`):** `p0_fechados` **13** (só na main conta), `fechados` **inalterado**,
`deploy_bloqueado: true`, **`aguardando_merge: [{ "id": "Ω6R-DAT-002" }, { "id": "Ω6R-DAT-003" }]`**, `nota_aguardando`: "Ω6R-DAT-002 e Ω6R-DAT-003 estao `fechado` no registro NA AUTORIA do
B-O6R-04a (§C3.5: numero de PR e hash so existem pos-merge). Eles NAO entram em `p0_fechados` nem na lista `fechados` — o painel conta so o que esta na `main`, e e por isso que
`p0_fechados` permanece 13. Texto anterior, preservado: <texto de hoje>"; **`findings.itens[].status = "fechado"`** para os dois; `roadmap.blocos[B-O6R-04].estado = "parcial"`.
**Medido `[06]`:** espelho com exatamente essas edições → `kpi-achados-paridade` **6/6**; sem `aguardando_merge` → `# fail 1` (a classe do K-01).
**A-DAT (emenda 3-q):** o DAT-003 fecha contra **vencedor único (B1) · nenhuma unidade aplicada duas vezes (B1, B2, B15, C2) · retomada que conclui (B2, B11, B14) · total correto da sessão
inteira (B14, B15)**; o campo `nota_criterio` (JSONL) e a linha "Nota de critério (§A2)" (REGISTRO) registram que o `teste` original ("rollback integral") pressupunha transação única,
substituída pela emenda 2-h — o texto original **não é reescrito**; o guard aceita o campo extra (`[06]`).
**Se este for o primeiro PR de execução a mergear depois do #386**, carrega as dívidas do #386 (emenda 1-f: hoje no `B-SAN3-04a`; o orquestrador as acrescenta — o dev não decide). A visão
gráfica hidrata dos JSON — nada cravado em `app.js` (`kpi-freeze.mjs --check` verde).
