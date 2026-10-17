# Relatório de Execução — B-O6R-07c-b1 (DEV)

- **Identidade:** `dev-b-o6r-07c-b1-argon`
- **Modelo / Ambiente:** Antigravity com **Gemini 4 Argon (esforço médio)** — nível menor do contrato, o mesmo do Codex e do Opus (decisão do dono de 16/10: *"sim, use o argon"*).
- **Worktree:** `C:/Users/AMP/w-07cb1` · **Ramo:** `fix/o6r07cb1-despacho-atribui` · **Base (`origin/main`):** `4fe7524e`
- **Insumos lidos inteiros:**
  - `docs/revisoes/SAN3/B-O6R-07c-b-emenda-2026-10-15.md`
  - `docs/revisoes/SAN3/B-O6R-07c-plano.md` (seções 07c-b e comum)
  - `origin/docs/criticas-planos-16-10:docs/revisoes/SAN3/B-O6R-07c-b1-critica.md` (veredito: `APROVA COM AJUSTES`)
  - `agent-orchestration/controle/decisoes.md` (`D1-07c`, `D2-07c`, `D3-07c`, `D-07CB-EMENDA-RECOMENDACOES`)

---

## Passo 1 — Preparação do worktree e leitura das fontes

- **Comando:** `Get-PSDrive C; git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios fetch origin; git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios worktree add -b fix/o6r07cb1-despacho-atribui C:/Users/AMP/w-07cb1 origin/main`
- **Saída resumida:** Disco C com `17,95 GB` livres (> 8 GB exigidos). Worktree criado em `C:/Users/AMP/w-07cb1` apontando para `4fe7524e` (`origin/main`).
- **Veredito parcial:** PASSO 1 OK.

---

## RETOMADA — dev-b-o6r-07c-b1-opus

- **Identidade:** `dev-b-o6r-07c-b1-opus` (nova). **Modelo:** Claude Opus (5.5), **nível menor do contrato (§C7.6), declarado**. Implementa o plano; não o reescreve, não julga o mérito, não vota.
- **Herança (P3):** o dev anterior (`dev-b-o6r-07c-b1-argon`, Gemini 4 Argon) deixou 10 arquivos modificados, NÃO commitados (+673/−31), sem nenhum teste executado (o próprio log diz "a execução de testes não foi permitida; tudo vem de leitura"). Tratado como rascunho de terceiro: medido antes de confiado.
- **Mandato:** `C:/Users/AMP/erp-pausa-2026-10-03/prompts/dev-07cb1.txt` ("Codex" lido como "eu").

### R0 — terreno e leitura
- `git -C C:/Users/AMP/w-07cb1 branch --show-current; git log -1` → `fix/o6r07cb1-despacho-atribui`, HEAD `4fe7524e` (= base). `git diff --stat` → 10 arquivos, +673/−31 (o herdado).
- `Get-PSDrive C` → 16,7 GB livres (> 8 GB).
- Lidos inteiros: emenda `B-O6R-07c-b-emenda-2026-10-15.md`, plano-base §Resumo, §C.1, §C.2, §07c-a (contexto do guard) e §07c-b.1–b.7; crítica `B-O6R-07c-b1-critica.md` (o ramo `origin/docs/criticas-planos-16-10` não existe mais; li em `origin/main`, onde entrou pelo #437); `decisoes.md:3654-3667` (`D1-07c`, `D2-07c`, `D3-07c`, `D-07CB-EMENDA-RECOMENDACOES` P1–P8).
- **Veredito parcial:** terreno OK; insumos presentes.

### R1 — o herdado, lido contra o plano + crítica (antes de qualquer execução)
- `npm run check` (Windows, tsc) no herdado → **2 erros** `TS2459` em `checklist.service.ts:36` (`Permission`/`Role` não exportados de `core-saas.types.js`). **O herdado não compilava.**
- Leitura arquivo a arquivo (veredito por item; a coluna final do relatório consolida "mantido / corrigido / acrescentado"):
  - `work-order.service.ts` — `assignFromDispatch` (novo método, não passa pela trava `open→assigned`, mantém status fora de `open`, recusa OS terminal): **de acordo com a emenda**, mas grava `assigned_operator_id = userId` sempre; a emenda manda **o perfil resolvido, na falta dele o userId** → a corrigir. `assertMutationObjectScope` ganhou um terceiro ramo `assignedUserId === actor.userId`: **diverge** da emenda ("um critério só: o casamento duplo de M1") → a reverter. `setMileage` ganhou um desvio "se o valor já está gravado, trata o ex-técnico como nunca-técnico": regra de produto inventada para manter verde um teste do 07c-a que a D2(d) contradiz → a remover (o teste afetado é tratado no passo próprio, declarado).
  - `work-order.types.ts` — `AssignWorkOrderFromDispatchInput`, `workOrderNotAssignedError(wasPreviouslyAssigned)`: mantidos com ajuste. **Nota de escopo:** `work-order.types.ts` está no PERMITIDO da emenda.
  - repositórios de OS (`assignFromDispatch` em transação Prisma; `hasActorBeenAssigned`) — de acordo; mantidos (o memory não guarda `vehicleId/teamId` vazios — ok).
  - `field-dispatch.service.ts` — atribui no `create` DEPOIS de criar o despacho, compensa apagando o despacho; `reassign` atribui e compensa restaurando; `draft` não atribui e `draft→assigned` atribui; cancelar/falhar move a atribuição para o despacho ativo mais recente, se houver; OS terminal recusada com 409. Ordem e compensação = o que a crítica (ajustes 2, 3, 4) pediu que fosse declarado. **Falta:** `draft→assigned` por papel de campo deixaria o técnico atribuir a si mesmo (escalada) → a fechar. `assertDispatchMutationScope` (alvo do despacho, D-07c-DESPACHO-ALVO, CA8): de acordo.
  - repositórios de despacho (`deleteById`, `restoreState`) — de acordo.
  - `checklist.service.ts` / `.controller.ts` — `assertRunMutationScope` (run → OS → `getForMutation`, run sem OS nega) chamado nas 6 rotas antes do parse e nos métodos de escrita: de acordo; o import de tipos quebra o `tsc` → a corrigir.
  - `mobile-checklist-sync.ts` — escopo depois da idempotência por `client_action_id` e ANTES da idempotência por estado: de acordo com D-07c-IDEMP; conflito do ex-técnico em `actionErrorResult`: de acordo. `handleAnswer` mudou a validação de `component_id` sem motivo → a reverter para a original.
  - **Não feito pelo herdado:** `mobile-evidence-sync.ts` (3 tipos `work_order_*` sem escopo nenhum), `mobile-evidence-upload.ts` (E-UP, por `receipt.workOrderId` — ajuste 5 da crítica), `mobile-work-order-sync.ts` (status e km como conflito, D2(d)), o backfill P6, o instantâneo/T11, e **todos** os testes.
- **Veredito parcial:** herdado é base aproveitável, com 4 correções e 5 lacunas; nada dele foi executado ainda.

### R2 — correções e lacunas do produto (código)
- **Corrigido (herdado):** `assertMutationObjectScope` volta ao casamento duplo do 07a (perfil OU user id em `assigned_operator_id`), sem o ramo `assignedUserId`; o desvio de `setMileage` foi removido (a km do ex-técnico segue a mesma regra de todos: conflito, D2(d)); `assignFromDispatch` grava `assigned_operator_id` = perfil resolvido do alvo (via `resolveActorOperatorProfileId`), na falta o user id, `assigned_user_id` = user id, `dispatchId` obrigatório, mensagens acentuadas; `AssignWorkOrderFromDispatchInput` enxuto (sem viatura/equipe, que o despacho não manda); `checklist.service.ts` compila (tipos de papel/permissão vêm de `WorkOrderActorContext`), recusa vira a classe `ChecklistRunNotAssignedError(wasPreviouslyAssigned)`; `handleAnswer` volta à ordem original (valida `component_id` → idempotência por `client_action_id` → escopo); a devolução da atribuição ao cancelar/falhar só age se o despacho fechado é o do técnico atual da OS, e a falha vai ao log (pino) com motivo, não a um `catch {}` mudo.
- **Acrescentado:** `isPreviouslyAssignedRefusal` + constantes `assignment_changed_pending_review` / `await_supervisor_review` em `work-order.types.ts` (um critério só para os 4 lugares); `mobile-work-order-sync.ts` devolve conflito ao ex-técnico (status e km); `mobile-evidence-sync.ts` passa os 3 `evidence.work_order_*` pela porta da OS (`getForMutation`) antes de validar o metadado, com ramo de conflito (antes: só `rejected`, e sem conferir que a OS existia); `mobile-evidence-upload.ts` confere o escopo de novo depois do recibo, pela OS do RECIBO (crítica, ajuste 5), 409 `assignment_changed_pending_review` ao ex-técnico (o app preserva o blob em 409), 403 a quem nunca foi; o recibo passa a expor o `scope`; `assertMayActivateDraft` (o papel de campo não ativa o próprio rascunho: ativar atribui a OS); `createRun` com escopo quando a vistoria é de OS (plano 07c-b.4).
- `npm run check` → exit 0; `npm run lint` (= check) → exit 0.
- **Veredito parcial:** produto compilando; nada executado ainda.

### R3 — `npm test` no container (forma da CI), primeira medida depois de R2 (antes dos testes novos)
- `bash teste-linux.sh C:/Users/AMP/w-07cb1 "npm test"` → `# tests 3335 · pass 3260 · fail 73 · skipped 2` (ec=1). Falhas agrupadas: despacho (field-dispatch*, checklist-snapshot-dispatch, multi-checklist, ~40), evidência (sync e upload, ~11), censo 07c-a (T0–T12 — o instantâneo/tabela recém-mudados), `S-KM-RESTART` do 07c-a (esperado: D2(d) muda o balde do ex-técnico), `san3-05`/`T13 ratchet` (inventário de acessos — métodos novos de repositório).
- (Execução interrompida por queda de rede depois disto; retomada: `git status` igual ao de antes, sem cópia `w-07cb1-mut` de pé.)
- **Veredito parcial:** triagem necessária, arquivo a arquivo.

### R4 — triagem das 73 falhas de R3 (rodadas locais, modo memória; comando · saída · veredito)
- `node --test --import tsx tests/field-dispatch.test.ts` → 4 falhas `operatorUserId must be a valid UUID`: `assignFromDispatch` exigia UUID e o modo memória usa ids não-UUID (o despacho valida só "não vazio"). **Defeito meu**, corrigido (`assertNonEmptyString`). Depois: field-dispatch 4/4, field-dispatch-routes 2/2, target-role 8/8, multi-checklist 15/15, checklist-snapshot-dispatch 15/15, checklist-set-port 9/9.
- `tests/mobile-backend-contracts.test.ts` → 3 falhas: o `tenant_admin` mandava evidência de `work_order_id: "work-order-1"` (OS inexistente) e passou a ser recusado. **Decisão de desenho, declarada:** o lote de evidência e o upload só passam pela porta da OS quando o ator é `assigned_only` (a mesma regra de presença do 07a); para `tenant_wide` o comportamento é o de antes (registro de metadado sem consultar a OS). Depois: 25/25. Os `o6r07b-*` (upload) 36/36 e 19/19.
- `tests/san3-05-acessos-de-plataforma-guard.test.ts` → T13 do B-SAN3-05: 3 chaves novas de acesso Prisma (`assignFromDispatch`, mesmo desenho de `assign`, já congelado). Registradas em `NOVAS` com motivo (o ato consciente que o ratchet exige). **Arquivo fora da lista PERMITIDA da emenda — declarado (§A2)**: qualquer bloco que crie acesso Prisma tem de passar por esta lista. Depois: 35/35.
- `tests/o6r07c-census-guard.test.ts` (local) → 31/31 com o instantâneo reclassificado e o T11 vazio.
- `tests/o6r07c-subresource-scope.test.ts` → `S-KM-RESTART` 2º reenvio: esperado `rejected`, veio `conflict`. É a D2(d) do dono (ex-técnico → conflito, inclusive km). **Asserção ajustada** (classe (ii): o teste afirmava o comportamento que a decisão muda), com comentário; **arquivo do 07c-a, fora da lista PERMITIDA da emenda — declarado (§A2)**. A alternativa (o desvio herdado em `setMileage`) foi rejeitada em R1.

### R5 — backfill P6 (escrito; teste em R7)
- `prisma/migrations/20260874000000_backfill_work_order_assignment_from_active_dispatches/migration.sql` (NOVO; autorização nominal P6 de `D-07CB-EMENDA-RECOMENDACOES`). Um `DO $$` só: por organização (GUC setado a cada volta, funciona sob FORCE RLS sem BYPASSRLS), CONTA antes (coerentes / a preencher / divergentes, `RAISE NOTICE` só com totais), PREENCHE só a OS sem atribuição com o alvo do despacho ativo mais recente (perfil ou user id; `open → assigned`; linha em `work_order_assignments` e evento `work_order_assigned` com `metadata.source = field_dispatch_backfill`), NÃO toca divergentes. Idempotente (só escreve onde `assigned_operator_id IS NULL`). Rollback no cabeçalho.
- **Residual declarado (crítica, ajuste 5):** "ex-técnico" = linha em `work_order_assignments`. A partir deste bloco o despacho grava a linha em todo `create`/`reassign`; o alvo de despacho reatribuído ANTES do deploy (só no metadado do evento do despacho) não vira ex-técnico — recebe `rejected`, não conflito. O backfill cobre os ATIVOS (P6), não a história.

### R6 — `tests/o6r07c-b-scope.test.ts` (NOVO, modo memória, app HTTP real)
- Conteúdo: laço G sobre as 23 entradas LIDAS DO INSTANTÂNEO pelas classes novas (G-NEG nunca-técnico → 403/`rejected`; **G-EX** ex-técnico → `conflicts[]` `assignment_changed_pending_review` nos lotes, 409 no upload, 403 no REST de vistoria e no despacho; G-POS; G-WIDE por sonda `operator → tenant_admin → manager → field_dispatcher`, falha se vazio); CA1 (S-DESPACHADO), CA2, CA3 (OS fora de `open` preserva status; OS encerrada → 409 sem gravar despacho; rascunho passa), CA4 (4 famílias em conflito, nada aplicado), CA5 (4 famílias `rejected`), CA8 (Traccar: alvo aceita o próprio despacho, `accepted_at` gravado), CA9 (união), CA10/S-XT (404), S-ORFA, S-ORDEM (escopo antes do parse nas 5 rotas com corpo), S-IDEMP (por `client_action_id` antes do escopo, mesmo após reinício do lote; por estado, escopo antes), E-UP (upload sem o campo `work_order_id` → 409 pela OS do recibo, nada gravado; controle 201), rascunho (técnico não ativa o próprio; despachante ativa e atribui), cancelar/falhar (devolve ao ativo restante; não mexe quando não é o técnico atual; último ativo cancelado mantém), compensação por falha injetada (create não deixa despacho; reassign volta ao alvo anterior).
- 1ª execução: 35/39 — 2 eram o G-POS de "dar ciência" (o conflito de ESTADO `acknowledgement_not_required` é legítimo; a asserção passou a olhar o `conflict_type`), 1 era o cancelamento de OS (rota própria `POST /work-orders/:id/cancel`), 1 era leitura de respostas (não há GET de execução; lida pelo serviço). Correções no TESTE, não no produto.
- `node --test --import tsx tests/o6r07c-b-scope.test.ts` → **39/39**, 5,8 s.

### R7 — `tests/o6r07c-b-scope-db.test.ts` (NOVO, Postgres real no container)
- Casos: [modo]; [atribuição] com perfil → `assigned_operator_id` = perfil, sem perfil → user id, 1 linha em `work_order_assignments` (`source`, `dispatchId`), 1 evento, o atribuído grava km; [ex-técnico] conflito × nunca-técnico `rejected`, banco intacto; [status] OS `accepted` mantém status, OS `completed` → 409 sem linha; [despacho] `restoreState` e `deleteById` no banco; [backfill P6] o corpo REAL da migração, escopado pela âncora do laço (fail-closed + ida-e-volta), avisos capturados (`pg` `notice`): 1ª `coerentes=1, a_preencher=2, divergentes=2, preenchidas=2`, 2ª `coerentes=3, a_preencher=0, divergentes=2, preenchidas=0` e totais idênticos (idempotência); [backfill · FORCE RLS] o mesmo corpo sob papel efêmero NOSUPERUSER sem BYPASSRLS preenche.
- 1ª rodada: 2 falhas de FIXTURE (OS `cancelled` exige decisão financeira pelo CHECK → trocada por `rejected`; a âncora aparecia também no comentário da migração → comentário reescrito, ocorrência única).
- `bash teste-linux.sh w-07cb1 "node --test --import tsx tests/o6r07c-b-scope-db.test.ts"` → **7/7**, ec 0. A migração aplicou no `prisma migrate deploy` do container (o arnês sai com ec 4 se falhar).

### R8 — `npm test` completo no container (2ª medida)
- 1ª tentativa: `teste-linux ec=125` — `error waiting for container: unexpected EOF`; o daemon do Docker caiu/reiniciou (todos os containers da máquina saíram, inclusive `erp-postgres`/`erp-redis` da base viva, que NÃO são meus e NÃO religuei). Ambiente, não teste. Disco 15,0 GB livres. Nova tentativa abaixo.
- 2ª tentativa (`run2`): **`# tests 3397 · pass 3393 · fail 2 · skipped 2`** (ec 1). As 2 falhas são UM teste com subteste: `B-SAN3-05 · o papel de runtime não contorna FORCE RLS` (`tests/san3-05-runtime-role-guard-db.test.ts`). Todas as outras 71 falhas de R3 sumiram; os 62 testes novos entram no N (3335 → 3397).
- Esse teste já falhava em R3 (antes de existir o meu `-db`) e passa ISOLADO no container: `node --test --import tsx tests/san3-05-runtime-role-guard-db.test.ts` → **12/12**. Ele confere o catálogo global de papéis do cluster; sob a suíte inteira, suítes irmãs criam papéis efêmeros em paralelo. Na CI da base (`4fe7524e`, run 38776053535) o job passou. **Classificação: provável concorrência de catálogo sob a suíte inteira deste container, não produto deste bloco (o diff não toca papel, grant nem trava de runtime) — NÃO confirmado**: as três tentativas seguintes de rodar a suíte inteira para capturar a mensagem (21:41, 22:03, 22:16 −03) derrubaram o daemon do Docker (`unexpected EOF`, ec 125) e uma rodada só dos `-db` em paralelo foi morta (ec 137, OOM provável; VM do Docker com 12 GB). Parei de rodar a suíte inteira para não derrubar o Docker de novo; fica para a CI do PR responder.

### R9 — vermelho-controle na BASE (`4fe7524e`), cópia descartável `C:/Users/AMP/w-07cb1-mut` (worktree detached, `npm ci` próprio, `prisma generate` com URL fictícia de porta 1)
- Na cópia: `src/` da base + os testes novos, o instantâneo e a tabela de classes do bloco. `node --test --import tsx tests/o6r07c-b-scope.test.ts` → **3 verdes / 36 vermelhos**. Verdes: a contagem do instantâneo (independe do produto) e os CONTROLES POSITIVOS CA9 (união) e CA10 (404 cross-tenant), que têm de passar na base. Vermelhos, todos pelo defeito, não pelo arnês (motivo lido em cada um): G-NEG `accepted`/200 (vistoria, evidência, despacho: o nunca-técnico escrevia); G-EX upload 201; CA1 "o despacho não gravou assigned_user_id"; S-ORFA 200 do técnico; S-ORDEM 400 (parse antes do escopo); S-IDEMP "por estado, o não atribuído recebeu already_applied"; E-UP 201; rascunho 200 do técnico; cancelar/compensação sem atribuição.

### R10 — vermelho-controle por MUTAÇÃO, uma a uma, na cópia `w-07cb1-mut` (espelho do head conferido EOL-neutro, 39/39 antes; cada mutação aplicada por âncora única, medida, e restaurada byte-idêntica — conferido pelo script)
Roteiro: `python scratchpad/07cb1/mut.py` (memória, `tests/o6r07c-b-scope.test.ts`) e `mutdb.sh`/`mutdb3.sh` dentro de UM container (`tests/o6r07c-b-scope-db.test.ts`; mutação aplicada na cópia do container).
| mutação | resultado | alvo vermelho |
|---|---|---|
| M01 `create` não atribui | 31 vermelhos | CA1 (+ laço G, CA2–CA4, CA8, S-IDEMP, E-UP, cancelar, compensação) |
| M02 `reassign` não atribui | 27 | CA2 (+ G-EX das 22 vias, CA4, S-IDEMP, E-UP, compensação) |
| M03 sem trava de OS encerrada | 1 | CA3 |
| M04 `assignFromDispatch` com a trava `open→assigned` do `assign` (a mutação da emenda) | 1 | CA3 |
| M05 lote de evidência sem ramo de conflito | 4 | CA4 + G-EX das 3 evidências |
| M06 lote de OS sem ramo de conflito | 1 | CA4 |
| M07 lote de vistoria sem ramo de conflito | 15 | CA4 + G-EX das 12 da vistoria + CA2 + CA8 |
| M08 "todo mundo é ex-técnico" | 17 | CA5 + G-NEG dos 15 pares |
| M09 despacho recortado pela ATRIBUIÇÃO da OS (a mutação da emenda) | 2 | CA8 (+ rascunho) |
| M10 despacho: regra "tem papel de campo" | 1 | CA9 |
| M11 run de outra organização vira 403 | 1 | CA10 |
| M12 run sem OS liberada | 1 | S-ORFA |
| M13 controller faz o parse antes do escopo | 1 | S-ORDEM |
| M14 conclusão: idempotência por estado antes do escopo | 1 | S-IDEMP |
| M15 resposta: escopo antes da idempotência por `client_action_id` | 1 | S-IDEMP |
| M16 upload decide pelo campo do formulário | 2 | E-UP (+ G-EX do upload) |
| M17 técnico ativa o próprio rascunho | 1 | rascunho |
| M18 cancelar não devolve ao despacho ativo restante | 1 | cancelar/falhar |
| M19 `create` sem compensação | 1 | compensação |
| M20 `reassign` sem compensação | 1 | compensação |
| M21 lote de evidência sem escopo | 5 | G-NEG/G-EX das 3 evidências + CA4/CA5 |
| M22 escopo da vistoria pega a gestão (porta da run) | 1 | **S-ORFA** (o `operator` na vistoria sem OS). O G-WIDE da vistoria NÃO acende: a porta da OS reaplica a regra de presença. Declarado. |
| M23 vistoria sem escopo nenhum | 25 | laço G das 18 da vistoria + CAs |
| M24 escopo da OS pega a gestão (`assertMutationObjectScope`) | 0 neste arquivo; **17 no `o6r07c-subresource-scope.test.ts`** (laço G, S-MOD, S-ROLES) | a porta é do 07a/07c-a; as portas do 07c-b1 checam presença antes de entrar nela. Declarado. |
| M25 instantâneo: devolver `DESPACHO·ALVO` a `DESPACHO·07c-b` | `tests/o6r07c-census-guard.test.ts` 30/31 | **T11** (CA11), e só ele |
| MDB1 migração sem `set_config` (GUC) | 6/7 | [backfill · FORCE RLS] |
| MDB2 operador = user id sempre (sem perfil) | 6/7 | [atribuição] |
| MDB3 backfill sem as DUAS guardas `assigned_operator_id IS NULL` | 5/7 | [backfill P6] e [FORCE RLS]. Com só UMA das duas removida o teste segue verde (a outra guarda basta: defesa dupla) — medido na 1ª tentativa, declarado. |
| MDB4 backfill preenche também divergentes | 6/7 | [backfill P6] |
- **Veredito parcial:** todo teste novo tem mutação que o derruba pelo motivo nomeado; restaurações conferidas.

### R11 — bateria final (head = `4fe7524e` + o diff de trabalho, não commitado; o orquestrador versiona)
| comando | onde | resultado |
|---|---|---|
| `npm run check` | Windows | ec 0 |
| `npm run lint` (= check) | Windows | ec 0 |
| `npm run build` | Windows | ec 0 (`dist/` removido depois, §C5) |
| `git diff --check` (com os 3 arquivos novos) | Windows | ec 0 — corrigida 1 linha em branco no fim de `work-order.types.ts` (herdada) |
| `npm test` na forma da CI (`teste-linux.sh`, `CORE_SAAS_PERSISTENCE=memory`, Postgres/Redis próprios) | container | **`# tests 3397 · pass 3393 · fail 2 · skipped 2`** (R8/run2): as 2 falhas = 1 teste (`B-SAN3-05 · o papel de runtime não contorna FORCE RLS`), verde isolado 12/12; ver R8 |
| `tests/o6r07c-b-scope-db.test.ts` | container | 7/7 (R7) |
| regressão em memória (16 arquivos: 07c-b1, censo, 07c-a, 07a, contratos mobile, despacho ×6, snapshot de vistoria, ratchet SAN3-05, upload ×2, comentários, chave legada) | Windows | **288/288** |
- Frontend, `mobile/**`, `Kpis/**`: não tocados (sem `npm --prefix frontend`). `sync-agent-agents`: nenhum corpo de agente criado.
- 4ª tentativa de rodar uma bateria no container (22:40 −03) também derrubou o daemon do Docker (`unexpected EOF`); não insisti. **Ambiente instável do Docker nesta máquina, registrado para o orquestrador**: a base viva (`erp-postgres`, `erp-redis`) saiu junto em cada queda e NÃO foi religada por mim.
- Limpeza §C5: `w-07cb1-mut` removida por `git worktree remove --force` (lista conferida: não existe mais); `dist/` removido; logs em `/tmp` meus removidos; nenhum container `tl*` sobrando; o índice do git ficou limpo (usei `git add -N` por engano para o `diff --check` dos novos e desfiz com `git reset -q -- <os 3 caminhos>`; `git status` = 18 `M` + 4 `??`).

## Consolidado — arquivo a arquivo (herdado mantido / corrigido / acrescentado)
| arquivo | estado |
|---|---|
| `src/modules/work-orders/work-order.types.ts` | herdado mantido (`wasPreviouslyAssigned`, `workOrderNotAssignedError`) + corrigido (`AssignWorkOrderFromDispatchInput` enxuto) + acrescentado (`isPreviouslyAssignedRefusal`, constantes de conflito) |
| `src/modules/work-orders/work-order.service.ts` | corrigido (casamento duplo restaurado; desvio de km removido; `assignFromDispatch` com perfil resolvido, ids pela regra do despacho, mensagens acentuadas; método morto `wasActorPreviouslyAssigned` removido) |
| `src/modules/work-orders/work-order.repository.ts` / `work-order-prisma.repository.ts` | herdado mantido (transação, `hasActorBeenAssigned`) + corrigido (sem viatura/equipe; `dispatchId` sempre no metadado) |
| `src/modules/field-dispatch/field-dispatch.service.ts` | herdado mantido (ordem/compensação do create, reassign e `draft→assigned`; trava de OS encerrada; escopo pelo alvo) + corrigido (devolução ao ativo restante só quando o fechado é o técnico atual, log em vez de `catch` mudo, chamada nova de `assignFromDispatch`) + acrescentado (`assertMayActivateDraft`, comentários de ordem/compensação) |
| `src/modules/field-dispatch/field-dispatch.repository.ts` / `-prisma.repository.ts` | herdado mantido (`deleteById`, `restoreState`) |
| `src/modules/checklists/checklist.service.ts` | herdado mantido (`assertRunMutationScope` nos métodos de escrita) + corrigido (compila; classe `ChecklistRunNotAssignedError`) + acrescentado (`createRun` com escopo quando a vistoria é de OS) |
| `src/modules/checklists/checklist.controller.ts` | herdado mantido (escopo antes do parse nas 6 rotas) |
| `src/modules/mobile/mobile-checklist-sync.ts` | herdado mantido (ordem D-07c-IDEMP; conflito) + corrigido (`handleAnswer` na ordem original; conflito pelas constantes comuns) |
| `src/modules/mobile/mobile-work-order-sync.ts` | acrescentado (conflito do ex-técnico para status e km) |
| `src/modules/mobile/mobile-evidence-sync.ts` | acrescentado (porta da OS para `evidence.work_order_*` do papel de campo; conflito; `scope` no recibo) |
| `src/modules/mobile/mobile-evidence-upload.ts` | acrescentado (escopo pela OS do recibo; 409 ao ex-técnico) |
| `prisma/migrations/20260874000000_backfill_work_order_assignment_from_active_dispatches/migration.sql` | acrescentado (P6) |
| `tests/o6r07c-b-scope.test.ts`, `tests/o6r07c-b-scope-db.test.ts` | acrescentados |
| `tests/fixtures/o6r07c-classificacao-vias.json`, `tests/helpers/o6r07c-census.ts` (só a tabela de classes), `tests/o6r07c-census-guard.test.ts` (T11 vazio) | acrescentados (CA11) |
| `tests/o6r07c-subresource-scope.test.ts` (S-KM-RESTART), `tests/san3-05-acessos-de-plataforma-guard.test.ts` (3 `NOVAS`) | **fora da lista PERMITIDA da emenda, declarados (§A2)** — ver R4 |

## Ajustes da crítica — onde cada um foi aplicado
1. P6 no b1 → migração `20260874000000` + [backfill P6] e [FORCE RLS] no `-db`.
2. Ordem e compensação → `create`: atribui depois de criar o despacho, compensa apagando; `reassign` e `draft→assigned`: compensam restaurando; testes de falha injetada.
3. Rascunho e OS encerrada → rascunho não atribui (e o técnico não o ativa); OS encerrada recusada 409 antes de qualquer escrita; rascunho sobre OS encerrada passa e só é barrado ao ativar.
4. Cancelar/falhar/dois ativos → devolução ao despacho ativo mais recente; atribuição fica se não sobrar ativo; dois ativos: vence o último despachado.
5. Fonte de "ex-técnico" → `work_order_assignments` (o despacho passa a gravar linha em todo create/reassign); residual declarado em R5. Upload pela OS do recibo, teste sem o campo do formulário.
6. Escopo b1 × b2 → nada de `approval.*`; CA6/CA7 não implementados (b2).
7. Nota dos `field_*` → justificada no código do lote e do upload (classe N; `work_order_id` é rótulo livre).

## Para o orquestrador registrar (não gravei em `controle/`)
- **Pergunta ao dono que a crítica deixou aberta e o b1 NÃO decidiu:** travar o `reassign` a partir de `on_route` até o b2 existir (P2/P3)? O b1 não trava; hoje reatribuir com atendimento iniciado faz o ex-técnico cair em conflito (sem saída no servidor até o b2).
- **Decisão de desenho tomada pelo dev, a confirmar:** despachar OS encerrada passou a dar 409 (antes era aceito, sem efeito na OS). E o papel de campo não ativa mais o próprio rascunho (`dispatch_activation_requires_dispatcher`).
- **Pendências novas sugeridas:** (a) ex-técnico só de despacho reatribuído ANTES do deploy recebe `rejected`, não conflito (R5); (b) divergentes do backfill ficam como estão e só aparecem como total no `RAISE NOTICE` — o despachante não tem lista (R5); (c) `B-SAN3-05 · o papel de runtime…` vermelho só sob a suíte inteira no container (R8), a confirmar na CI do PR; (d) Docker desta máquina caindo sob a suíte inteira (R8/R11).

## DECISÕES DO DONO (17/10)

### D0 — terreno e leitura
- Ramo `fix/o6r07cb1-despacho-atribui` em `67e5cb1c` (o orquestrador commitou o trabalho anterior; PR #440). `git status` limpo antes desta etapa.
- Decisões lidas em `origin/docs/registro-17-10:agent-orchestration/controle/decisoes.md:3699,3707-3711`: `D-DESP-INICIO-ATENDIMENTO` (o atendimento começa em **No local**), `D-07CB1-TRAVA-ATE-B2`, `D-07CB1-DESPACHO-OS-ENCERRADA` e `D-07CB1-TECNICO-SEM-ATIVAR-RASCUNHO` (as duas últimas confirmam o que já está no #440; sem código novo).
- "No local" medido no código: é o rótulo de `arrived` no DESPACHO (`frontend/src/modules/operations/dispatches/dispatches.adapter.ts:19`) e de `on_site` na OS (`work-orders-row.logic.ts:16`). As duas máquinas são separadas (emenda, M3).
- **Leitura do dev, declarada (§A6):** "a partir de No local" = despacho em `arrived`/`in_service` **ou** OS em `on_site`/`in_progress`/`paused` (a mensagem do orquestrador cita `on_site`; a decisão cita o despacho). E a trava vale para toda via que TROCA o técnico de uma OS com atendimento iniciado: `reassign`, um despacho NOVO para outro técnico (que move a atribuição, `D1-07c`) e a ativação de rascunho para outro técnico; sem isso a trava seria contornada pelo `create`. Na devolução automática ao cancelar/falhar, a OS com atendimento iniciado NÃO muda de técnico (fica como está).

### D1 — a trava (código) e o teste
- `src/modules/field-dispatch/field-dispatch.service.ts`: `DISPATCH_SERVICE_STARTED` (`arrived`, `in_service`) e `WORK_ORDER_SERVICE_STARTED` (`on_site`, `in_progress`, `paused`); `assertTechnicianChangeAllowed` → 409 `FIELD_DISPATCH_CHANGE_REQUIRES_AUTHORIZATION` / `technician_change_requires_authorization`, mensagem "O atendimento já começou (No local): a troca de técnico precisa de autorização de um superior."; aplicada no `reassign` (quando o alvo muda), no `create` não-rascunho e na ativação do rascunho quando o alvo é OUTRO técnico (`assertNewTargetAllowed`); a devolução automática ao cancelar/falhar não troca o técnico de OS com atendimento iniciado. Antes de qualquer escrita (a trava roda antes do `repository.reassign`/`create`/`changeStatus`).
- Limite declarado: `assertNewTargetAllowed` compara com `assignedUserId` (ou, na falta, `assignedOperatorId`). OS atribuída só pelo PERFIL na web (`assign` sem `userId`) e com atendimento iniciado: um despacho novo para a mesma pessoa é tratado como troca e recusado (falso positivo seguro; nunca falso negativo).
- `tests/o6r07c-b-scope.test.ts`: 2 testes novos — antes de No local (`on_route`) a troca vale; a partir de No local, (1) despacho `arrived` → reassign 409, nada muda, reatribuir à mesma pessoa passa; (2) OS `on_site` → reassign 409, despacho novo para outro 409 (sem gravar), rascunho criado mas ativação 409, despacho novo para o mesmo técnico 201 sem rebaixar a OS.
- `npm run check` → ec 0. `node --test --import tsx tests/o6r07c-b-scope.test.ts` → **41/41**.

### D2 — vermelho-controle e mutações (cópia descartável `w-07cb1-mut`, detached em `67e5cb1c`, `npm ci` próprio, removida com `git worktree remove --force` ao fim; conferido que não existe mais)
- Sem a trava (o `src/` de `67e5cb1c` + o teste novo): `tests/o6r07c-b-scope.test.ts` → 40 pass / **1 fail**: o teste de No local, `reassign com o despacho em arrived: 200` (a troca acontecia). O teste "antes de No local" fica verde nos dois lados (controle positivo).
- Com a trava (espelho conferido EOL-neutro) e cada mutação aplicada por âncora única e restaurada byte-idêntica:
  | mutação | resultado |
  |---|---|
  | MT1 trava desligada | vermelho: `reassign com o despacho em arrived: 200` |
  | MT2 só o despacho conta (OS `on_site` ignorada) | vermelho: `reassign com a OS em on_site: 200` |
  | MT3 despacho novo sem trava | vermelho: `despacho novo para outro técnico com a OS em on_site: 201` |
  | MT4 trava já em "A caminho" (`on_route`) | vermelho: o teste "antes de No local" (`409 … technician_change_requires_authorization`) |

### D3 — retomada depois da reinicialização das extensões, e a bateria
- Medido antes de confiar: `git status` = só os 3 arquivos desta etapa (`field-dispatch.service.ts` +41, `tests/o6r07c-b-scope.test.ts` +65, este relatório); D0–D2 inteiros no arquivo (nenhuma linha meio-escrita); `git worktree list` e `C:/Users/AMP` sem `w-07cb1-mut`.
- `npm run check` → ec 0 · `npm run lint` → ec 0 · `git diff --check` → ec 0.
- Testes do bloco sem banco (Windows, `--test-concurrency=4`, 12 arquivos: 07c-b1, censo, 07c-a, 07a, despacho ×6, snapshot de vistoria, contratos mobile, ratchet SAN3-05) → `201 · pass 198 · fail 3`; as 3 são do censo (`T0`, `T12`, tempo), com `Fatal process out of memory: Zone` no processo filho do censo — falta de memória do Windows com 4 arquivos em paralelo, não teste. `tests/o6r07c-census-guard.test.ts` sozinho → **31/31**. Logo: 201/201 verdes, medido em duas rodadas.
- `-db` do bloco no container (0 grupos `tl*` de outros trabalhos no `docker ps`): `tests/o6r07c-b-scope-db.test.ts` → **7/7**, ec 0.
- `npm test` inteiro: NÃO rodado (a CI do PR o faz, por ordem do orquestrador).
- Limpeza: logs meus em `/tmp` removidos; nenhum container meu sobrando (o grupo `tl17922039075308-*`, criado às 23:25 −03, depois do fim da minha rodada, é de outro trabalho e não foi tocado); os dois corpos novos de jurado em `.claude/agents/especialistas/` (`jurado-07cb1-c1-…`, `jurado-07cb1-c2-…`) NÃO são meus e não foram tocados; nada commitado.
