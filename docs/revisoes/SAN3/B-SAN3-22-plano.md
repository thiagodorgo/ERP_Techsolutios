# B-SAN3-22 — Checklist: trava otimista no modelo e vistoria em andamento protegida (`P-CHK-PATCH-SEM-LOCK`) — **plano v2**

> **Papel:** `planejador-mestre` (identidade `planejador-san322-fable`) · **modelo:** Fable (claude-fable-5-1), o do frontmatter — sem fallback. Rodada final (§C7, máximo de 2 rodadas de crítica): cada achado da r1 virou requisito com critério e mutação.
> **Ref medida (§A7):** `origin/main` = `b08c755719a6cb0ed192fa04e549ac5fc67a3e67` (`git fetch` em 2026-10-25; inalterada desde a v1), lida no worktree detached `C:/Users/AMP/w-plan22b` (removido ao fim). Base viva (5432/6379, `erp-*`) não tocada.
> **v1** preservada em `C:/Users/AMP/erp-pausa-2026-10-03/planos/B-SAN3-22-plano-v1.md`. **Crítica r1:** `C:/Users/AMP/erp-pausa-2026-10-03/revisoes/B-SAN3-22-critica-r1.md` (`crit-san322-opus-r1`, Opus declarado): VOLTA AO PLANO — 3 `bloqueia` (A-05, A-07, A-09), 8 `ajuste`, 4 notas.
> **Respostas do dono (25/10) — NÃO se reabrem, e esta v2 é escrita a partir delas:** Q1 **A "só textos"** (com "tornar opcional" e "adicionar campo opcional" contando como mudança de campo) · Q2 **obrigatório** · Q3 **sem migração** · tela: **3 opções**, as 3 aparências entregues pelo dev. Texto literal no fim do arquivo.
> **Gravação:** incremental (P1/P2); montada a partir de 16 fatias; nenhuma seção em apuração.

## §R — Resposta a cada achado da crítica r1

| Achado | Gravidade · escopo (crítico) | O que muda na v2 | Onde (seção · critério) |
|---|---|---|---|
| **A-01** ms × µs: o adaptador **trunca** (`.342999 → .342Z`, predicado = 1); sessão fora de UTC desloca o `updatedAt` exibido, não a trava | nota · pre-existente | Aceito. CE-4 passa a declarar sessão UTC e a cobrir `.999999`; nota de exibição no §11 R11 | §8.2 CE-4 · §11 |
| **A-02** corrida A=1/B=0 reproduzida | sem defeito | — (sustenta P1) | §0 M-09 |
| **A-03** TOCTOU de `createRun`: o lock `FOR NO KEY UPDATE` do UPDATE não barra o `FOR KEY SHARE` da FK; a run nasce carimbada com a versão **antiga** sobre a forma nova; o `FOR UPDATE` "opcional" não corrige o carimbo | ajuste · dentro | **Vira regra, não pendência.** O PATCH abre com `SELECT … FOR UPDATE` (conflita com `KEY SHARE`); `createRun` e `reopenRun` passam a ler `version`/`status` com `SELECT … FOR KEY SHARE` **dentro da própria transação** e carimbam o que leram ali. Testes determinísticos com transações controladas pelo arnês | §2.2 R6 · §8.2 CE-22/CE-23 |
| **A-04** `reopenRun` cria vistoria viva com `template_version` da forma que já não existe | ajuste · dentro | `reopenRun` carimba a versão **atual** lida sob `FOR KEY SHARE` (a run reaberta é preenchida contra o render vivo) e a reabertura entra na contagem de vivas; a promessa de P2 sobre `template_version` é reescrita com as duas ressalvas medidas | §2.2 R6 · §2.4 · §8.2 CE-24 |
| **A-05** `PATCH { status: draft \| archived }` com vistoria viva corta o render e recusa fotos; **Reativar** manda `draft` | **bloqueia** · dentro | Com vistoria viva, **a única troca de status permitida é `→ inactive`**: `→ draft` → 409 `template_has_active_runs`; `→ archived` pelo PATCH → 409 `status_requires_delete_endpoint` (porta única, sempre); `→ published` → 409 `status_requires_publish_endpoint` (já na v1). O Reativar da lista e do editor fica travado (padrão `aria-disabled` + clique que explica) enquanto `activeRuns > 0` | §2.2 R5 · §8.1 CE-9a–d · §8.4 CE-29 |
| **A-06** `DELETE` (arquivar) com vistoria viva: render 404 e **toda foto recusada**; a frase do §2.1 ("arquivar não apaga trabalho alheio") é falsa; o DELETE contorna a trava | ajuste · pre-existente | A frase sai. **DELETE ganha token** (`?expectedUpdatedAt=`, obrigatório, 409 se defasado). Arquivar **continua permitido com vistoria viva** — é o cenário que o despacho sustenta ("o modelo sai de circulação DEPOIS do despacho — a vistoria já está com o técnico", `tests/field-dispatch-multi-checklist.test.ts:181-192`) — mas o modelo arquivado **continua servindo as vistorias vivas dele** (render, foto, resposta), estendendo a opção (b) de `P-CHK-INATIVAR-COM-RUN-ATIVA`. É o que o §C7.1-ter(a) pede para um pré-existente: conserto nomeado no bloco que mexe na porta | §2.2 R5/R7 · §3 · §8.1 CE-10a–c · §8.2 CE-10-db |
| **A-07** "cosmético" incluía chaves de `config` que são obrigatoriedade (`minPhotos`, `requireBothStages`, …) e opções (`vehicleTypes`, `markerTypes`); contraria a Q1-A | **bloqueia** · dentro | **Classificação por propriedade, não por lista:** existe uma *allowlist* fechada de **caminhos de texto** (nome, descrição, `label`, `config.help`, nomes de seção); **todo** outro caminho que mudar é "mudança de campo". As 12 chaves de `config` do inspector são estruturais **por construção**, e o teste é tabela com as 12 (uma linha cada) | §2.2 R3 · §8.3 CE-18 |
| **A-08** sem `componentKey` a chave é posicional: trocar a ordem de dois campos do mesmo tipo troca a pergunta de uma resposta já dada | ajuste · dentro | `componentKey` **obrigatório** em cada item de `components[]` do PATCH (400 sem; o editor sempre manda — `checklist-editor.model.ts:128`); `orderIndex` não é texto → com vistoria viva, reordenar é mudança de campo | §3 · §8.1 CE-2b · §8.3 |
| **A-09** CE-12 não fica vermelho: a memória não tem predicado; a `-db` do CI roda como **superusuário** (ignora RLS); sem `tenant_id` o UPDATE novo grava em outra organização respondendo 404 | **bloqueia** · dentro | CE-12 vira **teste `-db` escrito para o superusuário**: contexto RLS da organização A, id e token do modelo de B → 404 **e** a linha de B byte-idêntica (SQL direto: `updated_by, updated_at, version, name, count(components)`). A mutação "tirar `tenant_id = $t` do `SELECT … FOR UPDATE`" grava em B **mesmo com RLS ignorado** → vermelho. Guard de forma secundário: o texto SQL do lock cita `tenant_id` antes de `FOR UPDATE` | §8.2 CE-12-db · CE-12-forma |
| **A-10** `POST /publish` sem token congela conteúdo que o publicador não leu | ajuste · dentro | **Publicar ganha token** (`{ expectedUpdatedAt }` obrigatório na porta HTTP; 409 `template_changed_since_read` se defasado). A assinatura interna aceita omissão **só** para chamadores em processo (não há caminho HTTP até ela sem token; guard: nenhum chamador de `publishTemplate(` em `src/` fora do controller/serviço). 16 chamadas HTTP em 13 arquivos de teste recebem a linha do token | §2.1 · §3 · §8.1 CE-11a–c · §5 |
| **A-11** 4 chamadas diretas a `updateTemplate` em 3 arquivos de teste fora do PERMITIDO | ajuste · dentro | Os 3 arquivos entram no PERMITIDO (só a linha do token). CE-13 passa a cobrir chamadas diretas (`repo.updateTemplate(`, `service.updateTemplate(`) além do HTTP | §5 · §8.1 CE-13 |
| **A-12** `activeRuns` só no GET: o estado "campos travados" some após o 1º salvar; CE-15b (ausente = liberado) é fail-open | ajuste · dentro | `activeRuns` sai **em toda resposta de modelo único**: GET de detalhe, PATCH, publicar (a lista não). Repositório devolve `{ template, previous, activeRuns }` da mesma transação. **Ausente → travado** (fail-closed), com cópia própria | §3 · §8.4 CE-27 |
| **A-13** 3 aparências aprovadas sem arquivo no PERMITIDO e sem o seletor (`P-APARENCIA-POR-USUARIO`) | ajuste · dentro | Medido na ref: o seletor **já tem plano e crítica** (`docs/revisoes/TELAS/B-APARENCIA-USUARIO-plano.md`, "APROVA COM AJUSTES") e o dono já respondeu (`D-APARENCIA-RESPOSTAS`: v1 no navegador por organização+usuário, padrão **A**, escolha no **menu do usuário**, Pátios estreia junto). O 22 **consome esse contrato** (`useScreenAppearance("checklist-editor")`, chave `techsol.aparencia.<tenantId>.<userId>`, padrão A) e entrega os 2 estados em **3 aparências** a partir da referência aprovada em `screen-refs/`. Ordem de merge e custo: **Q4 ao dono**, recomendação (b) com válvula | §5 · §10 · §13 Q4 |
| **A-14** vistoria que só existe no aparelho não entra na contagem | nota · pre-existente | Declarado no §2.4: "viva" é **conhecida pelo servidor**; a resposta offline a componente removido continua pendência do modelo offline (`D-CHK-DISPATCH-CREATE`) | §2.4 |
| **A-15** o N do 409 não chega à tela (o client não exibe `message`) | nota · dentro | Em 409 `template_has_active_runs` o editor **relê** o detalhe e mostra o N do `activeRuns` com cópia própria; nenhuma mudança em `client.ts` | §8.4 CE-28 |
| **A-16** auditoria lê o "antes" fora da transação | nota · dentro | `typeFrom`/`versionFrom`/`versionTo` saem do `previous` lido **sob `FOR UPDATE`** e devolvido pelo repositório; a leitura prévia do serviço sai | §2.1 · §8.1 CE-8c |

**Síntese:** a v2 mantém P1 como medida (A-01/A-02) e **reescreve P2** nos quatro pontos em que a v1 contrariava a Q1-A ou afirmava o que não media: classificação por propriedade (A-07/A-08), status e arquivamento com vistoria viva (A-05/A-06), concorrência de criação/reabertura (A-03/A-04) e isolamento provado para o superusuário do CI (A-09).

## §0 — Pré-voo em forma A (MEDIDO × HIPÓTESE)

> `MEDIDO` = comando + saída; `HIPÓTESE` = com o comando que a derruba. Os M-01…M-16 são os da v1 (comandos e saídas completos lá), **re-conferidos** na mesma ref; M-17…M-26 são novos — os marcados **(crítico r1)** foram executados pela identidade `crit-san322-opus-r1` com o comando citado, e entram como insumo medido (a junta re-executa; P3).

### 0.1 MEDIDO — da v1, condensado (ref `b08c7557`)

| # | Fato | Onde |
|---|---|---|
| M-01 | `origin/main` = `b08c7557` | `git rev-parse origin/main` |
| M-02 | PATCH sem guarda: validator aceita só `name/description/type/status/schema/components`; serviço não compara `updatedAt`/`version`; repositório sem predicado | `checklist.validator.ts:167-181`, `checklist.service.ts:148-201`, `checklist-prisma.repository.ts:199-321` |
| M-03 | Toda chamada do repositório roda em transação própria com RLS (`withTenantRls` → `$transaction` + `set_config('app.current_tenant_id')`) | `checklist-prisma.repository.ts:1106-1113`, `src/database/rls.ts:26-39` |
| M-04 | `version` só muda em publish de não-publicado; `schema.components` só no publish; divergência memória × Prisma após PATCH | prisma l.370, 371-384, 299; memória l.275, 319 |
| M-05 | render serve o modelo vivo; `template_version` carimbado em `createRun` e nunca comparado | `checklist.service.ts:238-261`; prisma l.423/487 |
| M-06 | `checklist_snapshot` do despacho não é lido pelo app (0 ocorrências em `mobile/`) | `field-dispatch.service.ts:285-311`; `checklist_remote_api.dart:414-426` |
| M-07 | Quem chama o PATCH: web (3 chamadores) e 10 chamadas HTTP em 4 arquivos de teste; Flutter e sync mobile: 0 | `ChecklistEditorPage.tsx:405,506`, `TenantChecklistsPage.tsx:263` |
| M-08 | Mitigação 100 % cliente, best-effort, com `force` | `ChecklistEditorPage.tsx:379-460, 1268-1300` |
| M-09 | Prisma grava `updated_at` em ms; `now()` do SQL em µs; igualdade crua = 0 linhas; `date_trunc('milliseconds')` = 1; duas transações concorrentes → A=1/B=0 | `plan22-pg` (v1) e `crit22-pg` (A-01/A-02) |
| M-10 | `sendRouteError` só `{code, reason, message}`; o client web não exibe `message` | `http.ts:28-68`, `client.ts:22-37` |
| M-11 | RBAC: `tenant_admin` = `create/read/update/delete/publish`; PATCH/DELETE = `tenant_checklists:update`; publish = `:publish` | `RBAC_MATRIX.md:43`, `checklist.permissions.ts` |
| M-12 | RN-CAD-007 (versionar checklist); `P-CHK-INATIVAR-COM-RUN-ATIVA` resolvida pela opção (b); "Duplicar" é toast | `docs/04-regras-negocio.md:45`; `pendencias.md:2183` |
| M-13 | Baseline de testes (ver §7); nenhum prova 409 por versão | `grep expectedUpdatedAt tests` → 0 |
| M-14 | Nenhum PR/branch aberto toca `modules/checklists`; `B-O6R-07c-b1` mergeado | `gh pr list`; `git diff --name-only` |
| M-15 | Guard de migração: 1 sentença transacional é isenta de G2/G6 | `scripts/migration-transaction-guard.mjs` |
| M-16 | PATCH `status: "published"` passa cru (sem bump, sem `published_at`) | prisma l.298 |

### 0.2 MEDIDO — novo na v2

| # | O que | Comando | Saída (colada) |
|---|---|---|---|
| M-17 | As 12 chaves de `config` que o editor edita | `git show b08c7557:frontend/src/modules/checklists/components/ChecklistFieldInspector.tsx \| grep 'key: "' \| sed … \| sort -u` | `compareWith markerTypes maxLength maxPhotos minPhotos minSelected multiline requireBothStages requireDescription requireName requireObservation vehicleTypes` — nenhuma é `options`, nenhuma é `help` |
| M-18 | Obrigatoriedade mora **também** em `config` | `git show …:frontend/src/modules/checklists/checklist-runtime.validation.ts \| sed -n 133,139p` | `isRequiredForProgress`: `required` **ou** `photo_upload: config.minPhotos > 0` · `before_after: config.requireBothStages` · `damage_map: config.requireMarker` · `acknowledgement: config.requireAcknowledgement`. **(crítico r1)** `validateChecklistRuntime` com `required:false`, 1 foto: `minPhotos=1 → []`, `minPhotos=3 → ["Envie ao menos 3 evidencia(s)…"]` |
| M-19 | Opções moram em `config.options` **ou** `config.vehicleTypes` | `… ChecklistRuntimeField.tsx \| sed -n 499,501p` | `readVehicleOptions`: `Array.isArray(config.options) ? … : Array.isArray(config.vehicleTypes) ? …` |
| M-20 | Catálogo de `defaultConfig` por tipo (o que "existe" em `config`) | `git show …:src/modules/checklists/checklist.components.ts \| grep -n "defaultConfig" -A 4` | `vehicle_selector{}`, `damage_map{requireDescription}`, `photo_upload{minPhotos:1,maxPhotos:10}`, `observation{maxLength:1000}`, `acknowledgement{requireObservation}`, `before_after{requireBothStages:true}`, `single_choice{options}`, `multi_choice{options,minSelected:0}`, `signature{requireName}` |
| M-21 | `status` aceito no PATCH e efeito com vistoria viva **(crítico r1, head-base, REST em memória)** | `node --test --import tsx tests/zz-crit22-e5.test.ts` | `draft → 200 \| render 409 checklist_not_published \| anexo 201 \| resposta 200` · `archived (PATCH) → 200 \| render 404 \| anexo 404 checklist_component_not_found` · `DELETE → 204 \| render 404 \| anexo 404` · `inactive → 200 \| render 200 \| anexo 201`. Causa: `getTemplate` filtra `status != archived` (`checklist-prisma.repository.ts:178-186`) e `assertRunComponent` usa `getTemplate` (`checklist.service.ts:913-923`); `renderChecklist` só serve `published` ou `inactive`+viva (l.238-251) |
| M-22 | Reativar manda `draft` | `grep -n "nextStatus" TenantChecklistsPage.tsx ChecklistEditorPage.tsx` | l.259 / l.502: `checklist.status === "inactive" ? "draft" : "inactive"` |
| M-23 | Corrida `createRun` × PATCH estrutural **(crítico r1, `crit22-pg`)** | `npx tsx .crit/e2-corrida.ts` E2.2/E2.3; `e3-forupdate-reopen.ts` E3.1 | PATCH contou 0 vivas, segurou a linha 1500 ms; `createRun` concorrente terminou em **176 ms** (não esperou: `FOR KEY SHARE` da FK não conflita com `FOR NO KEY UPDATE`); `run.template_version=2 \| modelo.version=3 \| componentes=obs_a`; resposta à `obs_x` → **P2003**. Com `SELECT … FOR UPDATE` no PATCH: `createRun` esperou 1258 ms **mas carimbou 2** (versão do objeto lido pelo serviço antes, `checklist.service.ts::createRun → getTemplate` em transação separada; `createRun(data, template)` grava `template.version`, prisma l.423/487) |
| M-24 | Reabertura carimba a versão da run original | `sed -n 804,811p checklist-prisma.repository.ts`; **(crítico r1)** E3.2 | `template_version: previous.run.templateVersion`, `status: "in_progress"`; após estrutural+bump: `nova run template_version=2 \| modelo.version=3`. A reabertura já usa `SELECT … FOR UPDATE` na **run** (l.760-770) — o molde de lock do módulo |
| M-25 | CI `-db` roda como superusuário **(crítico r1)** | `grep -n "POSTGRES_USER" .github/workflows/ci.yml`; `SELECT rolsuper, rolbypassrls` | `postgres` · `{"s":true,"b":true}`. Mutante sem `tenant_id` no UPDATE, contexto RLS de A, id+token de B: `linhas afetadas em B: 1 \| getTemplate(A) → null (404) \| updated_by de B = intruso: true`. RLS existe (`20260608000000_enable_tenant_rls/migration.sql:43-46`, `FORCE`) mas o superusuário a ignora |
| M-26 | Seletor de aparência: estado real | `git grep -n "B-APARENCIA-USUARIO" b08c7557 -- docs agent-orchestration`; `gh pr list --search aparencia` | Plano `docs/revisoes/TELAS/B-APARENCIA-USUARIO-plano.md` (chave `techsol.aparencia.<tenantId>.<userId>`, valor `{tela:"A\|B\|C"}`, `useScreenAppearance("<tela>")`, módulo `frontend/src/modules/appearance/**`, padrão A, valor inválido → A); crítica "APROVA COM AJUSTES"; `D-APARENCIA-RESPOSTAS` (decisoes.md:3688): (a) v1 no navegador por organização+usuário, servidor junto da AWS; (b) B em Pátios, **A nas demais**; (c) escolha no **menu do usuário**, não em Configurações; (d) Pátios estreia junto. **Nenhum PR** do seletor; `P-APARENCIA-POR-USUARIO` ABERTA, "bloqueia a primeira tela que sair com as 3: o seletor vem antes dela ou junto" |
| M-27 | Alcance do token no publicar e no arquivar | `git grep -n "/publish" b08c7557 -- tests`; `grep -rn "archiveTemplate(\|\.updateTemplate(\|\.publishTemplate(" tests src` | HTTP `/publish`: **16 chamadas em 13 arquivos** (`checklist-attachments:186`, `checklist-routes-db:440`, `checklist-routes:107,256,957,1011`, `checklist-snapshot-dispatch:43,387`, `mobile-backend-contracts:2267,2325`, `mobile-checklists-available:207`, `o6r07b-mime-sniff-routes:595`, `o6r07c-b-scope:1106`, `work-order-checklists-legacy-key-fallback:271`, `work-order-checklists-sticky:832`). HTTP DELETE em tests: **0**. PATCH `status:"archived"` em tests: **1** (`checklist-routes.test.ts:716-720`, "aposenta o modelo DEPOIS da vistoria concluída" — corrige o M-16 da v1). Diretas: `updateTemplate` em `checklist-run-lifecycle-db:382`, `checklist-template-prisma-db:103,150`, `field-dispatch-multi-checklist:796`; `publishTemplate`/`archiveTemplate` diretas ≈ 45 (helpers `ctx.publishTemplate`/`ctx.archiveTemplate` dos testes de despacho e o6r06). `archiveTemplate(` em `src/`: só controller → serviço → repositório |

### 0.3 HIPÓTESE (com o comando que a derruba)

| # | Hipótese | Comando que a derruba |
|---|---|---|
| H-01 | Nenhum caminho de produção grava `checklist_templates.updated_at` com `now()` do SQL. Irrelevante para a trava (o predicado usa `date_trunc`), relevante só para a exibição. | `grep -rn "checklist_templates" prisma/migrations prisma/seed*.ts scripts src \| grep -iE "update\|insert"` → hoje 0 fora do Prisma |
| H-02 | Totais da suíte (KPI 20/10: backend 3706/3708 · front 1339/1339) verdes no head-base. | `npm test`; `npm --prefix frontend run test:smoke` |
| H-03 | `SELECT … FOR UPDATE` na linha do modelo **bloqueia** o `INSERT` em `checklist_runs` (FK composta `[tenant_id, template_id]` toma `FOR KEY SHARE`) e um `SELECT … FOR KEY SHARE` explícito **espera** um `FOR UPDATE` em curso. É a matriz de conflito do Postgres (FOR UPDATE conflita com todos os modos); o crítico mediu a metade "espera 1258 ms" (M-23). | CE-22/CE-23 (§8.2) medem as duas metades com transações controladas; se não esperar, a regra R6 não vale e o bloco para |
| H-04 | O app, ao ver `schema_version` novo, re-renderiza com a forma nova. Só ocorre com **0** vivas (R4). | `flutter test` dirigido — fora do bloco |
| H-05 | Token temporal (ms) basta; dois commits no mesmo ms com releitura entre eles não ocorrem na prática. | Releitura HTTP < 1 ms entre dois commits do mesmo modelo (§11 R3) |
| H-06 | Nenhum chamador de `publishTemplate(`/`archiveTemplate(` em `src/` fora de controller → serviço → repositório (M-27), logo a omissão do token na assinatura interna não é alcançável por HTTP. | CE-11c (grep como teste) |
| H-07 | Os testes de despacho que arquivam depois do despacho (`field-dispatch-multi-checklist.test.ts:189` com `provisioned.length === 1`) **continuam verdes** porque arquivar segue permitido com vistoria viva (R7); eles ganham, de graça, o render que o técnico perdia. | `node --test --import tsx tests/field-dispatch-multi-checklist.test.ts tests/field-dispatch-checklist-set-port.test.ts` no PR |
| H-08 | O bloco `B-APARENCIA-USUARIO` (M-26) merge antes de o 22 chegar à junta. Se não, a válvula do §10 (o 22 cria `useScreenAppearance` com o contrato daquele plano, sem menu) mantém a entrega das 3 aparências. | `git log origin/main --oneline \| grep -i aparenc` no dia do start do dev |

### 0.4 Onde mora a propriedade HOJE (antes do desenho) — inalterado da v1, com o que a r1 acrescentou

- **P1** mora só no navegador (`ChecklistEditorPage.tsx:397-402`), best-effort, com `force`. No servidor, em lugar nenhum — e **três portas** gravam `checklist_templates` sem trava: PATCH, `POST /publish` e `DELETE` (A-10/A-06).
- **P2** mora em lugar nenhum: render vivo (M-05), snapshot não lido pelo app (M-06), `template_version` carimbado de um objeto lido em outra transação (M-23) e herdado na reabertura (M-24). Com vistoria viva, hoje passam com 200: remover campo (resposta offline → P2003), `minPhotos 0→3` (campo vira obrigatório, M-18), `vehicleTypes` sem um tipo (opção some, M-19), `status: draft` (render 409, M-21), arquivar (render 404 **e toda foto recusada**, M-21).

## §1 — Objetivo, ator, fluxo origem→destino

**Objetivo.** Fechar o item 6 do gate SAN3 (`P-CHK-PATCH-SEM-LOCK`) com as respostas do dono já dadas: (1) **trava otimista no servidor** nas três portas que gravam `checklist_templates` — `PATCH`, `POST /publish`, `DELETE` — com `expectedUpdatedAt` **obrigatório** (Q2) e 409 quando o modelo mudou desde a leitura; (2) **vistoria em andamento protegida** (Q1-A): enquanto houver vistoria viva conhecida pelo servidor, do modelo só mudam **textos**; qualquer outra mudança é recusada dizendo N; mudar campos de um modelo publicado sem vistoria viva vira **versão N+1**; a troca de status permitida com vistoria viva é só `→ inactive`; arquivar continua possível e o modelo arquivado **continua servindo** as vistorias vivas dele; criação e reabertura de vistoria **serializam** com a edição e carimbam a versão vigente no commit. **Sem migração** (Q3). Os dois estados novos do editor saem em **3 aparências** (resposta do dono sobre a tela), a partir da referência aprovada em `screen-refs/`.

**Ator.** `tenant_admin` (único papel com `update`/`publish` em modelos — M-11), pelo editor e pela lista de modelos no console web. Afetados indiretamente: `field_technician`/`operator` no app (formulário estável; vistoria de modelo arquivado continua aceitando foto e resposta) e qualquer cliente da API nas três portas (hoje só a web e os testes — M-07/M-27).

**Fluxo origem → destino.**

| # | Origem | Ação | Resultado |
|---|---|---|---|
| F1 | Editor | `GET /tenant/checklists/:id` | `updatedAt` (token), `version`, `status`, **`activeRuns`** |
| F2 | Editor → Salvar (só textos, ou qualquer coisa com `activeRuns = 0`) | `PATCH { expectedUpdatedAt, … }` | **200** com `updatedAt` novo e `activeRuns`; em mudança de campo sobre publicado → `version + 1` |
| F3 | Outra pessoa salvou antes | idem | **409 `template_changed_since_read`** → `ConcurrentEditDialog` (texto atual): Recarregar (GET) ou Sobrescrever (GET + PATCH com o token recém-lido) |
| F4 | Mudança de campo com vistoria viva | idem | **409 `template_has_active_runs`** → o editor relê o detalhe e mostra "N vistorias em andamento…" (o estado já estava travado por F1) |
| F5 | Editor/lista → Inativar | `PATCH { status: "inactive", expectedUpdatedAt }` | 200 (sempre permitido); 409 stale → recarrega e avisa |
| F6 | Editor/lista → Reativar (`→ draft`) | idem | com `activeRuns > 0` o botão está travado (`aria-disabled` + clique que explica); se chamado → **409 `template_has_active_runs`** |
| F7 | Editor → Publicar | PATCH (se houver rascunho) e `POST /publish { expectedUpdatedAt }` | 200 `version + 1` (de rascunho/inativo) com `activeRuns`; **409 stale** se alguém gravou entre a leitura e o publicar → diálogo |
| F8 | Qualquer cliente → `PATCH { status: "published" \| "archived" }` | — | **409** `status_requires_publish_endpoint` / `status_requires_delete_endpoint` (portas únicas) |
| F9 | Arquivar | `DELETE …?expectedUpdatedAt=` | 204; 400 sem token; 409 stale. Vistorias vivas do modelo **continuam**: render 200, foto 201, resposta 200 |
| F10 | Despacho / app / gestor | `createRun` · `reopenRun` | lêem `version`/`status` sob `FOR KEY SHARE` na própria transação → esperam PATCH em curso e carimbam a versão vigente; o PATCH, por sua vez, espera inserções em curso e as conta |
| F11 | App de campo | `GET /mobile/checklists/:id/render` | só textos mudam enquanto a vistoria dele estiver viva; modelo inativo **ou arquivado** com vistoria viva continua servido |

## §2 — A propriedade enunciada (v2)

### 2.1 P1 — Trava otimista nas três portas

> Toda gravação em `checklist_templates` por `PATCH`, `POST /publish` ou `DELETE` **abre a transação com `SELECT … FOR UPDATE`** na linha do modelo (predicado `tenant_id = $t AND id = $id AND deleted_at IS NULL`) e só prossegue se `date_trunc('milliseconds', updated_at) = expectedUpdatedAt`; senão responde **409** e **nada muda**. Duas gravações partindo da mesma leitura → exatamente um 200 e um 409 (M-09/A-02), estado final = o do vencedor.

- O lock é `FOR UPDATE` (e não o `FOR NO KEY UPDATE` implícito de um `UPDATE`) **de propósito**: é o único modo que conflita com o `FOR KEY SHARE` que a FK de `checklist_runs` toma ao inserir — a base da regra R6 (M-23/H-03).
- Token obrigatório nas três portas HTTP (Q2): PATCH e publicar no corpo, DELETE em `?expectedUpdatedAt=` (400 sem). As assinaturas internas de `publishTemplate`/`archiveTemplate` aceitam omissão **só** porque nenhum caminho HTTP chega a elas sem token (M-27, H-06, CE-11c); `updateTemplate` exige o token em toda assinatura.
- `componentKey` **obrigatório** em cada item de `components[]` do PATCH (A-08); sem ele a chave seria posicional e "trocar a ordem" viraria "trocar a pergunta de uma resposta dada".
- O "antes" da auditoria (`typeFrom`, `versionFrom/versionTo`) é o estado lido **sob o lock**, devolvido pelo repositório como `previous` (A-16).

### 2.2 P2 — Vistoria em andamento (regras R1–R8, na ordem em que o repositório as avalia, todas na mesma transação)

| # | Regra | Resposta |
|---|---|---|
| R1 | `expectedUpdatedAt` ausente/inválido; `components[].componentKey` ausente | 400 |
| R2 | `token_ok = false` no `SELECT … FOR UPDATE` | 409 `CHECKLIST_TEMPLATE_STALE` / `template_changed_since_read` |
| R3 | a mudança **não é só texto** (§2.3) **e** `countActiveRunsForTemplate > 0` | 409 `CHECKLIST_TEMPLATE_IN_USE` / `template_has_active_runs` |
| R4 | mudança de campo, `status = published`, 0 vivas | grava **e** `version + 1`; auditoria `versionFrom/versionTo` |
| R5 | `status` no corpo: `→ inactive` sempre passa; `→ draft` com vivas > 0 → **409 `template_has_active_runs`** (Reativar espera as vistorias); `→ published` → 409 `CHECKLIST_STATUS_REQUIRES_PUBLISH` / `status_requires_publish_endpoint`; `→ archived` → 409 `CHECKLIST_STATUS_REQUIRES_DELETE` / `status_requires_delete_endpoint` (avaliadas no serviço, antes da transação — porta única, espelho de `checklist_set_requires_endpoint`) | — |
| R6 | `createRun` e `reopenRun` lêem `version` e `status` do modelo com `SELECT … FOR KEY SHARE` **dentro da própria transação** e carimbam `template_version` com o que leram ali; `createRun` exige `published` **nesse** instante (409 `checklist_not_published`), `reopenRun` exige não-arquivado (como hoje). Efeito: uma inserção em curso faz o PATCH esperar (e contá-la); um PATCH em curso faz a inserção esperar (e carimbar a versão nova) | — |
| R7 | `DELETE` (arquivar): token (R1/R2) e **permitido com vivas**. O modelo arquivado continua servindo as vistorias vivas dele: `renderChecklist` serve `archived`+viva como já serve `inactive`+viva; `assertRunComponent` resolve o modelo **da run** em qualquer status. `available` não lista, `createRun` recusa, reabrir vistoria de arquivado recusa (inalterados) | 204 |
| R8 | toda resposta de modelo único (GET detalhe, PATCH, publicar) traz `activeRuns` contado na mesma transação | — |

**Por que R7 permite arquivar com vistoria viva e R5 proíbe `→ draft`.** As duas trocas de status têm efeitos medidos opostos à promessa de cada uma: `draft` significa "em edição" e hoje **corta** o render da vistoria viva (M-21) — então fica recusado enquanto houver viva, que é o que o nome "Reativar para editar" pede. Arquivar significa "fora de circulação", e o módulo de despacho sustenta exatamente o cenário "o modelo sai de circulação DEPOIS do despacho — a vistoria já está com o técnico" (`field-dispatch-multi-checklist.test.ts:181-192`, com `provisioned.length === 1`); recusar o arquivamento quebraria esse cenário sem proteger ninguém. O defeito medido (M-21: render 404 e **toda foto recusada**) não está no arquivar, está em `getTemplate` filtrar `archived` nos caminhos que servem uma run existente — e esse é o conserto (R7), a extensão natural da opção (b) de `P-CHK-INATIVAR-COM-RUN-ATIVA`. Nenhum dos dois casos é "texto"; a Q1-A é respeitada porque **a forma** que a vistoria viva vê não muda em nenhum deles.

### 2.3 "Só textos" por propriedade (A-07/A-08)

`diffTemplateChange(existing, input) → string[]` (função pura, `src/modules/checklists/checklist.template-change.ts`) produz os **caminhos que mudam**, após normalizar (componentes casados por `componentKey`; `description` `null` ≡ `""`; `schema` comparado chave a chave; `status` **excluído** — é a R5 que o decide). `classifyTemplateChange` = `none` se vazio; `text` se **todo** caminho casa com a *allowlist* abaixo; **`field` para qualquer outro caminho** — inclusive os que não existem hoje.

```
TEXT_PATHS = [ /^name$/, /^description$/, /^components\.[^.]+\.label$/, /^components\.[^.]+\.config\.help$/,
               /^schema\.sections(\..*)?$/, /^schema\.source$/ ]
```

Caminhos possíveis: `name` · `description` · `type` (do modelo) · `schema.<chave>` · `components.+<key>` (acrescentado) · `components.-<key>` (removido) · `components.<key>.(label|type|required|orderIndex|validationRules|visibilityRules|config.<chave>)`. Logo são **mudança de campo por construção**: as 12 chaves de `config` do inspector (M-17), `config.options`, `config.requireMarker`/`requireAcknowledgement` (M-18), `required` nos dois sentidos, `orderIndex`, `config.sectionIndex` (mover de seção), `type`, regras de validação/visibilidade, acrescentar ou remover campo, `schema.vehicleImage`. Isto é a resposta do dono à anexa da Q1 ("tornar opcional e adicionar campo opcional contam como mudança de campo") aplicada **sem lista do que é cosmético** — a lista fechada é a do que é texto.

### 2.4 O que P2 **não** promete (declarado, D-007)

- "Viva" é **conhecida pelo servidor** (`in_progress` | `pending_acknowledgement` em `checklist_runs`). Uma vistoria que só existe no aparelho (A-14, `checklist_repository.dart:244-300`, modelo offline do `D-CHK-DISPATCH-CREATE`) não entra na contagem; a resposta dela a um campo removido continua caindo em P2003 no sync — pendência do modelo offline, não deste bloco (`P-MOBILE-RUN-SO-NO-APARELHO`, nomeada no §5).
- `template_version` passa a identificar a forma **vigente no commit da criação ou reabertura** (R6) para toda run criada **depois** deste bloco. Runs anteriores, e runs cujo modelo mudou de forma com 0 vivas antes de serem reabertas, carregam o número que o commit da criação viu — a reabertura **recarimba** com a versão vigente (A-04), então uma run reaberta nunca aponta para forma que não existe.
- `schema.components` segue divergindo entre memória e Prisma após PATCH (M-04): render, snapshot do despacho e R3 lêem a **tabela** de componentes, não `schema.components`.
- Dois commits do mesmo modelo no **mesmo milissegundo** com releitura entre eles (H-05): o lock serializa as gravações; só o token colidiria. Declarado em §11 R3.

## §3 — Contrato (rotas, payloads, códigos)

Contrato versionado **`checklist_template_patch@2026-10-25.b-san3-22`**, subseção nova **3.6.2 "Modelos de checklist — trava otimista, estrutura em uso e portas únicas"** em `API_CONTRACTS.md` (após a tabela de 3.6, l.416). Permissões inalteradas (M-11). Nenhuma rota nova.

**`PATCH /api/v1/tenant/checklists/:checklistId`**
```jsonc
{ "expectedUpdatedAt": "2026-10-25T05:16:18.304Z",      // OBRIGATÓRIO — `updatedAt` do último GET/PATCH/publish
  "name": "…", "description": "…" | null, "type": "towing_collection",
  "status": "draft" | "inactive",                        // published → 409 publish; archived → 409 delete
  "schema": { … },
  "components": [ { "componentKey": "fotos",             // OBRIGATÓRIO por item
                    "type": "photo_upload", "label": "…", "required": true, "orderIndex": 0,
                    "config": { … }, "validationRules": { … }, "visibilityRules": { … } } ] }
```

**`POST /api/v1/tenant/checklists/:checklistId/publish`** — corpo **`{ "expectedUpdatedAt": "…" }`** (obrigatório). Semântica inalterada (rascunho/inativo → publicado, `version + 1`, `published_at`).

**`DELETE /api/v1/tenant/checklists/:checklistId?expectedUpdatedAt=<ISO-8601>`** — obrigatório na query (DELETE sem corpo por convenção do repo). 204.

| Código | `code` / `reason` | Quando (porta) | Corpo muda? |
|---|---|---|---|
| 200 | — | gravou (PATCH, publish) | `data` = modelo com `updatedAt` novo, `version`, **`activeRuns`** |
| 204 | — | arquivou (DELETE) | não há corpo |
| 400 | `BAD_REQUEST` / `invalid_request` | token ausente/não-ISO (3 portas); `componentKey` ausente (PATCH); demais validações zod | não |
| 404 | `CHECKLIST_NOT_FOUND` / `checklist_not_found` | id inexistente, cross-tenant, já arquivado — **nunca 409 para o que não é seu** (3 portas) | não |
| 409 | `CHECKLIST_TEMPLATE_STALE` / `template_changed_since_read` | R2 (3 portas) | **não** (rollback) |
| 409 | `CHECKLIST_TEMPLATE_IN_USE` / `template_has_active_runs` | R3; R5 `→ draft` com vivas. `message` PT-BR traz N | **não** |
| 409 | `CHECKLIST_STATUS_REQUIRES_PUBLISH` / `status_requires_publish_endpoint` | R5 `status: "published"` | não |
| 409 | `CHECKLIST_STATUS_REQUIRES_DELETE` / `status_requires_delete_endpoint` | R5 `status: "archived"` | não |
| 409 | `CHECKLIST_COMPONENT_IN_USE` / `component_has_answers` | FK (inalterado) | não |
| 409 | `CHECKLIST_NOT_PUBLISHED` / `checklist_not_published` | `createRun` quando o modelo não está publicado **no instante do lock** (R6; já existia, agora medido sob lock) | — |
| 422 | `CHECKLIST_INVALID` / `components_required` | publish sem componentes (inalterado) | não |

**Ordem de avaliação do PATCH:** 400 (parser) → R5 porta única (serviço) → [transação] `SELECT … FOR UPDATE` → 404 / R2 → componentes → `diffTemplateChange` → R5 `→ draft`+vivas / R3 → R4 → escrita → `activeRuns` → commit → auditoria (só no 200; `previous` sob lock).

**`GET /api/v1/tenant/checklists/:checklistId`** — campo aditivo **`activeRuns: number`**. **A lista não muda.** O DTO de modelo único é `toChecklistTemplateDetailDto(template, activeRuns)`; a lista continua com `toChecklistTemplateDto`.

**Inalterados:** `GET /tenant/checklists` (lista), `GET /mobile/checklists/available`, `GET /mobile/checklists/:id/render` (forma do payload; só o **conjunto** servido cresce com R7), todo `/mobile/checklist-runs/**` e `/mobile/sync/**` (forma), `POST /mobile/checklist-runs/:id/reopen` (forma; o carimbo de versão muda por R6).

## §4 — Modelagem (sem migração — Q3)

Tudo já existe em `prisma/schema.prisma` (`b08c7557`): `updated_at @updatedAt @db.Timestamptz(6)` (l.736, token), `version Int` (l.730, R4), `updated_by` (l.733), `deleted_at` (l.737, predicado), `@@unique([tenant_id, id])` (l.747, lock tenant-first), `ChecklistRun.status` + índice `[tenant_id, template_id]` (l.941, contagem) e a FK composta `[tenant_id, template_id]` (l.921) — é ela que toma `FOR KEY SHARE` na inserção e torna a R6 um mecanismo do banco, não uma convenção. `prisma/**` continua **PROIBIDO**; a alternativa `revision` da v1 (§4) fica registrada e **descartada** pela Q3. Dinheiro: não há. Datas: `timestamptz(6)`. Delete lógico: `deleted_at` já entra no predicado.

Locks usados (todos dentro da transação de `withTenantRls`): `SELECT … FOR UPDATE` no modelo (PATCH/publish/DELETE); `SELECT … FOR KEY SHARE` no modelo (`createRun`/`reopenRun`); o `SELECT … FOR UPDATE` **na run** que `reopenRun` já faz (l.760-770) permanece. Nenhum `LOCK TABLE`, nenhum advisory lock.

## §5 — Escopo PERMITIDO e PROIBIDO (caminhos exatos)

Branch `fix/checklist-patch-com-versao`; **um PR**, backend + web.

**PERMITIDO — backend `src/modules/checklists/`:** `checklist.validator.ts` (token nas 3 portas; `componentKey` obrigatório no PATCH) · `checklist.types.ts` · `checklist.repository.ts` (interface: `updateTemplate` → `{ template, previous, activeRuns }`; `publishTemplate`/`archiveTemplate` com `expectedUpdatedAt?`; `countActiveRunsForTemplate`; `getTemplateForRun`; erros `ChecklistTemplateStaleError`/`ChecklistTemplateInUseError`; memória: trava, R3–R7, `createRun`/`reopenRun` lendo a versão corrente) · `checklist-prisma.repository.ts` (`SELECT … FOR UPDATE` em `updateTemplate`/`publishTemplate`/`archiveTemplate`; `FOR KEY SHARE` em `createRun`/`reopenRun`; `countActiveRunsForTemplate`; `getTemplateForRun`; wrapper RLS) · `checklist.service.ts` (R5 porta única; tradução dos erros novos; `renderChecklist` servindo `archived`+viva; `assertRunComponent` via `getTemplateForRun`; auditoria a partir de `previous`; `getTemplateDetail`) · `checklist.controller.ts` (`activeRuns` em get/update/publish; token do DELETE pela query) · `checklist.dto.ts` (`toChecklistTemplateDetailDto`) · **novo** `checklist.template-change.ts`.

**PERMITIDO — testes:** **novos** `tests/checklist-template-lock.test.ts`, `tests/checklist-template-lock-db.test.ts`, `tests/checklist-template-change.test.ts`. **Atualizados, só na linha do token/porta** (M-27): `checklist-routes.test.ts` (PATCH l.385,405,414,875,923; publish l.107,256,957,1011; l.716-720 troca `PATCH archived` por `DELETE`), `checklist-routes-db.test.ts` (211, 440), `checklist-snapshot-dispatch.test.ts` (42, 43, 78, 387), `mobile-backend-contracts.test.ts` (798, 2267, 2325), `checklist-attachments.test.ts` (186), `mobile-checklists-available.test.ts` (207), `o6r07b-mime-sniff-routes.test.ts` (595), `o6r07c-b-scope.test.ts` (1106), `work-order-checklists-legacy-key-fallback.test.ts` (271), `work-order-checklists-sticky.test.ts` (832), `checklist-run-lifecycle-db.test.ts` (382), `checklist-template-prisma-db.test.ts` (103, 150), `field-dispatch-multi-checklist.test.ts` (796: o helper `inactivateTemplate` passa a ler o modelo e mandar o token). **13 arquivos.** Qualquer outra linha neles é fora de escopo.

**PERMITIDO — web `frontend/src/modules/checklists/`:** `types.ts` · `checklist.mock.ts` · `checklist.adapter.ts` (query do DELETE; corpo do publish) · `checklist.service.ts` · `checklist-editor.model.ts` (payload com token) · `pages/ChecklistEditorPage.tsx` · `pages/TenantChecklistsPage.tsx` · `components/` **só** para as 3 aparências dos 2 estados (faixa "campos travados" e `ConcurrentEditDialog`), como variantes dos componentes existentes · `frontend/tests/checklists-editor-lock.smoke.test.tsx` (novo) e ajustes em `checklists-editor.smoke.test.tsx`/`checklists-models-list.smoke.test.tsx`. **Aparência:** consumo de `useScreenAppearance("checklist-editor")` de `frontend/src/modules/appearance/**` (contrato do `B-APARENCIA-USUARIO`, M-26); **só se** esse bloco não estiver na `main` no start do dev, o 22 cria `frontend/src/modules/appearance/useScreenAppearance.ts` com o mesmo contrato (chave `techsol.aparencia.<tenantId>.<userId>`, `{tela:"A|B|C"}`, padrão A, inválido → A) **sem** menu nem página (válvula H-08; Q4).

**PERMITIDO — registro:** `API_CONTRACTS.md` (3.6.2) · `agent-orchestration/controle/pendencias.md` (fecha `P-CHK-PATCH-SEM-LOCK`; abre `P-CHK-RUN-SNAPSHOT-IMUTAVEL`, `P-MOBILE-RUN-SO-NO-APARELHO`; emenda `P-APARENCIA-POR-USUARIO`) · `docs/revisoes/SAN3/PLANO_SAN3.md` (item 6) · `agent-orchestration/codex/comandos/B-SAN3-22-checklist-patch-com-versao.md` · ata/votos em `agent-orchestration/omega/juntas/` · leitura de `docs/claude-code-handoff/screen-refs/checklist-editor-estados-3opcoes.reference.html` (a referência aprovada é **insumo**; quem a grava é o orquestrador).

**PROIBIDO:** `prisma/**`, `src/database/**`, `src/modules/core-saas/**` (inclui `routes/http.ts`), `src/modules/mobile/**`, `src/modules/work-orders/**`, `src/modules/field-dispatch/**`; em checklists: `checklist.routes.ts`, `checklist.permissions.ts`, `checklist.run-lifecycle.ts`, `storage/**`, `applicability/**`; `mobile/flutter_app/**`; `frontend/src/services/api/client.ts`; `frontend/src/modules/appearance/**` além do hook da válvula (menu, página e Pátios são do `B-APARENCIA-USUARIO`); `Kpis/**`; lockfiles; `.env*`; `infra/**`; `.github/**`.

## §6 — Arquivos tocados e regra do espelho

| O que o bloco faz | Espelha (módulo de referência = o próprio `checklists`) | Onde |
|---|---|---|
| Abrir a transação com lock de linha e decidir sob ele | `reopenRun`: `SELECT status FROM checklist_runs … FOR UPDATE` como 1ª sentença (`checklist-prisma.repository.ts:760-770`, "segura a linha até o fim desta transação RLS") | `updateTemplate`/`publishTemplate`/`archiveTemplate` (`FOR UPDATE`); `createRun`/`reopenRun` (`FOR KEY SHARE`) |
| Traduzir erro do repositório em 409 de negócio | `isForeignKeyViolation → ChecklistError(409, "CHECKLIST_COMPONENT_IN_USE", …)` (`checklist.service.ts:168-178`) | o mesmo `catch`, com `ChecklistTemplateStaleError` e `ChecklistTemplateInUseError` |
| Porta única | `PATCH /work-orders/:id` com `checklists` → 409 `checklist_set_requires_endpoint` (`API_CONTRACTS.md:384-388`) | R5 `published`/`archived` |
| Servir vistoria viva de modelo fora de circulação | `renderChecklist` para `inactive`+viva (`checklist.service.ts:238-251`, `P-CHK-INATIVAR-COM-RUN-ATIVA` (b)) | R7 estende a `archived`; `assertRunComponent` usa `getTemplateForRun` |
| Função pura com tabela fechada + teste à parte | `assertChecklistRunStatusTransition` (`checklist.run-lifecycle.ts`) | `checklist.template-change.ts` (`TEXT_PATHS`) |
| Contar vivas | `hasActiveRunsForTemplate` (prisma l.854-866; memória l.577-584) | `countActiveRunsForTemplate` ao lado; `has…` delega |
| Arnês REST em memória / Postgres | `tests/checklist-routes.test.ts` (`withChecklistApi`) / `checklist-template-prisma-db.test.ts` (`bootstrap`, `seedTenant`) + `checklist-run-create-concurrency-db.test.ts` | os 3 testes novos |
| Botão travado que explica | `aria-disabled={publishState.locked}` + `title` + clique que explica (`ChecklistEditorPage.tsx:717-735`; "botão desabilitado não recebe foco nem dá retorno") | Reativar travado; ações estruturais travadas |
| Diálogo de conflito | `ConcurrentEditDialog` (l.1268-1300) — **texto atual mantido** | agora acionado pelo 409 |
| Preferência no navegador | `frontend/src/modules/operations/map/hooks/useMapViewMemory.ts:14-51` (localStorage por tenant, try/catch) — o espelho que o plano do seletor cita | `useScreenAppearance` (só na válvula) |
| Tela-modelo (D-TELAS-SEGUEM-O-PADRAO) | a própria `ChecklistEditorPage.tsx` (abas "Estrutura do formulário" / "Aplicabilidade", l.100-101) e `TenantChecklistsPage.tsx`; skills `ts-frontend-full` / `ui-ux-pro-max` | §10 |

**Resumo:** 8 em `src/modules/checklists/` (7 existentes + 1 novo) · 3 testes novos + 13 atualizados · 7 em `frontend/src/modules/checklists/` (+1 hook na válvula) · 1–3 em `frontend/tests/` · 4 de registro. **Zero** em `prisma/`, `mobile/`, `core-saas/`, `client.ts`.

## §7 — Baseline N de testes e meta M ≥ 2N

**N = 11** (inalterado da v1, medido em `b08c7557`): 8 blocos `test()` que fazem PATCH em `/tenant/checklists/:id` (4 arquivos) + 2 `updateTemplate` diretos no Prisma (`checklist-template-prisma-db.test.ts:90,132`) + 1 smoke do diálogo (`checklists-editor.smoke.test.tsx:941`). Nenhum prova a propriedade. Os 16 publishes HTTP e as 4 chamadas diretas (M-27) são **consumidores**, não provas — entram no escopo (§5), não no N.

**Meta M ≥ 22.** Previstos: backend memória **22** (§8.1) · Postgres **11** (§8.2) · classificador **27** (§8.3) · web **11** (§8.4) → **71 novos**; perímetro final ≈ **82 ≥ 22**. Conta a execução real do PR (KPI congelado — não se publica).

```
npm run check && npm run lint && npm test && npm run build
node --test --import tsx tests/checklist-template-change.test.ts tests/checklist-template-lock.test.ts
DATABASE_URL=… node --test --import tsx tests/checklist-template-lock-db.test.ts tests/checklist-template-prisma-db.test.ts tests/checklist-routes-db.test.ts tests/checklist-run-lifecycle-db.test.ts
node --test --import tsx tests/checklist-routes.test.ts tests/checklist-snapshot-dispatch.test.ts tests/mobile-backend-contracts.test.ts tests/field-dispatch-multi-checklist.test.ts tests/field-dispatch-checklist-set-port.test.ts
npm --prefix frontend run check && npm --prefix frontend run test:smoke && npm --prefix frontend run build
node scripts/migration-transaction-guard.mjs            # "novas: 0 · violações: 0"
git diff --name-only origin/main...HEAD -- mobile/ prisma/ src/modules/core-saas/ frontend/src/services/api/ | wc -l   # 0
git diff --check
```

## §8 — Critérios de aceite, mutação que deixa vermelho, vermelho-controle no head-base

Cada critério: teste · **mutação** (o dev executa, vê o vermelho, desfaz, registra no PR) · **vermelho-controle** em `b08c7557` (o teste novo copiado para a `main` tem de falhar; onde passa, é controle positivo e está dito). Head-base = worktree em `b08c7557` com o arquivo de teste copiado.

### 8.1 Backend — REST em memória (`tests/checklist-template-lock.test.ts`; molde `checklist-routes.test.ts`)

| CE | Enunciado | Mutação → vermelho | Head-base |
|---|---|---|---|
| CE-1 | PATCH sem `expectedUpdatedAt` → 400; não-ISO → 400 | campo `.optional()` | 200 → **vermelho ✓** |
| CE-2a | token = `updatedAt` do GET → 200 e `updatedAt` muda | não tocar `updated_at` | 200 e muda → passa (controle positivo de CE-3) |
| CE-2b | `components[]` sem `componentKey` → 400; com chave → 200 | voltar ao default posicional `${type}_${index+1}` | 200 → **vermelho ✓** |
| CE-3 | duas edições da mesma leitura: 200 / **409 stale**; GET = só a 1ª (nome **e** componentes) | tirar a comparação do token | 2ª → 200 → **vermelho ✓** |
| CE-7a | viva + remover campo → **409 in-use**; GET: campo continua | classificador sempre `text` | 200 → **vermelho ✓** |
| CE-7b | viva + só textos (`name`, `label`, `config.help`, nome de seção) → **200** | classificador sempre `field` | 200 → passa (controle) |
| CE-7c | run `pending_acknowledgement` conta como viva | contar só `in_progress` | 200 → **vermelho ✓** |
| CE-7d | run concluída não conta | contar `completed` | passa (controle) |
| CE-8a | `published`, 0 vivas, mudança de campo → 200 e `version + 1` | remover o bump | igual → **vermelho ✓** |
| CE-8b | `published` + texto → `version` igual; `draft` + campo → igual | bump incondicional | passa (controle) |
| CE-8c | auditoria `checklist_template.updated` traz `versionFrom/versionTo` (CE-8a) e `typeFrom/typeTo` a partir do `previous` do repositório; o serviço **não** chama `getTemplate` antes de `updateTemplate` (asserção sobre o repositório instrumentado: 1 leitura, sob lock) | serviço lê antes (2 leituras) ou omite os campos | campos ausentes → **vermelho ✓** |
| CE-9a | viva + `status: "inactive"` → 200; render da viva → 200 | — (controle positivo da R5) | passa |
| CE-9b | viva + `status: "draft"` → **409 in-use**; render da viva segue 200 | tratar `draft` como texto | 200 e render 409 → **vermelho ✓** |
| CE-9c | `status: "published"` → 409 `status_requires_publish_endpoint`; `POST /publish` → 200 `version + 1` | aceitar `published` | 200 → **vermelho ✓** |
| CE-9d | `status: "archived"` → 409 `status_requires_delete_endpoint` | aceitar `archived` | 200 → **vermelho ✓** |
| CE-9e | 0 vivas: `draft ↔ inactive` livres | — | passa (controle) |
| CE-10a | DELETE sem token → 400 e modelo segue | token opcional | 204 → **vermelho ✓** |
| CE-10b | DELETE com token defasado → **409 stale**, modelo não arquivado | sem predicado | 204 → **vermelho ✓** |
| CE-10c | viva + DELETE com token → 204 **e** render da viva 200, anexo 201, resposta 200; `available` não lista; `createRun` 409; reabrir run concluída de arquivado → 409 (inalterado) | `assertRunComponent`/`render` voltam a `getTemplate` (filtra `archived`) | render 404, anexo 404 → **vermelho ✓** (é a saída E5 do crítico) |
| CE-11a | publish sem token → 400 | token opcional na porta | 200 → **vermelho ✓** |
| CE-11b | **cenário A-10:** A salva (200), B grava mudança de campo com token válido (200), A publica com o token da própria gravação → **409 stale**; A relê e publica → 200 `version + 1` | publish sem predicado | A publica 200 → **vermelho ✓** |
| CE-11c | guard: chamadores de `publishTemplate(`/`archiveTemplate(` em `src/` ⊆ {controller, service, repository} (leitura de arquivos) | chamador novo em `src/modules/x` | passa hoje (controle; é guard de futuro) |
| CE-12 | PATCH/publish/DELETE de modelo de **outro** tenant com o token certo dele → **404** | devolver 409 | passa (controle; a prova é CE-12-db) |
| CE-13 | guard de consumidores: em `tests/**`, todo `PATCH`/`POST …/publish`/`DELETE` para `/tenant/checklists/` leva token; toda `updateTemplate(` direta leva `expectedUpdatedAt`; PATCH com `components` leva `componentKey`; lista arquivo:linha dos faltantes | remover de **um** sítio | 10 PATCH + 16 publish sem token → **vermelho ✓** |
| CE-14 | `activeRuns` em GET detalhe, PATCH e publish (0 → 1 após `createRun` → 0 após `complete`); **ausente na lista** | hardcode 0; ou pôr na lista | ausente → **vermelho ✓** |

### 8.2 Backend — Postgres real (`tests/checklist-template-lock-db.test.ts`; DB-gated como os irmãos; roda no job `backend-postgres` **como superusuário**, M-25)

| CE | Enunciado | Mutação → vermelho | Head-base |
|---|---|---|---|
| CE-4 | O arnês afirma `SHOW TimeZone` ∈ {`UTC`,`Etc/UTC`} (premissa declarada, A-01). Linha com `updated_at` em µs por SQL (`.342199`, `.342999`, `.999999`); `getTemplate` devolve ms; `updateTemplate` com esse Date → **grava** | `updated_at = $x` em vez de `date_trunc('milliseconds', updated_at) = $x` | grava (sem trava) → passa; o mutante prova (M-09 M3a = 0) |
| CE-5 | **Lock determinístico:** arnês abre transação, `SELECT … FOR UPDATE` no modelo, dispara `repo.updateTemplate` (fica bloqueado — asserção: não resolve em 300 ms), grava `updated_at = clock_timestamp()` e commita → `updateTemplate` termina em `ChecklistTemplateStaleError`; estado final = o do arnês. Variante paralela (M5): `Promise.all` de dois `updateTemplate` com o mesmo token → {ok, stale} | comparar `existing.updatedAt` em JS antes de escrever (sem lock) | ambos gravam → **vermelho ✓** |
| CE-6 | **Atomicidade:** 409 stale **ou** in-use → `updated_by`, `updated_at`, `version`, contagem e `label` dos componentes idênticos (SQL direto) | lançar o 409 depois de `deleteMany`; ou contar vivas fora da transação | não há 409 → passa; o mutante prova |
| CE-7-db | CE-7a/7c contra o Postgres (`countActiveRunsForTemplate` lê a tabela; paridade com a memória) | idem CE-7a | 200 → **vermelho ✓** |
| CE-8-db | CE-8a contra o Postgres (`version` por SQL) | idem CE-8a | igual → **vermelho ✓** |
| CE-10-db | CE-10c contra o Postgres: arquivado (`status = archived`, `deleted_at` set) com viva → `renderChecklist` 200, `createAttachment` via `assertRunComponent` ok, `updateRun` ok | `getTemplateForRun` filtrando `archived` | render 404 → **vermelho ✓** |
| **CE-12-db** (A-09) | **Isolamento provado para o superusuário:** contexto RLS de A (`withTenantRls(A)`), `updateTemplate`/`publishTemplate`/`archiveTemplate` com `id` **e token corretos do modelo de B** → 404 em cada porta **e** a linha de B byte-idêntica (SQL: `updated_by, updated_at, version, status, deleted_at, name, count(components)`); o arnês afirma `SELECT rolsuper FROM pg_roles WHERE rolname = current_user` = `true` (se não for, a asserção de isolamento passa por RLS e **não** por predicado — o teste declara isso no nome) | tirar `tenant_id = $t` do `SELECT … FOR UPDATE` (e do `UPDATE` que segue) | B intocado hoje porque `getTemplate` tem `tenant_id` → passa; **o mutante grava em B mesmo com RLS ignorado** (M-25: `linhas afetadas em B: 1`) → **vermelho ✓** |
| CE-12-forma | guard de forma: o texto de cada `$queryRaw`/`$executeRaw` novo em `checklist-prisma.repository.ts` que cita `checklist_templates` ou `checklist_runs` contém `tenant_id` no `WHERE` (leitura do arquivo) | tirar `tenant_id` de um | **vermelho ✓** (secundário; a propriedade é CE-12-db) |
| **CE-22** (A-03, metade 1) | arnês abre transação, `SELECT … FOR UPDATE` no modelo publicado (v2), apaga `obs_x`, `version = 3`, **segura**; `repo.createRun(data, templateLidoAntes)` concorrente **não resolve** antes do commit do arnês (asserção de 300 ms) e, depois, `run.template_version === 3`. Variante: arnês põe `status = 'inactive'` → `createRun` → 409 `checklist_not_published` | carimbar `template.version` do argumento (sem `FOR KEY SHARE`) | `template_version = 2` → **vermelho ✓** (M-23) |
| **CE-23** (A-03, metade 2) | arnês abre transação, **insere** uma run `in_progress` no modelo e **segura**; `repo.updateTemplate` de campo concorrente **não resolve** antes do commit do arnês; depois do commit → `ChecklistTemplateInUseError` (contou a run) | lock `FOR NO KEY UPDATE`/`UPDATE` condicional (v1) ou `SELECT` sem lock | não espera, conta 0, commita → **vermelho ✓** (M-23: "176 ms") |
| **CE-24** (A-04) | run concluída sobre v2 → mudança de campo com 0 vivas → v3 → `reopenRun` → nova run `in_progress` com `template_version === 3`; com arnês segurando `FOR UPDATE`, `reopenRun` espera | manter `previous.run.templateVersion` | `= 2` → **vermelho ✓** (M-24) |
| CE-25 | `publishTemplate`/`archiveTemplate` com token: stale → erro e linha intocada; sem token (assinatura interna) → grava (comportamento declarado, H-06) | — | passa (controle) |

### 8.3 Classificador puro (`tests/checklist-template-change.test.ts`) — **27 casos em tabela, um por propriedade** (A-07/A-08)

| CE | Casos | Esperado | Mutação → vermelho |
|---|---|---|---|
| CE-18a | **as 12 chaves do inspector** (M-17), uma linha cada: `compareWith markerTypes maxLength maxPhotos minPhotos minSelected multiline requireBothStages requireDescription requireName requireObservation vehicleTypes` | `field` | pôr a chave na `TEXT_PATHS` → a linha dela fica vermelha |
| CE-18b | `config.options` (inclui **reordenar**), `config.requireMarker`, `config.requireAcknowledgement` (M-18/M-19), `config.sectionIndex` | `field` | idem |
| CE-18c | `required` `false→true` **e** `true→false`; `type` do componente; `orderIndex`; `validationRules`; `visibilityRules`; `components.+key`; `components.-key`; `type` do modelo; `schema.vehicleImage` | `field` | tratar `true→false` ou `+key` como texto → vermelho (é a anexa da Q1) |
| CE-18d | **chave de `config` desconhecida** (`config.futuraChave`) | `field` | default "desconhecido = texto" → vermelho (fail-closed por construção) |
| CE-18e | `name`, `description` (inclui `null ≡ ""`), `components.<k>.label`, `components.<k>.config.help`, `schema.sections` (renomear seção), `schema.source` | `text` | tirar `label` da `TEXT_PATHS` → vermelho |
| CE-18f | payload só com token; payload idêntico ao existente | `none` | — |
| CE-18g | `status` **não** entra na classificação (R5 decide) | ignorado | classificar `status` → vermelho |

Vermelho-controle: o módulo não existe em `b08c7557` → import falha → **vermelho ✓** (todos).

### 8.4 Web (`frontend/tests/checklists-editor-lock.smoke.test.tsx` + ajustes)

| CE | Enunciado | Mutação | Head-base |
|---|---|---|---|
| CE-26a | payload do salvar (helper puro) traz `expectedUpdatedAt === base.updatedAt`; publicar manda o token do último PATCH/GET; DELETE manda `?expectedUpdatedAt=` (adapter) | omitir em um dos três | **vermelho ✓** |
| CE-26b | `ApiError` 409 `template_changed_since_read` → `ConcurrentEditDialog` (**texto atual**, l.1281-1287); "Sobrescrever mesmo assim" → `GET` + PATCH com o `updatedAt` recém-lido; "Recarregar" → substitui o rascunho. Handler puro `resolveSaveError(error) → { kind: "conflict" \| "in_use" \| "other" }`; **a releitura best-effort pré-PATCH sai** | sobrescrever sem releitura; mapear `reason` errado | handler inexistente → **vermelho ✓** |
| **CE-27** (A-12) | estado "campos travados" alimentado por **toda** resposta de modelo único (GET/PATCH/publish): `activeRuns > 0` → faixa âmbar (reuso da faixa de "Publicar travado") e ações estruturais com `aria-disabled` + `title` + clique que explica; **`activeRuns` ausente → travado** com a cópia "Não foi possível confirmar se há vistorias em andamento — recarregue"; `0` → livre. Reducer puro `nextEditorLock(response)` testado nos 3 casos e após `setChecklist(saved)` do salvar | ausente = livre; ignorar `activeRuns` da resposta do PATCH | **vermelho ✓** |
| **CE-28** (A-15) | 409 `template_has_active_runs` → `GET` do detalhe → cópia "N vistoria(s) em andamento usam este modelo…" com o N do `activeRuns` (fetch mock) | não reler; N fixo | **vermelho ✓** |
| **CE-29** (A-05) | Reativar (lista e editor) com `activeRuns > 0`: travado (`aria-disabled`, `title`, clique explica "aguarde as N vistorias concluírem"); Inativar sempre disponível; ambos mandam o token; 409 → recarrega + aviso | Reativar livre; sem token | **vermelho ✓** |
| **CE-30** (3 aparências) | `useScreenAppearance("checklist-editor")` → A/B/C renderizam os 2 estados **conforme a referência aprovada** (`screen-refs/checklist-editor-estados-3opcoes.reference.html`: marcadores de classe/texto por aparência, lidos da referência pelo teste); sem preferência → A; valor inválido → A; a preferência de outro usuário/organização não vaza (chave `techsol.aparencia.<tenantId>.<userId>`) | ignorar o hook (sempre A); trocar o padrão para B; tirar `userId` da chave | hook/variantes inexistentes → **vermelho ✓** |
| CE-31 | `updateMockTenantChecklist`/`publishMock…`/`deleteMock…` recusam token defasado com `ApiError(409, …, "template_changed_since_read")` | aceitar sempre | **vermelho ✓** |
| CE-32 | linguagem §3/§11: nenhuma cópia nova com "template", "tenant", "run", "PATCH", "409", id cru (regex sobre o HTML renderizado dos 2 estados × 3 aparências) | inserir termo técnico | **vermelho ✓** |

### 8.5 Escopo e bateria (conferidos pela junta)

- **CE-33** `git diff --name-only origin/main...HEAD -- mobile/ prisma/ src/modules/core-saas/ frontend/src/services/api/ | wc -l` = **0**; em `frontend/src/modules/appearance/` só `useScreenAppearance.ts` (e só se a válvula H-08 foi usada); nos 13 arquivos de teste atualizados, o diff é só a linha do token/porta (`git diff --stat` por arquivo ≤ 4 linhas, salvo `checklist-routes.test.ts:716-720`).
- **CE-34** bateria do §7 verde; `migration-transaction-guard` `novas: 0`; `git diff --check`.
- **CE-35** drill de mutação registrado no PR (saída com e sem mutante): CE-3, CE-4, CE-5, CE-7a, CE-9b, CE-9d, CE-10c, CE-11b, **CE-12-db**, CE-18a (uma chave) + CE-18e, CE-22, CE-23, CE-24, CE-27, CE-30.
- **CE-36** `flutter test` **não roda** (diff vazio em `mobile/`); dizer o contrário seria contagem copiada (§C3.3).

## §9 — Impacto na web e no app de campo (Flutter)

**Web — quem envia o quê (M-07/M-27):**

| Chamador | Depois |
|---|---|
| `ChecklistEditorPage.tsx:405` (Salvar; pré-passo do Publicar) | `expectedUpdatedAt: target.updatedAt`; sem releitura prévia; 409 stale → diálogo; 409 in-use → relê e mostra N; estado travado vem de `activeRuns` de **toda** resposta |
| `ChecklistEditorPage.tsx:480` (Publicar) | `POST /publish { expectedUpdatedAt }` com o token do PATCH anterior (ou do GET); 409 → diálogo |
| `ChecklistEditorPage.tsx:506` e `TenantChecklistsPage.tsx:263` (Inativar/Reativar) | token; Reativar travado com `activeRuns > 0` (lista: o `activeRuns` **não** vem na listagem — o botão Reativar da lista passa a **confirmar pelo GET do detalhe** antes de chamar, ou cai no 409 e avisa; ambos aceitos, o segundo é o mínimo) |
| `checklist.adapter.ts` | publish com corpo; DELETE com query |
| `checklist.mock.ts` | paridade (CE-31) |

**App de campo (Flutter): nenhuma mudança de código** — não chama PATCH/publish/DELETE de modelo (M-07) e **não precisa mandar versão**. O que muda para o técnico é efeito do backend: com vistoria viva, o render só muda em textos (R3/R5) e **continua chegando** quando o modelo é arquivado (R7 — hoje 404 e foto recusada, M-21); `createRun`/`reopenRun` do sync (`mobile-checklist-sync.ts:412`, `/reopen`) passam pela R6 sem mudar de forma — só o carimbo de versão fica certo. `schema_version` novo só com 0 vivas (R4; H-04). CE-33/CE-36 provam o diff vazio.

**Outros consumidores:** nenhum medido além da web e dos testes. Automação externa que edite, publique ou arquive modelos passa a receber 400 sem token (Q2, respondida).

## §10 — Tela: os 2 estados em 3 aparências

**Fontes (a maquete é refeita pelo orquestrador a partir delas, e o dev implementa contra a aprovada):**
1. **Molde aprovado das 3 opções:** `docs/claude-code-handoff/screen-refs/*-3opcoes.reference.html` (8 telas na ref — `patios-`, `dashboard-`, `ordens-de-servico-`, `usuarios-`, `auditoria-`, `despachos-`, `estoque-`, `financeiro-3opcoes.reference.html`): mesmo seletor A/B/C, mesmo quadro "o que já tem dado / o que falta / prós e contras".
2. **A tela real:** `ChecklistEditorPage.tsx` — header com Voltar/nome/tipo/situação, abas **"Estrutura do formulário"** e **"Aplicabilidade"** (l.100-101, `role="tablist"` l.739-748), paleta 264 px + canvas com seções + inspector 336 px; o botão **travado que explica** (`aria-disabled` + `title` + clique explica, l.717-735 — nunca `disabled`); o `ConcurrentEditDialog` **com o texto atual** (l.1281-1287: "Outra pessoa alterou este modelo…", "Recarregar o modelo", "Sobrescrever mesmo assim" vestido de perigo, foco na saída conservadora).
3. **Padrão do sistema:** `DESIGN_SYSTEM.md`, `COMPONENT_LIBRARY.md`, §4 itens 1–6 do `CLAUDE.md`; skills `ts-frontend-full` (implementar) e `ui-ux-pro-max` (revisar). O dono auditou a maquete anterior e a achou fora do padrão: **as 3 aparências variam só dentro do padrão** (onde a faixa fica, como o campo travado se marca, como o conflito se apresenta) — **nenhum** componente, paleta, tipografia ou layout novo.

**O que a referência precisa fixar (e o teste CE-30 lê dela):** por aparência, os marcadores (classe/texto) da faixa "campos travados" com N, do estado "não foi possível confirmar" (ausente), do campo/ação travada (`aria-disabled` + `title`), do Reativar travado, e do diálogo de conflito (texto inalterado). Nome proposto: `docs/claude-code-handoff/screen-refs/checklist-editor-estados-3opcoes.reference.html`. Quem a grava é o orquestrador (`D-DESIGN-SO-CLAUDE`); este plano **não descreve** opções visuais — descrevê-las aqui foi o erro da v1.

**Seletor (A-13):** o 22 lê a preferência por `useScreenAppearance("checklist-editor")` (contrato do `B-APARENCIA-USUARIO`, M-26: localStorage `techsol.aparencia.<tenantId>.<userId>`, `{tela:"A|B|C"}`, padrão **A**, inválido → A); a **escolha** mora no menu do usuário e é do bloco do seletor, não deste. Ordem e custo: **Q4**.

## §11 — Riscos e rollback

| # | Risco | Prob./Impacto | Mitigação | Rollback |
|---|---|---|---|---|
| R1 | Token obrigatório nas 3 portas quebra consumidor desconhecido (400) | baixa / médio — medido 0 fora da web e dos testes | Q2 respondida; CE-13 | reverter o PR (sem migração) |
| R2 | 409 falso por µs | eliminado (`date_trunc`; A-01: trunca em todos os casos) | CE-4 | — |
| R3 | mesmo ms com releitura entre dois commits | muito baixa / médio | lock serializa gravações; D-007 | Q3 respondida: sem `revision` |
| R4 | **Concorrência criação/reabertura × edição** (A-03/A-04) — antes "residual", medido como real | eliminada pelo par `FOR UPDATE` × `FOR KEY SHARE` (R6) | CE-22/23/24 com transações controladas; H-03 declarada | — |
| R5 | Operacional: com vivas, campos esperam; Reativar espera | média / médio | Q1-A respondida; `P-CHK-RUN-SNAPSHOT-IMUTAVEL` para a versão sem espera | — |
| R6 | `version` bumpa sem publish (R4) | baixa / baixo (0 vivas) | H-04 | — |
| R7 | **Arquivar com viva segue permitido** e o modelo arquivado volta a ser servido — alguém pode ler como "arquivado não é arquivado" | baixa / baixo | R7 só serve **vistorias já existentes**; `available`/`createRun`/reopen seguem recusando; é a mesma leitura já aprovada para `inactive` | — |
| R8 | Espera de lock: `createRun` do despacho espera um PATCH em curso (ms); PATCH espera inserções em curso | baixa / baixo | Prisma tx interativa 5 s; CE-22/23 medem | — |
| R9 | Janela de deploy (bundle antigo + backend novo → 400 ao salvar/publicar/arquivar até recarregar) | média / baixo | PR único; `message` orienta; fail-closed mantido | — |
| R10 | Memória × Prisma divergem | média / alto (histórico do módulo) | CE-7-db/8-db/10-db/12-db obrigatórios; C1 só mede o Postgres | — |
| R11 | `updatedAt` **exibido** desloca se a base não roda em UTC (A-01) — a trava não | baixa / baixo | CE-4 afirma UTC no arnês; nota em `docs/deployment.md` fica como pendência `P-DB-TIMEZONE-UTC` (pré-existente) | — |
| R12 | 13 arquivos de teste tocados (token) — risco de edição fora da linha | média / baixo | CE-33 limita o diff por arquivo | — |
| R13 | Ordem com o seletor (A-13) | média / baixo | válvula H-08; Q4 | — |

**Rollback geral:** `git revert` do squash — sem migração, sem estado de banco; a web antiga volta a funcionar (last-write-wins). Pendência reabre.

## §12 — Junta sugerida

Perda de dado → **junta completa** (`D-GOV-PROPORCIONAL` (1)): `inspetor-de-terreno-da-junta` + **3 cadeiras, unanimidade**; `critico-adversarial` já atacou (r1) e **não há r3** se cada achado virou requisito (§R). Nível menor (Opus/Sol) declarado em todo voto; topo só aqui e em eventual reprovação. P1–P8 e `D-JUNTA-SO-CADEIRA-VERMELHA` (`arquivos_medidos` em todo voto). A `agente-fabrica` cria os especialistas.

| Cadeira | Itens (≤ 3) | `arquivos_medidos` |
|---|---|---|
| **C1** `jurado-san322-c1-banco-e-concorrencia` | (1) CE-5, CE-6, **CE-12-db** (+ CE-12-forma) no objeto do PR, com o drill do mutante `tenant_id` executado por ele; (2) **CE-22, CE-23, CE-24** (transações controladas; H-03 confirmada ou o bloco para); (3) CE-4, CE-7-db, CE-8-db, CE-10-db + `git diff --stat -- prisma/ src/database/` = 0 e guard de migração | `src/modules/checklists/checklist-prisma.repository.ts`, `tests/checklist-template-lock-db.test.ts`, `tests/checklist-template-prisma-db.test.ts`, `tests/checklist-run-lifecycle-db.test.ts`, `prisma/**`, `src/database/**` |
| **C2** `jurado-san322-c2-contrato-e-classificador` | (1) **CE-18a–g** com as 2 mutações (uma chave na allowlist; `label` fora) executadas por ele; (2) CE-1/2b/3/7a–d/8a–c/9a–e/10a–c/11a–c/12/14 via REST em memória + drill de CE-3/9b/9d/10c/11b; (3) CE-13 (10 PATCH + 16 publish + diretas) e `API_CONTRACTS.md` 3.6.2 × código (códigos, reasons, `activeRuns` só em modelo único) | `src/modules/checklists/*.ts` exceto o repositório Prisma, `tests/checklist-template-lock.test.ts`, `tests/checklist-template-change.test.ts`, os 13 arquivos de teste atualizados, `API_CONTRACTS.md` |
| **C3** `jurado-san322-c3-tela-e-campo` (lente `cognicao-visual`) | (1) **CE-30**: as 3 aparências × 2 estados contra a referência aprovada; padrão A; chave por usuário/organização; `useScreenAppearance` é o do contrato (ou a válvula, declarada); (2) CE-26a–b, **CE-27**, **CE-28**, **CE-29**, CE-31, CE-32 (texto do diálogo inalterado; nada técnico na cópia); (3) CE-33/CE-36 (diff vazio em `mobile/` e `client.ts`) + `test:smoke`/`build` | `frontend/src/modules/checklists/**`, `frontend/src/modules/appearance/**`, `frontend/tests/checklists-*.tsx`, `docs/claude-code-handoff/screen-refs/checklist-editor-estados-3opcoes.reference.html`, `mobile/**` (diff) |

Inelegíveis: esta identidade, `crit-san322-opus-r1`, o dev, e quem votar em ciclo anterior deste bloco (salvo voto carregado pela regra (1) da `D-JUNTA-SO-CADEIRA-VERMELHA`). Quem acha ≠ quem planeja ≠ quem desenvolve. Objeto: SHA com check-runs **concluídos**, incluindo `backend-postgres` (onde CE-12-db/22/23/24 rodam). Teto de 2 ciclos; do 3º em diante só defeito grave bloqueia. Porteiro pós-merge: sim.

## §13 — Perguntas ao DONO

**Respondidas em 25/10 (não se reabrem; a v2 as aplica):** Q1 **A "só textos"** (com "tornar opcional" e "adicionar campo opcional" contando como mudança de campo) · Q2 **obrigatório** · Q3 **sem migração** · tela **3 opções**, o dev entrega as 3 aparências.

**Q4 — Ordem entre este bloco e o seletor de aparência (`B-APARENCIA-USUARIO`, `P-APARENCIA-POR-USUARIO`).** O seletor não existe na `main`; já tem plano aprovado com ajustes e as suas respostas (v1 no navegador, padrão A, escolha no menu do usuário, Pátios estreia junto). O `CLAUDE.md` §4 item 7 diz que ele é pré-requisito da primeira tela que sair com as 3: "ou esse bloco vem antes, ou a primeira tela o entrega junto".
- **(a) O B-SAN3-22 entrega o seletor junto.** Escopo cresce com `frontend/src/modules/appearance/**` inteiro (hook, menu do usuário, testes `aparencia-*`) e, pela sua resposta (d), com a estreia de Pátios — uma tela inteira dentro de um bloco de **perda de dado**, julgado por junta de segurança/dado. Custo ≈ o bloco do seletor somado; a junta do 22 passa a julgar Pátios. **Não recomendado.**
- **(b) O seletor vem antes (recomendado).** Já planejado e criticado; é UI sem regra de negócio → **1 revisor + CI**, cabe num dev externo **em paralelo** ao backend do 22 (que não depende dele). O 22 consome `useScreenAppearance("checklist-editor")`. **Válvula:** se o seletor não estiver na `main` quando o 22 chegar à junta, o 22 cria só o hook (mesmo contrato, padrão A, sem menu) e o bloco do seletor acrescenta o menu depois — ninguém fica refém da ordem, e os usuários veem A até o menu existir, que é exatamente o seu padrão (b) para telas que não são Pátios.
- **(c) O 22 sai só com a aparência A; B e C entram quando o seletor existir.** Contraria a letra da `D-TELAS-SAEM-COM-TRES` e a sua resposta a este bloco ("o dev entrega as 3 aparências"); só com exceção explícita sua. **Não recomendado.**

**Recomendo (b) com a válvula.** Por quê: mantém a junta do 22 no risco que ela existe para julgar, respeita "toda tela sai com as 3" (as 3 ficam implementadas e selecionáveis assim que o menu existir) e não cria dependência de calendário entre um item do gate de dado e um bloco de aparência.

## §14 — Onde mora a propriedade? (depois do remédio)

**P1 mora no banco, na primeira sentença de cada uma das três transações** — `SELECT … FOR UPDATE` tenant-first com `token_ok` — e na borda HTTP (token obrigatório nas três portas; `componentKey` obrigatório). Nada do que vem depois (classificação, contagem, escrita, `previous` da auditoria) acontece fora do lock; o 409 desfaz a transação inteira (CE-6). O editor apresenta o 409 e, para sobrescrever, relê — nunca grava sem a versão. **Teste da afirmação:** tirar `token_ok` deixa CE-3/5/10b/11b vermelhos; tirar `tenant_id` do lock deixa **CE-12-db vermelho mesmo com RLS ignorado**; tirar o `FOR UPDATE` (voltar ao `UPDATE` condicional da v1) deixa **CE-23** vermelho.

**P2 mora em três mecanismos, todos sob o mesmo lock:**
1. **`diffTemplateChange` + `TEXT_PATHS`** (`checklist.template-change.ts`): tudo que não é texto é campo, por construção — as 12 chaves de `config`, `required` nos dois sentidos, ordem, acrescentar/remover. Teste: CE-18a–g (uma linha por propriedade; duas mutações opostas).
2. **`countActiveRunsForTemplate` dentro da transação do PATCH, depois do `FOR UPDATE`** — e a R6 é o que faz essa contagem valer: toda inserção de run (`createRun`, `reopenRun`) toma `FOR KEY SHARE` no modelo (explícito, para ler `version`/`status`, e implícito, pela FK), então uma inserção em curso faz o PATCH esperar e contá-la, e um PATCH em curso faz a inserção esperar e carimbar a versão vigente. Teste: CE-22/CE-23/CE-24 com transações controladas pelo arnês.
3. **R5 e R7 no serviço/repositório**: com viva, status só `→ inactive`; `published`/`archived` pelo PATCH recusados; arquivar com token e o modelo arquivado servindo as vistorias vivas via `getTemplateForRun`. Teste: CE-9a–e, CE-10a–c, CE-10-db — e o vermelho-controle é a saída E5 do próprio crítico (render 404, foto 404).

O que P2 **não** cobre está no §2.4 e vira pendências nomeadas (`P-CHK-RUN-SNAPSHOT-IMUTAVEL`, `P-MOBILE-RUN-SO-NO-APARELHO`, `P-DB-TIMEZONE-UTC`). Se alguma remoção listada acima não derrubar o teste que diz, a propriedade não mora onde este parágrafo afirma — e a junta deve reprovar por isso.

---

**Fechamento desta identidade (v2):** worktree `C:/Users/AMP/w-plan22b` removido com `git worktree remove --force`; nenhum container criado nesta rodada (as medições novas são leituras na ref e as execuções do crítico, citadas com comando); nenhum arquivo do repositório tocado; base viva não acessada. A v1 ficou em `B-SAN3-22-plano-v1.md`. O comando do bloco é derivado desta v2 pelo orquestrador depois da resposta à Q4 e da referência aprovada em `screen-refs/`.

---

## Respostas do dono (25/10, pela pergunta do orquestrador)

- **Q1 — vistoria em andamento:** "A: só textos (Recomendado)". Enquanto houver vistoria em andamento, só os textos mudam. Mudança de campo é recusada com N. Num modelo publicado sem vistoria viva, mudar campo gera versão N+1. A anexa também vale como recomendada: tornar opcional e adicionar campo opcional contam como mudança de campo.
- **Q2 — versão no salvar:** "Obrigatório (Recomendado)". Sem `expectedUpdatedAt`, o PATCH responde 400.
- **Q3 — migração:** "Sem migração (Recomendado)". `prisma/**` continua PROIBIDO.
- **Tela (pergunta do orquestrador sobre o §10):** "Sim, 3 opções (Recomendado)". O orquestrador (Claude) faz a maquete A/B/C dos 2 estados, "campos travados" e "conflito ao salvar", em paralelo com a crítica. As 3 aprovadas entram em `screen-refs/` e o dev entrega as 3 aparências (`D-TELAS-SAEM-COM-TRES`).

- **Pendente (v2):** Q4 — ordem entre este bloco e o seletor de aparência (§13); recomendação (b) com válvula.

## Resposta do dono à Q4 (25/10)
"(b) Seletor antes, com válvula (Recomendado)". O `B-APARENCIA-USUARIO` vira bloco próprio, com 1 revisor e CI, em paralelo ao backend do 22. Se ele não estiver na `main` quando o 22 chegar à junta, o 22 cria só o hook `useScreenAppearance("checklist-editor")` com o mesmo contrato, padrão A e sem menu.
Maquete: o dono aprovou refazê-la a partir do molde aprovado e da tela real ("Sim, corrija"). Quem faz é o orquestrador Claude; o dev só toca a tela depois que o dono aprovar as 3.

## Aprovação do dono da maquete das 3 opções (25/10)
"aprovado a maquete 22". Aprovado: `C:/Users/AMP/erp-pausa-2026-10-03/maquetes/B-SAN3-22-checklist-trava-3opcoes.html`, com fonte em `maquetes/fonte-22/`. Ficaram as 3 opções, A Padrão fiel, B Analítica e C Painel de impacto, como aparências que cada usuário escolhe (`D-APARENCIA-POR-USUARIO`, `D-TELAS-SAEM-COM-TRES`).
Revisões:
- 1ª, Claude `cognicao-visual`: VOLTA;
- 2ª, Argon: APROVA;
- revisão do orquestrador, a pedido do dono ("Vc revisa e me mostra");
- a revisão principal do Codex não rodou, porque ele estava sem limite, e o dono aprovou antes.
A fatia de tela copia a maquete para `docs/claude-code-handoff/screen-refs/checklist-editor-estados-3opcoes.reference.html` e a implementa a partir dela. As opções B e C dependem de leituras novas do backend, listadas no quadro de notas da maquete: a lista de vistorias em andamento por modelo, o histórico de versões e o comparador. O plano da fatia de tela decide o que entra.
