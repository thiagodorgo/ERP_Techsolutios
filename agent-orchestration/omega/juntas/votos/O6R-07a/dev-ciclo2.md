# DIÁRIO DO DEV — `dev-o6r07a-ciclo2` (B-O6R-07a, PR #369, CICLO 2)

> Identidade NOVA (§C7.4-bis): não achei (C1/C2 do ciclo 1), não planejei (planejador-mestre Fable),
> não votei. Implemento o apenso `## CICLO 2` do plano (`B-O6R-07-plano.md` l.703–1051, C2·0–C2·8)
> e não rejulgo. Esqueleto criado ANTES de qualquer edição (P1/P2); cada vermelho-controle é gravado
> AO SER MEDIDO, antes da correção.

---

## SUCESSÃO — quem escreveu o quê neste arquivo (P1/P3)

**Autor A — `dev-o6r07a-ciclo2`** (caiu por `rate_limit`, teto de sessão, entre a correção do D1 e a
medição do verde). É dele, VERBATIM e preservado: o cabeçalho acima, o **§0 Baseline** e os quatro
vermelhos-controle **`D1.a` · `D1.b` · `D1.c` · `D1.d`** mais o `D1.e`. Nada do texto dele foi
reescrito, encurtado ou movido.

**Autor B — `dev-o6r07a-ciclo2-b`** (eu, identidade nova; substituo o caído). É meu **tudo o que
estiver marcado `[B]`**: a re-verificação dos vermelhos do autor A (P3), o `D1.f` em diante, o D2, o
D3 e o Fechamento. **Não achei, não planejei, não votei** — implemento e não rejulgo (§C7.4-bis).

**Autor C — `dev-o6r07a-ciclo2-c`** (eu, identidade nova; substituo o autor B, caído por
`server_error` HTTP 522 indo rodar o guard de paridade). É meu **tudo o que estiver marcado `[C]`**:
a re-verificação e GRAVAÇÃO do D2 (feito no disco pelo autor B, não gravado — não é insumo até eu
re-verificar), o D3.d, o D3.e e o Fechamento. **Não achei, não planejei, não votei** — fecho registro
e bateria e não rejulgo (§C7.4-bis). Se a re-verificação achar defeito no código de D1/D3, reporto
como achado e não conserto. Head medido por mim (`git rev-parse HEAD` no worktree
`.claude/worktrees/b07`): `9d4498998dc3d3c678af440bf90f68971eb6b1ac`, branch
`fix/o6r07a-authorization` — idêntico ao dos autores A e B; correção segue no working tree, não
commitada. Nada do texto de `[A]` ou `[B]` foi reescrito, encurtado ou movido.

**Como apliquei o P3 aos quatro vermelhos do autor A** — a regra é *"evidência registrada em arquivo
pelo caído é roteiro de re-execução barata: o sucessor re-roda cada comando registrado e compara a
saída"*. Os quatro têm comando, `ec` e trecho, logo são roteiro. Re-executei os quatro **eu mesmo**,
e registro cada re-execução como `[B] re-verificação` dentro do item correspondente, **sem apagar a
medição do autor A**. Onde a minha saída bate com a dele, digo que bate; onde não bater, digo qual é
a minha e trato a dele como não-insumo.

**Head medido por mim** (`git rev-parse HEAD`, no worktree `.claude/worktrees/b07`):
`9d4498998dc3d3c678af440bf90f68971eb6b1ac`, branch `fix/o6r07a-authorization` — **idêntico ao que o
autor A registrou no §0**, e a correção dele está no *working tree* (não commitada). Consequência
que uso o tempo todo: **`9d44989` É o código pré-correção**, então o vermelho-controle de M1/M2/M3
se re-executa num worktree descartável desse mesmo hash, sem tocar na árvore julgada.

## §0 — Baseline

- head medido por mim (`git rev-parse HEAD`): `9d4498998dc3d3c678af440bf90f68971eb6b1ac` (plano do
  ciclo 2 no topo; o head do voto do ciclo 1 era `cec0e07`, delta = só o commit do apenso)
- branch (`git rev-parse --abbrev-ref HEAD`): `fix/o6r07a-authorization`
- worktree: `.claude/worktrees/b07`
- delta de código desde `cec0e07`: `git diff --name-only cec0e07 HEAD -- src tests prisma frontend
  RBAC_MATRIX.md` = **VAZIO** — toda medição do ciclo 1 vale neste head
- portas medidas ANTES de qualquer cluster: `docker ps` → só `erp-postgres` 5432 e `erp-redis` 6379
  (base viva, intocável); os containers 32769/32770 do ciclo 5 do B-O6R-02 NÃO estão de pé nesta
  máquina agora, mas as portas ficam reservadas mesmo assim. `netsh ... excludedportrange` → faixas
  excluídas: 2869 · 5357 · 49698–49997 · 50000–50059 · 50160–50559 · 53295–53494 · 54183–54382 ·
  54517–54616 · 54893–55092 · 60413–61012. Porta escolhida para o cluster descartável: **15432**
  (fora de todas as faixas; nunca 55432)

## D1 — C2·3: cobrança vira ATO ÚNICO PÓS-VEREDICTO

Arquivo novo `tests/o6r07a-anon-lockout-multiorg.test.ts` escrito ANTES da correção (M1–M5,
arnês em memória: 2 orgs, MESMO e-mail, senhas distintas, dublê espelho do UPDATE atômico do B01).

### D1.a — vermelho-controle M1 (head atual `9d44989` ≡ código de `cec0e07`, pré-correção)
- comando: `node --test --import tsx tests/o6r07a-anon-lockout-multiorg.test.ts` → **ec=1**
- trecho: `not ok 1 - M1 — 5 logins anônimos CORRETOS na org A não trancam a org B ...` ·
  `uso CORRETO na org A não pode mover o contador da org B (propriedade 2 do C2·3)` · `5 !== 0`
  (expected 0, actual 5 — a sonda 2 da C2 reproduzida: B tranca com uso correto em A)

### D1.b — vermelho-controle M2 (mesma execução, mesmo ec=1)
- trecho: `not ok 2 - M2 ...` · `login bem-sucedido não fabrica auditoria de falha (propriedade 4);
  veio: [{"tenant_id":"tenant-multi-b",...,"action":"auth.login.failed",...,"loginMode":"without_org"}]`
  · `1 !== 0` — 1 linha de falha contra a org irmã em login de SUCESSO

### D1.c — vermelho-controle M3 (mesma execução, mesmo ec=1)
- trecho: `not ok 3 - M3 ...` · `cobrança é ATO ÚNICO: 1 requisição = 1 incremento (propriedade 3)`
  · `2 !== 1` — o head cobra POR CANDIDATO (2 incrementos numa requisição)
- placar da execução: `# pass 2` / `# fail 3` — M4 e M5 verdes NO HEAD, como o plano prevê
  (o vermelho do M4 é na BASE `f895dd2`; M5 é regressão declarada, sem vermelho próprio)

#### `[B]` RE-VERIFICAÇÃO dos vermelhos D1.a/D1.b/D1.c — re-executados por mim (P3)

- terreno: worktree descartável **próprio** `git worktree add --detach ../dev-c2b-red 9d44989`
  (head conferido: `9d4498998dc3d3c678af440bf90f68971eb6b1ac`) + **`npm ci` PRÓPRIO** (`ec=0`), zero
  junction/symlink de `node_modules`. Pude usar **um único** `npm ci` para os dois vermelhos porque
  medi que os manifestos não mudam entre os dois commits:
  `git diff --numstat 9d44989 f895dd2 -- package-lock.json package.json` → **saída VAZIA**.
- **por que `9d44989` serve de "pré-correção":** a correção do autor A está no *working tree* e
  **não foi commitada** (`git status --porcelain` lista os 6 arquivos como ` M`/`??`), então o
  commit `9d44989` É o código do ciclo 1. Não precisei de `git stash`/`reset`/`checkout --` na
  árvore julgada — e não usei nenhum deles.
- comando: `node --test --import tsx tests/o6r07a-anon-lockout-multiorg.test.ts` → **`ec=1`**
- **D1.a / M1 — REPRODUZ IDÊNTICO:** `not ok 1 - M1 …` ·
  `uso CORRETO na org A não pode mover o contador da org B (propriedade 2 do C2·3)` · **`5 !== 0`**
  (`expected: 0`, `actual: 5`), em `…multiorg.test.ts:55:10`
- **D1.b / M2 — REPRODUZ IDÊNTICO:** `not ok 2 - M2 …` ·
  `login bem-sucedido não fabrica auditoria de falha (propriedade 4); veio:
  [{"tenant_id":"tenant-multi-b",…,"action":"auth.login.failed",…,"loginMode":"without_org"}]` ·
  **`1 !== 0`**, em `:80:10`
- **D1.c / M3 — REPRODUZ IDÊNTICO:** `not ok 3 - M3 …` ·
  `cobrança é ATO ÚNICO: 1 requisição = 1 incremento (propriedade 3)` · **`2 !== 1`**
  (`expected: 1`, `actual: 2` — o head cobra POR CANDIDATO), em `:101:10`
- **placar: `# tests 5` · `# pass 2` · `# fail 3` · `# skipped 0`** — bate com o do autor A, com
  `ok 4 - M4` e `ok 5 - M5` verdes no head.
- **Veredito da re-verificação:** as três provas do autor A são MINHAS agora — re-executei o comando
  registrado e a saída bate linha a linha. Nada aqui é herdado por confiança.

### D1.d — vermelho-controle M4 (base `f895dd2`, worktree descartável próprio)
- terreno: `git worktree add ../dev-c2-base f895dd2` (head confirmado `f895dd25f0d8...`) +
  `npm ci` PRÓPRIO (326 pacotes, 3m) — zero junction/symlink de `node_modules`; arquivo copiado
  por `cp` para `tests/`
- comando: `node --test --import tsx tests/o6r07a-anon-lockout-multiorg.test.ts` → **ec=1**
- trecho: `not ok 4 - M4 — ataque anônimo sustentado tranca as DUAS organizações ...` ·
  `tenant-multi-a: o ataque sustentado move o contador real até o teto (propriedade 1)` ·
  `0 !== 5` (expected 5, actual 0) — **o contador PARADO da medição do secops (SEC-003), na base**
- placar na base: `# pass 3` / `# fail 2` (M3 também vermelho na base — soma de incrementos 0≠1,
  coerente: a base não incrementa NADA na via anônima; M1/M2/M5 verdes na base, coerente: sem
  efeito colateral não há contaminação da org irmã)
- worktree removido ao final por `git worktree remove --force` (registrado no Fechamento)

#### `[B]` RE-VERIFICAÇÃO do vermelho D1.d (M4 na base) — re-executado por mim (P3)

- terreno: **o MESMO** worktree descartável `../dev-c2b-red`, levado à base por
  `git checkout --detach f895dd2` **dentro dele** (head conferido:
  `f895dd25f0d8cd5fb6b7c18373245e43f968fcd9`). O `checkout` acontece no worktree DESCARTÁVEL, nunca
  na árvore julgada. Reaproveitei o `node_modules` do mesmo `npm ci` porque os manifestos são
  idênticos entre os dois commits (medido acima) — **não é junction, é o mesmo diretório físico do
  próprio worktree**. Arquivo de teste copiado de novo por `cp` depois do checkout (o checkout não o
  traz: ele é untracked no `b07`).
- comando: `node --test --import tsx tests/o6r07a-anon-lockout-multiorg.test.ts` → **`ec=1`**
- **D1.d / M4 — REPRODUZ IDÊNTICO:** `not ok 4 - M4 …` ·
  `tenant-multi-a: o ataque sustentado move o contador real até o teto (propriedade 1)` ·
  **`0 !== 5`** — o contador PARADO da medição original do secops (`Ω6R-SEC-003`), na base.
- **M3 também vermelho na base, e com a forma OPOSTA à do head** — `0 !== 1` (na base não se
  incrementa NADA na via anônima) contra `2 !== 1` no head (o head incrementa por candidato). É a
  assinatura de que o teste mede o que diz medir: ele reprova o defeito dos DOIS lados.
- **placar na base: `# tests 5` · `# pass 3` · `# fail 2` · `# skipped 0`** — bate com o do autor A,
  com M1/M2/M5 verdes (coerente: sem efeito colateral não há contaminação da organização irmã).
- **Veredito:** os QUATRO vermelhos-controle do autor A estão re-executados por mim, com saída
  idêntica à registrada. O roteiro do P3 funcionou — e custou **um** `npm ci`, não dois.

### D1.e — M5 (regressão declarada, sem vermelho próprio)
- M5 protege a invariante C2-2.a do B01 (401 uniforme; lock indistinguível de inexistente; lock
  não é combustível; inexistente não gera linha). Verde no head e na base — declarado como
  REGRESSÃO, não como sonda, exatamente como o C2·3 manda.

### D1.f — `[B]` AUDITORIA da correção que o autor A deixou no disco (não herdada como boa)

O código estava no *working tree*, **não verificado verde**. Auditei o diff dos 6 arquivos **contra o
C2·3 do plano**, item a item, antes de rodar qualquer coisa. `git diff --numstat` no momento da
auditoria: `auth-runtime.ts` **7/0** · `auth.routes.ts` **3/0** · `anonymous-login.service.ts`
**39/0** · `local-auth-login.service.ts` **56/27** · `-db` **76/0** · mono-org **11/12**; novo
`tests/o6r07a-anon-lockout-multiorg.test.ts` (310 linhas, 5 casos `M1..M5`).

| pergunta do C2·3 | o que o código faz | veredito |
|---|---|---|
| a cobrança está em `AnonymousLoginService.attempt`, ramo `successes.length === 0`, DEPOIS do laço e ANTES do `settle`? | `anonymous-login.service.ts:213-222` — o bloco `if (chargeableFailures.length > 0 && …)` está dentro do `if (successes.length === 0)`, imediatamente antes do `return this.settle(...)` | **CONFERE** |
| `verifyAnonymousCandidate` voltou a ser SEM efeito colateral? | o ramo `!passwordMatches` (l.259-270) só faz `return {ok:false, reason, charge:{…}}` — as duas escritas (`incrementFailedAttempts` + `recordLoginFailure`) foram REMOVIDAS de lá (são 2 das 27 remoções) | **CONFERE** |
| cobra-se EXATAMENTE UM candidato (menor `failed_attempts`, empate → ordem estável)? | `const [target] = [...chargeableFailures].sort((a,b) => a.failedAttempts - b.failedAttempts)` — desestruturação pega **1** elemento; `Array.prototype.sort` é **estável por especificação desde a ES2019**, logo o empate cai na ordem da lista de candidatos | **CONFERE** |
| o método novo usa o MESMO `incrementFailedAttempts` do B01 e o MESMO `recordLoginFailure`, agora com `ipAddress`/`userAgent`? | `registerAnonymousFailure` (l.335-347) chama `this.credentials.incrementFailedAttempts(credentialId, tenantId)` (o UPDATE atômico do B01, repositório INTOCADO — `local-auth-credential.repository.ts` não aparece no diff) e `this.recordLoginFailure(..., auditContext, "without_org")`, com o `auditContext` no 4º parâmetro, que antes era `{}` | **CONFERE** |
| `auth-runtime.ts` ganhou SÓ o espelho `withTenantRls`? | as 7 linhas são 2 de comentário + o método `registerAnonymousFailure` na forma idêntica ao `finalizeAnonymousLogin` (l.59-63); **zero remoção**, zero outra linha | **CONFERE** (a ampliação nominal do C2·5 item 4 ficou nominal) |
| só quem falhou a SENHA é cobrável (lock não é combustível; inexistente não gera linha)? | `charge` só é preenchido no ramo `!passwordMatches`; os ramos `locked`/`inactive`/credencial ausente devolvem `{ok:false, reason}` sem `charge`, e o `else if (result.charge)` do laço não os empilha | **CONFERE** |
| o dado de cobrança nunca é serializado na resposta? | `charge` é campo do `AnonymousCandidateResult` (tipo INTERNO do service); o desfecho anônimo continua achatado em `{kind:"invalid"}` — o M3 asserta isso por `deepEqual(outcome, {kind:"invalid"})` | **CONFERE** |

**Dois pontos que eu NÃO aceitei por leitura e fui medir** (registro os dois porque cada um seria um
achado se tivesse dado o contrário):

1. **`registerFailure` é dep OPCIONAL (`readonly registerFailure?`)** — se faltar, a cobrança some em
   silêncio (fail-open). Medi quem constrói o service:
   `grep -rn "new AnonymousLoginService" --include=*.ts src tests` → **5 sítios, 1 só de produção**
   (`src/modules/auth/routes/auth.routes.ts:90`), e ele **fornece a dep** (l.105-106). Os outros 4
   são arnês (`auth-login-anonymous`, `o6r07a-login-rate-limit`, e os dois deste ciclo). Logo a
   opcionalidade **não abre caminho de produção sem cobrança** — é a mesma classe de
   `verifyPasswordFn?`/`bucketStore?`/`minLatencyMs?`, que já eram opcionais. **Não é achado.**
2. **`credential.failed_attempts` virou opcional no tipo (`readonly failed_attempts?: number`) com
   `?? 0` no uso** — se o repositório real não devolvesse o campo, a escolha "menor contador"
   degeneraria em "sempre o primeiro". Medi o repositório: `findByEmailForTenant`
   (`local-auth-credential.repository.ts:64-74`) é um `findUnique` **sem `select`**, logo devolve a
   linha inteira, `failed_attempts` incluído. A opcionalidade serve só aos dublês estruturais.
   **Não é achado.**

**Ponto que o registro de quedas mandou auditar e NÃO herdar — `tests/o6r07a-anon-lockout.test.ts`
saiu 11/12, DOZE remoções.** Conferi **linha a linha** com `git diff -U12`. As 12 remoções são
exatamente três blocos:

| # | linhas removidas | o que era | classificação |
|---|---|---|---|
| 1 | 5 | a chamada `await harness.service.verifyAnonymousCandidate({tenant_id, email, password})` do teste `(I-REUSO)` | **ajuste mecânico de assinatura** — a cobrança não mora mais nessa função; para exercer o contador é obrigatório entrar por `harness.anonymous.attempt(...)` |
| 2 | 2 | `assert.equal(result.ok, false)` + `assert.equal(result.reason, "invalid_credentials")` | **troca de camada, não afrouxamento** — `attempt` achata todo desfecho em `{kind:"invalid"}` por desenho (401 uniforme), e é isso que a linha nova asserta; o `reason` continua asserido no 2º teste via `metadata.reason` |
| 3 | 5 | a mesma chamada `verifyAnonymousCandidate` do teste `(rastro)` | **ajuste mecânico de assinatura** (mesma razão do #1) |

**As asserções que CARREGAM o teste não mudaram um caractere** — conferi as três, presentes idênticas
antes e depois: `assert.deepEqual(harness.repository.mutations, ["incrementFailedAttempts:credential-1:tenant-anon"], "a ÚNICA mutação da falha anônima é o incremento atômico do B01")` ·
`assert.equal(harness.repository.row.failed_attempts, 1)` ·
`assert.equal(harness.auditRows.length, 1)`. **Nenhuma asserção mono-org afrouxou** — o C2·5 item 7
está cumprido, e o teste ficou **estritamente mais forte**: o `deepEqual` das mutações agora prova
que **uma REQUISIÇÃO inteira** produz exatamente uma mutação, quando antes provava só que uma chamada
a `verifyAnonymousCandidate` produzia uma. **Não reporto achado contra a correção, e não consertei
nada em silêncio.**

*Ressalva de redação, sem efeito sobre a prova:* a mensagem do 2º teste ainda diz *"exatamente UMA
linha por candidato que falhou"*, e no desenho novo é *por requisição*. Mono-org tem 1 candidato,
então o valor asserido (`1`) é o mesmo; é texto envelhecido, não afrouxamento. **Não editei** — o
C2·5 item 7 só permite o ajuste que a assinatura EXIGE, e esta linha não é exigida por assinatura.

**Uma asserção do `-db` que eu suspeitei estar errada e NÃO estava:** o caso novo lê
`metadata?.ipAddress` / `metadata?.userAgent`, mas `recordLoginFailure` passa o `auditContext` por
spread no nível do `EnterpriseAuditLogInput`, não dentro de `metadata`. Fui ler
`src/modules/core-saas/audit/audit-log.service.ts`: `buildAuditMetadata` (l.90-107) **dobra
`ipAddress` e `userAgent` PARA DENTRO do JSON de metadata** — e o `create` só grava
`tenant_id/actor_user_id/action/entity/entity_id/metadata`. Portanto a asserção está no campo certo.
**Auditei em vez de presumir; se eu tivesse presumido nos dois sentidos, erraria.**

### D1.g — `[B]` VERDE pós-correção (N=3, denominador idêntico) + caso `-db` multi-org sob RLS real

Tudo medido por mim no worktree julgado `.claude/worktrees/b07`, head `9d44989` + correção no
working tree.

**(1) Arquivo novo `tests/o6r07a-anon-lockout-multiorg.test.ts` — N=3:**

- comando (3×): `node --test --import tsx tests/o6r07a-anon-lockout-multiorg.test.ts`
- **RUN 1/2/3 idênticos: `# tests 5` · `# pass 5` · `# fail 0` · `# skipped 0` · `ec=0`**
- **denominador idêntico ao do vermelho:** `# tests 5` no head pré-correção (pass 2/fail 3), `# tests
  5` na base (pass 3/fail 2), `# tests 5` agora (pass 5/fail 0). Os 5 casos que estavam vermelhos são
  os MESMOS 5 que estão verdes — nenhum caso nasceu ou sumiu entre as medições.
- as 4 propriedades do C2·3 ficam cobertas por caso: M4 = propriedade 1 (armar preservado) · M1 =
  propriedade 2 (uso correto não tranca o dono) · M3 = propriedade 3 (1 requisição = 1 incremento) ·
  M2 = propriedade 4 (sucesso não fabrica auditoria) · M5 = regressão da invariante C2-2.a do B01.

**(2) Caso `-db` multi-org pela fiação REAL (`auth.routes` → `auth-runtime`/`withTenantRls` →
`registerAnonymousFailure`), em cluster descartável — N=3:**

- **terreno declarado:** **REUSEI o container `dev-c2-pg`** que o autor A deixou de pé
  (`0.0.0.0:15432->5432/tcp`), como o mandato permite. Conferido vivo antes
  (`docker exec dev-c2-pg pg_isready -U postgres` → `accepting connections`) e já migrado
  (`select count(*) from _prisma_migrations where finished_at is not null` → **104**, com
  `20260871000000_grant_work_orders_approve_permission` no topo). **A base viva `erp-postgres`:5432 /
  `erp-redis`:6379 não foi lida nem tocada** — e o risco de encostar nela por acidente é **zero por
  construção**, porque medi que **não existe `.env` no worktree `b07`** (`ls -la .env` → *No such file
  or directory*), então o `import "dotenv/config"` do teste não carrega nada e o `DATABASE_URL` só
  existe quando eu o passo na linha de comando.
- **portas re-medidas por mim ANTES** (não herdei a do autor A): `docker ps` → `erp-postgres` 5432,
  `erp-redis` 6379, `dev-c2-pg` **15432**, e os dois containers do ciclo 5 do `B-O6R-02`
  (`claude-o6r-c5-atrib-pg` **32775** / `claude-o6r-c5-atrib-red` **32776**) — **de pé agora, não
  tocados**. `netsh interface ipv4 show excludedportrange protocol=tcp` → faixas excluídas
  `2869 · 5357 · 49698-49997 · 50000-50059 · 50160-50559 · 53295-53494 · 54183-54382 · 54517-54616 ·
  54893-55092 · 60413-61012`. **15432 está fora de todas**; nunca 55432; 32769/32770 respeitadas.
- comando (3×):
  `DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:15432/erp_techsolutions" node --test --import tsx tests/o6r07a-anon-lockout-db.test.ts`
- **RUN 1/2/3 idênticos: `# tests 7` · `# pass 7` · `# fail 0` · `# skipped 0` · `ec=0`**, com o
  subteste novo `ok 6 - CICLO 2: e-mail em DUAS organizações — 1 requisição falhada = 1 incremento +
  1 linha, com ipAddress/userAgent (N=3)`. Denominador do arquivo: **5 → 6 subtestes**
  (`grep -c "t.test("` no blob do head vs. na árvore), o +1 previsto pelo C2·5 item 7.

**(3) `[B]` VERMELHO-CONTROLE do caso `-db`, que o autor A não chegou a medir e o plano não exigia —
eu medi porque é a prova de que a ampliação nominal do `auth-runtime.ts` serve para alguma coisa:**

- terreno: worktree descartável `../dev-c2b-red` de volta a `9d44989` (head conferido), `npx prisma
  generate` próprio (`ec=0`), arquivo `-db` copiado da árvore julgada, **mesmo cluster `dev-c2-pg`**
- comando: idem, com `DATABASE_URL` para :15432 → **`ec=1`**
- trecho: `not ok 6 - CICLO 2: e-mail em DUAS organizações …` ·
  `após a requisição 1: soma dos incrementos entre as orgs = 1` · **`2 !== 1`**
- placar: `# tests 7` · `# pass 5` · `# fail 2` (o `not ok 6` derruba junto o teste-pai) — e os
  **cinco** subtestes mono-org do ciclo 1 seguem `ok` no head, o que mostra que o defeito `C2-A1`
  era invisível ao arnês mono-org, exatamente como a cadeira C2 disse.
- **por que isto importa:** o vermelho não sai do arnês em memória, sai da **rota HTTP real**
  atravessando `auth-runtime.ts`/`withTenantRls`. É a prova executada de que o método espelho do
  C2·5 item 4 está de fato na fiação de produção — e não só declarado.

### D1.h — `[B]` testes mono-org existentes: verdes SEM afrouxar asserção

- comando (3×): `node --test --import tsx tests/o6r07a-anon-lockout.test.ts`
- **RUN 1/2/3 idênticos: `# tests 7` · `# pass 7` · `# fail 0` · `# skipped 0` · `ec=0`**
- **denominador idêntico, provado pelo blob e não pela memória:**
  `git show 9d44989:tests/o6r07a-anon-lockout.test.ts | grep -c "^test("` → **7**;
  `grep -c "^test(" tests/o6r07a-anon-lockout.test.ts` na árvore → **7**. Nenhum caso mono-org foi
  removido, renomeado ou fundido; as 12 remoções são as do D1.f, todas dentro dos corpos.
- **auditoria das asserções: no D1.f, linha a linha.** As três asserções que sustentam a propriedade
  ("1 falha mono-org = 1 incremento + 1 linha") estão **idênticas** antes e depois. Nenhum
  afrouxamento — **nada a reportar como achado contra a correção**.
- **regressão dos vizinhos que compartilham a classe alterada** (não pedida, medida por segurança —
  são os outros 2 sítios que constroem `AnonymousLoginService`):
  `node --test --import tsx tests/o6r07a-login-rate-limit.test.ts tests/auth-login-anonymous.test.ts`
  → `# tests 16` · `# pass 16` · `# fail 0` · **`ec=0`**. A dep opcional não quebrou dublê nenhum.

## D2 — C2·2: o REGISTRO do P0 (SEC-002 → `parcialmente_superado`)

### D2.a — `[C]` achados.jsonl (linha SEC-002) — edição do autor B RE-VERIFICADA e gravada por mim

O autor B editou e não gravou; não herdei como bom — re-medi cada exigência do C2·2 item 1:

- diff: `git diff --numstat -- docs/revisoes/O6R/achados.jsonl` → **`1 1`** (só a linha 9, SEC-002)
- **parse: 30/30 linhas** parseiam (`json.loads` linha a linha, script Python; a falha aparente da
  1ª execução era encoding cp1252 do stdout do Windows, não do arquivo — re-rodei com
  `PYTHONIOENCODING=utf-8` e nenhuma linha falha). EOL do arquivo: CRLF puro
  (`tr -cd '\r' | wc -c` → 30, para 30 linhas — o mesmo perfil de antes da edição)
- `status` = **`parcialmente_superado`**; **`fechado_em`/`fechado_por` AUSENTES** do objeto
  (conferido por `'fechado_em' in obj` → False; no blob `9d44989` a linha tinha os dois e
  `status:"fechado"`)
- **formato da casa (modelo QUA-004, l.26):** o `supersedido` da QUA-004 tem
  `por · componente_superado · componentes_abertos · verificado_em`; o da SEC-002 tem as MESMAS 4
  chaves + `contagem_aberta` e `pendencia_dona` — as duas extras carregam o que o C2·2 exige
  nominalmente (forma dos números e pendência dona). `por` = "B-O6R-07a (PR #369, ciclo 2)"
- **`componente_superado` preserva as provas:** 2451 chars com os TRÊS cortes do
  `evidencia_fechamento` antigo (2189 chars no blob) — (1) chave dedicada `work_orders:approve` +
  concessão mínima, (2) SoD `self_decision`, (3) escopo por objeto nas rotas guardadas + a nota do
  dual-match do ciclo 2 + provisionamento pela migração
- **`componentes_abertos` = 9**, um por rota, cada um com FORMA do número e CAUSA/ORIGEM:
  1-2 anexos POST/DELETE (**execução** — 201 / 204+blob; origem `bf456b0` 13/07 #173) ·
  3 comment-POST (**execução** — 201) · 4-7 comment-PATCH/DELETE + tag-POST/DELETE (**leitura de
  código** — `D-Ω3F-5-COMMENT`, cláusula `autor OU update`) · 8-9 geocode/geocode-destination
  (**alcance por execução, efeito condicionado a `GEOCODING_ENABLED`** — C1 mediu 200
  `geocoded=false` com provider Noop)
- `contagem_aberta` publica a distribuição **3 execução · 4 leitura · 2 env** — idêntica à do C2·2

**Veredito: CONFERE com o C2·2 item 1.** A edição do autor B está correta; agora está medida e gravada.

### D2.b — `[C]` REGISTRO_ACHADOS_O6R.md (l.219 + l.776) — re-verificado e gravado por mim

- diff: `git diff --numstat -- docs/revisoes/O6R/REGISTRO_ACHADOS_O6R.md` → **`66 24`**; EOL CRLF puro
  preservado (`tr -cd '\r' | wc -c` → 828, para 828 linhas)
- **seção do SEC-002 (heading na l.219 atual):** status *"parcialmente superado pelo B-O6R-07a (PR
  #369, ciclo 2). NÃO está fechado"*; bloco **SUPERADO** com os 3 cortes e as provas por execução
  (placares dos vermelho-controles transcritos); bloco **ABERTO** com as MESMAS 9 rotas do
  `achados.jsonl`, numeradas 1-9, cada uma com forma (execução × leitura × env) e origem
  (`bf456b0` #173 / `D-Ω3F-5-COMMENT`); dona `P-O6R-SUBRECURSO-OBJECT-SCOPE` (ALTA, `B-O6R-07c`);
  e o "por que NÃO se estendeu o guard aqui" citando o custo medido do C2·2
- **parágrafo "Atualização 2026-09-02" (agora l.815-818):** SEC-003 fechado na autoria; SEC-002
  revertido; distribuição por STATUS: **P0 15 (4 fechados · 1 parcialmente superado · 10 abertos) ·
  P1 15 (1 fechado, 14 abertos)**; nota explícita de que `p0_fechados` NÃO se move (guard conta só
  hash de merge) e de que `aguardando_merge` fica só com SEC-003
- **as duas seções contam a MESMA história** — grep de "parcialmente superado" no arquivo: l.221
  (seção) e l.815 (atualização) para o SEC-002; a l.608 é o QUA-004, pré-existente

**Veredito: CONFERE com o C2·2 item 2.**

### D2.c — `[C]` kpis-latest.json (SEC-002 sai de aguardando_merge) — re-verificado e gravado por mim

- diff: `git diff --numstat -- Kpis/kpis-latest.json` → **`3 8`**; **parse OK** (`json.load`)
- `production_readiness.aguardando_merge` = **só `Ω6R-SEC-003`** (o objeto do SEC-002 são 5 das 8
  remoções); `nota_aguardando` ganhou a explicação de POR QUE o SEC-002 saiu (não se aguarda merge do
  que não se declara fechado, com a pendência dona nomeada)
- `p0_fechados` = **4** · `p1_fechados` = 0 · `deploy_bloqueado` = true — intocados
- entrada do SEC-002 em `findings`: `status` `fechado` → **`parcialmente_superado`**, resumo
  reescrito honesto (o que fechou + as 9 rotas que seguem)

**Veredito: CONFERE com o C2·2 item 3.**

**Guard de paridade (o comando em que o autor B caiu), rodado por mim:**
`node --test --import tsx tests/kpi-achados-paridade.test.ts` → **`# tests 6 · # pass 6 · # fail 0` ·
`ec=0`** — JSONL ↔ painel ↔ registro contam a mesma história com o SEC-002 `parcialmente_superado`.

### D2.d — `[C]` conferência DECLARAÇÃO × MEDIÇÃO (drill C1 re-lido; 9 rotas)

Fonte da MEDIÇÃO: `01-autorizacao-alcada-evidencia.md` §3a/3b (l.213-236) e §3c (l.238-250) — o drill
`zz-c1-drill-p0.test.ts` da cadeira C1 (worktree `jur-c1-drill` @ `fb6618b`), transcrito com status
por rota. Conferência nos DOIS sentidos:

**(1) Toda rota nomeada ABERTA bate com o drill — nenhuma responde 403:**

| # declarado | drill C1 mediu | bate? |
|---|---|---|
| 1 attach-POST (execução) | `201 OK — VIA ABERTA` | SIM |
| 2 attach-DELETE (execução, blob) | `204 OK` + §3c: lista 1→0, download 200→404, blob fora do storage | SIM |
| 3 comment-POST (execução) | `201 OK — VIA ABERTA` | SIM |
| 4-7 comment-PATCH/DELETE, tag-POST/DELETE (leitura) | drill NÃO os executou — coerente: declarados como LEITURA DE CÓDIGO, nunca como execução | SIM |
| 8 geocode (alcance por execução; efeito por env) | `200 geocoded=false` (Noop); C1: *"não medi com GEOCODING_ENABLED ligado"* | SIM |
| 9 geocode-destination (alcance por execução; efeito por env) | **`422 validação de domínio — sem guard`** | SIM, com nuance abaixo |

**Nuance do #9, dita às claras e não escondida:** o drill mediu **422**, não 200 — a requisição passou
o gate de permissão e o (inexistente) guard de objeto e morreu na validação de DOMÍNIO, que vive no
service. O 422 PROVA o alcance sem guard (um 403 viria antes); a declaração afirma só "alcance por
execução; efeito condicionado a env" — não afirma 200 nem efeito. A própria C1 o listou como *"sem
guard"*. Declaração e medição dizem o mesmo; o código HTTP difere do #8 e a declaração não o esconde
porque não o cita.

**(2) Nenhuma rota que o drill mediu FECHADA foi nomeada como aberta:** PATCH `/:id` e `/:id/status`
(403 `WORK_ORDER_NOT_ASSIGNED` — guardadas pelo bloco) e mileage/cancel/duplicate/assign/checklists
(403 FORBIDDEN — o técnico nem passa o gate) estão TODAS fora dos `componentes_abertos` e citadas
como guardadas/fora no `componente_superado` e no REGISTRO. Contagem fecha: 14 rotas do router
principal = 2 guardadas + 4 abertas + 8 que o gate barra; + 5 do router de comentários abertas
(1 execução + 4 leitura) = **9 abertas declaradas, nem uma a mais, nem uma a menos**.

**Veredito: PARIDADE CONFIRMADA — não diverge; não parei.** A re-execução HTTP do drill é conferência
da junta (aceite item 2: *"sem sonda nova"*); meu mandato era a paridade contra o drill REGISTRADO.

## D3 — C2·4: dual-match + pendências + erratas + KPI

### D3.a — `[B]` VERMELHO-CONTROLE dos 3 casos dual-match (código pré-correção `9d44989`)

Os 3 casos foram escritos **ANTES** de eu tocar em `work-order.service.ts` e medidos vermelhos no
worktree descartável `../dev-c2b-red` (head conferido `9d4498998dc3d3c678af440bf90f68971eb6b1ac`).

- comando: `node --test --import tsx tests/o6r07a-wo-object-scope.test.ts` → **`ec=1`**
- `not ok 6 - D3/DM1 — atribuído por USER ID (a forma que o app grava): o técnico nomeado muta update
  E status` · trecho: **`PATCH /:id do técnico ATRIBUÍDO veio 403`**
- `not ok 7 - D3/DM2 — o dual-match NÃO é permissão-a-mais: só o usuário nomeado passa, o colega
  segue 403` · trecho: **`o técnico NOMEADO veio 403`** (o negativo do colega já era 403 e passou; o
  que falha é o POSITIVO — exatamente o defeito operacional que o guard do ciclo 1 criou)
- `not ok 8 - D3/DM3 — as DUAS formas de atribuição coexistem e a fronteira 403/404 não se mexeu` ·
  trecho: **`atribuição por USER ID veio 403`** (a forma de PERFIL, medida logo antes no mesmo caso,
  já respondia 200 — o que prova que o vermelho é da forma nova, não do arnês)
- **placar: `# tests 8` · `# pass 5` · `# fail 3`** — os **5 casos do ciclo 1 seguem `ok`**, o que
  mostra que os 3 novos não deslocaram nem enfraqueceram nenhum existente.
- **O helper novo `criarOsAtribuidaPorUserId` asserta o defeito do write ANTES de usar a OS:**
  `assert.equal(atribuida.body.data.assignedOperatorId, userId)` passa — ou seja, a tensão `C1-A4`
  é **fato executado**, não hipótese: o `assign` com corpo `{userId}` grava o **user id** dentro de
  `assigned_operator_id`, que é campo de perfil. `Ω6R-QUA-004` segue aberto com o dono dele.

### D3.b — `[B]` dual-match implementado + verde

**Diff (2 linhas de lógica, dentro de `assertMutationObjectScope` e em nenhum outro lugar):**

```
-    if (!operatorProfileId || workOrder.assignedOperatorId !== operatorProfileId) {
+    const atribuidoPorPerfil = Boolean(operatorProfileId) && workOrder.assignedOperatorId === operatorProfileId;
+    const atribuidoPorUsuario = workOrder.assignedOperatorId === actor.userId;
+
+    if (!atribuidoPorPerfil && !atribuidoPorUsuario) {
```

- **fail-closed preservado:** sem match nos DOIS ramos → 403 `WORK_ORDER_NOT_ASSIGNED`. OS órfã
  (`assignedOperatorId` ausente) não casa com nenhum dos dois — medido pelo DM3.
- **`resolveActorOperatorProfileId` continua sendo chamado** (não movi nem curto-circuitei a
  resolução): a ausência de resolver deixa de conceder por perfil e o ator cai no segundo ramo, que
  compara contra o `actor.userId` — nunca contra `undefined`, porque `assignedOperatorId` ausente não
  é igual a um `userId` que sempre existe no contexto autenticado.
- **404 do cross-tenant intocado:** o guard só roda depois do `findById` tenant-scoped.
- comando (3×): `node --test --import tsx tests/o6r07a-wo-object-scope.test.ts`
- **RUN 1/2/3 idênticos: `# tests 8` · `# pass 8` · `# fail 0` · `# skipped 0` · `ec=0`**
- **denominador idêntico ao do vermelho:** `# tests 8` nas duas medições (5 antigos + 3 novos).

### D3.c — `[B]` migração `20260871000000`: cabeçalho `--`, corpo byte-idêntico, idempotência re-provada

**(1) O diff é SÓ comentário — provado por contagem, não por leitura:**

- `git diff --numstat` → **`24 0`** (24 adições, **zero remoções**)
- adições que **não** começam com `--`:
  `git diff -- <migração> | grep -E "^\+" | grep -v "^+++" | grep -vE "^\+--" | wc -l` → **0**
- remoções: `git diff … | grep -E "^-" | grep -v "^---" | wc -l` → **0**
- **corpo SQL byte-idêntico**, comparado pelo blob do commit e não pelo `git status` (armadilha 2 do
  mandato — `md5sum`/`git status` mentem sob `core.autocrlf`; por isso comparei o CONTEÚDO
  não-comentário dos dois lados):
  `git show 9d44989:<migração> | grep -vE "^--" | md5sum` → `53848878161bf2a84982e3b1fe69477f`
  `grep -vE "^--" <migração> | md5sum` → `53848878161bf2a84982e3b1fe69477f` — **iguais**
- **nenhum CR injetado:** `tr -cd '\r' < <migração> | wc -c` → **0** (o arquivo era LF puro e continua)

**(2) O que os comentários dizem** (achados C3-A4 e C3-A5 da junta do ciclo 1): o `AVISO 1` explica
que o rollback do runbook desfaz os DADOS mas **não desmarca `_prisma_migrations`**, então
`migrate deploy` não reaplica — e dá os dois caminhos conscientes (rodar o corpo à mão, que é
idempotente; ou migração nova, recomendada em produção por deixar rastro). O `AVISO 2` declara a
**dependência de ordem**: em banco só-migração a tabela `roles` está vazia, o `CROSS JOIN` não acha
as três chaves, o segundo INSERT insere **0 linhas** e a migração **termina `ec=0`** — sucesso
aparente, permissão concedida a ninguém; mais a consulta de 1 linha para o operador conferir.

**(3) Idempotência re-provada — 1×(3 aplicações), e nos DOIS estados**, no cluster descartável
`dev-c2-pg` (:15432). Comando de cada aplicação:
`docker exec -i dev-c2-pg psql -U postgres -d erp_techsolutions -v ON_ERROR_STOP=1 -q < <migração>`

| estado do banco | antes | aplicação 1 | 2 | 3 |
|---|---|---|---|---|
| **`roles` VAZIA** (como o cluster estava) | `roles=0 · perm=1 · grants=0` | `ec=0` · `0\|1\|0` | `ec=0` · `0\|1\|0` | `ec=0` · `0\|1\|0` |
| **`roles` semeada** (3 papéis globais inseridos por mim) | `roles=3 · grants=0` | `ec=0` · `3\|3` | `ec=0` · `3\|3` | `ec=0` · `3\|3` |

- **A primeira linha da tabela é o achado C3-A5 MEDIDO AO VIVO, não só comentado:** o cluster tem 104
  migrações aplicadas e `roles` **vazia**; a migração roda três vezes com `ec=0` e concede **zero**
  grants. É exatamente o "sucesso aparente" que o `AVISO 2` passa a declarar.
- **A segunda linha é a contraprova que fecha o par:** com os papéis presentes, a MESMA migração
  concede os **três** declarados —
  `SELECT r.key … WHERE p.key='work_orders:approve'` → `manager`, `super_admin`, `tenant_admin` — e
  reaplicar duas vezes mantém `grants=3` (o `ON CONFLICT DO NOTHING` segura). Idempotente nos dois
  estados, e o caminho de remediação do `AVISO 1`(a) fica provado por execução.
- **Teardown do que EU criei:** apaguei exatamente as 3 linhas que inseri
  (`DELETE FROM roles WHERE tenant_id IS NULL AND key IN ('super_admin','tenant_admin','manager')`),
  e o cluster voltou ao estado em que o encontrei — conferido: `0|0`. **Não é mass-delete
  ad-hoc:** é teardown escopado da minha própria fixture, em cluster descartável, nomeando as chaves
  uma a uma. A base viva não foi tocada.

### D3.d — `[C]` pendencias.md (SÓ APPEND, EOL preservado)

Os 7 registros do C2·5 item 11, apensados como **bloco único ao FIM do arquivo** (mecânica autorizada
pelo mandato — "Write de bloco ao fim"; cada registro nomeia a entrada-alvo por título e linha, e a
escolha está declarada §A2 no próprio bloco): **(1)** correção da divergência A3 (razão falsa —
espião de tempo de fora, margem 49,08 ms × 0,04–0,40 ms, ≥120×; decisão certa; §4 emendado por E-b) ·
**(2)** `P-O6R-SUBRECURSO-OBJECT-SCOPE` (ALTA, dono `B-O6R-07c`, as 9 rotas com N/forma/causa +
decisão de produto do `D-Ω3F-5-COMMENT` como item do plano + consequência sobre o gate da CHECKLIST
P1) · **(3)** `P-AUTH-KDF-ROTACAO-V2` (MÉDIA, dono `B-AUTH-KDF-V2`, C2-A2+C2-A3) ·
**(4)** `P-KPI-HISTORY-MD-BACKLOG` (BAIXA, dono próximo `…F`, 8 entradas #361–#368) ·
**(5)** resolução da tensão A4 na entrada do sticky l.2896-2924 (dual-match; `Ω6R-QUA-004` segue
ABERTO) · **(6)** fechamento do residual `P-O6R-B07A-RASTRO-ANONIMO-SEM-IP` (evidência: caso -db com
ip/userAgent 3/3; pendência-mãe segue ABERTA) · **(7)** 1 linha no `P-O6R-B07-RATE-LIMIT-DISTRIBUIDO`
(C2-A4; escritas 2×N → ≤2).

**Mecânica provada, comando a comando:**
- append binário via Python (`open(target,'ab')`), bloco convertido a CRLF antes; **asserção de
  prefixo**: `after[:len(before)] == before` → **True** (nenhum byte pré-existente mudou)
- `git diff --numstat -- agent-orchestration/controle/pendencias.md` → **`146 0`** (zero remoções);
  `git diff | grep -cE "^-"` → **1** (só o header `--- a/...` do diff)
- EOL: CR **5654 → 5800** (+146) e linhas **5689 → 5835** (+146) — todo o apensado é CRLF, perfil
  misto pré-existente intocado; **`sed -i` não foi usado** em nenhum passo

### D3.e — `[C]` KPI §C3 (latest + history + md + FROZEN + índice regenerado + status-geral + log)

**(1) `Kpis/kpis-latest.json`** — edição cirúrgica por script (indentação e resto do arquivo
preservados; parse conferido depois): `metrics.backend_tests` **2645/2647 → 2654/2656** com nota
nova (forma canônica, portas, delta por arquivo, e a RODADA 1 honesta com o guard mordendo);
`snapshot_date` 2026-09-02 → 2026-09-03. Diff acumulado do arquivo: `8 13` (inclui o 3/8 do D2.c).

**(2) `Kpis/kpis-history.json`** — entrada nova **`B-O6R-07a-ciclo2`** apensada (153ª): `pr` 369 ·
`merge_commit`/`approved_head` **null na autoria** (§C3.5) · `backend_tests` "2654/2656" ·
`flutter_tests`/`frontend_smoke_tests` carregadas **§C3.3 com o marcador na MESMA forma literal**
("CARREGADAS §C3.3, com marcador explicito em CADA uma: …") · `blocks_completed` **fica 158** com
justificativa (mesmo bloco, mesmo PR) · `mvp_*` intocados com 1 linha de justificativa. Diff:
**`12 0`** (git alinha como inserção pura); parse OK, 153 entradas.

**(3) `Kpis/kpis-history.md`** — a PRÓPRIA entrada do ciclo 2 apensada em CRLF (append binário,
prefixo byte-idêntico): `18 0`; CR 2296→2314 = linhas 2296→2314. O backlog #361–#368 NÃO entrou —
é a pendência `P-KPI-HISTORY-MD-BACKLOG` (BAIXA), como o plano manda (C2·4, C3-A1).

**(4) FROZEN** — `node scripts/kpi-freeze.mjs` → "cópia congelada reinjetada (snapshot 2026-09-03)"
· `--check` → **`ec=0`** · `node --check Kpis/app.js` → **`ec=0`** · diff do `app.js`: **`1 1`**,
e a única linha tocada é `var FROZEN = …` (conferido pelo diff textual). Guards focados:
`kpi-dashboard-charts` **16/16 `ec=0`** · `kpi-achados-paridade` **6/6 `ec=0`**.

**(5) Índice de pendências REGENERADO PELO GERADOR** (`python agent-orchestration/controle/
gerar-indice-pendencias.py`), com um tropeço meu, medido e corrigido às claras: a 1ª regeneração
**não moveu o placar** — o gerador só reconhece heading que COMEÇA por `## P-` (l.87 do script), e
meus títulos tinham prefixo `(N/7)`. Corrigi **os meus próprios títulos** (bloco apensado por mim
neste mesmo PR, não commitado — nenhuma linha pré-existente tocada, asserção de prefixo re-executada:
alvo 0× no pré-existente, 1× no apensado, prefixo byte-idêntico depois) e re-rodei o gerador.
**Placar antes → depois: 249 → 252 cabeçalhos · 240 → 243 IDs · ABERTAS 194 → 197 · FECHADAS 55 →
55 · baldes A 36→38, B 82→83, C 76**. As 3 novas no índice com severidade e dono: SUBRECURSO l.5717
ALTA · KDF l.5764 MÉDIA · HISTORY-MD l.5782 BAIXA. `pendencias.md` segue **`146 0`** no diff.

**(6) `status-geral.md`** — atualização de **5 linhas** (`5 0` no diff), inserida após a entrada
2026-09-02 do bloco, CRLF preservado (CR=linhas=4065). **(7) `log-execucao.md`** — entrada do ciclo
2 no topo (`41 0`), CRLF preservado (CR=linhas=3853), com os papéis §C7.4-bis nomeados.

**(8) `API_CONTRACTS.md` NÃO entra — medido, não presumido:** nenhum código HTTP muda no ciclo 2
(o dual-match troca 403→200 para o ator LEGITIMAMENTE atribuído, que é o contrato já declarado;
nenhuma rota nova, nenhum campo novo de resposta — o `charge` é tipo interno nunca serializado,
provado pelo M3 `deepEqual(outcome, {kind:"invalid"})`). O arquivo não foi tocado:
`git status --porcelain -- API_CONTRACTS.md` vazio.

## Fechamento

### `[C]` Suíte plena — RODADA 1 (diagnóstico, ANTES do fecho de KPI), gravada ao medir

- terreno: cluster descartável **`dev-c2-pg` :15432 REUSADO** (declarado; `pg_isready` →
  `accepting connections`) + **`dev-c2c-redis` :15433 subido POR MIM** (`redis-cli ping` → PONG).
  Portas re-medidas ANTES por mim: `docker ps` → 5432/6379 (base viva, intocada) · 15432 ·
  15433; `netsh ... excludedportrange` → `2869 · 5357 · 49698-49997 · 50000-50059 · 50160-50559 ·
  53295-53494 · 54183-54382 · 54517-54616 · 54893-55092 · 60413-61012` — 15432/15433 fora de todas;
  nunca 55432; 32769/32770 do ciclo 5 respeitadas (containers do ciclo 5 não estão de pé).
- comando: `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:15432/erp_techsolutions
  REDIS_URL=redis://127.0.0.1:15433 npm test` (forma canônica: `CORE_SAAS_PERSISTENCE` NÃO
  exportada, `RBAC_DB_PARITY` ausente) → **`ec=1`**
- resultado literal: **`256 arquivo(s) · 2656 teste(s) · pass 2653 · fail 1 · skipped 2`**, 207 659 ms
- **o ÚNICO `not ok` (l.7245 do TAP):** `painel: a cópia congelada é IDÊNTICA ao kpis-latest.json` —
  divergência nas chaves `[production_readiness, findings]`, com a instrução do próprio guard: *"rode
  `node scripts/kpi-freeze.mjs`"*. **Causa nomeada, não presumida:** é a cauda EXATA da queda #3 — o
  autor B editou `kpis-latest.json` (D2.c) e caiu ANTES de rodar o freeze. O guard mordeu como
  desenhado; fechá-lo é o D3.e deste mandato. **Nenhum teste de produto ficou vermelho.**
- **denominador já fecha com o publicado:** base 2645/2647 (255 arq) do ciclo 1 + Δ nomeado por
  arquivo: `o6r07a-anon-lockout-multiorg` **+5** (arquivo novo) · `o6r07a-anon-lockout-db` **+1**
  (6→7) · `o6r07a-wo-object-scope` **+3** (5→8) = **2656 testes / 256 arquivos**; pass esperado
  pós-freeze = 2653+1 = **2654** (skipped 2 constantes). Rodada 2 (pós-KPI) abaixo prova.

### `[C]` Suíte plena — RODADA 2 (pós-KPI): `fail 6`, TODOS artefatos de máquina sob carga — medido, não presumido

- comando idêntico ao da rodada 1 → **`ec=1`**; `256 arq · 2656 testes · pass 2648 · fail 6 ·
  skipped 2`, **319 307 ms** (a rodada 1 fez 207 659 ms — **+54%** de parede)
- os 6 `not ok`, nomeados e classificados pelo erro do TAP: `verify-snapshot (REPEATABLE READ)`
  (erro Prisma em RequestHandler) · `Ω-VID convergência backfill↔sweep` (**"expired transaction …
  timeout 5000 ms, 7067 ms passed"**) · `sessão de A nunca lê B … RLS` (**"Unable to start a
  transaction in the given time"**) · `persistent RBAC middleware` (assertion) · `PostgreSQL RLS
  isolates users` (**"Unable to start a transaction in the given time"**) · `unmerge concorrente`
  (assertion em teste de corrida). **4/6 são timeout explícito de transação; os 2 restantes são
  testes de corrida/tempo.**
- **nenhum dos 6 toca arquivo deste bloco**, e TODOS estavam verdes na rodada 1 com o MESMO código
  de produto (o diff entre as rodadas é só registro/KPI — `Kpis/*`, `pendencias*`, `status-geral`,
  `log-execucao`, diário)
- **a causa, medida:** `docker ps` no fim da rodada mostra **`crit-c5-pg` e `crit-c5-red` Up 13
  minutes** — o crítico do CICLO 5 do `B-O6R-02` começou a rodar EM PARALELO nesta máquina durante
  a minha rodada (containers dele, INTOCÁVEIS, como o mandato ordena). Disputa de CPU/IO com outra
  suíte explica o +54% de parede e os timeouts de 5 s estourados.
- **decisão:** re-rodar a suíte plena (rodada 3) e publicar o resultado; os 6 casos ficam nomeados
  aqui de qualquer forma. Não é regressão do bloco e NÃO consertei nada — não toquei em nenhum dos
  6 arquivos.

### `[C]` Suíte plena — RODADA 3: `fail 5`, mesma classe, VÍTIMAS DIFERENTES — a assinatura da contenda

- comando idêntico → **`ec=1`**; `pass 2649 · fail 5 · skipped 2`, **338 467 ms** (pior ainda:
  `crit-c5-pg`/`crit-c5-red` seguem Up — o crítico do ciclo 5 continua rodando em paralelo)
- os 5 `not ok`: `fail-closed SQL real (0 catálogo→QUEUED)` · `reabrir cria NOVA versão` ·
  `isolamento cross-tenant vistoria` · `prisma: instância NOVA lê organização` ·
  `PrismaCoreSaasStore.createUser audit` — **os CINCO com erro literal de timeout de transação**
  (`Unable to start a transaction in the given time` ×3; `expired transaction … 5000 ms` ×2)
- **interseção com os 6 da rodada 2: VAZIA.** Vítima que roda a cada rodada é a assinatura de
  contenda de ambiente (CPU/IO), não de defeito determinístico — e nenhum dos 11 arquivos vitimados
  nas duas rodadas é arquivo do bloco. Decisão: rodar os itens de bateria não sensíveis a tempo
  agora, ESPERAR o ciclo 5 desocupar a máquina (containers dele caírem) e fazer a rodada final.

### `[C]` Suíte plena — RODADA 4 (máquina livre): VERDE no denominador publicado

- `docker ps` antes: **zero** container `crit-c5-*` (o crítico do ciclo 5 terminou — esperado por
  monitor, não por sleep cego). Comando idêntico às rodadas 1-3 → **`ec=0`**
- resultado literal: **`256 arquivo(s) · 2656 teste(s) · pass 2654 · fail 0 · skipped 2`**,
  **199 344 ms** — parede de volta ao patamar da rodada 1 (207 s), o que FECHA a explicação de
  contenda: os 11 vitimados das rodadas 2/3 passaram TODOS com a máquina livre, sem nenhuma
  mudança de código entre as rodadas
- **denominador publicado e fechado pelos dois lados:** base 2645/2647 (255 arq) do ciclo 1 +
  Δ nomeado por arquivo — `o6r07a-anon-lockout-multiorg` +5 (NOVO) · `o6r07a-anon-lockout-db` +1
  (6→7) · `o6r07a-wo-object-scope` +3 (5→8) = **2654/2656, 256 arquivos, skipped 2** — exatamente
  o que o KPI publica

### `[C]` `git diff --numstat` COMPLETO (20 rastreados + 2 untracked), mapeado ao C2·5

```
Kpis/app.js 1/1 (SÓ a var FROZEN — item 12) · Kpis/kpis-history.json 12/0 · Kpis/kpis-history.md
18/0 · Kpis/kpis-latest.json 8/13 (item 12) · log-execucao.md 41/0 · pendencias-indice.md 10/7 ·
pendencias.md 146/0 (item 11, só append) · status-geral.md 5/0 (item 13) · 00-quedas.md 97/0 (do
ORQUESTRADOR — já estava ` M` no git status do meu start; item 14) · REGISTRO_ACHADOS_O6R.md 66/24 ·
achados.jsonl 1/1 (item 10) · migração 20260871000000 24/0 (item 9, só `--`) · auth-runtime.ts 7/0
(item 4) · auth.routes.ts 3/0 (item 3) · anonymous-login.service.ts 39/0 (item 1) ·
local-auth-login.service.ts 56/27 (item 2) · work-order.service.ts 16/1 (item 5) ·
o6r07a-anon-lockout-db 76/0 e o6r07a-anon-lockout 11/12 (item 7) · o6r07a-wo-object-scope 141/0
(item 8) · NOVOS untracked: o6r07a-anon-lockout-multiorg.test.ts (item 6) e este diário (item 14)
```

- **`pendencias-indice.md` não está nominado no C2·5** — declaro às claras: regenerá-lo pelo
  gerador é ordem EXPLÍCITA do mandato (e do aceite item 6 via prática da casa — o ciclo 1 fez o
  mesmo); é saída mecânica do gerador sobre o `pendencias.md` permitido. Se a junta ler diferente,
  o registro está aqui para o veto.
- Congelados do C2·5: **intocados** — nenhum aparece no numstat (catalog.ts, approval.service,
  work-order.routes, password.service, repositório, sticky, core-saas, snapshot, demais o6r07a-*,
  attachment.service, work-order-comments/**, os 8 do ciclo 5). `frontend/` e `mobile/`: fora do
  diff. `API_CONTRACTS.md`: fora do diff (medido no D3.e item 8).

### `[C]` Bateria — placar final

- suíte plena: **rodada 4 `ec=0` 2654/2656** (rodadas 1-3 gravadas acima com causa nomeada:
  1=FROZEN da cauda da queda #3, fechada pelo D3.e; 2-3=contenda com o crítico do ciclo 5,
  provada pela interseção vazia das vítimas + rodada 4 verde)
- focados N=3 (12 execuções, todas `ec=0`): multiorg 5/5 ×3 · mono-org 7/7 ×3 · wo-object-scope
  8/8 ×3 · -db 7/7 ×3 (cluster :15432)
- `npm run check` **0** · `npm run lint` **0** · `npm run build` **0**
- contrato mobile `tests/mobile-backend-contracts.test.ts`: **25/25 `ec=0`**
- `git diff --check`: **0** (sem whitespace error)
- KPI: `kpi-freeze` + `--check` **0** · `node --check Kpis/app.js` **0** · `kpi-dashboard-charts`
  **16/16** · `kpi-achados-paridade` **6/6** · gerador do índice **0**

### `[C]` Portas usadas

**15432** (`dev-c2-pg`, REUSO declarado do container do bloco) e **15433** (`dev-c2c-redis`, subido
por mim) — ambas re-medidas contra `docker ps` + `netsh excludedportrange` ANTES de usar; **nunca
55432**; **32769/32770 do ciclo 5 jamais tocadas**; base viva 5432/6379 **não lida, não tocada**
(sem `.env` no worktree — `DATABASE_URL` só existiu na linha de comando).

### `[C]` Placar do índice de pendências

**Antes → depois: 249 → 252 cabeçalhos · 240 → 243 IDs · ABERTAS 194 → 197 · FECHADAS 55 → 55 ·
baldes A 36→38 · B 82→83 · C 76→76.** As +3: SUBRECURSO (ALTA) · KDF-ROTACAO-V2 (MÉDIA) ·
KPI-HISTORY-MD-BACKLOG (BAIXA), todas com dono.

### `[C]` O que eu NÃO fiz, e por quê

1. **Não re-executei o drill HTTP das 9 rotas** — o aceite item 2 do C2·6 diz "conferência da junta
   por re-execução + leitura; **sem sonda nova**"; meu D2.d confere a paridade contra o drill
   REGISTRADO da C1, que é o que o mandato pede.
2. **Não consertei nem toquei os 11 testes vitimados nas rodadas 2/3** — não são arquivos do bloco;
   a classe (timeout de transação sob contenda) foi provada ambiental pela rodada 4 verde.
3. **Não editei `API_CONTRACTS.md`** — medi que nenhum código HTTP muda (D3.e item 8); o C2·5
   item 13 manda PARAR se eu medisse o contrário, e não medi.
4. **Não apensei o backlog #361–#368 ao espelho `kpis-history.md`** — por desenho do plano (C2·4,
   C3-A1): só a PRÓPRIA entrada; o backlog é a pendência BAIXA com dono.
5. **Não mexi no código de D1/D3** — minha re-verificação (D1.f–D1.h já do autor B; D2 meu) não
   achou defeito nele; se tivesse achado, eu reportaria e não consertaria (§C7.4-bis).
6. **Não commitei, não abri PR, não mergeei** — vedação expressa do mandato.
7. **Não atualizei `Kpis/index.html`** — nenhuma dimensão nova nasce neste ciclo; o painel hidrata
   dos JSON (§C3.0), conferido pelo guard de charts verde.

### `[C]` Adendo pós-rodada-4 — emenda de HONESTIDADE nas notas de KPI, declarada

Depois da rodada 4 eu emendei **texto de nota** em `kpis-latest.json` e na entrada do history (as
rodadas 2/3 sob contenda entraram na narrativa — a nota citava só a rodada 1 e a final, e omissão
ali seria meia-verdade), corrigi um typo meu (`+54%%`→`+54%`) e re-rodei o freeze. O delta
pós-rodada-4 é SÓ texto de nota + `var FROZEN`; os únicos testes que leem esses arquivos foram
re-executados verdes DEPOIS da emenda: `kpi-freeze --check` **0** · `kpi-dashboard-charts` **16/16**
· `kpi-achados-paridade` **6/6** · `git diff --check` **0**. O numstat não mudou (mesmas linhas já
tocadas). Nenhum teste de produto lê nota de KPI.

### `[C]` Limpeza §C5 (1 linha)

Derrubados `dev-c2-pg` (:15432) e `dev-c2c-redis` (:15433); worktree `dev-c2b-red` removido por
`git worktree remove --force`; TAPs no scratchpad da sessão (efêmero); `erp-postgres`/`erp-redis` e
tudo do ciclo 5 intocados; nenhum rastreado apagado — `docker ps` e `git worktree list` conferidos
depois.
