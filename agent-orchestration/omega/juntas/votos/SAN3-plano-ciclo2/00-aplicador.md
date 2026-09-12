# APLICADOR — ciclo 2 do PR #386 (SAN3 v4 → v5) — relatório incremental (P2)

Worktree: `.claude/worktrees/san3` · branch `docs/san3-plano-saneamento` · HEAD `aa970499` (sem commit meu).
Papel: aplicador (§C7.4-bis) — não achou, não planejou. Plano aplicado: `agent-orchestration/omega/planos/SAN3-plano-ciclo2-correcao.md`.

## 0. Terreno medido antes de tocar (2026-09-12T19:54Z)

- `git status`: só `?? .claude/agents/especialistas/` (alheio — não tocar).
- EOL: `pendencias.md` CRLF (9209/0) · `decisoes.md` CRLF · `Kpis/kpis-latest.json` CRLF · `PLANO_SAN3.md` LF ·
  `status-geral.md` CRLF com 3 linhas LF (4401, 4402, 4405) · `log-execucao.md` CRLF com 1 LF (4313).
- Roundtrip JSON do `kpis-latest.json` (Python `ensure_ascii=False`, indent 2, `\n`→`\r\n`): **byte-idêntico** (94167 B). Node idem.
- Gerador no HEAD (antes de qualquer mudança): `indice: 366 cabecalhos / 355 IDs | {'FECHADA': 105, 'ABERTA': 261}` — índice commitado byte-idêntico (git diff vazio).
- IDs dos itens 50–53 já existem no `pendencias.md` (commit `aa970499`): P-WEB-FATURAR-OS-SEM-TELA (9184), P-SAN3-CHECKLIST-RUN-SEM-ESCOPO-POR-OBJETO (9193), P-FIELD-LOCATION-SEM-CONSENTIMENTO-NO-BACKEND (9202), P-MOBILE-CHECKIN-CONFERE-CODIGO-DA-OS (8827).
- Mãe `P-O6R-B06`: 1ª linha de status FECHADA (l.2978) — confere a nota do §G.4.
- Semântica de agenda da C1 (`C1-apoio/c1-sim.mjs`): ordem estrita por frente, trava codificada como Dep., início = max(frente livre, fim das deps).
- 1º commit da branch: `846ac2dc` 2026-09-11T14:54:26Z.

## 1. Seções aplicadas

- **§G.1 `decisoes.md`** (script `scratchpad/g1_decisoes.py`, CRLF preservado, 11+/7−): item 1 do REGISTRO →
  `P-Ω4-3-REFATURAR-DELTA` × `D-Ω4-C2`; frase "o carimbo (`D-Ω4-C1`) não impede ... quem impede é o índice da `D-Ω4-C2`";
  nota "Corrigido em 2026-09-12 pela junta do PR #386 (C3-01) ...". "Quem resolve": a do `B-SAN3-02` revê a `D-Ω4-C2`
  (a do `B-SAN3-20`, a `D-Ω4-7-NO-TITLE`).
- **§G.2 + §G.5 `pendencias.md`** (script `scratchpad/g2g5_pendencias.py`, CRLF, 3+/2−): 1ª linha de status de
  `P-KPI-RECENT-CONGELADO` e de `P-KPI-ROADMAP-CONGELADO` → `ABERTA (PARCIAL — fechado: ...; aberto: ... dono B-SAN3-10,
  plano SAN3 v5, item 54)`, com a linha FECHADA de hoje preservada no fim ("Valor anterior, preservado: ..."). O "…" do
  molde foi preenchido com os fatos (o que o PR corrigiu no painel). Emenda de 1 linha em
  `P-WEB-FIN-BAIXA-E-CONTA-SEM-TELA`, logo depois da prova (C3-04).
- **§G.4 + notas `Kpis/kpis-latest.json`** (script `scratchpad/g4_kpi.py`; roundtrip conferido): `roadmap.as_of`
  2026-09-11; `B-O6R-06` + `pr: 385` e nota prefixada "Mergeado em 2026-09-11 (PR #385, 15ef3fbe)."; `B-O6R-02` +
  `pr: 371`; `trilha_bloqueada.bloqueada_por` = [`B-O6R-07`] + chave `nota`; `mvp_vendavel.note` e a linha de
  `limitations`: "49 bloqueantes" → "49 ... (54 no plano v5, com os 5 da junta do PR #386, ciclo 1)". `mvp_demo.note`
  não tem número de bloqueante — intocada. `node scripts/kpi-freeze.mjs` → reinjetado; `--check` em dia; `node --check` OK.

## 2. Agenda (§6) por script

Comando: `node <scratchpad>/agenda-ciclo2.mjs C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/san3`
(saída JSON em `<scratchpad>/agenda-ciclo2.out.json`). Semântica da C1 (ordem estrita por frente; Dep. ∪ travas
ordenadas; início = max(frente livre, fins dos antecessores)); ordem de entrada = a PROPOSTA do §D, reparada por
ordenação topológica estável quando contraria Dep./trava da mesma frente.

- blocos=37 · G=11 · M=21 · P=5 · arestas de trava fora da coluna Dep.: nenhuma · violações 0 (melhor e realista).
- **Reparo de ordem (a proposta era inviável):** F4 proposta `…SAN3-15, SAN3-17, SAN3-16, SAN3-26…` põe o `SAN3-17`
  antes do `SAN3-16`, mas a Dep. do §5.4 diz `SAN3-17` ← `SAN3-16` → script `…SAN3-15, SAN3-16, SAN3-17, SAN3-26…`.
- **Melhor (G13 M5 P1,5):** F1 fim 57 · F2 60,5 · F3 60,5 · F4 67,5 · `SAN3-10` 67,5–80,5.
  Divergências × proposta (todas em F4, consequência do reparo): SAN3-16 31–36 (prop. 33–38) · SAN3-17 36–41 (28–33) ·
  SAN3-26 41–46 (38–43) · 04b 46–51 (43–48) · 03b 51–56 (48–53) · SAN3-19 56–57,5 (53–54,5) · SAN3-23 57,5–62,5
  (54,5–59,5) · B-O6R-09 62,5–67,5 (60,5–65,5). F1, F2 e F3 idênticas à proposta.
- **Realista (G57 M10 P2), mesma agenda:** F1 238 · F2 213 · F3 240 · F4 223 · `SAN3-10` 240–297.
- **2 frentes (realista):** soma sem o fecho 790 h /2 = 395 + 57 = 452 h.
- Conferência de arquivo comum × janela (fronteiras v5 expandidas em `git ls-tree HEAD`; `SAN3-26` backend modelado
  CONSERVADOR como `src/modules/work-orders/**` + `src/modules/mobile/**`): 0 pares sobrepostos no melhor e no realista.
  Padrões sem arquivo na árvore: só `frontend/src/modules/finance/cheques/**` e `…/period-closes/**` (marcados "novo").

## 3. PLANO_SAN3.md (lotes `plano_b1.py` 8 subst., `plano_b2.py` 23, `plano_b3.py` 16 + §14; 2 Edits pontuais)

- §0 (1–4), §1 (C3-05), §4.1 (cabeçalho 54; itens 12–18, 21, 28, 32; novos 50–54; parágrafo do critério 8), §4.4 (C3-07),
  §5 (04a/04b, 05, 07c, 18, 22, B-O6R-12, 12, 06a, 07, 08, 25 novo, 13, 17, 26 novo, B-O6R-09, 10), §6 (agenda do script +
  travas), §8.7, §9, §10.5, §10.7 novo, §13 CR2-01, §14 novo.
- Erros meus pegos pela conferência e corrigidos: item 38 ficou com `B-SAN3-04` (grep) → `B-SAN3-04a`; §14 C3-02 com o
  nome de arquivo solto `status-geral.md` (laço de caminhos) → caminho completo; o Dep. do 07c com nome solto
  (antes de rodar o lote 2) → caminho completo.

## 4. Conferência por script (`check_plano.py <agenda-ciclo2.out.json>`)

§4.1 = 54 (1..54 completos) · ✓ = 25 = lista do §8.7 · §5 = 37 blocos, G11 M21 P5 = script · item↔bloco↔Fecha 0 erro ·
Dep. do §5 × DEP do script 0 diferença · laço de caminhos: o que a v5 escreveu e não existe na árvore = 3 branches
(`feat/web-faturar-os`, `fix/mobile-checkin-confere-placa`, `fix/painel-com-recorte-por-papel`) e rotas HTTP
(`/financial-titles/:id/pay`, `/payable`, `/payable-source`, `/payee`, `/payload`, `/payments`, `/patios/*`, `/telemetria/*`).

## 5. Fecho (executado)

`git diff --check` ec=0 · `kpi-freeze` em dia / `--check` ec=0 · `node --check Kpis/app.js` ec=0 · 3 guards de KPI
28/28 pass, 0 fail · `sync-agent-agents --check` OK 25 agentes · gerador `366 cabecalhos / 355 IDs | FECHADA 103,
ABERTA 263` · `grep D-Ω4-C1`: plano só l.543 (CR2-01, com a nota); REGISTRO l.2324 (carimbo) e l.2327 (nota).
Diff do aplicador: 8 arquivos, 235+/156−. Atividade ALHEIA surgida durante a aplicação (não tocada): 23 `.agents/agents/*.md`
modificados, `?? agent-orchestration/omega/juntas/BRIEFING-SAN3-plano-ciclo2.md`, `?? .../votos/SAN3-plano-ciclo2/`.

## 6. O que não coube / divergências (fatos, sem mérito)

1. §E do plano de correção diz "53 bloqueantes"; §A e §G.3 e a contagem da tabela dão 54 → usei 54.
2. Agenda proposta inviável na F4 (SAN3-17 antes do SAN3-16 contra a Dep.) → vale o script (fecho 80,5 h).
3. Item 54 sem ✓: a fatia dava `P-KPI-ROADMAP-CONGELADO` "impacto vendável NAO", mas o plano lista ✓ só em 51–53.
4. Teste (g) do `B-SAN3-10` exige guard em `tests/`, fora da fronteira escrita do bloco — nenhum caminho acrescentado.
5. `B-SAN3-13` passa a tocar escopo de permissão no backend, mas segue na lista de quórum "maioria" do §5; coluna de
   teste dele sem cláusula do backend — nada disso estava no plano.
6. `recent` item do #386 no `kpis-latest.json` ainda diz "49 bloqueantes em 34 blocos" — fora do escopo de KPI permitido.
7. Números defasados fora das seções instruídas: §2 "(itens 45–49)"; §8.1 "38 dos 49"; status-geral l.4402 (D-Ω4-C1
   na descrição histórica do crítico r2); `P-WEB-FIN-BAIXA-E-CONTA-SEM-TELA` dono "(§4.1 item 26)" (o item é 28).
8. Arquivo de backend do `SAN3-26` sem nome → nenhuma trava declarada; modelagem conservadora: 0 sobreposição.

## 7. Follow-up do planejador (decisões sobre os 8 pontos) — aplicado por `scratchpad/followup_ciclo2.py`

1. 54 fica (nada a mudar). 2. Item 54 com ✓ + na lista do §8.7 (e "itens 51–54 ... C3-03"). 3. `B-SAN3-10` +
`tests/kpi-painel-frescor.test.ts` (novo — único arquivo de `tests/` do teste (g)). 4. `B-SAN3-13`: fora da lista de
maioria; Junta "unanimidade + `coordenador-de-acessos`"; cláusula do backend no teste; KPI já tinha backend.
5. `kpis-latest.json`: `recent` #386, nota do `mvp_vendavel` e `limitations` → "54 bloqueantes em 37 blocos"; kpi-freeze.
6. (a) §2 → "(itens 17, 45–49 e 53)" (script: crit. 13 = 17, 45–49, 53); (b) §8.1 → "44 dos 54" (script: 10 itens com
achado Ω6R — 1, 2, 3, 7, 11, 19, 24, 27, 30, 31); (c) status-geral l.4402 → `D-Ω4-C2` (a v4 dizia `D-Ω4-C1` — …); (d)
pendencias.md: dono "item 26" → "item 28". 7. §14 + linha "Consequências mecânicas aplicadas pelo aplicador (aceitas
pelo planejador)". 8. Alheios intocados.

Fecho re-executado: diff --check ec=0 · kpi-freeze reinjetado / --check ec=0 · node --check ec=0 · guards 28/28 ·
sync OK 25 · gerador 366 / 355 IDs / FECHADA 103 / ABERTA 263 (= §0, §14, status, log) · check_plano: 54 itens, ✓ 26 =
§8.7, §2 bate, §8.1 bate, 37 blocos G11 M21 P5, 0 erro, 0 diferença de Dep. · laço: v5 só acrescentou branches, rotas
e `tests/kpi-painel-frescor.test.ts` (marcado novo).
