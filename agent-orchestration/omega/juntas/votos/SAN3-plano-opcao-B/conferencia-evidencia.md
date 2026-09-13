# Conferencia da aplicacao de D-SAN3-PLANO-OPCAO-B — PR #386 — evidencia incremental

Ref medida: 042e689e (anterior ec4f34a8). Cadeira: registro (votou C3 no ciclo 2, APROVADO, autor do C3c2-01).
Formato: comando -> saida -> veredito parcial.

## M0 — terreno
- `git worktree add --detach .../conf-san3b 042e689e` -> HEAD 042e689e46b1e1989af50526229269ad3218c25b; status limpo.
- `git log --oneline ec4f34a8..042e689e` -> 1 commit (042e689e "docs(san3): opcao B do dono aplicada ...").
- `git diff --stat ec4f34a8 042e689e` -> 18 arquivos (Kpis/app.js, Kpis/kpis-latest.json, log-execucao.md, decisoes.md, pendencias-indice.md, pendencias.md, status-geral.md, votos/SAN3-plano-opcao-B/00-aplicador.md + 8 apoio/*, planos/SAN3-plano-opcao-B-aplicacao.md, docs/revisoes/SAN3/PLANO_SAN3.md).
- `git diff --stat ec4f34a8 042e689e -- src tests prisma frontend mobile .github scripts RBAC_MATRIX.md` -> VAZIO. -> parcial: CONFERE (nenhum codigo, RBAC_MATRIX intocado).

## M1 — indice pelo gerador (item 2)
- copia fora do repo (`scratchpad/votos-SAN3-B/gen/`), `pendencias.md` e `gerar-indice-pendencias.py` por `git show 042e689e:` -> `python gerar.py` -> `indice: 370 cabecalhos / 359 IDs | {'FECHADA': 103, 'ABERTA': 267} | baldes {'-': 103, 'C': 71, 'B': 90, 'A': 106} | diferidas-materiais 14`
- `cmp` com `git show 042e689e:agent-orchestration/controle/pendencias-indice.md` -> BYTE-IDENTICO; sha256 40129ceac73fe3c9b291... nos dois. Entrada convertida a CRLF -> tambem byte-identico. Gerador inalterado entre ec4f34a8 e 042e689e. (O arquivo no disco do worktree difere so por CRLF do checkout autocrlf — o blob e LF.) -> parcial: CONFERE.

## M2 — fatos de codigo das provas (itens 1/2)
- `financial-entry.routes.ts` l.84-86: `router.patch("/financial-entries/:financialEntryId/reconcile", requirePermission(FINANCIAL_ENTRY_PERMISSIONS.update)` — l.85 e a rota (item 55 cita :85). l.31-32 `GET "/financial-entries"`. l.19 `update: "financial_entries:update"`.
- `git log --reverse -S'reconcile' -- financial-entry.routes.ts` -> `1e65b34b 2026-07-18T11:43:30-03:00 ... (#216)` (escopo datado da entrada nova).
- `git grep -n -E "/reconcile|financial-entries" -- frontend/src` -> nenhuma linha (ec=1). (`financial_entries:read` aparece so como permissao em App.tsx:660 / tenantNavigation.ts:359 — gate de dashboard, nao chamada.)
- `catalog.ts` blocos: operator l.730 · finance l.809 · inventory l.873 · field_technician l.895 -> 730-894 = operator+finance+inventory. l.870 = `"financial_entries:update"` (dentro do finance 809-872). finance tem so `os.read`; sem `work_orders:read`/`customers:read`/`service_catalog:read`.
- `RBAC_MATRIX.md`: l.37 Master data · l.38 Customer registry (finance none) · l.41 Service catalog (finance none) · l.44 Checklist executions · l.45 Work orders (finance read) · l.46 Workflow/approvals. -> CE-5 "l.38 e l.41", prova do item 56 ":37,44-46" batem. -> parcial: CONFERE.

## M3 — KPI e trilha (item 3)
- `git diff -U0 ec4f34a8 042e689e -- Kpis/` -> kpis-latest.json 3 linhas (l.59 nota mvp_vendavel, l.122 limitations, l.680 recent #386), app.js 1 linha (`var FROZEN`). limitations e recent: "54 bloqueantes em 37 blocos" -> "56 bloqueantes em 37 blocos".
- status-geral.md: +12 linhas no fim (entrada 2026-09-13), 56/37, indice 370/359/103/267, "Conferencia de aplicacao: a preencher pela cadeira de registro". log-execucao.md: +2 linhas no fim da entrada SAN3, mesmos numeros, "Conferencia de aplicacao: a preencher pela cadeira".
- `gh pr view 386 --json body` (head 042e689e46b1, OPEN): l.9 "56 bloqueantes, 37 blocos (11 G · 21 M · 5 P)"; l.11 KPI "56 bloqueantes em 37 blocos"; l.17 decisao do dono opcao B. Nenhum "54 bloqueantes" no corpo ("54 fontes" = PD, nao contagem de gate).

## M4 — §B do plano de aplicacao x §5.6 do plano (item 1)
- `cmp_ce.py` (difflib por palavra, bullets CE extraidos das duas fontes no blob 042e689e): CE-G1 0 · CE-G2 0 · CE-3 0 · CE-5 0 · CE-6 0 · CE-7 0 trechos diferentes. CE-1: 4 trechos — so o marcador *(medir: ...)* virou o fato medido ("27 ... mais 13 ... (as 11 ...), medida por script sobre o registro e o menu reais"). CE-2: 5 trechos — caminhos completos dos 3 routers (D11), *(medir)* -> "(as 10 existem, e o tecnico tem a permissao de cada uma — medido por script ...)", "SEC-002" -> "`Ω6R-SEC-002`". CE-4: *(medir)* -> "— `src/modules/core-saas/permissions/catalog.ts:870`". Abertura e titulo do §5.6 literais ao §B. -> parcial: CONFERE (nenhuma condicao enfraquecida, nenhuma inventada).

## M5 — item 16 recontado por mim (item 1)
- `item16.py` (blobs 042e689e de `appSidebarNav.ts` e `navigation.registry.ts`): `MVP_NAV_PATHS 51 · registro 36 · MVP - registro = 27 · registro sem requiredModules = 17 (13 nao-platformOnly: /controle/notificacoes, /operations/quotes, 5 /telemetria/*, 6 /patios/*) · os 13 estao no MVP · disjuntos da diferenca · TOTAL = 40`. -> parcial: CONFERE (27 + 13 = 40).

## M6 — fatos do CE-2 / CE-7 (item 1)
- comentario (`work-order-comment.routes.ts`): POST/PATCH/DELETE comments + POST/DELETE tags = 5, todas `WORK_ORDER_COMMENT_PERMISSIONS.comment`; geocode e geocode-destination (`work-order.routes.ts:247,256`) `WORK_ORDER_PERMISSIONS.update`; vistoria `/mobile/checklist-runs/:runId/{attachments,markers,divergence}` (`checklist.routes.ts:140,156,193`) `CHECKLIST_PERMISSIONS.updateRuns`. field_technician (catalog 895-943) tem `work_orders:comment`, `work_orders:update`, `checklist_runs:update`. -> as 10 existem e o tecnico alcanca.
- `changeStatus` work-order.service.ts:1313; sync mobile-work-order-sync.ts:265 `service.changeStatus`; `"/work-orders/:workOrderId/status"` work-order.routes.ts:136; `DEMO_TENANT_MODULES` prisma/seed.ts:197; `db:provision-rbac` package.json:26. -> parcial: CONFERE.

## M7 — bateria (item 3), no MEU worktree com `npm ci` proprio (326 pacotes, ec=0)
- `node --test --import tsx tests/kpi-achados-paridade.test.ts tests/kpi-dashboard-charts.test.ts tests/kpi-dashboard-contraste.test.ts` -> `# tests 28 # pass 28 # fail 0 # skipped 0`.
- `node scripts/kpi-freeze.mjs --check` -> "kpi-freeze: em dia (snapshot 2026-09-11)." ec=0 · `node --check Kpis/app.js` ec=0 · `node scripts/sync-agent-agents.mjs --check` -> "[agents-sync] OK — 25 agentes, espelho consistente." ec=0.
- notas mvp_*: mvp_vendavel.note "... tem 56 bloqueantes em 37 blocos e 6 atos ..."; mvp_demo.note sem numero de bloqueantes (D5, aceita pelo planejador). -> parcial: CONFERE.

## M8 — marcas CE no §5 (item 1), ferramenta propria `marks_own.py`
- rotulos: CE-1 B-SAN3-18 · CE-2 B-O6R-07c · CE-3 B-SAN3-25 · CE-4 B-SAN3-12 · CE-5 B-SAN3-08,B-SAN3-04a · CE-6 B-SAN3-04a · CE-7 B-SAN3-26. Todo bloco tem exatamente as CE-n do seu rotulo (0 divergencia). 12 blocos com marca.
- celulas que citam guard/censo (18, 21, 10) todas com CE-G1; celulas que citam papel (04a, 07c, 04b, 08, 13, 17, 10) todas com CE-G2; 12 e 25 ganham CE-G2 pelo texto da CE (D10, aceita). Alarmes do meu lexico lidos a mao: B-SAN3-09 "1 admin" (objeto criado, nao papel que executa passo) e B-SAN3-19 "papel tecnico cru" (adjetivo) — nao faltam marcas. -> parcial: CONFERE.

## M9 — agenda (item 3): script do aplicador rodado na minha arvore
- `node apoio/agenda-ciclo2.mjs <meu-worktree>` -> blocos=37 G=11 M=21 P=5; "arestas de trava que NAO estao na coluna Dep.: nenhuma"; melhor 57/60,5/60,5/67,5 -> 80,5; realista 238/213/240/223 -> 297; violacoes 0 e 0; pares de frentes com arquivo comum e janela sobreposta 0 / 0. (O script grava `agenda-ciclo2.out.json` na arvore — artefato meu, no meu worktree, removido na limpeza.)

## M10 — agenda por ferramenta PROPRIA (item 3) — `agenda_own.py`
- le do plano 042e689e a coluna Dep. do §5, as travas do §6 (30 arestas) e a tabela publicada do §6. Travas novas/estendidas presentes: 04a->07, 07->18, 07c->SAN3-26, SAN3-11->B-O6R-12. "arestas de trava que NAO estao na coluna Dep. do sucessor: []". Dep.: B-SAN3-26 [13, 07c] · B-O6R-12 [SAN3-20, SAN3-11] · B-SAN3-18 [04a, 06a, 07] · B-SAN3-25 [01, 02, 24, 04a].
- VIOLACOES na tabela publicada: 0. Recalculo melhor caso = tabela publicada (IDENTICAS). Realista recalculado: 238/213/240/223 -> 297, 0 violacoes. Esf. G11 M21 P5. -> §9 inalterado confere. -> parcial: CONFERE.

## M11 — registro, ferramenta PROPRIA (item 2) — `reg1.py`, `reg2.py`, `reg3.py`
- §4.1: 56 itens, 1..56; item 16 [P-WEB-GATE-MODULO-INCOMPLETO, P-NAV-MODULOS-NAO-RESOLVIDOS-LIBERA-MENU] B-SAN3-18; item 55 [P-WEB-CONCILIACAO-SEM-TELA] B-SAN3-12; item 56 [P-RBAC-MATRIZ-X-CATALOGO-QUATRO-CELULAS] B-SAN3-04a. ✓ = 27 = lista do §8.7. 10 itens com Ω6R -> "46 dos 56" confere.
- ponteiros, forma estrita `plano SAN3[ v5][,] [§4.1[,] ]item N`: 74; 3 "divergentes" lidos a mao: l.406 e l.1382 sao emendas de dono de bullet hospedado com "emenda sobre `P-033`"/"`P-Ω3F6-CANCEL-RACE`" DEPOIS do numero (14 e 23 — certos); l.9250 cita "item 18" so dentro do "(antes: ...)" preservado (valor vigente "§4.1 item 52"). -> 0 ponteiro vivo divergente. Nenhum ponteiro quebrado em duas linhas.
- linhas reescritas (difflib ec4f34a8 -> 042e689e, blobs LF, 9243 -> 9298): opcodes equal 59 / insert 41 / replace 18 / delete 0. 18 linhas antigas tocadas = 14 PONTEIRO (so o numero do "item N" muda: 317 43->49 · 503 38->42 · 8342 40->46 · 8446 40->46 · 8463 16->17 · 8515 15->16 · 8549 30->35 · 8566 31->36 · 8600 17->18 · 8617 29->34 · 8668 32->37 · 8703 11->32 · 8720 42->48 · 8723 42->48) + 4 DONO-ANTES (8395 P-WEB-FIN-CHEQUE... -> B-SAN3-24 item 29; 8841 P-MOBILE-CHECKIN... -> B-SAN3-26 item 53; 8892 P-KPI-ROADMAP... -> B-SAN3-10 item 54; 9209 P-FIELD-LOCATION... -> B-SAN3-17 item 52), valor antigo inteiro dentro de "(antes: ...)" (igualdade de string). OUTRO 0. 55 linhas so acrescentadas. -> CONFERE.
- as 14 linhas PONTEIRO sao exatamente as 14 do MEU C3c2-01 do ciclo 2 (voto C3 ciclo 2: l.317, 503, 8341, 8445, 8462, 8514, 8548, 8565, 8599, 8616, 8667, 8702, 8719, 8722 em ecc32712 — mesmas entradas, mesmos numeros-alvo).
- emendas `emenda (decisão do dono D-SAN3-PLANO-OPCAO-B, 2026-09-13)`: 11 = as 10 do §D.2 (nenhuma faltando) + P-KPI-RECENT-CONGELADO (D13). Cada uma no fim da entrada (depois dela so emendas, `---` ou o blockquote da entrada nova).
- emendas de dono `dono (plano SAN3, §4.1 item N — D-SAN3-PLANO-OPCAO-B`: 32.
- entrada nova P-WEB-CONCILIACAO-SEM-TELA l.9290: status ABERTA; prova routes.ts:84-86 + 31-32 + `git grep` (reexecutado: 0 linha em frontend/src e mobile/flutter_app/lib); escopo pre-existente 1e65b34b 2026-07-18 #216 (reexecutado); dono B-SAN3-12 item 55 CE-4; bloqueia crit. 7 e 4; teste = CE-4. API_CONTRACTS.md:435 = `PATCH /financial-entries/:id/reconcile ... Concilia lançamento`. Indice l.180: `| P-WEB-CONCILIACAO-SEM-TELA | 9290 | ALTA | sim |`. -> bem-formada.
- DONO pela propriedade, entradas NOMEADAS na coluna Item: 58 avaliadas, 58 OK (bloco do §4.1 em linha com "dono", item N certo, ultimo dono = o bloco).
- DONO pela propriedade, entradas que HOSPEDAM os 10 achados Ω6R do §4.1 (cabecalho carrega o achado, forma longa ou curta): P-O6R-B11 (item 3) OK · P-O6R-B09 (item 7) OK · P-O6R-B07 (item 11) OK l.3065 · P-O6R-B04 (itens 1, 2, 31: B-O6R-04a/04b) NAO nomeia em linha nenhuma · P-O6R-B03 (itens 19, 30: B-O6R-03a/03b) NAO nomeia em linha nenhuma · P-O6R-B12 (item 24: B-O6R-12) NAO nomeia, e diz "**Estado:** ABERTO · **Dono:** próximo agente que puxar a trilha `jurisdiction`/`impound`" + cabecalho "achado ÓRFÃO, sem bloco até hoje" (texto de 0a398246, 2026-08-19, #357) · P-O6R-B07 (item 27: B-AV-REAL) NAO nomeia. Indice: P-O6R-B03/B04/B07 "**a atribuir**"; P-O6R-B12 "sim" (le o "Dono: próximo agente..."). -> ver achado.
- corpo do PR L8: "Todo ponteiro do registro para o plano (72) e todo dono das entradas do gate (58) conferidos por script, 0 divergentes"; L17: "a correção de todos os ponteiros e donos do registro".

## M12 — ponteiros, busca AMPLA propria (item 2) — `reg3.py` (regex corrigida: a 1a versao tinha um \x08 literal que EU introduzi por sed; reescrita por lambda)
- toda linha do registro que cita "plano SAN3" ou "§4.1" e tem "item(s) N": 85 ocorrencias; 11 acusadas, todas lidas a mao: 8 sao falso-positivo do meu regex (captura "item 49, 2026" como lista — o primeiro numero e o item certo: P-028 49, P-033 14, P-SAN-E2E 42, P-Ω4-3-REFATURAR-DELTA 21, P-Ω4-7-DUPLA-CONTAGEM 22, P-CHK-PATCH-SEM-LOCK 6, P-O6R-B09 7, P-MOBILE-FAXINA 48); l.6692 "o `Ω6R-SEC-002` e o item 51 fecham" (referencia deliberada ao outro item do mesmo bloco, texto do CE-2); l.7423 "pré-requisito do item 9" (deliberada); l.9250 "item 18" so dentro do "(antes: ...)". -> 0 ponteiro vivo divergente. CONFERE (C3c2-01 fechado pela propriedade).
- os "Mais 3" do meu C3c2-01: P-KPI-ROADMAP-CONGELADO dono -> B-SAN3-10 item 54 (DONO-ANTES l.8892) · P-MOBILE-CHECKIN dono -> B-SAN3-26 item 53 (DONO-ANTES l.8841) · C2-04 "B-SAN3-04" -> emenda de dono da P-RBAC-CHECKLIST-DRIFT nomeando B-SAN3-04a "(a entrada nomeia `B-SAN3-04`, nome anterior à divisão ...)". -> fechados.

## M13 — coluna "dono" do indice x emendas de dono (item 2, consequencia)
- gerador `gerar-indice-pendencias.py:98`: `dono = bool(re.search(r'\*\*dono:\*\*\s*(?!a atribuir)', body, re.I)) or bool(re.search(r'\*\*Dono:?\*\*', body))` — nao casa "- **dono (plano SAN3, §4.1 item N — ...):**".
- entradas do gate nomeadas na coluna Item, coluna "dono" do indice: "**a atribuir**" 8 em ec4f34a8 -> 8 em 042e689e: P-020, P-O6R-B11, P-CHK-PATCH-SEM-LOCK, P-O6R-B09, P-MOBILE-OS-SEEDS, P-SAN-E2E, P-028, P-Ω3F2B-ACENTOS — todas receberam emenda de dono nesta aplicacao; o indice nao a le.

## M14 — laco de caminhos proprio + limpeza
- caminhos entre crases em linhas acrescentadas (plano, pendencias, status-geral, log, decisoes): 63 distintos; 2 nao resolvidos em 042e689e = `docs/ROTEIRO-DEMO-E-OPERACAO.md` e `tests/kpi-painel-frescor.test.ts`, ambos "(novo)" na linha do B-SAN3-10 (texto anterior; a linha so voltou ao diff por ganhar marca). -> CONFERE.
- `git worktree remove --force .../conf-san3b` (pelo nome) -> ec=0; diretorio ausente; `git worktree list` sem ele. Removidos junto: `node_modules` proprio e o `agenda-ciclo2.out.json` que o script de apoio grava na arvore ao rodar. `san3` e arvore principal: somente leitura, nada meu.

## VEREDITO: NAO CONFERE
- Item 1 Fidelidade: CONFERE. Item 3 Numeros e KPI: CONFERE. Item 2 Registro: NAO CONFERE por CONF-01 (bloqueia, dentro-da-aplicacao): a propriedade de dono nao fecha nos itens 2, 19, 24, 30 e 31. As entradas do registro que hospedam esses achados (P-O6R-B03, P-O6R-B04, P-O6R-B12) nao nomeiam o bloco do §4.1, e a P-O6R-B12 diz "sem bloco ate hoje" / "Dono: proximo agente". Na leitura estreita (so os IDs escritos na coluna Item) da 58/58, medido. CONF-02 (nota): o indice nao le as emendas de dono (8 "a atribuir" -> 8).
- Meu C3c2-01 do ciclo 2: fechado (14 ponteiros no item certo, 3 donos fechados).

---

# Reconferência (`bb3f5925`)

Pedida pelo orquestrador depois do NÃO CONFERE sobre 042e689e. Objeto bb3f5925. Mesma cadeira, mesmas regras; a primeira seção acima fica intacta.
Formato: comando -> saída -> veredito parcial.

## R0 — terreno e escopo da passada
- `git worktree add --detach .../conf-san3b-r bb3f5925` -> HEAD bb3f59256ee168838e7eeea6a32372899631f4ea, status limpo; `npm ci` proprio (326 pacotes, ec=0).
- `git log --oneline 042e689e..bb3f5925` -> 1 commit (bb3f5925 "docs(san3): opcao B — donos do gate pela fonte (CONF-01) e no formato que o indice le (CONF-02)").
- `git diff --stat 042e689e bb3f5925` -> log-execucao.md 2 · pendencias-indice.md 428 · pendencias.md 73 · status-geral.md 2 · votos/SAN3-plano-opcao-B/00-aplicador.md +221 · apoio/{conferir_donos_pela_fonte.py, dono_check.py, dono_check3.py} novos · PLANO_SAN3.md 1 (§15). = o escopo anunciado.
- `-- src tests prisma frontend mobile .github scripts RBAC_MATRIX.md` x 042e689e e x ec4f34a8 -> VAZIO. `-- Kpis` e `-- decisoes.md planos/` x 042e689e -> VAZIO. -> parcial: CONFERE.

## R1 — item 2 inteiro, ferramentas PROPRIAS (sobre blobs bb3f5925 em `votos-SAN3-B/r/`)
- DONO, regra do sujeito na forma estrita (`dono_estrito.py`: sujeito = cabecalho com o ID — P- token exato, Ω6R forma longa ou curta; na falta, bullet/emenda "sobre `ID`" na hospedeira; dono atual = ULTIMA linha de dono relevante ao ID, fora de "(antes: ...)"/"Valor anterior, preservado"): 68 pares (item, ID, sujeito), 68 OK; **56/56 itens** com todo sujeito OK. Sujeitos que nao sao a propria entrada: P-O6R-B04 (itens 1, 2, 31 -> l.2895/2896/2897: 04a/04a/04b) · P-O6R-B11 (3 -> l.3340) · P-O6R-B09 (7 -> l.3256) · P-O6R-B07 (11 -> l.3093 07c; 27 -> l.3092 B-AV-REAL) · P-032 (14 -> l.406) · P-O6R-B03 (19 -> l.2830 03a; 30 -> l.2831 03b) · P-Ω3F6 (23 -> l.1382) · P-O6R-B12 (24 -> l.2929 B-O6R-12). -> CONF-01 fechado pela fonte.
- PONTEIROS: estrita (com "sobre" em qualquer ponto da linha) 82, 81 vivos (1 so dentro de "(antes: ...)"), 0 vivo divergente; ampla (`reg3.py`) 101 ocorrencias, 11 acusadas = os mesmos 8 falso-positivos de data + 3 deliberadas (l.6701 "item 51", l.7432 "item 9", l.9259 antes) -> 0 vivo divergente. (O PR diz "80": contagem da ferramenta do aplicador, outro padrao; a propriedade — 0 divergente — confere nas minhas duas.)
- REESCRITAS x ec4f34a8: `git diff -U0 ec4f34a8 bb3f5925 -- pendencias.md` -> 18 linhas removidas, todas bullets `--`, 82 acrescentadas; difflib (`reg2.py`) -> replace 18 = 14 PONTEIRO + 4 DONO-ANTES, OUTRO 0, delete 0, 64 so acrescentadas. -> CONFERE.
- 042e689e -> bb3f5925 (`reformat.py`): replace 32 = as 32 emendas de dono no formato `- **dono:** `B-…` (plano SAN3, §4.1 item N — ...)`, TODAS iguais em bloco, item, alvo "sobre" e corpo; insert 9 = 7 do F1 (B03 x2, B04 x3, B12, B07 SEC-004) + item 11 (B07 SEC-002, l.3093) + 1 linha em branco (B12). delete 0. 40 emendas de dono no formato novo.
- EMENDAS e ENTRADA NOVA: as 11 emendas da decisao seguem (10 do §D.2 + D13); P-WEB-CONCILIACAO-SEM-TELA inalterada (so deslocada).
- INDICE: gerador (inalterado x ec4f34a8) em copia fora do repo sobre o blob bb3f5925 -> 370/359, FECHADA 103, ABERTA 267; `cmp` BYTE-IDENTICO; sha256 1bd915987c1740268c80 nos dois; entrada CRLF tambem identica. Coluna dono das 8 do CONF-02 (P-020, P-O6R-B11, P-CHK-PATCH-SEM-LOCK, P-O6R-B09, P-MOBILE-OS-SEEDS, P-SAN-E2E, P-028, P-Ω3F2B-ACENTOS): "**a atribuir**" -> "sim". P-O6R-B03/B04/B07: "a atribuir" -> "sim"; P-O6R-B12 "sim" -> "sim". -> CONF-02 fechado.

## R2 — regressao dos itens 1 e 3 (em bb3f5925)
- plano: unico hunk 042e689e..bb3f5925 = +1 linha no §15. Ferramentas proprias sobre o blob: §B x §5.6 identico a 1a conferencia (CE-G1/G2/3/5/6/7 0 trechos; CE-1 4, CE-2 5, CE-4 1 — so os *(medir)*); marcas: 12 blocos, CE-n 0 divergencia, alarmes lexicos iguais (SAN3-09 "admin", SAN3-19 "papel tecnico" — ja lidos); agenda 0 violacoes, tabela = recalculo, realista 238/213/240/223 -> 297, Esf. G11 M21 P5, nenhuma trava fora da Dep.; item 16 = 40.
- painel: `kpis-latest.json` com "56 bloqueantes em 37 blocos" 3x (Kpis intocado na passada). Corpo do PR (head bb3f5925): L9 "56 bloqueantes, 37 blocos (11 G · 21 M · 5 P)", L11 "56 bloqueantes em 37 blocos", L17 "56 bloqueantes em 37 blocos". Trilha: "**Números:** 56 bloqueantes em 37 blocos" inalterado.
- bateria: 3 guards `# tests 28 # pass 28 # fail 0 # skipped 0`; `kpi-freeze --check` "em dia (snapshot 2026-09-11)" ec=0; `node --check Kpis/app.js` ec=0; `sync-agent-agents --check` "OK — 25 agentes, espelho consistente" ec=0. -> CONFERE.

## R3 — coluna "dono" do indice, reparseada POR TABELA (cabecalho com a coluna dono) — e correcao de uma medicao MINHA
- Estrutura do indice: a tabela "Diferidas com severidade MATERIAL" (l.44) tem `| ID | linha | severidade | titulo |`, SEM dono; as de balde A/B/C, FECHADAS, SEM-STATUS e CONTRADITORIAS tem `| ... | dono | titulo |`. Na 1a conferencia meu parser pegava a PRIMEIRA linha de cada ID: para 9 entradas do gate essa linha estava na tabela sem dono, e o parser leu o titulo como se fosse o dono.
- Reparse por tabela: sujeitos do gate com "**a atribuir**" -> ec4f34a8 20 · 042e689e 20 · **bb3f5925 0**. Coluna dono mudou 042e689e -> bb3f5925 em 20 entradas, TODAS sujeitos do gate (P-008, P-019, P-020, P-026, P-027, P-028, P-CHK-PATCH-SEM-LOCK, P-CHK-SEED-DEMO-SUJO, P-MOBILE-OS-SEEDS, P-O6R-B03, P-O6R-B04, P-O6R-B07, P-O6R-B09, P-O6R-B11, P-PURCHASE-ORDERS-BACKEND-GATE, P-RBAC-GATING-MOCKSHELLS, P-SAN-E2E, P-SAN-PROD-BOOTSTRAP, P-Ω3F2B-ACENTOS, P-Ω3F4C-ACTIVATION-PROMPT); 0 mudanca fora do gate. P-033 e P-Ω3F6-CANCEL-RACE sao bullets hospedados (sem linha propria no indice; a hospedeira responde).
- CORRECAO: o CONF-02 da 1a conferencia disse "8 -> 8". As 8 que listei estavam certas, mas eram 20 as entradas do gate "a atribuir" em 042e689e. O erro foi do meu parser, nao da aplicacao, e nao muda o desfecho: o conserto (as 32 emendas no formato `**dono:**`) fechou as 20. -> CONF-02 fechado, com a contagem corrigida.

## R4 — o "80" do PR, limpeza, veredito
- os meus 81 ponteiros vivos na forma estrita: 79 no formato "§4.1 item N" + 2 "plano SAN3 v5, item 54" (linhas de status da P-KPI-RECENT-CONGELADO l.5571 e da P-KPI-ROADMAP-CONGELADO l.8930, ambas do item 54, certas). O "80" do PR e contagem da ferramenta do aplicador, com outro padrao; a propriedade (0 divergente) confere nas minhas duas buscas. Nao e achado.
- `git worktree remove --force .../conf-san3b-r` (pelo nome) -> ec=0; diretorio ausente; `git worktree list` sem ele (o node_modules proprio saiu junto). san3 e arvore principal: so leitura.

## VEREDITO DA RECONFERENCIA (bb3f5925): CONFERE
- Item 2 inteiro (ferramentas proprias): CONFERE — CONF-01 fechado pela fonte (56/56, forma estrita), CONF-02 fechado (sujeitos do gate "a atribuir" 20 -> 0). Regressao dos itens 1 e 3: CONFERE. Isolamento/escopo da passada: CONFERE.
- R-01 (nota, pre-existente): minha contagem do CONF-02 ("8") estava abaixo do real (20), por erro do meu parser; corrigida acima, sem efeito no desfecho.
