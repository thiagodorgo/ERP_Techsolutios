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
- `prisma/migrations/20260877000000_backfill_work_order_assignment_from_active_dispatches/migration.sql` (NOVO; autorização nominal P6 de `D-07CB-EMENDA-RECOMENDACOES`). Um `DO $$` só: por organização (GUC setado a cada volta, funciona sob FORCE RLS sem BYPASSRLS), CONTA antes (coerentes / a preencher / divergentes, `RAISE NOTICE` só com totais), PREENCHE só a OS sem atribuição com o alvo do despacho ativo mais recente (perfil ou user id; `open → assigned`; linha em `work_order_assignments` e evento `work_order_assigned` com `metadata.source = field_dispatch_backfill`), NÃO toca divergentes. Idempotente (só escreve onde `assigned_operator_id IS NULL`). Rollback no cabeçalho.
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
| `prisma/migrations/20260877000000_backfill_work_order_assignment_from_active_dispatches/migration.sql` | acrescentado (P6) |
| `tests/o6r07c-b-scope.test.ts`, `tests/o6r07c-b-scope-db.test.ts` | acrescentados |
| `tests/fixtures/o6r07c-classificacao-vias.json`, `tests/helpers/o6r07c-census.ts` (só a tabela de classes), `tests/o6r07c-census-guard.test.ts` (T11 vazio) | acrescentados (CA11) |
| `tests/o6r07c-subresource-scope.test.ts` (S-KM-RESTART), `tests/san3-05-acessos-de-plataforma-guard.test.ts` (3 `NOVAS`) | **fora da lista PERMITIDA da emenda, declarados (§A2)** — ver R4 |

## Ajustes da crítica — onde cada um foi aplicado
1. P6 no b1 → migração `20260877000000` + [backfill P6] e [FORCE RLS] no `-db`.
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

## Carimbo da migração (17/10)
- Achado (redator de mandatos, conferido pelo orquestrador): o #426 (Traccar, mergeia antes) cria `20260874000000_traccar_ingestion_foundation`, `20260875000000_…` e `20260876000000_…`. Medido em `origin/feat/traccar-b-trc-01`: `20260874000000_traccar_ingestion_foundation` e `20260875000000_validate_location_source_check` existem lá; carimbo repetido com o backfill deste bloco.
- `git mv prisma/migrations/20260874000000_backfill_work_order_assignment_from_active_dispatches prisma/migrations/20260877000000_backfill_work_order_assignment_from_active_dispatches` (conteúdo intocado; o rename ficou no índice, sem commit).
- Referências atualizadas (`20260874000000` → `20260877000000`): `tests/o6r07c-b-scope-db.test.ts` (2), este relatório (3), e o corpo do jurado `jurado-07cb1-c3-despacho-censo-persistencia.md` nos DOIS espelhos (`.claude/` e `.agents/`, 4 cada). `git grep -n 20260874000000` (fora dos votos não rastreados) → 0 linhas. `node scripts/sync-agent-agents.mjs --check` → OK, 58 agentes, espelho consistente. Os 5 arquivos não rastreados em `agent-orchestration/omega/juntas/votos/B-O6R-07c-b1/` não foram tocados; os ` M` de `.agents/agents/*` que já estavam no `git status` são fantasmas de fim de linha (`git diff --ignore-cr-at-eol` vazio) e não são meus.
- Bateria: `npm run check` ec 0; `git diff --check` ec 0; testes do bloco sem banco (11 arquivos, Windows) **186/186** + censo sozinho **31/31**; `-db` no container (0 grupos `tl*`/`j*` de outros no `docker ps`), com a migração aplicada pelo `prisma migrate deploy` no carimbo novo → `tests/o6r07c-b-scope-db.test.ts` **7/7**.

## CICLO 2 — dev-07cb1-ciclo2-opus

- **Papel:** dev do ciclo 2 (identidade NOVA `dev-07cb1-ciclo2-opus`), **Claude Opus 5.5 (`claude-opus-5-5`), nível menor, declarado** (§C7.6). Não achou (C1/C3 do ciclo 1 acharam), não planejou (`planejador-07cb1-ciclo2`, Fable), não vota (§C7.4-bis).
- **Lei do ciclo:** `C:/Users/AMP/erp-pausa-2026-10-03/planos/B-O6R-07c-b1-ciclo2-auditoria-e-plano.md`, Parte 2 (§2.1–§2.10). Implementado, não reescrito.
- **Divergência declarada (§A2):** o plano (§2.3) nomeia o relatório `docs/revisoes/SAN3/B-O6R-07c-b1-ciclo2-dev.md`; o orquestrador mandou gravar NESTA seção deste arquivo. Vale a ordem do orquestrador; a lista fechada de 13 arquivos do §2.3 fica com este arquivo no lugar daquele.
- **Terreno:** worktree `C:/Users/AMP/w-07cb1`, ramo `fix/o6r07cb1-despacho-atribui`, head de partida `5939a30d`; `node_modules` próprio (0 symlink). Disco livre no início: 8,6 GB (abaixo dos ~10 GB da §C5 — registrado).

### P0 — terreno (10:56 UTC)
- `git log --oneline -1` → `5939a30d`; `git status --short` fora dos ` M` de fim de linha em `.agents/` → vazio; `find node_modules -maxdepth 1 -type l | wc -l` → 0; `docker ps` → só `erp-postgres`/`erp-redis` (base viva, não é alvo). Veredito: terreno limpo.

### P1 — o produto do ciclo 2 (§2.2 peças (a)–(j)) (hora ESTIMADA no registro; ver nota em P5)
- Arquivos (6, todos no PERMITIDO do §2.3): `work-order.types.ts` (exporta `WORK_ORDER_SERVICE_STARTED`, `ActiveDispatchAtSiteResolver`, `WorkOrderAssignmentEventInput`, `WorkOrderAssignmentWriteResult`; `event` obrigatório em `AssignWorkOrderInput`/`AssignWorkOrderFromDispatchInput`), `work-order.repository.ts` (interface + memória: o evento nasce DENTRO de `assign`/`assignFromDispatch`, sem `createEvent`), `work-order-prisma.repository.ts` (`tx.workOrderEvent.create` no MESMO `$transaction`, depois de `workOrderAssignment.create`), `work-order.service.ts` ((b) resolver `hasActiveDispatchAtSite` por import dinâmico, SEM `catch`; (c) `assertTechnicianChangeAllowed` pública, fail-closed sem resolver; (d) chamada em `assign` antes da máquina da OS e em `assignFromDispatch` antes do repositório; os dois `createEvent` saíram), `field-dispatch.service.ts` ((a) `hasActiveDispatchAtSite` exportada; (e) as privadas `assertTechnicianChangeAllowed`/`assertNewTargetAllowed` APAGADAS e os 3 pré-checks chamam a do `WorkOrderService`; (f) reassign ao mesmo técnico devolve o despacho sem escrever; (g) `moveAssignmentToRemainingDispatch` recebe `closedPreviousStatus` e não move se ele estava em No local; (h) ativar rascunho exige `field_dispatch:create`), `mobile-evidence-sync.ts` ((j) `tenant_wide` → `service.get`).
- `npm run db:generate` (URL fictícia `127.0.0.1:1`) → ec 0 · `npm run check` → 1ª ec 2 (`updated[0].status` é `string` no Prisma; passei a mapear a OS antes e usar `workOrder.status`) → 2ª **ec 0**.
- Regressão imediata: `tests/o6r07c-b-scope.test.ts` (41 do ciclo 1, sem os testes novos) → **41/41**, ec 0.
- Veredito parcial: produto implementado sem tocar PROIBIDO; os 41 do ciclo 1 seguem verdes.

### P2 — censo: (j) devolve as 3 chaves a `EVIDENCIA-OS·ESCOPO`; T14 escrito (hora ESTIMADA no registro; ver nota em P5)
- `env -u DATABASE_URL -u REDIS_URL node --import tsx tests/helpers/o6r07c-census.ts gravar <scratch>/regen{1,2}.json` (N=2) → ec 0/0; resumo `EVIDENCIA-OS·ESCOPO=4 · OS·SEM-ALCANCE=15`, `chaves vivas: 468`, `VIOLAÇÕES: 0`.
- `cmp regen1 regen2` → ec 0 (as duas execuções byte-idênticas). `cmp regen1 <git show HEAD:tests/fixtures/o6r07c-classificacao-vias.json>` → **ec 0**; `git hash-object regen1.json` = `c2ff01fd…` = blob do fixture no head. `git status` do fixture: limpo → **diff do fixture VAZIO** (o esperado do §2.3).
- Nota de terreno (declarada): `cmp regen tests/fixtures/…` contra a CÓPIA DE TRABALHO dá ec 1 ("char 2, line 1") porque o checkout tem fim de linha CRLF (`core.autocrlf=true`); a comparação que vale é contra o blob (§C7.1-ter(c)). A bateria do §2.6 passo 4 fica medida pelo blob.
- T14 escrito em `tests/o6r07c-census-guard.test.ts`: `assert.deepEqual(cl.gerado, INSTANTANEO)` (helper intocado).
- Veredito parcial: P-CENSO resolvido pela causa (j), sem editar o fixture à mão.

### P3 — testes novos em memória (§2.4) (hora ESTIMADA no registro; ver nota em P5)
- `tests/o6r07c-b-scope.test.ts`: T-TRAVA (5 estados × 8 vias × 3 papéis = **120**), T-TRAVA controle positivo (**8**, d1 `on_route`), T-COMPOSICAO (**2**: o resolver na composição padrão e respondendo pelo despacho real; `WorkOrderService` sem resolver recusa — `assign` e `assignFromDispatch` —, com resolver troca), T-ALOCA (**5**: `operator`/`field_technician` 403, `manager`/`field_dispatcher`/`tenant_admin` 200), T-ATOMICA-MEM (**4**: create/reassign/ativação/web, espião em `InMemoryWorkOrderRepository.prototype.createEvent` = 0 chamadas `work_order_assigned`, timeline com o evento, eventos = linhas), T-EVID-EXISTE (**7**: `tenant_admin`/`manager` × inexistente/outra organização/real, cada um nos 3 tipos, + técnico não atribuído). Ajuste declarado no teste `D-07CB1-TRAVA-ATE-B2 — a partir de No local…`: reatribuir à mesma pessoa agora ASSERTA que o despacho segue `arrived`. Arnês: `ctx.atribuicoes(osId)` (linhas de `work_order_assignments` do repositório em memória). Nenhum teste existente apagado ou renomeado.
- Cenário da T-TRAVA (declarado): d2 do técnico C ativo ANTES de d1 do técnico A (a OS é de A); o atendimento começa pelo despacho (d1 `arrived`/`in_service`) ou pela OS (`on_site`/`in_progress`/`paused`). "Intacto" = técnico (2 colunas), status, nº de linhas de atribuição e cada despacho (alvo:status).
- `env -u DATABASE_URL -u REDIS_URL CORE_SAAS_PERSISTENCE=memory node --test --import tsx --test-reporter=tap tests/o6r07c-b-scope.test.ts` → `# tests 187 · pass 187 · fail 0`, `duration_ms 19579` (meta R7 < 60 s: cumprida com os 3 papéis). Composição: 41 do ciclo 1 + 120 + 8 + 2 + 5 + 4 + 7 = 187.
- Veredito parcial: verde no produto do ciclo 2; o vermelho-controle (objeto `b198fe35`) e as mutações ficam para a cópia descartável (P6/P7).

### P4 — arnês dos testes de contrato (R4) e um arquivo FORA da lista fechada, declarado (§A2) (hora ESTIMADA no registro; ver nota em P5)
- Medido antes de mexer: com (j) aplicado, `tests/mobile-backend-contracts.test.ts` → `25 · pass 22 · fail 3` (as 3 suítes de `evidence.work_order_*` do `tenant_admin`, com `work_order_id` inventado: `"work-order-1"`, `"work-order-idempotency"`, `"work-order-upload-1"`), e `tests/o6r07b-mime-sniff-routes.test.ts` → `36 · pass 28 · fail 8` (todas as da via V1: o recibo de metadado usava `work_order_id: "wo-o6r07b-1"`, inventado; sem recibo, o upload não acontece).
- Correção (classe (iii), arnês; NENHUMA asserção mudou): nos dois arquivos o `work_order_id` passa a ser uma OS REAL da organização do ator (`createWorkOrderForEvidence` novo no de contratos; o `createWorkOrder(ctx)` que já existia no de MIME). O `"work-order-upload-divergent"` do teste de upload segue inventado de propósito (é o caso de divergência).
- **Fora da lista fechada do §2.3 (13 arquivos): `tests/o6r07b-mime-sniff-routes.test.ts`.** O plano previu o R4 só no arquivo de contratos; o de MIME tem a mesma forma (recibo `evidence.work_order_photo` do `tenant_admin` com OS inventada) e fica vermelho pelo MESMO (j) que o plano manda fazer. Alternativas: (a) corrigir o arnês (feito; mesma classe (iii) do R4, 4 linhas) ou (b) deixar 8 vermelhos na suíte. Escolhi (a) e DECLARO aqui, antes da junta (§A2); a C3 do ciclo 2 confere.
- Depois: contratos → **25/25**, ec 0; MIME → **36/36**, ec 0.
- Veredito parcial: arnês ajustado sem tocar asserção; 1 arquivo fora da lista, declarado com motivo.

### P5 — ratchet SAN3-05 (l) e o `-db` do ciclo 2 (T-ATOMICA-DB + composição) (11:24 UTC, medida por `date -u`)
- Nota de registro: as horas de P1–P4 tinham sido escritas por estimativa (11:40–12:22) e estavam ERRADAS — `date -u` às 11:20 mostrou que eram anteriores; trocadas por "ESTIMADA". De P5 em diante a hora vem de `date -u`.
- Ratchet: `tests/san3-05-acessos-de-plataforma-guard.test.ts` com o produto e SEM as chaves → `35 · pass 33 · fail 2` (T13 acusa exatamente as 2 chaves `PrismaWorkOrderRepository.{assign,assignFromDispatch} × tx.workOrderEvent × workOrderEvent.create × work_order_events × $TRANSACTION-SEM-SETTER-PROVADO`) = o vermelho-controle do ratchet. Com as 2 chaves em `NOVAS` (motivo por chave) → **35/35**.
- `-db`: o caso `[despacho]` (compensações chamadas direto) foi SUBSTITUÍDO por 6 casos `[atômica · create|reassign|ativação|web|controle 1|controle 2]` (gatilho `BEFORE INSERT` temporário, nome `o6r07cb1_inj_<16 hex>`, `WHEN` pelo `tenant_id` da organização descartável — no evento, também `event_type = 'work_order_assigned'`; `DROP` no `finally` e `pg_trigger`/`pg_proc` = 0 pelo nome) + 1 caso `[composição]` (resolver no Prisma: `on_route` → false, `arrived` → true, troca recusada com 409 e OS intacta). `FieldDispatchService` REAL da composição Prisma (núcleo stub: todo alvo é técnico de campo). Total do arquivo: 7 − 1 + 7 = **13**.
- Incidente de terreno, declarado: a 1ª aplicação do script de edição DUPLICOU o arquivo `-db` (o `String.replace` interpretou o `` $` `` do `$f$` do corpo PL/pgSQL como "texto antes da âncora"). Detectado na hora (`grep` mostrou 2× cada teste, 881 linhas); restaurei SÓ esse arquivo do head (`git checkout -- tests/o6r07c-b-scope-db.test.ts`, que eu ainda não tinha alterado de outra forma; `git diff --quiet` ec 0) e reapliquei com substituição por função. Os outros scripts de edição foram conferidos: nenhum `$$`/`$&`/`` $` ``/`$'` nos textos de substituição já aplicados, e tsc + testes verdes neles.
- Sem banco (Windows): `node --test … tests/o6r07c-b-scope-db.test.ts` → 1 skipped (forma canônica), parse OK. A execução com banco fica para o container (P8).

### P6 — bateria Windows (§2.6 passos 1–5) e mais 2 arquivos fora da lista, declarados (§A2) (11:28 UTC)
- `npm run check` ec 0 · `npm run lint` ec 0 (o `lint` do repo é o `check`) · `npm run build` ec 0 (`dist/` removido em seguida; é gitignored) · `git diff --check` ec 0.
- Regressão em memória (§2.6 passo 5; 24 arquivos: `o6r07c-subresource-scope`, `o6r07a*` ×8, `field-dispatch*` ×6, `checklist-snapshot-dispatch`, `o6r07b-*` ×6, `mobile-backend-contracts`, `san3-05-acessos…`, `o6r07c-b-scope`; o padrão `multi-checklist*` do plano não casa arquivo nenhum — o nome vivo é `field-dispatch-multi-checklist.test.ts`, já incluído), `--test-concurrency=2`: 1ª rodada `483 · pass 480 · fail 2 · skipped 1`.
- As 2 falhas: `tests/field-dispatch-routes.test.ts` ("…expose create/list/detail/status/reassign", l.66) e `tests/field-dispatch.test.ts` ("…cria, lista, muda status, reatribui…", l.62). As duas reatribuíam o despacho à MESMA pessoa (o semente só tinha um técnico na organização) e esperavam `reassigned` — exatamente o contrato que a peça (f) do plano muda (R5 do §2.7). Consumidor real conferido: a tela `DispatchReassignForm.tsx` mostra o "Operador atual" e pede o novo, ou seja, reatribui para trocar; o app não emite reassign (C2 do ciclo 1).
- **Fora da lista fechada do §2.3: `tests/field-dispatch-routes.test.ts` e `tests/field-dispatch.test.ts`.** Correção classe (ii) (contrato muda por desenho), declarada: um 2º técnico da organização A (`operatorA2`) no semente, e a reatribuição passa a ir para ele — a asserção original (`reassigned`, evento `field_dispatch_reassigned`) fica INTACTA e segue provando a reatribuição real. Nenhum teste apagado/renomeado. Depois: 6/6.
- 2ª rodada da regressão: **`483 · pass 482 · fail 0 · skipped 1`** (o skip é o `o6r07a-anon-lockout-db`, sem `DATABASE_URL`), `duration_ms 70321`.
- `tests/o6r07c-census-guard.test.ts` SOZINHO (§2.6 passo 3): **32/32** (31 + T14), ec 0.
- Veredito parcial: bateria Windows verde. Arquivos fora da lista fechada até aqui: 3 (`o6r07b-mime-sniff-routes`, `field-dispatch-routes`, `field-dispatch`), todos arnês/semente, todos declarados.

### INTERRUPÇÃO — queda de internet (ENOTFOUND), não PAUSA (retomada 23:41 UTC)
- A execução caiu depois de P6 (o último comando registrado acima terminou às 11:28 UTC). Retomada às 23:41 UTC por ordem do orquestrador.
- Medido antes de confiar: head `5939a30d`; `git status` = os mesmos 15 arquivos (+ os ` M` de fim de linha em `.agents/`, não meus); `tests/o6r07c-b-scope-db.test.ts` com 13 testes e 550 linhas (sem duplicação); nenhuma cópia `w-07cb1-mut2` (`ls` → não existe; `git worktree list` sem ela); `docker ps` só `erp-postgres`/`erp-redis`. `npm run check` ec 0; `git diff --check` ec 0; `o6r07c-b-scope` + `field-dispatch` + `field-dispatch-routes` → `193/193`. Nenhum arquivo meio-escrito.
- Docker: limite novo do dono, no máximo 2 trabalhos com container na máquina — só subo se houver no máximo 1 grupo de OUTROS trabalhos (`tl*-`, `j*-`).

### P7 — vermelho-controle SEM mutação contra o objeto do ciclo 1 (`b198fe35`) (§2.4 (i), §2.6 passo 6) (23:51 UTC)
- Cópia descartável: `git -C C:/Users/AMP/w-07cb1 worktree add --detach C:/Users/AMP/w-07cb1-mut2 HEAD` → `git diff -- src tests > ciclo2.patch` (1568 linhas) aplicado (`git apply` ec 0); `hash-object` de cada um dos 14 arquivos de `src`/`tests` = o do `w-07cb1`; `npm ci` próprio ec 0, 0 symlink em `node_modules`; `db:generate` com URL fictícia ec 0.
- `git -c core.autocrlf=false checkout b198fe35 -- src` → `hash-object` = blob do objeto em TODO arquivo de `src/modules/{work-orders,field-dispatch,mobile}` (0 diferentes). Testes do ciclo 2 mantidos.
- `tests/o6r07c-b-scope.test.ts` contra o `src` do objeto → **`187 · pass 105 · fail 82`**, decompostos: T-TRAVA **69** = estados do despacho (`d1 arrived`, `d1 in_service`) × 7 vias (X1, V2, V3, V4, V5, web, lote — o "reassign direto" já era recusado no objeto, K2 do ciclo 1) × 3 papéis = 42, + estados da OS (`on_site`, `in_progress`, `paused`) × 3 vias (X1 — o 1º passo ia a `reassigned` —, web e lote — davam `invalid_status_transition`, não a trava) × 3 papéis = 27; controle positivo X1 **1** (o 1º passo tirava o despacho de `on_route`); T-COMPOSICAO **2**; T-EVID-EXISTE **4** (inexistente e alheia × `tenant_admin`/`manager`; o `real` e o técnico não atribuído passavam, como devem); T-ATOMICA-MEM **4**; T-ALOCA **1** (`operator` ativava: 200 = C1-A3); o teste ajustado `D-07CB1-TRAVA-ATE-B2 — a partir de No local…` **1** (o despacho saía de `arrived`). Soma 82 ✓. Os 41 do ciclo 1 seguem verdes contra o objeto.
- Bate com o §2.6 passo 6: T-TRAVA ≥ 7 vias vermelhas (são 7 nos estados do despacho = os achados A1/A2), T-ALOCA, T-ATOMICA-MEM, T-EVID-EXISTE vermelhos.
- `tests/o6r07c-census-guard.test.ts` (sozinho) contra o objeto → **`32 · pass 31 · fail 1`**: só o **T14**, com exatamente 3 diferenças — `PAR …/evidence-actions · evidence.work_order_{observation,photo,signature}`: gerado `OS·SEM-ALCANCE` × instantâneo `EVIDENCIA-OS·ESCOPO` (= C3-A2).
- Restauro: `git checkout -- src` + `git apply --include='src/*' ciclo2.patch` → `hash-object` dos 14 arquivos = os do `w-07cb1` (0 diferentes).
- O vermelho do T-ATOMICA-DB contra o objeto fica para o container (P9).
- Veredito parcial: todo teste novo do ciclo 2 nasce vermelho no objeto do ciclo 1 pela razão do achado que ele fecha.

### P8 — mutações MT1–MT11 (§2.4 (ii), §2.6 passo 7) na cópia `w-07cb1-mut2` (23:57 UTC)
- Mecanismo: `mutar.mjs <MT>` (âncora ÚNICA por arquivo, contagem = 1 obrigatória, prova de aplicação) → o arquivo de teste certo inteiro (TAP) → restauro por cópia de segurança e `hash-object` igual ao de antes (todas "restaurado", nenhuma "RESTAURO FALHOU"). Ao fim, os 14 arquivos de `src`/`tests` + o fixture da cópia = os do `w-07cb1` (0 diferentes).

| MT | mutação (onde) | resultado (`tests/o6r07c-b-scope.test.ts`, 187) | o que ficou vermelho |
|---|---|---|---|
| MT1 | resolver da trava devolve sempre `false` (`work-order.service.ts`, `hasActiveDispatchAtSite` da composição) | fail **38** | T-TRAVA `d1 arrived`/`d1 in_service` × {reassign direto, X1, V2, V3, web, lote} × 3 papéis = 36; T-COMPOSICAO (composição) 1; `D-07CB1-TRAVA-ATE-B2 — a partir de No local` 1. V4/V5 ficam verdes: a guarda (g) não usa o resolver (é o MT3) |
| MT2 | sem o no-op (f) do reassign à mesma pessoa (`field-dispatch.service.ts`) | fail **17** | T-TRAVA X1 nos 5 estados × 3 papéis = 15; controle positivo X1 1; `D-07CB1-TRAVA…` (o despacho saía de `arrived`) 1 |
| MT3 | sem a guarda (g) `closedPreviousStatus` em No local (`moveAssignmentToRemainingDispatch`) | fail **12** | T-TRAVA V4/V5 × `d1 arrived`/`d1 in_service` × 3 papéis. Nos estados da OS a guarda da OS (l.1022) segura — esperado |
| MT4 | `assign` sem a trava (d) (`work-order.service.ts`) | fail **31** | T-TRAVA web/lote × 5 estados × 3 papéis = 30 (nos estados da OS a máquina da OS respondia `invalid_status_transition`, não a trava); T-COMPOSICAO (fail-closed) 1 |
| MT5 | `on_route` em `DISPATCH_SERVICE_STARTED` (`field-dispatch.service.ts`) | fail **9** | o controle positivo inteiro (8 vias) + o teste `D-07CB1-TRAVA-ATE-B2 — antes de No local` |
| MT6 | resolver ausente tratado como `false` (`!resolver` → `(!resolver && false)`) | fail **1** | T-COMPOSICAO fail-closed |
| MT7 | ativação de rascunho de volta ao critério por papel (`assertMayActivateDraft`) | fail **1** | T-ALOCA `operator` (o `field_technician` segue barrado pelo papel nos dois critérios — esperado) |
| MT8 | evento `work_order_assigned` de volta para FORA da escrita da OS (`createEvent` avulso em `assign` e antes de `repository.assignFromDispatch`) | fail **6** | T-ATOMICA-MEM ×4 (espião); CA1 e CA2 (evento duplicado na linha do tempo) |
| MT10 | evidência: `tenant_wide` sem a consulta à OS (`mobile-evidence-sync.ts`, o `else` removido) | fail **4** | T-EVID-EXISTE inexistente/alheia × `tenant_admin`/`manager` |
| MT11 | 1 classe editada no fixture (`evidence.work_order_photo` → `OS·SEM-ALCANCE`), `tests/o6r07c-census-guard.test.ts` sozinho (32) | fail **2** | **T14** e T6 (classe incompatível com a propriedade) |

- MT9 (evento fora do `$transaction` no Prisma) exige banco: vai para o container (P9).
- Mutante equivalente declarado (§2.4): remover UM pré-check (e) isolado no despacho — a chamada autoritativa em `assignFromDispatch` recusa igual (só muda o momento); não medido como vermelho, por desenho.
- Veredito parcial: cada mutação nomeada derruba o(s) teste(s) que o plano previu, e nenhuma ficou verde.

### P9 — container: a imagem da ferramenta sumiu (~00:05 UTC)
- `docker ps`: 0 grupos de OUTROS trabalhos (só `erp-postgres`/`erp-redis`, "Up 3 minutes" — o Docker da máquina reiniciou durante a queda) → dentro do limite de 2.
- `bash …/ferramentas/teste-linux.sh C:/Users/AMP/w-07cb1 "<-db com set +e>"` → **ec 125**: `Unable to find image 'erp-teste-linux:1' locally` (`docker images` = só `postgres:16` e `redis:7`; a imagem local da ferramenta não existe mais — não fui eu: não rodei `prune` nem `rmi`).
- Reconstrução pela receita da própria ferramenta (`ferramentas/teste-linux/Dockerfile`: postgres:16 + node 20 + git; nada pago, nada novo): 2 tentativas falharam por REDE (`short read: expected 48488628 bytes but got 16907641`; `TLS handshake timeout` em `registry-1.docker.io`) — a mesma instabilidade de internet da queda. Disparei 4 tentativas com espera de 90 s em segundo plano.
- As 4 tentativas em segundo plano também falharam por rede (a 4ª: `failed to fetch anonymous token` em `auth.docker.io`).

### INTERRUPÇÃO 2 — o vigia de stream parou a execução (600 s sem progresso), não PAUSA (retomada 00:55 UTC)
- Medido antes de confiar: `w-07cb1` no head `5939a30d`, os mesmos 15 arquivos modificados; relatório íntegro até P9. Cópia `w-07cb1-mut2`: os 14 arquivos de `src`/`tests` + o fixture = os do `w-07cb1` (0 diferentes) → **sem mutação aplicada**, cópia mantida para o MT9 e o vermelho-controle do `-db`. `docker images`: `erp-teste-linux:1` existe de novo ("About a minute ago" — reconstruída pelo orquestrador, não por mim). `docker ps`: 0 grupos de outros trabalhos. Disco 24 GB livres.

### P10 — `-db` do ciclo 2 no container (01:00 UTC, em curso)
- 1ª tentativa (00:57): `teste-linux.sh` → **ec 3**, `npm ci` dentro do container caiu por rede (`ECONNRESET`, "network aborted") — mesma instabilidade. Disparadas até 3 novas tentativas em segundo plano, com espera de 120 s e recontagem dos grupos Docker de outros trabalhos antes de cada uma (só sobe com ≤ 1).
- 2ª tentativa (00:59, 0 grupos de outros trabalhos): `teste-linux.sh C:/Users/AMP/w-07cb1 "<cmd>"` → **ec 0**. `prisma migrate deploy` com **109** migrações, a última `20260877000000_backfill_work_order_assignment_from_active_dispatches`. `node --test --import tsx tests/o6r07c-b-scope-db.test.ts` → **`13 · pass 13 · fail 0 · skipped 0`** (os 4 do ciclo 1 que ficam + 6 `[atômica …]` + `[composição]` + os 2 `[backfill P6]`). Depois da suíte: **`PG_TRIGGER=0 PG_PROC=0`** para `o6r07cb1_inj_%`. Containers removidos pelo nome no fim (trap da ferramenta).
- Veredito parcial: P-ATOMICA provada no Postgres nos 4 caminhos, com os 2 controles.

### P11 — vermelho-controle do `-db` contra o objeto `b198fe35` (01:0x UTC, em curso)
- Na cópia `w-07cb1-mut2`: `git -c core.autocrlf=false checkout b198fe35 -- src` (`hash-object` = blob em todo `src/modules/{work-orders,field-dispatch,mobile}`, 0 diferentes); testes do ciclo 2 mantidos. Container pela mesma ferramenta (`tl-retry.sh`: ≤ 3 tentativas, só com ≤ 1 grupo Docker de outros trabalhos).
- Nomes de teste (nenhum some): os 41 nomes do `tests/o6r07c-b-scope.test.ts` do ciclo 1 (TAP da rodada P1) estão TODOS no TAP do ciclo 2 (`comm -23` → 0). No `-db`, `comm -23` nomes do head × ciclo 2 → só `[despacho] as compensações no banco: deleteById apaga o despacho; restoreState devolve alvo e status` — a SUBSTITUIÇÃO que o §2.4 manda (sanando a N1 da C3), declarada em P5; os mesmos métodos são exercidos pelos casos `[atômica …]`. Nos dois testes legados de despacho (P6) nenhum nome mudou.
- Resultado (01:03, 0 grupos de outros): `teste-linux.sh` ec 0; 109 migrações; `tests/o6r07c-b-scope-db.test.ts` contra o `src` do objeto → **`13 · pass 8 · fail 5`**: `[atômica · create]` ("a OS ficou atribuída sem o evento" = **C3-A1**), `[atômica · reassign]` (a OS mudou de técnico sem o evento), `[atômica · ativação]` e `[atômica · web]` (atribuída sem o evento; o web é o pré-existente C3-A1b), `[composição]` (o objeto não tem o resolver). Os 2 controles (`controle 1`: gatilho na linha → OS+linha já eram atômicas; `controle 2`: sem gatilho → 1+1+1) ficam VERDES no objeto, como devem; os 4 do ciclo 1 e os 2 do backfill também. `PG_TRIGGER=0 PG_PROC=0` ao fim.
- Restauro da cópia: `git checkout -- src` + `git apply --include='src/*' ciclo2.patch` → 0 diferentes do `w-07cb1`.
- Veredito parcial: o `-db` novo nasce vermelho no objeto exatamente nos 4 caminhos do achado C3-A1 (+ composição), e só neles.

### P12 — MT9b no Postgres (01:1x UTC, em curso)
- MT9 = o próprio objeto do ciclo 1 (P11: vermelho). MT9b na cópia (`mutar-mt9.mjs`, âncora interna ocorre exatamente 2× e as 2 do envoltório 1× cada; `tsc --noEmit` ec 0 numa aplicação de ensaio, restaurada por `hash-object`): o `tx.workOrderEvent.create` SAI do `$transaction` da OS e da linha e passa a ser uma SEGUNDA `withTenantRls` no envoltório com RLS, depois da primeira (a forma do ciclo 1 com a interface nova).
- Resultado (01:08, 0 grupos de outros): **`13 · pass 9 · fail 4`** — os 4 `[atômica · create|reassign|ativação|web]` vermelhos (a OS fica atribuída/trocada sem o evento quando ele vai para uma segunda transação); `controle 1`, `controle 2`, `[composição]` e o resto verdes. `PG_TRIGGER=0 PG_PROC=0`. Restauro: cópia de segurança devolvida, `hash-object` = o de antes.
- Veredito parcial: o T-ATOMICA-DB acusa a propriedade (evento dentro da MESMA transação), não a forma: a mutação que mantém a interface nova e só tira o INSERT da transação também fica vermelha.

### P13 — `npm test` inteiro na forma do job `backend` (container, 01:1x UTC, em curso)
- (Escrita na retomada) Tentativa 1 (01:09): **4 grupos** Docker de outros trabalhos → não subi, esperei 120 s (registro do `tl-retry.sh`). Tentativa 2 (01:11, 0 grupos): `teste-linux.sh C:/Users/AMP/w-07cb1` com `npm test` (forma do job `backend`: `CORE_SAAS_PERSISTENCE=memory`, Postgres 16 + Redis 7 próprios, 109 migrações) → `[run-backend-tests] 306 arquivo(s) · 3552 teste(s) · pass 3548 · fail 2 · skipped 2`, `duration_ms 512194`. As 2 falhas = 1 teste e o seu subteste: `not ok 2614 - B-SAN3-05 · o papel de runtime não contorna FORCE RLS` (`tests/san3-05-runtime-role-guard-db.test.ts`). O resumo não trouxe o detalhe (o meu comando só guardava o fim do log) — investigação em P14.

### INTERRUPÇÃO 3 — o VS Code reiniciou (retomada 01:41 UTC)
- Medido: seções P9–P12 completas no relatório (P10, P11 e P12 TÊM resultado registrado; os "em curso" dos títulos são o estado de quando a seção foi aberta); P13 completou durante a queda (log `tl-npmtest-r2.log`, transcrito acima). Cópia `w-07cb1-mut2`: SEM mutação (restaurada depois do MT9b em P12, `hash-object` conferido). Containers: o único grupo `tl*` vivo (`tl179228767029487-*`, montando `C:/Users/AMP/w-trc01`) NÃO é meu (é do trabalho do orquestrador) — não toquei; nenhum container meu parado sobrou (`docker ps -a` sem outro `tl*`). Disco 17 GB.

### P14 — a falha do `npm test`: `B-SAN3-05 · o papel de runtime não contorna FORCE RLS` (01:42 UTC, em curso)
- Hipótese a medir (não fato): interferência de catálogo entre suítes `-db` em paralelo — o meu `-db` faz `CREATE FUNCTION`/`CREATE TRIGGER`/`DROP` fora do `withRoleCatalogLock`, e o `san3-05-runtime-role-guard-db` mexe em papéis e objetos de catálogo. Medição: o arquivo SOZINHO (N=2) e JUNTO com o meu `-db` (N=3), no container, com o detalhe da falha.
- Resultado (01:42, 1 grupo de outros — o do orquestrador — → dentro do limite de 2): `san3-05-runtime-role-guard-db` SOZINHO → **12/12** e **12/12** (N=2); JUNTO com `o6r07c-b-scope-db` no mesmo `node --test` → **25/25**, **25/25**, **25/25** (N=3). **Não reproduz** isolado nem em par com o meu `-db`. Próximo: o `npm test` inteiro de novo, guardando o bloco da falha (P15).

### P15 — `npm test` inteiro de novo, com o bloco da falha guardado (01:46 UTC)
- 0 grupos de outros trabalhos → `teste-linux.sh C:/Users/AMP/w-07cb1 "npm test"` (forma do job `backend`) → `NPMTEST_EC=0`, **`[run-backend-tests] 306 arquivo(s) · 3552 teste(s) · pass 3550 · fail 0 · skipped 2`**. `B-SAN3-05 · o papel de runtime não contorna FORCE RLS` → `ok 2614`, os 11 subtestes verdes (T15 24,3 s; o teste inteiro 65,8 s).
- Leitura (fato × hipótese): FATO — a falha do P13 apareceu em **1 de 2** execuções da suíte inteira e em **0 de 5** execuções focadas (2 sozinho + 3 junto com o meu `-db`); o detalhe da 1ª não foi guardado (erro do meu comando, não da suíte). HIPÓTESE — intermitência de carga: a 1ª rodada coincidiu com a máquina instável (queda de rede, reinício do VS Code, containers de outro trabalho subindo — 4 grupos às 01:09); o teste tem `timeout: 180_000` e subtestes de 24 s+. Não atribuo a causa ao bloco sem medição; fica para a C3 do ciclo 2 e para a CI do PR (fonte primária, R8 do §2.7). Os 2 skips são os `RBAC_DB_PARITY` pré-existentes.

### Fechamento do ciclo 2 (02:00 UTC)
- **Bateria (§2.6), com N e forma:** `npm run check`/`lint`/`build` ec 0 (Windows; `dist/` removido); `git diff --check` ec 0; `tests/o6r07c-b-scope.test.ts` **187/187** (memória); `tests/o6r07c-census-guard.test.ts` sozinho **32/32**; `gravar` N=2 byte-idêntico ao blob do fixture (diff do fixture vazio); regressão em memória (24 arquivos) **483 · pass 482 · fail 0 · skipped 1**; `tests/o6r07c-b-scope-db.test.ts` no container **13/13** (109 migrações; `pg_trigger`/`pg_proc` = 0); `npm test` no container **3552 · pass 3550 · fail 0 · skipped 2** (2ª rodada; a 1ª teve 1 falha intermitente que não reproduziu — P13–P15).
- **Meta §2.10:** N = 41 + 7 = **48**; M = 187 + 13 = **200 ≥ 96** (o previsto pelo plano era ≈196; T-COMPOSICAO 2+1 `-db`, T-ALOCA 5, T-EVID-EXISTE 7 em vez de 2/3/4).
- **Vermelho-controle** (objeto `b198fe35`): memória `187 · fail 82` (P7), censo `32 · fail 1` = T14 com as 3 diferenças do C3-A2 (P7), `-db` `13 · fail 5` = os 4 `[atômica]` + `[composição]` (P11). **Mutações** MT1–MT8, MT10, MT11 (P8) e MT9b no Postgres (P12): todas vermelhas onde o plano previu.
- **Arquivos (15):** os 13 do §2.3, com 2 trocas declaradas — (1) o relatório é ESTA seção de `B-O6R-07c-b1-dev.md` (ordem do orquestrador) em vez de `B-O6R-07c-b1-ciclo2-dev.md`; (2) `tests/fixtures/o6r07c-classificacao-vias.json` NÃO mudou (diff vazio, como o plano esperava) — e **3 fora da lista fechada, declarados (§A2)**: `tests/o6r07b-mime-sniff-routes.test.ts` (P4, arnês classe (iii): OS real no recibo), `tests/field-dispatch-routes.test.ts` e `tests/field-dispatch.test.ts` (P6, classe (ii): o reassign à mesma pessoa virou no-op, o alvo passou a ser um 2º técnico; asserções intactas).
- **PROIBIDO:** `git diff --quiet b198fe35 -- prisma Kpis mobile frontend .github src/app.ts package.json package-lock.json src/modules/core-saas/permissions/catalog.ts src/modules/checklists src/modules/mobile/{mobile-checklist-sync,mobile-evidence-upload,mobile-work-order-sync}.ts src/modules/damages tests/helpers/o6r07c-census.ts RBAC_MATRIX.md CLAUDE.md AGENTS.md` → **ec 0**. Sem migração nova, sem KPI.
- **Residuais e notas para a junta (não são escolhas de desenho minhas; são consequências do plano, medidas):** (a) a trava compara o alvo com o técnico ATUAL da OS: se a OS já é de C e o despacho de A está em No local, até devolver a OS a A é recusado — literal do §2.2(c); (b) `hasActiveDispatchAtSite` lê até 100 despachos da OS (o `limit` do plano); (c) a devolução ao cancelar/falhar feita pelo `operator` fica DECLARADA e aceita, com comentário no código (§2.5); (d) o mutante equivalente do pré-check (e) isolado é declarado, não medido.
- **Não feito por mim (é do orquestrador, §2.6/§2.11):** commit/push, corpo do PR #440 com os números deste head, cópia do plano para `docs/revisoes/SAN3/`, pendências/decisões por APPEND, corpos das cadeiras, check-runs da CI.
- **Limpeza (§C5):** cópia `w-07cb1-mut2` removida por `git worktree remove --force` (sem mutação aplicada no momento: 14 arquivos = o patch do ciclo 2); `dist/` removido; nenhum container meu vivo ou parado (`docker ps -a` sem `tl*` meu); nenhum arquivo não rastreado novo no `w-07cb1`; temporários só em `…/scratchpad/dev07cb1c2/`. Os ` M` de fim de linha em `.agents/` não foram tocados.
