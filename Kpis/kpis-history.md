# KPI Dashboard History

Este arquivo e o historico permanente do painel `Kpis/`. Todo bloco futuro deve atualizar:

- `Kpis/index.html`
- `Kpis/app.js`
- `Kpis/kpis-history.md`

## 2026-08-28 - B-O6R-REG - o registro passa a dizer o que a execução diz

### Resultado

| KPI | Valor |
|-----|-------|
| Backend / Flutter / Smoke | **carregados** — 2595/2597, 864/864, 1126/1126. Nenhuma trilha de código foi tocada (§C3.3) |
| Blocos Entregues | **152 — INTOCADO.** Governança e registro não contam como bloco de feature entregue (mesmo critério do `JUNTA-MAPAS` e do `Ω-GOV`) |
| mvp_demo / mvp_vendável | **INTOCADOS** — nenhum escopo de produto se moveu |

Bloco de **registro**, sem uma linha de código de produto: o diff em `src/`, `prisma/`, `frontend/`, `mobile/`,
`tests/`, `scripts/` e `.github/` é **vazio**.

**Fecha as quatro ressalvas** que sobraram do porteiro pós-merge do #359 — as outras duas ele próprio fechou no
dia (apagar a branch remota; tornar a trilha durável). (1) **Backfill §C3.5** do #359. (2) **Três frases
defasadas** que a execução contradiz — *"piso 0"* → o piso **dispara** nomeando
`tests/core-saas-role-authority.test.ts`; *"6 arquivos"* → **7**; *"2358"* → **2359**, com linha `Dono:`. As
três viviam **também** na `description` do history e foram corrigidas lá: o porteiro só tinha nomeado os
arquivos de registro. (3) Os **dois achados `pre-existente` órfãos** da ata ganharam entrada com dono — o do
`authority-portal.test.ts:162` exige **atribuição por execução, N≥10, antes** de qualquer correção.

**Achado não previsto, encontrado por este bloco.** O status de `P-O6R-B04` e `P-O6R-B05` estava **trocado** na
`pendencias.md` da `main`: o bloco de **estoque** figurava como FECHADO pelo PR #353 — que é do **B-05** e se
chama literalmente *"produção não sobe mais sem persistir e sem worker"* — e o B-05, de fato mergeado, figurava
como ABERTO. Os dois se anulavam. **Consequência material:** quem lesse a trilha pularia o B-04 inteiro achando
que os dois P0 de estoque (saldo concorrente, fechamento de contagem cíclica) estavam fechados. A contraprova
estava no próprio `roadmap` do KPI, que sempre marcou B-04 `a_fazer` e B-05 `concluido`.

**Reconciliação da trilha.** 28 registros de junta (atas, votos, briefings, planos, relatórios de achador, as
duas auditorias — contagem corrigida em 29/08 pelo achado A-3: o diff acrescenta 30 arquivos em `omega/`, dos
quais 2 são artefatos do próprio bloco) e — o que mais importa — **três decisões do dono** (`D-INSPETOR-TERRENO-JUNTA`,
`D-GOV-AMEACA-DESCUIDO`, `D-JUNTA-ESCOPO-E-CALIBRACAO`) viviam **só** na branch `demo/investidor`. Decisão do
dono é o **topo** da hierarquia de fonte de verdade (§A1.1) e estava fora da `main`. O `decisoes.md` é
append-only puro — conferido: a `main` é prefixo **estrito** da `demo`, então a reconciliação não sobrescreve
nada. As nove `P-O6R-B02-*` do ciclo 4 também entraram: são o insumo do ciclo 5, e foi exatamente a ausência
delas na `main` que fez o próprio `B-O6R-ARNES` tropeçar. Os JSON de povoamento (dados da demo) ficaram **fora**.

**E a reconciliação NÃO é total** — dito aqui porque a junta cobrou (achado T-2): `P-GOV-MAIN-SEM-PROTECAO` e
sua atualização de 25/08 (*ruleset instalado*) seguem existindo **só** na `demo/investidor`. Não é perda — a
`main` nunca as teve —, e deixá-las é coerente com não pisar no workstream de governança que está vivo e não
commitado no worktree `gov-descuido`. Mas quem ler a `main` hoje segue sem saber que a proteção da `main` foi
discutida e instalada.

**Cronograma.** O `docs/CRONOGRAMA.md` era de **05/08**: dizia 136 blocos, backend 2.110, e apresentava a trilha
CHECKLIST P1 como *"rodada em curso"* — sem **uma palavra** sobre a auditoria Ω6R ou a reprovação para produção.
Quem o abrisse concluiria que o projeto estava fechando vistorias, quando o deploy está travado por 11 achados
críticos. Ganhou um **§0** com o veredito, os números reais e a fila priorizada correta. O `PROJECT_MEMORY.md`,
de 28/07, ganhou um §0 de delta do mês.

**Bateria:** `kpi-dashboard-charts` **16/16** · `kpi-achados-paridade` **6/6** · `npm run check` **ec=0** ·
`kpi-freeze --check` em dia · `node --check Kpis/app.js` **ec=0** · `git diff --check` limpo · os dois JSON
parseiam.

## 2026-08-28 - B-O6R-ARNES - o arnês de teste vira bloco próprio e fecha PRIMEIRO

### Resultado

| KPI | Valor |
|-----|-------|
| Backend | **2595 / 2597** (2562/2572 → 2595/2597; execução real, canônica 3, N=10) |
| Bateria focada do bloco | **34 / 34** (composição declarada, idêntica em 2 execuções) |
| Flutter / Frontend Smoke | inalterados — trilhas não tocadas (864/864 e 1126/1126, carregados) |
| Blocos Entregues | 152 (151 → 152) |
| mvp_demo / mvp_vendável | **INTOCADOS** — nenhum escopo de produto se moveu |

A classe do arnês (`P-O6R-ARNES-ISOLAMENTO`, 2026-08-18) saiu do `B-O6R-02` e virou bloco próprio por decisão
do dono (`D-JUNTA-ESCOPO-E-CALIBRACAO` §5): ela é **anterior** a todos os blocos O6R de código, e o financeiro
foi reprovado no ciclo 4 por um defeito que **não criou e estava proibido de consertar**. Só `tests/**` e
`scripts/**` (7 arquivos); o diff contra `origin/main` `6efe5ad` em `src/`, `prisma/`, `.github/`, `CLAUDE.md`
e `AGENTS.md` é **vazio**, conferido como item de bateria.

**Três entregas.** (1) **Mecanismo único** de escrita de catálogo de cluster: os três últimos escritores que
rodavam fora do `withRoleCatalogLock` entraram. O motivo é medido, não argumentado — serialização **parcial não
protegia nem os serializados**: 7 de 13 rodadas da bateria barata pré-correção ficaram vermelhas com
`XX000 tuple concurrently updated`, e entre as vítimas estavam `rls-tenant-isolation` (3×) e
`auth-identity-backfill-db` (1×), que **tomavam** o lock. O objeto disputado é a tupla de ACL
(`pg_namespace.nspacl`/`pg_class.relacl`), não `pg_authid`. A **lista exata** da bateria barata — parte da FORMA, e sem ela o denominador 37 não é reproduzível por terceiro (achado da cadeira de catálogo na junta): `audit-security` (1) · `auth-identity-backfill-db` (6) · `auth-identity-link-events-db` (5) · `auth-identity-role-real-db` (10) · `impound-process-checklist-link-schema` (5) · `rls-tenant-isolation` (1) · `vehicle-identity-schema` (9) = **37**. São **sete** arquivos, não seis: nenhuma combinação de 6 que contenha as vítimas nomeadas fecha 37. (2) **Teardown que não deixa papel vivo**:
resiliente por statement, **ruidoso** nas falhas, com segunda tentativa da sequência inteira (a armadilha
`2BP01`) e falha alta se a role sobreviver — mata os dois anti-padrões opostos que existiam (a sequência sem
catch, em que a falha do primeiro engolia o segundo; e o `.catch(() => undefined)`, em que a falha sumia em
silêncio). O varredor ganhou as três famílias novas; `rls_test_` ficou **fora por decisão consciente** (68
órfãs legadas — a classe do incidente de mass-delete de 26/07). (3) **Piso de denominador** no runner: arquivo
que termina sem registrar teste e sem declarar skip fica vermelho **nomeando o arquivo**, em vez de sair 0
publicando um total menor e plausível — foi assim que a canônica 3 publicou 2740 no lugar de 2745 sem avisar
ninguém.

### Os números, com N e forma (a frase do veto que criou o bloco: *número publicado sem N reprova*)

**Bateria barata** — 6 arquivos escritores de catálogo, `node scripts/run-backend-tests.mjs`, `DATABASE_URL`
e `REDIS_URL` em cluster descartável próprio (postgres:16, 103 migrations), `CORE_SAAS_PERSISTENCE` não
exportada, Node v20.19.5, **N=13**: **PRÉ 7/13 vermelhas** + 1 queda de denominador 37→32 → **PÓS 13/13 ec=0,
0 `XX000`, denominador 37 IDÊNTICO nas 13**.

**Canônica 3** — `npm test` com `DATABASE_URL`, **N=10 sobre o código final**, com vaza-metro (snapshot de
`pg_roles` + linhas nas 115 tabelas antes e depois de **cada** rodada):

| rodada | tests | pass | fail | skip | ec | XX000 | Δroles | Δlinhas | s |
|---|---|---|---|---|---|---|---|---|---|
| 01 | 2597 | 2595 | 0 | 2 | 0 | 0 | 0 | +10 | 189 |
| 02 | 2597 | 2595 | 0 | 2 | 0 | 0 | 0 | +10 | 194 |
| 03 | 2597 | 2595 | 0 | 2 | 0 | 0 | 0 | +10 | 214 |
| 04 | 2597 | 2595 | 0 | 2 | 0 | 0 | 0 | +10 | 221 |
| 05 | 2597 | 2595 | 0 | 2 | 0 | 0 | 0 | +10 | 221 |
| 06 | 2597 | 2595 | 0 | 2 | 0 | 0 | 0 | +10 | 222 |
| 07 | 2597 | 2595 | 0 | 2 | 0 | 0 | 0 | +10 | 221 |
| 08 | 2597 | 2595 | 0 | 2 | 0 | 0 | 0 | +10 | 222 |
| 09 | 2597 | 2595 | 0 | 2 | 0 | 0 | 0 | +10 | 221 |
| 10 | 2597 | 2595 | 0 | 2 | 0 | 0 | 0 | +10 | 221 |

**Δroles = 0 em todas as 10 e ZERO role nova ao fim** — contra as **2 órfãs com LOGIN e
INSERT/UPDATE/DELETE em todas as tabelas** (inclusive `financial_entries`) que o ciclo 4 mediu.

O residual de **+10 linhas/rodada** é **pré-existente** e fica **nomeado, não consertado** — atribuição
completa por execução isolada: `tests/core-saas-prisma.test.ts` **+4/+4** (2 rodadas, linear) e
`tests/core-saas-role-authority-db.test.ts` **+1/+1** (3 rodadas, linear), soma **+5/+5** em `auth_identities`
e `auth_identity_link_events` — exatamente o residual medido. Contraprova: 16 outros candidatos isolados deram
**0**, e a canônica 2 (lista `SUITES` do `ci.yml`, que contém `role-authority-db` mas **não** `core-saas-prisma`)
mede exatamente **+1/+1** por rodada. Os dois arquivos estão fora da §5 deste bloco.

**Canônica 1** — `npm test` **sem** `DATABASE_URL`, N=3: ec=1 nas 3, denominador **2359 idêntico**, 58 pulos
idênticos. O piso de denominador **dispara 1 vez, nomeando `tests/core-saas-role-authority.test.ts`** — o
pulo declarado **não** cai nele (os 58 passam limpos), que é o que mantém esta forma utilizável; o que cai é o
arquivo que morre no load sem registrar teste nem declarar skip. [**CORRIGIDO em 2026-08-29 pelo bloco de
registro `B-O6R-REG`**, achado A-1 da cadeira de KPI: o texto publicado aqui dizia "piso **0**" e sobreviveu
**vivo** neste arquivo mesmo depois de a entrada nova, 98 linhas acima, anunciar a correção. O `B-O6R-REG`
editou o topo deste arquivo e **não varreu o corpo dele** — e chegou a marcar a pendência
`P-ARNES-REGISTROS-DEFASADOS-NA-MAIN` como FECHADA sem alcançar esta linha. É a própria classe que aquele
bloco existia para exterminar, cometida por ele.] Vermelho
ambiental **pré-existente e nomeado**: `tests/core-saas-role-authority.test.ts` importa
`src/database/prisma.ts`, que **lança no load** sem banco; o diff desse arquivo e de `src/` contra a base é
**vazio**, e consertá-lo é proibido aqui.

**Canônica 2** — `db:seed` + `node --test --import tsx $SUITES` (lista do `ci.yml` da base), N=3: **3/3 ec=0**,
denominador **148 idêntico**, grep `unhandledRejection|tuple concurrently updated|23505|40P01` = **0** nas 3.

**Casos permanentes de guarda: 22 → 34** (nenhum morreu; meta do plano M ≥ 31).

**Oito drills** (D37–D43 + D40b), cada um com baseline medido na hora, mutação, vermelho com ec registrado e
restore conferido por `git hash-object` = blob (nunca md5 cru, nunca `git archive`+`tar` — errata autocrlf):
D37 bateria barata · D38 sonda de barreira sem o lock de **um** lado → **75** ocorrências de `XX000` ·
D39 resiliência removida → role sobrevive a 1 tentativa · D40 piso desligado → arquivo que some passa ·
D40b forma absoluta removida → **2** casos vermelhos · D41 auto-pulo declarado nas **duas** pontas (ec=0 antes
do porte, ec=1 depois, nomeando a contagem) · D42 a canônica 3 N=10 · D43 sweep revertido às duas famílias
antigas.

### Dois auto-defeitos achados por execução **contra a própria correção**

Ambos nasceram **na correção**, nenhum no código original — a classe que a `D-JUNTA-SEPARACAO-DE-PAPEIS`
descreve. **(a)** O `.catch(() => undefined)` **renasceu** nos casos -db novos: durante o D43 a mutação fez o
padrão de nome deixar de casar, o catch engoliu o assert, e uma role `audit_rls_*` ficou **viva** no cluster;
quem achou foi o **vaza-metro**, não a releitura. **(b)** O piso de denominador nasceu **cego dentro de
`tests/`**: comparava o nome do ponto de arquivo do TAP só com a forma **passada** ao `node --test`, mas para
alvo dentro do repositório o runner encurta para **relativo** e o TAP responde com o **absoluto**. Os drills
não pegaram porque a fixture morava em `os.tmpdir()`, **fora** do repositório — o único arranjo em que as duas
formas coincidem; quem pegou foi a **canônica 1**. Os dois corrigidos no mesmo PR, cada um com caso permanente
novo e drill que o reproduz. **A lição, registrada:** drill cuja fixture não reproduz o arranjo real prova o
mecanismo, não a propriedade.

### Divergências registradas antes de consolidar (§A2)

`P-O6R-B02-RUNNER-SUMICO-SEM-SKIP` **não existe nesta base** (0 ocorrências em `origin/main`; presente só na
trilha `demo/investidor`, 33 commits sem PR) — a correção foi entregue e provada; o registro se fecha lá.
E `Kpis/app.js`, que a §5 do plano não lista, foi **regerado** por `node scripts/kpi-freeze.mjs` (o cabeçalho
deste próprio arquivo manda todo bloco atualizá-lo, e o guard permanente do painel compara a cópia congelada
com o JSON) — diff restrito à linha `var FROZEN = …`. Ambas em `pendencias.md`.


## 2026-08-04 - TELAS PADRONIZADAS PR-D (Pátios com ocupação real) — fecha a rodada de 5 telas

### Resultado

| KPI | Valor |
|-----|-------|
| Flutter / Backend | inalterados (frontend-only) |
| Frontend Smoke | 1003 / 1003 (999 → 1003, +4) |
| Blocos Entregues | 134 (133 → 134) |

**Pátios** fiel ao `sc_patios` **com ocupação REAL**: a página consome `usePatiosDashboardSummary` (uma requisição, já
usada pelo Painel) e mostra **barra de ocupação por pátio** ("X de Y vagas" + % com faixa verde/âmbar/vermelho) e os
**KPIs do design** (Veículos em custódia · Ocupação média · Liberações pendentes), com **fallback honesto** para
"Capacidade prevista" quando falta `impound:read`.

**Junta em 2 ciclos.** Ciclo 1 **REPROVOU** com duas descobertas de peso: (1) **CRÍTICA** — um comentário CSS com `*/`
no meio do texto **fechava cedo e fazia o parser descartar a regra `.pat-patios-grid` inteira**: a tabela ficava **sem
grade** acima de 1100px (medido no navegador; `tsc` e os smokes não pegam CSS); (2) **ALTA** — a degradação declarada
("não há ocupação na lista") era **FALSA**. Ciclo 2 **APROVADO_CONDICIONADO**, com as 4 MÉDIAs fechadas (role de
tabela no wrapper certo; contagem não afirma "0" sob erro; nome acessível = rótulo visível WCAG 2.5.3; hover/foco do
nome-link). **+4 testes**: o **guard de CSS** (3) que trava as grades das 5 telas contra esse tipo de regressão, e as
funções puras da tela (1). Correções transversais às 5 telas: `TablePager` virou `<nav>` com `aria-live`; `.pat-skel`
ganhou pulso com `prefers-reduced-motion`; `.pat-cell-body` padroniza a célula de corpo.

## 2026-08-04 - TELAS PADRONIZADAS PR-C (Usuários + Auditoria)

### Resultado

| KPI | Valor |
|-----|-------|
| Flutter / Backend | inalterados (frontend-only) |
| Frontend Smoke | 999 / 999 (997 → 999, +2 do presenter) |
| Blocos Entregues | 133 (132 → 133) |

**Usuários**: header sem colisão (busca + select de perfil + "Novo usuário" gated `users.manage`), 4 KPIs derivados,
tabela com chips de perfil nos tons do design + badge "acesso total" + situação com dot, TablePager. **Auditoria**:
eventos **agrupados por dia**, rótulos PT-BR humanizados via presenter novo (`auth.refresh.success`→"Sessão renovada"),
KPIs derivados, filtros server-side reais, **Exportar CSV real** no header. **Degradações honestas confirmadas no
backend**: sem last_access → "CRIADO EM" (P-USERS-LAST-ACCESS); coluna ORIGEM **omitida pela allowlist §2.8** (o
backend não expõe device/IP — segurança, não gap); ator sem nome → "Usuário"+cor determinística (P-AUD-ACTOR-NAME).
**Junta `cognicao-visual` → APROVADO**; 2 MÉDIAs **fechadas no próprio PR**: chip "Filtrando por 1 usuário" (UUID
nunca ecoa cru) e deeplink real `/audit?actorId=` a partir de Usuários.

## 2026-08-04 - TELAS PADRONIZADAS PR-B (Ordens de Serviço)

### Resultado

| KPI | Valor |
|-----|-------|
| Flutter / Backend | inalterados (frontend-only) |
| Frontend Smoke | 997 / 997 (kpi-cards-clickable atualizado) |
| Blocos Entregues | 132 (131 → 132) |

Lista de **Ordens de Serviço** redesenhada fiel ao `sc_os`: PageHeader OPERAÇÃO; 4 KPIs de decisão com contagens
100% reais (slot crítico = **Atrasadas**, precedente do PR-A; selo "N sem técnico" real); toolbar com busca + tabs-pill
mapeadas a filtros reais; grade com chip **"Sem cliente vinculado" + Vincular** (destino real) e botão **Atribuir**
gated por `field_dispatch:create` (→ Despachos com a OS pré-selecionada); agenda com hierarquia de urgência;
**TablePager**. Capacidade preservada (Dar andamento / Revogar envio / chip Checklist / clique-na-linha / auto-refresh).
**Junta `cognicao-visual` → APROVADO** após condição de 1 linha: a pill da SITUAÇÃO voltou ao tamanho **base**
(no protótipo a tabela usa 10.5px; a variante `--sm` pertence às listas do Dashboard — **retificada** a BAIXA
incorreta da ata do PR-A). Degradação honesta: DTO de lista sem nome do técnico → "Atribuído" (pendência
P-WO-LIST-TECH-NAME). 5 BAIXAs registradas na ata.

## 2026-08-04 - TELAS PADRONIZADAS PR-A (fundação de componentes + Dashboard)

### Resultado

| KPI | Valor |
|-----|-------|
| Flutter Tests | 835 / 835 (inalterado; frontend-only) |
| Backend Tests | 2115 / 2115 (inalterado; frontend-only) |
| Frontend Smoke | 997 / 997 (smoke-flow atualizado ao novo padrão) |
| Blocos Entregues | 131 (130 → 131) |

**1º PR da rodada TELAS PADRONIZADAS** (design do dono via Claude Design — `ERP Web - Telas Padronizadas.dc.html`).
Fundação de componentes padronizados em `frontend/src/components/patterns/` (**PageHeader** com kicker, **KpiStatCard**
de decisão com selo semântico, **TablePager**, **StatusPill** com dot, **InitialsAvatar** com paleta determinística) +
**Dashboard redesenhado** fiel ao `sc_dash`: saudação por hora + Intl pt-BR, 5 KPIs de decisão clicáveis, faixa
CADASTROS discreta, gráfico de barras empilhadas (série real, sem lib — PD-004), fila "Exige ação agora" (máx. 4, por
urgência), Despachos ativos + Status de campo, Últimos eventos com **agrupamento real** de idênticos consecutivos.

**Degradações honestas (D-007), documentadas:** o agregado real não tem "SLA em risco" → o slot crítico usa
**Atrasadas** (borda `#FCA5A5` só quando >0); "N sem técnico" → tag neutra "em fila"; "Exportar" omitido (sem botão
morto); countdown deriva de `scheduledFor` → rótulo "AGENDA". **Junta `cognicao-visual` → APROVADO** (revisão forense
token a token: zero divergência de cor; honestidade confirmada — nenhum número fabricado; tela 100% viva — todos os
links navegam; estados §7 no novo padrão; 4 BAIXAs registradas no ledger para os PRs seguintes: variante `--sm` do
StatusPill no PR-B, "Ver tudo"→`/audit` candidato ao PR-C, selo de "Em andamento" com associação frouxa, "Concluídas"
total vs "hoje"). Bateria: check/test:smoke (**997/997**)/build verdes; `app.css` 100% aditivo.

## 2026-08-03 - CHECKLIST P1 PR-01 (tipos single_choice/multi_choice/signature + plumbing de opções)

### Resultado

| KPI | Valor |
|-----|-------|
| Flutter Tests | 835 / 835 (inalterado) |
| Backend Tests | 2115 / 2115 (2110 → 2115, +5) |
| Frontend Smoke | 997 / 997 (inalterado; tsc+smoke cobrem a paleta) |
| Blocos Entregues | 130 (129 → 130) |

**1º PR da rodada CHECKLIST P1.** Alinha os tipos de componente **`single_choice`**, **`multi_choice`**, **`signature`**
— que o app Flutter já tem no enum, mas que o backend e o builder web não conheciam: entram no enum
(`checklist.types.ts`), no catálogo (`checklist.components.ts`), no validator tipado (escolha **exige**
`config.options` — lista não-vazia) e na união/paleta do builder web (a paleta lê o catálogo via
`GET /tenant/checklist-components`). O builder web agora authora os 3 tipos.

**Junta `critico-adversarial` → APROVADO_CONDICIONADO** (2 ciclos de rastreamento): a premissa "o mobile já renderiza
os três" era FALSA. O crítico rastreou que o **run screen renderiza dos SEEDS, não do backend** — o parser do envelope
de `/render` está quebrado (`_schemaFromJson` espera `title`/`checklistId`/`version as String`, não desembrulha
`{data}`) → **nenhum checklist authorado na web renderiza no app hoje, de tipo nenhum**. O PR-01 plumbou as opções de
escolha no topo dos DTOs (`toChecklistTemplateComponentDto` — a fonte do `/render` — e `toMobileChecklistTemplateDto`/
snapshot) como `[{value,label}]`, mas o **loop mobile NÃO fecha** até o envelope ser resolvido. **Honestidade (§A6):** a
ALTA fica **ABERTA** como **P-CHK-RENDER-ENVELOPE** (a fechar na PR-08 de reconciliação mobile: alinhar o envelope +
teste de contrato render→field, OU rewire do run screen para o snapshot). Também **P-CHK-CATALOG-EXHAUSTIVE** (catálogo
array, não Record). O diff é **seguro para merge** (sem regressão); a condição da junta era não vender o fechamento do
loop — cumprida.

**+5 test()** (validador de escolha 400/201 + 4 de DTO: `toChecklistTemplateComponentDto`/`toMobileChecklistTemplateDto`/
snapshot emitem `options` no topo; observation/signature não). Suíte checklist **40/40**. **Sem migração.** Escopo:
`src/modules/checklists/{types,components,validator,dto}.ts` + `frontend/src/modules/checklists/{types,constants,components/ChecklistComponentPalette}` + testes + `Kpis/*` + docs. Intocado: `prisma/schema`, `mobile/**` (a plumbagem
é backend-only; o fechamento mobile é a PR-08).

## 2026-08-02 - P-DOSSIE-PAGE-TABS (página fallback do dossiê alinhada às abas do modal)

### Resultado

| KPI | Valor |
|-----|-------|
| Flutter Tests | 835 / 835 (inalterado) |
| Backend Tests | 2110 / 2110 (inalterado; frontend-only) |
| Frontend Smoke | 997 / 997 (inalterado; reuso de painéis já testados) |
| Blocos Entregues | 129 (128 → 129) |

Limpeza de pendência. A **`ProcessoDossiePage`** (`/patios/processos/:id`, fallback/deep-link direto) passou a
renderizar, no fluxo empilhado, o **`CustodyHistoryPanel`** (Histórico de Custódias, PR-09) após a Linha do Tempo e o
**`ChecklistRunsPanel`** (Checklist do Guincho, PR-08, gated por `checklist_runs:read`) após a Vistoria — **reusando os
mesmos painéis puros e hooks** (`useCustodyHistory`/`useProcessChecklistRuns`) do modal, com o **mesmo gating** já
aprovado pela junta do PR-08/09. A página fica consistente com o modal e com o documento de impressão. Frontend-only;
`check`/`test:smoke` (997)/`build` verdes. Sem novo teste (os painéis puros já têm cobertura).

## 2026-08-02 - FIX P-CHK-TEMPLATE-PRISMA-V7 (bug REAL de produção no Prisma v7 + bug irmão createRun)

### Resultado

| KPI | Valor |
|-----|-------|
| Flutter Tests | 835 / 835 (inalterado) |
| Backend Tests | 2110 / 2110 (2107 → 2110, +3) |
| Frontend Smoke | 997 / 997 (inalterado; backend-only) |
| Blocos Entregues | 128 (127 → 128) |

**Limpeza de pendência antes do CHECKLIST P1.** `createTemplate` / `updateTemplate` / **`createRun`** passavam
`tenant_id` **explícito** nos nested-creates de componente/resposta — `tenant_id` é **relation-scalar compartilhado**
(a relação `template`/`run` de FK composta, setada pelo pai, + a relação `tenant`), que o **Prisma v7 (7.8.0) rejeita
no runtime** com `Unknown argument tenant_id`. Consequência REAL: `POST /tenant/checklists` e `POST /checklists/:id/runs`
(com `answers`) dariam **HTTP 500** sob persistência prisma — **mascarado** porque toda a suíte de checklist roda em
`CORE_SAAS_PERSISTENCE=memory`. **Fix:** omitir `tenant_id` (o Prisma infere do pai). O **bug irmão** (`createRun`,
mesmo arquivo, atrás de endpoint web vivo) foi achado pela **junta `agente-dba-guardião`** e fechado no mesmo PR.

**+3 test() DB-gated** (`tests/checklist-template-prisma-db.test.ts`) que **provam o bug**: FALHAM contra o código
antigo com o `Unknown argument tenant_id` exato e PASSAM contra o corrigido; RAW-verificado que o `tenant_id` do
componente/resposta é o do pai (tenant do ator), sem vazamento cross-tenant. Suíte de checklist em memória **32→35**,
zero regressão; tsc/build limpos. **Sem migração** (read-only no schema). Varredura da junta: nenhum outro
nested-relation-create com relation-scalar compartilhado no codebase. Pendência sistêmica registrada:
**P-CHK-PRISMA-CLIENT-TYPING** (o repo descarta os tipos gerados do Prisma → `tsc` não pega esses bugs).

## 2026-08-02 - OMEGA-VID-PR-10 (Imprimir/Salvar o dossiê — FECHA a rodada Ω-VID)

### Resultado

| KPI | Valor |
|-----|-------|
| Flutter Tests | 835 / 835 (inalterado) |
| Backend Tests | 2107 / 2107 (inalterado; frontend-only) |
| Frontend Smoke | 997 / 997 (991 → 997, +6) |
| Blocos Entregues | 127 (126 → 127) |

**Imprimir/Salvar o dossiê do veículo** (decisão do dono: "salvar e imprimir entram no jogo; e-mail e WhatsApp
não"). `window.print()` cobre os dois — o diálogo do navegador oferece "Salvar como PDF". O **`DossiePrintDocument`**
(novo, puro) **empilha todas as seções read-only** do dossiê num documento único (diferente do modal, que mostra uma
aba por vez): cabeçalho (placa + status + autoridade + local) → Identificação e origem → Vistoria de recepção →
Integridade → Linha do tempo → Checklist do guincho (se `checklist_runs:read`) → Histórico de custódias → Guia de
débitos. **Sem ações** (liberação/leilão/FSM/lançar-encargo): é um **documento**, não a tela de operação. O botão
**"Imprimir / Salvar"** (ícone Printer) fica no cabeçalho do modal, escondido na impressão (`.dossie-print__hide`); o
documento vive num **portal no `<body>`** (`display:none` em tela, revelado só no `@media print`, fora do modal para
não herdar o overflow/sticky na paginação). O `@media print` esconde todo o app e imprime só o documento, com
`break-inside: avoid` nos cards. §allowlist: só placa/estado/local/datas/situações — nenhum id/UUID.

**+6 smoke** (`patios-dossie-print.smoke.test.tsx` — inclui carimbo de emissão/org e estado "Preparando…" do rework da junta). Frontend-only (backend/Flutter inalterados, D-KPI-PER-PR §C3.3).
Escopo: `frontend/src/modules/patios/processes/components/{DossiePrintDocument,VehicleDossieModal}.tsx` +
`frontend/src/styles/app.css` + testes + `Kpis/*` + docs.

**🏁 RODADA Ω-VID COMPLETA** (PR-00..10): o **dossiê do veículo de terceiro** como entidade de 1ª classe —
identidade unificada (PR-01..05) → clique-na-vaga abre o dossiê em modal grande com abas + deep-link (PR-06/07) →
Checklist do Guincho (PR-08) → Histórico de Custódias (PR-09) → Imprimir/Salvar (PR-10).

## 2026-08-01 - OMEGA-VID-PR-09 (aba "Histórico de Custódias" no dossiê + endpoint custody-history)

### Resultado

| KPI | Valor |
|-----|-------|
| Flutter Tests | 835 / 835 (inalterado) |
| Backend Tests | 2107 / 2107 (real CI, 0 skip; +10 desta fatia) |
| Frontend Smoke | 991 / 991 (984 → 991, +7) |
| Blocos Entregues | 126 (125 → 126) |

A aba **"Histórico de Custódias"** no `VehicleDossieModal` lista as **múltiplas passagens do MESMO veículo**
(identidade `ThirdPartyVehicleIdentity`) pelo pátio, via endpoint NOVO `GET /impound-processes/:id/custody-history`
(gate `impound:read` — a mesma do dossiê; a identidade é resolvida **server-side** e nunca sai no DTO). **Full-stack**:
módulo de leitura novo `impound.custody-history.*` (espelho do `checklist-link`, sem acoplar o domínio central) +
frontend (aba em `DOSSIE_TABS` base após "Linha do Tempo", `CustodyHistoryPanel` com a linha da custódia atual
destacada, `useCustodyHistory`/`adaptCustodyHistoryResponse`). §allowlist: o painel nunca renderiza `id`/`identity_id`.

**Junta 4/4** — coordenador-de-acessos **APROVADO**; dba-guardião, crítico-adversarial e cognição-visual
**APROVADO_CONDICIONADO**, condições fechadas antes do merge:
1. **dba (MÉDIA)** — a query prisma autoritativa só tinha cobertura em memória → **`tests/impound-custody-history-db.test.ts`**
   (DB-gated, **3/3 vivo**): agrupamento por `identity_id`, `entered_at DESC NULLS LAST` + desempate `created_at DESC`,
   join `yard`, sem-identidade, **isolamento cross-tenant sob RLS**. O dba já provara tudo vivo (PoC); o teste fixa como
   regressão.
2. **crítico (ALTA)** — KPIs → **atualizados no próprio PR**. **BAIXAs**: removido `processExists` redundante (vazio ⟺ 404,
   uma consulta a menos); `dossieTabsFor` por splice (robusto a novas abas).
3. **cognição-visual (MÉDIA)** — cópia do EmptyState descrevia caso que nunca cai no vazio → **reescrita honesta** (vazio =
   404/desatualizado); **BAIXA** 8 abas estouravam a faixa em viewport estreito → **`.ui-modal--lg .ui-tabs { overflow-x }`**.

**+7 smoke** (`patios-dossie-history.smoke.test.tsx`) **+10 backend** (7 memória + 3 DB-gated). Bateria completa verde
(backend `check`/`build`/`lint`; frontend `check`/`test:smoke`(991)/`build`; `impound-custody-history` 7 + DB 3 vivo).
Escopo: `src/modules/impound/impound.custody-history.*` + rota + `frontend/src/modules/patios/processes/**` +
`frontend/src/styles/app.css` + testes + `Kpis/*` + docs. **Intocados**: `prisma/schema`/migrations (read-only, reusa
colunas do PR-05), `mobile/**`, o gate (reusa `impound:read`). Pendência: **P-DOSSIE-PAGE-TABS** (página fallback não
reflete as abas do modal).

## 2026-08-01 - OMEGA-VID-PR-08 (aba "Checklist do Guincho" no dossiê — gate duplo + templateName)

### Resultado

| KPI | Valor |
|-----|-------|
| Flutter Tests | 835 / 835 (inalterado) |
| Backend Tests | 2086 / 2092 (2085 → 2086, +1) |
| Frontend Smoke | 984 / 984 (971 → 984, +13) |
| Blocos Entregues | 125 (124 → 125) |

A aba **"Checklist do Guincho"** no `VehicleDossieModal` exibe (**somente leitura** — o guincheiro preenche em campo
pelo app; decisão do dono "na web só visualização") os checklists vinculados ao processo de custódia, consumindo o
**AUTO-link do PR-05** via `GET /impound-processes/:id/checklist-runs` sob **gate DUPLO** (`impound:read` +
`checklist_runs:read`, `requirePermission` encadeado = AND; o **backend é a autoridade**). A UI **molda/esconde**:
`dossieTabsFor(canReadChecklist)` → **6 abas** sem a permissão, **7** com (aba inserida após "Vistoria de Recepção").
Novos: `useProcessChecklistRuns` (hook, denied em 403/401/falta-local, 404→[], auto-refresh), `ChecklistRunsPanel`
(painel puro), `adaptChecklistRunsResponse` + rótulos/tons PT-BR. §allowlist: o painel **nunca** renderiza
`templateId`/`relatedEntityId` (UUID).

**Junta 3/3** — coordenador-de-acessos **APROVADO** (gate duplo real, `field_technician` passa / `field_dispatcher`
barrado 403, P-IMPOUND-CHK-VISIBILITY ratificada); crítico-adversarial e cognição-visual **APROVADO_CONDICIONADO**.
Achados aplicados antes do merge:
1. **MÉDIA (auto-cura)** — aba morta/branca se a permissão cai com o modal aberto: `effectiveTab` degrada para a
   Visão Geral (nunca painel vazio sem `aria-label`).
2. **BAIXA (refresh)** — falha de auto-refresh **não** apaga a tabela carregada: aviso inline não-destrutivo acima
   dela, em vez de trocar tudo por um Alert.
3. **MÉDIA (identidade da linha)** — o backend **estendeu** `ChecklistRunSummary` + DTO + repo prisma com
   **`templateName`** (`select { name }` — §allowlist-safe, rótulo público que o guincheiro já vê); a linha agora
   mostra o **nome do formulário**, não um rótulo genérico repetido (`D-Ω-VID-PR08-TEMPLATE-NAME`).
4. **MÉDIA (cor)** — chip "Aguardando ciência" = roxo/`pending` **ratificado** (`D-CHK-RUN-STATUS-TONE`: espera ≠
   alerta; idiomático no DS).

**+13 smoke reais** (`patios-dossie-checklist.smoke.test.tsx` + split no modal 6/7-abas) + **+1 backend**
(`tests/impound-checklist-link.test.ts` 9→10: DTO expõe `templateName` e **nunca** `tenant_id`). Bateria completa
verde: backend `check`/`build`/`lint`, frontend `check`/`test:smoke`/`build`; relacionados `impound-trigger-durability`
(28), `mobile-backend-contracts` (22). Escopo: `frontend/src/modules/patios/**` + `src/modules/impound/impound.checklist-link.*`
+ testes + `Kpis/*` + docs. **Intocados**: rotas/gate (já existiam), `prisma/schema`/migrations, `mobile/**`.

## 2026-08-01 - OMEGA-VID-PR-07 (VehicleDossieModal: dossiê do veículo em modal grande com abas, frontend-only)

### Resultado

| KPI | Valor |
|-----|-------|
| Flutter Tests | 835 / 835 (inalterado; frontend-only) |
| Backend Tests | 2085 / 2091 (inalterado; frontend-only) |
| Frontend Smoke | 971 / 971 (954 → 971, +17) |
| Blocos Entregues | 124 (123 → 124) |

O **VehicleDossieModal** apresenta o dossiê do veículo num `Modal size="lg"` (variante do PR-06) com **abas**
(`Tabs` do design-system), aberto ao clicar na **vaga ocupada** do `OccupancyMap` (não navega mais) e por
**deep-link `?dossie=<processId>`**. As **6 abas** reorganizam as seções que a `ProcessoDossiePage` empilhava —
Visão Geral (`ProcessIdentityCard`: identificação/origem + local de guarda), Vistoria de Recepção
(`InspectionSection`), Linha do Tempo (`IntegritySeal` + `ProcessTimeline`), Débitos (`GuiaDebitos`), Liberação
(`LiberacaoPanel`), Leilão/Liquidação (`AuctionPanel` + `LiquidacaoPanel`). As abas **Checklist do Guincho** (PR-08)
e **Histórico de Custódias** (PR-09) ainda **não** entram — a estrutura de abas só fica pronta.

Reúso sem duplicar: o hook novo **`useProcessDossie(processId, enabled)`** extrai a lógica de fetch
(getProcess + eventos/verify/vistoria em paralelo + join client-side pátio/vaga + auto-refresh) consumida pela
**página E pelo modal**; a `ProcessoDossiePage` foi refatorada para usá-lo com **comportamento inalterado** e segue
existindo em `/patios/processos/:processId` como **deep-link/fallback direto**. O `OccupancyMap` troca o `<Link>`
(ícone `ExternalLink`) por um **botão `onOpenDossie`** (ícone `FileText`) — sem `<Link>`/`href`; §allowlist mantido
(`currentProcessId` nunca como texto). Em `PatioDetailPage`, o estado do modal **é a query `?dossie=`** (fonte da
verdade; helpers puros `setDossieParam`/`clearDossieParam`): abrir empurra o param (botão-voltar fecha), fechar
remove com `replace`, montar com o param já preenchido **abre automaticamente**. O `Tabs` do design-system ganhou
`role="tab"` + `aria-selected` (aditivo).

**+17 smoke tests reais** (`patios-dossie-modal.smoke.test.tsx` = 15, `patios-dossie-deeplink.smoke.test.tsx` = 2)
+ `patios-mapa.smoke` migrado (3 testes de `<Link>`/`href` para o botão). Execução real: **971 pass / 0 fail / 0
skip** (sobre 954 do PR-06). Backend/Flutter **inalterados** (frontend-only, D-KPI-PER-PR §C3.3). Escopo:
`frontend/src/modules/patios/**` + `frontend/src/components/ui/index.tsx` (Tabs aria) + `frontend/package.json` +
`frontend/tests/**` + `Kpis/*`. **Intocados**: `src/**` (backend), `mobile/**`, abas Checklist(PR-08)/Histórico(PR-09).

**Junta de UI (cognição-visual + amplitude) → APROVADO;** 2 MÉDIAs aplicadas antes do merge: (i) **placa + status + abas
agora _sticky_** no topo do corpo scrollável do modal (`stickyHead` com `position: sticky; top: 0`) — em abas altas
(Débitos, Vistoria com galeria) a navegação por abas e a identidade do veículo não somem ao rolar; (ii) o
**`TransicaoFsmPanel`** (`impound:transition`) foi adicionado à aba **Visão Geral** — como a vaga do mapa deixou de
navegar para a página e passou a abrir _este_ modal, a ação de custódia da FSM passa a viver aqui também (mesmo
componente/props/`onDone` da página; card **"Somente leitura"** honesto para quem não tem a permissão). +1 smoke
(cobertura do painel na Visão Geral, com e sem permissão). BAIXAs (ARIA completa do Tabs, focus-trap transversal do
`Modal`, tokenização de hex do módulo pátios) registradas como pendências transversais fora do escopo do PR.

## 2026-08-01 - OMEGA-VID-PR-05 FIX-JUNTA (vistoria reconcilia identity_id — SPLIT da colisão-por-reuso, backend-only)

### Resultado

| KPI | Valor |
|-----|-------|
| Flutter Tests | 835 / 835 (inalterado; backend-only) |
| Backend Tests | 2085 / 2091 (2082 → 2085, +3) |
| Frontend Smoke | 950 / 950 (inalterado; backend-only) |
| Blocos Entregues | 122 (inalterado; fix dentro do PR-05) |

A junta do PR-05 **APROVOU_CONDICIONADO**; o **crítico-adversarial** provou por PoC 1 **MÉDIA** real: a
**colisão-POR-REUSO** (uma placa digitada errada na OS que casa **EXATAMENTE** o `plate_key` de uma identidade
existente de **OUTRO** veículo faz o processo do 2º veículo ser agregado sob a identidade do 1º — **UMA** identidade
passa a conter processos de **DOIS** veículos) **não tinha caminho de correção**: o banner `duplicateCandidates` só
dispara com ≥2 identidades ativas da mesma placa (a colisão-por-reuso produz UMA), e `merge`/`unmerge` **não fazem
SPLIT** — só restaria SQL manual (proibido, D-Ω-VID-01).

- **Conserto (o domínio-correto, D-Ω5P-REC-10 — a vistoria é a fonte de verdade da identidade):** quando a **vistoria
  de recepção** confirma a placa (`impound.service.saveInspection`), o serviço normaliza a placa confirmada
  (`parseConfirmedPlateKey` → `normalizePlateKey`; **sem** o guard estrito de seed-time — a vistoria corrige
  **INDEPENDENTE** do guard) e, no repositório, **na MESMA tx RLS** da vistoria, `reconcileIdentityFromConfirmedPlate`
  **resolve-ou-cria** a identidade da placa confirmada (REUSA `resolveOrCreateByPlateKey` do PR-05) e **RE-APONTA**
  `ImpoundProcess.identity_id` se diferir → **SPLITA** a agregação errada (o processo de Y sai da identidade de X).
- A identidade confirmada **sobe `PROVISIONAL` → `CONFIRMED`** (`updateMany` filtra `confidence='PROVISIONAL'` ⇒
  idempotente; satisfaz `identity_chk`/`canonical_biconditional_chk`). A identidade antiga (semeada errada) fica
  `PROVISIONAL`/intacta (órfã de processos = linha válida). **NÃO toca** FSM/hash-chain (`identity_id` é metadado, fora
  da cadeia) nem `mergeIdentities`/`unmergeIdentity`. Campo `confirmedPlateKey` OPCIONAL; **InMemory ignora** (prova
  autoritativa **DB-gated**, mesma política do `openFromRemovalAtomic` InMemory).
- **+3 test() DB-gated reais** em `tests/impound-trigger-durability.test.ts` (25 → 28): SPLIT vivo (placa confirmada
  ≠ semeada) / no-op idempotente (mesma placa 2×) / `PROVISIONAL`→`CONFIRMED`. Regressão impound + vehicle-identity +
  owner-portal + stock-custody **217 pass / 0 fail**. **SEM migração.**

Escopo: `src/modules/impound/{impound.service,impound.intake.types,impound.repository,impound-prisma.repository}.ts` +
`agent-orchestration/controle/decisoes.md` + testes + `Kpis/*` (backend-only). `pr`/`merge_commit`/`approved_head`
null na autoria.

---

## 2026-08-01 - OMEGA-VID-PR-05 (sweep: identidade + AUTO-link, backend-only)

### Resultado

| KPI | Valor |
|-----|-------|
| Flutter Tests | 835 / 835 (inalterado; backend-only) |
| Backend Tests | 2082 / 2088 (2064 → 2082, +18) |
| Frontend Smoke | 950 / 950 (inalterado; backend-only) |
| Blocos Entregues | 122 (121 → 122) |

Omega-VID PR-05 (**D-Omega-VID-05-SEED**) — fecha a corrida **"backfill 1× vs. sweep contínuo"** (achado #1 da junta de
arquitetura). Quando o sweep de reconciliação (`impound.reconcile`) abre um `ImpoundProcess` a partir de uma OS de
reboque concluída, ele agora, **na MESMA transação** (`openFromRemovalAtomic`): (a) resolve/cria a
`ThirdPartyVehicleIdentity` e grava `ImpoundProcess.identity_id`; (b) AUTO-linka os `ChecklistRun` da OS
(`ImpoundProcessChecklistLink`, `link_source='AUTO'`). É onde o dossiê do veículo e o checklist do guincho se encontram.

- **Semeadura (D-Omega-VID-05-SEED):** guard de forma sobre `normalizePlateKey(service_details.plate)` — 7
  alfanuméricos → resolve-ou-cria identidade `PROVISIONAL/unidentified=false/plate_key` **reusando a query byte-idêntica
  do backfill PR-03** (`confidence≠'MERGED'` `orderBy created_at asc`), então sweep e backfill convergem na mesma
  identidade agregadora; placa implausível/vazia → `PROVISIONAL/unidentified=true` com reason neutro (satisfaz
  `identity_chk`). O **processo** segue `vehicle_unidentified=true` (a identidade dele é confirmada só pela vistoria —
  D-Omega5P-REC-10). Efeito-de-domínio **SISTEMA** (`created_by=NULL`, sem re-checar permissão).
- **Fail-closed por construção** (não fail-open): identidade + link ficam na MESMA tx da abertura — identity-create SEM
  unique (sem P2002/25P02), FK/CHECK satisfeitos na própria tx, link por `upsert ON CONFLICT` idempotente. Se o INSERT
  do processo colidir no índice PARCIAL único (`duplicate_service_order`), a tx **inteira** reverte (identidade+link
  inclusos) ⇒ **nenhum órfão**.
- **SEM migração** — as tabelas/colunas já existem (PR-02/04); `custody_events.type` é TEXT livre sem CHECK (não há o
  problema que mordeu o PR-A). **FSM/hash-chain/`resolveTransition`/`mergeIdentities`/`unmergeIdentity`/script de
  backfill INTOCADOS.**
- **+18 test() reais** em `tests/impound-trigger-durability.test.ts` (7 → 25): 3 unit InMemory (cria→reusa, MERGED
  excluído do reuso, unidentified sem plate_key) + 15 DB-gated contra Postgres real (identity_id com placa confiável /
  provisional-unidentified / guard de placa / 2º tick idempotente / reuso da mesma placa / AUTO-link 1·2·0 runs / link
  idempotente / duplicate_service_order concorrente sem órfãos / run cross-tenant / verifyChain com identity_id / N
  ticks concorrentes / convergência backfill↔sweep / isolamento entre tenants).

Escopo: `src/modules/impound/**` + `src/modules/vehicle-identities/{vehicle-identity.repository,
vehicle-identity-prisma.repository,vehicle-identity.types}.ts` + testes + `Kpis/*` (backend-only; `mobile/flutter_app/Kpis/*`
**não** tocado). `pr`/`merge_commit`/`approved_head` null na autoria (backfill pós-merge).

## 2026-08-01 - CHK-DISPATCH-CREATE-PR-B (lado Flutter)

### Resultado

| KPI | Valor |
|-----|-------|
| Flutter Tests | 822 / 822 (807 → 822, +15) |
| Backend Tests | 2064 / 2070 (inalterado; Flutter-only) |
| Frontend Smoke | 950 / 950 (inalterado; Flutter-only) |
| Blocos Entregues | 121 (120 → 121) |

PR-B (D-CHK-DISPATCH-CREATE) — **lado Flutter do conserto do data-loss de checklist**, consumindo o backend PR-A já
mergeado. O guincheiro deixa de **criar** a run localmente e passa a **baixar** a run pré-criada pelo despacho:

- `resolveRunForWorkOrder` + novo remoto `fetchRunsForWorkOrder` (`GET /api/v1/mobile/checklist-runs?workOrderId[&checklistId]`,
  parse tolerante snake/camel, desambigua por `checklistId` quando há >1 run) grava o `server_run_id` na run local (Drift)
  e responde **contra** ela; `getOrStartRun` **não enfileira mais `runCreate`**.
- Lista vazia → estado **"aguardando despacho"** (sem run local, sem `runCreate`; a lista vazia **pode ser falha de
  provisão**, não só ausência). Offline → run local usável + **carimbo do `server_run_id`** nas ações já enfileiradas
  quando o download chega.
- **Sync destravado** do ciclo completo menos `runCreate` (elegibilidade exige `server_run_id`). **Codec canônico**:
  `marker`/`divergence`/`acknowledgement`/`attachment` → tipos+payloads que o backend PR-A aceita (antes caíam no
  genérico e o efeito sumia).
- **Foto por multipart** (`POST /mobile/checklist-runs/:runId/attachments`): blob durável offline-first +
  `ChecklistAttachmentUploadService` plugado no auto-sync; migração Drift **aditiva** 12→13.

Bateria: `dart format` 0-changed, `flutter analyze` No issues, suíte real **822/0-falha/0-skip** (Flutter 3.41.6);
regressões b088/b102/b092/b118 verdes; b085 render preservado; `pubspec`/lock intocados. Escopo: `mobile/flutter_app/**`
+ `Kpis/*` (dual); `src/**` intocado. `pr`/`merge_commit`/`approved_head` null na autoria (backfill pós-merge).

## 2026-07-29 - FIX-NAV-MENU-PLATFORM-JWT

### Resultado

- Corrigido o `500 AUTHORIZATION_CONTEXT_ERROR` de
  `GET /api/v1/navigation/menu?scope=platform` sob JWT real e persistência Prisma.
- Causa raiz comprovada: `platform` é o identificador do plano de controle, não um
  `Tenant` UUID. Os routers `/me` e `/sessions`, montados no prefixo amplo `/api/v1`,
  interceptavam a rota irmã e tentavam usá-lo em consultas tenant-scoped; o PostgreSQL rejeitava o
  cast. Ambos agora aplicam seus middlewares somente aos próprios prefixos. O `data[0]`
  era apenas a falha consequente do teste depois do 500.
- A fronteira RBAC preserva para o plano de controle as permissões canônicas já
  derivadas do JWT assinado somente por opt-in do router de navegação. Os outros
  consumidores permanecem fail-closed; tenants UUID continuam obrigatoriamente
  resolvidos pelo RBAC persistente. `platform` não conta como tenant ativo para itens
  `tenantOnly`. A navegação lê JWT e headers legados da mesma fonte normalizada.
- O teste protegido `navigation-menu-routes.test.ts` passou **7/7** com Prisma real e
  permaneceu intocado. Três testes adversariais cobrem `super_admin`, `operator`/
  `viewer` e tenant real sob JWT.

### KPIs

- Backend completo após rebase em Ω5P PR-18a: **1900 pass / 0 fail / 6 skip
  (1906 total)**, execução real. Um gate DB que o snapshot CI-memory anterior
  contava como skip executou no ambiente Prisma local.
- Frontend smoke **937/937** e Flutter **807/807**, carregados por não serem tocados.
- `blocks_completed`: **111**, carregado de Ω5P PR-18a e inalterado por se
  tratar de correção, não feature.
- Conflito herdado registrado: `Kpis/kpis-latest.json` da `main` traz
  `mvp_vendavel=88%`, enquanto a entrada histórica de Ω5P PR-18a registra 92%.
  Este fix preserva o snapshot latest de 88% e não consolida a divergência.
- `pr`: **#307**; `merge_commit` e `approved_head`: `null` na autoria; status
  `published_per_pr`.

## 2026-07-28 - GOV-CODEX-SKILLS-ADAPTERS

### Resultado

- Criados `agents/openai.yaml` para as 8 skills que ainda tinham apenas `SKILL.md`:
  `blockchain-developer`, `cloud-architect`, `cloud-devops`, `flutter-expert`,
  `payment-integration`, `saas-multi-tenant`, `skill-creator` e `ui-ux-pro-max`.
- Cada adapter declara `display_name`, `short_description` e `default_prompt` derivados
  do frontmatter/conteúdo da própria skill; o prompt padrão menciona explicitamente
  `$<skill-name>`.
- Cinco skills estavam presentes somente como arquivos não rastreados no checkout local.
  Elas foram incorporadas à origem canônica `.claude/skills/` nesta branch isolada, sem
  alterar ou apagar os originais; `node scripts/sync-agent-skills.mjs` reconstruiu o
  espelho `.agents/skills/`.
- A metadata comunitária (`risk`, `source`, `date_added`, `category`) foi preservada sob
  a chave portátil `metadata`; as 11 skills passam em `quick_validate.py`.
- `node scripts/sync-agent-skills.mjs --check`: **OK — 11 skills, 36 arquivos,
  espelho idêntico**.

### KPIs

- Governança/tooling, sem código ou teste de produto: backend **1871/1877**,
  frontend smoke **937/937** e Flutter **807/807** carregados do último valor oficial.
- `blocks_completed`: **110**, inalterado pelo precedente Ω-GOV/JUNTA-MAPAS.
- `mvp_demo`: **99%**; `mvp_vendavel`: **88%**, inalterados.
- `pr`: **305**; `merge_commit` e `approved_head`: `null` na autoria e recebem
  backfill pós-merge.

## 2026-07-21 - ONDA 1: Ligar Aprovacoes a dados reais (com pesquisa de concorrentes)

### Resultado

- **Método pedido pelo dono** (agentes temporários com pesquisa/concorrentes): `agente-pesquisador-web` (14 fontes — ServiceTitan
  AP / SAP FSM / Salesforce / Jobber / Housecall / ServiceMax → **PD-007** em docs/omega-pd.md) + `planejador-mestre` (recon) →
  dev → junta.
- **Achado:** o backend E o `approval.service.ts` (frontend) JÁ existiam; só as 2 páginas eram casca. `ApprovalsPage` (fila) +
  `ApprovalDetailPage` (detalhe) agora consomem `GET /approvals/pending` e `/approvals/:approvalId` (+1 função aditiva
  `getOperationalApproval`; hook `useApprovalsQueue` clonando `useAuditEvents`).
- **D-007:** SÓ os **13 campos reais** do DTO — **REMOVIDOS** valor R$ / APR-code / nome-solicitante / urgência / "acima da
  alçada" / threshold / centro-de-custo / itens / trilha-3-passos / "Solicitar revisão" / tabs-histórico (o DTO não os tem;
  `APPROVAL_LIMITS.md` é só principiológico). Idade **"Pendente há X"** = tempo REAL de `requested_at` (não deadline). **Recusa
  exige motivo** (bloqueio client-side + 400 backend); approve `note` opcional. Gating `canDecide = cancel||approve` (paridade
  `WorkOrderDetailPage`); backend é a autoridade (403 honesto). Contrato-texto preservado.
- Junta: **analizador + coordenador-de-acessos + cognicao-visual APROVADO** (só BAIXA; acentuação de mock sanada). Gap RBAC
  (UI usa `work_orders:approve` ausente do catálogo) registrado no PD-007 (fora do escopo). **SEM migração.**

### KPIs

- `frontend_smoke_tests` **660 -> 673** (+13: approvals.smoke). `blocks_completed` **70 -> 71**.
- `backend_tests` 1296/1302, `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88% — **INALTERADOS**. Backfill #259: `pr`/`merge_commit`/`approved_head` = ad4a9b5.

## 2026-07-21 - M-7 SLA real PR-B (frontend countdown) FECHA a Fase 2 do Mapa

### Resultado

- **Countdown HONESTO no Mapa Operacional.** O `operations-map.adapter` troca o SLA-PROXY por **"vence em {X}"** / **"vencido há
  {X}"** SOMENTE quando `slaDueAt` (do PR-A) é real e parseável; senão **mantém o proxy honesto de Fase 1 INTACTO** ("Agendado
  para"/"Aberto há"). `formatDuration` extraído e reusado por `formatLastSeen` (fonte única). `incomingCallSlaProxyTime` =
  `slaDueAt ?? scheduledFor ?? createdAt` (puro/determinístico; deadline real = chave primária de urgência dentro da prioridade).
- Tom de urgência via `data-tone` (danger vencido / warning <30min / info futuro / neutral proxy) + CSS. Propagação de tipos
  (pin/withoutLocation/incoming); consumidores: fila + popup de alocação. **Landmines respeitados** (mock legado
  `work-orders/types.ts:25` e `DispatchConsole` NÃO tocados). **Espelho MapLibre↔Google intacto** (canvas não tocado;
  `slaDueAt` fora das properties do pin); LGPD sem coordenada.
- Junta: **avaliador-mapas APROVADO** (honestidade/espelho/LGPD) + **analizador APROVADO** + **cognicao-visual APROVADO** (só
  BAIXA hex-vs-token seguindo a convenção do rail). +10 testes (superfície SLA 5→13, >2×). `kb-mapas.md` atualizada.
- **M-7 SLA real COMPLETO — Fase 2 do Mapa FECHADA.** ETA por rota real NÃO foi feita (o dono dispensou o serviço pago;
  distância/tempo seguem por **estimativa honesta**).

### KPIs

- `frontend_smoke_tests` **650 -> 660** (+10: M-7 countdown). PR web-only.
- `backend_tests` 1296/1302, `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88%, `blocks_completed` 70 — **INALTERADOS**
  (M-7 é 1 feature, contada no PR-A). Backfill #258: `pr`/`merge_commit`/`approved_head` = 046939f.

## 2026-07-21 - M-7 SLA real PR-A (migracao + backend) sla_due_at aditivo

### Resultado

- **DONO AUTORIZOU** a migração aditiva `sla_due_at` (up/down via dba-guardião). Plano J-MAPAS-8 (2 PRs: **PR-A** migração+backend,
  depois **PR-B** frontend countdown).
- **MIGRAÇÃO `20260817000000_add_sla_due_at`:** `ALTER TABLE work_orders ADD COLUMN sla_due_at TIMESTAMPTZ(6)` — **aditiva/nullable**,
  sem backfill, sem índice, **RLS HERDADA** (coluna nova não re-policy). **dba-guardião PROVOU up/down/re-up no Postgres vivo**
  (17 linhas + data_md5 intactos em todo o ciclo, RLS force+policy `work_orders_tenant_isolation` preservadas, idempotente).
- **BACKEND:** `slaDueAt` setável no create/update (reusa `parseOptionalDate` → 400 `invalid_date`; **SEM regra de futuro/campo-
  cruzado** — OS pode nascer vencida, evita fabricação) → prisma repo → **`toWorkOrderListDto` + `toWorkOrderDto` expõem
  `slaDueAt: string|null`** (ISO — a CHAVE que alimenta o Mapa). §2.8 dado funcional, `changedFields` só a chave; **404 cross-tenant
  provado**; nenhuma permissão nova (`work_orders:create/update`).
- Junta: **agente-dba-guardião APROVADO** (migração provada) + **analizador APROVADO** + **coordenador-de-acessos APROVADO**.
  Ata `J-MAPAS-8-sla-real.md`.

### KPIs

- `backend_tests` **1289 -> 1296** (+7: tests/work-order-sla.test.ts; suíte memória 1302 testes 1296 pass 0 fail 6 skip).
- `blocks_completed` **69 -> 70** (+1 bloco-feature backend do M-7).
- `frontend_smoke_tests` **650** (inalterado — PR-A backend-only; o countdown honesto é o PR-B).
- `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88% — **INALTERADOS**. Backfill #257: `pr`/`merge_commit`/`approved_head` = 0450ae9.

## 2026-07-21 - PR-SCALE-1 (RBAC) purchase_orders/reports no catalogo + gating dos mock shells

### Resultado

- **DONO AUTORIZOU EXPLICITAMENTE:** "adicionar purchase_orders/reports ao catalogo e conceder conforme a matriz" (destravou o
  guardrail de seguranca que bloqueava expansao de RBAC por inferencia).
- Adicionadas ao catalogo: `purchase_orders:read`, `purchase_orders:create`, `reports:read`. **Concessoes CONFORME o RBAC_MATRIX
  linha 48 "Purchasing"** (NAO o espelho inventory_items — a junta pegou o sub-provisionamento e reconciliei a matriz, §A2
  **D-SCALE-RBAC-PURCHASING**):
  - **create** → manager/operator/inventory (+admins) — "request" = submeter/criar a requisicao.
  - **read** → manager/operator/finance/inventory/auditor/support/viewer (+admins).
  - **NONE** → field_technician/field_dispatcher/technician (Purchasing=none p/ campo/despacho).
  - `reports:read` **amplo** (linha 55, todos os papeis com escopo).
- **Gating de UI dos mock shells:** DispatchConsole (Novo despacho/Despachar/Atribuir por `field_dispatch:create`; Alocar reforco
  por `:reassign`) + Pedidos (Novo pedido por `purchase_orders:create`). `seed.ts`: 3 descricoes PT-BR. `core-saas.test.ts`:
  `expectedPermissionCatalog` espelhado (deepEqual ordem-sensivel, NAO enfraquecido) + asseroes de reforco por papel.
- Junta: **coordenador-de-acessos APROVADO** (grants = matriz exata, zero escalada) + **agente-ci-doutor APROVADO** (26/26,
  0 falha nova) + **validador-mestre** (ALTA operator + MEDIA support **SANADAS** pela reconciliacao). Registrado
  **P-PURCHASE-ORDERS-BACKEND-GATE** (gate server-side nasce com o endpoint de Pedidos/Relatorios). **SEM migracao de schema**
  (so seed DATA + catalogo TS).

### KPIs

- `backend_tests` **1289/1295** (core-saas 26/26 com as 3 permissoes novas — asseroes em bloco existente, sem novo `test()`).
- `frontend_smoke_tests` **650/650** (gating nao coberto por smoke — telas mock; inalterado).
- `blocks_completed` **68 -> 69** (+1 bloco-feature de RBAC).
- `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88% — **INALTERADOS**. Backfill #256: `pr`/`merge_commit`/`approved_head` = 179b52c.

## 2026-07-21 - WS-SCALE-8TELAS PR-SCALE-5c (platform tenant detail) Detalhe da Organizacao real

### Resultado

- **Detalhe da Organizacao ligado a endpoint REAL por org.** Antes fabricava (nome fixo "Techsolutions BH", STATS/CONTRACTED/
  HEALTH/USERS hardcoded) e **IGNORAVA o `:tenantId`** (mesmo mock p/ qualquer org).
- **BACKEND novo:** `GET /api/v1/platform/tenants/:tenantId/detail` → `{id,name,status,createdAt,moduleCount,modules[],users[]}`.
  Tenant por id + **usuarios via `listUsersForTenant` (withTenantRls do proprio tenant → isolamento por construcao)** + modulos do
  catalogo; gated **platform-only**; `roleLabel` PT-BR na fronteira (§3); **404 honesto** p/ org inexistente; persistence-aware;
  DTO §2.8 SEM mrr/uptime/health.
- **FRONTEND:** le `useParams().tenantId`, consome via service+hook+adapter (clone do overview); header nome/status/criada em +
  stats reais (usuarios / modulos habilitados = `filter(enabled)`) + secoes Modulos e Usuarios reais; **MRR/uptime/saude OMITIDOS**
  (selo §7); **§3 "Organizacao" nunca "Tenant"**; id nunca exibido (§2.8); estados §7 (loading / 403 / **404 "Organizacao nao
  encontrada"** / fallback).
- Junta BACKEND: **coordenador-de-acessos APROVADO** (isolamento + §2.8 + PII by-design provados) + **analizador APROVADO**. Junta
  FRONTEND: **analizador + cognicao-visual + coordenador-de-acessos APROVADO**. So BAIXA (moduleCount→filter sanado). **ZERO migracao.**

### KPIs

- `backend_tests` **1282 -> 1289** (+7: tests/platform-tenant-detail.test.ts; suite memoria 1295 testes 1289 pass 0 fail 6 skip).
- `frontend_smoke_tests` **643 -> 650** (+7: platform-tenant-detail smoke).
- `blocks_completed` **67 -> 68** (+1 agregado-feature real de detalhe de org).
- `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88% — **INALTERADOS**. Backfill #255: `pr`/`merge_commit`/`approved_head` = 0e6a741.

## 2026-07-20 - WS-SCALE-8TELAS PR-SCALE-5b (platform Health) Saude do Sistema = parada honesta

### Resultado

- **Correcao de integridade (D-007 / §2.8 / §3).** A tela "Saude do Sistema" era **100% telemetria de infra FABRICADA**
  (latencia p95 128ms, 0 erros 5xx, fila 34, uptime 99,98%, status de 6 servicos incl. "Redis Degradado"). Nao ha stack de
  **observabilidade** (coleta de metricas + healthchecks reais) nesta versao.
- Reescrita como **PARADA HONESTA** (§7 "Monitoramento em preparacao") **sem numero/status fabricado** — explica que as metricas
  de infra dependem de observabilidade, habilitada apos a ativacao cloud (Onda 5-6). Corrigido tambem o titulo **"Health do
  Sistema" -> "Saude do Sistema"** (§3, sem termo tecnico em ingles na UI). Frontend-only, sem backend.
- Registrado **P-PLATFORM-HEALTH-OBSERVABILITY** (monitoramento real = trilha de infra futura) e **P-PLATFORM-TENANTDETAIL-REAL**
  (follow-up: detalhe por org ainda mock).

### KPIs

- `frontend_smoke_tests` **641 -> 643** (+2: platform-health-honest-stop). PR web-only.
- `backend_tests` 1282/1288, `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88%, `blocks_completed` 67 — **INALTERADOS**.
  Backfill #254: `pr`/`merge_commit`/`approved_head` = 0cbc70d. Deste PR null na autoria.

## 2026-07-20 - WS-SCALE-8TELAS PR-SCALE-5a (platform overview) Visao Geral da Plataforma com agregado real

### Resultado

- **Visao Geral da Plataforma ligada a um AGREGADO CROSS-TENANT REAL.** Antes fabricava (48 orgs / 2.184 usuarios / R$ 312k MRR /
  99,98% uptime / grafico MRR / feed de atividade) TANTO no front (consts) QUANTO no backend (repo in-memory).
- **BACKEND novo:** `GET /api/v1/platform/overview` → `{activeOrgs, totalOrgs, totalUsers, orgs[]}`. Lista tenants reais (tabela
  `tenants` sem RLS) + conta usuarios por org via **`withTenantRls(t.id)`** (a tabela `users` tem FORCE RLS → isolamento por
  construcao, NUNCA um `groupBy` cross-tenant). Gated **platform-only** (`requirePlatformPermission`); **persistence-aware**
  (memoria→vazio em teste, prisma→real); DTO **§2.8 allowlist** SEM `mrr`/`uptime`/`apiCalls`/`storageGb` (OMITIDOS, nao fabricados).
- **FRONTEND:** consome via service+hook+adapter (clone do audit); KPIs reais (organizacoes ativas / usuarios totais) + tabela de
  organizacoes real (nome/status/usuarios/modulos/criada em); **MRR/uptime/atividade OMITIDOS** com selo §7 honesto (nao empobrece
  a tela bespoke); `id` so p/ link (§2.8); **§3 "Organizacao", nunca "Tenant"**; estados §7 completos; a11y (MEDIA do span
  "Ver todas" → button).
- Junta BACKEND: **coordenador-de-acessos APROVADO** (isolamento provado: gate platform-only + withTenantRls por org, tenant JWT→403)
  + **analizador APROVADO**. Junta FRONTEND: **analizador + cognicao-visual + coordenador-de-acessos APROVADO**. **ZERO migracao.**
- **Health = parada honesta** (telemetria de infra sem fonte, Onda 5-6) → PR-SCALE-5b.

### KPIs

- `backend_tests` **1276 -> 1282** (+6: tests/platform-overview.test.ts; suite memoria 1288 testes 1282 pass 0 fail 6 skip).
- `frontend_smoke_tests` **635 -> 641** (+6: platform-overview smoke).
- `blocks_completed` **66 -> 67** (+1 agregado-feature real de plataforma).
- `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88% — **INALTERADOS**. Backfill #253: `pr`/`merge_commit`/`approved_head` = e0e0187.

## 2026-07-20 - WS-SCALE-8TELAS PR-SCALE-4 (fieldOperators) Operadores de Campo ligado ao dado real

### Resultado

- **Tela "Operadores de Campo" LIGADA AO DADO REAL** de localizacao/status. Antes FABRICAVA operadores ("Carla Mendes /
  8 em campo"). Agora **REUSA `getLatestFieldLocations`** (mesma fonte `/field-locations/latest` do Mapa) via service+hook+
  adapter clonando `useAuditEvents`; reusa os helpers do Mapa (formatLastSeen / getFieldLocationStatusLabel / Tone).
  **SEM backend novo, SEM migracao, SEM RBAC novo.**
- **LGPD:** `FieldOperatorRow` montado por **selecao EXPLICITA de campos** — **ZERO lat/lng** no tipo/JSX/CSV/log (o teste
  prova a ausencia mesmo com coordenada real na origem). So mostra frescor ("ha X min") + status.
- **D-007:** KPIs por **4 baldes** que particionam EXAUSTIVAMENTE os 8 status reais do enum (Disponiveis / Em atendimento /
  Em pausa / Fora de operacao; soma = total, nada inventado); colunas OPERADOR/EQUIPE/OS ATUAL/ULTIMA POSICAO/STATUS; botao
  falso "Convidar operador" **REMOVIDO** (sem endpoint); Exportar CSV so dado real sem coordenada. Estados §7 (loading/fallback/
  vazio); chip stale ambar.
- Junta **UNANIME**: analizador APROVADO + **avaliador-mapas APROVADO (LGPD, 0 condicao)** + cognicao-visual APROVADO (so BAIXA
  herdados do TablePage compartilhado).

### KPIs

- `frontend_smoke_tests` **631 -> 635** (+4: field-operators smoke). PR web-only.
- `backend_tests` 1276/1282, `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88%, `blocks_completed` 66 — **INALTERADOS**.
  Backfill #250: `pr`/`merge_commit`/`approved_head` = 47f0943. Deste PR null na autoria.
- (Chore #251 politica de limpeza + #252 fix do script: docs/script, SEM entrada de KPI — nao alteram codigo/teste de app.)

## 2026-07-20 - WS-SCALE-8TELAS PR-SCALE-3 (auditTenant) Auditoria ligada ao audit-log real

### Resultado

- **Tela "Auditoria da organizacao" LIGADA AO DADO REAL.** Antes FABRICAVA eventos ("Carla Mendes / Concluiu OS-2891") e
  KPIs ("312 eventos / 84 logins"). Agora consome **`GET /api/v1/audit-events`** (endpoint JA existente, gate `audit.read`)
  via service+hook+adapter clonando o padrao work-order-timeseries. **SEM backend novo, SEM migracao, SEM RBAC novo.**
- **§2.8:** `AuditEventView` NAO inclui `tenant_id` (dropado na fronteira; teste prova nao-vazamento mesmo com tenant secreto
  na entrada). **D-007:** KPIs so honestos derivados da lista (Eventos carregados / Atores distintos / Acoes distintas /
  Evento mais recente); colunas QUANDO/ATOR/EVENTO (coluna "RESULTADO" fabricada removida); "Exportar CSV" so eventos reais
  (desabilitado quando vazio).
- **Estados §7:** loading(skeleton) / forbidden(**403 honesto** "Acesso nao permitido") / fallback(alerta) / vazio; auto-refresh
  gated por `!forbidden` (nao martela o gate apos 403).
- Junta: **analizador APROVADO + cognicao-visual APROVADO** (ALTA sanada: label "AÇÃO" colidia com RIGHT_ALIGNED -> renomeada
  "EVENTO") **+ coordenador-de-acessos APROVADO** (tenant_id nao vaza, 403 honesto, guard /audit inalterado). Follow-ups nao
  bloqueantes em `P-AUDIT-FOLLOWUPS` (nome do ator, DTO backend sem tenant_id, assimetria guard×backend).

### KPIs

- `frontend_smoke_tests` **626 -> 631** (+5: audit-events smoke). PR web-only.
- `backend_tests` 1276/1282, `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88%, `blocks_completed` 66 — **INALTERADOS**.
  Backfill #249: `pr`/`merge_commit`/`approved_head` = 20bcf45. Deste PR null na autoria.

## 2026-07-20 - WS-SCALE-8TELAS PR-SCALE-2 (invoices/NF-e) Parada fiscal honesta (correcao D-007)

### Resultado

- **Correcao de INTEGRIDADE (D-007 / §2.8):** a tela **Faturas** FABRICAVA NF-e — empresas ("Industria Alfa"), valores
  ("R$ 24.800") e contadores ("128 emitidas"/"121 autorizadas") TODOS inventados. Reescrita como **PARADA FISCAL HONESTA**:
  a emissao de NF-e exige integracao externa (certificado A1/A3 + SEFAZ, docs/scale-roadmap.md Onda 2/9), disponivel so apos
  a ativacao cloud. Card honesto (ShieldCheck + explicacao) **sem nenhum numero fabricado**; botao "Emitir NF-e" desabilitado
  com motivo; atalho "Ver cobrancas" (dado financeiro REAL) gated por `financial_titles:read` (mesma perm do guard de
  /finance/charges).
- Hierarquia de fontes: a **regra D-007 (nao fabricar) VENCE a fidelidade de pixel** do prototipo (§A1/§A2) — divergir da
  lista fabricada aqui e correto e obrigatorio.
- Junta: **cognicao-visual APROVADO** (estado honesto profissional, nao andaime) + **coordenador-de-acessos APROVADO**
  (atalho gated bate com o guard; guard de /finance/invoices inalterado). Ata inline.
- **NOTA — PR-SCALE-1 (RBAC) BLOQUEADO:** adicionar purchase_orders/reports ao catalogo + conceder a papeis foi BARRADO pelo
  guardrail de seguranca (expansao de RBAC inferida por agente exige o dono NOMEAR). Registrado `P-SCALE-RBAC-OWNER-APPROVAL`;
  plano pronto no workflow p/ retomar quando autorizado.

### KPIs

- `frontend_smoke_tests` **624 -> 626** (+2: invoices-nfe-honest-stop). PR web-only.
- `backend_tests` 1276/1282, `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88%, `blocks_completed` 66 — **INALTERADOS**.
  Backfill #248: `pr`/`merge_commit`/`approved_head` = b1559d3. Deste PR null na autoria.

## 2026-07-20 - WS-CARDS-CHARTS-F2 (frontend PR2b) Fan-out de cards clicaveis (restante das telas)

### Resultado

- **22 cards de KPI estaticos viram clicaveis** (ClickableKpiCard, pop-up honesto D-007) em **6 telas de DADO REAL**:
  Estoque (4), Remuneracoes (3), Multas (3), Abastecimento (4), Seguros (4), Danos (4). **20 explain + 2 breakdown, ZERO
  charts** — nenhuma serie real fora do Dashboard; telas mock NAO ganham chart enganoso; `source` do hook e threaded p/ o
  selo honesto ("Dados de exemplo"). 6 builders puros (inventory/commissions/fines/fuel/insurance/damages-kpi-detail.ts).
- **PLATAFORMA (Overview/Health/TenantDetail) e MANUTENCAO PULADAS HONESTAMENTE:** plataforma e 100% andaime hardcoded
  (envolver criaria pop-up sobre numero decorativo fabricado — viola D-007); Manutencao nao tem card de numero. Registrado
  **P-PLATFORM-MOCK-WIRING** (precisa wiring de backend real antes de clicabilidade).
- **Acesso:** unico cta cross-route (Estoque -> /purchase-orders) gated por `purchase_orders:read`; **+dobrado** o gating das
  3 ctas do **FinanceiroPage** (financial_titles:read) que a junta apontou como follow-up. Nenhum card dispara fetch (pop-up
  puramente apresentacional; dados ja vem dos hooks atras do PermissionGuard da rota).
- Time: dev -> junta **analizador APROVADO + cognicao-visual APROVADO + coordenador-de-acessos APROVADO** (so nits BAIXA;
  caption km/L para 0 viaturas corrigida p/ bater com o card). Ata `J-CHARTS-F2-fanout-2b-ata.md`.

### KPIs

- `frontend_smoke_tests` **615 -> 624** (+9: kpi-cards-clickable-f2b). PR web-only.
- `backend_tests` 1276/1282, `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88%, `blocks_completed` 66 — **INALTERADOS**.
  Backfill #247: `pr`/`merge_commit`/`approved_head` = 308c9ef. Deste PR null na autoria.

## 2026-07-20 - WS-CARDS-CHARTS-F2 (frontend PR2a) Fan-out de cards clicaveis (3 superficies operacionais)

### Resultado

- **20 cards de KPI estaticos viram clicaveis** (ClickableKpiCard com pop-up tematico HONESTO — D-007, so dado ja carregado,
  nunca fabrica/soma) em 3 superficies operacionais de maior valor:
  - **Dashboard (9 KPIs):** Concluidas/OS-hoje com body **chart** da serie real (reusa useWorkOrderTimeseries; so quando
    source=api & !forbidden & pontos>0, senao **explain** honesto); abertas/andamento/atrasadas/cadastro com explain + cta.
  - **Ordens de Servico (4 cards inline do WorkOrdersPage):** breakdown "participacao no total" a partir de `items` ja contados.
  - **Despachos (7 cards):** breakdown por status do `summary` ja calculado; card Total com remainder "Rascunho" rotulado.
- **Achado:** `WorkOrdersSummaryCards` e ORFAO (nenhuma pagina o renderiza) -> tornados clicaveis os **4 cards REAIS** que o
  usuario ve no WorkOrdersPage; o componente morto ficou intocado.
- **Acesso (2 MEDIA da junta sanadas):** (1) o hook da serie ganhou `enabled=can("work_orders:read")` — papel sem a permissao
  **NAO dispara 403** em mount nem auto-refresh (regressao do #246 evitada; teste prova fetchCount=0). (2) CTAs dos pop-ups
  gated pela permissao **EXATA** do PermissionGuard da rota (work_orders/customers/vehicles/teams:read + `service_catalog:read`).
- Time: dev -> junta **analizador APROVADO + cognicao-visual APROVADO** (§11: cards so ENVOLVIDOS, nao reescritos) **+
  coordenador-de-acessos APROVADO** (2 MEDIA sanadas, 0 condicao). So nit BAIXA (border-radius 14vs12 cosmetico). Ata
  `J-CHARTS-F2-fanout-2a-ata.md`.

### KPIs

- `frontend_smoke_tests` **602 -> 615** (+13: kpi-cards-clickable +9, dashboard-timeseries-permission-gate +4). PR web-only.
- `backend_tests` 1276/1282, `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88%, `blocks_completed` 66 — **INALTERADOS**.
  Backfill #246: `pr`/`merge_commit`/`approved_head` = 59ccf60. `pr`/`merge_commit`/`approved_head` deste PR null na autoria.
  Proximo: **PR2b** — fan-out em Estoque/Remuneracoes/frota/plataforma.

## 2026-07-20 - WS-CARDS-CHARTS-F2 (frontend PR1) Grafico temporal real no Dashboard

### Resultado

- **Grafico temporal real no Dashboard Operacional** consumindo GET /api/v1/operations/work-orders-timeseries (#245). Novo
  submodulo `frontend/src/modules/dashboard/` (types/adapter/service/hook) clonando o par financial-summary; card
  `WorkOrderVolumeCard` no DashboardPage (apos o grid de KPIs) com TrendChart area 3 series (Abertas=info, Concluidas=success,
  Canceladas=danger), labels dd/mm parseando o civil YYYY-MM-DD SEM new Date ingenuo (sem shift de fuso).
- **Estados §7 completos (trata P-WOTS-FRONT-ACCESS):** pre-cheque `can('work_orders:read')` nao monta o fetch; 403 do backend
  -> `forbidden` -> EmptyState "Acesso nao permitido"; erro nao-403 -> Alert honesto; vazio -> emptyLabel. D-007: normalizacao
  defensiva, nunca fabrica/soma; so plota `points` do backend.
- Time: dev frontend -> **junta UNANIME** analizador APROVADO + cognicao-visual APROVADO (§11 fiel aos paineis irmaos:
  borda/raio 14/padding 20/tokens; cores semanticas certas) + coordenador-de-acessos APROVADO (cadeia papel->permissao->UI;
  backend autoritativo; sem vazamento no caminho negado). So nits BAIXA (markup EmptyState duplicado; hex-vs-token do legado).
- Backfill: #245 (backend) recebe `pr`/`merge_commit`/`approved_head` = 2ce3d5a.

### KPIs

- `frontend_smoke_tests` **597 -> 602** (+5: frontend/tests/work-order-timeseries.test.tsx — normalizacao/nao-array/mock/403/render
  3 series). PR web-only.
- `backend_tests` 1276/1282, `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88%, `blocks_completed` 66 — **INALTERADOS**
  (carregados; PR web-only nao toca mobile — politica dupla). `pr`/`merge_commit`/`approved_head` null na autoria.

## 2026-07-19 - WS-CARDS-CHARTS-F2 (backend) Agregado de serie temporal de OS

### Resultado

- **Diretriz do dono (SEM pendencia):** construido o backend da SERIE TEMPORAL p/ os graficos temporais reais. Novo modulo
  `src/modules/work-order-timeseries/` — GET /api/v1/operations/work-orders-timeseries?days=30 -> por DIA created/completed/
  cancelled, ZERO-FILL (dias vazios=0, contiguos), bucketing por dia em America/Sao_Paulo via deriveBusinessDate (reuso do Intl
  de deriveCompetencia). Cada metrica no seu timestamp; fallback honesto p/ created_at em linha legada. **SEM MIGRACAO**. compute
  PURO InMemory<->Prisma; Prisma withTenantRls. DTO omite tenant_id (§2.8). RBAC reusa work_orders:read.
- Time: dev backend -> analizador APROVADO + coordenador-de-acessos APROVADO + validador-mestre APROVADO_CONDICIONADO (MEDIA de
  KPI sanada). P-WOTS-SCALE (full-scan) + P-WOTS-FRONT-ACCESS (403 no grafico) registrados.

### KPIs

- `backend_tests` **1268 -> 1276** (+8: tests/work-order-timeseries.test.ts). Sobre 1268 (#243). Local: 77 falhas de
  DB-nao-migrado seguem (0 nova, verificado por stash).
- `frontend_smoke_tests` 597, `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88%, `blocks_completed` 66 — **INALTERADOS**.
  Proximo: FRONTEND (grafico temporal real no Dashboard + fan-out cards). `pr`/`merge_commit`/`approved_head` null na autoria.

## 2026-07-19 - WS-MAPA alocacao (frontend D/E) FECHA o feedback do Mapa

### Resultado

- **D (chamados):** click -> popup detalhe honesto + "Alocar tecnico" (gated canCreateDispatch) -> lista RANQUEADA + filtros
  (Disponivel / Mais proximo=distancia haversine / Maior indice de conclusao=completionRate) -> "Alocar"=createDispatch.
- **E (tecnicos):** linha+status; HOVER->tooltip (status/frescor/equipe/OS, NUNCA lat/lng)+realca o pin; CLICK->popup+seletor de
  chamado-> distancia "~X km (linha reta)" + tempo "~Y min (estimado, sem transito)" (÷28km/h, disclaimer) + "Alocar".
- HONESTO: nunca "chega as"/ETA fabricado; completionRate null->"—"; sem coordenada->"indisponivel"; LGPD zero-lat/lng no HTML.
  Alocacao REAL via createDispatch (404/409/422 traduzidos). ETA por rota real = Fase 2 (junta-5+PD).
- Time (dev -> analizador APROVADO + coordenador-de-acessos APROVADO + cognicao-visual APROVADO + avaliador-mapas
  APROVADO_CONDICIONADO); ALTAs (KB+KPI) + BAIXA (import morto + painel concorrente) sanados. **FEEDBACK DO DONO SOBRE O MAPA
  COMPLETO** (polish + alocacao D/E + backend indice). Resta so Fase 2 (SLA real / ETA por rota, ambos backend/PD).

### KPIs

- `frontend_smoke_tests` **581 -> 597** (+16: operations-map-allocation.test.ts). Baseline de mapa 112 -> 128.
- `backend_tests` 1268, `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88%, `blocks_completed` 66 — **INALTERADOS**.
  `pr`/`merge_commit`/`approved_head` null na autoria.

## 2026-07-19 - WS-MAPA alocacao (backend) Agregado indice de conclusao de OS por tecnico

### Resultado

- **Diretriz do dono (SEM pendencia):** construido o BACKEND do indice de conclusao. Novo modulo
  `src/modules/technician-performance/` — `GET /api/v1/operations/technician-performance`: agregado READ-ONLY sobre work_orders
  (assigned_user_id/status/created_at) -> completionRate = concluidas÷atribuidas por tecnico (**null quando 0 — nunca 0
  fabricado**), ordenado por indice desc (ranking p/ alocacao). compute PURO InMemory<->Prisma; Prisma withTenantRls +
  where.tenant_id. **SEM MIGRACAO**. DTO omite tenant_id (§2.8). Registrado em src/app.ts.
- Time: dev backend -> analizador **APROVADO** + coordenador-de-acessos + validador-mestre **APROVADO_CONDICIONADO**. ACHADO
  **ALTA** (coordenador): gatear por field_dispatch:read exporia o ranking ao TECNICO DE CAMPO -> CORRIGIDO para
  **field_dispatch:create** (quem ALOCA), com teste provando o 403 do tecnico de campo. P-JMAPAS7-PERF-SCALE = otimizacao futura.

### KPIs

- `backend_tests` **1259 -> 1268** (+9: tests/technician-performance.test.ts). Sobre 1259 (inalterado desde #232; PRs do Mapa
  foram frontend-only).
- `frontend_smoke_tests` 581, `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88%, `blocks_completed` 66 — **INALTERADOS**.
  Proximo: FRONTEND da alocacao (D/E) consome este agregado. `pr`/`merge_commit`/`approved_head` null na autoria.

## 2026-07-19 - WS-MAPA SPRINT POLISH Fullscreen nativo + legenda unica + rail-pilula (feedback do dono)

### Resultado

- Feedback do dono na tela: **(A)** legenda UNICA na base (removido o `<footer>` redundante "Atual"/"Localizacao antiga" do
  canvas Google; ja subsumido em MAP_LEGEND_ITEMS). **(C)** removido o maximizar customizado (tosco) -> **fullscreen NATIVO**
  no canto inf. direito nos 2 canvases (MapLibre FullscreenControl / Google fullscreenControl RIGHT_BOTTOM). **(B)** rail
  COLAPSADO virou **pilula fina** top-anchored (44x64px) em vez de faixa 56px que roubava o mapa; mapPadding colapsado 72->24.
- **Time novo** (planejador-senior-master-chefe + pesquisadores web PD-006 → dev → analizador → aprovador): analizador +
  cognicao-visual **APROVADO**, aprovador (avaliador-mapas) **APROVADO_CONDICIONADO** (condicao ALTA do KB sanada). Sem
  provider/SKU/backend (US$ 0); LGPD zero-coordenada.

### KPIs

- `frontend_smoke_tests` **581/581** e mapa **112/112** INALTERADOS — os testes de layout foram REESCRITOS (maximizar->fullscreen
  nativo; legenda unica; pilula), sem teste novo/removido.
- `backend_tests` 1259, `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88%, `blocks_completed` 66 — **INALTERADOS**.
  Proximo: SPRINT ALOCACAO (D/E + agregado backend indice de conclusao). `pr`/`merge_commit`/`approved_head` null na autoria.

## 2026-07-19 - WS-MAPA M-5 Alerta de OS nova — FASE 1 do redesign do Mapa FECHADA

### Resultado

- **Requisito 3 do dono** (alerta visual ao chegar OS nova): hook `useNewWorkOrderAlert` (diff client-side dos ids entre
  refreshes) → alerta em 3 camadas — toast (`role=status`/`aria-live`, sem coordenada), badge `--new` no rail, pulso no pin
  novo (reusa wo-pulse; halo por priorityColor — urgente vermelho, novo nao-urgente na propria cor). ANTI-ALERT-FATIGUE
  (nao alerta no mount; dedup; teto por ciclo; TTL) + prefers-reduced-motion. Terminologia reconciliada; selecao sem-GPS honesta.
- **avaliador-mapas APROVADO_CONDICIONADO** (8/8 veto + lentes a-h PASS; condicao KB M-5 sanada). Sem provider/SKU/backend, US$ 0.
- **FASE 1 do redesign do Mapa FECHADA** — 6 requisitos do dono: chamados+SLA-proxy (M-4), tecnicos (M-3), alerta (M-5), mapa
  full-bleed (M-1+layout), maximizar+4o quadrante (OperationsMapStage), legenda no rodape (M-2). Resta so Fase 2 = M-7 (SLA real).

### KPIs

- `frontend_smoke_tests` **565 -> 581** (+16: operations-map-alert.test.ts). Baseline de mapa 96 -> 112 (meta >=110 atingida).
- `backend_tests` 1259, `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88%, `blocks_completed` 66 — **INALTERADOS**.
  `pr`/`merge_commit`/`approved_head` null na autoria.

## 2026-07-19 - WS-MAPA M-4 Lista de chamados que chegam (prioridade + SLA-proxy honesto)

### Resultado

- **Requisito 1 do dono**: o slot `calls` deixou de ser placeholder → **fila real de chamados** (OS abertas mapeaveis):
  codigo/cliente + **chip de prioridade** + **SLA-proxy HONESTO** ("Agendado para {data}"/"Aberto ha {tempo}"/"Sem data" —
  NUNCA "vence em"; SLA real = Fase 2/M-7). Ordenacao prioridade->(scheduledFor??createdAt)->abertura->id (helpers PUROS).
  Item = button (a11y/foco/>=44px); clique seleciona/pan; callsCount no badge; chamado SEM GPS honesto (projecao sem lat/lng,
  LGPD). Painel de chamados reaberto por default. Terminologia reconciliada nos 2 canvases.
- **avaliador-mapas APROVADO_CONDICIONADO** (3 lentes duras — SLA honesto/LGPD/ordenacao — PASS; condicao KB M-4 sanada).
  **M-6 (maximizar+4o quadrante) JA veio no redesign de layout** → so falta M-5 (alerta) p/ fechar a Fase 1. Sem provider/SKU/backend.

### KPIs

- `frontend_smoke_tests` **551 -> 565** (+14: operations-map-calls.test.ts 13 + guarda de terminologia). Baseline de mapa 82 -> 96.
- `backend_tests` 1259, `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88%, `blocks_completed` 66 — **INALTERADOS**.
  Proximo: M-5 alerta de OS nova (fecha a Fase 1). `pr`/`merge_commit`/`approved_head` null na autoria.

## 2026-07-19 - WS-MAPA M-3 Camada de tecnicos + disponibilidade (redesign J-MAPAS-6)

### Resultado

- **Requisito 2 do dono** (onde/como estao os tecnicos): realce de **disponibilidade** nos dois canvases (fonte unica
  `isRingAvailable`) — anel do tecnico disponivel no mapa + barra por status no rail (`getStatusColor`). `isRingAvailable`
  NAO realca posicao velha (available+envelhecido -> nao destaca; honestidade). Terminologia "Tecnicos de Campo".
- Fecha `P-MAPA-GOOGLE-PADDING-RESIZE` (Google re-`fitBounds(mapPadding)` no resize). Legenda-rodape M-2 byte-a-byte identica
  nos dois canvases. **avaliador-mapas APROVADO_CONDICIONADO** (8/8 veto; residual de terminologia no subtitulo -> P-MAPA-TERM-OPERADORES).
  Sem provider/SKU/backend (US$ 0); LGPD zero-coordenada.

### KPIs

- `frontend_smoke_tests` **540 -> 551** (+11: operations-map-technicians.test.ts). Baseline de mapa 67 -> 82.
- `backend_tests` 1259, `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88%, `blocks_completed` 66 — **INALTERADOS**.
  Proximo: M-4 lista de chamados+SLA-proxy (troca o placeholder do slot calls). `pr`/`merge_commit`/`approved_head` null na autoria.

## 2026-07-19 - WS-MAPA redesign de layout (mapa-heroi full-bleed) — feedback URGENTE do dono

### Resultado

- **Feedback do dono**: o grid de 3 colunas do M-1 ESPREMEU a largura do mapa. Junta de layout com **3 pesquisas web** (PD-005:
  Samsara/Onfleet/ServiceTitan/Uber/fleet-UX 2024-2026) + sintese: sistemas reais NAO usam 3 colunas.
- **Decisao**: mapa **FULL-BLEED** (100% da largura util x altura generosa) + paineis viram **overlays de vidro navy**
  (chamados esq./tecnicos dir., colapsaveis) — nao colunas. **Maximizar** = mapa cheio + card de vidro no 4o quadrante.
  `resize()` ~220ms + `setPadding` nos dois canvases (senao o mapa fica cinza). Novo OperationsMapStage (slots map/calls/techs).
  Default abre TECNICOS (dado real) p/ nao exibir painel vazio na demo. Token `--surface-glass-navy-rgb`.
- Junta **avaliador-mapas + cognicao-visual APROVADO_CONDICIONADO** (0 bloqueia; mapa domina, vidro coeso, contraste/a11y OK);
  condicoes sanadas. **Supersede o grid do M-1.** Sem provider/SKU/backend (US$ 0); LGPD zero-coordenada.

### KPIs

- `frontend_smoke_tests` **536 -> 540** (+4: operations-map-layout.test.ts reescrito 6->10). Baseline de mapa 63 -> 67.
- `backend_tests` 1259, `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88%, `blocks_completed` 66 — **INALTERADOS**.
  Proximos: M-3 tecnicos, M-4 chamados+SLA (troca o placeholder), M-5 alerta — preenchem os rails sem retrabalho de layout.

## 2026-07-19 - WS-MAPA M-2 Rodape de legenda unificado (redesign J-MAPAS-6)

### Resultado

- **Requisito 6 do dono** ("as legendas se unam e fiquem no rodape do mapa"): novo `OperationsMapLegendFooter` (fonte UNICA
  `MAP_LEGEND_ITEMS`, cor so de `item.color`, zero hex solto); a `<ul>` flutuante foi removida dos DOIS canvases (MapLibre +
  Google) e ambos consomem o mesmo rodape ancorado a base (o mapa encolhe, nao sobrepoe; canvas absolute->flex).
- **Paridade do espelho byte-a-byte**; clamp de altura 2x do M-1 intacto; rodape ja acompanha o futuro overlay maximizado (M-6).
  **avaliador-mapas APROVADO** (8/8 itens de veto). Sem provider/SKU/backend; LGPD zero-coordenada.

### KPIs

- `frontend_smoke_tests` **530 -> 536** (+6: `operations-map-legend-footer.test.ts`). Baseline de mapa 61 -> 67.
- `backend_tests` 1259, `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88%, `blocks_completed` 66 — **INALTERADOS**.
  Proximo: M-3 camada distinta de tecnicos. `pr`/`merge_commit`/`approved_head` null na autoria.

## 2026-07-19 - WS-MAPA M-1 Fundacao de layout do Mapa Operacional (redesign J-MAPAS-6)

### Resultado

- **Inicio do redesign do Mapa Operacional** (mandato do dono — pedido mais detalhado; plano J-MAPAS-6, Junta de Mapas
  planejador -> dev -> avaliador). **M-1 = fundacao de layout**: grid de 3 colunas [chamados | mapa | tecnicos] no lugar do
  layout de 2 colunas; **altura do mapa dobrada** (`clamp(760px,82vh,960px)`) nos dois canvases (MapLibre + Google, regra do
  espelho); coluna de tecnicos reusa `OperationsOperatorList`; coluna de chamados = **placeholder honesto** (lista real = M-4;
  nao fabrica OS/prioridade/SLA). Header/pills/filtros/KPIs/polling+SSE/estados intactos.
- Sem provider novo, sem SKU pago (**US$ 0**) -> sem junta-5. **avaliador-mapas APROVADO** (7/7 itens de veto; LGPD
  zero-coordenada; paridade do espelho; fidelidade §11; escopo — nao tocou marcadores/legenda/alerta/backend/migration).

### KPIs

- `frontend_smoke_tests` **524 -> 530** (+6: `operations-map-layout.test.ts` no `test:smoke` — grid 3 colunas, altura 2x nos
  dois canvases, coluna de tecnicos, placeholder honesto). Baseline de mapa 55 -> 61.
- `backend_tests` 1259, `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88%, `blocks_completed` 66 — **INALTERADOS**
  (frontend-only; Fase 1 do redesign). `pr`/`merge_commit`/`approved_head` null na autoria.
- Proximos PRs: M-2 legenda unificada -> M-3 tecnicos -> M-4 chamados+SLA-proxy -> M-5 alerta -> M-6 maximizar; Fase 2 (M-7) = SLA real.

## 2026-07-19 - WS-UI-CARDS+CHARTS Fase 1 Cards clicaveis + grafico temporal SVG zero-dep

### Resultado

- **UI viva** (mandato do dono: cards estaticos -> clicaveis com pop-up sobre o tema; KPIs -> graficos temporais). PD-004
  (pesquisa web ≥5 fontes): grafico = **SVG inline ZERO-DEP** — nao adicionou lib (Recharts so sob demanda futura via lazy).
- Novos primitivos: `<TrendChart>` (SVG viewBox unitless + `non-scaling-stroke` = responsivo sem lib; line|area|bar;
  multi-serie; tooltip `<title>`; cor por token; suporta valores negativos apos fix da junta) + `<Sparkline>`; e a camada de
  pop-up: `<KpiDetailModal>` **dialog a11y-completo** (focus trap, Esc, backdrop, retorno de foco, aria-labelledby) +
  `<ClickableKpiCard>` (role=button, teclado, aria-haspopup) + `KpiDetail` (union `chart|breakdown|explain` — variante
  ditada pelo dado REAL, **nunca fabrica serie**; selo mock/fallback suprime o grafico, D-007).
- **Flagship financeiro**: fluxo de caixa migrado das divs manuais para `<TrendChart type=bar>` (D-CHART-SERIE-TOKENS:
  tokens dedicados `--color-chart-inflow/outflow`, preservando a cor do prototipo, nao os tokens de status/alarme); os 4
  cards viraram clicaveis com **breakdown REAL** (aberto/vencido/em disputa do DirectionSummary; saldo=explain).
- Junta **1 APROVADO + 2 APROVADO_CONDICIONADO** (0 bloqueia); condicoes sanadas: cor (tokens de serie + decisao),
  barras negativas (fix + teste), sub-layout (meses colados + legenda centralizada), raio 14px.

### KPIs

- `frontend_smoke_tests` **516 -> 524** (+8: `trend-chart.test.tsx` no `test:smoke` — estrutura SVG + pop-up + honestidade).
- `backend_tests` 1259, `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88%, `blocks_completed` 66 — **INALTERADOS**
  (frontend-only; sem backend novo — Fase 2 fara agregado de serie). `pr`/`merge_commit`/`approved_head` null na autoria.

## 2026-07-19 - WS-RBAC-GATING-CHECKLISTS Esconder acoes de escrita de checklist de papeis de leitura

### Resultado

- **Revisao RBAC ator-por-ator** (mandato do dono: "existe telas que tem todas as opcoes para perfis"): as 2 telas REAIS de
  checklist deixam de expor botoes de ESCRITA a papeis de leitura.
  - `TenantChecklistsPage`: "Novo checklist" (tenant_checklists:create), "Publicar" (publish), "Ativar/Inativar" +
    "Salvar builder" (update) gated; "Visualizar" (leitura) sempre visivel.
  - `ChecklistRunsPage`: "Iniciar execucao" gated em checklist_runs:create.
- Padrao `usePermissions` + `can()` + render condicional (identico ao ClientesPage). Backend e a autoridade final (403 real,
  §2.4) — a UI so molda. As 3 telas-casca MOCK (DispatchConsole/TablePage/Pedidos) ficam para WS-SCALE-8TELAS (gate-on-wiring,
  P-RBAC-GATING-MOCKSHELLS).
- Junta: coordenador-de-acessos APROVADO + validador-mestre APROVADO_CONDICIONADO (condicoes sanadas: gate de "Salvar builder"
  afinado p/ update; teste de render adicionado; 3 pendencias registradas).

### KPIs

- `frontend_smoke_tests` **514 -> 516** (+2: `checklists-access-gating.smoke.test.tsx` renderiza a tela e prova botao de escrita
  OCULTO p/ so-leitura e VISIVEL p/ create; adicionado ao script `test:smoke`).
- `backend_tests` 1259, `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88%, `blocks_completed` 66 — **INALTERADOS**
  (frontend-only; hardening RBAC, sem mover escopo). `pr`/`merge_commit`/`approved_head` null na autoria.

## 2026-07-19 - WS-UI-REFRESH Auto-refresh substitui o botao "Atualizar" em 30 telas

### Resultado

- **UI transversal** (mandato do dono: "que nao exista mais o botao de atualizar pois o sistema faz isso automatico"):
  REMOVIDO o botao manual "Atualizar" de **30 telas** e ligado **auto-refresh em segundo plano**.
- Novo hook `frontend/src/hooks/useAutoRefresh.ts` (setInterval 30s via ref — sem recriar timer / sem leak; pausa em
  `document.hidden`; espelha o padrao-ouro `useOperationsMap`). ~28 hooks de dados ganharam **background mode**
  (`refresh(background)` usa `isRefreshing` em vez de `loading` -> auto-refresh **sem flicker de skeleton**).
- `OperationsMapPage` mantem o polling+SSE nativo (sem duplo polling). Trio WorkOrder (ActionBar/DetailPage) e
  DashboardPage tratados a parte; `RefreshCw` mantido onde reusado no botao de erro "Tentar novamente".
- Fan-out por 8 batches de modulo (workflow). Junta **2 APROVADO + 1 APROVADO_CONDICIONADO** (0 bloqueia); condicoes
  sanadas (2 `<div>` de acoes vazios + guard `enabled` no Financeiro). Liveness/copia-de-erro deferidos
  (P-UI-REFRESH-LIVENESS / P-UI-REFRESH-ERROR-COPY).

### KPIs

- `frontend_smoke_tests` **514/514** — inalterado: 3 smoke (commissions/inventory/tenant-settings) ajustados removendo a
  assertiva do botao "Atualizar", sem enfraquecer as demais; nenhum teste novo/removido.
- `backend_tests` **1259**, `flutter_tests` **764**, `mvp_demo` 99%, `mvp_vendavel` 88%, `blocks_completed` 66 —
  **INALTERADOS** (frontend-only; polish de UX, sem mover escopo).
- tsc verde, build verde, `approval-frontend-contract` 1/1. `pr`/`merge_commit`/`approved_head` null na autoria.

## 2026-07-19 - WS-SCALE-COMISSAO Comissoes consomem a decisao de cancelamento da OS

### Resultado

- **Onda 1 do Scale roadmap** (resolve parcial P-Ω3F6-COMISSAO): as comissoes passam a honrar
  `work_orders.financial_cancellation_decision`. Chokepoint de ELEGIBILIDADE na criacao do basis event de OS —
  novo `src/modules/commissions/work-order-cancellation.gate.ts` le o estado da OS DENTRO da tx `withTenantRls`
  (RLS satisfeito, atomico, idempotencia-primeiro) e a regra PURA `evaluateWorkOrderCommissionEligibility` marca o
  evento: `zero`/`keep_unpaid` -> `ineligible` (suprime); `NULL`/ausente/desconhecida em OS cancelada ->
  `pending_review` (segura, J-Ω3F-6A); `keep`/nao-cancelada -> elegivel.
- **Contrato = 201 + status persistido** (fila de revisao via `GET /commissions/basis-events?status=pending_review|ineligible`),
  nao 422 — retry-safe e auditavel.
- **Ataque de desenho 3-lentes** (idempotencia/RLS/contrato) pegou 3 furos criticos ANTES do codigo: fail-open por
  RLS fora de contexto (a supressao nunca dispararia em prod), flip 201<->422 no replay, e null-lido-como-keep —
  todos fechados pela realocacao do gate para dentro do repositorio. Resta o dual-gate na engine de calculo
  (P-Ω3F6-COMISSAO-REVERSAL, latente — nenhuma engine de calculo paga hoje).

### KPIs

- `backend_tests`: **1248 -> 1259** (+11: 7 unidades da regra pura + 4 integracao HTTP via router). Execucao real da
  branch: 1265 total / 6 skip DB-gated / 1259 pass no CI. 0 regressao PROVADA (baseline em `git stash` = mesmas 77
  falhas locais de DB-nao-migrado, byte-identico, em modulos nao tocados). Sobre 1248, que ja absorve #227-#231 (nao
  reconciliados no KPI desde D-Ω4-KPI-RELATORIO).
- RESSALVA de cobertura (junta): o caminho PRISMA real do gate (`readWorkOrderCancellationPrisma` no client real,
  dentro da tx `withTenantRls`) so e coberto por tsc + revisao de codigo — os testes exercitam o dublê InMemory.
  Registrado em P-Ω3F6-COMISSAO-PRISMA-COV (nao-bloqueante; alinhado a P-SAN-CORE-PRISMA-COV).
- `frontend_smoke_tests` 514, `flutter_tests` 764, `flutter_modules` 17, `mvp_demo` 99%, `mvp_vendavel` 88%,
  `blocks_completed` 66 — **INALTERADOS** (backend-only; hardening que resolve pendencia, sem mover escopo de dominio;
  sem migration/schema/permissao nova).
- `pr`/`merge_commit`/`approved_head` null na autoria (backfill pos-merge).

## 2026-07-05 - B-124 Dashboard web enriquecido com despachos e localizacoes

### Resultado

- Dashboard web (`/dashboard`) passou a compor 4 fontes reais em paralelo:
  `GET /work-orders` + `GET /operations/dispatches` +
  `GET /field-locations/latest` + `GET /notifications/unread-count`
  (+ `GET /approvals/pending`, com `work_order_id` opcional no backend).
- 8 KPIs derivados dos dados (nunca fixos); fila critica combinada com
  ordenacao obrigatoria por criticidade — 1) SLA/agenda vencidos ·
  2) prioridade alta/urgente · 3) operador sem sinal recente (stale) ·
  4) aprovacao pendente · 5) OS sem operador — com dedupe por entidade e
  acao contextual (Abrir OS / Abrir mapa / Ver aprovacao).
- Status de campo real com a regra de stale de 15 min reutilizada de
  `operations-map.adapter` (`isStale`), sem recalcular limiar; despachos
  ativos com status desconhecido tolerado; alertas acionaveis; eventos
  derivados das listas carregadas (sem chamada de timeline por OS).
- Fallback por fonte com rotulos `Dados demonstrativos` (mock) / `Fallback
  local`; mensagens seguras; nenhum token/tenantId/ID tecnico/base64/path na
  UI. Web-only: nenhum arquivo mobile/backend alterado.

### Metadados pos-avaliacao humana

- PR: #125 (merge `dcfa25063111532f8cc1c77d7af8ec4519406bb0`, head `6605b13630e3f29f98670aabf9ee32e274f40d47`).
- Status: `published_after_human_approval`.

### KPIs B-124 refletidos na raiz

| KPI | Valor |
| --- | --- |
| Flutter Tests | 764/764 (inalterado; B-124 e web-only) |
| Frontend Smoke Tests | 44/44 (era 33/33; +10 unit adapter + 1 render) |
| Backend Tests | 15/15 (inalterado) |
| Mobile Backend Contracts | 18/18 (inalterado) |
| Mobile + Core SaaS Contracts | 21/21 (inalterado) |
| Flutter modules | 17/17 (inalterado) |
| MVP demo | 96% (mantido; sem decisao humana para alterar) |
| MVP vendavel | 78% (mantido; sem decisao humana para alterar) |
| Blocos entregues | 49 (48 ate B-123 + B-124) |

### Nota sobre percentuais MVP

`mvp_demo`/`mvp_vendavel` permanecem nos valores oficiais publicados (96%/78%,
estimados). B-123 fechou a fidelidade do fluxo de OS mobile e B-124 fechou o
dashboard web enriquecido; ainda assim, **sem decisao humana explicita**, os
percentuais nao foram alterados e ficam registrados como oficiais ate revisao.

## 2026-07-05 - B-123 Fidelidade visual do fluxo de OS mobile

### Resultado

- 7 telas/areas do fluxo de OS mobile alinhadas ao prototipo aprovado
  (visual-only): lista de OS, detalhe/check-in, execucao, checklists da OS,
  execucao de checklist, evidencias e sincronizacao/fila offline.
- Estados semanticos visiveis por tokens centrais (pendente ambar · enviando
  roxo · sucesso verde · falha/conflito vermelho · info azul) via
  pills/faixas laterais do mobile_kit; sem dado tecnico cru na UI.
- Nenhum repository/service/contrato/sync/model/provider alterado; frontend e
  backend intocados; nenhuma dependencia nova.
- Dois testes realinhados com aprovacao humana previa (b114: rotulo 'Sync
  pendente' fiel ao os-lista.png; b116: header 'Atendimento' fiel ao
  prototipo).

### Metadados pos-avaliacao humana

- PR: #123 (merge `2537558f3f078425c13119a60445e960aac26bb2`, head `24d439072778438ed3de837fc66a4ef6bce31944`).
- Status: `published_after_human_approval`.

### KPIs B-123 refletidos na raiz

| KPI | Valor |
| --- | --- |
| Flutter Tests | 764/764 |
| Frontend Smoke Tests | 33/33 |
| Backend Tests | 15/15 |
| Mobile Backend Contracts | 18/18 |
| Mobile + Core SaaS Contracts | 21/21 |
| Flutter modules | 17/17 |
| MVP demo | 96% |
| MVP vendavel | 78% |
| Blocos entregues | 48 |

Observacao: percentuais mvp mantidos nos ultimos valores oficiais publicados
(96%/78%); nao houve decisao humana para altera-los no B-123. Blocos: regra
de contagem (47 ate B-122 + B-123 = 48).

### Limitacoes registradas

- Fluxo de OS mobile alinhado — lacuna anterior resolvida pelo B-123.
- Permanecem: S3/presigned real, DB/Redis receipt, antivirus real, download
  protegido final, retencao definitiva, Dashboard web sem
  dispatches/field-locations, Settings web sem backend dedicado e piloto
  Android em dispositivo fisico.

## 2026-07-05 - B-122 Alinhamento visual ao prototipo aprovado

### Resultado

- Perfil do operador recriado fiel a `screen-refs/mobile/perfil.png`: hero com
  avatar/nome/e-mail e "Papel · Organizacao" (rotulo PT-BR), secoes Conta e
  organizacao, Aparencia (tema preservado), Seguranca e sessao e botao Sair.
- Removidos da UI: modo de autenticacao, expiracao de token, permissoes cruas,
  modulos, tenants e IDs internos (suporte tecnico permanece no Diagnostico
  dev-only).
- Auditoria: 11 telas web MVP + shell conformes ao padrao aprovado; web sem
  rota de Perfil (lacuna documentada, sem criar tela fora das 16 congeladas);
  fluxo de OS mobile em Material stock (lacuna para as proximas fases).

### Metadados pos-avaliacao humana

- PR: #121 (merge `fc7e17810940edf933b5e4a2071f8f456e05d4e9`, head `f151b4fb6e53200204846aed5abb0699c0308d94`).
- Status: `published_after_human_approval`.

### KPIs B-122 refletidos na raiz

| KPI | Valor |
| --- | --- |
| Flutter Tests | 764/764 |
| Frontend Smoke Tests | 33/33 |
| Backend Tests | 15/15 |
| Mobile Backend Contracts | 18/18 |
| Mobile + Core SaaS Contracts | 21/21 |
| Flutter modules | 17/17 |
| MVP demo | 96% |
| MVP vendavel | 78% |
| Blocos entregues | 47 |

Observacao: percentuais mvp mantidos nos ultimos valores oficiais publicados
(B-121K, PR #120); B-122 nao propos novos percentuais. Blocos: regra de
contagem (46 ate B-121 + B-122 = 47).

### Limitacoes registradas

- Fluxo de OS mobile ainda em Material stock (fidelidade nas proximas fases).
- Demais limitacoes do B-121 permanecem (S3/presigned, DB/Redis receipt,
  antivirus real, download protegido, retencao, Dashboard web sem
  dispatches/field-locations, Settings web sem backend).

## 2026-07-05 - B-121 MVP integrado Web/Mobile

### Resultado

- Web MVP integrado aos endpoints reais: lista de OS (`useWorkOrders` -> GET /work-orders),
  Dashboard composto de work-orders + notifications, Detalhe da OS com timeline real,
  Aprovacao operacional no detalhe (GET /approvals/pending; POST /approve|/reject) e
  navegacao MVP-only via GET /navigation/menu.
- Matriz tela x endpoint x status das 27 telas MVP publicada em `docs/api-screen-endpoints.md`.
- Hardening mobile: timeline real no detalhe/check-in com fallback local seguro,
  auto-sync montado no app root com ordem segura preservada, adapter de checklist
  tolerando `fields` e `components` (tipo desconhecido -> mensagem segura) e base URL
  por `--dart-define=API_BASE_URL`.
- Consolida os blocos B-109 a B-120 mergeados desde a ultima publicacao (B-108).

### Metadados pos-avaliacao humana

- PR: #117 (merge `38facb24a3bc8592cc3ccd6c11d4e428420532ed`, head `73a50e905b5a7a3c4665910e705f168d239a8dd9`).
- PR: #118 (merge `f05566828a2b05d9c4400112d66be490477f0a17`, head `474e5ec49e562a39ddcb1eec15253816ff11f520`).
- PR: #119 (merge `e851fd35e141545401abfc0fac774f62e1c2f615`, head `72d6ccc6476be752ccf8d368a5252c8c97fac522`).
- Status: `published_after_human_approval`.

### KPIs B-121 refletidos na raiz

| KPI | Valor |
| --- | --- |
| Flutter Tests | 764/764 |
| Frontend Smoke Tests | 33/33 |
| Backend Tests | 15/15 |
| Mobile Backend Contracts | 18/18 |
| Mobile + Core SaaS Contracts | 21/21 |
| Flutter modules | 17/17 |
| MVP demo | 96% |
| MVP vendavel | 78% |
| Blocos entregues | 46 |

Observacao: mvp_demo/mvp_vendavel seguem os ultimos valores documentados na rodada
B-113 a B-120 (`agent-orchestration/codex/log-execucao.md`, estimados); o B-121 nao
propos novos percentuais e a revisao humana pode ajusta-los.

### Limitacoes registradas

- S3/presigned real pendente.
- DB/Redis receipt pendente.
- Antivirus real pendente.
- Download protegido final pendente.
- Retencao definitiva pendente.
- Dashboard web sem enriquecimento de dispatches/field-locations.
- Settings web sem backend dedicado.
- Piloto Android real ainda precisa validacao em dispositivo fisico.

## 2026-06-18 - B-108 Hardening de evidências/storage

### Resultado

- `EvidenceStorageProvider` publicado para upload mobile de evidencias.
- `LocalProtectedEvidenceStorageProvider` publicado para dev/test.
- `EvidenceScanner` testavel publicado com `NoopEvidenceScanner` e fake de teste.
- Referencia opaca `evfile_*` publicada na resposta publica.
- MIME validation JPEG/PNG.
- Size validation 10 MB.
- Checksum SHA-256 obrigatorio.
- Auditoria segura para `accepted`, `rejected`, `scan_failed` e `stored`.
- Upload multipart mobile preservado.
- Resposta publica sem path, bucket, storage key, URL publica, token, base64 ou binario.
- KPIs raiz sincronizados com `mobile/flutter_app/Kpis/` apos avaliacao humana, merge da PR #104 e gate B-108G.

### Metadados pos-avaliacao humana

- PR: #104.
- Merge commit: `468fcf16c6b42865aecbd45b05f4c37ced0c3068`.
- Approved head: `4b221cfdfe3acad9c65214ac5fc7e7892a050331`.
- Status: `published_after_human_approval`.

### KPIs B-108 refletidos na raiz

| KPI | Valor |
| --- | --- |
| Flutter Tests | 662/662 |
| Backend Tests | 15/15 |
| Mobile Backend Contracts | 18/18 |
| Mobile + Core SaaS Contracts | 21/21 |
| Flutter modules | 17/17 |
| MVP demo mobile | 93% |
| MVP vendavel mobile | 76% |
| Blocos entregues | 38 |

### Limitacoes registradas

- S3/presigned real pendente.
- DB/Redis receipt pendente.
- Antivirus real pendente.
- Download protegido final pendente.
- Retencao definitiva pendente.

## 2026-06-18 - B-107 Criacao remota de OS/local-only mapping + resolucao manual de conflitos

### Resultado

- `work_order.create` publicado no sync mobile existente de OS.
- `localId -> serverId` publicado para `accepted` e `already_applied`.
- `rejected` preserva a OS local com falha segura.
- `conflicts` entram em resolucao manual inicial.
- `statusUpdate` local-only permanece bloqueado antes de `serverId` e fica elegivel apos o mapeamento.
- UI e servico de resolucao manual foram publicados para manter local, aceitar servidor e revisao manual.
- KPIs raiz sincronizados com `mobile/flutter_app/Kpis/` apos avaliacao humana, merge da PR #102 e gate B-107G.

### Metadados pos-avaliacao humana

- PR: #102.
- Merge commit: `db36fb318adc234e1fcc6bfeaeb17b6260847c3c`.
- Approved head: `b3da11d1605af9edb68e5e8f587881fc22115f3f`.
- Status: `published_after_human_approval`.

### KPIs B-107 refletidos na raiz

| KPI | Valor |
| --- | --- |
| Flutter Tests | 654/654 |
| Backend Tests | 15/15 |
| Mobile Backend Contracts | 18/18 |
| Mobile + Core SaaS Contracts | 21/21 |
| Flutter modules | 17/17 |
| MVP demo mobile | 92% |
| MVP vendavel mobile | 72% |
| Blocos entregues | 37 |

### Limitacoes registradas

- Approval real pendente.
- Evidence attach real pendente.
- Merge avancado campo a campo de conflitos pendente.
- Hardening final de evidencias/storage pendente.
- Piloto Android real ainda precisa validacao em dispositivo fisico.

## 2026-06-18 - B-106 Adapter GPS nativo real + permissoes Android/iOS

### Resultado

- Adapter GPS nativo real conectado ao DeviceLocationProvider via geolocator.
- Permissoes Android/iOS when-in-use.
- Opt-in explicito antes do primeiro pedido de permissao nativa.
- Captura manual somente por Enviar localizacao agora.
- KPIs raiz sincronizados com mobile/flutter_app/Kpis/.

### Metadados pos-avaliacao humana

- PR: #99.
- Merge commit: `aac998eedcd95fba1c1a6a8fa5c09ec6fcaa6f26`.
- Approved head: `2ac4215fa6a69a93b546f53816a7bf5fc2766133`.
- Status: publicado apos avaliacao humana, merge e gate.

### KPIs B-106 refletidos na raiz

| KPI | Valor |
| --- | --- |
| Flutter Tests | 633/633 |
| Backend Tests | 15/15 |
| Backend Contract Tests focados | 47/47 |
| Flutter modules | 17/17 |
| MVP demo mobile | 90% |
| MVP vendavel mobile | 68% |
| Blocos entregues | 36 |

### Limitacoes registradas

- Sem background tracking.
- Sem stream continuo.
- Sem timer.
- Sem envio silencioso.
- Geofencing pendente.
- Roteirizacao pendente.
- Provider externo de mapa pendente, se aprovado.
- Approval real pendente.
- Conflitos manuais avancados pendentes.
- Hardening final de evidencias/storage pendente.
- Piloto Android real ainda precisa validacao em dispositivo fisico.

### Política permanente de KPIs pós-avaliação humana

1. PRs de feature não devem atualizar arquivos de KPI.
2. PRs de feature devem reportar KPIs propostos apenas no relatório final.
3. KPIs só devem ser atualizados após avaliação humana aprovando a entrega.
4. KPIs só devem ser publicados após merge e gate confirmando sucesso.
5. A publicação de KPIs deve ocorrer em bloco separado documental/KPI, como B-xxxK ou B-xxxF.
6. Se a entrega mexeu em Flutter/mobile, atualizar `mobile/flutter_app/Kpis/*` e refletir em `Kpis/*`.
7. Se a entrega mexeu fora do mobile, atualizar `Kpis/*`.
8. Se a entrega mexeu nos dois, atualizar ambos.
9. Se existir `index.html`, atualizar também o HTML.
10. O bloco de KPI deve preencher PR, merge commit e approved head reais. Campos null bloqueiam o próximo bloco.

### Política de limpeza pós-validação

Todo bloco que executar testes, builds, Flutter, Node, Android, iOS ou geração de artefatos deve limpar os artefatos temporários ao final, sem apagar arquivos rastreados e preservando assets untracked explicitamente permitidos.

## 2026-06-17 - B-152F KPIs duplos pos-B-105

### Resultado

- `Kpis/` raiz foi sincronizado com os percentuais mobile de `mobile/flutter_app/Kpis/`.
- Criados `Kpis/kpis-latest.json`, `Kpis/kpis-history.json` e `Kpis/README.md`.
- `Kpis/index.html` e `mobile/flutter_app/Kpis/index.html` passaram a conter
  B-105/totais de forma literal, alem do render por JavaScript.
- A politica permanente de KPIs duplos foi documentada.

### Politica permanente de KPIs duplos

- Mexeu no Flutter/mobile: atualizar `mobile/flutter_app/Kpis/*` e refletir os
  percentuais mobile em `Kpis/*`.
- Mexeu fora do mobile: atualizar `Kpis/*`.
- Mexeu nos dois: atualizar os dois conjuntos.
- Se existir `index.html`: atualizar tambem o HTML.

### KPIs B-105 refletidos na raiz

| KPI | Valor |
| --- | --- |
| Flutter Tests | 613/613 |
| Backend Tests | 15/15 |
| Backend Contract Tests focados | 47/47 |
| Flutter modules | 17/17 |
| MVP demo mobile | 87% |
| MVP vendavel mobile | 64% |
| Blocos entregues | 35 |

### Limitacoes registradas

- Adapter GPS nativo real pendente.
- Permissoes Android/iOS e opt-in de privacidade pendentes.
- Sem pacote GPS nativo, sem geolocator, sem Google Maps, sem Mapbox e sem SDK externo.
- Sem background tracking, sem timer, sem stream continuo e sem envio silencioso.

## 2026-06-15 - KPI-DASHBOARD-001

### Registro inicial

- Criada a estrutura permanente `Kpis/` no mesmo nivel de `src/`.
- Criado dashboard HTML/CSS/JS puro, sem dependencia externa obrigatoria.
- Registrado estado consolidado apos o merge do B-098D.
- `mobile/**` permaneceu fora do escopo.
- Figma, secrets, `.env`, migrations e infra permaneceram fora do escopo.

### Estado consolidado apos B-098D

| Bloco | Status | Resultado |
| --- | --- | --- |
| B-098 | concluido | bootstrap minimo/backend readiness |
| B-098A | concluido | bootstrap expandido com feature flags, policies e catalogos |
| B-098B | concluido | sync offline de OS para status e atribuicao |
| B-098C | parcial | sync offline minimo de checklist |
| B-098D | parcial | inventory availability + inventory sync minimo |

### KPIs iniciais

| KPI | Valor |
| --- | --- |
| Bootstrap minimo | concluido |
| Bootstrap expandido | concluido |
| Sync OS | concluido |
| Sync checklist | parcial |
| Inventory availability/sync | parcial |
| Evidencias OS/genericas | planejado |
| Idempotencia duravel DB/Redis | planejado |
| Flutter tocado neste bloco | 0 |
| Figma tocado neste bloco | 0 |
| Infra/secrets/migrations tocados | 0 |

### Contratos mobile/backend

Implementados:

- `GET /api/v1/mobile/bootstrap`
- `POST /api/v1/mobile/sync/work-order-actions`

Parciais:

- `POST /api/v1/mobile/sync/checklist-actions`
- `GET /api/v1/mobile/inventory/availability`
- `POST /api/v1/mobile/sync/inventory-actions`

Planejados:

- evidencias OS/genericas
- idempotencia duravel DB/Redis
- persistencia/reserva transacional de inventario
- consumo Flutter dos contratos B-098B/C/D

### Validacoes conhecidas

- PR #85: CI remoto `backend` passou.
- Frontend React: smoke conhecido `28/28`.
- Validacoes locais obrigatorias do KPI-DASHBOARD-001 devem ser registradas na entrega da branch.

### Lacunas restantes

- Flutter ainda precisa consumir B-098B/C/D.
- Evidencias OS/genericas ainda precisam de contrato backend.
- Idempotencia de replay ainda precisa persistencia duravel.
- Inventario ainda precisa reserva transacional e vinculo real com OS/armazem.
- Validacao E2E de campo ainda precisa fechar caminho backend + Flutter.

### Previsoes

- MVP vendavel: 40-80h restantes, sujeito a consumo Flutter dos contratos B-098B/C/D, evidencias/OS, persistencia/idempotencia e validacao E2E.
- Padrao prototipo Figma premium: 80-160h adicionais, dependendo de fidelidade visual, responsividade, estados, microinteracoes e polimento web/mobile.

### Regra permanente

Todo bloco futuro deve atualizar este historico com data, escopo, KPIs alterados, validacoes executadas, riscos novos e decisao de proximo bloco.

## 2026-06-15 - B-098E Mobile Evidence Contract

### Resultado

- Criado `POST /api/v1/mobile/sync/evidence-actions` em status `partial`.
- Tipos de OS: `evidence.work_order_photo`, `evidence.work_order_signature` e `evidence.work_order_observation`.
- Tipos de campo: `evidence.field_photo`, `evidence.field_signature` e `evidence.field_observation`.
- Tenant resolvido exclusivamente pelo ator autenticado; `tenant_id`/`tenantId` externo e ignorado.
- Idempotencia por tenant + usuario + `client_evidence_id`, com `already_applied` e `idempotency_payload_mismatch`.
- Bootstrap, policy e catalogo mobile atualizados para marcar evidencia como parcial.

### KPIs atualizados

| KPI | Valor |
| --- | --- |
| Backend mobile | 6/7 |
| Evidencias OS/genericas | parcial |
| Testes focados mobile/Core SaaS | 18/18 |
| Flutter tocado neste bloco | 0 |
| Figma tocado neste bloco | 0 |
| Infra/secrets/migrations tocados | 0 |

### Lacunas e riscos

- O contrato registra apenas manifesto/metadados; nao recebe binario/base64.
- Faltam URL protegida de upload, storage, antivirus, auditoria de arquivo e persistencia duravel DB/Redis.
- Flutter ainda precisa consumir os contratos B-098B/C/D/E.
- Idempotencia em memoria nao atende ambiente multi-instancia.

### Validacoes executadas

- `npm run check`: pass.
- `npm run lint`: pass.
- `npm test`: pass, 15/15.
- `node --test --import tsx tests/mobile-backend-contracts.test.ts tests/core-saas-contract.test.ts`: pass, 18/18.
- `npm run build`: pass.
- `npm --prefix frontend run check`: pass.
- `npm --prefix frontend run test:smoke`: pass, 28/28.
- `npm --prefix frontend run build`: pass.
- `DATABASE_URL` dummy + `npx prisma validate`: pass.
- `git diff --check`: pass.

### Previsoes

- MVP vendavel: 36-72h restantes, sujeito a integracao Flutter, upload protegido, persistencia/idempotencia e validacao E2E.
- Padrao prototipo Figma premium: 80-160h adicionais, sem alteracao de Figma neste bloco.

### Regra permanente confirmada

Todo bloco futuro continua obrigado a atualizar `Kpis/index.html`, `Kpis/app.js` e `Kpis/kpis-history.md` antes de encerrar a entrega.

## 2026-07-13 — Ω-GOV (rodada saneamento, PR2): política KPI-por-PR + correção do backend

- **Política revogada→vigente:** "KPI só após avaliação humana (bloco …K)" **REVOGADA** (D-KPI-PER-PR). Vigente:
  todo PR que altere código/teste/escopo atualiza os KPIs **no próprio PR** com contagem de execução real; a
  **junta do PR** valida; o humano audita pelo history. Reescrito em CLAUDE.md (§C1/§C2/§C3/§C7/DoD),
  Kpis/README.md, mobile/flutter_app/Kpis/README.md, plano-mestre.md; handoff-package e logs = banner revogada.
- **backend_tests: 15/15 → 766/766.** O Ω-GATE (PR #174) fez o CI rodar a **suíte backend inteira** (100
  arquivos + Postgres+Redis + `prisma migrate deploy`), 0 fail. O antigo 15/15 media só `core-saas.test.ts`.
- **Escopo:** web/backend/docs-only. Flutter/mobile e frontend seguem valores oficiais B-124 até re-baseamento
  nas respectivas trilhas (política dupla mantida).

## 2026-07-13 — Ω-DOCS (rodada saneamento, PR3): descontaminação Kryos

- Removido `docs/research/estudo-doutoral-interfaces-10-saas.md` (100% conteúdo do projeto **Kryos** —
  supervisão de refrigeração/SCADA) + a pasta `docs/research/` (ficou vazia). 4 linhas de
  `docs/09-mapa-telas-frontend.md` reescritas (SCADA/DeviceDetail/Kryos → operacional denso / Detalhe de
  Entidade). 6 citações históricas ao estudo **retificadas** (não apagadas). **D-DOCS-KRYOS**.
- **Docs-only:** nenhuma métrica de teste mudou (backend segue **766/766** do gate). Fontes canônicas de UI =
  `DESIGN_SYSTEM.md`, `COMPONENT_LIBRARY.md`, docs próprias. Backfill do Ω-GOV: **PR #175 / 361f2c1**.

## 2026-07-13 — Ω-INFRA-1 (rodada saneamento, PR4): containerização + healthcheck + provedor

- **Containerização:** `Dockerfile` multi-stage do backend (runtime `node:20-bookworm-slim` **não-root**, Prisma
  Client gerado, HEALTHCHECK na readiness); `frontend/Dockerfile` (Vite → **nginx** estático + proxy same-origin
  `/api`). CI (`docker` job) builda em todo PR e **publica no GHCR** (`erp-backend:<sha>`) em push na main via
  `GITHUB_TOKEN`.
- **Healthcheck real:** `GET /health` (liveness, estável) + `GET /health/ready` (ping Postgres+Redis, 200/503,
  sem vazar dado). Validado ao vivo no `docker-compose.prod.yml` (api+web+migrate ponta a ponta).
- **backend_tests 766 → 768** (+2 `health-routes.test.ts`). **PD-INFRA-1** escolhe o provedor (Fly.io/gru 1º,
  AWS 2º) para a junta de 5. Backfill do Ω-DOCS: **PR #176 / d0126d5**.

## 2026-07-13 — JUNTA-MAPAS: criação da Junta de Mapas (3 agentes) + KB geo

- **3 agentes novos** no molde da casa: `.claude/agents/planejador-mapas.md`, `dev-mapas.md`, `avaliador-mapas.md`
  — acionados em **cadeia** (planejador → dev → avaliador) em toda tarefa de mapa/geo, web ou Flutter. Total de
  agentes: 16 → **19**, sem colisão de nomes.
- **Base de conhecimento viva** `docs/maps/kb-mapas.md` **preenchida** com pesquisa real datada (2026-07-13):
  preços por SKU do Google Maps Platform (tabela oficial marcada 2026-07-10 UTC), regras de cache do ToS
  (`place_id` perene vs `lat/lng` ≤30 dias, termos 2025-05-01), matriz caso-de-uso do ERP → API → custo no
  piloto (≈US$0 no volume piloto; gargalo de custo em escala = Route Matrix), estado do `google_maps_flutter`
  (2.17.1) e `flutter_map` (8.3.0), limites OpenFreeMap (sem limite, público).
- **Registro:** `D-JUNTA-MAPAS` em `agent-orchestration/controle/decisoes.md`; ata `J-JUNTA-MAPAS.md`
  (agente-fabrica, planejador-mestre, critico-adversarial, inspetor-de-rotas — **4/4 FAVORÁVEL**).
- **Regra de ouro:** MapLibre GL + OpenFreeMap permanecem como **base de exibição web** (custo zero, junta Ω1);
  Google Maps Platform entra só onde agrega; **ativar SKU pago / trocar provedor geo = PD + junta de 5 unânime**.
- **Escopo docs/agentes-only:** nenhum código/teste de produto tocado (**contagem real de testes novos = 0**),
  **nenhuma chave/billing/SKU ativado**. Métricas de teste carregam o último valor oficial (**Ω-INFRA-1**:
  backend 768/768, Flutter 764/764, smoke web 44/44). `blocks_completed` **inalterado (49)** — governança/tooling
  não conta como bloco de feature entregue (mesmo critério de Ω-GOV/Ω-DOCS). `mvp_demo`/`mvp_vendavel`
  inalterados (nenhum escopo de produto movido). Teste de gatilho da cadeia: **pendente de sessão nova** (o
  roteador carrega agentes no início da sessão; ver evidência/análise estática na ata J-JUNTA-MAPAS).

## 2026-07-13 — google-maps-frontend (J-MAPAS-3/4): Google Maps no Mapa Operacional (a pedido do dono)

- **Google Maps (Web Components)** no Mapa Operacional: operador colorido pela paleta REAL de status, pins de
  chamado por prioridade, LEGENDA (8 itens) fiéis ao MapLibre (**J-MAPAS-3**, junta 3/3). Câmera **foca a cidade
  com mais técnicos** por **clustering geográfico** (haversine, custo ZERO, sem geocoding) — empate por proxy
  oeste-primeiro (divergência da regra literal "nome alfabético" documentada em **D-JMAPAS4**; versão fiel =
  Geocoding API/SKU pago → junta de 5) (**J-MAPAS-4** APROVADO).
- **Seed:** 4 técnicos demo na região de Curitiba (idempotente). Chave do Google **só** em `frontend/.env`
  gitignorado (nunca versionada; `.env.example` placeholder).
- **frontend_smoke 44 → 378** (contagem REAL; +16 testes de mapa; o 44/44 estava congelado no B-124). Backfill do
  Ω-INFRA-1: **PR #177 / f457d9f**.

## 2026-07-14 — Ω3F-0 (setup da RODADA Ω3-FIDELIDADE)

- 3 agentes efêmeros da rodada (`fid-analista`/`fid-planejador`/`fid-avaliador` — cláusula de escopo: nenhum outro
  agente tocado) + spec canônica (`docs/referencia/alinhamento-painel-logistico.md`) + **dossiê de paridade**
  (matriz de 35 capacidades RECONCILIADA: **4✅/18🟡/13🔴** vs spec 3/15/17; 5 linhas subiram por PRs mergeados) +
  `lista-execucao-omega3f.md` (9 planos Fase 1 + Fase 2). **Junta J-Ω3F-0 UNÂNIME 5/5**; 6 decisões + condições C1-C4.
- Docs/agentes-only: **0 testes de produto**; métricas carregam o último oficial. Backfill do Google Maps: **#179 / 7d5d984**.

## 2026-07-14 — Ω-INFRA-2 (rodada saneamento, PR5): staging config-as-code

- **`fly.staging.toml`** (backend `erp-techsolutions-api-staging`) + **`frontend/fly.staging.toml`** (web) no **Fly.io/gru**:
  liveness `/health` + readiness `/health/ready`, `min_machines_running=0` (scale-to-zero), web proxia `/api` same-origin
  via `API_UPSTREAM=…api-staging.flycast` (rede privada Fly).
- **`nginx.conf.template`** (envsubst nativo do entrypoint) **VALIDADO AO VIVO** (docker build+run: `proxy_pass` renderizado,
  SPA 200). **CD `.github/workflows/deploy-staging.yml` GATED** (`if: vars.STAGING_DEPLOY_ENABLED == 'true'` → SKIPPED até
  ativar, `main` verde): migrate deploy → `db:seed:demo` (só staging) → deploy api+web → **smoke**. **`scripts/smoke-staging.mjs`**:
  `/health/ready` 200 + login demo + `GET /me`, falha = vermelho.
- **Junta-de-código J-SAN-5 UNÂNIME 3/3** (`agente-devops-provisionador`, `agente-secops`, `inspetor-de-rotas` — maioria).
  Zero segredo real versionado (grep classificado); gate `env.ts` intacto. Achados não-bloqueantes p/ Ω-INFRA-3:
  P-SAN-SEED-GUARD · P-SAN-SMOKE-PROXY · `STAGING_API_URL` sem `/api/v1` no dossiê.
- Config-as-code + docs: **0 teste de produto tocado**; métricas carregam o último oficial (backend 768/768, Flutter 764/764,
  smoke web 378/378). Ativação viva (smoke real) = junta-de-ativação no hand-off (fronteira J-SAN-0). Backfill do Ω3F-0: **#180 / 4d3bf3c**.

## 2026-07-14 — Ω-INFRA-3 (rodada saneamento, PR6): produção config-as-code + fixes CORS/seed

- **Código real (2 fixes):** **P-SAN-CORS** — `env.ts` ganha `CORS_ORIGIN` (CSV) + gate no `superRefine` que
  REJEITA vazio/`*` (e qualquer entrada contendo `*`) em produção (**fail-closed**, espelha o gate do JWT);
  `app.ts` passa a `cors({ origin: env.CORS_ORIGINS.length>0 ? array : true })` (sem `credentials`). **P-SAN-SEED-GUARD**
  — `prisma/seed-guard.ts` (`assertSeedAllowed` ESTRITO) no topo dos 3 seeds; `'false'`/`'0'` **não** desarmam
  (corrige o footgun `Boolean("false")`). **+15 testes** (seed-guard 4 + cors-env 7 + cors-routes 4).
- **Config-as-code de produção:** `fly.production.toml` + `frontend/fly.production.toml` (`min_machines_running>=1`,
  `auto_stop=off`, `force_https`, `CORS_ORIGIN` fail-closed não versionado, sem segredo). **`deploy-production.yml`**
  GATED (`workflow_dispatch`, `PROD_DEPLOY_ENABLED`, `environment: production`, `concurrency`): **promoção por IMAGEM**
  (`ghcr…:<promote_sha>` — mesmo artefato validado em staging, não rebuilda), migrate forward-only da pipeline **sem
  seed**, **trava dupla** (ata go-live por SHA + smoke-staging-verde-mesmo-SHA checando job/step real + rollback
  ensaiado). `scripts/smoke-production.mjs` (readiness + prova de CORS restritivo). Runbooks A/B em `deployment.md`.
- **Design-junta** (workflow: 5 leitores → `planejador-mestre` → `critico`/`devops`/`secops`) **APROVADO_CONDICIONADO
  3/3**; condições dobradas na impl (seed guard estrito, promoção por imagem, assert real de smoke, 2 atas separadas,
  `seed-platform` infeasível REMOVIDO → P-SAN-PROD-BOOTSTRAP; web sem imagem GHCR → P-SAN-PROD-WEBIMG). `migration_needed=false`.
- **O MERGE NÃO é go-live** (config inerte). Go-live = junta-5 por SHA + ativação viva = hand-off humano irredutível.
  Suíte inteira **0 fail**. Backfill do Ω-INFRA-2: **#181 / b772103**.

## 2026-07-14 — Ω-INFRA-4 (rodada saneamento, PR7 — FECHA o saneamento): backup + restore comprovado + observabilidade

- **`scripts/backup-database.mjs`** — `pg_dump -Fc` → auto-valida `pg_restore -l` (nunca sobe truncado) → `PutObject`
  (bucket dedicado, **SSE**) → **retenção 30d SEGURA** (prune só após upload OK · só prefixo/formato · nunca a
  recém-enviada nem as `keepMinimum` · lista truncada aborta). Creds do Postgres via **`PG*` env** (nunca argv).
  **`backup-database.yml`** GATED (`BACKUP_ENABLED`, Environment dedicado `backup`) + **`uptime-check.yml`** (cron `*/5`).
- **PD-INFRA-2** (`docs/omega-pd.md`, 2 lentes ≥3 fontes): **Fly-native** logs/métricas US$0 (gru/BR) + Actions cron
  uptime; Better Stack/Axiom = upgrades **NÃO adotados** (junta-5-por-pago não dispara). US$0 do cron = repo PÚBLICO.
- **DRILL DE RESTORE COMPROVADO AO VIVO** (veto do dba-guardiao): `backup-database.mjs` REAL → MinIO(SSE) → download
  byte-exato (713.655) → `pg_restore` **EXIT=0 ~3,6s (RTO)** → integridade SOURCE==RESTAURADO exata
  (9 tenants / 16 users / **62 policies RLS** / 71 tabelas) → **isolamento por tenant sob role NÃO-superuser**
  (FORCE RLS: 1 tenant distinto visível). **RPO ≤ 24h** (dump) + PITR nativo (sub-24h) = hand-off.
- **Design-junta dba/critico/secops APROVADO_CONDICIONADO 3/3** — TODAS as condições dobradas + provadas no drill.
  `migration_needed=false`. Suíte **0 fail** (+16 backend). Backfill do Ω-INFRA-3: **#182 / 4a2db09**.
- **FECHA a RODADA SANEAMENTO** (PRs 1-7: Ω-GATE → Ω-GOV → Ω-DOCS → Ω-INFRA-1..4). Ativação viva = dossiê de hand-off.

## 2026-07-17 — Ω3F-9 (FECHA A FASE 1) + reconciliação KPI D-Ω3F-KPI-RELATORIO

- **Reconciliação única (D-Ω3F-KPI-RELATORIO):** a rodada Ω3F **deferiu a atualização de KPI de todos os
  seus PRs (#184–#204)** para este snapshot. As contagens vêm de **execução real ao fim da Fase 1**, nunca
  copiadas dos blocos.
- **Hub operacional da OS ponta a ponta (Ω3F-1 → Ω3F-9):** o Detalhe de OS ganhou **revelação progressiva
  (C2)** das abas **Financeiro** (×1,5, preço congelado anti-refaturamento), **Orçamento** (congela preço +
  aprovar→cria OS idempotente + compartilhar), **Comentários + Anexos** (UserNameResolver, sem UUID cru),
  **Cancelar/Duplicar/Imprimir** (decisão financeira no cancel, sem porta dos fundos), **Quilometragem**
  (app preenche / base corrige, permissão dedicada), **Mobile**, **Logs** (auditoria por OS) e **Mapa**
  (haversine US$0, sem SKU pago, LGPD read-minimizado). Fechando a Fase 1, as **Ações de linha** na lista
  de OS (dar andamento forward-only, revogar envio via `field_dispatch:cancel`, badge de atraso derivado).
- **Governança:** cada bloco passou por **junta adversarial** (fid-avaliador + agentes-veto relevantes) e
  **pós-análise efêmera**. `pr: 204`; `merge_commit`/`approved_head` **null na autoria** (backfill pós-merge).

### KPIs Ω3F reconciliados na raiz

| KPI | Valor |
| --- | --- |
| Backend Tests | 989/989 (0 fail, 6 skip DB-gated que rodam no CI; +190 sobre 799 ao longo de Ω2..Ω3F) |
| Frontend Smoke Tests | 486/486 (real; +108 sobre 378 no Ω3F — abas do hub de OS + ações de linha) |
| Flutter Tests | 764/764 (INALTERADO; Ω3F foi web/backend-only — mobile carrega) |
| Flutter modules | 17/17 (inalterado) |
| Mobile Backend Contracts | 18/18 (inalterado) |
| Mobile + Core SaaS Contracts | 21/21 (inalterado) |
| Backend Contract Tests focados | 21/21 (subset; pode ser maior, não re-baseado) |
| MVP demo | 98% (era 96%; +2 por escopo, estimado) |
| MVP vendável | 83% (era 78%; +5 por escopo, estimado) |
| Blocos entregues | 58 (49 + 9 blocos-feature Ω3F-1..9; governança/pós-análise não conta) |

### Nota sobre percentuais MVP

`mvp_demo`/`mvp_vendavel` movidos **+2/+5** (96→98 / 78→83) por **escopo** — o Ω3F fechou o núcleo operacional
demoável/vendável da OS ponta a ponta. Percentuais **estimados**, sujeitos a revisão humana.

### Política dupla (mobile carrega)

`mobile/flutter_app/Kpis/*` **não** foi tocado nesta reconciliação (Ω3F foi web/backend-only); segue no seu
último valor oficial (Flutter 764/764, módulos 17/17).

## 2026-07-18 — Ω4 (RODADA — PÓS-FASE 1) + reconciliação KPI D-Ω4-KPI-RELATORIO

### Resultado

A rodada **Ω4 (Financeiro do tenant ×1,5)** entregou **8 agregados** e deferiu a atualização de KPI de todos os
seus PRs (**#206–#225**) para este snapshot único (D-Ω4-KPI-RELATORIO).

| Agregado | PR (feature / pós) | Invariante central |
|---|---|---|
| Ω4-1 Contas financeiras | #206 / #207 | cadastro por tenant; RLS; soft-delete |
| Ω4-2 Título AR/AP + telas | #208-#211 | Decimal(12,2); **CHOKEPOINT** de fechamento em toda escrita |
| Ω4-3 Faturamento OS→Título | #212 / #213 | **anti-refaturamento** idempotente |
| Ω4-4 Caixa/Extrato + liquidação | #214 / #215 | saldo somado no backend; estorno por contra-lançamento |
| Ω4-5 Conciliação bancária | #216 / #217 | reconcile EXENTO do chokepoint (extrato pós-fechamento) |
| Ω4-6 Fechamento/trava retroativa | #219 / #220 | close atômico + snapshot congelado; guard {closing,closed} |
| Ω4-7 Cheque | #221 / #222 | mutex por flip condicional; compensa via chokepoint; bounce = contra-lançamento novo |
| Ω4-8 Dashboard financeiro real | #223-#225 | agregado backend (resolve P-Ω4-2B-KPI-AGREGADO); front nunca soma |

(+ #218 fix competência em America/Sao_Paulo, pré-Ω4-6.)

### Métricas (execução real ao fim da PÓS-FASE 1)

| Métrica | Valor |
|---|---|
| Backend | 1242/1242 (era 989; +253 no Ω4; 0 fail, 6 skip DB-gated que rodam no CI; 1248 total) |
| Smoke web | 514/514 (era 486; +28: telas Cobranças/Pagamentos + adapter do dashboard) |
| Flutter | 764/764 (inalterado — Ω4 web/backend-only) |
| Módulos Flutter | 17/17 (inalterado) |
| MVP demo | 99% (era 98%; +1 por escopo, estimado) |
| MVP vendável | 88% (era 83%; +5 por escopo, estimado) |
| Blocos entregues | 66 (58 + 8 agregados-feature Ω4-1..8; governança/pós-análise/fix não conta) |

### Governança por juntas (bugs caçados ANTES do merge)

Cada agregado passou por **junta adversarial** (2–3 vetos com verdito estruturado; nos de maior risco, **ataque de
DESENHO em workflow ANTES de codar**) + **pós-análise efêmera**. Achados reais barrados: **3 ALTA no desenho do
cheque** (dupla-postagem concorrente, bounce travado por conciliado, escalada de privilégio), **cashFlow ancorado no
mês UTC** no Ω4-8a (virada de mês BR), **competência fora de faixa** no #218. Atas em
`agent-orchestration/omega/juntas/`; relatório completo em `agent-orchestration/omega/RELATORIO-OMEGA4.md`.

### Política dupla (mobile carrega)

`mobile/flutter_app/Kpis/*` **não** foi tocado (Ω4 web/backend-only); segue no último valor oficial (Flutter 764/764,
módulos 17/17).

## 2026-08-05 — KPI-INDEX-PAINEL (PR pendente)

**D-KPI-INDEX-PAINEL:** o `Kpis/index.html` é o **artefato principal** de acompanhamento (decisão do dono:
"o principal arquivo é o index.html onde vc vai reorganizar colocar graficos para uma melhor visualização").
Visão gráfica em SVG inline zero-dep (PD-004) hidratada do history: cobertura de testes por trilha (small
multiples com escala própria), blocos entregues, entregas por rodada (barra horizontal, corte 19/07 explicado)
e ritmo de entrega (delta por métrica, só com os dois lados medidos). Manchete na 1ª dobra; changelog virou
"Entregas por PR"; `file://` mostra aviso honesto em vez de caixas vazias. Guard permanente
`tests/kpi-dashboard-charts.test.ts` executa o app.js real e compara a SÉRIE ponto a ponto com o JSON
(endurecido após a junta provar que a 1ª versão aceitava série fabricada) — validado por 4 mutações.

**Junta (2 ciclos):** ciclo 1 REPROVADO pelos dois agentes (critico-adversarial + cognicao-visual) — barra
fantasma de +969 (métrica ausente lida como zero), `[hidden]` decorativo (cascata de autor), guard-teatro,
Flutter achatado, 11 hexes de outro design system, manchete a 8,3 telas. Ciclo 2 APROVADO_CONDICIONADO;
todas as condições aplicadas no mesmo PR. Registro: `agent-orchestration/omega/reprovacoes/R-kpi-painel-ciclo1.md`.

**Triagem da suíte (P-SUITE-ENV-PERSISTENCE):** as "88 falhas" não eram regressão — `.env` com
`CORE_SAAS_PERSISTENCE="prisma"` congela via import estático × dotenv; receita verde = `export
CORE_SAAS_PERSISTENCE=memory` no shell. Um segundo fator (junction de node_modules × worktree remove, sonda
minha) fabricou 626+112 falhas; recuperado com `npm install` + `prisma generate`; lição registrada. Fix real
de robustez: `professional-statements` com setup dentro do try/finally (falha de setup não pendura mais a suíte).

**Contagens (execução real):** backend **2110/2110** (0 fail, 6 skip DB-gated; inclui +6 do guard novo; nota
de reconciliação: −11 vs 2115 do #330, provável diferença de testes de auth destravados por DATABASE_URL no
shell da época — investigar na próxima rodada). Smoke **1003/1003** e Flutter **839/839** carregados (§C3.3,
PR não toca frontend/mobile). Blocos **135→136**.

## 2026-08-06 — CHK-P1-PR-02A (PR pendente)

**CHECKLIST P1 PR-02a:** a lista de "Modelos de Checklist" recriada fiel ao protótipo que o dono desenhou no
Claude Design (`Modelos de Checklist.dc.html`, importado para a raiz). Header com kicker, busca, filtro de
5 situações, 4 KPI mini-cards contados do payload real, tabela no grid exato do protótipo (tile do 1º
componente, resumo em PT-BR, pills de situação + "Alterações não publicadas" derivada de `publishedAt`),
estados §7 completos, banner somente-leitura com esconde-fino, `ChecklistToast` novo e copy acentuada
unificada no módulo. "Novo modelo" instantâneo do protótipo + ação Inativar/Reativar reposta (a junta
provou que sem ela um modelo criado por engano virava lixo irremovível pela UI).

**Junta em workflow** (3 vetos em paralelo + refutação adversarial por achado): cognicao-visual REPROVADO,
acessos e crítico APROVADO_CONDICIONADO → **8 achados confirmados, 0 refutados, todos aplicados** no mesmo
PR (ata em `docs/juntas/J-CHECKLIST-P1.md`). Destaque de método: os smokes SSR passavam VAZIOS (sem efeitos
a lista nunca carrega) — nasceram a costura `initialChecklists` e a função pura `rowActionVisibility`, e o
esconde-fino agora é provado com linhas reais na tela.

**Também nesta janela:** emulador Android desta máquina ficou operacional (AVD `erp_pixel` criado — a causa
raiz era não existir NENHUM AVD; receita e 3 armadilhas em memória/`reference-android-emulator-setup`), app
instalado e login demo validado no aparelho.

**Contagens (execução real):** smoke **1003→1013** (+10 novos, 2 atualizados); backend **2110/2110** e
Flutter **839/839** carregados (§C3.3, PR frontend-only). Blocos **136→137**. Backfill #336: merge `1062634`.

## 2026-08-06 — MAPA-PIXEL-PR1 (PR pendente)

**Prioridade máxima do dono:** o Mapa Operacional recriado **pixel a pixel** sobre o protótipo que ele
desenhou no Claude Design (`Mapa Operacional.html`, importado para a raiz). Painéis de vidro de 348px
(Chamados recebidos / Em Atendimento / Técnicos com ETA, filtros e ordenação), legenda-filtro de 8 itens
no rodapé em uma linha, markers do protótipo (avatar de 32px com borda por status; losango de 22px com
pulso na urgente), rota tracejada, alocação por clique, por popup do marcador e por arrastar-e-soltar,
toast honesto. Medidas conferidas em Edge real contra o protótipo: vidro, raio e largura idênticos.

**Três diretivas do dono, dadas ao ver a tela, todas provadas em navegador (não por leitura de código):**
os objetos do topo-esquerdo **saíram**; o mapa **não tem mais vida própria** (auto-enquadramento, pan por
seleção e clustering removidos — sobrou só o pan por clique) e **lembra a última posição** por organização;
o detalhe do técnico abre por **hover** (some sozinho) e por **clique** (fica, fecha manual).

**Achado ALTA da junta que mudava tudo:** com a chave do Google no ambiente, a tela renderizava o canvas
**antigo** — o dono nunca via o trabalho novo, e era de lá que vinham o auto-foco e os chips. MapLibre
passou a ser o padrão; Google virou opt-in explícito até a paridade do PR-2. Os tiles CARTO do protótipo
foram **rejeitados** (licença Enterprise para uso comercial, verificado na fonte) — ficamos no OpenFreeMap
claro, keyless, US$ 0.

**Contagens (execução real):** smoke **1013→1052** (suíte do mapa 125→**177** casos; 5 arquivos novos);
backend **2110/2110** (4 shards); Flutter **839/839** carregado (§C3.3). Blocos **137→138**.
Backfill #337: merge `be86751`. Ata: `agent-orchestration/omega/mapas/J-MAPAS-10-pixel-ata.md`.

## 2026-08-06 — MAPA-PIXEL-PR2 (PR pendente)

**Paridade do espelho Google + faxina (J-MAPAS-10 PR-2).** O canvas Google agora espelha o MapLibre
pixel-perfect — avatar, losango, pulso, rotas tracejadas, memória da visão, popup React, hover efêmero +
clique fixo, **zero câmera automática** (as 3 diretivas do dono valem também aqui). Divergências
**declaradas, não fingidas**: a cartografia do Google não aceita o token-set claro (mapId ignora styles),
a moldura da InfoWindow é dele, o padding de câmera é emulado. O **opt-in foi mantido**: Dynamic Maps é
SKU tarifado (US$ 7/1.000 pós-10k) contra OpenFreeMap US$ 0 — trocar de provedor pela mera presença de
uma chave ligaria serviço pago sem decisão de junta (§C7.1).

**A junta reprovou o ciclo 1 com um achado de livro**, provado em harness runtime com React real: em
React 19, ref callback **inline** é re-invocado a cada re-render — o canvas Google estalava a câmera do
operador de volta à visão inicial a cada polling/hover, e ainda salvava a visão errada por cima da
memória. Corrigido com guard de aplicação única + guard de fonte no teste.

**Faxina:** focus-city removido (anotação SUPERSEDED no kb-mapas §(f), histórico preservado — A2),
componentes órfãos fora, e2e do mapa reescrita para a tela real com teste que proíbe as âncoras mortas.

**Contagens (execução real):** smoke **1052→1059**; backend **2110/2110**; Flutter 839/839 (§C3.3).
Blocos **138→139**. Backfill #338: merge `70dbfde`.

## 2026-08-08 — CHK-P1-HOTFIX-TYPE-CHECK (#341, merge 32e22c7)

**Bug vivo na `main` desde o #330, encontrado pela junta e reproduzido ponta a ponta.** O PR-01 acrescentou
"Escolha única", "Múltipla escolha" e "Assinatura" ao código e ao catálogo **sem migração** — o banco
continuou recusando os três. No modo de produção, criar um checklist com qualquer um deles devolvia HTTP 400
com a mensagem crua do Postgres. **A feature entregue no #330 nunca funcionou fora do modo memória.**

Passou despercebido porque toda a suíte de checklist roda em memória: 6/6 verdes que nunca tocam a
restrição do banco. A migração é aditiva; a blindagem percorre os 10 tipos contra o Postgres real e foi
**provada por mutação** (com a restrição revertida, o guard reprova). O runbook de reversão ficou no
cabeçalho — inclusive o detalhe de que uma reversão malsucedida deixa a tabela sem restrição.

## 2026-08-08 — CHK-P1-PR-02B (PR #340)

**Modo editor do builder**, fiel ao protótipo do dono: sub-rota com deep-link, header com nome e tipo,
paleta, canvas com **seções nomeadas**, inspector básico, modal "Sair sem salvar?" e a aba Aplicabilidade
estática. A ponte antiga saiu e 5 componentes órfãos foram removidos.

A junta reprovou no pixel e condicionou no crítico, com 4 achados ALTA: o cabeçalho saía da tela ao rolar;
adicionar um campo gravava o rótulo **cru** do backend como a pergunta que o técnico lê no aplicativo;
**Publicar ficou inalcançável** com o endpoint funcionando; e editar durante o salvamento perdia trabalho
em silêncio. Todos corrigidos, mais 8 MÉDIAs.

**Contagens (execução real, após rebase no hotfix):** smoke **1059→1073**; backend 2.110 e Flutter 839
carregados. Blocos **140→141**.

## 2026-08-08 — CHK-P1-PR-02C (PR pendente)

**Inspector tipado** do builder: os 10 formulários por tipo de campo (opções de escolha com reordenar e
remover, mínimo e máximo de fotos, tipos de veículo e de avaria, limite de caracteres, exigências de
assinatura e ciência), travas de publicação, `type` gravado no PATCH, Publicar ligado e Inativar/Reativar
no editor.

**A junta rodou com o banco vivo — e foi a mais produtiva da série.** Os dois revisores reprovaram, e o que
encontraram vale registrar:

- Descobriram que o **banco recusava três tipos de campo** entregues no PR-01 — a feature nunca funcionou em
  produção. Virou o hotfix #341.
- **Salvar rotacionava o identificador de todos os campos.** Como a resposta do técnico aponta para esse
  identificador com restrição de integridade, uma vistoria preenchida offline seria **recusada para sempre**
  ao sincronizar. Medido contra o banco: salvar só o *nome* do modelo já trocava tudo. Agora a
  reconciliação é por chave estável, nos dois repositórios, com teste que trava a regressão.
- **As travas da tela não espelhavam o servidor**: seis payloads passavam na interface e batiam em erro 400.
  Corrigido e provado por um teste de paridade que roda cada payload contra o validador real e exige a mesma
  decisão dos dois lados.

Também: erro cru de banco traduzido para mensagem de negócio, e a troca de tipo em modelo publicado passou a
constar na auditoria.

**Três achados ficaram registrados sem correção** — inclusive um em que a junta corrigiu meu próprio
diagnóstico: os chips do inspector não quebram nada, apenas gravam configuração que ninguém lê.

**Contagens (execução real):** smoke **1073→1091**; backend **2110→2114**; testes contra o Postgres **5/5**.
Blocos **141→142**.

## 2026-08-08 — CHK-P1-PR-02D (PR pendente) — **fecha o editor do builder**

**Pré-visualização no frame de telefone**: modal grande e, em telas largas, uma quarta coluna encaixada no
editor. Os 10 tipos de campo renderizam a partir do rascunho real, com resumo do modelo e Publicar ali mesmo.
Com isso o builder fica completo — lista, editor, inspector tipado e prévia.

**A junta reprovou no pixel** (desta vez renderizando e medindo em navegador real, como exigido) e o achado
mais importante não foi de pixel: **a prévia mentia**. Ela prometia "renderização fiel do formulário no
aplicativo" enquanto desenhava nove configurações que o app de campo **não honra** — inclusive um tipo
inteiro. A correção não foi maquiar: a tela passou a dizer o que ela realmente é, *"como o formulário fica
montado"*, e a pendência da plumbagem continua aberta e visível.

Também: com a prévia encaixada, **toda gravação quebrava o layout** (o painel do telefone saltava de linha,
medido em ~84ms mesmo sem latência), e o botão principal de publicar era **inerte ao mouse** — um seletor de
hover que repetia os próprios valores, anulando o feedback, a quarenta pixels de outro botão que funcionava.

**Contagens (execução real):** smoke **1091→1108**; backend 2.114 e Flutter 839 carregados. Blocos **142→143**.

## 2026-08-17 — KPI-PAINEL-REPAGINADO (PR pendente) — **o painel refeito do zero, e três defeitos que ele achou**

O dono pediu o painel repaginado para mostrar a investidores: gráficos de desempenho e conclusão, as últimas
demandas, os bugs achados/adiados/corrigidos, o progresso atual e o cronograma completo com checklist. Os três
arquivos (`index.html`, `app.js`, `styles.css`) foram **reescritos do zero**; os JSON são indeléveis e só
receberam acréscimo.

**O gráfico contava duas continuidades falsas.** A série do backend salta de 15 para 766 em 13/07, e a do
console web de 44 para 378 no mesmo dia. Nenhum dos dois foi crescimento: o próprio histórico registra que a
medida do backend **passou a contar a suíte inteira** (antes só o núcleo) e que o 44 do console **estava
congelado** desde uma entrega anterior. Ligados por linha contínua, diziam a um investidor "51× em um dia".
Agora a série **quebra** ali, com régua tracejada e a explicação sob o gráfico. A quebra é declarada como dado
(`series_breaks`) e localizada pela **transição** — a primeira versão usava a data e caiu na linha errada,
porque cinco entregas dividem o dia 13/07. Quem pegou foi o guard.

**Um achado crítico da auditoria estava órfão.** O `Ω6R-DAT-004` nasceu na reconciliação de 14/08, depois do
plano de correção (11/08), e **nenhum bloco o corrigia** — aberto e invisível para quem lesse o plano. Virou
o `B-O6R-12`, marcado como adendo pós-junta, com critério de aceite **provisório** até a junta do bloco.
Encontrado pelo guard de paridade, na primeira execução.

**O registro da auditoria estava defasado** do próprio JSONL: dizia 29 ativos enquanto os dois achados fechados
pelo #353 já tinham rastro. Reconciliado, com a Fase 6 registrada.

**Dois mecanismos, para nenhum dos três voltar por disciplina esquecida:**
`tests/kpi-achados-paridade.test.ts` exige que registro, painel e cronograma contem a mesma história — e trava
a saída fácil: zerar o contador de críticos **não** libera produção, trocar o veredito exige junta nova
registrada. E `scripts/kpi-freeze.mjs` gera a cópia congelada do modo `file://`, que o guard compara — editar o
JSON e esquecer de reinjetar falha na bateria, em vez de o painel mostrar número velho.

O guard dos gráficos foi reescrito para o painel novo: **6 → 11 testes**, com os seis invariantes antigos
preservados e cinco novos (mutação do histórico move a curva; paridade da cópia congelada; quebra desenhada;
semana vazia é zero verdadeiro; histórico ilegível não derruba a página).

O **88%** manteve o número e ganhou rótulo e ressalva: mede **escopo entregue**, não prontidão. A prontidão é a
outra dimensão, e está **reprovada** — 13 dos 15 achados críticos seguem abertos.

### A revisão adversarial pegou duas regressões desta própria reconstrução

Com o painel pronto, seis lentes independentes o atacaram: **37 achados levantados, 19 confirmados** por
céticos que tentaram derrubá-los. Os dois piores eram meus.

**O 88% é declarado ESTIMATIVA na fonte, e a reconstrução tirou essa ressalva da tela.** O painel anterior
mostrava *"Percentual estimado, sujeito a revisão humana"* como texto visível — provado executando as duas
versões lado a lado. A reconstrução moveu a frase para um campo que a tela não lê **e**, no mesmo movimento,
promoveu o número de um cartão de 14px entre seis para a **manchete de 44px com barra de progresso**. Um
palpite ganhou a gramática visual de *"2 de 15 achados críticos corrigidos"*, que é contagem real — numa
página feita para investidor.

**O gráfico de "ritmo de entrega" contava snapshots publicados, não entregas.** Desenhava **zero na semana
em que 45 PRs mergearam** (as rodadas daquele período adiaram a publicação de KPI de todos os seus PRs para
um snapshot único) e **42 numa semana de 15 entregas**. Errava nas duas direções, sob o título "Desempenho".
E o teste que eu havia escrito para proteger este gráfico afirmava, com todas as letras, que aquele zero era
*"VERDADEIRO"* — a mesma classe de defeito que este projeto persegue há rodadas, cometida dentro da própria
defesa. Trocado pelo **delta do acumulado de blocos**, que é medição real; semana sem medição vira faixa, não
zero, e barra que acumula um intervalo leva asterisco.

**Consertar reintroduziu a mesma classe duas vezes.** O texto novo do `caveat` trazia uma cláusula presa ao
estado (*"está reprovada até os achados críticos fecharem"*), e a faixa que substituiu o zero falso nasceu
**sem regra de CSS** — o navegador a pintou de preto e ela virou a maior barra do gráfico, pior do que o
defeito original. Nenhuma leitura pegou; os testes pegaram.

**Dois achados que o cético havia refutado estavam certos.** Medidos em vez de discutidos: a série do app de
campo ficava em **2,74:1** (piso de 3:1 para objeto gráfico) e o alvo de toque em **31px** (a DoD exige 44).
Ambos corrigidos.

### Terceira passada: a quarta ocorrência estava dentro da correção da segunda

Rodada estreita, só sobre o que a segunda correção tocou, com a instrução de achar a quarta instância. Achou.

**"Semana ainda em curso" é afirmação sobre o relógio, produzida por um cálculo que se recusa a olhar o
relógio.** O comentário do próprio código declarava a recusa, com bom motivo: usar o relógio faria a marca
aparecer e sumir sozinha conforme o dia em que alguém abrisse a página, e nenhum teste poderia prová-la. O
texto então afirmava o fato de que a decisão abriu mão de saber. Hoje é verdadeiro por coincidência —
truncando o histórico **real** antes da lacuna de 17 dias de junho, o painel afirma *"ainda em curso"* sobre
uma semana encerrada havia 12 dias, e o gatilho dispara em **35 de 35** cortes reais de publicação.

O que decidiu foi a **direção do erro**: ele adula. Converte *"faz duas semanas que ninguém publica KPI"* em
*"a semana mal começou, a barra pequena é normal"* — numa página que o investidor abre na agenda dele.

Mais duas na mesma frase: `diasMedidos` era o span de dias de calendário desde a segunda-feira, não a
contagem de dias com medição (na semana de 15/06 o rótulo dizia 4 e havia snapshot em 3); e a marca só olhava
a **última** semana, quando a **primeira** é igualmente recortada pela borda da série. Corrigido para afirmar
apenas cobertura de janela, com as datas que a produziram, nas duas pontas, sem relógio.

**E faltava um gráfico.** O `CLAUDE.md` §C3.0 exige quatro; havia três. Portado o *entregas por rodada* do
painel anterior em vez de reinventado, com as duas ressalvas que ele já carregava e que agora aparecem na
tela: a rodada é lida do **nome da versão** (não é campo declarado) e o gráfico **corta em 19/07/2026**,
quando o registro virou contínuo — antes disso uma rodada inteira cabia num snapshot.

**Três rodadas, quatro instâncias da mesma classe, todas nascidas em correções — nenhuma no código
original.** A lição, que não estava escrita em lugar nenhum: revisar o código é metade do trabalho; revisar a
correção é a outra metade. Quem conserta acabou de convencer a si mesmo de qual é o problema e escreve o
conserto com a mesma confiança que produziu o erro. Nenhuma releitura pega isso — só execução pega.

**Contagens (execução real):** backend **2437/2446 → 2458/2467** (+21 testes, cada um nascido de um defeito
real: 5 de paridade da auditoria, 10 de gráfico, 6 de tema); console web 1.125 e app de campo 860 carregados
(§C3.3 — o PR não os toca). Blocos **149→150**.

## 2026-08-18 — B-O6R-01 (PR pendente) — ciclo 2: o número volta a reproduzir

O ciclo 1 do B-O6R-01 publicou `backend 2547/2556 · fail 0` — e a reexecução independente do orquestrador
devolveu `2542/2552 · fail 1 · exit 1` (achado **B-6** do `R-B-O6R-01-ciclo1`). Não era ruído: o arnês `-db`
criava roles/grants em paralelo disputando linhas de catálogo do Postgres (`XX000 tuple concurrently
updated`, ~25%), o arquivo abortava e a suíte rodava **menos testes reportando um total plausível**. (O
registro do ciclo 1 nesta série entrou só no JSON, sem seção neste arquivo — declarado aqui em vez de
corrigido em silêncio.)

O ciclo 2 corrigiu em 3 fatias (mesma branch): **fatia 1** — `ROLE_AUTHORITY` como fonte única fail-closed
por construção (papel novo sem classificação = `TS1360`, não compila) + o caminho Prisma com teste que
morre (drill: sem o guard, `PATCH self→super_admin` devolvia 200 e persistia); **fatia 2** —
`pg_advisory_xact_lock` no arnês + sweep de 18 roles órfãs + a prova da terceira armadilha sob role efêmera
`NOSUPERUSER`; **fatia 3** — honestidade dos artefatos (caracterização M-1: o DONO `NOSUPERUSER` desliga o
trigger append-only; erratas em `decisoes.md`; validação de borda 400/404 sem erro cru do Postgres; guard
10c; pendências `P-O6R-B01-ROLE-LITERAIS` e `P-O6R-B01-ROUTE-ERROR-LEAK`).

Números deste snapshot, todos de execução real desta árvore: `npm test` **2557/2567 · fail 0 · 10 pulos
declarados**; batch `-db` na forma exata do job `backend-postgres` **145/145 · 0 pulos · contagem idêntica
em 3 execuções** (fatia 2: 16 execuções idênticas com 142, antes dos 3 casos novos). Flutter `864/864` e
smoke web `1126/1126` **carregados** (trilhas não tocadas — §C3.3).

## 2026-08-19 — B-O6R-01 (PR pendente) — ciclo 3: o escopo entra na sentença, e a medição decide o resto

O ciclo 2 morreu por *"verde onde ninguém mediu"*: o batch `-db` era vermelho em 4 de 12 na forma exata do
job `backend-postgres`, por duas causas que o próprio bloco introduziu — o backfill da suíte rodando a
sentença da migração **sem escopo sobre a base inteira** (23503/23505 contra 22 suítes irmãs) e o **quinto
escritor de catálogo** fora do advisory lock (`XX000`). O crítico do ciclo 3 reabriu a premissa: o defeito é
de **arranjo**, todo lock é workaround, e o orquestrador dividiu a entrega — fica no bloco só o que ele
criou (`R-B-O6R-01-ciclo3-premissa.md`).

O que o ciclo 3 entregou (plano `B-O6R-01-ciclo3-correcao-v1.md`, C1–C6): **C1** — `scopeBackfillSql`
injeta a cláusula de escopo por âncora textual exata, fail-closed dos dois lados (âncora ausente → reprova;
ida-e-volta → byte-idêntico ao verbatim), com **tripwire do terceiro simulado**; a prova do verbatim volta
ao `prisma migrate deploy` da CI, onde ele é estruturalmente o único escritor (perda declarada). **C2** — a
sequência de catálogo do "dois lados do DONO" virou `createCloneOwnerProbe` no arnês, inteira dentro de
`withRoleCatalogLock`, com prova de fila (waiter em `pg_locks` + conclusão só após o release) e a
enumeração REAL dos escritores no comentário (correção vinculante nº 4). **C3** — ratchet lexical
`db-catalog-write-guard` com allowlist congelada por arquivo e contagem (alcance declarado: maiúsculas;
concatenação escapa). **C4** — o varredor cobre as duas famílias do arnês; as 5 órfãs legadas
`o6r_clone_owner_` foram recolhidas na primeira execução. **C5** — as 231 linhas órfãs da trilha FICAM
(`P-O6R-B01-TRILHA-ORFA-LIMPEZA`; alcançá-las contorna o append-only → junta com privilégio). **C6** —
errata apensada ao plano v6: a frase "nenhuma suíte muda catálogo" é falsa ao pé da letra, e foi ela que o
dev do ciclo 2 tinha diante de si ao escrever "quatro escritores".

**Os 4 drills, todos vermelhos quando mutados e revertidos byte-idênticos:** A (verbatim no lugar do
escopado → tripwire `1 !== 0`) · B (arquivo fora da allowlist → vermelho; um GRANT a mais em arquivo
congelado → `contagem 6 difere da congelada 5`) · C (helper sem o lock → `true !== false`, o helper
concluiu antes do release) · D (regex do sweep revertida → órfã sintética viva, `1 !== 0`).

**A prova, com N e forma declarados (§6):** F1 — **12/12 exit 0** na forma exata do job (`env:` completo,
`db:seed` a cada iteração, `pipefail`, exit de `PIPESTATUS[0]`), denominador **148 idêntico nas 12** (145 do
ciclo 2 + 3 casos novos), `grep XX000|23503|23505|40P01` = **0 nos 12 taps**, 0 pulos. F2 — suíte inteira
3×, memory, sem seed: **2562/2572 · fail 0 · 10 pulos declarados**, denominador idêntico (smoke da segunda
forma, não prova de paridade). F4 — sonda somente-leitura sobre o SELECT **escopado** durante o F1: **713
amostras, 0 instantes com linha de terceiro** no conjunto-alvo (contra 38,9% no arranjo vetado). Ambiente
declarado: `availableParallelism()=8`, teto efetivo do `node --test` = 7 (P1 fica fora do bloco).

**O que a medição contrariou no plano, dito sem maquiagem:** o contador de órfãs deu **231 → 243 (+12, ≈1
por iteração)** — o condicional do C5 disparou. A atribuição, fechada por execução isolada, aponta
`core-saas-role-authority-db` — suíte **do próprio bloco** (ciclo 2/B-4), não a "suíte irmã" que o plano
presumia: o JWT direto + PATCH/POST `/users` sob `prisma` aciona a normalização preguiçosa (§3.4, por
desenho), e o teardown apaga o tenant sem conhecer a trilha. Evidência registrada nas duas pendências
(`P-O6R-B01-TRILHA-ORFA-LIMPEZA` + `P-O6R-ARNES-ISOLAMENTO`) **sem remendo** — o plano proíbe conserto
improvisado neste ramo, e a escolha do destino é da junta. F3 (CI no PR) não roda neste ciclo: sem PR, por
instrução do orquestrador.

Números deste snapshot, todos de execução real desta árvore: `npm test` **2562/2572 · fail 0 · 10 pulos**;
bateria focada **92/92** (22 memory + 69 `-db` + 1 ratchet, contagem idêntica em 2 execuções). Flutter
`864/864` e smoke web `1126/1126` **carregados** (trilhas não tocadas — §C3.3).

## 2026-08-20 - B-O6R-02 F6 — autoria de atomicidade financeira

### Resultado

| KPI | Valor |
|-----|-------|
| Backend | 2617 / 2627 (0 fail, 10 pulos DB-gated declarados) |
| Focados | 178 / 178 (79 títulos + 67 lançamentos + 32 PostgreSQL) |
| Flutter | 864 / 864 — carregado, trilha não tocada |
| Frontend Smoke | 1126 / 1126 — carregado, trilha não tocada |
| Blocos mergeados | 151 — B-O6R-02 ainda não entrou na main |

Autoria funcional concluída em seis fatias: UoW de pagamento/estorno/cheque, trava compartilhada de
competência e CAS tenant-scoped de PATCH/DELETE de título. A nova regra deriva `paid`/`partially_paid` no
mesmo `UPDATE`, bloqueia nominal abaixo do pago e exige estorno antes do delete lógico. Os seis achados
`DIN-001..004`, `DIN-008` e `QUA-003` estão em **aguardando_merge**; não contam como corrigidos na main.

Prova PostgreSQL real: cinco suítes isoladas **4+6+4+4+14**, juntas **32/32**, zero fail/skip. Lote na forma
do job `backend-postgres`: **10/10**, `db:seed` em toda iteração, denominador 32 idêntico e zero ocorrências
de `XX000|23503|23505|40P01`. Drills D4/D5/D8 ficaram **12 pass/2 fail** sob mutação e voltaram a **14/14**
após restauração; D9 foi comprovado no ciclo 1 e preservado no commit isolado `b8ec196`.

`pr`, `merge_commit` e `approved_head` permanecem `null`. O gate `G-A109FD7-PUBLICADO` bloqueia push/PR do
B-O6R-02 até o follow-up do porteiro #357 entrar na main e esta bateria ser reexecutada. Deploy segue
bloqueado pela J-6R; `mvp_demo`/`mvp_vendavel` permanecem inalterados.

## 2026-08-22 - B-O6R-02 ciclo 2 — os quatro bloqueantes da junta 5/5

### Resultado

| KPI | Valor |
|-----|-------|
| Backend | 2636 / 2646 (0 fail, 10 pulos DB-gated) |
| Focados | 240 / 240 (79 titulos + 73 lancamentos + 41 cheques + 8 UoW + 39 PostgreSQL) |
| Flutter | 864 / 864 — carregado, trilha nao tocada |
| Frontend Smoke | 1126 / 1126 — carregado, trilha nao tocada |
| Blocos mergeados | 151 — B-O6R-02 ainda nao entrou na main |

A junta `J-B-O6R-02-ciclo1` reprovou 2x3 e nomeou quatro bloqueantes. Os quatro fecharam:

- **B-1/B-2** — apagar o lancamento de uma LIQUIDACAO era aceito: o caixa voltava e o titulo continuava com
  `paid_amount`, sem rota de saida (delete 422 `title_has_payments`, reverse 404). Agora o `delete` RECUSA
  (422 `settlement_entry_immutable`); desfazer e so pelo `reverse`, que devolve na mesma unidade. A regra:
  lancamento vinculado a um agregado so se desfaz pelo fluxo do agregado.
- **B-3** — o lancamento de compensacao de cheque podia ser estornado por fora da maquina de estados, e o
  `bounce` seguinte devolvia outra vez: **200 num cheque de 100**. Agora 422 `cheque_entry_immutable` nas
  duas portas, e a invariante nos testes virou de EFEITO (net do razao), nao de existencia de linha — era
  exatamente por ai que o ataque passava.
- **B-5** — as barreiras eram cluster-wide num job que roda 29 arquivos em processos paralelos, e promessas
  seguradas por `await`s podiam rejeitar sem handler. Agora a barreira e escopada por `application_name`,
  com controle negativo permanente por decoy, e o handler e anexado na criacao.
- **B-4** — `CLAUDE.md` e `AGENTS.md` sairam do PR e voltaram ao `origin/main`; a divergencia do §C7.4-bis
  entre as duas branches ficou REGISTRADA em `decisoes.md`, sem consolidacao silenciosa (§A2).

Prova no arranjo que a junta cobrou: **lote na forma exata do job**, 29 arquivos num unico `node --test`,
`db:seed` antes, `pipefail`, denominador publicado por iteracao — **15/15 verde**, denominador constante
**187**, zero skip e zero `unhandledRejection|XX000|23505|40P01`. No ciclo 1 esse mesmo arranjo dava 1 falha
em 15. Suites PostgreSQL isoladas: 4+8+6+15+4+2 = **39**, zero skip.

Drills D10-D14, cada um com baseline verde, mutacao vermelha com exit code anexado e restauracao conferida
por md5: D10 (guard de liquidacao) 3/72 e 2/22 vermelhos; D11 e D12 (guard de cheque no `reverse` e no
`delete`) 2/41, 1/73 e 1/5; D13 (undo-log volta a snapshot integral) 1/8; D14 (barreira volta a cluster-wide)
1/2. Todos voltaram ao verde apos restauracao, sem residuo no `git diff`.

Diagnostico §9.6, que alimenta `P-O6R-ARNES-ISOLAMENTO` **sem concluir causa**: `npm test` COM `DATABASE_URL`
3/3 verde; SEM `DATABASE_URL` 3/3 vermelho, com causa nomeada e **pre-existente**
(`tests/core-saas-role-authority.test.ts` cai no carregamento porque importa o caminho Prisma sem sentinela
de auto-skip). A classe `XX000` do ciclo 1 **nao reproduziu**, e este registro nao a atribui a nenhuma das
duas condicoes.

`Ω6R-DIN-002` foi reaberto pelo B-1; `Ω6R-DIN-010` e `Ω6R-DIN-011` nasceram da junta. Os tres estao
corrigidos na autoria e em **aguardando_merge** — nenhum conta como corrigido na main. `pr`, `merge_commit` e
`approved_head` seguem `null`; `mvp_demo`/`mvp_vendavel` intocados. Deploy segue bloqueado pela J-6R e o gate
`G-A109FD7-PUBLICADO` continua bloqueando push/PR/merge.

## 2026-08-24 - B-O6R-02 ciclo 3 — as quatro PROPRIEDADES, nao mais os exemplares

### Resultado

| KPI | Valor |
|-----|-------|
| Backend | 2717 / 2719 (0 fail, 2 pulos) — forma canonica 3: banco descartavel SO-MIGRADO, sem seed |
| Backend, mesmo arranjo ANTES do ciclo | 2651 / 2659 com **6 fail** — as seis eram o B-3 |
| Focados | 277 / 277 (64 titulos + 73 lancamentos + 45 cheques + 12 helper de razao + 3 censo + 35 harness do journal + 45 PostgreSQL) |
| Lote na forma exata do job | 15 / 15 verde, denominador constante **193**, zero sujeira |
| Flutter | 864 / 864 — carregado, trilha nao tocada |
| Frontend Smoke | 1126 / 1126 — carregado, trilha nao tocada |
| Blocos mergeados | 151 — B-O6R-02 ainda nao entrou na main |

A junta `J-B-O6R-02-ciclo2` reprovou 3x2 com uma frase que governa este ciclo inteiro: **"os defeitos do
ciclo 1 estao fechados; a CLASSE que os gerou, nao."** O ciclo 1 fechou o B-2 acrescentando o membro que
faltava a uma lista escrita a mao — e por isso o ciclo 2 reprovou pelo mesmo motivo. Aqui mudam as
propriedades; os patches sao consequencia.

- **P6 (fecha B-1)** — o invariante de efeito do cheque passa a somar o **fecho por estorno** dos lancamentos
  vivos alcancaveis a partir das pontas, e a selecao acontece DENTRO do helper. A raiz nao era a formula, era
  a **fronteira de confianca**: a contrapartida do estorno nasce SEM vinculo com o cheque (liga-se ao original
  por `reversal_of`), entao nenhum dos dois carregadores a enxergava e o helper somava so a compensacao —
  +100, o valor esperado, verde perfeito sobre metade do razao. As tres copias do carregador (memoria, HTTP e
  Postgres) pararam de selecionar e passaram a asserir a propria promessa de completude; os checkpoints de
  ataque foram re-armados com **captura liquidada**, porque era o `assert.rejects` que abortava o caso antes
  de o helper chegar a rodar. Suite nova do PROPRIO helper (12 casos sinteticos), que o ciclo 2 nunca teve.
- **P5 (fecha B-2)** — vinculo de agregado fail-closed **por construcao**, e em `src/` por restricao MEDIDA:
  `npm run check` so compila `src/**`, logo um `satisfies` escrito em arquivo de teste nao e conferido por
  build nenhum. Classificacao total dos campos do lancamento e do cheque; politicas celula a celula por dono
  x rota, sem `else`; ordens de precedencia como dado com igualdade de uniao; **fonte unica** das duas pontas
  do cheque consumida pelas DUAS copias de repositorio (o literal escrito a mao morreu dos dois lados); censo
  do schema por texto, fail-closed nas duas bocas.
- **P7** — os tres contratos de repositorio ganham mapa `write`/`read`/`test_reset` exaustivo pelo compilador,
  e a classificacao passa a ser julgada **por execucao**: cada membro e exercido dentro de uma unidade que
  ABORTA, e o estado dos tres repositorios tem de voltar identico. 30 membros exercidos + 3 `test_reset`
  asseverados ausentes do contexto.
- **P8 (fecha B-3)** — a pre-condicao de catalogo volta ao padrao da casa (auto-provisionar, idempotente e sem
  clobber, sem reabrir a classe `XX000` do upsert), e o job `backend` **permanece seedless de proposito**,
  porque e o detector permanente: qualquer suite futura que volte a assumir catalogo pronto fica vermelha no
  primeiro PR que rodar CI.

Drills **D15-D20**, cada um com baseline verde medido, mutacao vermelha com exit code anexado e restauracao
conferida por **md5**. O controle mais forte e o do D15: o helper ANTIGO (md5 `88ede9ef597a272e35b7a18178858a1c`),
sobre o **mesmo estado** e na **mesma execucao**, fica VERDE nos dois checkpoints do D11 enquanto o novo fica
VERMELHO — a cegueira do B-1 reproduzida e fechada lado a lado. **D10/D11/D12 re-executados** sobre o codigo
refatorado, para provar que o refactor de enumeracao nao afrouxou guard nenhum.

**Achado de medicao desta rodada, corrigido pelo proprio autor antes da junta:** `node --test <arquivo
inexistente> <arquivos validos>` sai com **exit 0 e descarta o inexistente em silencio**. Por isso um
contraste do D19a publicado durante a autoria estava errado — nao incluia `financial-uow-memory.test.ts`. A
medicao corrigida esta no `log-execucao`: as suites pre-existentes sao cegas a `titles.restorePaymentGuarded`
(190/190 verde sob a mutacao, que e exatamente o membro do ataque do ciclo 2) mas **nao** a
`cheques.transition`, que ja tinha guarda.

Ressalva de arranjo registrada **sem conclusao causal**: no worktree isolado nao existe `.env`, entao
`DATABASE_URL` esta genuinamente ausente e `npm test` na forma canonica 1 da 2445/2381/**1 fail**/63 skip. A
falha e `tests/core-saas-role-authority.test.ts`, que quebra no LOAD do modulo porque `src/database/prisma.ts`
exige a variavel — **pre-existente** (medida identica no head da branch antes de qualquer alteracao deste
ciclo) e ja registrada em `P-O6R-ARNES-ISOLAMENTO` pelo ciclo 2.

Nenhum achado muda de status: a junta 5/5 do ciclo 3 ainda **nao ocorreu**. `pr`, `merge_commit` e
`approved_head` seguem `null`; `mvp_demo`/`mvp_vendavel` intocados; `blocks_completed` inalterado. Deploy segue
bloqueado pela J-6R e o gate `G-A109FD7-PUBLICADO` continua bloqueando push/PR/merge.

## 2026-08-25 - B-O6R-02 CICLO 4 (fecha B-1..B-5 DE UMA VEZ, cada um pela CLASSE) — Node v20.19.5

### Resultado

| KPI | Valor |
|-----|-------|
| Backend (canonica 3) | 2743 / 2745 (ciclo 3 na mesma forma: 2717/2719 — +26) |
| Focados | 300 / 300 (memoria 248 + Postgres 52) |
| Flutter / Frontend Smoke | 864/864 · 1126/1126 (CARREGADOS — trilhas nao tocadas, §C3.3) |
| Blocos Entregues | 151 (inalterado — so incrementa apos merge) |

Ordem do dono: *"faca direito para so fazer uma vez. acabe com esses bugs."* Os CINCO bloqueantes da
`J-B-O6R-02-ciclo3` fecham num ciclo so, cada um pela CLASSE.

- **C1/P9 (B-1)** — o `delete` entra no MESMO lar do `reverse`: `uow.run` + `findByIdForUpdate` (FOR UPDATE) +
  re-check dos vinculos SOB o lock; o perdedor da corrida recebe os MESMOS erros do controle sequencial
  (422/404), nenhum codigo novo. E a migration ADITIVA `add_reversal_pair_atomicity` com par de triggers que
  torna a metade orfa impossivel no banco mesmo para SQL cru (o `FOR SHARE` do trigger do estorno serializa os
  dois caminhos no row lock do original). Suites PERMANENTES de corrida medem **as DUAS ordens de disparo** —
  medido: a corrida fabricava **19/20** em memoria, e a Forma B (delete-first, HTTP) media **0/20**, o
  verde-cego que obriga medir as duas ordens.
- **C2/P5-v2 (B-2)** — os detectores de dono DERIVAM de `FINANCIAL_ENTRY_FIELD_CLASS` (`UNDO_OWNER_FIELDS`): o
  valor da classificacao ganhou consumidor; mudar a classe de qualquer campo muda o comportamento (D22 as duas
  direcoes).
- **C3/P7-v2 (B-3-novo)** — o harness de classificacao so julga fixture VIVA (write prova que mutou durante a
  unidade; read prova retorno nao-vazio).
- **C4/P6-v2 (B-4)** — ponta declarada ausente do razao e ERRO nos 5 status (medido: passava em **4/5** em
  silencio); um caso committado por carregador (memoria e -db) depende da linha apagada estar no razao.
- **C5 (B-5)** — guard de skip do runner (P8) com `DATABASE_URL` presente (orcamento 2, os dois skips
  `RBAC_DB_PARITY` nomeados); contrato re-versionado `...c4` com a concorrencia amarrada por nome as suites; e a
  **CORRECAO da afirmacao FALSA do ciclo 3**.

**Correcao (C5.2):** a nota do ciclo 3 dizia que `node --test <arquivo inexistente> <validos>` sai **exit 0** e
descarta o inexistente em silencio. Re-medido no **Node 20.19.5** (o do `package.json` e dos 3 jobs do
`ci.yml`): e FALSO — sai **EXIT 1** com `Could not find '...arquivo-que-nao-existe.test.ts'` e NADA roda. O exit
0 com descarte silencioso e comportamento do **Node 22** do dev que publicou a medicao, nao do Node da CI.

**Drills D21-D28** com controle, exit registrado e restauracao conferida por MD5 (D21 obriga as duas ordens; D23
usa o drop dos triggers como controle pre-migration no mesmo cluster; D28 prova up->down->re-up + o WARNING do
censo com orfao semeado). **Divergencia registrada** `D-DIVERGENCIA-C4-PONTA-AUSENTE` (`controle/pendencias.md`):
o C4.1 reabre um teste do ciclo 3 que afirmava o oposto — segui o plano e registrei a divergencia com evidencia
para a junta decidir (§C7.4-bis: quem implementa registra, nao resolve por fiat).

Nenhum achado muda de status: a junta 5/5 do ciclo 4 ainda **nao ocorreu**. `pr`, `merge_commit` e
`approved_head` seguem `null`; `mvp_demo`/`mvp_vendavel` intocados; `blocks_completed` inalterado. Deploy segue
bloqueado pela J-6R e o gate `G-A109FD7-PUBLICADO` continua bloqueando push/PR/merge.

## 2026-09-03 - B-O6R-02 CICLO 5 (TETO) — a FK do par, o `[RLS]` real e o número que sobrevive à forma

### Resultado

- `backend_tests` **2609/2611 -> 2769/2771** (execução real, N=10, forma canônica 3 declarada)
- `flutter_tests` 864/864 · `frontend_smoke_tests` 1126/1126 · `backend_contract_tests_focused` 34/34 — **CARREGADOS** (§C3.3; o PR não toca `mobile/`, `frontend/` nem os arquivos da bateria focada do #359)
- `mvp_demo` 99% e `mvp_vendavel` 88% **INTOCADOS** — `src/**` tem diff vazio
- `blocks_completed` **157**, sobe para 158 **só quando este PR mergear**
- Backfill §C3.5 do **#368** pago na entrada `SAN2-6`: `pr` 368 · `merge_commit` `f895dd2` · `approved_head` `d90fbbb` (head **julgado** da ata, não o headRefOid `9051e9b`)

### O que entrou

**A FK composta do par de estorno**, em migration nova e aditiva (`20260871000000_add_reversal_pair_fk`):
censo `DO` fail-closed → `ADD CONSTRAINT ... NOT VALID` → `VALIDATE` → down no rodapé. Ela fecha **por
construção** (`23503`) as duas portas cruas que os triggers do ciclo 4 não alcançavam e que o §0.d mediu
como aceitas: DELETE físico do original com estorno vivo, e rename da PK do original. `schema.prisma`
intocado; nenhum índice novo.

**O caso `[RLS]` deixou de mentir.** Antes rodava como superusuário e passava com os triggers derrubados;
agora roda sob papel efêmero `NOBYPASSRLS` do mecanismo único do arnês, com a postura asserida por
execução e a política provada mordendo. **D34**: triggers no down → VERMELHO; re-up → verde.

**O censo de legado ganhou caso permanente** (órfão semeado em tenant próprio, bloco `DO` extraído do
`.sql` da migration, WARNING nomeado observado, controle negativo mudo).

### Bateria — N e forma em cada número

Cluster descartável próprio; base viva `erp-postgres`/`erp-redis` sem um único comando. Node v20.19.5,
**106** migrations.

| medida | N | resultado |
|---|---|---|
| **Canônica 3** (`npm test`) | 10 sequenciais | **10/10 ec=0**, denominador **idêntico nas dez**: `261 arquivos · 2771 testes · pass 2769 · fail 0 · skipped 2`; **Δroles = 0** nas dez |
| **Canônica 2** (seed + 34 suítes do `ci.yml`) | 15 | **15/15 ec=0**, denominador **225 constante**, 0 hit de `unhandledRejection\|XX000\|23505\|40P01` |
| **Canônica 1** (sem `DATABASE_URL`) | 3 | `ec=1` nas três — vermelho **ambiental declarado**, nomeado pelo piso do #359 |
| **Corrida -db isolada** | 10 | 10/10, **9/9** casos, zero SQLSTATE proibido |
| **D35** (`up→down→re-up`) | 1 | `pg_constraint` **5→4→5**; no down **só os 2 casos C9 caem**; `VALIDATE` 3.635 ms |
| **D29** (bateria barata, lista-6) | 13 | 13/13, forma `(6, 37)` constante, 0 `XX000` |

### O que não fechou — com o produtor nomeado

O **vazamento linear** das rodadas verdes (+10/rodada) teve as **TABELAS** nomeadas por execução, em
rodada instrumentada com snapshot por tabela: `auth_identities` **+5** e `auth_identity_link_events` **+5**
por rodada, mais `permissions` 1→15 uma única vez (idempotente — explica os +24 da primeira).
**CORREÇÃO PÓS-CRÍTICO (ACHADO-4, aceita):** a publicação inicial dizia "produtor nomeado por execução" e
listava quatro arquivos vindos de **grep**; o `critico-c5-adversarial` executou os quatro isolados e todos
medem **0/0** — o escritor entra pela camada de serviço, não pelo nome literal da tabela. O único vazador
medido é `tests/core-saas-role-authority-db.test.ts` (**+1/+1**), que estava **fora** da minha lista, e os
**+4/+4 restantes seguem sem produtor nomeado**. Tabelas nomeadas por execução; **arquivo produtor, não**.
Matéria `pre-existente` (EMENDA item 1). **Não consertado aqui, por desenho.** O vermelho ambiental da canônica 1 virou pendência própria
(`P-O6R-B02-CRASH-NO-LOAD-SEM-SKIP`).

### O guard que cobrou antes da junta

A canônica 1 acusou `kpi-achados-paridade` em 3 casos, e **ele estava certo**: a resolução main-integral do
S0-zero apagara `Ω6R-DIN-010/011` do censo do painel (`p0_total` 15 contra 17 no `achados.jsonl`), mais 6
estados divergentes. Reconciliado neste PR — `p0_total` **15→17**, `p0_abertos` **11→13**, os dois achados
no cronograma do bloco. É a obrigação que o CP-3 mandou escrever, e um guard a cobrou primeiro.
