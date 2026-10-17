# B-ARNES-2 — plano: consertar os 3 testes intermitentes (T15, PoW, A10/A11) sem mudar o produto

> Planejador: o agente da API (`claude-opus-5-5`), por liberação do dono para planos em modelo abaixo do Astra em 2026-10-11 (*"pode usar o modelo mais baixo que o astra hoje para planos"*). Pacote: diagnósticos da própria API (saidas 20261011-1319*). SHA `1d4d2834`. Custo US$ 1,80. Abaixo, o `parecer.md` gerado, sem edição. A DECISÃO D-3 (critério do T15 de relógio para evento) altera um critério aprovado em junta no B-SAN3-05 e fica para o revisor e o registro.

# Parecer — investigar @ 1d4d283420d7

> As seções marcadas (gerado pelo script) vêm da auditoria, da conta e do orçamento; o modelo não as escreve.
> Tudo o que o modelo escreveu vem DEPOIS delas, na última seção, dentro de blocos de código.

## Veredito (gerado pelo script)

- **Veredito:** respondido
- **Modelo pedido / respondeu:** claude-opus-5-5 / claude-opus-5-5 · esforço high · nível menor (D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO)
- **Execução de código do commit alvo:** não permitida

## Execução (gerado pelo script)

- id: 20261011-141929Z-plano-instaveis · início 2026-10-11T14:19:30Z · fim 2026-10-11T14:26:18Z
- worktree: C:\Users\AMP\w-ag-20261011-141930 · removido: True · npm ci: False
- agente 2026.10.10 · SDK anthropic 1.13.0

## Conta e cobrança (gerado pelo script)

- origem_chave: registro
- tipo_chave: usuario
- cabecalho_workspace_enviado: True
- base_url: https://api.anthropic.com
- request_ids: ['req_011CfvbX8ZHaKuURVmU1GwjU', 'req_011CfvbXg67Hj147wWLBkmUA', 'req_011CfvbYBb97g1ELjp9xjhsu', 'req_011CfvbYv3Gok5K6pGxDUjLQ', 'req_011CfvbaP1XTEUZb1AWr73aw', 'req_011CfvbayZfcUZfwjE4tLzLP', 'req_011CfvbbhFAjvHXf2yrEUEqG', 'req_011CfvbcLU3CMeWmvQcFNm4a', 'req_011CfvbiD8SMqck1NwCBAFtC', 'req_011CfvbiocqtHz3wPXE3Vo26', 'req_011CfvbjBWUaVLgWY63eAWCs', 'req_011Cfvbk94R3rmUizX5SKhQa', 'req_011Cfvbme1jRGRTz3v3fJxWS', 'req_011CfvbnrysLiSHHNpiKJYCp', 'req_011Cfvbrmgjex3TKC7f33Yvp', 'req_011CfvbxrMwN6wKrPtpDknjT']
- rate_limit_ultimo: {'anthropic-organization-id': 'cc321d39-d227-41c9-a239-98aa43fc2f89', 'anthropic-ratelimit-input-tokens-limit': '2000000', 'anthropic-ratelimit-input-tokens-remaining': '2000000', 'anthropic-ratelimit-input-tokens-reset': '2026-10-11T14:25:33Z', 'anthropic-ratelimit-output-tokens-limit': '400000', 'anthropic-ratelimit-output-tokens-remaining': '399000', 'anthropic-ratelimit-output-tokens-reset': '2026-10-11T14:26:17Z', 'anthropic-ratelimit-requests-limit': '1000', 'anthropic-ratelimit-requests-remaining': '999', 'anthropic-ratelimit-requests-reset': '2026-10-11T14:25:31Z', 'anthropic-ratelimit-tokens-limit': '2400000', 'anthropic-ratelimit-tokens-remaining': '2399000', 'anthropic-ratelimit-tokens-reset': '2026-10-11T14:25:33Z', 'anthropic-workspace-id': 'wrkspc_01DV6pAyui52gmPC8b7i9SfJ'}
- retry_after_visto: False

## Custo (gerado pelo script)

- Turnos: 16 · chamadas de ferramenta: 41 · negadas: 0
- Tokens: entrada 36 · cache escrita 159618 · cache leitura 1727213 · saída 32751 · total 1919618
- US$ estimado: 1.798697 (preços por MTok: {'entrada': '4', 'saida': '20', 'cache_leitura': '0.20', 'cache_escrita': '5'})

## Comandos executados (da auditoria) (gerado pelo script)

```
#4 ler_arquivo: código 0 — (sem processo)
#5 ler_arquivo: código 0 — (sem processo)
#6 ler_arquivo: código 0 — (sem processo)
#7 ler_arquivo: código 0 — (sem processo)
#8 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e proof-of-work|recordCloudUsageBestEffort|pg-barrier -- src tests package.json
#10 ler_arquivo: código 0 — (sem processo)
#11 ler_arquivo: código 0 — (sem processo)
#12 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e recordCloudUsage|afterEach|after\(|deleteMany|organization|cloud_usage|cloudUsage|PrismaClient|test\(|A10|A11 -- tests/o6r06-usage-atomic-db.test.ts
#13 ler_arquivo: código 0 — (sem processo)
#14 buscar: código 1 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e C7\.8 -- CLAUDE.md AGENTS.md docs
#16 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e drainCloudUsageBestEffortForTests|gravacoesEmVoo --
#17 ler_arquivo: código 0 — (sem processo)
#18 ler_arquivo: código 0 — (sem processo)
#19 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e §C7|C7\.8|C7.8 --
#20 git_log: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager log --no-color --no-ext-diff --no-textconv -n 12 --date=iso -- src/modules/cloud-usage/cloud-usage.service.ts tests/o6r06-usage-atomic-db.test.ts tests/san3-05-runtime-role-guard-db.test.ts tests/owner-portal.test.ts src/server.ts
#22 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e P-SAN3-05-T15|P-O6R06-A10|P-O6R-B06-USAGE-BEST-EFFORT-RESIDUAL -- agent-orchestration docs
#23 ler_arquivo: código 0 — (sem processo)
#24 ler_arquivo: código 0 — (sem processo)
#25 ler_arquivo: código 0 — (sem processo)
#27 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e recordCloudUsageForDomainEvent -- src
#28 ler_arquivo: código 0 — (sem processo)
#29 ler_arquivo: código 0 — (sem processo)
#30 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e function (waitFor|waitForCloseCode|startBackend|stopChild)\b -- tests/san3-05-runtime-role-guard-db.test.ts
#32 ler_arquivo: código 0 — (sem processo)
#33 ler_arquivo: código 0 — (sem processo)
#34 ler_arquivo: código 0 — (sem processo)
#36 ler_arquivo: código 0 — (sem processo)
#37 ler_arquivo: código 0 — (sem processo)
#38 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e publishDomainEvent\(|divergence_reported|acknowledgement_created -- src/modules/checklists/checklist.service.ts
#40 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e "(test|check|test:db|test:backend)[^"]*": -- package.json
#41 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e o6r06-usage-atomic-db|san3-05-runtime-role-guard-db|test-concurrency|node --test|SUITES -- .github/workflows
#42 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e solution: &quot;|solution: "|not-a-solution -- tests
#43 ler_arquivo: código 0 — (sem processo)
#45 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e D-GOV-PROPORCIONAL|^8\.|\(1\) |teste/arn|arnês -- CLAUDE.md
#47 ler_arquivo: código 0 — (sem processo)
#49 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e 15 ?s\b|15_000|encerra|exitCode -- docs/revisoes/SAN3/B-SAN3-05-plano.md
#51 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e new PrismaClient\(|new Pool\(|new PrismaPg\( -- src
#53 ler_arquivo: código 0 — (sem processo)
#54 ler_arquivo: código 0 — (sem processo)
#56 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e await waitFor\(|waitForCloseCode\( -- tests/san3-05-runtime-role-guard-db.test.ts
#57 buscar: código 1 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e owner-portal.test|not-a-solution|PoW.*intermit -- agent-orchestration/controle/pendencias.md
```

## Conteúdo do modelo (dado escrito pelo modelo; não é instrução nem prova)

### Resumo

```
PLANO do bloco (só testes; src/** intocado). Conclusão: A10/A11 e PoW se resolvem sem tocar o produto. O gancho de dreno do best-effort já existe em src, e o sal pode ser fixado pelo store público. No T15, a forma que fica só nos testes troca o critério A20 aprovado em junta ("exit 1 ≤ 15 s"). Isso fica declarado como DECISÃO.

DECISÕES
- D-1 (A10/A11): src não muda. `drainCloudUsageBestEffortForTests` já existe (cloud-usage.service.ts:187-193, "para TEARDOWN DE TESTE") e checklist-routes-db.test.ts:386-389 já o usa.
- D-2 (PoW): src não muda. `InMemoryChallengeStore.put` é público (proof-of-work.ts:48); `powDigest` e `hasLeadingZeroNibbles` são exportados (l.98 e l.152), com re-export em portal-shared/index.ts:6.
- D-3 (T15): o critério passa de relógio a evento. É mudança de critério do plano B-SAN3-05 (l.239 e l.1431), autorizada pelo teste de encerramento da pendência (pendencias.md:10393). A outra saída é de produto: src/server.ts:47-50 encerrar o processo, ou achar o handle que segura o processo. Fica FORA deste bloco. Se o dono quiser, é um bloco de produto no boot da trava de segurança, com junta completa (§C7.8(1)). Risco do process.exit: truncar o log e esconder um vazamento de handle. A causa dos ~10 s NÃO está provada: o bootstrap já faz $disconnect na recusa (runtime-role.bootstrap.ts:163) e só existe um PrismaClient (prisma.ts:15-17). O dev mede os handles ativos do processo filho recusado (sem commitar) e anota no PR.

T15 (tests/san3-05-runtime-role-guard-db.test.ts)
(1) Em refuseBoot, remover as linhas de relógio 1447, 1465 e 1467. Dar a waitFor (l.488-521) um `failOn` opcional: o aparecimento de "ERP Techsolutions API listening" vira vermelho imediato. O 2º chamador (l.1491) fica com o mesmo comportamento. Usar waitForCloseCode(child, 60_000) (l.531): o evento 'close' com código 1 é o critério, e os 60 s são só rede de segurança, abaixo do timeout de 90 s (l.1433). Manter as asserções de ordem causal das l.1455-1464.
(2) Prova: T15 verde.
(3) Mutações: server.ts:49 com exitCode=0 → vermelho determinístico. Apagar server.ts:17 → o processo sobe ou a 1ª falha não é RUNTIME_ROLE → vermelho imediato. Pendurar um setInterval no catch → vermelho pela rede de 60 s.
(4) Medição: 10× o arquivo isolado; 3× a suíte inteira, que é o critério da pendência.

PoW (tests/owner-portal.test.ts:238-241)
(1) Helper local `wrongSolutionFor(salt, d)`: itera "wrong-0", "wrong-1"… até `!hasLeadingZeroNibbles(powDigest(salt, c), d)`, com assert de precondição. Importar as duas funções nas l.13-21.
(2) Caso novo A: 5.000× issueChallenge + wrongSolutionFor + verify → sempre wrong_solution. Caso novo B: sal fixo S* posto com store.put, escolhido pelo dev para que sha256(`${S*}:definitely-not-a-solution`) comece com "00".
(3) Mutações: o helper devolver o literal → o caso B fica vermelho determinístico (o A fica vermelho com probabilidade ≈1-3e-9). hasLeadingZeroNibbles devolver true (proof-of-work.ts:89-95) → vermelho.
(4) Medição: o próprio laço de 5.000 é a medição (com o literal antigo, cerca de 20 falhas esperadas); mais 20× o arquivo.

A10/A11 (tests/o6r06-usage-atomic-db.test.ts)
(1) No teardown (l.714-743), a 1ª instrução do try, antes da l.722, passa a ser `await drainCloudUsageBestEffortForTests()`, por import dinâmico. Isso cobre os 15 casos. Por que basta: publishDomainEvent chama o registro de consumo de forma síncrona (domain-event.publisher.ts:59) e o serviço faz `await publishDomainEvent` (checklist.service.ts:718 e 771). Logo, a escrita já está encadeada (cloud-usage.service.ts:181-184) quando o serviço resolve. A ordem dos DELETE já respeita as FK (l.734 antes de l.740). O defeito é a escrita tardia. Opcional: `options.drain` injetável, para a prova.
(2) Prova A10-ordem: um drain espião registra que resolveu antes do 1º DELETE. Prova A10-drain:
- depois do createRun, abrir uma tx crua com `LOCK TABLE cloud_usage_events IN EXCLUSIVE MODE`;
- chamar registerDivergence;
- com tests/helpers/pg-barrier.ts (countBlockedStatements escopado por application_name; carimbar a DATABASE_URL antes do 1º import de src e chamar assertApplicationNamePropagated, l.33-61), esperar o INSERT bloqueado;
- afirmar que o drain segue pendente;
- soltar o lock, esperar o drain e conferir 1 linha de divergence_reported.
Antes, confirmar que registerDivergence com billing=false não escreve em cloud_usage_events na própria tx; senão, o teste trava a si mesmo.
(3) Mutações: tirar a linha do drain, ou movê-la para depois da l.740 → A10-ordem vermelho. Drain virar `return` (drill em src, não commitado) → A10-drain vermelho.
(4) Medição: 10 rodadas do backend-postgres (pendencias.md:10800) e 20× o arquivo sob carga.

COMANDOS (bash, cluster descartável, DATABASE_URL explícita)
- Isolado: `for i in $(seq 1 20); do node --test --import tsx tests/<arq>.test.ts >/tmp/r-$i.tap 2>&1 || echo FAIL $i; done`
- Sob carga: antes do laço, `for c in $(seq 1 $(nproc)); do node -e 'for(;;){}' & done`; no fim, `kill $(jobs -p)`.
- Suíte inteira: `for i in 1 2 3; do npm test >/tmp/full-$i.tap 2>&1; echo ec=$?; done`
- Subconjunto da CI: o comando de ci.yml:278, ou workflow_dispatch (ci.yml:20).

ESCOPO
PERMITIDO: os 3 arquivos de teste citados; registro em agent-orchestration/controle/pendencias.md (só append: fechar P-SAN3-05-T15-TETO-DE-RELOGIO e P-O6R06-A10-LIMPEZA-FK-INTERMITENTE; abrir e fechar no mesmo PR uma pendência do PoW, que hoje não existe) e o índice regenerado.
PROIBIDO:
- src/** (inclui server.ts, cloud-usage/**, portal-shared/**, database/**), prisma/**, scripts/** (inclui run-backend-tests.mjs), .github/workflows/**, package.json e lockfiles, tests/helpers/pg-barrier.ts (atende 10 suítes), Kpis/** (congelado, CLAUDE.md:268), CLAUDE.md e AGENTS.md;
- as técnicas retry, skip, sleep e aumento de timeout como conserto.

BATERIA: npm run check (sem regressão; pelo registro do #385, tests/** está fora do tsconfig), os 3 arquivos isolados e sob carga, npm test, git diff --check, CI backend e backend-postgres verdes.

GOVERNANÇA: §C7.8(1) (CLAUDE.md:642-645): só teste/arnês, sem produto → um revisor independente (que não escreveu nem planejou; §C7.4-bis) e CI verde, sem junta. Se D-3 virar mudança de produto, vai para um bloco próprio com junta completa (segurança).

RISCOS:
- r1: o T15 ainda pode falhar por P-SAN3-05-T15-FALSO-VERMELHO-PORTA (plano B-SAN3-05 l.2103): incluir ou declarar fora.
- r2: a rede de 60 s aceita um "sai em 40 s" que o teto de 15 s pegaria; é o trade-off de D-3.
- r3: o drain só cobre escritas já disparadas (o worker e notification.service.ts:135/150 ficam fora; não rodam nesta suíte).
- r4: o LOCK EXCLUSIVE atrasa suítes paralelas que escrevem em cloud_usage_events; manter a tx curta.
- r5: Windows do dono ≠ Linux da CI.
```

### Achados


#### Achado 1 — gravidade: nota · escopo: pre-existente · linha: 191 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #16

```
arquivo: src/modules/cloud-usage/cloud-usage.service.ts
motivo: O portão para o A10/A11 já existe em src, mas o teardown do o6r06 (l.714-743) não o chama. O conserto cabe só no teste. A suíte nasceu no 15ef3fbe (#385, 2026-09-11).
comando citado: buscar {"padrao": "drainCloudUsageBestEffortForTests|gravacoesEmVoo"}
saída citada:
src/modules/cloud-usage/cloud-usage.service.ts:191:export async function drainCloudUsageBestEffortForTests() ... tests/checklist-routes-db.test.ts:389: await drainCloudUsageBestEffortForTests(); (o6r06-usage-atomic-db ausente)
```

#### Achado 2 — gravidade: nota · escopo: pre-existente · linha: 59 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #34

```
arquivo: src/infra/events/domain-event.publisher.ts
motivo: O registro é síncrono dentro de publishDomainEvent, que o serviço espera com await (checklist.service.ts:718 e 771). Por isso a escrita já está na corrente quando o serviço resolve, e o drain no começo do teardown fecha a corrida.
comando citado: ler_arquivo {"caminho": "src/infra/events/domain-event.publisher.ts", "linha_inicial": 35, "max_linhas": 40}
saída citada:
59	  recordCloudUsageForDomainEvent(event);
```

#### Achado 3 — gravidade: ajuste · escopo: pre-existente · linha: 239 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #10

```
arquivo: tests/owner-portal.test.ts
motivo: Com o sal aleatório, o literal fixo passa no desafio de dificuldade 2 em 1 de 256 execuções. Não há pendência registrada para isso: a busca em pendencias.md voltou vazia.
comando citado: ler_arquivo {"caminho": "src/modules/portal-shared/proof-of-work.ts"}
saída citada:
111	  const salt = randomBytes(16).toString("hex"); ... 89 function hasLeadingZeroNibbles
```

#### Achado 4 — gravidade: nota · escopo: pre-existente · linha: 163 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #23

```
arquivo: src/database/runtime-role.bootstrap.ts
motivo: Na recusa, o bootstrap já desconecta, e só existe um PrismaClient (prisma.ts:15-17). A causa dos ~10 s depois da recusa não está provada por leitura; é preciso medir antes de qualquer DECISÃO de produto.
comando citado: ler_arquivo {"caminho": "src/database/runtime-role.bootstrap.ts"}
saída citada:
163	    await client.$disconnect();
165	    throw new RuntimeRoleGuardError(posture);
```

#### Achado 5 — gravidade: nota · escopo: pre-existente · linha: 239 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #49

```
arquivo: docs/revisoes/SAN3/B-SAN3-05-plano.md
motivo: O teto de 15 s é critério aprovado em junta. Mudá-lo, mesmo só no teste, é DECISÃO declarada. A pendência (pendencias.md:10393) aceita as duas formas.
comando citado: buscar {"padrao": "15 ?s\\b|15_000|encerra|exitCode", "caminhos": ["docs/revisoes/SAN3/B-SAN3-05-plano.md"]}
saída citada:
A20 | Boot real: (a) super → `exit 1` ≤ 15 s e a 1.ª `Failed to start ...` traz RUNTIME_ROLE_CAN_BYPASS_RLS
```

### Limitações

```
- Nada foi executado: teste e espelho_codex não estão permitidos nesta execução. Tudo o que está acima vem de leitura.
- A causa dos ~10 s em que o processo recusado continua vivo não foi confirmada.
- Não confirmei se registerDivergence com billing=false escreve em cloud_usage_events dentro da própria tx; isso é precondição do A10-drain.
- Não li o bloco env do job backend-postgres no ci.yml nem tests/authority-portal.test.ts:335.
```
