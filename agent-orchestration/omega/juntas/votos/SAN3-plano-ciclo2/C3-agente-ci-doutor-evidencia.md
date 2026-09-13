# C3 — agente-ci-doutor — evidencia (PR #386 ciclo 2, objeto ecc32712)

Modelo: claude-opus-5 (Opus 5). Elegibilidade: suplente NOMEADO da C3 no ciclo 1, nunca instanciado (0 votos, 0 achados).
Medicao na ref, via git show / worktree detached proprio j-san3c2-c3.

## Terreno
- `git worktree add --detach .../j-san3c2-c3 ecc32712` (com -c core.longpaths=true) → HEAD = ecc32712b626d836c661dfd28b2172fb75a1d475; status limpo → conforme.
- `git log --oneline 15ef3fbe..ecc32712` → 16 commits; merge-base = 15ef3fbe → base conforme.
- `git diff --stat 7ea94a53 ecc32712` → só `agent-orchestration/omega/reprovacoes/R-SAN3-plano-ciclo1.md` (21+/11-) → re-apontamento conforme o briefing §6.

## Item 1 — diff x regras
- `git diff --stat 15ef3fbe ecc32712 -- src tests prisma frontend mobile .github scripts` → saida VAZIA, exit 0 → PASSA (nada em codigo).
- `git diff --stat 15ef3fbe ecc32712` → 86 arquivos: 24 D (jurado-06-*/jurado-06d-* x 2 espelhos), 4 A (jurado-san3c2-* x 2 espelhos), Kpis/{app.js,kpis-history.json,kpis-latest.json}, controle/*, status-geral, log, juntas/*, omega-pd, O6R/*, SAN3/* → nenhum arquivo de codigo.

## Item 2 — registro e decisoes (medicoes)
- `sed -n 607,608p decisoes.md@ecc32712` → l.607 D-Ω4-C2 = "idempotencia do faturamento = unique parcial (tenant_id, work_order_id, direction) WHERE deleted_at IS NULL — SEM competencia na chave (senao duplo-faturamento entre meses)"; l.608 D-Ω4-C1 = carimbo invoiced_at/title_id + 422 item_invoiced. Bloco 600-612 md5 identico em 15ef3fbe e ecc32712 (decisao nao foi reescrita).
- `migration add_invoicing@ecc32712` l.25-27 = `CREATE UNIQUE INDEX "financial_titles_wo_direction_active_key" ON "financial_titles" ("tenant_id","work_order_id","direction") WHERE "deleted_at" IS NULL AND "work_order_id" IS NOT NULL` → o indice e o mecanismo da D-Ω4-C2.
- `REGISTRO-SAN3-CONFLITOS` (decisoes.md:2314-2336@ecc32712): item 1 = "`P-Ω4-3-REFATURAR-DELTA` × `D-Ω4-C2` (idempotencia do faturamento)", cita migration:25-27 como "o mecanismo da D-Ω4-C2 ((tenant_id, work_order_id, direction), sem competencia na chave)", afirma que o carimbo D-Ω4-C1 nao impede faturar os nao carimbados, nota de correcao C3-01 datada 2026-09-12; "Quem resolve": B-SAN3-02 reve a D-Ω4-C2 → FIEL ao texto de :607-608 → C3-01 resolvido no REGISTRO.
- `grep -n D-Ω4-C1 PLANO@ecc32712` → so l.544 (linha CR2-01 do §13, com "(corrigido no ciclo 2: e a D-Ω4-C2 — C3-01)"); `grep D-Ω4-C2` → l.138 (item 21), l.241 (B-SAN3-02), l.413 (§8.7), l.496 (§10.5), l.582 (§14). @a143d2c3 as mesmas 4 posicoes diziam D-Ω4-C1 (136, 231, 391, 464) → C3-01 resolvido no plano.
- `git grep D-Ω4-C1 ecc32712 -- status-geral log pendencias kpis-*` → so status-geral.md:4402, com "(a v4 dizia D-Ω4-C1 — corrigido no ciclo 2, C3-01)" → sem residuo que aponte o indice para a C1. decisoes.md:739 cita D-Ω4-C1 para `has_invoiced_items` (carimbo) — atribuicao correta, pre-existente.
- C3-03: `pendencias.md@ecc32712` l.5533 (P-KPI-RECENT-CONGELADO) e l.8882 (P-KPI-ROADMAP-CONGELADO): 1a linha de status = "ABERTA (PARCIAL — fechado: ...; aberto: o criterio de fechamento desta entrada — guard que falha quando o painel defasa do ultimo merge, provado por mutacao — dono B-SAN3-10, plano SAN3 v5, item 54) · reaberta em 2026-09-12 ... (C3-03). Valor anterior, preservado: "FECHADA — ..." → forma da regra PARCIAL + valor antigo preservado (inclusive a linha FECHADA e o valor anterior a ela).
- `git diff -U0 a143d2c3 ecc32712 -- pendencias.md` (41+/3-): 3 linhas removidas = status RECENT, status ROADMAP, dono "item 26"→"item 28" de BAIXA-E-CONTA; adicionadas: 6 emendas "junta do PR #386, ciclo 1" (C2-05 l.342, C2-03 l.486, C2-04 l.1703, C2-02 l.8505, C2-10 l.8693, C2-01 l.8831) + 1 emenda C3-04 (l.8370) + secao nova com 3 entradas (P-WEB-FATURAR-OS-SEM-TELA, P-SAN3-CHECKLIST-RUN-SEM-ESCOPO-POR-OBJETO, P-FIELD-LOCATION-SEM-CONSENTIMENTO-NO-BACKEND), cada uma com status/prova/escopo(com data)/dono/bloqueia/teste de encerramento.

## Item 1 — bateria reexecutada (npm ci proprio no j-san3c2-c3, sem junction; Node v20.19.5)
- `npm ci --no-audit --no-fund` → "added 326 packages", exit 0.
- `node --test --import tsx tests/kpi-achados-paridade.test.ts tests/kpi-dashboard-charts.test.ts tests/kpi-dashboard-contraste.test.ts` → `# tests 28 # pass 28 # fail 0 # skipped 0`, exit 0 → PASSA (3 arquivos / 28 testes, forma R5 confere).
- `node scripts/kpi-freeze.mjs --check` → "kpi-freeze: em dia (snapshot 2026-09-11).", exit 0 → PASSA.
- `node --check Kpis/app.js` → exit 0 → PASSA.
- `node scripts/sync-agent-agents.mjs --check` → "[agents-sync] OK — 25 agentes, espelho consistente.", exit 0 → PASSA (23 no ciclo 1 + os 2 jurado-san3c2-* = 25).
- `git status --short` no worktree proprio apos a bateria → vazio (nada mutado).
- Kpis/app.js: diff 15ef3fbe..ecc32712 = so a linha FROZEN (snapshot 2026-09-08 → 2026-09-11), gerada pelo kpi-freeze. kpis-history.json: so a entrada B-O6R-06 com backfill (pr 385, merge_commit 15ef3fbe…, approved_head e26eb9e5, snapshot_date 2026-09-08→2026-09-11 com nota); nenhuma entrada nova. Precedente #382 (1b8319f9): tambem so backfill no history, sem entrada nova → declaracao "Sem entrada nova no history (precedente #382)" CONFERE.

## Item 1 — painel x merges (gh pr list --state merged)
- Ultimo merge: #385 2026-09-11T08:10:50Z (15ef3fbe). kpis-latest@ecc32712: roadmap.as_of = 2026-09-11 (base 2026-08-19) → as_of >= ultimo merge.
- roadmap: B-O6R-01 pr 357 concluido (merge 2026-08-19 ✓); B-O6R-02 concluido pr 371 (merge 2026-09-05 ✓); B-O6R-05 pr 353 (2026-08-15 ✓); B-O6R-06 concluido pr 385, nota "Mergeado em 2026-09-11 (PR #385, 15ef3fbe)" ✓; B-O6R-07 parcial (07a #369, 07b #380 MERGED) ✓; restantes a_fazer sem PR mergeado correspondente.
- trilha_bloqueada.bloqueada_por = ["B-O6R-07"] + nota da retirada do B-O6R-06 (mae P-O6R-B06 FECHADA) → coerente (07 parcial).
- recent: 15 itens; #385 2026-09-11, #381 09-08, #380 09-07, #371 09-05, #369 09-04 = datas UTC do mergedAt ✓; agregado "21 PRs, #360 a #384" = 25 MERGED menos 4 listados (369/371/380/381) ✓; #386 item de autoria (OPEN). production_readiness.p0_fechados 11 → 13 (backfill do #385) ✓.

## Item 2 — indice pelo gerador (copia fora do repo: scratchpad/votos-SAN3-c2/c3gen/, arquivos por `git -c core.autocrlf=false show ecc32712:`)
- `python agent-orchestration/controle/gerar-indice-pendencias.py` (Python 3.13.14, cwd = copia) → "indice: 366 cabecalhos / 355 IDs | {'FECHADA': 103, 'ABERTA': 263} | baldes {'-': 103, 'C': 71, 'B': 90, 'A': 102} | diferidas-materiais 14".
- `cmp gerado commitado` → BYTE-IDENTICO; sha256 4e7d49808e7a9b02… nos dois; 58082 bytes nos dois → PASSA (forma R5 366/355/103/263/14 confere).
- Indice@ecc32712: P-KPI-RECENT-CONGELADO (l.5460) e P-KPI-ROADMAP-CONGELADO (l.8880) nas ABERTAS; P-WEB-FATURAR-OS-SEM-TELA (9185), P-SAN3-CHECKLIST-RUN-SEM-ESCOPO-POR-OBJETO (9194), P-FIELD-LOCATION-SEM-CONSENTIMENTO-NO-BACKEND (9203) nas ABERTAS balde A (ALTA), coluna dono = sim → as 3 novas bem-formadas para o gerador.
- Reproducao das provas escritas das 3 novas @ecc32712: `git grep -nE "/invoice|faturar" -- frontend/src` → 1 linha (App.tsx:674 path="/finance/invoices") = "so a rota /finance/invoices do App.tsx" ✓; work-order-financial.routes.ts:78 = `"/work-orders/:workOrderId/invoice"` ✓; InvoicesPage.tsx:53 "o faturamento continuam disponiveis no Financeiro" ✓; `git grep -nE "assigned|not_assigned" -- src/modules/checklists` → 0 ✓; catalog.ts:939-942 = checklist_runs:read/update/complete/acknowledge ✓; field-location.service.ts:21-38 grava sem consent (grep -i consent no modulo = 0) ✓; telemetry.service.ts:108-111 consent-gate ✓ → as provas se reproduzem (sem repeticao da classe C3-04).
- Erratas da descricao do PR: `git log -1 f84bc634` → "aos 9 bloqueantes do ciclo 1"; votos do ciclo 1 somam C1 1 (C1-02) + C2 3 (C2-01, C2-02, C2-09) + C3 3 (C3-01..03) = 7 → errata 1 VERDADEIRA. decisoes.md:1916+ D-APOSENTADORIA-ELENCO-EFEMERO: "Especialista cujo bloco tem ata fechada e PR mergeado e aposentado ... Cadeira de bloco em voo nunca sai"; briefing ciclo 2 §1: "sepultadas e aposentadas no mesmo PR em que a junta fechar" → errata 2 VERDADEIRA.

## Item 3 — numeros do plano (script sobre PLANO_SAN3.md@ecc32712)
- §4.1: 54 itens, 1..54 sem falta nem duplicata; ✓ = 26 (3,6,7,9,10,14,15,20,21,22,23,25,26,29,30,31,36,38,41,46,48,49,51,52,53,54) = lista do §8.7 → CONFERE.
- §5: 37 blocos, G 11 / M 21 / P 5, sem duplicata = §9 ("11 G ... 21 M, 5 P") = descricao do PR → CONFERE.
- §9 aritmetica: melhor 80,5 + 29 + (10–20) = 119,5–129,5 ≈ 120–130 h ✓; frentes 57/60,5/60,5/67,5 = somas das duracoes do §6 ✓; realista 297 + 29 + (10–20) = 336–346 h = 14,0–14,4 dias ≈ 14 ✓; 2 frentes: trabalho sem o fecho = 10 G×57 + 21 M×10 + 5 P×2 = 790 ✓, /2 + 57 = 452 ✓, +29 +(10–20) = 491–501 h = 20,5–20,9 dias ≈ 20,5–21 ✓.
- §0 (1–4) × status-geral (bloco 2026-09-11 + "Ciclo 2") × log-execucao (bloco SAN3 + "Ciclo 2") × kpis-latest (limitations[7], recent #386) × descricao do PR: 52/231 (22,5%) · 31 F + 21 P · 49 ausentes (35+14; 50 da fatia) · 54 bloqueantes / 37 blocos / 6 atos · ~120–130 h · ≈14 d (4 frentes) · ≈20,5–21 d (2) · indice 366/355, FECHADAS 72→103, ABERTAS 263, 0 contraditorias → IGUAIS em todos, e iguais ao gerador executado.
- log: 31 + 24 + 175 + 1 = 231 = total da tabela do §1 ✓; §1 AUSENTES 37+8+58+24+13 = 140 ✓ (C3-05 resolvido).

## Item 2/3 — conferencias complementares
- `git log --reverse 15ef3fbe..ecc32712 | head -1` → 846ac2dc 2026-09-11T11:54:26-03:00 = 14:54Z → "aberto desde 2026-09-11 14:54Z; 29 h ate 2026-09-12 19:54Z" CONFERE.
- `git diff --check 15ef3fbe ecc32712` → exit 0 → PASSA.
- `git grep "A PREENCHER"` em reprovacoes/, J-SAN3-plano-ciclo1, BRIEFING ciclo 2, controle/, PLANO → so R-SAN3-plano-ciclo1.md:68 (a linha da trilha que DESCREVE a correcao). Diff 7ea94a53..ecc32712 do R-: (a) ganhou C3-01/02/03; (b) "Quem achou: C1, C2 e C3" + aplicador nomeado com o relatorio; (c) "tres classes" com C3-01/C3-02 (afirmacao herdada) e C3-03 (regra pela metade); trilha: placar 0x3 (26 achados, 7 bloqueia) + linha da v5 + linha da R6 → R- COMPLETO.
- §12 = 17 linhas (CR1-01..17), §13 = 12 (CR2-01..12), §14 = 26 (C1-01..06, C2-01..12, C3-01..08); gravidade/escopo de cada linha do §14 × campo do voto do ciclo 1: 0 divergencias (7 bloqueia · 8 ajuste · 11 nota) → CONFERE com a descricao do PR ("17 + 12 ... 26 da junta").
- OBITUARIO@ecc32712 §2: registradas 29 · SEPULTADAS 29 · RESERVADAS 0 → "placar 29/29/0" da descricao CONFERE. `git grep san3c2` em OBITUARIO e aposentadoria-especialistas.md → 0 (nenhum sepultamento/aposentadoria antecipado); os 2 jurados novos presentes nos 2 espelhos (4 arquivos).
- kpis-latest mvp_demo 99 / mvp_vendavel 88 = base (INTOCADOS, §C3.4) com nota SAN3 anexada: mvp_vendavel "54 bloqueantes em 37 blocos e 6 atos"; limitations[7] idem → coerente.
- Ata do ciclo 2 (`J-SAN3-plano-ciclo2.md`): ausente em ecc32712 e em 03e4977a (= origin/docs/san3-plano-saneamento). BRIEFING ciclo 2 @ecc32712 l.38-39: "sepultadas e aposentadas no mesmo PR em que a junta fechar"; `git grep` em controle/ por registro dessa divergencia → 0. A descricao do PR diz "divergencia registrada na ata".
- Emenda C2-04 (pendencias.md:1703, 2026-09-12): "O teste do `B-SAN3-04` cobre as quatro (plano SAN3 v5)" — a v5 nao tem bloco B-SAN3-04 (dividido em 04a/04b; a cobertura das 4 divergencias esta no 04a, PLANO l.249).
- Campos dono de entradas nascidas neste PR (544ab67f, 2026-09-11): P-KPI-ROADMAP-CONGELADO l.8891 "dono: proximo PR que tocar Kpis/ (... plano SAN3: citada no §7.2 (...roadmap parado...), sem bloco)" × a 1a linha de status da mesma entrada "dono B-SAN3-10, plano SAN3 v5, item 54"; §7.2 da v5 nao cita mais o roadmap; P-MOBILE-CHECKIN-CONFERE-CODIGO-DA-OS dono "plano SAN3: nao nomeada no gate (§4.1)" × emenda C2-01 logo abaixo do status ("entra no gate ... B-SAN3-26"). P-WEB-GATE-MODULO-INCOMPLETO dono "(plano SAN3 §4.1 item 15)" (v5: e o item 16); P-MOBILE-MINHAS-OS-SEM-FILTRO dono "(plano SAN3 §4.1 item 11)" (v5: item 32) — varredura sistematica a seguir.

## Item 2 — varredura sistematica registro x plano v5 (script c3tmp/map.js; entradas pelo cabecalho `## P-`, como o gerador)
- (3) as 7 emendas do ciclo 1 caem na entrada certa: C2-05 em P-027 (l.342), C2-03 em P-INFRA-RLS (l.486), C2-04 em P-RBAC-CHECKLIST-DRIFT (l.1703), C3-04 em P-WEB-FIN-BAIXA-E-CONTA-SEM-TELA (l.8370), C2-02 em P-WEB-GATE-MODULO-INCOMPLETO (l.8505), C2-10 em P-MOBILE-MINHAS-OS-SEM-FILTRO (l.8693), C2-01 em P-MOBILE-CHECKIN-CONFERE-CODIGO-DA-OS (l.8831) → PASSA.
- (1) ponteiros "§4.1 item N" / "plano SAN3 ... item N" no registro × linha N da v5: 31 ponteiros; 18 nao batem; 4 sao referencias legitimas a outro item (P-032 l.399 "emenda sobre P-033 ... item 14"; P-O6R-B09 l.3220 item 7 = Ω6R-ARQ-004; P-O6R-B06-LEITURA l.7388 "pre-requisito do item 9"; P-FIELD-LOCATION l.9208 "item 18 ampliado ao backend"). **14 ponteiros errados em 13 entradas, todos em linhas escritas por este PR (presentes no diff 15ef3fbe..ecc32712), todos corretos na numeracao de 544ab67f (2026-09-11) e ja errados em a143d2c3 (v4) e em ecc32712 (v5):**
  P-028 l.317 emenda "item 43" (v5: 49; v5 43 = P-SAN-PROD-BOOTSTRAP) · P-SAN-E2E l.503 emenda "item 38" (v5: 42; 38 = P-026) · P-WEB-CLOUD-BILLING-CARTAZ l.8341 dono "item 40" (v5: 46; 40 = P-Ω3F4C-ACTIVATION-PROMPT) · P-WEB-PLATAFORMA-TELAS-FICCAO l.8445 dono "item 40" (v5: 46) · P-WEB-PLATAFORMA-SEGURANCA-FABRICADA l.8462 dono "item 16" (v5: 17; 16 = GATE-MODULO) · P-WEB-GATE-MODULO-INCOMPLETO l.8514 dono "item 15" (v5: 16; 15 = RBAC-CHECKLIST-DRIFT) · P-MOBILE-PRESTADOR-SEM-PORTA l.8548 dono "item 30" (v5: 35; 30 = Ω6R-QUA-001) · P-MOBILE-CONCLUSAO-SEM-PORTA l.8565 dono "item 31" (v5: 36) · P-MOBILE-LGPD-GPS-SEM-PORTA l.8599 dono "item 17" (v5: 18) · P-MOBILE-GUINCHO-ENTREGA-INALCANCAVEL l.8616 dono "item 29" (v5: 34; 29 = CHEQUE-FECHAMENTO) · P-MOBILE-ESTOQUE-TECNICO-FABRICADO l.8667 dono "item 32" (v5: 37; 32 = MINHAS-OS) · P-MOBILE-MINHAS-OS-SEM-FILTRO l.8702 dono "item 11" (v5: 32; 11 = SUBRECURSO) · P-MOBILE-FAXINA-TERMOS-TECNICOS l.8719 dono "item 42" e l.8722 emenda "item 42" (v5: 48; 42 = P-SAN-E2E).
  Em todos o BLOCO nomeado bate com a v5 (B-SAN3-06b, B-SAN3-18, B-SAN3-15, B-SAN3-17, B-SAN3-14, B-SAN3-13, B-SAN3-19; P-028 → B-SAN3-21, P-SAN-E2E → B-SAN3-10). Errado e so o numero do item.
  O aplicador achou 1 instancia da classe (00-aplicador.md §6.7: BAIXA-E-CONTA "item 26" → 28) e o follow-up do planejador (§7.6(d)) consertou so essa instancia; as outras 14 ficaram.
- (2) linha v5 → a entrada cita o bloco da v5: 20 itens sem o bloco na entrada (quase todos entradas anteriores ao PR — P-020, P-008, P-026, P-Ω3a, P-019 ...); nenhuma regra ou promessa do PR exige isso (o dono do bloco vive no plano; o status e ABERTA no indice) → sem achado.

## Item 1 — npm run check (forma R5)
- `DATABASE_URL=postgresql://fake:fake@127.0.0.1:1/fake_c3 npm run db:generate` → exit 0; `npm run check` (`tsc -p tsconfig.json --noEmit`) → exit 0; `git status --short` depois → vazio → PASSA. CLAUDE.md/AGENTS.md: `git diff --quiet 15ef3fbe ecc32712` → intocados; norma = CLAUDE.md@ecc32712 (§C3 l.282 "dimensao nova", l.291 contagens do que o PR exerceu, l.297 null na autoria; §C7.1-ter; D-TETO-DOIS-CICLOS l.406).

## Item 1 — recent × history (painel × merges)
- kpis-history@ecc32712: 158 entradas; PR-topo 385 (B-O6R-06). recent PR-topo 386 (item de autoria) → recent nao esta atras do history pelo PR-topo.
- recent item "Identidade global: o e-mail deixa de decidir quem voce e" = {pr: null, data: 2026-08-18}, IDENTICO em 15ef3fbe; o history tem B-O6R-01-CICLO3-CORRECAO com pr 357, merge 0a39824, snapshot 2026-08-19 (gh: #357 mergedAt 2026-08-19T23:30:07Z); o roadmap da ref ja diz B-O6R-01 pr 357 "Mergeado em 2026-08-19" → o painel diz duas coisas do mesmo merge. Pre-existente (identico na base); fora do "fechado" declarado da P-KPI-RECENT-CONGELADO (#369..#386).

## Item 2 — itens do gate sem cabecalho proprio
- v5 item 14 = `P-033` e item 23 = `P-Ω3F6-CANCEL-RACE` nao tem `## ` proprio: P-033 e um bullet (pendencias.md:392) dentro de `## P-032` (l.387), cuja 1a linha de status (l.396) e "ABERTA · agendamento: DIFERIDO-LEVE · severidade: a classificar · dono: a atribuir" → indice gerado: balde C "DIFERIDO-LEVE (lista nominal, vetavel)", severidade "—"; CANCEL-RACE e bullet (l.1337) dentro de `## P-Ω3F6` (l.1335), status l.1349 "ABERTA · severidade: BAIXA · dono: a atribuir" → indice: balde B, BAIXA. As emendas do PR (l.399 "emenda sobre P-033 ... item 14"; l.1350 "CANCEL-RACE entra no gate (criterio 4)") estao nas hospedeiras. O indice responde "aberto" para os dois, mas so pela hospedeira, como diferida/baixa. (O §1 do plano declara que nao usa a severidade do indice.)

## Datacao das classes (escopo)
- `git log -S` 15ef3fbe..ecc32712: '`B-SAN3-18` (plano SAN3 §4.1 item 15)' e '`B-SAN3-13` (plano SAN3 §4.1 item 11)' → 544ab67f 2026-09-11T12:59:20-03:00; numeracao: 544ab67f item 11 = MINHAS-OS, 15 = GATE-MODULO; a143d2c3 e ecc32712: 15 = RBAC-CHECKLIST-DRIFT, 16 = GATE-MODULO, 32 = MINHAS-OS → ponteiros nascidos certos, defasados pela renumeracao da propria branch (dentro-do-bloco). 'O teste do `B-SAN3-04` cobre as quatro' → aa970499 2026-09-12.
- Base 15ef3fbe: 'P-033 (transversal)' l.382 sob P-032 com status DIFERIDO-LEVE l.386; '**P-Ω3F6-CANCEL-RACE:**' l.1306, introduzido em 3aad5277 (#228, 2026-07-19) → pre-existente.

## Veredito
- Item 1 APROVADO · Item 2 APROVADO (C3c2-01 ajuste; C3c2-02 nota; C3c2-05 nota pre-existente) · Item 3 APROVADO (C3c2-03 nota) · C3c2-04 nota pre-existente → **APROVADO** (0 bloqueia). C3-01, C3-02 e C3-03 do ciclo 1 resolvidos no que prometem, conferidos por execucao.

## Limpeza
- `git worktree remove --force C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/j-san3c2-c3`:
  exit=0
- `git worktree list` depois:
  C:/Users/AMP/Documents/GitHub/ERP_Techsolutios                                d1fab3bc [demo/investidor]
  C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/gov-descuido 497d360d [docs/governanca-porteiro-pre-merge-sol]
  C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/gov-elenco   15ef3fbe [main]
  C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/san3         03e4977a [docs/san3-plano-saneamento]
- diretorio existe? nao

## Voto gravado
- C3-agente-ci-doutor-voto.json montado em 6 partes (o comando unico falhou 2x por tamanho no shell) e validado com JSON.parse: APROVADO, 3 itens APROVADO, 5 achados (1 ajuste, 4 nota; 0 bloqueia). Linhas citadas reconferidas na copia da ref (8840, 8882, 8891, 8893; PLANO 249, 295).
