# Plano de aplicação da opção B — PR #386 (plano SAN3), decisão do dono de 2026-09-13

> **Decisão:** `D-SAN3-PLANO-OPCAO-B` (`agent-orchestration/controle/decisoes.md`, fim do arquivo) — caminho B; P1
> "Sim, lê OS"; P2 "Sim — Financeiro monta orçamento". **Papéis (§C7.4-bis):** achadores = as cadeiras da junta do
> ciclo 2 (votos em `agent-orchestration/omega/juntas/votos/SAN3-plano-ciclo2/`); **planejador** = o orquestrador (este
> arquivo); **aplicador** = um agente distinto, que não achou e não planejou; **conferência** = uma cadeira de registro,
> depois da aplicação. Não é ciclo de mérito: nada aqui reabre o que a decisão fechou.
>
> **Lição que este plano obedece** (a que reprovou o ciclo 2): **fechar a propriedade, não a instância.** Toda lista
> abaixo que se refere a "todos" é gerada por script a partir da fonte, nunca curada à mão; e toda contagem herdada de
> voto é re-medida antes de ser escrita.

## A. Escopo da aplicação

**Permitido (e só isto):** `docs/revisoes/SAN3/PLANO_SAN3.md`; `agent-orchestration/controle/pendencias.md`;
`agent-orchestration/controle/pendencias-indice.md` (só pelo gerador); `Kpis/kpis-latest.json` (notas e `recent` do
#386); `Kpis/app.js` (só por `node scripts/kpi-freeze.mjs`); `agent-orchestration/docs/status-geral.md` e
`agent-orchestration/codex/log-execucao.md` (uma entrada cada, no fim). **Proibido:** qualquer arquivo de código
(`src/`, `tests/`, `prisma/`, `frontend/`, `mobile/`, `.github/`, `scripts/`), `RBAC_MATRIX.md` (muda no bloco, não
aqui), `decisoes.md` (o orquestrador já registrou), agentes, `CLAUDE.md`/`AGENTS.md`. Sem commit. Preserve o fim de linha
de cada arquivo (medido pelo aplicador do ciclo 2: `pendencias.md` CRLF; `PLANO_SAN3.md` LF).

**Meça antes de escrever.** Cada fato abaixo marcado *(medir)* é conferido por comando na árvore antes de entrar no
texto; se não bater, **pare e reporte** — não ajuste o fato para caber.

## B. As condições de entrada — nova seção `### 5.6` do plano

Inserir, depois da última subseção do §5 e antes de `## 6.`, a seção **"### 5.6 Condições de entrada — decisão do dono
(opção B, 2026-09-13)"**, com um parágrafo de abertura ("O dono aprovou o plano com os bloqueios da junta do ciclo 2
escritos como condição de entrada — `D-SAN3-PLANO-OPCAO-B`. Um bloco com condição só começa com o plano dele cumprindo-a,
e a junta do bloco a confere por execução.") e a lista abaixo, com os identificadores literais:

- **CE-G1 — enumeração fail-closed (geral; classe do C2c2-01, C2c2-03 e C2c2-08).** Todo guard ou censo citado num teste
  de encerramento do §5 declara, no plano do bloco: (a) a fonte da enumeração, **gerada por script do código real**
  (rotas montadas no `src/app.ts`, catálogo, registro — nunca lista curada); (b) o default do membro não previsto, que é
  **negar**; (c) a mutação que deixa o guard vermelho (membro novo sem classificação). Vale para todo bloco com guard, não
  só para os nomeados abaixo.
- **CE-G2 — papel × passo (geral; classe do C1-A2, do C1-A3 e do C1-02 do ciclo 1).** Todo passo de teste de encerramento
  executado por um papel tem, no plano do bloco, as permissões desse papel medidas no catálogo e a permissão exata que a
  rota compara. Passo cujo papel não tem a permissão só entra no teste se um bloco anterior na agenda a concede e o teste
  desse bloco a prova.
- **CE-1 — `B-SAN3-18` (item 16; C2c2-01, C2c2-02, C2c2-04, C2c2-05, C2c2-08).** A recusa por módulo no backend nasce de um
  mapa rota → módulo **gerado das montagens do `src/app.ts`**: todo router montado e todo endpoint dele classificado
  (módulo, ou lista **literal** de núcleo, independente do registro); rota sem classificação é **recusada**; o guard fica
  vermelho por mutação para (i) entrada nova do registro sem módulo, (ii) endpoint novo e (iii) router novo montado sem
  classificação. A contagem do item 16 é **40** *(medir: 27 da diferença `MVP_NAV_PATHS` − registro + 13 entradas de
  organização sem `requiredModules` — as 11 de `/patios` e `/telemetria`, `/controle/notificacoes` e
  `/operations/quotes`)*. A fronteira ganha `prisma/seed.ts`, **autorizado nominalmente** só para as chaves de módulo
  novas em `DEMO_TENANT_MODULES` (CI, e2e e demo), e o default da lista de módulos não resolvida passa a ser negar
  (`P-NAV-MODULOS-NAO-RESOLVIDOS-LIBERA-MENU`, que entra no item 16).
- **CE-2 — `B-O6R-07c` (itens 11 e 51; C2c2-03).** O `Ω6R-SEC-002` e o item 51 fecham por **escopo provado**, não por
  dono: o censo é **gerado por script** das rotas mutantes dos routers da fronteira (`work-order.routes.ts`,
  `work-order-comment.routes.ts`, `checklist.routes.ts`) e do sync mobile, cruzadas com as permissões do
  `field_technician` no catálogo; **toda** rota mutante que o técnico alcança tem teste de 403 `not_assigned_to_actor`
  com vermelho-controle no head-base — inclusive as 5 de comentário, as 2 de geocode e as 3 de vistoria (anexo, avaria,
  divergência) que a C2 mediu *(medir: as 10 existem e o técnico tem a permissão de cada uma)*; o piso "1, 2 e 10" deixa de
  ser critério de fechamento; um guard fica vermelho quando surge rota mutante alcançável pelo técnico sem teste de
  escopo. Via achada fora da fronteira continua virando pendência com dono, mas o SEC-002 só fecha quando **todas** as
  vias do censo tiverem escopo provado.
- **CE-3 — `B-SAN3-25` (item 50; C1-A2; decisão P1).** O `finance` passa a ter `work_orders:read`, concedido pelo
  `B-SAN3-04a` (anterior na agenda; a matriz já dá `read`); o teste do `B-SAN3-25` fatura **como o papel `finance`, com as
  permissões do banco** depois do `db:provision-rbac`, pela aba da OS — além do `tenant_admin`. Dep. do `B-SAN3-25` ganha
  `SAN3-04a`.
- **CE-4 — `B-SAN3-12` ampliado (item 55 novo; C1-A1, C1-A7).** O extrato da conta (`GET /financial-entries`) e a ação
  de conciliar (`PATCH /financial-entries/:financialEntryId/reconcile`, permissão `financial_entries:update`, que o
  `finance` tem *(medir)*) entram no escopo; teste: criar conta → emitir título → baixar pela tela → o lançamento aparece
  no extrato → conciliar → conciliado; conciliar de novo → a resposta que o contrato define; saldo pela rota real. O
  `B-SAN3-12` segue **M** no melhor caso — o planejador do bloco reavalia e, se crescer, recalcula a agenda no plano dele.
- **CE-5 — `B-SAN3-08` e `B-SAN3-04a` (itens 41 e 56; C1-A3; decisão P2).** O `B-SAN3-04a` concede ao `finance`
  `customers:read` e `service_catalog:read` (mais o `work_orders:read` do CE-3) e **atualiza a `RBAC_MATRIX.md` no mesmo
  bloco** (Clientes l.38 e Serviços l.41: `finance` de `none` para `read`) — mudança de arquivo-base autorizada pela
  `D-SAN3-PLANO-OPCAO-B`; o teste do `B-SAN3-04a` prova as três leituras com as permissões do banco. A fronteira do
  `B-SAN3-04a` ganha `RBAC_MATRIX.md` (autorizado nominalmente, só as linhas 38, 41 e as das quatro células do CE-6).
- **CE-6 — `B-SAN3-04a` (item 56 novo).** As quatro células da `P-RBAC-MATRIZ-X-CATALOGO-QUATRO-CELULAS` convergem à
  matriz — e onde a matriz diz "por escopo" e o backend não aplica o escopo, a permissão **não** é concedida sem ele: vira
  pendência nomeada com dono (fail-closed). Guard de célula da matriz × catálogo com mutação.
- **CE-7 — `B-SAN3-26` (item 53; C2c2-07).** A conferência do check-in fica no **ponto único de decisão** do servidor que
  as duas entradas usam (`changeStatus` → `arrived`, pelo sync e pelo `PATCH /work-orders/:id/status`), e o plano do bloco
  escreve o default para OS sem o dado conferido (placa ou número de série): negar, com exceção só por tipo de serviço
  nomeado.

Nas linhas das tabelas do §5, acrescentar ao fim da célula de teste de cada bloco afetado **" + CE-n (§5.6)"** (os
blocos com guard recebem também "CE-G1"; os com passo de papel, "CE-G2" — liste por script quais são, a partir das
células de teste que citam "guard"/"censo" e das que citam um papel).

## C. Ajustes e itens novos

1. **§4.1, item 16** (C2c2-02, C2c2-05): "38" → "40" com a composição medida (CE-1), e a coluna de IDs ganha
   `P-NAV-MODULOS-NAO-RESOLVIDOS-LIBERA-MENU`. Na linha do `B-SAN3-18`, "38 caminhos" → "40 caminhos".
2. **§4.1, item 55 (novo):** `P-WEB-CONCILIACAO-SEM-TELA` — a conciliação é prometida (notas `mvp_*`,
   `API_CONTRACTS.md:435`) e a web não concilia: sem extrato nem ação | crit. 7, 4 | prova: rota em
   `src/modules/financial-entries/financial-entry.routes.ts:85`; 0 chamada a `/reconcile` e a `GET /financial-entries`
   em `frontend/src` *(medir)*; junta do ciclo 2, C1-A1 | bloco `B-SAN3-12` (ampliado). Coluna "reclass.": siga a
   convenção dos itens 50–53 e mantenha o `check_plano.py` e o §8.7 coerentes.
3. **§4.1, item 56 (novo):** `P-RBAC-MATRIZ-X-CATALOGO-QUATRO-CELULAS` — quatro células de ação da matriz sem permissão
   no catálogo (inclui o `finance` sem `work_orders:read`) | crit. 3 | prova: `catalog.ts:730-894` e `RBAC_MATRIX.md:37,44-46`
   (junta do ciclo 2, lacuna da C1; conferido pelo orquestrador) | bloco `B-SAN3-04a`. Entra pela **regra de
   classificação do §2** (viola o critério 3 no código medido).
4. **§4.3 (fora do gate com condição):** `P-SAN3-INDICE-ITEM-DO-GATE-SO-PELA-HOSPEDEIRA` — fica fora: não viola, no código
   do produto, nenhum dos 13 critérios (é o índice de registro, e o §1 declara que não usa a severidade dele); dono
   `B-REG-GERADOR`. A condição fica escrita, como o §2 manda.
5. **§5, linha do `B-SAN3-12`:** itens "28" → "28, 55"; escopo com o extrato e a conciliação (CE-4).
   **`B-SAN3-04a`:** itens ganham "56"; fronteira ganha `RBAC_MATRIX.md` nominal (CE-5). **`B-SAN3-25`:** Dep. ganha
   `SAN3-04a` (CE-3) — confira que a agenda do §6 já respeita (F2 `SAN3-04a` 0–5 × F3 `SAN3-25` 41–46).
6. **§6, travas** (C1-A4): acrescentar à lista `src/modules/work-orders/work-order.routes.ts` (`07c` → `SAN3-26`) e
   `src/modules/impound/impound-prisma.repository.ts` (`SAN3-11` → `B-O6R-12`); a agenda não muda (já estão em ordem) —
   prove re-rodando `votos/SAN3-plano-ciclo2/aplicador-apoio/agenda-ciclo2.mjs` com as duas travas: 0 violações.
7. **§5, teste (g) do `B-SAN3-10`** (C3c2-02): o guard de frescor inclui a metade por bloco — "bloco com `merge_commit` no
   history não fica `a_fazer` no `roadmap`, e o `recent` contém o último merge".
8. **Contagens:** 54 → **56** bloqueantes em §0, §4.1 (cabeçalho), §9 ("Quantidade exata") e onde mais o número aparecer
   *(gere a lista por `grep` — não confie nesta)*; blocos seguem **37**; "44 dos 54 vêm de fora da auditoria" → recontado
   por script (os dois novos vêm da junta, não da auditoria); §9 melhor caso e realista **inalterados** (tamanhos
   inalterados — declare isso numa frase no §9). No `Kpis/kpis-latest.json`: as notas de `mvp_demo`/`mvp_vendavel`, as
   `limitations` e o item do #386 em `recent` dizem "56 bloqueantes em 37 blocos"; depois `node scripts/kpi-freeze.mjs`.
9. **§15 novo no fim do plano:** "Decisão do dono (opção B) e a aplicação" — 5 a 8 linhas: a decisão, P1/P2, onde estão as
   condições (§5.6), o que mudou de número, quem aplicou e quem conferiu (a conferir preenche depois).

## D. Registro (`pendencias.md`, CRLF)

1. **Entrada nova** `P-WEB-CONCILIACAO-SEM-TELA (2026-09-13)` — ALTA, no formato das entradas do ciclo 1 (status, prova,
   escopo `pre-existente` com data da rota, dono `B-SAN3-12`, bloqueia o gate — critérios 7 e 4, teste de encerramento =
   o do CE-4). Escopo datado *(medir: `git log` da rota de conciliação)*.
2. **Emendas** (formato `- **emenda (decisão do dono D-SAN3-PLANO-OPCAO-B, 2026-09-13):** …`, no fim de cada entrada):
   `P-WEB-FATURAR-OS-SEM-TELA` (CE-3/P1); `P-Ω3a` (CE-5/P2); `P-RBAC-MATRIZ-X-CATALOGO-QUATRO-CELULAS` (item 56, regra do §2,
   CE-6); `P-NAV-MODULOS-NAO-RESOLVIDOS-LIBERA-MENU` (entra pelo item 16, CE-1); `P-WEB-GATE-MODULO-INCOMPLETO` (40, CE-1);
   `P-O6R-SUBRECURSO-OBJECT-SCOPE` (CE-2); `P-SAN3-CHECKLIST-RUN-SEM-ESCOPO-POR-OBJETO` (CE-2, as 3 de vistoria);
   `P-MOBILE-CHECKIN-CONFERE-CODIGO-DA-OS` (CE-7); `P-KPI-ROADMAP-CONGELADO` (C3c2-02); `P-SAN3-INDICE-ITEM-DO-GATE-SO-PELA-HOSPEDEIRA`
   (fora do gate, §4.3).
3. **Ponteiros (C3c2-01) — todos, pela propriedade.** Rode `python <scratchpad>/conferir_ponteiros.py` (o orquestrador
   mediu 25 ponteiros, 15 divergentes — os 14 da C3 mais o da `P-O6R-B09`, que aponta para um item cujo ID o §4.1 grafa de
   outro jeito: confira à mão e corrija só se estiver errado). Corrija cada divergente para o item que o §4.1 atribui ao
   ID, **depois** de os itens 55/56 existirem; depois estenda a busca a outras grafias ("plano SAN3 v5, item N", "item N"
   em linha de dono de entradas deste PR) e trate igual. Critério de fim: o script devolve **0 divergentes**, e o relatório
   lista cada correção (linha, ID, de → para).
4. **Índice:** `python agent-orchestration/controle/gerar-indice-pendencias.py`, e prova byte a byte contra o gerador rodado
   numa cópia fora do repo.

## E. Trilha

Uma entrada no fim de `status-geral.md` e um parágrafo no fim da entrada SAN3 do `log-execucao.md`: a decisão do dono,
o que foi aplicado, os números novos (56/37; índice), e "conferência de aplicação: a preencher pela cadeira" — o
orquestrador completa depois da conferência.

## F. Bateria (o aplicador roda, e cola a saída no relatório)

`git diff --check`; `git diff --name-only` só com os arquivos do §A; laço de caminhos: todo caminho citado em texto novo
existe na árvore; `python <apoio>/check_plano.py` (ajustado a 56 itens, mesma regra do §8.7) verde;
`agenda-ciclo2.mjs` com as travas novas: 0 violações; `conferir_ponteiros.py`: 0 divergentes; gerador byte-idêntico;
`node scripts/kpi-freeze.mjs --check`; `node --check Kpis/app.js`; os 3 guards de KPI
(`node --test --import tsx tests/kpi-achados-paridade.test.ts tests/kpi-dashboard-charts.test.ts tests/kpi-dashboard-contraste.test.ts`)
28/28; `node scripts/sync-agent-agents.mjs --check`.

**Relatório** (no scratchpad da sessão, `APLICADOR-OPCAO-B.md`): cada item do §B–§E com o que foi feito, cada fato
*(medir)* com o comando e a saída, a lista de correções de ponteiro, a bateria, e **toda divergência entre este plano e a
árvore** — o aplicador não decide divergência sozinho: reporta.
