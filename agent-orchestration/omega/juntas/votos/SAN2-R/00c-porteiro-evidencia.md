# Evidência do porteiro-pos-merge — PR #361 (SAN2-R)

> Apensado item a item, ANTES da mensagem final, conforme P1 do protocolo que este merge instala.
> Porteiro: `porteiro-pos-merge` (Fable, por contrato D-PORTEIRO-POS-MERGE). Data: 2026-08-29.

## Item 0 — o merge existe e está íntegro

| Comando | Saída (resumo) | Parcial |
|---|---|---|
| `git fetch origin main && git log origin/main -3 --oneline` | `a0a1075` (SAN2-R #361) → `74430cc` (#360) → `f081b5d` (#359) | ok |
| `gh pr view 361 --json state,mergedAt,mergeCommit` | `MERGED`, `2026-08-29T22:07:20Z`, `mergeCommit a0a1075...` | ok |
| `git rev-parse HEAD` (worktree san2-r) | `a0a1075...` — worktree já na main mergeada, como o mandato disse | ok |

**Veredito parcial: VERIFICADO.** Merge na main remota, PR fechado como merged, hash bate com o mandato.

## Item 1 — promessa × diff real

| Comando | Saída (resumo) | Parcial |
|---|---|---|
| `git diff 74430cc..a0a1075 --stat -- src prisma tests scripts frontend mobile .github package-lock.json` | **VAZIO** — a promessa central (zero código de produto) cumprida | ok |
| `git diff 74430cc..a0a1075 --name-status` | 19 arquivos: `AGENTS.md`, `CLAUDE.md`, `Kpis/{app.js,kpis-history.json,kpis-latest.json}`, `agent-orchestration/controle/decisoes.md`, 13× `agent-orchestration/omega/**` (postmortem, briefing, ata, protocolo, 9 arquivos de votos) — **nada fora do escopo declarado** | ok |
| `grep D-JUNTA-RESILIENTE\|D-TETO-DOIS-CICLOS decisoes.md` | Ambas presentes: linha 1748 (`D-TETO-DOIS-CICLOS`) e 1794 (`D-JUNTA-RESILIENTE`) | ok |
| `grep -n "7\. \*\*" CLAUDE.md / AGENTS.md` (§C7) | §C7.7 (`D-JUNTA-RESILIENTE`) presente nos DOIS contratos (CLAUDE.md:356, AGENTS.md:384) | ok |
| `ls PROTOCOLO-JUNTA-RESILIENTE.md POSTMORTEM-QUEDAS-2026-08-29.md J-SAN2-R.md` | Os 3 existem na main mergeada | ok |
| Ata `J-SAN2-R.md` | **APROVADO 3×0, 0 voto perdido**, head julgado `48dc863`, §C7.4-bis respondido (a/b/c), papéis nomeados | ok |
| `git diff bf3edaa..a0a1075 --name-status` | VAZIO — árvore do squash idêntica ao head final da branch | ok |
| `git diff 48dc863..bf3edaa --name-status` | Delta pós-voto REAL: ata + votos das 3 cadeiras + errata FOR-1 em `00-quedas.md` + KPIs (nº do PR + `FROZEN` regenerado no `app.js`, 1 linha) | ok c/ nota |

**Nota (não-achado):** o mandato resumiu o delta pós-voto como "ata + nº do PR"; o delta medido inclui
também os votos das 3 cadeiras e a errata FOR-1 — tudo papelada de junta prevista pelo próprio protocolo
(voto-arquivo-primeiro) e pelo §C3.5 (`pr` preenchido após `gh pr create`; `FROZEN` injetado do JSON real).
Zero código. A errata está declarada na ata (FOR-1).

**Veredito parcial: VERIFICADO.** Toda promessa do PR existe no diff; nenhum arquivo tocado fora do
escopo declarado; nada de código de produto.

## Item 2 — números reexecutados, não copiados

| Comando | Saída (resumo) | Parcial |
|---|---|---|
| `node --test --import tsx tests/kpi-dashboard-charts.test.ts` | **16/16 pass, 0 fail** (5,3 s) — reexecutado por mim, bate com a cadeira 3 | ok |
| `node scripts/kpi-freeze.mjs --check` | `kpi-freeze: em dia (snapshot 2026-08-29)` | ok |
| history: entrada `pr: 360` | `merge_commit "74430cc"`, `approved_head "ee5ef03"` — **o backfill que este PR devia, FEITO** | ok |
| `gh pr view 360` + `git merge-base --is-ancestor` | head final do #360 = `c65b497`; `ee5ef03` é ancestral; a ata `J-B-O6R-REG.md` consigna **`ee5ef03` = head julgado pelas 3 cadeiras** (delta pós-voto = papelada). Backfill casa com a ata, não com o head cru do GitHub — e é ISSO que a ata do REG pede | ok |
| history/latest: entrada `pr: 361` | `merge_commit null`, `approved_head null`, `status published_per_pr` — correto na autoria (§C3.5); **dívida nomeada do próximo PR: backfill `merge_commit a0a1075` / `approved_head 48dc863`** | ok |
| node inline: métricas 360 vs 361 | `backend_tests 2595/2597`, `flutter_tests 864/864`, `blocks_completed 152` — carry-over IGUAL com nota "intocados" no texto (bloco de diff de produto vazio; §C3.3 respeitado) | ok |

**Veredito parcial: VERIFICADO.** Números reproduzem; backfill do #360 confere contra a ata e o git;
dívida de backfill do #361 corretamente aberta para o próximo PR.

---

# Sucessão — porteiro sucessor (queda 2, protocolo P3)

> O porteiro anterior caiu no início do item 3. Itens 0–2 acima estavam persistidos (P1). Regra P3:
> o sucessor **re-executou o roteiro registrado** dos itens 1–2 e **mediu o item 3 do zero** — a frase
> final do caído ("nenhuma BLOQUEIA é de trilha documental") era conclusão sem comando e foi descartada
> como insumo. Sucessor: `porteiro-pos-merge` (Fable, por contrato). Data: 2026-08-29.

## Re-execução dos itens 1–2 (comparada linha a linha com o registro acima)

| Comando re-executado | Resultado do sucessor | × registro do caído |
|---|---|---|
| `git diff 74430cc..a0a1075 --stat -- src prisma tests scripts frontend mobile .github package-lock.json` | VAZIO | CONFERE |
| `git diff 74430cc..a0a1075 --name-status` | 19 arquivos, os mesmos 19 (2 contratos, 3 KPIs, decisoes.md, 13 omega/**) | CONFERE |
| `grep D-TETO-DOIS-CICLOS / D-JUNTA-RESILIENTE decisoes.md` | linhas 1748 e 1794 | CONFERE |
| `grep D-JUNTA-RESILIENTE CLAUDE.md AGENTS.md` | CLAUDE.md:356 e AGENTS.md:384 (§C7.7 nos dois) | CONFERE |
| `ls` dos 3 artefatos | os 3 existem — **nota de caminho**: `PROTOCOLO-JUNTA-RESILIENTE.md` vive em `agent-orchestration/omega/juntas/` (não em `omega/` raiz, como o roteiro sugeria sem caminho completo); bate com o name-status do diff | CONFERE (nuance de caminho) |
| Ata `J-SAN2-R.md` | APROVADO 3×0, 0 voto perdido, head julgado `48dc863`, notas A1/FOR-1..3 registradas | CONFERE |
| `git diff bf3edaa..a0a1075 --name-status` | VAZIO | CONFERE |
| `git diff 48dc863..bf3edaa --name-status` | 11 arquivos: KPIs ×3, ata, votos/evidências das 3 cadeiras, errata em `00-quedas.md` — papelada de junta, zero código | CONFERE |
| `node --test --import tsx tests/kpi-dashboard-charts.test.ts` | **16 pass / 0 fail** (5,1 s) | CONFERE |
| `node scripts/kpi-freeze.mjs --check` | `kpi-freeze: em dia (snapshot 2026-08-29)` | CONFERE |
| history `pr:360` | `merge_commit "74430cc"`, `approved_head "ee5ef03"`; `gh pr view 360` → head `c65b497`, e `git merge-base --is-ancestor ee5ef03 c65b497` = SIM (ancestral; a ata do REG consigna `ee5ef03` como head julgado) | CONFERE |
| history `pr:361` + latest | history: `merge_commit null`, `approved_head null`; `status: "published_per_pr"` vive em `latest.release` (a entrada do history não tem campo `status` — nuance de esquema, não divergência). `latest.release.pr = 361` | CONFERE (nuance de esquema) |
| métricas 360 × 361 | `backend 2595/2597`, `flutter 864/864`, `blocks 152` — carry-over idêntico, diff de produto vazio (§C3.3) | CONFERE |

**Divergência real encontrada na re-execução: NENHUMA.** Duas nuances de registro (caminho do protocolo;
onde vive o `status`), ambas explicadas acima sem contradizer o veredito parcial do caído.

## Item 3 — o start seguinte, medido do zero

Próximo alvo: **resgate do SAN2-1, opção C do dono** — rebase da branch parada
`chore/san2-1-triagem-pendencias` sobre a main nova para (i) trocar a etiqueta verbatim das 79 entradas do
balde C por texto honesto, (ii) fechar `P-036` como duplicata da `P-CHK-TEMPLATE-PRISMA-V7`, (iii) tirar o
tripwire de tarifa do balde C.

### (a) Pendências BLOQUEIA × alvo documental

`grep -n "BLOQUEIA" agent-orchestration/controle/pendencias.md` → **12 cabeçalhos**. Status extraído
(`- status:`) de cada um:

| Pendência | Status | Trilha bloqueada |
|---|---|---|
| P-CHK-CUSTODIA-AUTOLINK-SEM-FILTRO | DECIDIDA (junta 2026-08-11) | PR-04b (produto) |
| P-O6R-B01 | **FECHADA** (2026-08-18) | auth/RBAC/plataforma |
| P-O6R-B02 | ABERTA (5 P0 + 1 P1) | financeiro |
| P-O6R-B03 | ABERTA (1 P0 + 1 P1) | despesas/RDV e mobile |
| P-O6R-B04 | ABERTA (2 P0 + 1 P1) | estoque |
| P-O6R-B05 | **FECHADA** (2026-08-15, #353) | deploy produtivo |
| P-O6R-B06 | ABERTA (2 P0) | CHECKLIST P1 / cloud billing |
| P-O6R-B07 | ABERTA (1 P0 + 2 P1) | OS/aprovações/RBAC, auth, anexos |
| P-O6R-B08 | ABERTA (4 P1) | jobs e tempo real |
| P-O6R-B09 | ABERTA (1 P1) | field-dispatch / Mapa |
| P-O6R-B10 | ABERTA (2 P1) | web transversal / owner-portal |
| P-O6R-B11 | ABERTA (2 P1) | mobile (PR-08) |

**Medição:** as 9 ABERTAS bloqueiam exclusivamente trilhas de **produto**. O resgate do SAN2-1 é trilha de
**registro** (`agent-orchestration/controle/pendencias.md` + papelada omega). **Nenhuma BLOQUEIA aberta
alcança o alvo** — agora por comando, não por afirmação.

### (b) A branch do resgate existe e tem o conteúdo esperado

- `git branch -a --list "*san2-1*"` → `chore/san2-1-triagem-pendencias` existe (local; worktree `san2-1`).
- `git log --oneline main..chore/san2-1-triagem-pendencias` → **13 commits**, head `f75193b`
  (`docs(parada): SAN2-1 REPROVADO no ciclo 2 — para e vira dossie`). A trilha completa está lá: triagem
  (`6886892`), junta ciclo 1 REPROVADO (`84a5fb7`), correções ciclo 2 (`75dbc4e`), D-TETO-DOIS-CICLOS
  (`7fee7f8`), parada + dossiê (`f75193b`).
- O `DOSSIE-SAN2-1-parada.md` (na branch) nomeia exatamente os 3 alvos do resgate: a etiqueta verbatim nas
  **79** do balde C (45 sem severidade), **A-C1 `P-036`** a fechar apontando a gêmea, e o **tripwire de
  bypass da tarifa** enterrado no balde C. Opção **C** = "A agora, B depois como bloco próprio".
- Alvos existem na main: `P-036` em `pendencias.md:342` (PRÉ-EXISTENTE, aberta) e
  `P-CHK-TEMPLATE-PRISMA-V7` em `pendencias.md:1334` (**RESOLVIDA 2026-08-02** — plausível como gêmea; o
  mérito é da junta do resgate, não meu).
- **Observação de rebase (não bloqueia):** `D-TETO-DOIS-CICLOS` está na main via #361 (`decisoes.md:1748`)
  **e** na branch (commit `7fee7f8`) → conflito provável em `decisoes.md` no rebase; previsto e trivial.

### (c) Terreno

- `git worktree list` → 5 worktrees: raiz (`demo/investidor`), `agent-af6ea…` (`feat/o6r-b02-financial-uow`),
  `gov-descuido` (`docs/governanca-porteiro-pre-merge-sol`), `san2-1` (branch do resgate, head `f75193b`),
  `san2-r` (**main `a0a1075` — mantido de propósito**: `curl localhost:5050` → HTTP **200**, o painel de
  KPI está servido dele; não é lixo).
- `df -h /c` → **24 GB livres** (91% usado) — acima do piso de ~10 GB; DEEP_CLEAN **não** exigido.
- Limpeza §C5 do #361: branch remota apagada (`git ls-remote --heads origin | grep san2` → vazio); sem
  rastreado apagado (`git status --porcelain | grep '^ D'` → vazio); sem branch local mergeada sobrando
  (`git branch --merged main` → vazio).
- Mutação viva no worktree `san2-r` (esperada): `00-quedas.md` modificado (registro da **queda 2** — o
  porteiro caído) + este arquivo de evidência untracked. É papelada do protocolo recém-instalado; entra no
  próximo commit de papelada, não é resíduo.
- **Imperfeição 1 (declarada, confirmada por comando):** numeração do §C7 fora de ordem nos DOIS contratos
  — sequência real `…3, 4, 7, 4-bis, 5, 6` (CLAUDE.md, idem AGENTS.md). Cosmética: as referências cruzadas
  são por ID de decisão e "§C7.7" é inequívoco (só há um item 7). Dívida documental leve — viaja como
  ressalva.
- **Imperfeição 2 (declarada, confirmada por comando):** worktree `san2-r` em `main` mantido de propósito
  (painel vivo em `localhost:5050`, HTTP 200). Intencional; única consequência é o painel congelar no
  estado da main de hoje até alguém atualizar o checkout — aceitável e conhecido.

**Veredito parcial do item 3: o start do resgate SAN2-1 está livre.** Nenhuma BLOQUEIA aberta alcança a
trilha documental; a branch existe com o conteúdo que a opção C pressupõe; terreno limpo, com duas
imperfeições cosméticas nomeadas e uma dívida obrigatória (§C3.5) para o próprio PR do resgate: **backfill
do #361 → `merge_commit a0a1075` / `approved_head 48dc863`**.
