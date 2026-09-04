# Parecer do porteiro-pos-merge — PR #365 (SAN2-4a, squash 45c3b97)

Instância nova, nascida pós-merge. Método: cada item abaixo começa `EM APURAÇÃO` e é
preenchido ao medir. Nada é acumulado fora do disco. Todos os 31 itens foram medidos por
execução própria nesta passada (2026-08-31); nenhum foi herdado do antecessor (R2).

## 1. Integridade do merge
- [1.1] Merge 45c3b97 na origin/main, PR #365 MERGED, mergeCommit bate: **CONFIRMADO** —
  `gh pr view 365`: state MERGED, mergeCommit 45c3b97dcb415493c8cb8461649f5b9a3c6391d6,
  mergedAt 2026-08-31T17:01:51Z, head chore/san2-4a-medir-arnes; `git log origin/main -3`
  mostra 45c3b97 como HEAD, sobre c9fd3a1 (#364) e d283903 (#363).

## 2. Alegação central: SAN2-4a só MEDE (diff de código vazio)
- [2.1] `git -c core.autocrlf=false diff --exit-code 45c3b97^..45c3b97 -- src/ tests/ scripts/ prisma/ .github/ frontend/ mobile/ CLAUDE.md AGENTS.md` = **exit 0, diff VAZIO**.
  Não há conserto escondido; a junta julgou o que disse julgar. Medido eol-neutro.
- [2.2] O diff DE FATO tocou **20 arquivos**: 3 M em `Kpis/` (app.js, kpis-history.json,
  kpis-latest.json) + 17 A em `agent-orchestration/` (briefing, ata J-SAN2-4a.md, plano,
  12 arquivos de votos/medições/logs de votos/SAN2-4a/, e o parecer do porteiro do #364 em
  votos/SAN2-3/). **Divergência de registro no corpo do PR:** o corpo diz "8 arquivos, todos
  de registro e KPI" — a natureza confere (todos registro+KPI, zero código), a contagem não
  (20, não 8; o corpo ficou aquém do pós-voto que somou ata, votos e erratas). BAIXA, não muda
  o que a junta julgou. Segunda divergência do corpo: "11 observações nomeadas" — a contagem
  corrigida NO MERGE é **12 (11 com dono)**, errata E-B1 do briefing (secao 8) + registro na
  ata; o corpo carrega o número antigo. O 4b consome o 12, que está no merge.

## 3. Números sobrevivem à re-execução
- [3.1] `node --test --import tsx tests/agents-mirror-guard.test.ts` = **12/12 pass, 0 fail** (1554 ms).
- [3.2] `node --test --import tsx tests/kpi-dashboard-charts.test.ts` = **16/16 pass, 0 fail** (5167 ms) —
  bate com o N publicado na entrada de KPI ("16 tests / 16 pass").
- [3.3] `node scripts/sync-agent-agents.mjs --check` = **exit 0** — "OK — 23 agentes, espelho consistente".
- [3.4] `node scripts/kpi-freeze.mjs --check` = **exit 0** — "em dia (snapshot 2026-08-31)".
- [3.5] `node --check Kpis/app.js` = **exit 0**.
- [3.6] **NÃO reexecutado (declarado, não presumido):** as três medições do arnês — 40 execuções
  F1/F2 do authority-portal, 120.000 iterações da sonda F3, 25 rodadas da bateria barata e 17
  rodadas do censo de roles (caras; F2 exige starvation controlada e M2/M3 exigem cluster
  descartável próprio). As suítes backend/smoke/flutter completas também não — o diff de código
  é vazio (item 2.1), logo as trilhas são CARREGADAS (regra C3.3) e reexecutá-las não validaria
  nada deste PR. A recontagem das 68 roles órfãs na base viva é **proibida** (erp-postgres
  intocável) e o próprio bloco a declarou CARREGADA, com receita e dono — não é do 4a nem deste
  porteiro.

## 4. KPI (C3 / C3.5)
- [4.1] **CONFIRMADO** — history com **148 entradas**; a 148a é `version: "SAN2-4a"`
  (snapshot 2026-08-31); kpis-latest.json na versão SAN2-4a.
- [4.2] **CONFIRMADO** — `blocks_completed` **154** na entrada, com a condição escrita literal:
  "ESTE bloco nao move o numero na autoria — sobe para 155 so quando o SAN2-4a mergear".
  Mergeou: o 155 é dívida do próximo PR (ver 4.5).
- [4.3] **CONFIRMADO** — backend_tests 2607/2609, frontend_smoke_tests 1126/1126,
  flutter_tests 864/864 e contratos 34/34 declarados "CARREGADOS com marcador §C3.3" no texto
  da entrada, com a prova apontada (diff vazio). mvp_demo 99 e mvp_vendavel 88 INTOCADOS no latest.
- [4.4] **CONFIRMADO** — entrada SAN2-3 do history: pr 364, merge_commit c9fd3a1,
  approved_head 23d9227 (head julgado da ata J-SAN2-3, não o headRefOid 4083146), com o texto
  do backfill apenso; `release.backfill_note` do latest reescrito descrevendo o backfill do #364.
- [4.5] **DÍVIDA DUPLA do próximo PR (SAN2-4b), nomeada:** (a) backfill C3.5 do #365 —
  pr 365, merge_commit 45c3b97, approved_head **4199b92** (**head julgado consignado na ata
  J-SAN2-4a.md l.4 — lido, não presumido**; NÃO o headRefOid aa22b7f do GitHub: o delta
  4199b92..aa22b7f é o pós-voto dos 5 achados, 15 arquivos, e eu medi que **não toca código** —
  `diff --exit-code` nos mesmos caminhos do item 2.1 = exit 0); (b) blocks_completed 154 para
  **155** (condição escrita da entrada, cumprida pelo merge). Na entrada SAN2-4a os três campos
  estão null, correto na autoria (C3.5).

## 5. Ata da junta (C7.1)
- [5.1] **CONFIRMADO** — `agent-orchestration/omega/juntas/J-SAN2-4a.md` existe NO MERGE
  (arquivo A no diff), veredito **APROVADO 3x0** (quórum maioria de 3, secao 8 do plano —
  coerente com C7.1-ter(b): bloco sem toque em dinheiro/segurança/permissão/dado), head julgado
  4199b92 consignado na l.4, terreno LIBERADO COM RESSALVA (R1-R4 listadas), papéis por cadeira
  nomeados, e os 5 achados tabelados com gravidade e escopo. Merge autorizado "após o pós-voto
  tratar os cinco achados" — e tratou (secao 6 abaixo, tudo conferido no conteúdo mergeado).

## 6. Achados da junta — confirmar ou derrubar no merge
- [6.1] C3-A1: **CONFIRMADO NO MERGE** — a entrada de KPI do SAN2-4a existe (item 4.1) e o
  próprio texto dela narra a gênese: grep dava 0 nos dois JSON, achado pela C3, criado por outro
  agente (C7.4-bis) com as medições já fechadas.
- [6.2] C3-A3: **CONFIRMADO** — `release.backfill_note` do kpis-latest.json agora descreve o
  backfill do **#364** (pr 364 / c9fd3a1 / 23d9227, com a distinção head-da-ata x headRefOid
  derivada), não mais o byte a byte do #363.
- [6.3] C2-A1: **CONFIRMADO** — votos/SAN2-4a/medicao-2-bateria-barata.md l.413-442: "errata da
  errata" datada (2026-08-31, achado C2-A1) declarando o par (arquivos, testes) necessário e
  **insuficiente** (três listas de 6 dão (6,37)), apontando o **secao V.3** (lista NOMEADA,
  l.452) como o critério que o D29 herda, e **emendando a O-2** (l.495) no mesmo sentido.
- [6.4] C2-A2: **CONFIRMADO** — medicao-3-censo-roles.md l.188-208: errata datada (achado C2-A2)
  corrigindo 4 para **5 gatilhos** de sweep (**5 arquivos, 8 chamadas**; faltava
  tests/db-catalog-write-guard.test.ts, 3 chamadas), com a nota de que a exclusão dupla e a
  consequência qualitativa não se movem.
- [6.5] C1-A1: **CONFIRMADO** — medicao-1-authority-portal.md secao 8 (l.357-396): errata E-1
  retira o "+78%" (não derivava de pareamento nenhum) e publica **+48,0% a +73,5%** com
  pareamento declarado (homólogos min-min / max-max); as duas ocorrências no corpo (l.129,
  l.229) já dizem a faixa nova e citam a E-1.
- [6.6] **A correção do E-2 está NO MERGE** — a linha que o ciclo 5 vai consumir existe, literal
  (medicao-2 l.440): "Para o ciclo 5, sem ambiguidade: o critério do D29 é o §V.3 — a lista
  NOMEADA —, NÃO esta E-2." Arquivo adicionado pelo squash 45c3b97, árvore limpa = conteúdo
  mergeado. O ciclo 5 usa o V.3, não o E-2.

## 7. Pendências (régua: campo `**Bloqueia:**` estruturado, valor não-negado, status aberto)
- [7.1] **NENHUMA pendência bloqueia SAN2-4b nem o ciclo 5.** Medição pela régua, não por prosa:
  pendencias.md tem **14** campos `**Bloqueia:**`. Nenhum nomeia SAN2-4b, ciclo 5 ou arnês
  (grep direto = exit 1). Por linha: 2 negados ("nada" — l.2656, l.3280); 2 FECHADAS (l.2416;
  l.2713 — a única que alcançaria correção de sweep, fechada no #353 a8901ff); 1 sem status a
  14 linhas (l.2398, trava "feature nova em RBAC/auth" — não alcança os alvos); as 9 ABERTAS
  restantes travam todas "feature em <domínio>" (despesas/RDV, estoque, cloud billing,
  OS/aprovações, auth SEC-003/004, jobs/SSE, despacho/mapa, portal do proprietário, app de
  campo) — SAN2-4b corrige arnês de teste e o ciclo 5 é replanejo de junta; nenhum dos dois é
  feature nesses domínios.
- [7.2] Amostragem de pendência fechada: **N/A com evidência** — o diff do merge não contém
  agent-orchestration/controle/pendencias.md (name-status, 20 arquivos, zero em controle/);
  o bloco não fechou pendência nenhuma, coerente com a natureza só-medir. O fechamento da
  P-REG-BATERIA-BARATA-DUAS-LISTAS foi explicitamente diferido ao 4b (O-4, medicao-2 l.497).

## 8. Limpeza C5 (conferida, não executada por mim)
- [8.1] `docker ps -a | grep san2-4a` = **vazio (exit 1)**. Zero containers do bloco.
- [8.2] erp-postgres **Up 2 days (healthy)** e erp-redis **Up 2 days (healthy)** — o uptime
  atravessa o bloco inteiro; ninguém os tocou.
- [8.3] `git branch -a | grep san2-4a` = **vazio (exit 1)** — branch chore/san2-4a-medir-arnes
  podada no remoto e sem local.
- [8.4] `git worktree list` = **exatamente 4** (principal demo/investidor, agent-af6ea (o6r-b02),
  gov-descuido, san2-r na main em 45c3b97).
- [8.5] `git status --porcelain | grep '^ D'` = **vazio (exit 1)**. Nenhum rastreado apagado;
  único untracked é este parecer.
- [8.6] `df -h C:` = **18 GB livres** (220/238 usados). Acima do piso de ~10 GB; DEEP_CLEAN não
  requerido agora, mas é o próximo gatilho natural se cair.

## 9. O próximo bloco pode começar?

**SIM.** O merge é íntegro; a alegação central (só medir) é verdadeira e provada eol-neutro; os
cinco achados da junta estão todos corrigidos NO conteúdo mergeado, inclusive a linha do V.3 que
o ciclo 5 consome; o KPI está no estado que a C3 exige na autoria; nenhuma pendência estruturada
alcança os alvos; a limpeza C5 confere ponto a ponto. O que viaja é a dívida dupla do item 4.5 —
e ela é exatamente da classe que o próximo PR paga por desenho.

**LIBERADO COM RESSALVA: SAN2-4b (corrigir o arnês com as 12 observações do 4a — 12, não 11; a
derivação está na E-B1 do briefing) | dentro do próprio PR do 4b, pagar a dívida dupla C3.5 do
#365: pr 365 + merge_commit 45c3b97 + approved_head 4199b92 (head julgado da ata J-SAN2-4a l.4,
não o headRefOid aa22b7f) e blocks_completed 154 para 155.**
