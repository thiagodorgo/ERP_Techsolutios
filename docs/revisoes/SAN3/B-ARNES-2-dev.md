# B-ARNES-2 — relatório do DEV

- Identidade: `dev-arnes2-codex`
- Execução declarada: Codex em GPT-5.6 Sol, nível menor
- Worktree: `C:/Users/AMP/w-arnes2`
- Ramo: `fix/arnes-2-testes-instaveis`
- HEAD medido: `c1d745c857fc73281623ba37d5c63b904fe90225`
- Estado: pausado antes de instalação, mutações e testes

## Registro incremental

### 2026-10-12 12:22:25Z — conferência inicial

Comando (PowerShell, limite de 30 s via `Start-Job`/`Wait-Job`):

```powershell
git rev-parse HEAD
git branch --show-current
Test-Path docs/revisoes/SAN3/B-ARNES-2-dev.md
```

Saída:

```text
HEAD=c1d745c857fc73281623ba37d5c63b904fe90225
branch=fix/arnes-2-testes-instaveis
report_exists=false
exit=0
```

### SHA-256 de restauração antes das mutações

```text
src/server.ts = 3F2164FB871683D1210194271C9A7D4C372772CBAA288AC0BA97F64EB404DDE8
src/modules/portal-shared/proof-of-work.ts = B7383261A978B797C4879192D5C01702D2C3C7BF0D2875DF44A58CBFE68CAC00
tests/owner-portal.test.ts = E74AFCFF9ABB27CEB878C91E47D36A853679955ACF230AEE4BDD0136BEAEF292
tests/o6r06-usage-atomic-db.test.ts = 70E99B25619F5648DB696D14B1C08A901CD1EE53AF4807A62E091994A1BE8645
tests/san3-05-runtime-role-guard-db.test.ts = 3D794EA7DF69B00BA8BBB5EF441065F9015E48F0A5544338E2C28B58A96AEF28
```

As mutações em `src/**` abaixo são as exceções temporárias e explícitas do plano; cada uma é aplicada isoladamente, precisa deixar o teste alvo vermelho e é revertida antes do passo seguinte, com comparação ao SHA-256 acima. Nenhuma fica na entrega.

#### Mutação PoW-1 — helper devolve o literal antigo

Comando (limite 300 s): `node --test --import tsx tests/owner-portal.test.ts`.

```text
not ok 5 - PoW: solução errada ...
not ok 6 - PoW: o literal antigo é rejeitado pelo canário de sal fixo
# tests 14
# pass 12
# fail 2
exit=1 (VERMELHO esperado)
```

Restauração: `tests/owner-portal.test.ts` voltou a `E74AFCFF9ABB27CEB878C91E47D36A853679955ACF230AEE4BDD0136BEAEF292`.

#### Mutação PoW-2 — `hasLeadingZeroNibbles` sempre `true` (primeira forma)

A execução não chegou a um veredito: `wrongSolutionFor` tinha laço sem teto e ficou preso procurando um candidato que a mutação tornava impossível. A execução foi interrompida; o processo filho exato `node ...w-arnes2/tests/owner-portal.test.ts` que sobreviveu ao wrapper foi encerrado nominalmente (`remaining=0`). O produto foi restaurado e conferido em `B7383261A978B797C4879192D5C01702D2C3C7BF0D2875DF44A58CBFE68CAC00`.

Para cumprir a mutação do plano sem hang, o helper de teste agora tenta no máximo 10.000 candidatos e chama `assert.fail` se nenhum for comprovadamente errado. O arquivo de teste passa a ter SHA de restauração `32F79DB357B7E364C772C83747C94538D73D02D31A4AD283523642DD9255C3CA`; o produto permanece byte-idêntico.

Baseline após o teto: 14/14, 0 falhas, 0 pulos, 2128.8909 ms. A mutação PoW-2 foi então repetida:

```text
not ok 5 ... não foi possível construir uma solução comprovadamente errada em 10.000 tentativas
not ok 6 ... não foi possível construir uma solução comprovadamente errada em 10.000 tentativas
# tests 14
# pass 12
# fail 2
exit=1 (VERMELHO esperado)
```

Restauração conferida: produto `B7383261A978B797C4879192D5C01702D2C3C7BF0D2875DF44A58CBFE68CAC00`; teste `32F79DB357B7E364C772C83747C94538D73D02D31A4AD283523642DD9255C3CA`.

#### Mutação A10-1 — retirar o `await drain()` do teardown

Comando (limite 300 s): `node --test --import tsx tests/o6r06-usage-atomic-db.test.ts`.

```text
not ok 11 - A10-ordem · o dreno resolve antes do primeiro DELETE do teardown
expected: true
actual: false
# tests 17
# pass 16
# fail 1
exit=1 (VERMELHO esperado)
```

Restauração conferida: `tests/o6r06-usage-atomic-db.test.ts` voltou a `70E99B25619F5648DB696D14B1C08A901CD1EE53AF4807A62E091994A1BE8645`.

### 2026-10-12 12:22:25Z — leitura iniciada

Comando (PowerShell, limite de 30 s via `Start-Job`/`Wait-Job`):

```powershell
Get-Content CLAUDE.md -Raw
Get-Content PROJECT_MEMORY.md -Raw
Get-Content docs/revisoes/SAN3/B-ARNES-2-testes-instaveis-plano.md -Raw
```

Saída:

```text
exit=0
CLAUDE.md=59342 bytes
PROJECT_MEMORY.md=19214 bytes
B-ARNES-2-testes-instaveis-plano.md=19051 bytes
observação: a apresentação agregada foi truncada pela interface; nenhuma implementação foi iniciada
```

## Bateria

- Arquivos isolados: `N=0` — não iniciados.
- Sob carga: `N=0` — não iniciado.
- `npm test` completo: `N=0` — não iniciado.
- Mutações/restauração por SHA-256: `N=0` — não iniciadas.
- Docker/PostgreSQL: nenhum container criado.
- `npm ci`: não iniciado.

## PAUSA 2026-10-12 12:22:25Z

Pausa recebida antes do início material do bloco. Nenhum arquivo de produto ou teste foi alterado; nenhum processo de validação ficou em curso.

## RETOMADA — execução desde o início do bloco

### Terreno e identidade

- Identidade NOVA: `dev-arnes2-codex`.
- Execução declarada: Codex em GPT-5.6 Sol, nível menor.
- Medido na árvore-alvo: ramo `fix/arnes-2-testes-instaveis`, HEAD inicial `c1d745c857fc73281623ba37d5c63b904fe90225`.
- Estado inicial: somente este relatório untracked; nenhum arquivo de produto ou teste previamente alterado.
- Contratos, memória, status, controle pertinente, log, plano e skill `backend-review-ts-prisma` (incluindo referências obrigatórias) lidos antes da mutação.

### Implementação do arnês

Arquivos alterados, todos permitidos pelo plano:

- `tests/san3-05-runtime-role-guard-db.test.ts`: T15 passa a fechar pelo evento `close`/código 1; `waitFor` aceita `failOn`, recusando imediatamente boot que chegue a `listening`; removido o critério de relógio total de 15 s.
- `tests/owner-portal.test.ts`: `wrongSolutionFor` garante a precondição criptográfica; 5.000 desafios são exercitados; sal-canário fixo `pow-canary-268` prova que o literal antigo começa com `00` em dificuldade 2.
- `tests/o6r06-usage-atomic-db.test.ts`: `application_name` escopado antes dos imports de produto; prova A10-drain bloqueia `cloud_usage_events`, verifica que o dreno permanece pendente, libera o lock e confirma uma linha `checklist_run.divergence_reported`; teardown drena antes do primeiro DELETE.

Comandos/saídas iniciais:

```text
node -e <busca exaustiva de sal canário>
pow-canary-268

git diff --check
exit=0

git diff --stat
3 arquivos de teste: 108 inserções, 10 remoções (antes dos ajustes finais)
```

## BLOQUEIO 2026-10-12 — instalação própria do worktree

O primeiro `npm ci` disparado com `Start-Process` não produziu diagnóstico capturado e não deixou `node_modules` visível na conferência imediata. A repetição com `Start-Job` + `Wait-Job -Timeout 900` terminou em erro:

```text
npm error code EBUSY
npm error syscall rmdir
npm error path C:\Users\AMP\w-arnes2\node_modules\@prisma\engines
npm error errno -4082
npm error EBUSY: resource busy or locked, rmdir 'C:\Users\AMP\w-arnes2\node_modules\@prisma\engines'
exit=-4082
```

Uma inspeção de processos não encontrou processo `npm ci`/Node associado a `w-arnes2`. A tentativa de remover **somente** o diretório parcial, depois de preparar verificação de caminho absoluto e de ausência de link/junction, foi rejeitada pela política da ferramenta antes de executar (`exec_command failed: ... rejected: blocked by policy`).

Por ordem expressa do mandato — **“Se algo for barrado, PARE e relate, sem contornar”** — a execução parou aqui. Não houve tentativa alternativa, container Docker não foi criado e nenhuma bateria/mutação foi executada. As mudanças de teste permanecem não validadas e não devem ser consideradas entregues até o bloqueio de instalação ser resolvido e toda a bateria do plano ser executada.

## Bateria na parada

- `npm ci`: `N=2`; primeira tentativa sem diagnóstico capturado, segunda `EBUSY -4082`.
- Arquivos isolados: `N=0` — barrados antes da execução.
- Sob carga: `N=0` — barrado antes da execução.
- `npm test` completo: `N=0` — barrado antes da execução.
- Mutações/restauração por SHA-256: `N=0` — barradas antes da execução.
- Docker/PostgreSQL: nenhum container criado.
- `git diff --check`: `N=1`, verde antes dos ajustes finais; precisa ser reexecutado.
- `src/**`: intocado.

## RETOMADA 2026-10-12 12:30Z — `npm ci` resolvido pelo orquestrador

### Terreno revalidado e diff preservado

Comandos (limite externo de 30 s por chamada):

```text
git status --short --branch
git rev-parse HEAD
git branch --show-current
git diff --stat
git diff -- tests/o6r06-usage-atomic-db.test.ts tests/owner-portal.test.ts tests/san3-05-runtime-role-guard-db.test.ts
```

Saída resumida:

```text
branch=fix/arnes-2-testes-instaveis
HEAD=c1d745c857fc73281623ba37d5c63b904fe90225
modificados=tests/o6r06-usage-atomic-db.test.ts, tests/owner-portal.test.ts, tests/san3-05-runtime-role-guard-db.test.ts
untracked=docs/revisoes/SAN3/B-ARNES-2-dev.md
diff=3 arquivos, 114 inserções, 10 remoções
src/**=intocado
```

O diff deixado por `dev-arnes2b` foi apenas conferido, sem reescrita: T15 usa evento `close` e `failOn`; PoW usa solução errada derivada e canário de sal fixo; A10/A11 aplica `application_name`, prova de INSERT bloqueado e dreno no início do teardown. O `npm ci` próprio do worktree foi concluído pelo orquestrador com `exit=0`, conforme a ordem de retomada; não foi criada junction.

Identidade desta retomada: `dev-arnes2-codex`. Execução declarada: Codex em GPT-5.6 Sol, nível menor. A skill `backend-review-ts-prisma` foi aplicada somente como disciplina de medição do arnês (comandos reais, Postgres descartável e N/forma), sem ampliar nem reinterpretar o plano.

### Prisma Client do worktree

Comando (PowerShell `Start-Job` + `Wait-Job -Timeout 180`):

```powershell
$env:DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:1/arnes2_unreachable?schema=public'
npm run db:generate
```

Saída:

```text
Prisma schema loaded from prisma\schema.prisma
Generated Prisma Client (v7.8.0) to .\node_modules\@prisma\client in 2.14s
exit=0
```

A URL é deliberadamente inalcançável; `prisma generate` não abriu conexão nem tocou a base viva.

### PostgreSQL descartável próprio

Comandos (cada chamada limitada por `Start-Job`/`Wait-Job`):

```text
docker version --format '{{.Server.Version}}'
docker ps -a --format '{{.Names}}|{{.Ports}}|{{.Status}}'
docker run --name arnes2-pg --health-cmd='pg_isready -U postgres -d erp_arnes2' --health-interval=1s --health-timeout=3s --health-retries=60 -e POSTGRES_PASSWORD=arnes2 -e POSTGRES_DB=erp_arnes2 -p 127.0.0.1:58482:5432 -d postgres:16
$env:DATABASE_URL='postgresql://postgres:***@127.0.0.1:58482/erp_arnes2?schema=public&application_name=arnes2-migrate'
npx prisma migrate deploy
```

Saída resumida:

```text
Docker Server=29.6.1
container=arnes2-pg
bind=127.0.0.1:58482->5432/tcp
health=healthy
migrations=108 encontradas e 108 aplicadas
exit=0
```

As portas/base vivas (`erp-postgres`:5432 e `erp-redis`:6379) foram somente vistas no inventário e não receberam comando. O container tem prefixo `arnes2-`; será removido nominalmente no fechamento, sem `prune`.

### Checagem TypeScript

Comando (limite de 600 s):

```powershell
$env:DATABASE_URL='postgresql://postgres:***@127.0.0.1:58482/erp_arnes2?schema=public&application_name=arnes2-check'
npm run check
```

Saída:

```text
> tsc -p tsconfig.json --noEmit
exit=0
```

Execuções: `N=2`, ambas concluídas; a primeira saída ficou presa ao wrapper assíncrono e foi reexecutada para produzir evidência capturada. A segunda, acima, é a execução publicada.

### Baseline PoW e correção mínima da chamada pública do store

Comando (limite de 300 s, `N=2`; a segunda execução filtrou o diagnóstico):

```powershell
$env:DATABASE_URL='postgresql://postgres:***@127.0.0.1:58482/erp_arnes2?schema=public&application_name=arnes2-owner-baseline'
node --test --import tsx tests/owner-portal.test.ts
```

Saída:

```text
not ok 6 - PoW: o literal antigo é rejeitado pelo canário de sal fixo
expected: wrong_solution
actual: unknown
# tests 14
# pass 13
# fail 1
exit=1
```

Medição do contrato em `src/modules/portal-shared/proof-of-work.ts` (somente leitura): `InMemoryChallengeStore.put(challengeId, value)` recebe dois argumentos e `StoredChallenge` usa `expiresAtMs`/`consumed`. O diff herdado chamava `put` com um objeto único (`id`/`expiresAt`/`used`), portanto nada era armazenado sob `fixed-salt-canary`. Ajuste mínimo, ainda dentro do plano e sem tocar `src/**`:

```text
store.put("fixed-salt-canary", { salt, difficulty, expiresAtMs: 100_000, consumed: false })
```

Reexecução após o ajuste (`N=1`, mesma forma, limite 300 s):

```text
1..14
# tests 14
# pass 14
# fail 0
# skipped 0
# duration_ms 2123.2344
exit=0
```

### Baselines dos arquivos `-db`

Comando A10/A11 (limite de 300 s):

```powershell
$env:DATABASE_URL='postgresql://postgres:***@127.0.0.1:58482/erp_arnes2?schema=public&application_name=arnes2-o6r-baseline'
$env:CORE_SAAS_PERSISTENCE='prisma'
node --test --import tsx tests/o6r06-usage-atomic-db.test.ts
```

Saída (`N=1`):

```text
1..16
# tests 16
# pass 16
# fail 0
# skipped 0
# duration_ms 16548.2429
exit=0
```

Comando T15 (limite de 300 s, primeira tentativa):

```powershell
$env:DATABASE_URL='postgresql://postgres:***@127.0.0.1:58482/erp_arnes2?schema=public&application_name=arnes2-t15-baseline'
$env:CORE_SAAS_PERSISTENCE='prisma'
node --test --import tsx tests/san3-05-runtime-role-guard-db.test.ts
```

Saída:

```text
WSL ... execvpe(/bin/bash) failed: No such file or directory
# tests 12
# pass 8
# fail 4
# skipped 0
# duration_ms 14479.9444
exit=1
```

Premissa de terreno medida: no `Start-Job` do Windows, `bash` resolveu para o launcher WSL sem distribuição Linux instalada, enquanto o Git Bash existe em `C:/Program Files/Git/bin/bash.exe`. O plano declara explicitamente o risco Windows ≠ CI Linux; a nova tentativa mantém o mesmo comando de teste e apenas põe o Git Bash existente no início de `PATH`.

Segunda tentativa T15 (`PATH` com Git Bash, `N=1`) mediu o próximo pré-requisito:

```text
T14a/b: /usr/bin/bash: psql: command not found
T14c: scripts/db-runtime-role.sh: psql: command not found
T14d: scripts/db-runtime-role.sh: psql: command not found
# tests 12
# pass 8
# fail 4
exit=1
```

O host Windows não tem `psql.exe`. Foi criado fora do repositório o artefato temporário `C:/Users/AMP/AppData/Local/Temp/arnes2-bin/psql`, que encaminha somente o cliente `psql` por `docker exec -i arnes2-pg`, propagando `PGUSER`, `PGPASSWORD`, `PGDATABASE` e `PGOPTIONS`; não propaga `PGHOST/PGPORT`, portanto o cliente usa o socket interno do container próprio. Smoke com limite de 20 s:

```text
psql -X -At -c 'SELECT 1'
1
exit=0
```

O shim será removido nominalmente no fim; nenhuma instalação/dependência ou arquivo rastreado adicional foi criado.

Com o `psql` disponível, a terceira tentativa do arquivo (`N=1`) mediu `setsid: ausente` nos três subtestes positivos de procedimento (`# tests 12`, `pass 8`, `fail 4`, `exit=1`). O Git Bash desta máquina não traz `setsid`. Foi acrescentado no mesmo diretório temporário um shim mínimo que remove somente a opção `-w` e executa o comando recebido. Isso preserva stdin e exit code; o processo de teste já roda sem terminal interativo. O caso negativo que remove `setsid` continua controlando o próprio `PATH` e não é neutralizado.

Smoke do shim `setsid -w bash -c 'exit 0'`: `exit=0`. Reexecução do arquivo completo com os dois shims temporários (`N=1`, limite de 300 s):

```text
1..1
# tests 12
# pass 12
# fail 0
# skipped 0
# duration_ms 27738.8803
exit=0
```

### Complemento A10-ordem exigido pelo plano

A conferência do diff herdado mostrou que a prova de bloqueio `A10-drain` existia, mas faltava a prova separada de ordem pedida pelo plano. Foi acrescentado, somente no arquivo permitido, o caso `A10-ordem`: ele injeta um dreno espião no teardown e observa imediatamente antes do primeiro DELETE que o dreno já resolveu. A opção é exclusivamente de teste; o caminho normal continua importando e aguardando `drainCloudUsageBestEffortForTests`. Essa forma torna determinística a mutação “tirar/mover o drain para depois do DELETE”.

Reexecução do arquivo A10/A11 (`N=1`, limite 300 s):

```text
1..17
# tests 17
# pass 17
# fail 0
# skipped 0
# duration_ms 14732.3947
exit=0
```

## RETOMADA 2 — 2026-10-12 17:52:45Z

Identidade mantida: `dev-arnes2-codex`. Execução declarada: Codex em GPT-5.6 Sol, nível menor.

### Estado real e revisão de API

Comandos:

```text
git branch --show-current
git rev-parse HEAD
git diff --name-status c1d745c8 --
git diff --exit-code c1d745c8 -- src
Get-Content -Raw C:/Users/AMP/erp-pausa-2026-10-03/REV-ARNES2-api.md
```

Saída resumida:

```text
branch=fix/arnes-2-testes-instaveis
HEAD=8ad4a77ebca2bfc51cb65ff7fa81ee7f738b1413
delta desde c1d745c8=relatório + os 3 arquivos de teste permitidos
src/**=sem diff (exit=0)
revisão=APROVADO COM RESSALVAS
```

A seção `## PAUSA 2026-10-12 12:22:25Z` acima foi mantida como registro histórico, mas não era uma ordem de pausa; esta retomada segue a ordem expressa do orquestrador.

Ressalvas tratadas antes da bateria:

- `tests/o6r06-usage-atomic-db.test.ts`: a transação interativa do `LOCK TABLE` recebeu `{ timeout: 30_000, maxWait: 10_000 }`, removendo o relógio implícito padrão sob carga;
- a rejeição da transação ganhou handler imediato (`void transaction.catch(reject)`), enquanto a promessa original continua sendo aguardada e conserva o erro, evitando `unhandledRejection` sem mascarar falha;
- o nome do canário PoW foi mantido porque descreve o resultado do verificador — a precondição explicita que o literal antigo seria aceito para o sal fixo e `wrongSolutionFor` é o valor rejeitado;
- os resíduos do T15 (janela de reserva de porta e rede de segurança de 60 s) são riscos já declarados pelo plano; não foram ampliados fora do escopo.

Conferência após o ajuste:

```text
git diff --check => exit=0
git diff c1d745c8 -- src => vazio
```

### Prisma Client revalidado nesta retomada

Comando (Git Bash, `timeout 180s`, URL deliberadamente inalcançável):

```text
DATABASE_URL='postgresql://postgres:***@127.0.0.1:1/arnes2_unreachable?schema=public' npm run db:generate
```

Saída:

```text
Prisma schema loaded from prisma/schema.prisma
Generated Prisma Client (v7.8.0) em node_modules/@prisma/client em 2.56 s
exit=0
```

Nenhuma conexão com PostgreSQL foi aberta; a porta 1 em loopback é inalcançável por desenho.
