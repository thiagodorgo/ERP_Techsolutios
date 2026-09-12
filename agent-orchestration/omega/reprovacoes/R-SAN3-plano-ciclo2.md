# R-SAN3-plano-ciclo2 — reprovação do ciclo 2 da junta do PR #386 (plano SAN3) — TETO

**Objeto julgado:** `ecc32712b626d836c661dfd28b2172fb75a1d475` (plano v5 + registro + fechamento do B-O6R-06; o
registro do ciclo 1 completado depois do LIBERADO do inspetor, R6). **Quórum:** unanimidade de 3. **Placar: 1 × 2** —
C1 `jurado-san3c2-cobertura-de-fluxo` **REPROVADO** · C2 `guardiao-fail-closed` **REPROVADO** · C3 `agente-ci-doutor`
**APROVADO**. Todos os votos em Opus 5 (os corpos não fixam modelo); nenhuma queda.
Votos e evidências: `agent-orchestration/omega/juntas/votos/SAN3-plano-ciclo2/`.

**O ciclo 2 está reprovado e é o teto** (`D-TETO-DOIS-CICLOS`): não há ciclo 3. Dossiê ao dono:
`agent-orchestration/omega/reprovacoes/DOSSIE-SAN3-plano-parada.md`.

## 1. Os bloqueantes

| Achado | Cadeira | Escopo | O defeito | Conferido pelo orquestrador |
|---|---|---|---|---|
| C1-A1 | C1 | dentro-do-bloco | Conciliação prometida (notas `mvp_*`, `API_CONTRACTS.md:435`) sem chamador e sem bloco | sim: rota em `financial-entry.routes.ts:85`; 0 chamada estrita na web e no app (os 5 arquivos da web com "reconcile" são estado de processamento, não chamada); "concilia" no plano = 0 |
| C1-A2 | C1 | dentro-do-bloco | Faturar sem porta para o papel Financeiro, mesmo depois do `B-SAN3-25` | sim: `GET /work-orders/:id` sob `WORK_ORDER_PERMISSIONS.read`; `finance` com `os.read`, sem `work_orders:read` (`catalog.ts:809-872`); nenhum apelido de `os.read` fora do catálogo; `requirePermission` → `requireAnyPermission` com a lista exata |
| C1-A3 | C1 | dentro-do-bloco | O teste do `B-SAN3-08` cita "Financeiro cria orçamento com as permissões do banco", passo sem construtor | sim: texto do teste na linha do `B-SAN3-08`; `finance` sem `customers:read`, `service_catalog:read` e `work_orders:read` |
| C2c2-01 | C2 | dentro-do-bloco | Gate de módulo do backend (`B-SAN3-18`) sem enumeração rota → módulo; o guard só vê o registro do menu | sim: linha 256 do plano (o guard é sobre "toda entrada do registro"; a recusa entra "no ponto de montagem", sem lista rota → módulo nem regra para a rota não mapeada); Frota com 0 entradas no registro contra 6 módulos no código |
| C2c2-03 | C2 | dentro-do-bloco | `Ω6R-SEC-002` e item 51 fecham por dono e por piso de teste, não por escopo provado | sim: linha 251 ("todas as vias do censo tiverem dono"; "piso: 1, 2 e 10"); as 10 rotas que a C2 aponta existem — 5 de comentário, 2 de geocode, 3 de vistoria (`checklist.routes.ts:140,156,193`) — e o técnico tem a permissão de cada uma; na leitura mais generosa do piso sobram as 3 de vistoria |

A C3 aprovou com 0 `bloqueia`: o registro, o painel e os números do PR estão coerentes entre si e com o gerador.

## 2. As três perguntas obrigatórias (§C7.4-bis)

**(a) A composição cobre a competência que os achados exigem?** Sim para o que foi achado: a C1, criada para cobertura
de fluxo prometido, achou os três furos de cobertura; a C2, de enumeração fail-closed, achou os dois de fechamento; a
C3, de registro e números, aprovou com 1 ajuste e 4 notas. **Duas lacunas declaradas**, nenhuma com achado sem dono:
não há cadeira de invariante financeiro (R4 do inspetor — a C3-01 do ciclo 1 foi conferida pelo texto da decisão e pelo
índice), e nenhuma cadeira tinha no mandato a exatidão da matriz RBAC contra o catálogo (lacuna registrada pela C1, que
deixou as quatro divergências anteriores ao PR como pendência com dono `B-SAN3-04a`).

**(b) Quem achou é quem consertou?** Não houve conserto no ciclo 2 além do registro: o placeholder do `R-` do ciclo 1
foi achado pelo inspetor (R6) e corrigido pelo orquestrador, com o delta re-verificado pelo inspetor. Os achados deste
ciclo **não são consertados**: é o teto, e a próxima ação é do dono.

**(c) O planejador usou dado podre?** Sim, em classes que já tinham aparecido no ciclo 1:
- **Afirmação herdada e não verificada.** O 38 do item 16 somou pelo **nome** as 11 entradas que o jurado do ciclo 1
  listou (`/patios` e `/telemetria`), em vez de medir a propriedade: são 13 entradas de organização sem módulo, 40 no
  total (C2c2-02).
- **Premissa de teste não medida — a mesma classe do C1-02 do ciclo 1.** O teste do `B-SAN3-08` pressupõe que o
  Financeiro cria orçamento com as permissões do banco, e o `B-SAN3-25` pressupõe que o Financeiro alcança a aba da OS.
  Nenhuma medição do plano de correção conferiu as permissões do papel que executa o passo.
- **Correção por instância.** Cada correção do ciclo 1 fechou a lista que o achador deu (o menu, as vias citadas, a
  tela), não a propriedade violada (a enumeração inteira, toda rota mutante, o par tela × papel). O dossiê trata disso
  no §3.

## 3. O que o protocolo manda agora

- **`D-TETO-DOIS-CICLOS`, item 3:** o ciclo 2 foi reprovado — **para**. Não há ciclo 3. Dossiê ao dono com o que foi
  entregue, o que cada junta achou, o que foi corrigido, por que a correção não bastou e as opções com custo.
- **Sepultamento** das duas identidades novas neste PR (§1.5 do obituário, §3.6). **Aposentadoria** delas só no
  primeiro PR depois do merge (`D-APOSENTADORIA-ELENCO-EFEMERO`: "ata fechada **e PR mergeado**"; o §1 do briefing do
  ciclo 2 dizia "no mesmo PR" — divergência registrada no §5 da ata).
- **Pendências pré-existentes registradas:** `P-NAV-MODULOS-NAO-RESOLVIDOS-LIBERA-MENU` (C2c2-05, dono `B-SAN3-18`),
  `P-RBAC-MATRIZ-X-CATALOGO-QUATRO-CELULAS` (lacuna da C1, dono `B-SAN3-04a`) e
  `P-SAN3-INDICE-ITEM-DO-GATE-SO-PELA-HOSPEDEIRA` (C3c2-05, dono `B-REG-GERADOR`); e duas emendas — C3c2-04 na
  `P-KPI-RECENT-CONGELADO`, C1-A8 na `P-FIELD-LOCATION-SEM-CONSENTIMENTO-NO-BACKEND`.
- Nenhum bloco do plano começa; o Traccar continua depois do gate.

## 4. Trilha

| Quando | O quê |
|---|---|
| 2026-09-12 | Ciclo 2: inspetor LIBERADO COM RESSALVA (R1–R9); R6 corrigida e o objeto re-apontado para `ecc32712` (delta re-verificado); C1 e C2 reprovam, C3 aprova — placar 1 × 2; teto; dossiê ao dono |
