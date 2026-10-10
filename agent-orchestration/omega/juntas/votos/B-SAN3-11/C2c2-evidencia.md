papel: C2′ | identidade: jurado-san3-11-c2-enumeracao-tipada | modelo: Codex GPT-5.6 Sol (substituicao declarada; dono suspendeu Astra/Fable ate o reset semanal de 2026-10-03) | mandato_md5: 54e634ba1251e7dc0473180e0fe4e661 (declarado no disparo: 54e634ba1251e7dc0473180e0fe4e661) | corpo_md5: 494547b988020c449fd5e26c9df2b302 (recebido no prompt: 494547b988020c449fd5e26c9df2b302; blob no objeto: 494547b988020c449fd5e26c9df2b302)

# Evidencia incremental — C2′ / ciclo 2 / B-SAN3-11

## RETOMADA apos queda 2026-10-03T22:57:00Z (hora aproximada informada pelo orquestrador)

- Fase atingida: pre-voo, antes da criacao de worktrees, instalacao de dependencias ou inicio do merito.
- Erro: limite de uso da conta OpenAI; continuacao da mesma instancia, com contexto preservado.
- Estado re-medido em 2026-10-04: carga CPU 8%; `C:/Users/AMP/w-s11k2b` ausente; `C:/Users/AMP/w-s11k2blf` ausente; `C2c2-evidencia.md` e `C2c2-voto.json` ainda ausentes antes desta gravacao. Nao havia `npm ci` parcial a confiar ou refazer.
- Medicoes preservadas e reprodutiveis: objeto inicial do PR 401 `d24f7283bfba55d298e8118e7b590465c5a4d4d6`; corpo EOL-neutro `494547b988020c449fd5e26c9df2b302` = esperado; mandato EOL-neutro `54e634ba1251e7dc0473180e0fe4e661` = esperado; carga CPU na medicao dos hashes 83%.

### Comando/saida/veredito parcial — retomada

- Comando: `Get-CimInstance Win32_Processor`; `Test-Path` e `git status` condicionais nos dois caminhos; `Test-Path` nos dois arquivos de saida.
- Saida resumida: CPU 8%; ambos os worktrees e ambos os artefatos estavam ausentes.
- Veredito parcial: retomada integra; nenhum estado parcial de worktree/dependencia foi herdado.

## Pre-voo legal — objeto, inspetor e CI — 2026-10-04

- Comando: `git ls-remote origin refs/heads/fix/dossie-versao-da-vistoria refs/heads/main`; `gh pr view 401 --json headRefOid,baseRefOid,headRefName,baseRefName,state,isDraft,mergeable,url`; `git diff --name-status 3ec6f52b... <head>`; `gh api repos/thiagodorgo/ERP_Techsolutios/commits/<head>/check-runs?per_page=100`; `git -C C:/Users/AMP/w-nuv11 rev-parse HEAD`; `git config --show-origin --get core.autocrlf`. Timeout externo da chamada: 30 s. Carga na medicao: CPU 6%, livre 8.343.064.576 bytes.
- Saida resumida: `git ls-remote` e `gh` resolveram o mesmo head `d24f7283bfba55d298e8118e7b590465c5a4d4d6`; base `origin/main`/`baseRefOid` = `b404815ce3d1f1b8e5121bd1526978f7222e7479`; PR OPEN, draft, MERGEABLE. Delta `3ec6f52b..d24f7283` = somente adicao de `agent-orchestration/omega/juntas/votos/B-SAN3-11/00-inspetor-terreno-c2.md` (registro; nenhum codigo/teste/KPI). Check-runs: total 14, pendentes 0, nao-verdes 0; `frontend` = 2 ocorrencias `completed/success`. `w-nuv11` tambem esta em `d24f7283`; `core.autocrlf=true` vem da configuracao de sistema.
- Parecer lido integralmente: 3a instancia, `LIBERADO COM RESSALVA`; confere nominalmente `jurado-san3-11-c2-enumeracao-tipada`, corpo Codex EOL-neutro `494547b988020c449fd5e26c9df2b302`, mandato `54e634ba1251e7dc0473180e0fe4e661`, baseline 24/24 em CRLF e LF, S0 verde. R-CORPOS cumprida por carregamento do blob do objeto e hash coincidente; R-PERDA reconhecida como vinculante (queda futura exige sucessora nova e reexecucao P3). Quorum: unanimidade de 3 com veto. Modelo efetivo: Codex GPT-5.6 Sol, substituicao declarada por decisao do dono; B-SAN3-11 nao toca dinheiro.
- Briefing lido integralmente na secao `Ciclo 2 — junta 2`, inclusive atualizacao ~16:45Z; todas as alegacoes permanecem insumo a re-verificar. Protocolo de emulacao de `.agents/agents/README.md` lido em `origin/main`.
- Veredito parcial: LEGALIDADE CONFIRMADA no objeto atual `d24f7283`; o movimento apos o objeto liberado pelo inspetor e exclusivamente o proprio parecer versionado, com nova CI concluida e verde.

## Terrenos proprios — criacao e EOL — 2026-10-04

- Comando: apos provar ausencia dos tres caminhos, `git -C <repo> worktree add --detach C:/Users/AMP/w-s11k2b d24f7283...`; `git -C <repo> -c core.autocrlf=false worktree add --detach C:/Users/AMP/w-s11k2blf d24f7283...`; `git -C <LF> config --worktree core.autocrlf false`; criacao de `$SCRATCH=C:/Users/AMP/AppData/Local/Temp/c2c2-d24f7283`; `Test-Path .git`; `rev-parse HEAD`; `status --porcelain`; contagem binaria de CR no adapter. Timeout externo: 30 s. Carga: CPU 13%.
- Saida resumida: caminhos e scratch eram ausentes antes; ambos os worktrees detached existem em `d24f7283bfba55d298e8118e7b590465c5a4d4d6`, status vazio e sem `node_modules`; CRLF com `core.autocrlf=true` e 602 bytes CR; LF com `core.autocrlf=false` de `config.worktree` e 0 bytes CR. Nenhuma junction/symlink foi criada.
- Veredito parcial: TERRENOS CONFIRMADOS e isolados; `$SCRATCH` proprio criado.

## Terrenos proprios — dependencias e ambiente — 2026-10-04

- Comando: `npm ci --no-audit --no-fund` em `w-s11k2b/frontend` (CPU 73%) e `w-s11k2blf/frontend` (CPU 21%); `npm ci --ignore-scripts --no-audit --no-fund` na raiz de `w-s11k2b` (CPU 69%). Cada chamada sob timeout externo de 30 s. Depois: `node -v`, `npm -v`, Git Bash explicito `uname -srm`, leitura da versao TypeScript e propriedades dos tres `node_modules` (CPU 80%).
- Saida resumida: frontend CRLF `added 103 packages in 17s`, ec 0; frontend LF `added 103 packages in 14s`, ec 0; raiz CRLF `added 326 packages in 23s`, ec 0, apenas warning de engine de `@prisma/streams-local` (Node 22 requerido; Node contratado/local v20.19.5). Ambiente: Node v20.19.5; npm 11.7.0; TypeScript 5.9.3; PowerShell 7; Git Bash/MINGW64 `3.6.6-1cdd4371.x86_64`; nenhum `node_modules` tem `LinkType` ou atributo ReparsePoint.
- Veredito parcial: DEPENDENCIAS PROPRIAS CONFIRMADAS; sem junction/symlink e sem instalacao incompleta herdada.

## RETOMADA apos queda 2026-10-04T04:00:00Z (hora aproximada informada pelo orquestrador)

- Fase atingida: inicio do item 1, na comparacao entre o Apendice E e o gerador do head. Erro: limite de uso da conta OpenAI; esta e continuacao da mesma instancia e identidade, com contexto preservado.
- Comando de re-medicao: `Test-Path`, `git rev-parse HEAD`, `git status --porcelain`, `git config --worktree --get core.autocrlf`, contagem binaria de CR, verificacao dos executaveis TypeScript/Playwright nos `node_modules`, busca de processos cujo `CommandLine` continha os caminhos exclusivos dos worktrees, e existencia dos dois artefatos de voto. Medicao em `2026-10-04T08:28:31.4094120Z`; carga CPU 9%.
- Saida resumida: ambos os worktrees existem, estao limpos e em `d24f7283bfba55d298e8118e7b590465c5a4d4d6`; CRLF = `core.autocrlf=true`, 602 CR no adapter, dependencias frontend e raiz presentes; LF = `core.autocrlf=false`, 0 CR, dependencia frontend presente; nenhum processo vivo associado. A ausencia de `node_modules` na raiz LF e esperada, pois Playwright e usado apenas pela raiz CRLF. Nao ha `npm ci` parcial a refazer.
- Descarte vinculante: a tentativa imediatamente anterior a queda perdeu a saida final do processo e incluiu por engano a linha vazia de formatacao anterior ao fechamento da cerca Markdown na extracao do Apendice E (209 contra 208 linhas). Ela nao conta como medicao nem como resultado do gerador; nenhum processo remanescente foi encontrado e os arquivos do head permanecem intactos.
- Veredito parcial: RETOMADA INTEGRA; item `C2c2-I1` continua `EM APURACAO`. Proximo comando registrado: reextrair o bloco do Apendice E excluindo apenas a linha vazia de formatacao, comparar bytes EOL-neutros e executar novamente o gerador do head em CRLF e LF.

## Item 1 — identidade do gerador e head — medicao incremental

- Comando: extrator Node proprio sobre `git show d24f7283:docs/revisoes/SAN3/B-SAN3-11-plano.md`, delimitando a cerca `js` de `### Apendice E`, removendo somente a linha vazia de formatacao imediatamente anterior ao fechamento, normalizando CRLF para LF e comparando MD5/bytes com `scripts/san3-11-dossie-vistoria-censo.mjs`; depois `TS_ROOT=<worktree>/frontend node scripts/san3-11-dossie-vistoria-censo.mjs .` nos terrenos CRLF e LF, em serie. Carga: CPU 6% (CRLF) e 0% (LF).
- Saida resumida: Apendice E = 208 linhas, MD5 EOL-neutro `e5fd8ebb7bbead617668ed43c1e55c29`; arquivo = 208 linhas, mesmo MD5; igualdade byte a byte `true` nos dois terrenos. Gerador: ec 0 em ambos; L0/L1/L2 = 12/12/12, diferencas nos quatro sentidos = 0, L0 vazio = nao; 26 arquivos L3, 2 pontos, ambos `consulta substituicao: sim`, receptor desconhecido = 0; 3 consumidores L4. Duracao interna: CRLF 12.361 s, LF 6.191 s.
- Algegra lida no arquivo real: P-L0 calcula `emitido - espelho`, `emitido - adapter`, `espelho - emitido` e `adapter - emitido`, alem de negar emissor vazio. P-L3 monta o conjunto pela arvore inteira de `processes` mais imports de `ChecklistRunSummaryItem`/`ChecklistRunsPanel`; so visita TSX, reconhece `PropertyAccess .status` e dois helpers, decide vistoria pelo checker/forma estrutural, trata `any`/`unknown` como desconhecido-negado, desembrulha casts e sobe ate a funcao por `?:`, `&&`, `||`, `??` e `if`, resolvendo const/funcao do mesmo arquivo ate profundidade 5.
- Veredito parcial: identidade do gerador e head VERDES; a fronteira declarada e deliberadamente sintatica e ainda sera atacada pela mutacao propria.

## Item 3 — baseline isolado T1–T22 nos dois EOLs

- Comando: `node --test --import tsx tests/patios-dossie-versao.smoke.test.tsx`, primeiro CRLF e depois LF, sem concorrencia entre eles. Carga no inicio: CPU 2% (CRLF) e 0% (LF).
- Saida CRLF: ec 0; tests/pass/fail/cancelled = 24/24/0/0; total 85.818 s; T12 6.749 s, T13 18.458 s, T14 15.311 s, T20 14.549 s, T21 13.958 s, T22 13.859 s; `morto por sinal` = 0. Motivos: T12 contagens zero/head ec0; T13 ponto sem consulta/ec1; T14 adapter sem `supersededByRunId`/DESCARTADAS 1/ec1; T20 DTO sem `currentRunId`/SEM EMISSOR 1/ec1; T21 `receptor=vistoria ... NAO`/ec1; T22 abertura por `Object.freeze`/L0 VAZIO SIM/ec1.
- Saida LF: ec 0; tests/pass/fail/cancelled = 24/24/0/0; total 71.828 s; T12 4.033 s, T13 13.949 s, T14 10.543 s, T20 15.814 s, T21 13.541 s, T22 11.545 s; `morto por sinal` = 0; mesmos seis motivos semanticos.
- Veredito parcial: baseline do item 3 VERDE e independente de EOL; controles A17/A19–A21 ainda em apuracao.

## Item 1 — M1–M9, runtime e mutacao propria — 2026-10-04

- Protocolo: executor Node no scratch proprio; para cada mutacao contou a ancora (=1), gravou preservando o EOL, provou aplicacao, mediu CPU, executou `tsc -b --noEmit`, executou o gerador com `TS_ROOT` explicito, restaurou os bytes originais em `finally` e comparou `git hash-object` + `git status`. Todos os casos abaixo tiveram `tsc=0`, `restored=true`; hash modal `049886ea2e00826ff4d2ed89eef0365a2ab45012`, DTO `7bfe848126390176a20116fafca18245830de482`.
- Tabela LF: M1 CPU 8%, ec1, `run.status`, tipo sim, consulta NAO; M2 CPU 9%, ec1, `vistoria.status`, tipo sim, consulta NAO; M2b CPU 5%, ec1, `checklistRuns[0]?.status`, tipo sim, consulta NAO; M3 CPU 2%, ec0, helper/decisao correta, consulta sim; M4 CPU 0%, ec1, `data-status={run.status}`, consulta NAO; M7 CPU 31%, ec0, ramos identicos sob condicao de versao, consulta sim; M8 CPU 3%, ec1, cast desembrulhado, tipo sim, consulta NAO; M9 CPU 9%, ec1, cast `any` desembrulhado, tipo sim, consulta NAO; M5 CPU 0%, ec1, `SEM EMISSOR` no espelho e adapter para `supersededByRunId`; M5b CPU 3%, ec1, idem `currentRunId`; M5c CPU 8%, ec1, idem `reopenedFromRunId`; M6 CPU 4%, ec1, `L0 VAZIO: SIM` e 12+12 sem emissor.
- Independencia de EOL: M2 foi repetida no CRLF, CPU 0%, ancora 1, `tsc=0`, ec1 pela mesma linha sem consulta, e hash restaurado. M5 foi executada em LF como exigido. Nenhuma falha foi atribuida a tempo/carga.
- Runtime M5/M5b/M5c pelo adapter real: payload renderizavel sem cada chave lancou `ChecklistRunContractError` com `campo de versao ausente: <camel>`; `null` explicito foi aceito. O mesmo probe mediu item sem `id` e sem as tres chaves: descartado antes da validacao (`length=0`).
- M7: a forma residual declarada passa (`ec0`) embora os ramos sejam iguais. No head real, os dois pontos estao em ramos semanticamente diferentes (`Versao substituida` versus chip de status); nao ha ponto novo M7 no diff do bloco. Residual (iv) fica declarado, nao e por si achado no head.
- Mutacao propria nova: `run["status"]` (ElementAccess) em JSX no modal, ancora 1. CPU 8%, `tsc=0`, runtime observavel `<span data-own-boundary>completed</span>`, mas o gerador saiu **0**, nao enumerou a linha e manteve `pontos sem consulta=0`; hash restaurado. O cabecalho do guard declara apenas `.status`/helpers e nao declara ElementAccess como escape/residual.
- Controle adicional de conjunto vazio: em copia restauravel, as duas apresentacoes passaram a ElementAccess e os tres imports/consumidores receberam alias `RunsPanel` (sem mudar comportamento). CPU 7%, `tsc=0`; gerador saiu **0** com `L3 arquivos=26`, `L3 pontos=0`, `L4 consumidores=0`, veredito integralmente verde; quatro hashes restaurados. Portanto o guard aceita o estado substantivo "nao viu ponto nem consumidor". Este e o vermelho-controle proprio do item e ele **nao acusou**.
- Veredito parcial do item 1: **REPROVADO**. O comportamento esperado de M1–M9 foi confirmado, mas a mutacao propria compilavel/executavel atravessa a fronteira sintatica e, de modo independente, 0 pontos + 0 consumidores termina com ec0. A propriedade publicada e fail-closed; o artefato e fail-open nessa fronteira.

## Item 2 — A30/A31 e fail-closed ponta a ponta — 2026-10-04

- Leitura estatica no head: `processes.adapter.ts:533-542` escolhe a primeira grafia presente, aceita somente `null` ou string nao vazia aparada e lanca `ChecklistRunContractError` para ausente/invalido; `:544-568` descarta item sem id/templateId/startedAt antes das tres leituras; `:571-577` nao captura. `processes.service.ts:96-100` nao captura. `useProcessChecklistRuns.ts:46-58` captura: 404 limpa `runs`, mas o ramo generico de `ChecklistRunContractError` apenas faz `setError`, sem `setRuns([])`. `ChecklistRunsPanel.tsx:82-105` mostra Alert destrutivo somente com `!hasRuns`; com runs retidos mostra Alert de falha em segundo plano e preserva a tabela.
- Sonda de bordas pelo adapter real, CPU 1%, ec0: para cada uma das tres chaves e para camel/snake, ausente, `""`, espacos, numero, objeto, boolean e array lancaram a classe esperada; `null` produziu null; string com espacos foi aparada; com camel+snake divergentes, camel venceu; item sem id e sem chaves foi descartado antes da validacao. Isso confirma o tri-estado e a ordem no caminho isolado.
- T3′/T15/T16: passaram pelo nome nas duas baterias completas 24/24 (CRLF e LF). Controles restauraveis LF, todos ancora=1, `tsc=0`, hash restaurado: A30 `readString(...) ?? null` em `reopenedFromRunId` (CPU 3%), `supersededByRunId` (CPU 8%) e `currentRunId` (CPU 1%) fez T3′ e T15 falharem em cada caso; A31 capturando o adapter e devolvendo `[]` (CPU 0%) fez T16 falhar. Os vermelhos-controle acusaram exatamente o alvo.
- Navegador real: harness temporario no Vite 6.4.2 da arvore CRLF, porta exclusiva 4187, Chromium Playwright da raiz; Vite iniciou com CPU 25%, probe com CPU 6%. Foram renderizadas tres superficies rotuladas (modal/pagina/impressao) alimentadas pelo hook real, providers reais e `fetch` interceptado. Sequencia: (1) resposta inicial sem `currentRunId` → 3 Alerts destrutivos, 0 `tbody tr`, 3 botoes `Tentar novamente`; (2) retry com resposta valida de 12 chaves → 0 Alerts, 3 linhas (uma por superficie); (3) reload com nova resposta sem `currentRunId` → **3 Alerts `Atualizacao em segundo plano falhou` e 3 linhas antigas ainda presentes**, 3 retries. O Chromium saiu 0 e o Vite foi encerrado por Ctrl-C; nenhuma base/porta viva foi tocada.
- Origem/escopo: `git diff 653532f7..HEAD -- useProcessChecklistRuns.ts processes.service.ts` e vazio (o comportamento de reter runs em erro generico antecede o ciclo), mas E11 alterou o adapter dentro do bloco para criar exatamente o novo `ChecklistRunContractError`; D-C2-1/§16.2 promete que esse caminho recusa a resposta inteira e apresenta nenhuma linha. A regressao observada e a integracao do novo caminho E11 com o estado pre-existente e contradiz o contrato publicado pelo proprio ciclo.
- Veredito parcial do item 2: **REPROVADO**. Adapter e service sao fail-closed isoladamente, mas o fluxo apos dados validos e fail-open visual: um payload recusado deixa dado anterior apresentado como linha. A transicao inicial malformada→valida funciona; valida→malformada viola `nenhuma linha e apresentada`.

## Complemento item 1 — M7 no diff real e arbitro T4–T11

- Comando: scanner AST proprio sobre os `.tsx` alterados em `653532f7..HEAD`, procurando `ConditionalExpression` com ramos textualmente identicos e expressao contendo `status`; CPU 2%. Saida: quatro TSX alterados, `identicalStatusBranches=[]`.
- Controle M7 restauravel no modal: ancora 1, ramos identicos, CPU 6% (medicao externa 7%); T4–T11 pelo `--test-name-pattern` = 10 pass, 0 fail, ec0; hash restaurado. Isso confirma o residual declarado: o gerador e os testes semanticos atuais nao acusam M7. Como nao existe ponto M7 no diff real, nao nasce um terceiro achado.

## Item 3 — A17″, A19, A20, A21 e instrumentos — 2026-10-04

- F3-equivalente pela AST TypeScript no blob `HEAD`: 24 `test()` de topo, 0 diagnosticos de parse, **N=6** (`T12,T13,T14,T20,T21,T22`), exatamente 6 chamadas `runCenso` no arquivo; md5 EOL-neutro das funcoes: `runCenso=fdf1a8cc91c9ab9389eaed5490447b21`, `mutate=c6663a49f7a0913e7981b5e8608c004`. Carga CPU 2%.
- A17″ no CRLF, mutacao unica `timeout: 1`: CPU 2%, 24 tests, 18 pass, **6 fail**, os seis `not ok` exatamente T12/T13/T14/T20/T21/T22; excecoes do arnes = 6, `ERR_ASSERTION=0`, `morto por sinal=0`, `mutacao nao aplicou=0`. Segundo vermelho-controle, mesmo teto + remocao dos dois `throw`: CPU 1%, mesmos 6 `not ok`, excecoes do arnes=0, **ERR_ASSERTION=6**. Hash restaurado nos dois.
- A19 sem o normalizador `.replace(/\r\n/g,"\n")`: CRLF CPU 1%, conjunto T13/T14/T20/T21/T22 = 4 pass/1 fail, T14 falha por `mutacao nao aplicou`=1, ec1; LF CPU 6%, 5 pass/0 fail, ec0. Ambos restaurados. A dependencia de EOL e portanto detectada exatamente no terreno que a manifesta.
- A20 (agulha T14 `supersededByRunIdX`): CRLF CPU 3%, ancora 1, T14 fail/ec1 por `mutacao nao aplicou`=1; restaurado. A21 (agulha T13 `ChecklistRunsPanelX`): CRLF CPU 0%, ancora 1, T13 fail/ec1 por `mutacao nao aplicou`=1; restaurado.
- F4-equivalente, CPU 19%: DTO tem abertura=1 e fecho=1; original diagnosticos sintaticos=0; mutacao T22 somente na abertura diagnosticos=0; texto alternativo abertura+fecho tem 2 diagnosticos (`',' expected`, `Property assignment expected`). Confirma que o T22 commitado usa a unica forma compilavel/parseavel prometida pela §16-bis.
- Controle do extrator TAP com TAP fabricado `not ok` + `gerador morto por sinal SIGTERM`: contou `notOk=1`, `deadBySignal=1`, `fail=1`; logo a contagem zero do baseline nao e regex morta.
- Veredito parcial do item 3: **APROVADO**. Os dois terrenos deram 24/24 sem morte por sinal e todos os vermelhos-controle A17″/A19/A20/A21 acusaram pelo motivo previsto, com restauracao.

## VOTO

VOTO: **REPROVADO** — dois achados `bloqueia`, ambos dentro do bloco: (F1) o gerador P-L3 aceita ElementAccess e inclusive 0 pontos/0 consumidores com ec0; (F2) apos carga valida, o novo erro de contrato E11 deixa linhas antigas apresentadas, contrariando a decisao de recusa integral/zero linhas. Item 3 e controles restantes verdes. Unanimidade requerida: este voto nao aprova.

## Limpeza final

- Processo residual medido antes da limpeza: somente o Vite desta cadeira, PID 78648, `node .../w-s11k2b/frontend/node_modules/vite/bin/vite.js --config vite.config.ts`; encerrado apos conferir nome/comando, CPU 3%, e confirmado morto. Nenhum processo de outra frente foi tocado.
- Comando: com 0 processos proprios, `git -C <repo> worktree remove --force C:/Users/AMP/w-s11k2b` e idem `w-s11k2blf` (CPU 4%, ambos ec0); arquivos do scratch removidos por patch e diretorios vazios, ja validados sob `C:/Users/AMP/AppData/Local/Temp/c2c2-d24f7283`, removidos pela API nativa de diretorio do PowerShell/.NET.
- Medicao final: CPU 4%; livre 11.362.439.168 bytes; processos proprios=0; correspondencias em `git worktree list`=0; CRLF worktree ausente, LF worktree ausente, scratch ausente. Base viva Postgres/Redis e Docker nunca foram consultados nem tocados.

## Fecho legal — objeto imovel e artefatos completos

- Comando: `gh pr view 401 --json headRefOid,state,url`; `gh api repos/thiagodorgo/ERP_Techsolutios/commits/<head>/check-runs?per_page=100`; parse JSON do voto; leitura da primeira linha/hash declarados. Carga CPU 11%.
- Saida: PR ainda OPEN no mesmo objeto `d24f7283bfba55d298e8118e7b590465c5a4d4d6`; 14 check-runs, pendentes 0, nao-verdes 0. JSON valido: veredito REPROVADO, itens `REPROVADO,REPROVADO,APROVADO`, 2 achados; primeira linha mantem papel/identidade/modelo substituto/mandato e os dois MD5 do corpo.
- Veredito final: artefatos completos antes da mensagem final; nenhuma medicao foi feita contra objeto movel.
