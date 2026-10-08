papel: C3′ | identidade: jurado-san3-11-c2-registro-e-escopo | modelo: Codex GPT-5.6 Sol (substituição declarada: dono suspendeu Fable e Astra até o reset semanal em 2026-10-03; B-SAN3-11 não toca dinheiro) | mandato_md5: d3e79477153562167aab40620ca0cd80 (declarado no disparo: d3e79477153562167aab40620ca0cd80) | corpo_recebido_md5: 18d4663667b75007dbe4082268b13728 | corpo_blob_md5: 18d4663667b75007dbe4082268b13728

# Evidência incremental — C3′ ciclo 2 — B-SAN3-11 / PR 401

## Legalidade antes do mérito — 2026-10-04 UTC

- Carga da máquina: CPU 9% na revalidação conclusiva (8 núcleos; `Win32_Processor.LoadPercentage`). A máquina também executa as frentes declaradas pelo disparo; nenhuma delas foi tocada.
- Comandos: `git ls-remote origin refs/heads/fix/dossie-versao-da-vistoria refs/heads/main`; `gh pr view 401 --json headRefOid,baseRefOid,headRefName,baseRefName,state,isDraft,mergeable,url`; `git diff --name-status 3ec6f52b2be38160f82dc8f766948b685a3de79e d24f7283bfba55d298e8118e7b590465c5a4d4d6`; `gh api repos/thiagodorgo/ERP_Techsolutios/commits/d24f7283bfba55d298e8118e7b590465c5a4d4d6/check-runs?per_page=100` com filtro publicado `status != completed || conclusion != success` e pendentes `status != completed || conclusion in {cancelled,queued,in_progress,null}`.
- Saída resumida: git remoto = gh = `d24f7283bfba55d298e8118e7b590465c5a4d4d6`; PR OPEN, draft, MERGEABLE; `origin/main=b404815ce3d1f1b8e5121bd1526978f7222e7479`; delta desde o objeto liberado pelo inspetor `3ec6f52b...` contém exatamente 1 arquivo, `A agent-orchestration/omega/juntas/votos/B-SAN3-11/00-inspetor-terreno-c2.md`; `d24f7283` é filho direto de `3ec6f52b`; check-runs `total=14 | não-verdes=0 | pendentes=0`, todos `completed/success`.
- Corpo/mandato: MD5 EOL-neutro do corpo recebido = blob = `18d4663667b75007dbe4082268b13728`; mandato medido = declarado = `d3e79477153562167aab40620ca0cd80`. O corpo foi carregado do blob do objeto, conforme R-CORPOS.
- Inspetor: `00-inspetor-terreno-c2.md`, 3ª instância, veredito `LIBERADO COM RESSALVA`; R-CORPOS e R-PERDA aplicadas. A diferença até o head corrente é apenas o próprio parecer. O parecer confere nominalmente C3′ e o worktree próprio `w-s11k2c`.
- Quórum: unanimidade de 3 com veto. Antes deste voto não foi lido voto nem worktree de outra cadeira do ciclo 2.
- Veredito parcial: LEGALIDADE CONFIRMADA; mérito autorizado no objeto `d24f7283bfba55d298e8118e7b590465c5a4d4d6`.

## Terreno próprio — 2026-10-04 UTC

- Carga da máquina: CPU 7% (`Win32_Processor.LoadPercentage`).
- Comando: `git worktree add --detach C:/Users/AMP/w-s11k2c d24f7283bfba55d298e8118e7b590465c5a4d4d6`; criação de scratch exclusivo `C:/Users/AMP/AppData/Local/Temp/c3c2-b-san3-11-d24f7283`; conferências `rev-parse HEAD`, `status --porcelain`, `config --get core.autocrlf`, `node -v`, `python --version`, `Test-Path .git`.
- Saída resumida: worktree criado por esta cadeira; HEAD `d24f7283bfba55d298e8118e7b590465c5a4d4d6`; status vazio; `core.autocrlf=true` (checkout CRLF); `.git` existe; Node `v20.19.5`; Python `3.13.14`; shell PowerShell/Windows 11; cwd de mérito `C:/Users/AMP/w-s11k2c`; nenhuma variável `MSYS_NO_PATHCONV` exportada.
- Veredito parcial: TERRENO PRÓPRIO CONFIRMADO; sem junction e sem acesso à base viva.

### Dependências próprias

- Carga da máquina: CPU 0% antes do `npm ci` frontend; CPU 6% antes do `npm ci` raiz. Cada comando foi executado em série e com timeout externo de 900 s.
- Comandos: `npm ci --no-audit --no-fund` em `C:/Users/AMP/w-s11k2c/frontend`; `npm ci --ignore-scripts --no-audit --no-fund` em `C:/Users/AMP/w-s11k2c`; stdout/stderr em logs do scratch exclusivo.
- Saída resumida: frontend `ec=0`, 103 pacotes; raiz `ec=0`, 326 pacotes; aviso EBADENGINE de `@prisma/streams-local` (Node >=22 exigido, runtime local v20.19.5), sem falha. Instalações físicas dentro do worktree, sem junction/symlink.
- Veredito parcial: DEPENDÊNCIAS PRÓPRIAS INSTALADAS; nenhum teste falhou por carga/tempo.

### S0, identidade e normas da ref julgada

- Carga da máquina: CPU 0% nas duas medições (`Win32_Processor.LoadPercentage`).
- Comandos: `node scripts/sync-agent-agents.mjs --check` com timeout 120 s; leitura do blob `OBITUARIO-IDENTIDADES.md` e contagem literal da identidade; leitura de `d24f7283:CLAUDE.md` e contagem das âncoras exigidas pelo corpo; `git ls-tree ... scripts/ | Select-String mandato-`; `git status --porcelain`.
- Saída resumida: S0 `ec=0`, `OK — 33 agentes, espelho consistente`; identidade desta cadeira no obituário = 0; cada uma das 22 âncoras contratuais exigidas retornou N=1; scripts `mandato-*` na ref = 0; status do worktree vazio. A primeira tentativa de imprimir as contagens gerou `NaN` por precedência na expressão JavaScript e foi descartada; a rotina corrigida foi reexecutada inteira e produziu N=1 por âncora.
- Veredito parcial: IDENTIDADE E NORMAS CONFIRMADAS NA REF JULGADA; nenhuma cláusula externa ao objeto será aplicada.

## Item 1 — APROVADO — P-o + T10 + T11′ (A34) + allowlist

- Carga da máquina: CPU por medição, em ordem, `11%, 3%, 12%, 26%, 7%, 0%, 10%, 7%, 2%, 1%, 6%, 4%, 18%, 2%`; nenhuma falha temporal. Testes/mutações foram seriados.
- P-o, comando: extração por regex do primeiro bloco `ts` sob `## Apêndice D` em `docs/revisoes/SAN3/B-SAN3-11-plano.md`; terminal LF preservado; MD5 EOL-neutro `57671f2979d477ca8272226badc85d05`; execução pelo `tsx` próprio do frontend com `REPO_ROOT=file:///C:/Users/AMP/w-s11k2c`.
- P-o, saída (`ec=0`): ambas = `{super_admin, tenant_admin, manager, technician, viewer, platform_admin, operator, field_technician, auditor}`; só `impound:read` = `{field_dispatcher}`; só `checklist_runs:read` = `{finance, inventory, support}`; nenhuma = `{}`. `RBAC_MATRIX.md:134` declara leitura de impound para as 9 de ambas + `field_dispatcher`; regra de célula: papel listado em `read` lê, papel em `NÃO (nem read)` não lê. A interseção executada coincide; `technician/viewer` vêm do catálogo, pois não são colunas da tabela de checklist.
- Vermelho-controle P-o: rotina de comparação real produziu `extra=[]/missing=[]` em quatro grupos; cópia fabricada adicionando `checklist_runs:read` ao `field_dispatcher` acusou nominalmente `both.extra=[field_dispatcher]` e `onlyImp.missing=[field_dispatcher]`.
- Guarda/gate, leitura no objeto: `src/modules/impound/impound.routes.ts:201-206` registra GET `/impound-processes/:processId/checklist-runs` com `requirePermission(IMPOUND_PERMISSIONS.read)` (`impound:read`) + `requirePermission("checklist_runs:read")`; `src/app.ts:164` monta `createImpoundRouter()` sob `/api/v1`; `useProcessChecklistRuns.ts:20` exige `can("checklist_runs:read")`; `VehicleDossieModal.tsx:232`, `ProcessoDossiePage.tsx:141` e `DossiePrintDocument.tsx:94-95` mantêm `canReadChecklist`. `git diff --name-only origin/main...HEAD -- src <hook> <modal> <pages>` retornou N=0; irmão `ChecklistRunsPanel.tsx` retornou N=1. O diff integral de `DossiePrintDocument.tsx` contém só `idPrefix="vistoria-impressa"`, mantendo o gate.
- T10: `node --test --import tsx --test-name-pattern T10 tests/patios-dossie-versao.smoke.test.tsx` no frontend, timeout 600 s: `pass=1 fail=0`, `ec=0`. `patios-dossie-modal.smoke.test.tsx`: `16/16`, incluindo os dois testes de presença/ausência da aba.
- Vermelho-controle T10: cópia pristina; âncora única N=1; condição `effectiveTab === "checklist" && canReadChecklist` substituída por `true`; T10 `pass=0 fail=1 ec=1`, mensagem `expected to not match /Versão substituída/`; restore `hash-object=blob=049886ea2e00826ff4d2ed89eef0365a2ab45012`. Uma tentativa anterior não alterou o arquivo por erro de quoting do `node -e`; o T10 verde dessa tentativa foi descartado e o controle foi refeito inteiro pelo script PowerShell acima.
- T11′: teste filtrado no objeto `pass=1 fail=0 ec=0`. Sonda própria temporária, no diretório de testes e depois removida, renderizou as três superfícies com UUIDs. Tabela (`fora = total-id-href`):

| superfície | UUID | total | id | href | fora |
|---|---:|---:|---:|---:|---:|
| painel | `11111111-1111-4111-8111-111111111111` | 1 | 1 | 0 | 0 |
| painel | `44444444-4444-4444-8444-444444444444` | 2 | 1 | 1 | 0 |
| painel | `55555555-5555-4555-8555-555555555555` | 2 | 1 | 1 | 0 |
| impressão | mesmos três UUIDs | `1/2/2` | `1/1/1` | `0/1/1` | `0/0/0` |
| VehicleDossieView | mesmos três UUIDs | `1/2/2` | `1/1/1` | `0/1/1` | `0/0/0` |

- Vermelho-controle T11′: inserção restaurável `title={run.currentRunId}` no link vigente (âncora N=1). T11′ original `ec=1`, `run-u2 aparece 3× mas só 1 como id e 1 como href`; sonda `ec=1`, UUID `5555…` com `total=3 id=1 href=1 fora=1`. Restore `hash-object=blob=d8a4269b9d8afa0d3ee6ee2b43507e52bd8f7a83`; sonda removida.
- Allowlist: `useProcessChecklistRuns.ts:50-57` transforma falha não-`ApiError` em mensagem fixa `Não foi possível carregar os checklists do guincho.`. Render do painel no estado de erro, executado do cwd frontend após descartar uma primeira tentativa com duas cópias de React, produziu `FIXED_PRESENT=true` e N=0 para `currentRunId`, `supersededByRunId`, `reopenedFromRunId`, `campo de versão`; `ec=0`. T11′ também ficou verde para UUID/`tenant`/`work_order` fora do texto.
- Veredito parcial do item 1: **APROVADO**. Nenhum achado; conjuntos, guarda dupla, gates, T10, T11′, controles e allowlist satisfazem a propriedade.

## Item 2 — APROVADO — A37 + escopo integral + A18″ + A25″

- Carga da máquina: CPU por medição desta fase, em ordem, `1%, 21%, 9%, 1%, 0%, 1%, 42%, 1%, 3%, 2%, 21%, 33%, 5%, 14%, 10%, 17%, 5%, 34%`; nenhuma falha por tempo. A tentativa de chamar `bash` pelo alias WSL falhou (`/bin/bash` ausente) e foi descartada; a execução válida usou `C:/Program Files/Git/bin/bash.exe`.
- Fontes de escopo extraídas do objeto: §16.3 autoriza os três arquivos de produto do ciclo 2 (`ChecklistRunsPanel`, `DossiePrintDocument`, `processes.adapter`), os dois testes `patios-dossie-{checklist,versao}`, o censo, `pendencias{,-indice}.md`, quatro artefatos KPI, comando/log/status e `B-SAN3-11-DEV.md`; §16.4 acrescenta a §16 do plano, registro da junta e exatamente três corpos C1′/C2′/C3′ em cada espelho. Para o bloco inteiro, somei §6, §15.5, §15-bis.8 e §16.4. §C4 proíbe `prisma/**`, `migrations/**`, `infra/**`, `.env`, lockfiles JS e `pubspec.yaml/lock`; padrões `/**` foram tratados como prefixo recursivo e caminhos nominais como igualdade exata.
- Ancestralidade/merges: `git merge-base --is-ancestor 653532f7 HEAD` → `ec=0`; merges no intervalo: `77abde50…` (pai integrado `b404815c…`, `origin/main`) e `8c8f4a1c…` (registro). O Apêndice F2, md5 EOL-neutro `ac50331715f6344b3629a3dc67a88330`, separou `[653532f7,d24f7283]`: tocados 39, **PRÓPRIO 36**, **DA-MAIN 3**. DA-MAIN = `B-GOV-PAUSA/PORTEIRO-399.md` e os dois registros `B-SAN3-01b/porteiro-403`; nenhum foi imputado ao bloco.
- A37 por caminho: os 36 PRÓPRIOS casaram nominalmente §16.3/§16.4 — seis corpos espelhados, quatro KPI, comando/log/pendências/status, 13 registros de junta, plano, três arquivos de produto, dois testes e censo —, `FORA=0`. Contagens no PROIBIDO: `src/`, `tests/` raiz, `mobile/`, `prisma/`, styles, UI compartilhada, `frontend/package.json`, `.github`, modal/página/hook/service, `.py`, CLAUDE/AGENTS, shell KPI, lockfiles e teste de impressão = **0** cada. Controle fabricado `frontend/src/styles/global.css` → `FORA-ACUSADO`.
- Bloco inteiro: `git diff --name-only origin/main...HEAD` retornou 65 caminhos; laço sobre a união permitida classificou todos e `BLOCK_FORA=0`. Inclui o registro obrigatório `omega/reprovacoes/R-B-SAN3-11-1.md`; nenhuma alteração de produto escapou à soma das quatro seções. `git diff ... -- src tests mobile prisma` = N=0, com irmão `frontend/tests/patios-dossie-versao.smoke.test.tsx` = N=1.
- Pontos destacados do escopo: `DossiePrintDocument.tsx` = `1 1`, único hunk troca a mesma chamada por `idPrefix="vistoria-impressa"`; `processes.types.ts` não é PRÓPRIO do ciclo 2; teste checklist = `3 3`, somente três fixtures ganham os campos de versão nulos e `assert.` fica `49 → 49`; plano = `630 0`, deleções 0, primeira adição após a §15-bis e somente §16/§16-bis. O raw two-dot de pendências contém o merge da main; comparado à main integrada, o patch do bloco altera somente a linha de status de `P-CHK-DOSSIE-VERSAO-NA-UI` e as duas entradas `P-SAN3-11-*`, como permitido.
- Corpos/paridade: `git ls-tree` contou `.agents=3`, `.claude=3`, total 6; nome inexistente `jurado-san3-11-c2-zz` = 0; `node scripts/sync-agent-agents.mjs --check` → `ec=0`, `OK — 33 agentes`; CLAUDE/AGENTS no diff = 0/0.
- §A2 nos seis conflitos: contra a main integrada `b404815c`, `kpis-history.json`, log e status são append-only (`15/0`, `20/0`, `16/0`); `kpis-latest.json` é o snapshot declarado substituído; `pendencias-indice.md` é regeneração integral declarada; `Kpis/app.js` troca somente a única linha `var FROZEN`. Comparação da linha compartilhada: merge-base antigo e main integrada publicam `B-SAN3-01b`, `1214/1214`, blocos 170; S publica `B-SAN3-11`, `1230/1230`, 171; objeto publica `B-SAN3-11`, `1238/1238`, 171. Portanto a linha própria prevalece conscientemente sobre a linha da main, sem apagamento silencioso.
- A18″: instrumentos extraídos por parse e md5 EOL-neutro: F1 `3702f28f8ca899543597fea02a60c320`; varredura v2 `646b13719214cedd6cc8fbd6296364e5`, auto-teste `false true`; base real `merge-base(origin/main,HEAD)=b404815c…`. Resultado: `MUT=9 EOL=3 CP=1 TETO=0 NULL=0 WRITE=4`; classes `MUT-html=3`, `MUT-norm=1`, `MUT-mutate=5`, `EOL-norm=1`, `EOL-mutate=1`, `EOL-nome=1`, `CP-arnes=1`; **CLASSE=0**, normalizador presente, verde. Leitura do único callback relevante confirma que opera sobre o argumento `s` já normalizado.
- Controles A18″: V1 `exitCode: result.status ?? 1` → `NULL=1`, `CLASSE-NULL=1`, vermelho. V3 moveu a regex do T14 para `writeFileSync(...readFileSync(...).replace(...))`: os totais discriminantes ficaram `MUT=9 EOL=3`, mas surgiram exatamente 2 hits fora da classe (`MUT` + `EOL` na linha 487), vermelho. Restore verificado por `hash-object=HEAD blob=5b15671c…`; `checkout-index -f` apenas repôs os bytes CRLF do checkout após o conteúdo canônico já coincidir, e o status voltou vazio.
- A25″: F3 md5 `2519a717e6a5fbdca26a94fcbd73c77e`; em `92cfc05e`, N=3 (`T12,T13,T14`), e no objeto N=6 (`T12,T13,T14,T20,T21,T22`), sempre sem chamada fora de `test()` de topo. O arnês é byte-equivalente por AST nas duas refs: `runCenso=fdf1a8cc91c9ab9389eaed5490447b21`, `mutate=c6663a49f7a0913e7981b5e8608c004a`. O delta PRÓPRIO contém zero `frontend/package.json`, `.github/**` ou teste de impressão; o único caminho compartilhado de linha única, `Kpis/app.js`, foi comparado acima.
- Veredito parcial do item 2: **APROVADO**. Escopo próprio e integral fecham; controles acusam; A18″ e A25″ medem propriedades e não as formas revogadas.

### RETOMADA após queda da sessão

- Queda informada pelo orquestrador: aproximadamente `2026-10-04T04:00:00Z`, durante a apuração do item 2; erro: limite de uso da conta OpenAI. Retomada desta mesma instância medida em `2026-10-04T13:30:29Z`.
- Carga na retomada: CPU 18% (`Win32_Processor.LoadPercentage`). Estado medido antes de confiar: worktree existe, `HEAD=d24f7283bfba55d298e8118e7b590465c5a4d4d6`, `git status --short` vazio; a única linha de processo associada ao caminho era o próprio `pwsh.exe` da medição; nenhum runner anterior ficou vivo.
- Instalações: `node_modules/.package-lock.json` e `frontend/node_modules/.package-lock.json` existem e ambos parseiam como JSON (`ec=0`); portanto os dois `npm ci` anteriores estão materialmente presentes e não foram refeitos. O item 1 já estava persistido no voto JSON; item 2 e item 3 permaneciam `EM APURAÇÃO`.
- Regra R-PERDA aplicada sem sucessão: como é continuação da mesma instância, mantive a identidade e re-medi o terreno; nenhum voto perdido foi convertido em aprovação.

## Item 3 — APROVADO — A15′ + A26 + A35 + A36

### A15′ — APROVADO — donos e texto

- Carga: CPU `10%, 23%, 24%, 9%, 4%, 4%`; a primeira rotina PowerShell não iniciou por erro de parse em `:$i:` e foi descartada/reexecutada. A primeira cópia-controle alterou por engano o precedente homônimo, não a entrada-alvo; a leitura mostrou o alvo ainda válido, esse resultado foi descartado e a mutação contextual correta foi executada.
- Parse das entradas: `P-SAN3-11-VIGENTE-NAO-VINCULADA`, linhas 9988–10003, `ABERTA`, baixa, não bloqueia, dono `trilha CHECKLIST P1, PR-05 (bloco dono proposto pela fatia; plano SAN3: não nomeada no gate (§4.1))`; o precedente `P-WEB-CHK-EXECUCOES-INEXISTENTES` traz o mesmo dono na linha 8493. `P-SAN3-11-ORDEM-DO-REPOSITORIO-INDEFINIDA`, linhas 10005–10015, `ABERTA`, baixa, não bloqueia, dono canônico `B-O6R-12 (plano SAN3, l.258 …)`; a tabela delimitada da §5 de `PLANO_SAN3.md` (223–331) contém `B-O6R-12` na linha 258 e autoriza `impound-prisma.repository.ts`.
- Texto × blob: `checklist-prisma.repository.ts:806-807` copia `related_entity_type/id` da run anterior; `impound-prisma.repository.ts:155` chama `autoLinkChecklistRuns` durante a criação e `:205` define o helper; `processes.adapter.ts:576-577` documenta e executa `startedAt desc`. As citações das pendências estão atuais.
- Frases retiradas, com whitespace normalizado: em `653532f7`, cada uma tem N=1 — `B-SAN3-12 ou bloco dedicado`, `gerou uma nova order`, `a definir`, `o painel exibe as runs na ordem recebida (sem reordenar)`; no objeto, N=0 para cada. IDs `P-*` novos no diff contra a main = exatamente 2, as duas entradas acima.
- Vermelho-controle: numa cópia em scratch, o dono do primeiro item foi trocado para `a definir`; o leitor de propriedade retornou `valid=false`, enquanto o gerador oficial ainda publicou a coluna `dono=sim`. Isso reproduz nominalmente a cegueira da linha `bool(re.search(...(?!a atribuir)))` sem cobrar seu conserto neste bloco.
- Veredito A15′: **APROVADO**.

### A26 — APROVADO — índice reproduzível

- Carga: CPU `1%, 1%, 2%`. Li o gerador antes da execução; ele abre `pendencias-indice.md` no lugar com `newline=''` e não possui modo check. Execução isolada por `Start-Process` oculto + `WaitForExit(120000)` → `ec=0`: `434 cabeçalhos / 423 IDs`, `FECHADA=116`, `ABERTA=318`, baldes `-=116 C=69 B=111 A=138`.
- MD5 EOL-neutro gerado × blob: `441c4ac24ef4b07f1324b0f45f69c18d` = `441c4ac24ef4b07f1324b0f45f69c18d`. O status marcou `M` apenas pelos bytes LF do gerador; `git hash-object` real = blob `e10af7cc30ef7ba956439fe670b7292b1599c14c`.
- Conteúdo: seção `SEM STATUS ... — 0`; placar e seção `CONTRADITORIAS ... — 0`; `P-CHK-DOSSIE-VERSAO-NA-UI` sob `FECHADAS — 116`; as duas `P-SAN3-11-*` sob `ABERTAS · balde B`; forma malformada `status:** **RESOLVIDA` em pendências = N=0.
- Vermelho-controle: removi o título do índice; hash virou `3e4b1c2b…` ≠ blob. Nova execução do gerador em <120 s restaurou `e10af7cc…` = blob. `checkout-index -f` repôs somente os bytes CRLF do checkout; hash continuou igual e status voltou vazio.
- Veredito A26: **APROVADO**.

### A35 — APROVADO — backfill verdadeiro

- Carga: CPU `0%, 5%, 1%, 83%, 63%, 3%, 3%, 100%`; nenhuma execução falhou por tempo. `git fetch origin main` manteve `origin/main=b404815ce3d1f1b8e5121bd1526978f7222e7479`, igual à main integrada.
- No objeto, `NÃO PAGO` exato = 0 em `kpis-latest.json`, `kpis-history.json` e `kpis-history.md`. Em `653532f7`, o exato dá 1/1/0 porque o Markdown usa `NÃO pago`; a mesma busca case-insensitive dá 1/1/1 na ref antiga e 0/0/0 no objeto. Registro explícito da divergência da hipótese do corpo, sem alterar a propriedade medida.
- History real da main: N=166; entrada única `B-SAN3-01b`: `pr=402`, `merge_commit=3e40a256ce801a8e63230b4b764ba1d2803f4f23`, `approved_head=cdf370dcb4c817e1c4292aed1204140951616971`, `blocks_completed=170`. Ela também é a última entrada que conta bloco; rotina de dívida retorna `DUE=false`.
- A `backfill_note` do objeto cita exatamente `pr 402 · 3e40a256 · cdf370dc`, declara o pagamento pelo #403 e a correção pelo #404, e mantém os campos do próprio #401 nulos na autoria. Confere com a main real; nenhum backfill anterior está devido.
- Vermelho-controle: cópia exata do blob `origin/main:Kpis/kpis-history.json` em scratch, criada por índice Git temporário (`COPY_N=166`, última `B-SAN3-01b`); `merge_commit` da última entrada foi posto em `null`. A mesma rotina retornou `DUE=true`, nomeando `B-SAN3-01b`, `pr=402`; portanto discrimina dívida real.
- Veredito A35: **APROVADO**.

### A36 — APROVADO — KPI recontado e executado

- Carga: CPU `100%` na entrada do smoke, `100%` na comparação, `100%` no freeze/check, `100%` nos guards, `100%` no controle e `3%/6%` nos restores. A bateria foi única e serial, concluiu em `278857.9052 ms` sem timeout; como não houve falha temporal, não precisou de repetição.
- Execução própria: `npm --prefix frontend run test:smoke`, timeout externo 1800 s, `ec=0`, `tests=1238 pass=1238 fail=0 skipped=0`. O `DEV-relatorio.md` §`CICLO 2`, linhas 232–257, publica dois terrenos CRLF/LF e `test:smoke # tests 1238 # pass 1238 # fail 0 | idem`; coincide com a execução desta cadeira e com o KPI.
- Main integrada = main atual = `b404815c`: `blocks=170`, frontend `1214/1214`, backend `3052/3054`, Flutter `864/864`, `mvp_demo=99`, `mvp_vendavel=88`. Objeto: `version=B-SAN3-11`, `pr=401`, `merge_commit=null`, `approved_head=null`, `status=published_per_pr`, `blocks=171`, frontend `1238/1238`, backend/Flutter carregados nos mesmos valores com notas contendo `CARREGADO`, e os dois `mvp_*` inalterados.
- History JSON: main N=166, objeto N=167; comparação profunda das primeiras 166 entradas = idêntica; última = `B-SAN3-11`, `pr=401`, blocks 171, campos de merge/aprovação nulos, `published_per_pr`. `kpis-history.md:3059-3066` registra o bloco e `1214/1214 → 1238/1238 (+24)` nos dois terrenos.
- Guards: `node scripts/kpi-freeze.mjs --check` → `ec=0`, snapshot 2026-10-03 em dia; `node --check Kpis/app.js` → 0; três testes KPI → `29/29`, fail 0, `ec=0`, timeout 600 s. Diff de `Kpis/app.js` = `1 1`, exclusivamente a linha `var FROZEN` antiga/nova.
- Vermelho-controle: `blocks_completed.value` foi mudado temporariamente `171 → 172`; `kpi-freeze --check` saiu `ec=1` e declarou divergência. Restore `hash-object=blob=5efa1bf6…`; `checkout-index -f` só repôs CRLF e deixou status vazio. Os outros três controles do item 3 foram registrados em A15′, A26 e A35.
- Veredito A36: **APROVADO**.

### Veredito parcial do item 3

- **APROVADO**: A15′, A26, A35 e A36 aprovados, cada um com controle discriminante.

## Fechamento antes do teardown

- Carga: CPU 1%. Objeto re-resolvido: `git ls-remote`, `gh pr view 401` e worktree = `d24f7283bfba55d298e8118e7b590465c5a4d4d6`; PR OPEN, draft, MERGEABLE, base `main`. `origin/main=b404815ce3d1f1b8e5121bd1526978f7222e7479`, sem avanço desde o início.
- Check-runs recontados no objeto: total 14, não-verdes 0, pendentes 0. `git status --porcelain`: N=0. Processos com command line no worktree, excluído o próprio shell da medição: N=0. Disco C: 7,38 GB livres antes da remoção.
- Leitura cruzada: não li voto nem worktree de nenhuma outra cadeira do ciclo 2.
- Veredito de mérito: **APROVADO**, sem achado. Os três itens e todos os quatro subitens do item 3 estão fechados por execução própria.

## Teardown

- A primeira tentativa combinada de remoção foi rejeitada pela política do executor antes de iniciar; nenhum alvo foi tocado. Refeito em passos separados e verificados.
- `git worktree remove --force C:\Users\AMP\w-s11k2c` após N=0 processos vivos → worktree inexistente e desregistrado. Scratch exato `C:\Users\AMP\AppData\Local\Temp\c3c2-b-san3-11-d24f7283` removido por `System.IO.Directory.Delete(..., true)` após a validação do caminho → inexistente. Espaço livre C: 8,03 GB. Nenhum processo, worktree ou arquivo das outras frentes foi tocado.
