# APLICADOR — opção B do PR #386 (plano SAN3) — relatório incremental

Worktree: `C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/san3` · branch `docs/san3-plano-saneamento` ·
HEAD `ec4f34a8` (sem commit meu). Papel: aplicador (§C7.4-bis) — não achou, não planejou. Plano aplicado:
`agent-orchestration/omega/planos/SAN3-plano-opcao-B-aplicacao.md`; decisão `D-SAN3-PLANO-OPCAO-B`
(`agent-orchestration/controle/decisoes.md` l.2339+, edição não commitada do orquestrador — não tocada).
Scripts meus: `<scratchpad>/opB/`.

## 0. Terreno medido antes de tocar (2026-09-13)

- `git status --short`: ` M agent-orchestration/controle/decisoes.md` (edição do orquestrador — não tocada) e
  `?? agent-orchestration/omega/planos/SAN3-plano-opcao-B-aplicacao.md`; mais 23 ` M .agents/agents/*.md` que são
  fantasmas de stat-cache sob `core.autocrlf=true` — `git diff --stat` mostra só `decisoes.md | 29 +++-` (28+/1−).
- Código: `git diff --stat 15ef3fbe HEAD -- src tests prisma frontend mobile .github scripts` → vazio.
- EOL (script `opB/eol.py`, bytes do disco): `PLANO_SAN3.md` LF (591 LF, 0 CRLF) · `pendencias.md` CRLF (9242/0; o blob
  no git é LF — `cmp` do `git show HEAD:` × disco difere no char 13 da l.1, efeito do autocrlf) ·
  `pendencias-indice.md` LF (458) · `Kpis/kpis-latest.json` CRLF (839/0) · `Kpis/app.js` CRLF (1676/0) ·
  `status-geral.md` CRLF (4428/0) · `log-execucao.md` CRLF (4329/0). Python 3.13.14 · Node v20.19.5.
- **Gerador no HEAD, cópia fora do repo** (`opB/genbase/`, arquivos por `git -c core.autocrlf=false show HEAD:`):
  `indice: 369 cabecalhos / 358 IDs | {'FECHADA': 103, 'ABERTA': 266} | baldes {'-': 103, 'C': 71, 'B': 90, 'A': 105} | diferidas-materiais 14`;
  `cmp` com o índice do worktree → **byte-idêntico**.
- `conferir_ponteiros.py` (baseline): `itens do §4.1 com ID: 54 | IDs mapeados: 64 | ponteiros no registro: 25 | divergentes: 15`
  — os 14 da C3 (l.317, 503, 8342, 8446, 8463, 8515, 8549, 8566, 8600, 8617, 8668, 8703, 8720, 8723) + l.3220 `P-O6R-B09`.
- `agenda-ciclo2.mjs` (baseline, cópia em `opB/apoio-base/`): `blocos=37 G=11 M=21 P=5`; arestas de trava fora da Dep.:
  nenhuma; violações 0 (melhor e realista); pares de frentes com arquivo comum e janela sobreposta 0/0.
- `check_plano.py` (baseline; exige `PYTHONIOENCODING=utf-8` no console cp1252): §4.1 = 54 (1..54), ✓ 26 = §8.7,
  §2 bate, §8.1 "44 dos 54" bate, §5 37 blocos G11 M21 P5, item↔bloco↔Fecha 0 erro, Dep.×script 0 diferença.

## 1. Fatos marcados *(medir)* — comando e saída

| # | Fato do plano | Comando | Saída | Confere? |
|---|---|---|---|---|
| M1 | CE-1: item 16 = **40** = 27 (`MVP_NAV_PATHS` − registro) + 13 (organização sem `requiredModules`: 11 de `/patios` e `/telemetria`, `/controle/notificacoes`, `/operations/quotes`) | `node opB/c2/count.mjs opB/c2/S` (script da C2, entradas por `git show HEAD:` de `navigation.registry.ts` e `appSidebarNav.ts`) | `registro 36 · MVP_NAV_PATHS 51 · MVP − registro = 27 · registro SEM requiredModules = 17` (4 `platformOnly` + `/controle/notificacoes`, `/operations/quotes`, 5 `/telemetria/*`, 6 `/patios/*`) `· SEM modulo, nao-platformOnly, no MVP = 13 · 27 + 11 disjuntos? true` | **sim** — 27 + 13 = 40 |
| M2 | CE-2: as 10 rotas (5 comentário, 2 geocode, 3 vistoria: anexo, avaria, divergência) existem e o técnico tem a permissão de cada uma | `node opB/c2/census-07c.mjs opB/c2/S` (script da C2; rotas dos 3 routers + `catalog.ts` + `checklist.permissions.ts` do HEAD) | `field_technician: 42 permissões · rotas 49 · mutantes 31 · alcançáveis 17`; fora do 07a e do piso: `POST …/geocode`, `POST …/geocode-destination` [`work_orders:update`]; `POST/PATCH/DELETE …/comments…`, `POST/DELETE …/tags/:tagId` [`work_orders:comment`] (5); `POST /mobile/checklist-runs/:runId/attachments`, `…/markers`, `…/divergence` [`checklist_runs:update`] → `10` | **sim** |
| M3 | CE-4: `PATCH /financial-entries/:financialEntryId/reconcile`, permissão `financial_entries:update`, que o `finance` tem | `sed -n 28,92p src/modules/financial-entries/financial-entry.routes.ts`; `awk` do bloco `finance:` de `catalog.ts` | l.84 `router.patch(`, l.85 `"/financial-entries/:financialEntryId/reconcile"`, l.86 `requirePermission(FINANCIAL_ENTRY_PERMISSIONS.update)` (= `"financial_entries:update"`, l.19); l.31-32 `GET "/financial-entries"` (`.read`); `catalog.ts:870` `"financial_entries:update"` no bloco `finance` (l.809-872) | **sim** |
| M4 | Item 55: rota em `financial-entry.routes.ts:85`; 0 chamada a `/reconcile` e a `GET /financial-entries` em `frontend/src` | `git grep -n -E "/reconcile\|financial-entries" -- frontend/src mobile/flutter_app/lib` | nenhuma linha, ec=1. (A busca solta `-i reconcile` acha 7 linhas de estado `reconciled`/`removal_reconciled` — tipo/token/rótulo, nenhuma chamada.) | **sim** |
| M5 | D.1: escopo datado pelo `git log` da rota | `git log --reverse -S'reconcile' -- src/modules/financial-entries/financial-entry.routes.ts` | `1e65b34b 2026-07-18T11:43:30-03:00 feat(financial-entries): Ω4-5 — Conciliação bancária (reconcile + divergence_type) + fecha reverse-de-conciliado (#216)` | datado |
| M6 | Prova do item 56: `catalog.ts:730-894` e `RBAC_MATRIX.md:37,44-46` | `grep -n "^  [a-z_]+: \["` em `catalog.ts`; `sed -n 29,57p RBAC_MATRIX.md` | `operator: [` l.730 · `finance: [` l.809 · `inventory: [` l.873 · `field_technician: [` l.895 → 730-894 = operator+finance+inventory; matriz l.37 Master data, l.44 Checklist executions, l.45 Work orders (`finance` = read), l.46 Workflow/approvals; l.38 Clientes e l.41 Serviços com `finance` = `none` | **sim** |
| M7 | CE-3/CE-5: hoje o `finance` não tem `work_orders:read`, `customers:read` nem `service_catalog:read` | `awk` do bloco `finance:` + `grep -E "work_orders\|customers\|service_catalog\|os\.read"` | só `"os.read"` (l.812) | **sim** |
| M8 | Identificadores citados no texto novo | `grep` | `DEMO_TENANT_MODULES` `prisma/seed.ts:197`; `changeStatus` `src/modules/work-orders/work-order.service.ts:1313`; sync `src/modules/mobile/mobile-work-order-sync.ts:265` `service.changeStatus`; `"/work-orders/:workOrderId/status"` `work-order.routes.ts:136`; `"db:provision-rbac"` `package.json:26` | existem |
| M9 | KPI: onde está o número de bloqueantes | `grep -n bloqueantes Kpis/kpis-latest.json` | l.59 `mvp_vendavel.note`, l.122 `limitations`, l.680 `recent` #386; **`mvp_demo.note` (l.51) não traz número de bloqueantes** | ver §C.8 |

Todos os fatos marcados *(medir)* conferiram: nenhum motivo de parada.

## 2. §B — condições de entrada (§5.6) e marcas nas células de teste

- Backup de todos os arquivos do §A em `opB/backup/` antes de qualquer escrita (caminho de volta sem `git checkout`).
- `opB/plano_opB.py` (23 passos; toda troca com ocorrência única, aborta sem escrever se não achar): inseriu
  `### 5.6 Condições de entrada — decisão do dono (opção B, 2026-09-13)` antes de `## 6.`, com o parágrafo de abertura e
  as nove condições com os IDs literais (CE-G1, CE-G2, CE-1 … CE-7). Os *(medir)* do plano viraram o fato medido no texto
  (CE-1: "27 … mais 13 …, medida por script"; CE-2: "as 10 existem, e o técnico tem a permissão de cada uma — medido por
  script"; CE-4: "que o `finance` tem — `catalog.ts:870`").
- **Marcas geradas por script** (`plano_opB.py` e, depois, `opB/marcas_check.py`, que recalcula a partir do PRÓPRIO
  plano — células de teste do §5 + texto das CE-n do §5.6 — e compara com o que está escrito). Regra: CE-n = bloco nomeado
  no rótulo da condição; CE-G1 = a célula de teste (com o texto das CE-n anexadas a ela) cita "guard"/"censo"; CE-G2 = cita
  um papel (os 9 canônicos do `RBAC_MATRIX.md` + rótulos de UI Financeiro/Estoque/técnico/Gestor/Auditor/Operador +
  "persona"; o genérico "papel" fica fora porque no `B-SAN3-05` é papel de banco). Resultado — **12 dos 37 blocos**:

  | Bloco | Marcas | CE-G1 por | CE-G2 por (termo) |
  |---|---|---|---|
  | `B-SAN3-04a` | CE-G1, CE-G2, CE-5, CE-6 | texto do CE-6 ("Guard de célula") | célula (Financeiro, auditor, inventory, manager, field_technician) |
  | `B-O6R-07c` | CE-G1, CE-G2, CE-2 | texto do CE-2 (censo, guard) | célula (técnico) |
  | `B-SAN3-04b` | CE-G2 | — | célula (Financeiro, Estoque) |
  | `B-SAN3-18` | CE-G1, CE-1 | célula ("guard fail-closed") | — |
  | `B-SAN3-12` | CE-G2, CE-4 | — | texto do CE-4 (`finance`) |
  | `B-SAN3-08` | CE-G2, CE-5 | — | célula (Financeiro) |
  | `B-SAN3-25` | CE-G2, CE-3 | — | texto do CE-3 (`finance`, `tenant_admin`) |
  | `B-SAN3-21` | CE-G1 | célula ("guard: lista de termos") | — |
  | `B-SAN3-13` | CE-G2 | — | célula ("como técnico") |
  | `B-SAN3-17` | CE-G2 | — | célula ("o técnico dá e revoga") |
  | `B-SAN3-26` | CE-7 | — | — |
  | `B-SAN3-10` | CE-G1, CE-G2 | célula ("(g) guard de frescor") | célula ("por persona") |

  Formato anexado ao fim da célula: `" + CE-G1, CE-G2, CE-5, CE-6 (§5.6)"`.
- **Falso positivo pego e corrigido pela regra, não pela instância:** a 1ª passada marcou `B-SAN3-19` com CE-G2 por
  "nenhum papel **técnico** cru" (adjetivo, não o papel de campo). O classificador ganhou `(?<!papel )` antes de "técnico";
  `marcas_check.py --apply` removeu a marca e a reexecução sem `--apply` dá `divergências marca escrita x calculada: 0`.
- Interpretação (reportada, ver §7): as marcas usam a célula **mais** o texto das CE-n anexadas — quatro blocos só entram
  por aí (`04a` e `07c` em CE-G1; `12` e `25` em CE-G2). Só pela célula literal, os conjuntos seriam CE-G1 = {18, 21, 10}
  e CE-G2 = {04a, 07c, 04b, 08, 13, 17, 10}.

## 3. §C — ajustes e itens novos (mesmo script; conferidos por `check_plano.py` ajustado)

1. **Item 16:** `**38**` → `**40**`, com a composição medida (27 + 13, e as 13 nomeadas: `/patios/*` ×6, `/telemetria/*`
   ×5, `/controle/notificacoes`, `/operations/quotes`); coluna Item ganha `P-NAV-MODULOS-NAO-RESOLVIDOS-LIBERA-MENU` (+ a
   frase "e a lista de módulos não resolvida libera todo item de módulo no menu"); prova ganha "(C2-02; ciclo 2: C2c2-02 e
   C2c2-05)". Linha do `B-SAN3-18`: "38 caminhos" → "40 caminhos" **e** "as 11 entradas do registro" → "as 13 entradas de
   organização do registro" (consequência: sem isso a própria linha soma 27 + 11 ≠ 40 — reportado, §7).
2. **Item 55** (depois do 50, grupo da prioridade 7): `P-WEB-CONCILIACAO-SEM-TELA` | 7, 4 | prova M3/M4 | `B-SAN3-12`
   (ampliado) | sem ✓ (ver §7, D9).
3. **Item 56** (depois do 52, grupo da prioridade 3): `P-RBAC-MATRIZ-X-CATALOGO-QUATRO-CELULAS` | 3 | prova M6 (caminho
   completo `src/modules/core-saas/permissions/catalog.ts:730-894`) | `B-SAN3-04a` | ✓ (entra pela regra do §2) — e o §8.7
   ganha "56" na lista e "o 56 pela do ciclo 2 (lacuna da C1), com a decisão do dono".
4. **§4.3:** linha nova antes de "demais ABERTAS": `P-SAN3-INDICE-ITEM-DO-GATE-SO-PELA-HOSPEDEIRA` | não viola, no código
   do produto, nenhum dos 13 critérios (índice de registro; o §1 não usa a severidade dele) | o gate é lido no §4.1;
   dono `B-REG-GERADOR`, fila pós-gate.
5. **§5:** `B-SAN3-12` Fecha 28 → "28, 55", causa-raiz "+ nem concilia", fronteira com o extrato e a conciliação (CE-4);
   `B-SAN3-04a` Fecha "13, 14, 15, 38" → "+ 56" e fronteira com `RBAC_MATRIX.md` (autorizado nominalmente só para as
   linhas 38 e 41 e as das quatro células do CE-6); `B-SAN3-25` Dep. + `SAN3-04a` (CE-3). Agenda confere: F2 `SAN3-04a`
   0–5 × F3 `SAN3-25` 41–46 (melhor); 0–10 × 171–181 (realista).
6. **§6, travas:** + `src/modules/work-orders/work-order.routes.ts` (`07c` → `SAN3-26`) e
   `src/modules/impound/impound-prisma.repository.ts` (`SAN3-11` → `B-O6R-12`). Agenda re-rodada (cópia ajustada em
   `opB/apoio-opB/`, os originais do repo intocados): **0 violações** (melhor e realista), 0 pares sobrepostos, frentes
   57 / 60,5 / 60,5 / 67,5 e fecho 67,5–80,5 (inalterados); realista 238 / 213 / 240 / 223, fecho 240–297 (inalterados).
7. **Teste (g) do `B-SAN3-10`:** "(`roadmap` e `recent` com o último merge do history)" → "— bloco com `merge_commit` no
   history não fica `a_fazer` no `roadmap`, e o `recent` contém o último merge —".
8. **Contagens** (lista gerada por `grep -n "\b54\b|bloqueantes"`: l.27, 37, 105, 394, 442 eram contagem; l.26, 163, 175,
   180, 295, 418, 584 são o **item** 54 e ficaram): 54 → 56 em §0 (itens 3 e 4), cabeçalho do §4.1, §9 "Quantidade
   exata"; §8.1 "44 dos 54" → "**46 dos 56**" (recontado por script: 10 itens com achado Ω6R; + "os itens 55 e 56 vêm da
   junta do ciclo 2"); §9 ganha a frase "Os itens 55 e 56 … entram em blocos que já existiam … sem mudar o tamanho de
   nenhum: o melhor caso e o realista abaixo ficam **inalterados**". KPI (`Kpis/kpis-latest.json`, troca em bytes, CRLF
   preservado, JSON válido): "54 bloqueantes em 37 blocos" → "56 …" em **exatamente 3** lugares (nota do `mvp_vendavel`,
   `limitations`, `recent` #386); `node scripts/kpi-freeze.mjs` → "cópia congelada reinjetada (snapshot 2026-09-11,
   85391 bytes)", diff do `app.js` = 1 linha (`var FROZEN`).
9. **§15** — ver §5 deste relatório (escrito depois do gerador, com os números medidos).

`check_plano.py` ajustado (`opB/apoio-opB/check_plano.py`: `range(1, 57)` e rótulos "novo" contra o HEAD; regra do §8.7
intacta) → §4.1 = 56 (1..56), ✓ 27 = lista do §8.7, §2 bate, §8.1 "46 dos 56" bate, §5 37 blocos G11 M21 P5, item↔bloco↔Fecha
0 erro, Dep. × script 0 diferença.

## 4. §D — registro (`pendencias.md`, CRLF preservado: 9242 → 9264 linhas, 100% CRLF)

Script `opB/pend_opB.py` (aborta se já aplicado; exige os itens 55/56 no §4.1 antes).

**D.3 — ponteiros, pela propriedade:** o script corrige todo ponteiro "plano SAN3 … §4.1 item N" cujo N não é item do
sujeito (a entrada, ou o "emenda sobre `X`") para o item que o §4.1 atribui ao ID; sujeito fora da coluna de IDs não é
tocado; sujeito com mais de um item aborta. **14 correções** (linha original → linha atual):

| linha (orig → atual) | ID | de → para |
|---|---|---|
| 317 → 317 | `P-028` | item 43 → 49 |
| 503 → 504 | `P-SAN-E2E` | 38 → 42 |
| 8342 → 8345 | `P-WEB-CLOUD-BILLING-CARTAZ` | 40 → 46 |
| 8446 → 8449 | `P-WEB-PLATAFORMA-TELAS-FICCAO` | 40 → 46 |
| 8463 → 8466 | `P-WEB-PLATAFORMA-SEGURANCA-FABRICADA` | 16 → 17 |
| 8515 → 8518 | `P-WEB-GATE-MODULO-INCOMPLETO` | 15 → 16 |
| 8549 → 8553 | `P-MOBILE-PRESTADOR-SEM-PORTA` | 30 → 35 |
| 8566 → 8570 | `P-MOBILE-CONCLUSAO-SEM-PORTA` | 31 → 36 |
| 8600 → 8604 | `P-MOBILE-LGPD-GPS-SEM-PORTA` | 17 → 18 |
| 8617 → 8621 | `P-MOBILE-GUINCHO-ENTREGA-INALCANCAVEL` | 29 → 34 |
| 8668 → 8672 | `P-MOBILE-ESTOQUE-TECNICO-FABRICADO` | 32 → 37 |
| 8703 → 8707 | `P-MOBILE-MINHAS-OS-SEM-FILTRO` | 11 → 32 |
| 8720 → 8724 | `P-MOBILE-FAXINA-TERMOS-TECNICOS` (dono) | 42 → 48 |
| 8723 → 8727 | `P-MOBILE-FAXINA-TERMOS-TECNICOS` (emenda) | 42 → 48 |

**Conferido à mão, não alterado:** l.3220 → 3221 `P-O6R-B09` "emenda (plano SAN3 §4.1 item 7 …)": o item 7 é o
`Ω6R-ARQ-004`, bloco `B-O6R-09`, e a emenda fala exatamente disso — **o ponteiro está certo**; o script o acusa só porque
o §4.1 grafa o item 7 sem `P-O6R-B09` (o item 3 grafa `Ω6R-QUA-005` "(em `P-O6R-B11`)"). Ver §7, D2.

**Outras grafias** (`opB/ponteiros_estendidos.py`: todo "item N"/"itens N" em linha que cita "plano SAN3" ou "§4.1", e em
linha `dono:` de entrada nascida neste PR; 44 ocorrências): 40 OK; 4 a conferir, todas referência deliberada a OUTRO item
— l.3221 `P-O6R-B09` → 7 (o caso acima); l.6663 a minha emenda da `P-O6R-SUBRECURSO-OBJECT-SCOPE` ("o `Ω6R-SEC-002` e o
item 51 fecham …"); l.7392 `P-O6R-B06-LEITURA-PLATAFORMA-SOB-FORCE-RLS` ("pré-requisito do item 9"); l.9217
`P-FIELD-LOCATION-SEM-CONSENTIMENTO-NO-BACKEND` dono "(plano SAN3 v5, item 18 ampliado ao backend)" — o item dela é o 52;
lido como "o `B-SAN3-17`, que fecha o 18, ampliado ao backend" (a mesma leitura da C3 no ciclo 2, evidência l.66); caso
de fronteira, não alterado — §7, D6. Nenhuma correção nova por outra grafia.

**Resultado:** `conferir_ponteiros.py` → `itens do §4.1 com ID: 56 | IDs mapeados: 67 | ponteiros no registro: 35 |
divergentes: 1` (`l.3221 P-O6R-B09 -> item 7; ID fora da coluna de IDs do §4.1`). 35 = 25 + 10 ponteiros novos das minhas
emendas e da entrada nova, todos OK.

**D.2 — 10 emendas** (formato `- **emenda (decisão do dono D-SAN3-PLANO-OPCAO-B, 2026-09-13):** …`, no fim de cada
entrada; uma linha em branco antes só onde a última linha era parágrafo, a `P-O6R-SUBRECURSO-OBJECT-SCOPE`):

| ID | cabeçalho | emenda | conteúdo |
|---|---|---|---|
| `P-WEB-FATURAR-OS-SEM-TELA` | l.9192 | l.9200 | P1/CE-3: `finance` + `work_orders:read` pelo `04a`; fatura como `finance` com permissões do banco; Dep. + `SAN3-04a` |
| `P-Ω3a` | l.401 | l.417 | P2/CE-5: `customers:read` + `service_catalog:read`; `RBAC_MATRIX.md` l.38/l.41; o "Decidir" da entrada respondido |
| `P-RBAC-MATRIZ-X-CATALOGO-QUATRO-CELULAS` | l.9235 | l.9243 | item 56 pela regra do §2; CE-6 fail-closed; o (4) resolvido pela P1 |
| `P-NAV-MODULOS-NAO-RESOLVIDOS-LIBERA-MENU` | l.9225 | l.9233 | entra pelo item 16; CE-1 |
| `P-WEB-GATE-MODULO-INCOMPLETO` | l.8506 | l.8521 | 40 (27 + 13 nomeadas, recontado no head); CE-1 |
| `P-O6R-SUBRECURSO-OBJECT-SCOPE` | l.6576 | l.6663 | CE-2: fecha por escopo provado; toda rota mutante alcançável; piso deixa de ser critério |
| `P-SAN3-CHECKLIST-RUN-SEM-ESCOPO-POR-OBJETO` | l.9202 | l.9210 | CE-2: + anexar, marcar avaria, registrar divergência (as 3 medidas) |
| `P-MOBILE-CHECKIN-CONFERE-CODIGO-DA-OS` | l.8833 | l.8848 | CE-7: ponto único `changeStatus` (l.1313) ← sync (l.265) e `PATCH …/status` (l.136) |
| `P-KPI-ROADMAP-CONGELADO` | l.8886 | l.8900 | C3c2-02: o teste (g) com as duas metades do critério |
| `P-SAN3-INDICE-ITEM-DO-GATE-SO-PELA-HOSPEDEIRA` | l.9245 | l.9253 | fora do gate, condição do §4.3 |

**D.1 — entrada nova** `P-WEB-CONCILIACAO-SEM-TELA (2026-09-13)` — ALTA, l.9257, no fim do arquivo, precedida de um
blockquote de contexto (como o grupo do ciclo 2): status, prova (M3/M4 + promessa nas notas `mvp_*` e
`API_CONTRACTS.md:435`), escopo `pre-existente` datado (`1e65b34b`, 2026-07-18, #216 — M5), dono `B-SAN3-12` (plano SAN3 v5,
§4.1 item 55; CE-4), bloqueia (critérios 7 e 4), teste de encerramento = o do CE-4.

**D.4 — índice:** `python agent-orchestration/controle/gerar-indice-pendencias.py` no worktree →
`indice: 370 cabecalhos / 359 IDs | {'FECHADA': 103, 'ABERTA': 267} | baldes {'-': 103, 'C': 71, 'B': 90, 'A': 106} | diferidas-materiais 14`.
Prova byte a byte: o mesmo gerador em duas cópias fora do repo (`opB/genafter-crlf/` com o `pendencias.md` do disco, e
`opB/genafter-lf/` com ele convertido a LF) → `cmp` **byte-idêntico** nas duas; sha256 `3fa200c32a6c73da…` nos três;
58726 bytes; índice LF (459 linhas). O diff do índice é 352+/351− porque o índice publica o número de linha de cada entrada
e as inserções deslocaram as linhas — o placar muda só em +1 cabeçalho/+1 ID/+1 ABERTA/+1 ativa (entrada nova, balde A).
Linha do índice: `| P-WEB-CONCILIACAO-SEM-TELA | 9257 | ALTA | sim | … |`.

## 5. §C.9 e §E — §15 do plano e trilha (`opB/final_texts.py`, depois do gerador, com os números medidos)

- **§15** no fim do plano (l.612-622, LF): a decisão, P1/P2, onde estão as condições (§5.6, marcadas por script), o que
  mudou de número (56 = 54 + itens 55 e 56; 37 blocos; 6 atos; melhor caso e realista inalterados; índice 370/359, 103
  FECHADAS, 267 ABERTAS), quem planejou, quem aplicou, e "conferência de aplicação: a preencher pela cadeira de registro".
- **`agent-orchestration/docs/status-geral.md`** (CRLF, +8 linhas): entrada `## 2026-09-13 — PR #386: decisão do dono
  (opção B) aplicada ao plano SAN3` (l.4430-4436) — decisão, o que foi aplicado, os números novos (56/37; índice
  370/359/103/267) e "Conferência de aplicação: a preencher pela cadeira de registro".
- **`agent-orchestration/codex/log-execucao.md`** (CRLF, +2 linhas): parágrafo "Opção B (2026-09-13): …" no fim da
  entrada SAN3 (a última do arquivo, l.4331), com os mesmos números e "Conferência de aplicação: a preencher pela cadeira".

## 6. Bateria do §F — saídas

```
[F1] git diff --check                                  → ec=0
[F2] git diff --name-only                              → Kpis/app.js · Kpis/kpis-latest.json ·
     agent-orchestration/codex/log-execucao.md · agent-orchestration/controle/decisoes.md (a edição do orquestrador,
     28/1 como no início — não tocada) · agent-orchestration/controle/pendencias-indice.md ·
     agent-orchestration/controle/pendencias.md · agent-orchestration/docs/status-geral.md ·
     docs/revisoes/SAN3/PLANO_SAN3.md                  → só §A (+ o decisoes.md do orquestrador)
     git status: + `?? agent-orchestration/omega/planos/SAN3-plano-opcao-B-aplicacao.md` (do orquestrador)
[F3] laço de caminhos (opB/laco.py: todo token-caminho entre crases em linha acrescentada, contra git ls-tree HEAD
     e o disco)                                        → 99 tokens; 0 NOVO não resolvido. 5 "não resolvidos" são
     tokens que JÁ estão no HEAD, em linhas que só mudaram por ganhar marca: `.ts`, `.tsx`, `.ts` (B-SAN3-21),
     `docs/ROTEIRO-DEMO-E-OPERACAO.md` e `tests/kpi-painel-frescor.test.ts` (B-SAN3-10, os dois marcados "novo").
     Fora do HEAD e só no disco: `agent-orchestration/omega/planos/SAN3-plano-opcao-B-aplicacao.md` (não rastreado — §7, D7).
     check_plano (F5) diz o mesmo: o que a aplicação escreveu e não está no HEAD = esse arquivo + rotas de menu
     (`/controle/notificacoes`, `/operations/quotes`, `/patios`, `/telemetria`) e `/reconcile`; 0 token só por nome.
[F4] agenda-ciclo2.mjs (cópia ajustada, travas novas)  → blocos=37 G=11 M=21 P=5; violações (Dep.+travas+frente) = 0
     no melhor e no realista; pares de frentes com arquivo comum e janela sobreposta 0 / 0; frentes 57 / 60,5 / 60,5 /
     67,5, fecho 67,5–80,5; realista 238 / 213 / 240 / 223, fecho 240–297. Linha informativa: "arestas de trava que NÃO
     estão na coluna Dep.: work-order.routes.ts: 07c -> SAN3-26 ; impound-prisma.repository.ts: SAN3-11 -> B-O6R-12" (§7, D3).
     Variante CE-1 (SAN3-18 + prisma/seed.ts na fronteira): 0 violações, 0 / 0 pares sobrepostos (§7, D4).
[F5] check_plano.py ajustado a 56                     → §4.1 itens = 56, 1..56 completos; cabeçalho "56 itens";
     ✓ = 27 [3, 6, 7, 9, 10, 14, 15, 20, 21, 22, 23, 25, 26, 29, 30, 31, 36, 38, 41, 46, 48, 49, 51, 52, 53, 54, 56];
     §2 critério 13 bate; §8.1 "46 dos 56" bate (10 itens com achado Ω6R); §5 37 blocos, G11 M21 P5, colunas [7, 9];
     §5 × script mesmos blocos/Esf.; item↔bloco↔Fecha 0 erro, 0 item sem bloco; ✓ == §8.7; Dep. × DEP 0 diferença.
[F6] conferir_ponteiros.py                             → itens do §4.1 com ID: 56 | IDs mapeados: 67 |
     ponteiros no registro: 35 | divergentes: 1 — "l.3221 P-O6R-B09 -> item 7; ID fora da coluna de IDs do §4.1"
     (conferido à mão: o ponteiro está CERTO — §7, D2)
[F7] gerador byte-idêntico                             → worktree: 370 cabecalhos / 359 IDs | FECHADA 103, ABERTA 267 |
     baldes {'-': 103, 'C': 71, 'B': 90, 'A': 106} | diferidas-materiais 14; re-run no worktree: índice inalterado;
     cópia CRLF e cópia LF fora do repo: cmp BYTE-IDÊNTICO; sha256 3fa200c32a6c73da91dd… nos três
[F8] node scripts/kpi-freeze.mjs --check               → "kpi-freeze: em dia (snapshot 2026-09-11)." ec=0
[F9] node --check Kpis/app.js                          → ec=0
[F10] node --test --import tsx tests/kpi-achados-paridade.test.ts tests/kpi-dashboard-charts.test.ts
      tests/kpi-dashboard-contraste.test.ts            → # tests 28 # pass 28 # fail 0 # skipped 0 (tsx 4.22.3) ec=0
[F11] node scripts/sync-agent-agents.mjs --check       → "[agents-sync] OK — 25 agentes, espelho consistente." ec=0
extra: marcas_check.py → divergências marca escrita x calculada: 0
extra: EOL depois — PLANO LF (622, 0 CRLF) · pendencias.md CRLF 9264/0 · índice LF 459 · kpis-latest.json CRLF 839/0 ·
       app.js CRLF 1676/0 · status-geral CRLF 4436/0 · log CRLF 4331/0  (todos preservados)
```

`git diff --numstat` / `--stat` final:

```
1	1	Kpis/app.js
3	3	Kpis/kpis-latest.json
2	0	agent-orchestration/codex/log-execucao.md
28	1	agent-orchestration/controle/decisoes.md          (do orquestrador, inalterado desde o início)
352	351	agent-orchestration/controle/pendencias-indice.md (gerador; números de linha deslocados)
36	14	agent-orchestration/controle/pendencias.md        (14 ponteiros + 22 linhas novas)
8	0	agent-orchestration/docs/status-geral.md
54	23	docs/revisoes/SAN3/PLANO_SAN3.md
 8 files changed, 484 insertions(+), 393 deletions(-)
```

**Limpeza:** nada criado no worktree fora dos 7 arquivos do §A; nenhum banco, nenhum container; sem commit, sem push,
sem stash/checkout/reset/clean. Scripts, cópias do gerador, cópias ajustadas dos scripts de apoio e o backup ficam em
`<scratchpad>/opB/` como evidência para a cadeira de conferência (`backup/` tem os 7 arquivos como estavam antes).

## 7. Divergências entre o plano e a árvore — o aplicador não decidiu; reporta

**(a) O plano, como escrito, não fecha na árvore — não apliquei além do texto; decisão do orquestrador:**

- **D1 — §0 item 2 do plano com números do índice de dois estados atrás.** Diz "Índice (gerador, depois do ciclo 2): 366
  cabeçalhos (355 IDs); FECHADAS 72 → 103; ABERTAS 263". O gerador no HEAD já dava **369/358, 266 ABERTAS** (as 3
  pendências do ciclo 2 registradas no `ec4f34a8`; o `status-geral.md` l.4427 já diz 369/358/266), e depois desta
  aplicação dá **370/359, 267 ABERTAS**. O plano de aplicação não manda tocar o §0 nesse ponto; os números novos estão só
  no §15 e na trilha. (É a mesma classe do C3-02 do ciclo 1: dois estados na mesma leitura.)
- **D2 — critério de fim do §D.3 ("0 divergentes") inatingível sem mexer no §4.1.** `conferir_ponteiros.py` fecha em **1**:
  `P-O6R-B09` → item 7. Conferido à mão: o item 7 é o `Ω6R-ARQ-004`, bloco `B-O6R-09`, e a emenda fala exatamente disso —
  o ponteiro está **certo** e, pela instrução ("corrija só se estiver errado"), ficou. O script não o reconhece porque a
  coluna Item do item 7 não traz `P-O6R-B09`. Caminho que fecharia sem tocar o ponteiro: grafar o item 7 como
  "`Ω6R-ARQ-004` (em `P-O6R-B09`)", como o item 3 grafa "`Ω6R-QUA-005` (em `P-O6R-B11`)" — não apliquei.
- **D3 — travas novas fora da coluna Dep.** O §C.6 manda acrescentar as duas travas só à lista do §6; a convenção do
  ciclo 2 (§14, "Consequências mecânicas…": "antecessores de trava do §6 escritos na coluna Dep. do §5") não foi seguida
  para elas, e o `agenda-ciclo2.mjs` passou de "arestas de trava que NÃO estão na coluna Dep.: nenhuma" para 2
  (`07c` → `SAN3-26`; `SAN3-11` → `B-O6R-12`). Violações seguem 0 (a regra do §6 honra as travas à parte). Se valer a
  convenção: `07c` na Dep. do `B-SAN3-26` e `SAN3-11` na Dep. do `B-O6R-12`.
- **D4 — o CE-1 amplia a fronteira do `B-SAN3-18` com `prisma/seed.ts`, mas nem a linha do §5 nem a trava do §6 o
  refletem.** O §C não manda pôr o arquivo na coluna Fronteira do `B-SAN3-18` (para o `B-SAN3-04a` manda, com o
  `RBAC_MATRIX.md`), e a trava `prisma/seed.ts` do §6 é `SAN3-04a` → `SAN3-07`, sem o `SAN3-18`. Medido (variante da
  agenda com o arquivo na fronteira do `SAN3-18`): 0 violações e 0 pares sobrepostos no melhor e no realista — mas a
  ordem `SAN3-07` (F3; 34,5–36 / 99–101) → `SAN3-18` (F2; 42,5–55,5 / 146–203) sobre o `seed.ts` vem do relógio, não do
  grafo: a mesma classe do C1-A4 que o §C.6 fechou para dois outros pares.
- **D5 — `mvp_demo.note` não tem número de bloqueantes.** O §C.8 diz que "as notas de `mvp_demo`/`mvp_vendavel` … dizem
  '56 bloqueantes em 37 blocos'"; só a do `mvp_vendavel` tinha o número (M9). Troquei os 3 lugares onde ele existia
  (nota do `mvp_vendavel`, `limitations`, `recent` #386) e **não acrescentei** número à nota do `mvp_demo` (o aplicador do
  ciclo 2 fez o mesmo).
- **D7 — texto novo cita arquivo não rastreado.** O §15 do plano, o `status-geral.md` e o `log-execucao.md` citam
  `agent-orchestration/omega/planos/SAN3-plano-opcao-B-aplicacao.md`, que existe no disco mas não no HEAD (`git
  ls-files --error-unmatch` → "did not match any file(s) known to git"). Precisa entrar no commit do PR, senão o laço de
  caminhos da conferência acusa.
- **D13 — a paráfrase do critério do painel sobrevive fora do teste (g).** O §C.7 completou o teste (g) do `B-SAN3-10`, mas
  o parágrafo "Dados corrigidos por este PR" do §4.1 ("O critério de fechamento das duas — guard que falha quando o painel
  defasa do último merge, provado por mutação — é o teste (g)") e a 1ª linha de status das duas entradas
  (`P-KPI-ROADMAP-CONGELADO` l.8888 e `P-KPI-RECENT-CONGELADO` l.5534) seguem com a paráfrase sem a metade por bloco. Hoje
  apontam para o teste (g), que agora está completo; não mexi (o plano não manda, e a linha de status é a que o gerador lê).
- **D14 — linhas `dono:` defasadas pré-existentes, fora do plano** (a C3 do ciclo 2 já as citou, evidência l.62):
  `P-KPI-ROADMAP-CONGELADO` dono "próximo PR que tocar `Kpis/` (… plano SAN3: citada no §7.2 …, sem bloco)" × status
  "dono B-SAN3-10"; `P-MOBILE-CHECKIN-CONFERE-CODIGO-DA-OS` dono "plano SAN3: não nomeada no gate (§4.1)" × a emenda do
  ciclo 1 e a de hoje (item 53, `B-SAN3-26`). Não há "item N" nelas, então a busca de ponteiros não as alcança; não mexi.

**(b) Interpretações que tomei dentro do texto do plano — reportadas para a cadeira julgar:**

- **D6 —** `P-FIELD-LOCATION-SEM-CONSENTIMENTO-NO-BACKEND`, dono "(plano SAN3 v5, item 18 ampliado ao backend)": o item
  dela no §4.1 é o 52; li como referência ao bloco (`B-SAN3-17` fecha o 18 e foi ampliado ao backend para o 52), a mesma
  leitura da C3 no ciclo 2. Não alterei. Se a leitura for "ponteiro para o item da entrada", vira "item 52".
- **D8 —** linha do `B-SAN3-18`: além de "38 caminhos" → "40 caminhos" (o que o §C.1 manda), troquei "as 11 entradas do
  registro" → "as 13 entradas de organização do registro" — sem isso a linha soma 27 + 11 ≠ 40.
- **D9 —** coluna `reclass.` dos novos, "pela convenção dos itens 50–53": **55 sem ✓** (como o 50: fluxo sem tela que a
  junta achou dentro do plano, sem classificação de fatia); **56 com ✓** (como o 51/52: defeito pré-existente levado ao
  gate pela regra do §2 — o próprio §C.3 diz "entra pela regra de classificação do §2"), com o §8.7 atualizado.
- **D10 —** marcas CE-G1/CE-G2: pela célula de teste **mais** o texto das CE-n anexadas a ela (4 blocos só entram assim;
  a lista só pela célula está no §2 deste relatório). A seleção é léxica: passo executado por papel que a célula não nomeia
  (ex.: o check-in do técnico no `B-SAN3-26`; as ações do `B-SAN3-24`) não ganha marca — o texto do CE-G2 vale para
  "todo passo" de qualquer forma.
- **D11 —** nomes soltos que o plano de aplicação escreveu viraram caminho completo, pela convenção do laço de caminhos
  (o aplicador do ciclo 2 teve de corrigir o mesmo): no CE-2, `work-order.routes.ts` / `work-order-comment.routes.ts` /
  `checklist.routes.ts` → `src/modules/…`; na prova do item 56, `catalog.ts:730-894` →
  `src/modules/core-saas/permissions/catalog.ts:730-894`. Sentido inalterado.
- **D12 —** causa-raiz do `B-SAN3-12`: "a web emite título e não liquida" → "+ nem concilia" (o bloco passa a fechar o
  item 55; o §C.5 fala em "escopo com o extrato e a conciliação").

**Nenhum fato marcado *(medir)* divergiu da árvore** (§1): não houve motivo de parada.

## 8. Segunda passada — decisões do planejador sobre D1–D14

Mesmo worktree, mesmo escopo e as mesmas regras (sem commit; CRLF/LF preservados; backup do estado pós-1ª passada em
`opB/backup/PLANO_SAN3.pos-passada1.md` e `opB/backup/pendencias.pos-passada1.md`). Aceitas sem ação: D5, D8, D9, D10,
D11, D12; D7 é do orquestrador. Scripts desta passada: `opB/plano_opB2.py`, `opB/apoio_patch2.py` (cópia
`opB/apoio-opB2/`), `opB/pend_opB2.py`, `opB/dono_check.py`, `opB/final2.py` + `opB/final2b.py`.

### 8.1 O que foi feito em cada decisão

- **D1:** §0 item 2 → "Índice (gerador, depois da opção B): **370 cabeçalhos (359 IDs); FECHADAS 72 → 103; ABERTAS 267**."
  O `final2.py` lê o placar **da saída do gerador**, não de digitação. Varredura (`grep -n "cabeçalhos|ABERTAS|FECHADAS"`):
  l.26 (§0 — atualizada), l.620 (§15 — os mesmos números), l.568 (§13 CR2-06) e l.602 (§14 C3-02) — históricas, intocadas;
  as demais "ABERTAS" (l.165, 177, 212, 405) são texto sem número do índice. Trilha (`status-geral.md`,
  `log-execucao.md`) com 370/359/103/267.
- **D2:** item 7 → "`Ω6R-ARQ-004` (em `P-O6R-B09`)", no estilo do item 3. **`conferir_ponteiros.py` → `ponteiros no
  registro: 40 | divergentes: 0`.**
- **D3:** Dep. do `B-SAN3-26` + "`07c` (`src/modules/work-orders/work-order.routes.ts`, §6)"; Dep. do `B-O6R-12` +
  "`SAN3-11` (`src/modules/impound/impound-prisma.repository.ts`, §6)". Modelo da agenda (cópia `apoio-opB2`) com a mesma
  DEP. **Agenda: violações 0 (melhor e realista) e "arestas de trava que NÃO estão na coluna Dep.: nenhuma".**
- **D4:** fronteira do `B-SAN3-18` + "`prisma/seed.ts` (**autorizado** só para as chaves de módulo novas em
  `DEMO_TENANT_MODULES` — CE-1)"; Dep. do `B-SAN3-18` + "`SAN3-07` (`prisma/seed.ts`, §6)"; trava do §6 →
  `prisma/seed.ts` (`SAN3-04a` → `SAN3-07` → `SAN3-18`). Modelo: DEP, LOCKS e FR do `SAN3-18` ajustados. **Mesmo
  resultado da agenda** (0 violações, nenhuma aresta fora da Dep., 0/0 pares sobrepostos, frentes e fecho inalterados:
  57 / 60,5 / 60,5 / 67,5 → 80,5; realista 238 / 213 / 240 / 223 → 297).
- **D13:** parágrafo "Dados corrigidos por este PR" do §4.1 → "O critério de fechamento das duas, provado por mutação, é o
  teste (g) do `B-SAN3-10` (item 54): no `roadmap`, bloco com `merge_commit` no history não fica `a_fazer`, e `as_of` ≥
  último merge; o `recent` contém o último merge." Registro — **medido antes:** a emenda C3c2-02 de hoje na
  `P-KPI-ROADMAP-CONGELADO` **não** cobria a metade dela inteira (faltava "`as_of` ≥ último merge", que o teste de
  encerramento da própria entrada exige — "guard: bloco com `merge_commit` no history não fica `a_fazer`; `as_of` ≥ último
  merge" — e ela dava à entrada a metade do `recent`). Como a emenda é texto desta aplicação, não commitado, foi
  **corrigida no lugar** (l.8900; não empilhei uma segunda): critério completo da metade do `roadmap`, provado por mutação.
  A `P-KPI-RECENT-CONGELADO` ganhou a sua (l.5538, logo depois da emenda C3c2-04): "o `recent` … contém o último merge do
  history; provado por mutação". Nenhuma linha de status reescrita.
- **D14 + D6 (item 6), pela propriedade** — `opB/dono_check.py`: para cada um dos 56 itens, as entradas nomeadas na coluna
  Item (68 IDs depois do D2 → 56 com cabeçalho no registro; 12 sem: os 10 achados `Ω6R-*`, que vivem em
  `docs/revisoes/O6R/achados.jsonl`, e os bullets `P-033` (dentro da `P-032`) e `P-Ω3F6-CANCEL-RACE` (dentro da `P-Ω3F6`)).
  Consistente = o campo `dono:` nomeia o bloco do §4.1 e, se cita "item N", N é o item. Antes: 21 consistentes / 35 não;
  **reescritas 4** (as únicas com linha `- **dono:**` própria); depois: 25 / 31.

  | linha | ID (item) | de → para |
  |---|---|---|
  | 8399 | `P-WEB-FIN-CHEQUE-FECHAMENTO-COMISSAO-SEM-TELA` (29) | "bloco web financeiro (bloco dono proposto pela fatia; plano SAN3: fora do gate (§4.3) — entra se o dono vender (§10.1))" → "`B-SAN3-24` (plano SAN3, §4.1 item 29) (antes: …)" |
  | 8846 | `P-MOBILE-CHECKIN-CONFERE-CODIGO-DA-OS` (53) | "bloco mobile (bloco dono proposto pela fatia; plano SAN3: não nomeada no gate (§4.1))" → "`B-SAN3-26` (plano SAN3, §4.1 item 53) (antes: …)" |
  | 8898 | `P-KPI-ROADMAP-CONGELADO` (54) | "próximo PR que tocar `Kpis/` (bloco dono proposto pela fatia; plano SAN3: citada no §7.2 (…), sem bloco)" → "`B-SAN3-10` (plano SAN3, §4.1 item 54) (antes: …)" |
  | 9218 | `P-FIELD-LOCATION-SEM-CONSENTIMENTO-NO-BACKEND` (52) — D6 | "`B-SAN3-17` (plano SAN3 v5, item 18 ampliado ao backend)." → "`B-SAN3-17` (plano SAN3, §4.1 item 52) (antes: …)" |

  Nenhuma das quatro tinha dono "intencionalmente outro" (três eram rótulos da fatia anteriores ao plano; a quarta, o
  ponteiro do D6).

  **Não mexi — 31 entradas, com o porquê** (e se o bloco do §4.1 aparece em algum outro ponto da entrada):

  *(i) o dono está na 1ª linha de status — "não reescreva as linhas de status" (10):* item 8 `P-CHK-DOSSIE-VERSAO-NA-UI`
  (l.2227, "a atribuir"; `B-SAN3-11` **não aparece**) · 9 `P-INFRA-RLS` (l.486, "a atribuir"; nomeado em emenda l.487/490)
  · 13 `P-Ω4-FINANCE-READ-ORFA` (l.944; `B-SAN3-04a` **não aparece**) · 15 `P-RBAC-CHECKLIST-DRIFT` (l.1703; **não
  aparece**) · 20 `P-Ω4-3-INVOICE-ATOMIC` (l.994; `B-SAN3-02` **não aparece**) · 20 `P-Ω4-3-INVOICE-TOCTOU-DELETE`
  (l.1014; **não aparece**) · 21 `P-Ω4-3-REFATURAR-DELTA` (l.972; nomeado l.976) · 22 `P-Ω4-7-DUPLA-CONTAGEM` (l.1294;
  nomeado l.1297) · 41 `P-Ω3a` (l.414; nomeado na emenda de hoje, l.417) · 54 `P-KPI-RECENT-CONGELADO` (l.5534 —
  consistente em substância: a própria 1ª linha diz "dono B-SAN3-10, plano SAN3 v5, item 54"; o detector pegou o
  "**dono:** bloco SAN2-5" do valor antigo preservado dentro da mesma linha).

  *(ii) o dono está na continuação de um bullet de status em várias linhas (4):* item 10
  `P-O6R-B06-LEITURA-PLATAFORMA-SOB-FORCE-RLS` ("bloco de plataforma (a decidir)"; nomeado em emenda l.7393) · 25
  `P-O6R-B06-USAGE-BEST-EFFORT-RESIDUAL` ("bloco novo `B-O6R-06b`, ou o bloco de outbox"; `B-SAN3-03` **não aparece**) · 25
  `P-O6R-B06-BASE-SEM-PRODUTOR` ("bloco de cloud billing / produto"; **não aparece**) · 26
  `P-O6R-LISTCOSTLINEITEMS-SEM-ESCOPO-IMPORT` ("próximo bloco de `cloud-cost-allocation` …"; nomeado l.8185).

  *(iii) a entrada não tem campo `dono:` — não há linha a reescrever (17):* item 1 `P-020` (**não aparece** — e ela nomeia
  `B-O6R-04`, o nome anterior à divisão em `04a`/`04b`) · 3 `P-O6R-B11` (nomeado l.3303) · 4 `P-008` (**não aparece**) · 6
  `P-CHK-PATCH-SEM-LOCK` (nomeado l.2054) · 7 `P-O6R-B09` (nomeado l.3221) · 12 `P-027` (nomeado l.342) · 33
  `P-MOBILE-OS-SEEDS` (nomeado l.1975) · 38 `P-026` (**não aparece**) · 39 `P-PURCHASE-ORDERS-BACKEND-GATE` (**não
  aparece**) · 39 `P-RBAC-GATING-MOCKSHELLS` (**não aparece**; "bloco dono = o de `P-PURCHASE-ORDERS-BACKEND-GATE`") · 40
  `P-Ω3F4C-ACTIVATION-PROMPT` (**não aparece**) · 42 `P-SAN-E2E` (nomeado l.504) · 43 `P-SAN-PROD-BOOTSTRAP` (**não
  aparece**) · 45 `P-019` (**não aparece**) · 47 `P-CHK-SEED-DEMO-SUJO` (**não aparece**) · 49 `P-028` (nomeado l.317) · 49
  `P-Ω3F2B-ACENTOS` (**não aparece**).

  *(iv) hospedeiras (mais de um ID):* `P-032` (hospeda a `P-033`, item 14; status "dono: a atribuir", l.396) e `P-Ω3F6`
  (hospeda a `P-Ω3F6-CANCEL-RACE`, item 23; l.1350) — pela regra do planejador, intocadas.

  **Em 17 das 31 o bloco do §4.1 não aparece em lugar nenhum da entrada** (ver N2).

### 8.2 Bateria do §F — segunda execução (depois de tudo)

```
[F1] git diff --check                  → ec=0
[F2] git diff --name-only              → os mesmos 8: os 7 do §A + decisoes.md do orquestrador (numstat 28/1, intocado)
                                         git status: + ?? agent-orchestration/omega/planos/SAN3-plano-opcao-B-aplicacao.md
[F3] laço de caminhos (opB/laco.py)    → 116 tokens; 0 NOVO não resolvido; os mesmos 5 "não resolvidos", todos já no
                                         HEAD em linhas só marcadas (`.ts`, `.tsx`, `.ts`, `docs/ROTEIRO-DEMO-E-OPERACAO.md`,
                                         `tests/kpi-painel-frescor.test.ts`); informativos: o plano de aplicação (não
                                         rastreado, no disco) e `Kpis/` (diretório, do valor antigo preservado da ROADMAP)
[F4] agenda (opB/apoio-opB2)           → blocos=37 G=11 M=21 P=5 · arestas de trava fora da Dep.: nenhuma ·
                                         violações 0 (melhor) e 0 (realista) · pares sobrepostos 0 / 0 · fecho 80,5 / 297
[F5] check_plano (56)                  → 56 itens (1..56) · ✓ 27 == §8.7 · §2 bate · §8.1 46 dos 56 bate · 37 blocos
                                         G11 M21 P5 · item↔bloco↔Fecha 0 erro · Dep. × DEP 0 diferença
[F6] conferir_ponteiros.py             → itens do §4.1 com ID: 56 | IDs mapeados: 68 | ponteiros no registro: 40 |
                                         divergentes: 0
     ponteiros_estendidos.py           → 51 ocorrências; 3 a conferir, todas referência deliberada: l.6664 (minha emenda:
                                         "o item 51"), l.7393 ("pré-requisito do item 9"), l.9218 (o valor antigo
                                         preservado "(antes: … item 18 …)")
     marcas_check.py                   → divergências marca escrita x calculada: 0
[F7] gerador                           → 370 cabecalhos / 359 IDs | FECHADA 103, ABERTA 267 | baldes {'-': 103, 'C': 71,
                                         'B': 90, 'A': 106} | diferidas-materiais 14; re-run: inalterado; cópia CRLF e
                                         cópia LF fora do repo: BYTE-IDÊNTICO; sha256 142c3ba90e9dece0423b…
[F8] kpi-freeze --check                → "em dia (snapshot 2026-09-11)." ec=0
[F9] node --check Kpis/app.js          → ec=0
[F10] 3 guards de KPI                  → # tests 28 # pass 28 # fail 0 # skipped 0, ec=0
[F11] sync-agent-agents --check        → "[agents-sync] OK — 25 agentes, espelho consistente." ec=0
EOL → PLANO LF 622 · pendencias.md CRLF 9265/0 · índice LF 459 · kpis-latest.json CRLF 839/0 · app.js CRLF 1676/0 ·
      status-geral CRLF 4438/0 · log CRLF 4331/0 (todos preservados)
```

`git diff --numstat` final: `Kpis/app.js` 1/1 · `Kpis/kpis-latest.json` 3/3 · `log-execucao.md` 2/0 · `decisoes.md` 28/1
(orquestrador) · `pendencias-indice.md` 352/351 · `pendencias.md` 41/18 · `status-geral.md` 10/0 · `PLANO_SAN3.md` 60/29 —
**8 files changed, 497 insertions(+), 403 deletions(-)**.

### 8.3 Incidente meu nesta passada (corrigido e reverificado)

O `final2.py` parou no meio: escreveu o plano (§0 e §15) e o `status-geral.md`, e a asserção do log falhou porque ali a
frase começa com "**Í**ndice pelo gerador" (maiúscula) — o log não foi escrito. Além disso, no `status-geral.md` o
parágrafo da segunda passada ficou **depois** da linha "Conferência de aplicação: a preencher", e o ramo do log teria
gerado "Dep.. Conferência". O `final2b.py` reordenou o `status-geral.md` (a linha da conferência voltou a ser a última da
entrada), completou o log ("11 emendas" e a frase da segunda passada, sem ponto duplo) e a reverificação deu
`git diff --check` ec=0 e CRLF preservado nos dois.

### 8.4 Divergências novas (o aplicador não decidiu; reporta)

- **N1 — o teste (g) do `B-SAN3-10` no §5 perdeu a metade do `as_of`.** O texto que o §C.7 mandou escrever (aplicado
  literalmente na 1ª passada) diz "(g) guard de frescor do painel — bloco com `merge_commit` no history não fica
  `a_fazer` no `roadmap`, e o `recent` contém o último merge —, com mutação…". O (g) antigo, "(`roadmap` e `recent` com o
  último merge do history)", cobria o `as_of` do roadmap; a reescrita trocou isso pela metade por bloco. Agora o parágrafo
  do §4.1 (D13) e a emenda da `P-KPI-ROADMAP-CONGELADO` exigem "`as_of` ≥ último merge", e a célula do teste (g) não.
  Não mexi (não está nas decisões). Fecharia com "…não fica `a_fazer` no `roadmap` e `roadmap.as_of` ≥ último merge, e o
  `recent` contém o último merge…" — decisão do planejador.
- **N2 — a propriedade "o dono de cada entrada do gate nomeia o bloco do §4.1" segue aberta em 31 entradas** (lista acima),
  **17 delas sem o bloco em lugar nenhum da entrada**. A instrução cobre reescrever uma linha `dono:` existente — só 4 a
  tinham; as outras têm o dono na linha de status (10, e a regra desta passada é não reescrever linha de status), na
  continuação de um bullet de status (4), ou não têm campo (17). Dois caminhos, ambos fora da instrução: (a) uma emenda
  por entrada ("dono: `<bloco>` (plano SAN3, §4.1 item N)", só-apensar); (b) reescrever o dono dentro da linha de status
  com "(antes: …)", a convenção dos 52 flips, contra a regra desta passada. Nota: a `P-020` nomeia `B-O6R-04`, o nome
  anterior à divisão, e o §4.1 dá `B-O6R-04a`.

**Interpretação desta passada (reportada):** a emenda C3c2-02 da `P-KPI-ROADMAP-CONGELADO` foi **corrigida no lugar**, e não
recebeu uma emenda nova por cima, por ser texto desta aplicação, ainda não commitado; o valor que ela tinha está neste
relatório (§4, tabela D.2) e no backup `opB/backup/pendencias.pos-passada1.md`.

## 9. Terceira passada — decisões do planejador sobre N1 e N2

Mesmo worktree, escopo e regras; backup do estado pós-2ª passada em `opB/backup/*.pos-passada2`. Scripts:
`opB/dono_check2.py`, `opB/pass3_texto.py` + `opB/pass3_trilha.py`, `opB/reescritas.py`.

### 9.1 N1 — o critério do painel inteiro nos quatro lugares

- **§5, teste (g) do `B-SAN3-10`:** "(g) guard de frescor do painel — no `roadmap`, bloco com `merge_commit` no history não
  fica `a_fazer` e `roadmap.as_of` ≥ último merge; o `recent` contém o último merge —, com mutação que o deixa vermelho
  (item 54)" (o texto aceito, literal; as marcas "+ CE-G1, CE-G2 (§5.6)" seguem depois).
- **§4.1, parágrafo do D13:** só a grafia alinhada — "`as_of`" → "`roadmap.as_of`".
- **As duas emendas do painel** (texto desta aplicação, não commitado, corrigido no lugar): cada uma continua com o
  critério completo da sua metade **e** agora escreve a outra por extenso ("A outra metade … — o `recent` contém o último
  merge —" na ROADMAP, l.8933; "A outra metade — no `roadmap`, bloco com `merge_commit` … e `roadmap.as_of` ≥ último merge —"
  na RECENT, l.5566). Assim, nenhum dos quatro lugares tem metade faltando.
- **Conferência por script** (`pass3_trilha.py`, quatro componentes em cada lugar):
  ```
  §5 teste (g):   OK a_fazer · OK roadmap.as_of ≥ último merge · OK recent contém o último merge · OK mutação
  §4.1 parágrafo: OK · OK · OK · OK
  emenda ROADMAP: OK · OK · OK · OK
  emenda RECENT:  OK · OK · OK · OK
  ```
- **§15** (l.619): "A primeira aplicação do §C.7 perdeu o critério `as_of` (teste (g) do `B-SAN3-10`), apontada pelo
  aplicador e restaurada." **Trilha:** parágrafo "Terceira passada (decisões do planejador sobre N1 e N2): a primeira
  aplicação do §C.7 perdeu o critério `as_of`, apontada pelo aplicador e restaurada — …" no `status-geral.md` (antes de
  "**Números:**"; a linha da conferência continua a última) e a mesma frase no fim do parágrafo do `log-execucao.md`.

### 9.2 N2 — o dono do §4.1 escrito em toda entrada do gate (caminho a, só-apensar)

`dono_check2.py` estende o detector: (1) a emenda de dono da opção B é o dono vigente; (2) linha `- **dono:**`; (3) na 1ª
linha de status, só o trecho **antes** de "Valor anterior, preservado" (o valor antigo preservado não é o campo vigente);
(4) outra linha; (5) "Dono nomeado". Bullet sem cabeçalho (numa hospedeira) é lido pela emenda com "emenda sobre `ID`".

- **Antes:** 58 avaliados → 26 consistentes (a `P-KPI-RECENT-CONGELADO` já entra aqui, pela 1ª linha de status: "dono
  B-SAN3-10, plano SAN3 v5, item 54") · **32 inconsistentes** = as 30 entradas das classes (i)–(iii) da §8 (a RECENT
  saiu da lista) + os 2 bullets hospedados (iv).
- **`--emendar` → 32 emendas**, uma no fim de cada entrada, no formato do planejador:
  `- **dono (plano SAN3, §4.1 item N — `D-SAN3-PLANO-OPCAO-B`, 2026-09-13):** `<bloco>`.` Lista gerada pelo script:
  item 1 `P-020` → `B-O6R-04a` · 3 `P-O6R-B11` → `B-O6R-11` · 4 `P-008` → `B-SAN3-01` · 6 `P-CHK-PATCH-SEM-LOCK` →
  `B-SAN3-22` · 7 `P-O6R-B09` → `B-O6R-09` · 8 `P-CHK-DOSSIE-VERSAO-NA-UI` → `B-SAN3-11` · 9 `P-INFRA-RLS` → `B-SAN3-05` ·
  10 `P-O6R-B06-LEITURA-PLATAFORMA-SOB-FORCE-RLS` → `B-SAN3-05` · 12 `P-027` → `B-SAN3-04b` · 13
  `P-Ω4-FINANCE-READ-ORFA` → `B-SAN3-04a` · 14 `P-033` (na `P-032`) → `B-SAN3-04a` · 15 `P-RBAC-CHECKLIST-DRIFT` →
  `B-SAN3-04a` · 20 `P-Ω4-3-INVOICE-ATOMIC` e `P-Ω4-3-INVOICE-TOCTOU-DELETE` → `B-SAN3-02` · 21 `P-Ω4-3-REFATURAR-DELTA` →
  `B-SAN3-02` · 22 `P-Ω4-7-DUPLA-CONTAGEM` → `B-SAN3-20` · 23 `P-Ω3F6-CANCEL-RACE` (na `P-Ω3F6`) → `B-SAN3-23` · 25
  `P-O6R-B06-USAGE-BEST-EFFORT-RESIDUAL` e `P-O6R-B06-BASE-SEM-PRODUTOR` → `B-SAN3-03` · 26
  `P-O6R-LISTCOSTLINEITEMS-SEM-ESCOPO-IMPORT` → `B-SAN3-03` · 33 `P-MOBILE-OS-SEEDS` → `B-SAN3-13` · 38 `P-026` →
  `B-SAN3-04a` · 39 `P-PURCHASE-ORDERS-BACKEND-GATE` e `P-RBAC-GATING-MOCKSHELLS` → `B-SAN3-06a` · 40
  `P-Ω3F4C-ACTIVATION-PROMPT` → `B-SAN3-08` · 41 `P-Ω3a` → `B-SAN3-08` · 42 `P-SAN-E2E` → `B-SAN3-10` · 43
  `P-SAN-PROD-BOOTSTRAP` → `B-SAN3-09` · 45 `P-019` → `B-SAN3-06b` · 47 `P-CHK-SEED-DEMO-SUJO` → `B-SAN3-07` · 49 `P-028` e
  `P-Ω3F2B-ACENTOS` → `B-SAN3-21`. Todas inseridas logo depois de um item de lista (9265 → 9297 linhas, 0 linha em
  branco nova).
- **P-020** (l.254): "`B-O6R-04a` (a entrada nomeia `B-O6R-04`, nome anterior à divisão em `04a`/`04b`)." — o texto do
  planejador.
- **Adaptação reportada — hospedeiras:** as duas emendas levam ", emenda sobre `P-033`" / ", emenda sobre
  `P-Ω3F6-CANCEL-RACE`" logo depois do cabeçalho, e o corpo pedido ("o bullet `P-033` (item 14) tem dono `B-SAN3-04a`";
  "o bullet `P-Ω3F6-CANCEL-RACE` (item 23) tem dono `B-SAN3-23`"). "Emenda sobre `X`" é a convenção que o registro já
  usa para bullet hospedado (a emenda sobre `P-033` de 2026-09-11) e é o que o `conferir_ponteiros.py` lê para saber de
  quem é o ponteiro. Sem ela, o "§4.1 item 14/23" das emendas seria atribuído à `P-032`/`P-Ω3F6`, que não estão no §4.1,
  e o critério "0 divergentes" reabriria.
- **Achado da propriedade (reportado):** a regra da nota da `P-020`, aplicada a todas as entradas e não só à nomeada,
  achou uma segunda entrada que cita um bloco pelo nome anterior à divisão: a `P-RBAC-CHECKLIST-DRIFT` cita `B-SAN3-04`
  (na emenda C2-04, "O teste do `B-SAN3-04` cobre as quatro", e na linha do crítico r2). A emenda de dono dela (l.1728)
  diz "`B-SAN3-04a` (a entrada nomeia `B-SAN3-04`, nome anterior à divisão em `B-SAN3-04a`/`B-SAN3-04b`)".
- **`P-KPI-RECENT-CONGELADO`:** sem emenda — consistente em substância, e o detector estendido a lê assim.
- **Depois:** `dono_check2.py` → **58 consistentes, 0 inconsistentes.** Fora do alcance, com o porquê: os **10 achados
  `Ω6R-*`** da coluna Item (itens 1, 2, 3, 7, 11, 19, 24, 27, 30, 31), porque não têm entrada no registro — vivem em
  `docs/revisoes/O6R/achados.jsonl`. Nos itens 1, 3, 7, 11 e 27 o `P-` da mesma coluna está consistente. Os itens **2, 19,
  24, 30 e 31 só trazem o ID do achado**, e nenhuma entrada do registro é nomeada por eles. É a classe do item 7 antes do
  D2, que se resolveu grafando "(em `P-O6R-B09`)". Registro aqui como residual, sem ação: o `conferir_ponteiros.py` dá
  0 divergentes, ou seja, nenhum ponteiro do registro aponta hoje para esses itens.
- **Nenhuma linha de status reescrita** — o `reescritas.py` abaixo não acha nenhuma linha fora das 18 conhecidas.

### 9.3 Linhas do `pendencias.md` REESCRITAS (não acrescentadas) em relação ao HEAD `ec4f34a8`

Gerado por `opB/reescritas.py` a partir de `git diff -U0 ec4f34a8 -- agent-orchestration/controle/pendencias.md`: em cada
hunk, cada linha removida é pareada com a acrescentada mais parecida (difflib) e classificada. O ID é o cabeçalho da
entrada no blob do HEAD. **58 hunks · 18 linhas removidas (reescritas) · 73 acrescentadas · por classe: ponteiro 14,
dono (antes: …) 4, OUTRO 0, sem par 0.** Nenhuma linha foi apagada sem par.

| linha no HEAD → linha agora | ID | classe | o que mudou |
|---|---|---|---|
| 317 → 320 | `P-028` | ponteiro | 43 → 49 |
| 503 → 513 | `P-SAN-E2E` | ponteiro | 38 → 42 |
| 8342 → 8378 | `P-WEB-CLOUD-BILLING-CARTAZ` | ponteiro | 40 → 46 |
| 8395 → 8431 | `P-WEB-FIN-CHEQUE-FECHAMENTO-COMISSAO-SEM-TELA` | dono (antes: …) | `B-SAN3-24` (plano SAN3, §4.1 item 29); valor antigo preservado inteiro |
| 8446 → 8482 | `P-WEB-PLATAFORMA-TELAS-FICCAO` | ponteiro | 40 → 46 |
| 8463 → 8499 | `P-WEB-PLATAFORMA-SEGURANCA-FABRICADA` | ponteiro | 16 → 17 |
| 8515 → 8551 | `P-WEB-GATE-MODULO-INCOMPLETO` | ponteiro | 15 → 16 |
| 8549 → 8586 | `P-MOBILE-PRESTADOR-SEM-PORTA` | ponteiro | 30 → 35 |
| 8566 → 8603 | `P-MOBILE-CONCLUSAO-SEM-PORTA` | ponteiro | 31 → 36 |
| 8600 → 8637 | `P-MOBILE-LGPD-GPS-SEM-PORTA` | ponteiro | 17 → 18 |
| 8617 → 8654 | `P-MOBILE-GUINCHO-ENTREGA-INALCANCAVEL` | ponteiro | 29 → 34 |
| 8668 → 8705 | `P-MOBILE-ESTOQUE-TECNICO-FABRICADO` | ponteiro | 32 → 37 |
| 8703 → 8740 | `P-MOBILE-MINHAS-OS-SEM-FILTRO` | ponteiro | 11 → 32 |
| 8720 → 8757 | `P-MOBILE-FAXINA-TERMOS-TECNICOS` | ponteiro | 42 → 48 |
| 8723 → 8760 | `P-MOBILE-FAXINA-TERMOS-TECNICOS` | ponteiro | 42 → 48 |
| 8841 → 8878 | `P-MOBILE-CHECKIN-CONFERE-CODIGO-DA-OS` | dono (antes: …) | `B-SAN3-26` (plano SAN3, §4.1 item 53); valor antigo preservado inteiro |
| 8892 → 8930 | `P-KPI-ROADMAP-CONGELADO` | dono (antes: …) | `B-SAN3-10` (plano SAN3, §4.1 item 54); valor antigo preservado inteiro |
| 9209 → 9250 | `P-FIELD-LOCATION-SEM-CONSENTIMENTO-NO-BACKEND` | dono (antes: …) | `B-SAN3-17` (plano SAN3, §4.1 item 52); valor antigo preservado inteiro |

"Ponteiro" = a linha nova é a antiga com só o número do "item N" trocado. "Dono (antes: …)" = a linha nova é
"- **dono:** `B-…` (plano SAN3, §4.1 item N) (antes: <valor antigo>)" e o valor antigo aparece **inteiro** dentro do
"(antes: …)" (conferido por igualdade de string no script). Todo o resto do diff do registro é acréscimo: a entrada
nova, 11 emendas da decisão, 32 emendas de dono e o blockquote da entrada nova.

### 9.4 Incidente meu nesta passada (corrigido e reverificado)

O `pass3_texto.py` parou na própria conferência dos quatro lugares com um falso "FALTA" na emenda RECENT: o padrão
`` `recent`[^.;]* `` não atravessa o ponto de `kpis-latest.json`. O critério estava lá. Nesse ponto ele já tinha escrito o
plano (N1, §4.1, §15) e as duas emendas do painel, mas **não** a trilha; e, pelo encadeamento com `&&`, o
`conferir_ponteiros.py` daquela chamada não rodou. O `pass3_trilha.py` refez a conferência com o padrão corrigido
(`` `recent`.{0,80}?contém o último merge ``): 4 × 4 OK. Depois escreveu a trilha, e o `conferir_ponteiros.py` rodou à
parte: 72 / 0.

### 9.5 Bateria do §F — terceira execução (depois de tudo)

```
[F1] git diff --check                → ec=0
[F2] git diff --name-only            → os mesmos 8 (7 do §A + decisoes.md do orquestrador, 28/1); ?? o plano de aplicação
[F3] laço de caminhos                → 116 tokens; 0 NOVO não resolvido; os mesmos 5 já no HEAD em linhas só marcadas
[F4] agenda (apoio-opB2)             → violações 0 / 0 · arestas de trava fora da Dep.: nenhuma · pares sobrepostos 0 / 0
                                       · fecho 80,5 / 297
[F5] check_plano (56)                → 56 itens · ✓ 27 == §8.7 · §2 bate · §8.1 46 dos 56 · 37 blocos G11 M21 P5 ·
                                       item↔bloco↔Fecha 0 erro · Dep. × DEP 0 diferença
[F6] conferir_ponteiros.py           → itens do §4.1 com ID: 56 | IDs mapeados: 68 | ponteiros no registro: 72 |
                                       divergentes: 0   (72 = 40 + as 32 emendas de dono)
     ponteiros_estendidos.py         → 85 ocorrências; as mesmas 3 referências deliberadas (l.6692 "o item 51"; l.7423
                                       "pré-requisito do item 9"; l.9250 o valor antigo preservado "(antes: … item 18 …)")
     dono_check2.py                  → 58 consistentes, 0 inconsistentes, 10 fora do alcance (achados Ω6R)
     marcas_check.py                 → divergências 0
     pass3_trilha.py (quatro lugares)→ 4 × 4 OK
[F7] gerador                         → 370 cabecalhos / 359 IDs | FECHADA 103, ABERTA 267 | baldes {'-': 103, 'C': 71,
                                       'B': 90, 'A': 106} | diferidas-materiais 14; re-run: inalterado; cópias CRLF e LF
                                       fora do repo (do pendencias.md atual): BYTE-IDÊNTICO; sha256 40129ceac73fe3c9b291…
                                       — placar INALTERADO, logo §0, §15 e trilha seguem com 370/359/103/267
[F8] kpi-freeze --check              → "em dia (snapshot 2026-09-11)." ec=0
[F9] node --check Kpis/app.js        → ec=0
[F10] 3 guards de KPI                → # tests 28 # pass 28 # fail 0 # skipped 0, ec=0
[F11] sync-agent-agents --check      → "[agents-sync] OK — 25 agentes, espelho consistente." ec=0
EOL → PLANO LF 623 · pendencias.md CRLF 9297/0 · índice LF 459 · kpis-latest.json CRLF 839/0 · app.js CRLF 1676/0 ·
      status-geral CRLF 4440/0 · log CRLF 4331/0
```

`git diff --numstat` final: `Kpis/app.js` 1/1 · `Kpis/kpis-latest.json` 3/3 · `log-execucao.md` 2/0 · `decisoes.md` 28/1
(orquestrador) · `pendencias-indice.md` 381/380 · `pendencias.md` 73/18 · `status-geral.md` 12/0 · `PLANO_SAN3.md` 61/29 —
**8 files changed, 561 insertions(+), 432 deletions(-)**.

### 9.6 Divergências novas

**Nenhuma** entre plano e árvore. Ficam reportados três pontos: a adaptação das emendas das hospedeiras ("emenda sobre
`X`"), o achado da propriedade na `P-RBAC-CHECKLIST-DRIFT` e o residual dos itens 2, 19, 24, 30 e 31, que só trazem o
ID do achado Ω6R.
