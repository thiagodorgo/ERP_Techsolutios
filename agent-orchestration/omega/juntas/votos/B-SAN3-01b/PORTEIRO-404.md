porteiro-pos-merge | modelo (Codex, GPT-6 Astra) | mandato_md5 c7183d21dcad66afc9fb200e5e4aca78 | md5 do corpo ba73d1d6afafc5b5a49d163e1a09c7d0

Estado: EM APURAÇÃO. Instância nova, invocada como GPT-6 Astra pelo dono; Fable suspenso até reinício do limite semanal, conforme mandato.

Fatias: A (merge, promessa, números); B (KPI, junta, pendências); C (limpeza, próximos alvos). Sem correções ou commits pelo porteiro.

## 0. Identidade e insumos — 2026-10-03T16:32:46.640859+00:00

Comando / medido por: git show origin/main:CLAUDE.md; git show origin/main:.agents/agents/{porteiro-pos-merge.md,README.md}; git show 94dc3b4b:agent-orchestration/omega/juntas/votos/B-SAN3-01b/00-mandatos/porteiro-404.md; comparação EOL-neutra com arquivo do mandato

Saída resumida:
{"body_md5": "ba73d1d6afafc5b5a49d163e1a09c7d0", "mandato_md5": "c7183d21dcad66afc9fb200e5e4aca78", "local_mandato_md5": "c7183d21dcad66afc9fb200e5e4aca78", "origin_main": "b404815ce3d1f1b8e5121bd1526978f7222e7479"}

Veredito parcial: Corpo e mandato conferem com hashes fornecidos; leitura do contrato em conclusão.

## A1. Merge — 2026-10-03T16:33:07.347952+00:00

Comando / medido por: ["git", "log", "origin/main", "-3", "--oneline"]

Saída resumida:
b404815c docs(registro): as quatro ressalvas do porteiro do #403 (#404)
f03b883f docs(registro): parecer do porteiro do #402, backfill dele e as quatro pendencias da junta (#403)
3e40a256 fix(web): a web guarda por alcance e pelo estado da pagina (B-SAN3-01b) (#402)


Veredito parcial: ec=0; EM APURAÇÃO

## A1. Merge — 2026-10-03T16:33:09.013642+00:00

Comando / medido por: ["gh", "pr", "view", "404", "--json", "state,mergedAt,mergeCommit,headRefOid,headRefName,body,url"]

Saída resumida:
{"body":"Registro puro, como o porteiro do #403 pediu (LIBERADO COM RESSALVA): parecer do porteiro do #403 e o do #399 versionados byte a byte; backfill_note do B-SAN3-01b corrigida (a arvore do merge e a do head final do PR, nao a do head aprovado); donos atribuidos a P-SAN3-01B-MOCK-POR-CONVENCAO-DE-NOME (B-SAN3-06c) e P-SAN3-01B-PROVA-DO-GATE-EXTENSIONAL (B-SAN3-06a); kpis-history.md do #397 e do #402 sem 'na autoria'. A escolha da referencia do cabecalho da lista de OS e decisao do dono, levada a ele. Nenhum codigo, teste ou numero de KPI muda.","headRefName":"docs/registro-403","headRefOid":"cc7a2acd16854b19cc44315c5eb5fb6b29788d27","mergeCommit":{"oid":"b404815ce3d1f1b8e5121bd1526978f7222e7479"},"mergedAt":"2026-10-03T03:19:52Z","state":"MERGED","url":"https://github.com/thiagodorgo/ERP_Techsolutios/pull/404"}


Veredito parcial: ec=0; EM APURAÇÃO

## A1. Merge — 2026-10-03T16:33:09.752311+00:00

Comando / medido por: ["git", "ls-remote", "origin", "refs/heads/main"]

Saída resumida:
b404815ce3d1f1b8e5121bd1526978f7222e7479	refs/heads/main


Veredito parcial: ec=0; EM APURAÇÃO

## A1-A2. Integridade e diff — 2026-10-03T16:33:24.925662+00:00

Comando / medido por: ["git", "merge-base", "--is-ancestor", "b404815ce3d1f1b8e5121bd1526978f7222e7479", "origin/main"]

Saída resumida:


Veredito parcial: ec=0

## A1-A2. Integridade e diff — 2026-10-03T16:33:25.078646+00:00

Comando / medido por: ["git", "show", "--stat", "--oneline", "b404815c"]

Saída resumida:
b404815c docs(registro): as quatro ressalvas do porteiro do #403 (#404)
 Kpis/app.js                                        |  2 +-
 Kpis/kpis-history.json                             |  2 +-
 Kpis/kpis-history.md                               |  4 +-
 Kpis/kpis-latest.json                              |  2 +-
 agent-orchestration/codex/log-execucao.md          | 15 ++++
 agent-orchestration/controle/pendencias-indice.md  |  4 +-
 agent-orchestration/controle/pendencias.md         |  4 +-
 agent-orchestration/docs/status-geral.md           | 15 ++++
 .../omega/juntas/votos/B-GOV-PAUSA/PORTEIRO-399.md | 57 +++++++++++++
 .../votos/B-SAN3-01b/00-mandatos/porteiro-403.md   | 60 +++++++++++++
 .../omega/juntas/votos/B-SAN3-01b/PORTEIRO-403.md  | 99 ++++++++++++++++++++++
 11 files changed, 255 insertions(+), 9 deletions(-)


Veredito parcial: ec=0

## A1-A2. Integridade e diff — 2026-10-03T16:33:25.195812+00:00

Comando / medido por: ["git", "diff", "b404815c^", "b404815c", "--", "Kpis", "agent-orchestration/controle/pendencias.md"]

Saída resumida:
diff --git a/Kpis/app.js b/Kpis/app.js
index 1a6527e2..126c9415 100644
--- a/Kpis/app.js
+++ b/Kpis/app.js
@@ -1621,7 +1621,7 @@ function fetchJson(path) {
 /* Cópia congelada embutida (fallback de file://). O conteúdo é injetado por
    script de build a partir do kpis-latest.json REAL — nunca digitado à mão.
    Sem histórico embutido: gráfico só com a série real, via fetch. */
-var FROZEN = {"snapshot_date":"2026-10-02","version":"B-SAN3-01b","source":"Kpis/kpis-latest.json","scope":"root_project_kpis_reflecting_mobile_and_web","release":{"block":"B-SAN3-01b (frontend; bloco de guarda do gate SAN3, bloqueante por D-SAN3-01-MERGE-COM-BLOCO-DE-GUARDA; não move item do §4.1 do PLANO_SAN3.md — o item 4 já estava fechado pelo B-SAN3-01): a web não fabrica dado — a guarda passa a valer por alcance e pelo estado da página.","title":"A web não fabrica dado: a guarda vale por alcance e pelo estado da página","pr":402,"merge_commit":"3e40a256ce801a8e63230b4b764ba1d2803f4f23","approved_head":"cdf370dcb4c817e1c4292aed1204140951616971","status":"published_per_pr","summary":"B-SAN3-01b — transforma em garantia executável as duas propriedades que o B-SAN3-01 deixou verdadeiras só no código (decisão do dono `D-SAN3-01-MERGE-COM-BLOCO-DE-GUARDA`) e fecha quatro pendências: (i) `frontend/tests/work-orders-page-live.test.tsx` (novo, 13 casos) monta a `WorkOrdersPage` REAL com o hook REAL rodando efeitos sobre um DOM mínimo escrito no próprio teste (zero dependência), com os BYTES do backend na borda (`fetch`): 403 → `forbidden`, 500 → `error`, 200 vazio → `empty` embutido, 200×3 → linhas e KPIs, pendente → esqueletos, 403 em 2º plano → `forbidden` sem faixa; `[W1]`/`[W2]` por COMPORTAMENTO (falha em 2º plano mantém o dado com a faixa `stale`, lista e detalhe) — as mutações `N-PG-PAINEL`, `N-PG-KPI`, `N-W1TXT`, `N-W2TXT` ficam vermelhas sem tocar hook nenhum; (ii) o guard `[G1]` de `work-orders-honest-errors.test.tsx` passa a resolver re-export em profundidade ARBITRÁRIA (barrel de N níveis, re-export local, `default`, namespace, `import()`), varre o FECHO de import das raízes e o arquivo de fronteira `useServiceQuoteReferences.ts`, com denominadores e sítio sabido; `[G1b]` novo pega entidade fabricada inline (`id`/`code` constante em `catch`/`.catch(`/`??`/`||`); `[G2]` com 29 formas virtuais, `[G3]` em disco — `N-BARREL2`, `N-BARREL3`, `N-LITERAL`, `N-FORA-RAIZ` ficam vermelhas; (iii) os cabeçalhos de `dispatches.service.ts`, `repository.ts` e `useServiceQuoteReferences.ts` dizem o que o guard prova E o que não prova (só comentário); (iv) o botão \"Nova OS\" do cabeçalho só aparece com `work_orders:create` — a régua da rota `POST /work-orders` — provado papel a papel com os 13 papéis de `ROLE_PERMISSIONS` executado (vermelho-controle no head-base: 7 papéis viam o botão). Fecha `P-SAN3-01B-PAGINA-NAO-AMARRADA-AO-ESTADO`, `P-SAN3-01B-GUARD-ALCANCE-MENOR-QUE-AS-RAIZES`, `P-SAN3-01B-VIGIA-TEXTUAL-DA-FIACAO`, `P-SAN3-01-NOVA-OS-SEM-GATE-NO-BOTAO`; abre com dono `P-SAN3-01B-FIACAO-DO-CREATE-TEXTUAL` (B-SAN3-10), `P-SAN3-01B-PAGINA-FIACAO-DE-INTERACAO` (fila pós-gate), `P-SAN3-01B-GUARD-DE-ROTA-COM-ATALHO-DE-PLATAFORMA` (B-SAN3-06a). `frontend_smoke_tests` da EXECUÇÃO REAL: 1202 → 1214 (+13 arquivo vivo, +1 `[G1b]`, −2 `[W1]`/`[W2]` movidos), bloco 79/79, Node 22 e Node 20; demais trilhas CARREGADAS com nota (§C3.3); `mvp_*` intocados (§C3.4); `blocks_completed` 169 -> 170. Nenhuma rota, payload, tipo ou migração muda; `src/` e `prisma/` intocados.","backfill_note":"`pr` é `null` NA AUTORIA (o PR é aberto pelo orquestrador depois desta tarefa de nuvem) e é preenchido após `gh pr create`; `merge_commit`/`approved_head` são `null` NA AUTORIA por contrato (§C3.5) e recebem backfill pós-merge (`approved_head` = o objeto que a JUNTA julgou, lido da ata). Nenhum backfill devido por este PR: a entrada do #397 já tem `merge_commit 513937b0…` e `approved_head 67c2c280…`, pagos pelo registro #398 (`5bcdcc58`). Se outro PR mergear antes, `blocks_completed` se RECONTA no pré-merge a partir da `main` de então. As quatro métricas com nota de PR anterior (`backend_contract_tests_focused`, `flutter_modules`, `mobile_backend_contracts`, `mobile_core_saas_contracts`) seguem sob `P-KPI-NOTAS-CARREGADAS-REGRESSAO-392` (dono #393) — este PR não as toca. BACKFILL PAGO pelo registro do #402 (docs/registro-402): `pr 402`, `merge_commit 3e40a256…` (squash, árvore = a do head aprovado), `approved_head cdf370dc…` lido da ata `J-B-SAN3-01b.md`."},"metrics":{"flutter_tests":{"value":864,"total":864,"display":"864/864","note":"[B-SAN3-01b §C3.3 (2026-10-02): valor CARREGADO, SEM reexecução — este PR não toca `src/`, `tests/` da raiz nem `mobile/` (`git diff --name-only origin/main...HEAD -- src tests mobile prisma` → vazio; o diff do PR é `frontend/**` (página, 2 testes, 3 cabeçalhos, lista do smoke), `Kpis/**` e registro (`agent-orchestration/**`, `docs/revisoes/SAN3/`)). Último valor oficial: 864/864, publicado pelo `B-SAN3-00` (#392) e carregado pelos #394 e #397.]"},"frontend_smoke_tests":{"value":1214,"total":1214,"display":"1214/1214","note":"[B-SAN3-01b §C3.3 (2026-10-02): EXECUÇÃO REAL no head do PR — `npm --prefix frontend run test:smoke` → `# tests 1214 # pass 1214 # fail 0 # skipped 0`, em Node 22.22.0 E em Node 20.20.0 (paridade com a CI, `node-version: 20`). 1202 → 1214 = +13 (`tests/work-orders-page-live.test.tsx`, novo: página REAL + hook REAL sobre DOM mínimo) +1 (`[G1b]`, entidade fabricada inline) −2 (`[W1]`/`[W2]` saem de `work-orders-honest-errors.test.tsx` e viram comportamento no arquivo vivo). Bloco (os 2 arquivos): 79/79 (13 + 66). Vermelho-controle no head-base: 11/13 no arquivo vivo (`[GB1]`/`[GB2]` vermelhos, 7 papéis). Relatório: agent-orchestration/omega/juntas/votos/B-SAN3-01b/DEV-relatorio.md]"},"backend_tests":{"value":3052,"total":3054,"display":"3052/3054","note":"[B-SAN3-01b §C3.3 (2026-10-02): valor CARREGADO, SEM reexecução — este PR não toca `src/`, `tests/` da raiz nem `mobile/` (`git diff --name-only origin/main...HEAD -- src tests mobile prisma` → vazio; o diff do PR é `frontend/**` (página, 2 testes, 3 cabeçalhos, lista do smoke), `Kpis/**` e registro (`agent-orchestration/**`, `docs/revisoes/SAN3/`)). Último valor oficial: 3052/3054, publicado pelo `B-SAN3-00` (#392) e carregado pelos #394 e #397.]"},"backend_contract_tests_focused":{"value":34,"total":34,"display":"34/34","note":"[B-SAN3-04a §C3.3 (2026-09-18): valor CARREGADO — este PR não toca `mobile/` (`git diff --name-only origin/main -- mobile` vazio); sem reexecução desta trilha neste PR.] [B-O6R-06 §C3.3 (2026-09-11): valor CARREGADO — este PR nao toca `mobile/` nem `frontend/`: arvores identicas entre o head julgado 0f0a872a e o head do delta e26eb9e5 (mobile `3a2ac028`, frontend `24be761e`, medido pela cadeira C3 por `git rev-parse <ref>:<path>`); sem reexecucao desta trilha neste PR. O marcador anterior nomeava B-GOV-ELENCO/SAN2-4b, blocos anteriores.] Bateria focada do B-O6R-ARNES, execucao real, composicao declarada: 29 casos em tests/npm-test-runner-guard.test.ts (21 da base + 3 portados verbatim do guard de skip C5.3 + 5 do piso de denominador) + 5 em tests/db-catalog-write-guard.test.ts com DATABASE_URL presente (1 ratchet lexical + 4 casos -db novos: sonda de barreira sob o mecanismo unico, teardown resiliente com falha injetada, e as duas metades do sweep). Baseline da base era 22 (21 runner-guard + 1 ratchet); nenhum caso morreu; a meta M >= 31 do plano fica cumprida com 34. Sem DATABASE_URL os 4 casos -db nao rodam e o arquivo declara 1 pulo — declarado, nunca silencioso. [SAN2-2: valor CARREGADO — esta bateria focada e do B-O6R-ARNES e NAO foi reexecutada por este PR; a bateria focada do SAN2-2 sao os 12 casos de `tests/agents-mirror-guard.test.ts`, que ja entram contados em `backend_tests` (§C3.3).] [SAN2-3: valor CARREGADO — bateria focada do B-O6R-ARNES, nao reexecutada aqui (§C3.3); o PR nao toca `tests/` nem `scripts/`.] [SAN2-4a: valor CARREGADO — bateria focada do B-O6R-ARNES, nao reexecutada aqui (§C3.3); o PR nao toca `tests/` nem `scripts/`.] [SAN2-4b: valor CARREGADO — o PR nao toca esta trilha; sem reexecucao (§C3.3). Prova medida nas DUAS pontas (commitado e arvore de trabalho): `git diff --name-only 45c3b97...HEAD` e `git status --porcelain` sobre `mobile/` e `frontend/` saem VAZIOS. O diff de codigo deste bloco sao 5 arquivos: `src/modules/authority/authority-password.ts` e quatro em `tests/`.] \n[SAN2-5: valor CARREGADO — o bloco nao toca contratos nem `src/`; sem reexecucao (§C3.3). A nota acima descreve execucao de bloco anterior, NAO deste PR.] \n[SAN2-6: valor CARREGADO — o bloco nao toca contratos REST nem `src/`; sem reexecucao (§C3.3). A nota acima descreve execucao de bloco anterior, NAO deste PR.] \n[B-O6R-07a: valor CARREGADO — bateria focada do B-O6R-ARNES, NAO reexecutada aqui (§C3.3); este PR nao toca `scripts/` nem os dois arquivos que a compoem. A bateria focada DESTE bloco sao os 36 casos dos 7 arquivos `tests/o6r07a-*.test.ts`, que ja entram contados em `backend_tests`.] [B-O6R-02 ciclo 5: valor CARREGADO — a bateria focada do #359 mede arquivos que este PR nao alterou; sem reexecucao (§C3.3). O que este bloco reexecutou esta em `backend_tests`, com N e forma.] [B-O6R-07b: valor CARREGADO — o ultimo valor oficial, NAO reexecutado por este PR (§C3.3). O bloco e backend-only: fecha o Omega6R-SEC-004 em src/modules/{evidence,attachments,checklists,damages,work-orders,mobile} e em tests/. Prova medida nas DUAS pontas: `git diff --name-only origin/main...HEAD -- frontend/ mobile/` e `git status --porcelain -- frontend/ mobile/` saem os DOIS VAZIOS. `npm --prefix frontend run check` e `npm --prefix frontend run build` rodaram VERDES (ec=0) como regressao, sem mover a contagem de smoke. A nota acima descreve execucao de bloco anterior, NAO deste PR.] [B-GOV-ELENCO-ENXUTO: valor CARREGADO — o ultimo valor oficial, NAO reexecutado por este PR (§C3.3). O diff deste bloco nao toca `src/`, `tests/`, `prisma/`, `frontend/` nem `mobile/`: sao 5 arquivos — `scripts/audit-agents-skills.mjs`, `Kpis/kpis-latest.json`, `Kpis/kpis-history.json`, `Kpis/kpis-history.md`, `Kpis/app.js` — mais 3 de registro em `agent-orchestration/`. Prova medida nas DUAS pontas: `git diff --name-only <base>...HEAD -- src/ tests/ prisma/ frontend/ mobile/` e `git status --porcelain -- src/ tests/ prisma/ frontend/ mobile/` saem os DOIS VAZIOS. A nota acima descreve execucao de bloco anterior, NAO deste PR.]"},"flutter_modules":{"value":17,"total":17,"display":"17/17","note":"[B-SAN3-04a §C3.3 (2026-09-18): valor CARREGADO — este PR não toca `mobile/` (`git diff --name-only origin/main -- mobile` vazio); sem reexecução desta trilha neste PR.] [B-O6R-06 §C3.3 (2026-09-11): valor CARREGADO — este PR nao toca `mobile/` nem `frontend/`: arvores identicas entre o head julgado 0f0a872a e o head do delta e26eb9e5 (mobile `3a2ac028`, frontend `24be761e`, medido pela cadeira C3 por `git rev-parse <ref>:<path>`); sem reexecucao desta trilha neste PR. O marcador anterior nomeava B-GOV-ELENCO/SAN2-4b, blocos anteriores.]  [SAN2-4b: valor CARREGADO — o PR nao toca esta trilha; sem reexecucao (§C3.3). Prova medida nas DUAS pontas (commitado e arvore de trabalho): `git diff --name-only 45c3b97...HEAD` e `git status --porcelain` sobre `mobile/` e `frontend/` saem VAZIOS. O diff de codigo deste bloco sao 5 arquivos: `src/modules/authority/authority-password.ts` e quatro em `tests/`.] \n[B-O6R-07a: valor CARREGADO — o ultimo valor oficial, NAO reexecutado por este PR (§C3.3). O bloco corrige autorizacao e autenticacao no backend: o diff nao toca `frontend/` nem `mobile/`, provado nas DUAS pontas (`git diff --name-only origin/main...HEAD -- frontend/ mobile/` e `git status --porcelain` saem os DOIS VAZIOS). `npm --prefix frontend run check` e `npm --prefix frontend run build` rodaram VERDES (`ec=0`) como regressao, sem mover a contagem de smoke. A nota acima descreve execucao de bloco anterior, NAO deste PR.] [B-O6R-07b: valor CARREGADO — o ultimo valor oficial, NAO reexecutado por este PR (§C3.3). O bloco e backend-only: fecha o Omega6R-SEC-004 em src/modules/{evidence,attachments,checklists,damages,work-orders,mobile} e em tests/. Prova medida nas DUAS pontas: `git diff --name-only origin/main...HEAD -- frontend/ mobile/` e `git status --porcelain -- frontend/ mobile/` saem os DOIS VAZIOS. `npm --prefix frontend run check` e `npm --prefix frontend run build` rodaram VERDES (ec=0) como regressao, sem mover a contagem de smoke. A nota acima descreve execucao de bloco anterior, NAO deste PR.] [B-GOV-ELENCO-ENXUTO: valor CARREGADO — o ultimo valor oficial, NAO reexecutado por este PR (§C3.3). O diff deste bloco nao toca `src/`, `tests/`, `prisma/`, `frontend/` nem `mobile/`: sao 5 arquivos — `scripts/audit-agents-skills.mjs`, `Kpis/kpis-latest.json`, `Kpis/kpis-history.json`, `Kpis/kpis-history.md`, `Kpis/app.js` — mais 3 de registro em `agent-orchestration/`. Prova medida nas DUAS pontas: `git diff --name-only <base>...HEAD -- src/ tests/ prisma/ frontend/ mobile/` e `git status --porcelain -- src/ tests/ prisma/ frontend/ mobile/` saem os DOIS VAZIOS. A nota acima descreve execucao de bloco anterior, NAO deste PR.]"},"mvp_demo":{"value":99,"unit":"%","display":"99%","note":"Ω4 fechou o modulo Financeiro do tenant completo (Contas, Titulos AR/AP, Faturamento anti-refaturamento, Caixa/Extrato, Conciliacao, Fechamento com trava retroativa, Cheque, Dashboard real) sobre o hub da OS da Fase 1. +1 por escopo. Percentual estimado, sujeito a revisao humana. [SAN2-4b: INTOCADO — o PR nao move escopo: conserta arnes de teste e endurece um primitivo de autenticacao, sem entregar funcionalidade nova ao usuario (§C3.4).] [SAN2-6: INTOCADO — o bloco não move escopo de produto] [B-O6R-07a: INTOCADO — o bloco nao move escopo de produto (§C3.4): fecha defeito de autorizacao e autenticacao, sem entregar funcionalidade nova ao usuario.] [B-O6R-07b: INTOCADO — o bloco nao move escopo de produto (§C3.4): fecha defeito de SEGURANCA (verificacao de conteudo de upload e endurecimento do download), sem entregar funcionalidade nova ao usuario.] [B-GOV-ELENCO-ENXUTO: INTOCADO — o bloco nao move escopo de produto (§C3.4): encolhe uma ferramenta de governanca (o auditor de elenco e skills), sem entregar nem retirar funcionalidade ao usuario.] [SAN3 plano (PR #386): INTOCADO — o PR nao move escopo de produto (§C3.4). O inventario SAN3 (2026-09-11) mediu telas de menu e do console da plataforma exibindo dado inventado e fluxos do app sem porta de entrada (docs/revisoes/SAN3/PLANO_SAN3.md §4.1): este 99% e estimativa ANTERIOR ao inventario e sera recalculado no B-SAN3-10.]","label":"Escopo demonstrável entregue","caveat":"Também estimado, pela mesma régua."},"mvp_vendavel":{"value":88,"unit":"%","display":"88%","note":"Ω4 entregou o pilar Financeiro (AR/AP com chokepoint, faturamento idempotente, caixa/extrato, conciliacao, fechamento de periodo, cheque, dashboard agregado) — nucleo vendavel de gestao financeira. +5 por escopo. Percentual estimado, sujeito a revisao humana. [SAN2-4b: INTOCADO — o PR nao move escopo: conserta arnes de teste e endurece um primitivo de autenticacao, sem entregar funcionalidade nova ao usuario (§C3.4).] [SAN2-6: INTOCADO — o bloco não move escopo de produto] [B-O6R-07a: INTOCADO — o bloco nao move escopo de produto (§C3.4): fecha defeito de autorizacao e autenticacao, sem entregar funcionalidade nova ao usuario.] [B-O6R-07b: INTOCADO — o bloco nao move escopo de produto (§C3.4): fecha defeito de SEGURANCA (verificacao de conteudo de upload e endurecimento do download), sem entregar funcionalidade nova ao usuario.] [B-GOV-ELENCO-ENXUTO: INTOCADO — o bloco nao move escopo de produto (§C3.4): encolhe uma ferramenta de governanca (o auditor de elenco e skills), sem entregar nem retirar funcionalidade ao usuario.] [SAN3 plano (PR #386): INTOCADO — o PR nao move escopo de produto (§C3.4). MAS o gate da versao vendavel do plano SAN3 v5 (inventario de 2026-09-11 + junta do PR #386) tem 56 bloqueantes em 37 blocos e 6 atos que dependem do dono (docs/revisoes/SAN3/PLANO_SAN3.md §4). Este 88% e estimativa ANTERIOR ao inventario e sera recalculado no B-SAN3-10, o bloco que declara o gate.]","label":"Escopo do produto vendável entregue","caveat":"Percentual ESTIMADO, sujeito a revisão humana — não é medição. Mede escopo funcional construído; prontidão para produção é a outra dimensão do painel, medida ao lado."},"blocks_completed":{"value":170,"display":"170","note":"[B-SAN3-01b (2026-10-02): **169 -> 170**, contado a partir do valor publicado na `origin/main` (`4ab9d232`, #398 registro; o último PR que contou bloco foi o #397 = 169): +1 bloco de guarda do gate SAN3 entregue (frontend: 1 página, 2 arquivos de teste, 3 cabeçalhos, lista do smoke). Se outro PR mergear antes deste, RECONTA no pré-merge a partir da `main` de então.]"},"mobile_backend_contracts":{"value":18,"total":18,"display":"18/18","note":"[B-SAN3-04a §C3.3 (2026-09-18): valor CARREGADO — este PR não toca `mobile/` (`git diff --name-only origin/main -- mobile` vazio); sem reexecução desta trilha neste PR.] [B-O6R-06 §C3.3 (2026-09-11): valor CARREGADO — este PR nao toca `mobile/` nem `frontend/`: arvores identicas entre o head julgado 0f0a872a e o head do delta e26eb9e5 (mobile `3a2ac028`, frontend `24be761e`, medido pela cadeira C3 por `git rev-parse <ref>:<path>`); sem reexecucao desta trilha neste PR. O marcador anterior nomeava B-GOV-ELENCO/SAN2-4b, blocos anteriores.]  [SAN2-4b: valor CARREGADO — o PR nao toca esta trilha; sem reexecucao (§C3.3). Prova medida nas DUAS pontas (commitado e arvore de trabalho): `git diff --name-only 45c3b97...HEAD` e `git status --porcelain` sobre `mobile/` e `frontend/` saem VAZIOS. O diff de codigo deste bloco sao 5 arquivos: `src/modules/authority/authority-password.ts` e quatro em `tests/`.] \n[B-O6R-07a: valor CARREGADO — a metrica `contratos do app com o servidor` nao foi reexecutada e o PR nao toca `mobile/` (§C3.3). O que ESTE PR rodou, como regressao do contrato B-108, foi o arquivo `tests/mobile-backend-contracts.test.ts`: **25/25, fail 0, skipped 0, `ec=0`** — numero medido, publicado aqui como execucao de regressao e NAO promovido a valor da metrica, porque a regua dos 18/18 e outra e trocar a regua sem junta fabricaria uma quebra de serie.] [B-O6R-07b: valor CARREGADO — o ultimo valor oficial, NAO reexecutado por este PR (§C3.3). O bloco e backend-only: fecha o Omega6R-SEC-004 em src/modules/{evidence,attachments,checklists,damages,work-orders,mobile} e em tests/. Prova medida nas DUAS pontas: `git diff --name-only origin/main...HEAD -- frontend/ mobile/` e `git status --porcelain -- frontend/ mobile/` saem os DOIS VAZIOS. `npm --prefix frontend run check` e `npm --prefix frontend run build` rodaram VERDES (ec=0) como regressao, sem mover a contagem de smoke. A nota acima descreve execucao de bloco anterior, NAO deste PR.] [B-GOV-ELENCO-ENXUTO: valor CARREGADO — o ultimo valor oficial, NAO reexecutado por este PR (§C3.3). O diff deste bloco nao toca `src/`, `tests/`, `prisma/`, `frontend/` nem `mobile/`: sao 5 arquivos — `scripts/audit-agents-skills.mjs`, `Kpis/kpis-latest.json`, `Kpis/kpis-history.json`, `Kpis/kpis-history.md`, `Kpis/app.js` — mais 3 de registro em `agent-orchestration/`. Prova medida nas DUAS pontas: `git diff --name-only <base>...HEAD -- src/ tests/ prisma/ frontend/ mobile/` e `git status --porcelain -- src/ tests/ prisma/ frontend/ mobile/` saem os DOIS VAZIOS. A nota acima descreve execucao de bloco anterior, NAO deste PR.]"},"mobile_core_saas_contracts":{"value":21,"total":21,"display":"21/21","note":"[B-SAN3-04a §C3.3 (2026-09-18): valor CARREGADO — este PR não toca `mobile/` (`git diff --name-only origin/main -- mobile` vazio); sem reexecução desta trilha neste PR.] [B-O6R-06 §C3.3 (2026-09-11): valor CARREGADO — este PR nao toca `mobile/` nem `frontend/`: arvores identicas entre o head julgado 0f0a872a e o head do delta e26eb9e5 (mobile `3a2ac028`, frontend `24be761e`, medido pela cadeira C3 por `git rev-parse <ref>:<path>`); sem reexecucao desta trilha neste PR. O marcador anterior nomeava B-GOV-ELENCO/SAN2-4b, blocos anteriores.]  [SAN2-4b: valor CARREGADO — o PR nao toca esta trilha; sem reexecucao (§C3.3). Prova medida nas DUAS pontas (commitado e arvore de trabalho): `git diff --name-only 45c3b97...HEAD` e `git status --porcelain` sobre `mobile/` e `frontend/` saem VAZIOS. O diff de codigo deste bloco sao 5 arquivos: `src/modules/authority/authority-password.ts` e quatro em `tests/`.] \n[B-O6R-07a: valor CARREGADO — o ultimo valor oficial, NAO reexecutado por este PR (§C3.3). O bloco corrige autorizacao e autenticacao no backend: o diff nao toca `frontend/` nem `mobile/`, provado nas DUAS pontas (`git diff --name-only origin/main...HEAD -- frontend/ mobile/` e `git status --porcelain` saem os DOIS VAZIOS). `npm --prefix frontend run check` e `npm --prefix frontend run build` rodaram VERDES (`ec=0`) como regressao, sem mover a contagem de smoke. A nota acima descreve execucao de bloco anterior, NAO deste PR.] [B-O6R-07b: valor CARREGADO — o ultimo valor oficial, NAO reexecutado por este PR (§C3.3). O bloco e backend-only: fecha o Omega6R-SEC-004 em src/modules/{evidence,attachments,checklists,damages,work-orders,mobile} e em tests/. Prova medida nas DUAS pontas: `git diff --name-only origin/main...HEAD -- frontend/ mobile/` e `git status --porcelain -- frontend/ mobile/` saem os DOIS VAZIOS. `npm --prefix frontend run check` e `npm --prefix frontend run build` rodaram VERDES (ec=0) como regressao, sem mover a contagem de smoke. A nota acima descreve execucao de bloco anterior, NAO deste PR.] [B-GOV-ELENCO-ENXUTO: valor CARREGADO — o ultimo valor oficial, NAO reexecutado por este PR (§C3.3). O diff deste bloco nao toca `src/`, `tests/`, `prisma/`, `frontend/` nem `mobile/`: sao 5 arquivos — `scripts/audit-agents-skills.mjs`, `Kpis/kpis-latest.json`, `Kpis/kpis-history.json`, `Kpis/kpis-history.md`, `Kpis/app.js` — mais 3 de registro em `agent-orchestration/`. Prova medida nas DUAS pontas: `git diff --name-only <base>...HEAD -- src/ tests/ prisma/ frontend/ mobile/` e `git status --porcelain -- src/ tests/ prisma/ frontend/ mobile/` saem os DOIS VAZIOS. A nota acima descreve execucao de bloco anterior, NAO deste PR.]"}},"policy":{"dual_kpis":false,"root_reflection":"Kpis/ (painel ÚNICO)","rules":["Painel ÚNICO: `Kpis/`. A política dupla foi REVOGADA pelo dono em 2026-08-12 (D-KPI-DUPLA-REVOGADA) e o `mobile/flutter_app/Kpis/` foi apagado — manter dois painéis em paridade manual multiplicava trabalho e risco de divergirem.","Todo PR que altere código/teste/escopo atualiza `Kpis/*` no próprio PR, com contagem de execução REAL (D-KPI-PER-PR); a junta do PR valida os números.","PR que toque Flutter atualiza a métrica `flutter_tests` aqui — não há segundo conjunto.","O ARTEFATO PRINCIPAL é o `Kpis/index.html` (D-KPI-INDEX-PAINEL); os JSON são a fonte de dados e o painel hidrata deles em runtime."]},"notes":["Omega-VID PR-07 (2026-08-01, frontend-only): VehicleDossieModal — o dossie do veiculo num Modal size='lg' (PR-06) com ABAS (Tabs do design-system), aberto ao clicar na vaga OCUPADA do mapa de ocupacao (nao navega mais) e por deep-link ?dossie=<processId>. Componente novo VehicleDossieModal.tsx (frontend/src/modules/patios/processes/components/): a casca fia os hooks (useProcessDossie/useStatement/impound:read) e delega o corpo PURO VehicleDossieView (separado para ser testavel via renderToString com fixtures — mesmo padrao dos paineis puros do modulo). 6 abas reorganizando as secoes que a ProcessoDossiePage empilhava: Visao Geral (ProcessIdentityCard: identificacao/origem + local de guarda), Vistoria de Recepcao (InspectionSection), Linha do Tempo (IntegritySeal+ProcessTimeline), Debitos (GuiaDebitos + LancamentoChargeModal aninhado), Liberacao (LiberacaoPanel), Leilao/Liquidacao (AuctionPanel+LiquidacaoPanel). As abas Checklist do Guincho (PR-08) e Historico de Custodias (PR-09) NAO entram — a estrutura de abas so fica pronta. Hook novo useProcessDossie(processId, enabled=true) extrai a logica de fetch da ProcessoDossiePage (getProcess + eventos/verify/vistoria em paralelo + join client-side patio/vaga + auto-refresh) reusado pela pagina E pelo modal SEM duplicar; a ProcessoDossiePage foi refatorada para consumi-lo, comportamento INALTERADO. ProcessIdentityCard.tsx extraido (2 cards) reusado nos dois. OccupancyMap: a vaga OCUPADA deixa de ser <Link to=/patios/processos/:id> (ExternalLink) e vira BOTAO onOpenDossie(processId) (FileText) — nao navega, sem <Link>/href; §allowlist: currentProcessId nunca como texto. Sem onOpenDossie -> span nao-clicavel (sem trigger morto). PatioDetailPage: o estado {open,processId} do modal E a query ?dossie= (fonte da verdade; helpers PUROS setDossieParam/clearDossieParam em dossieDeepLink.ts): abrir empurra o param (botao-voltar fecha), fechar remove com replace, montar com ?dossie= ja preenchido (refresh/link compartilhado) ABRE automaticamente. A rota /patios/processos/:processId (ProcessoDossiePage) CONTINUA como deep-link/fallback direto. Tabs do design-system ganha role='tab'+aria-selected (aditivo, nao muda classe/texto). Estados obrigatorios (§7): loading/skeleton, erro+retry, acesso-negado (impound:read), nao-encontrado. A11y: foco no modal (PR-06), alvo >=44px no X, aria nas abas. Fidelidade §11: PT-BR de negocio, acentuacao, sem badge PLANNED/TODO, sem rota como texto; cabecalho = placa + chip de status. +16 smoke tests reais (patios-dossie-modal.smoke.test.tsx=14 + patios-dossie-deeplink.smoke.test.tsx=2) + patios-mapa.smoke migrado (3 testes <Link>->botao). Bateria: npm --prefix frontend run check OK, test:smoke 970/970 (0 fail/0 skip, sobre 954), build OK (dist limpo apos, §C5), git diff --check limpo. frontend_smoke 954 -> 970 (execucao real). backend/flutter INALTERADOS (frontend-only, ultimo valor oficial, D-KPI-PER-PR §C3.3). blocks_completed 123->124 (1 bloco = 1 PR). Escopo: frontend/src/modules/patios/** + frontend/src/components/ui/index.tsx (Tabs aria) + frontend/package.json + frontend/tests/** + Kpis/*. INTOCADOS: src/** (backend), mobile/**, aba Checklist(PR-08)/Historico(PR-09). pr/merge_commit/approved_head null na autoria.","Omega-VID PR-06 (2026-08-01, frontend-only, design-system): o Modal do design system ganha uma prop OPCIONAL size?: 'md'|'lg' (default 'md') para abrir a reta de UI do dossie do veiculo (PR-07 com abas). size='lg' => className 'ui-modal ui-modal--lg' + children envolvido em <div class='ui-modal__body'>. CSS novo SO na variante (.ui-modal--lg width min(1180px,96vw)/max-height 92vh/flex-column; body overflow-y auto/flex 1; header flex none; X 44px; focus-visible) — o seletor base .ui-drawer,.ui-modal (420px, compartilhado) NAO foi tocado, entao Drawer e todos os modais 'md' seguem intocados. O caminho 'md' e byte-identico ao codigo anterior (className inalterada + children renderizado DIRETO, sem wrapper) — decisao consciente de so aplicar o body-div no 'lg' para garantir ZERO regressao. Grep por '<Modal' em frontend/src confirmou que NENHUM dos ~55 usos passa 'size' hoje (NovoProcessoModal/SpotPickerModal/VacateSpotModal/LancamentoChargeModal/YardFormModal/YardAreaFormModal/YardSpotFormModal/EditalModal/PerfilFormModal/ProcessPickerModal de Patios + estoque/frota/financeiro/cadastros/notificacoes/sessoes/work-orders) => todos herdam 'md' => zero mudanca visual. Theme-aware (tokens --surface-panel/--shadow-overlay, sem cor hardcoded). A11y: role='dialog'+aria-modal='true'+aria-label mantidos, botao X (aria-label='Fechar'), alvo de toque >=44px + foco visivel na variante lg (base 36px preservado). Responsivo: 96vw + max-height 92vh + body scrollavel => nunca estoura a viewport. NAO foi introduzido close por backdrop/Esc (o Modal nunca teve — evita regredir modais com onClose condicional a estado busy). Componente Tabs (ja existente) NAO tocado (reuso no PR-07). +4 smoke tests reais (frontend/tests/modal-large.test.tsx, registrados em package.json test:smoke): frontend_smoke 950 -> 954 (execucao real 954 pass/0 fail/0 skip). Bateria: npm --prefix frontend run check OK, test:smoke 954/954, build OK (dist limpo apos, §C5), git diff --check limpo. backend/flutter INALTERADOS (frontend-only, ultimo valor oficial, D-KPI-PER-PR §C3.3). blocks_completed 122->123 (1 bloco = 1 PR; horizontal de design-system, numero sujeito a junta). Escopo: frontend/src/components/ui/index.tsx + frontend/src/styles/app.css + frontend/package.json + frontend/tests/modal-large.test.tsx + Kpis/*. INTOCADOS: src/** (backend), mobile/**, o .ui-modal base, Tabs. pr/merge_commit/approved_head null na autoria.","Omega-VID PR-05 FIX-JUNTA (2026-08-01, D-Omega-VID-05-SEED): a junta do PR-05 APROVOU_CONDICIONADO; o critico-adversarial provou por PoC 1 MEDIA real — a colisao-POR-REUSO (uma placa digitada errada na OS que casa EXATAMENTE o plate_key de uma identidade existente de OUTRO veiculo faz o processo do 2o veiculo ser agregado sob a identidade do 1o: UMA identidade passa a conter processos de DOIS veiculos) NAO tinha caminho de correcao. Das mitigacoes registradas na D-record, 2 NAO operavam sobre a colisao-por-reuso: (a) a vistoria NAO reapontava identity_id; (b) o banner duplicateCandidates so dispara com >=2 identidades ATIVAS da mesma placa (a colisao-por-reuso produz UMA -> nunca aparece); (c) merge/unmerge NAO fazem SPLIT. Resultado: agregacao errada so seria corrigivel por SQL manual (proibido, D-Omega-VID-01). CONSERTO (o dominio-correto — a vistoria e a fonte de verdade da identidade, D-Omega5P-REC-10): quando a vistoria de recepcao CONFIRMA a placa (saveInspection), o fluxo RE-RESOLVE e RE-APONTA ImpoundProcess.identity_id para a identidade correta daquela placa confirmada, NA MESMA tx RLS da vistoria (reconcileIdentityFromConfirmedPlate em impound-prisma.repository.upsertInspection; REUSA resolveOrCreateByPlateKey do PR-05). Isso SPLITA a agregacao errada (o processo de Y, ao confirmar Y na vistoria, sai da identidade de X e vai para a de Y) e sobe a identidade confirmada PROVISIONAL->CONFIRMED. A vistoria e a garantia de CONVERGENCIA EVENTUAL, INDEPENDENTE do guard de seed-time (o guard estrito /^[A-Z0-9]{7}$/ do sweep vs. o truthy do backfill deixa de importar). Limitacoes aceitas por desenho documentadas na D-record (fragmentacao sob sweeps concorrentes -> vistoria+merge reconciliam; AUTO-link fail-closed -> trade-off intencional atomicidade/zero-orfao, comentado no codigo). +3 test() DB-gated reais (SPLIT vivo / no-op idempotente / PROVISIONAL->CONFIRMED); suite do arquivo 25->28; regressao impound/vehicle-identity/owner-portal/stock-custody 217 pass/0 fail. backend 2082/2088 -> 2085/2091. flutter/frontend_smoke inalterados (backend-only, D-KPI-PER-PR §C3.3). blocks_completed inalterado (122; fix dentro do PR-05). Escopo: src/modules/impound/{service,intake.types,repository,impound-prisma.repository}.ts + agent-orchestration/controle/decisoes.md + tests + Kpis/*. INTOCADOS: prisma/schema.prisma+migrations, impound.hashchain/impound.transitions/resolveTransition (FSM/cadeia), mergeIdentities/unmergeIdentity, scripts/backfill-*, mobile/**. pr/merge_commit/approved_head null na autoria (backfill pos-merge).","Omega-VID PR-05 (2026-08-01, D-Omega-VID-05-SEED — backend-only): fecha a corrida 'backfill 1x vs sweep continuo' (achado #1 da junta de arquitetura). O sweep OS->custodia (impound.reconcile) passa a RESOLVER/CRIAR a ThirdPartyVehicleIdentity e AUTO-linkar os ChecklistRun da OS ao ImpoundProcess NA MESMA transacao da abertura (openFromRemovalAtomic). Guard de forma de placa (7 alfanumericos apos normalizePlateKey): plausivel -> resolve-ou-cria PROVISIONAL/unidentified=false/plate_key com REUSO byte-identico ao backfill PR-03 (findFirst confidence!=MERGED orderBy created_at asc) => sweep e backfill convergem na MESMA identidade agregadora; lixo/vazio -> PROVISIONAL/unidentified=true reason neutro (satisfaz identity_chk). O PROCESSO segue vehicle_unidentified=true (D-Omega5P-REC-10; identidade dele so pela vistoria); a identidade agregadora e PROVISIONAL, separada. Efeito-de-dominio SISTEMA (created_by NULL, sem re-checar permissao de vehicle_identity/checklist). Fail-CLOSED por construcao (nao fail-open): identidade+link na MESMA tx (identity-create SEM unique -> sem P2002/25P02; FK/CHECK na propria tx; link por upsert ON CONFLICT idempotente) => se o INSERT do processo colidir no indice PARCIAL unico (duplicate_service_order) a tx INTEIRA reverte, inclusive identidade+link => nenhum orfao. SEM migracao (colunas identity_id/ImpoundProcessChecklistLink/ThirdPartyVehicleIdentity ja existem do PR-02/04; custody_events.type e TEXT livre sem CHECK — nao ha o problema que mordeu o PR-A). Escopo: src/modules/impound/** (reconcile/service/types/prisma-repo/repo) + src/modules/vehicle-identities/{vehicle-identity.repository,vehicle-identity-prisma.repository,vehicle-identity.types}.ts (helper) + tests + Kpis/*. INTOCADOS: prisma/schema.prisma+migrations (sem migracao), impound.hashchain.ts/impound.transitions.ts/resolveTransition (FSM/cadeia), mergeIdentities/unmergeIdentity (PR-04), scripts/backfill-* (so referencia), RBAC/rotas/.env/lockfiles/mobile/**. +18 test() reais (3 unit InMemory + 15 DB-gated Postgres): backend 2064/2070 -> 2082/2088; flutter/frontend_smoke inalterados (backend-only, D-KPI-PER-PR §C3.3); blocks_completed 121->122. pr/merge_commit/approved_head null na autoria (backfill pos-merge).","PR-B FIX-JUNTA (2026-08-01, D-CHK-DISPATCH-CREATE — lado Flutter): correcao dos 6 achados reais da junta APROVADO_CONDICIONADO. (1 ALTA/crash) migracao Drift: as constantes de CREATE ja traziam as colunas novas, entao um device em schema 1/2 subindo direto para 13 criava a tabela ja completa (from<2 work_orders / from<3 checklist) e depois o ALTER ADD COLUMN duplicava -> 'duplicate column name' -> onUpgrade falha -> banco nao abre -> dados offline inacessiveis. Guardas from>=2 (work_orders: service_type/customer_*/vehicle_*/team_*) e from>=3 (checklist_runs.kind, checklist_attachments.5cols) fazem o ALTER so rodar quando a tabela NAO nasceu completa nesta migracao (mesma intencao do par create/else-if do work_order_evidence). +2 testes de MIGRACAO REAL (nenhum existia; todos usavam openInMemory=onCreate fresco). (2) marker sem component_id: addMarker agora LANCA e nao enfileira (backend exige component_id -> 400 -> sumia apos maxRetry); tela guarda + componentId virou required. (3) acknowledgement: (a) lote ordenado por created_at no store (ORDER BY) e no replay (sort estavel) garantindo divergence->ack->complete; (b) completeRun reporta has_divergence REAL (antes forcava false -> rebaixava pending_acknowledgement->completed e a ciencia 409-perdia); (c) 409 ACKNOWLEDGEMENT_NOT_REQUIRED mapeado para failed retryavel (nao conflito terminal que exclui do replay para sempre). (4) AutoSyncCoordinator: novo downloadPendingRuns baixa o server_run_id das runs iniciadas 100% offline (com acoes/fotos pendentes sem serverId) ANTES do replay, sem depender de reabrir a tela. (5) foto: blob so apagado com status=='stored' (§B-108); scan_failed/rejected/pending_review preservam o blob (espelha evidence). (6) acentuacao PT-BR do AwaitingDispatchView (servico/nao/voce/ja->serviço/não/você/já) + doc de getOrStartRun + widget test. flutter_tests 822->835 (+13 reais; 835/0-falha/0-skip). backend_tests (2064/2070) e frontend_smoke (950) INALTERADOS (Flutter-only; ultimo valor oficial, D-KPI-PER-PR §C3.3). blocks_completed inalterado (fix dentro da PR-B). Escopo: mobile/flutter_app/** + Kpis/* (dual). src/** e pubspec/lock INTOCADOS. pr/merge_commit/approved_head null na autoria.","PR-B (2026-08-01, D-CHK-DISPATCH-CREATE — lado Flutter, consome o backend PR-A ja mergeado): o guincheiro deixa de CRIAR a run localmente e passa a BAIXAR a run pre-criada pelo despacho. (1) checklist_repository.resolveRunForWorkOrder: novo remoto fetchRunsForWorkOrder (GET /api/v1/mobile/checklist-runs?workOrderId[&checklistId], parse tolerante snake/camel, desambigua por checklistId), grava o server_run_id no Drift, responde CONTRA a run baixada; getOrStartRun NAO enfileira mais runCreate; lista vazia -> 'aguardando despacho' (sem run local, sem runCreate; a lista vazia PODE ser falha de provisao, nao so ausencia); offline -> run local usavel + carimbo do server_run_id nas acoes ja enfileiradas quando o download chega. (2) sync destravado: supportedActionTypes = ciclo completo menos runCreate; elegibilidade exige server_run_id (satisfeito). (3) codec canonico: marker/divergence/acknowledgement/attachment -> tipos+payloads que o backend PR-A aceita (antes caiam no generico e o efeito sumia); run_id = server_run_id baixado. (4) foto por MULTIPART: blob durable offline-first + ChecklistAttachmentUploadService (POST /mobile/checklist-runs/:runId/attachments) plugado no auto-sync; migracao Drift ADITIVA 12->13. (5) UI 'aguardando despacho' (loading/erro/retry, PT-BR, a11y). flutter_tests 807->822 (+15 test reais, suite 822/0-falha/0-skip). backend_tests (2064/2070) e frontend_smoke (950) INALTERADOS — PR Flutter-only; carregam o ultimo valor oficial (D-KPI-PER-PR §C3.3). blocks_completed 120->121. Escopo: mobile/flutter_app/** + Kpis/* (dual). src/** INTOCADO. pubspec/lock INTOCADOS. pr/merge_commit/approved_head null na autoria.","PR-A FIX-JUNTA REVERIF (2026-08-01): a re-verificacao da junta achou 1 MEDIA + 1 BAIXA no conserto de idempotencia da criacao de run (item 2 do FIX-JUNTA). (MEDIA) o P2002 catch-then-refetch rodava numa transacao ABORTADA: withTenantRls envolve TODO o PrismaChecklistRepository.createRun numa UNICA transacao interativa; sob 2 despachos/creates concorrentes da MESMA OS com a mesma client_run_key, o perdedor sofria unique violation (23505/P2002), a tx entrava em ABORTED e a re-busca getRunByClientKey no catch falhava com 25P02 ('current transaction is aborted') — sem code P2002, NAO era re-capturada -> createRun LANCAVA em vez de devolver {created:false}. Impacto: o perdedor caia no fail-open do field-dispatch como provisao FALHA -> evento ESPURIO field_dispatch_checklist_run_failed + notificacao falsa ao operador (falso alarme do proprio sinal de observabilidade recem-adicionado), e no mobile-sync retornava erro em vez de already_applied. Cura na RAIZ: createRun com client_run_key passou a usar INSERT ... ON CONFLICT (tenant_id, client_run_key) DO NOTHING RETURNING via $queryRaw (0 linhas -> conflito, tx NAO aborta -> SELECT normal devolve a existente com created:false; 1 linha -> created:true; respostas via createMany na mesma tx; caminho SEM client_run_key inalterado). InMemory ja espelhava o contrato {run, created}. RlsPrismaChecklistRepository exportado para o teste. (BAIXA) o teste de concorrencia [nao super-conta] rodava so em memory (serializa sincrono, nunca exercita o 25P02): adicionado tests/checklist-run-create-concurrency-db.test.ts (DB-gated, Postgres real) que forca o perdedor ao ON CONFLICT via barreira (a N-concorrencia ingenua mascara o abort) e prova created:false LIMPO + 1 run + 1 checklist_runs_count + ZERO evento/notificacao espurios. Provado VIVO: 2/2 verdes com a cura; o teste-barreira REPROVA (25P02) contra o codigo antigo. Escopo respeitado: withTenantRls/rls.ts INTOCADO (a cura e no INSERT do repo). +2 test() -> backend 2062/2068 -> 2064/2070. blocks_completed inalterado (120; re-verificacao dentro da PR-A). pr/merge_commit/approved_head null na autoria.","PR-A FIX-JUNTA (2026-08-01): correcao dos 6 achados da junta APROVADO_CONDICIONADO da PR-A. (1 ALTA/dba) migracao aditiva 20260858000000 estende o CHECK field_dispatch_events_event_type_check para admitir 'field_dispatch_checklist_run_failed' — sem ela o INSERT do evento fail-open estourava 23514 NAO-capturado (create NAO usa $transaction) -> HTTP 500 com despacho orfao + Outbox perdido + auditoria perdida; provado vivo contra Postgres (valor novo -> INSERT OK; valor fora da lista -> 23514); comentario falso em field-dispatch.types.ts corrigido; + defesa-em-profundidade try/catch na auditoria. (2 MEDIA/critico) repository.createRun devolve {run, created}; o service PULA audit + publishDomainEvent('checklist_run.created') quando created=false -> nao super-conta a metrica FATURADA checklist_runs_count sob 2 despachos concorrentes / 2x POST mesma client_run_key (in-memory+Prisma+Rls+callers). (3 MEDIA/critico) reassign agora REPROVISIONA a run idempotente (auto-recuperacao real quando a provisao do create falhou) + notificacao ao operador via motor de notificacoes existente (injetado no composition root, dependency-inverted). (4 BAIXA) reason de auditoria CODIFICADO (taxonomia curta / ChecklistError.reason), nunca error.message cru (§2.8). (5 BAIXA) GET run-por-OS aceita ?checklistId= p/ desambiguar quando a OS troca de checklist entre despachos (>1 run; ordem created_at desc). (6 BAIXA/dba) comentario de ops sobre indice nao-CONCURRENTLY na migracao 20260857000000. (7) mobile-backend-contracts fixa CORE_SAAS_PERSISTENCE=memory no setup. +3 test() reais -> backend 2059->2062 / 2065->2068. blocks_completed inalterado (120; fix dentro da mesma PR-A). Migracao 20260858000000 aplicada viva (migrate deploy + migrate status up-to-date).","PR-20-FIX (2026-07-30): trigger BEFORE UPDATE em impound_outbox_events (guard_update) — a fila de outbox so podia ter DELETE bloqueado, nao UPDATE; um UPDATE de payload/tenant_id/process_id/event_type/occurred_at/schema_version/target/created_at rodava sem erro (PoC do critico-adversarial). Adicionado na MESMA migracao 20260853000000 (ainda nao commitada), so status/attempts/last_error mutaveis por desenho da fila. Migracao reaplicada viva no Postgres de dev (prisma db execute + checksum de _prisma_migrations reconciliado); prisma validate/migrate status OK. +1 teste em tests/impound-outbox.test.ts prova UPDATE de payload/process_id bloqueado e status/attempts/last_error permitido. backend 1956/1971 (numero relatado pelo PR-20 original) -> 1957/1972; regressao da familia impound/auction/release/settlement (26 arquivos, 203 testes) verde. frontend_smoke inalterado (937) — aguarda o PR de frontend paralelo fechar seu proprio achado e atualizar essa metrica no proprio PR quando fechar.","PR-17b (2026-07-30): fotos de vistoria MINIMIZADAS servidas pelo owner-portal (resize<=1024px+JPEG q70+marca-d'agua fixa, buffer-in/buffer-out, zero disco). Conserto pos-revisao de junta (secops/coordenador-de-acessos/dba-guardiao APROVARAM; critico-adversarial + avaliador REPROVARAM com achados concretos, ambos fechados nesta entrega): (1) C2 — composicao do semaforo de concorrencia invertida (guard.run envolve o trabalho REAL sem timeout embutido; o timeout de resposta HTTP envolve o resultado de guard.run) para o slot so ser devolvido ao pool quando a decodificacao de fato termina, nunca quando um timeout externo dispara antes; teste de regressao (2c) prova o comportamento correto. (2) D-007 — availabilityLabel deixou de prometer 'visualizacao' nesta tela (o PWA ainda nao tem UI que consuma /photos/:opaqueRef; adiado para PR de frontend futuro). (3) este proprio snapshot fecha a pendencia de KPI-por-PR (git diff de Kpis/ estava vazio no diff original). +17 testes sempre-roda (owner-portal-photos.test.ts, arquivo novo), zero DB-gated novos, zero dependencia nova alem do jimp ja aprovado.","PR-19 (2026-07-29): a autoridade credenciada aprova/rejeita a liberacao in-system pelo MESMO BFF isolado do 18a/18b — fecha a Fase 5 (fundacao/solicitar/aprovar) e a SoD final triplice (autoridade SOLICITA / operador CONCLUI / autoridade APROVA). Vinculacao D-08 por proveniencia (nunca por texto livre) e a decisao de design mais defendida do PR (contra a tentacao de amarrar por authority_case_number, spoofavel). Zero mudanca no gate I5/resolveTransition/IMPOUND_TRANSITIONS/impound.hashchain — 100% aditivo. 2 CHECKs pre-existentes precisaram de widening aditivo (achados por prova viva contra Postgres, nao em memory) — motivo a mais para a bateria DB-gated ser obrigatoria antes do merge.","FIX-NAV-MENU-PLATFORM-JWT (2026-07-29): remove o 500 do menu platform sob JWT/Prisma na fronteira correta. O pseudo-tenant platform nao e UUID nem tenant persistido; somente Navigation opta por preservar suas permissoes derivadas dos papeis canonicos do JWT assinado. Os outros 55 usos no baseline pos-PR-18a continuam fail-closed, tenants reais usam RBAC persistente e platform nao habilita itens tenantOnly. O [0] observado era efeito no teste depois do 500, nao a causa de producao. Suite protegida 7/7 em Prisma real; suite completa pos-rebase 1900 pass/0 fail/6 skip (1906 total); +3 testes adversariais.","D-Ω4-KPI-RELATORIO (reconciliação 2026-07-18): a rodada Ω4 (Financeiro do tenant ×1,5) deferiu a atualização de KPI de todos os seus PRs (#206–#225) para este snapshot único. Contagens de execução real ao fim da PÓS-FASE 1: backend 989→1242 (0 fail, 6 skip DB-gated que rodam no CI; 1248 total), smoke web 486→514. Flutter/mobile inalterados (Ω4 foi web/backend-only; política dupla). 8 agregados-feature (Ω4-1..8) → blocks_completed 58→66; mvp_demo 98→99 e mvp_vendavel 83→88 movidos por escopo (módulo Financeiro completo). Cada agregado por junta adversarial + pós-análise; relatório em agent-orchestration/omega/RELATORIO-OMEGA4.md. pr: 226; merge_commit/approved_head null na autoria (backfill pós-merge).","D-Ω3F-KPI-RELATORIO (reconciliação 2026-07-17): a rodada Ω3F deferiu a atualização de KPI de todos os seus PRs (#184–#204) para este snapshot único. Contagens de teste vêm de execução real ao fim da Fase 1: backend 989 (0 fail, 6 skip), smoke web 486. Flutter/mobile inalterados (Ω3F foi web/backend-only). mvp_demo/vendavel movidos (+2/+5) por escopo — hub operacional da OS completo.","JUNTA-MAPAS (2026-07-13): PR docs/agentes-only — cria 3 agentes (.claude/agents/planejador-mapas, dev-mapas, avaliador-mapas) + docs/maps/kb-mapas.md + D-JUNTA-MAPAS + ata J-JUNTA-MAPAS. NENHUM codigo de produto/teste tocado: TODAS as metricas de teste carregam o ultimo valor oficial (Ω-INFRA-1: backend 768/768, Flutter 764/764, smoke web 44/44). blocks_completed inalterado (49) — governanca/tooling nao conta como bloco de feature entregue, mesmo criterio de Ω-GOV/Ω-DOCS. mvp_demo/mvp_vendavel inalterados (nenhum escopo de produto movido). Nenhuma chave/billing/SKU do Google ativado.","Ω-GOV (2026-07-13): backend_tests corrigido de 15/15 (so core-saas) para 766/766 — a suite INTEIRA que o gate do CI passou a rodar no Ω-GATE (100 arquivos + Postgres+Redis). Primeira aplicacao da politica KPI-por-PR (D-KPI-PER-PR). Este PR e web/backend/docs-only: metrics de Flutter/mobile e frontend seguem os ultimos valores oficiais (B-124) ate serem re-baseadas em PRs das respectivas trilhas.","frontend_smoke_tests avancou de 33/33 para 44/44 na PR #125 (+10 testes unitarios do dashboard.adapter B-124 e +1 render smoke do dashboard); frontend check e build OK.","blocks_completed segue a regra de contagem de blocos entregues: 48 (ate B-123) + B-124 = 49.","mvp_demo e mvp_vendavel mantidos nos ultimos valores oficiais publicados (96%/78%, tipo estimado); nao houve decisao humana explicita para altera-los no B-124 — a revisao pode ajusta-los. B-123 fechou a fidelidade do fluxo de OS mobile e B-124 fechou o dashboard web enriquecido, mas os percentuais permanecem oficiais ate decisao humana.","flutter_tests e contratos mobile permanecem nos ultimos valores oficiais (B-124, web-only); backend_tests foi ATUALIZADO para 766/766 no Ω-GOV (suite backend inteira do gate do CI apos o Ω-GATE).","Na politica KPI-por-PR (D-KPI-PER-PR), um PR web/backend-only (como este Ω-GOV) atualiza so a raiz Kpis/*; a paridade de version/block com mobile/flutter_app/Kpis/ vale quando o PR toca ambos os conjuntos. Aqui a raiz avanca para Ω-GOV e o mobile segue em B-124 ate um PR que mexa em Flutter/mobile.","B-SAN3-01 (2026-09-17, frontend-only + e2e + registro): a web deixa de fabricar OS/despacho quando o backend recusa (P-008 FECHADA). Arquivos: work-orders.service.ts, work-orders.types.ts (aditivo), work-orders.state.ts (NOVO, reducers puros), work-orders-create.handlers.ts (NOVO), useWorkOrders.ts, useWorkOrderDetail.ts, WorkOrdersPage.tsx (+WorkOrdersKpiGrid/WorkOrdersLoadState exportados), WorkOrderCreatePage.tsx, WorkOrderDetailPage.tsx (+WorkOrderDetailView), GeneralInfoTab.tsx (prop timelineUnavailable), components/StaleDataBanner.tsx (NOVO), operations/dispatches/dispatches.service.ts, OperationsDispatchesPage.tsx (so loadDetail + aviso), tests/e2e/critical-flows.spec.ts (E1-E3). Bateria: check OK · build OK · test:smoke 1173/1173 · npm test 2995/2997 medido pelo dev antes do caso novo da guarda do painel; 2996/2998 reexecutado pelo orquestrador no head 10eb7049 (A-C1-01, corrigido no ciclo 2) · approval-frontend-contract 1/1 · kpi-freeze --check OK · git diff --check OK. mvp_demo/mvp_vendavel INTOCADOS (§C3.4: o bloco nao move escopo — recalculo no B-SAN3-10).","B-SAN3-01 ciclo 2 (2026-09-18, frontend-only + registro + KPI): correcao da reprovacao 2 x 2. Arquivos: work-orders.state.ts (P1 forbidden primeiro; P2 Record exaustivo + never), useWorkOrders.ts (-forbidden exposto), pages/WorkOrdersPage.tsx (classificacao por listStatusKind; WorkOrdersLoadState com default ERRO; StatePanel; KPIs degradados neutros; vazio no card com CTA gated), pages/WorkOrderDetailPage.tsx (StatePanel nos tres estados), components/StatePanel.tsx (NOVO), work-orders.adapter.ts (+hasWorkOrdersList), work-orders.service.ts (200 sem lista = falha; cabecalho), repository.ts (forma positiva), dispatches.service.ts (so cabecalho), frontend/tests/work-orders-honest-errors.test.tsx (47 -> 67). Bateria: check OK · build OK · test:smoke 1193/1193 · bloco 67/67 · approval-frontend-contract 1/1 · npm test 2996/2998 (Postgres e Redis descartaveis, REDIS_URL exportada) · e2e E1-E3 3/3 (base vazia e com OS) · kpi-freeze --check OK · guards de KPI OK · git diff --check OK. blocks_completed 164 INALTERADO (2a publicacao do mesmo bloco). mvp_demo/mvp_vendavel INTOCADOS (§C3.4)."],"limitations":["S3/presigned real pendente","Persistencia duravel DB/Redis do receipt pendente","Antivirus real pendente","Download protegido final pendente","Retencao definitiva pendente","Settings web sem backend dedicado (lacuna documentada)","Piloto Android real ainda precisa validacao em dispositivo fisico","mvp_vendavel (88%) e mvp_demo (99%) sao estimativas anteriores ao inventario SAN3 (2026-09-11); o gate da versao vendavel do plano v5 tem 56 bloqueantes em 37 blocos; recalculo no B-SAN3-10 — docs/revisoes/SAN3/PLANO_SAN3.md"],"production_readiness":{"veredito":"REPROVADO PARA PRODUÇÃO","fonte_veredito":"Junta J-6R, 5×0 — docs/revisoes/O6R/ATA_J6R.md","data_veredito":"2026-08-12","deploy_bloqueado":true,"p0_total":17,"p0_fechados":13,"p0_abertos":4,"p1_total":15,"p1_fechados":2,"p1_abertos":13,"fechados":[{"id":"Ω6R-DIN-001","por":"B-O6R-02 ciclo 5 (PR #371, 99f1840)","em":"2026-09-05"},{"id":"Ω6R-DIN-002","por":"B-O6R-02 ciclo 5 (PR #371, 99f1840)","em":"2026-09-05"},{"id":"Ω6R-DIN-003","por":"B-O6R-02 ciclo 5 (PR #371, 99f1840)","em":"2026-09-05"},{"id":"Ω6R-DIN-004","por":"B-O6R-02 ciclo 5 (PR #371, 99f1840)","em":"2026-09-05"},{"id":"Ω6R-SEC-001","por":"B-O6R-01 (PR #357, 0a39824)","em":"2026-08-19"},{"id":"Ω6R-TEN-001","por":"B-O6R-01 (PR #357, 0a39824)","em":"2026-08-19"},{"id":"Ω6R-DAT-001","por":"B-O6R-05 (PR #353, a8901ff)","em":"2026-08-15"},{"id":"Ω6R-DIN-006","por":"B-O6R-05 (PR #353, a8901ff)","em":"2026-08-15"},{"id":"Ω6R-QUA-003","por":"B-O6R-02 ciclo 5 (PR #371, 99f1840)","em":"2026-09-05"},{"id":"Ω6R-DIN-008","por":"B-O6R-02 ciclo 5 (PR #371, 99f1840)","em":"2026-09-05"},{"id":"Ω6R-DIN-010","por":"B-O6R-02 ciclo 5 (PR #371, 99f1840)","em":"2026-09-05"},{"id":"Ω6R-DIN-011","por":"B-O6R-02 ciclo 5 (PR #371, 99f1840)","em":"2026-09-05"},{"id":"Ω6R-SEC-003","por":"B-O6R-01 (núcleo, PR #357) + B-O6R-07a (residuais, PR #369, dc8168b)","em":"2026-09-04"},{"id":"Ω6R-DIN-005","por":"B-O6R-06 (PR #385, 15ef3fbe)","em":"2026-09-11"},{"id":"Ω6R-DIN-007","por":"B-O6R-06 (PR #385, 15ef3fbe)","em":"2026-09-11"}],"as_of":"2026-09-11","source":"docs/revisoes/O6R/achados.jsonl","aguardando_merge":[],"nota_aguardando":"Nenhum achado aguardando merge em 2026-09-11: Ω6R-DIN-005 e Ω6R-DIN-007 sairam daqui para `fechados` no backfill do #385 (PR do plano SAN3), quando ganharam hash de merge (15ef3fbe). Texto anterior, preservado: Ω6R-DIN-005 e Ω6R-DIN-007 estao `fechado` no registro NA AUTORIA do B-O6R-06 (§C3.5: numero de PR e hash so existem pos-merge). Eles NAO entram em `p0_fechados` nem na lista `fechados` — o painel conta so o que esta na `main`, e e por isso que `p0_fechados` permanece 11."},"findings":{"as_of":"2026-09-06","source":"docs/revisoes/O6R/achados.jsonl","itens":[{"id":"Ω6R-DIN-001","severidade":"P0","modulo":"financial-entries / financial-titles","status":"fechado","resumo":"Pagamento de título: o lançamento é gravado antes de aplicar ao título; duas requisições ao mesmo tempo podem pagar duas vezes.","bloco":"B-O6R-02"},{"id":"Ω6R-DIN-002","severidade":"P0","modulo":"financial-entries / financial-titles","status":"fechado","resumo":"Estorno lança a contrapartida contábil mas não devolve o valor pago nem o status do título — o título fica pago sem estar.","bloco":"B-O6R-02"},{"id":"Ω6R-DIN-003","severidade":"P0","modulo":"cheques / financial-entries","status":"fechado","resumo":"Cheque: estado, lançamento e vínculo são gravados em etapas separadas; falha no meio deixa o cheque inconsistente.","bloco":"B-O6R-02"},{"id":"Ω6R-DIN-004","severidade":"P0","modulo":"financial-titles","status":"fechado","resumo":"Dá para reduzir o valor de um título abaixo do que já foi pago, e apagar título já pago.","bloco":"B-O6R-02"},{"id":"Ω6R-DIN-005","severidade":"P0","modulo":"checklists / cloud-usage / cloud-cost-allocation","status":"fechado","resumo":"A metrica que gera cobranca era gravada em melhor-esforco DEPOIS de a vistoria estar confirmada: se falhasse, o consumo sumia e nunca era recuperado. Agora ela nasce DENTRO da mesma transacao da vistoria, com chave derivada dela — ou as duas coisas existem, ou nenhuma.","bloco":"B-O6R-06"},{"id":"Ω6R-SEC-001","severidade":"P0","modulo":"core-saas / auth / platform","status":"fechado","resumo":"Quem administra uma organização consegue se promover a administrador da plataforma e passar a ler, alterar e suspender TODAS as outras.","bloco":"B-O6R-01"},{"id":"Ω6R-TEN-001","severidade":"P0","modulo":"auth / core-saas","status":"fechado","resumo":"Duas pessoas com o mesmo e-mail em organizações diferentes: uma assume a conta da outra, sem saber a senha.","bloco":"B-O6R-01"},{"id":"Ω6R-DAT-001","severidade":"P0","modulo":"config / core-saas / runtime","status":"fechado","resumo":"Produção podia subir guardando organizações, usuários e permissões só na memória, perdendo tudo no primeiro reinício.","bloco":"B-O6R-05"},{"id":"Ω6R-SEC-002","severidade":"P0","modulo":"work-orders / approvals / RBAC","status":"parcialmente_superado","resumo":"O técnico de campo podia aprovar a própria ordem de serviço; papel, SoD e escopo nas duas rotas guardadas foram fechados, mas 9 rotas mutantes (anexos, comentários, geocode) seguem alcançáveis sobre OS alheia.","bloco":"B-O6R-07"},{"id":"Ω6R-ARQ-001","severidade":"P1","modulo":"infra/jobs","status":"ativo","resumo":"A fila de tarefas retira o item antes de garantir que alguém vai processá-lo: se o processo cair, a tarefa some.","bloco":"B-O6R-08"},{"id":"Ω6R-ARQ-002","severidade":"P1","modulo":"infra/jobs","status":"ativo","resumo":"Cada reinício semeia agendamentos novos sem deduplicar — as tarefas periódicas se multiplicam.","bloco":"B-O6R-08"},{"id":"Ω6R-ARQ-003","severidade":"P1","modulo":"field-ops-realtime","status":"ativo","resumo":"As atualizações em tempo real vivem na memória de um processo só; com mais de uma máquina, parte dos usuários não recebe.","bloco":"B-O6R-08"},{"id":"Ω6R-ARQ-004","severidade":"P1","modulo":"field-dispatch","status":"ativo","resumo":"Despacho e o evento que o registra são gravados separados: falha no meio deixa despacho sem rastro.","bloco":"B-O6R-09"},{"id":"Ω6R-DIN-006","severidade":"P0","modulo":"jobs / charging / impound / notifications","status":"fechado","resumo":"O executor de tarefas de fundo nunca subia em produção: diárias de pátio, reconciliação de custódia e notificações legais não aconteciam.","bloco":"B-O6R-05"},{"id":"Ω6R-PERF-001","severidade":"P1","modulo":"infra/jobs","status":"ativo","resumo":"O executor inicia uma tarefa sem esperar a anterior e não tem prazo máximo — uma tarefa travada trava a fila.","bloco":"B-O6R-08"},{"id":"Ω6R-PERF-002","severidade":"P1","modulo":"frontend / API client","status":"ativo","resumo":"A tela recarrega sem travar chamadas em andamento e sem tempo limite; conexão ruim empilha requisições.","bloco":"B-O6R-10"},{"id":"Ω6R-PERF-003","severidade":"P1","modulo":"owner-portal / runtime","status":"ativo","resumo":"Processamento de imagem grande roda no mesmo processo do sistema; três simultâneas podem derrubar a resposta.","bloco":"B-O6R-10"},{"id":"Ω6R-QUA-001","severidade":"P1","modulo":"mobile-flutter / expense-management","status":"ativo","resumo":"O aplicativo reenvia despesas sem credencial, num endereço que exige permissão — o reenvio falha calado.","bloco":"B-O6R-03"},{"id":"Ω6R-QUA-002","severidade":"P1","modulo":"mobile-flutter / mobile-inventory / inventory","status":"ativo","resumo":"Estoque no aplicativo enfileira tipos incompatíveis e não tem reenvio — movimentação feita offline pode se perder.","bloco":"B-O6R-04"},{"id":"Ω6R-DIN-007","severidade":"P0","modulo":"cloud-costs","status":"fechado","resumo":"O resumo de custos de nuvem somava apenas as primeiras 10.000 linhas, em silencio — e a linha cortada era a mais recente. Agora a soma e feita no banco, sem teto, com o valor exato publicado ao lado do arredondado.","bloco":"B-O6R-06"},{"id":"Ω6R-QUA-003","severidade":"P1","modulo":"financial-entries / cheques / period-close / expenses","status":"fechado","resumo":"Os testes financeiros usam banco de mentira: atomicidade e concorrência nunca foram exercitadas.","bloco":"B-O6R-02"},{"id":"Ω6R-DIN-008","severidade":"P0","modulo":"financial-period-closes / financial writers","status":"fechado","resumo":"O fechamento de período usa trava, mas quem escreve não a respeita: dá para lançar depois do período fechado.","bloco":"B-O6R-02"},{"id":"Ω6R-DIN-009","severidade":"P0","modulo":"expense-management","status":"ativo","resumo":"Sincronização de despesa grava o efeito antes do comprovante, em transações separadas; falha no meio deixa despesa sem comprovante.","bloco":"B-O6R-03"},{"id":"Ω6R-DAT-002","severidade":"P0","modulo":"inventory","status":"ativo","resumo":"Saldo de estoque: duas movimentações simultâneas do mesmo item não se serializam — o saldo pode ficar errado.","bloco":"B-O6R-04"},{"id":"Ω6R-DAT-003","severidade":"P0","modulo":"inventory / cycle-count","status":"ativo","resumo":"Contagem de inventário: cada ajuste do fechamento grava separado, sem travar a sessão — fechamento concorrente corrompe a contagem.","bloco":"B-O6R-04"},{"id":"Ω6R-QUA-004","severidade":"P1","modulo":"mobile-flutter / work-orders","status":"parcialmente_superado","resumo":"O aplicativo lia a resposta da ordem de serviço no formato errado; a linha do tempo remota nunca funcionou.","bloco":"B-O6R-11"},{"id":"Ω6R-QUA-005","severidade":"P1","modulo":"mobile-flutter / prestador","status":"ativo","resumo":"O aplicativo enfileira sem esperar a gravação e reescreve a fila inteira a cada item.","bloco":"B-O6R-11"},{"id":"Ω6R-SEC-003","severidade":"P1","modulo":"auth","status":"fechado","resumo":"Senha errada não trava a conta: o contador sobe, mas nada nunca bloqueia — tentativa infinita.","bloco":"B-O6R-07"},{"id":"Ω6R-SEC-004","severidade":"P1","modulo":"evidence / attachments / mobile","status":"parcialmente_superado","resumo":"O antivirus de anexo devolvia “limpo” por padrao e o tipo do arquivo vinha do cliente; anexo malicioso abria no navegador. Superado em producao/staging e no tipo (sniff de assinatura nas 5 vias + download `attachment` com tipo dos bytes); resta o antivirus real, que e servico externo.","bloco":"B-O6R-07b"},{"id":"Ω6R-DAT-004","severidade":"P1","modulo":"jurisdiction / charging","status":"ativo","resumo":"Editar o perfil normativo re-tempera custódias em curso, sem versão nem vigência, e a auditoria não registra o que mudou.","bloco":"B-O6R-12"},{"id":"Ω6R-DIN-010","severidade":"P0","modulo":"financial-entries / financial-titles","status":"fechado","resumo":"DELETE de um lançamento de LIQUIDAÇÃO é aceito: o caixa volta e o título continua com paid_amount > 0","bloco":"B-O6R-02"},{"id":"Ω6R-DIN-011","severidade":"P0","modulo":"cheques / financial-entries","status":"fechado","resumo":"O lançamento de COMPENSAÇÃO de um cheque pode ser estornado (ou apagado) pela superfície de lançamentos sem que o cheque saia de 'cleared'","bloco":"B-O6R-02"}]},"roadmap":{"as_of":"2026-09-17","source":"docs/revisoes/O6R/PLANO_O6R.md + agent-orchestration/omega/juntas/J-CHK-04C-EMENDA-deliberacao-j6r.md","ordem_vinculante":["B-O6R-05","B-O6R-01","B-O6R-02","B-O6R-07","B-O6R-06"],"blocos":[{"id":"B-O6R-01","titulo":"Identidade e autoridade","achados":["Ω6R-SEC-001","Ω6R-TEN-001"],"dep":[],"estado":"concluido","nota":"Mergeado em 2026-08-19. TRÊS ciclos: 1 reprovado (6 bloqueantes), 2 vetado (batch 33% vermelho na forma do job), 3 aprovado 5×0 sem veto. Dez instâncias de \"o artefato afirma o que a execução não produz\", todas nascidas em correções.","pr":357},{"id":"B-O6R-02","titulo":"Atomicidade do financeiro","achados":["Ω6R-DIN-001","Ω6R-DIN-002","Ω6R-DIN-003","Ω6R-DIN-004","Ω6R-DIN-008","Ω6R-QUA-003","Ω6R-DIN-010","Ω6R-DIN-011"],"dep":["B-O6R-01"],"estado":"concluido","pr":371,"nota":" [SAN3 (PR #386): concluido — os achados do bloco fecharam no #371 (ciclo 5); o a_fazer era o painel congelado (P-KPI-ROADMAP-CONGELADO).]"},{"id":"B-O6R-03","titulo":"Sincronização de despesas","achados":["Ω6R-DIN-009","Ω6R-QUA-001"],"dep":["B-O6R-01"],"estado":"a_fazer"},{"id":"B-O6R-04","titulo":"Consistência de estoque","achados":["Ω6R-DAT-002","Ω6R-DAT-003","Ω6R-QUA-002"],"dep":["B-O6R-01"],"estado":"a_fazer"},{"id":"B-O6R-05","titulo":"Portões de runtime de produção","achados":["Ω6R-DAT-001","Ω6R-DIN-006"],"dep":[],"estado":"concluido","pr":353,"nota":"Mergeado em 2026-08-15. Junta do PR 3×0, sem veto."},{"id":"B-O6R-06","titulo":"Durabilidade do faturamento","achados":["Ω6R-DIN-005","Ω6R-DIN-007"],"dep":["B-O6R-02","B-O6R-05"],"estado":"concluido","pr":385,"nota":"Mergeado em 2026-09-11 (PR #385, 15ef3fbe). Entregue em 2026-09-07 (PR na autoria). Captura transacional da unidade faturavel com chave da RUN + SUM/GROUP BY no banco + base de rateio lida da tabela duravel sob contexto RLS por tenant. O parametro `billing` obrigatorio sem default fecha o conjunto de chamadores pelo compilador. RESIDUAL NOMEADO: o script de reconciliacao NAO foi entregue (bloqueado pelo achado R2-A do critico — refaturaria a trilha de divergencia do mobile): P-O6R-B06-RECONCILE-BLOQUEADO."},{"id":"B-O6R-07","titulo":"Autorização e anexos","achados":["Ω6R-SEC-002","Ω6R-SEC-003","Ω6R-SEC-004"],"dep":["B-O6R-01"],"estado":"parcial","nota":" [SAN3 (PR #386): parcial — 07a (#369) e 07b (#380) mergearam; SEC-003 fechado; SEC-002 e SEC-004 seguem com residual (B-O6R-07c e B-AV-REAL).]"},{"id":"B-O6R-08","titulo":"Tarefas duráveis e tempo real","achados":["Ω6R-ARQ-001","Ω6R-ARQ-002","Ω6R-ARQ-003","Ω6R-PERF-001"],"dep":["B-O6R-05"],"estado":"a_fazer"},{"id":"B-O6R-09","titulo":"Despacho atômico","achados":["Ω6R-ARQ-004"],"dep":["B-O6R-08"],"estado":"a_fazer"},{"id":"B-O6R-10","titulo":"Proteção de carga no cliente","achados":["Ω6R-PERF-002","Ω6R-PERF-003"],"dep":["B-O6R-05"],"estado":"a_fazer"},{"id":"B-O6R-11","titulo":"Contratos do aplicativo de campo","achados":["Ω6R-QUA-004","Ω6R-QUA-005"],"dep":["B-O6R-01"],"estado":"a_fazer"},{"id":"B-O6R-12","titulo":"Versão do perfil normativo","achados":["Ω6R-DAT-004"],"dep":[],"estado":"a_fazer","nota":"Acrescentado ao plano em 2026-08-16. O achado nasceu depois da junta da auditoria e ficou sem bloco de correção — a lacuna foi encontrada pelo guard de paridade, na primeira execução. Critério de aceite provisório, a ser ratificado pela junta do próprio bloco."}],"trilha_bloqueada":{"titulo":"Trilha de vistorias","itens":[{"id":"CHK-04c-B","titulo":"Aba de aplicabilidade e ajuste no envio"},{"id":"CHK-05a","titulo":"Versão da vistoria no dossiê do veículo"},{"id":"CHK-06","titulo":"Impressão da vistoria"}],"bloqueada_por":["B-O6R-07"],"fonte":"A deliberação da junta veda features nos módulos atingidos enquanto houver achado crítico aberto neles.","nota":"B-O6R-06 retirado em 2026-09-12 (SAN3, PR #386, ciclo 2 — C3-06): mergeado no PR #385 (15ef3fbe, 2026-09-11); a pendência-mãe P-O6R-B06 está FECHADA."}},"recent":{"as_of":"2026-09-20","source":"git log main + agent-orchestration/omega/juntas/","itens":[{"pr":390,"data":"2026-09-18","tipo":"seguranca","titulo":"Cada papel ve e faz o que a matriz de papeis diz","resumo":"O Financeiro passa a ler ordens de servico, clientes e servicos e volta a ver Financeiro, Cobrancas e Pagamentos; o auditor deixa de receber acesso negado numa base nova; o Estoque ganha menu proprio; o Gestor deixa de responder e dar ciencia em vistorias, como a matriz manda. Onde a matriz pede escopo que o sistema ainda nao aplica, nada foi liberado — virou pendencia com dono."},{"pr":387,"data":"2026-09-17","tipo":"correcao_critica","titulo":"A web para de inventar ordem de serviço quando o servidor recusa","resumo":"Lista vazia aparecia como seis ordens falsas com um aviso de \"sem conexão\"; uma ordem recusada pelo servidor virava uma ordem de mentira e o que o operador tinha digitado se perdia; um detalhe inexistente mostrava outra ordem. Agora o erro aparece como erro, o vazio como vazio, o formulário guarda o que foi digitado — e o mesmo conserto vale para os despachos. Na segunda rodada de correção, os avisos de erro, de falta de permissão e de lista vazia ganharam o desenho do protótipo e se distinguem a olho, e a regra ficou blindada contra novas formas de inventar dado. PR na autoria."},{"pr":386,"data":"2026-09-11","tipo":"auditoria","titulo":"Inventario completo e o plano ate a versao vendavel","resumo":"Todas as pendencias do registro foram conferidas contra o codigo: 52 tinham o estado errado e 49 nem existiam no registro. O gate da versao vendavel ficou com 56 bloqueantes em 37 blocos (plano v5), mais 6 atos que dependem do dono; o prazo de 48 h nao cabe, e isso ficou registrado sem cortar escopo."},{"pr":385,"data":"2026-09-11","tipo":"correcao_critica","titulo":"A cobranca de uso da vistoria nao se perde mais","resumo":"A unidade que gera cobranca da vistoria passou a nascer junto com a vistoria, na mesma transacao: ou as duas existem, ou nenhuma. E o resumo de custo de nuvem passou a somar tudo no banco — antes parava em 10.000 linhas, cortando justamente a mais recente."},{"pr":381,"data":"2026-09-08","tipo":"auditoria","titulo":"O auditor de agentes para de adivinhar","resumo":"O verificador do elenco de agentes e skills encolheu ate o que da para checar com seguranca e passou a recusar, com nome, o que nao sabe medir. Sairam do diretorio vivo as cadeiras de junta de blocos ja encerrados."},{"pr":380,"data":"2026-09-07","tipo":"seguranca","titulo":"Todo upload passa por um portao unico","resumo":"Os cinco caminhos de envio de arquivo passaram por uma checagem unica: o tipo e conferido pelos bytes, nao pelo que o cliente diz, e o download sai sem executar conteudo. Efeito declarado: sem antivirus real, producao e homologacao recusam upload ate o bloco B-AV-REAL."},{"pr":371,"data":"2026-09-05","tipo":"correcao_critica","titulo":"O razao financeiro deixa de fabricar dinheiro","resumo":"Pagamento, estorno, cheque e fechamento de periodo passaram a acontecer numa unidade atomica por organizacao, com trava de linha. Fecharam 7 defeitos criticos de dinheiro — dois deles achados pela propria junta do bloco."},{"pr":369,"data":"2026-09-04","tipo":"seguranca","titulo":"O tecnico nao aprova mais a propria ordem","resumo":"Aprovar e rejeitar ganharam permissao propria, separada de editar OS, com separacao de funcoes e escopo por objeto; o bloqueio de conta por tentativas virou atomico. Ficou um residuo nomeado: dez caminhos de subrecurso da OS (bloco B-O6R-07c)."},{"pr":null,"data":"2026-09-08","tipo":"auditoria","titulo":"Rodada de governanca e registro (21 PRs, #360 a #384)","resumo":"Entre os blocos de produto, 21 PRs de governanca e registro: a junta passou a sobreviver a queda de quem a executa, as identidades de jurado queimadas viraram registro, o arnes de teste ganhou medicoes proprias, o registro passou a dizer o que a execucao diz e o caminho da sessao ate o repositorio foi fechado."},{"pr":359,"data":"2026-08-28","tipo":"qualidade","titulo":"O arnes de teste deixa de mentir sobre o proprio numero","resumo":"A suite passou a ter UM mecanismo de escrita de catalogo do Postgres — antes tres arquivos escreviam por fora e 7 de 13 rodadas ficavam vermelhas por disputa, inclusive derrubando quem respeitava o mecanismo. Agora sao 13 de 13, com o mesmo total em todas. O teardown deixou de poder abandonar usuario de banco com permissao de escrita: 10 rodadas completas terminaram com zero residuo, contra dois abandonados antes. E o runner passou a recusar o verde quando um arquivo de teste some sem avisar: em vez de publicar um total menor e plausivel, ele fica vermelho e diz QUAL arquivo sumiu."},{"pr":null,"data":"2026-08-18","tipo":"seguranca","titulo":"Identidade global: o e-mail deixa de decidir quem você é","resumo":"Fecha os dois piores achados da auditoria: administrador de organização não se promove mais a plataforma (allowlist fechada por construção) e a troca de organização passa a exigir VÍNCULO provado por credencial — homônimos deixam de virar a mesma pessoa. Login sem organização refeito (a senha decide), religação e desvínculo em autosserviço com revogação real de sessões, trilha append-only ilegível por organização e a luz login_without_org no readiness. Transações centrais provadas sob role NÃO-superusuário — a única configuração em que o isolamento existe.","fecha":["Ω6R-SEC-001","Ω6R-TEN-001"],"descobertos":[],"ciclos_de_reprovacao":0},{"pr":355,"data":"2026-08-16","tipo":"correcao","titulo":"A bateria de testes local passa a ser igual à da integração contínua","resumo":"O arquivo de ambiente do repositório fixava banco real e sequestrava a bateria local: 90 vermelhos falsos só na máquina do dono, e nenhum deles era defeito. O risco maior não era o vermelho — era alguém aprender a ignorá-lo. Agora o executor resolve o modo e o declara em uma linha.","fecha":[],"descobertos":[],"ciclos_de_reprovacao":0},{"pr":354,"data":"2026-08-15","tipo":"infraestrutura","titulo":"O ambiente de homologação deixa de dormir","resumo":"Escalar a zero era barato e silenciosamente errado: com a máquina dormindo, as tarefas de fundo não rodam — diárias de pátio, reconciliação de custódia e notificações legais não aconteceriam. O ambiente diria “verde” sem nunca ter executado uma tarefa. Custo autorizado pelo dono.","fecha":[],"descobertos":[],"ciclos_de_reprovacao":0},{"pr":353,"data":"2026-08-15","tipo":"correcao_critica","titulo":"Produção não sobe mais sem persistir e sem executor de tarefas","resumo":"Dois dos quinze achados críticos, fechados com portões que reprovam a subida em vez de avisar. Provisionar homologação pela lista antiga teria o boot reprovado por cinco itens que existiam no código e não estavam documentados.","fecha":["Ω6R-DAT-001","Ω6R-DIN-006"],"descobertos":[],"ciclos_de_reprovacao":0},{"pr":352,"data":"2026-08-15","tipo":"feature","titulo":"A ordem de serviço passa a ter um conjunto de vistorias","resumo":"Quatro ciclos de reprovação adversarial antes de passar. O terceiro ciclo inverteu o erro do segundo em vez de corrigir a raiz, e o comentário do código afirmava uma garantia que o código não dava. A quarta versão parou de inferir e passou a perguntar.","fecha":[],"descobertos":["Vistoria pendente não é lida na expedição","Razão de recusa não normalizada na criação","Verde vazio da bateria no Windows"],"ciclos_de_reprovacao":4},{"pr":347,"data":"2026-08-14","tipo":"auditoria","titulo":"Auditoria adversarial total — 30 achados catalogados","resumo":"Auditoria encomendada pelo próprio time, não por incidente. Veredito da junta: reprovado para produção, 5×0. Quinze achados críticos, quinze relevantes, cada um com módulo, evidência e bloco de correção.","fecha":[],"descobertos":["30 achados (15 críticos, 15 relevantes)"],"ciclos_de_reprovacao":0},{"pr":351,"data":"2026-08-12","tipo":"correcao","titulo":"A linha do tempo remota da ordem de serviço nunca funcionou","resumo":"O aplicativo de campo lia a resposta num formato que o servidor nunca enviou. Passava nos testes porque os testes usavam o formato errado dos dois lados. Fechou o componente da linha do tempo; detalhe, status e atribuição do mesmo achado seguem abertos — o achado é PARCIALMENTE superado, não fechado.","fecha":[],"descobertos":[],"ciclos_de_reprovacao":0,"superado_parcialmente":["Ω6R-QUA-004"]}]},"series_breaks":{"as_of":"2026-08-17","source":"Kpis/kpis-history.json — os dois casos estão descritos no campo description do próprio registro","nota":"Pontos em que a RÉGUA mudou: ou a métrica passou a medir outra coisa, ou ficou sem ser relida enquanto o trabalho acontecia. Nos dois casos, ligar os lados com uma linha contínua afirmaria um crescimento de um dia que não houve. Declarado aqui, e não inferido por tamanho do salto, porque salto grande também pode ser trabalho real de verdade.","itens":[{"serie":"backend_tests","data":"2026-07-13","de":15,"para":766,"motivo":"A medida passou a contar a suíte de backend INTEIRA. Antes contava só o núcleo do sistema — os outros 100 arquivos de teste já existiam e não entravam na conta."},{"serie":"frontend_smoke_tests","data":"2026-07-13","de":44,"para":378,"motivo":"O 44 era a contagem completa e real em 05/07 — a suíte do console web tinha 5 arquivos. Entre 05/07 e 13/07 nenhuma entrega releu a métrica: quatro registros repetiram o 44 enquanto a suíte crescia para 62 arquivos. O 378 é a releitura. O salto é trabalho real que a régua só registrou no fim."}]}};
+var FROZEN = {"snapshot_date":"2026-10-02","version":"B-SAN3-01b","source":"Kpis/kpis-latest.json","scope":"root_project_kpis_reflecting_mobile_and_web","release":{"block":"B-SAN3-01b (frontend; bloco de guarda do gate SAN3, bloqueante por D-SAN3-01-MERGE-COM-BLOCO-DE-GUARDA; não move item do §4.1 do PLANO_SAN3.md — o item 4 já estava fechado pelo B-SAN3-01): a web não fabrica dado — a guarda passa a valer por alcance e pelo estado da página.","title":"A web não fabrica dado: a guarda vale por alcance e pelo estado da página","pr":402,"merge_commit":"3e40a256ce801a8e63230b4b764ba1d2803f4f23","approved_head":"cdf370dcb4c817e1c4292aed1204140951616971","status":"published_per_pr","summary":"B-SAN3-01b — transforma em garantia executável as duas propriedades que o B-SAN3-01 deixou verdadeiras só no código (decisão do dono `D-SAN3-01-MERGE-COM-BLOCO-DE-GUARDA`) e fecha quatro pendências: (i) `frontend/tests/work-orders-page-live.test.tsx` (novo, 13 casos) monta a `WorkOrdersPage` REAL com o hook REAL rodando efeitos sobre um DOM mínimo escrito no próprio teste (zero dependência), com os BYTES do backend na borda (`fetch`): 403 → `forbidden`, 500 → `error`, 200 vazio → `empty` embutido, 200×3 → linhas e KPIs, pendente → esqueletos, 403 em 2º plano → `forbidden` sem faixa; `[W1]`/`[W2]` por COMPORTAMENTO (falha em 2º plano mantém o dado com a faixa `stale`, lista e detalhe) — as mutações `N-PG-PAINEL`, `N-PG-KPI`, `N-W1TXT`, `N-W2TXT` ficam vermelhas sem tocar hook nenhum; (ii) o guard `[G1]` de `work-orders-honest-errors.test.tsx` passa a resolver re-export em profundidade ARBITRÁRIA (barrel de N níveis, re-export local, `default`, namespace, `import()`), varre o FECHO de import das raízes e o arquivo de fronteira `useServiceQuoteReferences.ts`, com denominadores e sítio sabido; `[G1b]` novo pega entidade fabricada inline (`id`/`code` constante em `catch`/`.catch(`/`??`/`||`); `[G2]` com 29 formas virtuais, `[G3]` em disco — `N-BARREL2`, `N-BARREL3`, `N-LITERAL`, `N-FORA-RAIZ` ficam vermelhas; (iii) os cabeçalhos de `dispatches.service.ts`, `repository.ts` e `useServiceQuoteReferences.ts` dizem o que o guard prova E o que não prova (só comentário); (iv) o botão \"Nova OS\" do cabeçalho só aparece com `work_orders:create` — a régua da rota `POST /work-orders` — provado papel a papel com os 13 papéis de `ROLE_PERMISSIONS` executado (vermelho-controle no head-base: 7 papéis viam o botão). Fecha `P-SAN3-01B-PAGINA-NAO-AMARRADA-AO-ESTADO`, `P-SAN3-01B-GUARD-ALCANCE-MENOR-QUE-AS-RAIZES`, `P-SAN3-01B-VIGIA-TEXTUAL-DA-FIACAO`, `P-SAN3-01-NOVA-OS-SEM-GATE-NO-BOTAO`; abre com dono `P-SAN3-01B-FIACAO-DO-CREATE-TEXTUAL` (B-SAN3-10), `P-SAN3-01B-PAGINA-FIACAO-DE-INTERACAO` (fila pós-gate), `P-SAN3-01B-GUARD-DE-ROTA-COM-ATALHO-DE-PLATAFORMA` (B-SAN3-06a). `frontend_smoke_tests` da EXECUÇÃO REAL: 1202 → 1214 (+13 arquivo vivo, +1 `[G1b]`, −2 `[W1]`/`[W2]` movidos), bloco 79/79, Node 22 e Node 20; demais trilhas CARREGADAS com nota (§C3.3); `mvp_*` intocados (§C3.4); `blocks_completed` 169 -> 170. Nenhuma rota, payload, tipo ou migração muda; `src/` e `prisma/` intocados.","backfill_note":"`pr` é `null` NA AUTORIA (o PR é aberto pelo orquestrador depois desta tarefa de nuvem) e é preenchido após `gh pr create`; `merge_commit`/`approved_head` são `null` NA AUTORIA por contrato (§C3.5) e recebem backfill pós-merge (`approved_head` = o objeto que a JUNTA julgou, lido da ata). Nenhum backfill devido por este PR: a entrada do #397 já tem `merge_commit 513937b0…` e `approved_head 67c2c280…`, pagos pelo registro #398 (`5bcdcc58`). Se outro PR mergear antes, `blocks_completed` se RECONTA no pré-merge a partir da `main` de então. As quatro métricas com nota de PR anterior (`backend_contract_tests_focused`, `flutter_modules`, `mobile_backend_contracts`, `mobile_core_saas_contracts`) seguem sob `P-KPI-NOTAS-CARREGADAS-REGRESSAO-392` (dono #393) — este PR não as toca. BACKFILL PAGO pelo registro do #402 (docs/registro-402): `pr 402`, `merge_commit 3e40a256…` (squash; a árvore do merge é a do head final do PR, `1483a6f7`, que é o head aprovado `cdf370dc` mais a ata e os votos), `approved_head cdf370dc…` lido da ata `J-B-SAN3-01b.md`."},"metrics":{"flutter_tests":{"value":864,"total":864,"display":"864/864","note":"[B-SAN3-01b §C3.3 (2026-10-02): valor CARREGADO, SEM reexecução — este PR não toca `src/`, `tests/` da raiz nem `mobile/` (`git diff --name-only origin/main...HEAD -- src tests mobile prisma` → vazio; o diff do PR é `frontend/**` (página, 2 testes, 3 cabeçalhos, lista do smoke), `Kpis/**` e registro (`agent-orchestration/**`, `docs/revisoes/SAN3/`)). Último valor oficial: 864/864, publicado pelo `B-SAN3-00` (#392) e carregado pelos #394 e #397.]"},"frontend_smoke_tests":{"value":1214,"total":1214,"display":"1214/1214","note":"[B-SAN3-01b §C3.3 (2026-10-02): EXECUÇÃO REAL no head do PR — `npm --prefix frontend run test:smoke` → `# tests 1214 # pass 1214 # fail 0 # skipped 0`, em Node 22.22.0 E em Node 20.20.0 (paridade com a CI, `node-version: 20`). 1202 → 1214 = +13 (`tests/work-orders-page-live.test.tsx`, novo: página REAL + hook REAL sobre DOM mínimo) +1 (`[G1b]`, entidade fabricada inline) −2 (`[W1]`/`[W2]` saem de `work-orders-honest-errors.test.tsx` e viram comportamento no arquivo vivo). Bloco (os 2 arquivos): 79/79 (13 + 66). Vermelho-controle no head-base: 11/13 no arquivo vivo (`[GB1]`/`[GB2]` vermelhos, 7 papéis). Relatório: agent-orchestration/omega/juntas/votos/B-SAN3-01b/DEV-relatorio.md]"},"backend_tests":{"value":3052,"total":3054,"display":"3052/3054","note":"[B-SAN3-01b §C3.3 (2026-10-02): valor CARREGADO, SEM reexecução — este PR não toca `src/`, `tests/` da raiz nem `mobile/` (`git diff --name-only origin/main...HEAD -- src tests mobile prisma` → vazio; o diff do PR é `frontend/**` (página, 2 testes, 3 cabeçalhos, lista do smoke), `Kpis/**` e registro (`agent-orchestration/**`, `docs/revisoes/SAN3/`)). Último valor oficial: 3052/3054, publicado pelo `B-SAN3-00` (#392) e carregado pelos #394 e #397.]"},"backend_contract_tests_focused":{"value":34,"total":34,"display":"34/34","note":"[B-SAN3-04a §C3.3 (2026-09-18): valor CARREGADO — este PR não toca `mobile/` (`git diff --name-only origin/main -- mobile` vazio); sem reexecução desta trilha neste PR.] [B-O6R-06 §C3.3 (2026-09-11): valor CARREGADO — este PR nao toca `mobile/` nem `frontend/`: arvores identicas entre o head julgado 0f0a872a e o head do delta e26eb9e5 (mobile `3a2ac028`, frontend `24be761e`, medido pela cadeira C3 por `git rev-parse <ref>:<path>`); sem reexecucao desta trilha neste PR. O marcador anterior nomeava B-GOV-ELENCO/SAN2-4b, blocos anteriores.] Bateria focada do B-O6R-ARNES, execucao real, composicao declarada: 29 casos em tests/npm-test-runner-guard.test.ts (21 da base + 3 portados verbatim do guard de skip C5.3 + 5 do piso de denominador) + 5 em tests/db-catalog-write-guard.test.ts com DATABASE_URL presente (1 ratchet lexical + 4 casos -db novos: sonda de barreira sob o mecanismo unico, teardown resiliente com falha injetada, e as duas metades do sweep). Baseline da base era 22 (21 runner-guard + 1 ratchet); nenhum caso morreu; a meta M >= 31 do plano fica cumprida com 34. Sem DATABASE_URL os 4 casos -db nao rodam e o arquivo declara 1 pulo — declarado, nunca silencioso. [SAN2-2: valor CARREGADO — esta bateria focada e do B-O6R-ARNES e NAO foi reexecutada por este PR; a bateria focada do SAN2-2 sao os 12 casos de `tests/agents-mirror-guard.test.ts`, que ja entram contados em `backend_tests` (§C3.3).] [SAN2-3: valor CARREGADO — bateria focada do B-O6R-ARNES, nao reexecutada aqui (§C3.3); o PR nao toca `tests/` nem `scripts/`.] [SAN2-4a: valor CARREGADO — bateria focada do B-O6R-ARNES, nao reexecutada aqui (§C3.3); o PR nao toca `tests/` nem `scripts/`.] [SAN2-4b: valor CARREGADO — o PR nao toca esta trilha; sem reexecucao (§C3.3). Prova medida nas DUAS pontas (commitado e arvore de trabalho): `git diff --name-only 45c3b97...HEAD` e `git status --porcelain` sobre `mobile/` e `frontend/` saem VAZIOS. O diff de codigo deste bloco sao 5 arquivos: `src/modules/authority/authority-password.ts` e quatro em `tests/`.] \n[SAN2-5: valor CARREGADO — o bloco nao toca contratos nem `src/`; sem reexecucao (§C3.3). A nota acima descreve execucao de bloco anterior, NAO deste PR.] \n[SAN2-6: valor CARREGADO — o bloco nao toca contratos REST nem `src/`; sem reexecucao (§C3.3). A nota acima descreve execucao de bloco anterior, NAO deste PR.] \n[B-O6R-07a: valor CARREGADO — bateria focada do B-O6R-ARNES, NAO reexecutada aqui (§C3.3); este PR nao toca `scripts/` nem os dois arquivos que a compoem. A bateria focada DESTE bloco sao os 36 casos dos 7 arquivos `tests/o6r07a-*.test.ts`, que ja entram contados em `backend_tests`.] [B-O6R-02 ciclo 5: valor CARREGADO — a bateria focada do #359 mede arquivos que este PR nao alterou; sem reexecucao (§C3.3). O que este bloco reexecutou esta em `backend_tests`, com N e forma.] [B-O6R-07b: valor CARREGADO — o ultimo valor oficial, NAO reexecutado por este PR (§C3.3). O bloco e backend-only: fecha o Omega6R-SEC-004 em src/modules/{evidence,attachments,checklists,damages,work-orders,mobile} e em tests/. Prova medida nas DUAS pontas: `git diff --name-only origin/main...HEAD -- frontend/ mobile/` e `git status --porcelain -- frontend/ mobile/` saem os DOIS VAZIOS. `npm --prefix frontend run check` e `npm --prefix frontend run build` rodaram VERDES (ec=0) como regressao, sem mover a contagem de smoke. A nota acima descreve execucao de bloco anterior, NAO deste PR.] [B-GOV-ELENCO-ENXUTO: valor CARREGADO — o ultimo valor oficial, NAO reexecutado por este PR (§C3.3). O diff deste bloco nao toca `src/`, `tests/`, `prisma/`, `frontend/` nem `mobile/`: sao 5 arquivos — `scripts/audit-agents-skills.mjs`, `Kpis/kpis-latest.json`, `Kpis/kpis-history.json`, `Kpis/kpis-history.md`, `Kpis/app.js` — mais 3 de registro em `agent-orchestration/`. Prova medida nas DUAS pontas: `git diff --name-only <base>...HEAD -- src/ tests/ prisma/ frontend/ mobile/` e `git status --porcelain -- src/ tests/ prisma/ frontend/ mobile/` saem os DOIS VAZIOS. A nota acima descreve execucao de bloco anterior, NAO deste PR.]"},"flutter_modules":{"value":17,"total":17,"display":"17/17","note":"[B-SAN3-04a §C3.3 (2026-09-18): valor CARREGADO — este PR não toca `mobile/` (`git diff --name-only origin/main -- mobile` vazio); sem reexecução desta trilha neste PR.] [B-O6R-06 §C3.3 (2026-09-11): valor CARREGADO — este PR nao toca `mobile/` nem `frontend/`: arvores identicas entre o head julgado 0f0a872a e o head do delta e26eb9e5 (mobile `3a2ac028`, frontend `24be761e`, medido pela cadeira C3 por `git rev-parse <ref>:<path>`); sem reexecucao desta trilha neste PR. O marcador anterior nomeava B-GOV-ELENCO/SAN2-4b, blocos anteriores.]  [SAN2-4b: valor CARREGADO — o PR nao toca esta trilha; sem reexecucao (§C3.3). Prova medida nas DUAS pontas (commitado e arvore de trabalho): `git diff --name-only 45c3b97...HEAD` e `git status --porcelain` sobre `mobile/` e `frontend/` saem VAZIOS. O diff de codigo deste bloco sao 5 arquivos: `src/modules/authority/authority-password.ts` e quatro em `tests/`.] \n[B-O6R-07a: valor CARREGADO — o ultimo valor oficial, NAO reexecutado por este PR (§C3.3). O bloco corrige autorizacao e autenticacao no backend: o diff nao toca `frontend/` nem `mobile/`, provado nas DUAS pontas (`git diff --name-only origin/main...HEAD -- frontend/ mobile/` e `git status --porcelain` saem os DOIS VAZIOS). `npm --prefix frontend run check` e `npm --prefix frontend run build` rodaram VERDES (`ec=0`) como regressao, sem mover a contagem de smoke. A nota acima descreve execucao de bloco anterior, NAO deste PR.] [B-O6R-07b: valor CARREGADO — o ultimo valor oficial, NAO reexecutado por este PR (§C3.3). O bloco e backend-only: fecha o Omega6R-SEC-004 em src/modules/{evidence,attachments,checklists,damages,work-orders,mobile} e em tests/. Prova medida nas DUAS pontas: `git diff --name-only origin/main...HEAD -- frontend/ mobile/` e `git status --porcelain -- frontend/ mobile/` saem os DOIS VAZIOS. `npm --prefix frontend run check` e `npm --prefix frontend run build` rodaram VERDES (ec=0) como regressao, sem mover a contagem de smoke. A nota acima descreve execucao de bloco anterior, NAO deste PR.] [B-GOV-ELENCO-ENXUTO: valor CARREGADO — o ultimo valor oficial, NAO reexecutado por este PR (§C3.3). O diff deste bloco nao toca `src/`, `tests/`, `prisma/`, `frontend/` nem `mobile/`: sao 5 arquivos — `scripts/audit-agents-skills.mjs`, `Kpis/kpis-latest.json`, `Kpis/kpis-history.json`, `Kpis/kpis-history.md`, `Kpis/app.js` — mais 3 de registro em `agent-orchestration/`. Prova medida nas DUAS pontas: `git diff --name-only <base>...HEAD -- src/ tests/ prisma/ frontend/ mobile/` e `git status --porcelain -- src/ tests/ prisma/ frontend/ mobile/` saem os DOIS VAZIOS. A nota acima descreve execucao de bloco anterior, NAO deste PR.]"},"mvp_demo":{"value":99,"unit":"%","display":"99%","note":"Ω4 fechou o modulo Financeiro do tenant completo (Contas, Titulos AR/AP, Faturamento anti-refaturamento, Caixa/Extrato, Conciliacao, Fechamento com trava retroativa, Cheque, Dashboard real) sobre o hub da OS da Fase 1. +1 por escopo. Percentual estimado, sujeito a revisao humana. [SAN2-4b: INTOCADO — o PR nao move escopo: conserta arnes de teste e endurece um primitivo de autenticacao, sem entregar funcionalidade nova ao usuario (§C3.4).] [SAN2-6: INTOCADO — o bloco não move escopo de produto] [B-O6R-07a: INTOCADO — o bloco nao move escopo de produto (§C3.4): fecha defeito de autorizacao e autenticacao, sem entregar funcionalidade nova ao usuario.] [B-O6R-07b: INTOCADO — o bloco nao move escopo de produto (§C3.4): fecha defeito de SEGURANCA (verificacao de conteudo de upload e endurecimento do download), sem entregar funcionalidade nova ao usuario.] [B-GOV-ELENCO-ENXUTO: INTOCADO — o bloco nao move escopo de produto (§C3.4): encolhe uma ferramenta de governanca (o auditor de elenco e skills), sem entregar nem retirar funcionalidade ao usuario.] [SAN3 plano (PR #386): INTOCADO — o PR nao move escopo de produto (§C3.4). O inventario SAN3 (2026-09-11) mediu telas de menu e do console da plataforma exibindo dado inventado e fluxos do app sem porta de entrada (docs/revisoes/SAN3/PLANO_SAN3.md §4.1): este 99% e estimativa ANTERIOR ao inventario e sera recalculado no B-SAN3-10.]","label":"Escopo demonstrável entregue","caveat":"Também estimado, pela mesma régua."},"mvp_vendavel":{"value":88,"unit":"%","display":"88%","note":"Ω4 entregou o pilar Financeiro (AR/AP com chokepoint, faturamento idempotente, caixa/extrato, conciliacao, fechamento de periodo, cheque, dashboard agregado) — nucleo vendavel de gestao financeira. +5 por escopo. Percentual estimado, sujeito a revisao humana. [SAN2-4b: INTOCADO — o PR nao move escopo: conserta arnes de teste e endurece um primitivo de autenticacao, sem entregar funcionalidade nova ao usuario (§C3.4).] [SAN2-6: INTOCADO — o bloco não move escopo de produto] [B-O6R-07a: INTOCADO — o bloco nao move escopo de produto (§C3.4): fecha defeito de autorizacao e autenticacao, sem entregar funcionalidade nova ao usuario.] [B-O6R-07b: INTOCADO — o bloco nao move escopo de produto (§C3.4): fecha defeito de SEGURANCA (verificacao de conteudo de upload e endurecimento do download), sem entregar funcionalidade nova ao usuario.] [B-GOV-ELENCO-ENXUTO: INTOCADO — o bloco nao move escopo de produto (§C3.4): encolhe uma ferramenta de governanca (o auditor de elenco e skills), sem entregar nem retirar funcionalidade ao usuario.] [SAN3 plano (PR #386): INTOCADO — o PR nao move escopo de produto (§C3.4). MAS o gate da versao vendavel do plano SAN3 v5 (inventario de 2026-09-11 + junta do PR #386) tem 56 bloqueantes em 37 blocos e 6 atos que dependem do dono (docs/revisoes/SAN3/PLANO_SAN3.md §4). Este 88% e estimativa ANTERIOR ao inventario e sera recalculado no B-SAN3-10, o bloco que declara o gate.]","label":"Escopo do produto vendável entregue","caveat":"Percentual ESTIMADO, sujeito a revisão humana — não é medição. Mede escopo funcional construído; prontidão para produção é a outra dimensão do painel, medida ao lado."},"blocks_completed":{"value":170,"display":"170","note":"[B-SAN3-01b (2026-10-02): **169 -> 170**, contado a partir do valor publicado na `origin/main` (`4ab9d232`, #398 registro; o último PR que contou bloco foi o #397 = 169): +1 bloco de guarda do gate SAN3 entregue (frontend: 1 página, 2 arquivos de teste, 3 cabeçalhos, lista do smoke). Se outro PR mergear antes deste, RECONTA no pré-merge a partir da `main` de então.]"},"mobile_backend_contracts":{"value":18,"total":18,"display":"18/18","note":"[B-SAN3-04a §C3.3 (2026-09-18): valor CARREGADO — este PR não toca `mobile/` (`git diff --name-only origin/main -- mobile` vazio); sem reexecução desta trilha neste PR.] [B-O6R-06 §C3.3 (2026-09-11): valor CARREGADO — este PR nao toca `mobile/` nem `frontend/`: arvores identicas entre o head julgado 0f0a872a e o head do delta e26eb9e5 (mobile `3a2ac028`, frontend `24be761e`, medido pela cadeira C3 por `git rev-parse <ref>:<path>`); sem reexecucao desta trilha neste PR. O marcador anterior nomeava B-GOV-ELENCO/SAN2-4b, blocos anteriores.]  [SAN2-4b: valor CARREGADO — o PR nao toca esta trilha; sem reexecucao (§C3.3). Prova medida nas DUAS pontas (commitado e arvore de trabalho): `git diff --name-only 45c3b97...HEAD` e `git status --porcelain` sobre `mobile/` e `frontend/` saem VAZIOS. O diff de codigo deste bloco sao 5 arquivos: `src/modules/authority/authority-password.ts` e quatro em `tests/`.] \n[B-O6R-07a: valor CARREGADO — a metrica `contratos do app com o servidor` nao foi reexecutada e o PR nao toca `mobile/` (§C3.3). O que ESTE PR rodou, como regressao do contrato B-108, foi o arquivo `tests/mobile-backend-contracts.test.ts`: **25/25, fail 0, skipped 0, `ec=0`** — numero medido, publicado aqui como execucao de regressao e NAO promovido a valor da metrica, porque a regua dos 18/18 e outra e trocar a regua sem junta fabricaria uma quebra de serie.] [B-O6R-07b: valor CARREGADO — o ultimo valor oficial, NAO reexecutado por este PR (§C3.3). O bloco e backend-only: fecha o Omega6R-SEC-004 em src/modules/{evidence,attachments,checklists,damages,work-orders,mobile} e em tests/. Prova medida nas DUAS pontas: `git diff --name-only origin/main...HEAD -- frontend/ mobile/` e `git status --porcelain -- frontend/ mobile/` saem os DOIS VAZIOS. `npm --prefix frontend run check` e `npm --prefix frontend run build` rodaram VERDES (ec=0) como regressao, sem mover a contagem de smoke. A nota acima descreve execucao de bloco anterior, NAO deste PR.] [B-GOV-ELENCO-ENXUTO: valor CARREGADO — o ultimo valor oficial, NAO reexecutado por este PR (§C3.3). O diff deste bloco nao toca `src/`, `tests/`, `prisma/`, `frontend/` nem `mobile/`: sao 5 arquivos — `scripts/audit-agents-skills.mjs`, `Kpis/kpis-latest.json`, `Kpis/kpis-history.json`, `Kpis/kpis-history.md`, `Kpis/app.js` — mais 3 de registro em `agent-orchestration/`. Prova medida nas DUAS pontas: `git diff --name-only <base>...HEAD -- src/ tests/ prisma/ frontend/ mobile/` e `git status --porcelain -- src/ tests/ prisma/ frontend/ mobile/` saem os DOIS VAZIOS. A nota acima descreve execucao de bloco anterior, NAO deste PR.]"},"mobile_core_saas_contracts":{"value":21,"total":21,"display":"21/21","note":"[B-SAN3-04a §C3.3 (2026-09-18): valor CARREGADO — este PR não toca `mobile/` (`git diff --name-only origin/main -- mobile` vazio); sem reexecução desta trilha neste PR.] [B-O6R-06 §C3.3 (2026-09-11): valor CARREGADO — este PR nao toca `mobile/` nem `frontend/`: arvores identicas entre o head julgado 0f0a872a e o head do delta e26eb9e5 (mobile `3a2ac028`, frontend `24be761e`, medido pela cadeira C3 por `git rev-parse <ref>:<path>`); sem reexecucao desta trilha neste PR. O marcador anterior nomeava B-GOV-ELENCO/SAN2-4b, blocos anteriores.]  [SAN2-4b: valor CARREGADO — o PR nao toca esta trilha; sem reexecucao (§C3.3). Prova medida nas DUAS pontas (commitado e arvore de trabalho): `git diff --name-only 45c3b97...HEAD` e `git status --porcelain` sobre `mobile/` e `frontend/` saem VAZIOS. O diff de codigo deste bloco sao 5 arquivos: `src/modules/authority/authority-password.ts` e quatro em `tests/`.] \n[B-O6R-07a: valor CARREGADO — o ultimo valor oficial, NAO reexecutado por este PR (§C3.3). O bloco corrige autorizacao e autenticacao no backend: o diff nao toca `frontend/` nem `mobile/`, provado nas DUAS pontas (`git diff --name-only origin/main...HEAD -- frontend/ mobile/` e `git status --porcelain` saem os DOIS VAZIOS). `npm --prefix frontend run check` e `npm --prefix frontend run build` rodaram VERDES (`ec=0`) como regressao, sem mover a contagem de smoke. A nota acima descreve execucao de bloco anterior, NAO deste PR.] [B-O6R-07b: valor CARREGADO — o ultimo valor oficial, NAO reexecutado por este PR (§C3.3). O bloco e backend-only: fecha o Omega6R-SEC-004 em src/modules/{evidence,attachments,checklists,damages,work-orders,mobile} e em tests/. Prova medida nas DUAS pontas: `git diff --name-only origin/main...HEAD -- frontend/ mobile/` e `git status --porcelain -- frontend/ mobile/` saem os DOIS VAZIOS. `npm --prefix frontend run check` e `npm --prefix frontend run build` rodaram VERDES (ec=0) como regressao, sem mover a contagem de smoke. A nota acima descreve execucao de bloco anterior, NAO deste PR.] [B-GOV-ELENCO-ENXUTO: valor CARREGADO — o ultimo valor oficial, NAO reexecutado por este PR (§C3.3). O diff deste bloco nao toca `src/`, `tests/`, `prisma/`, `frontend/` nem `mobile/`: sao 5 arquivos — `scripts/audit-agents-skills.mjs`, `Kpis/kpis-latest.json`, `Kpis/kpis-history.json`, `Kpis/kpis-history.md`, `Kpis/app.js` — mais 3 de registro em `agent-orchestration/`. Prova medida nas DUAS pontas: `git diff --name-only <base>...HEAD -- src/ tests/ prisma/ frontend/ mobile/` e `git status --porcelain -- src/ tests/ prisma/ frontend/ mobile/` saem os DOIS VAZIOS. A nota acima descreve execucao de bloco anterior, NAO deste PR.]"}},"policy":{"dual_kpis":false,"root_reflection":"Kpis/ (painel ÚNICO)","rules":["Painel ÚNICO: `Kpis/`. A política dupla foi REVOGADA pelo dono em 2026-08-12 (D-KPI-DUPLA-REVOGADA) e o `mobile/flutter_app/Kpis/` foi apagado — manter dois painéis em paridade manual multiplicava trabalho e risco de divergirem.","Todo PR que altere código/teste/escopo atualiza `Kpis/*` no próprio PR, com contagem de execução REAL (D-KPI-PER-PR); a junta do PR valida os números.","PR que toque Flutter atualiza a métrica `flutter_tests` aqui — não há segundo conjunto.","O ARTEFATO PRINCIPAL é o `Kpis/index.html` (D-KPI-INDEX-PAINEL); os JSON são a fonte de dados e o painel hidrata deles em runtime."]},"notes":["Omega-VID PR-07 (2026-08-01, frontend-only): VehicleDossieModal — o dossie do veiculo num Modal size='lg' (PR-06) com ABAS (Tabs do design-system), aberto ao clicar na vaga OCUPADA do mapa de ocupacao (nao navega mais) e por deep-link ?dossie=<processId>. Componente novo VehicleDossieModal.tsx (frontend/src/modules/patios/processes/components/): a casca fia os hooks (useProcessDossie/useStatement/impound:read) e delega o corpo PURO VehicleDossieView (separado para ser testavel via renderToString com fixtures — mesmo padrao dos paineis puros do modulo). 6 abas reorganizando as secoes que a ProcessoDossiePage empilhava: Visao Geral (ProcessIdentityCard: identificacao/origem + local de guarda), Vistoria de Recepcao (InspectionSection), Linha do Tempo (IntegritySeal+ProcessTimeline), Debitos (GuiaDebitos + LancamentoChargeModal aninhado), Liberacao (LiberacaoPanel), Leilao/Liquidacao (AuctionPanel+LiquidacaoPanel). As abas Checklist do Guincho (PR-08) e Historico de Custodias (PR-09) NAO entram — a estrutura de abas so fica pronta. Hook novo useProcessDossie(processId, enabled=true) extrai a logica de fetch da ProcessoDossiePage (getProcess + eventos/verify/vistoria em paralelo + join client-side patio/vaga + auto-refresh) reusado pela pagina E pelo modal SEM duplicar; a ProcessoDossiePage foi refatorada para consumi-lo, comportamento INALTERADO. ProcessIdentityCard.tsx extraido (2 cards) reusado nos dois. OccupancyMap: a vaga OCUPADA deixa de ser <Link to=/patios/processos/:id> (ExternalLink) e vira BOTAO onOpenDossie(processId) (FileText) — nao navega, sem <Link>/href; §allowlist: currentProcessId nunca como texto. Sem onOpenDossie -> span nao-clicavel (sem trigger morto). PatioDetailPage: o estado {open,processId} do modal E a query ?dossie= (fonte da verdade; helpers PUROS setDossieParam/clearDossieParam em dossieDeepLink.ts): abrir empurra o param (botao-voltar fecha), fechar remove com replace, montar com ?dossie= ja preenchido (refresh/link compartilhado) ABRE automaticamente. A rota /patios/processos/:processId (ProcessoDossiePage) CONTINUA como deep-link/fallback direto. Tabs do design-system ganha role='tab'+aria-selected (aditivo, nao muda classe/texto). Estados obrigatorios (§7): loading/skeleton, erro+retry, acesso-negado (impound:read), nao-encontrado. A11y: foco no modal (PR-06), alvo >=44px no X, aria nas abas. Fidelidade §11: PT-BR de negocio, acentuacao, sem badge PLANNED/TODO, sem rota como texto; cabecalho = placa + chip de status. +16 smoke tests reais (patios-dossie-modal.smoke.test.tsx=14 + patios-dossie-deeplink.smoke.test.tsx=2) + patios-mapa.smoke migrado (3 testes <Link>->botao). Bateria: npm --prefix frontend run check OK, test:smoke 970/970 (0 fail/0 skip, sobre 954), build OK (dist limpo apos, §C5), git diff --check limpo. frontend_smoke 954 -> 970 (execucao real). backend/flutter INALTERADOS (frontend-only, ultimo valor oficial, D-KPI-PER-PR §C3.3). blocks_completed 123->124 (1 bloco = 1 PR). Escopo: frontend/src/modules/patios/** + frontend/src/components/ui/index.tsx (Tabs aria) + frontend/package.json + frontend/tests/** + Kpis/*. INTOCADOS: src/** (backend), mobile/**, aba Checklist(PR-08)/Historico(PR-09). pr/merge_commit/approved_head null na autoria.","Omega-VID PR-06 (2026-08-01, frontend-only, design-system): o Modal do design system ganha uma prop OPCIONAL size?: 'md'|'lg' (default 'md') para abrir a reta de UI do dossie do veiculo (PR-07 com abas). size='lg' => className 'ui-modal ui-modal--lg' + children envolvido em <div class='ui-modal__body'>. CSS novo SO na variante (.ui-modal--lg width min(1180px,96vw)/max-height 92vh/flex-column; body overflow-y auto/flex 1; header flex none; X 44px; focus-visible) — o seletor base .ui-drawer,.ui-modal (420px, compartilhado) NAO foi tocado, entao Drawer e todos os modais 'md' seguem intocados. O caminho 'md' e byte-identico ao codigo anterior (className inalterada + children renderizado DIRETO, sem wrapper) — decisao consciente de so aplicar o body-div no 'lg' para garantir ZERO regressao. Grep por '<Modal' em frontend/src confirmou que NENHUM dos ~55 usos passa 'size' hoje (NovoProcessoModal/SpotPickerModal/VacateSpotModal/LancamentoChargeModal/YardFormModal/YardAreaFormModal/YardSpotFormModal/EditalModal/PerfilFormModal/ProcessPickerModal de Patios + estoque/frota/financeiro/cadastros/notificacoes/sessoes/work-orders) => todos herdam 'md' => zero mudanca visual. Theme-aware (tokens --surface-panel/--shadow-overlay, sem cor hardcoded). A11y: role='dialog'+aria-modal='true'+aria-label mantidos, botao X (aria-label='Fechar'), alvo de toque >=44px + foco visivel na variante lg (base 36px preservado). Responsivo: 96vw + max-height 92vh + body scrollavel => nunca estoura a viewport. NAO foi introduzido close por backdrop/Esc (o Modal nunca teve — evita regredir modais com onClose condicional a estado busy). Componente Tabs (ja existente) NAO tocado (reuso no PR-07). +4 smoke tests reais (frontend/tests/modal-large.test.tsx, registrados em package.json test:smoke): frontend_smoke 950 -> 954 (execucao real 954 pass/0 fail/0 skip). Bateria: npm --prefix frontend run check OK, test:smoke 954/954, build OK (dist limpo apos, §C5), git diff --check limpo. backend/flutter INALTERADOS (frontend-only, ultimo valor oficial, D-KPI-PER-PR §C3.3). blocks_completed 122->123 (1 bloco = 1 PR; horizontal de design-system, numero sujeito a junta). Escopo: frontend/src/components/ui/index.tsx + frontend/src/styles/app.css + frontend/package.json + frontend/tests/modal-large.test.tsx + Kpis/*. INTOCADOS: src/** (backend), mobile/**, o .ui-modal base, Tabs. pr/merge_commit/approved_head null na autoria.","Omega-VID PR-05 FIX-JUNTA (2026-08-01, D-Omega-VID-05-SEED): a junta do PR-05 APROVOU_CONDICIONADO; o critico-adversarial provou por PoC 1 MEDIA real — a colisao-POR-REUSO (uma placa digitada errada na OS que casa EXATAMENTE o plate_key de uma identidade existente de OUTRO veiculo faz o processo do 2o veiculo ser agregado sob a identidade do 1o: UMA identidade passa a conter processos de DOIS veiculos) NAO tinha caminho de correcao. Das mitigacoes registradas na D-record, 2 NAO operavam sobre a colisao-por-reuso: (a) a vistoria NAO reapontava identity_id; (b) o banner duplicateCandidates so dispara com >=2 identidades ATIVAS da mesma placa (a colisao-por-reuso produz UMA -> nunca aparece); (c) merge/unmerge NAO fazem SPLIT. Resultado: agregacao errada so seria corrigivel por SQL manual (proibido, D-Omega-VID-01). CONSERTO (o dominio-correto — a vistoria e a fonte de verdade da identidade, D-Omega5P-REC-10): quando a vistoria de recepcao CONFIRMA a placa (saveInspection), o fluxo RE-RESOLVE e RE-APONTA ImpoundProcess.identity_id para a identidade correta daquela placa confirmada, NA MESMA tx RLS da vistoria (reconcileIdentityFromConfirmedPlate em impound-prisma.repository.upsertInspection; REUSA resolveOrCreateByPlateKey do PR-05). Isso SPLITA a agregacao errada (o processo de Y, ao confirmar Y na vistoria, sai da identidade de X e vai para a de Y) e sobe a identidade confirmada PROVISIONAL->CONFIRMED. A vistoria e a garantia de CONVERGENCIA EVENTUAL, INDEPENDENTE do guard de seed-time (o guard estrito /^[A-Z0-9]{7}$/ do sweep vs. o truthy do backfill deixa de importar). Limitacoes aceitas por desenho documentadas na D-record (fragmentacao sob sweeps concorrentes -> vistoria+merge reconciliam; AUTO-link fail-closed -> trade-off intencional atomicidade/zero-orfao, comentado no codigo). +3 test() DB-gated reais (SPLIT vivo / no-op idempotente / PROVISIONAL->CONFIRMED); suite do arquivo 25->28; regressao impound/vehicle-identity/owner-portal/stock-custody 217 pass/0 fail. backend 2082/2088 -> 2085/2091. flutter/frontend_smoke inalterados (backend-only, D-KPI-PER-PR §C3.3). blocks_completed inalterado (122; fix dentro do PR-05). Escopo: src/modules/impound/{service,intake.types,repository,impound-prisma.repository}.ts + agent-orchestration/controle/decisoes.md + tests + Kpis/*. INTOCADOS: prisma/schema.prisma+migrations, impound.hashchain/impound.transitions/resolveTransition (FSM/cadeia), mergeIdentities/unmergeIdentity, scripts/backfill-*, mobile/**. pr/merge_commit/approved_head null na autoria (backfill pos-merge).","Omega-VID PR-05 (2026-08-01, D-Omega-VID-05-SEED — backend-only): fecha a corrida 'backfill 1x vs sweep continuo' (achado #1 da junta de arquitetura). O sweep OS->custodia (impound.reconcile) passa a RESOLVER/CRIAR a ThirdPartyVehicleIdentity e AUTO-linkar os ChecklistRun da OS ao ImpoundProcess NA MESMA transacao da abertura (openFromRemovalAtomic). Guard de forma de placa (7 alfanumericos apos normalizePlateKey): plausivel -> resolve-ou-cria PROVISIONAL/unidentified=false/plate_key com REUSO byte-identico ao backfill PR-03 (findFirst confidence!=MERGED orderBy created_at asc) => sweep e backfill convergem na MESMA identidade agregadora; lixo/vazio -> PROVISIONAL/unidentified=true reason neutro (satisfaz identity_chk). O PROCESSO segue vehicle_unidentified=true (D-Omega5P-REC-10; identidade dele so pela vistoria); a identidade agregadora e PROVISIONAL, separada. Efeito-de-dominio SISTEMA (created_by NULL, sem re-checar permissao de vehicle_identity/checklist). Fail-CLOSED por construcao (nao fail-open): identidade+link na MESMA tx (identity-create SEM unique -> sem P2002/25P02; FK/CHECK na propria tx; link por upsert ON CONFLICT idempotente) => se o INSERT do processo colidir no indice PARCIAL unico (duplicate_service_order) a tx INTEIRA reverte, inclusive identidade+link => nenhum orfao. SEM migracao (colunas identity_id/ImpoundProcessChecklistLink/ThirdPartyVehicleIdentity ja existem do PR-02/04; custody_events.type e TEXT livre sem CHECK — nao ha o problema que mordeu o PR-A). Escopo: src/modules/impound/** (reconcile/service/types/prisma-repo/repo) + src/modules/vehicle-identities/{vehicle-identity.repository,vehicle-identity-prisma.repository,vehicle-identity.types}.ts (helper) + tests + Kpis/*. INTOCADOS: prisma/schema.prisma+migrations (sem migracao), impound.hashchain.ts/impound.transitions.ts/resolveTransition (FSM/cadeia), mergeIdentities/unmergeIdentity (PR-04), scripts/backfill-* (so referencia), RBAC/rotas/.env/lockfiles/mobile/**. +18 test() reais (3 unit InMemory + 15 DB-gated Postgres): backend 2064/2070 -> 2082/2088; flutter/frontend_smoke inalterados (backend-only, D-KPI-PER-PR §C3.3); blocks_completed 121->122. pr/merge_commit/approved_head null na autoria (backfill pos-merge).","PR-B FIX-JUNTA (2026-08-01, D-CHK-DISPATCH-CREATE — lado Flutter): correcao dos 6 achados reais da junta APROVADO_CONDICIONADO. (1 ALTA/crash) migracao Drift: as constantes de CREATE ja traziam as colunas novas, entao um device em schema 1/2 subindo direto para 13 criava a tabela ja completa (from<2 work_orders / from<3 checklist) e depois o ALTER ADD COLUMN duplicava -> 'duplicate column name' -> onUpgrade falha -> banco nao abre -> dados offline inacessiveis. Guardas from>=2 (work_orders: service_type/customer_*/vehicle_*/team_*) e from>=3 (checklist_runs.kind, checklist_attachments.5cols) fazem o ALTER so rodar quando a tabela NAO nasceu completa nesta migracao (mesma intencao do par create/else-if do work_order_evidence). +2 testes de MIGRACAO REAL (nenhum existia; todos usavam openInMemory=onCreate fresco). (2) marker sem component_id: addMarker agora LANCA e nao enfileira (backend exige component_id -> 400 -> sumia apos maxRetry); tela guarda + componentId virou required. (3) acknowledgement: (a) lote ordenado por created_at no store (ORDER BY) e no replay (sort estavel) garantindo divergence->ack->complete; (b) completeRun reporta has_divergence REAL (antes forcava false -> rebaixava pending_acknowledgement->completed e a ciencia 409-perdia); (c) 409 ACKNOWLEDGEMENT_NOT_REQUIRED mapeado para failed retryavel (nao conflito terminal que exclui do replay para sempre). (4) AutoSyncCoordinator: novo downloadPendingRuns baixa o server_run_id das runs iniciadas 100% offline (com acoes/fotos pendentes sem serverId) ANTES do replay, sem depender de reabrir a tela. (5) foto: blob so apagado com status=='stored' (§B-108); scan_failed/rejected/pending_review preservam o blob (espelha evidence). (6) acentuacao PT-BR do AwaitingDispatchView (servico/nao/voce/ja->serviço/não/você/já) + doc de getOrStartRun + widget test. flutter_tests 822->835 (+13 reais; 835/0-falha/0-skip). backend_tests (2064/2070) e frontend_smoke (950) INALTERADOS (Flutter-only; ultimo valor oficial, D-KPI-PER-PR §C3.3). blocks_completed inalterado (fix dentro da PR-B). Escopo: mobile/flutter_app/** + Kpis/* (dual). src/** e pubspec/lock INTOCADOS. pr/merge_commit/approved_head null na autoria.","PR-B (2026-08-01, D-CHK-DISPATCH-CREATE — lado Flutter, consome o backend PR-A ja mergeado): o guincheiro deixa de CRIAR a run localmente e passa a BAIXAR a run pre-criada pelo despacho. (1) checklist_repository.resolveRunForWorkOrder: novo remoto fetchRunsForWorkOrder (GET /api/v1/mobile/checklist-runs?workOrderId[&checklistId], parse tolerante snake/camel, desambigua por checklistId), grava o server_run_id no Drift, responde CONTRA a run baixada; getOrStartRun NAO enfileira mais runCreate; lista vazia -> 'aguardando despacho' (sem run local, sem runCreate; a lista vazia PODE ser falha de provisao, nao so ausencia); offline -> run local usavel + carimbo do server_run_id nas acoes ja enfileiradas quando o download chega. (2) sync destravado: supportedActionTypes = ciclo completo menos runCreate; elegibilidade exige server_run_id (satisfeito). (3) codec canonico: marker/divergence/acknowledgement/attachment -> tipos+payloads que o backend PR-A aceita (antes caiam no generico e o efeito sumia); run_id = server_run_id baixado. (4) foto por MULTIPART: blob durable offline-first + ChecklistAttachmentUploadService (POST /mobile/checklist-runs/:runId/attachments) plugado no auto-sync; migracao Drift ADITIVA 12->13. (5) UI 'aguardando despacho' (loading/erro/retry, PT-BR, a11y). flutter_tests 807->822 (+15 test reais, suite 822/0-falha/0-skip). backend_tests (2064/2070) e frontend_smoke (950) INALTERADOS — PR Flutter-only; carregam o ultimo valor oficial (D-KPI-PER-PR §C3.3). blocks_completed 120->121. Escopo: mobile/flutter_app/** + Kpis/* (dual). src/** INTOCADO. pubspec/lock INTOCADOS. pr/merge_commit/approved_head null na autoria.","PR-A FIX-JUNTA REVERIF (2026-08-01): a re-verificacao da junta achou 1 MEDIA + 1 BAIXA no conserto de idempotencia da criacao de run (item 2 do FIX-JUNTA). (MEDIA) o P2002 catch-then-refetch rodava numa transacao ABORTADA: withTenantRls envolve TODO o PrismaChecklistRepository.createRun numa UNICA transacao interativa; sob 2 despachos/creates concorrentes da MESMA OS com a mesma client_run_key, o perdedor sofria unique violation (23505/P2002), a tx entrava em ABORTED e a re-busca getRunByClientKey no catch falhava com 25P02 ('current transaction is aborted') — sem code P2002, NAO era re-capturada -> createRun LANCAVA em vez de devolver {created:false}. Impacto: o perdedor caia no fail-open do field-dispatch como provisao FALHA -> evento ESPURIO field_dispatch_checklist_run_failed + notificacao falsa ao operador (falso alarme do proprio sinal de observabilidade recem-adicionado), e no mobile-sync retornava erro em vez de already_applied. Cura na RAIZ: createRun com client_run_key passou a usar INSERT ... ON CONFLICT (tenant_id, client_run_key) DO NOTHING RETURNING via $queryRaw (0 linhas -> conflito, tx NAO aborta -> SELECT normal devolve a existente com created:false; 1 linha -> created:true; respostas via createMany na mesma tx; caminho SEM client_run_key inalterado). InMemory ja espelhava o contrato {run, created}. RlsPrismaChecklistRepository exportado para o teste. (BAIXA) o teste de concorrencia [nao super-conta] rodava so em memory (serializa sincrono, nunca exercita o 25P02): adicionado tests/checklist-run-create-concurrency-db.test.ts (DB-gated, Postgres real) que forca o perdedor ao ON CONFLICT via barreira (a N-concorrencia ingenua mascara o abort) e prova created:false LIMPO + 1 run + 1 checklist_runs_count + ZERO evento/notificacao espurios. Provado VIVO: 2/2 verdes com a cura; o teste-barreira REPROVA (25P02) contra o codigo antigo. Escopo respeitado: withTenantRls/rls.ts INTOCADO (a cura e no INSERT do repo). +2 test() -> backend 2062/2068 -> 2064/2070. blocks_completed inalterado (120; re-verificacao dentro da PR-A). pr/merge_commit/approved_head null na autoria.","PR-A FIX-JUNTA (2026-08-01): correcao dos 6 achados da junta APROVADO_CONDICIONADO da PR-A. (1 ALTA/dba) migracao aditiva 20260858000000 estende o CHECK field_dispatch_events_event_type_check para admitir 'field_dispatch_checklist_run_failed' — sem ela o INSERT do evento fail-open estourava 23514 NAO-capturado (create NAO usa $transaction) -> HTTP 500 com despacho orfao + Outbox perdido + auditoria perdida; provado vivo contra Postgres (valor novo -> INSERT OK; valor fora da lista -> 23514); comentario falso em field-dispatch.types.ts corrigido; + defesa-em-profundidade try/catch na auditoria. (2 MEDIA/critico) repository.createRun devolve {run, created}; o service PULA audit + publishDomainEvent('checklist_run.created') quando created=false -> nao super-conta a metrica FATURADA checklist_runs_count sob 2 despachos concorrentes / 2x POST mesma client_run_key (in-memory+Prisma+Rls+callers). (3 MEDIA/critico) reassign agora REPROVISIONA a run idempotente (auto-recuperacao real quando a provisao do create falhou) + notificacao ao operador via motor de notificacoes existente (injetado no composition root, dependency-inverted). (4 BAIXA) reason de auditoria CODIFICADO (taxonomia curta / ChecklistError.reason), nunca error.message cru (§2.8). (5 BAIXA) GET run-por-OS aceita ?checklistId= p/ desambiguar quando a OS troca de checklist entre despachos (>1 run; ordem created_at desc). (6 BAIXA/dba) comentario de ops sobre indice nao-CONCURRENTLY na migracao 20260857000000. (7) mobile-backend-contracts fixa CORE_SAAS_PERSISTENCE=memory no setup. +3 test() reais -> backend 2059->2062 / 2065->2068. blocks_completed inalterado (120; fix dentro da mesma PR-A). Migracao 20260858000000 aplicada viva (migrate deploy + migrate status up-to-date).","PR-20-FIX (2026-07-30): trigger BEFORE UPDATE em impound_outbox_events (guard_update) — a fila de outbox so podia ter DELETE bloqueado, nao UPDATE; um UPDATE de payload/tenant_id/process_id/event_type/occurred_at/schema_version/target/created_at rodava sem erro (PoC do critico-adversarial). Adicionado na MESMA migracao 20260853000000 (ainda nao commitada), so status/attempts/last_error mutaveis por desenho da fila. Migracao reaplicada viva no Postgres de dev (prisma db execute + checksum de _prisma_migrations reconciliado); prisma validate/migrate status OK. +1 teste em tests/impound-outbox.test.ts prova UPDATE de payload/process_id bloqueado e status/attempts/last_error permitido. backend 1956/1971 (numero relatado pelo PR-20 original) -> 1957/1972; regressao da familia impound/auction/release/settlement (26 arquivos, 203 testes) verde. frontend_smoke inalterado (937) — aguarda o PR de frontend paralelo fechar seu proprio achado e atualizar essa metrica no proprio PR quando fechar.","PR-17b (2026-07-30): fotos de vistoria MINIMIZADAS servidas pelo owner-portal (resize<=1024px+JPEG q70+marca-d'agua fixa, buffer-in/buffer-out, zero disco). Conserto pos-revisao de junta (secops/coordenador-de-acessos/dba-guardiao APROVARAM; critico-adversarial + avaliador REPROVARAM com achados concretos, ambos fechados nesta entrega): (1) C2 — composicao do semaforo de concorrencia invertida (guard.run envolve o trabalho REAL sem timeout embutido; o timeout de resposta HTTP envolve o resultado de guard.run) para o slot so ser devolvido ao pool quando a decodificacao de fato termina, nunca quando um timeout externo dispara antes; teste de regressao (2c) prova o comportamento correto. (2) D-007 — availabilityLabel deixou de prometer 'visualizacao' nesta tela (o PWA ainda nao tem UI que consuma /photos/:opaqueRef; adiado para PR de frontend futuro). (3) este proprio snapshot fecha a pendencia de KPI-por-PR (git diff de Kpis/ estava vazio no diff original). +17 testes sempre-roda (owner-portal-photos.test.ts, arquivo novo), zero DB-gated novos, zero dependencia nova alem do jimp ja aprovado.","PR-19 (2026-07-29): a autoridade credenciada aprova/rejeita a liberacao in-system pelo MESMO BFF isolado do 18a/18b — fecha a Fase 5 (fundacao/solicitar/aprovar) e a SoD final triplice (autoridade SOLICITA / operador CONCLUI / autoridade APROVA). Vinculacao D-08 por proveniencia (nunca por texto livre) e a decisao de design mais defendida do PR (contra a tentacao de amarrar por authority_case_number, spoofavel). Zero mudanca no gate I5/resolveTransition/IMPOUND_TRANSITIONS/impound.hashchain — 100% aditivo. 2 CHECKs pre-existentes precisaram de widening aditivo (achados por prova viva contra Postgres, nao em memory) — motivo a mais para a bateria DB-gated ser obrigatoria antes do merge.","FIX-NAV-MENU-PLATFORM-JWT (2026-07-29): remove o 500 do menu platform sob JWT/Prisma na fronteira correta. O pseudo-tenant platform nao e UUID nem tenant persistido; somente Navigation opta por preservar suas permissoes derivadas dos papeis canonicos do JWT assinado. Os outros 55 usos no baseline pos-PR-18a continuam fail-closed, tenants reais usam RBAC persistente e platform nao habilita itens tenantOnly. O [0] observado era efeito no teste depois do 500, nao a causa de producao. Suite protegida 7/7 em Prisma real; suite completa pos-rebase 1900 pass/0 fail/6 skip (1906 total); +3 testes adversariais.","D-Ω4-KPI-RELATORIO (reconciliação 2026-07-18): a rodada Ω4 (Financeiro do tenant ×1,5) deferiu a atualização de KPI de todos os seus PRs (#206–#225) para este snapshot único. Contagens de execução real ao fim da PÓS-FASE 1: backend 989→1242 (0 fail, 6 skip DB-gated que rodam no CI; 1248 total), smoke web 486→514. Flutter/mobile inalterados (Ω4 foi web/backend-only; política dupla). 8 agregados-feature (Ω4-1..8) → blocks_completed 58→66; mvp_demo 98→99 e mvp_vendavel 83→88 movidos por escopo (módulo Financeiro completo). Cada agregado por junta adversarial + pós-análise; relatório em agent-orchestration/omega/RELATORIO-OMEGA4.md. pr: 226; merge_commit/approved_head null na autoria (backfill pós-merge).","D-Ω3F-KPI-RELATORIO (reconciliação 2026-07-17): a rodada Ω3F deferiu a atualização de KPI de todos os seus PRs (#184–#204) para este snapshot único. Contagens de teste vêm de execução real ao fim da Fase 1: backend 989 (0 fail, 6 skip), smoke web 486. Flutter/mobile inalterados (Ω3F foi web/backend-only). mvp_demo/vendavel movidos (+2/+5) por escopo — hub operacional da OS completo.","JUNTA-MAPAS (2026-07-13): PR docs/agentes-only — cria 3 agentes (.claude/agents/planejador-mapas, dev-mapas, avaliador-mapas) + docs/maps/kb-mapas.md + D-JUNTA-MAPAS + ata J-JUNTA-MAPAS. NENHUM codigo de produto/teste tocado: TODAS as metricas de teste carregam o ultimo valor oficial (Ω-INFRA-1: backend 768/768, Flutter 764/764, smoke web 44/44). blocks_completed inalterado (49) — governanca/tooling nao conta como bloco de feature entregue, mesmo criterio de Ω-GOV/Ω-DOCS. mvp_demo/mvp_vendavel inalterados (nenhum escopo de produto movido). Nenhuma chave/billing/SKU do Google ativado.","Ω-GOV (2026-07-13): backend_tests corrigido de 15/15 (so core-saas) para 766/766 — a suite INTEIRA que o gate do CI passou a rodar no Ω-GATE (100 arquivos + Postgres+Redis). Primeira aplicacao da politica KPI-por-PR (D-KPI-PER-PR). Este PR e web/backend/docs-only: metrics de Flutter/mobile e frontend seguem os ultimos valores oficiais (B-124) ate serem re-baseadas em PRs das respectivas trilhas.","frontend_smoke_tests avancou de 33/33 para 44/44 na PR #125 (+10 testes unitarios do dashboard.adapter B-124 e +1 render smoke do dashboard); frontend check e build OK.","blocks_completed segue a regra de contagem de blocos entregues: 48 (ate B-123) + B-124 = 49.","mvp_demo e mvp_vendavel mantidos nos ultimos valores oficiais publicados (96%/78%, tipo estimado); nao houve decisao humana explicita para altera-los no B-124 — a revisao pode ajusta-los. B-123 fechou a fidelidade do fluxo de OS mobile e B-124 fechou o dashboard web enriquecido, mas os percentuais permanecem oficiais ate decisao humana.","flutter_tests e contratos mobile permanecem nos ultimos valores oficiais (B-124, web-only); backend_tests foi ATUALIZADO para 766/766 no Ω-GOV (suite backend inteira do gate do CI apos o Ω-GATE).","Na politica KPI-por-PR (D-KPI-PER-PR), um PR web/backend-only (como este Ω-GOV) atualiza so a raiz Kpis/*; a paridade de version/block com mobile/flutter_app/Kpis/ vale quando o PR toca ambos os conjuntos. Aqui a raiz avanca para Ω-GOV e o mobile segue em B-124 ate um PR que mexa em Flutter/mobile.","B-SAN3-01 (2026-09-17, frontend-only + e2e + registro): a web deixa de fabricar OS/despacho quando o backend recusa (P-008 FECHADA). Arquivos: work-orders.service.ts, work-orders.types.ts (aditivo), work-orders.state.ts (NOVO, reducers puros), work-orders-create.handlers.ts (NOVO), useWorkOrders.ts, useWorkOrderDetail.ts, WorkOrdersPage.tsx (+WorkOrdersKpiGrid/WorkOrdersLoadState exportados), WorkOrderCreatePage.tsx, WorkOrderDetailPage.tsx (+WorkOrderDetailView), GeneralInfoTab.tsx (prop timelineUnavailable), components/StaleDataBanner.tsx (NOVO), operations/dispatches/dispatches.service.ts, OperationsDispatchesPage.tsx (so loadDetail + aviso), tests/e2e/critical-flows.spec.ts (E1-E3). Bateria: check OK · build OK · test:smoke 1173/1173 · npm test 2995/2997 medido pelo dev antes do caso novo da guarda do painel; 2996/2998 reexecutado pelo orquestrador no head 10eb7049 (A-C1-01, corrigido no ciclo 2) · approval-frontend-contract 1/1 · kpi-freeze --check OK · git diff --check OK. mvp_demo/mvp_vendavel INTOCADOS (§C3.4: o bloco nao move escopo — recalculo no B-SAN3-10).","B-SAN3-01 ciclo 2 (2026-09-18, frontend-only + registro + KPI): correcao da reprovacao 2 x 2. Arquivos: work-orders.state.ts (P1 forbidden primeiro; P2 Record exaustivo + never), useWorkOrders.ts (-forbidden exposto), pages/WorkOrdersPage.tsx (classificacao por listStatusKind; WorkOrdersLoadState com default ERRO; StatePanel; KPIs degradados neutros; vazio no card com CTA gated), pages/WorkOrderDetailPage.tsx (StatePanel nos tres estados), components/StatePanel.tsx (NOVO), work-orders.adapter.ts (+hasWorkOrdersList), work-orders.service.ts (200 sem lista = falha; cabecalho), repository.ts (forma positiva), dispatches.service.ts (so cabecalho), frontend/tests/work-orders-honest-errors.test.tsx (47 -> 67). Bateria: check OK · build OK · test:smoke 1193/1193 · bloco 67/67 · approval-frontend-contract 1/1 · npm test 2996/2998 (Postgres e Redis descartaveis, REDIS_URL exportada) · e2e E1-E3 3/3 (base vazia e com OS) · kpi-freeze --check OK · guards de KPI OK · git diff --check OK. blocks_completed 164 INALTERADO (2a publicacao do mesmo bloco). mvp_demo/mvp_vendavel INTOCADOS (§C3.4)."],"limitations":["S3/presigned real pendente","Persistencia duravel DB/Redis do receipt pendente","Antivirus real pendente","Download protegido final pendente","Retencao definitiva pendente","Settings web sem backend dedicado (lacuna documentada)","Piloto Android real ainda precisa validacao em dispositivo fisico","mvp_vendavel (88%) e mvp_demo (99%) sao estimativas anteriores ao inventario SAN3 (2026-09-11); o gate da versao vendavel do plano v5 tem 56 bloqueantes em 37 blocos; recalculo no B-SAN3-10 — docs/revisoes/SAN3/PLANO_SAN3.md"],"production_readiness":{"veredito":"REPROVADO PARA PRODUÇÃO","fonte_veredito":"Junta J-6R, 5×0 — docs/revisoes/O6R/ATA_J6R.md","data_veredito":"2026-08-12","deploy_bloqueado":true,"p0_total":17,"p0_fechados":13,"p0_abertos":4,"p1_total":15,"p1_fechados":2,"p1_abertos":13,"fechados":[{"id":"Ω6R-DIN-001","por":"B-O6R-02 ciclo 5 (PR #371, 99f1840)","em":"2026-09-05"},{"id":"Ω6R-DIN-002","por":"B-O6R-02 ciclo 5 (PR #371, 99f1840)","em":"2026-09-05"},{"id":"Ω6R-DIN-003","por":"B-O6R-02 ciclo 5 (PR #371, 99f1840)","em":"2026-09-05"},{"id":"Ω6R-DIN-004","por":"B-O6R-02 ciclo 5 (PR #371, 99f1840)","em":"2026-09-05"},{"id":"Ω6R-SEC-001","por":"B-O6R-01 (PR #357, 0a39824)","em":"2026-08-19"},{"id":"Ω6R-TEN-001","por":"B-O6R-01 (PR #357, 0a39824)","em":"2026-08-19"},{"id":"Ω6R-DAT-001","por":"B-O6R-05 (PR #353, a8901ff)","em":"2026-08-15"},{"id":"Ω6R-DIN-006","por":"B-O6R-05 (PR #353, a8901ff)","em":"2026-08-15"},{"id":"Ω6R-QUA-003","por":"B-O6R-02 ciclo 5 (PR #371, 99f1840)","em":"2026-09-05"},{"id":"Ω6R-DIN-008","por":"B-O6R-02 ciclo 5 (PR #371, 99f1840)","em":"2026-09-05"},{"id":"Ω6R-DIN-010","por":"B-O6R-02 ciclo 5 (PR #371, 99f1840)","em":"2026-09-05"},{"id":"Ω6R-DIN-011","por":"B-O6R-02 ciclo 5 (PR #371, 99f1840)","em":"2026-09-05"},{"id":"Ω6R-SEC-003","por":"B-O6R-01 (núcleo, PR #357) + B-O6R-07a (residuais, PR #369, dc8168b)","em":"2026-09-04"},{"id":"Ω6R-DIN-005","por":"B-O6R-06 (PR #385, 15ef3fbe)","em":"2026-09-11"},{"id":"Ω6R-DIN-007","por":"B-O6R-06 (PR #385, 15ef3fbe)","em":"2026-09-11"}],"as_of":"2026-09-11","source":"docs/revisoes/O6R/achados.jsonl","aguardando_merge":[],"nota_aguardando":"Nenhum achado aguardando merge em 2026-09-11: Ω6R-DIN-005 e Ω6R-DIN-007 sairam daqui para `fechados` no backfill do #385 (PR do plano SAN3), quando ganharam hash de merge (15ef3fbe). Texto anterior, preservado: Ω6R-DIN-005 e Ω6R-DIN-007 estao `fechado` no registro NA AUTORIA do B-O6R-06 (§C3.5: numero de PR e hash so existem pos-merge). Eles NAO entram em `p0_fechados` nem na lista `fechados` — o painel conta so o que esta na `main`, e e por isso que `p0_fechados` permanece 11."},"findings":{"as_of":"2026-09-06","source":"docs/revisoes/O6R/achados.jsonl","itens":[{"id":"Ω6R-DIN-001","severidade":"P0","modulo":"financial-entries / financial-titles","status":"fechado","resumo":"Pagamento de título: o lançamento é gravado antes de aplicar ao título; duas requisições ao mesmo tempo podem pagar duas vezes.","bloco":"B-O6R-02"},{"id":"Ω6R-DIN-002","severidade":"P0","modulo":"financial-entries / financial-titles","status":"fechado","resumo":"Estorno lança a contrapartida contábil mas não devolve o valor pago nem o status do título — o título fica pago sem estar.","bloco":"B-O6R-02"},{"id":"Ω6R-DIN-003","severidade":"P0","modulo":"cheques / financial-entries","status":"fechado","resumo":"Cheque: estado, lançamento e vínculo são gravados em etapas separadas; falha no meio deixa o cheque inconsistente.","bloco":"B-O6R-02"},{"id":"Ω6R-DIN-004","severidade":"P0","modulo":"financial-titles","status":"fechado","resumo":"Dá para reduzir o valor de um título abaixo do que já foi pago, e apagar título já pago.","bloco":"B-O6R-02"},{"id":"Ω6R-DIN-005","severidade":"P0","modulo":"checklists / cloud-usage / cloud-cost-allocation","status":"fechado","resumo":"A metrica que gera cobranca era gravada em melhor-esforco DEPOIS de a vistoria estar confirmada: se falhasse, o consumo sumia e nunca era recuperado. Agora ela nasce DENTRO da mesma transacao da vistoria, com chave derivada dela — ou as duas coisas existem, ou nenhuma.","bloco":"B-O6R-06"},{"id":"Ω6R-SEC-001","severidade":"P0","modulo":"core-saas / auth / platform","status":"fechado","resumo":"Quem administra uma organização consegue se promover a administrador da plataforma e passar a ler, alterar e suspender TODAS as outras.","bloco":"B-O6R-01"},{"id":"Ω6R-TEN-001","severidade":"P0","modulo":"auth / core-saas","status":"fechado","resumo":"Duas pessoas com o mesmo e-mail em organizações diferentes: uma assume a conta da outra, sem saber a senha.","bloco":"B-O6R-01"},{"id":"Ω6R-DAT-001","severidade":"P0","modulo":"config / core-saas / runtime","status":"fechado","resumo":"Produção podia subir guardando organizações, usuários e permissões só na memória, perdendo tudo no primeiro reinício.","bloco":"B-O6R-05"},{"id":"Ω6R-SEC-002","severidade":"P0","modulo":"work-orders / approvals / RBAC","status":"parcialmente_superado","resumo":"O técnico de campo podia aprovar a própria ordem de serviço; papel, SoD e escopo nas duas rotas guardadas foram fechados, mas 9 rotas mutantes (anexos, comentários, geocode) seguem alcançáveis sobre OS alheia.","bloco":"B-O6R-07"},{"id":"Ω6R-ARQ-001","severidade":"P1","modulo":"infra/jobs","status":"ativo","resumo":"A fila de tarefas retira o item antes de garantir que alguém vai processá-lo: se o processo cair, a tarefa some.","bloco":"B-O6R-08"},{"id":"Ω6R-ARQ-002","severidade":"P1","modulo":"infra/jobs","status":"ativo","resumo":"Cada reinício semeia agendamentos novos sem deduplicar — as tarefas periódicas se multiplicam.","bloco":"B-O6R-08"},{"id":"Ω6R-ARQ-003","severidade":"P1","modulo":"field-ops-realtime","status":"ativo","resumo":"As atualizações em tempo real vivem na memória de um processo só; com mais de uma máquina, parte dos usuários não recebe.","bloco":"B-O6R-08"},{"id":"Ω6R-ARQ-004","severidade":"P1","modulo":"field-dispatch","status":"ativo","resumo":"Despacho e o evento que o registra são gravados separados: falha no meio deixa despacho sem rastro.","bloco":"B-O6R-09"},{"id":"Ω6R-DIN-006","severidade":"P0","modulo":"jobs / charging / impound / notifications","status":"fechado","resumo":"O executor de tarefas de fundo nunca subia em produção: diárias de pátio, reconciliação de custódia e notificações legais não aconteciam.","bloco":"B-O6R-05"},{"id":"Ω6R-PERF-001","severidade":"P1","modulo":"infra/jobs","status":"ativo","resumo":"O executor inicia uma tarefa sem esperar a anterior e não tem prazo máximo — uma tarefa travada trava a fila.","bloco":"B-O6R-08"},{"id":"Ω6R-PERF-002","severidade":"P1","modulo":"frontend / API client","status":"ativo","resumo":"A tela recarrega sem travar chamadas em andamento e sem tempo limite; conexão ruim empilha requisições.","bloco":"B-O6R-10"},{"id":"Ω6R-PERF-003","severidade":"P1","modulo":"owner-portal / runtime","status":"ativo","resumo":"Processamento de imagem grande roda no mesmo processo do sistema; três simultâneas podem derrubar a resposta.","bloco":"B-O6R-10"},{"id":"Ω6R-QUA-001","severidade":"P1","modulo":"mobile-flutter / expense-management","status":"ativo","resumo":"O aplicativo reenvia despesas sem credencial, num endereço que exige permissão — o reenvio falha calado.","bloco":"B-O6R-03"},{"id":"Ω6R-QUA-002","severidade":"P1","modulo":"mobile-flutter / mobile-inventory / inventory","status":"ativo","resumo":"Estoque no aplicativo enfileira tipos incompatíveis e não tem reenvio — movimentação feita offline pode se perder.","bloco":"B-O6R-04"},{"id":"Ω6R-DIN-007","severidade":"P0","modulo":"cloud-costs","status":"fechado","resumo":"O resumo de custos de nuvem somava apenas as primeiras 10.000 linhas, em silencio — e a linha cortada era a mais recente. Agora a soma e feita no banco, sem teto, com o valor exato publicado ao lado do arredondado.","bloco":"B-O6R-06"},{"id":"Ω6R-QUA-003","severidade":"P1","modulo":"financial-entries / cheques / period-close / expenses","status":"fechado","resumo":"Os testes financeiros usam banco de mentira: atomicidade e concorrência nunca foram exercitadas.","bloco":"B-O6R-02"},{"id":"Ω6R-DIN-008","severidade":"P0","modulo":"financial-period-closes / financial writers","status":"fechado","resumo":"O fechamento de período usa trava, mas quem escreve não a respeita: dá para lançar depois do período fechado.","bloco":"B-O6R-02"},{"id":"Ω6R-DIN-009","severidade":"P0","modulo":"expense-management","status":"ativo","resumo":"Sincronização de despesa grava o efeito antes do comprovante, em transações separadas; falha no meio deixa despesa sem comprovante.","bloco":"B-O6R-03"},{"id":"Ω6R-DAT-002","severidade":"P0","modulo":"inventory","status":"ativo","resumo":"Saldo de estoque: duas movimentações simultâneas do mesmo item não se serializam — o saldo pode ficar errado.","bloco":"B-O6R-04"},{"id":"Ω6R-DAT-003","severidade":"P0","modulo":"inventory / cycle-count","status":"ativo","resumo":"Contagem de inventário: cada ajuste do fechamento grava separado, sem travar a sessão — fechamento concorrente corrompe a contagem.","bloco":"B-O6R-04"},{"id":"Ω6R-QUA-004","severidade":"P1","modulo":"mobile-flutter / work-orders","status":"parcialmente_superado","resumo":"O aplicativo lia a resposta da ordem de serviço no formato errado; a linha do tempo remota nunca funcionou.","bloco":"B-O6R-11"},{"id":"Ω6R-QUA-005","severidade":"P1","modulo":"mobile-flutter / prestador","status":"ativo","resumo":"O aplicativo enfileira sem esperar a gravação e reescreve a fila inteira a cada item.","bloco":"B-O6R-11"},{"id":"Ω6R-SEC-003","severidade":"P1","modulo":"auth","status":"fechado","resumo":"Senha errada não trava a conta: o contador sobe, mas nada nunca bloqueia — tentativa infinita.","bloco":"B-O6R-07"},{"id":"Ω6R-SEC-004","severidade":"P1","modulo":"evidence / attachments / mobile","status":"parcialmente_superado","resumo":"O antivirus de anexo devolvia “limpo” por padrao e o tipo do arquivo vinha do cliente; anexo malicioso abria no navegador. Superado em producao/staging e no tipo (sniff de assinatura nas 5 vias + download `attachment` com tipo dos bytes); resta o antivirus real, que e servico externo.","bloco":"B-O6R-07b"},{"id":"Ω6R-DAT-004","severidade":"P1","modulo":"jurisdiction / charging","status":"ativo","resumo":"Editar o perfil normativo re-tempera custódias em curso, sem versão nem vigência, e a auditoria não registra o que mudou.","bloco":"B-O6R-12"},{"id":"Ω6R-DIN-010","severidade":"P0","modulo":"financial-entries / financial-titles","status":"fechado","resumo":"DELETE de um lançamento de LIQUIDAÇÃO é aceito: o caixa volta e o título continua com paid_amount > 0","bloco":"B-O6R-02"},{"id":"Ω6R-DIN-011","severidade":"P0","modulo":"cheques / financial-entries","status":"fechado","resumo":"O lançamento de COMPENSAÇÃO de um cheque pode ser estornado (ou apagado) pela superfície de lançamentos sem que o cheque saia de 'cleared'","bloco":"B-O6R-02"}]},"roadmap":{"as_of":"2026-09-17","source":"docs/revisoes/O6R/PLANO_O6R.md + agent-orchestration/omega/juntas/J-CHK-04C-EMENDA-deliberacao-j6r.md","ordem_vinculante":["B-O6R-05","B-O6R-01","B-O6R-02","B-O6R-07","B-O6R-06"],"blocos":[{"id":"B-O6R-01","titulo":"Identidade e autoridade","achados":["Ω6R-SEC-001","Ω6R-TEN-001"],"dep":[],"estado":"concluido","nota":"Mergeado em 2026-08-19. TRÊS ciclos: 1 reprovado (6 bloqueantes), 2 vetado (batch 33% vermelho na forma do job), 3 aprovado 5×0 sem veto. Dez instâncias de \"o artefato afirma o que a execução não produz\", todas nascidas em correções.","pr":357},{"id":"B-O6R-02","titulo":"Atomicidade do financeiro","achados":["Ω6R-DIN-001","Ω6R-DIN-002","Ω6R-DIN-003","Ω6R-DIN-004","Ω6R-DIN-008","Ω6R-QUA-003","Ω6R-DIN-010","Ω6R-DIN-011"],"dep":["B-O6R-01"],"estado":"concluido","pr":371,"nota":" [SAN3 (PR #386): concluido — os achados do bloco fecharam no #371 (ciclo 5); o a_fazer era o painel congelado (P-KPI-ROADMAP-CONGELADO).]"},{"id":"B-O6R-03","titulo":"Sincronização de despesas","achados":["Ω6R-DIN-009","Ω6R-QUA-001"],"dep":["B-O6R-01"],"estado":"a_fazer"},{"id":"B-O6R-04","titulo":"Consistência de estoque","achados":["Ω6R-DAT-002","Ω6R-DAT-003","Ω6R-QUA-002"],"dep":["B-O6R-01"],"estado":"a_fazer"},{"id":"B-O6R-05","titulo":"Portões de runtime de produção","achados":["Ω6R-DAT-001","Ω6R-DIN-006"],"dep":[],"estado":"concluido","pr":353,"nota":"Mergeado em 2026-08-15. Junta do PR 3×0, sem veto."},{"id":"B-O6R-06","titulo":"Durabilidade do faturamento","achados":["Ω6R-DIN-005","Ω6R-DIN-007"],"dep":["B-O6R-02","B-O6R-05"],"estado":"concluido","pr":385,"nota":"Mergeado em 2026-09-11 (PR #385, 15ef3fbe). Entregue em 2026-09-07 (PR na autoria). Captura transacional da unidade faturavel com chave da RUN + SUM/GROUP BY no banco + base de rateio lida da tabela duravel sob contexto RLS por tenant. O parametro `billing` obrigatorio sem default fecha o conjunto de chamadores pelo compilador. RESIDUAL NOMEADO: o script de reconciliacao NAO foi entregue (bloqueado pelo achado R2-A do critico — refaturaria a trilha de divergencia do mobile): P-O6R-B06-RECONCILE-BLOQUEADO."},{"id":"B-O6R-07","titulo":"Autorização e anexos","achados":["Ω6R-SEC-002","Ω6R-SEC-003","Ω6R-SEC-004"],"dep":["B-O6R-01"],"estado":"parcial","nota":" [SAN3 (PR #386): parcial — 07a (#369) e 07b (#380) mergearam; SEC-003 fechado; SEC-002 e SEC-004 seguem com residual (B-O6R-07c e B-AV-REAL).]"},{"id":"B-O6R-08","titulo":"Tarefas duráveis e tempo real","achados":["Ω6R-ARQ-001","Ω6R-ARQ-002","Ω6R-ARQ-003","Ω6R-PERF-001"],"dep":["B-O6R-05"],"estado":"a_fazer"},{"id":"B-O6R-09","titulo":"Despacho atômico","achados":["Ω6R-ARQ-004"],"dep":["B-O6R-08"],"estado":"a_fazer"},{"id":"B-O6R-10","titulo":"Proteção de carga no cliente","achados":["Ω6R-PERF-002","Ω6R-PERF-003"],"dep":["B-O6R-05"],"estado":"a_fazer"},{"id":"B-O6R-11","titulo":"Contratos do aplicativo de campo","achados":["Ω6R-QUA-004","Ω6R-QUA-005"],"dep":["B-O6R-01"],"estado":"a_fazer"},{"id":"B-O6R-12","titulo":"Versão do perfil normativo","achados":["Ω6R-DAT-004"],"dep":[],"estado":"a_fazer","nota":"Acrescentado ao plano em 2026-08-16. O achado nasceu depois da junta da auditoria e ficou sem bloco de correção — a lacuna foi encontrada pelo guard de paridade, na primeira execução. Critério de aceite provisório, a ser ratificado pela junta do próprio bloco."}],"trilha_bloqueada":{"titulo":"Trilha de vistorias","itens":[{"id":"CHK-04c-B","titulo":"Aba de aplicabilidade e ajuste no envio"},{"id":"CHK-05a","titulo":"Versão da vistoria no dossiê do veículo"},{"id":"CHK-06","titulo":"Impressão da vistoria"}],"bloqueada_por":["B-O6R-07"],"fonte":"A deliberação da junta veda features nos módulos atingidos enquanto houver achado crítico aberto neles.","nota":"B-O6R-06 retirado em 2026-09-12 (SAN3, PR #386, ciclo 2 — C3-06): mergeado no PR #385 (15ef3fbe, 2026-09-11); a pendência-mãe P-O6R-B06 está FECHADA."}},"recent":{"as_of":"2026-09-20","source":"git log main + agent-orchestration/omega/juntas/","itens":[{"pr":390,"data":"2026-09-18","tipo":"seguranca","titulo":"Cada papel ve e faz o que a matriz de papeis diz","resumo":"O Financeiro passa a ler ordens de servico, clientes e servicos e volta a ver Financeiro, Cobrancas e Pagamentos; o auditor deixa de receber acesso negado numa base nova; o Estoque ganha menu proprio; o Gestor deixa de responder e dar ciencia em vistorias, como a matriz manda. Onde a matriz pede escopo que o sistema ainda nao aplica, nada foi liberado — virou pendencia com dono."},{"pr":387,"data":"2026-09-17","tipo":"correcao_critica","titulo":"A web para de inventar ordem de serviço quando o servidor recusa","resumo":"Lista vazia aparecia como seis ordens falsas com um aviso de \"sem conexão\"; uma ordem recusada pelo servidor virava uma ordem de mentira e o que o operador tinha digitado se perdia; um detalhe inexistente mostrava outra ordem. Agora o erro aparece como erro, o vazio como vazio, o formulário guarda o que foi digitado — e o mesmo conserto vale para os despachos. Na segunda rodada de correção, os avisos de erro, de falta de permissão e de lista vazia ganharam o desenho do protótipo e se distinguem a olho, e a regra ficou blindada contra novas formas de inventar dado. PR na autoria."},{"pr":386,"data":"2026-09-11","tipo":"auditoria","titulo":"Inventario completo e o plano ate a versao vendavel","resumo":"Todas as pendencias do registro foram conferidas contra o codigo: 52 tinham o estado errado e 49 nem existiam no registro. O gate da versao vendavel ficou com 56 bloqueantes em 37 blocos (plano v5), mais 6 atos que dependem do dono; o prazo de 48 h nao cabe, e isso ficou registrado sem cortar escopo."},{"pr":385,"data":"2026-09-11","tipo":"correcao_critica","titulo":"A cobranca de uso da vistoria nao se perde mais","resumo":"A unidade que gera cobranca da vistoria passou a nascer junto com a vistoria, na mesma transacao: ou as duas existem, ou nenhuma. E o resumo de custo de nuvem passou a somar tudo no banco — antes parava em 10.000 linhas, cortando justamente a mais recente."},{"pr":381,"data":"2026-09-08","tipo":"auditoria","titulo":"O auditor de agentes para de adivinhar","resumo":"O verificador do elenco de agentes e skills encolheu ate o que da para checar com seguranca e passou a recusar, com nome, o que nao sabe medir. Sairam do diretorio vivo as cadeiras de junta de blocos ja encerrados."},{"pr":380,"data":"2026-09-07","tipo":"seguranca","titulo":"Todo upload passa por um portao unico","resumo":"Os cinco caminhos de envio de arquivo passaram por uma checagem unica: o tipo e conferido pelos bytes, nao pelo que o cliente diz, e o download sai sem executar conteudo. Efeito declarado: sem antivirus real, producao e homologacao recusam upload ate o bloco B-AV-REAL."},{"pr":371,"data":"2026-09-05","tipo":"correcao_critica","titulo":"O razao financeiro deixa de fabricar dinheiro","resumo":"Pagamento, estorno, cheque e fechamento de periodo passaram a acontecer numa unidade atomica por organizacao, com trava de linha. Fecharam 7 defeitos criticos de dinheiro — dois deles achados pela propria junta do bloco."},{"pr":369,"data":"2026-09-04","tipo":"seguranca","titulo":"O tecnico nao aprova mais a propria ordem","resumo":"Aprovar e rejeitar ganharam permissao propria, separada de editar OS, com separacao de funcoes e escopo por objeto; o bloqueio de conta por tentativas virou atomico. Ficou um residuo nomeado: dez caminhos de subrecurso da OS (bloco B-O6R-07c)."},{"pr":null,"data":"2026-09-08","tipo":"auditoria","titulo":"Rodada de governanca e registro (21 PRs, #360 a #384)","resumo":"Entre os blocos de produto, 21 PRs de governanca e registro: a junta passou a sobreviver a queda de quem a executa, as identidades de jurado queimadas viraram registro, o arnes de teste ganhou medicoes proprias, o registro passou a dizer o que a execucao diz e o caminho da sessao ate o repositorio foi fechado."},{"pr":359,"data":"2026-08-28","tipo":"qualidade","titulo":"O arnes de teste deixa de mentir sobre o proprio numero","resumo":"A suite passou a ter UM mecanismo de escrita de catalogo do Postgres — antes tres arquivos escreviam por fora e 7 de 13 rodadas ficavam vermelhas por disputa, inclusive derrubando quem respeitava o mecanismo. Agora sao 13 de 13, com o mesmo total em todas. O teardown deixou de poder abandonar usuario de banco com permissao de escrita: 10 rodadas completas terminaram com zero residuo, contra dois abandonados antes. E o runner passou a recusar o verde quando um arquivo de teste some sem avisar: em vez de publicar um total menor e plausivel, ele fica vermelho e diz QUAL arquivo sumiu."},{"pr":null,"data":"2026-08-18","tipo":"seguranca","titulo":"Identidade global: o e-mail deixa de decidir quem você é","resumo":"Fecha os dois piores achados da auditoria: administrador de organização não se promove mais a plataforma (allowlist fechada por construção) e a troca de organização passa a exigir VÍNCULO provado por credencial — homônimos deixam de virar a mesma pessoa. Login sem organização refeito (a senha decide), religação e desvínculo em autosserviço com revogação real de sessões, trilha append-only ilegível por organização e a luz login_without_org no readiness. Transações centrais provadas sob role NÃO-superusuário — a única configuração em que o isolamento existe.","fecha":["Ω6R-SEC-001","Ω6R-TEN-001"],"descobertos":[],"ciclos_de_reprovacao":0},{"pr":355,"data":"2026-08-16","tipo":"correcao","titulo":"A bateria de testes local passa a ser igual à da integração contínua","resumo":"O arquivo de ambiente do repositório fixava banco real e sequestrava a bateria local: 90 vermelhos falsos só na máquina do dono, e nenhum deles era defeito. O risco maior não era o vermelho — era alguém aprender a ignorá-lo. Agora o executor resolve o modo e o declara em uma linha.","fecha":[],"descobertos":[],"ciclos_de_reprovacao":0},{"pr":354,"data":"2026-08-15","tipo":"infraestrutura","titulo":"O ambiente de homologação deixa de dormir","resumo":"Escalar a zero era barato e silenciosamente errado: com a máquina dormindo, as tarefas de fundo não rodam — diárias de pátio, reconciliação de custódia e notificações legais não aconteceriam. O ambiente diria “verde” sem nunca ter executado uma tarefa. Custo autorizado pelo dono.","fecha":[],"descobertos":[],"ciclos_de_reprovacao":0},{"pr":353,"data":"2026-08-15","tipo":"correcao_critica","titulo":"Produção não sobe mais sem persistir e sem executor de tarefas","resumo":"Dois dos quinze achados críticos, fechados com portões que reprovam a subida em vez de avisar. Provisionar homologação pela lista antiga teria o boot reprovado por cinco itens que existiam no código e não estavam documentados.","fecha":["Ω6R-DAT-001","Ω6R-DIN-006"],"descobertos":[],"ciclos_de_reprovacao":0},{"pr":352,"data":"2026-08-15","tipo":"feature","titulo":"A ordem de serviço passa a ter um conjunto de vistorias","resumo":"Quatro ciclos de reprovação adversarial antes de passar. O terceiro ciclo inverteu o erro do segundo em vez de corrigir a raiz, e o comentário do código afirmava uma garantia que o código não dava. A quarta versão parou de inferir e passou a perguntar.","fecha":[],"descobertos":["Vistoria pendente não é lida na expedição","Razão de recusa não normalizada na criação","Verde vazio da bateria no Windows"],"ciclos_de_reprovacao":4},{"pr":347,"data":"2026-08-14","tipo":"auditoria","titulo":"Auditoria adversarial total — 30 achados catalogados","resumo":"Auditoria encomendada pelo próprio time, não por incidente. Veredito da junta: reprovado para produção, 5×0. Quinze achados críticos, quinze relevantes, cada um com módulo, evidência e bloco de correção.","fecha":[],"descobertos":["30 achados (15 críticos, 15 relevantes)"],"ciclos_de_reprovacao":0},{"pr":351,"data":"2026-08-12","tipo":"correcao","titulo":"A linha do tempo remota da ordem de serviço nunca funcionou","resumo":"O aplicativo de campo lia a resposta num formato que o servidor nunca enviou. Passava nos testes porque os testes usavam o formato errado dos dois lados. Fechou o componente da linha do tempo; detalhe, status e atribuição do mesmo achado seguem abertos — o achado é PARCIALMENTE superado, não fechado.","fecha":[],"descobertos":[],"ciclos_de_reprovacao":0,"superado_parcialmente":["Ω6R-QUA-004"]}]},"series_breaks":{"as_of":"2026-08-17","source":"Kpis/kpis-history.json — os dois casos estão descritos no campo description do próprio registro","nota":"Pontos em que a RÉGUA mudou: ou a métrica passou a medir outra coisa, ou ficou sem ser relida enquanto o trabalho acontecia. Nos dois casos, ligar os lados com uma linha contínua afirmaria um crescimento de um dia que não houve. Declarado aqui, e não inferido por tamanho do salto, porque salto grande também pode ser trabalho real de verdade.","itens":[{"serie":"backend_tests","data":"2026-07-13","de":15,"para":766,"motivo":"A medida passou a contar a suíte de backend INTEIRA. Antes contava só o núcleo do sistema — os outros 100 arquivos de teste já existiam e não entravam na conta."},{"serie":"frontend_smoke_tests","data":"2026-07-13","de":44,"para":378,"motivo":"O 44 era a contagem completa e real em 05/07 — a suíte do console web tinha 5 arquivos. Entre 05/07 e 13/07 nenhuma entrega releu a métrica: quatro registros repetiram o 44 enquanto a suíte crescia para 62 arquivos. O 378 é a releitura. O salto é trabalho real que a régua só registrou no fim."}]}};

 function startFrozen() {
   if (FROZEN && typeof FROZEN === "object") {
diff --git a/Kpis/kpis-history.json b/Kpis/kpis-history.json
index 805bd641..232f52d7 100644
--- a/Kpis/kpis-history.json
+++ b/Kpis/kpis-history.json
@@ -2505,6 +2505,6 @@
     "frontend_smoke_tests": "1214/1214",
     "blocks_completed": 170,
     "description": "B-SAN3-01b — as guardas da propriedade que o B-SAN3-01 fechou (decisão do dono `D-SAN3-01-MERGE-COM-BLOCO-DE-GUARDA`): (i) teste VIVO da `WorkOrdersPage` real com o hook real (DOM mínimo escrito no teste, zero dependência; `fetch` com os bytes do backend) — 403/500/200 vazio/200×3/pendente/403 em 2º plano, e `[W1]`/`[W2]` por comportamento; (ii) guard `[G1]` por alcance em profundidade ARBITRÁRIA + fecho de import + arquivo de fronteira, `[G1b]` para entidade fabricada inline, `[G2]` 29 formas, `[G3]` em disco; (iii) cabeçalhos dizem o que o guard prova e não prova (só comentário); (iv) \"Nova OS\" do cabeçalho só com `work_orders:create`, provado com os 13 papéis do catálogo executado (head-base: 7 viam o botão). Fecha 4 pendências (`P-SAN3-01B-PAGINA-NAO-AMARRADA-AO-ESTADO`, `P-SAN3-01B-GUARD-ALCANCE-MENOR-QUE-AS-RAIZES`, `P-SAN3-01B-VIGIA-TEXTUAL-DA-FIACAO`, `P-SAN3-01-NOVA-OS-SEM-GATE-NO-BOTAO`), abre 3 com dono. `frontend_smoke_tests` da EXECUÇÃO REAL 1202 → 1214 (+13 +1 −2), Node 22 e 20; backend/flutter CARREGADOS com nota (§C3.3: o PR não toca `src/`, `tests/` da raiz nem `mobile/`); `mvp_demo`/`mvp_vendavel` INTOCADOS (§C3.4: bloco de guarda — não move escopo; o item 4 do §4.1 já estava fechado pelo `B-SAN3-01`); `blocks_completed` 169 -> 170.",
-    "backfill_note": "`pr` null NA AUTORIA (tarefa de nuvem; o orquestrador abre o PR e preenche); `merge_commit`/`approved_head` são `null` NA AUTORIA por contrato (§C3.5) e recebem backfill pós-merge (`approved_head` lido da ata da junta, não do head do merge). Nenhum backfill devido por este PR: a entrada do #397 já tem `merge_commit 513937b0…` e `approved_head 67c2c280…`, pagos pelo #398 (`5bcdcc58`). Se outro PR mergear antes, `blocks_completed` se RECONTA no pré-merge a partir da `main` de então. BACKFILL PAGO pelo registro do #402 (docs/registro-402): `pr 402`, `merge_commit 3e40a256…` (squash, árvore = a do head aprovado), `approved_head cdf370dc…` lido da ata `J-B-SAN3-01b.md`."
+    "backfill_note": "`pr` null NA AUTORIA (tarefa de nuvem; o orquestrador abre o PR e preenche); `merge_commit`/`approved_head` são `null` NA AUTORIA por contrato (§C3.5) e recebem backfill pós-merge (`approved_head` lido da ata da junta, não do head do merge). Nenhum backfill devido por este PR: a entrada do #397 já tem `merge_commit 513937b0…` e `approved_head 67c2c280…`, pagos pelo #398 (`5bcdcc58`). Se outro PR mergear antes, `blocks_completed` se RECONTA no pré-merge a partir da `main` de então. BACKFILL PAGO pelo registro do #402 (docs/registro-402): `pr 402`, `merge_commit 3e40a256…` (squash; a árvore do merge é a do head final do PR, `1483a6f7`, que é o head aprovado `cdf370dc` mais a ata e os votos), `approved_head cdf370dc…` lido da ata `J-B-SAN3-01b.md`."
   }
 ]
diff --git a/Kpis/kpis-history.md b/Kpis/kpis-history.md
index 3e02a75a..d717b231 100644
--- a/Kpis/kpis-history.md
+++ b/Kpis/kpis-history.md
@@ -2988,7 +2988,7 @@ próprio texto, §C7.4-bis) fez três coisas:
 | Backend / Smoke / Flutter | **CARREGADOS, sem reexecução** (§C3.3) — 3052/3054, 1202/1202, 864/864. O PR **não toca código nem teste**: o diff não traz arquivo de `src/`, `tests/`, `frontend/`, `mobile/`, `prisma/`, `scripts/` nem `.github/`. Os três números são os últimos oficiais, publicados pelo `B-SAN3-00` (#392) e carregados pelo `B-GOV-SEM-TETO` (#394) |
 | Blocos Entregues | **168 → 169** — +1 bloco de governança, contado a partir do valor publicado na `origin/main` (`5b6e1036`, #396; o último PR que contou bloco foi o #394 = 168). O #393 também publica bloco no ramo dele: quem mergear depois **reconta** no pré-merge |
 | mvp_demo / mvp_vendável | **INTOCADOS** (§C3.4): o bloco não move escopo de produto — muda a regra de execução dos agentes, não o produto |
-| pr / merge_commit / approved_head | `397` / `null` / `null` **na autoria** (§C3.5) |
+| pr / merge_commit / approved_head | `397` / `513937b0…` / `67c2c280…` — backfill §C3.5 pago pelo #398 |

 **O que o bloco entrega.** Transcreve para o contrato de execução a decisão do dono de 2026-10-01
 (`D-PAUSA-GRAVA-E-PARA`): **sob ordem de pausa do dono, o agente grava o estado e para sozinho** — a norma **P7**
@@ -3027,7 +3027,7 @@ pagos pelo #395.
 | Backend / Flutter | **CARREGADOS, sem reexecução** (§C3.3) — 3052/3054, 864/864. Este PR **não toca `src/`, `tests/` da raiz nem `mobile/`** (`git diff --name-only origin/main...HEAD -- src tests mobile prisma` → vazio); últimos valores oficiais publicados pelo `B-SAN3-00` (#392) |
 | Blocos Entregues | **169 → 170** — +1 bloco de guarda do gate SAN3, contado a partir do valor publicado na `origin/main` (`4ab9d232`, #398; o último PR que contou bloco foi o #397 = 169). Se outro PR mergear antes, **reconta** no pré-merge |
 | mvp_demo / mvp_vendável | **INTOCADOS** (§C3.4): bloco de guarda — não move escopo; o item 4 do §4.1 já estava fechado pelo `B-SAN3-01` |
-| pr / merge_commit / approved_head | `null` / `null` / `null` **na autoria** (§C3.5) — tarefa de nuvem; o orquestrador abre o PR e preenche `pr` |
+| pr / merge_commit / approved_head | `402` / `3e40a256…` / `cdf370dc…` — backfill §C3.5 pago pelo #403 |

 **O que o bloco entrega** (decisão do dono `D-SAN3-01-MERGE-COM-BLOCO-DE-GUARDA`; plano `docs/revisoes/SAN3/B-SAN3-01b-plano.md`;
 relatório do dev `agent-orchestration/omega/juntas/votos/B-SAN3-01b/DEV-relatorio.md`):
diff --git a/Kpis/kpis-latest.json b/Kpis/kpis-latest.json
index 9821539a..44a5e323 100644
--- a/Kpis/kpis-latest.json
+++ b/Kpis/kpis-latest.json
@@ -11,7 +11,7 @@
     "approved_head": "cdf370dcb4c817e1c4292aed1204140951616971",
     "status": "published_per_pr",
     "summary": "B-SAN3-01b — transforma em garantia executável as duas propriedades que o B-SAN3-01 deixou verdadeiras só no código (decisão do dono `D-SAN3-01-MERGE-COM-BLOCO-DE-GUARDA`) e fecha quatro pendências: (i) `frontend/tests/work-orders-page-live.test.tsx` (novo, 13 casos) monta a `WorkOrdersPage` REAL com o hook REAL rodando efeitos sobre um DOM mínimo escrito no próprio teste (zero dependência), com os BYTES do backend na borda (`fetch`): 403 → `forbidden`, 500 → `error`, 200 vazio → `empty` embutido, 200×3 → linhas e KPIs, pendente → esqueletos, 403 em 2º plano → `forbidden` sem faixa; `[W1]`/`[W2]` por COMPORTAMENTO (falha em 2º plano mantém o dado com a faixa `stale`, lista e detalhe) — as mutações `N-PG-PAINEL`, `N-PG-KPI`, `N-W1TXT`, `N-W2TXT` ficam vermelhas sem tocar hook nenhum; (ii) o guard `[G1]` de `work-orders-honest-errors.test.tsx` passa a resolver re-export em profundidade ARBITRÁRIA (barrel de N níveis, re-export local, `default`, namespace, `import()`), varre o FECHO de import das raízes e o arquivo de fronteira `useServiceQuoteReferences.ts`, com denominadores e sítio sabido; `[G1b]` novo pega entidade fabricada inline (`id`/`code` constante em `catch`/`.catch(`/`??`/`||`); `[G2]` com 29 formas virtuais, `[G3]` em disco — `N-BARREL2`, `N-BARREL3`, `N-LITERAL`, `N-FORA-RAIZ` ficam vermelhas; (iii) os cabeçalhos de `dispatches.service.ts`, `repository.ts` e `useServiceQuoteReferences.ts` dizem o que o guard prova E o que não prova (só comentário); (iv) o botão \"Nova OS\" do cabeçalho só aparece com `work_orders:create` — a régua da rota `POST /work-orders` — provado papel a papel com os 13 papéis de `ROLE_PERMISSIONS` executado (vermelho-controle no head-base: 7 papéis viam o botão). Fecha `P-SAN3-01B-PAGINA-NAO-AMARRADA-AO-ESTADO`, `P-SAN3-01B-GUARD-ALCANCE-MENOR-QUE-AS-RAIZES`, `P-SAN3-01B-VIGIA-TEXTUAL-DA-FIACAO`, `P-SAN3-01-NOVA-OS-SEM-GATE-NO-BOTAO`; abre com dono `P-SAN3-01B-FIACAO-DO-CREATE-TEXTUAL` (B-SAN3-10), `P-SAN3-01B-PAGINA-FIACAO-DE-INTERACAO` (fila pós-gate), `P-SAN3-01B-GUARD-DE-ROTA-COM-ATALHO-DE-PLATAFORMA` (B-SAN3-06a). `frontend_smoke_tests` da EXECUÇÃO REAL: 1202 → 1214 (+13 arquivo vivo, +1 `[G1b]`, −2 `[W1]`/`[W2]` movidos), bloco 79/79, Node 22 e Node 20; demais trilhas CARREGADAS com nota (§C3.3); `mvp_*` intocados (§C3.4); `blocks_completed` 169 -> 170. Nenhuma rota, payload, tipo ou migração muda; `src/` e `prisma/` intocados.",
-    "backfill_note": "`pr` é `null` NA AUTORIA (o PR é aberto pelo orquestrador depois desta tarefa de nuvem) e é preenchido após `gh pr create`; `merge_commit`/`approved_head` são `null` NA AUTORIA por contrato (§C3.5) e recebem backfill pós-merge (`approved_head` = o objeto que a JUNTA julgou, lido da ata). Nenhum backfill devido por este PR: a entrada do #397 já tem `merge_commit 513937b0…` e `approved_head 67c2c280…`, pagos pelo registro #398 (`5bcdcc58`). Se outro PR mergear antes, `blocks_completed` se RECONTA no pré-merge a partir da `main` de então. As quatro métricas com nota de PR anterior (`backend_contract_tests_focused`, `flutter_modules`, `mobile_backend_contracts`, `mobile_core_saas_contracts`) seguem sob `P-KPI-NOTAS-CARREGADAS-REGRESSAO-392` (dono #393) — este PR não as toca. BACKFILL PAGO pelo registro do #402 (docs/registro-402): `pr 402`, `merge_commit 3e40a256…` (squash, árvore = a do head aprovado), `approved_head cdf370dc…` lido da ata `J-B-SAN3-01b.md`."
+    "backfill_note": "`pr` é `null` NA AUTORIA (o PR é aberto pelo orquestrador depois desta tarefa de nuvem) e é preenchido após `gh pr create`; `merge_commit`/`approved_head` são `null` NA AUTORIA por contrato (§C3.5) e recebem backfill pós-merge (`approved_head` = o objeto que a JUNTA julgou, lido da ata). Nenhum backfill devido por este PR: a entrada do #397 já tem `merge_commit 513937b0…` e `approved_head 67c2c280…`, pagos pelo registro #398 (`5bcdcc58`). Se outro PR mergear antes, `blocks_completed` se RECONTA no pré-merge a partir da `main` de então. As quatro métricas com nota de PR anterior (`backend_contract_tests_focused`, `flutter_modules`, `mobile_backend_contracts`, `mobile_core_saas_contracts`) seguem sob `P-KPI-NOTAS-CARREGADAS-REGRESSAO-392` (dono #393) — este PR não as toca. BACKFILL PAGO pelo registro do #402 (docs/registro-402): `pr 402`, `merge_commit 3e40a256…` (squash; a árvore do merge é a do head final do PR, `1483a6f7`, que é o head aprovado `cdf370dc` mais a ata e os votos), `approved_head cdf370dc…` lido da ata `J-B-SAN3-01b.md`."
   },
   "metrics": {
     "flutter_tests": {
diff --git a/agent-orchestration/controle/pendencias.md b/agent-orchestration/controle/pendencias.md
index 52286747..53c16c5a 100644
--- a/agent-orchestration/controle/pendencias.md
+++ b/agent-orchestration/controle/pendencias.md
@@ -9946,7 +9946,7 @@ genérico e o item está no `PLANO_SAN3.md` (§4.1/§5), o campo **dono** traz o
 - **prova (N = 1 mutação da cadeira; forma: módulo `work-orders.demo-data.ts`, fora da convenção `*.mock.ts(x)`/`mocks/`, devolvido pelo service no `catch` → bateria do bloco 79/79 verde, `[G1]` 0 vazamentos, `[G1b]` 0 fabricados; causa: `isMockModulePath` classifica a origem por convenção de nome):** `votos/B-SAN3-01b/C1-voto.json`, achado `N-C1-01`.
 - **escopo:** `pre-existente` — `isMockModulePath` nasceu em `83a3c68c` (2026-09-19, `B-SAN3-01`); o `B-SAN3-01b` não o tocou.
 - **efeito medido:** nenhum módulo assim existe hoje (a mutação foi da cadeira). É a fronteira por onde um dado fabricado novo entraria sem o guard ver.
-- **dono proposto pelo orquestrador:** `B-SAN3-06c`, que já é dono do dado demonstrativo da web (`P-SAN3-01-DESPACHOS-ALERTA-DADOS-DEMONSTRATIVOS`); o planejador do bloco confirma ou devolve.
+- **dono:** `B-SAN3-06c`, que já é dono do dado demonstrativo da web (`P-SAN3-01-DESPACHOS-ALERTA-DADOS-DEMONSTRATIVOS`) — atribuído pelo registro do #403.
 - **bloqueia:** não.
 - **teste de encerramento:** a origem de dado de demonstração é decidida por propriedade (o que o módulo devolve e por qual caminho é alcançado), e a mutação `work-orders.demo-data.ts` deixa o guard vermelho.

@@ -9956,7 +9956,7 @@ genérico e o item está no `PLANO_SAN3.md` (§4.1/§5), o campo **dono** traz o
 - **prova (N = 2 mutações da cadeira; forma: M2c-i, atalho de plataforma, fica verde 13/13; M2c-ii, papel separador de sonda, é acusado em `[GB1]`/`[GB2]`; o atalho por rótulo "Super Admin" não é exercitável porque o arnês monta o papel pela chave):** `votos/B-SAN3-01b/C2-voto.json` e `C2-evidencia.md`.
 - **escopo:** `dentro-do-bloco` (nota; não reprovou). A propriedade "régua = inclusão estrita" está provada por parse e pela sonda, não pelo catálogo.
 - **efeito medido:** hoje nenhum papel do catálogo separa as duas réguas; a prova enfraquece no dia em que um papel separador existir sem teste.
-- **dono proposto pelo orquestrador:** `B-SAN3-06a`, dono das permissões por papel no front (`P-SAN3-04A-FRONT-PERMISSOES-POR-PAPEL-DEFASADAS`); o planejador do bloco confirma ou devolve.
+- **dono:** `B-SAN3-06a`, dono das permissões por papel no front (`P-SAN3-04A-FRONT-PERMISSOES-POR-PAPEL-DEFASADAS`) — atribuído pelo registro do #403.
 - **bloqueia:** não.
 - **teste de encerramento:** o teste papel a papel do botão inclui um papel separador permanente, ou o atalho por rótulo passa a ser exercitável pelo arnês.



Veredito parcial: ec=0

## Terreno isolado — 2026-10-03T16:33:30.465592+00:00

Comando / medido por: git worktree add --detach C:/Users/AMP/w-port404 origin/main

Saída resumida:
Preparing worktree (detached HEAD b404815c)
Updating files:  17% (643/3594)Updating files:  18% (647/3594)Updating files:  19% (683/3594)Updating files:  20% (719/3594)Updating files:  21% (755/3594)Updating files:  22% (791/3594)Updating files:  23% (827/3594)Updating files:  24% (863/3594)Updating files:  25% (899/3594)Updating files:  26% (935/3594)Updating files:  27% (971/3594)Updating files:  28% (1007/3594)Updating files:  29% (1043/3594)Updating files:  30% (1079/3594)Updating files:  31% (1115/3594)Updating files:  32% (1151/3594)Updating files:  33% (1187/3594)Updating files:  34% (1222/3594)Updating files:  35% (1258/3594)Updating files:  36% (1294/3594)Updating files:  36% (1300/3594)Updating files:  37% (1330/3594)Updating files:  38% (1366/3594)Updating files:  39% (1402/3594)Updating files:  40% (1438/3594)Updating files:  41% (1474/3594)Updating files:  42% (1510/3594)Updating files:  43% (1546/3594)Updating files:  44% (1582/3594)Updating files:  45% (1618/3594)Updating files:  46% (1654/3594)Updating files:  47% (1690/3594)Updating files:  48% (1726/3594)Updating files:  49% (1762/3594)Updating files:  50% (1797/3594)Updating files:  51% (1833/3594)Updating files:  52% (1869/3594)Updating files:  53% (1905/3594)Updating files:  54% (1941/3594)Updating files:  55% (1977/3594)Updating files:  56% (2013/3594)Updating files:  57% (2049/3594)Updating files:  57% (2082/3594)Updating files:  58% (2085/3594)Updating files:  59% (2121/3594)Updating files:  60% (2157/3594)Updating files:  61% (2193/3594)Updating files:  62% (2229/3594)Updating files:  63% (2265/3594)Updating files:  64% (2301/3594)Updating files:  65% (2337/3594)Updating files:  66% (2373/3594)Updating files:  67% (2408/3594)Updating files:  68% (2444/3594)Updating files:  69% (2480/3594)Updating files:  70% (2516/3594)Updating files:  71% (2552/3594)Updating files:  72% (2588/3594)Updating files:  73% (2624/3594)Updating files:  74% (2660/3594)Updating files:  75% (2696/3594)Updating files:  76% (2732/3594)Updating files:  77% (2768/3594)Updating files:  78% (2804/3594)Updating files:  78% (2806/3594)Updating files:  79% (2840/3594)Updating files:  80% (2876/3594)Updating files:  81% (2912/3594)Updating files:  82% (2948/3594)Updating files:  83% (2984/3594)Updating files:  84% (3019/3594)Updating files:  85% (3055/3594)Updating files:  86% (3091/3594)Updating files:  87% (3127/3594)Updating files:  88% (3163/3594)Updating files:  89% (3199/3594)Updating files:  90% (3235/3594)Updating files:  91% (3271/3594)Updating files:  92% (3307/3594)Updating files:  93% (3343/3594)Updating files:  94% (3379/3594)Updating files:  95% (3415/3594)Updating files:  96% (3451/3594)Updating files:  97% (3487/3594)Updating files:  98% (3523/3594)Updating files:  99% (3559/3594)Updating files: 100% (3594/3594)Updating files: 100% (3594/3594), done.
HEAD is now at b404815c docs(registro): as quatro ressalvas do porteiro do #403 (#404)


Veredito parcial: ec=0

## A2. Parecer 403 byte a byte — 2026-10-03T16:34:09.221863+00:00

Comando / medido por: git show b404815c:agent-orchestration/omega/juntas/votos/B-SAN3-01b/PORTEIRO-403.md; hashlib.md5/read_bytes origem declarada

Saída resumida:
{"source": "C:\\Users\\AMP\\AppData\\Local\\Temp\\claude\\c--Users-AMP-Documents-GitHub-ERP-Techsolutios\\3ad1b87d-fdbf-41f2-b085-1068e01c5d64\\scratchpad\\PORTEIRO-403.md", "exists": true, "blob_bytes": 22600, "blob_raw_md5": "34bb418f026b79a74a27d8e731a490c6", "source_raw_md5": "34bb418f026b79a74a27d8e731a490c6", "raw_equal": true, "eol_equal": true}

Veredito parcial: CONFERE

## A2. Parecer 399 byte a byte — 2026-10-03T16:34:09.343869+00:00

Comando / medido por: git show b404815c:agent-orchestration/omega/juntas/votos/B-GOV-PAUSA/PORTEIRO-399.md; hashlib.md5/read_bytes origem declarada

Saída resumida:
{"source": "C:\\Users\\AMP\\AppData\\Local\\Temp\\claude\\c--Users-AMP-Documents-GitHub-ERP-Techsolutios\\3ad1b87d-fdbf-41f2-b085-1068e01c5d64\\scratchpad\\PORTEIRO-399.md", "exists": true, "blob_bytes": 14213, "blob_raw_md5": "c57b1a48c54029f126aacc0d94a7de9c", "source_raw_md5": "c57b1a48c54029f126aacc0d94a7de9c", "raw_equal": true, "eol_equal": true, "equals_04cedbea_blob": true}

Veredito parcial: CONFERE

## A2. Delta estrutural KPI — 2026-10-03T16:34:09.469470+00:00

Comando / medido por: git show b404815c^:Kpis/kpis-latest.json e b404815c:Kpis/kpis-latest.json; diff recursivo JSON

Saída resumida:
[".release.backfill_note"]

Veredito parcial: Só backfill_note; números intactos

## A2. Delta estrutural KPI — 2026-10-03T16:34:09.627113+00:00

Comando / medido por: git show b404815c^:Kpis/kpis-history.json e b404815c:Kpis/kpis-history.json; diff recursivo JSON

Saída resumida:
["[165].backfill_note"]

Veredito parcial: Só backfill_note; números intactos

## A2. Código do painel — 2026-10-03T16:34:09.761570+00:00

Comando / medido por: Comparação app.js antes/depois removendo exclusivamente linha var FROZEN

Saída resumida:
True

Veredito parcial: Código idêntico fora da carga congelada

## A3. Dependências próprias — 2026-10-03T16:35:14.355022+00:00

Comando / medido por: node npm-cli.js ci --no-audit --no-fund --ignore-scripts; cwd C:/Users/AMP/w-port404; timeout 120s

Saída resumida:
npm warn EBADENGINE Unsupported engine {
npm warn EBADENGINE   package: '@prisma/streams-local@0.1.2',
npm warn EBADENGINE   required: { bun: '>=1.3.6', node: '>=22.0.0' },
npm warn EBADENGINE   current: { node: 'v20.19.5', npm: '11.7.0' }
npm warn EBADENGINE }

added 326 packages in 38s


Veredito parcial: ec=0

## A3. Reexecução focada — 2026-10-03T16:35:19.437469+00:00

Comando / medido por: ["node", "--version"]

Saída resumida:
v20.19.5


Veredito parcial: ec=0

## A3. Reexecução focada — 2026-10-03T16:35:19.912439+00:00

Comando / medido por: ["node", "scripts/kpi-freeze.mjs", "--check"]

Saída resumida:
kpi-freeze: em dia (snapshot 2026-10-02).


Veredito parcial: ec=0

## A3. Reexecução focada — 2026-10-03T16:35:20.098599+00:00

Comando / medido por: ["node", "--check", "Kpis/app.js"]

Saída resumida:


Veredito parcial: ec=0

## A3. Reexecução focada — 2026-10-03T16:35:28.242928+00:00

Comando / medido por: ["node", "--test", "--import", "tsx", "tests/kpi-dashboard-charts.test.ts", "tests/kpi-achados-paridade.test.ts", "tests/kpi-dashboard-contraste.test.ts"]

Saída resumida:
TAP version 13
# Subtest: auditoria: o painel publica exatamente a contagem do registro de achados
ok 1 - auditoria: o painel publica exatamente a contagem do registro de achados
  ---
  duration_ms: 3.0576
  ...
# Subtest: auditoria: cada achado do registro aparece no painel, com o mesmo estado
ok 2 - auditoria: cada achado do registro aparece no painel, com o mesmo estado
  ---
  duration_ms: 1.1318
  ...
# Subtest: auditoria: todo achado fechado carrega rastro — quem fechou e quando
ok 3 - auditoria: todo achado fechado carrega rastro — quem fechou e quando
  ---
  duration_ms: 4.6918
  ...
# Subtest: auditoria: o veredito só some da tela quando não houver mais crítico aberto
ok 4 - auditoria: o veredito só some da tela quando não houver mais crítico aberto
  ---
  duration_ms: 2.4007
  ...
# Subtest: auditoria: o cronograma cobre todo achado aberto, e nenhum bloco promete achado inexistente
ok 5 - auditoria: o cronograma cobre todo achado aberto, e nenhum bloco promete achado inexistente
  ---
  duration_ms: 4.5094
  ...
# Subtest: auditoria: achado fechado SEM merge não conta como corrigido no painel
ok 6 - auditoria: achado fechado SEM merge não conta como corrigido no painel
  ---
  duration_ms: 5.4968
  ...
# Subtest: painel: o index.html declara os contêineres dos gráficos e a seção nasce escondida
ok 7 - painel: o index.html declara os contêineres dos gráficos e a seção nasce escondida
  ---
  duration_ms: 5.4213
  ...
# Subtest: painel: `hidden` realmente esconde — o CSS de autor não pode vencer o [hidden] do user agent
ok 8 - painel: `hidden` realmente esconde — o CSS de autor não pode vencer o [hidden] do user agent
  ---
  duration_ms: 1.7758
  ...
# Subtest: painel: a SÉRIE desenhada é a do kpis-history.json, ponto a ponto (não série fabricada)
ok 9 - painel: a SÉRIE desenhada é a do kpis-history.json, ponto a ponto (não série fabricada)
  ---
  duration_ms: 358.7702
  ...
# Subtest: painel: mutar o histórico move a curva — a série não é constante disfarçada
ok 10 - painel: mutar o histórico move a curva — a série não é constante disfarçada
  ---
  duration_ms: 274.8579
  ...
# Subtest: painel: lacuna de medição não vira zero nem pico
ok 11 - painel: lacuna de medição não vira zero nem pico
  ---
  duration_ms: 543.3574
  ...
# Subtest: painel: semana sem MEDIÇÃO não vira zero entregas, e a soma fecha com o acumulado
ok 12 - painel: semana sem MEDIÇÃO não vira zero entregas, e a soma fecha com o acumulado
  ---
  duration_ms: 552.2937
  ...
# Subtest: painel: os gráficos são SVG inline, sem recurso externo, e aparecem com dado real
ok 13 - painel: os gráficos são SVG inline, sem recurso externo, e aparecem com dado real
  ---
  duration_ms: 272.0481
  ...
# Subtest: painel: sem servidor o painel NÃO inventa gráfico, e diz que a cópia é congelada (D-007)
ok 14 - painel: sem servidor o painel NÃO inventa gráfico, e diz que a cópia é congelada (D-007)
  ---
  duration_ms: 258.4734
  ...
# Subtest: painel: com fetch que REJEITA (o file:// de verdade) o painel cai no congelado e não desenha
ok 15 - painel: com fetch que REJEITA (o file:// de verdade) o painel cai no congelado e não desenha
  ---
  duration_ms: 262.5718
  ...
# Subtest: painel: se só o histórico falhar, os cartões vivos aparecem e os gráficos dizem por que não
ok 16 - painel: se só o histórico falhar, os cartões vivos aparecem e os gráficos dizem por que não
  ---
  duration_ms: 268.7244
  ...
# Subtest: painel: a cópia congelada é IDÊNTICA ao kpis-latest.json (gerada, nunca digitada)
ok 17 - painel: a cópia congelada é IDÊNTICA ao kpis-latest.json (gerada, nunca digitada)
  ---
  duration_ms: 284.678
  ...
# Subtest: painel: quebra de medida declarada existe no histórico e é DESENHADA como quebra
ok 18 - painel: quebra de medida declarada existe no histórico e é DESENHADA como quebra
  ---
  duration_ms: 275.2191
  ...
# Subtest: painel: número declarado ESTIMATIVA na fonte chega à tela dizendo que é estimativa
ok 19 - painel: número declarado ESTIMATIVA na fonte chega à tela dizendo que é estimativa
  ---
  duration_ms: 260.1738
  ...
# Subtest: painel: com zero achados críticos abertos, a página NÃO anuncia destravamento de produção
ok 20 - painel: com zero achados críticos abertos, a página NÃO anuncia destravamento de produção
  ---
  duration_ms: 277.7046
  ...
# Subtest: painel: histórico vazio ou ilegível não derruba a página nem produz gráfico
ok 21 - painel: histórico vazio ou ilegível não derruba a página nem produz gráfico
  ---
  duration_ms: 797.0569
  ...
# Subtest: painel: o gráfico de rodadas conta entregas reais e DIZ o que ele recorta
ok 22 - painel: o gráfico de rodadas conta entregas reais e DIZ o que ele recorta
  ---
  duration_ms: 269.6448
  ...
# Subtest: painel: a rodada SAN3 tem barra própria — entrega `B-SAN3-*` não cai em "Blocos B"
ok 23 - painel: a rodada SAN3 tem barra própria — entrega `B-SAN3-*` não cai em "Blocos B"
  ---
  duration_ms: 269.628
  ...
# Subtest: painel: contraste mínimo no tema claro
ok 24 - painel: contraste mínimo no tema claro
  ---
  duration_ms: 4.6992
  ...
# Subtest: painel: contraste mínimo no tema escuro
ok 25 - painel: contraste mínimo no tema escuro
  ---
  duration_ms: 0.6604
  ...
# Subtest: painel: nenhuma cor nasce dentro de um bloco de tema
ok 26 - painel: nenhuma cor nasce dentro de um bloco de tema
  ---
  duration_ms: 0.5501
  ...
# Subtest: painel: cor literal não escapa do sistema de tokens
ok 27 - painel: cor literal não escapa do sistema de tokens
  ---
  duration_ms: 1.2373
  ...
# Subtest: painel: toda classe de marca SVG que o app.js emite tem regra no CSS
ok 28 - painel: toda classe de marca SVG que o app.js emite tem regra no CSS
  ---
  duration_ms: 4.7548
  ...
# Subtest: painel: body pinta o próprio fundo a partir de um token
ok 29 - painel: body pinta o próprio fundo a partir de um token
  ---
  duration_ms: 1.6307
  ...
1..29
# tests 29
# suites 0
# pass 29
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 7965.1851


Veredito parcial: ec=0

## A3. Reexecução focada — 2026-10-03T16:35:28.398213+00:00

Comando / medido por: ["git", "diff", "--check", "b404815c^", "b404815c"]

Saída resumida:


Veredito parcial: ec=0

## A3. Limite da medição — 2026-10-03T16:35:28.482461+00:00

Comando / medido por: git diff b404815c^ b404815c; guards focados

Saída resumida:
Sem código funcional, testes ou métricas alterados. Smoke web, backend completo e Flutter não reexecutados; não há contagem nova dessas trilhas no #404.

Veredito parcial: Não confundir números carregados com execução deste porteiro.

## B1-B2. Backfill, destino e CI — 2026-10-03T16:35:46.473361+00:00

Comando / medido por: ["git", "grep", "-n", "B-SAN3-06c", "b404815c", "--", "docs/revisoes/SAN3", "agent-orchestration/controle/decisoes.md"]

Saída resumida:
b404815c:agent-orchestration/controle/decisoes.md:2387:   `B-SAN3-06c`.
b404815c:docs/revisoes/SAN3/B-SAN3-01b-plano.md:226:| D7 | §13 N1 | citação-errada | **aplicada** — 21 com pendência e dono conferidos, 1 sem pendência nominando o arquivo | `git show origin/main:<C4-evidencia>` l.430-434 e l.355-362 (`dashboard/repository.ts:29` → só a pendência da tela, dono `B-SAN3-06c`) |
b404815c:docs/revisoes/SAN3/B-SAN3-01b-plano.md:593:| N1 | Os **21** membros de mock sem guarda (P-A) e o **1** literal com identidade constante em ramo de falha (P-B) **fora** das raízes — **medidos aqui**, no head `3b1fe0f9`, com o gerador do Apêndice A ampliado a todo `src/` (Apêndice H3: só `ROOT_DIRS = [""]` e `ROOT_FILES = []` mudam) → `VAZAMENTOS=21` em `dashboard/repository.ts:29`, `logistics/repository.ts:7,8,9`, `navigation/useNavigationMenu.ts:15`, `platform/cloud-billing/cloud-billing.service.ts` ×11, `platform/platform.service.ts:21,79,86`, `services/realtime/pollingClient.ts:13` ×2; `FABRICA=1` em `inventory/cycle-counts.adapter.ts:90` (`{id: ""}` em `??`). Coincide com o censo da C4 no objeto `8adaaa31` ((a)=21, (c)=1), cujo script não está na ref | já registradas: `P-SAN3-01-LOGISTICS-FICCAO-ROTEADA`, `P-SAN3-01-NAV-MENU-DEMO-NO-ERRO`, `P-SAN3-01-MOCKMODE-TRES-AUTORIDADES`, `P-WEB-PLATAFORMA-TELAS-FICCAO`, `P-SAN3-01-INVENTARIO-FECHAMENTO-CONTAGEM-FABRICADO`, `P-SAN3-01-DASHBOARD-DESPACHOS-ERRO-COMO-VAZIO` | os já nomeados — a C4 conferiu pendência e dono dos 21 (`votos/B-SAN3-01-c2/C4-…-evidencia.md` M12, l.430-434: "21 com pendência e dono conferidos, **1 sem pendência nominando o arquivo**"): esse 1 é `dashboard/repository.ts:29`, coberto pela pendência da **tela** (`P-SAN3-01-DASHBOARD-DESPACHOS-ERRO-COMO-VAZIO`, dono `B-SAN3-06c`, l.355-362); o `pollingClient` está na pendência da fatia (`pendencias.md` l.8546 no objeto dela); o literal do `inventory` está na `P-SAN3-01-INVENTARIO-…`. Medido aqui: **nenhum** dos 22 está no fecho das raízes (0 vazamentos no fecho, Apêndice A) |
b404815c:docs/revisoes/SAN3/B-SAN3-01b-plano.md:599:| N7 | A fonte Inter não carregada muda o peso do título do cabeçalho | já registrada: `P-WEB-FONTE-INTER-NAO-CARREGADA` | `B-SAN3-06c` |


Veredito parcial: ec=0

## B1-B2. Backfill, destino e CI — 2026-10-03T16:35:46.530371+00:00

Comando / medido por: ["git", "rev-parse", "cdf370dc^{tree}", "1483a6f7^{tree}", "3e40a256^{tree}"]

Saída resumida:
816d60431d4bcae2fd741891c5fab127c880b4f7
8209ebc45ff5f633533cf9a2828ce6ad1636166e
8209ebc45ff5f633533cf9a2828ce6ad1636166e


Veredito parcial: ec=0

## B1-B2. Backfill, destino e CI — 2026-10-03T16:35:46.598472+00:00

Comando / medido por: ["git", "diff", "--name-only", "cdf370dc", "1483a6f7"]

Saída resumida:
agent-orchestration/omega/juntas/J-B-SAN3-01b.md
agent-orchestration/omega/juntas/votos/B-SAN3-01b/C1-evidencia.md
agent-orchestration/omega/juntas/votos/B-SAN3-01b/C1-voto.json
agent-orchestration/omega/juntas/votos/B-SAN3-01b/C2-evidencia.md
agent-orchestration/omega/juntas/votos/B-SAN3-01b/C2-voto.json
agent-orchestration/omega/juntas/votos/B-SAN3-01b/C3-evidencia.md
agent-orchestration/omega/juntas/votos/B-SAN3-01b/C3-voto.json


Veredito parcial: ec=0

## B1-B2. Backfill, destino e CI — 2026-10-03T16:35:48.839929+00:00

Comando / medido por: ["gh", "pr", "view", "402", "--json", "state,headRefOid,mergeCommit"]

Saída resumida:
{"headRefOid":"1483a6f7680ba9504e12bf25eaaa423373cd1a01","mergeCommit":{"oid":"3e40a256ce801a8e63230b4b764ba1d2803f4f23"},"state":"MERGED"}


Veredito parcial: ec=0

## B1-B2. Backfill, destino e CI — 2026-10-03T16:35:50.168931+00:00

Comando / medido por: ["gh", "api", "repos/thiagodorgo/ERP_Techsolutios/commits/cc7a2acd16854b19cc44315c5eb5fb6b29788d27/check-runs", "--jq", "{total: .total_count, runs: [.check_runs[] | {name,status,conclusion}]}"]

Saída resumida:
{"runs":[{"conclusion":"success","name":"docker","status":"completed"},{"conclusion":"success","name":"docker","status":"completed"},{"conclusion":"success","name":"frontend","status":"completed"},{"conclusion":"success","name":"owner-portal","status":"completed"},{"conclusion":"success","name":"backend-postgres","status":"completed"},{"conclusion":"success","name":"flutter","status":"completed"},{"conclusion":"success","name":"backend","status":"completed"},{"conclusion":"success","name":"authority-portal","status":"completed"},{"conclusion":"success","name":"backend","status":"completed"},{"conclusion":"success","name":"authority-portal","status":"completed"},{"conclusion":"success","name":"flutter","status":"completed"},{"conclusion":"success","name":"owner-portal","status":"completed"},{"conclusion":"success","name":"backend-postgres","status":"completed"},{"conclusion":"success","name":"frontend","status":"completed"}],"total":14}


Veredito parcial: ec=0

## B2. Junta de registro puro — 2026-10-03T16:35:50.282006+00:00

Comando / medido por: git show b404815c:agent-orchestration/controle/pendencias.md (seção nomeada)

Saída resumida:
## P-GOV-REGISTRO-PURO-QUORUM (2026-09-05) — MÉDIA · PR de registro puro: junta de 3 ou uma cadeira independente? A prática desta cadeia foi as duas coisas

**Registrado por §A2, não decidido em silêncio.** Achado pela cadeira independente que julgou o PR de
registro consolidado do `B-O6R-02` c5, que explicitamente **não** quis escolher a convenção — e quem
escreveu o PR também não deve escolhê-la sozinho, porque é a regra que o julga.

**O conflito, medido na cadeia INTEIRA de 7 PRs de registro** (`#372`–`#378`; a primeira versão desta
entrada dizia "6" e omitia `#372` e `#376` — corrigido por medição de cadeira independente):

| PR | merge | tem ata de junta? |
|---|---|---|
| #372 | `cae6086` | **não** — julgado por porteiro independente pré-merge, uma cadeira, sem ata |
| #373 | `0afedf8` | **sim** — `J-O6R-07a-ressalvas.md`, 3 cadeiras |
| #374 | `066b47e` | **não** |
| #375 | `1a7ad4d` | **não** |
| #376 | `3c29189` | **não** — só reavaliação de porteiro pós-merge |
| #377 | `9919f4d` | **não** |
| #378 | `ed0a692` | **não** — **três** passadas de uma cadeira independente (pré-merge, a 3ª LIBEROU) + o parecer do `porteiro-pos-merge` de `ed0a692`; nenhuma junta de 3. Os **quatro** corpos estão em `agent-orchestration/omega/juntas/votos/B-O6R-02-ciclo5-consolidado/` — persistidos DEPOIS do merge, pela ressalva **A2** daquele porteiro: eles não existiam no repo quando o #378 mergeou, que é a mesma classe `D-DURABILIDADE-BRANCHES-LOCAIS` que o **R1** do #378 acabara de pagar |

Conferido: não existe `J-*.md` nem diretório em `votos/` para `#372` e `#376`; eles só aparecem
**citados** em documentos de outros blocos.

O §C7.1 diz *"junta sem registro = merge inválido"* e não abre exceção por tipo de PR. Lido ao pé da
letra, **cinco** merges **já consumados** seriam inválidos (`#372`, `#374`, `#375`, `#376`, `#377`) — o que
ou está errado, ou é uma dívida que ninguém declarou. O §C7.1-ter(b) calibra **quórum por risco** (unanimidade de 3 quando o bloco toca dinheiro,
segurança, permissão ou perda de dado; maioria de 3 no resto), mas o "resto" pressupõe uma junta; não
existe faixa escrita para *"PR que não toca código, teste nem escopo"*.

**Por que não é academicismo:** um PR de registro **move números publicados** (este mexeu em
`production_readiness`, no `blocks_completed` do histórico e no placar de pendências) e **corrige
instruções que outros agentes obedecem** (a nota do `.agents/agents/README.md` mandava desligar um guard).
É pouco risco de produto e **muito** risco de registro — exatamente a categoria que o §C7.1-ter foi
escrito para calibrar, e a única que ele não nomeia.

**Critério de fechamento (o que fecha, não como fazer):** uma decisão **escrita** — do dono ou de junta —
que diga, para PR que não toca `src/`, `tests/` nem `prisma/`, qual é o quórum exigido; e, se for menos
que 3, o que substitui a ata (parecer de cadeira independente registrado em `votos/`, por exemplo). As
duas respostas são legítimas; a ausência não é, porque hoje o mesmo tipo de PR mergeou dos dois jeitos na
mesma semana.

**SEGUNDA PERGUNTA, acrescentada em 2026-09-05 (achado de cadeira independente): quem persiste o
parecer?** Os quatro pareceres que julgaram o #378 foram gravados no repo **pelo próprio autor julgado**
(`votos/B-O6R-02-ciclo5-consolidado/`), porque os agentes de junta devolvem texto e não gravam arquivo.
Isso cria um mecanismo em que **a parte interessada é a única testemunha da fidelidade do parecer que a
julga**. Nenhuma reescrita foi detectada — uma cadeira independente re-mediu 26 afirmações desses corpos
e as 26 reproduzem, e os seis over-claims contra o autor estão preservados —, mas *não detectado* não é
*impossível*, e hoje não há artefato que torne a verificação desnecessária. Entra aqui, e não numa
pendência própria, porque é a mesma pergunta: **qual é o registro válido de aprovação de um PR que não
toca código?** Uma resposta que exija ata de 3 provavelmente resolve as duas metades; uma que aceite
cadeira independente precisa dizer **quem grava**.

- **status:** ABERTA · **severidade:** MÉDIA · **escopo:** `pre-existente` (evidência: a assimetria começa
  no #373/#374, 2026-09-05, antes deste PR; e o §C7.1 é de 2026-07-13) · **dono:** **decisão do dono ou de
  junta de governança** — não é matéria de implementação, e quem escreve PR de registro é parte
  interessada na resposta



Veredito parcial: Dívida de governança preexistente; origem 2026-09-05, sem correção neste gate.

## A2 complementar. Cabeçalhos ainda na autoria — 2026-10-03T16:35:50.354853+00:00

Comando / medido por: git show b404815c:Kpis/kpis-history.md; seleção dos títulos e linhas de backfill

Saída resumida:
2982: ## 2026-10-01 — B-GOV-PAUSA (PR #397, na autoria) — sob ordem de pausa, o agente grava o estado e para sozinho
2991: | pr / merge_commit / approved_head | `397` / `513937b0…` / `67c2c280…` — backfill §C3.5 pago pelo #398 |
3020: ## 2026-10-02 — B-SAN3-01b (PR na autoria) — a web não fabrica dado: a guarda vale por alcance e pelo estado da página
3030: | pr / merge_commit / approved_head | `402` / `3e40a256…` / `cdf370dc…` — backfill §C3.5 pago pelo #403 |

Veredito parcial: RESSALVA: tabelas corrigidas, títulos 2982 e 3020 ainda dizem na autoria; promessa de seções sem essa expressão apenas parcialmente cumprida.

## C2 preparação. Próximos alvos — 2026-10-03T16:36:10.450116+00:00

Comando / medido por: ["gh", "pr", "view", "401", "--json", "number,state,title,headRefOid,headRefName,baseRefName"]

Saída resumida:
{"baseRefName":"main","headRefName":"fix/dossie-versao-da-vistoria","headRefOid":"59aa7593f7d245e1d57ffeb0b5ca12fb98f10247","number":401,"state":"OPEN","title":"fix(patios): o dossiê rotula a vistoria substituída (B-SAN3-11)"}


Veredito parcial: ec=0; somente identificação, nenhum comando nos worktrees alheios

## C2 preparação. Próximos alvos — 2026-10-03T16:36:11.699229+00:00

Comando / medido por: ["gh", "pr", "view", "393", "--json", "number,state,title,headRefOid,headRefName,baseRefName"]

Saída resumida:
{"baseRefName":"main","headRefName":"chore/mandato-refs-e-preflight","headRefOid":"371b09b26cf51ee28996074c81e2f91dca585cc3","number":393,"state":"OPEN","title":"chore(orquestracao): o mandato do orquestrador passa a ser verificavel por maquina (B-GOV-MANDATO)"}


Veredito parcial: ec=0; somente identificação, nenhum comando nos worktrees alheios

## C2 preparação. Próximos alvos — 2026-10-03T16:36:13.200533+00:00

Comando / medido por: ["gh", "pr", "view", "400", "--json", "number,state,title,headRefOid,headRefName,baseRefName"]

Saída resumida:
{"baseRefName":"main","headRefName":"feat/bootstrap-platform-admin","headRefOid":"8deebefc66e94005d7a037dbf5b133c74edb4f10","number":400,"state":"OPEN","title":"feat(bootstrap): caminho versionado para o 1º admin de plataforma (B-SAN3-09)"}


Veredito parcial: ec=0; somente identificação, nenhum comando nos worktrees alheios

## B1. KPI fechado — 2026-10-03T16:36:53.883763+00:00

Comando / medido por: git show b404815c:Kpis/{kpis-latest.json,kpis-history.json}; extração JSON

Saída resumida:
{"latest": {"pr": 402, "merge_commit": "3e40a256ce801a8e63230b4b764ba1d2803f4f23", "approved_head": "cdf370dcb4c817e1c4292aed1204140951616971", "status": "published_per_pr", "backfill_note": "`pr` é `null` NA AUTORIA (o PR é aberto pelo orquestrador depois desta tarefa de nuvem) e é preenchido após `gh pr create`; `merge_commit`/`approved_head` são `null` NA AUTORIA por contrato (§C3.5) e recebem backfill pós-merge (`approved_head` = o objeto que a JUNTA julgou, lido da ata). Nenhum backfill devido por este PR: a entrada do #397 já tem `merge_commit 513937b0…` e `approved_head 67c2c280…`, pagos pelo registro #398 (`5bcdcc58`). Se outro PR mergear antes, `blocks_completed` se RECONTA no pré-merge a partir da `main` de então. As quatro métricas com nota de PR anterior (`backend_contract_tests_focused`, `flutter_modules`, `mobile_backend_contracts`, `mobile_core_saas_contracts`) seguem sob `P-KPI-NOTAS-CARREGADAS-REGRESSAO-392` (dono #393) — este PR não as toca. BACKFILL PAGO pelo registro do #402 (docs/registro-402): `pr 402`, `merge_commit 3e40a256…` (squash; a árvore do merge é a do head final do PR, `1483a6f7`, que é o head aprovado `cdf370dc` mais a ata e os votos), `approved_head cdf370dc…` lido da ata `J-B-SAN3-01b.md`."}, "history": {"pr": 402, "merge_commit": "3e40a256ce801a8e63230b4b764ba1d2803f4f23", "approved_head": "cdf370dcb4c817e1c4292aed1204140951616971", "status": "CAMPO AUSENTE", "backfill_note": "`pr` null NA AUTORIA (tarefa de nuvem; o orquestrador abre o PR e preenche); `merge_commit`/`approved_head` são `null` NA AUTORIA por contrato (§C3.5) e recebem backfill pós-merge (`approved_head` lido da ata da junta, não do head do merge). Nenhum backfill devido por este PR: a entrada do #397 já tem `merge_commit 513937b0…` e `approved_head 67c2c280…`, pagos pelo #398 (`5bcdcc58`). Se outro PR mergear antes, `blocks_completed` se RECONTA no pré-merge a partir da `main` de então. BACKFILL PAGO pelo registro do #402 (docs/registro-402): `pr 402`, `merge_commit 3e40a256…` (squash; a árvore do merge é a do head final do PR, `1483a6f7`, que é o head aprovado `cdf370dc` mais a ata e os votos), `approved_head cdf370dc…` lido da ata `J-B-SAN3-01b.md`."}}

Veredito parcial: CONFERE: PR 402, merge 3e40a256 e approved_head cdf370dc preenchidos nos dois; latest status published_per_pr. History não tem chave status (pré-existente). Sonda anterior assumiu essa chave e falhou com KeyError, sem conclusão; esta é a medição corrigida.

## B2. Ata do bloco de origem — 2026-10-03T16:36:53.936521+00:00

Comando / medido por: git show b404815c:agent-orchestration/omega/juntas/J-B-SAN3-01b.md

Saída resumida:
# J-B-SAN3-01b (PR #402) — ciclo 1

- **Objeto julgado:** `cdf370dcb4c817e1c4292aed1204140951616971`, resolvido **independentemente pelas três cadeiras**
  (`git` cruzado com `gh pr view 402 --json headRefOid`). A C2 conferiu o objeto também no fim do voto: não andou.
- **approved_head:** `cdf370dcb4c817e1c4292aed1204140951616971`
- **Base:** `origin/main` em `4ab9d232` (#399), igual ao merge-base do objeto (conferido pela C2). **CI no objeto:**
  14/14 `success`, medido pelo orquestrador às 21:22 UTC antes do disparo.
- **Código do bloco:** termina em `b02745b7`, o fechamento do dev de nuvem. Os commits depois dele são só registro da
  junta (conferido pelo inspetor na segunda passada e pelas três cadeiras).
- **Quórum:** unanimidade de 3 (§C7.1-ter(b): o bloco toca permissão e protege contra perda de dado). Sem crítico.
- **Inspetor de terreno (§C7.1-bis):**
  - **1ª passada: `BLOQUEADO`**, por um único item, o 3.1. O `coordenador-de-acessos` achou o C2-05 (o botão "Nova OS"
    sem gate) na junta do `B-SAN3-04a`, e este bloco fecha essa pendência. Remédio nomeado pelo plano (seção 10):
    identidade nova pela `agente-fabrica`.
  - **2ª passada: `LIBERADO COM RESSALVA`**, pela mesma instância, depois do remédio. A ressalva forte P2-R1 foi a forma
    de disparo da C2 (agente geral com o corpo do objeto, md5 conferido na 1ª linha da evidência), cumprida. P2-R2 a
    P2-R7 entraram no briefing. Pareceres em Fable 5.1, corpo de `origin/main` (`de80b2a9…`).

## VEREDITO: **APROVADO — 3 × 0**

| cadeira | identidade | md5 EOL-neutro do corpo | mandato_md5 | modelo | voto | achados |
|---|---|---|---|---|---|---|
| C1 — enumeração e mutação | `guardiao-fail-closed` | `5b0f7f5d31df366b69ac2cc8c113e963` | `bc98b2d0…` | Opus 5.5 | **APROVADO** | 0 bloqueia · 1 ajuste · 1 nota |
| C2 — cadeia de acesso | `jurado-san3-01b-c2-cadeia-de-acesso` | `14a07abc81f8e0f37db1b584129c588c` | `5bbd674c…` | Opus 5.5 | **APROVADO** | 0 bloqueia · 0 ajuste · 3 nota |
| C3 — tela e linguagem | `cognicao-visual` | `59632cb92550e620320a2ec896188e3d` | `3ca69077…` | Opus 5.5 | **APROVADO** | 0 bloqueia · 0 ajuste · 1 nota |

O voto da C1 está gravado como `A FAVOR`; a ata o lê como `APROVADO`. Disparo pelo P5: C1 e C2 juntas às 21:23 UTC; C3
quando a C2 concluiu. Cada cadeira em worktree próprio (`w-j01bc1/2/3`), sem ler os votos umas das outras. **Quedas:**
nenhuma cadeira caiu; o inspetor caiu duas vezes por limite de sessão da conta e foi retomado como a mesma instância
(`votos/B-SAN3-01b/00-quedas.md`). Nenhuma substituição de modelo nos gates.

Evidência completa em `agent-orchestration/omega/juntas/votos/B-SAN3-01b/`: `C{1,2,3}-evidencia.md`,
`C{1,2,3}-voto.json`, os dois pareceres do inspetor, `00-quedas.md`, o relatório da fábrica e os mandatos em
`00-mandatos/`.

**Exceção declarada ao `git diff --check` (precedentes #395 e #397):** `C2-evidencia.md` tem nove linhas que terminam em
espaço (saídas coladas pela cadeira). Ficam, porque a evidência entra byte a byte; nenhuma outra violação no commit.

## Divergências declaradas (§A2), registradas aqui de novo

- **O corpo da C2 nova está no diff do PR** (`.claude/` e `.agents/`), que o §6 do plano proíbe ao dev. É ato de
  registro do orquestrador, com precedente no `B-SAN3-04a` (`aadaa6d5`). A C1 julgou o A16 sobre o diff do
  desenvolvimento.
- **O corpo da C2 fixa `model: opus`**, como os seis jurados de identidade nova da `main`.
- **O método da C2 troca o login real do `coordenador-de-acessos`** pelo do plano (catálogo executado mais leitura do
  blob), porque o bloco não tem premissa de banco.

## Ajustes e notas (viram pendência no registro pós-merge, não reprovam)

- **A-C1-01 (ajuste, dentro do bloco):** `release.pr` e a entrada nova do `kpis-history.json` ficaram `pr: null` com o
  PR #402 já criado. Não altera número; o §C3.5 manda o backfill pós-merge preencher `pr`, `merge_commit` e
  `approved_head`.
- **N-C1-01 (nota, pré-existente desde `83a3c68c`, 2026-09-19, `B-SAN3-01`):** a origem de mock é decidida por convenção de
  nome; um módulo de dado de demonstração fora da convenção nasce classificado como real.
- **C2, nota dentro do bloco:** a prova do gate é extensional sobre o catálogo de hoje. A propriedade "régua = inclusão
  estrita" está provada por parse e por sonda, não pelo catálogo.
- **C2, nota pré-existente (classe `P-SAN3-04A-FRONT-PERMISSOES-POR-PAPEL-DEFASADAS`, dono `B-SAN3-06a`):** depois da
  troca de organização, o conjunto de permissões comparado na página não é o da organização ativa.
- **C2, nota pré-existente (dono `B-SAN3-06c`):** outro botão "Nova OS" sem gate existe em `DashboardPage.tsx`, fora da
  página do bloco.
- **C3-N1 (nota, pré-existente desde 2026-08-04, PRs #331 e #332):** o cabeçalho da lista de OS diverge da referência
  visual e do protótipo.

## §C7.4-bis — quem ocupou cada papel

| papel | quem |
|---|---|
| quem achou os defeitos que o bloco fecha | `jurado-san3-01c2-fail-closed-web` (A-01 a A-03), `master-teste-telas-rotas` (C2-N5), `coordenador-de-acessos` (C2-05) |
| quem planejou | `planejador-mestre`, instância 2 (Opus, fallback declarado no plano) e instância 3 (Fable) |
| quem desenvolveu | `dev-b-san3-01b`, sessão de nuvem (Fable 5.1, declarado no `DEV-relatorio.md`) |
| fábrica | `agente-fabrica`, instância nova (Opus): o corpo da C2 |
| inspetor | `inspetor-de-terreno-da-junta` (Fable 5.1), duas passadas pela mesma instância |
| cadeiras | C1, C2 e C3 da tabela acima |
| orquestrador | registro, mandatos, briefing, versionamento do corpo; **não escreveu código do bloco** |


Veredito parcial: Ata existente, comparada ao KPI.

## B2. Ata de 404 — 2026-10-03T16:36:54.004470+00:00

Comando / medido por: git grep -n -E #404/PR404 b404815c -- atas J-*.md

Saída resumida:


Veredito parcial: ec=1; nenhuma ata própria encontrada, classe preexistente P-GOV-REGISTRO-PURO-QUORUM; não declarar junta inexistente como aprovada.

## B3. Índice reexecutado — 2026-10-03T16:36:56.877713+00:00

Comando / medido por: python agent-orchestration/controle/gerar-indice-pendencias.py; git diff -- agent-orchestration/controle/pendencias-indice.md; comparação blob b404815c com arquivo gerado

Saída resumida:
indice: 432 cabecalhos / 421 IDs | {'FECHADA': 115, 'ABERTA': 317} | baldes {'-': 115, 'C': 69, 'B': 110, 'A': 138} | diferidas-materiais 13
{"ec": 0, "raw_equal": true, "eol_equal": true, "md5_blob_eol": "ee1691d76a49189b5fe1ea429ace4b87", "md5_generated_eol": "ee1691d76a49189b5fe1ea429ace4b87", "diff_ec": 0, "diff_chars": 0}

Veredito parcial: CONFERE

## C2. Varredura de dependências — 2026-10-03T16:37:16.218265+00:00

Comando / medido por: runpy gerar-indice-pendencias.py em w-port404; classificar() oficial; seções não FECHADA; alvo #393/#400/#401/B-GOV-MANDATO/B-SAN3-09/11/ciclo 4

Saída resumida:
432 seções; 14 com alvos; 132 com menção bloqueia.

## P-SAN-PROD-BOOTSTRAP - Bootstrap idempotente do 1o platform_admin real (Ω-INFRA-3, 2026-07-14)
- descricao: o seed atual so cria o tenant DEMO; `User.tenant_id` e NOT NULL/FK Restrict (nao existe platform_admin
  tenant-less). Um bootstrap de produção precisa criar tenant de SISTEMA + role super_admin + admin + credencial,
  idempotente, verificado contra banco prod-like. Fora do escopo do PR6 (config-as-code) — apontado por critico (C9).
- acao: entregar o script de bootstrap dedicado na ATIVACAO (Runbook B), rodado one-shot com `ALLOW_PROD_SEED=1`
  inline (removido em seguida). NUNCA usa `db:seed`/demo.
- status: aberto (follow-up de ativacao; nao bloqueia o merge da config inerte)
- **severidade medida (inventário SAN3, 2026-09-11):** MÉDIA — fatia C1: sem bootstrap versionado do 1º `platform_admin`, a primeira organização real em produção só nasce por SQL manual fora do repositório; bloqueia o go-live, não a demo.

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>
- **dono:** `B-SAN3-09` (plano SAN3, §4.1 item 43 — `D-SAN3-PLANO-OPCAO-B`, 2026-09-13).



## P-CHK-DOSSIE-VERSAO-NA-UI (2026-08-10 — junta do CHK P1 PR-03, 2ª rodada)

O backend do dossiê do veículo passou a dizer a verdade sobre vistoria reaberta: o resumo da aba
"Checklist do Guincho" emite `reopenedFromRunId`, `supersededByRunId` e `currentRunId` (cadeia percorrida
até a versão vigente, com guarda de ciclo). **A UI ainda não consome nenhum dos três** —
`frontend/src/modules/patios/processes/processes.types.ts` e `processes.adapter.ts` descartam os campos, e a
aba lista a vistoria substituída com chip `completed`, sem marcação de "versão substituída" e sem caminho
para a vigente. O operador que abrir o dossiê de um processo com vistoria reaberta vê a tela idêntica à de
antes do PR-03.

**Fechar no CHK P1 PR-05 (histórico):** 3 campos no tipo espelho + 3 linhas em `adaptChecklistRun` + chip
"versão substituída" (com link para a vigente) em `ChecklistRunsPanel.tsx` + smoke test. Nenhum guard pega
hoje a defasagem do espelho — o teste do DTO só fixa `templateName`/ausência de `tenant_id`.

- **status:** ABERTA · **severidade:** a classificar · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>
- **dono:** `B-SAN3-11` (plano SAN3, §4.1 item 8 — `D-SAN3-PLANO-OPCAO-B`, 2026-09-13).



## P-CHK-DEFERRED-SEM-LEITURA (2026-08-14 — ciclo 4 da revisão do CHK P1 PR-04c-A)

O ciclo 4 fechou o ponto cego do laço de vistorias ausentes trocando inferência por **leitura**
(`hasChecklistRun`). O ramo **vizinho** — o das vistorias *diferidas* — continua afirmando na timeline da
**ORDEM** (a que o app de campo baixa) que a vistoria *"ainda não foi enviada ao técnico"* **sem fazer a mesma
pergunta**. É exatamente a classe de defeito que acabou de custar dois ciclos, uma linha acima no mesmo arquivo.

**Hoje é inalcançável, e foi verificado** (não presumido): `appendAfterExisting: true` em `adjustChecklists` e em
`rewriteChecklistSet` impede que uma adição desloque linha que já tem execução, e `assertChecklistNotDispatched`
barra retirar linha com execução. As duas travas juntas garantem que uma linha diferida nunca tem execução viva.

- **O que reabre:** qualquer porta futura que **insira antes** de linha existente ou **reordene** `order_index`.
  Quem mexer nisso reabre a classe inteira, e o sintoma é um documento de prova afirmando o oposto do que
  aconteceu.
- **Correção quando reabrir (ou preventivamente):** o ramo diferido faz a mesma pergunta read-only antes de
  declarar.
- status: ABERTA (latente).



## P-CHK-CREATE-RAZAO-NAO-NORMALIZADA (2026-08-14 — ciclo 4 da revisão do CHK P1 PR-04c-A)

O `reassign` **normaliza** a razão da falha de provisão (`normalizeChecklistProvisionReason`); o `create` usa a
classificação crua. Sob despublicação dentro da janela do despacho, a timeline do DESPACHO recebe
`checklist_not_published` enquanto o caminho irmão grava `template_not_published` — o "um fato, dois códigos"
que esta mesma fatia consertou do outro lado, e que ninguém somaria seis meses depois.

- **Alcance:** pré-existente, janela estreita, e **só** na timeline do despacho (a tela do escritório) — não
  chega ao app de campo. Por isso não bloqueou o merge.
- **Correção:** o `create` passa a normalizar, como o `reassign`.
- status: ABERTA.

- **agendamento:** DIFERIDO-LEVE (triagem SAN2-1, 2026-08-29)
  <sub>balde C — **adiada por triagem automática; NÃO verificada item a item** (etiqueta corrigida em 2026-08-29 pelo resgate da opção C: a frase anterior afirmava ausência de consequência que ninguém conferiu — achado A-C3 da junta, 4 materiais em 11 amostradas; a leitura real é a P-SAN2-LEITURA-DAS-79). **Continua ABERTA** — diferir é agendamento, não fechamento. Lista nominal e vetável no `pendencias-indice.md`.</sub>



## P-O6R-ARNES-ISOLAMENTO — **EMENDAS do bloco B-O6R-ARNES (2026-08-28)** — o bloco próprio existiu e rodou

Bloco `B-O6R-ARNES`, branch `fix/o6r-arnes-catalogo-unico` sobre `origin/main` `6efe5ad`. A classe saiu do
`B-O6R-02` por decisão do dono (`D-JUNTA-ESCOPO-E-CALIBRACAO` §5): ela é **anterior** a todos os blocos O6R de
código, e o financeiro foi reprovado no ciclo 4 por um defeito que não criou e estava proibido de consertar.
Registro **apensado**, nunca reescrito (§A2).

### O que FECHA

- **P3 — mecanismo único entre TODAS as criadoras — FECHA.** Os três escritores que rodavam fora do lock
  (`audit-security.test.ts` / `audit_rls_`, `vehicle-identity-schema.test.ts` / `vid_rls_test_`,
  `impound-process-checklist-link-schema.test.ts` / `vid_link_rls_`) passaram a executar **toda** a sequência
  de catálogo dentro de `withRoleCatalogLock`, em janelas curtas. A enumeração de escritores de `tests/**` já
  não tem exceção, e o ratchet perdeu as três razões *"fora do lock — destino: P-O6R-ARNES-ISOLAMENTO"*.

  **O fato que justificou fechar a classe inteira, e não só "trazer os 3 para dentro":** serialização parcial
  não protegia nem os serializados. Bateria barata dos 6 arquivos na base (forma declarada:
  `node scripts/run-backend-tests.mjs` sobre `audit-security` · `auth-identity-backfill-db` ·
  `auth-identity-links-db` · `rls-tenant-isolation` · `vehicle-identity-schema` ·
  `impound-process-checklist-link-schema`; `DATABASE_URL`→:55950, `REDIS_URL`→:56950,
  `CORE_SAAS_PERSISTENCE` não exportada, Node v20.19.5, cluster descartável `arnes-dev-pg` com 103
  migrations), **N=13 PRÉ-correção: 7/13 vermelhas**, todas com `XX000 tuple concurrently updated`, e **1
  queda de denominador (37→32)**. As vítimas incluem **quem TOMAVA o lock**: `rls-tenant-isolation` (3×) e
  `auth-identity-backfill-db` via `createEphemeralRole` (1×) — além de `audit-security` (3×) e
  `vehicle-identity-schema` (3×). **N=13 PÓS-correção: 13/13 ec=0, 0 `XX000`, denominador 37 IDÊNTICO nas 13.**

- **P5 — varredor cobre todo prefixo — AMPLIA** (não fecha). As três famílias novas entraram em
  `SWEPT_ROLE_FAMILIES` com o mesmo corte de 60 min e o mesmo relatório em stderr. Provado nas duas metades
  (recolhe a órfã velha das 3 famílias; **não** toca prefixo não registrado nem timestamp novo). Continua
  valendo o limite já declarado: o varredor depende do RELÓGIO, não do teardown de quem morreu.

  **Efeito medido no vaza-metro:** 10 rodadas completas da canônica 3 terminaram com **Δroles = 0 em todas** e
  **nenhuma role nova ao fim** — contra as **2 órfãs com LOGIN e INSERT/UPDATE/DELETE em todas as tabelas**
  (inclusive `financial_entries`) que o ciclo 4 mediu em 10 rodadas.

- **P8 — "verde em N execuções" não é prova sem N e forma — ATENDIDA NESTA TRILHA.** Todo número publicado por
  este bloco carrega comando, forma, env, versão do Node e N. Não é o fechamento do P8 como propriedade do
  repositório; é o cumprimento dele nesta entrega.

### O que PERMANECE aberto aqui

P1 (paralelismo não declarado) · P2 · P4 (DDL de esquema compartilhado — `checklist-applicability`) · P6 · P7
(divergência entre as três formas) · teto da fila do lock (35–41 s a 2× contenção) · prefixos legados · dados
de fixture órfãos do aborto duro (o varredor cobre **roles**; organizações/usuários deixados por `SIGKILL`
seguem sem caminho de remoção) · `P-O6R-B02-SUITES-LIST-CI`.

- **status:** ABERTA · **severidade:** a classificar · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>



## P-ARNES-VAZAMENTO-LINEAR-IDENTIDADES — **ATRIBUÍDO POR EXECUÇÃO** (2026-08-28, B-O6R-ARNES) — fora do escopo deste bloco

O vaza-metro da canônica 3 mede, em toda rodada, **+5 `auth_identities` e +5 `auth_identity_link_events`** —
o mesmo vazamento linear que o ciclo 4 registrou sem atribuição completa. **Atribuído aqui por execução
isolada minha**, no cluster descartável, forma `node scripts/run-backend-tests.mjs <arquivo>`:

| Arquivo | Δ por execução | Evidência |
|---|---|---|
| `tests/core-saas-prisma.test.ts` | **+4 / +4** | 2 execuções isoladas, linear (67→71→75→79) |
| `tests/core-saas-role-authority-db.test.ts` | **+1 / +1** | 3 execuções isoladas, linear (61→62→63→64) |
| **soma** | **+5 / +5** | **bate exatamente com o residual medido na canônica 3** |

Contraprova: os outros **14** candidatos -db medidos isoladamente deram **0** (`auth-identity-backfill-db`,
`auth-identity-links-db`, `auth-identity-revocation-db`, `auth-identity-role-real-db`,
`auth-identity-link-events-db`, `auth-login-candidates-fn-db`, `auth-login-anonymous-db`,
`core-saas-persistence-restart-db`, `persistent-rbac-middleware`, `auth-prisma`, `auth-login`, `auth-session`,
`persistent-rbac-authorization`, `sessions-admin`, `authority-portal-rls`, `owner-portal-rls`). E a canônica 2
(lista `SUITES` do `ci.yml`, que contém `core-saas-role-authority-db` mas **não** `core-saas-prisma`) mede
exatamente **+1/+1** por rodada — o que fecha a conta pelos dois lados.

**Não consertado, e por quê:** os dois arquivos estão **fora da §5** deste bloco; `core-saas-role-authority-db`
é nominalmente PROIBIDO no plano (a atribuição é do `B-O6R-02` ciclo 5). Fica NOMEADO, com a medição pronta
para quem receber a classe. O mecanismo já está descrito na `P-O6R-B01-TRILHA-ORFA-LIMPEZA`: o caminho de
produção normaliza o par do token preguiçosamente (`normalizePairIdentity`, por desenho) criando vínculo +
evento na trilha append-only, e o teardown apaga o tenant sem conhecer a trilha.

- **status:** ABERTA · **severidade:** a classificar · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>

- **emenda (inventário SAN3, fatia B2, 2026-09-11) — contradição de registro, não resolvida aqui:** esta entrada atribui **+4/+4** a `tests/core-saas-prisma.test.ts` por execução (tabela do corpo: "2 execuções isoladas, linear (67→71→75→79)"), e a emenda de precisão do ciclo 5 em `P-O6R-ARNES-ISOLAMENTO` (2026-09-03, "o vazamento +5/+5 tem TABELA nomeada, não ARQUIVO") diz que "os **+4/+4** restantes por rodada completa seguem **sem produtor nomeado**". As duas não podem estar certas. O delta **não foi medido** pelo inventário nem por este aplicador: medir exige rodar as suítes `-db`, fora do terreno.



## P-O6R-ARNES-ISOLAMENTO — EMENDAS medidas pela junta do ciclo 4 (2026-08-28, cadeira do arnês, N=10)

- **A classe `XX000` reaparece DENTRO da forma canônica 3**, não fora dela: 3/10 rodadas do mesmo `npm test` com `DATABASE_URL`,
  em cluster próprio onde só o jurado conectava (contenção de CPU de outras baterias na máquina, nunca o mesmo banco).
  Produtores medidos: `tests/audit-security.test.ts:158` (CREATE ROLE, ×2) e `tests/helpers/auth-identity-fixture.ts:150`
  (`createEphemeralRole`, via `auth-identity-backfill-db.test.ts:115`).
- **Denominador 2740×2745** numa rodada (5 subtestes do teste 120 não correram; o arquivo abortou no `XX000` antes de os
  registrar); o runner não tem piso de `# tests`.
- **Roles órfãs nascem no caminho de falha do `CREATE ROLE`** e persistem com LOGIN + DML total nas 115 tabelas (2 em 10 rodadas);
  **vazamento linear** de `auth_identities`/`auth_identity_link_events` (+5/rodada) mesmo em rodadas verdes; `permissions` 1→15 uma vez (idempotente).
- **Aborto duro (SIGKILL) na corrida -db** deixa 1 tenant/1 user/1 conta/1 lançamento sem varredura (não contamina: slugs únicos);
  o teardown no caminho de `assert.fail` está provado (resíduo 0).
- **ERRATA do rótulo (28/08):** nas linhas apontadas, `audit-security.test.ts:158` é `DROP OWNED BY` (teardown, FORA do
  `withRoleCatalogLock`) e `auth-identity-fixture.ts:150` é `GRANT USAGE ON SCHEMA public` (DENTRO do lock) — escritas em
  `pg_namespace.nspacl`/`pg_class.relacl`, não `pg_authid`. Objeto disputado a nomear por execução no ciclo 5 (ver errata da ata).

- **status:** ABERTA · **severidade:** a classificar · **dono:** a atribuir
  <sub>Triagem SAN2-1 (2026-08-29): a entrada não trazia linha de status. Marcada **ABERTA por padrão conservador** — não fechei o que não verifiquei. Ver `pendencias-indice.md`.</sub>



## P-O6R-B02-CHEQUE-UNCLEAR (2026-08-22) — não existe des-compensar um cheque compensado por engano

Consequência **declarada** do guard `cheque_entry_immutable` (C2 do ciclo 2, fecha `Ω6R-DIN-011`). Com a regra
"movimento de cheque só se desfaz pela máquina de estados do cheque", some o único caminho que existia para
desfazer um `clear` — o `reverse` do lançamento de compensação. E era justamente esse caminho que devolvia
dinheiro em dobro, então tirá-lo é a correção, não o defeito.

**O caso bancário real está coberto:** cheque compensado que depois volta do banco é `bounce`
(`cleared → bounced`), que posta contra-lançamento e leva o líquido a zero. O que NÃO tem porta é o **erro de
operação** — compensar o cheque errado. Hoje a saída é operacional (lançamento avulso de ajuste, que fica no
razão com trilha), não uma transição de estado.

Encaminhamento: se o dono/junta quiserem uma transição `cleared → deposited` (des-compensar), ela precisa de
desenho próprio — quem pode, com que trilha, e o que acontece com a conciliação do lançamento compensado.
Registrado para não virar surpresa em produção. status: ABERTA.

- **status:** ABERTA · **severidade:** a classificar · **dono:** decisão do dono/junta — exige desenho próprio (quem pode, que trilha, efeito na conciliação)
  <sub>**Linha de status acrescentada em 2026-09-05** (fechamento do `B-O6R-02` ciclo 5, condicao do porteiro do #371). **O estado NAO mudou** — a entrada ja declarava `status: ABERTA`, mas **em prosa, no fim de um paragrafo**, e a regex `LINHA` do `gerar-indice-pendencias.py` so le status em **inicio de linha** (`^[-*>]?\s*\**(?:status|estado)`). Resultado: o indice a classificava como **SEM-STATUS** (balde `?`) e ela **nao entrava no total de ABERTAS** — uma pendencia de dominio aberta, invisivel no placar que o dono le. Terceira forma da mesma classe neste bloco, depois de (1) linha dizendo `ABERTA` quando o criterio ja fechara (PR #371) e (2) valor em **negrito** que a regex nao captura (PR #375). Texto original preservado (§A2).</sub>

## D-DIVERGENCIA-C4-PONTA-AUSENTE (2026-08-25) — plano do ciclo 4 (C4.1) REABRE um invariante do ciclo 3

**Registrada pelo desenvolvedor do ciclo 4 (§C7.4-bis: quem implementa registra a divergência plano×código,
não a resolve por conta própria). §A2: conflito registrado ANTES da consolidação.**

O plano `B-O6R-02-ciclo4-plano.md` §C4.1 manda: *"ponta DECLARADA ausente do razão é ERRO em TODOS os status
(nunca skip silencioso)"*, e o §0.6 nomeia `reversalClosure` (financial-ledger.ts:75) como *"a mecânica exata
do B-4"*. **Medido por mim, por execução**, o comportamento ATUAL do helper para ponta declarada + razão
vazio: `cleared` → ACUSA (vermelho de regra "e vale 0"); `bounced`/`deposited`/`registered`/`cancelled` →
**PASSA em silêncio** (4/5 mudos). Isso CONFIRMA o B-4.

**A divergência:** existe teste committado do CICLO 3 — `tests/financial-ledger-helper.test.ts`,
*"[P6] ponta declarada que não existe no razão não inventa membro nem quebra a travessia"* — que assere,
com racional escrito (*"um id órfão não pode virar exceção de runtime — tem de virar o vermelho de REGRA...
ponta sem linha no razão é ausência de dinheiro, não erro de programa"*), EXATAMENTE o oposto do C4.1: que a
ponta ausente NÃO é erro, e sim o vermelho de regra do `cleared`. O plano do ciclo 4 **não menciona** esse
teste ao mandar transformar a ponta ausente em erro.

**Como foi resolvido (seguindo o plano, não julgando-o):** implementei o C4.1 (ponta ausente = `assert.fail`
nomeando as duas causas, nos 5 status — ainda AssertionError, não exceção de runtime, então o espírito
"não crash de programa" do ciclo 3 é preservado) e ATUALIZEI o teste "ponta órfã" do ciclo 3 para a nova
regra (agora espera o erro de ponta ausente). O plano §5 lista `financial-ledger-helper.test.ts` como arquivo
que o dev do C4 modifica, então a atualização está no escopo. **A JUNTA decide se a reabertura é aceita** —
este registro existe para que a reversão do invariante do ciclo 3 seja consciente, com evidência, e não passe
silenciosa. status: REGISTRADA (aguarda ata da junta do ciclo 4).



## P-O6R-ARNES-ISOLAMENTO — EMENDA de PRECISÃO do ciclo 5 (2026-09-03) — o vazamento +5/+5 tem TABELA nomeada, não ARQUIVO

**Emenda, não reabertura: o texto das entradas anteriores fica intocado (§A2).** Corrige, no registro
canônico, uma frase que este bloco publicou afirmando mais do que a execução exercitou — apanhada pelo
`critico-c5-adversarial` (ACHADO-4) **antes** do voto da junta, e aceita sem contestação.

**O que foi medido por execução (vale):** rodada instrumentada da canônica 3 com snapshot **por tabela**
antes e depois — `auth_identities` **+5** e `auth_identity_link_events` **+5** por rodada verde, mais
`permissions` 1 → 15 uma única vez (idempotente, o que explica os +24 da primeira rodada).

**O que NÃO foi medido, e foi publicado como se fosse (o defeito):** os quatro *arquivos* apontados como
produtores saíram de **grep** pelo nome da tabela. O crítico executou cada um isolado, com snapshot de
linhas antes/depois, no cluster próprio dele:

| suíte | resultado | Δ `auth_identities` / Δ `auth_identity_link_events` |
|---|---|---|
| `auth-identity-backfill-db` | 6/6 pass, 0 skip | **0 / 0** |
| `auth-identity-links-db` | 15/15 pass, 0 skip | **0 / 0** |
| `auth-identity-link-events-db` | 5/5 pass, 0 skip | **0 / 0** |
| `auth-identity-role-real-db` | 10/10 pass, 0 skip | **0 / 0** |
| **`core-saas-role-authority-db`** — a atribuição de 2026-08-19, citada pelo §0.a do plano do c5 e **ausente** da lista publicada | 5/5 pass, 0 skip | **+1 / +1** |

**Por que o grep falhou:** o escritor entra pela **camada de serviço** (`core-saas.service.ts` e os
repositórios de identity-link), não pelo nome literal da tabela — os quatro arquivos que *contêm* a
string limpam atrás de si, e um que **não** a contém vaza.

**O que fica ABERTO, nomeado:** os **+4/+4 restantes por rodada completa** seguem **sem produtor
nomeado** — há ~12 suítes `-db` exercitando `core-saas` e elas **não foram varridas**; o limite fica
declarado, não escondido. Matéria segue `pre-existente` (EMENDA item 1, trilha de identidades): o achado
é de **precisão do registro**, não de reabertura de classe.

**Por que isto importa mais do que parece:** é a mesma família de defeito — *a frase afirma mais do que a
execução exercitou* — pela qual este bloco foi reprovado no ciclo 4. Desta vez foi apanhada por execução
de um papel independente, antes do voto, e corrigida nas cinco publicações (`Kpis/kpis-latest.json`,
`kpis-history.json`, `kpis-history.md`, `docs/status-geral.md`, `codex/log-execucao.md`).

- **status:** ABERTA (emenda registrada; os +4/+4 sem produtor nomeado seguem aqui) · **severidade:** a classificar · **dono:** a atribuir



## P-GOV-CICLOS-CORPOS-ORFAOS (2026-09-28) — cinco regras vivas fora do contrato ainda falam de protocolo de ciclos revogado — MÉDIA

- status: ABERTA (aberta pelo `B-GOV-SEM-TETO`, PR #394 — classe (b) do plano `docs/revisoes/SAN3/B-GOV-SEM-TETO-plano.md` §3.3; o bloco **não** as corrige: o §6 do plano as proíbe a ele)
- **prova (N = 5 regras; forma: linha de corpo de agente, ou de companheiro nomeado pelo contrato, que limita ou condiciona o número de ciclos de reprovação a um protocolo que o `D-SEM-TETO-AUDITORIA-NO-3` revoga; causa: foram escritas sob o teto de 5 ou antes dele, e nenhuma revogação posterior as alcançou — o `D-TETO-DOIS-CICLOS` não as tocou e este bloco, por escopo, também não). Linhas e origem medidas por `grep -n` e `git log -S --reverse` no head do #394:**
  - **V-07** `.claude/agents/validador-mestre.md:100` (espelho `.agents/agents/validador-mestre.md:106`): *"Máximo 2 ciclos de reprovação por PR; na 3ª falha = CONDIÇÃO DE PARADA"* — `bed17db3`, 2026-07-08 (#141).
  - **V-08** `.claude/agents/critico-adversarial.md:3` e `:6` (espelho `:3` e `:13`): *"Nos ciclos 4–5 do protocolo de reprovação … reabre a premissa desde o objetivo"* — `21fdf516`, 2026-07-10 (#158).
  - **V-09** `.claude/agents/avaliador-mapas.md:17` (espelho `:24`): *"ciclo 3 reabre premissa com pesquisa ≥5"* — `56a6077b`, 2026-07-13 (#178).
  - **V-10** `.claude/agents/agente-fabrica.md:8` (espelho `:15`): *"Especialistas do ciclo 3 do protocolo de reprovação"* — `21fdf516`, 2026-07-10 (#158).
  - **V-11** `EXECUTION_MODEL.md:273–278`: a tabela do protocolo de **cinco** ciclos, *"após 5 falho → parada + dossiê ao humano"* — `39eb46cc`, 2026-07-28; último commit no arquivo `7fada65e`, 2026-08-15.
- **escopo:** `pre-existente` — evidência de data: as cinco antecedem o `D-TETO-DOIS-CICLOS` (2026-08-29) e o `D-SEM-TETO-AUDITORIA-NO-3` (2026-09-27); nenhuma foi escrita nem tocada pelo #394.
- **efeito medido:** nenhum desses cinco papéis tem cadeira na junta 3 do #393. O efeito é **latente**: na primeira vez que um deles participar de um ciclo ≥3, lerá regra de protocolo revogado — o `validador-mestre`, que tem veto, mandaria parar na 3ª falha.
- **dono:** o **orquestrador**, que abre um bloco de governança próprio para os cinco (identificador proposto: `B-GOV-CICLOS-RESIDUAIS`; plano do #394 §3.3(b)), antes de qualquer junta de ciclo ≥3 em que um desses papéis tenha cadeira.
- **bloqueia:** não bloqueia o #394 nem a junta 3 do #393.
- **teste de encerramento:** a busca pela propriedade (teto ou parada por contagem de ciclos, ou passo obrigatório de protocolo revogado em ciclo numerado), com `grep -n -i`, nos corpos dos dois espelhos e no `EXECUTION_MODEL.md`, devolve 0 linhas vivas; vermelho-controle: reintroduzir *"na 3ª falha = CONDIÇÃO DE PARADA"* num corpo faz a busca voltar a achá-la.



## P-GOV-AUDITORIA-MAQUINA-PECAS-ABERTAS (2026-09-28) — o gatilho da auditoria do ciclo 3 opera, mas cinco perguntas do mecanismo ficaram sem resposta — MÉDIA

- status: ABERTA (aberta pelo `B-GOV-SEM-TETO`, PR #394. O plano do bloco, §4, mediu dez peças ausentes no gatilho, M-01…M-10; a emenda do bloco fechou as que tornam o gatilho operável com maquinaria que já existe — o inspetor, o registro `R-*` — e as declarou como elaborações T-21…T-25 na entrada `D-SEM-TETO-AUDITORIA-NO-3` de `decisoes.md`. Estas ficam **nomeadas**, não desenhadas: desenhá-las seria legislar além das palavras do dono)
- **prova (N = 5 perguntas; forma: elemento do mecanismo sem `arquivo:linha` que o responda no contrato nem no corpo de um gate; causa: o texto de 27/09 não as tratou, e a emenda só acrescentou o mínimo para a auditoria acontecer, ficar registrada e travar o ciclo 4):**
  - **M-02** — corpo, papel e modelo do auditor. O contrato diz só quem **não** pode conduzir (quem votou, planejou ou desenvolveu no bloco); não há corpo de auditor em `.claude/agents/` nem modelo fixado.
  - **M-04 (resto)** — quem confere que o conserto da máquina de fato consertou, e o que limita a espera enquanto ela está defeituosa. O gate confere a **presença** do registro do conserto, não o mérito dele.
  - **M-05** — o texto opera com **uma** auditoria por bloco, a do ciclo 3, cujo parecer serve aos ciclos seguintes. Se um bloco que continue reprovando deve ser auditado de novo mais adiante, as palavras do dono não dizem — é pergunta **para o dono**.
  - **M-06** — o relato do orquestrador "a cada ciclo" sobre classe de defeito repetida sem informação nova: onde fica e quem o lê.
  - **M-09** — as perguntas (b) e (c) da auditoria repetem as (a) e (c) que o §C7.4-bis já manda responder a cada reprovação: somam ou substituem?
- **escopo:** `dentro-do-bloco` quanto ao tema, **deixadas abertas por decisão escrita** (plano §4 e briefing §9: o mecanismo completo não está nas palavras do dono; o que se julga é se o transcritor as calou — aqui estão ditas).
- **efeito medido:** nenhuma das cinco impede a primeira auditoria: com T-21…T-25 ela é convocada, conduzida por quem é elegível, registrada em caminho fixo e trava o ciclo 4. O que falta é padronização (M-02, M-06, M-09), atestação do conserto e prazo (M-04), e a recorrência (M-05).
- **dono:** o **orquestrador** — leva ao dono as que são decisão dele (M-05 e o prazo de M-04) e transcreve as respostas no mesmo bloco de governança da `P-GOV-CICLOS-CORPOS-ORFAOS` (identificador proposto `B-GOV-CICLOS-RESIDUAIS`).
- **bloqueia:** não bloqueia o #394 nem a junta 3 do #393.
- **teste de encerramento:** cada uma das cinco tem `arquivo:linha` no contrato ou no corpo de um gate que a responde, **ou** uma decisão do dono registrada em `decisoes.md` que a dispensa.



## P-GOV-SEM-TETO-AJUSTES-DA-JUNTA (2026-09-28) — quatro ajustes da junta do B-GOV-SEM-TETO sobre o texto que tirou o teto de ciclos — MÉDIA

- status: ABERTA (aberta pelo orquestrador na ata `agent-orchestration/omega/juntas/J-B-GOV-SEM-TETO.md`, junta APROVADA 3 × 0 sobre `7ad08690`; os quatro são `ajuste`, `dentro-do-bloco`, e **não** reprovaram)
- **prova (N = 4 achados de 3 cadeiras; forma: `ajuste` com `arquivo:linha` no voto; causa comum: o texto do §C7.4 item 4 acrescenta mecanismo às palavras do dono e o mecanismo ficou incompleto em pontos que a emenda nomeou em vez de desenhar):**
  - **C1-A1** — `CLAUDE.md` l.413–445 (= `AGENTS.md` l.441–473), sob o rótulo "(decisão do dono, 2026-09-27)": 16 proposições acrescentam ator, obrigação, condição ou restrição **sem marca local** de que são do transcritor; a separação só existe em `decisoes.md` ("nenhuma é palavra do dono").
  - **C1-A2** — `CLAUDE.md` l.432–435: no ramo "máquina defeituosa", o "continuaremos" depende de um conserto **sem executor, sem prazo e sem desfecho alternativo** (condição explícita; é a M-04 da `P-GOV-AUDITORIA-MAQUINA-PECAS-ABERTAS` vista pelo lado do dono).
  - **C2-3-1** — `inspetor-de-terreno-da-junta.md` item 2.2 (l.73–76, `dd79c96f`) × item 3.3 (l.110–112, `72fcdcde`, 2026-09-08): contra uma ref julgada **anterior** ao #394, a leitura "cláusula inexistente = o item não se aplica" desliga a trava do ciclo 4. Medido nos heads `c32f77b5` (#393), `a24f58b5` (#388) e `bc3e736b` (#389): `LIBERADO` numa leitura, `BLOQUEADO` na outra; com ref pós-#394, `BLOQUEADO` nas duas.
  - **C3-A1** — o diff pôs no item 4 ~8 linhas normativas (T-21, T-22, T-24, T-25) que o §6 do plano `docs/revisoes/SAN3/B-GOV-SEM-TETO-plano.md` proibia; o plano não foi emendado e `decisoes.md` diz "implementa aquele plano" sem registrar a divergência. Declarada na ata pelo orquestrador, que mandou a emenda.
- **escopo:** `dentro-do-bloco` (todos nasceram no #394).
- **efeito medido:** nenhum hoje — nenhum bloco está em ciclo ≥ 4. C2-3-1 é o único com efeito operável próximo; **conduta do orquestrador enquanto aberta** (registrada na ata, não é norma nova): nenhum PR vai a junta de ciclo ≥ 3 sem antes integrar a `main` pós-#394.
- **dono:** o bloco de governança `B-GOV-CICLOS-RESIDUAIS` (proposto no plano do #394 §3.3(b); mesmo dono da `P-GOV-CICLOS-CORPOS-ORFAOS` e da `P-GOV-AUDITORIA-MAQUINA-PECAS-ABERTAS`), aberto pelo orquestrador.
- **bloqueia:** não bloqueia o #394 nem a junta 3 do #393 (esta, sob a conduta acima).
- **teste de encerramento:** (C1-A1) cada proposição do item 4 que não é palavra do dono tem marca local no contrato; (C1-A2) o ramo "máquina defeituosa" nomeia executor, prazo e desfecho, ou o dono dispensa em `decisoes.md`; (C2-3-1) com uma ref julgada pré-#394, o inspetor sai `BLOQUEADO` no ciclo 4 sem parecer, provado por mutação; (C3-A1) a divergência do §6 fica registrada em `decisoes.md`.



## P-KPI-NOTAS-CARREGADAS-REGRESSAO-392 (2026-09-28) — quatro métricas do KPI carregadas sem nota do PR corrente desde o #392 — BAIXA

- status: ABERTA (aberta pelo orquestrador a partir da nota **C3-N6** da junta do `B-GOV-SEM-TETO`, ata `J-B-GOV-SEM-TETO.md`)
- **prova (N = 4 métricas; forma: métrica carregada do último valor oficial cuja nota no `Kpis/kpis-latest.json` é de um PR anterior, contra o §C3.3 que exige nota explícita do PR corrente; causa: o #392 devolveu ao texto do #390 as notas que o #391 tinha escrito):** `backend_contract_tests_focused` 34, `flutter_modules` 17, `mobile_backend_contracts` 18, `mobile_core_saas_contracts` 21 — medido por `difflib` entre `b8cd22df` (#391) e `fc3363e3` (#392).
- **escopo:** `pre-existente` — evidência de origem: regressão entre `b8cd22df` e `fc3363e3`, anterior ao #394, que só carregou o que recebeu.
- **efeito medido:** o painel mostra os números certos; a nota de procedência é que está velha.
- **dono:** o próximo PR que tocar `Kpis/*` — o #393, na integração da `main` (recontagem do KPI).
- **bloqueia:** não.
- **teste de encerramento:** as quatro métricas carregam nota do PR corrente no `kpis-latest.json` e no history.



## P-GOV-INSPETOR-CICLO-DECLARADO-NAO-DERIVADO (2026-09-28) — a trava do ciclo 4 lê o número do ciclo do briefing, não do repositório — MÉDIA

- status: ABERTA (aberta pelo PR de registro do #394, a partir da nota **C2-3-6** da junta do `B-GOV-SEM-TETO` e da ressalva **R3** do porteiro do #394)
- **prova (N = 1 entrada de trava; forma: `grep` no corpo do `inspetor-de-terreno-da-junta` por instrução de contar `R-<entrega>-<ciclo>` ou atas — nenhuma; o item 2.1 só confere a ata do ciclo ANTERIOR declarado; causa: o método do inspetor é anterior à trava e usa o ciclo que o briefing declara):** o item 2.2 (`dd79c96f`, 2026-09-28) liga a trava em "ciclo ≥ 4"; o número vem de quem escreve o briefing.
- **escopo:** `pre-existente` quanto ao método (item 2.1 e o fail-closed: `d2839039` 2026-08-30 / `72fcdcde` 2026-09-08); o uso como trava é do #394.
- **efeito medido:** um briefing que declare o ciclo errado desliga a trava sem que nada a contradiga. Nenhum bloco está em ciclo ≥ 4 hoje.
- **dono:** o bloco de governança `B-GOV-CICLOS-RESIDUAIS` (mesmo dono da `P-GOV-SEM-TETO-AJUSTES-DA-JUNTA`).
- **bloqueia:** não.
- **teste de encerramento:** o corpo do inspetor deriva o número do ciclo do repositório (`omega/reprovacoes/R-<entrega>-<n>.md` + atas) e sai `BLOQUEADO` quando o briefing diverge; vermelho-controle: briefing declarando ciclo 3 com três `R-*` no repositório.



Todas as menções de bloqueio em não fechadas:
## P-013 - F2: guard de disponibilidade so na criacao de OS, nao no assign (2026-07-08)
  com a regressao field-dispatch/registry-assign coberta). Nao bloqueia F2.

## P-014 - F3: cancelamento de multa gateado so por papel (sem permissao dedicada) (2026-07-08)
  gate de papel por permissao). Nao bloqueia F3.

## P-015 - F3: `driver_id` parser afrouxado (string) x coluna UUID (2026-07-08)
  Nao bloqueia F3 (veredito APROVADO).

## P-016 - F4 (R4.3): indicador "viatura sem apolice vigente" na tela Viaturas + Mapa adiado (2026-07-08)
- status: aberto (F6 ou bloco dedicado). Nao bloqueia F4.

## P-017 - F4: barra de vigencia de apolice cancelada usa tom neutro/verde (2026-07-08)
  Nao bloqueia F4.

## P-019 - Ocorrencias residuais de persona demo "Marina Costa" fora do mapa (2026-07-08)
  login e intencional em modo mock). Nao bloqueia F6."
- **severidade medida (inventário SAN3, 2026-09-11):** MÉDIA — fatia C1: a Auditoria Global da plataforma exibe trilha e contagens inventadas ("0 incidentes") sem rótulo de demonstração; bloqueia a demonstração do console.

## P-020 - F7a: check de saldo sem SELECT FOR UPDATE (corrida teorica de debito) (2026-07-08)
  create de movimento, ou uma tabela de saldo materializado com advisory lock). Nao bloqueia F7a.

## P-023 - F9: "ultimo acesso" do usuario nao tem fonte de dado (2026-07-09)
- status: aberto (quando quiser ultimo acesso real, derivar do audit/sessoes de auth). Nao bloqueia F9.

## P-028 - Divida sistemica de acentuacao em strings de UI antigas (2026-07-09)
- status: ABERTA (PARCIAL — fechado: "Situacao" zerou em `frontend/src`; aberto: ~50 literais sem acento seguem em `frontend/src`, inclusive em telas vivas — `guards/PermissionGuard.tsx:30` (texto de toda tela de acesso negado), `modules/checklists/pages/ChecklistRuntimePage.tsx`, `work-orders/pages/WorkOrderCreatePage.tsx:37,46` e o rótulo `"Operador Logistico"` (`modules/auth/types.ts:5`)) (inventário SAN3, fatia C1, 2026-09-11). Valor anterior, preservado: "aberto (bloco dedicado de copy/i18n varrendo `frontend/src/**` por acentuacao de UI). Nao bloqueia F12."

## P-027 - F11: divergencias matriz x catalog + perms `purchase_orders:read`/`reports:read` ausentes (2026-07-09)
  `reports:read` ao `PERMISSION_CATALOG` + alinhar grants de dashboard/aprovacoes a matriz). Nao bloqueia F11."
- **severidade medida (inventário SAN3, 2026-09-11):** MÉDIA — fatia C1: Financeiro e Estoque sem `dashboard:read` abrem a home em erro (403 no `GET /dashboard/summary`), contra `RBAC_MATRIX.md:34`; bloqueia a demonstração da persona Financeiro.

## P-Ω3a (Ω3-a ServiceQuote) — pendências declaradas
  `service_catalog:read`+`customers:read`+`work_orders:read`, ou aceitar a degradação. Não bloqueia (junta 5/5).

## P-037 (Ω3-c, BAIXA — validador) — assimetria memory×prisma em freezeChecklistSnapshot
  irmão. Alinhar ambos (freeze + geocode) num bloco de higiene futuro. Não bloqueia.

## P-SAN-E2E - Playwright e2e fora do gate obrigatório (Ω-GATE, 2026-07-13)
- impacto: cobertura e2e não bloqueia merge até haver staging no ar.

## P-SAN-PROD-BOOTSTRAP - Bootstrap idempotente do 1o platform_admin real (Ω-INFRA-3, 2026-07-14)
- status: aberto (follow-up de ativacao; nao bloqueia o merge da config inerte)
- **severidade medida (inventário SAN3, 2026-09-11):** MÉDIA — fatia C1: sem bootstrap versionado do 1º `platform_admin`, a primeira organização real em produção só nasce por SQL manual fora do repositório; bloqueia o go-live, não a demo.

## P-SAN-PROD-WEBIMG - Rollback do frontend sem imagem GHCR (Ω-INFRA-3, 2026-07-14)
- status: aberto (mitigado por `fly releases`; nao bloqueia o merge)

## P-SAN-INFRA1-NITS - Nits não-bloqueantes do Ω-INFRA-1 (J-SAN-4, 2026-07-13)
- status: ABERTA (PARCIAL — fechado: (2) o compose de produção usa `CORE_SAAS_PERSISTENCE: prisma` (`docker-compose.prod.yml:56`, `a8901ffe`, #353); aberto: (3) o serviço web ainda tem `depends_on: - api` sem `condition: service_healthy` (`docker-compose.prod.yml:97-98`); (1) tamanho da imagem, (4) e (5) não medidos) (inventário SAN3, fatia C1, 2026-09-11). Valor anterior, preservado: "aberto (nits; nenhum bloqueia)"

## P-Ω3F6B-DS-NITS - Nits de DS/A11y apontados na J-OMEGA3F-6B (2026-07-17)
- status: aberto (nenhum bloqueia; a cognicao deferiu todos como pendência).

## P-Ω4-2A-NITS — Observações da junta do Ω4-2a (2026-07-17)
- **Para Ω4-6 (informativo do validador-mestre):** o chokepoint `assertPeriodOpen` hoje bloqueia só

## P-Ω4-6-REOPEN-FOUR-EYES — reopen sem segundo ator (risco residual conhecido, BAIXA)
anotado, não bloqueia): um `tenant_admin` sozinho pode reopen→editar→reclose com auto-auditoria (sem four-eyes). Aceitável

## P-Ω4-6-NITS — Nits da pós-análise do Ω4-6 (BAIXA)
  L-2 (forced:true só quando houve override real), L-3 (comentário "tabela vazia e nunca bloqueia" — falso desde Ω4-6, corrigido).

## P-Ω4-8-SUMMARY-SCALE — /financial-summary faz full-scan das linhas (BAIXA)
por status/direção/competência direto no Postgres) — hoje só o saldo por conta já usa groupBy. Não bloqueia (data set de

## P-Ω3F6 — cluster de cancelamento: STATUS-BYPASS/TERMINAL-GUARD/ZERO-ATOMICIDADE RESOLVIDOS (D-CANCEL-INTEGRITY, 2026-07-18)
  <sub>**REABERTA em 2026-08-29 — achado A-1 da junta do SAN2-1, gravidade `bloqueia`.** Esta entrada foi

## P-PURCHASE-ORDERS-BACKEND-GATE - Gate server-side de Pedidos/Relatórios pendente (2026-07-21, PR-SCALE-1)
- **severidade medida (inventário SAN3, 2026-09-11):** MÉDIA — fatia C2: Pedidos e Relatórios aparecem no menu dos papéis pagantes com linhas e KPIs inventados, gate só no front e nenhum endpoint (`src/**/*.routes.ts` sem `purchase-orders` nem `/reports`); bloqueia o vendável.

## P-KPI-PR18A-MVP-VENDAVEL — latest 88% × history 92% (2026-07-29)
- status: **ABERTA**; não bloqueia NAV-MENU-PLATFORM.

## P-CHK-SEED-DEMO-SUJO (2026-08-08) — dados de demonstração com nomes técnicos e lixo de teste (BAIXA, mas visível ao dono)
- **severidade medida (inventário SAN3, 2026-09-11):** MÉDIA — fatia C2: a organização do seed chama-se "Tenant Demo" (`prisma/seed.ts:209-223`) e aparece na barra superior, na seleção de organização e no dossiê impresso (§3/§11.1); bloqueia a demonstração.

## P-CHK-AUTOLINK-FASE-REAL (2026-08-11 — junta `J-CHK-P1-PR04B-autolink`, nascida da decisão 2×1×1)
- status: ABERTA (alvo: PR-04c ou posterior, quando a proveniência de fase existir na run; não bloqueia

## P-IMPOUND-LINK-SEM-UNLINK (2026-08-11 — junta `J-CHK-P1-PR04B-autolink`, fato comum aos 3 votos)
- status: ABERTA (não bloqueia a PR-04b; priorizar quando houver demanda de curadoria do dossiê — e

## P-O6R-BACKLOG (2026-08-14) — os 29 achados da auditoria Ω6R entram no controle operacional (ÍNDICE)
| Achado | Sev | Módulo | Bloco | Bloqueia trilha? |

## P-O6R-B03 (2026-08-14) — `fix/expense-sync-atomic` — Ω6R-DIN-009 (P0) + QUA-001 (P1) — **BLOQUEIA despesas/RDV e mobile**
## P-O6R-B03 (2026-08-14) — `fix/expense-sync-atomic` — Ω6R-DIN-009 (P0) + QUA-001 (P1) — **BLOQUEIA despesas/RDV e mobile**
**Bloqueia:** feature em despesas/RDV/comissões e a fatia mobile correspondente. `Ω6R-QUA-001` entra na

## P-O6R-B04 (2026-08-14) — `fix/inventory-consistency` — Ω6R-DAT-002, DAT-003 (2 P0) + QUA-002 (P1) — **BLOQUEIA estoque**
## P-O6R-B04 (2026-08-14) — `fix/inventory-consistency` — Ω6R-DAT-002, DAT-003 (2 P0) + QUA-002 (P1) — **BLOQUEIA estoque**
**Bloqueia:** feature em estoque (entradas/saídas, custódia, contagem cíclica, baixa automática) e a fatia

## P-O6R-B12 (2026-08-18) — `fix/jurisdiction-profile-versioning` — Ω6R-DAT-004 (1 P1) — **achado ÓRFÃO, sem bloco até hoje**
não aberto · **Bloqueia:** nada (não é pré-requisito de outro bloco) · **É bloqueado por:** nada.

## P-O6R-B07 (2026-08-14) — `fix/authorization-and-uploads` — Ω6R-SEC-002 (P0) + SEC-003, SEC-004 (2 P1) — **BLOQUEIA OS/aprovações/RBAC, auth e anexos**
## P-O6R-B07 (2026-08-14) — `fix/authorization-and-uploads` — Ω6R-SEC-002 (P0) + SEC-003, SEC-004 (2 P1) — **BLOQUEIA OS/aprovações/RBAC, auth e anexos**
**Bloqueia:** feature nova em ordens de serviço, aprovações e RBAC. **Atenção do porteiro:** a trilha
**Bloqueia:** feature em auth (SEC-003) e em evidências/anexos/upload mobile (SEC-004) — P1 antes de feature no
(`J-CHK-04C-EMENDA`) exige **`B-O6R-06` E os DOIS sub-blocos do `B-O6R-07`** mergeados. O `Bloqueia:` de
  por §A2 (acrescentar, nunca apagar).** O "Bloqueia:" de **evidências/anexos/upload mobile** CAI com o merge

## P-O6R-B08 (2026-08-14) — `fix/durable-jobs-realtime` — Ω6R-ARQ-001..003 + PERF-001 (4 P1) — **BLOQUEIA jobs e tempo real de campo**
## P-O6R-B08 (2026-08-14) — `fix/durable-jobs-realtime` — Ω6R-ARQ-001..003 + PERF-001 (4 P1) — **BLOQUEIA jobs e tempo real de campo**
**Bloqueia:** feature em jobs/agendamento e no tempo real de campo (SSE/mapa ao vivo).

## P-O6R-B09 (2026-08-14) — `fix/dispatch-atomic-timeline` — Ω6R-ARQ-004 (P1) — **BLOQUEIA field-dispatch e a trilha do Mapa**
## P-O6R-B09 (2026-08-14) — `fix/dispatch-atomic-timeline` — Ω6R-ARQ-004 (P1) — **BLOQUEIA field-dispatch e a trilha do Mapa**
**Bloqueia:** feature em despacho de campo — **inclusive a trilha do Mapa**: a pendência `P-Ω3F7B-MAPA-ETAPA`

## P-O6R-B10 (2026-08-14) — `fix/client-load-shedding` — Ω6R-PERF-002, PERF-003 (2 P1) — **BLOQUEIA web (transversal) e owner-portal**
## P-O6R-B10 (2026-08-14) — `fix/client-load-shedding` — Ω6R-PERF-002, PERF-003 (2 P1) — **BLOQUEIA web (transversal) e owner-portal**
**Bloqueia:** feature no portal do proprietário e mudanças transversais do cliente web de dados.

## P-O6R-B11 (2026-08-14) — `fix/mobile-work-order-contracts` — Ω6R-QUA-004, QUA-005 (2 P1) — **BLOQUEIA mobile (PR-08)**
## P-O6R-B11 (2026-08-14) — `fix/mobile-work-order-contracts` — Ω6R-QUA-004, QUA-005 (2 P1) — **BLOQUEIA mobile (PR-08)**
**Bloqueia:** feature no app de campo (OS mobile, prestador). Junta-se à fila do **PR-08 (reconciliação
- **emenda (inventário SAN3, fatia B2, 2026-09-11):** o plano SAN3 (`docs/revisoes/SAN3/PLANO_SAN3.md`, §4.1 item 3, bloco `B-O6R-11`) a classifica como **BLOQUEIA** pelo critério 5 do dono ("nenhum risco **conhecido** de perda de dados"); o inventário Ω6R a dava como risco declarado. O conflito está registrado no plano (conflitos mantidos, §A2) e não foi consolidado em silêncio.

## P-O6R-ARNES-ISOLAMENTO (2026-08-18) — o arranjo do lote de testes contra Postgres, **anterior ao B-O6R-01**
**Estado:** ABERTA (PARCIAL — fechado: P3, mecanismo único de catálogo (`withRoleCatalogLock` nas 3 suítes, #359 `f081b5d0`); P5-roles (`SWEPT_ROLE_FAMILIES` com 6 famílias, incl. `rls_test`, `tests/helpers/auth-identity-fixture.ts:117-124`, #366 `df496d22`); piso de denominador no runner (#359); `P-O6R-B02-SUITES-LIST-CI` (`ci.yml:249`); aberto: P1, nenhum `--test-concurrency` no runner nem no `ci.yml`; P4, `ALTER TABLE … RENAME COLUMN` em tabela compartilhada (`tests/checklist-applicability-prisma-db.test.ts:355,373`); dados de fixture do aborto duro sem varredor; os +4/+4 identidades por rodada (`P-ARNES-VAZAMENTO-LINEAR-IDENTIDADES`)) (inventário SAN3, fatia B2, 2026-09-11). Valor anterior, preservado: "ABERTO" · **Dono:** bloco próprio, ainda não aberto · **Bloqueia:** nada diretamente — mas mantém a

## P-GOV-MAIN-SEM-PROTECAO — ATUALIZAÇÃO (2026-08-25): ruleset INSTALADO
registro). Trabalho de ciclo próprio, com plano novo — não bloqueia mais nada.

## P-KPI-PAINEL-NAO-RENDERIZA-SUMMARY (2026-08-30) — MÉDIA · o painel não renderiza `release.summary` nem a `description` do history: a honestidade do bloco mora fora do artefato principal
**MÉDIA**, e a classificação é **da C4** (`gravidade: "MEDIA"`, `bloqueia: false` no voto), não um carimbo

## P-KPI-RECENT-CONGELADO (2026-08-31) — MÉDIA · a seção "Últimas demandas" do painel está parada em 28/08: renderiza um estado que já não é verdade
declarou no voto é `observa` (`bloqueia: false`), que é a escala da **junta**; **MÉDIA** é a tradução para

## P-AUTHORITY-N-NAO-CANONICO-NO-STORED (2026-08-31) — BAIXA · os campos numéricos do `stored` do authority aceitam forma não-canônica: ` 1024`, `0x400` e `+1024` passam por `N = 1024`
o achado com `bloqueia: false` e sem correção proposta, e **nada abaixo é plano de conserto**.

## P-CLAUDE-ABERTURA-PRECEDENCIA-DESATUALIZADA (2026-09-01 — medido pelo dev do `SAN2-6`, §3.7.1 do plano) — BAIXA · `pre-existente` · **dono: o dono** · a abertura do contrato canônico ainda manda valer o `AGENTS.md`; a regra de espelhamento, 25 linhas abaixo, manda o contrário
pós-voto de `J-SAN2-6` (**APROVADO 3×0, zero achado `bloqueia`**), a partir dos achados **C2-A1** e

## P-O6R-B07B-SCANNER-AV-REAL (2026-09-06) — produção e staging recusam TODO upload até haver antivírus real — ALTA
- **status:** ABERTA · **severidade:** ALTA · **BLOQUEIA:** go-live de upload **e staging com upload** ·

## P-O6R-B07B-CHECKLIST-JSON-FILEURL (2026-09-06) — ramo JSON do anexo de checklist aceita `fileUrl`/`mimeType` arbitrários — MÉDIA
gerenciado (`checklist.dto.ts:180-182`), o web só bloqueia caminho Windows

## P-O6R-B06-RECONCILE-BLOQUEADO (2026-09-07) — o script de reparação NÃO foi entregue; a junta decide o predicado — ALTA
achado `R2-A`, `gravidade: bloqueia o script`, `escopo: dentro-do-bloco`).

## P-GOV-MAQUINAS-DE-DESFAZER-PROMOVER (2026-09-07) — competência reutilizável saiu na aposentadoria do elenco — BAIXA
  efeito monetário · **bloqueia:** nada.

## P-GOV-SKILLS-RELEVANCIA (2026-09-07) — 5 skills voltaram a carregar; 1 delas não tem relação com o ERP — BAIXA
  antes deste bloco) · **dono:** decisão do dono · **bloqueia:** nada. **Pergunta a responder:**

## P-GOV-AUDITOR-FORA-DA-CI (2026-09-07) — o auditor de elenco e o `--check` das skills são gates MANUAIS — MÉDIA
  **bloqueia:** nada — mas enquanto estiver aberta, toda a proteção nova deste bloco depende de disciplina

## P-GOV-VEREDITO-SEM-PARSER (2026-09-07) — veredito de junta é PROSA, e nenhum gate o lê — MÉDIA
na homologação nº 1: a cadeira C2 o classificou como `bloqueia`/`dentro-do-bloco`; o assento mediu e mostrou
  **dono:** próximo bloco que tocar `.github/workflows/` ou `tests/` de governança · **bloqueia:** nada.

## P-GOV-BASH-EM-QUEM-JULGA (2026-09-07) — `Bash` dá poder de escrita a todo papel que julga — ALTA
  **dono:** bloco de governança de ferramentas de agente · **bloqueia:** nada hoje.

## P-GOV-ESPELHO-CONTRATO-SEM-GUARD (2026-09-07) — `CLAUDE.md` e `AGENTS.md` podem divergir sem nada ficar vermelho — MÉDIA
  2026-07-28) · **dono:** próximo bloco de governança de contrato · **bloqueia:** nada.

## P-GOV-KPI-DISPLAY-SEM-GUARD (2026-09-08) — nenhum guard compara o CARD com o `value` do JSON — MÉDIA
  `tests/kpi-*` · **bloqueia:** nada.

## P-GOV-C10-ENCERRADO (2026-09-08) — a checagem C10 mede PESO e não sabe se o bloco encerrou — MÉDIA
BLOQUEIA (`~19,8 KB`, `ec=1`); com **14** — todos igualmente de blocos encerrados — vira AVISO e `ec=0`. Um
frontmatter de todo arquivo sob `especialistas/` — **fail-closed**: ausente = BLOQUEIA, porque um efêmero sem
BLOQUEIA **por nome**, independentemente do peso, e o peso vira só o AVISO agregado que já existe.
  auditor na CI (mesmo dono de `P-GOV-AUDITOR-FORA-DA-CI`) · **bloqueia:** nada.

## P-GOV-AUDITOR-SEM-CHECAGEM-DE-LINK (2026-09-08) — o auditor de elenco DEIXOU de conferir link, por decisão — MÉDIA
pego: mutação de controle (`M6` da evidência do bloco) sai `1 BLOQUEIA · ec=1` no auditor antigo e
`0 BLOQUEIA · ec=0` no novo. É perda real, e está declarada no cabeçalho do próprio script, na seção
  "dependência nova × verificador separado" tem de ser tomada · **bloqueia:** nada — a prevalência de link

## P-GOV-ESGOTADO-SEM-TESTE (2026-09-08) — "modelo esgotado" é declarado, não provado — MÉDIA
  **dono:** próximo bloco de governança de modelo · **bloqueia:** nada.

## P-GOV-RECUSA-CANCELA-ACUSACAO (2026-09-08) — a chave excluída da recusa cancela acusação verdadeira — MÉDIA
  tocar `scripts/audit-agents-skills.mjs` · **bloqueia:** nada hoje.

## P-GOV-DEFAULT-DENY-POR-NOME-BASE (2026-09-08) — a allowlist de escrita é chaveada pelo ARQUIVO, não pelo papel — MÉDIA
  tocar o auditor · **bloqueia:** nada hoje (prevalência 0). **Nota:** é a terceira vez que uma decisão de

## P-GOV-MODELO-FIXADO-SEM-MECANISMO (2026-09-08) — `MODELO_FIXADO` é lista de obrigação sem mecanismo — MÉDIA
  tocar o auditor · **bloqueia:** nada.

## P-GOV-AUDITOR-ARESTAS-MENORES (2026-09-08) — quatro arestas BAIXA do auditor enxuto — BAIXA
  tocar o auditor · **bloqueia:** nada.

## P-GOV-CAMINHO-REPO-SESSAO (2026-09-08) — FECHADA em 2026-09-08 por `D-MEDIR-NA-REF-ALVO`
  runtime, anterior a qualquer bloco) · **dono:** **decisão do dono** · **bloqueia:** nada, mas cada junta

## P-O6R-SUITES-DB-SEM-TEARDOWN (2026-09-09) — execuções consecutivas de `npm test` contra o mesmo banco não são independentes — MÉDIA
  **dono:** bloco de arnês de teste a nomear · **bloqueia:** nada — a CI é verde por construção.

## P-O6R-LISTCOSTLINEITEMS-SEM-ESCOPO-IMPORT (2026-09-09) — a leitura do rateio soma por overlap puro de período, sem `import_id` — BAIXA
  **bloqueia:** nada. **Correção proposta:** `import_id` opcional em `listCostLineItems`, com o serviço

## P-O6R-B06-DELTA-RESIDUAIS (2026-09-09) — dois residuais do conserto de isolamento, nomeados sem conserto — BAIXA
  **bloqueia:** nada. **Teste de encerramento:** (1) `grep -rhoE '2026-0[67]' tests/** | sort | uniq -c`

## P-SAN3-INDICE-SEVERIDADE-POR-MENCAO (2026-09-11) — a coluna de severidade do índice é a palavra mais grave MENCIONADA no corpo, não o campo declarado — MÉDIA
  **bloqueia:** nada do produto; distorce a coluna de severidade e, por ela, os baldes A/B que o dono lê.

## P-SAN3-INDICE-SO-PRIMEIRA-LINHA-DE-STATUS (2026-09-11) — o índice lê só a primeira linha de status, e a regra de parcialidade não enxerga o qualificador — MÉDIA
  **bloqueia:** nada do produto; uma entrada pode sair FECHADA declarando resolução parcial, e uma linha de status

## P-SAN3-FLIPS-DE-REGISTRO (2026-09-11) — conserto feito fora da linha de status nunca fecha a entrada — MÉDIA
  **bloqueia:** nada do produto; enquanto durar, "o que está aberto?" responde com entradas já consertadas (30

## P-WEB-CLOUD-BILLING-CARTAZ (2026-09-11) — Tela Cloud Billing é cartaz de literais com selo "IA"; dados e rotas órfãos — MÉDIA
- **impacto vendável:** NAO — só `platform_admin` alcança; BLOQUEIA demo honesta

## P-WEB-FIN-BAIXA-E-CONTA-SEM-TELA (2026-09-11) — Web emite título mas não liquida: sem tela de baixa nem de conta — ALTA
- **impacto vendável:** **BLOQUEIA** — pela web um título nunca vira pago nem caixa

## P-WEB-FIN-CHEQUE-FECHAMENTO-COMISSAO-SEM-TELA (2026-09-11) — Cheques, fechamento de período e política de comissão sem tela; backend pronto — MÉDIA
- **impacto vendável:** NAO — não é pré-requisito de venda; condição: comissão configurável vendida → BLOQUEIA

## P-CHK-APLICABILIDADE-SEM-ROTA (2026-09-11) — Motor de aplicabilidade de checklist existe sem rota, permissão nem tela — MÉDIA
- **impacto vendável:** NAO — execução de checklist funciona; condição: "checklist certo por tipo de serviço" vendido → BLOQUEIA

## P-WEB-PLATAFORMA-TELAS-FICCAO (2026-09-11) — Planos e Módulos, Auditoria Global, APIs e lista de Organizações exibem dado inventado — MÉDIA
- **impacto vendável:** NAO — só operador; BLOQUEIA demo. `P-PLATFORM-MOCK-WIRING`/`P-PLATFORM-TENANTDETAIL-REAL` estão defasadas (Overview e Detalhe já têm 3 hooks cada)

## P-WEB-PLATAFORMA-SEGURANCA-FABRICADA (2026-09-11) — Configurações da Plataforma mostram MFA e auditoria "ligados" por literal — ALTA
- **impacto vendável:** **BLOQUEIA** — UI entregue declara controle de segurança inexistente

## P-WEB-GATE-MODULO-INCOMPLETO (2026-09-11) — 27 itens do menu fora do gate de módulo; backend não recusa módulo não contratado — ALTA
- **emenda (junta do `B-SAN3-04a`, achado C2-03, 2026-09-18 — `bloqueia`/`pre-existente`):** medido por login real no objeto
- **impacto vendável:** **BLOQUEIA** se a venda for por plano/módulo — Starter vê (e, sem recusa por rota, usa) o Enterprise

## P-MOBILE-PRESTADOR-SEM-PORTA (2026-09-11) — Fluxo Prestador (diagnóstico, execução, materiais) sem porta de entrada — ALTA
- **impacto vendável:** **BLOQUEIA** — prestador não registra diagnóstico nem material faturável

## P-MOBILE-CONCLUSAO-SEM-PORTA (2026-09-11) — Tela de Conclusão, onde a comissão aparece, é inalcançável — MÉDIA
- **impacto vendável:** NAO — comissão acumula no backend (`basis-events`); condição: "comissão no app" vendida → BLOQUEIA

## P-MOBILE-LGPD-GPS-SEM-PORTA (2026-09-11) — Consentimento LGPD de GPS nunca pode ser dado: `/location` sem porta — ALTA
- **impacto vendável:** **BLOQUEIA** — sem consentimento a posição do técnico não entra; Mapa/alocação por distância sem dado de campo

## P-MOBILE-GUINCHO-ENTREGA-INALCANCAVEL (2026-09-11) — Perna de entrega do guincho nunca acende: sem `kind=delivery` nem passos 3/4 — ALTA
- **impacto vendável:** **BLOQUEIA** — o app cobre só a coleta, metade do serviço de guincho

## P-MOBILE-FILA-OS-NAO-DRENADA (2026-09-11) — "Pedir aprovação" e "não consigo iniciar" entram na fila e nunca saem — ALTA
- **impacto vendável:** **BLOQUEIA** — ação do técnico aceita pela UI e mostrada na timeline local some em silêncio

## P-MOBILE-ESTOQUE-TECNICO-FABRICADO (2026-09-11) — Estoque do técnico é catálogo semente de 8 SKUs; o endpoint não existe — ALTA
- **impacto vendável:** **BLOQUEIA** (junto do Prestador) — material faturável escolhido de lista inventada

## P-MOBILE-MINHAS-OS-SEM-FILTRO (2026-09-11) — "Minhas OS" lista a organização inteira, sem filtro de atribuição nem paginação — ALTA
- **impacto vendável:** **BLOQUEIA** — acima de 20 OS abertas (default do backend) a OS do técnico pode sumir, e ele vê as alheias

## P-MOBILE-FAXINA-TERMOS-TECNICOS (2026-09-11) — App mostra papel cru, placeholder técnico, nome "flutter_app" e README de template — MÉDIA
- **impacto vendável:** **BLOQUEIA** (custo de horas) — viola §3; app não se distribui com nome "flutter_app"

## P-DOC-GO-LIVE-READINESS-VENCIDO (2026-09-11) — Documento diz "nenhum código bloqueia o go-live" e manda rotacionar chave dispensada — MÉDIA
## P-DOC-GO-LIVE-READINESS-VENCIDO (2026-09-11) — Documento diz "nenhum código bloqueia o go-live" e manda rotacionar chave dispensada — MÉDIA
- **prova** (medida pela fatia em `15ef3fbe`; reconfirmada por presença no HEAD `c9ed9b91` pelo aplicador): `docs/go-live-readiness.md:76` "**Nenhum código bloqueia o go-live.**"; `:11-14`, `:44` rotação obrigatória (dispensada: `P-GOLIVE-SECRET-ROTATE` FECHADA, `pendencias.md:1330`); contradiz J-6R 5×0 e o AV fail-closed
- **teste de encerramento:** revisão datada no topo apontando J-6R e AV; `rg "Nenhum código bloqueia"` = 0 ou qualificado

## P-SAN3-ROTEIRO-DEMO-OPERACAO (2026-09-11) — não existe roteiro de demonstração e operação (critério 12 do dono) — MÉDIA
- **impacto vendável:** BLOQUEIA pelo plano — item 44 do gate (critério 12: demonstração, operação e linguagem da UI).

## P-WEB-FATURAR-OS-SEM-TELA (2026-09-12) — a web não fatura OS: a rota existe e nenhuma tela a chama — ALTA
- **bloqueia:** o gate da versão vendável (critérios 7 e 4 — o `mvp_vendavel` conta "faturamento idempotente" no núcleo vendável).

## P-SAN3-CHECKLIST-RUN-SEM-ESCOPO-POR-OBJETO (2026-09-12) — técnico responde, conclui e dá ciência em vistoria de OS alheia — ALTA
- **bloqueia:** o gate da versão vendável (critério 3).

## P-FIELD-LOCATION-SEM-CONSENTIMENTO-NO-BACKEND (2026-09-12) — o backend grava a posição do técnico sem conferir o consentimento — ALTA
- **bloqueia:** o gate da versão vendável (critério 3; dado pessoal).

## P-NAV-MODULOS-NAO-RESOLVIDOS-LIBERA-MENU (2026-09-12) — lista de módulos não resolvida libera todo item de módulo no menu — MÉDIA
- **bloqueia:** o gate da versão vendável, com o item 16 (critério 3 — permissão).

## P-SAN3-INDICE-ITEM-DO-GATE-SO-PELA-HOSPEDEIRA (2026-09-12) — dois itens do gate só aparecem no índice pela entrada hospedeira — MÉDIA
- **bloqueia:** não bloqueia o gate por si — o §1 do plano declara que não usa a severidade do índice —, mas quem pergunta ao índice o que está aberto vê um item de permissão sem severidade e um de dinheiro no fim da fila.

## P-WEB-CONCILIACAO-SEM-TELA (2026-09-13) — a conciliação é prometida e a web não concilia: sem extrato nem ação — ALTA
- **bloqueia:** o gate da versão vendável (critérios 7 e 4 — a conciliação está no núcleo que o `mvp_vendavel` conta).

## P-SAN3-01-DESPACHO-FORMS-SEM-CATCH (2026-09-17) — formulários de despacho sem `catch`: recusa real do backend vira rejeição não tratada e o form fica "salvando" — MÉDIA
- **bloqueia:** não bloqueia o gate por si (o item 4 fecha pela OS) — é perda de feedback, não de dado.

## P-SAN3-01-ORCAMENTO-LINHAS-TOTAL-ZERO (2026-09-17) — as linhas do orçamento falham e a aba mostra total R$ 0,00 — MÉDIA
- **bloqueia:** o critério 4 do gate (número fabricado) — dentro do `B-SAN3-08`.

## P-SAN3-01-ORCAMENTO-SELECTS-SEM-ERRO (2026-09-17) — erro em qualquer dos 3 services deixa os selects do orçamento vazios, sem mensagem — BAIXA
- **bloqueia:** não bloqueia o gate.

## P-SAN3-01-JURISDICAO-DEFAULTS-LOCAIS (2026-09-17) — `GET /jurisdiction-defaults` falha e o formulário de perfil novo é pré-preenchido com o baseline local sem avisar — BAIXA
- **bloqueia:** não bloqueia o gate.

## P-SAN3-01-OS-LEGADO-MORTO (2026-09-17) — páginas, repositório e mocks legados de OS sem rota — BAIXA
- **bloqueia:** não bloqueia o gate.

## P-SAN3-01-SHELL-BADGES-ZERO-NO-ERRO (2026-09-17) — os contadores do shell viram "0" quando a consulta falha — BAIXA
- **bloqueia:** não bloqueia o gate.

## P-SAN3-01-DESPACHOS-ALERTA-DADOS-DEMONSTRATIVOS (2026-09-17) — o alerta de erro da tela de Despachos se intitula "Dados demonstrativos" — MÉDIA
- **bloqueia:** o gate da versão vendável (critério 4 — a web não mostra erro como dado), dentro do `B-SAN3-06c`.

## P-SAN3-01-E2E-LOGIN-DEFASADO (2026-09-17) — os 13 casos do e2e rastreado morrem no login: o arnês procura o campo "Tenant ID", que saiu do formulário em 2026-07-02 — ALTA
- **bloqueia:** o gate da versão vendável — o `B-SAN3-10` fecha o gate com o e2e verde na CI (item 42) e com os fluxos por persona; a suíte rastreada hoje é 0/13, e os E1-E3 do `B-SAN3-01` só são verdes na cópia avulsa.

## P-SAN3-01-CREATE-INVALID-DATE-MENSAGEM (2026-09-17) — data malformada no create de OS vira mensagem genérica — BAIXA
- **bloqueia:** não bloqueia o gate.

## P-SAN3-PAINEL-TRILHA-DO-GATE (2026-09-18) — o painel de KPI não acompanha o gate da versão vendável — MÉDIA
- **bloqueia:** não bloqueia o gate; o `B-SAN3-10` (teste (g), frescor do painel) passa a cobrir também a trilha do gate.

## P-SAN3-01-DASHBOARD-DESPACHOS-ERRO-COMO-VAZIO (2026-09-18) — o Dashboard mostra o selo técnico "Despachos: Fallback local" e afirma "Nenhum despacho ativo" quando a consulta de despachos falhou — MÉDIA
- **bloqueia:** o gate da versão vendável (critério 4), dentro do `B-SAN3-06c`.

## P-SAN3-01-LOGISTICS-FICCAO-ROTEADA (2026-09-18) — a rota viva `/logistics` serve OS e ativos inventados de `mocks/**` em modo real — MÉDIA
- **bloqueia:** o gate da versão vendável (critério 4 — tela viva com dado inventado em modo real), dentro do `B-SAN3-06a`.

## P-SAN3-01-INVENTARIO-FECHAMENTO-CONTAGEM-FABRICADO (2026-09-18) — fechar contagem cíclica com 2xx sem entidade vira contagem "concluída" com relatório zerado — MÉDIA
- **bloqueia:** o gate da versão vendável (critério 4 — número fabricado na tela), dentro do `B-SAN3-15`.

## P-SAN3-01-MOCKMODE-TRES-AUTORIDADES (2026-09-18) — três interruptores de modo mock com padrões opostos: sem `VITE_USE_MOCKS` a plataforma mostra 3 organizações inventadas — MÉDIA
- **bloqueia:** o gate da versão vendável (critério 4), dentro do `B-SAN3-06b`.

## P-SAN3-01-NAV-MENU-DEMO-NO-ERRO (2026-09-18) — quando o menu do backend falha, a navegação cai no menu de demonstração — BAIXA
- **bloqueia:** não bloqueia o gate.

## P-SAN3-01-BATERIA-TSX-CWD (2026-09-18) — os testes `.tsx` do frontend só ficam verdes com cwd `frontend/` — BAIXA
- **bloqueia:** não bloqueia o gate; não afeta produto nem CI.

## P-SAN3-01-STALE-ICONE-COR (2026-09-18) — o ícone da faixa "dados desatualizados" diverge do protótipo — BAIXA
- **bloqueia:** não bloqueia o gate.

## P-WEB-FONTE-INTER-NAO-CARREGADA (2026-09-19) — a web inteira renderiza em Segoe UI, e o protótipo usa Inter — MÉDIA
- **bloqueia:** BLOQUEIA o gate da versão vendável (critério 13 — o produto sai polido).

## P-SAN3-04A-MATRIZ-L37-X-BULLETS (2026-09-18) — a matriz se contradiz sobre Financeiro e Estoque em cadastros mestres — MÉDIA
- **dono:** decisão do dono (pergunta de produto: o Financeiro e o Estoque leem filiais, fornecedores, etiquetas, POIs e profissionais?) — fila pós-gate; não bloqueia o `B-SAN3-04a` (emenda (c)).

## P-SAN3-04A-NAVIGATION-MATRIX-DEFASADA (2026-09-18) — `docs/navigation-matrix.md` diverge da matriz efetiva em 40 células — ALTA
- status: ABERTA (achado **C2-01** da junta do `B-SAN3-04a`, cadeira `coordenador-de-acessos`, `bloqueia`/`pre-existente`; ata `omega/juntas/J-B-SAN3-04a.md`)
- **bloqueia:** não bloqueia o gate por si — é documento contra realidade, não acesso indevido (o backend é a autoridade e foi medido nas duas pontas). Bloqueia **o método** de quem usar o documento como base de teste por papel.

## P-AUTH-CLAIMS-SEM-TENANT-ROLE (2026-09-18) — o JWT não carrega `tenant_role`/`tenant_roles`/`permissions`/`scope` que o contrato exige — MÉDIA
- **bloqueia:** não bloqueia o gate (sem efeito de autorização medido).

## P-SAN3-B1-FLUTTER-CI-X-MAQUINA-DO-DONO (2026-09-21) — o Flutter do CI (3.47.5) e o da máquina do dono (3.41.6) são versões diferentes — MÉDIA
- **bloqueia:** **não bloqueia o gate.** O CI é a autoridade — ele fixa a versão e julga. O custo é de atrito local (retrabalho de formatação), não de correção do produto.

## P-SAN3-00-RESIDUO-ELENCO-DEMO-INVESTIDOR (2026-09-21) — 33 identidades aposentadas e/ou sepultadas continuam no diretório vivo da árvore de `demo/investidor` — MÉDIA
- **bloqueia:** **não bloqueia o gate** nem o próximo bloco — é peso de contexto, sem efeito sobre código, dado ou permissão.

## P-SAN3-00-IGNORE-GLOBAL-POR-NOME-DENTRO-DOS-REINCLUIDOS (2026-09-21) — dentro dos diretórios que o bloco reincluiu, o ignore global ainda esconde arquivo NOVO por padrão de NOME — MÉDIA
- **dono: `B-SAN3-00b`** (nomeado pelo orquestrador, 2026-09-21 — o pré-merge propôs e justificou sem decidir, como manda o §C7.4-bis). **Por que bloco próprio e não emenda aqui:** o conserto é abrir exceção **nominal** para cada nome que importa dentro de `agents/`, e escolher quais nomes é decisão de escopo, não de execução — exatamente o tipo de decisão que este bloco acabou de aprender a não tomar em silêncio. **Por que não bloqueia:** nada regrediu (0 rastreado passou a ser ignorado) e os alvos do bloco saem visíveis; o que fica aberto é a **classe**, medida em 88 sondas geradas da fonte.
- **bloqueia: NÃO** bloqueia o gate nem o próximo bloco — não há efeito sobre código, dado ou permissão, e nenhum arquivo rastreado hoje é afetado.

## P-GOV-CICLOS-CORPOS-ORFAOS (2026-09-28) — cinco regras vivas fora do contrato ainda falam de protocolo de ciclos revogado — MÉDIA
- **bloqueia:** não bloqueia o #394 nem a junta 3 do #393.

## P-GOV-AUDITORIA-MAQUINA-PECAS-ABERTAS (2026-09-28) — o gatilho da auditoria do ciclo 3 opera, mas cinco perguntas do mecanismo ficaram sem resposta — MÉDIA
- **bloqueia:** não bloqueia o #394 nem a junta 3 do #393.

## P-GOV-SEM-TETO-AJUSTES-DA-JUNTA (2026-09-28) — quatro ajustes da junta do B-GOV-SEM-TETO sobre o texto que tirou o teto de ciclos — MÉDIA
- **bloqueia:** não bloqueia o #394 nem a junta 3 do #393 (esta, sob a conduta acima).

## P-KPI-NOTAS-CARREGADAS-REGRESSAO-392 (2026-09-28) — quatro métricas do KPI carregadas sem nota do PR corrente desde o #392 — BAIXA
- **bloqueia:** não.

## P-GOV-CORPOS-EM-VOO-COM-TETO-REVOGADO (2026-09-28) — seis corpos de jurado dos PRs #388 e #389 dizem ao jurado que o ciclo 2 é o último — MÉDIA
- **bloqueia:** a **junta** do #389 e a do #388 — não o trabalho anterior a ela.

## P-GOV-INSPETOR-CICLO-DECLARADO-NAO-DERIVADO (2026-09-28) — a trava do ciclo 4 lê o número do ciclo do briefing, não do repositório — MÉDIA
- **bloqueia:** não.

## P-GOV-PROJECT-MEMORY-TETO-VELHO (2026-09-28) — o PROJECT_MEMORY.md, de leitura obrigatória antes de todo bloco, ainda fala do teto do §C7.4 — BAIXA
- **bloqueia:** não.

## P-CHORE-CLEANUP-DESCE-EM-WORKTREES (2026-09-28) — a limpeza pós-merge apaga cache dentro de worktree de outro bloco — BAIXA
- **bloqueia:** não.

## P-GOV-OBITUARIO-SEMTETO (2026-10-01) — os três votantes do B-GOV-SEM-TETO não estão no OBITUÁRIO de identidades — BAIXA
- **bloqueia:** não.

## P-GOV-PAUSA-ESCADA-C76BIS (2026-10-01) — a parada por Opus esgotado (§C7.6-bis) e a pausa ordenada (P7) registram o trabalho em voo sem forma comum — BAIXA
- **bloqueia:** não.

## P-GOV-PAUSA-ELABORACOES-DO-TRANSCRITOR (2026-10-01) — 61 elaborações do texto do orquestrador aparecem sob "Decisão." da `D-PAUSA-GRAVA-E-PARA`, sem marca de que são do transcritor — BAIXA
- **bloqueia:** não.

## P-GOV-PAUSA-CASO-SEM-FONTE (2026-10-01) — o caso do Dev-T4 que motivou a P7 é chamado de "medido" e aparece com dois números — BAIXA
- **bloqueia:** não.

## P-SAN3-01B-FIACAO-DO-CREATE-TEXTUAL (2026-10-02) — a página de criar OS pode engolir a mensagem de recusa com todos os gates verdes — MÉDIA
- **bloqueia:** não bloqueia o gate por si (fail-closed: a OS não é criada; o que falta é a mensagem).

## P-SAN3-01B-PAGINA-FIACAO-DE-INTERACAO (2026-10-02) — 9 sítios de fiação de interação da lista de OS não são distinguidos sem evento de usuário — BAIXA
- **bloqueia:** não.

## P-SAN3-01B-GUARD-DE-ROTA-COM-ATALHO-DE-PLATAFORMA (2026-10-02) — o `PermissionGuard` de `/work-orders/new` usa `hasAny` com atalho de plataforma, mais frouxo que o backend — BAIXA
- **bloqueia:** não (impacto 0 nos papéis existentes; o backend é a autoridade final).

## P-SAN3-01B-MOCK-POR-CONVENCAO-DE-NOME (2026-10-02) — o guard decide pelo NOME do arquivo que um módulo é dado de demonstração: dado fabricado fora da convenção nasce classificado como real — MÉDIA
- **bloqueia:** não.

## P-SAN3-01B-PROVA-DO-GATE-EXTENSIONAL (2026-10-02) — a prova de que o botão "Nova OS" usa a régua do backend vale para o catálogo de hoje, e não separa a inclusão estrita de um atalho de plataforma — BAIXA
- **bloqueia:** não.

## P-SAN3-01B-DASHBOARD-NOVA-OS-SEM-GATE (2026-10-02) — outro botão "Nova OS" no Dashboard leva a `/work-orders/new` sem o gate de `work_orders:create` — MÉDIA
- **bloqueia:** não.

## P-SAN3-01B-CABECALHO-OS-DIVERGE-DA-REFERENCIA (2026-10-02) — o cabeçalho da lista de OS diverge do PNG e do protótipo, mas segue o design padronizado do dono — BAIXA
- **bloqueia:** não.

Veredito parcial: EM APURAÇÃO: leitura do escopo do bloqueio, não confundir gate vendável com início de junta.

## C1. Limpeza / B3. Origem do dono — 2026-10-03T16:37:45.107213+00:00

Comando / medido por: ["git", "ls-remote", "origin", "refs/heads/docs/registro-403", "refs/heads/docs/registro-399"]

Saída resumida:


Veredito parcial: ec=0; leitura, sem limpeza alheia

## C1. Limpeza / B3. Origem do dono — 2026-10-03T16:37:45.215697+00:00

Comando / medido por: ["git", "branch", "--list", "docs/registro-403", "docs/registro-399"]

Saída resumida:


Veredito parcial: ec=0; leitura, sem limpeza alheia

## C1. Limpeza / B3. Origem do dono — 2026-10-03T16:37:45.307015+00:00

Comando / medido por: ["git", "worktree", "list", "--porcelain"]

Saída resumida:
worktree C:/Users/AMP/Documents/GitHub/ERP_Techsolutios
HEAD b404815ce3d1f1b8e5121bd1526978f7222e7479
branch refs/heads/main

worktree C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/b04a
HEAD dee45faffc718491bc6f66ea46f4157b303c6be4
branch refs/heads/fix/inventory-consistency

worktree C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/b11
HEAD a24f58b51bb38302c82878aedc55e8b611cc2ce0
branch refs/heads/fix/mobile-work-order-contracts

worktree C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/gov-descuido
HEAD 497d360dd131952f5ca156fb59def2aa390449a8
branch refs/heads/docs/governanca-porteiro-pre-merge-sol

worktree C:/Users/AMP/w-j4c2
HEAD 371b09b26cf51ee28996074c81e2f91dca585cc3
detached

worktree C:/Users/AMP/w-j4c2-c3
HEAD 335cf09d79f923f76a614b27fabc2d8c0e87c2c4
detached

worktree C:/Users/AMP/w-j4c2-k4
HEAD bb641b7769fb59ea6352df6d1de3defecb1be694
detached

worktree C:/Users/AMP/w-j4c3
HEAD 371b09b26cf51ee28996074c81e2f91dca585cc3
detached

worktree C:/Users/AMP/w-j4c3-dr
HEAD 335cf09d79f923f76a614b27fabc2d8c0e87c2c4
detached

worktree C:/Users/AMP/w-mandato
HEAD 371b09b26cf51ee28996074c81e2f91dca585cc3
branch refs/heads/chore/mandato-refs-e-preflight

worktree C:/Users/AMP/w-nuv05
HEAD 9a808491bd7a3ffe20adbec5647879479f73f9e5
branch refs/heads/docs/plano-b-san3-05

worktree C:/Users/AMP/w-nuv05d
HEAD cb94b78b476dd01345b5982c4c3b1f8e43abfe9a
branch refs/heads/fix/runtime-role-sem-bypass

worktree C:/Users/AMP/w-nuv09
HEAD 8deebefc66e94005d7a037dbf5b133c74edb4f10
branch refs/heads/feat/bootstrap-platform-admin

worktree C:/Users/AMP/w-nuv11
HEAD 59aa7593f7d245e1d57ffeb0b5ca12fb98f10247
branch refs/heads/fix/dossie-versao-da-vistoria

worktree C:/Users/AMP/w-port404
HEAD b404815ce3d1f1b8e5121bd1526978f7222e7479
detached

worktree C:/Users/AMP/w-pvnuv
HEAD 8e636a2382786d8b4cc8478da1a2789df4593dd9
detached

worktree C:/Users/AMP/w-pvpr
HEAD 7ac9d17629dd543af2f72a530642f615670d7620
detached

worktree C:/Users/AMP/w-pvreg
HEAD b404815ce3d1f1b8e5121bd1526978f7222e7479
detached

worktree C:/Users/AMP/w-reg404
HEAD 94dc3b4bf19ee258f90a4ff88b2b6639f38f8b22
branch refs/heads/docs/registro-porteiro-404



Veredito parcial: ec=0; leitura, sem limpeza alheia

## C1. Limpeza / B3. Origem do dono — 2026-10-03T16:37:45.363189+00:00

Comando / medido por: ["git", "rev-parse", "main", "origin/main"]

Saída resumida:
b404815ce3d1f1b8e5121bd1526978f7222e7479
b404815ce3d1f1b8e5121bd1526978f7222e7479


Veredito parcial: ec=0; leitura, sem limpeza alheia

## C1. Limpeza / B3. Origem do dono — 2026-10-03T16:37:45.558608+00:00

Comando / medido por: ["git", "branch", "--merged", "main"]

Saída resumida:
* main


Veredito parcial: ec=0; leitura, sem limpeza alheia

## C1. Limpeza / B3. Origem do dono — 2026-10-03T16:37:45.673294+00:00

Comando / medido por: ["git", "status", "--porcelain"]

Saída resumida:
?? .agents/agents/especialistas/jurado-06-banco-atomicidade-rls.md
?? .agents/agents/especialistas/jurado-06-contrato-regressao-kpi.md
?? .agents/agents/especialistas/jurado-06-invariante-financeiro-rateio.md
?? .agents/agents/especialistas/jurado-06-suplente-banco-atomicidade-rls.md
?? .agents/agents/especialistas/jurado-06-suplente-contrato-regressao-kpi.md
?? .agents/agents/especialistas/jurado-06-suplente-invariante-financeiro-rateio.md
?? .agents/agents/especialistas/jurado-07b-contrato-mobile-b108.md
?? .agents/agents/especialistas/jurado-07b-contrato-regressao-registro.md
?? .agents/agents/especialistas/jurado-07b-suplente-contrato-mobile-b108.md
?? .agents/agents/especialistas/jurado-07b-suplente-contrato-regressao-registro.md
?? .agents/agents/especialistas/jurado-c5-banco-fk-triggers.md
?? .agents/agents/especialistas/jurado-c5-suplente-arnes-catalogo-postgres.md
?? .agents/agents/especialistas/jurado-c5-suplente-banco-fk-triggers.md
?? .agents/agents/especialistas/jurado-c5-suplente-validador-diff-plano.md
?? .agents/agents/especialistas/jurado-c5-validador-diff-plano.md
?? .agents/agents/especialistas/jurado-o6r04a-c2-banco-rls.md
?? .agents/agents/especialistas/jurado-o6r04a-c2-fail-closed-backend.md
?? .agents/agents/especialistas/jurado-o6r04a-c2-suplente-banco-rls.md
?? .agents/agents/especialistas/jurado-o6r04a-c2-suplente-fail-closed-backend.md
?? .agents/agents/especialistas/jurado-o6r11-c2-fail-closed-dart.md
?? .agents/agents/especialistas/jurado-o6r11-c2-suplente-fail-closed-dart.md
?? .agents/agents/especialistas/suplente-critico-c5-adversarial.md
?? .claude/agents/especialistas/jurado-06-banco-atomicidade-rls.md
?? .claude/agents/especialistas/jurado-06-contrato-regressao-kpi.md
?? .claude/agents/especialistas/jurado-06-invariante-financeiro-rateio.md
?? .claude/agents/especialistas/jurado-06-suplente-banco-atomicidade-rls.md
?? .claude/agents/especialistas/jurado-06-suplente-contrato-regressao-kpi.md
?? .claude/agents/especialistas/jurado-06-suplente-invariante-financeiro-rateio.md
?? .claude/agents/especialistas/jurado-07b-contrato-mobile-b108.md
?? .claude/agents/especialistas/jurado-07b-contrato-regressao-registro.md
?? .claude/agents/especialistas/jurado-07b-suplente-contrato-mobile-b108.md
?? .claude/agents/especialistas/jurado-07b-suplente-contrato-regressao-registro.md
?? .claude/agents/especialistas/jurado-c5-banco-fk-triggers.md
?? .claude/agents/especialistas/jurado-c5-suplente-arnes-catalogo-postgres.md
?? .claude/agents/especialistas/jurado-c5-suplente-banco-fk-triggers.md
?? .claude/agents/especialistas/jurado-c5-suplente-validador-diff-plano.md
?? .claude/agents/especialistas/jurado-c5-validador-diff-plano.md
?? .claude/agents/especialistas/jurado-mandato-c1-prevoo-fail-closed.md
?? .claude/agents/especialistas/jurado-mandato-c2-pergunta-feita.md
?? .claude/agents/especialistas/jurado-mandato-c3-escopo-kpi-registro.md
?? .claude/agents/especialistas/jurado-mandato-c3b-fronteira-numero-registro.md
?? .claude/agents/especialistas/jurado-o6r04a-c2-banco-rls.md
?? .claude/agents/especialistas/jurado-o6r04a-c2-fail-closed-backend.md
?? .claude/agents/especialistas/jurado-o6r04a-c2-suplente-banco-rls.md
?? .claude/agents/especialistas/jurado-o6r04a-c2-suplente-fail-closed-backend.md
?? .claude/agents/especialistas/jurado-o6r11-c2-fail-closed-dart.md
?? .claude/agents/especialistas/jurado-o6r11-c2-suplente-fail-closed-dart.md
?? .claude/agents/especialistas/jurado-o6r11-contrato-mobile-fila.md
?? .claude/agents/especialistas/jurado-o6r11-suplente-contrato-mobile-fila.md
?? .claude/agents/especialistas/jurado-san3-01c2-fail-closed-web.md
?? .claude/agents/especialistas/jurado-san3-01c2-suplente-fail-closed-web.md
?? .claude/agents/especialistas/medidor-de-cobertura-do-artefato.md
?? .claude/agents/especialistas/suplente-critico-c5-adversarial.md
?? agent-orchestration/omega/juntas/TEMPLATE-J-ata.md
?? results.txt


Veredito parcial: ec=0; leitura, sem limpeza alheia

## C1. Limpeza / B3. Origem do dono — 2026-10-03T16:37:45.724249+00:00

Comando / medido por: ["git", "grep", "-n", "B-SAN3-06c", "b404815c", "--", "agent-orchestration/codex/comandos", "agent-orchestration/claude/comandos"]

Saída resumida:
b404815c:agent-orchestration/codex/comandos/B-SAN3-01-web-wo-sem-fallback-fabricado.md:151:  `P-SAN3-01-DESPACHOS-ALERTA-DADOS-DEMONSTRATIVOS` (reescrita) → **bloco novo `B-SAN3-06c` · `fix/web-estados-despachos-e-dashboard`**
b404815c:agent-orchestration/codex/comandos/B-SAN3-04a-rbac-catalogo-banco-matriz.md:209:- **(ee) D-2 — dono de `P-SAN3-01-NOVA-OS-SEM-GATE-NO-BOTAO` é `B-SAN3-01b`, não `B-SAN3-06c`.** ACEITO, com o


Veredito parcial: ec=0; leitura, sem limpeza alheia

## C1. Disco e artefatos — 2026-10-03T16:37:45.726261+00:00

Comando / medido por: shutil.disk_usage(ROOT); Path.exists alvos nominais C5

Saída resumida:
{"free_GiB": 7.75, "paths": {"w-reg403": false, "w-reg399": false}, "artifacts_main": {"frontend/dist": false, "dist": false, "coverage": false, "frontend/coverage": false, ".vite": false, "mobile/flutter_app/build": false}}

Veredito parcial: Somente medição; máquina compartilhada preservada.

## B3. Validade do bloco 06c — 2026-10-03T16:38:08.470359+00:00

Comando / medido por: git show b404815c:agent-orchestration/codex/comandos/B-SAN3-01-web-wo-sem-fallback-fabricado.md linhas 141-162

Saída resumida:
141:   reescrito.
142:
143: ## Emenda 3 do orquestrador — ciclo 2, o último (2026-09-18)
144:
145: Junta do ciclo 1: REPROVADO 2 × 2 (C3 e C4). Registro: `agent-orchestration/omega/reprovacoes/R-B-SAN3-01-ciclo1.md`; votos em
146: `votos/B-SAN3-01/`. Plano de correção: `agent-orchestration/omega/planos/B-SAN3-01-ciclo2-plano.md` (`planejador-mestre`, Fable,
147: 2ª instância; a 1ª caiu por 429). Teto de dois ciclos: se o ciclo 2 reprovar, o bloco para e vai dossiê ao dono. Decisões:
148:
149: - **(p) O plano de correção está aprovado como escrito**, com os acréscimos de escopo do seu §4, mais o de (r).
150: - **(q) Donos dos pré-existentes sem bloco (§3 do plano):** `P-SAN3-01-DASHBOARD-DESPACHOS-ERRO-COMO-VAZIO` e
151:   `P-SAN3-01-DESPACHOS-ALERTA-DADOS-DEMONSTRATIVOS` (reescrita) → **bloco novo `B-SAN3-06c` · `fix/web-estados-despachos-e-dashboard`**
152:   (frente 3, escopo `frontend/src/pages/DashboardPage.tsx`, `frontend/src/modules/operations/dispatches/pages/**` e
153:   `components/DispatchesSummaryCards.tsx`), que **entra no gate** — é a classe do critério 4 (a web não mostra erro como dado) —
154:   e é recontado pelo `B-SAN3-10`; `P-SAN3-01-LOGISTICS-FICCAO-ROTEADA` → **emenda nominal ao `B-SAN3-06a`** (rota, menu e os três
155:   caminhos `pages/LogisticsPage.tsx`, `modules/logistics/**`, `mocks/logistics/**`; o padrão do §10.1: sai da rota e do menu);
156:   `P-SAN3-01-INVENTARIO-FECHAMENTO-CONTAGEM-FABRICADO` → **emenda nominal ao `B-SAN3-15`** (`frontend/src/modules/inventory/cycle-counts.adapter.ts`
157:   e `CycleCountSessionDrawer.tsx`); `P-SAN3-01-NAV-MENU-DEMO-NO-ERRO` e `P-SAN3-01-STALE-ICONE-COR` → fila pós-gate; os demais,
158:   como o §3 do plano propõe.
159: - **(r) `C2-N2` entra nesta correção.** 200 sem `items`/`data` virando lista vazia com KPIs "0" é a propriedade P2 do plano
160:   (enumeração fechada; o desconhecido cai no erro), está na fronteira (`work-orders.adapter.ts`) e custa poucas linhas. Teste com
161:   vermelho-controle; a `P-SAN3-01-LISTA-2XX-MALFORMADO-VIRA-VAZIO` não nasce.
162: - **(s) `C3-P2` fecha por §2.5 do plano** (o vazio ganha a ação); sem veto.

Veredito parcial: Bloco existe por emenda 3(q), com escopo nominal. Sua ausência no PLANO_SAN3.md não equivale a bloco inexistente; falta de consolidação é anterior ao #404.

## B3. Escopo temporal dos residuais — 2026-10-03T16:38:08.758715+00:00

Comando / medido por: ["git", "grep", "-n", "-E", "06c|CABECALHO-OS-DIVERGE-DA-REFERENCIA", "b404815c", "--", "agent-orchestration/controle/decisoes.md"]

Saída resumida:
b404815c:agent-orchestration/controle/decisoes.md:2387:   `B-SAN3-06c`.


Veredito parcial: ec=0; registro de origem/preexistência

## B3. Escopo temporal dos residuais — 2026-10-03T16:38:08.812483+00:00

Comando / medido por: ["git", "show", "b404815c^:docs/revisoes/SAN3/PLANO_SAN3.md"]

Saída resumida:
Ocorrências B-SAN3-06c no plano pai: 0

Veredito parcial: ec=0; registro de origem/preexistência

## C2. Integração dos próximos alvos — 2026-10-03T16:38:37.203254+00:00

Comando / medido por: git merge-base --is-ancestor b404815c/f03b883f 59aa7593f7d245e1d57ffeb0b5ca12fb98f10247

Saída resumida:
[{"base": "b404815c", "ec": 0, "output": ""}, {"base": "f03b883f", "ec": 0, "output": ""}]

Veredito parcial: Condição a conferir pelo inspetor de cada alvo; este porteiro não substitui o gate de terreno.

## C2. Integração dos próximos alvos — 2026-10-03T16:38:37.319097+00:00

Comando / medido por: git merge-base --is-ancestor b404815c/f03b883f 371b09b26cf51ee28996074c81e2f91dca585cc3

Saída resumida:
[{"base": "b404815c", "ec": 0, "output": ""}, {"base": "f03b883f", "ec": 0, "output": ""}]

Veredito parcial: Condição a conferir pelo inspetor de cada alvo; este porteiro não substitui o gate de terreno.

## C2. Insumo do ciclo 4 — 2026-10-03T16:38:37.377392+00:00

Comando / medido por: git ls-tree -r --name-only 371b09b26cf51ee28996074c81e2f91dca585cc3 -- omega/reprovacoes omega/juntas; nomes auditoria/ciclo4

Saída resumida:
agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-conferencia-dois-lados.md
agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-inspetor-terreno-instancia-caida.md
agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-inspetor-terreno.md
agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/auditor-atestacao.md
agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/c1d.md
agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/c2d.md
agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/c3d.md
agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/conferente-reconferencia.md
agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/conferente.md
agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/dev-scripts-k4b3.md
agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/dev-scripts-k4b4.md
agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/dev-scripts.md
agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/dev-tests-t4c5.md
agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/dev-tests.md
agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/fabrica-1bis.md
agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/fabrica-1quater.md
agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/fabrica-1ter.md
agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/fabrica.md
agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/inspetor.md
agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/planejador-errata.md
agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/planejador-errata2.md
agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/planejador-errata3.md
agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/planejador-errata4.md
agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/planejador.md
agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-quedas.md
agent-orchestration/omega/reprovacoes/R-B-GOV-MANDATO-ciclo3-auditoria.md

Veredito parcial: ec=0; presença não equivale a revalidação de mérito.

## C2. Integração dos próximos alvos — 2026-10-03T16:38:37.510108+00:00

Comando / medido por: git merge-base --is-ancestor b404815c/f03b883f 8deebefc66e94005d7a037dbf5b133c74edb4f10

Saída resumida:
[{"base": "b404815c", "ec": 1, "output": ""}, {"base": "f03b883f", "ec": 1, "output": ""}]

Veredito parcial: Condição a conferir pelo inspetor de cada alvo; este porteiro não substitui o gate de terreno.

## A2. Mandato 403 preservado — 2026-10-03T16:38:37.673731+00:00

Comando / medido por: git show b404815c:agent-orchestration/omega/juntas/votos/B-SAN3-01b/00-mandatos/porteiro-403.md; md5 EOL-neutro

Saída resumida:
23714aa064bc4d692e9fc562e72d3fb4

Veredito parcial: CONFERE com mandato_md5 23714aa064bc4d692e9fc562e72d3fb4 declarado no parecer 403.

## B3. Julgamento dos donos e ressalvas do 403 — 2026-10-03T16:39:28.037248+00:00

Comando / medido por: git show b404815c:pendencias.md; PLANO_SAN3.md:272; B-SAN3-01-web-wo-sem-fallback-fabricado.md:150-154; decisoes.md:2387; diff com pai

Saída resumida:
Os dois campos dono saíram de propostos para B-SAN3-06c/B-SAN3-06a; índice reexecutado reconhece os donos. 06a consta do plano §5 (linha 272), inclusive autorização/papéis. 06c não aparece no PLANO_SAN3.md (0 ocorrências no merge e no pai); existe por emenda 3(q), 2026-09-18, e é reconhecido pela decisão D-SAN3-01-MERGE-COM-BLOCO-DE-GUARDA. Portanto os destinos existem; a alegação mais forte de ambos válidos/consolidados no plano principal não reproduz. A emenda de 06c cobre Dashboard/Despachos, sem ampliação nominal para o guard de origem por propriedade. A atribuição no #404 diz feita pelo registro, não apresenta aceite do planejador exigido no fecho do PORTEIRO-403. Não encontrei esse aceite nos arquivos entregues; não presumo anuência.
A pendência do cabeçalho (9973-9983) segue ABERTA, dono decisão do dono, bloqueia não. Status/log novos dizem explicitamente decisão ainda não tomada/levada ao dono. Não há entrada nominando CABECALHO-OS-DIVERGE-DA-REFERENCIA em decisoes.md. Não fabricar decisão para quitar ressalva: o adiamento está documentado na trilha, mas não no destino pedido pelo porteiro anterior.
Nenhuma pendência foi aberta/fechada pelo #404: o diff só muda as duas linhas de dono. Amostra da afirmação paga: backfill_note corrigida reproduz igualdade de árvore merge=head final e diferença de approved_head (7 arquivos só ata/votos).

Veredito parcial: RESSALVAS documentais, sem defeito de produto nem bloqueio dos três próximos alvos. Consolidação do 06c antecede este PR; autoria incompleta dos títulos e atribuição sem aceite são residuais da promessa corrente.

## C2. Julgamento do próximo start — 2026-10-03T16:39:28.037961+00:00

Comando / medido por: Varredura oficial do índice + leitura das seções de bloqueio + PLANO_SAN3.md §5 + gh pr view 401/393/400 + ancestralidade

Saída resumida:
432 cabeçalhos, 421 IDs, 115 FECHADAS, 317 ABERTAS. Foram lidas as 14 seções não fechadas com nomes/números dos alvos ou ciclo 4 e examinadas as 132 com menção a bloqueia. As ocorrências genéricas de ciclo 4 incluem história de outros blocos. Nenhuma pendência encontrada exige ser fechada antes do início destes três alvos.
#401 = B-SAN3-11; #400 = B-SAN3-09: pendências próprias P-CHK-DOSSIE-VERSAO-NA-UI e P-SAN-PROD-BOOTSTRAP são o trabalho a entregar, não pré-requisitos que proíbem julgá-lo. O plano §5 os lista sem dependência prévia (—). #393 tem dívidas não bloqueantes de governança/KPI; P-KPI-NOTAS-CARREGADAS-REGRESSAO-392 permanece explicitamente sua.
#401 59aa7593 e #393 371b09b2 integram b404815c. #400 8deebefc não integra nem f03b883f; precisa reconciliar os registros e KPI com a main corrente no pré-merge, sem reaproveitar números antigos. Cada junta ainda exige seu próprio LIBERADO do inspetor; este parecer não aprova produto nem dá quórum. A auditoria R-B-GOV-MANDATO-ciclo3-auditoria.md está presente no head #393 medido, sem reauditar seu mérito ou tocar a junta em curso.
Não declarar P-GOV-REGISTRO-PURO-QUORUM resolvida: #404 não tem ata própria, assim como a classe registrada desde 2026-09-05. É dívida preexistente, nomeada e sem decisão neste gate.

Veredito parcial: PRÓXIMOS ALVOS SEM BLOQUEANTE DE START IDENTIFICADO; LIBERAÇÃO COM RESSALVAS em preparação, pendente da limpeza própria.

## C1. Julgamento da limpeza entregue — 2026-10-03T16:39:28.038575+00:00

Comando / medido por: ls-remote, branch --list/--merged, worktree list, rev-parse, status --porcelain, Path.exists e disk_usage

Saída resumida:
docs/registro-403 e docs/registro-399 ausentes local/remoto; w-reg403 e w-reg399 ausentes. main local=origin/main=b404815c; só main entre branches já mergeadas. Nenhuma exclusão rastreada na árvore principal; 55 entradas de status alheias registradas, não modificadas. Artefatos C5 nominais ausentes. w-reg404 carrega este mandato e permanece ativo por autorização, não é o worktree antigo do PR 404 (w-reg403). Nenhum banco foi alvo; registro puro não exige inspeção de resíduo em base viva.
Disco medido em 7,75 GiB livres: abaixo de ~10 GB. Orquestrador deve providenciar a limpeza profunda prevista em docs/limpeza-de-disco.md / DEEP_CLEAN=1 bash scripts/post-merge-cleanup.sh quando puder preservar os clusters e worktrees ativos; não executar cegamente sob a junta 393 (P-CHORE-CLEANUP-DESCE-EM-WORKTREES). Não executei limpeza global nem toquei seus processos.

Veredito parcial: Limpeza do registro CONFERE; ressalva operacional de espaço livre. Remoção de w-port404 a seguir.

## C1. Pre-remocao propria — 2026-10-03T16:40:32.681254+00:00

Comando / medido por: Path.resolve + is_junction; git rev-parse HEAD/status/diff; Get-CimInstance Win32_Process por caminho absoluto do PowerShell

Saída resumida:
Alvo absoluto validado: C:\Users\AMP\w-port404; HEAD b404815c; node_modules proprio nao junction. Status: ' M agent-orchestration/controle/pendencias-indice.md\n'; diff ec=0.
{
    "count":  0,
    "processes":  [

                  ]
}


Veredito parcial: ec=0; tentativa anterior nao encontrou powershell.exe no PATH, sem remover nada; verificacao repetida por caminho absoluto.

## C1. Autorizacao de remocao propria — 2026-10-03T16:40:32.681963+00:00

Comando / medido por: Verificacao sequencial anterior

Saída resumida:
0 processos vivos; alvo absoluto C:/Users/AMP/w-port404 confirmado, sem junction

Veredito parcial: Remover exclusivamente o worktree proprio autorizado.

## C1. Limpeza propria — 2026-10-03T16:40:43.107581+00:00

Comando / medido por: git worktree remove --force C:/Users/AMP/w-port404 (timeout 120s)

Saída resumida:


Veredito parcial: ec=0; diretorio existe=False

## C1. Confirmacao pos-limpeza — 2026-10-03T16:40:45.081314+00:00

Comando / medido por: Get-CimInstance Win32_Process; git worktree list --porcelain; Path.exists; shutil.disk_usage

Saída resumida:
{
    "count":  0,
    "processes":  [

                  ]
}

Worktree listado: false; diretorio existe: false; livre apos limpeza: 8.17 GiB.

Veredito parcial: CONFERE: worktree e npm ci proprios removidos; 0 processo vivo antes e depois. Sem remocao em arvore principal, w-reg404 ou worktrees da junta 393.

## Fecho da ref julgada — 2026-10-03T16:41:51.077069+00:00

Comando / medido por: git ls-remote origin refs/heads/main

Saída resumida:
b404815ce3d1f1b8e5121bd1526978f7222e7479	refs/heads/main


Veredito parcial: Ref remota continua b404815ce3d1f1b8e5121bd1526978f7222e7479; conclusões sobre este objeto.

## Parecer final — 2026-10-03T16:41:51.077753+00:00

**Estado final: CONCLUÍDO.** Os estados EM APURAÇÃO acima são checkpoints históricos, superados por este fecho. Papel e identidade da primeira linha mantidos; instância nova para o #404, no Codex conforme mandato do dono. Nenhum commit, push ou correção de conteúdo versionado. A única escrita de geração foi no worktree descartável próprio (índice sem diff); árvore principal e w-reg404 não foram alterados por este porteiro.

**Resultado dos oito itens do corpo:**

1. Merge íntegro: #404 MERGED; b404815c é a main remota e local, e contém a entrega declarada. O head do PR é cc7a2acd; os 14 check-runs estão completed/success.
2. Promessa conferida: 11 arquivos, 255 adições/9 remoções, limitados a KPI/registro. Pareceres 403 e 399 idênticos byte a byte às origens (MD5 crus 34bb418f026b79a74a27d8e731a490c6 / c57b1a48c54029f126aacc0d94a7de9c); o 399 também é idêntico ao blob de 04cedbea. Só backfill_note mudou nos JSON; só FROZEN mudou no JavaScript. Ressalvas de redação/encaminhamento abaixo.
3. Reexecução própria: Node 20.19.5; npm ci próprio, 326 pacotes, sem junction; três guards de KPI **29 testes / 29 pass / 0 fail / 0 skipped**, kpi-freeze --check em dia, node --check e git diff --check ec=0. Backend completo, smoke web e Flutter não executados: nenhuma dessas trilhas mudou, nenhum número novo prometido. Warning EBADENGINE de @prisma/streams-local na instalação não impediu instalação nem os guards; nenhum Prisma/banco foi executado.
4. Backfill confirmado nos dois JSON: pr=402, merge_commit=3e40a256ce801a8e63230b4b764ba1d2803f4f23, approved_head=cdf370dcb4c817e1c4292aed1204140951616971. Árvore do merge = head final 1483a6f7; difere da aprovada exclusivamente pelos sete arquivos de ata/votos. FROZEN acompanha.
5. Ata do bloco de origem existe e registra 3×0 sobre cdf370dc. #404 não tem junta própria; isto permanece sob a dívida preexistente P-GOV-REGISTRO-PURO-QUORUM, medida em pendencias.md:6956, e não é declarado como exceção normativa aprovada.
6. Donos atribuídos e índice reproduzido: **432 cabeçalhos / 421 IDs / 115 FECHADAS / 317 ABERTAS**, sem diff residual de conteúdo. Não houve fechamento de pendência no #404; a amostra de quitação foi a nota de backfill, comprovada pelas árvores Git.
7. Limpeza do registro conferida: ramos docs/registro-403 e docs/registro-399 apagados local/remoto, worktrees w-reg403 e w-reg399 ausentes, main avançada, zero exclusão rastreada, artefatos nominais ausentes. **Limpeza própria concluída: w-port404 e seu npm ci removidos por git worktree remove --force, com zero processo vivo antes e depois.** Disco final **8,17 GiB livres**.
8. Nenhuma pendência aberta identificada bloqueia o início da junta 2 do #401, da junta 4 do #393 ou da junta do #400. Isto não substitui inspeção de terreno, aprovação de mérito, quórum ou CI de cada um. #401 e #393 já integram b404815c nos heads medidos; #400 ainda não. Integração e recontagem de KPI no pré-merge continuam obrigatórias, pela ordem real dos merges; as notas carregadas sob P-KPI-NOTAS-CARREGADAS-REGRESSAO-392 continuam com dono #393.

**Ressalvas para o orquestrador, com escopo e destino:**

- **R404-1 — baixa, dentro da promessa de registro:** Kpis/kpis-history.md:2982 e :3020 ainda trazem “na autoria” nos títulos, embora as tabelas :2991 e :3030 já estejam corretas. A afirmação de seções sem “na autoria” não se cumpriu integralmente. Destino: próximo registro documental desta cadeia.
- **R404-2 — baixa, atribuição nova / consolidação preexistente:** pendencias.md:9949 e :9959 agora têm donos nominais, mas o diff não documenta o aceite dos planejadores solicitado pelo PORTEIRO-403. 06a está no PLANO_SAN3.md:272; 06c existe pela emenda do comando B-SAN3-01:150-154 e pela decisão em decisoes.md:2387, mas tem zero ocorrências no plano principal, inclusive no pai do #404. Não é bloco fictício; falta consolidar a fronteira que receberá a propriedade do guard e confirmar o encaminhamento pelos respectivos planejadores antes desses blocos. Destino: orquestrador / planejamento 06a e 06c. Não bloqueia #401/#393/#400.
- **R404-3 — baixa, ressalva anterior ainda pendente:** pendencias.md:9973 mantém a escolha do cabeçalho como decisão do dono, explicitamente não bloqueante. Status/log dizem que foi levada ao dono; não há decisão ou adiamento nominal em decisoes.md, como pediu o parecer 403. Registrar o estado no destino de rastreabilidade sem inventar decisão. A dívida de quórum P-GOV-REGISTRO-PURO-QUORUM também continua aberta, com dono decisão do dono/junta de governança; este porteiro não a resolve por precedente.
- **R404-4 — operacional, máquina compartilhada:** 8,17 GiB após retirar o worktree próprio, abaixo de ~10 GB. Orquestrador deve providenciar a limpeza profunda prevista em docs/limpeza-de-disco.md / DEEP_CLEAN=1, respeitando P-CHORE-CLEANUP-DESCE-EM-WORKTREES e os clusters/worktrees vivos. Não executei limpeza global sob a junta 393, nem acessei a base viva. Reavaliar espaço antes de novas instalações pesadas.

O orquestrador persiste este parecer conforme o mandato; não há exigência deste porteiro de criar outro PR exclusivamente para ele. As ressalvas são dívidas nomeadas que acompanham o trabalho, não bloqueantes novos de produto ou uma aprovação retroativa das juntas em curso.

LIBERADO COM RESSALVA: junta 2 do PR 401, junta 4 do PR 393 (em curso) e junta do PR 400 | R404-1 a R404-3 no registro/planejamento responsável; R404-4 sob coordenação do orquestrador; preservados os gates próprios, a integração da main e a recontagem de KPI de cada PR.
