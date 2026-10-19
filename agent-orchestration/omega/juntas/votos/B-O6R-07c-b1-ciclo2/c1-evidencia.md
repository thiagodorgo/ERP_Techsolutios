# C1 `jurado-07cb1c2-c1-cdx` · executor Codex · modelo GPT-5.6 Sol, esforço médio, nível menor (§C7.6) · objeto `7ff1e0039c07b22b84acf8007eef6835560e823a` · corpo blob `.claude/agents/especialistas/jurado-07cb1c2-c1-trava-unica-e-rbac.md` md5 EOL-neutro `4817c69d4de3e037c0083ea50680fd9f` · espelho Codex md5 EOL-neutro `0d990b1c48f6c18aa6ef84fbb13dc817` · `mandato_md5=df627d9923c9b72798a217f8616235ae`

## Estado inicial

- Itens 1–3: EM APURAÇÃO.
- Ata e plano anteriores: A RE-VERIFICAR; nenhuma conclusão herdada como prova.

## Item 1 — grade própria da trava única e censo de escritores

### 1.1 Terreno e execução da grade no app real em memória

- Comando: `npm ci`; depois, na primeira tentativa, `CORE_SAAS_PERSISTENCE=memory node --test --import tsx --test-reporter=dot --test-name-pattern='T-TRAVA|T-COMPOSICAO|T-ALOCA' tests/o6r07c-b-scope.test.ts`.
- Saída resumida: `npm ci` próprio concluiu (`326` pacotes, ec 0, `node_modules` normal e sem junction). A primeira execução da grade terminou ec 1 antes de alcançar a aplicação: `@prisma/client` ainda não gerado, `SyntaxError: ... does not provide an export named 'Prisma'`. Classificação: falha de infraestrutura local, não achado do produto.
- Veredito parcial: conforme o corpo, a falha de infraestrutura não foi tratada como defeito e foi reexecutada após preparar o cliente.

- Comando: `$env:DATABASE_URL='postgresql://x:y@127.0.0.1:1/nada'; npm run db:generate`; remover `DATABASE_URL`; reexecutar duas vezes a grade focada, a segunda com TAP filtrado para o resumo.
- Saída resumida: `prisma generate` ec 0. Reexecução 1 ec 0. Reexecução 2: `tests=187`, `pass=135`, `fail=0`, `skipped=52`, ec 0. A fatia efetivamente selecionada tem forma própria conferida no objeto: `5 estados × 8 vias × 3 papéis = 120` células T-TRAVA, `8` controles positivos em `on_route`, `2` T-COMPOSICAO e `5` T-ALOCA. Estados: despacho `arrived`/`in_service`, OS `on_site`/`in_progress`/`paused`; vias: reassign direto, X1, V2, V3, V4, V5, web e lote; papéis de alocação: `manager`, `field_dispatcher`, `tenant_admin`. As asserções executadas medem 409 + `technician_change_requires_authorization` + mensagem de autorização + retrato idêntico (duas colunas de técnico, status, contagem de atribuições e despachos); X1 mede no-op; V4/V5 medem 200 com OS no técnico presente; o controle positivo exige a troca nas 8 vias.
- Veredito parcial: VERDE — a grade não é toda 2xx nem toda 409; as 120 recusas e os 8 controles positivos discriminam exatamente a fronteira “No local”, sem escrita posterior à recusa.

### 1.2 Papéis pelo catálogo e censo dos escritores

- Comando: `node --import tsx --input-type=module -e "import {resolvePermissionsForRoles} ..."` para os cinco papéis; `git grep -n -E '\.(assign|assignFromDispatch)\(' -- 'src/**/*.ts'`; `Select-String` nos módulos `work-orders`/`field-dispatch` por `assertTechnicianChangeAllowed`, `repository.assign`, `repository.assignFromDispatch`, `assigned_user_id`, `assigned_operator_id` e `workOrderAssignment.create`.
- Saída resumida: catálogo real: `operator=false`, `field_technician=false`, `manager=true`, `field_dispatcher=true`, `tenant_admin=true` para `field_dispatch:create`. Censo de runtime encontrou duas portas que escrevem o técnico da OS: `WorkOrderRepository.assign` e `assignFromDispatch` (memória e Prisma; no Prisma, updates nas linhas 531–547 e 586–599). Seus únicos chamadores de serviço são `WorkOrderService.assign` e `assignFromDispatch`; ambos chamam antes `WorkOrderService.assertTechnicianChangeAllowed` (linhas 1714→1736 e 1825→1837). REST chama `service.assign`; lote `work_order.assign` chama `service.assign`; create/ativação/reassign/devolução do despacho convergem em `FieldDispatchService.assignWorkOrderForDispatch` → `service.assignFromDispatch`. Pré-checks do despacho nas linhas 264, 571 e 657 chamam a mesma função autoritativa; não são gates alternativos. Escritor → chamador → gate: `repository.assign` → `WOS.assign` → gate; `repository.assignFromDispatch` → `WOS.assignFromDispatch` → gate. N=2 portas autoritativas, N=0 escritores de `assigned_*` fora delas.
- Veredito parcial do item 1: **APROVADO** — execução própria verde, censo sem escape e RBAC de alocação derivado do catálogo, não do rótulo do papel.

## Item 2 — vermelho do ciclo 1 e MT1–MT5

### 2.1 Objeto do ciclo 1, A1/A2 A RE-VERIFICAR

- Comando: `git -c core.autocrlf=false checkout b198fe358b41186b2598ab258ccb735da8c04cbc -- src`; conferir `git hash-object` contra `<ciclo1>:<arquivo>` nos 6 arquivos de produto do ciclo 2; executar `node --test --import tsx --test-reporter=tap --test-name-pattern='T-TRAVA' tests/o6r07c-b-scope.test.ts`; restaurar com `git -c core.autocrlf=false checkout 7ff1e003... -- src` e repetir a prova de hash.
- Saída resumida: `CICLO1 HASH_BAD=0`; vermelho ec 1, `tests=187`, selecionados `128`, `pass=58`, `fail=70`, `skipped=59`. A1/A2 reapareceram em X1, V2, V3, V4, V5, web e lote nos estados de despacho `arrived`/`in_service`; nos estados da OS, X1/web/lote também ficaram vermelhos; o controle positivo X1 acusou a alteração indevida do status. `RESTAURADO_OBJETO HASH_BAD=0`; `git status --short` vazio.
- Veredito parcial: régua válida — o objeto anterior não passa silenciosamente; as classes A1/A2 foram reproduzidas por execução própria e o objeto atual foi restaurado byte-idêntico.

### 2.2 Mutantes independentes, uma âncora por vez

- Comando MT1: no objeto restaurado, mutar somente o resolver padrão para consultar e devolver `false`; rodar `--test-name-pattern='T-TRAVA \\[d1|T-COMPOSICAO'`; restaurar `work-order.service.ts` pelo objeto e comparar `hash-object`.
- Saída resumida MT1: ec 1; selecionados `50`, `pass=13`, `fail=37`, `skipped=137`; a grade de despacho em No local e a composição acusaram o resolver permissivo. `MT1_RESTAURADO=True`.
- Veredito parcial MT1: vermelho válido.

- Comando MT2: remover apenas o retorno no-op de reassign à mesma pessoa; rodar `--test-name-pattern='T-TRAVA .*X1'`; restaurar e comparar hash.
- Saída resumida MT2: ec 1; selecionados `16`, `pass=0`, `fail=16`; X1 falhou nos 5 estados × 3 papéis e no controle positivo. `MT2_RESTAURADO=True`.
- Veredito parcial MT2: vermelho válido.

- Comando MT3: remover apenas `if (DISPATCH_SERVICE_STARTED.has(closedPreviousStatus)) return`; rodar `--test-name-pattern='T-TRAVA .*V4|T-TRAVA .*V5'`; restaurar e comparar hash.
- Saída resumida MT3: ec 1; selecionados `32`, `pass=20`, `fail=12`; exatamente V4/V5 nos 2 estados do despacho × 3 papéis foram acusados, enquanto os estados da OS continuaram cobertos pela guarda própria. `MT3_RESTAURADO=True`.
- Veredito parcial MT3: vermelho válido.

- Comando MT4: remover apenas o gate de `WorkOrderService.assign`; rodar `--test-name-pattern='T-TRAVA .*web POST /assign|T-TRAVA .*lote work_order.assign|T-COMPOSICAO.*SEM'`; restaurar e comparar hash.
- Saída resumida MT4: ec 1; selecionados `33`, `pass=2`, `fail=31`; web/lote (30 células) e o fail-closed sem resolver foram acusados. `MT4_RESTAURADO=True`.
- Veredito parcial MT4: vermelho válido.

- Comando MT5: incluir `on_route` em `DISPATCH_SERVICE_STARTED`; rodar `--test-name-pattern='T-TRAVA controle positivo'`; restaurar e comparar hash.
- Saída resumida MT5: ec 1; selecionados `8`, `pass=0`, `fail=8`; toda via legítima anterior a No local foi recusada e a régua acusou. `MT5_RESTAURADO=True`; `git status --short` vazio.
- Veredito parcial do item 2: **APROVADO** — objeto anterior e MT1–MT5 ficaram vermelhos nas propriedades previstas; todas as mutações foram restauradas por hash e nenhuma permaneceu no worktree.

## Item 3 — RBAC, composição fail-closed e decisões Q1/Q2 mantidas

### 3.1 RBAC da ativação e composição

- Comando: reexecutar `node --test --import tsx --test-reporter=tap --test-name-pattern='T-ALOCA' tests/o6r07c-b-scope.test.ts`; importar `resolvePermissionsForRoles` para os cinco papéis.
- Saída resumida: `tests=187`, selecionados `5`, `pass=5`, `fail=0`, ec 0. Catálogo: `operator=false`, `field_technician=false`, `manager=true`, `field_dispatcher=true`, `tenant_admin=true` para `field_dispatch:create`. Os dois primeiros receberam 403 `dispatch_activation_requires_dispatcher`, com OS e rascunho intactos; os três papéis com a permissão ativaram e atribuíram. A célula é decidida pela permissão importada, não pelo nome do papel.
- Veredito parcial: verde.

- Comando: sonda direta com `WorkOrderService` + `InMemoryWorkOrderRepository`, resolver `hasActiveDispatchAtSite` que lança `C1_READ_FAIL`; criar OS, fazer atribuição inicial, tentar trocar e comparar OS, `assignments` e `events` antes/depois. O caso sem resolver já foi reexecutado em T-COMPOSICAO no item 1.
- Saída resumida: `ERRO_RESOLVER_PROPAGA=SIM OS_INTACTA=SIM ATRIBUICOES_INTACTAS=SIM EVENTOS_INTACTOS=SIM`, ec 0. `createDefaultReferenceResolvers()` expôs função e leu o despacho real na T-COMPOSICAO; ausência e erro não viraram permissão.
- Veredito parcial: fail-closed confirmado antes da escrita.

- Comando MT6: substituir apenas a semântica de resolver ausente por `false`; executar T-COMPOSICAO; restaurar e comparar hash. Comando MT7: restaurar apenas o critério por papel (`!actorMutatesAssignedOnly`) em `assertMayActivateDraft`; executar T-ALOCA; restaurar e comparar hash.
- Saída resumida: MT6 ec 1, selecionados 2, `pass=1`, `fail=1`, `MT6_RESTAURADO=True`; MT7 ec 1, selecionados 5, `pass=4`, `fail=1` (`operator`), `MT7_RESTAURADO=True`.
- Veredito parcial: os controles fabricados acusam exatamente a composição permissiva e a célula RBAC divergente.

### 3.2 Devolução sem troca e residual V4b

- Comando: acrescentar temporariamente sondas no próprio arnês real, executar só `C1-SONDA`, e restaurar `tests/o6r07c-b-scope.test.ts` pelo objeto com prova de `hash-object`. Sonda válida: `operator` marca `failed` em despacho `arrived`; sonda de decisão: `field_dispatcher` cancela em `arrived` e, depois, `manager` cria novo despacho (V4b); controle adicional: o próprio `field_technician` marca `failed`.
- Saída resumida: uma primeira hipótese de sonda tentou `operator` + `cancelled` e recebeu 403 `permission_required` por falta de `field_dispatch:cancel`; isto não é defeito da decisão — a decisão nomeia cancelamento pelo despachante e `failed` pelo técnico, enquanto o plano aceita a devolução do `operator` ao encerrar. Corrigida a forma: V4b dispatcher + V5 técnico = `pass=2`, `fail=0`; `operator` + `failed` = `pass=1`, `fail=0`. Em todos, o encerramento foi 200 e OS/operador/status/contagem de atribuições ficaram intactos; no V4b, o despacho posterior foi 201 e então redistribuiu, exatamente o residual do b2. Cada rodada terminou `SONDA_RESTAURADA=True` e árvore limpa.
- Veredito parcial: verde à luz de `D-07CB1-CANCELAR-NO-LOCAL-SEM-AUTORIZACAO`; nenhum efeito além do declarado foi medido.

### 3.3 Q1/Q2, cerca do b1 e controles do classificador

- Comando: em `origin/main:agent-orchestration/controle/decisoes.md` e no objeto, localizar por comando `D1-07c`, `D2-07c`, `D-07CB-EMENDA-RECOMENDACOES`, `D-INICIO-ATENDIMENTO-CONFIRMADO`, `D-07CB1-TRAVA-ATE-B2`, `D-07CB1-TECNICO-SEM-ATIVAR-RASCUNHO`, `D-07CB1-CANCELAR-NO-LOCAL-SEM-AUTORIZACAO`, `D-07CB1-ATRIBUICAO-WEB-REATRIBUI-NO-B2`, `D-07CB1-EVIDENCIA-EXIGE-OS`.
- Saída resumida: todos presentes nas duas refs. Linhas em `origin/main`: 3166, 3171, 3658, 3719, 3709, 3711, 3728, 3729 e 3730; mesmas linhas no objeto. Q1 confirma cancelamento/falha sem troca no b1 e deixa a fila para b2; Q2 confirma que a reatribuição conjunta web/lote antes de No local pertence ao b2, mantendo no b1 apenas a trava única.
- Veredito parcial: decisões aplicáveis localizadas em fonte, sem usar a ata como prova.

- Comando: varrer o delta dos 6 arquivos de produto ciclo1→objeto por `approval.*`, `approval_`, `CA6`, `CA7`, `authorization_queue`, `durable_queue`, `superior_decision`; executar o mesmo regex contra irmão positivo fabricado; comparar base×objeto para um arquivo sabidamente alterado e `prisma/schema.prisma` sabidamente intacto.
- Saída resumida: `B2_SCANNER_DIFF_HITS=0`; `B2_SCANNER_POSITIVE_CONTROL=1`; `KNOWN_CHANGED=1`; `KNOWN_PROHIBITED_INTACT=0`. O b1 não implementou fila durável, decisão superior, CA6/CA7 nem `approval.*`; o varredor não é vazio-cego.
- Veredito parcial do item 3: **APROVADO** — RBAC, fail-closed, devoluções e cerca b1/b2 conferem por execução e leitura na ref.

## Legalidade e pré-teardown

- Comando: `git ls-remote origin refs/heads/fix/o6r07cb1-despacho-atribui`; `gh pr view 440 --json ...`; inspeção do parecer; MD5 EOL-neutro dos dois corpos e do mandato; `git merge-base origin/main <objeto>`; `git status --short`; busca de processos/containers prefixados.
- Saída resumida: ramo remoto e PR = `7ff1e0039c07b22b84acf8007eef6835560e823a`; 14/14 check-runs `COMPLETED/SUCCESS`; inspetor `LIBERADO` nomeando C1, worktree e terreno; corpo Claude `4817c69d4de3e037c0083ea50680fd9f`, espelho Codex `0d990b1c48f6c18aa6ef84fbb13dc817`, mandato `df627d9923c9b72798a217f8616235ae`; `B=c260d36201f6e835799e7f96a14bc9eb8889ca5a` tanto na medição inicial quanto contra `origin/main` final. `origin/main` observado ao fim em `a26f8afe74b73d9379b4fae5deba312875c2427b`; o tip inicial não foi capturado separadamente (não o invento), e a cerca relevante permaneceu `B=c260d362...`. Árvore detached no objeto e limpa; containers `j07cb1c2-c1-*` = 0; processos Node apontando ao worktree = 0; base viva não acessada; nenhuma porta publicada/usada.
- Veredito parcial: terreno legal e limpo para emitir voto; ata/plano anteriores permaneceram somente roteiros A RE-VERIFICAR.

## Teardown

- Comando: validar alvo absoluto `C:\Users\AMP\w-j07cb1c2-c1-cdx`; `git -C C:/Users/AMP/w-07cb1 worktree remove --force <alvo>`; conferir caminho, registro de worktree, containers próprios e espaço livre.
- Saída resumida: `EXISTS_AFTER=False`; registro do worktree `count=0`; `OWN_CONTAINERS_AFTER=0`; espaço livre `10,04 GB`. O removido foi somente o worktree descartável e seu `node_modules` regenerável; base viva permaneceu intocada.
- Veredito parcial: teardown completo; hashes das mutações haviam sido restaurados e a árvore estava limpa antes da remoção.

