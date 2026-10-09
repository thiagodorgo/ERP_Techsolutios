# DEV ciclo 2 — B-SAN3-05

- Identidade: `dev-ciclo2-b-san3-05`
- Papel: desenvolvedor do ciclo 2; não achou, não planejou e não votou.
- Modelo: GPT-5.6 Sol — substituição declarada por decisão do dono em 2026-10-08; o bloco não toca dinheiro e Fable/Astra ficam reservados a blocos de dinheiro.
- Worktree exclusivo: `C:/Users/AMP/w-o05`
- Ramo: `fix/runtime-role-sem-bypass`
- PR: #405

## Pré-condições

### P0.1 — head local × remoto

**Comando:** `git -C C:/Users/AMP/w-o05 rev-parse HEAD`; `git -C C:/Users/AMP/w-o05 ls-remote origin refs/heads/fix/runtime-role-sem-bypass`

**Saída resumida:** ambos devolveram `ebffaca889ce81e326a657921811e19f40ecc19f`.

**Resultado:** PASSOU — ponto de partida local e remoto idênticos ao SHA determinado pelo dono.

### P0.2 — contrato, memória e plano

**Comando:** `Get-Content` integral de `.agents/skills/saas-multi-tenant/SKILL.md`, `CLAUDE.md`, `PROJECT_MEMORY.md` e `docs/revisoes/SAN3/B-SAN3-05-plano.md` C2.1–C2.6; busca do estado vivo em `status-geral`, `log-execucao` e `controle`.

**Saída resumida:** contrato canônico com separação de papéis/P1/P7 lido; plano C2 `STATUS: COMPLETO`; escopo, paradas RC3/RC4 e bateria B0–B14 identificados.

**Resultado:** PASSOU — a autorização específica do plano para RLS prevalece sobre a restrição genérica da skill.

### P0.3 — árvore e scratchpads preservados

**Comando:** `git status --short --branch`; `git log --oneline --decorate -12`; `git diff --name-status origin/main...HEAD`.

**Saída resumida:** ramo correto e sem mutação rastreada; somente `?? scratchpad/`; `pl05c2` e `pl05c2s` não serão apagados nem commitados.

**Resultado:** PASSOU — terreno inicial preservado.

## Integração da main e KPI congelado

### I1 — `origin/main` integrada por merge

**Comando:** `git fetch origin main`; `git rev-parse origin/main`; `git merge --no-edit origin/main`.

**Saída resumida:** `origin/main=c8af64580cb85ddf4960fecb2f8604384f8f0328`; merge iniciado sem rebase/force; conflitos somente nos 4 registros previstos pelo plano.

**Resultado:** PASSOU — merge commit `37e024c332b3ad31bc609db5fad8728d26500abe`, sem rebase/force; empurrado ao remoto e confirmado por `git ls-remote`.

### I2 — quatro conflitos de registro resolvidos por união

**Comando:** remoção mecânica somente dos marcadores nos 3 registros-fonte, preservando os dois lados; `python agent-orchestration/controle/gerar-indice-pendencias.py`; busca por `^(<<<<<<<|=======|>>>>>>>)` nos 4 arquivos.

**Saída resumida:** união preservou as entradas do B-SAN3-05 e da main/B-SAN3-11; índice regenerado com 446 cabeçalhos/435 IDs, 326 abertas, 117 fechadas, 3 sem status; marcadores = 0.

**Resultado:** PASSOU — os quatro conflitos previstos foram resolvidos sem apagar nenhum lado.

### I3 — `Kpis/*` byte a byte na versão da main

**Comando:** `git -c core.autocrlf=false checkout origin/main -- Kpis/app.js Kpis/kpis-latest.json Kpis/kpis-history.json Kpis/kpis-history.md`; `git diff --quiet origin/main -- Kpis/`.

**Saída resumida:** `kpi_diff_ec=0`.

**Resultado:** PASSOU — KPI congelado; o diff final do PR não carrega alteração própria em `Kpis/*`.

## Implementação

### Retomada após PARADA-D4 — errata do orquestrador

**Comando:** `git -C C:/Users/AMP/w-o05 pull --ff-only`; `git -C C:/Users/AMP/w-o05 rev-parse HEAD`; `git -C C:/Users/AMP/w-o05 ls-remote origin refs/heads/fix/runtime-role-sem-bypass`; leitura de `docs/revisoes/SAN3/B-SAN3-05-plano.md` no commit `45da0d17e8f2abc1941ee8760a4b7e06cd28da46`.

**Saída resumida:** pull fast-forward já aplicado; HEAD local = remoto = `45da0d17e8f2abc1941ee8760a4b7e06cd28da46`; a “Errata do orquestrador ao D4” substitui o aceite original pela opção (b).

**Resultado:** PASSOU — PARADA-D4 resolvida pelo orquestrador. `username` é permitido somente como valor de `session_user`/`current_user`; host, porta, senha, banco, `postgresql://`, `password` e username em qualquer outro campo continuam proibidos. `src/database/runtime-role.bootstrap.ts` permanece intocado.

### B1 — credencial sem senha em claro no canal do servidor

**Comando:** viabilidade em `postgres:16` descartável `dev05c2-viab2-pg`, sem porta/volume: cria papel; envia duas linhas de senha por stdin para `setsid -w psql -v role=... -c '\password :"role"'`, com `PGOPTIONS='-c password_encryption=scram-sha-256'`; consulta `pg_authid`; login TCP; remove só o container nomeado.

**Saída resumida:** `password_ec=0`; prefixo armazenado `SCRAM-SHA-256$`; login devolveu `dev05c2_role`; `login_ec=0`; container removido.

**Comando adicional:** implementação em `scripts/db-runtime-role.sh`, `docs/deployment.md` e T14; `npm run check` em `dev05c2-check-gen`; suíte focada em PostgreSQL 16 descartável `dev05c2-fatia1c-*`.

**Saída resumida adicional:** `npm run check` ec=0 após `npm ci` + `prisma generate`; T14 comprovou `SCRAM-SHA-256$`, inclusive com `PGOPTIONS=password_encryption=md5`, login e idempotência; suíte focada final = **9/9**, fail 0, skipped 0. Uma tentativa anterior sem `prisma generate` falhou por terreno (client ausente), e duas iterações focadas ficaram vermelhas só nos totais autorreferentes do novo guard estrutural (7/9), corrigidos antes do verde final.

**Resultado:** PASSOU — senha em claro não integra SQL/argv/log do teste; `psql \\password` produz verificador SCRAM no cliente, MODO 0 saiu e o residual de ataque offline está documentado. A matriz de `server.log` B7 e o caminho B14 permanecem para a junta, conforme C2.5/C1.

### B2 — toda mutação de catálogo sob a trava única

**Comando:** todas as chamadas escritoras redirecionadas ao helper assíncrono `runCatalogCommand` sob `withRoleCatalogLock`, timeout 20 s; canário T14c segura a trava e observa o catálogo antes/depois; suíte focada no terreno `dev05c2-fatia1c-*`.

**Saída resumida:** guarda fechada mediu `spawnCommand=2`, `runCatalogCommand=4`, `ROLE_SCRIPT=5`, `spawn=2`, `spawnSync=3`; antes da liberação papel=0, após liberação papel=1; T14c verde; suíte **9/9**, resíduo removido no `finally`; containers/rede próprios removidos.

**Resultado:** PASSOU para (a), (b) e (d). O critério (c), N=10 sem erros de catálogo, é B8 da junta C2.

### B3 — ratchet fail-closed e catálogo FORCE reconciliado

**Comando:** implementação parcial em `scripts/san3-05-acessos-de-plataforma.mjs` + 7 fixtures C3A/B/C/E e C3-F2; container Linux `dev05c2-b3` sob `timeout 900`, `npm ci`, `prisma generate`, gerador `--all` e T13.

**Saída resumida:** gerador ec=0, stderr=0, `ENABLE=106`, `FORCE=106`, acessores=106, `OPS(derivados)=17`; inventário = **76 chaves** contra congelado **53**, crescimento **+23**. O T13 terminou **32/35**: as 27 fixtures herdadas e C3A/B/C3C/C3E ficaram vermelhas como exigido; o ratchet listou 23 chaves novas sem motivo e o fixture C3-F2 ainda falhou ao exigir a chave do leitor. Container `--rm` removido.

**Resultado:** PARADA OBRIGATÓRIA RC3 — crescimento +23 excede o teto de +20. A implementação parcial não foi commitada; não afrouxei o analisador nem continuei para B4.

### B4 — cenário executável por membro FORCE da superfície

**Comando:** não iniciado após a PARADA-RC3.

**Saída resumida:** sem execução.

**Resultado:** AGUARDA DECISÃO DO ORQUESTRADOR SOBRE RC3.

### D1 — T8d mede exercibilidade de REPLICATION

**Comando:** T8d reescrito sem fixture morta; cria/derruba slot físico e mantém a mutação `rolreplication` observável; suíte focada no terreno `dev05c2-fatia1c-*`.

**Saída resumida:** subteste T8d verde; suíte **9/9**. O título afirma somente “REPLICATION exercível”; `pg_basebackup` permanece reservado ao B10 da junta.

**Resultado:** PASSOU.

### D2 — via de views transitiva

**Comando:** CTE recursivo em `RUNTIME_ROLE_GUARD_SQL` e MODO 6; cenário view externa → view interna → tabela FORCE; `bash -n`; suíte focada no terreno `dev05c2-fatia1c-*`.

**Saída resumida:** `bash -n` ec=0; T8d e T14/MODO 6 verdes; suíte **9/9**; md5 do SQL regravado para `f95dacc4ab623a08961635683aab5ce1`; documentação sem limite de um nível.

**Resultado:** PASSOU.

### D3 — boot de produção fail-closed e filhos finalizados

**Comando:** T15 com boot explícito e default, espera do evento `close`, timeout ≤15 s e teardown SIGTERM/SIGKILL em `finally`; suíte focada `dev05c2-fatia1c-*`.

**Saída resumida:** os dois boots recusados saíram com código 1 antes de Redis/job worker; boot limpo aceito; subteste T15 verde; suíte **9/9**.

**Resultado:** PASSOU.

### D4 — logs sem componentes da URL efetiva

**Comando:** no head integrado `37e024c332b3ad31bc609db5fad8728d26500abe`, `git show HEAD:docs/revisoes/SAN3/B-SAN3-05-plano.md` para D4/C2.3; `git show HEAD:src/database/runtime-role.bootstrap.ts` buscando `describeEscapes`, `session_user` e `current_user`; `git show HEAD:tests/san3-05-runtime-role-guard-db.test.ts` buscando T9/logger.

**Saída resumida:** D4 exige ausência literal de `username` decodificado no JSON do T9/T15. O bootstrap atual registra `session_user: posture.sessionUser` e `current_user: posture.currentUser` tanto no sucesso quanto na recusa; esses valores são o username efetivo da URL. C2.3 proíbe explicitamente alterar `src/database/runtime-role.bootstrap.ts`.

**Comando adicional:** aplicação da Errata 2 do dono (`dee3f821…`); helpers derivam os componentes das URLs efetivas e verificam logs do T9/T15; três mutações negativas por host, senha e nome de papel em campo não identitário.

**Saída resumida adicional:** T5/T6/T9 e T15 verdes na suíte focada; host, porta, senha, banco, `postgresql://` e `password` ausentes; nome de papel permitido somente em `session_user`, `current_user`, `escapes[].rolname` e `via:rolname`.

**Resultado:** PASSOU — PARADA-D4 e PARADA-D4-2 resolvidas sem tocar `src/database/runtime-role.bootstrap.ts`.

### A1 — ajustes do ciclo 2 e pendências C2.6

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

## Validação B0–B14

### B0 — head, CI, escopo e KPI

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

### B1 — `npm run check`

**Comando:** container `dev05c2-check-gen`, cópia read-only da árvore, `npm ci --ignore-scripts`; `DATABASE_URL` só no ambiente; `npx prisma generate`; `npm run check`.

**Saída resumida:** Prisma Client 7.8.0 gerado; `tsc -p tsconfig.json --noEmit`; ec=0. A primeira tentativa sem `prisma generate` falhou por ausência do client e não foi contada como produto.

**Resultado:** PASSOU — 1/1.

### B2 — `npm run lint`

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

### B3 — testes unitários/contratuais selecionados

**Comando:** parcial: `node --test --import tsx tests/san3-05-acessos-de-plataforma-guard.test.ts` no container `dev05c2-b3`.

**Saída resumida:** **32/35** passaram; 3 falharam (pai + congelado com +23 chaves + leitor C3-F2). Os outros seis arquivos do item B3 não foram executados após a parada.

**Resultado:** VERMELHO / PARADA-RC3.

### B4 — gerador normal e `--all`

**Comando:** `node scripts/san3-05-acessos-de-plataforma.mjs . --all` em Linux, depois de `npm ci` e `prisma generate`.

**Saída resumida:** ec=0; stderr=0 bytes; `OPS(derivados)=17`; inventário **76**, sha1 `d990f882341867f4e3b1366c56c3df1bff401168`.

**Resultado:** VERMELHO contra o congelado: +23 chaves > teto +20.

### B5 — modo e EOL do script

**Comando:** `git ls-files -s scripts/db-runtime-role.sh`; `git ls-files --eol scripts/db-runtime-role.sh .gitattributes`.

**Saída resumida:** modo `100755`; script `i/lf w/lf attr/text eol=lf`.

**Resultado:** PASSOU — 2/2 propriedades.

### B6 — receitas DB N=3 + controle sem psql

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

### B7 — matriz do `server.log`

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

### B8 — lote DB N=10

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

### B9 — canário e guarda estrutural

**Comando:** T14c dentro da suíte focada contra PostgreSQL 16 descartável `dev05c2-fatia1c-pg`, sem porta no host.

**Saída resumida:** canário antes=0/depois=1; guarda estrutural 5/5 contagens; T14c verde; suíte focada **9/9**.

**Resultado:** PASSOU no objeto; mutações M-B2a/M-B2b cabem à junta C2.

### B10 — porta REPLICATION

**Comando:** reservado à junta 2 por C2.4.

**Saída resumida:** não cabe ao dev.

**Resultado:** AGUARDA JUNTA

### B11 — suíte inteira e build

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

### B12 — premissas e diff do guard de catálogo

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

### B13 — `git diff --check`

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

### B14 — caminho do compose

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

## Divergências e paradas obrigatórias

### PARADA-D4 — aceite impossível dentro do escopo permitido

- **Fato medido na ref:** `37e024c332b3ad31bc609db5fad8728d26500abe`.
- **Contradição:** o C2.2/D4 requer que o `username` da URL efetiva não apareça no JSON; o próprio contrato existente do bootstrap diz e implementa que o log informa `session_user`/`current_user`. Para a conexão da sonda, o username decodificado e `session_user` são o mesmo valor.
- **Arquivo necessário para corrigir a propriedade literal:** `src/database/runtime-role.bootstrap.ts`.
- **Escopo:** C2.3 declara esse arquivo PROIBIDO e afirma que nenhum achado do ciclo 1 pede mudança nele.
- **Decisão do dev:** parada fail-closed determinada pelo dono; sem improvisar semântica alternativa para “não aparece”, sem editar arquivo proibido e sem iniciar B1–B4/D1–D3 depois de conhecida a parada.
- **Direção necessária:** o planejador/orquestrador precisa escolher explicitamente entre (a) ampliar o escopo para redigir/remover `session_user`/`current_user` dos logs; ou (b) reescrever D4 para permitir o nome do papel quando ele aparece como identidade medida, mantendo proibidos host/porta/senha/banco/URL. O dev não escolhe entre as duas.

### RESOLUÇÃO-PARADA-D4 — commit `45da0d17e8f2abc1941ee8760a4b7e06cd28da46`

- **Decisão escrita:** opção (b), sem ampliar escopo.
- **Aceite vigente:** username somente como valor de `session_user`/`current_user`; demais componentes de conexão proibidos; três mutações negativas para host, senha e username fora das duas chaves.
- **Estado:** RESOLVIDA; desenvolvimento retomado pela mesma identidade.

### PARADA-D4-2 — username já existe fora das duas chaves permitidas

- **Fato medido na ref:** `45da0d17e8f2abc1941ee8760a4b7e06cd28da46`.
- **Comando:** `git show HEAD:docs/revisoes/SAN3/B-SAN3-05-plano.md` na errata; `git show HEAD:src/database/runtime-role.bootstrap.ts` em `describeEscapes`; `git show HEAD:src/database/runtime-role.ts` no construtor de `RuntimeRoleGuardError`.
- **Saída resumida:** a errata permite o username somente como valor de `session_user`/`current_user`. Na recusa do superusuário, o mesmo username (`postgres`) também aparece em `escapes[].rolname` e na mensagem `atributo:postgres`; o bootstrap serializa `escapes: posture.escapes`. A mutação “username em outro campo” não distingue mutação de comportamento já existente.
- **Escopo:** `src/database/runtime-role.bootstrap.ts` continua PROIBIDO; `src/database/runtime-role.ts` é permitido somente para D2 e “nada mais muda no arquivo”.
- **Resultado:** BLOQUEADO / PARADA OBRIGATÓRIA — não é possível cumprir literalmente o aceite substitutivo e preservar o payload de razões atual dentro do escopo concedido.
- **Decisão necessária:** dizer se `escapes[].rolname` e o texto nomeado `via:rolname` são também valores de identidade permitidos; ou ampliar nominalmente o escopo para redigi-los. O dev não escolhe em silêncio.
- **Estado local preservado, ainda não commitado:** `scripts/db-runtime-role.sh`, `src/database/runtime-role.ts`, `docs/deployment.md` e `tests/san3-05-runtime-role-guard-db.test.ts` contêm a fatia parcial B1/B2/D1/D2; `git diff --check` = 0. Nenhum arquivo proibido foi tocado; `scratchpad/` segue preservado.
- **Próximo comando após decisão:** reler a nova errata na ref empurrada, registrar a resolução aqui e concluir primeiro `tests/san3-05-runtime-role-guard-db.test.ts` antes de iniciar B3/B4.

### RESOLUÇÃO-PARADA-D4-2 — decisão do dono no commit `dee3f821a56ca99e11059e8e34a5d48438841329`

- **Comando:** `git pull --ff-only`; `git rev-parse HEAD`; `git ls-remote origin refs/heads/fix/runtime-role-sem-bypass`; leitura da “Errata 2 ao D4 — DECISÃO DO DONO” na ref atual.
- **Saída resumida:** local = remoto = `dee3f821a56ca99e11059e8e34a5d48438841329`; os quatro arquivos parciais continuam modificados e `scratchpad/` intacto.
- **Decisão §A1.1:** `rolname` pode aparecer como valor de `session_user`, `current_user`, `escapes[].rolname` e no texto `via:rolname`; permanece proibido em URL/DSN ou qualquer outro campo. Host, porta, senha, banco, `postgresql://` e `password` continuam proibidos; três mutações negativas obrigatórias; bootstrap continua PROIBIDO.
- **Resultado:** PASSOU — PARADA-D4-2 resolvida; desenvolvimento retomado da fatia parcial B1/B2/D1/D2.

### QUEDA DE USO E RETOMADA — 2026-10-08T21:07Z / 2026-10-09T01:42:50Z

- **Comando:** `git -C C:/Users/AMP/w-o05 status --short`; `git -C C:/Users/AMP/w-o05 ls-remote origin fix/runtime-role-sem-bypass`.
- **Saída resumida:** 5 arquivos modificados (`DEV-ciclo2-relatorio.md` e os 4 arquivos parciais de produto), `scratchpad/` não rastreado e preservado; remoto = `dee3f821a56ca99e11059e8e34a5d48438841329`.
- **Ocorrência:** a sessão anterior caiu por limite de uso do Codex às `2026-10-08T21:07Z`; nenhuma mudança remota ocorreu durante a interrupção.
- **Resultado:** PASSOU — retomada em `2026-10-09T01:42:50Z`, sem perda dos arquivos parciais e sem divergência do head remoto informado pelo dono.

### PARADA-RC3 — inventário B3 cresceu acima do teto

- **Objeto de partida empurrado:** `d9fc0d6df2b9098bd8665f9070e8082a54f97e39`.
- **Comando:** container `dev05c2-b3` sob `timeout 900`; cópia read-only da árvore local; `npm ci`; `prisma generate`; `node scripts/san3-05-acessos-de-plataforma.mjs . --all`; T13 completo.
- **Saída resumida:** L0 `ENABLE=106 FORCE=106 acessores=106`; `OPS(derivados)=17`; stderr=0; inventário `76`/sha1 `d990f882341867f4e3b1366c56c3df1bff401168`, contra 53 chaves congeladas: **+23**. T13 **32/35**; C3A/B/C/E passaram, mas o congelado enumerou 23 novas e C3-F2 ainda não atribuiu a chave do leitor.
- **Diagnóstico da fatia parcial:** 22 chaves L1 incluem relações e falsos candidatos que compartilham nomes de acessores Prisma (`role`, `yard`, `settlement`) e 1 chave L2 já visível após a integração da main. Corrigir a discriminação por operação/tipo poderia reduzir o número, mas isso seria continuar a implementação depois de observado o teto excedido.
- **Regra aplicada:** C2.3/RC3 determina “acima de 20 chaves novas, o dev para e relata”. Nenhum relaxamento do analisador, atualização do congelado ou avanço para B4 foi feito.
- **Estado local preservado:** alterações parciais não commitadas somente nos caminhos permitidos de B3 (`scripts/san3-05-acessos-de-plataforma.mjs`, `tests/san3-05-acessos-de-plataforma-guard.test.ts`, 7 fixtures); `scratchpad/` intocado; `dev05c2-b3` removido por `--rm`.
- **Decisão necessária:** o orquestrador precisa autorizar a continuação para corrigir os falsos candidatos e re-medir o teto, ou redefinir o tratamento das 23 chaves. O dev não escolhe em silêncio.

## Checklist — B-SAN3-05 · ciclo 2 · desenvolvimento

**Solicitado:**

- [x] B1 — commit `d9fc0d6d`; `npm run check` 1/1 e suíte focada 9/9.
- [x] B2 — commit `d9fc0d6d`; canário/guarda estrutural verdes; N=10 reservado à junta.
- [ ] B3 — implementação parcial local; PARADA-RC3 em 76 contra 53 chaves (+23 > +20).
- [ ] B4 — não iniciado por determinação da PARADA-RC3.
- [x] D1 — commit `d9fc0d6d`; T8d verde, prova `pg_basebackup` reservada à junta.
- [x] D2 — commit `d9fc0d6d`; view transitiva verde na trava e no MODO 6.
- [x] D3 — commit `d9fc0d6d`; T15 explícito/default e exit 1 verdes.
- [x] D4 — commit `d9fc0d6d`; Errata 2 aplicada e T9/T15 verdes.
- [ ] Ajustes do ciclo — pendências C2.6 ainda não registradas devido à PARADA-RC3.
- [x] Integração da main — commit `37e024c332b3ad31bc609db5fad8728d26500abe`; quatro conflitos resolvidos por união; `D-GOV-PROPORCIONAL` presente.
- [x] `Kpis/*` à main — `git diff --quiet origin/main -- Kpis/` retornou 0.

**Feito:** integração/main e `Kpis/*`; B1, B2(a/b/d), D1, D2, D3 e D4 implementados, validados e empurrados em `d9fc0d6d`. B3 confirmou OPS=17, C3A/B/C/E e L0 106/106 antes de acionar a parada pelo tamanho do inventário.

**Não feito / divergências:** B3 não concluído nem commitado: inventário parcial cresceu +23, acima do teto +20. B4, pendências C2.6 e bateria restante aguardam decisão. A PARADA-D4-2 está resolvida pela decisão do dono `dee3f821`.

**Validação:** B1 `npm run check` passou 1/1; B5 modo/EOL passou 2/2; B9 objeto passou (T14c dentro de 9/9), mutações são da junta. B3 parcial/T13 = 32/35 e B4/gerador = vermelho por +23 chaves. B6–B8, B11–B14 ainda não executados pelo dev; B10 é somente da junta.

**Head empurrado:** `d9fc0d6df2b9098bd8665f9070e8082a54f97e39`, confirmado por `git ls-remote` antes do commit deste registro de parada; o SHA desse registro fica na mensagem ao orquestrador, pois o commit não pode conter o próprio hash.

**Próximos passos (análise):** o orquestrador deve decidir se autoriza corrigir a discriminação parcial de relações/operações e re-medir RC3, ou como tratar as 23 chaves. As mudanças locais de B3 devem permanecer preservadas. Só após decisão: concluir B3, então B4, pendências C2.6 e bateria restante.
