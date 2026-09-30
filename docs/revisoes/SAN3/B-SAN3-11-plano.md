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
