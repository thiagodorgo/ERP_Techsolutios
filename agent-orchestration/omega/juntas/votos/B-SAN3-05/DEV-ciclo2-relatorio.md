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

**Retomada autorizada — comando:** restringir o caminho sintático a métodos presentes em `OPS(derivados)` antes de associar nomes de campos a models Prisma; repetir gerador normal/`--all` e T13 no container `dev05c2-b3final`.

**Saída resumida da re-medição:** inventário final **56** contra 53, crescimento **+3** (dentro do teto), sha1 `2db380a29bd61272bb3441a13ee5001b3f567d47`; gerador normal e `--all` ec=0/stderr=0; `OPS(derivados)=17`; T13 **35/35**.

**Motivos das três chaves novas que permaneceram:**

1. `AuthSessionService.refreshSession · userRoleAssignment.findMany.select.role → roles`: relação FORCE alcançada pela mesma consulta já suspeita, via callback `runWithTenantContext` não provado pelo símbolo confiado.
2. `PrismaCoreSaasService.listTenantsForIdentity · user.findFirst.include.role_assignments → user_role_assignments`: relação FORCE sob `$TRANSACTION-SEM-SETTER-PROVADO`.
3. `PrismaCoreSaasService.listTenantsForIdentity · …role_assignments.include.role → roles`: segunda relação FORCE sob a mesma transação sem setter provado.

**Resultado final:** PASSOU — RC3 resolvida sem relaxar o analisador; C3A/B/C3C/C3E e as grafias C3-F2 ficaram cobertas; L0 deriva exatamente 106 FORCE/106 models no objeto.

### B4 — cenário executável por membro FORCE da superfície

**Comando:** enumeração do router e do `job.registry` em runtime; mesma fixture sob superusuário e papel efêmero `NOSUPERUSER NOBYPASSRLS`; `npm run check` e `node --test --import tsx tests/san3-05-leituras-de-plataforma-db.test.ts` em PostgreSQL 16 descartável `dev05c2-b4b-*`, sem porta no host e sob `timeout`.

**Saída resumida:** TypeScript 1/1; arquivo focado **13/13**, fail 0, skipped 0; conjuntos fechados em **11 rotas FORCE = 11 cenários** e **3 jobs FORCE = 3 cenários**, todos com corpo/efeito não vazio e igualdade super × efêmero. Os outros **9 jobs** foram etiquetados `FORA-DA-SUPERFICIE`/`B-ARNES-2`. Uma primeira execução caiu antes dos diferenciais porque a fixture usou um `source_type` fora do `CHECK`; corrigida para o valor permitido `mock_fixture`, sem tocar produto. Teardown final: containers=0, redes=0.

**Resultado:** PASSOU — inclusive `POST /cloud-cost-allocations/runs`, `cloud-charges.calculate` e `cloud-cost-allocation.run`; nenhuma divergência exigiu arquivo proibido e a parada C2.3 não foi acionada.

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

**Retomada Errata 3:** em PostgreSQL 16 descartável `dev05c2-d4e3-*`, com a colisão deliberada username=senha=`postgres`, `npm run check` passou **1/1** e a suíte focada passou **14/14**. A allowlist reconhece `error.sessionUser`/`error.currentUser` somente sob `error`; as três mutações obrigatórias (host, senha e papel em outro campo) ficaram vermelhas **3/3**, e uma quarta mutação confirmou que `payload.sessionUser` continua proibido. Teardown nominal concluído.

**Resultado final:** PASSOU — D4 cumpre as Erratas 1–3, sem tocar `src/database/runtime-role.bootstrap.ts` nem `src/server.ts`.

### A1 — ajustes do ciclo 2 e pendências C2.6

**Comando:** inclusão nominal em `agent-orchestration/controle/pendencias.md`; gerador oficial `gerar-indice-pendencias.py` executado em Linux no container `dev05c2-pend-index`, sob `timeout 300s`.

**Saída resumida:** três pendências novas registradas (`P-SAN3-05-RUNNER-SEM-TIMEOUT`, `P-SAN3-05-LOCAL-AUTH-WORK-SEM-GUC`, `P-SAN3-05-LOG-DO-SERVIDOR-FORA-DA-CI`) e o sub-item existente `P-SAN3-05-SUITE-DB-SOB-PAPEL-REAL` recebeu a lista nominal dos **9 jobs** e a recomendação sobre o Ato 2. Índice regenerado: **449 cabeçalhos / 438 IDs**, 117 fechadas, 329 abertas e 3 sem status; as quatro entradas aparecem no índice.

**Resultado:** PASSOU — todas têm escopo/evidência, dono ou atribuição a nomear, bloqueio e teste de encerramento; nenhuma bloqueia este PR.

## Validação B0–B14

### B0 — head, CI, escopo e KPI

**Comando:** `git rev-parse HEAD`; `git ls-remote origin fix/runtime-role-sem-bypass`; `gh api repos/thiagodorgo/ERP_Techsolutios/commits/<head>/check-runs`; diff de escopo e `git diff --quiet origin/main -- Kpis/` no Windows.

**Saída resumida:** no objeto `3401f162fc6b00d48962447183b98e12a1b0280c`, local=remoto; 7 check-runs concluídos: `owner-portal`, `authority-portal`, `backend-postgres`, `flutter` e `frontend` verdes, `docker` skipped e `backend` vermelho; `Kpis/*` ec=0 contra `origin/main`. O backend publicou **3126/3132**, fail 4, skipped 2: a entrada de catálogo 63→64 e o T15/D4 (mais os pais TAP).

**Resultado:** VERMELHO — a ausência inicial de check-runs se resolveu, mas o backend concluído expôs a PARADA-D4-3 abaixo. Os demais componentes do B0 ficaram verdes; a conferência final de escopo aguarda a parada.

### B1 — `npm run check`

**Comando:** container `dev05c2-check-gen`, cópia read-only da árvore, `npm ci --ignore-scripts`; `DATABASE_URL` só no ambiente; `npx prisma generate`; `npm run check`.

**Saída resumida:** Prisma Client 7.8.0 gerado; `tsc -p tsconfig.json --noEmit`; ec=0. A primeira tentativa sem `prisma generate` falhou por ausência do client e não foi contada como produto.

**Resultado:** PASSOU — 1/1.

### B2 — `npm run lint`

**Comando:** `npm run lint` no container Linux `dev05c2-bateria-node`, após `npm ci`, `prisma generate` e migrações no PostgreSQL descartável da mesma rede.

**Saída resumida:** `npm run lint` delegou ao `npm run check`; ec=0.

**Resultado:** PASSOU — 1/1.

### B3 — testes unitários/contratuais selecionados

**Comando:** os 7 arquivos nominais do B3 no container Linux `dev05c2-bateria-node`; antes, T13 isolado em `dev05c2-b3final`.

**Saída resumida:** bateria consolidada **181/181**, fail 0, skipped 0; T13 interno **35/35**.

**Resultado:** PASSOU.

### B4 — gerador normal e `--all`

**Comando:** `node scripts/san3-05-acessos-de-plataforma.mjs . --all` em Linux, depois de `npm ci` e `prisma generate`.

**Saída resumida:** normal e `--all`: 2/2 com ec=0 e stderr=0 bytes; `OPS(derivados)=17`; inventário **56**, sha1 `2db380a29bd61272bb3441a13ee5001b3f567d47`.

**Resultado:** PASSOU — +3 chaves, cada uma com motivo escrito.

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

**Comando:** no objeto de produto `02544a79cead8d9713354697f8ee78dac1575546`, cópia por `git archive -c core.autocrlf=false`, conferência blob a blob, PostgreSQL 16 e Redis 7 descartáveis sem porta no host, `DATABASE_URL=<descartável> npm test` sob `timeout 2400s` e `npm run build` sob `timeout 600s`; containers/redes `dev05c2-final-*`. Confirmação no head de registro `c2df97cc3b87cf5e7a17bfa2cdea050d8af9f8aa` pelo check-run oficial `backend` `113692887553`.

**Saída resumida:** integridade **3726/3726** blobs e **3726/3726** MD5 dentro do container. Duas rodadas diagnósticas com paralelismo visível 8 e uma com cota que ainda expunha 8 produziram **3128/3132**, fail 2, skipped 2: só T15 + pai, porque o evento `close` passou do teto sob saturação; nenhuma foi publicada como verde. Com afinidade `--cpuset-cpus=0-3` (`availableParallelism=4`), o comando literal fechou **3130/3132**, fail 0, skipped 2; `npm run build` ec=0. Teardown: 0 container, 0 rede, árvore temporária removida. No head `c2df97cc`, que acrescenta somente registros, o `backend` oficial repetiu **3130/3132**, fail 0, skipped 2, e o passo Build ficou verde.

**Resultado:** PASSOU — suíte **3132/3132** (3130 pass + 2 skips permitidos), fail 0; build 1/1, ec=0.

### B12 — premissas e diff do guard de catálogo

**Comando:** `git grep -n -E '(^|[^A-Za-z])PrismaCloudChargeRepository\(prisma\)' -- src`; `git grep -n 'DATABASE_RUNTIME_ROLE_GUARD' -- fly.production.toml fly.staging.toml .env.example`; `git diff origin/main -- tests/db-catalog-write-guard.test.ts` no Windows; ratchet e recontagem Linux das seis regexes.

**Saída resumida:** os dois greps ficaram vazios (ec=1 esperado), **2/2**; contagem medida **64** (`CREATE ROLE=28`, `ALTER ROLE=2`, `GRANT=26`, `REVOKE=1`, `OWNER TO=7`, `DROP ROLE=0`) contra 63; o +1 é a guarda estática do B1 que nomeia a forma proibida `ALTER ROLE %I WITH PASSWORD %L`. O diff do guard contém somente a entrada `san3-05-runtime-role-guard-db.test.ts` do Map, com count 64 e motivo, **1/1**.

**Resultado:** PASSOU — **3/3** formas do B12.

### B13 — `git diff --check`

**Comando:** `git diff --check` antes dos commits incrementais e antes do registro da parada.

**Saída resumida:** ec=0 em todas as medições.

**Resultado:** PASSOU na árvore atual; o B13 final contra `origin/main...HEAD` aguarda retomada.

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

### RESOLUÇÃO-PARADA-RC3 — autorização do orquestrador em 2026-10-09

- **Comando:** `git -C C:/Users/AMP/w-o05 status --short`; `git -C C:/Users/AMP/w-o05 ls-remote origin fix/runtime-role-sem-bypass`.
- **Saída resumida:** alterações locais somente na fatia parcial B3 e `scratchpad/` preservado; remoto = `b9a1dda3752f07de386bbd1430057b84b47b25c6`, conforme esperado.
- **Decisão:** autorizado corrigir a discriminação por operação/tipo dos falsos candidatos (`role`, `yard`, `settlement` e semelhantes) e re-medir. O teto RC3 continua inalterado; inventário final acima de +20 exige nova parada, lista de chaves e motivo por chave.
- **Resultado:** RETOMADO — sem relaxar o analisador e sem atualizar o congelado apenas para caber no teto.

### PARADA-D4-3 — `error.sessionUser`/`error.currentUser` violam a Errata 2

- **Objeto empurrado medido:** `3401f162fc6b00d48962447183b98e12a1b0280c`; check-run `backend` `113637900062` concluído vermelho, enquanto `backend-postgres` concluiu verde.
- **Comandos:** `gh run view --job 113637900062 --log-failed`; boot direto de `node --import tsx src/server.ts` contra PostgreSQL 16 descartável `dev05c2-logprobe-pg`, sem porta no host, com `DATABASE_URL=postgresql://postgres:postgres@dev05c2-logprobe-pg:5432/...`; teardown nominal verificado.
- **Saída resumida:** o primeiro log de recusa usa as formas permitidas `"session_user":"postgres"`, `"current_user":"postgres"` e `escapes[].rolname`. O segundo log contém `"error":{"code":"RUNTIME_ROLE_CAN_BYPASS_RLS","sessionUser":"postgres","currentUser":"postgres",...}`. A CI usa o mesmo texto `postgres` como senha e nome do papel, por isso a guarda D4 detectou `password da conexão apareceu no log`; a execução direta provou que a ocorrência restante está nos dois campos camelCase, não em URL/DSN.
- **Regra aplicável:** a decisão do dono em `dee3f821` permite nome de papel somente como valor de `session_user`, `current_user`, `escapes[].rolname` e `via:rolname`; nome de papel em outro campo continua proibido. `sessionUser`/`currentUser` são outros campos.
- **Impossibilidade dentro do escopo:** eliminar esses campos exige mudar a serialização do erro em `src/server.ts` ou `src/database/runtime-role.bootstrap.ts` (ambos PROIBIDOS), ou alterar a enumerabilidade de propriedades em `src/database/runtime-role.ts`, cujo único uso permitido no C2.3 é D2 e onde “nada mais muda”. Permitir camelCase no teste relaxaria a decisão do dono e não é opção do dev.
- **Resultado:** BLOQUEADO / PARADA OBRIGATÓRIA — nenhuma correção de produto foi improvisada. O ajuste semântico parcial do teste, que mascara apenas as formas permitidas e torna a colisão username=senha testável, permanece local e não commitado; ele evidencia os campos camelCase. O ajuste independente do ratchet 63→64 pode ser commitado com este registro.
- **Decisão necessária:** autorizar nominalmente um dos três caminhos: (a) retirar/redigir `sessionUser` e `currentUser` da serialização em arquivo hoje proibido; (b) permitir alterar `runtime-role.ts` para tornar essas propriedades não enumeráveis sem mudar o diagnóstico permitido; ou (c) ampliar a Errata 2 para também permitir `error.sessionUser`/`error.currentUser`. O dev não escolhe entre eles.
- **Estado da bateria ao parar:** B1 1/1; B2 1/1; B3 181/181; B4 2/2; B11 3126/3132 (fail 4, skipped 2); B12 parcial; B13 incremental limpo. B6–B8/B10/B14 e as 16 mutações continuam reservados à junta; build e fecho B0/B12/B13 aguardam decisão.

### RESOLUÇÃO-PARADA-D4-3 — decisão do dono no commit `b3af298af24833855b630c6f69ea8d532215c746`

- **Comando:** `git pull --ff-only`; `git rev-parse HEAD`; `git ls-remote origin fix/runtime-role-sem-bypass`; leitura da “Errata 3 ao D4 — DECISÃO DO DONO” na ref atual.
- **Saída resumida:** pull sem mudanças; local = remoto = `b3af298af24833855b630c6f69ea8d532215c746`; somente o teste parcial do D4 continuou modificado e `scratchpad/` permaneceu intacto.
- **Decisão §A1.1:** além das identidades da Errata 2, o nome do papel pode aparecer como valor de `error.sessionUser` e `error.currentUser`. Nome de papel em qualquer outro campo e todos os componentes secretos/de conexão continuam proibidos; as três mutações negativas continuam obrigatórias; `src/database/runtime-role.bootstrap.ts` e `src/server.ts` continuam proibidos.
- **Resultado:** PASSOU — PARADA-D4-3 resolvida; D4 retomado sem tocar os arquivos proibidos e com allowlist por caminho JSON exato.

## Checklist — B-SAN3-05 · ciclo 2 · desenvolvimento

**Solicitado:**

- [x] B1 — commit `d9fc0d6d`; `npm run check` 1/1 e suíte focada 9/9.
- [x] B2 — commit `d9fc0d6d`; canário/guarda estrutural verdes; N=10 reservado à junta.
- [x] B3 — commit `16014c06`; T13 35/35, gerador 2/2, OPS=17, L0=106/106 e inventário 56 (+3, com motivo por chave).
- [x] B4 — commit `41af41f5`; arquivo focado 13/13, 11/11 rotas FORCE e 3/3 jobs FORCE com diferencial próprio.
- [x] D1 — commit `d9fc0d6d`; T8d verde, prova `pg_basebackup` reservada à junta.
- [x] D2 — commit `d9fc0d6d`; view transitiva verde na trava e no MODO 6.
- [x] D3 — commit `d9fc0d6d`; T15 explícito/default e exit 1 verdes.
- [ ] D4 — commit `d9fc0d6d` cobre T9/T15 na senha distinta, mas a CI revelou `error.sessionUser`/`error.currentUser`; PARADA-D4-3 aberta.
- [x] Ajustes do ciclo — commit `3401f162`; três pendências novas e o sub-item nominal dos 9 jobs registrados; guard de catálogo 63→64 fica no commit desta parada.
- [x] Integração da main — commit `37e024c332b3ad31bc609db5fad8728d26500abe`; quatro conflitos resolvidos por união; `D-GOV-PROPORCIONAL` presente.
- [x] `Kpis/*` à main — `git diff --quiet origin/main -- Kpis/` retornou 0.

**Feito:** integração/main e `Kpis/*`; B1, B2(a/b/d), B3, B4, D1, D2, D3 e pendências C2.6 implementados e empurrados. B4 confirmou sem parada os três efeitos laterais antes não medidos.

**Não feito / divergências:** D4 não pode fechar literalmente porque o logger do servidor publica o nome do papel também em `error.sessionUser`/`error.currentUser`, formas não permitidas pela Errata 2. O escopo proíbe os dois arquivos naturais de correção e restringe `runtime-role.ts` somente a D2. Build e fecho de B0/B12/B13 não foram executados após a parada.

**Validação:** B0 vermelho em 1/7 check-runs (`backend`); B1 1/1; B2 1/1; B3 181/181; B4 2/2; B5 2/2; B9 focado verde antes da nova asserção; B11 **3126/3132**, fail 4, skipped 2; B12 parcial; B13 incremental ec=0. B6–B8/B10/B14 e as 16 mutações cabem à junta conforme C2.5.

**Head empurrado:** o SHA completo do commit deste registro é confirmado por `git ls-remote` e publicado na mensagem ao orquestrador; o último head anterior era `3401f162fc6b00d48962447183b98e12a1b0280c`.

**Próximos passos (análise):** o orquestrador/dono deve escolher (a), (b) ou (c) da PARADA-D4-3. Depois, concluir a asserção sem relaxar campos, reexecutar T9/T15 com username=senha, `npm test` + build, fechar B0/B12/B13 e entregar o head à junta. A junta deve olhar com atenção especial a serialização dupla do erro, a matriz B7, o canário B2 e os 9 jobs fora da superfície antes do Ato 2 em produção.
