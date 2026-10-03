**Papel:** `planejador-mestre` · **modelo:** Fable · **SHA do worktree:** `3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c` (`git rev-parse HEAD` em `/home/user/w-b-san3-11`, resolvido em 2026-09-30; = `origin/main`)

**Conferência factual pré-commit: 15 divergências, 15 aplicadas, 0 recusadas** (tabela em §0.7; cada uma reexecutada por esta instância antes de corrigir).

# B-SAN3-11 — PLANO — o dossiê não distingue vistoria substituída (item 8 do §4.1) — ciclo 1

> **Papel:** `planejador-mestre` (duas instâncias de identidade nova, ambas em **Fable** — o fixado no frontmatter, sem
> fallback: a primeira escreveu o plano e mediu; a segunda, esta, reexecutou as 15 divergências do conferente factual, corrigiu e
> fechou. Nenhuma das duas votou nem desenvolveu o bloco) · **medido em:** `origin/main` =
> `3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c` (resolvido por `git rev-parse origin/main` em 2026-09-30, pelas duas instâncias;
> o worktree `/home/user/w-b-san3-11` está nesse SHA, `git status` vazio afora este arquivo) ·
> **ramo deste plano:** `docs/plano-b-san3-11`, criado desse SHA · **bloco:** `B-SAN3-11` ·
> **branch da entrega:** `fix/dossie-versao-da-vistoria` (§5.3 do `PLANO_SAN3.md`).
>
> **Fonte do bloco:** `docs/revisoes/SAN3/PLANO_SAN3.md` §4.1 item 8 (l.120: `P-CHK-DOSSIE-VERSAO-NA-UI` — "a vistoria
> substituída aparece como válida no dossiê", crit. 5, **condicional: dossiê vendido como prova, default sim**), §5.3
> (l.271, a linha do bloco), §5.6 (CE-G1, CE-G2), §6 (l.360: trava de mesmo arquivo
> `src/modules/impound/impound-prisma.repository.ts`, `SAN3-11` → `B-O6R-12`; l.345: agenda da frente 3, onde `SAN3-11` vem depois do `AV-REAL`),
> §10 item 1 (o condicional é decisão do dono, com default). Pendência: `P-CHK-DOSSIE-VERSAO-NA-UI`
> (`agent-orchestration/controle/pendencias.md:2244`, aberta em 2026-08-10 pela junta do CHK P1 PR-03, 2ª rodada; dono
> `B-SAN3-11` desde a `D-SAN3-PLANO-OPCAO-B`).
>
> **Regra de leitura deste plano (§A7 do contrato):** toda afirmação abaixo diz onde foi medida. **MEDIDO** = comando +
> saída, nesta sessão, sobre `origin/main@3b1fe0f9` (`git show`/`git grep`/`git ls-tree` na ref, ou o worktree que está
> nela) ou sobre um Postgres 16.13 descartável com as migrações dessa ref aplicadas (porta 54334, §0.2). **HIPÓTESE** =
> não medido aqui, com o comando exato que a derruba (§0.6). Nenhum SHA foi digitado; nenhum número foi copiado de bloco
> anterior — os que vêm do KPI vigente estão nomeados como tal e foram reexecutados (§0.5, §8).

---

## §0 — Terreno e LINHA DE BASE (medido por mim, comando + saída)

### 0.1 Referências — resolvidas, não digitadas

```
$ cd /home/user/w-b-san3-11 && git rev-parse HEAD && git status --porcelain | head && git branch --show-current
3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c
docs/plano-b-san3-11
$ git fetch origin ; git rev-parse origin/main
3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c
$ git show origin/main:docs/revisoes/SAN3/PLANO_SAN3.md | grep -n -E 'B-SAN3-11|SAN3-11'
120:| 8 | `P-CHK-DOSSIE-VERSAO-NA-UI` — a vistoria substituída aparece como válida no dossiê | 5 | B1 — **condicional: dossiê vendido como prova** (default: sim) | `B-SAN3-11` | |
258:| `B-O6R-12` … | `SAN3-11` (`src/modules/impound/impound-prisma.repository.ts`, §6) | M |
271:| `B-SAN3-11` · `fix/dossie-versao-da-vistoria` | 8 | o dossiê não distingue vistoria substituída | `frontend/src/modules/patios/processes/**` (+ DTO em `src/modules/impound/**` se preciso) | vistoria substituída aparece rotulada, nunca como vigente | frontend | unanimidade | — | P |
345:| 3 — web e antivírus | … `SAN3-11` 28–29,5 … |
360:… `src/modules/impound/impound-prisma.repository.ts` (`SAN3-11` → `B-O6R-12`) …
```

`3b1fe0f9` é exatamente o SHA esperado pelo mandato (não um descendente). O `git fetch` só moveu
`origin/docs/conhecimento-de-terreno` (`aba469b..0a8c11a`), que não toca a fronteira (P-l).

### 0.2 A máquina de medição

```
$ uname -a ; node --version ; npm --version ; git --version
Linux vm 6.18.44-fc-v50 #1 SMP PREEMPT_DYNAMIC @0 x86_64 x86_64 x86_64 GNU/Linux
v22.22.2
10.9.7
git version 2.43.0
$ timeout 20 docker info >/dev/null 2>&1 ; echo "docker info exit=$?"      → exit=1 (cliente sem daemon)
$ which gh                                                                → gh ausente (o `gh pr list` do §0.3 P-l não pôde rodar)
$ ls node_modules | wc -l ; ls frontend/node_modules | wc -l ; ls node_modules/.prisma/client/index.js
222 · 61 · node_modules/.prisma/client/index.js   (npm ci próprio do worktree, Prisma Client gerado — nada instalado por mim)
$ (echo > /dev/tcp/127.0.0.1/54334) 2>/dev/null && echo OCUPADA || echo livre   → livre
$ /usr/lib/postgresql/16/bin/postgres --version                            → postgres (PostgreSQL) 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)
```

**Cluster descartável — subiu, e fica de pé para o conferente** (dados em `/var/lib/postgresql/erp_b_san3_11`, banco
`erp_b_san3_11`, auth `trust`, `listen_addresses=127.0.0.1`, zero segredo):

```
$ runuser -u postgres -- /usr/lib/postgresql/16/bin/initdb -D /var/lib/postgresql/erp_b_san3_11/data -U postgres --auth=trust --no-instructions ; echo "initdb exit=$?"
initdb exit=0
$ runuser -u postgres -- /usr/lib/postgresql/16/bin/pg_ctl -D /var/lib/postgresql/erp_b_san3_11/data -o "-p 54334 -k /var/lib/postgresql/erp_b_san3_11 -c listen_addresses=127.0.0.1" -l /var/lib/postgresql/erp_b_san3_11/server.log -w start
server started
$ psql -h 127.0.0.1 -p 54334 -U postgres -d postgres -Atc "CREATE DATABASE erp_b_san3_11"      → CREATE DATABASE
$ DATABASE_URL="postgresql://postgres@127.0.0.1:54334/erp_b_san3_11?schema=public" timeout 300 npx prisma migrate deploy
All migrations have been successfully applied.
$ psql -h 127.0.0.1 -p 54334 -U postgres -d erp_b_san3_11 -Atc "SELECT count(*) FROM pg_tables WHERE schemaname='public'; SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='checklist_runs'::regclass AND conname LIKE '%reopen%'; SELECT indexname FROM pg_indexes WHERE tablename='checklist_runs' AND indexname LIKE '%reopened%';"
115
checklist_runs_reopen_link_biconditional_chk|CHECK (((reopened_from_run_id IS NULL) = (reopen_reason IS NULL)))
checklist_runs_reopen_no_self_reference_chk|CHECK (((reopened_from_run_id IS NULL) OR (reopened_from_run_id <> id)))
checklist_runs_tenant_id_reopened_from_run_id_fkey|FOREIGN KEY (tenant_id, reopened_from_run_id) REFERENCES checklist_runs(tenant_id, id) ON UPDATE CASCADE ON DELETE RESTRICT
checklist_runs_tenant_id_reopened_from_run_id_key
```

**Por que o banco foi necessário:** o plano tem **duas premissas de banco** — (i) a vistoria vigente pode **não estar** na
lista que o dossiê recebe (P-e), porque reabrir não cria vínculo e o AUTO-link roda só na abertura da custódia (P-d); (ii) a
cadeia de substituição é **linear** (uma vigente por vistoria — P-f). **(ii) já está provada por teste `-db` na ref:**
`tests/checklist-run-lifecycle-db.test.ts` roda contra o Postgres real e cobre "(3) anti-dupla-reabertura pelo índice único
(tenant_id, reopened_from_run_id)" (l.13; l.179-190: 2ª reabertura → 409 `checklist_run_already_reopened`) e "(5) constraints
… biconditional, anti-auto-referência" (l.294-334, asserções `/biconditional|23514/`) — C1/C2 do §0.5 são **reconfirmação**,
não prova nova. **(i) não tem teste `-db`:** `git grep -l listChecklistRunsForProcess origin/main -- tests | grep -- '-db.test'`
→ **0**; `tests/impound-checklist-link.test.ts` usa um **Prisma falso** (`fakePrismaClient`, l.226-255) e o teste HTTP (l.430+)
roda o serviço em memória. (i) — e o que o DTO e o adapter reais fazem com a cadeia (A4–A8, B1–B4) — foi medido aqui com as
classes **reais** do head (§0.5). Enumeração: `git grep -l -E 'reopened_from_run_id|reopenedFromRunId' origin/main -- tests`
→ 8 arquivos, entre eles `checklist-run-lifecycle-db.test.ts`.

### 0.3 As premissas do enunciado, uma a uma

| # | Premissa | Estado | Comando → saída |
|---|---|---|---|
| P-a | O backend **já** emite o estado de substituição no resumo que o dossiê consome — a linha do §5.3 diz "+ DTO em `src/modules/impound/**` **se preciso**" | **MEDIDO — verdadeira; NÃO é preciso** | `git show origin/main:src/modules/impound/impound.checklist-link.dto.ts` l.31-33: `reopenedFromRunId: run.reopenedFromRunId ?? null, supersededByRunId: …, currentRunId: …`. No banco real (§0.5 A4): o item do DTO tem **12 chaves** — as 9 de sempre **mais** as 3 de versão. |
| P-b | A UI **descarta** os três campos (`processes.types.ts` e `processes.adapter.ts`) e a aba lista a substituída com chip `completed` | **MEDIDO — verdadeira** | `git grep -n -E 'supersededByRunId\|reopenedFromRunId\|currentRunId' origin/main -- frontend/src` → **3 hits**: os 2 comentários `processes.types.ts:205-206` ("ainda NÃO consumidos aqui") e `frontend/src/modules/checklists/types.ts:229` (`reopenedFromRunId?: string \| null` — tipo do módulo **checklists**, fora do dossiê; **nenhum** hit em código executável de `patios/processes`). Gerador (§0.4): `DESCARTADAS pelo espelho (3)` · `DESCARTADAS pelo adapter (3)`. No banco (§0.5 A7/A8): o adapter devolve as 9 chaves; `"supersededByRunId" in item` = `false`. `ChecklistRunsPanel.tsx:89` renderiza `<Chip tone={getChecklistRunStatusTone(run.status)}>` — para uma substituída `completed`, chip **verde "Concluído"** (A3: o `status` da substituída segue `completed`). |
| P-c | A rota que alimenta a aba está montada, com guarda dupla | **MEDIDO** | `git show origin/main:src/modules/impound/impound.routes.ts` l.201-208: `router.get("/impound-processes/:processId/checklist-runs", requirePermission("impound:read"), requirePermission("checklist_runs:read"), …)`; `src/app.ts:164` `app.use("/api/v1", attachAuthenticatedActor(), createImpoundRouter())`; envelope `sendResult` (l.224-226) → `res.json(result.body)` = `{ items: [...] }`; o frontend lê `payload.items` (`processes.adapter.ts:552`). |
| P-d | Reabrir uma vistoria **não** cria vínculo novo com o processo; o AUTO-link roda **só na abertura** da custódia | **MEDIDO** | `git grep -n -i -E 'impound\|ChecklistLink\|linkChecklistRun' origin/main -- src/modules/checklists` → 0 hits executáveis (2 comentários sobre logger). `impound-prisma.repository.ts:205-215` `autoLinkChecklistRuns` (chamado na abertura pelo sweep, `related_entity_type='work_order'`). `reopenRun` copia `related_entity_type/id` da anterior (`checklist-prisma.repository.ts:806-807`). Banco (§0.5 A0/A1): abertura → 1 vínculo (v1); depois de v2 e v3 nascerem, a lista do processo segue com **1** item. |
| P-e | Logo, a **vigente pode ou não** estar na lista do dossiê — os dois casos existem | **MEDIDO — os dois** | §0.5 **A1** (processo aberto ANTES da reabertura: lista `[v1]`, v2 e v3 ausentes; v1 com `supersededByRunId=v2`, `currentRunId=v3`) e **B1** (processo aberto DEPOIS: lista `{u1,u2}`, u2 é a vigente e está na lista). A UI precisa dos dois ramos (§2.2). |
| P-f | A cadeia é **linear**: uma vistoria tem no máximo um sucessor, logo **uma** vigente | **MEDIDO** | `prisma/schema.prisma:933` `@@unique([tenant_id, reopened_from_run_id])`; migração `20260860000000` (CHECK biconditional + no-self-reference). Banco (§0.5 C1): 2ª reabertura da mesma v1 → **`23505`**; C2: reabertura sem motivo → **`23514`**. |
| P-g | A vigente nascida de reabertura carrega `reopenedFromRunId` (de onde veio) e `supersededByRunId = currentRunId = null` | **MEDIDO** | §0.5 **B3**: `{re: "u1", sup: null, cur: null}`. É o terceiro estado que a UI rotula (§2.2: "Versão atual — substitui uma vistoria anterior"). |
| P-h | Não existe tela de execução de vistoria na web: "link para a vigente" só pode ser **dentro da lista** | **MEDIDO** | `git grep -n -i checklist origin/main -- frontend/src/App.tsx` → rotas `/operations/checklists` (lista de modelos), `/operations/checklists/:checklistId/run` (`checklistId` = **modelo**, `ChecklistRuntimePage.tsx:41,69`), `/administrator/checklists[/:id]` (editor). Nenhuma rota por `runId`. Pendência já aberta: `P-WEB-CHK-EXECUCOES-INEXISTENTES` (`pendencias.md:8477`, dono CHK P1 PR-05). `git grep -n -E 'href="#[a-z]' origin/main -- frontend/src` → **0** (não há idioma de âncora interna hoje; o bloco o introduz, §2.2). |
| P-i | Não há PNG nem protótipo do dossiê de custódia; o alvo visual é o dossiê já construído + design system | **MEDIDO** | `git ls-tree -r --name-only origin/main screen-refs/web \| wc -l` → **0**; `… docs/claude-code-handoff/screen-refs/web` → **35** PNGs, nenhum com `patio\|dossi\|custod\|impound\|vistoria` (os únicos de checklist são `builder-checklists.png`, `checklist-execucao.png`, `checklists-operacionais.png` — telas de **modelo/execução**, não o dossiê); `git show "origin/main:docs/claude-code-handoff/ERP Web.dc.html" \| grep -n -i dossi` → só l.3258 (dossiê **da OS**). Alvo real declarado em §2.2. **Divergência §A2 registrada:** `CLAUDE.md` §11 (l.665-676) aponta `screen-refs/web/` e `screen-refs/mobile/`, que na ref só têm `README.md`; o próprio `screen-refs/README.md:15-30` diz que os assets vivem em `docs/claude-code-handoff/screen-refs/` e que "a pendência real é de ESPELHAMENTO/caminho". Este plano usa o caminho **real**; consertar o §11 é fora do bloco (§13). |
| P-j | Um **único** componente apresenta vistorias no dossiê, consumido em três pontos | **MEDIDO — gerador §0.4** | L3 = **1** ponto (`ChecklistRunsPanel.tsx:89`, "consulta substituição: NÃO"); L4 = **3** consumidores (`DossiePrintDocument.tsx:95`, `VehicleDossieModal.tsx:233`, `ProcessoDossiePage.tsx:142`). O documento de **impressão** (PR-10, "salvar e imprimir") passa pelo mesmo painel — é o que faz o item ser de prova. |
| P-k | Os cinco estados do `status` do frontend batem com o enum do backend | **MEDIDO** | `src/modules/checklists/checklist.types.ts:34-40` = `in_progress, completed, completed_with_divergence, pending_acknowledgement, cancelled` = `processes.types.ts:209-214`. **Nenhum** deles significa "substituída" (A3): a marcação não pode vir do status. |
| P-l | Nenhum bloco em voo toca a fronteira | **MEDIDO — só um ramo de demonstração, cosmético** | script `ramos-em-voo.sh` (Apêndice C, **verbatim** com a saída; md5 `6b839006f3d68e1155d8bd4ae8fbcbb5`) — `git for-each-ref refs/remotes/origin` × `git diff --name-only origin/main...<ramo>` filtrado por `frontend/src/modules/patios/processes/\|frontend/tests/patios-dossie\|src/modules/impound/\|frontend/package.json` — **141 refs** varridas nesta reexecução (sem `origin/HEAD`; a instância anterior e o conferente contaram 140 — a saída filtrada é **idêntica**, logo o ref a mais não toca a fronteira) → **só** `origin/demo/investidor`: `ChecklistRunsPanel.tsx` (+`STATIC_ROW_CLASS` na `<tr>`, l.3 e l.79), `CustodyHistoryPanel.tsx`, `VehicleDossieModal.tsx`, `ProcessosPage.tsx`. `git log -1 origin/demo/investidor` → `d1fab3b 2026-08-29`; merge-base `6efe5adf`; `49` à frente / `34` atrás. É demo, não bloco; conflito de rebase é dele (§12 R3). |
| P-m | Suítes existentes e baseline | **MEDIDO na ref; reexecutado em §8** | `frontend/tests/patios-dossie-checklist.smoke.test.tsx` **12** `test(` · `patios-dossie-print.smoke.test.tsx` **6** · `patios-dossie-modal.smoke.test.tsx` **16** · `patios-dossie.smoke.test.tsx` **6**; os quatro estão na lista `test:smoke` de `frontend/package.json` (lista **explícita**, arquivo a arquivo). KPI vigente `Kpis/kpis-latest.json`: `frontend_smoke_tests 1202/1202` · `backend_tests 3052/3054` · `flutter_tests 864/864` · `blocks_completed 168`. `tests/e2e` → `git grep -i -E 'dossi\|patios/processos\|impound-processes' -- tests/e2e` = **0** (não há e2e do dossiê). |
| P-n | Origem (§C7.1-ter(a)): a classe antecede o bloco | **MEDIDO** | `git log --diff-filter=A --date=short -- <arquivo>` → `f4ef511 2026-08-11` para os 5 arquivos do bloco (é a **raiz**: `git rev-list --max-parents=0 origin/main` = `f4ef511d…`). Pendência datada **2026-08-10** (junta `J-CHK-P1-PR03-run-lifecycle.md:76,181,205`: "UI em aberto"). `inventario-B1.md:42,123`. Tudo antecede este bloco. |
| P-o | CE-G2 — papéis que alcançam a aba (rota `impound:read` ∧ `checklist_runs:read`; hook `can("checklist_runs:read")`, `useProcessChecklistRuns.ts:20`) | **MEDIDO — lista GERADA por script (Apêndice D)** | `npx tsx papeis-com-as-duas.mts` sobre `ROLE_PERMISSIONS` de `src/modules/core-saas/permissions/catalog.ts` (worktree em `3b1fe0f9`) → **ambas (9):** `super_admin, tenant_admin, manager, technician, viewer, platform_admin, operator, field_technician, auditor` (`platform_admin: PERMISSION_CATALOG`, l.729 — o catálogo inteiro, onde `impound:read` é l.69 e `checklist_runs:read` l.245); **só `impound:read` (1):** `field_dispatcher` (l.646) — vê o dossiê **sem** a aba (comportamento existente, `dossieTabsFor`); **só `checklist_runs:read` (3):** `finance`, `inventory`, `support` — não veem o dossiê; **nenhuma (0)**. `RBAC_MATRIX.md:134`: **read** de impound → `super_admin, platform_admin, tenant_admin, manager, operator, field_dispatcher, technician, field_technician, viewer, auditor` — bate com o catálogo. `RBAC_MATRIX.md:44` ("Checklist executions and answers"; colunas do cabeçalho l.29): `platform_admin=support-audited · tenant_admin=full-tenant · manager=read/complete-by-scope · operator=create/answer/complete-by-scope · finance=read · inventory=read/answer-by-scope · field_technician=answer-assigned · auditor=full-read · support=support-view` — a matriz **não** tem coluna `technician` nem `viewer` (esses dois vêm só do catálogo). Nenhum passo do teste de encerramento exige permissão que um papel não tenha: os testes são de **componente puro** (renderToString), e a integração no modal usa `canReadChecklist` (§8). |
| P-p | `frontend/tsconfig.json` inclui só `src` — os testes não passam por `tsc -b` | **MEDIDO** | `grep -n include frontend/tsconfig.json` → `"include": ["src"]`. Consequência: **tipos das fixtures** de teste só são conferidos em tempo de execução (tsx); por isso o critério A11 exige que os testes **executem** (não só compilem). |
| P-q | Trava de mesmo arquivo `impound-prisma.repository.ts` (`SAN3-11` → `B-O6R-12`) | **MEDIDO — o bloco NÃO toca o arquivo** | P-a: o DTO já basta; `src/modules/impound/**` vai para **PROIBIDO** (§6). A trava do §6 fica satisfeita por construção e o `B-O6R-12` não espera nada deste bloco naquele arquivo — registrar na ata (§13). |

### 0.4 A LISTA GERADA — por script, pela PROPRIEDADE (CE-G1)

A propriedade **não é** "a linha 89 do painel"; é: *a UI apresenta uma vistoria como vigente sem consultar o estado de
substituição* — todo ponto que renderiza a **situação** de uma vistoria (`run.status`, ou os helpers
`getChecklistRunStatusLabel`/`getChecklistRunStatusTone`) dentro de uma função cujo corpo **não lê**
`supersededByRunId`/`currentRunId` é membro da lista; e todo campo que o DTO emite e o espelho/adapter descarta é membro da
segunda lista. O gerador (Apêndice A, **verbatim**; o desenvolvedor o commita como
`scripts/san3-11-dossie-vistoria-censo.mjs`) deriva tudo da fonte pela **AST** do TypeScript (5.9.3, já em `node_modules`),
em cinco camadas: L0 chaves emitidas ← `toChecklistRunSummaryListDto`; L1 chaves do espelho ← tipo
`ChecklistRunSummaryItem`; L2 chaves consumidas ← `adaptChecklistRun`; L3 pontos de apresentação ← todo `*.ts(x)` de
`frontend/src/modules/patios/processes/**` **mais** qualquer arquivo de `frontend/src` que importe `ChecklistRunSummaryItem`
ou `ChecklistRunsPanel` (26 arquivos varridos); L4 consumidores do painel ← JSX `<ChecklistRunsPanel runs=…>`.

**Saída no head `3b1fe0f9`** (`node scripts/san3-11-dossie-vistoria-censo.mjs .`, **exit=1**; md5 do fonte `da2f2891f85d49a6b897de0b5e375d8e`; 13 linhas — a 6ª, `# L3 arquivos varridos (26): …`, é **elidida aqui** e está verbatim no Apêndice A, cuja saída reproduz byte a byte: `diff` vazio na reexecução):

```
# L0 DTO emite (12): id, templateId, templateName, templateVersion, status, relatedEntityType, relatedEntityId, startedAt, completedAt, reopenedFromRunId, supersededByRunId, currentRunId
# L1 espelho ChecklistRunSummaryItem (9): id, templateId, templateName, templateVersion, status, relatedEntityType, relatedEntityId, startedAt, completedAt
# L2 adapter consome (9): id, templateId, templateName, templateVersion, status, relatedEntityType, relatedEntityId, startedAt, completedAt
# DESCARTADAS pelo espelho (3): reopenedFromRunId, supersededByRunId, currentRunId
# DESCARTADAS pelo adapter (3): reopenedFromRunId, supersededByRunId, currentRunId
[… linha 6 elidida: `# L3 arquivos varridos (26): …` — verbatim no Apêndice A …]
# L3 pontos de apresentação da situação de uma vistoria (1):
frontend/src/modules/patios/processes/components/ChecklistRunsPanel.tsx:89 | receptor=run | getChecklistRunStatusTone(run.status) | consulta substituição: NÃO
# L4 consumidores do painel (3):
frontend/src/modules/patios/processes/components/DossiePrintDocument.tsx:95 | runs={checklistRuns}
frontend/src/modules/patios/processes/components/VehicleDossieModal.tsx:233 | runs={checklistRuns}
frontend/src/modules/patios/processes/pages/ProcessoDossiePage.tsx:142 | runs={checklistRuns}
# VEREDITO: descartadas=6 · pontos sem consulta=1
```
(`exit=1`)

**Controle (o gerador vê o que diz ver):** o sítio sabido por leitura, `ChecklistRunsPanel.tsx:89`, aparece; e as 3 chaves
que a pendência nomeia aparecem nas duas listas de descarte. **Prova por mutação, em cópia temporária (nunca no worktree):**
(1) injetar em `DossiePrintDocument.tsx` a linha `{checklistRuns.map((run) => <Chip key={run.id}>{run.status}</Chip>)}` →
L3 passa a **2** (`DossiePrintDocument.tsx:98 | consulta substituição: NÃO`); (2) fazer o arrow da linha do painel ler
`run.supersededByRunId` → o ponto **vira `sim`** (o classificador distingue quem consulta de quem não consulta). Saídas
completas no Apêndice A.

**Residual declarado (é aproximação estática, não prova):** (i) um ponto que apresente a vistoria **sem** renderizar a
situação (só nome/data) não é visto — mas não é ele que a apresenta "como vigente": a validade viaja no chip de
situação; (ii) o receptor precisa chamar-se `*run*`/`*checklist*` (filtro que exclui `process.status` da custódia) — um
receptor com outro nome cai fora; (iii) a consulta feita **por helper** noutra função (`isSuperseded(run)`) é classificada
`NÃO` — é a direção fail-closed (vermelho por excesso), e o remédio deste plano lê os campos **no próprio arrow** da linha
(§2.2). O árbitro final é o teste de componente (§8, T4–T11).

### 0.5 A MEDIÇÃO no Postgres real — 20 itens, 0 fora do esperado

Script em Apêndice B (**verbatim**, md5 `692da5f15ca2e675729a39c368f03aca`), executado da raiz do worktree com
`DATABASE_URL=postgresql://postgres@127.0.0.1:54334/erp_b_san3_11?schema=public npx tsx <scratchpad>/medir-dossie.ts`. Importa as
classes **reais** do head: `RlsPrismaImpoundRepository` + `ImpoundService` + `reconcileTenantRemovals` (o sweep que abre a
custódia e faz o AUTO-link), `RlsPrismaImpoundChecklistLinkRepository.listChecklistRunsForProcess`,
`toChecklistRunSummaryListDto` **e o adapter real do frontend** `adaptChecklistRunsResponse`. Semente escopada a **uma**
organização (tenant, perfil, catálogo com `custody_profile_id`, 2 OS de remoção concluídas, 1 modelo, 5 vistorias),
gravada **sob contexto RLS** como o app grava; teardown igual ao de `tests/impound-checklist-link-autolink.test.ts:198-214`.

| id | item | esperado | medido | ok |
|---|---|---|---|:-:|
| A0 | sweep abre 1 custódia para a OS A (AUTO-link da v1 na mesma tx) | `1` | `1` | ✓ |
| A1 | processo A (aberto ANTES da reabertura) lista SÓ a vistoria vinculada (v1) — v2 e v3 (a vigente) NÃO estão na lista | `{"n":1,"ids":["v1"]}` | idem | ✓ |
| A2 | v1: `supersededByRunId = v2` (sucessor imediato) e `currentRunId = v3` (fim da cadeia) | `{"sup":"v2","cur":"v3"}` | idem | ✓ |
| A3 | v1 continua com `status = 'completed'` — o status NÃO diz que ela foi substituída | `completed` | `completed` | ✓ |
| A4 | DTO (o JSON que a rota devolve em `{items}`): chaves emitidas | 12 chaves (as 9 + `reopenedFromRunId`, `supersededByRunId`, `currentRunId`) | idem | ✓ |
| A5 | DTO: v1 → `reopenedFromRunId=null`, `supersededByRunId=v2`, `currentRunId=v3`, `templateName` resolvido | `{"re":null,"sup":"v2","cur":"v3","nome":"Vistoria de recolhimento"}` | idem | ✓ |
| A6 | DTO não expõe `tenant_id` (§2.8) | `false` | `false` | ✓ |
| A7 | **ADAPTER DO FRONTEND (head):** chaves do item adaptado — os 3 campos de versão são DESCARTADOS | as 9 chaves | as 9 chaves | ✓ |
| A8 | ADAPTER: `"supersededByRunId" in item` | `false` | `false` | ✓ |
| B0 | sweep abre 1 custódia para a OS B (a de A já existe: não reabre) | `1` | `1` | ✓ |
| B1 | processo B (aberto DEPOIS da reabertura) lista as DUAS (u1 substituída, u2 vigente) — conjunto | `["u1","u2"]` | idem | ✓ |
| B1b | ordem devolvida pelo repositório neste run (informativa: é `created_at` do **vínculo**, iguais na mesma tx do AUTO-link ⇒ indefinida) | `u1,u2` | `u1,u2` | ✓ |
| B1c | quem ordena é o adapter do frontend, por `startedAt desc`: u2 (06/09) antes de u1 (05/09) | `["u2","u1"]` | idem | ✓ |
| B2 | u1: sup=u2, cur=u2 (um salto só); u2: sup=undefined, cur=undefined (é a vigente) | idem | idem | ✓ |
| B3 | DTO B: a **vigente nascida de reabertura** sai com `reopenedFromRunId=u1` e `supersededByRunId=currentRunId=null` | `{"re":"u1","sup":null,"cur":null}` | idem | ✓ |
| B4 | DTO B: a substituída sai com `reopenedFromRunId=null`, `supersededByRunId=u2`, `currentRunId=u2` | idem | idem | ✓ |
| C1 | UNIQUE `(tenant_id, reopened_from_run_id)`: 2ª reabertura da MESMA v1 é recusada — a cadeia é LINEAR, a vigente é UMA | `23505` | `23505` | ✓ |
| C2 | CHECK biconditional: reabertura sem motivo é recusada | `23514` | `23514` | ✓ |
| C3 | linhas com `reopened_from_run_id` na organização (v2, v3, u2) | `3` | `3` | ✓ |
| Z | limpeza: tenants `san3-11-*` / `checklist_runs` / vínculos restantes | `{"tenants":0,"runs":0,"links":0}` | idem | ✓ |

**Leitura:** o item 8 é real e mora **inteiro no frontend** (A4/A5 × A7/A8): o backend já diz "esta foi substituída por v2 e
a que vale é v3"; a UI joga a informação fora e pinta a substituída de verde "Concluído" (A3 + `ChecklistRunsPanel.tsx:89`).
E o remédio precisa de **três** ramos, não um (A1, B1, B3): a substituída **sem** a vigente na lista, a substituída **com** a
vigente na lista, e a vigente que **nasceu** de reabertura.

### 0.6 HIPÓTESES — o que NÃO foi medido aqui, com o comando que derruba cada uma

| id | Hipótese | Por que não foi medida | Comando que a mede |
|---|---|---|---|
| H1 | O job `frontend` da CI (`ci.yml:281-305`: `npm --prefix frontend ci` → `check` → `test:smoke` → `build`) executa a suíte nova por estar na lista `test:smoke`, **e** o gerador acha o `typescript` em `frontend/node_modules` (`TS_ROOT=<frontend>`, §8 — o job **não** tem `node_modules` na raiz, só `npm --prefix frontend ci`, `ci.yml:293-294`) | é o head **da entrega**, que não existe | `gh api repos/<owner>/<repo>/commits/<sha>/check-runs` → job `frontend` concluído verde, e no log o nome `patios-dossie-versao.smoke.test.tsx` com `# pass` ≥ 16 |
| H2 | A âncora interna (`<a href="#vistoria-…">`) leva o foco à linha da vigente no modal (`Modal size="lg"`, área rolável) e não fecha o modal nem dispara o `?dossie=` do deep-link | sem navegador nesta sessão (só `renderToString`) | no head da entrega, `npm --prefix frontend run dev` + navegador: abrir `/patios/processos?dossie=<id>` com vistoria reaberta, clicar em "Ver versão vigente" → a linha alvo recebe foco/rolagem, o modal segue aberto, a URL não muda. A cadeira C1 mede (§10); se o navegador mostrar salto de página, o remédio é `onClick` com `scrollIntoView` + `focus()` na mesma linha, sem mudar a semântica |
| H3 | `origin/demo/investidor` vai conflitar em `ChecklistRunsPanel.tsx` ao ser rebaseado sobre este bloco | o conflito é do ramo de demo, não deste PR | após o merge: `git merge-tree --write-tree --name-only origin/main origin/demo/investidor 2>&1 \| grep -E 'CONFLICT.*ChecklistRunsPanel'` (a forma com `-- <caminho>` **não roda** no git 2.43.0 desta máquina — usage, `exit=129`, medido; a forma `--write-tree` roda hoje e lista conflitos só em `.agents/.claude/*inspetor-de-terreno-da-junta.md`, nenhum em `patios/processes`); resolução é trivial (`className={STATIC_ROW_CLASS}` + `id=…` na mesma `<tr>`) |
| H4 | `npm --prefix frontend run build` (tsc -b + vite) segue verde com o tipo estendido (3 campos `string \| null` obrigatórios) — as fixtures de teste **não** passam por `tsc` (P-p), mas `src/` passa | só o desenvolvedor produz o diff | bateria §8: `npm --prefix frontend run check` e `run build` no head da entrega, `exit=0`; `frontend/dist` apagado depois |


### 0.7 Conferência pré-commit — 15 divergências do conferente factual, reexecutadas por esta instância

Cada comando abaixo foi **reexecutado por mim** (worktree em `3b1fe0f9` / `origin/main`) antes de decidir; evidência em
`<scratchpad>/planos/b-san3-11/fechamento/evidencia-fechamento.md`. **15 aplicadas, 0 recusadas.**

| id | onde | classe | decisão | evidência (meu comando → minha saída) |
|---|---|---|---|---|
| D01 | §0.3 P-b | saída-não-reproduz | **aplicada** | `git grep -n -E 'supersededByRunId\|reopenedFromRunId\|currentRunId' origin/main -- frontend/src` → **3** hits (`checklists/types.ts:229` + `processes.types.ts:205,206`); o "só" caiu, a conclusão fica |
| D02 | §0.3 P-o, §1 Ator | lista-não-gerada | **aplicada** | `npx tsx papeis-com-as-duas.mts` (Apêndice D) → ambas (**9**), inclui `platform_admin` (`catalog.ts:729` = `PERMISSION_CATALOG`); `RBAC_MATRIX.md:134` inclui `super_admin, platform_admin, tenant_admin` |
| D03 | §0.3 P-o | citação-errada | **aplicada** | `RBAC_MATRIX.md` l.29 × l.44 mapeadas por `awk` → `tenant_admin=full-tenant`, `manager=read/complete-by-scope`, …; sem coluna `technician`/`viewer` |
| D04 | §0.2 | premissa-sem-comando | **aplicada** | `git grep -l -E 'reopened_from_run_id\|reopenedFromRunId' origin/main -- tests` → 8, inclui `checklist-run-lifecycle-db.test.ts` (l.13, 179-190, 294-334); `… listChecklistRunsForProcess … \| grep -- -db.test` → **0**: (ii) provada por `-db`, (i) não |
| D05 | §8 baseline | premissa-sem-comando | **aplicada** | `awk` sobre `patios-dossie-print.smoke.test.tsx` → `renderDoc` em l.63/88/94/101 (94 = `canReadChecklist:false`); l.147/155 = `checklistRuns: []` → **3** renderizam o painel com `CHECKLIST`, não 5 |
| D06 | §13 | premissa-sem-comando | **aplicada** | `pendencias-indice.md:240-241` → **a atribuir**; `pendencias.md` 1736/1821/1834 → `dono: a atribuir`; só 8477 tem `trilha CHECKLIST P1, PR-05` |
| D07 | §0.6 H3 | premissa-sem-comando | **aplicada** | `git merge-tree <base> origin/main origin/demo/investidor -- <path>` → usage, `exit=129`; `git merge-tree --write-tree --name-only …` roda (conflitos só em `*inspetor-de-terreno-da-junta.md`) |
| D08 | §5 (gerador) | citação-errada | **aplicada** | `git ls-tree -r --name-only origin/main scripts/ \| grep -i -E 'san3\|censo'` → 0; `git grep -l -i B-SAN3-05 origin/main -- scripts tests frontend/tests` → 0; `git log origin/main --grep=B-SAN3-05` → 0; `scripts/audit-agents-skills.mjs` = blob `c82c5928` |
| D09 | §11, l.12, §14 | regra-do-mandato | **aplicada** | `grep -n -i -E` pelos termos que o mandato veta (padrão exato em `evidencia-fechamento.md`) → l.548 (um adjetivo vetado), l.12 e l.594 (horas da agenda) — removidos; a agenda fica citada por posição, não por horas |
| D10 | §7 A13–A15 | mutação-faltando | **aplicada** | `sed -n '413,416p'` → coluna "—" em A13/A14/A15; cada um ganhou a mutação e o comando que a detecta |
| D11 | §8 regras, Ap. A, H1 | outro | **aplicada** | `ci.yml:281-304` → só `npm --prefix frontend ci`; cópia só com `package.json` + `TS_ROOT=cópia` → `MODULE_NOT_FOUND`, `exit=1`; `frontend/node_modules/typescript` = 5.9.3; `TS_ROOT=frontend` → mesma saída. O teste passa `TS_ROOT=<frontend>`; gerador **intacto** (md5 `da2f2891…`) |
| D12 | §0.4 bloco | saída-não-reproduz | **aplicada** | `node censo.mjs .` → 13 linhas, `exit=1`; `diff` × bloco §0.4 = linha 6 elidida sem marca + `(exit=1)` dentro; `diff` × Apêndice A = **vazio**. Elisão agora marcada, `exit` fora do bloco |
| D13 | §0.3 P-l | lista-não-gerada | **aplicada** | `bash ramos-em-voo.sh` (Apêndice C, md5 `6b839006…`) → só `origin/demo/investidor` (4 arquivos; `d1fab3b` 2026-08-29; merge-base `6efe5adf`; 49/34); **141** refs (sem `origin/HEAD`) |
| D14 | §2.2 | premissa-sem-comando | **aplicada** | `git show origin/main:…/processes.service.ts \| sed -n '96,100p'` → l.99 `return adaptChecklistRunsResponse(response)`; `useProcessChecklistRuns.ts:47-48` → `setRuns(next)` |
| D15 | l.1 | seção-faltando | **aplicada** | `sed -n '1,5p'` → declaração nas l.3-5; agora a l.1 é `papel · modelo · SHA` (o leiaute do `B-GOV-SEM-TETO-plano.md` — título na l.1 — foi medido e **não** seguido: o mandato desta instância é explícito) |

Também: o grep (case-insensitive) do marcador de esqueleto do P2 no plano → 1 (l.532, referência ao protocolo, não placeholder) — reformulado; agora **0**.

---

## §1 — Objetivo · ator · fluxo · contrato

**Objetivo.** Fechar o item 8 do gate vendável (`PLANO_SAN3.md` §4.1) no lugar onde ele mora (§2): o dossiê do veículo — a
aba "Checklist do Guincho" do modal, a página de fallback e o **documento de impressão** — passa a **consumir** os três campos
de versão que o backend já emite e a apresentar cada vistoria em um de três estados **rotulados**: *substituída* (nunca
como vigente: sem chip verde "Concluído"; com o caminho para a vigente quando ela está na lista, e uma frase honesta quando
não está), *atual nascida de reabertura* ("Versão atual — substitui uma vistoria anterior") e *única* (como hoje). Fecha
`P-CHK-DOSSIE-VERSAO-NA-UI`. O DTO **não muda** (P-a).

**Ator.** Quem abre o dossiê de custódia com `impound:read` ∧ `checklist_runs:read` — os **9** papéis gerados em P-o/Apêndice D:
gestão (`manager`), operação (`operator`, `technician`, `field_technician`), leitura (`viewer`, `auditor`), os administradores
da organização (`tenant_admin`, `super_admin`) e o `platform_admin` (catálogo inteiro). O
`field_dispatcher` continua vendo o dossiê **sem** a aba (só `impound:read`); nada muda para ele. Quem reabre uma vistoria
(`checklist_runs:reopen`, gestão + admins — `checklist.routes.ts:172-180`) é o **causador** do estado, não o ator deste bloco.

**Fluxo origem → destino.**
1. Guincheiro conclui a vistoria da OS no app → `checklist_runs` (v1, `completed`). O sweep `impound.reconcile-removals` abre a
   custódia e **AUTO-vincula** as vistorias da OS ao processo (`impound-prisma.repository.ts:205-215`).
2. Gestor reabre v1 (`POST /mobile/checklist-runs/:runId/reopen`) → nasce v2 com `reopened_from_run_id = v1` (v1 **não** é
   editada; v2 **não** ganha vínculo — P-d). Pode nascer v3 de v2.
3. Operador abre o dossiê → `GET /api/v1/impound-processes/:id/checklist-runs` (guarda dupla) → `{items:[…]}` com, para v1,
   `supersededByRunId = v2` e `currentRunId = v3` (A2/A5).
4. **[HOJE]** `adaptChecklistRun` descarta os três campos (A7); `ChecklistRunsPanel` pinta v1 como "Concluído" verde (A3 +
   l.89). **[NOVO]** o adapter preserva os três campos; o painel lê `supersededByRunId`/`currentRunId`/`reopenedFromRunId`
   **na própria linha** e rotula (§2.2). O mesmo painel alimenta o modal (`VehicleDossieModal.tsx:233`), a página
   (`ProcessoDossiePage.tsx:142`) e a **impressão** (`DossiePrintDocument.tsx:95`) — os três pontos mudam de uma vez (P-j).

**Contrato.** Nenhuma rota, payload, permissão ou código HTTP muda. O contrato que este bloco **passa a honrar** é o do
DTO `toChecklistRunSummaryListDto` (12 chaves, A4) — hoje honrado só em 9. O espelho `ChecklistRunSummaryItem` ganha
`reopenedFromRunId`, `supersededByRunId`, `currentRunId: string | null` (obrigatórios no tipo; `null` = "não se aplica", como
o DTO). Sem novos códigos de erro: 404 cross-tenant, 403 sem uma das duas permissões e 401 continuam tratados pelo hook
(`useProcessChecklistRuns.ts:50-58`), intocado.

---

## §2 — Onde mora a propriedade — respondido duas vezes

### 2.1 Pelo ENUNCIADO

*"A vistoria substituída aparece como válida no dossiê."* A propriedade é de **apresentação**: a verdade sobre a substituição
já existe (no banco: `reopened_from_run_id` + unique + CHECKs, P-f; no DTO: os três campos, P-a) e **não chega à tela**. O
enunciado não pede nova informação — pede que a informação que já viaja não seja descartada, e que a linha da substituída
não vista a roupa da vigente. Por isso "**+ DTO se preciso**" resolve-se em **não é preciso** (A4/A5): qualquer mudança em
`src/modules/impound/**` seria mudar o que já está certo. Com uma ressalva medida (P-e/A1): quando a custódia foi aberta
**antes** da reabertura, a vigente **não está vinculada** ao processo e a lista não a contém — o backend informa o **id** dela
(`currentRunId`), não o resumo. Isso é uma segunda propriedade ("o dossiê mostra a vigente"), **pré-existente** e fora do item
8; vai nomeada para pendência com dono (§13), e a UI deste bloco a trata com **honestidade**, não com fabricação (§2.2).

### 2.2 Pelo REMÉDIO — três arquivos, e só três

**(a) `frontend/src/modules/patios/processes/processes.types.ts`** — o espelho deixa de estar defasado (P-b): `ChecklistRunSummaryItem`
ganha `readonly reopenedFromRunId: string | null; readonly supersededByRunId: string | null; readonly currentRunId: string | null;`
(obrigatórios, como as demais chaves do espelho — o DTO sempre as emite, A4). O comentário l.203-208 é reescrito: passa a
dizer que os três campos **são** consumidos e onde.

**(b) `frontend/src/modules/patios/processes/processes.adapter.ts`** — `adaptChecklistRun` (l.525-547) lê as três chaves com o
mesmo helper das outras (`readString(record, ["supersededByRunId", "superseded_by_run_id"]) ?? null`, idem para as duas
restantes). Ausente ou `null` → `null`. Nada mais muda no adapter: a ordenação `startedAt desc` (l.555) fica — é ela, não o
backend, que ordena (B1b/B1c).

**(c) `frontend/src/modules/patios/processes/components/ChecklistRunsPanel.tsx`** — a linha (arrow de `runs.map`, l.78-93)
passa a **consultar** o estado de substituição **no próprio arrow** (é o que o gerador exige, §0.4) e a renderizar um de três
estados. Nomes de negócio, PT-BR acentuado (§3, §11.1/11.3):

| Estado (derivado na linha) | Célula "Situação" | Linha auxiliar (célula "Checklist", `<small>`) |
|---|---|---|
| **Substituída** — `supersededByRunId !== null` | `<Chip tone="default">Versão substituída</Chip>` **no lugar** do chip de status; abaixo, `<small>Situação na época: {label do status}</small>` (histórico honesto, sem tom de sucesso) | se `currentRunId` **está na lista** (`runs.some(r => r.id === run.currentRunId)`): `Versão vigente: <templateName ou "Checklist do guincho"> · Formulário v<N> · iniciada em <data>` + `<a href={"#vistoria-" + currentRunId}>Ver versão vigente</a>`; se **não está**: `A versão vigente desta vistoria não está vinculada a este dossiê.` (texto fixo, sem inventar nome/data) |
| **Atual, nascida de reabertura** — `supersededByRunId === null && reopenedFromRunId !== null` | chip de status **como hoje** (`getChecklistRunStatusTone/Label`) | `Versão atual — substitui uma vistoria anterior` (+ `<a href="#vistoria-<reopenedFromRunId>">Ver versão anterior</a>` se a anterior está na lista) |
| **Única** — ambos `null` | como hoje | nada (linha idêntica à atual) |

Cada `<tr>` ganha `id={"vistoria-" + run.id}` e `tabIndex={-1}` (alvo de âncora focável; o id é opaco e **não** é texto —
mesma classe do `?dossie=<processId>` de `dossieDeepLink.ts:4`). A legenda acima da tabela (l.64-66) ganha uma segunda frase:
`Vistoria reaberta gera uma nova versão; a anterior fica preservada e marcada como substituída.` — o mesmo vocabulário que a
web já usa no bloqueio de edição (`checklist-run-lock.ts:22`: "uma nova versão é criada e esta fica preservada no
histórico"). Estados loading/empty/error/denied (l.33-51, 56-63) **não mudam**. O `Chip` é o do design system
(`components/ui/index.tsx:73`, `Tone` = `default|success|warning|danger|info|pending|audit`); `default` é o tom neutro
(`app.css:497-516`: fundo `--surface-panel-muted`, texto `--text-secondary`) — **nunca** `success` numa substituída.

**Alvo visual declarado (P-i):** não há PNG nem protótipo desta tela; o alvo é **o próprio dossiê já construído** (PR-07…PR-10,
telas bespoke do repo) + `DESIGN_SYSTEM.md` ("status chips", l.66) + `COMPONENT_LIBRARY.md`. A cadeira C1 (`cognicao-visual`)
julga a linha contra o que o painel já é, não contra um render que não existe.

**Por que a impressão fica coberta sem código próprio:** `DossiePrintDocument.tsx:94-96` renderiza o **mesmo**
`ChecklistRunsPanel` com `runs={checklistRuns}` (L4). O documento impresso passa a trazer "Versão substituída" na mesma
linha — é o que faz o item 8 valer como prova. A âncora, impressa, é texto sublinhado inerte (H2 mede no navegador).

**Guard do espelho (CE-G1) — `scripts/san3-11-dossie-vistoria-censo.mjs` + teste que o executa.** O gerador do §0.4 vira
guard: no head da entrega, `DESCARTADAS = 0` e `pontos sem consulta = 0` (exit 0). O teste (§8 T12–T14) roda o gerador como
processo filho **e** executa duas mutações em cópia temporária (um ponto novo que renderiza `run.status` sem consultar;
o adapter sem `supersededByRunId`) exigindo `exit=1` nas duas — a forma do `db-catalog-write-guard`. Default do membro
não previsto = **negar** (ponto novo sem consulta é vermelho; chave nova do DTO não espelhada é vermelho).

**O que NÃO é lar da propriedade (e por isso não entra):** `src/modules/impound/**` (o DTO já diz a verdade — P-a; e o
arquivo travado do §6 nem seria este); `useProcessChecklistRuns.ts` e `processes.service.ts` (o hook já entrega o que o adapter devolve — medido: `git show origin/main:frontend/src/modules/patios/processes/processes.service.ts | sed -n '96,100p'` → `listProcessChecklistRuns(...)` faz `return adaptChecklistRunsResponse(response)` (l.99), e `useProcessChecklistRuns.ts:47-48` faz `const next = await listProcessChecklistRuns(context, processId); setRuns(next)` — nenhum dos dois filtra chave);
`VehicleDossieModal.tsx`/`ProcessoDossiePage.tsx`/`DossiePrintDocument.tsx` (só passam `runs`; a mudança chega por
composição — o gerador L4 prova que são três e só três); `frontend/src/modules/checklists/**` (a tela de execução web não
existe — `P-WEB-CHK-EXECUCOES-INEXISTENTES`, §13).

---

## §3 — Entregas

| E | Entrega | Arquivos | Fecha |
|---|---|---|---|
| E1 | Espelho do DTO completo (3 campos) | `frontend/src/modules/patios/processes/processes.types.ts` | P-b (metade) |
| E2 | Adapter preserva os 3 campos (camel/snake, `null` default) | `frontend/src/modules/patios/processes/processes.adapter.ts` | P-b (metade), A7/A8 |
| E3 | Painel rotula os três estados, âncora interna, legenda; impressão e página cobertas por composição | `frontend/src/modules/patios/processes/components/ChecklistRunsPanel.tsx` | item 8 · `P-CHK-DOSSIE-VERSAO-NA-UI` |
| E4 | Guard gerado (CE-G1): gerador versionado + teste que o executa com mutação própria | `scripts/san3-11-dossie-vistoria-censo.mjs` (novo, = Apêndice A), dentro da suíte de E5 | não regride |
| E5 | Testes T1–T14 (§8): suíte nova + fixtures das duas suítes existentes + lista `test:smoke` | `frontend/tests/patios-dossie-versao.smoke.test.tsx` (novo), `frontend/tests/patios-dossie-checklist.smoke.test.tsx` (fixtures), `frontend/tests/patios-dossie-print.smoke.test.tsx` (fixtures), `frontend/package.json` (**só** a lista `test:smoke`) | DoD |
| E6 | KPI e registro no próprio PR (§9, §C3) + comando do bloco | `Kpis/kpis-latest.json`, `Kpis/kpis-history.json`, `Kpis/kpis-history.md`, `agent-orchestration/codex/comandos/B-SAN3-11-dossie-versao-da-vistoria.md` (novo), `agent-orchestration/controle/pendencias.md` (+ `pendencias-indice.md` se o gerador de índice exigir), `agent-orchestration/docs/status-geral.md`, `agent-orchestration/codex/log-execucao.md` | §C3, §C6 |

O que **não** muda de propósito: `src/**` inteiro (P-a); `prisma/**`; os três consumidores do painel (composição);
`useProcessChecklistRuns.ts`; `Kpis/index.html`/`app.js` (nenhuma dimensão nova — o painel hidrata dos JSON).

---

## §4 — Modelagem

**Sem migração, sem model, sem backend.** O objeto de dados já existe nos dois lados: coluna `reopened_from_run_id`
(`20260860000000`, aditiva, up/down escritos ali mesmo, l.31-42), unique `(tenant_id, reopened_from_run_id)` e CHECKs (P-f);
DTO com as três chaves (P-a). O que este bloco modela é **o espelho do frontend**:

```ts
// processes.types.ts — ChecklistRunSummaryItem (E1)
readonly reopenedFromRunId: string | null;   // de onde ESTA versão nasceu (um salto para trás); null se nunca foi reaberta de outra
readonly supersededByRunId: string | null;   // quem substituiu ESTA versão (sucessor imediato); null = ninguém: é a vigente
readonly currentRunId: string | null;        // fim da cadeia (a que vale hoje); null na própria vigente
```

**Derivações na linha (E3), e só nela:**
`isSuperseded = run.supersededByRunId !== null` · `isReopenedCurrent = !isSuperseded && run.reopenedFromRunId !== null` ·
`currentInList = isSuperseded ? runs.find(r => r.id === run.currentRunId) ?? null : null` ·
`previousInList = isReopenedCurrent ? runs.find(r => r.id === run.reopenedFromRunId) ?? null : null`.
Decisão declarada (a junta ratifica ou pede o contrário): `null`/ausente no DTO ⇒ **vigente** (é o contrato do DTO, A5/B3);
o guard E4 é o que impede o DTO de deixar de emitir a chave sem ninguém ver. Tri-estado "não informado" foi considerado e
descartado: exigiria inventar um estado que o backend não tem.

**Dinheiro, timestamptz, delete lógico:** não se aplicam — nenhuma escrita, nenhuma data nova (as datas exibidas já vêm em
ISO e passam por `formatDateTime`, `processes.adapter.ts:316-321`).

---

## §5 — Arquivos tocados (caminhos exatos) e a regra do espelho

| Arquivo | Ação | Módulo de referência (espelho) |
|---|---|---|
| `frontend/src/modules/patios/processes/processes.types.ts` | +3 campos em `ChecklistRunSummaryItem` (l.216-228); comentário l.203-208 reescrito | `CustodyHistoryItem` (l.233-241): espelho estreito do DTO `toCustodyHistoryListDto`, campo a campo, `null` explícito |
| `frontend/src/modules/patios/processes/processes.adapter.ts` | +3 leituras em `adaptChecklistRun` (l.536-546) | as leituras vizinhas (`templateName`, `completedAt`): `readString(record, [camel, snake]) ?? null` |
| `frontend/src/modules/patios/processes/components/ChecklistRunsPanel.tsx` | linha da tabela (l.78-93): derivações + três estados + `id`/`tabIndex` na `<tr>`; legenda (l.64-66) | `CustodyHistoryPanel.tsx` (linha com marcador `isCurrent` — "o processo que o dossiê está exibindo" — é o precedente de "marcar a linha que vale") e o próprio painel (chip via `Chip` + helpers do adapter) |
| `scripts/san3-11-dossie-vistoria-censo.mjs` | novo (= Apêndice A) | `scripts/audit-agents-skills.mjs` (varredura gerada; existe na ref — blob `c82c5928`). O `B-SAN3-05` é modelo de **forma** deste documento, não de script: vive só no ramo não mergeado `origin/docs/plano-b-san3-05` (plano + críticas); `git ls-tree -r --name-only origin/main scripts/ \| grep -i -E 'san3\|censo'` = **0**, `git log origin/main --grep=B-SAN3-05` = **0** |
| `frontend/tests/patios-dossie-versao.smoke.test.tsx` | novo (T1–T14) | `frontend/tests/patios-dossie-checklist.smoke.test.tsx` (mesma forma: `renderToString` do painel puro + integração no `VehicleDossieView`) e `patios-dossie-print.smoke.test.tsx` (documento) |
| `frontend/tests/patios-dossie-checklist.smoke.test.tsx` | fixtures `RUNS` (l.26-49) e a run de l.124 ganham os 3 campos `null` | — |
| `frontend/tests/patios-dossie-print.smoke.test.tsx` | fixture `CHECKLIST` (l.35-37) ganha os 3 campos `null` | — |
| `frontend/package.json` | **só** a lista do script `test:smoke`: `+ tests/patios-dossie-versao.smoke.test.tsx` (no fim) | precedente `tests/san3-04a-sidebar-estoque-financeiro.test.tsx` (último da lista) e `B-SAN3-01b` (§5.3: "`frontend/package.json` só a lista do `test:smoke`") |
| `Kpis/kpis-latest.json`, `Kpis/kpis-history.json`, `Kpis/kpis-history.md` | §C3 | última entrada (`#394`, `B-GOV-SEM-TETO`) |
| `agent-orchestration/codex/comandos/B-SAN3-11-dossie-versao-da-vistoria.md` | novo (molde `comando-template.md`) | `B-SAN3-01-web-wo-sem-fallback-fabricado.md` (bloco de frontend da mesma frente) |
| `agent-orchestration/controle/pendencias.md` (+ `pendencias-indice.md`), `agent-orchestration/docs/status-geral.md`, `agent-orchestration/codex/log-execucao.md` | emendas | — |

---

## §6 — Escopo (§C4) — PERMITIDO e PROIBIDO, caminhos exatos

**PERMITIDO** (e nada mais):
`frontend/src/modules/patios/processes/processes.types.ts` · `frontend/src/modules/patios/processes/processes.adapter.ts` ·
`frontend/src/modules/patios/processes/components/ChecklistRunsPanel.tsx` · `scripts/san3-11-dossie-vistoria-censo.mjs`
(novo) · `frontend/tests/patios-dossie-versao.smoke.test.tsx` (novo) · `frontend/tests/patios-dossie-checklist.smoke.test.tsx`
e `frontend/tests/patios-dossie-print.smoke.test.tsx` (**só** fixtures: os três campos novos, nenhuma asserção removida) ·
`frontend/package.json` (**só** a linha do script `test:smoke`) · `Kpis/kpis-latest.json` · `Kpis/kpis-history.json` ·
`Kpis/kpis-history.md` · `agent-orchestration/codex/comandos/B-SAN3-11-dossie-versao-da-vistoria.md` (novo) ·
`agent-orchestration/controle/pendencias.md` · `agent-orchestration/controle/pendencias-indice.md` (se o gerador de índice o
exigir) · `agent-orchestration/docs/status-geral.md` · `agent-orchestration/codex/log-execucao.md` ·
`agent-orchestration/omega/juntas/**` (ata, votos — do orquestrador, não do dev).

A linha do §5.3 autoriza `frontend/src/modules/patios/processes/**` inteiro; este plano **estreita** para os três arquivos
onde a propriedade mora (§2.2) — os outros 23 arquivos do diretório (L3, §0.4) só entram se a junta exigir, por emenda
registrada. `DossiePrintDocument.tsx`, `VehicleDossieModal.tsx` e `ProcessoDossiePage.tsx` **não** precisam de linha alguma
(composição, L4).

**PROIBIDO** (§C4 + fronteira do bloco):
`src/**` — em especial `src/modules/impound/**` (o "se preciso" da linha foi medido como **não preciso**, P-a; inclui o
arquivo travado `src/modules/impound/impound-prisma.repository.ts`, P-q) e `src/modules/checklists/**` · `prisma/**` ·
`.env*` · `package.json`, `package-lock.json`, `frontend/package-lock.json` (o `frontend/package.json` só na linha citada;
**nenhuma** dependência nova) · `pubspec.*`, `mobile/**` · `.github/workflows/**` · `fly.*.toml`, `Dockerfile`, `docker-compose*.yml`
· `frontend/src/App.tsx`, `frontend/src/layouts/appSidebarNav.ts`, `frontend/src/navigation/**` (travas de outros blocos, §6
do PLANO_SAN3) · `frontend/src/modules/checklists/**` · `frontend/src/components/ui/**` e `frontend/src/styles/**` (o `Chip` e o
tom `default` já existem; nada de CSS novo) · `CLAUDE.md`, `AGENTS.md`, `.claude/**`, `.agents/**` (a divergência do §11
sobre `screen-refs/` fica registrada, não consertada aqui — §13) · `screen-refs/**`, `docs/claude-code-handoff/**` ·
`Kpis/index.html`, `Kpis/app.js`, `Kpis/styles.css` (nenhuma dimensão nova) · `docs/revisoes/SAN3/PLANO_SAN3.md`.

**Travas de mesmo arquivo (§6 do PLANO_SAN3):** `src/modules/impound/impound-prisma.repository.ts` (`SAN3-11` → `B-O6R-12`)
— **não tocado** por este bloco (P-q): o `B-O6R-12` fica livre nesse arquivo desde já, e a ata registra. Textos de
`frontend/` → `SAN3-21` (o último a tocar texto): os literais novos deste bloco já nascem acentuados (A14) para não
alimentar o guard dele. Nenhuma outra trava cita a fronteira.

---

## §7 — Critérios de aceite — cada um com a MUTAÇÃO que o deixa vermelho

| # | Critério (verde) | Mutação que o deixa VERMELHO | Onde é medido |
|---|---|---|---|
| A1 | `adaptChecklistRunsResponse` preserva `reopenedFromRunId`, `supersededByRunId`, `currentRunId` em camelCase **e** snake_case; ausente/`null` → `null` (nunca `undefined`) | apagar a leitura de `supersededByRunId` no adapter; ou devolver `undefined` para chave ausente | T1–T3; guard T12 (DESCARTADAS ≠ 0) |
| A2 | Linha **substituída** (`supersededByRunId` ≠ null, `status = completed`): o HTML da linha contém `Versão substituída`, **não** contém `ui-tone-success`, e contém `Situação na época: Concluído` | voltar a renderizar `<Chip tone={getChecklistRunStatusTone(run.status)}>` na substituída (o head de hoje) | T4 (**vermelho-controle no head-base obrigatório**: o mesmo teste contra `origin/main`, saída colada na ata) |
| A3 | Substituída **com** a vigente na lista: a linha traz `Versão vigente: <nome> · Formulário v<N> · iniciada em <data>` e `<a href="#vistoria-<currentRunId>">Ver versão vigente</a>`; a `<tr>` da vigente tem `id="vistoria-<currentRunId>"` e `tabIndex="-1"` | apagar o `id` da `<tr>`; ou apontar a âncora para `supersededByRunId` em vez de `currentRunId` (em v1→v2→v3 aponta a v2, já substituída — o mesmo erro que a junta PR-03 pegou no backend) | T5, T5b (cadeia de 3 com as três na lista: a âncora da v1 aponta v3, não v2) |
| A4 | Substituída **sem** a vigente na lista: a linha traz exatamente `A versão vigente desta vistoria não está vinculada a este dossiê.` e **nenhuma** âncora `href="#vistoria-` | fabricar `Versão vigente: —` ou uma âncora para um id que não está na lista | T6 |
| A5 | Vigente **nascida de reabertura** (`reopenedFromRunId` ≠ null, `supersededByRunId` = null): chip de status **mantido** (`Concluído com avarias` + `ui-tone-warning` no fixture) e `Versão atual — substitui uma vistoria anterior`; `Ver versão anterior` só se a anterior está na lista | tratar `reopenedFromRunId ≠ null` como substituída | T7, T7b |
| A6 | Vistoria **única** (ambos `null`): linha byte-idêntica à de hoje (sem `Versão`, sem âncora) — os 12 testes de `patios-dossie-checklist.smoke.test.tsx` seguem verdes com fixtures `null` | rotular toda linha com `Versão atual` | T8 + suíte existente |
| A7 | **Impressão** (`DossiePrintDocument`) com uma substituída: o documento contém `Versão substituída` e não contém `ui-tone-success` na linha dela | passar ao painel, na impressão, `runs` sem os campos de versão (`map` que os apaga) | T9 |
| A8 | Integração no modal (`VehicleDossieView`, aba `checklist` ativa, `canReadChecklist=true`): `Versão substituída` presente; com `canReadChecklist=false` a aba nem existe e o texto não aparece (auto-cura intacta) | renderizar o painel fora do gate `canReadChecklist` | T10 + existente ("AUTO-CURA") |
| A9 | §allowlist/§3: **nenhum UUID como texto** (HTML com tags removidas: `/[0-9a-f]{8}-[0-9a-f]{4}-…/i` não casa), nenhum `tenant`, `work_order`, `run_id` como texto; ids só em atributos `id`/`href` | renderizar `run.currentRunId` como texto na frase da vigente | T11 |
| A10 | Ordem por `startedAt desc` preservada (a vigente, mais nova, aparece **acima** da substituída — B1c) | ordenar por `templateVersion` | T5 (asserta a ordem dos `id="vistoria-…"` no HTML) + existente |
| A11 | Guard gerado (CE-G1): `node scripts/san3-11-dossie-vistoria-censo.mjs .` no head da entrega (na CI, via T12 com `TS_ROOT=<frontend>`, §8) → `DESCARTADAS … (0)` nas duas listas, `pontos sem consulta=0`, `exit 0`; e a **mutação executada pelo próprio teste** em cópia temporária fica vermelha nas duas direções | inserir `<Chip>{run.status}</Chip>` em qualquer consumidor sem ler os campos; remover uma chave do adapter | T12, T13, T14 |
| A12 | Estados §7 intocados: loading/empty/error/denied do painel rendem o mesmo HTML de hoje | quebrar o `EmptyState` de vínculo | os 4 testes existentes de estado |
| A13 | Diff × escopo: `git diff --name-only origin/main...HEAD` ⊆ PERMITIDO (§6); `frontend/package.json` só a linha `test:smoke`; nada em `src/` | acrescentar 1 linha a `src/modules/impound/impound.checklist-link.dto.ts` (ou a qualquer arquivo de `src/`) — `git diff --name-only origin/main...HEAD -- src` deixa de ser vazio; ou trocar uma dependência em `frontend/package.json` — o diff do arquivo passa de 1 linha | junta C3 |
| A14 | Linguagem §3/§11: literais novos acentuados (`Versão`, `substituída`, `vigente`, `época`, `não`); nenhum `Tenant`, nenhum código de tela, nenhum caminho de rota como texto | escrever `Versao substituida` (sem acento) no chip, ou `Tenant` na legenda — `git grep -n -E 'Versao\|substituida\|vigente nao' -- frontend/src` e `git grep -n -i -E '\\btenant\\b' -- …/ChecklistRunsPanel.tsx` (bateria §8) deixam de ser vazios | junta C1 |
| A15 | Registro: `P-CHK-DOSSIE-VERSAO-NA-UI` → **RESOLVIDA** no PR com a evidência (linha do teste T4 + gerador `exit 0`); item 8 do §4.1 **fecha** (não depende de ato do dono; o condicional do §10.1 está no default "sim"); pendências novas do §13 abertas com dono | omitir a marcação `RESOLVIDA` em `pendencias.md` (`git show HEAD:agent-orchestration/controle/pendencias.md \| sed -n '2244,2262p' \| grep -c RESOLVIDA` = 0), ou marcá-la sem a evidência (T4 + `exit 0`); ou abrir `P-SAN3-11-VIGENTE-NAO-VINCULADA` sem `dono:` (`grep -A14 P-SAN3-11-VIGENTE-NAO-VINCULADA pendencias.md \| grep -c dono` = 0) | junta C3 / porteiro |
| A16 | KPI: `frontend_smoke_tests` **reexecutado** (1202 → 1202 + os novos, TAP colado); `backend_tests` e `flutter_tests` carregados com nota (`git diff --name-only origin/main...HEAD -- src tests mobile` vazio, colado) | copiar `1202/1202` | junta C3 / porteiro |

**CE-G2 (papel × passo):** nenhum passo do teste de encerramento executa como um papel contra a API — são renders de
componente puro (T1–T11) e processo filho (T12–T14). A integração usa `canReadChecklist` (T10), que na tela vem de
`can("checklist_runs:read")` e, no backend, da guarda dupla (P-c); os papéis que satisfazem as duas estão medidos em P-o. O
bloco **não** concede nem retira permissão.

---

## §8 — Testes: baseline N, meta M ≥ 2N, e a bateria

**Baseline N = 12** — os testes que hoje executam o componente e o adapter deste bloco:
`frontend/tests/patios-dossie-checklist.smoke.test.tsx` (12 `test(`: 4 de adapter/rótulos, 6 do painel puro, 2 de integração no
modal). **Nenhum** deles cobre a propriedade (a substituição): as fixtures `RUNS` (l.26-49) não têm os campos de versão. A
impressão tem 6 (`patios-dossie-print.smoke.test.tsx`): 4 chamam `renderDoc()` (l.63, 88, 94, 101 — o único caminho que passa
`checklistRuns={CHECKLIST}`), e um deles (l.94) usa `canReadChecklist: false`, logo **3** renderizam o painel com `CHECKLIST`; os
outros 2 (l.147, 155) renderizam `VehicleDossieView` com `checklistRuns: []` — nenhum com versão (comando: `awk '/^test\(/{t=NR}
/renderDoc\(|renderToString\(<VehicleDossieView/{if(t)print t": "$0; t=0}'` sobre o arquivo na ref). Reexecutado
por mim no worktree (P-m): as duas suítes `# tests 18 · pass 18 · fail 0`; `test:smoke` inteiro `# tests 1202 · pass 1202 ·
fail 0 · skipped 0`; `npm --prefix frontend run check` `exit=0`.

**Meta M ≥ 24 (2N).** O bloco entrega **16 novos** (suíte nova: T1–T14, incluindo T5b e T7b) e mantém os 12 verdes
(fixtures com `null`): **28** na suíte que possui o componente + a nova. Todos `node:test` + `renderToString` (a forma da casa), sem banco:

| T | Teste | Arquivo | Critério |
|---|---|---|---|
| T1 | adapter: camelCase → os 3 campos preservados (v1: `re=null, sup="v2", cur="v3"`) | `patios-dossie-versao.smoke.test.tsx` | A1 |
| T2 | adapter: snake_case (`superseded_by_run_id`…) → idem | idem | A1 |
| T3 | adapter: chaves ausentes → `null` (asserção `=== null`, não `== null`); `null` explícito → `null` | idem | A1 |
| T4 | painel: substituída (fixture A1/A5 do §0.5 — `completed`, sup≠null) → `Versão substituída`, `Situação na época: Concluído`, sem `ui-tone-success` na linha (recorte do HTML entre `<tr id="vistoria-run-v1"` e `</tr>`) — **vermelho-controle no head-base** | idem | A2 |
| T5 | painel: substituída **com** vigente na lista (fixture B1/B3/B4) → frase da vigente com nome/versão/data, âncora `#vistoria-run-u2`, `<tr id="vistoria-run-u2" tabindex="-1"`; a linha de u2 vem **antes** da de u1 | idem | A3, A10 |
| T5b | painel: cadeia v1→v2→v3 com as três na lista → v1 aponta `#vistoria-run-v3` (não v2); v2 aponta v3; v3 = `Versão atual` com `Ver versão anterior` → `#vistoria-run-v2` | idem | A3, A5 |
| T6 | painel: substituída **sem** vigente na lista → frase fixa, nenhuma `href="#vistoria-` | idem | A4 |
| T7 | painel: vigente nascida de reabertura (`re≠null, sup=null`) → chip de status mantido + `Versão atual — substitui uma vistoria anterior`; sem a anterior na lista → sem `Ver versão anterior` | idem | A5 |
| T7b | idem **com** a anterior na lista → `Ver versão anterior` → `#vistoria-<anterior>` | idem | A5 |
| T8 | painel: única (`null,null,null`) → HTML da linha **igual** ao de uma run sem os campos hoje (sem `Versão`, sem `href`) | idem | A6 |
| T9 | impressão: `DossiePrintDocument` com substituída → `Versão substituída` presente, sem `ui-tone-success` na linha | idem | A7 |
| T10 | modal: `VehicleDossieView` aba `checklist` com substituída → texto presente; `canReadChecklist=false` → ausente | idem | A8 |
| T11 | §allowlist: HTML sem tags não casa UUID nem `tenant`/`work_order`; com tags, os ids só aparecem em `id="`/`href="#` | idem | A9 |
| T12 | guard: gerador como processo filho na árvore → `exit 0`, `DESCARTADAS … (0)` ×2, `pontos sem consulta=0` | idem | A11 |
| T13 | guard, mutação 1 **executada pelo teste**: cópia temporária (`fs.mkdtemp`) com `run.status` injetado em `DossiePrintDocument.tsx` → gerador `exit 1` e a linha nova listada | idem | A11 |
| T14 | guard, mutação 2: cópia temporária com `supersededByRunId` removido do adapter → `DESCARTADAS pelo adapter (1)`, `exit 1` | idem | A11 |

**Regras das suítes:** o gerador é invocado por `child_process.spawnSync(process.execPath, [<raiz>/scripts/san3-11-dossie-vistoria-censo.mjs, <árvore>], {env: {...process.env, TS_ROOT: <frontend>}})` (a suíte roda com cwd `frontend/`; `<raiz>` = `path.resolve(__dirname, "../..")`, `<frontend>` = `path.resolve(__dirname, "..")`). **`TS_ROOT` aponta para `frontend/`, não para a raiz** — medido (D11): o job `frontend` da CI (`ci.yml:281-304`) só roda `npm --prefix frontend ci`, logo lá **não há `node_modules` na raiz**; com `TS_ROOT` numa árvore só com `package.json` o gerador aborta `Cannot find module 'typescript'` (`MODULE_NOT_FOUND`, `exit=1`); o `typescript` **5.9.3** existe em `frontend/node_modules`, e com `TS_ROOT=frontend` o gerador dá a **mesma saída** (`exit=1` pelo motivo certo no head-base). Sem isso, T12 ficaria vermelho na CI e T13/T14 receberiam `exit 1` pelo motivo errado; as cópias temporárias copiam **só** `src/modules/impound/impound.checklist-link.dto.ts`, `frontend/src/**` e `package.json` (o gerador só lê esses), e são apagadas no `finally`. Fixtures novas usam ids **não-UUID** (`run-v1`…) para que T11 meça a ausência de UUID no texto sem falso positivo dos próprios ids; T11 também roda com ids UUID reais para provar a forma. **Falha é vermelho, nunca skip.**

**Bateria de validação (§9 do contrato), na ordem, com `timeout` e `ec` por variável:**

```
npm --prefix frontend run check                                              # tsc -b --noEmit (H4)
( cd frontend && node --test --import tsx tests/patios-dossie-versao.smoke.test.tsx )                 # bloco: 16/16
( cd frontend && node --test --import tsx tests/patios-dossie-checklist.smoke.test.tsx tests/patios-dossie-print.smoke.test.tsx tests/patios-dossie-modal.smoke.test.tsx tests/patios-dossie.smoke.test.tsx tests/patios-dossie-deeplink.smoke.test.tsx tests/patios-dossie-history.smoke.test.tsx tests/checklists-run-lock.test.ts )   # regressões do dossiê e do vocabulário de reabertura
node scripts/san3-11-dossie-vistoria-censo.mjs .                             # exit 0; saída colada na ata
npm --prefix frontend run test:smoke                                          # suíte inteira (contagem real → KPI); esperado 1218/1218
npm --prefix frontend run build && rm -rf frontend/dist                       # §C5
git grep -n -E 'Versao|substituida|vigente nao' -- frontend/src ; git grep -n -i -E '\btenant\b' -- frontend/src/modules/patios/processes/components/ChecklistRunsPanel.tsx   # ambos vazios (A14, §3)
git diff --name-only origin/main...HEAD                                       # ⊆ PERMITIDO (§6); `-- src tests mobile prisma` vazio
node --check Kpis/app.js && node --test --import tsx tests/kpi-dashboard-charts.test.ts   # o painel de KPI hidrata dos JSON
git diff --check
```

O `npm test` da raiz **não** é exigido (nada em `src/`/`tests/` muda); `backend_tests` é carregado com nota (§9).
**Vermelho-controle (A2):** T4 executado no head-base — `git stash` ou worktree do jurado em `origin/main` com o arquivo
de teste novo copiado — precisa **falhar** (`Versão substituída` ausente, `ui-tone-success` presente); saída colada na ata.

---

## §9 — KPI (§C3) — no próprio PR

- `Kpis/kpis-latest.json`, `Kpis/kpis-history.json` (append) e `Kpis/kpis-history.md` (append) no mesmo PR; `Kpis/index.html`
  hidrata dos JSON — **nenhuma** dimensão nova (não se toca `app.js`/`index.html`/`styles.css`).
- `frontend_smoke_tests`: **reexecução real** (`npm --prefix frontend run test:smoke`, TAP `# tests/# pass` colado no
  history), nunca copiado do `1202/1202`. Esperado `1218/1218` (1202 + 16) se nenhum teste existente for removido — o número
  final é o medido.
- `backend_tests 3052/3054` e `flutter_tests 864/864`: **carregados com nota** (§C3.3) — o PR não toca `src/`, `tests/`
  nem `mobile/` (`git diff --name-only origin/main...HEAD -- src tests mobile` vazio, colado na nota). O gerador novo vive
  em `scripts/` e é executado pela suíte **do frontend**.
- `mvp_demo`/`mvp_vendavel`: **intocados** (não move escopo; fecha um item do gate por correção).
- `blocks_completed`: 168 → **169**. `release.block`: "B-SAN3-11 (item 8 do §4.1 — dossiê rotula vistoria substituída;
  fecha P-CHK-DOSSIE-VERSAO-NA-UI)"; `pr` após `gh pr create`; `merge_commit`/`approved_head` **`null` na autoria** (§C3.5;
  backfill pós-merge pelo bloco seguinte); `status: "published_per_pr"`.
- History: 1 linha por métrica carregada; menção explícita de que o "se preciso" da linha do §5.3 foi medido como **não
  preciso** (A4/A5) e de que a trava `impound-prisma.repository.ts` não foi exercida (P-q).

---

## §10 — Junta (§C7) — quórum, composição, papéis, terreno, resiliência

- **Quórum: unanimidade de 3** (§C7.1-ter(b) e a linha do §5.3: o dossiê é **prova** do estado do veículo — a classe é
  "perda/adulteração de dado apresentado"; o §5 do PLANO_SAN3 dá unanimidade a todo bloco fora dos quatro de maioria). A linha
  não nomeia especialistas; a composição abaixo cobre as três competências que o bloco exige — **fidelidade visual e estados
  de tela** (a mudança é de apresentação, em três pontos, um deles impresso), **enumeração fail-closed** (o guard gerado e as
  mutações) e **cadeia de acesso + §allowlist** (a aba vive sob gate duplo e a linha passa a carregar ids em atributos).
  Sem `critico-adversarial` (não é bloco de invariante financeiro).
- **Objeto:** o SHA do head da entrega com check-runs **concluídos** (`gh api repos/<owner>/<repo>/commits/<sha>/check-runs`),
  inclusive o job `frontend` (H1). Sem CI concluída, o inspetor **bloqueia** o start (§C7.1-bis).
- **Cadeiras (≤3 itens cada — P4; medir ≠ julgar onde a medição é pesada):**

| Cadeira | Identidade (nova) | Itens | Veto |
|---|---|---|---|
| C1 tela e prova impressa | `cognicao-visual` | (1) render real das três superfícies (modal, página, **impressão** via `window.print`/preview) com as fixtures A1, B1 e B3 do §0.5: a substituída sem chip verde, com "Versão substituída" e a frase certa em cada ramo; H2 (âncora no modal) medida no navegador; (2) §3/§11: literais acentuados, nenhum termo técnico, estados §7 inalterados (A12, A14); (3) T4 **vermelho-controle no head-base** reexecutado pelo jurado | sim |
| C2 enumeração e mutação | `guardiao-fail-closed` | (1) gerador rodado no head: `DESCARTADAS 0/0`, `pontos 0`, `exit 0`; **mutação nova de autoria própria** (um consumidor que não seja `DossiePrintDocument`, ou um helper de consulta noutra função — o residual (iii) do §0.4) e o que o guard faz com ela; (2) T12–T14 rodados; (3) a decisão declarada do §4 (`null` ⇒ vigente) ratificada ou devolvida com o tri-estado como alternativa | sim |
| C3 acesso, §allowlist e escopo | `coordenador-de-acessos` | (1) P-o reexecutado no catálogo (papéis com as duas permissões) e a aba/`denied` intactos (T10 + os 2 testes de integração existentes); (2) T11 + leitura: ids só em `id`/`href`, nenhum UUID/`tenant`/`work_order` como texto, impressão inclusa; (3) diff × escopo §6 (`frontend/package.json` só a linha; nada em `src/`), A15 (pendência RESOLVIDA com evidência, pendências novas do §13 com dono) e A16 (KPI reexecutado × carregado com nota) | sim |

- **Inspetor de terreno** (`inspetor-de-terreno-da-junta`, Fable) antes do voto: worktree por jurado que muta (C1 e C2 mutam
  cópias/árvores; **nunca** a árvore do dev), `npm ci` próprio por worktree (junction de `node_modules` proibida,
  §C7.1-ter(c)), `sync-agent-agents.mjs --check` verde, check-runs concluídos no objeto, inelegibilidade por nome, plano de
  perda. **Cluster Postgres:** nenhum jurado precisa de banco (os testes são de componente); o cluster 54334 deste plano fica
  de pé só para o **conferente do plano** reexecutar o Apêndice B.
- **Papéis (§C7.4-bis):** **quem acha** = as três cadeiras (identidades novas; nenhuma participou deste plano); **quem
  planeja** = este `planejador-mestre` (Fable; na revalidação pós-correção o Fable é **obrigatório**, §C7.6); **quem
  desenvolve** = desenvolvedor de identidade nova nomeado pelo orquestrador no comando do bloco, que não vota. Ciclo de
  reprovação → `omega/reprovacoes/R-B-SAN3-11-<ciclo>.md`; no ciclo 3 com `bloqueia`, auditoria da máquina antes do ciclo 4
  (`D-SEM-TETO-AUDITORIA-NO-3`).
- **Escopo do voto (§C7.1-ter(a)):** `dentro-do-bloco` para E1–E5 e A1–A16; `pre-existente` (não reprova, vira pendência com
  dono) para: a vigente **não vinculada** ao processo (P-e/A1 — classe de 2026-08-10, `P-CHK-DOSSIE-VERSAO-NA-UI` já a
  descrevia como "caminho para a vigente"), a ausência de tela de execução na web (`P-WEB-CHK-EXECUCOES-INEXISTENTES`,
  2026-09-11), a ordem indefinida do repositório (B1b), o caminho errado do `CLAUDE.md` §11 (P-i), e o ramo `demo/investidor`
  (2026-08-29) — com a evidência de data acima (`f4ef511` é a raiz).
- **P1–P6:** evidência incremental em `omega/juntas/votos/B-SAN3-11/<cadeira>-evidencia.md`; voto-arquivo-primeiro
  (`<cadeira>-voto.json`, esqueleto com cada item marcado por apurar e gravado ao ser medido); ≤2 jurados em paralelo; `00-quedas.md`; ata
  `omega/juntas/J-B-SAN3-11.md`.
- **Porteiro pós-merge** (`porteiro-pos-merge`, Fable): revalida promessa × diff, reexecuta o gerador e a contagem
  `test:smoke`, confere A15/A16 e a limpeza §C5 (sem `frontend/dist`, branch local apagada), e **libera** (ou não) o próximo
  alvo da frente 3 (`B-SAN3-06a`, §6 do PLANO_SAN3).

---

## §11 — ATOS DO DONO — o que só você faz, escrito para você ler

> **Este bloco não pede nenhum ato seu.** Não há papel de banco, secret, serviço externo, migração nem decisão de provedor.
> O item 8 fecha com o merge do PR, provado por teste e pelo guard.
>
> **Uma decisão que já é sua, com o default aplicado (§10 item 1 do `PLANO_SAN3.md`):** o item 8 é *condicional a "dossiê
> vendido como prova"*, e o default é **sim**. Este plano aplica o default — o dossiê impresso passa a rotular a vistoria
> substituída. Se você decidir **tirar** Pátios/dossiê do escopo vendável, o item 8 sai do gate, mas a correção continua
> válida (três arquivos de frontend, nenhum backend) — não há motivo para desfazê-la. Não é preciso responder para o bloco andar.
>
> **O que você vai ver depois do merge:** num processo cuja vistoria foi reaberta, a aba "Checklist do Guincho" (e o
> "salvar e imprimir") mostra a versão antiga como **"Versão substituída"**, nunca como "Concluído" em verde; se a versão
> que vale também estiver vinculada ao processo, há um link "Ver versão vigente" na mesma lista; se não estiver, a tela diz
> isso em uma frase — e é essa segunda situação que a pendência do §13 (`P-SAN3-11-VIGENTE-NAO-VINCULADA`) existe para
> fechar num bloco próprio, se você quiser que a versão vigente entre no dossiê automaticamente.

---

## §12 — Riscos e rollback

| R | Risco | Mitigação | Rollback |
|---|---|---|---|
| R1 | A vigente não está na lista (A1 — custódia aberta antes da reabertura): o operador vê "substituída" mas não vê a que vale | frase honesta (A4), sem fabricar; pendência nomeada com dono (§13); a rota MANUAL `POST …/link-checklist-run` já existe como rede de segurança (sem UI) | — |
| R2 | Âncora interna dentro do `Modal size="lg"` não rola/foca como esperado, ou é impressa como texto sublinhado | H2 medida pela C1 no navegador; fallback `onClick` + `scrollIntoView`/`focus()` sem mudar a semântica; na impressão o texto "Ver versão vigente" é inerte e inofensivo | trocar a âncora por texto puro na linha (A3 vira só a frase) |
| R3 | `origin/demo/investidor` (49 à frente) conflita em `ChecklistRunsPanel.tsx` ao rebasear | H3; a resolução é uma linha (`className` + `id` na mesma `<tr>`) e é do ramo de demo | — |
| R4 | Fixtures das duas suítes existentes não passam por `tsc` (P-p): campo novo obrigatório pode ficar faltando sem ninguém ver | as fixtures são editadas no PR (E5) e o T8 compara a linha "única" com `null` explícito; C3 lê o diff | — |
| R5 | O gerador classifica `NÃO` um remédio legítimo feito por helper noutra função (residual iii) | o remédio deste plano lê os campos **no arrow**; a C2 injeta essa forma como mutação própria e decide se o gerador precisa aprender o helper (emenda registrada) | — |
| R6 | A lista `test:smoke` é explícita: a suíte nova esquecida fora dela seria verde-cega | E5 exige a linha em `frontend/package.json`; H1 confere no log da CI o nome do arquivo | — |
| R7 | Literais novos sem acento alimentam o guard do `SAN3-21` | A14; grep na bateria | — |
| R8 | `tabIndex={-1}` em `<tr>` e `<a href="#…">` na tabela: leitores de tela anunciam links por linha | texto do link é descritivo ("Ver versão vigente"/"Ver versão anterior"); alvo ≥ 44px não se aplica (web); foco visível é o default do navegador | — |

**Rollback do PR inteiro:** `git revert` do squash — nenhuma migração, nenhum backend, nenhum objeto de banco; o dossiê
volta a mostrar a substituída como hoje (o defeito, não uma perda).

---

## §13 — O que este plano NÃO pega (pendências nomeadas, com dono)

| Pendência (a abrir no PR) | O quê | Dono proposto |
|---|---|---|
| `P-SAN3-11-VIGENTE-NAO-VINCULADA` | Custódia aberta **antes** da reabertura: a versão vigente (v2/v3) **não entra** no dossiê — o AUTO-link roda só na abertura (`impound-prisma.repository.ts:205-215`), reabrir não vincula (P-d), e a rota MANUAL não tem UI. Medido: §0.5 A1 (lista `[v1]`, v2 e v3 ausentes). Remédio fora deste bloco: o backend incluir os sucessores da cadeia na listagem (com origem `DERIVED`) **ou** o `reopenRun` propagar os vínculos da anterior — decisão de desenho para a junta do bloco dono | **proposto:** trilha CHECKLIST P1, PR-05 — hoje só `P-WEB-CHK-EXECUCOES-INEXISTENTES` tem esse dono (`pendencias.md:8477`); `P-CHK-AUTOLINK-FASE-REAL` (l.2322) e `P-IMPOUND-LINK-SEM-UNLINK` (l.2339), da mesma classe (vínculo processo↔vistoria), estão **a atribuir** (`pendencias-indice.md:240-241`; alvo em texto "PR-04c ou posterior"). Juntar as três sob o mesmo dono é decisão do orquestrador, não deste plano; fora do gate salvo decisão do dono (§11) |
| `P-SAN3-11-ORDEM-DO-REPOSITORIO-INDEFINIDA` | `listChecklistRunsForProcess` ordena por `created_at` do **vínculo**, iguais dentro da tx do AUTO-link (B1b) — a ordem que o dossiê mostra é a do adapter (`startedAt desc`). Informativa: nenhum consumidor além do frontend | `B-O6R-12` (próximo a tocar `src/modules/impound/**` na agenda) — como nota, não como bloqueio |
| (registro, não pendência) | `CLAUDE.md` §11 aponta `screen-refs/web/` e `screen-refs/mobile/`; na ref só existe `screen-refs/README.md`, que manda usar `docs/claude-code-handoff/screen-refs/` (P-i). Divergência §A2 **registrada**; o conserto é governança (`CLAUDE.md` + espelho `AGENTS.md`), fora deste bloco | orquestrador → bloco de governança |
| (registro, não pendência) | A trava `src/modules/impound/impound-prisma.repository.ts` (`SAN3-11` → `B-O6R-12`) não foi exercida: este bloco não toca o arquivo (P-q) | ata da junta |
| (já aberta — não duplicar) | `P-WEB-CHK-EXECUCOES-INEXISTENTES` (sem tela de execução na web: por isso o "link" é intra-lista), `P-CHK-RUN-DTO-NARROW`, `P-IMPOUND-CHK-VISIBILITY`, `P-CHK-RUN-ASSIGNEE-SCOPE` | `P-WEB-CHK-EXECUCOES-INEXISTENTES`: trilha CHECKLIST P1, PR-05 (`pendencias.md:8477`); `P-CHK-RUN-DTO-NARROW` (l.1821), `P-IMPOUND-CHK-VISIBILITY` (l.1736) e `P-CHK-RUN-ASSIGNEE-SCOPE` (l.1834): **dono a atribuir** (ABERTA; DTO-NARROW e ASSIGNEE-SCOPE em DIFERIDO-LEVE/BAIXA desde a triagem SAN2-1) — este bloco **não** as adota nem as fecha |

Também fora: e2e do dossiê (não existe hoje, P-m); qualquer mudança em `src/modules/impound/**` ou `src/modules/checklists/**`;
o app (o mobile não exibe o dossiê de custódia); CSS/tokens novos.

---

## §14 — Comando do bloco (para o orquestrador colar em `agent-orchestration/codex/comandos/B-SAN3-11-dossie-versao-da-vistoria.md`)

`# B-SAN3-11 — o dossiê rotula a vistoria substituída (item 8)` · **Tipo** feature (fecha item de prova do gate) · **Trilha**
frontend · **Branch** `fix/dossie-versao-da-vistoria` · **Frente** 3 (`SAN3-11` depois do `AV-REAL` na agenda do §6 do `PLANO_SAN3.md`, l.345; sem
dependência de dado) · **Objetivo** §1 · **Fontes** §0 deste plano (o DTO já emite; a UI descarta; três estados medidos) ·
**Regras** §2.2 e §4 (rótulos exatos; `null` ⇒ vigente; ids só em atributos; nada em `src/`) · **Escopo PERMITIDO/PROIBIDO**
§6 · **Passos** E1 → E2 → E3 → E4 → E5 → E6 · **Bateria** §8 · **Teste de encerramento** §7 A1–A16 com T1–T14 (T4 com
vermelho-controle no head-base) · **KPI** §9 · **Rito** §10 (inspetor → dev → junta unânime de 3 → porteiro) · **DoD** §10 do
contrato + A15 · **Atos do dono** nenhum (§11) · **Rastreabilidade**: `pr`, `merge_commit`, `approved_head`,
`J-B-SAN3-11.md`, `published_per_pr`.

---

## Apêndices

- **A** — o gerador do censo (CE-G1), verbatim, a saída completa no head `3b1fe0f9` e as duas mutações em cópia temporária.
- **B** — o script de medição no Postgres real, verbatim, e a saída completa (20 itens).
- **C** — o script dos ramos em voo que tocam a fronteira (P-l), verbatim, e a saída (D13).
- **D** — o script dos papéis que alcançam a aba (P-o, CE-G2), verbatim, e a saída (D02).

---

## Apêndice A — o gerador do censo (verbatim), a saída no head `3b1fe0f9` e as mutações

Arquivo que o desenvolvedor commita como `scripts/san3-11-dossie-vistoria-censo.mjs` (uso: `node scripts/san3-11-dossie-vistoria-censo.mjs <repo-root>`; `TS_ROOT=<repo>` quando a árvore alvo for uma cópia temporária sem `node_modules`). Dependência única: `typescript` (5.9.3), resolvido por `createRequire(<TS_ROOT>/package.json)` — na raiz do worktree (`node_modules` próprio) **ou**, na CI do job `frontend` e em T12–T14, em `frontend/` (`TS_ROOT=<frontend>`; §8, D11). md5 do fonte medido: `da2f2891f85d49a6b897de0b5e375d8e`.

```js
#!/usr/bin/env node
// B-SAN3-11 — GERADOR (CE-G1) do censo de pontos da UI do dossiê de custódia que APRESENTAM uma vistoria, e do
// espelho DTO → adapter → tipo. PROPRIEDADE (não lista de nomes): "a UI apresenta uma vistoria como vigente sem
// consultar o estado de substituição" — todo ponto que renderiza a SITUAÇÃO de uma vistoria (`.status`, ou os helpers
// getChecklistRunStatusLabel/Tone) dentro de uma função cujo corpo NÃO lê `supersededByRunId`/`currentRunId` é
// membro da lista. Default do membro não previsto = NÃO consulta (negar).
//
// Camadas, todas GERADAS da fonte (AST do TypeScript, não regex de linha):
//   L0  chaves EMITIDAS pelo DTO do backend  ← src/modules/impound/impound.checklist-link.dto.ts (toChecklistRunSummaryListDto)
//   L1  chaves do ESPELHO do frontend        ← frontend/src/modules/patios/processes/processes.types.ts (ChecklistRunSummaryItem)
//   L2  chaves CONSUMIDAS pelo adapter       ← frontend/src/modules/patios/processes/processes.adapter.ts (adaptChecklistRun)
//   L3  pontos de APRESENTAÇÃO da situação   ← frontend/src/**/*.tsx que importam ChecklistRunSummaryItem ou ChecklistRunsPanel
//       + todo *.tsx/*.ts em frontend/src/modules/patios/processes/**; classificação por função envolvente.
//   L4  consumidores do painel (quem passa `runs`)  ← JSX <ChecklistRunsPanel runs=...>
// Uso: node san3-11-dossie-vistoria-censo.mjs <repo-root>     (sai 1 se houver ponto NÃO-CONSULTA ou chave descartada)
import { createRequire } from "node:module";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve(process.argv[2] ?? ".");
// TS_ROOT: de onde resolver o pacote `typescript` (default = o próprio repo; útil para rodar sobre uma cópia temporária)
const require = createRequire(join(process.env.TS_ROOT ?? root, "package.json"));
const ts = require("typescript");

const DTO = "src/modules/impound/impound.checklist-link.dto.ts";
const TYPES = "frontend/src/modules/patios/processes/processes.types.ts";
const ADAPTER = "frontend/src/modules/patios/processes/processes.adapter.ts";
const PROCESSES_DIR = "frontend/src/modules/patios/processes";
const FRONTEND_SRC = "frontend/src";
const STATUS_HELPERS = new Set(["getChecklistRunStatusLabel", "getChecklistRunStatusTone"]);
const VERSION_FIELDS = new Set(["supersededByRunId", "currentRunId"]);

function parse(rel) {
  const text = readFileSync(join(root, rel), "utf8");
  return ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, rel.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
}
function walk(node, fn) { fn(node); ts.forEachChild(node, (c) => walk(c, fn)); }
function line(sf, node) { return sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1; }
function listFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) listFiles(p, acc); else if (/\.(ts|tsx)$/.test(name) && !/\.d\.ts$/.test(name)) acc.push(p);
  }
  return acc;
}

// L0 — chaves emitidas pelo DTO: o object literal devolvido pela arrow dentro de `runs.map(...)` em toChecklistRunSummaryListDto
function dtoKeys() {
  const sf = parse(DTO); const keys = [];
  walk(sf, (n) => {
    if (ts.isFunctionDeclaration(n) && n.name?.text === "toChecklistRunSummaryListDto") {
      walk(n, (m) => {
        if (ts.isCallExpression(m) && ts.isPropertyAccessExpression(m.expression) && m.expression.name.text === "map") {
          const arrow = m.arguments[0];
          if (arrow && ts.isArrowFunction(arrow)) {
            let body = arrow.body; if (ts.isParenthesizedExpression(body)) body = body.expression;
            if (ts.isObjectLiteralExpression(body)) for (const p of body.properties) if (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) keys.push(p.name.getText(sf));
          }
        }
      });
    }
  });
  return keys;
}
// L1 — membros do tipo espelho
function mirrorKeys() {
  const sf = parse(TYPES); const keys = [];
  walk(sf, (n) => { if (ts.isTypeAliasDeclaration(n) && n.name.text === "ChecklistRunSummaryItem" && ts.isTypeLiteralNode(n.type)) for (const m of n.type.members) if (ts.isPropertySignature(m)) keys.push(m.name.getText(sf)); });
  return keys;
}
// L2 — chaves do objeto devolvido por adaptChecklistRun
function adapterKeys() {
  const sf = parse(ADAPTER); const keys = [];
  walk(sf, (n) => {
    if (ts.isFunctionDeclaration(n) && n.name?.text === "adaptChecklistRun") walk(n, (m) => {
      if (ts.isReturnStatement(m) && m.expression && ts.isObjectLiteralExpression(m.expression)) for (const p of m.expression.properties) if (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) keys.push(p.name.getText(sf));
    });
  });
  return keys;
}
// L3/L4 — pontos de apresentação e consumidores
function importsAny(sf, names) {
  let hit = false;
  walk(sf, (n) => { if (ts.isImportDeclaration(n) && n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings)) for (const e of n.importClause.namedBindings.elements) if (names.has(e.name.text)) hit = true; });
  return hit;
}
function enclosingFunction(node) { let p = node.parent; while (p && !(ts.isArrowFunction(p) || ts.isFunctionExpression(p) || ts.isFunctionDeclaration(p) || ts.isMethodDeclaration(p))) p = p.parent; return p; }
function functionReads(fn, fields) { let hit = false; if (!fn) return false; walk(fn, (n) => { if (ts.isPropertyAccessExpression(n) && fields.has(n.name.text)) hit = true; if (ts.isIdentifier(n) && fields.has(n.text) && ts.isBindingElement(n.parent)) hit = true; }); return hit; }
function censo() {
  const files = new Set(listFiles(join(root, PROCESSES_DIR)).map((p) => relative(root, p)));
  for (const p of listFiles(join(root, FRONTEND_SRC))) { const rel = relative(root, p); if (files.has(rel)) continue; const sf = parse(rel); if (importsAny(sf, new Set(["ChecklistRunSummaryItem", "ChecklistRunsPanel"]))) files.add(rel); }
  const sites = []; const consumers = [];
  for (const rel of [...files].sort()) {
    const sf = parse(rel);
    walk(sf, (n) => {
      // ponto de apresentação: `x.status` de um parâmetro de função, ou chamada aos helpers de situação, DENTRO de JSX
      let isStatusRead = false;
      if (ts.isPropertyAccessExpression(n) && n.name.text === "status" && ts.isIdentifier(n.expression) && rel.endsWith(".tsx")) isStatusRead = true;
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && STATUS_HELPERS.has(n.expression.text) && rel.endsWith(".tsx")) isStatusRead = true;
      if (isStatusRead) {
        let inJsx = false; for (let p = n.parent; p; p = p.parent) if (ts.isJsxElement(p) || ts.isJsxSelfClosingElement(p) || ts.isJsxExpression(p)) { inJsx = true; break; }
        if (!inJsx) return;
        const fn = enclosingFunction(n);
        // só vistorias: o receptor precisa ser parâmetro/variável tipada ou nomeada como run/checklist (evita process.status da custódia)
        const recv = ts.isPropertyAccessExpression(n) ? n.expression.text : (n.arguments[0] && ts.isPropertyAccessExpression(n.arguments[0]) && ts.isIdentifier(n.arguments[0].expression) ? n.arguments[0].expression.text : "?");
        if (!/run|checklist/i.test(recv)) return;
        const ln = line(sf, n); const key = `${rel}:${ln}`;
        if (sites.some((s) => s.key === key)) return; // um ponto por linha (nós aninhados da mesma expressão)
        sites.push({ key, file: rel, line: ln, receptor: recv, expr: n.getText(sf).slice(0, 60), consulta: functionReads(fn, VERSION_FIELDS) ? "sim" : "NÃO" });
      }
      if ((ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) && n.tagName.getText(sf) === "ChecklistRunsPanel") {
        const runsAttr = n.attributes.properties.find((a) => ts.isJsxAttribute(a) && a.name.getText(sf) === "runs");
        consumers.push({ file: rel, line: line(sf, n), runs: runsAttr ? runsAttr.initializer.getText(sf).slice(0, 40) : "(sem runs)" });
      }
    });
  }
  return { files: [...files].sort(), sites, consumers };
}

const emitted = dtoKeys(), mirror = mirrorKeys(), consumed = adapterKeys();
const dropMirror = emitted.filter((k) => !mirror.includes(k)), dropAdapter = emitted.filter((k) => !consumed.includes(k));
const { files, sites, consumers } = censo();
console.log(`# L0 DTO emite (${emitted.length}): ${emitted.join(", ")}`);
console.log(`# L1 espelho ChecklistRunSummaryItem (${mirror.length}): ${mirror.join(", ")}`);
console.log(`# L2 adapter consome (${consumed.length}): ${consumed.join(", ")}`);
console.log(`# DESCARTADAS pelo espelho (${dropMirror.length}): ${dropMirror.join(", ") || "∅"}`);
console.log(`# DESCARTADAS pelo adapter (${dropAdapter.length}): ${dropAdapter.join(", ") || "∅"}`);
console.log(`# L3 arquivos varridos (${files.length}): ${files.join(" · ")}`);
console.log(`# L3 pontos de apresentação da situação de uma vistoria (${sites.length}):`);
for (const s of sites) console.log(`${s.file}:${s.line} | receptor=${s.receptor} | ${s.expr} | consulta substituição: ${s.consulta}`);
console.log(`# L4 consumidores do painel (${consumers.length}):`);
for (const c of consumers) console.log(`${c.file}:${c.line} | runs=${c.runs}`);
const naoConsulta = sites.filter((s) => s.consulta !== "sim");
console.log(`# VEREDITO: descartadas=${dropMirror.length + dropAdapter.length} · pontos sem consulta=${naoConsulta.length}`);
process.exitCode = dropMirror.length + dropAdapter.length + naoConsulta.length === 0 ? 0 : 1;
```

**Saída completa no head `3b1fe0f9`** (`node <gerador> .` a partir de `/home/user/w-b-san3-11`; exit=1):

```
# L0 DTO emite (12): id, templateId, templateName, templateVersion, status, relatedEntityType, relatedEntityId, startedAt, completedAt, reopenedFromRunId, supersededByRunId, currentRunId
# L1 espelho ChecklistRunSummaryItem (9): id, templateId, templateName, templateVersion, status, relatedEntityType, relatedEntityId, startedAt, completedAt
# L2 adapter consome (9): id, templateId, templateName, templateVersion, status, relatedEntityType, relatedEntityId, startedAt, completedAt
# DESCARTADAS pelo espelho (3): reopenedFromRunId, supersededByRunId, currentRunId
# DESCARTADAS pelo adapter (3): reopenedFromRunId, supersededByRunId, currentRunId
# L3 arquivos varridos (26): frontend/src/modules/patios/processes/components/ChecklistRunsPanel.tsx · frontend/src/modules/patios/processes/components/CustodyHistoryPanel.tsx · frontend/src/modules/patios/processes/components/DossiePrintDocument.tsx · frontend/src/modules/patios/processes/components/InspectionSection.tsx · frontend/src/modules/patios/processes/components/IntegritySeal.tsx · frontend/src/modules/patios/processes/components/NovoProcessoModal.tsx · frontend/src/modules/patios/processes/components/OccupancyMap.tsx · frontend/src/modules/patios/processes/components/ProcessIdentityCard.tsx · frontend/src/modules/patios/processes/components/ProcessPickerModal.tsx · frontend/src/modules/patios/processes/components/ProcessStatusChip.tsx · frontend/src/modules/patios/processes/components/ProcessTimeline.tsx · frontend/src/modules/patios/processes/components/SpotPickerModal.tsx · frontend/src/modules/patios/processes/components/TransicaoFsmPanel.tsx · frontend/src/modules/patios/processes/components/VacateSpotModal.tsx · frontend/src/modules/patios/processes/components/VehicleDossieModal.tsx · frontend/src/modules/patios/processes/dossieDeepLink.ts · frontend/src/modules/patios/processes/fsm.ts · frontend/src/modules/patios/processes/pages/ProcessoDossiePage.tsx · frontend/src/modules/patios/processes/pages/ProcessosPage.tsx · frontend/src/modules/patios/processes/processes.adapter.ts · frontend/src/modules/patios/processes/processes.service.ts · frontend/src/modules/patios/processes/processes.types.ts · frontend/src/modules/patios/processes/useCustodyHistory.ts · frontend/src/modules/patios/processes/useProcessChecklistRuns.ts · frontend/src/modules/patios/processes/useProcessDossie.ts · frontend/src/modules/patios/processes/useProcesses.ts
# L3 pontos de apresentação da situação de uma vistoria (1):
frontend/src/modules/patios/processes/components/ChecklistRunsPanel.tsx:89 | receptor=run | getChecklistRunStatusTone(run.status) | consulta substituição: NÃO
# L4 consumidores do painel (3):
frontend/src/modules/patios/processes/components/DossiePrintDocument.tsx:95 | runs={checklistRuns}
frontend/src/modules/patios/processes/components/VehicleDossieModal.tsx:233 | runs={checklistRuns}
frontend/src/modules/patios/processes/pages/ProcessoDossiePage.tsx:142 | runs={checklistRuns}
# VEREDITO: descartadas=6 · pontos sem consulta=1
```

**Mutação 1** (cópia temporária; `DossiePrintDocument.tsx` ganha `{checklistRuns.map((run) => <Chip key={run.id}>{run.status}</Chip>)}` antes do `CustodyHistoryPanel`): L3 passa a **2** — `frontend/src/modules/patios/processes/components/DossiePrintDocument.tsx:98 | receptor=run | run.status | consulta substituição: NÃO`; `VEREDITO: descartadas=6 · pontos sem consulta=2`; exit=1.

**Mutação 2** (mesma cópia; a `<tr>` do painel ganha `data-superseded={(run as { supersededByRunId?: string }).supersededByRunId ? "1" : "0"}`): o ponto `ChecklistRunsPanel.tsx:89` vira **`consulta substituição: sim`**; `VEREDITO: descartadas=6 · pontos sem consulta=1` (só o injetado da mutação 1). Cópia removida (`rm -rf`); `git status --porcelain` do worktree → só este plano.

---

## Apêndice B — o script de medição no Postgres real (verbatim) e a saída completa

Executado da raiz do worktree: `DATABASE_URL=postgresql://postgres@127.0.0.1:54334/erp_b_san3_11?schema=public npx tsx <scratchpad>/medir-dossie.ts` (`REPO_ROOT` default `/home/user/w-b-san3-11`; resolve `@prisma/*` pelo `package.json` do repo). md5 medido: `692da5f15ca2e675729a39c368f03aca`. Não é entrega do bloco (nenhum teste `-db` novo: o remédio é de componente); serve ao conferente do plano e à cadeira C2 se quiser reexecutar.

```ts
// B-SAN3-11 — MEDIÇÃO no Postgres real: o que o backend devolve ao dossiê quando a vistoria vinculada foi
// substituída, e o que o adapter do frontend faz com isso. Importa as classes REAIS do head (repositório Prisma
// com RLS, DTO, sweep de abertura de custódia com AUTO-link) e o adapter REAL do frontend.
// Uso (da raiz do worktree): DATABASE_URL=postgresql://postgres@127.0.0.1:54334/erp_b_san3_11?schema=public npx tsx <este arquivo>
// Semente escopada a UMA organização, apagada no fim (teardown = o do tests/impound-checklist-link-autolink.test.ts).
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";

const ROOT = process.env.REPO_ROOT ?? "/home/user/w-b-san3-11";
const connection = process.env.DATABASE_URL;
if (!connection) throw new Error("DATABASE_URL ausente");

type Row = Record<string, unknown>;
const out: Array<{ id: string; item: string; esperado: string; medido: string; ok: boolean }> = [];
function rec(id: string, item: string, esperado: unknown, medido: unknown) {
  const e = typeof esperado === "string" ? esperado : JSON.stringify(esperado);
  const m = typeof medido === "string" ? medido : JSON.stringify(medido);
  out.push({ id, item, esperado: e, medido: m, ok: e === m });
}
function uniq() { return `${Date.now()}-${Math.random().toString(16).slice(2)}`; }

async function main() {
  const require = createRequire(`${ROOT}/package.json`);
  const { PrismaPg } = require("@prisma/adapter-pg");
  const { PrismaClient } = require("@prisma/client");
  const { withTenantRls } = await import(`${ROOT}/src/database/rls.ts`);
  const { RlsPrismaImpoundRepository } = await import(`${ROOT}/src/modules/impound/impound-prisma.repository.ts`);
  const { ImpoundService } = await import(`${ROOT}/src/modules/impound/impound.service.ts`);
  const { reconcileTenantRemovals } = await import(`${ROOT}/src/modules/impound/impound.reconcile.service.ts`);
  const { RlsPrismaImpoundChecklistLinkRepository } = await import(`${ROOT}/src/modules/impound/impound.checklist-link-prisma.repository.ts`);
  const { toChecklistRunSummaryListDto } = await import(`${ROOT}/src/modules/impound/impound.checklist-link.dto.ts`);
  const { adaptChecklistRunsResponse } = await import(`${ROOT}/frontend/src/modules/patios/processes/processes.adapter.ts`);

  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  const service = new ImpoundService(new RlsPrismaImpoundRepository(client));
  const linkRepo = new RlsPrismaImpoundChecklistLinkRepository(client);
  const suffix = uniq();
  const tenant = await client.tenant.create({ data: { name: `SAN3-11 ${suffix}`, slug: `san3-11-${suffix}` } });
  const tenantId = tenant.id;
  const rls = <T,>(work: (tx: any) => Promise<T>) => withTenantRls(client, tenantId, work);

  try {
    const profileId = await rls(async (tx) => (await tx.$queryRaw<Row[]>`INSERT INTO jurisdiction_profiles (tenant_id, name, scope) VALUES (${tenantId}::uuid, ${`Perfil ${suffix}`}, 'PUBLIC_AGREEMENT') RETURNING id`)[0].id as string);
    const catalogId = await rls(async (tx) => (await tx.$queryRaw<Row[]>`INSERT INTO service_catalog (tenant_id, name, service_type, custody_profile_id) VALUES (${tenantId}::uuid, ${`Remoção ${suffix}`}, 'reboque', ${profileId}::uuid) RETURNING id`)[0].id as string);
    const templateId = await rls(async (tx) => (await tx.$queryRaw<Row[]>`INSERT INTO checklist_templates (tenant_id, name, type, status, version, schema) VALUES (${tenantId}::uuid, ${"Vistoria de recolhimento"}, 'towing_collection', 'published', 1, '{}'::jsonb) RETURNING id`)[0].id as string);
    const newWo = (code: string, plate: string) => rls(async (tx) => (await tx.$queryRaw<Row[]>`INSERT INTO work_orders (tenant_id, code, title, status, completed_at, service_catalog_id, service_details) VALUES (${tenantId}::uuid, ${code}, 'Remoção', 'completed', ${new Date()}, ${catalogId}::uuid, ${JSON.stringify({ plate })}::jsonb) RETURNING id`)[0].id as string);
    const newRun = (woId: string, status: string, startedAt: string, reopenedFrom: string | null, reason: string | null) => rls(async (tx) => (await tx.$queryRaw<Row[]>`INSERT INTO checklist_runs (tenant_id, template_id, template_version, related_entity_type, related_entity_id, status, started_at, completed_at, reopened_from_run_id, reopen_reason) VALUES (${tenantId}::uuid, ${templateId}::uuid, 1, 'work_order', ${woId}, ${status}, ${new Date(startedAt)}, ${status === "in_progress" ? null : new Date(startedAt)}, ${reopenedFrom}::uuid, ${reason}) RETURNING id`)[0].id as string);
    const processOf = (woId: string) => rls(async (tx) => (await tx.$queryRaw<Row[]>`SELECT id FROM impound_processes WHERE tenant_id = ${tenantId}::uuid AND service_order_id = ${woId}::uuid`)[0]?.id as string | undefined);

    // ── Cenário A: o processo é aberto ANTES da reabertura (o AUTO-link só alcança a v1) ──
    const woA = await newWo(`WO-${suffix}-A`, "AAA1A11");
    const v1 = await newRun(woA, "completed", "2026-09-01T10:00:00.000Z", null, null);
    rec("A0", "sweep abre 1 custódia para a OS A (AUTO-link da v1 na mesma tx)", 1, await reconcileTenantRemovals(client, tenantId, service, new Date()));
    const pA = (await processOf(woA))!;
    const v2 = await newRun(woA, "completed", "2026-09-02T10:00:00.000Z", v1, "correção de avaria omitida");
    const v3 = await newRun(woA, "in_progress", "2026-09-03T10:00:00.000Z", v2, "segunda correção");
    const listA = await linkRepo.listChecklistRunsForProcess(tenantId, pA);
    rec("A1", "processo A lista SÓ a vistoria vinculada (v1) — v2 e v3 (a vigente) NÃO estão na lista", { n: 1, ids: ["v1"] }, { n: listA.length, ids: listA.map((r) => (r.id === v1 ? "v1" : r.id === v2 ? "v2" : r.id === v3 ? "v3" : "?")) });
    rec("A2", "v1: supersededByRunId = v2 (sucessor imediato) e currentRunId = v3 (fim da cadeia)", { sup: "v2", cur: "v3" }, { sup: listA[0]?.supersededByRunId === v2 ? "v2" : String(listA[0]?.supersededByRunId), cur: listA[0]?.currentRunId === v3 ? "v3" : String(listA[0]?.currentRunId) });
    rec("A3", "v1 continua com status 'completed' — o status NÃO diz que ela foi substituída", "completed", listA[0]?.status);
    const dtoA = toChecklistRunSummaryListDto(listA);
    const itemA = dtoA.items[0] as Row;
    rec("A4", "DTO (o JSON que a rota devolve em {items}): chaves emitidas", ["id","templateId","templateName","templateVersion","status","relatedEntityType","relatedEntityId","startedAt","completedAt","reopenedFromRunId","supersededByRunId","currentRunId"], Object.keys(itemA));
    rec("A5", "DTO: valores de versão da v1 (reopenedFromRunId=null, supersededByRunId=v2, currentRunId=v3), templateName resolvido", { re: null, sup: "v2", cur: "v3", nome: "Vistoria de recolhimento" }, { re: itemA.reopenedFromRunId, sup: itemA.supersededByRunId === v2 ? "v2" : itemA.supersededByRunId, cur: itemA.currentRunId === v3 ? "v3" : itemA.currentRunId, nome: itemA.templateName });
    rec("A6", "DTO não expõe tenant_id (§2.8)", false, JSON.stringify(dtoA).includes(tenantId));
    const adaptedA = adaptChecklistRunsResponse(dtoA);
    rec("A7", "ADAPTER DO FRONTEND (head): chaves do item adaptado — os 3 campos de versão são DESCARTADOS", ["id","templateId","templateName","templateVersion","status","relatedEntityType","relatedEntityId","startedAt","completedAt"], Object.keys(adaptedA[0] ?? {}));
    rec("A8", "ADAPTER: 'supersededByRunId' in item adaptado", false, "supersededByRunId" in (adaptedA[0] ?? {}));

    // ── Cenário B: o processo é aberto DEPOIS da reabertura (o AUTO-link alcança v1 E v2: mesma OS) ──
    const woB = await newWo(`WO-${suffix}-B`, "BBB2B22");
    const u1 = await newRun(woB, "completed", "2026-09-05T10:00:00.000Z", null, null);
    const u2 = await newRun(woB, "completed", "2026-09-06T10:00:00.000Z", u1, "correção");
    rec("B0", "sweep abre 1 custódia para a OS B (a de A já existe: não reabre)", 1, await reconcileTenantRemovals(client, tenantId, service, new Date()));
    const pB = (await processOf(woB))!;
    const listB = await linkRepo.listChecklistRunsForProcess(tenantId, pB);
    const tag = (id: string) => (id === u1 ? "u1" : id === u2 ? "u2" : "?");
    rec("B1", "processo B lista as DUAS (u1 substituída, u2 vigente) — CONJUNTO; a ordem do repositório é por created_at do VÍNCULO (iguais na mesma tx do AUTO-link ⇒ indefinida); quem ordena por startedAt desc é o adapter do frontend", ["u1","u2"], [...listB.map((r) => tag(r.id))].sort());
    { const ordem = listB.map((r) => tag(r.id)).join(","); rec("B1b", `ordem devolvida pelo repositório neste run (informativa, não é contrato): ${ordem}`, ordem, ordem); }
    rec("B1c", "adapter do frontend ordena por startedAt desc: u2 (06/09) antes de u1 (05/09)", ["u2","u1"], adaptChecklistRunsResponse(toChecklistRunSummaryListDto(listB)).map((r) => tag(r.id)));
    rec("B2", "u1: sup=u2, cur=u2 (um salto só); u2: sup=undefined, cur=undefined (é a vigente)", { u1: { sup: "u2", cur: "u2" }, u2: { sup: "undefined", cur: "undefined" } }, { u1: { sup: tag(listB.find((r) => r.id === u1)!.supersededByRunId ?? "?"), cur: tag(listB.find((r) => r.id === u1)!.currentRunId ?? "?") }, u2: { sup: String(listB.find((r) => r.id === u2)!.supersededByRunId), cur: String(listB.find((r) => r.id === u2)!.currentRunId) } });
    const dtoB = toChecklistRunSummaryListDto(listB);
    rec("B3", "DTO B: a VIGENTE nascida de reabertura sai com reopenedFromRunId=u1 (de onde veio) e supersededByRunId=currentRunId=null (ninguém a substituiu)", { re: "u1", sup: null, cur: null }, (({ reopenedFromRunId: re, supersededByRunId: sup, currentRunId: cur }) => ({ re: tag(re ?? "?"), sup, cur }))(dtoB.items.find((i) => i.id === u2)!));
    rec("B4", "DTO B: a substituída sai com reopenedFromRunId=null, supersededByRunId=u2, currentRunId=u2", { re: null, sup: "u2", cur: "u2" }, (({ reopenedFromRunId: re, supersededByRunId: sup, currentRunId: cur }) => ({ re, sup: tag(sup ?? "?"), cur: tag(cur ?? "?") }))(dtoB.items.find((i) => i.id === u1)!));

    // ── Invariantes do banco que o remédio da UI pressupõe ──
    const sqlstate = (e: any) => { const blob = JSON.stringify({ code: e?.code, meta: e?.meta, message: String(e?.message ?? "") }); const m = blob.match(/\b(23505|23514|23503)\b/); return m ? m[1] : blob.slice(0, 160); };
    let code = "";
    try { await newRun(woA, "in_progress", "2026-09-04T10:00:00.000Z", v1, "tentativa de 2ª reabertura da v1"); } catch (e: any) { code = sqlstate(e); }
    rec("C1", "UNIQUE (tenant_id, reopened_from_run_id): segunda reabertura da MESMA v1 é recusada — a cadeia é LINEAR, a vigente é UMA", "23505", code);
    code = "";
    try { await newRun(woA, "in_progress", "2026-09-04T10:00:00.000Z", v3, null); } catch (e: any) { code = sqlstate(e); }
    rec("C2", "CHECK biconditional: reabertura sem motivo é recusada (23514)", "23514", code);
    const chainRows = await rls(async (tx) => tx.$queryRaw<Row[]>`SELECT count(*)::int AS n FROM checklist_runs WHERE tenant_id = ${tenantId}::uuid AND reopened_from_run_id IS NOT NULL`);
    rec("C3", "linhas com reopened_from_run_id na organização (v2, v3, u2)", 3, (chainRows[0] as any).n);
  } finally {
    await client.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
      for (const t of ["custody_events","impound_process_checklist_links","impound_processes","third_party_vehicle_identity_merge_events","third_party_vehicle_identities","checklist_runs","checklist_templates","work_orders","service_catalog","jurisdiction_profiles","audit_logs"]) {
        await tx.$executeRawUnsafe(`DELETE FROM ${t} WHERE tenant_id = '${tenantId}'::uuid`);
      }
    });
    await client.tenant.deleteMany({ where: { id: tenantId } });
    const left = await client.$queryRaw<Row[]>`SELECT (SELECT count(*)::int FROM tenants WHERE slug LIKE 'san3-11-%') AS tenants, (SELECT count(*)::int FROM checklist_runs) AS runs, (SELECT count(*)::int FROM impound_process_checklist_links) AS links`;
    rec("Z", "limpeza: tenants san3-11-* / checklist_runs / links restantes", { tenants: 0, runs: 0, links: 0 }, left[0]);
    await client.$disconnect();
  }
  let bad = 0;
  console.log("| id | item | esperado | medido | ok |\n|---|---|---|---|:-:|");
  for (const r of out) { if (!r.ok) bad += 1; console.log(`| ${r.id} | ${r.item} | \`${r.esperado}\` | \`${r.medido}\` | ${r.ok ? "✓" : "✗"} |`); }
  console.log(`\n# ${out.length} itens, ${bad} fora do esperado`);
  process.exitCode = bad === 0 ? 0 : 1;
}
main().catch((e) => { console.error("FALHA:", e); process.exitCode = 2; });
```

**Saída completa** (exit=0):

```
| id | item | esperado | medido | ok |
|---|---|---|---|:-:|
| A0 | sweep abre 1 custódia para a OS A (AUTO-link da v1 na mesma tx) | `1` | `1` | ✓ |
| A1 | processo A lista SÓ a vistoria vinculada (v1) — v2 e v3 (a vigente) NÃO estão na lista | `{"n":1,"ids":["v1"]}` | `{"n":1,"ids":["v1"]}` | ✓ |
| A2 | v1: supersededByRunId = v2 (sucessor imediato) e currentRunId = v3 (fim da cadeia) | `{"sup":"v2","cur":"v3"}` | `{"sup":"v2","cur":"v3"}` | ✓ |
| A3 | v1 continua com status 'completed' — o status NÃO diz que ela foi substituída | `completed` | `completed` | ✓ |
| A4 | DTO (o JSON que a rota devolve em {items}): chaves emitidas | `["id","templateId","templateName","templateVersion","status","relatedEntityType","relatedEntityId","startedAt","completedAt","reopenedFromRunId","supersededByRunId","currentRunId"]` | `["id","templateId","templateName","templateVersion","status","relatedEntityType","relatedEntityId","startedAt","completedAt","reopenedFromRunId","supersededByRunId","currentRunId"]` | ✓ |
| A5 | DTO: valores de versão da v1 (reopenedFromRunId=null, supersededByRunId=v2, currentRunId=v3), templateName resolvido | `{"re":null,"sup":"v2","cur":"v3","nome":"Vistoria de recolhimento"}` | `{"re":null,"sup":"v2","cur":"v3","nome":"Vistoria de recolhimento"}` | ✓ |
| A6 | DTO não expõe tenant_id (§2.8) | `false` | `false` | ✓ |
| A7 | ADAPTER DO FRONTEND (head): chaves do item adaptado — os 3 campos de versão são DESCARTADOS | `["id","templateId","templateName","templateVersion","status","relatedEntityType","relatedEntityId","startedAt","completedAt"]` | `["id","templateId","templateName","templateVersion","status","relatedEntityType","relatedEntityId","startedAt","completedAt"]` | ✓ |
| A8 | ADAPTER: 'supersededByRunId' in item adaptado | `false` | `false` | ✓ |
| B0 | sweep abre 1 custódia para a OS B (a de A já existe: não reabre) | `1` | `1` | ✓ |
| B1 | processo B lista as DUAS (u1 substituída, u2 vigente) — CONJUNTO; a ordem do repositório é por created_at do VÍNCULO (iguais na mesma tx do AUTO-link ⇒ indefinida); quem ordena por startedAt desc é o adapter do frontend | `["u1","u2"]` | `["u1","u2"]` | ✓ |
| B1b | ordem devolvida pelo repositório neste run (informativa, não é contrato): u1,u2 | `u1,u2` | `u1,u2` | ✓ |
| B1c | adapter do frontend ordena por startedAt desc: u2 (06/09) antes de u1 (05/09) | `["u2","u1"]` | `["u2","u1"]` | ✓ |
| B2 | u1: sup=u2, cur=u2 (um salto só); u2: sup=undefined, cur=undefined (é a vigente) | `{"u1":{"sup":"u2","cur":"u2"},"u2":{"sup":"undefined","cur":"undefined"}}` | `{"u1":{"sup":"u2","cur":"u2"},"u2":{"sup":"undefined","cur":"undefined"}}` | ✓ |
| B3 | DTO B: a VIGENTE nascida de reabertura sai com reopenedFromRunId=u1 (de onde veio) e supersededByRunId=currentRunId=null (ninguém a substituiu) | `{"re":"u1","sup":null,"cur":null}` | `{"re":"u1","sup":null,"cur":null}` | ✓ |
| B4 | DTO B: a substituída sai com reopenedFromRunId=null, supersededByRunId=u2, currentRunId=u2 | `{"re":null,"sup":"u2","cur":"u2"}` | `{"re":null,"sup":"u2","cur":"u2"}` | ✓ |
| C1 | UNIQUE (tenant_id, reopened_from_run_id): segunda reabertura da MESMA v1 é recusada — a cadeia é LINEAR, a vigente é UMA | `23505` | `23505` | ✓ |
| C2 | CHECK biconditional: reabertura sem motivo é recusada (23514) | `23514` | `23514` | ✓ |
| C3 | linhas com reopened_from_run_id na organização (v2, v3, u2) | `3` | `3` | ✓ |
| Z | limpeza: tenants san3-11-* / checklist_runs / links restantes | `{"tenants":0,"runs":0,"links":0}` | `{"tenants":0,"runs":0,"links":0}` | ✓ |

# 20 itens, 0 fora do esperado
```

---

## Apêndice C — ramos em voo que tocam a fronteira (P-l), script verbatim e saída (D13)

Executado por esta instância: `bash ramos-em-voo.sh /home/user/w-b-san3-11` (md5 `6b839006f3d68e1155d8bd4ae8fbcbb5`; `exit=0`).
Não é entrega do bloco — serve ao inspetor de terreno para reexecutar antes da junta.

```bash
#!/usr/bin/env bash
# B-SAN3-11 — ramos remotos que tocam a fronteira do bloco (gerado, não escrito à mão)
set -u
cd "${1:-.}"
FRONTEIRA='frontend/src/modules/patios/processes/|frontend/tests/patios-dossie|src/modules/impound/|frontend/package.json'
n=0
git for-each-ref --format='%(refname:short)' refs/remotes/origin | while read -r r; do
  n=$((n+1))
  f=$(git diff --name-only "origin/main...$r" 2>/dev/null | grep -E "$FRONTEIRA")
  [ -n "$f" ] && { echo "== $r ($(git log -1 --format='%h %ad' --date=short "$r"); merge-base $(git merge-base origin/main "$r" | cut -c1-8); $(git rev-list --left-right --count "origin/main...$r" | awk '{print $2" à frente / "$1" atrás"}'))"; echo "$f"; }
done
echo "# refs varridas: $(git for-each-ref refs/remotes/origin | wc -l)"
```

**Saída** (2026-09-30, após `git fetch origin`; sem `origin/HEAD` no conjunto):

```
== origin/demo/investidor (d1fab3b 2026-08-29; merge-base 6efe5adf; 49 à frente / 34 atrás)
frontend/src/modules/patios/processes/components/ChecklistRunsPanel.tsx
frontend/src/modules/patios/processes/components/CustodyHistoryPanel.tsx
frontend/src/modules/patios/processes/components/VehicleDossieModal.tsx
frontend/src/modules/patios/processes/pages/ProcessosPage.tsx
# refs varridas: 141
```

**Controle:** `origin/demo/investidor` é o ramo sabido por leitura (`+STATIC_ROW_CLASS` em `ChecklistRunsPanel.tsx`) e aparece; a
instância anterior e o conferente contaram 140 refs com a mesma saída filtrada — o ref a mais não toca a fronteira.
**Residual:** o script só vê ramos **remotos** já buscados (`refs/remotes/origin`); PR aberto a partir de fork ou branch local
não empurrada não aparece — o inspetor confere `gh pr list --state open` quando houver `gh` (ausente nesta máquina, §0.2).

---

## Apêndice D — papéis que alcançam a aba de vistorias (P-o, CE-G2), script verbatim e saída (D02)

Executado por esta instância da raiz do worktree: `npx tsx papeis-com-as-duas.mts` (md5 `57671f2979d477ca8272226badc85d05`;
`exit=0`). Lê o mapa **real** `ROLE_PERMISSIONS` do head — não uma lista escrita à mão.

```ts
// B-SAN3-11 — papéis que alcançam a aba de vistorias do dossiê: GERADO do mapa ROLE_PERMISSIONS do catálogo
// (rota: impound:read ∧ checklist_runs:read). Uso (raiz do worktree em origin/main): npx tsx <este arquivo>
const { ROLE_PERMISSIONS } = await import(`${process.env.REPO_ROOT ?? "/home/user/w-b-san3-11"}/src/modules/core-saas/permissions/catalog.ts`);
const both: string[] = [], onlyImp: string[] = [], onlyChk: string[] = [], none: string[] = [];
for (const [role, perms] of Object.entries(ROLE_PERMISSIONS as Record<string, readonly string[]>)) {
  const i = perms.includes("impound:read"), c = perms.includes("checklist_runs:read");
  if (i && c) both.push(role); else if (i) onlyImp.push(role); else if (c) onlyChk.push(role); else none.push(role);
}
console.log(`ambas (${both.length}): ${both.join(", ")}`);
console.log(`só impound:read (${onlyImp.length}): ${onlyImp.join(", ")}`);
console.log(`só checklist_runs:read (${onlyChk.length}): ${onlyChk.join(", ")}`);
console.log(`nenhuma (${none.length}): ${none.join(", ") || "∅"}`);
```

**Saída:**

```
ambas (9): super_admin, tenant_admin, manager, technician, viewer, platform_admin, operator, field_technician, auditor
só impound:read (1): field_dispatcher
só checklist_runs:read (3): finance, inventory, support
nenhuma (0): ∅
```

**Controle:** `field_dispatcher` (sabido por leitura: só `impound:read`, `catalog.ts:646`) cai no grupo certo; `platform_admin`
entra em "ambas" porque `platform_admin: PERMISSION_CATALOG` (l.729) — o catálogo inteiro. **Residual:** o script enumera o
catálogo estático; herança em runtime (`tenant_roles` múltiplos) e o `X-Tenant-Id` não entram — o backend continua sendo a
autoridade (guarda dupla da rota, P-c).

---

## §15 — ERRATA 1 (2026-10-02) — o baseline da bateria do bloco é vermelho na máquina da junta: T13/T14 dependem do relógio e do EOL do checkout

**Autoria:** `planejador-mestre`, identidade `planejador-errata1-b-san3-11`, **Fable** (por contrato, sem substituição), mandato
`00-mandatos/planejador-errata1.md` (md5 EOL-neutro `776045d90b81082597ff039dabc4677e`, versionado em `12adb603`). Esta identidade não
escreveu o plano (§0–§14, `efc456e4`), não desenvolve e não vota.

**Origem:** parecer **BLOQUEADO** do `inspetor-de-terreno-da-junta` da junta 1 (`00-inspetor-terreno.md`, VEREDITO 15:15Z), fundamento
único §4.2: `npm --prefix frontend run test:smoke` = **1216/1218** no head `5f6aaf56`, na máquina onde as três cadeiras medem (Windows 11,
`core.autocrlf=true`, sem `.gitattributes`), com os dois vermelhos sendo **T13 e T14 do próprio bloco**; CI Linux verde no mesmo SHA. O
orquestrador escolheu a **via V2** do parecer: correção antes da junta, com papéis separados (§C7.4-bis) — quem achou = o inspetor;
quem planeja = esta errata; quem desenvolve = identidade nova (§15.11).

**Natureza:** reprovação **de terreno**, não de junta — **não abre** `omega/reprovacoes/R-B-SAN3-11-*`; o ciclo 1 continua; esta errata
é a seção 15 do plano, não um plano novo. O objeto medido foi `5f6aaf56`; `12adb603` (head do ramo ao escrever) só acrescenta registro
(`git diff --name-only 5f6aaf56 12adb603` → 3 arquivos em `omega/juntas/votos/B-SAN3-11/**`).

### 15.1 O que foi re-medido (não herdado), por execução própria

Cada item da tabela foi **medido por** esta instância, com o comando colado (coluna 2) e a saída resumida (coluna 3); nada abaixo é
herdado do parecer do inspetor — M3 é a linha dele, citada como relatório de quem achou, e as demais são a re-medição.
Terreno: worktrees detached próprios `C:/Users/AMP/w-pl11` (CRLF, `autocrlf=true`) e `C:/Users/AMP/w-pl11lf` (`git -c core.autocrlf=false
worktree add`, CR em disco = 0), ambos em `5f6aaf56`, `npm ci` próprio em `frontend/` (sem junction), Node v20.19.5 (`C:\nvm4w\nodejs\node.exe`,
o mesmo `process.execPath` do runner). Tudo com `timeout` externo e `ec` por variável; removidos ao fim com 0 processo vivo.

| Medição | Comando | Resultado |
|---|---|---|
| M1 arquivo isolado, **CRLF**, arnês do head | `cd frontend && node --test --import tsx tests/patios-dossie-versao.smoke.test.tsx` | `16 tests · 15 pass · 1 fail` — **T13 verde em 10,8 s**; **T14 vermelha em 13,8 s na 1ª asserção** (`mutação 2 deve deixar gerador vermelho`: gerador saiu 0 porque a cópia **não mutou**) |
| M2 arquivo isolado, **LF**, arnês do head | idem, em `w-pl11lf` | `16 tests · 16 pass` — T12 27,8 s · T13 20,4 s · T14 14,4 s |
| M3 inspetor (CRLF, 12:04–12:18Z) | idem + sondador dele | T13 e T14 mortas aos 32–33 s por `SIGTERM`/`ETIMEDOUT` (2/2 + sondador) |
| M4 gerador sobre cópia `fs.cpSync` (como T13/T14), teto 180 s, **2× na mesma cópia** | sondador `pl11-probe-a.mjs` | cpSync 1,4 s · **1ª leitura 14,4 s** · **2ª leitura 3,2 s** |
| M5 idem, teto 30 s (o do teste), e repetição | idem | 11,8 s (status 0) · 13,4 s (status 0) |
| M6 gerador sobre cópia `cp -r` (MSYS) · sobre a árvore real (= T12) | idem | **3,8 s · 3,0 s** |
| M7 prova de string da regex de T14 no adapter **em disco CRLF** (583 CR) | `node -e` com contagem de `supersededByRunId` antes/depois | regex do head `/\s*supersededByRunId:.*\n/`: **2 → 2 (não aplica)**; normalizando CRLF→LF antes: 2 → 0; regex `[^\r\n]*\r?\n`: 2 → 0; no blob LF: 2 → 0 |
| M8 mutação primária de T13 | `grep -n 'ChecklistRunsPanel' DossiePrintDocument.tsx` | l.95 usa **`runs={checklistRuns}`** — `replace("checklistRuns={checklistRuns}", …)` **nunca aplica**; T13 sempre cai no fallback, gravado sem prova |
| M9 prescrição desta errata (§15.3) em **CRLF** e em **LF** | sondador `pl11-probe-prescricao.mjs` | T13' exit 1 / `pontos sem consulta=1`; T14' exit 1 / `DESCARTADAS pelo adapter (1)` — **nos dois checkouts**; vermelhos-controle: VC1 (regex do head sem normalizar) **lança "mutação não aplicou" em CRLF** e aplica em LF; VC2 (teto de 1 ms) → arnês do head devolve `exitCode 1` de um `status null`, o prescrito **lança "gerador morto por sinal SIGTERM"** |
| M10 tempo bruto sob contenção | M9 | T13' **31,2 s** (CRLF), T14' **36,8 s** (LF) — com o teto do head, ambas teriam morrido |
| M11 classe, por script | `san3-11-errata1-varredura.mjs . 5b6e1036` (§15.7) | `MUT=5 · EOL=2 · CP=1 · TETO=1 · NULL=1 · WRITE=5` — 1 arnês de processo filho (teto + `status ?? 1`), 3 mutações de fonte (1 morta, 2 vivas, **0 com prova**), tudo em `patios-dossie-versao.smoke.test.tsx` |
| M12 KPI | `git show {5b6e1036,5f6aaf56,origin/main}:Kpis/kpis-latest.json` | merge-base `168 · 1202 · version B-GOV-SEM-TETO · release.pr 394`; head `169 · 1218 (executado) · B-GOV-SEM-TETO · 394`; **`origin/main` (4ab9d232) `169 · 1202 carregado · B-GOV-PAUSA · 397`**; `frontend/` na main desde o merge-base: 0 arquivos |

### 15.2 Diagnóstico — como PROPRIEDADE, não como instância

**P-A — "Nenhum teste do bloco converte morte por tempo ou por sinal em código de saída, nem depende do relógio da máquina para dar
verde."** Violada em `runCenso` (l.263-270): `spawnSync(..., { timeout: 30000 })` + `exitCode: result.status ?? 1`, com `result.error` e
`result.signal` nunca lidos. Mecanismo medido: a **primeira leitura** de arquivos recém-escritos por `fs.cpSync` custa +9 a +24 s nesta
máquina conforme a carga (M4: 14,4 s → 3,2 s na 2ª leitura; M6: 3–4 s em cópia `cp -r` ou na árvore real; M3/M10: 27–37 s sob carga);
o teto de 30 s transforma carga de máquina em cor de teste (verde em M1/M2, vermelho em M3) e `?? 1` faz a 1ª asserção de T13/T14 passar
pelo motivo errado. O gerador **não é o defeito** (M6) — a hipótese de mecanismo (varredura on-access na primeira abertura) fica em
aberto e não é necessária: a propriedade se conserta no arnês, sem depender dele. Vale em qualquer EOL (M10 em LF).

**P-B — "Toda mutação de texto-fonte executada por um teste aplica em qualquer fim de linha de checkout e PROVA que aplicou antes de o
gerador correr."** Violada em T14 (l.319: `.` não casa `\r`, `\n` não vem logo após — M7) e em T13 (l.291 primária morta — M8; l.297
fallback gravado sem prova). Classe já registrada nesta casa ("mutação exige âncora em CRLF"). Em LF a regex aplica (M2, M7-B3): por isso
a CI é verde e a máquina da junta não.

### 15.3 Entregas da errata (E6–E8) — e a forma de referência, medida (M9)

**E6 — arnês `runCenso` fail-closed, sem teto** (único ponto de processo filho do bloco, M11). Forma de referência (a que M9 executou;
o dev pode renomear, não pode afrouxar as três propriedades: sem `timeout`; `error` lança; `status === null` lança com o sinal nomeado):
```ts
function runCenso(root: string, env?: Record<string, string>): { exitCode: number; stdout: string } {
  const result = spawnSync(process.execPath, [CENSO_SCRIPT, root], {
    env: { ...process.env, TS_ROOT: FRONTEND_ROOT, ...env },
    encoding: "utf8",
    // SEM teto (ERRATA 1, §15.2 P-A): o relógio não é veredito. O tempo é do runner/CI, de fora, e uma morte lá aparece como morte.
  });
  if (result.error) throw new Error(`gerador não executou: ${result.error.message}`);
  if (result.status === null) throw new Error(`gerador morto por sinal ${result.signal} — não é veredito (ERRATA 1)`);
  return { exitCode: result.status, stdout: result.stdout ?? "" };
}
```
**E7 — helper `mutate(path, fn)` normalizado com prova, usado por T13 e T14** (os 3 pontos `MUT` de fonte, M11). T13 passa a ter **uma**
mutação — a do fallback, porque o atributo real é `runs=` (M8); a primária morta sai. T14 mantém a sua regex, agora sobre texto LF.
```ts
function mutate(path: string, fn: (src: string) => string): void {
  const original = readFileSync(path, "utf8").replace(/\r\n/g, "\n"); // qualquer EOL de checkout → LF (ERRATA 1, P-B)
  const mutated = fn(original);
  if (mutated === original) throw new Error(`mutação não aplicou em ${path} (ERRATA 1)`);
  writeFileSync(path, mutated);
}
// T13: mutate(printPath, (s) => s.replace(/(<ChecklistRunsPanel[^>]*\/>)/, `$1\n{checklistRuns.map((run) => React.createElement("span", {key: run.id}, run.status))}`));
// T14: mutate(adapterPath, (s) => s.replace(/\s*supersededByRunId:.*\n/, "\n"));
```
As asserções de T12–T14 ficam como estão (`exitCode === 1` + regex no stdout); o que muda é que **não podem mais passar pelo motivo errado**.
As cópias temporárias, o `finally` com `rmSync` e `TS_ROOT=frontend` (D11) ficam como estão.

**E8 — integração da `origin/main` e recontagem do KPI** (§15.9–15.10).

**Não-entregas, com razão:** não se partilha uma cópia entre T13 e T14 (pouparia uma penalidade de primeira leitura — M4 — mas acopla
testes e alarga o diff; custo declarado em §15.12); não se mexe no gerador (M6: não é o defeito; `scripts/**` fica PROIBIDO); não se põe
`timeout-minutes` no `ci.yml` (`.github/**` é PROIBIDO no bloco; o default do GitHub, 360 min, é o teto que existe hoje).

### 15.4 Arquivos tocados (caminhos exatos) e a regra do espelho

| Arquivo | Ação | Espelho |
|---|---|---|
| `frontend/tests/patios-dossie-versao.smoke.test.tsx` | E6 (`runCenso`), E7 (`mutate`; T13 com 1 mutação; T14 via `mutate`); **nenhum** teste removido, renomeado ou acrescentado (continua 16: T1–T14 + T5b + T7b) | o próprio arquivo (T12–T14); forma de referência em §15.3 |
| `Kpis/kpis-latest.json` · `Kpis/kpis-history.json` (append) · `Kpis/kpis-history.md` (append) | E8, §15.9 | última entrada de `origin/main` (`#397`, B-GOV-PAUSA) |
| `Kpis/app.js` | **só** a linha `var FROZEN = …;` regenerada por `node scripts/kpi-freeze.mjs` (§15.5, emenda ao §6) | `cff64cec` (1 linha) |
| `agent-orchestration/omega/juntas/votos/B-SAN3-11/DEV-relatorio.md` | seção nova `## ERRATA 1 — <data>` com as saídas da bateria §15.8 (os dois terrenos, os vermelhos-controle, a varredura, o KPI) | o próprio relatório |
| `agent-orchestration/codex/log-execucao.md` · `agent-orchestration/docs/status-geral.md` | 1 linha cada (errata 1 aplicada; head novo; junta 1 re-inspecionada) | — |
| `docs/revisoes/SAN3/B-SAN3-11-plano.md` | esta §15 apensada **pelo orquestrador**, verbatim — o dev não a edita | — |

### 15.5 Escopo da correção (§C4) — PERMITIDO e PROIBIDO, e a emenda ao §6

**PERMITIDO (e nada mais):** os seis itens da tabela §15.4. **`frontend/package.json` não entra** (a lista do `test:smoke` já tem o arquivo).

**PROIBIDO:** tudo o que o §6 proíbe, **mais**: `scripts/san3-11-dossie-vistoria-censo.mjs` (M6 prova que o defeito não mora nele),
`frontend/src/**` (os três arquivos de produto do bloco inclusive — a errata é de arnês de teste), `frontend/tests/patios-dossie-checklist.smoke.test.tsx`
e `frontend/tests/patios-dossie-print.smoke.test.tsx` (M11: zero ocorrência da classe), `frontend/package.json`, `Kpis/index.html`,
`Kpis/styles.css`, `.github/**`. **Se a medição do dev provar que o defeito mora fora do PERMITIDO, ele PARA e escreve** (comando + saída
no DEV-relatorio); não corrige fora.

**Emenda ao §6 (`Kpis/app.js`):** o §6 lista `Kpis/app.js` como PROIBIDO "(nenhuma dimensão nova)". Medido: o guard
`tests/kpi-dashboard-charts.test.ts` (l.325-341) **exige** que a cópia congelada `var FROZEN` do `app.js` seja igual ao `kpis-latest.json`
("rode `node scripts/kpi-freeze.mjs` e faça commit dos dois juntos"); o head já o fez em `cff64cec` (1 linha). A intenção do §6 — nenhuma
dimensão nova, nenhum número digitado — fica; a letra é emendada: **`Kpis/app.js` é PERMITIDO exclusivamente como saída de
`node scripts/kpi-freeze.mjs`** — `git diff origin/main...HEAD -- Kpis/app.js` com **exatamente 2 linhas `[-+]var FROZEN = `** e nada
mais, e `node scripts/kpi-freeze.mjs --check` ec=0. A nota N1 do inspetor fica respondida por esta emenda; a C3 confere a forma.

### 15.6 Critérios de aceite da errata — cada um com a MUTAÇÃO que o deixa vermelho

| # | Critério (verde) | Mutação que o deixa VERMELHO | Onde |
|---|---|---|---|
| A17 | P-A: `runCenso` sem `timeout`; `result.error` e `result.status === null` **lançam** com causa nomeada; nenhum `status ?? / \|\|` | reintroduzir `timeout: 1` → T12, T13 e T14 **falham com `gerador morto por sinal SIGTERM`** (TAP: `grep -c 'morto por sinal'` = 3; `grep -c 'deve deixar gerador vermelho'` = 0 — nunca "exit 1" passando) | dev (controle), C2 |
| A18 | A varredura §15.7 no head novo dá **`TETO=0 · NULL=0 · CP=1`**, e toda linha `MUT` de fonte está dentro de um `mutate(` | voltar `status ?? 1` → `NULL=1` | dev, C3 (script) |
| A19 | P-B (EOL): em checkout **CRLF** (`autocrlf=true`, CR>0 no adapter em disco), T14 fica **vermelha pelo motivo certo** (exit 1 + `DESCARTADAS pelo adapter (1)`), e em checkout **LF** idem | remover o `.replace(/\r\n/g, "\n")` de `mutate` → em CRLF, T14 falha com **`mutação não aplicou`** (explícita, nunca verde nem "deve deixar gerador vermelho"); em LF continua verde — por isso o controle **é obrigatório em CRLF** | dev (dois terrenos), C2 |
| A20 | P-B (prova): toda mutação prova que aplicou antes do gerador | apontar a regex de T14 para `supersededByRunIdX` → `mutação não aplicou em …processes.adapter.ts` | dev (controle), C2 |
| A21 | T13 tem **uma** mutação (o fallback sobre `runs=`), com prova; a primária morta (`checklistRuns={checklistRuns}`) saiu | quebrar a regex do fallback (`<ChecklistRunsPanelX`) → `mutação não aplicou em …DossiePrintDocument.tsx`; restaurar a primária morta → `grep -c 'checklistRuns={checklistRuns}' <teste>` deixa de ser 0 | dev, C2 |
| A22 | Bateria §15.8 verde **nos dois terrenos** (CRLF e LF desta máquina) e na CI; **16/16** no arquivo; `test:smoke` N/N por execução | qualquer vermelho | dev, inspetor novo, C2 |
| A23 | KPI §15.9: `blocks_completed` = **main de agora + 1** (170 contra 4ab9d232); `frontend_smoke_tests` por TAP; `version`/`release` nomeiam **B-SAN3-11** e **`pr: 401`** com `merge_commit`/`approved_head` **null**; history n = main + 1 com a entrada do bloco por último | copiar 169; deixar `release.pr: 394`/`version: B-GOV-SEM-TETO` (o head de hoje) | dev, C3 |
| A24 | `Kpis/app.js` só via `kpi-freeze` (§15.5): diff = 2 linhas `var FROZEN`; `--check` ec=0 | editar `app.js` à mão; esquecer o freeze (`--check` ec=1) | C3 |
| A25 | Diff da errata ⊆ PERMITIDO §15.5: `git diff --name-only <head-anterior> HEAD` sem `scripts/`, `frontend/src/`, `frontend/package.json`, os dois arquivos de fixtures, `.github/` | tocar o gerador | C3 |

### 15.7 A varredura da classe — script verbatim (instrumento do dev e da junta; **não** entra no repositório)

```js
#!/usr/bin/env node
// B-SAN3-11 ERRATA 1 — varredura da CLASSE nos testes/scripts do bloco (lista GERADA, não escrita à mão).
// Uso: node san3-11-errata1-varredura.mjs <repo-root> <base-ref>
//   Enumera os arquivos do diff <base-ref>..HEAD em frontend/tests e scripts e marca, por linha:
//   MUT   = .replace( sobre texto (mutação de fonte, ou recorte de HTML — a classificação é da leitura, a lista é gerada)
//   EOL   = literal de regex que carrega \n, \r ou $ (sensível ao fim de linha do checkout)
//   CP    = chamada de processo filho
//   TETO  = teto de tempo (`timeout:`) numa chamada de processo filho
//   NULL  = `status` coalescido (`??` / `||`) — morte por sinal vira código de saída
//   WRITE = gravação de arquivo (onde a mutação precisa ter sido PROVADA antes)
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2] ?? ".";
const base = process.argv[3] ?? "origin/main";
const files = execFileSync("git", ["-C", root, "diff", "--name-only", base, "HEAD", "--", "frontend/tests", "scripts"], { encoding: "utf8" })
  .split("\n").filter(Boolean);

const PATTERNS = [
  ["MUT", /\.replace\(/],
  ["EOL", /\/(?:[^\/\\\n]|\\.)*?(?:\\n|\\r|\$)(?:[^\/\\\n]|\\.)*\/[gimsuy]*/],
  ["CP", /\b(?:spawnSync|execSync|execFileSync|spawn|exec|fork)\(/],
  ["TETO", /\btimeout\s*:/],
  ["NULL", /\bstatus\b[^;\n]*(?:\?\?|\|\|)/],
  ["WRITE", /\bwriteFileSync\(/],
];

const hits = [];
const totals = Object.fromEntries(PATTERNS.map(([k]) => [k, 0]));
for (const file of files) {
  const lines = readFileSync(join(root, file), "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const [klass, re] of PATTERNS) {
      if (re.test(line)) { hits.push(`${file}:${i + 1} | ${klass} | ${line.trim().slice(0, 110)}`); totals[klass]++; }
    }
  });
}
console.log(`# arquivos do bloco varridos (${files.length}): ${files.join(" · ")}`);
for (const h of hits) console.log(h);
console.log(`# TOTAIS: ${Object.entries(totals).map(([k, v]) => `${k}=${v}`).join(" · ")}`);
```
Saída no head `5f6aaf56` (base `5b6e1036`): `MUT=5 · EOL=2 · CP=1 · TETO=1 · NULL=1 · WRITE=5` — classificados em M11 (l.234/251 são
recorte de HTML, fora da classe; `censo.mjs:42` é `$` sobre nome de arquivo, fora da classe). **Alvo após a errata:** `TETO=0 · NULL=0 ·
CP=1`; `EOL` pode continuar 2 (a regex de T14 sobre texto normalizado e a do gerador), desde que cada `MUT` de fonte esteja dentro de
`mutate(`. (Lembrete de terreno: este script carrega barras duplas — mover por arquivo, nunca por heredoc em Bash, que as colapsa.)

### 15.8 Bateria da correção — nos DOIS terrenos, `timeout` externo, `ec` por variável

Terrenos do dev (caminhos curtos, sem junction, removidos ao fim por `git worktree remove --force` com 0 processo vivo):
`C:/Users/AMP/w-dev11` (checkout **CRLF**: `core.autocrlf=true`; conferir `tr -cd '\r' < frontend/src/modules/patios/processes/processes.adapter.ts | wc -c` > 0)
e `C:/Users/AMP/w-dev11lf` (`git -c core.autocrlf=false worktree add --detach …`; conferir `= 0`). `npm ci --no-audit --no-fund` próprio
em `frontend/` nos dois; na raiz, uma vez, `npm ci --ignore-scripts` para os guards do KPI (o `prisma generate` **não** é necessário para
eles; se rodar `npm run check` da raiz, exporte uma `DATABASE_URL` fictícia só nesse comando — armadilha medida pelo inspetor, 4.2-raiz).

Em **cada** terreno, nesta ordem:
```
npm --prefix frontend run check ; ec=$?                                                          # 0
( cd frontend && timeout 900 node --test --import tsx tests/patios-dossie-versao.smoke.test.tsx > ../tap-versao.log 2>&1 ; echo ec=$? )   # 16/16; grep -c 'morto por sinal' = 0
timeout 1800 npm --prefix frontend run test:smoke > tap-smoke.log 2>&1 ; ec=$?                  # N/N por execução (→ KPI); esperado 1218/1218
node <scratch>/san3-11-errata1-varredura.mjs . origin/main                                       # TETO=0 · NULL=0 · CP=1
# vermelhos-controle A17, A19, A20, A21 — mutações no ARQUIVO DE TESTE, em cópia de trabalho, revertidas em seguida, NUNCA commitadas:
#   cada uma: comando · TAP resumido · a mensagem exata que ficou vermelha · `git diff --stat` vazio depois de reverter
```
Na raiz, uma vez: `node scripts/kpi-freeze.mjs --check ; echo ec=$?` (0) · `node --check Kpis/app.js` · `node --test --import tsx tests/kpi-dashboard-charts.test.ts` ·
`git diff --name-only origin/main...HEAD` (⊆ §6 + §15.5) · `git diff --name-only <head-anterior> HEAD` (⊆ §15.5) · `git diff --check`.
O `timeout` externo é a única relação com o relógio: se matar, aparece como `ec=124`, nunca como veredito de teste. Tudo colado no
`DEV-relatorio.md` (seção `## ERRATA 1`), por terreno.

### 15.9 KPI (§C3) — recontagem contra a `origin/main` de AGORA, não contra o merge-base

Medido (M12): `origin/main` = `4ab9d232` → `blocks_completed 169`, `frontend_smoke_tests 1202/1202 (carregado)`, `version B-GOV-PAUSA`,
`release.pr 397`, history n=165. O head do PR contou `168 → 169` contra o merge-base `5b6e1036`. Após integrar a main (§15.10):
- `blocks_completed`: **170** (169 da main + este bloco). Se a main andar de novo antes do push, o número é **o da main de então + 1** — regra, não número.
- `frontend_smoke_tests`: **reexecução real** no head novo (TAP `# tests/# pass` colado); esperado `1218/1218` (a main não tocou `frontend/` desde
  o merge-base — 0 arquivos), mas vale o medido. A errata **não muda a contagem** (continua 16 novos: T1–T14 + T5b + T7b; T13/T14 mudam de forma, não de número).
- `backend_tests 3052/3054` e `flutter_tests 864/864`: carregados com nota (§C3.3), inalterados na main.
- `version: "B-SAN3-11"`, `release.block: "B-SAN3-11 (item 8 do §4.1 — dossiê rotula vistoria substituída; fecha P-CHK-DOSSIE-VERSAO-NA-UI)"`,
  `release.pr: 401`, `merge_commit: null`, `approved_head: null`, `status: "published_per_pr"`, `snapshot_date` do dia — **como o §9 já
  mandava** e como todo PR de bloco na main faz (precedente: #397 escreveu `B-GOV-PAUSA`/`397`). O head de hoje carrega `B-GOV-SEM-TETO`/`394`
  herdados do merge-base: a errata manda cumprir o §9; o juízo (A16) é da C3.
- `kpis-history.json`: n = **166** (165 da main + a entrada deste bloco, **por último**, depois da de `#397`); `kpis-history.md`: idem, com
  1 linha de nota: "ERRATA 1 (§15): T13/T14 re-formados (arnês sem teto, mutação normalizada com prova); contagem inalterada".
- `node scripts/kpi-freeze.mjs` → `Kpis/app.js` (1 linha) e `--check` ec=0 (§15.5).
- `mvp_demo`/`mvp_vendavel`: intocados.

### 15.10 Integração da `origin/main` — por MERGE, nunca rebase

1. `git fetch origin main` · `git merge origin/main` (**nunca** `rebase`: o ramo já tem mandatos e pareceres que citam SHAs — `12adb603`, `5f6aaf56`, `cff64cec`).
2. Conflitos esperados **só em registro** (`Kpis/kpis-latest.json`, `Kpis/kpis-history.{json,md}`, `Kpis/app.js`, `agent-orchestration/codex/log-execucao.md`,
   `agent-orchestration/controle/pendencias.md`, `agent-orchestration/docs/status-geral.md`) — a main trouxe 42 arquivos de governança (#397–#399) e **0** na
   fronteira do bloco (inspetor N7; M12). Resolução: **as duas entradas ficam**, a deste bloco depois da da main; depois, a recontagem §15.9 por cima.
   `CLAUDE.md`/`AGENTS.md` vêm da main intactos (o bloco não os toca).
3. Depois do merge, a errata (E6/E7) e a recontagem (E8) em commits próprios (`fix(test): B-SAN3-11 — ERRATA 1 …` · `fix(kpi): B-SAN3-11 — recontagem contra a main …`), Conventional Commits.
4. `git diff --check` em linha própria antes de cada commit (trava, não elo).

### 15.11 Papéis e sequência (§C7.4-bis, §C7.1-bis)

- **Quem achou:** o `inspetor-de-terreno-da-junta` da junta 1 (parecer em `12adb603`). Não planeja, não desenvolve.
- **Quem planejou:** esta errata (`planejador-errata1-b-san3-11`, Fable). Não desenvolve, não vota. Se o fluxo voltar para cá (correção
  reprovada), o Fable é obrigatório (§C7.6).
- **Quem desenvolve:** identidade **nova e local** (esta máquina — é onde o vermelho vive; a nuvem Linux não o vê), nomeada pelo orquestrador
  em `00-mandatos/dev-errata1.md`; **não** é o dev de nuvem de `dd58142f`/`cff64cec` (autor do arnês), nem o inspetor, nem o planejador,
  nem as cadeiras C1–C3. Não vota. Mandato ≤3 itens (E6+E7 · E8 · bateria/registro), P1/P2/P7 no `DEV-relatorio.md`.
- **Sequência:** dev entrega head novo → `git push` → CI nova no head (**check-runs concluídos**, inclusive `frontend`) → o orquestrador
  regenera os 4 mandatos pelo `mandato-refs.sh 401` (**HC = H0**: mandato só sobre head empurrado) → **inspetor NOVO** (identidade nova)
  re-mede o baseline nos dois terrenos (`test:smoke` N/N, o arquivo 16/16) e emite o parecer → só com `LIBERADO` a junta 1 começa. As
  cadeiras recebem no briefing: a R3 do inspetor (objeto = SHA novo; o delta contra `12adb603` nomeado arquivo a arquivo), esta §15 e a
  emenda ao §6 (§15.5).
- **Escopo do voto (§C7.1-ter(a)):** E6/E7/E8 e A17–A25 são `dentro-do-bloco`. A penalidade de primeira leitura do `cpSync` nesta máquina
  (mecanismo em aberto) é **condição de terreno**, não achado de produto — não vira pendência nem reprovação; fica registrada em M4/M6.

### 15.12 Riscos, custo declarado e rollback

- **Custo declarado:** sem teto, T13/T14 levam 12–37 s cada nesta máquina (M1/M9/M10); na CI Linux ~4–6 s (sem a penalidade). A suíte
  `test:smoke` fica ~30–60 s mais lenta no Windows. Aceito: correto e lento vence rápido e dependente de carga.
- **Risco: gerador que trava.** Sem teto no arnês, um `censo.mjs` em laço infinito segura a suíte. Mitigação: o gerador é síncrono e limitado
  pelo número de arquivos (M6: 3 s); o `timeout` externo da bateria (§15.8) e o teto do job da CI (default GitHub, 360 min) existem **de fora**
  e uma morte lá aparece como morte (`ec=124`), não como veredito. Não se põe `timeout-minutes` no `ci.yml` (fora do escopo do bloco).
- **Risco: conflito de merge mal resolvido** (entrada da main perdida). Mitigação: A23 (history n = main + 1; `release.pr 401`), C3 confere.
- **Risco: o controle A19 rodado só em LF** ("verde, logo ok"). Mitigação: A19 exige CR>0 colado no terreno do controle.
- **Rollback:** `git revert` dos commits da errata no ramo; o estado anterior é `12adb603`. Nenhuma migration, nenhum dado.

### 15.13 Registro

- `DEV-relatorio.md`: seção `## ERRATA 1 — <data UTC>` com head anterior/novo, os dois terrenos (uname/EOL/CR), as saídas §15.8, os
  vermelhos-controle A17/A19/A20/A21 (mensagem exata), a varredura (totais) e a recontagem §15.9 (antes/depois, comando).
- `log-execucao.md` e `status-geral.md`: 1 linha cada. `pendencias.md`: **nenhuma pendência nova** (a condição de terreno fica em §15.1/§15.11).
- Este arquivo de saída (`ERRATA-B-SAN3-11.md`, seções 0–9 = trilha de medição) é versionado pelo orquestrador em
  `agent-orchestration/omega/juntas/votos/B-SAN3-11/` ao lado dos mandatos; a §15 vai verbatim para o plano.

**Uma linha:** T13/T14 estavam vermelhas na máquina da junta porque o arnês fazia do relógio (teto de 30 s + `status ?? 1`) e do EOL do
checkout (regex cega a `\r`, mutação sem prova) parte do veredito; a errata tira o relógio do veredito, normaliza e prova toda mutação,
limita o diff ao arquivo de teste + KPI recontado contra a main de agora, e devolve o bloco à junta 1 pelo caminho inteiro (push → CI →
mandatos HC=H0 → inspetor novo).

---

### §15-bis — ERRATA 1-bis (2026-10-02) — A17 e A18 eram inalcançáveis pela própria forma de referência da §15.3; o critério muda, a forma fica

**Autoria:** `planejador-mestre`, identidade `planejador-errata1-b-san3-11` (a mesma da §15), **Fable** (obrigatório: o fluxo voltou ao
planejador após correção de código — §C7.6), mandato `00-mandatos/planejador-errata1bis.md` (md5 EOL-neutro `310f353fad2be576c246beeca01a59b1`,
versionado em `ff1f69b4`). **Quem achou:** o dev da errata 1 (`dev-errata1-b-san3-11`, Opus 5.5 declarado), que aplicou a §15.3 **verbatim**,
mediu, e **parou sem decidir** (`DEV-ERRATA1-401.md` §9) — a conduta certa (§C7.4-bis). **Quem desenvolve:** o mesmo dev retoma; a correção
aqui é de **critério e de registro**, não de código do arnês.

**Natureza:** continuação da errata 1 (terreno, não junta; não abre `R-*`). Os dois achados são **defeitos do planejador** — critérios que a forma
de referência, escrita por ele, não pode cumprir ("critério impossível de passar", §C7.4(a)). Nenhuma propriedade (P-A, P-B) se afrouxa.

#### 15-bis.1 Medido por esta instância (comando + saída resumida; nada herdado)

| # | Medição | Resultado |
|---|---|---|
| N1 | `spawnSync(node -e "setTimeout(…,5000)", {timeout: 200})` em Node v20.19.5 | `status null · signal SIGTERM · error.code ETIMEDOUT` — **os dois campos**; a forma §15.3 (`error` primeiro) devolve `gerador não executou: spawnSync …node.exe ETIMEDOUT`. `process.kill(self, SIGTERM)` no Windows → `status 1, signal null` (sinal sem `error` **não é produzível aqui**; o ramo `status === null` é vivo só em Linux — fica, fecha o tipo) |
| N2 | Regex `NULL` da §15.7 sobre a linha da forma `return { exitCode: result.status, stdout: result.stdout ?? "" };` | **casa** (`status, stdout: result.stdout ??`) — o `??` é do `stdout`; o instrumento reconhece forma, não propriedade |
| N3 | Regex nova `/\bstatus\s*(?:\?\?\|\|\|)/` | linha da forma → **não casa**; `result.status ?? 1` (head antigo) → casa; `status||1`, `(result.status \|\| 1)`, `x.status??1` → casa; `status, y ?? 1` → não casa. Limite declarado: coalescência indireta (`const s = result.status; s ?? 1`) não é vista — coberta por A17′ (comportamento) |
| N4 | Varredura **v2** (15-bis.7) no head do dev `46bd9fbe` | `MUT=5 · EOL=3 · CP=1 · TETO=0 · NULL=0 · WRITE=3`; EOL = `censo.mjs:42` (`$` em nome de arquivo) · `:276` normalizador `/\r\n/g` do `mutate` · `:318` regex de T14 dentro de `mutate(`. Vermelho-controle: `?? 1` restaurado → `NULL=1` |
| N5 | Controle A17 no head do dev, worktree próprio CRLF: **[a]** `timeout: 1` injetado · **[b]** [a] + os dois `throw` removidos · **[c]** [a] + `?? 1` restaurado | [a] `16 tests · 13 pass · 3 fail`, os 3 `not ok` com `code: 'ERR_TEST_FAILURE'` e `error: 'gerador não executou: … ETIMEDOUT'`; `ERR_ASSERTION`=0; `morto por sinal`=0; `deve deixar gerador vermelho`=0; `deve reportar`=0. **[b]** `ERR_ASSERTION`=**3** (`deve deixar gerador vermelho`=2, `espelho sem descarte`=1). **[c]** idêntico a [a] (o `throw` em `error` dispara antes — o `?? 1` vira código morto; só A18′ o pega) |
| N6 | `gerar-indice-pendencias.py` no head do dev | `427 cabecalhos / 416 IDs \| FECHADA 111 · ABERTA 315 · SEM-STATUS 1`; diff `273+/271−` = **253 linhas só com o número de linha deslocado · 0 de conteúdo · 2 novas (`P-SAN3-11-*`) · 0 sumidas · 7 de placar**. O `SEM-STATUS` é a **`P-CHK-DOSSIE-VERSAO-NA-UI`**: o bloco escreveu `- **status:** **RESOLVIDA em B-SAN3-11 (2026-10-01)** · …` e a regex da linha de status do gerador não atravessa o 2º `**` → a pendência que o bloco fecha (A15) sai como "sem status", nunca FECHADA |
| N7 | Mesma entrada com `- **status:** RESOLVIDA em B-SAN3-11 (2026-10-01) · branch …` (1 linha) + gerador | `427 / 416 \| FECHADA **112** · ABERTA 315 · SEM-STATUS **0** · CONTRADITÓRIAS 0`; `P-CHK-DOSSIE-VERSAO-NA-UI` em **FECHADAS**; as duas `P-SAN3-11-*` em ABERTAS (BAIXA, dono sim) |
| N8 | KPI em `3208cf13` pelo blob; `origin/main` re-buscada | `version B-SAN3-11 · blocks 170 · smoke 1218/1218 · pr 401 · merge_commit/approved_head null · history n=166 (…397, 401)`; `origin/main` **continua `4ab9d232`** → recontagem vigente |
| N9 | Ramo | `origin/fix/dossie-versao-da-vistoria` = `ff1f69b4` (+ só `00-mandatos/planejador-errata1bis.md` sobre `508240fb`); `46bd9fbe` **não descende** dele → integrar por **merge** antes do push |
| N10 | Forma commitada em `92cfc05e` (blob) | verbatim da §15.3; só o arquivo de teste (`15+/17−`); `3208cf13` só `Kpis/*`; `46bd9fbe` só `DEV-relatorio.md` (append) |

#### 15-bis.2 Decisões — por propriedade, com a mutação que deixa cada critério vermelho

**D1 → o critério muda; a forma fica.** A propriedade P-A ("morte por tempo/sinal vira exceção com a causa nomeada; nunca código de saída")
**vale** na forma (N1, N5[a]). O que estava errado era A17 cobrar a **mensagem** de um ramo que a morte por teto não alcança. A17 é
substituído por **A17′** (15-bis.6): sob teto, os três vermelhos são **exceções do arnês**, nenhum é asserção. Mutação que o deixa vermelho:
remover os dois `throw` (N5[b], `ERR_ASSERTION`=3). Não se reordena a forma nem se enriquece a mensagem: mudar código para caber num critério
errado é o anti-padrão; e o ramo `status === null` fica porque fecha o tipo (`exitCode: number`) e é o caso Linux.

**D2 → o instrumento muda; o alvo é enumerado.** A regex `NULL` passa a enunciar a propriedade — coalescência aplicada **a `status`**
(`\bstatus\s*(?:\?\?|\|\|)`), não "um `??` na mesma linha" (N2/N3). **A18′**: `TETO=0 · NULL=0 · CP=1 · EOL=3`, com os três `EOL` **nomeados**
(N4) e toda `MUT` de fonte dentro de `mutate(`. Mutação que o deixa vermelho: `?? 1` restaurado → `NULL=1` (N4). O "pode continuar 2" da §15.7
está **revogado**: o terceiro `EOL` é o normalizador — a própria correção da P-B.

**Observação do dev → dentro do escopo, E9.** O §6 do plano já permite `pendencias.md` e `pendencias-indice.md` ("se o gerador de índice o
exigir" — exige: existe na ref e o cabeçalho do índice manda regenerar); a §15.5 os omitiu. A regeneração é limpa (N6) **e** revela que a
linha de status da `P-CHK-DOSSIE-VERSAO-NA-UI`, escrita pelo commit original do bloco (`dd58142f`, 2026-10-01 — **dentro-do-bloco**, dono
`B-SAN3-11`), não é lida pelo gerador: a entrega publicaria como "sem status" a pendência que diz fechar. Conserto de 1 linha + 1 regen (N7).

#### 15-bis.3 Entrega nova — E9 (registro do próprio bloco; sem código)

1. `agent-orchestration/controle/pendencias.md`, entrada `## P-CHK-DOSSIE-VERSAO-NA-UI` (l.2244): **só** a linha de status passa a
   `- **status:** RESOLVIDA em B-SAN3-11 (2026-10-01) · branch \`fix/dossie-versao-da-vistoria\`` (sai o `**…**` interno; o resto da linha e
   os sub-itens E1–E5/Bateria/dono ficam). `git diff --numstat -- pendencias.md` = `1 1`.
2. `python agent-orchestration/controle/gerar-indice-pendencias.py` → `agent-orchestration/controle/pendencias-indice.md` regenerado;
   placar esperado `427 cabecalhos / 416 IDs | FECHADA 112 · ABERTA 315` e `SEM STATUS — 0`. Nenhuma edição manual no índice.
3. Commit próprio: `docs(registro): B-SAN3-11 — linha de status da P-CHK-DOSSIE-VERSAO-NA-UI na forma do gerador e indice regenerado (ERRATA 1-bis)`.

#### 15-bis.4 O que VALE do que o dev já commitou localmente (verificado pelo blob, N8–N10)

| Commit | Conteúdo | Veredito |
|---|---|---|
| `1654ae57` | merge da `origin/main` 4ab9d232 (7 conflitos, só registro/KPI, as duas entradas) | **vale** (§15.10 cumprido; `origin/main` não andou) |
| `92cfc05e` | E6 + E7, só `frontend/tests/patios-dossie-versao.smoke.test.tsx` | **vale, intocado** — nenhum commit novo no arquivo de teste |
| `3208cf13` | E8, recontagem contra a main de agora (170 · 1218/1218 · pr 401 · n=166) | **vale** |
| `46bd9fbe` | `DEV-relatorio.md`, seção da parada (append) | **vale** — registro não se reescreve; a seção da retomada entra depois dela |
As medições do dev em `92cfc05e` (16/16 nos dois terrenos, 1218/1218) são **dele**, mas o head final será outro (merge de N9 + E9): a bateria
da §15.8 roda **inteira no head final**, nos dois terrenos (A22) — é o que conta.

#### 15-bis.5 Ordem do que falta (o dev, sem decidir nada fora disto)

0. `git fetch origin` → `git merge origin/fix/dossie-versao-da-vistoria` (traz `ff1f69b4` e o que o orquestrador versionar com esta errata:
   §15-bis no plano + relatórios do planejador); conflitos esperados **0**; se houver, **as duas entradas**, a do ramo depois; **nunca rebase**.
   `w-dev11lf` → `git -c core.autocrlf=false checkout --detach <head>` a cada head novo (CR=0 conferido).
1. **E9** (15-bis.3) → commit.
2. Controles no **head final**, terreno CRLF (CR>0 no adapter colado), cada um por mutação em cópia de trabalho, TAP contado, restauração por
   cópia e `git diff --stat` vazio: **A17′** ([a] verde do critério **e** [b] vermelho-controle), **A19** (CRLF obrigatório; depois LF),
   **A20**, **A21**. A medição [a]/[b] já feita por esta errata (N5) não substitui a do dev no head final.
3. Bateria §15.8 **inteira**, nos dois terrenos, no head final: `check` · 16/16 · `test:smoke` N/N (TAP) · varredura **v2** → A18′ ·
   `kpi-freeze --check` · guards · listas de diff (A25 + 15-bis.8) · `git diff --check` · **A26** (gerador → `git diff --stat` vazio).
4. Se `test:smoke` der N ≠ 1218 ou a `origin/main` tiver andado: recontagem de novo pela regra (main + 1; TAP), commit `fix(kpi)`.
5. Registro: `DEV-relatorio.md` seção `## ERRATA 1 — retomada (1-bis) — <UTC>` (append, com N5-equivalentes do dev, A19–A21, A26, varredura v2,
   os dois terrenos); 1 linha em `log-execucao.md` e `status-geral.md` → commit `docs(junta)`.
6. `git merge-base --is-ancestor origin/fix/dossie-versao-da-vistoria HEAD; echo $?` → `0` → `git push origin HEAD:fix/dossie-versao-da-vistoria`
   (fast-forward; nunca `--force`). Depois: CI no head → mandatos regenerados (HC = H0) → **inspetor novo** → junta 1 (§15.11, inalterado).
7. Ao fim: 0 processo com `w-dev11` na CommandLine → `git worktree remove --force` dos dois worktrees do dev.

#### 15-bis.6 Critérios — A17′ e A18′ SUBSTITUEM A17 e A18; A26 é novo; A19–A25 ficam como na §15.6

| # | Critério (verde) | Mutação que o deixa VERMELHO | Onde |
|---|---|---|---|
| A17′ | P-A por comportamento: com a **única** mutação `timeout: 1,` nas opções do `spawnSync` de `runCenso`, o TAP tem `# fail 3` (T12, T13, T14), e **cada** `not ok` é exceção do arnês — `grep -cE "gerador (não executou\|morto por sinal)"` = **3**, `grep -c ERR_ASSERTION` = **0**, `grep -c 'deve deixar gerador vermelho'` = 0, `grep -c 'deve reportar'` = 0, `grep -c 'espelho sem descarte'` = 0 — e o arquivo restaurado (`git diff --stat` vazio) | além do teto, remover os dois `throw` de `runCenso` → `ERR_ASSERTION` = 3 (N5[b]) | dev (controle no head final), C2 |
| A18′ | Varredura **v2** (15-bis.7) no head final: `TETO=0 · NULL=0 · CP=1 · EOL=3`, os três `EOL` sendo exatamente `scripts/san3-11-dossie-vistoria-censo.mjs:42`, o normalizador `/\r\n/g` de `mutate` e a regex de T14 dentro de `mutate(`; toda `MUT` de fonte dentro de `mutate(` (as de T11, l.234/251, são recorte de HTML) | restaurar `exitCode: result.status ?? 1` → `NULL=1` (N4); ou tirar o normalizador → `EOL=2` | dev, C3 (script) |
| A26 | E9: no head final, `python agent-orchestration/controle/gerar-indice-pendencias.py` deixa `git diff --stat` **vazio**; o índice tem `SEM STATUS … — 0`, `CONTRADITORIAS … — 0`, `P-CHK-DOSSIE-VERSAO-NA-UI` sob `## FECHADAS` e as duas `P-SAN3-11-*` sob ABERTAS; `git diff --numstat origin/main...HEAD -- agent-orchestration/controle/pendencias.md` cobre a linha de status (sem o `**` interno: `grep -c 'status:\*\* \*\*RESOLVIDA' pendencias.md` = 0) | deixar o `**` interno → `SEM-STATUS 1` e a P-CHK fora de FECHADAS (N6); editar o índice à mão → regen deixa diff | dev, C3 (A15) |

#### 15-bis.7 Instrumento v2 — a única linha que muda na varredura da §15.7 (e o auto-teste)

Em `san3-11-errata1-varredura.mjs` (cópia local do dev; **não** entra no repositório), a linha
```js
  ["NULL", /\bstatus\b[^;\n]*(?:\?\?|\|\|)/],
```
passa a
```js
  ["NULL", /\bstatus\s*(?:\?\?|\|\|)/], // ERRATA 1-bis: coalescência aplicada a `status` (propriedade), não "status e um ?? na mesma linha" (forma)
```
(e o comentário do cabeçalho, `NULL = \`status\` coalescido diretamente (\`status ?? x\` / \`status \|\| x\`)`). md5 EOL-neutro do script v2
desta instância: `646b13719214cedd6cc8fbd6296364e5`. **Auto-teste antes de usar** (cola a saída no relatório):
`node -e 'const r=/\bstatus\s*(?:\?\?|\|\|)/;console.log(r.test("return { exitCode: result.status, stdout: result.stdout ?? \"\" };"), r.test("exitCode: result.status ?? 1"))'`
→ `false true`. (Lembrete da §15.7: mover o script por arquivo, nunca por heredoc em Bash.)

#### 15-bis.8 Escopo (§C4) — a emenda à §15.5

**PERMITIDO** = §15.5 **mais** `agent-orchestration/controle/pendencias.md` (**só** a linha de status da `P-CHK-DOSSIE-VERSAO-NA-UI`) e
`agent-orchestration/controle/pendencias-indice.md` (**só** como saída do gerador) — ambos já no §6 do plano. **Nada mais muda**: o arquivo de
teste fica como em `92cfc05e` (`git diff 92cfc05e HEAD -- frontend/tests/patios-dossie-versao.smoke.test.tsx` **vazio** no head final —
critério A25 ganha esta linha); `scripts/**`, `frontend/src/**`, `frontend/package.json`, `.github/**` continuam PROIBIDOS.

#### 15-bis.9 Registro e o erro do planejador, nomeado

- Esta §15-bis é apensada pelo orquestrador; o dev não a edita. O arquivo de saída do planejador (`ERRATA-1bis-B-SAN3-11.md`, trilha de medição)
  é versionado ao lado de `PLANEJADOR-errata1-relatorio.md`.
- **O que a errata 1 errou:** (1) A17 foi escrito a partir do rótulo da **sonda** (que decidia por `status === null`) e não da **forma** (que
  testa `error` primeiro) — critério tirado da réplica, não do artefato, e nunca executado contra a forma antes de publicar; (2) A18 usava um
  instrumento que reconhece forma, e o alvo `EOL` foi contado antes de a forma existir; (3) a §15.5 estreitou o escopo por omissão. Classe para
  a casa: **plano que publica forma de referência e critério sobre ela executa o critério contra a forma antes de publicar.** Pego por execução
  do executor, que parou e devolveu por escrito — a máquina funcionou como desenhada (§C7.4-bis).
- Pendências novas: **nenhuma**. A condição Windows "sinal sem `error` não é produzível" (N1) é nota de terreno, não achado.

**Uma linha:** A17 e A18 pediam o que a forma de referência não pode dar; a 1-bis troca os dois critérios por A17′ (os três vermelhos sob
teto são exceções do arnês, zero asserções — vermelho-controle: tirar os `throw`) e A18′ (instrumento que vê `status` coalescido, `EOL=3`
nomeados), mantém o código do arnês como está, traz para dentro o par `pendencias.md`/índice com a linha de status da `P-CHK-DOSSIE-VERSAO-NA-UI`
na forma que o gerador lê (E9/A26), e devolve o dev ao caminho: merge do ramo → E9 → controles → bateria nos dois terrenos → registro → push.

---

## §16 — Ciclo 2 (2026-10-03) — os links ganham afordância e deixam de navegar; ausência de chave fica do lado fechado (adapter + gerador P-L0); o gerador reconhece a vistoria pelo tipo e a consulta pela decisão (P-L3); as pendências ganham dono do plano da rodada; a `main` b404815c entra por merge

**Autoria:** `planejador-mestre`, identidade `planejador-ciclo2-b-san3-11`, **Fable** (obrigatório: retorno ao planejador após reprovação, §C7.6; sem substituição), mandato `00-mandatos/planejador-ciclo2.md` (md5 EOL-neutro `81b77e7891cc7bb653577e4ad2dbbe90`, versionado em `653532f7`). Esta identidade não escreveu §0–§15-bis, não desenvolveu, não votou. Trilha de medição (comando · saída · hora UTC de cada item): o arquivo de saída desta instância, versionado pelo orquestrador em `agent-orchestration/omega/juntas/votos/B-SAN3-11/PLANEJADOR-ciclo2-relatorio.md`.

**Origem:** `omega/reprovacoes/R-B-SAN3-11-1.md` — junta 1 **REPROVADO 0×3** sobre `defa502e` (ata `J-B-SAN3-11.md`): bloqueiam C1-01, C2-01, C2-02, C3-B1; ajustes C1-02/03/04, C3-A1/A2; notas C1-05/06, C2-03, C3-N1. **Todos re-medidos por execução própria** no head `653532f7` — código, testes e KPI byte-idênticos a `defa502e` (`git diff --name-only defa502e 653532f7 -- frontend/src frontend/tests frontend/package.json scripts src Kpis` vazio) — em dois worktrees detached desta máquina (CRLF e LF): os quatro são **defeitos reais, dentro-do-bloco** (§1 da trilha: estilo computado no Chromium; M5/M5b/M5c/M6 e M1–M4 com gerador + `tsc` + sonda de runtime; leitura das pendências × `PLANO_SAN3.md`). Nenhum pré-existente foi usado.

**Natureza:** ciclo 2 da junta (§C7.4) — não é errata de terreno. A `main` andou para `b404815c` (#404, registro) e o PR está `CONFLICTING`: **6 conflitos, todos KPI/registro, 0 em código** (`git merge-tree --write-tree --name-only origin/main 653532f7`: `Kpis/app.js`, `Kpis/kpis-history.json`, `Kpis/kpis-latest.json`, `codex/log-execucao.md`, `controle/pendencias-indice.md`, `docs/status-geral.md`).

### 16.1 Papéis (§C7.4-bis) e inelegíveis, por nome
| papel | quem |
|---|---|
| quem achou | `cognicao-visual`, `guardiao-fail-closed`, `coordenador-de-acessos` (junta 1) — não planejam, não desenvolvem, não votam |
| quem planeja | `planejador-ciclo2-b-san3-11` (Fable) — não desenvolve, não vota |
| quem desenvolve | `dev-ciclo2-b-san3-11`: identidade **nova e local** (esta máquina — os controles A19/A17′ e a medição do C1-01 só existem aqui), nomeada pelo orquestrador em `00-mandatos/dev-ciclo2-D{1,2,3}.md` (≤3 itens cada, P4: D1 código · D2 testes e controles · D3 integração, KPI e registro); não é `dev-san3-11-dossie` (nuvem, `dd58142f`) nem `dev-errata1-b-san3-11`; não vota |
| inspetor | `inspetor-de-terreno-da-junta`, **3ª instância** (identidade nova, Fable) |
| junta | 3 identidades novas escritas pela `agente-fabrica` (16.8); Opus 5.5 declarado; **unanimidade de 3** |
| porteiro | `porteiro-pos-merge` (Fable) |
**Inelegíveis para cadeira, inspeção ou dev do ciclo 2:** `cognicao-visual` · `guardiao-fail-closed` · `coordenador-de-acessos` · o `planejador-mestre` de §0–§14 · `planejador-errata1-b-san3-11` · `planejador-ciclo2-b-san3-11` · `dev-san3-11-dossie` · `dev-errata1-b-san3-11` · as duas instâncias do inspetor da junta 1 · o orquestrador.

### 16.2 Decisões — por propriedade, cada uma com a evidência que a derrubou e a mutação que a vigia
**D-C2-1 — substitui o parágrafo "Decisão declarada…" do §4.** `null` **emitido** pelo DTO ⇒ "não se aplica" (vigente/única), contrato A5/B3. **Chave ausente ou valor inválido (não é `string` não-vazia nem `null`) NÃO é `null`: é quebra do contrato de 12 chaves (A4) e fica do lado fechado** — o adapter recusa a resposta inteira lançando `ChecklistRunContractError`; o `catch` já existente do hook (`useProcessChecklistRuns.ts:50-58`, não-`ApiError` → `setError("Não foi possível carregar os checklists do guincho.")`) põe o painel no **estado de erro que já existe** (Alert + "Tentar novamente"); **nenhuma linha é apresentada**. A frase "o guard E4 é o que impede o DTO de deixar de emitir a chave sem ninguém ver" **sai**: falsa por execução (DTO sem cada uma das 3 chaves e L0 vazio → gerador v1 ec=0; §1.1). Tri-estado: **rejeitado na UI** (não se inventa "não informado" como estado de negócio) e **aceito no adapter** (ausente/inválido ≠ `null`). Por que recusar a resposta e não descartar o item (como `id` ausente, `adapter.ts:531`): item sem `id` é irrenderizável e o descarte o esconde; item sem chave de versão é renderizável **errado** — a substituída vira "Concluído" verde (M5), o dossiê afirma "não está vinculada" com a vigente na lista (M5b). Num documento vendido como prova, "não foi possível carregar" é honesto; lista incompleta sem aviso não é (D-007 do PR-08; `B-SAN3-01b`: a web não fabrica dado). Ordem: o descarte por `id/templateId/startedAt` (existente) vem **antes**; a validação de versão só roda em itens que passaram.
**D-C2-2 — gerador P-L0.** As três cópias da verdade são **o mesmo conjunto nos dois sentidos** (`espelho ⊆ emitido` e `adapter ⊆ emitido`, além de `emitido ⊆ espelho/adapter`) e **L0 vazio é vermelho** ("emissor ilegível"). Medido no protótipo: M5/M5b/M5c → `SEM EMISSOR (1): <chave>`; M6 → `L0 VAZIO: SIM`. Vigia: T20, T22.
**D-C2-3 — gerador P-L3.** "Vistoria" é decidida pelo **tipo** do receptor pelo checker do TypeScript (`ChecklistRunSummaryItem`, ou a forma de resumo `id · templateVersion · status · startedAt`; `any`/desconhecido = vistoria = **negar**; cast lido pela expressão por baixo), e "consulta" é a **decisão sob o ponto** (`?:`, `&&`, `||`, `??`, `if`) cuja condição lê `supersededByRunId`/`currentRunId`/`reopenedFromRunId`, resolvendo `const`/função do mesmo arquivo. Nome de variável e "qualquer leitura em qualquer lugar da função" **saem**. Medido: M2 (receptor `vistoria`), M2b (índice), M4 (leitura em atributo), M8 (cast), M9 (`any`) → ec=1; M3 (helper correto) → ec=0; M7 → residual (iv), 16.9. Vigia: T21 (+T13).
**D-C2-4 — link e âncora.** Os dois links usam o **idioma de link da casa** (`.pat-link`, `app.css:3099-3112`; `:focus-visible` em `:3322-3328`; 8 usos em `.tsx`) e **não navegam**: `onClick` → helper puro `focusVersionRow` (escopo = a própria `<table>` por `ref`; `preventDefault` só se achar o alvo; `scrollIntoView({ block: "center" })`; `focus({ preventScroll: true })`; realce inline ~1,6 s com `outline: 2px solid #2563EB`). Ids únicos no DOM via prop `idPrefix` (print = `"vistoria-impressa"`). **Sem CSS novo** — `frontend/src/styles/**` continua PROIBIDO.
**D-C2-5 — A15 por propriedade (A15′).** Dono válido = bloco do §5 do `PLANO_SAN3.md` (forma canônica `` `B-XXX-NN` (plano SAN3, …) ``) **ou** trilha com precedente em `pendencias.md`; e o texto da pendência não contradiz o que o §13 mediu. O check `grep -c dono` **sai** do A15 (reconhecia a palavra, não a propriedade — como a regex `(?!a atribuir)` do gerador de índice, 16.7).

### 16.3 Entregas do ciclo 2 (E10–E15) e arquivos tocados — caminhos exatos, regra do espelho
| E | Entrega | Arquivo(s) | Espelho |
|---|---|---|---|
| E10 | Links com afordância; âncora que não navega; realce; `idPrefix` | `frontend/src/modules/patios/processes/components/ChecklistRunsPanel.tsx` (os 2 `<a>`: `className="pat-link"` + `onClick`; `export function focusVersionRow(event, scope, targetId)`; `useState` do realce + `useEffect` com `setTimeout` 1600 ms; `ref` da `<table>`; prop `idPrefix = "vistoria"` em `id=` e nos 2 `href=`) · `frontend/src/modules/patios/processes/components/DossiePrintDocument.tsx` (**só** l.95: `idPrefix="vistoria-impressa"`) | `.pat-link` em `StaleDataBanner.tsx:22` e `PatiosPage.tsx:176`; foco `#2563eb` de `app.css:3322-3328` |
| E11 | Adapter fail-closed nas 3 chaves de versão | `frontend/src/modules/patios/processes/processes.adapter.ts`: `export class ChecklistRunContractError extends Error { name = "ChecklistRunContractError" }`; `readVersionRef(record, [camel, snake])` — 1ª chave presente (`key in record`): `null` ⇒ `null`; `string` não-vazia ⇒ `trim()`; outro ⇒ `throw new ChecklistRunContractError("campo de versão inválido: <chave>")`; nenhuma presente ⇒ `throw … ("campo de versão ausente: <chave>")`; l.546-548 passam a usar o helper; `adaptChecklistRunsResponse` **não captura** | `ApiError` (`services/api/client.ts:10`) como erro nomeado; `readString` (l.461) como forma do helper |
| E12 | Gerador v2 (P-L0 + P-L3) | `scripts/san3-11-dossie-vistoria-censo.mjs` = **Apêndice E verbatim** (md5 EOL-neutro `e5fd8ebb7bbead617668ed43c1e55c29`, 208 linhas; dependência única `typescript` 5.9.3 de `frontend/node_modules`; `TS_ROOT` = o `frontend/` real, como hoje) | o v1 (mesmas camadas e linhas de saída, acrescidas) |
| E13 | Testes: T3′, T11′, T12 (saída nova), T15–T22; fixtures existentes | `frontend/tests/patios-dossie-versao.smoke.test.tsx` (16 → **24** testes; `runCenso`/`mutate` da §15 **inalterados**) · `frontend/tests/patios-dossie-checklist.smoke.test.tsx` (**só** fixtures dos testes de adapter l.59-74 e l.75-86: os itens que hoje passam pelo filtro `id/templateId/startedAt` ganham `reopenedFromRunId: null, supersededByRunId: null, currentRunId: null`; os itens sem `id`/sem `templateId` de l.79-80 continuam descartados com ou sem as chaves; **nenhuma asserção removida**) | `finance-titles.test.tsx:[G1]/[G2]` e `api-client.test.ts` (stub de `globalThis.fetch` + `process.env.VITE_USE_MOCKS = "false"` + `await import`) para T16 |
| E14 | Pendências com dono do plano da rodada, texto medido, índice | `agent-orchestration/controle/pendencias.md` (**só** as duas entradas `P-SAN3-11-*`, l.9988-10012) · `agent-orchestration/controle/pendencias-indice.md` (só saída do gerador) | `P-WEB-CHK-EXECUCOES-INEXISTENTES` (l.8493) |
| E15 | Integração da `origin/main` (b404815c) por merge; KPI recontado; `backfill_note` verdadeira; registro | `Kpis/kpis-latest.json` · `Kpis/kpis-history.json` · `Kpis/kpis-history.md` · `Kpis/app.js` (só `kpi-freeze`) · `agent-orchestration/codex/log-execucao.md` · `agent-orchestration/docs/status-geral.md` · `agent-orchestration/codex/comandos/B-SAN3-11-dossie-versao-da-vistoria.md` (1 parágrafo "ciclo 2") · `agent-orchestration/omega/juntas/votos/B-SAN3-11/DEV-relatorio.md` (seção `## CICLO 2`) | §15.9–§15.10 |
`processes.types.ts`: **sem mudança prevista** (o espelho já é `string | null`) — permitido só se o `tsc` exigir algo para a classe de erro; se mexer, 1 linha + nota no DEV-relatorio. `useProcessChecklistRuns.ts` e `processes.service.ts`: **intocados** — medido: o service não captura (`processes.service.ts:96-100`), o hook já trata não-`ApiError` como erro genérico (`useProcessChecklistRuns.ts:56-57`).

### 16.4 Escopo (§C4) — PERMITIDO e PROIBIDO; emendas ao §6, §15.5 e §15-bis.8
**PERMITIDO (e nada mais):** os arquivos da tabela 16.3 · `agent-orchestration/omega/juntas/**` (registro do orquestrador: ata, mandatos, briefing, pareceres, corpos espelhados em `.claude/agents/especialistas/` + `.agents/agents/especialistas/`) · `docs/revisoes/SAN3/B-SAN3-11-plano.md` (**só** esta §16, apensada pelo orquestrador — o dev não a edita).
**Emendas:** (a) `+ frontend/src/modules/patios/processes/components/DossiePrintDocument.tsx` **só** o atributo `idPrefix` na linha do painel (`git diff --numstat 653532f7 HEAD -- <arquivo>` = `1 1`); (b) `scripts/san3-11-dossie-vistoria-censo.mjs` **volta a PERMITIDO** — a §15.5 o proibira porque o defeito da errata não morava nele; C2-01 e C2-02 moram (a proibição da §15.5 vale só para a classe da errata); (c) `patios-dossie-checklist.smoke.test.tsx` só fixtures (já no §6); (d) `Kpis/app.js` só como saída de `node scripts/kpi-freeze.mjs` (§15.5, inalterada).
**PROIBIDO:** tudo o do §6, em especial `src/**` (**o DTO não muda** — o contrato já é de 12 chaves; quem o vigia é o gerador e o adapter) · `frontend/src/styles/**` e `frontend/src/components/ui/**` (**nenhum CSS novo**: `.pat-link` já existe) · `frontend/package.json` (o arquivo já está na lista `test:smoke`) · `VehicleDossieModal.tsx`, `ProcessoDossiePage.tsx`, `useProcessChecklistRuns.ts`, `processes.service.ts` · `agent-orchestration/controle/gerar-indice-pendencias.py` (governança, 16.7) · `.github/**` · `CLAUDE.md`/`AGENTS.md` · `Kpis/index.html`, `Kpis/styles.css` · `prisma/**`, `mobile/**`, lockfiles. **Se a medição do dev provar que o defeito mora fora do PERMITIDO, ele PARA e escreve** (comando + saída no DEV-relatorio); não corrige fora.

### 16.5 Critérios de aceite do ciclo 2 — cada um com a MUTAÇÃO que o deixa vermelho (A2–A14, A16, A19–A26, A17′, A18′ ficam; A15 → A15′)
| # | Critério (verde) | Mutação que o deixa VERMELHO | Onde |
|---|---|---|---|
| A27 | P-C1 repouso/hover/foco: no navegador real (app no Vite + Chromium, fixtures B1/B3), `getComputedStyle(a)` ≠ `getComputedStyle(a.parentElement)` em repouso (`color rgb(37,99,235)`, `font-weight 700` vs `rgb(100,116,139)`/400), sob `:hover` muda (`text-decoration-line underline`, `color rgb(29,78,216)`), sob `:focus-visible` `outline` ≠ `none` — nas 3 superfícies; na impressão o link sai distinguível (cor/peso) | tirar `className="pat-link"` → link = pai (o estado medido em §1.3 da trilha) | C1′ · T17 |
| A28 | P-C1 clique: clicar em "Ver versão vigente"/"Ver versão anterior" **não** muda `location.hash` nem `history.length`; `document.activeElement` vira a `<tr>` alvo; a linha-alvo fica **inteiramente visível** (retângulo fora do `stickyHead`) inclusive no cenário L (B + 8 únicas, 1440×700); a linha recebe o realce inline por ≥1 s; o modal segue aberto | voltar ao `<a href>` sem `onClick` → `#vistoria-…` na URL e `history.length` +1 | C1′ · T19 |
| A29 | Ids únicos: com o modal aberto na aba Checklist, `querySelectorAll` por `[id="vistoria-<id>"]` devolve **1** por vistoria; o portal de impressão usa `vistoria-impressa-<id>` | tirar `idPrefix="vistoria-impressa"` do print → 2 | C1′ · T18 |
| A30 | Adapter fail-closed: para cada uma das 3 chaves, **ausente** → `ChecklistRunContractError`; `null` → `null`; `""`/número/objeto → `ChecklistRunContractError`; camel e snake aceitos; item sem `id/templateId/startedAt` continua **descartado** (não lança) | restaurar `readString(...) ?? null` em qualquer chave → T3′/T15 vermelhos | T3′ · T15 · C2′ |
| A31 | Fail-closed ponta a ponta: `listProcessChecklistRuns` com `fetch` devolvendo `{items:[u1 sem currentRunId, u2]}` **rejeita** com `ChecklistRunContractError`; com as 12 chaves resolve 2 runs (u2 antes de u1) | capturar no adapter e devolver `[]`/parcial → resolve | T16 · C2′ (no navegador: Alert "Não foi possível carregar…" + 0 linhas) |
| A32 | Gerador P-L0: cópia com DTO sem `currentRunId` → `# SEM EMISSOR no espelho (1): currentRunId` (e no adapter), exit 1; cópia com `Object.freeze({…})` → `# L0 VAZIO (emissor ilegível): SIM`, exit 1; head → todas as contagens 0, exit 0 | gerador v1 no lugar do v2 → saída sem `SEM EMISSOR`, exit 0 | T12 · T20 · T22 · C2′ |
| A33 | Gerador P-L3: cópia com `checklistRuns.map((vistoria) => …vistoria.status…)` no modal → linha `receptor=vistoria \| tipo vistoria: sim \| … NÃO`, exit 1; M2b (índice), M4 (leitura em atributo), M8 (cast), M9 (`any`) **todas** exit 1 quando a C2′ as executar; M3 (helper correto) exit 0 | voltar à regex de nome `run\|checklist` → M2 exit 0 | T21 · C2′ |
| A34 | T11′ exclusividade: para cada id de vistoria renderizado, ocorrências no HTML = `id="<prefixo>-<id>"` + `href="#<prefixo>-<id>"`, nas 3 superfícies (painel, impressão com `idPrefix`, `VehicleDossieView`) | `title={run.currentRunId}` no `<a>` → T11′ vermelho | T11′ · C3′ |
| A15′ | Pendências do bloco com **dono do plano da rodada** (bloco do §5 do PLANO_SAN3 ou trilha com precedente) e texto coerente com o §13; índice regenerado = versionado | `dono: a definir` ou `B-SAN3-12` → C3′ vermelho; índice editado à mão → regen deixa diff | C3′ · A26 |
| A35 | `backfill_note` verdadeira nos 3 lugares: `grep -c "NÃO PAGO"` em `Kpis/kpis-latest.json`, `Kpis/kpis-history.json`, `Kpis/kpis-history.md` = 0 e o texto cita `pr 402 · 3e40a256 · cdf370dc` como já preenchidos (pago pelo #403) | deixar o texto do head | C3′ |
| A36 | KPI contra a main de então: `blocks_completed` = main + 1 (**171** contra b404815c); `frontend_smoke_tests` por TAP nos **dois** terrenos (N/N iguais); history n = main + 1 (**167**), bloco por último; `release.pr 401`, `merge_commit`/`approved_head` `null`; `kpi-freeze --check` ec=0 | copiar 1230; esquecer o freeze | C3′ · A23/A24 |
| A37 | Diff do ciclo 2 ⊆ 16.4: `git diff --name-only 653532f7 HEAD` sem `src/`, `styles/`, `components/ui/`, `package.json`, `.github/`, modal, página, hook, service; `DossiePrintDocument.tsx` numstat `1 1`; `git diff --name-only origin/main...HEAD -- src tests mobile prisma` vazio | tocar `global.css` | C3′ |
| A38 | Bateria 16.6 verde nos dois terrenos e na CI (check-runs **concluídos** no head empurrado); arquivo do bloco **24/24**; `test:smoke` N/N por execução; `morto por sinal` = 0 | qualquer vermelho | dev · inspetor novo · C2′ |

**Testes — baseline N = 12 (§8), meta M ≥ 24: o arquivo do bloco vai de 16 a 24 e os 12 do painel ficam (36 ≥ 24).** `node:test`; T1–T11 `renderToString`; T12–T14 e T20–T22 processo filho (arnês da §15: `runCenso` sem teto, `mutate` normalizado com prova — **inalterados**); T16 com stub de `fetch`.
| T | Teste | Critério |
|---|---|---|
| T3′ (substitui T3) | adapter: chave **ausente** (as 3, uma a uma) → `assert.throws(…, ChecklistRunContractError)`; `null` explícito → `null`; `superseded_by_run_id: null` (snake) → `null` | A30 |
| T11′ (substitui T11) | exclusividade de atributo nas 3 superfícies + tudo o que T11 já assertava (UUID/`tenant`/`work_order` fora do texto; ids não-UUID das fixtures fora do texto) | A34 |
| T12 (mesma função, saída nova) | gerador no head → `descartadas=0 · sem emissor=0 · L0 vazio=0 · pontos sem consulta=0`, exit 0 | A32 |
| T15 | adapter: valor inválido (`""`, `42`, `{ id: "run-u2" }`) em cada chave → lança; item sem `id` **e** sem as chaves → descartado, não lança (`[]`) | A30 |
| T16 | service: `process.env.VITE_USE_MOCKS = "false"`; `globalThis.fetch` stub (restaurado em `finally`); `await import("../src/modules/patios/processes/processes.service")`; payload sem `currentRunId` → `assert.rejects(() => listProcessChecklistRuns({}, "p1"), (e) => e instanceof ChecklistRunContractError)`; payload completo → 2 runs, `[0].id === "run-u2"` | A31 |
| T17 | painel B1/B3: os dois `<a>` saem com `class="pat-link"` e `href="#vistoria-…"`; nenhum `<a` sem `class="pat-link"` no HTML das linhas | A27 |
| T18 | `DossiePrintDocument` com substituída e vigente na lista: `id="vistoria-impressa-run-u1"` e `href="#vistoria-impressa-run-u2"` presentes; `id="vistoria-run-` **ausente**; o painel puro mantém `id="vistoria-run-u1"` | A29 |
| T19 | `focusVersionRow` com fakes (`event.preventDefault` espião; `scope.querySelector` devolvendo um alvo com espiões `scrollIntoView`/`focus`): alvo achado → `preventDefault` 1×, `scrollIntoView({ block: "center" })` 1×, `focus({ preventScroll: true })` 1×, devolve o id; `scope.querySelector` → `null` → `preventDefault` 0×, devolve `null` | A28 |
| T20 | gerador, cópia com a linha `currentRunId: run.currentRunId ?? null,` removida do DTO via `mutate` (regex sobre texto LF, com prova) → `SEM EMISSOR no espelho (1): currentRunId` + exit 1 | A32 |
| T21 | gerador, cópia com o ponto M2 injetado em `VehicleDossieModal.tsx` via `mutate` (import de `getChecklistRunStatusLabel` + um `<p>` com receptor `vistoria` ao lado do painel) → linha `receptor=vistoria` … `consulta substituição: NÃO` + exit 1 | A33 |
| T22 | gerador, cópia com `runs.map((run) => ({` → `runs.map((run) => Object.freeze({` e o fecho `})),` → `}))),` no DTO via `mutate` → `L0 VAZIO (emissor ilegível): SIM` + exit 1 | A32 |
T13/T14 ficam (T13: `DossiePrintDocument.tsx:<n> … NÃO`; T14: `DESCARTADAS pelo adapter (1)`). As cópias de T20–T22 copiam o mesmo que T13/T14 (`src/modules/impound/impound.checklist-link.dto.ts`, `frontend/src/**`, `package.json`); o gerador roda com `TS_ROOT=<frontend real>` — o `tsconfig.json` e o `typescript` vêm dali (medido na cópia sem `node_modules`: ec=0, 5,1 s).

### 16.6 Bateria do ciclo 2 — nos DOIS terrenos, `timeout` externo, `ec` por variável, nunca `tail -f`
Terrenos do dev: `C:/Users/AMP/w-dev11c2` (CRLF; `tr -cd '\r' < frontend/src/modules/patios/processes/processes.adapter.ts | wc -c` > 0 colado) e `C:/Users/AMP/w-dev11c2lf` (`git -c core.autocrlf=false worktree add --detach`; CR = 0 colado; checkouts sempre com `-c core.autocrlf=false`). `npm ci --no-audit --no-fund` em `frontend/` nos dois; raiz uma vez `npm ci --ignore-scripts` (guards do KPI; Playwright se quiser antecipar A27/A28). Sem junction. Removidos ao fim com **0 processo vivo** — contagem por `Get-CimInstance Win32_Process` via **`C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe`** (o `powershell` não está no PATH do Git Bash desta máquina — medido pelo planejador). Base viva nunca alvo. Mutações só por arquivo de spec + helper com âncora única e prova (bytes/CR antes→depois); conteúdo com barra invertida dupla **nunca por heredoc** (o transporte colapsa a dupla em simples — medido pelo planejador em 04:10Z) e comandos longos em partes ≤ 7 KB.
Em **cada** terreno:
```
npm --prefix frontend run check ; ec=$?                                                                                 # 0
( cd frontend && timeout 1200 node --test --import tsx tests/patios-dossie-versao.smoke.test.tsx > ../tap-versao.log 2>&1 ; echo ec=$? )  # 24/24; grep -c 'morto por sinal' = 0
( cd frontend && timeout 900 node --test --import tsx tests/patios-dossie-checklist.smoke.test.tsx tests/patios-dossie-print.smoke.test.tsx tests/patios-dossie-modal.smoke.test.tsx tests/patios-dossie.smoke.test.tsx tests/patios-dossie-deeplink.smoke.test.tsx tests/patios-dossie-history.smoke.test.tsx tests/checklists-run-lock.test.ts ; echo ec=$? )   # regressões do dossiê
TS_ROOT=<frontend> timeout 300 node scripts/san3-11-dossie-vistoria-censo.mjs . ; ec=$?                                 # 0; saída colada (todas as contagens 0)
timeout 1800 npm --prefix frontend run test:smoke > tap-smoke.log 2>&1 ; ec=$?                                          # N/N por execução → KPI
npm --prefix frontend run build && rm -rf frontend/dist                                                                 # §C5
git grep -n -E 'Versao|substituida|vigente nao' -- frontend/src ; git grep -n -i -E '\btenant\b' -- frontend/src/modules/patios/processes/components/ChecklistRunsPanel.tsx   # vazios (A14)
# Controles com mutação em cópia de trabalho, prova de aplicação, restauração por cópia, `git diff --stat` vazio depois, NUNCA commitados — cada um com comando · TAP resumido · mensagem exata:
#   A30 (`?? null` restaurado numa chave → T3′/T15 vermelhos) · A31 (adapter engole → T16 vermelho) · A32/A33 (gerador v1 no lugar do v2 → T20/T21/T22 vermelhos)
#   A27 (sem `pat-link` → T17) · A29 (sem `idPrefix` → T18) · A34 (`title={run.currentRunId}` → T11′) · A17′/A19/A20/A21 da §15 (o arnês não mudou)
#   T4 vermelho-controle no head-base COLADO JUNTO com M1 no objeto (chip verde presente) — responde C1-06
```
Na raiz, uma vez: `node scripts/kpi-freeze.mjs --check ; echo ec=$?` (0) · `node --check Kpis/app.js` · `node --test --import tsx tests/kpi-dashboard-charts.test.ts` · `python agent-orchestration/controle/gerar-indice-pendencias.py` → `git diff --stat -- agent-orchestration/controle/pendencias-indice.md` vazio (A26; o gerador grava LF — comparar por `tr -d '\r' | md5sum`, lição da C3 do ciclo 1) · `git diff --name-only origin/main...HEAD` (⊆ 16.4) · `git diff --name-only 653532f7 HEAD` (⊆ 16.4; `DossiePrintDocument.tsx` numstat `1 1`) · varredura v2 da §15-bis.7 → `TETO=0 · NULL=0 · CP=1 · EOL=3` (A18′) · **`git diff --check` em linha própria antes de cada commit**. O `npm test` da raiz não é exigido (nada em `src/`). Tudo colado em `DEV-relatorio.md` seção `## CICLO 2 — <UTC>`, por terreno.

### 16.7 Integração da `origin/main`, KPI (§C3), pendências e registro
1. **Primeiro commit do ciclo:** `git fetch origin main` · `git merge origin/main` (b404815c) — **nunca rebase** (o ramo tem mandatos e pareceres que citam SHAs). Conflitos esperados (medidos): `Kpis/app.js`, `Kpis/kpis-history.json`, `Kpis/kpis-latest.json`, `agent-orchestration/codex/log-execucao.md`, `agent-orchestration/controle/pendencias-indice.md`, `agent-orchestration/docs/status-geral.md` — **as duas entradas ficam, a do bloco por último**; `app.js` resolve-se regenerando (`node scripts/kpi-freeze.mjs`); o índice regenerando (A26). **0 conflito em código.** Depois, commits próprios (Conventional Commits; `git diff --check` em linha própria antes de cada): `fix(patios): B-SAN3-11 ciclo 2 — links com afordância que não navegam; adapter fail-closed (E10/E11)` · `fix(test): B-SAN3-11 ciclo 2 — gerador v2 por tipo e decisão; T3′/T11′/T15–T22 (E12/E13)` · `docs(registro): B-SAN3-11 ciclo 2 — pendências com dono do plano da rodada e índice (E14)` · `fix(kpi): B-SAN3-11 ciclo 2 — recontagem contra a main b404815c e backfill_note verdadeira (E15)`.
2. **KPI:** `blocks_completed` **171** = 170 (b404815c) + 1 — regra: a main de então + 1 (se a main andar antes do push, reconta); `frontend_smoke_tests` **por execução** nos dois terrenos (TAP `# tests/# pass` colado; esperado 1214 + 24 = **1238** se a main não tocar `frontend/`; vale o medido); `backend_tests 3052/3054` e `flutter_tests 864/864` carregados com nota (`git diff --name-only origin/main...HEAD -- src tests mobile prisma` vazio, colado); `version "B-SAN3-11"`, `release.pr 401`, `merge_commit`/`approved_head` **null**, `status "published_per_pr"`, `snapshot_date` do dia; history n = **167** (166 + 1), bloco por último; `kpis-history.md` ganha 1 linha "CICLO 2 (§16): links com afordância, adapter fail-closed, gerador v2, pendências com dono; +8 testes (16 → 24)"; **`backfill_note` nos 3 lugares = o texto do A35**; `node scripts/kpi-freeze.mjs` → `app.js` (2 linhas `var FROZEN`), `--check` ec=0. `mvp_demo`/`mvp_vendavel` intocados.
3. **Pendências (E14, A15′):** `P-SAN3-11-VIGENTE-NAO-VINCULADA` → `**dono:** trilha CHECKLIST P1, PR-05 (bloco dono proposto pela fatia; plano SAN3: não nomeada no gate (§4.1))`; corpo: causa = P-d (`reopenRun` **copia** `related_entity_type/id` — `checklist-prisma.repository.ts:806-807`; o AUTO-link roda **só na abertura** da custódia — `impound-prisma.repository.ts:205-215`; a rota MANUAL `POST …/link-checklist-run` existe sem UI), remédio = o do §13 (backend lista os sucessores da cadeia com origem `DERIVED` **ou** `reopenRun` propaga os vínculos — decisão da junta do bloco dono); saem "B-SAN3-12 ou bloco dedicado" e "gerou uma nova order". `P-SAN3-11-ORDEM-DO-REPOSITORIO-INDEFINIDA` → `**dono:** B-O6R-12 (plano SAN3, l.258 — próximo a tocar src/modules/impound/**; como nota, não como bloqueio)`; corpo: "o repositório ordena por `created_at` do **vínculo** (iguais na mesma tx do AUTO-link ⇒ indefinida, B1b); **o adapter reordena por `startedAt desc`** (`processes.adapter.ts:557-558`) e essa é a ordem do dossiê (B1c/T5); informativa — nenhum consumidor além do frontend"; sai "o painel exibe as runs na ordem recebida (sem reordenar)". Índice regenerado. **Nenhuma pendência nova.** **Nota de governança** (ata do ciclo 2, 1 linha; dono: orquestrador → bloco de governança de registro, na mesma fila da divergência §11 do `CLAUDE.md`): `gerar-indice-pendencias.py:98` lê "a definir" e qualquer texto como dono `sim` — o instrumento reconhece a palavra.
4. **Registro:** `DEV-relatorio.md` `## CICLO 2 — <UTC>` (terrenos, bateria, controles com mensagem exata, varredura v2, KPI antes/depois, head anterior 653532f7 → novo); `log-execucao.md` e `status-geral.md` 1 linha cada; `comandos/B-SAN3-11-….md` 1 parágrafo "ciclo 2 (§16)"; esta §16 e `PLANEJADOR-ciclo2-relatorio.md` versionados pelo orquestrador; ata `J-B-SAN3-11.md` ganha "## ciclo 2" (quem ocupou cada papel; quedas P6; a nota de governança).

### 16.8 Junta do ciclo 2 — composição para a `agente-fabrica`, inspetor novo, sequência
**Quórum: unanimidade de 3** (§C7.1-ter(b), inalterado: o dossiê é prova do estado do veículo). Sem crítico. Cadeiras em **Opus 5.5 declarado** (o contrato fixa Fable só para gates e planejador). Corpos novos em `.claude/agents/especialistas/jurado-san3-11-c2-*.md` + espelho `.agents/agents/especialistas/` (`node scripts/sync-agent-agents.mjs --check` verde); **`git add -f` nos dois espelhos e commit no ramo** — o ignore global cobre os dois diretórios, e corpo não commitado no ramo julgado não conta; a `agente-fabrica` não tem Bash: **o orquestrador versiona**. Mandatos ≤3 itens (P4; medir ≠ julgar), P1–P7 verbatim do contrato no disparo; cada cadeira declara modelo e md5 EOL-neutro do corpo na 1ª linha da evidência.
| cadeira | identidade (nova) | competência que a fábrica escreve no corpo | itens |
|---|---|---|---|
| C1′ afordância, âncora e superfícies | `jurado-san3-11-c2-afordancia-e-ancora` | cognição visual **e** interação medida no navegador real (app no Vite + Playwright/Chromium: `getComputedStyle`, `matches(":hover")`/`matches(":focus-visible")`, `location.hash`/`history.length`, retângulo do alvo × `stickyHead`, contagem de ids, `emulateMedia print`); conhece o design system do repo (tokens, família `.pat-*`), a §11 do contrato e os vetos de microinteração ("elemento interativo sem hover/foco visível"; "clique sem retorno") | (1) A27 + A28 nas 3 superfícies com B1/B3 **e** o cenário L (lista longa, 1440×700); (2) A29 (ids únicos com o modal aberto) + impressão real (`window.print` → `media print`) + A12/A14 byte a byte; (3) T4 vermelho-controle no head-base **com** M1 do objeto (C1-06) |
| C2′ enumeração tipada e fail-closed | `jurado-san3-11-c2-enumeracao-tipada` | fail-closed por **álgebra e execução**: lê AST e checker do TypeScript, escreve mutações próprias com âncora única e prova de aplicação em CRLF, roda gerador e suíte em cópia descartável; conhece a família "guarda que reconhece forma em vez de enunciar propriedade" (§C7.4(a)), o padrão `db-catalog-write-guard` e o veto "allowlist vazia que significa tudo" | (1) gerador v2 no head + **M1–M9 deste §16 executadas** (M2/M2b/M4/M8/M9 vermelhas; M3 verde; **M7 verde = residual (iv): julga se há ponto novo com essa forma no diff**) + **uma mutação própria nova**; (2) A30/A31 (adapter e service fail-closed; `ChecklistRunContractError` até o estado de erro do painel no navegador) + T3′/T15/T16 com controles; (3) T12–T14 e T20–T22 nos dois terrenos (`duration_ms`, `morto por sinal` = 0) + A17′/A19–A21 |
| C3′ registro, escopo e acesso | `jurado-san3-11-c2-registro-e-escopo` | cadeia de acesso e §allowlist (P-o por script, guarda dupla, `canReadChecklist`), disciplina de escopo por pathspec, registro honesto (pendência com dono **do plano da rodada** — confere o bloco no §5 do `PLANO_SAN3.md` ou o precedente da trilha; índice gerado × versionado; KPI por execução × carregado; `backfill_note` × history da `main` real) | (1) P-o + T10 + T11′ (A34) com a mutação `title=`; (2) diff × 16.4 (A37) + `DossiePrintDocument` numstat `1 1` + A18′ (varredura v2) + A25; (3) A15′ + A26 + A35 + A36 (KPI recontado contra a main integrada **e** a de agora) |
**Inspetor novo** (Fable, 3ª instância): worktree próprio por cadeira que muta (C1′, C2′), `npm ci` próprio, S0 (`sync-agent-agents.mjs --check`), **check-runs concluídos no head empurrado** (gatilho de push: só head novo dispara; `cancelled`/`queued` conta como ausente), inelegibilidade por nome (16.1), baseline **24/24** e `test:smoke` N/N nos **dois** terrenos, corpos das 3 cadeiras commitados no ramo (md5 EOL-neutro), plano de perda; **`LIBERADO` antes do primeiro disparo**. P5: ≤2 cadeiras em paralelo.
**Sequência:** merge da main → E10–E15 em commits próprios → bateria 16.6 nos dois terrenos → `git merge-base --is-ancestor origin/fix/dossie-versao-da-vistoria HEAD; echo $?` = 0 → `git push origin HEAD:fix/dossie-versao-da-vistoria` (nunca `--force`) → CI no head → mandatos regenerados (`bash scripts/mandato-refs.sh 401`, **HC = H0**) → inspetor novo → junta ciclo 2 → verde = merge + `porteiro-pos-merge`. Reprovação → `omega/reprovacoes/R-B-SAN3-11-2.md`, ciclo 3 com papéis recompostos; `bloqueia` no ciclo 3 → auditoria da máquina antes do 4 (`D-SEM-TETO-AUDITORIA-NO-3`).

### 16.9 Riscos, residuais declarados e rollback
| R | Risco | Mitigação |
|---|---|---|
| R9 | Erro de contrato derruba a aba inteira (um item mal formado → nenhuma vistoria visível) | decisão D-C2-1, declarada: num documento de prova, "não foi possível carregar" + "Tentar novamente" vence lista errada; o DTO real emite as 12 chaves sempre (A4) — o caminho só vive se o backend quebrar o contrato, e aí o gerador P-L0 já ficou vermelho na CI |
| R10 | `ts.createProgram` lento ou frágil nas cópias (T13/T14/T20–T22) | medido: 2,4–7,3 s por execução; 5,1 s na cópia sem `node_modules` (resolução bare pelo `TS_ROOT`); 6 execuções ≈ 30–60 s no Windows; `runCenso` sem teto (§15) — morte aparece como morte, nunca como veredito |
| R11 | **Residual (iv):** guarda que lê o campo e não distingue os ramos (M7) passa no gerador | declarado; M7 no mandato da C2′ para **julgar**; T4–T11 cobrem o painel; ponto novo com essa forma é achado de leitura do diff, não de guard |
| R12 | `.pat-link` é 12px dentro de `<small>` 11px | é o idioma da classe (usada em contextos 11–13px); a C1′ julga a composição; a propriedade é cor/peso/hover/foco, não o px |
| R13 | `focusVersionRow` sem `document` (SSR) | só roda no `onClick`; `renderToString` nunca o chama; T19 usa fakes |
| R14 | A main anda de novo antes do push | regra "main de então + 1"; re-merge; recontagem |
| R15 | Os dois testes de adapter existentes (`patios-dossie-checklist…:59-86`) ficam vermelhos com o adapter fail-closed se as fixtures não ganharem as 3 chaves | E13 nomeia as linhas; "nenhuma asserção removida" continua; a C3′ lê o diff dessas fixtures |
**Rollback:** `git revert` dos commits do ciclo 2 no ramo; estado anterior `653532f7`. Nenhuma migration, nenhum dado.

**Uma linha:** a junta 1 pegou quatro guardas que reconheciam forma — `<a>` cru que herda o reset, `?? null` que iguala "não sei" a "não foi substituída", regex de nome de variável e `grep -c dono` — e o ciclo 2 troca cada uma pela propriedade, **executada antes de publicada**: link com o idioma da casa que não navega, adapter que recusa contrato quebrado (o §4 reescrito), gerador v2 que vê tipo e decisão (M2/M2b/M4/M8/M9 e M5/M5b/M5c/M6 vermelhos; M7 declarado), pendências com dono do plano da rodada, `main` b404815c por merge e KPI recontado — 8 testes novos (24 no arquivo), nos dois terrenos, com identidade nova em cada papel.

### Apêndice E — o gerador v2 (verbatim; md5 EOL-neutro `e5fd8ebb7bbead617668ed43c1e55c29`; 208 linhas) — o dev commita como `scripts/san3-11-dossie-vistoria-censo.mjs`

```js
#!/usr/bin/env node
// B-SAN3-11 — GERADOR v2 (ciclo 2) — censo CE-G1 por PROPRIEDADE, com o checker de tipos do TypeScript.
// PROPRIEDADES (não lista de nomes):
//   P-L0  as três cópias da verdade (DTO emite · espelho declara · adapter consome) são o MESMO conjunto, nos dois sentidos,
//         e um emissor ilegível (L0 vazio) é vermelho — pega remoção de chave no emissor (M5/M5b/M5c) e L0 vazio (M6).
//   P-L3  todo ponto de JSX que renderiza a SITUAÇÃO de uma vistoria (x.status ou helper de situação) — "vistoria" decidida
//         pelo TIPO do receptor (ChecklistRunSummaryItem, ou a forma de resumo id/templateVersion/status/startedAt), nunca pelo
//         nome da variável — está sob uma DECISÃO (?:, &&, ||, ??, if) cuja condição lê o estado de substituição
//         (supersededByRunId/currentRunId/reopenedFromRunId), resolvendo const/função do mesmo arquivo. Receptor de tipo
//         desconhecido/any = vistoria (negar); ponto sem decisão = NÃO.
// Camadas: L0 DTO · L1 espelho · L2 adapter · L3 pontos · L4 consumidores. Uso: node censo-v2.mjs <repo-root>
// TS_ROOT = diretório do frontend com node_modules + tsconfig.json (default <root>/frontend). Cópias temporárias (T13/T14)
// não têm node_modules: especificadores bare (react, react/jsx-runtime…) são resolvidos a partir do TS_ROOT.
import { createRequire } from "node:module";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve(process.argv[2] ?? ".");
const TS_ROOT = resolve(process.env.TS_ROOT ?? join(root, "frontend"));
const require = createRequire(join(TS_ROOT, "package.json"));
const ts = require("typescript");

const DTO = "src/modules/impound/impound.checklist-link.dto.ts";
const TYPES = "frontend/src/modules/patios/processes/processes.types.ts";
const ADAPTER = "frontend/src/modules/patios/processes/processes.adapter.ts";
const PROCESSES_DIR = "frontend/src/modules/patios/processes";
const FRONTEND_SRC = "frontend/src";
const STATUS_HELPERS = new Set(["getChecklistRunStatusLabel", "getChecklistRunStatusTone"]);
const VERSION_FIELDS = new Set(["supersededByRunId", "currentRunId", "reopenedFromRunId"]);
const SUMMARY_SHAPE = ["id", "templateVersion", "status", "startedAt"];
const VISTORIA_TYPE = "ChecklistRunSummaryItem";

function parse(rel) {
  const text = readFileSync(join(root, rel), "utf8");
  return ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, rel.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
}
function walk(node, fn) { fn(node); ts.forEachChild(node, (c) => walk(c, fn)); }
function line(sf, node) { return sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1; }
function listFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) listFiles(p, acc); else if (/[.](ts|tsx)$/.test(name) && !/[.]d[.]ts$/.test(name)) acc.push(p);
  }
  return acc;
}

// ── L0 / L1 / L2 (AST sintática basta) ──
function dtoKeys() {
  const sf = parse(DTO); const keys = [];
  walk(sf, (n) => {
    if (ts.isFunctionDeclaration(n) && n.name?.text === "toChecklistRunSummaryListDto") walk(n, (m) => {
      if (ts.isCallExpression(m) && ts.isPropertyAccessExpression(m.expression) && m.expression.name.text === "map") {
        const arrow = m.arguments[0];
        if (arrow && ts.isArrowFunction(arrow)) {
          let body = arrow.body; if (ts.isParenthesizedExpression(body)) body = body.expression;
          if (ts.isObjectLiteralExpression(body)) for (const p of body.properties) if (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) keys.push(p.name.getText(sf));
        }
      }
    });
  });
  return keys;
}
function mirrorKeys() {
  const sf = parse(TYPES); const keys = [];
  walk(sf, (n) => { if (ts.isTypeAliasDeclaration(n) && n.name.text === VISTORIA_TYPE && ts.isTypeLiteralNode(n.type)) for (const m of n.type.members) if (ts.isPropertySignature(m)) keys.push(m.name.getText(sf)); });
  return keys;
}
function adapterKeys() {
  const sf = parse(ADAPTER); const keys = [];
  walk(sf, (n) => {
    if (ts.isFunctionDeclaration(n) && n.name?.text === "adaptChecklistRun") walk(n, (m) => {
      if (ts.isReturnStatement(m) && m.expression && ts.isObjectLiteralExpression(m.expression)) for (const p of m.expression.properties) if (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) keys.push(p.name.getText(sf));
    });
  });
  return keys;
}

// ── L3 / L4 com o checker de tipos ──
function importsAny(sf, names) {
  let hit = false;
  walk(sf, (n) => { if (ts.isImportDeclaration(n) && n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings)) for (const e of n.importClause.namedBindings.elements) if (names.has(e.name.text)) hit = true; });
  return hit;
}
function l3Files() {
  const files = new Set(listFiles(join(root, PROCESSES_DIR)).map((p) => relative(root, p)));
  for (const p of listFiles(join(root, FRONTEND_SRC))) { const rel = relative(root, p); if (files.has(rel)) continue; const sf = parse(rel); if (importsAny(sf, new Set([VISTORIA_TYPE, "ChecklistRunsPanel"]))) files.add(rel); }
  return [...files].sort();
}
function buildProgram(files) {
  const cfg = ts.readConfigFile(join(TS_ROOT, "tsconfig.json"), ts.sys.readFile);
  if (cfg.error) throw new Error("tsconfig ilegível em TS_ROOT: " + ts.flattenDiagnosticMessageText(cfg.error.messageText, " "));
  const parsed = ts.parseJsonConfigFileContent(cfg.config, ts.sys, TS_ROOT);
  const options = { ...parsed.options, noEmit: true, skipLibCheck: true, composite: false, incremental: false, tsBuildInfoFile: undefined };
  const host = ts.createCompilerHost(options, true);
  const anchor = join(TS_ROOT, "src", "__censo_anchor__.ts"); // resolução de especificadores bare quando a cópia não tem node_modules
  host.resolveModuleNames = (names, containing, _reused, _redirect, opts) => names.map((name) => {
    const direct = ts.resolveModuleName(name, containing, opts, host).resolvedModule;
    if (direct || name.startsWith(".") || name.startsWith("/")) return direct;
    return ts.resolveModuleName(name, anchor, opts, host).resolvedModule;
  });
  host.resolveTypeReferenceDirectives = (names, containing, _redirect, opts) => names.map((n) => {
    const name = typeof n === "string" ? n : n.fileName;
    const direct = ts.resolveTypeReferenceDirective(name, containing, opts, host).resolvedTypeReferenceDirective;
    return direct ?? ts.resolveTypeReferenceDirective(name, anchor, opts, host).resolvedTypeReferenceDirective;
  });
  return ts.createProgram({ rootNames: files.map((f) => join(root, f)), options, host });
}
function enclosingFunction(node) { let p = node.parent; while (p && !(ts.isArrowFunction(p) || ts.isFunctionExpression(p) || ts.isFunctionDeclaration(p) || ts.isMethodDeclaration(p))) p = p.parent; return p; }
function inJsx(n) { for (let p = n.parent; p; p = p.parent) if (ts.isJsxElement(p) || ts.isJsxSelfClosingElement(p) || ts.isJsxExpression(p) || ts.isJsxFragment(p)) return true; return false; }
function unwrapCasts(e) { while (e && (ts.isAsExpression(e) || ts.isParenthesizedExpression(e) || ts.isNonNullExpression(e) || ts.isTypeAssertionExpression(e) || (typeof ts.isSatisfiesExpression === "function" && ts.isSatisfiesExpression(e)))) e = e.expression; return e; } // o TIPO que vale é o da expressão por baixo do cast
function typeIsVistoria(type) {
  if (!type) return "desconhecido";
  if (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) return "desconhecido";
  const parts = type.isUnion && type.isUnion() ? type.types : [type];
  for (const t of parts) {
    if (t.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null)) continue;
    const name = t.aliasSymbol?.name ?? t.symbol?.name;
    if (name === VISTORIA_TYPE) return "sim";
    if (SUMMARY_SHAPE.every((p) => t.getProperty(p))) return "sim";
  }
  return "nao";
}
function exprReadsVersion(expr, checker, seen, depth) {
  if (!expr || depth > 5) return false;
  let hit = false;
  walk(expr, (n) => {
    if (hit) return;
    if (ts.isPropertyAccessExpression(n) && VERSION_FIELDS.has(n.name.text)) { hit = true; return; }
    if (ts.isIdentifier(n) && VERSION_FIELDS.has(n.text) && ts.isBindingElement(n.parent)) { hit = true; return; }
    if (ts.isIdentifier(n)) {
      const sym = checker.getSymbolAtLocation(n); const decl = sym?.valueDeclaration ?? sym?.declarations?.[0];
      if (!decl || seen.has(decl)) return; seen.add(decl);
      if (ts.isVariableDeclaration(decl) && decl.initializer) { if (exprReadsVersion(decl.initializer, checker, seen, depth + 1)) hit = true; }
      else if ((ts.isFunctionDeclaration(decl) || ts.isArrowFunction(decl) || ts.isFunctionExpression(decl)) && decl.body) { if (exprReadsVersion(decl.body, checker, seen, depth + 1)) hit = true; }
    }
  });
  return hit;
}
// a DECISÃO sob a qual o ponto está: sobe do ponto até a função envolvente coletando condições de ?:, &&/||/??, if
function guardedByVersion(node, fn, checker) {
  const conds = [];
  for (let c = node, p = node.parent; p && p !== fn; c = p, p = p.parent) {
    if (ts.isConditionalExpression(p) && (p.whenTrue === c || p.whenFalse === c)) conds.push(p.condition);
    else if (ts.isBinaryExpression(p) && p.right === c) { const k = p.operatorToken.kind; if (k === ts.SyntaxKind.AmpersandAmpersandToken || k === ts.SyntaxKind.BarBarToken || k === ts.SyntaxKind.QuestionQuestionToken) conds.push(p.left); }
    else if (ts.isIfStatement(p) && (p.thenStatement === c || p.elseStatement === c)) conds.push(p.expression);
  }
  return conds.some((cond) => exprReadsVersion(cond, checker, new Set(), 0));
}

function censo(files) {
  const program = buildProgram(files); const checker = program.getTypeChecker();
  const sites = []; const consumers = [];
  for (const rel of files) {
    const sf = program.getSourceFile(join(root, rel)); if (!sf) continue;
    walk(sf, (n) => {
      if (rel.endsWith(".tsx")) {
        let receptor = null; let unknownReceptor = false; // expressão cujo TIPO decide se é vistoria
        if (ts.isPropertyAccessExpression(n) && n.name.text === "status") receptor = n.expression;
        else if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && STATUS_HELPERS.has(n.expression.text)) {
          const a = n.arguments[0];
          if (a && ts.isPropertyAccessExpression(a) && a.name.text === "status") receptor = a.expression; else { receptor = a ?? n; unknownReceptor = true; }
        }
        if (receptor && inJsx(n)) {
          const ln = line(sf, n); const key = `${rel}:${ln}`;
          if (!sites.some((s) => s.key === key)) {
            const vis = unknownReceptor ? "desconhecido" : typeIsVistoria(checker.getTypeAtLocation(unwrapCasts(receptor)));
            if (vis !== "nao") {
              const fn = enclosingFunction(n);
              const consulta = guardedByVersion(n, fn, checker) ? "sim" : "NÃO";
              sites.push({ key, file: rel, line: ln, receptor: unknownReceptor ? "?" : receptor.getText(sf).slice(0, 40), tipo: vis, expr: n.getText(sf).slice(0, 60), consulta });
            }
          }
        }
      }
      if ((ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) && n.tagName.getText(sf) === "ChecklistRunsPanel") {
        const runsAttr = n.attributes.properties.find((a) => ts.isJsxAttribute(a) && a.name.getText(sf) === "runs");
        consumers.push({ file: rel, line: line(sf, n), runs: runsAttr ? runsAttr.initializer.getText(sf).slice(0, 40) : "(sem runs)" });
      }
    });
  }
  return { sites, consumers };
}

const t0 = Date.now();
const emitted = dtoKeys(), mirror = mirrorKeys(), consumed = adapterKeys();
const dropMirror = emitted.filter((k) => !mirror.includes(k)), dropAdapter = emitted.filter((k) => !consumed.includes(k));
const semEmissorMirror = mirror.filter((k) => !emitted.includes(k)), semEmissorAdapter = consumed.filter((k) => !emitted.includes(k));
const l0Vazio = emitted.length === 0;
const files = l3Files();
const { sites, consumers } = censo(files);
console.log(`# L0 DTO emite (${emitted.length}): ${emitted.join(", ")}`);
console.log(`# L1 espelho ${VISTORIA_TYPE} (${mirror.length}): ${mirror.join(", ")}`);
console.log(`# L2 adapter consome (${consumed.length}): ${consumed.join(", ")}`);
console.log(`# DESCARTADAS pelo espelho (${dropMirror.length}): ${dropMirror.join(", ") || "∅"}`);
console.log(`# DESCARTADAS pelo adapter (${dropAdapter.length}): ${dropAdapter.join(", ") || "∅"}`);
console.log(`# SEM EMISSOR no espelho (${semEmissorMirror.length}): ${semEmissorMirror.join(", ") || "∅"}`);
console.log(`# SEM EMISSOR no adapter (${semEmissorAdapter.length}): ${semEmissorAdapter.join(", ") || "∅"}`);
console.log(`# L0 VAZIO (emissor ilegível): ${l0Vazio ? "SIM" : "não"}`);
console.log(`# L3 arquivos varridos (${files.length}): ${files.join(" · ")}`);
console.log(`# L3 pontos de apresentação da situação de uma vistoria (${sites.length}):`);
for (const s of sites) console.log(`${s.file}:${s.line} | receptor=${s.receptor} | tipo vistoria: ${s.tipo} | ${s.expr} | consulta substituição: ${s.consulta}`);
console.log(`# L4 consumidores do painel (${consumers.length}):`);
for (const c of consumers) console.log(`${c.file}:${c.line} | runs=${c.runs}`);
const naoConsulta = sites.filter((s) => s.consulta !== "sim");
const desconhecidos = sites.filter((s) => s.tipo === "desconhecido");
const total = dropMirror.length + dropAdapter.length + semEmissorMirror.length + semEmissorAdapter.length + (l0Vazio ? 1 : 0) + naoConsulta.length;
console.log(`# VEREDITO: descartadas=${dropMirror.length + dropAdapter.length} · sem emissor=${semEmissorMirror.length + semEmissorAdapter.length} · L0 vazio=${l0Vazio ? 1 : 0} · pontos sem consulta=${naoConsulta.length} (receptor desconhecido=${desconhecidos.length}) · ${Date.now() - t0} ms`);
process.exitCode = total === 0 ? 0 : 1;

```

**Saída no head `653532f7`** (`TS_ROOT=C:/Users/AMP/w-plc2lf/frontend node censo-v2.mjs .`, terreno LF, exit 0; a linha `# L3 arquivos varridos (26): …` elidida — igual à do Apêndice A):

```
# L0 DTO emite (12): id, templateId, templateName, templateVersion, status, relatedEntityType, relatedEntityId, startedAt, completedAt, reopenedFromRunId, supersededByRunId, currentRunId
# L1 espelho ChecklistRunSummaryItem (12): id, templateId, templateName, templateVersion, status, relatedEntityType, relatedEntityId, startedAt, completedAt, reopenedFromRunId, supersededByRunId, currentRunId
# L2 adapter consome (12): id, templateId, templateName, templateVersion, status, relatedEntityType, relatedEntityId, startedAt, completedAt, reopenedFromRunId, supersededByRunId, currentRunId
# DESCARTADAS pelo espelho (0): ∅
# DESCARTADAS pelo adapter (0): ∅
# SEM EMISSOR no espelho (0): ∅
# SEM EMISSOR no adapter (0): ∅
# L0 VAZIO (emissor ilegível): não
# L3 pontos de apresentação da situação de uma vistoria (2):
frontend\src\modules\patios\processes\components\ChecklistRunsPanel.tsx:116 | receptor=run | tipo vistoria: sim | getChecklistRunStatusLabel(run.status) | consulta substituição: sim
frontend\src\modules\patios\processes\components\ChecklistRunsPanel.tsx:119 | receptor=run | tipo vistoria: sim | getChecklistRunStatusTone(run.status) | consulta substituição: sim
# L4 consumidores do painel (3):
frontend\src\modules\patios\processes\components\DossiePrintDocument.tsx:95 | runs={checklistRuns}
frontend\src\modules\patios\processes\components\VehicleDossieModal.tsx:233 | runs={checklistRuns}
frontend\src\modules\patios\processes\pages\ProcessoDossiePage.tsx:142 | runs={checklistRuns}
# VEREDITO: descartadas=0 · sem emissor=0 · L0 vazio=0 · pontos sem consulta=0 (receptor desconhecido=0) · 2674 ms
```

**Mutações executadas contra esta forma** (comando, terreno e saída resumida na trilha §2.0; restauração por md5 após cada uma): M1 `run`→ec=1 · M2 `vistoria`→ec=1 · M2b `checklistRuns[0]?.status`→ec=1 · M4 leitura em atributo→ec=1 · M3 helper correto→ec=0 · M7 guarda que não distingue→ec=0 (residual iv) · M8 cast→ec=1 · M9 `any`→ec=1 (`receptor desconhecido=1`) · M5/M5b/M5c DTO sem chave→ec=1 (`SEM EMISSOR (1)`) · M6 `Object.freeze`→ec=1 (`L0 VAZIO: SIM`) · T14 adapter sem `supersededByRunId`→ec=1 (`DESCARTADAS pelo adapter (1)`) · T13 `run.status` na impressão→ec=1. Cópia sem `node_modules` (forma de T13/T14) com `TS_ROOT=<frontend real>`: ec=0, 5,1 s.

## §16-bis — Emenda ao ciclo 2 (2026-10-03): A17′, A18′ e A25 reescritos como PROPRIEDADE para o objeto do ciclo 2; o texto do T22 corrigido; os intervalos medidos sem o ruído do merge

**Autoria:** `planejador-mestre`, identidade `planejador-ciclo2-b-san3-11` (a da §16), em **Opus 5.5 por substituição declarada** (§C7.6-bis — papel: planejador-mestre · modelo que rodou: Opus 5.5 · por que o Fable faltou: decisão do dono de 2026-10-03, fonte §A1.1, "Fable agora só em blocos que toquem em dinheiro até segunda ordem"; o B-SAN3-11 não toca dinheiro). Mandato `00-mandatos/planejador-ciclo2-bis.md` (md5 EOL-neutro `80c06834a1940fdab8a0751f32fe8563`, versionado em `d1c1a519`). Trilha (comando · saída · hora UTC de cada item): `PLANO-C2bis-B-SAN3-11.md`, itens M0–M6. Medido no worktree próprio `C:/Users/AMP/w-plc2b` (detached em `a73fb35f`, CRLF, `npm ci` próprio em `frontend/`, sem junction, criado com `core.autocrlf` = `true` conferido) e nos blobs de `5f6aaf56`, `92cfc05e`, `defa502e`, `653532f7`, `feb0d838` e `a73fb35f`. Insumos lidos como relato — o DEV-C2-401 (D2 §1, §3 parte C, §4 e a retomada) e o relatório da fábrica (FABRICA-401-c2) —; tudo o que vai abaixo foi re-medido.

**Natureza:** emenda de RÉGUA, sem código. A §16.5 manteve A17′, A18′ e A25 "como estão", mas o ciclo 2 mudou justamente o que eles contam: T20–T22 entram no mesmo arnês, o gerador vira o v2 do Apêndice E, o E13 muda o arquivo de teste. Lidos ao pé da letra sobre o objeto do ciclo 2, o **A17′ falha com o código certo** (6, não 3), o **A18′ passa por coincidência de número** (a `:42` é outra linha de outro gerador) e o **A25 não pode passar por construção** — e, no intervalo dele, é vermelho por causa dos merges que a §15.10 mandou fazer. É a classe do C2-01/C2-02 do lado da régua: critério que reconhece uma FORMA (um número, um número de linha, um intervalo two-dot) em vez de enunciar a propriedade. **Nenhuma decisão da §16 muda; nada do produto muda; o dev não refaz código nem teste.**

### 16-bis.1 Medido (resumo; comando e saída completos na trilha)

| Item | Comando | Saída |
|---|---|---|
| N do arnês | `node plc2b-arnes.mjs <wt> 92cfc05e 653532f7 feb0d838 a73fb35f` (Apêndice F3; AST do TypeScript sobre o blob) | errata e ciclo 1: N = **3** (T12, T13, T14); `a73fb35f`: N = **6** (T12, T13, T14, T20, T21, T22); chamadas `runCenso(` = N nos quatro; texto de `runCenso` (`fdf1a8cc…`) e de `mutate` (`c6663a49…`) **idênticos** em `92cfc05e` e `a73fb35f` |
| A17′ no objeto | `timeout: 1,` no `spawnSync` de `runCenso`, terreno CRLF, `node --test` do arquivo do bloco | `a73fb35f`: `# tests 24 # pass 18 # fail 6`; `not ok` = {T12, T13, T14, T20, T21, T22}; `gerador (não executou\|morto por sinal)` = 6 (todos `ETIMEDOUT` → `gerador não executou`); `ERR_ASSERTION` = 0. Sem os dois `throw`: `ERR_ASSERTION` = 6, exceção do arnês = 0. Controle em `feb0d838`: `# fail 3`, {T12, T13, T14}, 3 e 0 |
| A18′ no objeto | varredura v2 (`646b1371…`) com base `b404815c` (= merge-base) | `MUT=9 · EOL=3 · CP=1 · TETO=0 · NULL=0 · WRITE=4`; a `censo.mjs:42` do v1 (`/\.(ts\|tsx)$/.test(name)`, `653532f7`) e a do v2 (`/[.](ts\|tsx)$/.test(name)`, `a73fb35f`) são linhas diferentes de geradores diferentes, de mesma natureza |
| A18′ pela posição na AST | `node plc2b-classifica.mjs <wt> <merge-base> <varredura>` (Apêndice F1) | html 3 · normalizador 1+1 · `mutate(` 5+1 · nome de arquivo 1 · arnês 1 · CLASSE **0** → verde. V1 `status ?? 1` → `NULL=1`, vermelho; V2 sem o normalizador → `EOL=2` e "(m) sem (n)", vermelho; **V3 regex do T14 fora de `mutate(`** → `MUT=9 · EOL=3` (**os totais do A18′ passam**) e 2 hits na CLASSE, vermelho |
| A25 no intervalo dele | `git diff --name-only 5f6aaf56 defa502e -- scripts frontend/src frontend/package.json <os 2 fixtures> .github` | **5 caminhos → vermelho**: `frontend/package.json` + 4 de `frontend/src` trazidos pelo merge `5c8efa08` (main `3e40a256` = #402); 4 merges no intervalo, todos mandados pela §15.10. Linha da 15-bis.8 (`git diff 92cfc05e defa502e -- <arquivo do bloco>`): 0 linhas, verde |
| A25 pelo delta próprio | `bash plc2b-delta-proprio.sh <repo> S E <pathspec>` (Apêndice F2; `patch-id --stable` do patch do bloco contra a `main` em S e em E) | errata: próprio = `patios-dossie-versao.smoke.test.tsx` (permitido) + `frontend/package.json`, este **artefato de linha única compartilhada** (o bloco acrescenta o mesmo conjunto `{tests/patios-dossie-versao.smoke.test.tsx}` ao `test:smoke` em S e em E; o #402 editou a mesma linha); da-main = os 4 de `frontend/src`. Ciclo 2 (`653532f7..a73fb35f`): próprio = os 6 da tabela 16.3, da-main 0; `frontend/package.json`, `.github/**` e o fixture de impressão intocados. Controle: `global.css` alterado na árvore → 7 próprios, `global.css` entre eles |
| T22 | `node plc2b-t22.mjs <wt>` (Apêndice F4; `parseDiagnostics` do TypeScript sobre o DTO do head) | original 0 · **só a abertura (o T22 commitado, l.549) 0** · **abertura + fecho `}))),` (o texto da tabela de testes da §16.5) 2** (`34: ',' expected. \| 34: Property assignment expected.`) |

### 16-bis.2 Critérios — para o objeto do ciclo 2, SUBSTITUEM A17′, A18′ e A25 (com a linha que a 15-bis.8 lhe acrescentou); o texto do T22 é corrigido

| # | Critério (verde) | Mutação que o deixa VERMELHO | Onde |
|---|---|---|---|
| A17″ (substitui A17′) | P-A por comportamento, com **N gerado**: N = número de `test(...)` de topo do arquivo do bloco que chamam `runCenso`, contado pela AST do TypeScript **no blob do objeto** (Apêndice F3), e o total de chamadas `runCenso(` no arquivo = N. Com a **única** mutação `timeout: 1,` nas opções do `spawnSync` de `runCenso`, terreno CRLF: `# fail N`; o **conjunto dos nomes** dos `not ok` = o conjunto dos N (por nome, não por contagem); **cada** `not ok` é exceção nomeada do arnês — `grep -cE "gerador (não executou\|morto por sinal)"` = N (as duas vias de morte continuam nomeadas: `result.error` e `result.status === null`), `grep -c ERR_ASSERTION` = 0, `deve deixar gerador vermelho` = `deve reportar` = `espelho sem descarte` = 0 —; arquivo restaurado (`git diff --stat` vazio). Hoje N = 6. | além do teto, remover os dois `throw` de `runCenso` → `ERR_ASSERTION` = N e exceção do arnês = 0 (a morte vira asserção; medido: 6 e 0) | dev (controle no head empurrado) · C2′ |
| A18″ (substitui A18′) | Varredura v2 (15-bis.7, md5 `646b13719214cedd6cc8fbd6296364e5`) com base = **`git merge-base origin/main HEAD`** (não o nome `origin/main`: se a `main` andar sem novo merge, o two-dot conta o que a `main` mudou): `TETO=0 · NULL=0 · CP=1`, e **cada** hit `EOL`/`MUT`/`CP` classificado pela **posição na AST**, não pelo número da linha (Apêndice F1). Fora da classe só: (n) o normalizador `.replace(/\r\n/g, "\n")` dentro de `function mutate`; (m) dentro do callback de uma chamada `mutate(` — **e só porque (n) existe**: sem o normalizador, (m) é a classe; (h) `MUT` `.replace(/<[^>]*>/g, " ")` sobre HTML renderizado; (f) `EOL` `$` sobre NOME de arquivo (`/…$/.test(name)`) no gerador; `CP` só dentro de `function runCenso`. **Zero hit fora dessas classes**, e cada hit (m) é lido (o instrumento supõe que o callback opera sobre o próprio argumento; hoje há 1, a regex do T14). Hoje: MUT 9 = h 3 + n 1 + m 5; EOL 3 = n 1 + m 1 + f 1; CP 1. | V1 `exitCode: result.status ?? 1` → `NULL=1`; V2 sem o normalizador → `EOL=2` e "(m) sem (n)"; V3 a regex do T14 fora de `mutate(` (`writeFileSync(p, readFileSync(p, "utf8").replace(/\s*supersededByRunId:.*\n/, "\n"))`) → totais **iguais** aos do A18′ (`EOL=3`, `MUT=9`) e 2 hits na classe — o caso que o literal deixava passar | dev (instrumento) · C3′ |
| A25″ (substitui A25 + a linha da 15-bis.8) | "O diff da correção fica dentro do escopo", medido como **delta próprio** do bloco no intervalo do ciclo **[`653532f7`, objeto]**, separado do que a `main` trouxe por merge (Apêndice F2: `p` é próprio sse o `patch-id --stable` de `git diff $(git merge-base origin/main X) X -- p` difere entre X = `653532f7` e X = objeto): (a) delta próprio ⊆ tabela 16.3 + emendas 16.4 — hoje, em código e teste, os 6 (painel, impressão `1 1`, adapter, fixtures do checklist, arquivo do bloco, gerador); `frontend/package.json`, `.github/**` e `patios-dossie-print.smoke.test.tsx` **fora** do delta próprio; (b) **o arnês da errata intocado** — md5 EOL-neutro do texto das funções `runCenso` e `mutate` pela AST (Apêndice F3) no objeto = em `92cfc05e` (`fdf1a8cc91c9ab9389eaed5490447b21` · `c6663a49f7a0913e7981b5e8608c004a`): é isso que a linha da 15-bis.8 protegia, e o E13 muda o arquivo, não o arnês; (c) caminho marcado próprio cujo conteúdo próprio é o mesmo em S e em E (linha única compartilhada com a `main`, como a lista `test:smoke`) é **declarado com a comparação de conteúdo** (`comm` do conjunto que o bloco acrescenta), nunca absolvido em silêncio. | (a) alterar `frontend/src/styles/global.css` → `global.css` no delta próprio, fora do 16.4 (medido na árvore: 7 próprios); (b) `timeout: 1,` em `runCenso` → `781ff0e7…` ≠ `fdf1a8cc…`; sem o normalizador → `mutate` `8b899f03…` ≠ `c6663a49…` | dev (cola no DEV-relatorio) · C3′ |
| T22 (texto corrigido) | gerador, cópia com **só a abertura** `runs.map((run) => ({` → `runs.map((run) => Object.freeze({` no DTO via `mutate` — o fecho `})),` fica, porque já fecha os dois — → `L0 VAZIO (emissor ilegível): SIM` + exit 1; a cópia mutada tem **0 diagnósticos sintáticos** (`parseDiagnostics` do TypeScript, Apêndice F4): o vermelho vem da propriedade (emissor que funciona mas não é literal de objeto), não de um arquivo quebrado. É a forma commitada em `a73fb35f` (l.549), a M6 da §16 e a do corpo da C2′ (l.275). | a forma "abertura + fecho `}))),`" do texto antigo → 2 diagnósticos sintáticos (o vermelho deixa de provar a propriedade) | C2′ (mede os 0 diagnósticos) |

**A37 — mesma classe, emenda de MÉTODO (o critério fica):** o "`git diff --name-only 653532f7 HEAD` sem …" vira leitura auxiliar; o que vale é o **delta próprio** do mesmo intervalo (Apêndice F2) ⊆ 16.4. Hoje os dois coincidem (o único merge do ciclo 2, `77abde50`, trouxe só registro do #404: 21 tocados, 16 próprios, 5 da `main`, nenhum em código), mas, se a `main` andar com código e o ramo a integrar de novo antes do push, o two-dot reprovaria por construção.

### 16-bis.3 Intervalos — onde cada um se mede
- **A17″:** o objeto da junta (o head do ciclo 2 empurrado), terreno CRLF; N recontado no blob do objeto — nunca herdado deste texto.
- **A18″:** os arquivos de `git diff --name-only $(git merge-base origin/main HEAD) HEAD -- frontend/tests scripts` (o bloco inteiro contra a `main` integrada), conteúdo do objeto.
- **A25″:** (a) e (c) no intervalo `[653532f7, objeto]` pelo delta próprio; (b) `92cfc05e` × objeto (o arnês nasceu na errata).
- **A37:** o mesmo intervalo do A25″(a), pelo delta próprio.
- **A25 no intervalo DA ERRATA** (`5f6aaf56..defa502e`): **não se cobra no ciclo 2** — é critério do objeto da junta 1 (`defa502e`), que não é o objeto desta junta — e fica registrado como medido aqui (16-bis.1): o literal é vermelho só pelo merge; o delta próprio é o arquivo do bloco (permitido) mais a linha compartilhada do `package.json` (mesmo conjunto em S e em E); a linha da 15-bis.8 é verde.

### 16-bis.4 O que o dev faz (fatia D3; sem código novo)
1. **Nada a refazer em código ou teste.** `a73fb35f` já atende os quatro: A17″ (N = 6, 6/6 exceção do arnês, `ERR_ASSERTION` 0; sem os `throw`, 6), A18″ (classe 0), A25″ (6 próprios ⊆ 16.3; arnês intacto) e o T22 corrigido (é a forma commitada).
2. No `DEV-relatorio.md` `## CICLO 2`: os controles A17″ (N gerado e os dois TAP), A18″ (saída do Apêndice F1 e V1/V2/V3) e A25″ (saída do F2 e do F3), **medidos no head empurrado**, e o T22 com os 0 diagnósticos (F4). Se a `main` andar e o ramo a integrar de novo antes do push: A18″ com o novo merge-base, A25″ e A37 pelo delta próprio. O orquestrador acrescenta este item ao mandato da D3 (`dev-ciclo2-D3.md`), que é anterior a esta emenda.
3. **KPI:** esta emenda não move nada (nenhum teste, nenhum código). O `frontend_smoke_tests` continua o do TAP do head empurrado (A36).
4. As divergências que o dev declarou (D2 §4 e o fecho) ficam respondidas aqui — T22 → forma só-abertura; A17′ → A17″; A18′ → A18″; A25 → A25″ — e nenhuma vira pendência.

### 16-bis.5 Corpos das cadeiras do ciclo 2 (em disco em `w-nuv11/.claude/agents/especialistas/`, ainda não versionados)
- **C1′ `jurado-san3-11-c2-afordancia-e-ancora.md`: sem emenda.** Só cita A17′ para dizer que não é dela (l.391).
- **C3′ `jurado-san3-11-c2-registro-e-escopo.md`: emenda OBRIGATÓRIA antes do inspetor.** O vermelho do item 2 (l.338-339) inclui "A25 vermelho no intervalo da errata" — e o literal é vermelho nesse intervalo (5 caminhos, todos de merge ou da linha compartilhada): a cadeira reprovaria por construção. O item 2(d) também mede o A18′ com base no nome `origin/main` e classifica "por leitura".
- **C2′ `jurado-san3-11-c2-enumeracao-tipada.md`: emenda curta, recomendada.** Sem ela a cadeira não reprova por construção (o vermelho dela já é `ERR_ASSERTION > 0`, l.398, e o item 3(b) já manda contar N por script), mas ainda manda publicar "o literal 3" como régua a classificar e não mede os 0 diagnósticos do T22.
- **Texto pronto** abaixo — apensar verbatim ao fim de cada corpo e espelhar em `.agents/agents/especialistas/` por `scripts/sync-agent-agents.mjs`; onde corpo e apenso divergirem, **vale o apenso**. Quem escreve corpo é a `agente-fabrica` (ou o orquestrador apensa este texto verbatim); o orquestrador versiona os dois espelhos antes do inspetor.

**Apenso da C3′:**
```
## Apenso da §16-bis (2026-10-03) — vale sobre o item 2 onde divergir
A §16-bis do plano (no objeto) substitui, para o objeto do ciclo 2, o A18′ pelo A18″ e o A25 (com a linha da 15-bis.8) pelo
A25″, e muda o MÉTODO do A37. Leia-a no blob do objeto antes do item 2 (§A7).
- 2(c) A37: o critério é o DELTA PRÓPRIO do intervalo [653532f7, objeto] (Apêndice F2 da §16-bis: patch-id do patch do bloco
  contra a main em S e em E) ⊆ 16.4; o two-dot `git diff --name-only 653532f7 <objeto>` é leitura auxiliar. Publique as listas
  PRÓPRIO e DA-MAIN.
- 2(d) A18″: base = `git merge-base origin/main <objeto>` (não o nome origin/main); TETO=0 · NULL=0 · CP=1 e cada hit EOL/MUT/CP
  classificado pela POSIÇÃO NA AST (Apêndice F1, ou instrumento seu com a mesma regra): (n) normalizador em `function mutate`;
  (m) callback de `mutate(` — só porque (n) existe; (h) recorte de HTML; (f) `$` sobre nome de arquivo no gerador; CP em
  `function runCenso`; zero hit fora delas; leia cada hit (m). O literal `censo.mjs:42` e `EOL=3` não são régua; publique-os só
  como nota. Vermelho-controle: V3 (regex do T14 fora de `mutate(`) — totais iguais, 2 hits na classe.
- 2(e) A25″: (a) delta próprio de [653532f7, objeto] ⊆ 16.3 + 16.4, sem `frontend/package.json`, `.github/**`,
  `patios-dossie-print.smoke.test.tsx`; (b) md5 EOL-neutro de `runCenso` e `mutate` pela AST (Apêndice F3) no objeto = em
  92cfc05e (`fdf1a8cc91c9ab9389eaed5490447b21` · `c6663a49f7a0913e7981b5e8608c004a`); (c) caminho próprio de linha única
  compartilhada com a main é declarado com a comparação de conteúdo. O A25 no intervalo DA ERRATA (5f6aaf56..defa502e) NÃO se
  cobra: é critério do objeto da junta 1; a §16-bis o mediu (literal vermelho só por merge, que a §15.10 mandou fazer; delta
  próprio permitido; linha da 15-bis.8 verde).
- No vermelho do item 2, onde se lê "A18′ com TETO/NULL > 0, CP ≠ 1, ou MUT de fonte fora de mutate(; A25 vermelho no intervalo
  da errata", leia: "A18″ com TETO/NULL > 0, CP ≠ 1, hit fora das classes (n)(m)(h)(f)/arnês, ou (m) sem (n); A25″ (a) com
  caminho próprio fora de 16.3 + 16.4, ou (b) com md5 do arnês diferente do de 92cfc05e".
```

**Apenso da C2′:**
```
## Apenso da §16-bis (2026-10-03) — vale sobre o item 3 onde divergir
A §16-bis do plano (no objeto) substitui, para o objeto do ciclo 2, o A17′ pelo A17″ e corrige o texto do T22. Leia-a no blob
do objeto antes do item 3 (§A7).
- 3(b) A17″: N = test() de topo que chamam `runCenso`, contados pela AST no blob do objeto (Apêndice F3 da §16-bis, ou
  instrumento seu), e chamadas `runCenso(` = N. Sob `timeout: 1,`: `# fail N`, o CONJUNTO dos nomes dos `not ok` = o conjunto
  dos N, exceção do arnês = N, `ERR_ASSERTION` = 0; sem os dois `throw`: `ERR_ASSERTION` = N. O literal `3` do A17′ não é régua
  no ciclo 2 — não o publique como divergência a classificar. Vermelho: conjunto diferente, `ERR_ASSERTION` > 0 sob o teto, ou
  exceção do arnês < N.
- 3(a) T22: a mutação certa é SÓ a abertura (`runs.map((run) => ({` → `runs.map((run) => Object.freeze({`; o fecho `})),`
  fica). Meça por `parseDiagnostics` do TypeScript (Apêndice F4, ou seu) que a cópia mutada do DTO tem 0 diagnósticos
  sintáticos — o `ok` do T22 tem de vir da propriedade, não de um arquivo quebrado. A forma "abertura + fecho `}))),`" (texto
  antigo da tabela da §16.5) dá 2 diagnósticos e não serve de prova.
```

### 16-bis.6 Riscos, residuais declarados e rollback
- **R-bis1 (linha compartilhada):** o patch-id marca como próprio um caminho em que o bloco e a `main` editam a MESMA linha (medido: `frontend/package.json` no intervalo da errata). Regra (c) do A25″: declarar com a comparação de conteúdo — nunca absolver em silêncio, nunca reprovar sem olhar o conteúdo.
- **R-bis2 (callback que lê outro arquivo):** a classe (m) do A18″ supõe que o callback de `mutate(` opera sobre o argumento já normalizado; um callback que lesse outro arquivo cru escaparia do instrumento. Mitigação: cada hit (m) é lido (hoje 1).
- **R-bis3 (guarda do T22):** o T22 asserta que a mutação aplicou, mas não que a cópia continua parseável; trocar a âncora por uma forma quebrada o deixaria verde pelo motivo errado. Residual de guarda, não defeito presente: a C2′ mede os 0 diagnósticos neste objeto, e mudança futura da âncora é edição do teste, julgada pela junta que a receber. Sem pendência.
- **R-bis4 (`main` andando antes do push):** A18″ pelo merge-base e A25″/A37 pelo delta próprio não enxergam o que a `main` mudou sem merge e separam o que entrou por merge.
- **Rollback:** retirar a §16-bis devolve a §16.5 com as três impossibilidades medidas acima. Sem código, sem dado, sem migration.

### Apêndice F — instrumentos da §16-bis (verbatim; ficam FORA do repositório como código, como a varredura da §15.7; **mover por arquivo, nunca por heredoc em Bash nem por `node -e`** — carregam barras invertidas que o transporte colapsa, e isso se reproduziu de novo nesta emenda)

#### F1 — `plc2b-classifica.mjs` — classificador do A18″ pela posição na AST (chama a varredura v2 da §15-bis.7) (md5 EOL-neutro `3702f28f8ca899543597fea02a60c320`, 63 linhas)
```js
// plc2b: roda a varredura v2 (646b1371) e CLASSIFICA cada hit pela posicao na AST (nao pelo numero da linha).
// Uso: node classifica.mjs <worktree> <base-ref = $(git merge-base origin/main HEAD)> [<varredura v2, md5 646b1371>]
// Classes fora do defeito: EOL-nome (regex sobre nome de arquivo: `.test(name)` no gerador) · EOL/MUT-norm (o normalizador
//   `.replace(/\r\n/g, "\n")` dentro de `function mutate`) · EOL/MUT-mutate (dentro do callback de uma chamada `mutate(`)
//   · MUT-html (`.replace(/<[^>]*>/g, " ")` sobre HTML renderizado) · CP-arnes (dentro de `function runCenso`).
// Qualquer outro hit EOL/MUT/CP = CLASSE (vermelho). TETO/NULL > 0 = vermelho. EOL-mutate so e legitimo se o normalizador existe.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const [wt, base, varr] = process.argv.slice(2);
const here = dirname(fileURLToPath(import.meta.url));
const out = execFileSync(process.execPath, [varr ?? join(here, "san3-11-errata1-varredura.mjs"), wt, base], { encoding: "utf8" });
const require = createRequire(join(wt, "frontend", "package.json"));
const ts = require("typescript");
const NORMALIZADOR = String.raw`.replace(/\r\n/g, "\n")`;
const ranges = {};
const rangesOf = (file) => {
  if (ranges[file]) return ranges[file];
  const text = readFileSync(join(wt, file), "utf8").replace(/\r\n/g, "\n");
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const line = (pos) => sf.getLineAndCharacterOfPosition(pos).line + 1;
  const r = { mutateFn: null, runCensoFn: null, mutateCalls: [] };
  const visit = (n) => {
    if (ts.isFunctionDeclaration(n) && n.name?.text === "mutate") r.mutateFn = [line(n.getStart(sf)), line(n.end)];
    if (ts.isFunctionDeclaration(n) && n.name?.text === "runCenso") r.runCensoFn = [line(n.getStart(sf)), line(n.end)];
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "mutate" && n.arguments[1]) r.mutateCalls.push([line(n.arguments[1].getStart(sf)), line(n.arguments[1].end)]);
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return (ranges[file] = r);
};
const inR = (l, r) => r && l >= r[0] && l <= r[1];
const tally = {}; const classe = [];
let totals = "";
for (const row of out.split("\n")) {
  if (row.startsWith("# TOTAIS")) { totals = row; continue; }
  const m = row.match(/^(.+?):(\d+) \| (\w+) \| (.*)$/);
  if (!m) continue;
  const [, file, ln, klass, txt] = m; const l = Number(ln);
  let c = null;
  if (file.startsWith("scripts/")) {
    if (klass === "EOL" && /\/\S*\$\/\.test\(name\)/.test(txt) && !/readFileSync|\.replace\(/.test(txt)) c = "EOL-nome";
  } else {
    const r = rangesOf(file);
    if (inR(l, r.mutateFn) && (klass === "EOL" || klass === "MUT") && txt.includes(NORMALIZADOR)) c = `${klass}-norm`;
    else if (r.mutateCalls.some((x) => inR(l, x)) && (klass === "EOL" || klass === "MUT")) c = `${klass}-mutate`;
    else if (klass === "MUT" && txt.includes(`.replace(/<[^>]*>/g, " ")`) && !/readFileSync/.test(txt)) c = "MUT-html";
    else if (klass === "CP" && inR(l, r.runCensoFn)) c = "CP-arnes";
    else if (klass === "WRITE") c = "WRITE";
  }
  if (["TETO", "NULL"].includes(klass)) c = null;
  const key = c ?? `CLASSE-${klass}`;
  tally[key] = (tally[key] ?? 0) + 1;
  if (!c) classe.push(`${file}:${l} | ${klass} | ${txt.slice(0, 100)}`);
}
console.log(totals);
console.log("# por classe:", Object.entries(tally).map(([k, v]) => `${k}=${v}`).join(" · "));
console.log(`# CLASSE (vermelho) (${classe.length}):`); for (const c of classe) console.log("  " + c);
const normOk = !(tally["EOL-mutate"] > 0) || tally["EOL-norm"] === 1;
console.log(`# normalizador em mutate (exigido se ha EOL-mutate): ${normOk ? "sim" : "NAO"}`);
console.log(`# VEREDITO A18: ${normOk && classe.length === 0 && /TETO=0/.test(totals) && /NULL=0/.test(totals) && /CP=1\b/.test(totals) ? "verde" : "VERMELHO"}`);
```

#### F2 — `plc2b-delta-proprio.sh` — delta próprio do bloco num intervalo, separado do merge (A25″, A37) (md5 EOL-neutro `ac50331715f6344b3629a3dc67a88330`, 22 linhas)
```bash
#!/usr/bin/env bash
# plc2b: delta PROPRIO do bloco num intervalo [S,E] do ramo, separado do que veio da main por merge.
# Para cada caminho tocado em S..E (two-dot), compara o patch do BLOCO contra a main em S e em E:
#   P(x,p) = git diff $(git merge-base origin/main x) x -- p   (o que o bloco muda em p, visto em x)
# p e do delta proprio de [S,E] sse patch-id(P(S,p)) != patch-id(P(E,p)). Caminho que so a main mexeu: P(S)=P(E) (vazio ou igual).
# E=WT mede a ARVORE de trabalho contra o HEAD dela (para controle por mutacao sem commit).
# Uso: bash plc2b-delta-proprio.sh <repo> <S> <E|WT> [pathspec...]
set -u
repo=$1; S=$2; E=$3; shift 3
mbS=$(git -C "$repo" merge-base origin/main "$S")
if [ "$E" = WT ]; then mbE=$(git -C "$repo" merge-base origin/main HEAD); else mbE=$(git -C "$repo" merge-base origin/main "$E"); fi
echo "# S=$S (mb $mbS) · E=$E (mb $mbE) · pathspec=${*:-<tudo>}"
pid() { if [ "$2" = WT ]; then git -C "$repo" diff "$1" -- "$3"; else git -C "$repo" diff "$1" "$2" -- "$3"; fi | git -C "$repo" patch-id --stable | cut -d' ' -f1; }
names() { if [ "$E" = WT ]; then git -C "$repo" diff --name-only "$S" -- "$@"; else git -C "$repo" diff --name-only "$S" "$E" -- "$@"; fi; }
n_all=0; n_own=0; n_main=0
while IFS= read -r p; do
  [ -z "$p" ] && continue
  n_all=$((n_all+1))
  a=$(pid "$mbS" "$S" "$p"); b=$(pid "$mbE" "$E" "$p")
  if [ "$a" != "$b" ]; then n_own=$((n_own+1)); echo "PROPRIO  $p"; else n_main=$((n_main+1)); echo "DA-MAIN  $p"; fi
done < <(names "$@")
echo "# tocados S..E=$n_all · proprio=$n_own · so-da-main=$n_main"
```

#### F3 — `plc2b-arnes.mjs` — N do arnês e md5 do texto de runCenso/mutate pela AST, por ref ou árvore (A17″, A25″(b)) (md5 EOL-neutro `2519a717e6a5fbdca26a94fcbd73c77e`, 43 linhas)
```js
// plc2b: pela AST do TypeScript (frontend/node_modules), no BLOB de cada ref:
//  (1) quais test(...) de topo chamam runCenso (N e nomes) — a fonte do numero do A17;
//  (2) md5 EOL-neutro do texto das funcoes runCenso e mutate (o arnes da §15) em cada ref.
// Uso: node plc2b-arnes.mjs <worktree-com-frontend/node_modules> <ref> [<ref> ...]
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
const [wt, ...refs] = process.argv.slice(2);
const require = createRequire(join(wt, "frontend", "package.json"));
const ts = require("typescript");
const FILE = "frontend/tests/patios-dossie-versao.smoke.test.tsx";
const md5 = (s) => createHash("md5").update(s.replace(/\r/g, "")).digest("hex");
for (const ref of refs) {
  const text = (ref === "WT" ? readFileSync(join(wt, FILE), "utf8") : execFileSync("git", ["-C", wt, "show", `${ref}:${FILE}`], { encoding: "utf8", maxBuffer: 1 << 26 })).replace(/\r\n/g, "\n");
  const sf = ts.createSourceFile(FILE, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const callers = [], nonCallers = [];
  const fnText = {};
  const callsIdent = (node, name) => {
    let found = false;
    const visit = (n) => { if (found) return; if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === name) { found = true; return; } ts.forEachChild(n, visit); };
    visit(node);
    return found;
  };
  for (const st of sf.statements) {
    if (ts.isFunctionDeclaration(st) && st.name && ["runCenso", "mutate"].includes(st.name.text)) fnText[st.name.text] = st.getText(sf);
    if (ts.isExpressionStatement(st) && ts.isCallExpression(st.expression) && ts.isIdentifier(st.expression.expression) && st.expression.expression.text === "test") {
      const arg0 = st.expression.arguments[0];
      const name = arg0 && (ts.isStringLiteral(arg0) || ts.isNoSubstitutionTemplateLiteral(arg0)) ? arg0.text : "<nome nao literal>";
      const id = name.split(":")[0];
      (callsIdent(st.expression, "runCenso") ? callers : nonCallers).push(id);
    }
  }
  // chamadas a runCenso FORA de test(...) de topo (fail-closed: tem de ser 0, senao o N nao descreve o arnes)
  let total = 0;
  const visitAll = (n) => { if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "runCenso") total++; ts.forEachChild(n, visitAll); };
  visitAll(sf);
  console.log(`# ref ${ref} · test() de topo = ${callers.length + nonCallers.length} · parseDiagnostics = ${sf.parseDiagnostics.length}`);
  console.log(`  N (test() que chamam runCenso) = ${callers.length}: ${callers.join(", ")}`);
  console.log(`  chamadas runCenso( no arquivo = ${total}`);
  console.log(`  md5 EOL-neutro runCenso = ${fnText.runCenso ? md5(fnText.runCenso) : "AUSENTE"} · mutate = ${fnText.mutate ? md5(fnText.mutate) : "AUSENTE"}`);
}
```

#### F4 — `plc2b-t22.mjs` — diagnósticos sintáticos das duas formas da mutação do T22 (md5 EOL-neutro `45ffba039567b921d2b252bd929720a8`, 25 linhas)
```js
// plc2b: as duas formas da mutacao do T22 sobre o DTO do head — diagnosticos SINTATICOS do TypeScript e saida do emissor.
// Uso: node plc2b-t22.mjs <worktree>
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
const wt = process.argv[2];
const require = createRequire(join(wt, "frontend", "package.json"));
const ts = require("typescript");
const DTO = "src/modules/impound/impound.checklist-link.dto.ts";
const src = readFileSync(join(wt, DTO), "utf8").replace(/\r\n/g, "\n");
const OPEN = "runs.map((run) => ({", OPEN2 = "runs.map((run) => Object.freeze({";
const count = (s, a) => s.split(a).length - 1;
console.log(`abertura '${OPEN}' no DTO: ${count(src, OPEN)} · fecho '})),' no DTO: ${count(src, "})),")}`);
const openIdx = src.indexOf(OPEN);
const closeIdx = src.indexOf("})),", openIdx);
const forms = {
  original: src,
  "so-abertura (o T22 commitado, l.549)": src.replace(OPEN, OPEN2),
  "abertura+fecho (o texto da §16.5)": src.slice(0, closeIdx).replace(OPEN, OPEN2) + "}))),"+ src.slice(closeIdx + "})),".length),
};
for (const [name, text] of Object.entries(forms)) {
  const sf = ts.createSourceFile(DTO, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const diags = sf.parseDiagnostics.map((d) => `${sf.getLineAndCharacterOfPosition(d.start).line + 1}: ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`);
  console.log(`- ${name}: diagnosticos sintaticos = ${diags.length}${diags.length ? " -> " + diags.join(" | ") : ""}`);
}
```

**Fim da §16-bis.**
