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

**Resultado:** PARCIAL — o mecanismo exigido pelo plano existe no `psql` 16 e não requer dependência nova; falta implementá-lo e rodar B7/B14.

### B2 — toda mutação de catálogo sob a trava única

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

### B3 — ratchet fail-closed e catálogo FORCE reconciliado

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

### B4 — cenário executável por membro FORCE da superfície

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

### D1 — T8d mede exercibilidade de REPLICATION

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

### D2 — via de views transitiva

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

### D3 — boot de produção fail-closed e filhos finalizados

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

### D4 — logs sem componentes da URL efetiva

**Comando:** no head integrado `37e024c332b3ad31bc609db5fad8728d26500abe`, `git show HEAD:docs/revisoes/SAN3/B-SAN3-05-plano.md` para D4/C2.3; `git show HEAD:src/database/runtime-role.bootstrap.ts` buscando `describeEscapes`, `session_user` e `current_user`; `git show HEAD:tests/san3-05-runtime-role-guard-db.test.ts` buscando T9/logger.

**Saída resumida:** D4 exige ausência literal de `username` decodificado no JSON do T9/T15. O bootstrap atual registra `session_user: posture.sessionUser` e `current_user: posture.currentUser` tanto no sucesso quanto na recusa; esses valores são o username efetivo da URL. C2.3 proíbe explicitamente alterar `src/database/runtime-role.bootstrap.ts`.

**Resultado:** PARADA original RESOLVIDA no commit `45da0d17e8f2abc1941ee8760a4b7e06cd28da46`, mas a execução do aceite substitutivo encontrou a PARADA-D4-2 abaixo.

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

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

### B2 — `npm run lint`

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

### B3 — testes unitários/contratuais selecionados

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

### B4 — gerador normal e `--all`

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

### B5 — modo e EOL do script

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

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

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

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

## Checklist — B-SAN3-05 · ciclo 2 · desenvolvimento

**Solicitado:**

- [ ] B1 — viabilidade `psql \password`/SCRAM medida; implementação local parcial, não commitada, interrompida por PARADA-D4-2.
- [ ] B2 — helper assíncrono sob trava localmente parcial, não commitado.
- [ ] B3 — não iniciado por PARADA-D4.
- [ ] B4 — não iniciado por PARADA-D4.
- [ ] D1 — título/fixture do T8d localmente parciais, não commitados.
- [ ] D2 — SQL transitiva e documentação localmente parciais, não commitadas.
- [ ] D3 — não iniciado por PARADA-D4.
- [ ] D4 — nova parada: a errata permite username só em `session_user/current_user`, mas a recusa já o publica também em `escapes[].rolname` e `via:rolname`.
- [ ] Ajustes do ciclo — pendências C2.6 não registradas por PARADA-D4.
- [x] Integração da main — commit `37e024c332b3ad31bc609db5fad8728d26500abe`; quatro conflitos resolvidos por união; `D-GOV-PROPORCIONAL` presente.
- [x] `Kpis/*` à main — `git diff --quiet origin/main -- Kpis/` retornou 0.

**Feito:** integração da main e restauração integral de `Kpis/*`; errata `45da0d17` medida; viabilidade de B1 em container `dev05c2-viab2-pg` verde (`SCRAM-SHA-256$`, login funcionando); fatia B1/B2/D1/D2 iniciada localmente com `bash -n` verde e `git diff --check` limpo.

**Não feito / divergências:** nenhuma fatia de produto do ciclo 2 está concluída/commitada. PARADA-D4-2: o username já aparece em `escapes[].rolname` e no texto `via:rolname`, fora das duas chaves autorizadas pela errata, e os arquivos necessários para mudar essa superfície estão proibidos ou limitados a D2.

**Validação:** B0 parcial — retomada começou em local/remoto `45da0d17`; KPI continuava igual à main antes das edições. B1/B2/B3/B4/B6–B12/B14 não concluídos. B5 parcial: `bash -n` do script = 0; modo/EOL ainda não re-medidos. B13 local = 0. B10 é reservado à junta.

**Head empurrado:** `d6b3e6303e02a26ed472599173c4c378cba5d616`, confirmado por `git ls-remote` após o commit do relatório de parada. O commit seguinte altera somente esta linha de confirmação; seu SHA final fica na mensagem de entrega, porque um commit não pode conter o próprio hash.

**Próximos passos (análise):** o orquestrador deve dizer expressamente se `escapes[].rolname` e `via:rolname` são identidades permitidas pelo D4. Se não forem, precisa ampliar o escopo e definir a redação sem apagar a razão operacional da recusa. Depois, a mesma identidade retoma os quatro arquivos locais parciais, conclui o teste `-db`, commita e segue B3/B4.
