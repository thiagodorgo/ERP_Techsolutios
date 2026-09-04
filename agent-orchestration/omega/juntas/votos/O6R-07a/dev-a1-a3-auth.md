# EVIDÊNCIA DE DESENVOLVIMENTO — `dev-o6r07a-auth-residuais` (A1 · A2 · A3)

**Papel:** DESENVOLVER (§C7.4-bis — quem planeja não desenvolve; quem acha não conserta).
**Plano:** `agent-orchestration/omega/planos/B-O6R-07-plano.md` §3.4, §3.5, §3.6 · §4 linhas 4/5/6.
**Worktree:** `.claude/worktrees/b07` · **branch:** `fix/o6r07a-authorization`.
**Mandato:** SOMENTE A1 (lockout+rastro no caminho anônimo), A2 (rate-limit por IP nas duas rotas de
login), A3 (pino N/r/p no parse do scrypt de tenant). Fatia disjunta da D1–D3 (work-orders), que outro
dev entregou nesta mesma branch.

**Regra-mãe:** nenhuma correção vale por "ficou verde". Cada sonda nova traz o **vermelho-controle**
registrado (a MESMA sonda contra o head-base / com a correção revertida por injeção), com `ec` e trecho
de saída. Sonda sem vermelho-controle = NÃO-PROVA.

---

## §0 · Baseline — MEDIDO (antes de qualquer edição de código)

```
$ git rev-parse HEAD
2d54ea26ac79e33ed1abee73367854d8c70cc16e
$ git rev-parse --abbrev-ref HEAD
fix/o6r07a-authorization
$ git status --porcelain
(vazio)
$ git merge-base HEAD origin/main
f895dd25f0d8cd5fb6b7c18373245e43f968fcd9
```

**Divergência de head declarada (§A2):** o mandato citou head `c453454`; o head REAL da branch é
`2d54ea2` (`feat(work-orders): SEC-002 P0 … (D1-D3, branch VERMELHA por bloqueio de escopo)`).
Não reescrevi nada — trabalhei sobre o head real e registro a divergência em vez de escondê-la.

**Diff da fatia 1 (não é meu):** 13 arquivos contra `origin/main`
(`work-orders/**`, `core-saas/permissions/catalog.ts`, 3 testes `o6r07a-*` de aprovação/escopo,
`approval-routes.test.ts`, `pendencias.md`, 2 arquivos de registro).
**`git diff origin/main...HEAD -- src/modules/auth/` = VAZIO** — a fatia 1 não encostou no meu módulo.

### Cluster descartável PRÓPRIO (a base viva nunca foi tocada, nem lida)

`docker ps` no início: só `erp-postgres` (5432) e `erp-redis` (6379) — **INTOCADOS**.
Re-medi as portas em vez de confiar na sugestão do mandato: **56434 já estava ocupada** por
`pm-e2-pg` (container de outro agente, subido ~1 min antes). Faixas excluídas do Windows conferidas
por `netsh interface ipv4 show excludedportrange protocol=tcp` — 56438/56381 fora de todas.
Subi `o6r07a-pg` em **:56438** (postgres:16) e `o6r07a-redis` em **:56381**; `prisma migrate deploy`
aplicou todas as migrações (`All migrations have been successfully applied.`). Nunca 55432.

### As 4 falhas conhecidas — CONFIRMADAS POR EXECUÇÃO (base, antes de eu editar)

Forma: `DATABASE_URL=…:56438 REDIS_URL=…:56381 CORE_SAAS_PERSISTENCE=memory LOG_LEVEL=silent npm test`
(= `node scripts/run-backend-tests.mjs`).

```
[run-backend-tests] 251 arquivo(s) · 2622 teste(s) · pass 2616 · fail 4 · skipped 2
EC=1
```

```
$ grep -n "^not ok" baseline-full-suite.txt
3150:not ok 566  - contrato do consumidor de deploy: snapshot dos valores exportados (conteúdo E ordem)
5539:not ok 585  - mantem catalogo de permissoes integro
11359:not ok 1662 - permissão acrescentada ao catálogo chega ao banco por migração (fronteira)
14642:not ok 2313 - [rota] o ajuste exige a permissão de ENVIAR ao técnico e o detalhe passa a mostrar o conjunto
```

São **exatamente** as 4 nomeadas em `dev-d1-d3-autorizacao.md` (§"As 4 falhas da suíte canônica"),
todas da fatia 1 e todas bloqueadas por escopo (`prisma/**`, `core-saas.test.ts`,
`role-catalog-contract.snapshot.json`, `work-order-checklists-sticky.test.ts`). **Nenhuma é minha.**
Este é o denominador contra o qual eu provo, no §Fechamento, que não criei uma quinta.

## A1 — §3.4 lockout + rastro no caminho anônimo — EM APURAÇÃO

## A2 — §3.5 rate-limit por IP nas duas rotas de login — EM APURAÇÃO

## A3 — §3.6 pino N/r/p no parse do scrypt de tenant — EM APURAÇÃO

## Fechamento — EM APURAÇÃO

---
---

# PARTE II — `dev-o6r07a-auth-provas` (sucessor, identidade nova)

> **Tudo ACIMA desta linha é do `dev-o6r07a-auth-residuais`** (caído em `server_error`, família
> streaming, restaurando a correção depois do vermelho-controle final do A1 — registro em
> `00-quedas.md`). **Está preservado verbatim, inclusive os três `EM APURAÇÃO`**, que são o estado
> honesto em que ele morreu. Nada dele é herdado como fato: só o `§0 Baseline`, que tem comandos,
> serve de ROTEIRO (P3). Daqui para baixo é meu, medido por mim.

**Papel:** DESENVOLVER/PROVAR (§C7.4-bis — não planejei e não achei nada).
**Mandato:** V0 confirmar o estado · V1 **refazer os TRÊS vermelhos-controle do zero** · V2 fechar a
evidência e provar que não nasceu falha nova.

---

## §II.0 · Head, árvore e cluster — MEDIDOS por mim

```
$ git rev-parse HEAD
2d54ea26ac79e33ed1abee73367854d8c70cc16e
$ git rev-parse --abbrev-ref HEAD
fix/o6r07a-authorization
```

O head **bate** com o que o caído registrou (`2d54ea2`) e com a correção que ele fez contra o
orquestrador. Medi por conta própria, sem herdar número de mandato.

### Cluster descartável — portas MEDIDAS, não herdadas

```
$ docker ps --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}"
o6r07a-prov-redis   0.0.0.0:56391->6379/tcp   Up 25 minutes   <- OUTRO DEV (provisionamento)
o6r07a-prov-pg      0.0.0.0:56442->5432/tcp   Up 25 minutes   <- OUTRO DEV (provisionamento)
o6r07a-pg           0.0.0.0:56438->5432/tcp   Up 46 minutes   <- desta fatia (do caído)
o6r07a-redis        0.0.0.0:56381->6379/tcp   Up 48 minutes   <- desta fatia (do caído)
erp-postgres        0.0.0.0:5432->5432/tcp    Up 4 days       <- BASE VIVA — INTOCADA, nem leitura
erp-redis           0.0.0.0:6379->6379/tcp    Up 4 days       <- BASE VIVA — INTOCADA, nem leitura
```

`netsh interface ipv4 show excludedportrange protocol=tcp`: 24 faixas listadas; **56438 e 56381
estão fora de todas** (a faixa mais próxima termina em 55092). **Nunca 55432.**

**Decisão declarada:** REUSEI o cluster desta fatia (`o6r07a-pg` :56438 / `o6r07a-redis` :56381),
que é o cluster do meu antecessor — mesma fatia, mesma linhagem de identidade. Dois motivos:
(1) subir um terceiro par de containers na mesma máquina, ao lado do par do outro dev, é custo sem
ganho; (2) **o baseline das 4 falhas foi medido NESTE cluster** — reusá-lo é o que torna a
comparação ANTES × DEPOIS válida. **Assumo a derrubada dele no fechamento** (§C5). Não toquei nos
containers do outro dev.

```
$ docker exec o6r07a-pg psql -U postgres -d erp_techsolutions -c "select count(*) from _prisma_migrations where finished_at is not null;"
103   (EC=0)
$ docker exec o6r07a-redis redis-cli ping
PONG
```

**Nota de denominador (importante para a comparação):** há **104** diretórios em
`prisma/migrations/` no disco e **103** aplicadas no meu cluster. A 104ª é
`20260871000000_grant_work_orders_approve_permission/`, **untracked e do outro dev, criada agora**.
**NÃO a apliquei** — de propósito: aplicá-la mudaria o denominador em relação ao baseline do caído e
eu perderia a única comparação honesta que tenho. É também escopo dele, não meu.

---

## §II.1 · V0 — o estado ANTES de provar (verificação, não confiança)

### V0.a · As três correções estão de pé? SIM — conferidas linha a linha no diff, não no relato

```
$ git diff --numstat -- src/modules/auth/
16	0	src/modules/auth/anonymous-login.constants.ts
57	1	src/modules/auth/routes/auth.routes.ts
16	3	src/modules/auth/services/anonymous-login.service.ts
35	5	src/modules/auth/services/local-auth-login.service.ts
17	0	src/modules/auth/services/password.service.ts
```

| item | §  | o que procurei no DIFF (não no relato) | onde | veredito |
|---|---|---|---|---|
| **A1** | 3.4 | `await this.credentials.incrementFailedAttempts(credential.id, tenantId)` no ramo `!passwordMatches` de `verifyAnonymousCandidate` + `recordLoginFailure(..., "without_org")` | `local-auth-login.service.ts:261-262` | **ÍNTEGRO** |
| **A2** | 3.5 | `TokenBucket` de `portal-shared` + `loginIpBucket.wouldAllow(...)` → `429 RATE_LIMITED` ANTES do parse do corpo; `loginIpBucketKey` = HMAC de subchave derivada de `JWT_SECRET`; IP do socket com `trust proxy` desligado | `auth.routes.ts:113/126/129/139` + `anonymous-login.service.ts:97` + `LOGIN_IP_BUCKET` nas constantes | **ÍNTEGRO** |
| **A3** | 3.6 | `if (parsed.N !== SCRYPT_N \|\| parsed.r !== SCRYPT_R \|\| parsed.p !== SCRYPT_P) return undefined;` dentro de `parseScryptHash` | `password.service.ts:135` | **ÍNTEGRO** |

**Confirmo a leitura do orquestrador — não achei nada contra ele neste ponto.** Nenhum resto de
injeção de reversão viva, nenhum import órfão, nenhum `if (false)` esquecido:

```
$ grep -rn "INJECAO\|if (false" src/modules/auth/
(sem saída)   GREP_EC=1
```

As adições são dominantes (**141 adições · 9 remoções**) e as 9 remoções são **8 linhas de
comentário reescritas logo abaixo** (o comentário do B01 que dizia "sem efeito colateral" e o que
dizia "rotação de e-mails segue sem teto" — os dois eram exatamente o que este bloco revoga) **+ 1
linha de `import`** em `auth.routes.ts`, substituída por uma que também traz `loginIpBucketKey`.
**Nenhuma remoção de lógica.**

**ARMADILHA QUE EU MEDI E QUE VAI IMPORTAR NO §II.2:** a linha do A1
(`await this.credentials.incrementFailedAttempts(credential.id, tenantId);`) existe **DUAS vezes**
no arquivo — l.**152** (caminho de login DIRECIONADO, do B01, que eu **não posso** tocar) e l.**261**
(caminho anônimo, que é o A1). São byte-a-byte idênticas. Uma injeção por texto simples pegaria a
**errada** e eu estaria provando outra coisa. Por isso toda injeção do A1 abaixo é feita sobre o
**par de linhas 261+262**, que é único no arquivo, e conferida por `git diff` antes de rodar.

**Ponto de escopo que EU verifiquei e que o §3.5 podia ter deixado meio-feito:** o plano diz
"aplicado às DUAS rotas de login (com organização e anônima)". Não existem duas rotas — existe
**UMA** `router.post("/login")` (l.120) que se ramifica por presença de `tenantId`; as outras três
(`/refresh`, `/active-tenant`, `/logout`) não são login. O freio está **antes do parse do corpo**,
logo cobre as duas vias por construção. **Não é meia-correção; é a leitura certa do §3.5.**

### V0.b · Os 4 arquivos de teste compilam e rodam? SIM

```
$ npm run check                    ->  EC=0   (tsc -p tsconfig.json --noEmit, sem saída)
```

```
$ DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:56438/erp_techsolutions?schema=public \
  REDIS_URL=redis://127.0.0.1:56381 CORE_SAAS_PERSISTENCE=memory LOG_LEVEL=silent \
  node --test --import tsx tests/o6r07a-anon-lockout.test.ts tests/o6r07a-anon-lockout-db.test.ts \
                            tests/o6r07a-login-rate-limit.test.ts tests/o6r07a-scrypt-pin.test.ts
# tests 25 · pass 25 · fail 0 · skipped 0 · duration_ms 32931.8
EC=0
```

Por arquivo (execução individual, mesma forma):

| arquivo | casos | ec | piso §4 | folga |
|---|---|---|---|---|
| `o6r07a-anon-lockout.test.ts` | **7** | 0 | — | |
| `o6r07a-anon-lockout-db.test.ts` | **6** | 0 | A1 ≥3 | **13 ≫ 3** |
| `o6r07a-login-rate-limit.test.ts` | **6** | 0 | A2 ≥3 | **6 > 3** |
| `o6r07a-scrypt-pin.test.ts` | **6** | 0 | A3 ≥3 | **6 > 3** |
| **total** | **25** | | **M(07a-auth) = 25** | |

**Nada consertado em V0 — porque nada estava quebrado.** Não reescrevi uma linha do que o caído
deixou de pé. O que estava faltando era a PROVA, e é o §II.2.


---

## §II.2 · V1 — os TRÊS vermelhos-controle, refeitos do ZERO

**Método da injeção (e por que não é `git checkout --`).** Cada reversão é uma substituição de
texto **literal e exatamente invertível**, feita por um script próprio
(`mutate.mjs <A1|A2|A3> <inject|restore>`) que: (i) exige o alvo **exatamente 1×** no arquivo,
abortando com `ec=2` sem escrever se aparecer 0 ou 2 vezes; (ii) **conta os CR antes e depois** e
aborta se mudarem (os `.ts` do repo são CRLF — 365 CR em 365 linhas no
`local-auth-login.service.ts`; `sed -i`/`perl -i` converteriam o EOL em massa disfarçado de edição).
**Nunca usei `git checkout --`, `git reset` nem `git stash`**: há OUTRO dev nesta mesma árvore agora
e os três apagariam o trabalho dele.

---

### A1 · §3.4 — lockout + rastro no caminho anônimo · **VERMELHO-CONTROLE OK**

**Injeção da reversão** (as duas linhas do §3.4 viram inertes; o par 261+262 é único no arquivo, o
que evita a l.152 do login DIRECIONADO, que é do B01 e eu não posso tocar):

```
$ node mutate.mjs A1 inject
A1 inject OK em src/modules/auth/services/local-auth-login.service.ts — CR 365 (inalterado)
MUT_EC=0

$ git diff -- src/modules/auth/services/local-auth-login.service.ts   (linhas mutadas)
+      if (false) await this.credentials.incrementFailedAttempts(credential.id, tenantId);
+      if (false) await this.recordLoginFailure(tenantId, email, "invalid_credentials", {}, "without_org");
```

**VERMELHO — medido:**

```
$ node --test --import tsx tests/o6r07a-anon-lockout.test.ts tests/o6r07a-anon-lockout-db.test.ts
# tests 13 · pass 4 · fail 9 · skipped 0
EC=1
```

Os 9 vermelhos (5 de topo + 4 subtestes do arquivo `-db`, contra o Postgres :56438 real):

```
    not ok 1 - 12 tentativas anônimas MOVEM o contador e ARMAM o lockout (a medição do secops)
    not ok 2 - a conta trancada por via anônima recusa o login DIRETO com a senha certa (423)
    not ok 3 - sob lock, o anônimo com a senha CERTA segue 401 — idêntico a e-mail inexistente
    not ok 4 - o rastro existe e é INTERNO: auditoria de falha anônima na organização do candidato
not ok 1 - caminho anônimo: falha ARMA o lockout, deixa rastro e não vaza estado da conta
not ok 2 - (I-REUSO) falha anônima chama o incrementFailedAttempts do B01 — e NENHUM contador novo
not ok 3 - (rastro) a falha anônima deixa 1 linha de auditoria interna, marcada como sem organização
not ok 6 - 5 falhas ANÔNIMAS armam o lockout — e o login DIRETO passa a recusar por locked
not ok 8 - passada a janela do lockout, a senha certa volta a entrar e o contador zera
```

**É EXATAMENTE o vermelho que o §4 linha 4 exige** — "12 falhas anônimas **não movem**
`failed_attempts` no base (contador parado — reprodução da medição do secops)". A sonda não falhou
por acaso nem por outra razão: falhou pela mensagem que ela mesma escreveu para este caso.

```
    not ok 1 - 12 tentativas anônimas MOVEM o contador e ARMAM o lockout (a medição do secops)
      duration_ms: 5013.8936
      failureType: 'testCodeFailure'
      error: 'contador PARADO: failed_attempts = 0 (antes deste bloco era 0)'
      code: 'ERR_ASSERTION'
      expected: true
      actual: false
      stack: tests/o6r07a-anon-lockout-db.test.ts:103:16
```

**Restauração — e CONFIRMADA por execução, não por edição:**

```
$ node mutate.mjs A1 restore
A1 restore OK em src/modules/auth/services/local-auth-login.service.ts — CR 365 (inalterado)
MUT_EC=0
$ grep -rn "if (false" src/modules/auth/services/local-auth-login.service.ts
(sem saída)   GREP_EC=1
$ git diff --numstat -- src/modules/auth/services/local-auth-login.service.ts
35	5     <- idêntico ao V0.a: nenhum resíduo da injeção

$ node --test --import tsx tests/o6r07a-anon-lockout.test.ts tests/o6r07a-anon-lockout-db.test.ts
# tests 13 · pass 13 · fail 0 · skipped 0
EC=0
```

**Veredito parcial A1: PROVADO.** 13 casos, 9 dos quais só passam com a correção de pé. Nota de
método: o `numstat` NÃO muda entre injetado e restaurado (35/5 nos dois) porque as linhas mutadas já
eram linhas ADICIONADAS pelo bloco — por isso a restauração é conferida por `grep` do marcador **e**
por execução da sonda, nunca por `numstat`.


---

### A2 · §3.5 — rate-limit por IP nas duas vias de login · **VERMELHO-CONTROLE OK**

**Injeção da reversão** (o balde continua sendo consumido, mas nunca barra — que é exatamente o
estado do head-base, onde balde por IP não existia):

```
$ node mutate.mjs A2 inject
A2 inject OK em src/modules/auth/routes/auth.routes.ts — CR 587 (inalterado)
MUT_EC=0

$ git diff -- src/modules/auth/routes/auth.routes.ts   (linha mutada)
+      if (false && !loginIpBucket.wouldAllow(ipBucketKey, ipBucketNowMs)) {
```

**VERMELHO — medido:**

```
$ node --test --import tsx tests/o6r07a-login-rate-limit.test.ts
# tests 6 · pass 2 · fail 4 · skipped 0
EC=1

not ok 1 - [com organização] mesmo IP: esgotado o balde, a tentativa seguinte é 429 RATE_LIMITED
not ok 2 - [anônimo] e-mails DIFERENTES no mesmo IP → 429 (rotação de e-mail não escapa do freio)
not ok 3 - IPs distintos NÃO compartilham balde — o vizinho de NAT esgotado não derruba o outro IP
not ok 4 - relógio injetado: passada a janela de reposição, o balde repõe e o login volta
```

**É EXATAMENTE o vermelho que o §4 linha 5 exige** — "inexistência de 429 por volume no base". O
modo da falha é o mesmo nos quatro: **o volume passa como se nada fosse**, respondendo `401`.

```
not ok 1 - [com organização] mesmo IP: esgotado o balde, a tentativa seguinte é 429 RATE_LIMITED
  error: 'Expected values to be strictly equal:  401 !== 429'
  expected: 429     actual: 401     operator: 'strictEqual'
  stack: tests/o6r07a-login-rate-limit.test.ts:59:12

not ok 2 - [anônimo] e-mails DIFERENTES no mesmo IP → 429
  error: 'o freio por IP alcança a via anônima, não só a direcionada   401 !== 429'
  expected: 429     actual: 401
  stack: tests/o6r07a-login-rate-limit.test.ts:86:12

not ok 3 - IPs distintos NÃO compartilham balde
  error: 'o IP que estourou continua barrado   401 !== 429'
  expected: 429     actual: 401
```

Os 2 casos que **seguem verdes** sob a reversão são os que **não dependem** do freio disparar (a
chave é HMAC e nunca o IP em claro; o balde de produção é ao menos tão generoso quanto o de e-mail)
— eles guardam propriedades do desenho, não do efeito. Digo isso às claras porque um leitor apressado
poderia contar "2 verdes no base" como sonda fraca: não é; são sondas de OUTRA propriedade.

**Cobertura das duas vias, que era o ponto do §3.5:** o `not ok 1` mede a via **com organização** e
o `not ok 2` a via **anônima** — as duas caem no mesmo vermelho, o que prova que o freio está acima
do ramo, e não dentro de um dos lados.

**Restauração — e CONFIRMADA por execução:**

```
$ node mutate.mjs A2 restore
A2 restore OK em src/modules/auth/routes/auth.routes.ts — CR 587 (inalterado)
MUT_EC=0
$ grep -n "if (false" src/modules/auth/routes/auth.routes.ts
(sem saída)   GREP_EC=1
$ git diff --numstat -- src/modules/auth/routes/auth.routes.ts
57	1     <- idêntico ao V0.a

$ node --test --import tsx tests/o6r07a-login-rate-limit.test.ts
# tests 6 · pass 6 · fail 0 · skipped 0
EC=0
```

**Veredito parcial A2: PROVADO.** 6 casos, 4 dos quais só passam com o freio de pé, cobrindo as duas
vias e os três casos-piso do §4 linha 5 (estouro → 429 · e-mails diferentes no mesmo IP → 429 · IPs
distintos não compartilham balde) mais dois de desenho.


---

### A3 · §3.6 — pino N/r/p no parse do scrypt de tenant · **VERMELHO-CONTROLE OK**

**Injeção da reversão** (o pino deixa de morder; o trio de custo volta a vir do dado armazenado —
estado literal do head-base):

```
$ node mutate.mjs A3 inject
A3 inject OK em src/modules/auth/services/password.service.ts — CR 170 (inalterado)
MUT_EC=0

$ git diff -- src/modules/auth/services/password.service.ts   (linha mutada)
+  if (false && (parsed.N !== SCRYPT_N || parsed.r !== SCRYPT_R || parsed.p !== SCRYPT_P)) {
```

**VERMELHO — medido:**

```
$ node --test --import tsx tests/o6r07a-scrypt-pin.test.ts
# tests 6 · pass 1 · fail 5 · skipped 0
EC=1

not ok 1 - downgrade de custo: stored forjado com N=2 e a SENHA CORRETA é RECUSADO (o base autenticava)
not ok 2 - stored com N=32768 (acima do canônico, abaixo do maxmem) e senha correta → RECUSADO
not ok 3 - r e p também são pinados: r=16 e p=2 com a senha correta → RECUSADOS
not ok 4 - N gigante (1048576, acima do maxmem): recusa LIMPA — false, sem lançar
not ok 6 - no SERVIÇO de login, stored com N gigante vira invalid_credentials — o 500 morre
```

**São EXATAMENTE as DUAS metades que o §4 linha 6 exige** — "base **aceita e deriva** com N do dado"
e "N gigante → **erro não tratado**" — e cada metade falha por um MODO diferente, que é o que
importa:

**(1) O base ACEITA e DERIVA** — o desfecho é `true`, e `true` só é possível se a derivação rodou
com o N do dado e o `timingSafeEqual` bateu. Um stored forjado com **N=2** (custo ~8000× menor que o
canônico) autentica com a senha correspondente:

```
not ok 1 - downgrade de custo: stored forjado com N=2 e a SENHA CORRETA é RECUSADO
  failureType: 'testCodeFailure'
  error: 'o custo do KDF é constante do sistema — nunca o que o dado armazenado pedir
          true !== false'
  code: 'ERR_ASSERTION'     expected: false     actual: true
  stack: tests/o6r07a-scrypt-pin.test.ts:64:10
```
(idem `not ok 2` com N=32768 e `not ok 3` com r=16 / p=2 — `actual: true` nos três.)

**(2) N gigante → ERRO NÃO TRATADO** — e aqui a testemunha é ainda mais direta que um contador,
porque o `RangeError` **só pode existir se a derivação foi TENTADA**:

```
not ok 4 - N gigante (1048576, acima do maxmem): recusa LIMPA — false, sem lançar
  error: 'Invalid scrypt params: error:030000AC:digital envelope routines::memory limit exceeded'
  code: 'ERR_CRYPTO_INVALID_SCRYPT_PARAMS'     name: 'RangeError'
  stack: scrypt (node:internal/crypto/scrypt:52:15)
         deriveScryptHash  (src/modules/auth/services/password.service.ts:73:10)
         verifyPassword    (src/modules/auth/services/password.service.ts:45:28)
```

E o `not ok 6` mostra a mesma exceção **subindo pelo SERVIÇO de login** — o caminho do 500 na rota:

```
not ok 6 - no SERVIÇO de login, stored com N gigante vira invalid_credentials — o 500 morre
  code: 'ERR_CRYPTO_INVALID_SCRYPT_PARAMS'     name: 'RangeError'
  stack: verifyPassword (src/modules/auth/services/password.service.ts:45:28)
         LocalAuthLoginService.authenticateLocalCredentialWithContext
             (src/modules/auth/services/local-auth-login.service.ts:149:35)
```

O único caso que segue verde sob a reversão é o **round-trip canônico** (N=16384/r=8/p=1) — e tem de
seguir: ele é a sonda anti-regressão que prova que o pino não quebrou a emissão legítima.

**DIVERGÊNCIA DECLARADA (§A2), e é minha obrigação dizer, não esconder.** O §4 linha 6 pede o
"**espião de scrypt** que conta derivações, idioma do B01 §6.4.4". O arquivo prova a
não-derivação por **testemunha de EFEITO**, não por contador de chamadas. **Não reescrevi** — por
duas razões que eu medi:
1. **Não há ponto de injeção para um espião real de scrypt aqui.** `verifyPassword` fecha sobre o
   `scrypt` importado de `node:crypto` no topo do módulo (l.1); o binding ESM não é substituível sem
   mexer em `password.service.ts` para abrir um parâmetro só de teste — o que seria alargar a
   superfície de produção para servir ao arnês. O espião do B01 §6.4.4 é injetado em
   `verifyPasswordFn` do SERVIÇO, um nível acima, e por isso conta VERIFICAÇÕES, não derivações.
2. **A testemunha de efeito é estritamente mais forte para este caso.** Um contador prova
   "não chamou"; `actual: true` prova "chamou, derivou e comparou com sucesso", e o
   `ERR_CRYPTO_INVALID_SCRYPT_PARAMS` prova "chamou e o OpenSSL recusou os parâmetros" — as duas
   são consequências que **só existem** se houve derivação. Um contador de chamadas nunca
   distinguiria isso.
**A junta decide se aceita.** Registro como divergência de FORMA da prova, não de conteúdo: o piso
de casos (≥3) e as duas metades do vermelho-controle exigidas estão cumpridos.

**Restauração — e CONFIRMADA por execução:**

```
$ node mutate.mjs A3 restore
A3 restore OK em src/modules/auth/services/password.service.ts — CR 170 (inalterado)
MUT_EC=0
$ grep -n "if (false" src/modules/auth/services/password.service.ts
(sem saída)   GREP_EC=1
$ git diff --numstat -- src/modules/auth/services/password.service.ts
17	0     <- idêntico ao V0.a

$ node --test --import tsx tests/o6r07a-scrypt-pin.test.ts
# tests 6 · pass 6 · fail 0 · skipped 0
EC=0
```

**Varredura final de resíduo — a árvore inteira do módulo, não só o arquivo mutado:**

```
$ grep -rn "if (false" src/modules/auth/
(sem saída)   GREP_GLOBAL_EC=1
```

**Veredito parcial A3: PROVADO** (com a divergência de forma declarada acima).

---

### Resumo do §II.2 — os três vermelhos-controle, lado a lado

| item | § | sonda(s) | VERMELHO (base) | VERDE (restaurado) | o que o §4 exigia | bate? |
|---|---|---|---|---|---|---|
| **A1** | 3.4 | `o6r07a-anon-lockout` + `-db` | `13 · pass 4 · fail 9` · **ec=1** | `13 · pass 13 · fail 0` · **ec=0** | 12 falhas anônimas não movem `failed_attempts` | **SIM** — `error: 'contador PARADO: failed_attempts = 0'` |
| **A2** | 3.5 | `o6r07a-login-rate-limit` | `6 · pass 2 · fail 4` · **ec=1** | `6 · pass 6 · fail 0` · **ec=0** | inexistência de 429 por volume | **SIM** — `401 !== 429` nas DUAS vias |
| **A3** | 3.6 | `o6r07a-scrypt-pin` | `6 · pass 1 · fail 5` · **ec=1** | `6 · pass 6 · fail 0` · **ec=0** | base aceita e DERIVA · N gigante → erro não tratado | **SIM** — `actual: true` + `ERR_CRYPTO_INVALID_SCRYPT_PARAMS` |

**Nenhuma das três sondas passa sem a sua correção.** É isto que separa uma correção provada de uma
correção que apenas passou — e é isto que se perdeu com a queda, não o código.


---

## §II.3 · V2 — N, forma, concorrência e a prova de que não nasceu falha nova

### V2.a · N=3 por arquivo, denominador IDÊNTICO nas 3 — publicado com N e FORMA

**Forma declarada** (a mesma nas 12 execuções): `node --test --import tsx tests/<arquivo>.test.ts`
com `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:56438/erp_techsolutions?schema=public`,
`REDIS_URL=redis://127.0.0.1:56381`, `CORE_SAAS_PERSISTENCE=memory`, `LOG_LEVEL=silent`.

| arquivo | run 1 | run 2 | run 3 | denominador | ec |
|---|---|---|---|---|---|
| `o6r07a-anon-lockout.test.ts` | 7/7 | 7/7 | 7/7 | **7 · idêntico 3/3** | 0·0·0 |
| `o6r07a-anon-lockout-db.test.ts` | 6/6 | 6/6 | 6/6 | **6 · idêntico 3/3** | 0·0·0 |
| `o6r07a-login-rate-limit.test.ts` | 6/6 | 6/6 | 6/6 | **6 · idêntico 3/3** | 0·0·0 |
| `o6r07a-scrypt-pin.test.ts` | 6/6 | 6/6 | 6/6 | **6 · idêntico 3/3** | 0·0·0 |

**Zero flake em 12 execuções; `skipped 0` em todas** — nenhum caso se esconde atrás de skip.

**Pisos do §4 · esta fatia:** A1 ≥3 → **13** · A2 ≥3 → **6** · A3 ≥3 → **6**. **M(fatia auth) = 25
casos novos permanentes, TODOS com vermelho-controle registrado** no §II.2.

### V2.b · Concorrência N=25 — **NÃO exigida**, e digo por quê com o código na mão

O §4 linha 4 condiciona o N=25: **"SÓ se o diff introduzir escrita nova fora do UPDATE atômico do
B01"**. Fui procurar, porque o mandato me manda **parar e reportar** se achar contador novo ou
read-modify-write novo. **Não há.**

1. **O incremento é o do B01, e ele é um ÚNICO statement** — não há janela de perda de incremento:
```
$ grep -rn "incrementFailedAttempts" src/ | grep -v "\.test\."
   ... local-auth-credential.repository.ts:111  (a ÚNICA implementação)
   ... local-auth-login.service.ts:152   (login DIRECIONADO — B01, intocado)
   ... local-auth-login.service.ts:261   (caminho ANÔNIMO — o §3.4, que REUSA)
```
```sql
-- local-auth-credential.repository.ts:112-121
UPDATE local_auth_credentials
SET failed_attempts = failed_attempts + 1,
    locked_until = CASE WHEN failed_attempts + 1 >= 5 THEN now() + make_interval(...) ELSE locked_until END
WHERE id = $1::uuid AND tenant_id = $2::uuid
```
   O contador é incrementado **pela própria coluna**, no servidor; o lockout é decidido **no mesmo
   statement**. Duas falhas simultâneas não podem perder incremento. **Nenhum contador novo nasceu**
   — o §3.4 acrescentou uma CHAMADA, não uma implementação.

2. **A outra escrita nova do §3.4 é um INSERT de auditoria** (`recordLoginFailure`), append-only. Não
   é contador nem read-modify-write: **não existe modo de falha de perda-de-atualização** para uma
   inserção. Declaro que ela É uma escrita nova, para não esconder o fato — e digo por que não aciona
   o gatilho, que é nominalmente sobre perda de incremento.

3. **O balde por IP não escreve no banco.** `InMemoryTokenBucketStore` é um `Map` em processo, e
   `wouldAllow`/`consume` são **síncronos** — não há `await` entre a checagem e o consumo, logo não há
   interleaving possível no laço de eventos.

**Conclusão: o gatilho do N=25 NÃO disparou. Não parei porque não havia o que reportar** — e o
caminho pelo qual cheguei a isso está acima, para a junta refazer.

### V2.c · Bateria — `ec` de cada passo

| passo | comando | `ec` |
|---|---|---|
| 1 | `npm run check` (`tsc -p tsconfig.json --noEmit`) | **0** |
| 2 | `npm run lint` (alias de `check`) | **0** |
| 3 | `npm test` (`node scripts/run-backend-tests.mjs`, forma canônica com o cluster) | **1** — ver V2.d |
| 4 | `npm run build` (`tsc -p tsconfig.json`) | **0** |
| 5 | `git diff --check` | **0** |
| 6 | focados N=3 (12 execuções) | **0 em todas** |

**Sobre o `ec=1` do passo 3, sem maquiagem:** a suíte fecha vermelha, e a ÚNICA falha é de
`tests/work-order-checklists-sticky.test.ts` — arquivo da fatia 1, do outro dev, **proibido para
mim**. A branch já nascia vermelha por isso (o head do caído dizia, na própria mensagem de commit,
"branch VERMELHA por bloqueio de escopo"). **A minha fatia contribui com ZERO falhas.** O `ec=0` da
suíte inteira exigido pelo §6 é gate **de PR**, e depende de uma decisão de CONTRATO que não é minha
(o outro dev nomeou-a no commit `a37a9dd`: `403 !== 409`, zerar checklists com `null` — porta fechada
ou conflito?).

### V2.d · A comparação que fecha o item — falhas ANTES × DEPOIS, nome a nome

**ANTES** (baseline do caído, head `2d54ea2`, este mesmo cluster :56438):
`251 arquivo(s) · 2622 teste(s) · pass 2616 · fail 4 · skipped 2` · `EC=1`

**DEPOIS** (meu, **N=2 execuções** da mesma forma, head `a37a9dd`):
`255 arquivo(s) · 2647 teste(s) · pass 2644 · fail 1 · skipped 2` · `EC=1` — **idêntico nas duas**.

| # (ANTES) | teste | ANTES | DEPOIS | de quem é |
|---|---|---|---|---|
| `not ok 566` | contrato do consumidor de deploy: snapshot dos valores exportados (conteúdo E ordem) | **FALHA** | **PASSA** | **do outro dev** — ele fechou |
| `not ok 585` | mantem catalogo de permissoes integro | **FALHA** | **PASSA** | **do outro dev** — ele fechou |
| `not ok 1662` | permissão acrescentada ao catálogo chega ao banco por migração (fronteira) | **FALHA** | **PASSA** | **do outro dev** — ele fechou |
| `not ok 2313` → `not ok 2333` | [rota] o ajuste exige a permissão de ENVIAR ao técnico e o detalhe passa a mostrar o conjunto | **FALHA** | **FALHA** | **do outro dev** — `work-order-checklists-sticky.test.ts:620`, `403 !== 409` |
| — | **QUALQUER OUTRA** | — | **NENHUMA** | — |

**Três das quatro sumiram, e não fui eu — foi ele**, exatamente como o mandato previu ("se o outro
dev já as tiver fechado, algumas terão sumido — isso é dele, diga"). O commit dele
(`a37a9dd feat(rbac): provisiona work_orders:approve por migracao — 3 das 4 falhas fecham, e a 4a
devolve uma decisao de CONTRATO`) diz o mesmo por escrito. **A quarta continua aberta e é dele.**

**A quinta falha não existe.** Nenhum `not ok` fora da lista das 4 nomeadas. Se tivesse aparecido um
que não fosse de `prisma`/`core-saas`/`snapshot`/`sticky`, seria **meu** — não apareceu.

**O delta do denominador fecha na unha, e é a checagem que eu mais queria ver:**

```
arquivos:  251 -> 255   Δ = +4   = EXATAMENTE meus 4 arquivos novos
testes:   2622 -> 2647  Δ = +25  = EXATAMENTE 7 + 6 + 6 + 6 dos meus 4 arquivos
skipped:     2 ->    2  Δ =  0   = não escondi nada atrás de skip
```

Δ nomeado por arquivo: `o6r07a-anon-lockout` **+7** · `o6r07a-anon-lockout-db` **+6** ·
`o6r07a-login-rate-limit` **+6** · `o6r07a-scrypt-pin` **+6**.

### V2.e · O head MUDOU no meio do meu trabalho — declaro em vez de esconder (§A2)

Comecei em `2d54ea2` (medido por mim, §II.0) e terminei em **`a37a9dd`**: o outro dev **commitou
enquanto eu rodava**. Verifiquei o que entrou, em vez de presumir:

```
$ git diff --name-only 2d54ea2..HEAD
agent-orchestration/omega/juntas/votos/O6R-07a/00-quedas.md
agent-orchestration/omega/juntas/votos/O6R-07a/dev-u1-u3-provisionamento.md
agent-orchestration/omega/planos/B-O6R-07-plano.md
prisma/migrations/20260871000000_grant_work_orders_approve_permission/migration.sql
tests/core-saas.test.ts
tests/fixtures/role-catalog-contract.snapshot.json
tests/work-order-checklists-sticky.test.ts

$ git diff --name-only 2d54ea2..HEAD -- src/modules/auth/ tests/o6r07a-anon-lockout*.test.ts \
      tests/o6r07a-login-rate-limit.test.ts tests/o6r07a-scrypt-pin.test.ts \
      tests/auth-login-anonymous-db.test.ts agent-orchestration/controle/pendencias.md
(vazio)
```

**O commit dele NÃO tocou um único arquivo meu** — nem o código sob as sondas, nem as sondas. Por
isso os três vermelhos-controle do §II.2 seguem válidos como medidos. E, para não deixar dúvida,
**re-rodei a suíte inteira depois do head novo**: deu o **mesmo** `255 · 2647 · pass 2644 · fail 1 ·
skipped 2`, `EC=1`.

---

## §II.4 · Fechamento

### Diff completo — o que eu deixo na árvore

```
$ git diff --numstat
42	0	agent-orchestration/controle/pendencias.md      <- MEU (V2 / pendência §3.5)
16	0	src/modules/auth/anonymous-login.constants.ts   <- do caído, INTOCADO por mim
57	1	src/modules/auth/routes/auth.routes.ts          <- do caído, INTOCADO por mim
16	3	src/modules/auth/services/anonymous-login.service.ts   <- do caído, INTOCADO
35	5	src/modules/auth/services/local-auth-login.service.ts  <- do caído, INTOCADO
17	0	src/modules/auth/services/password.service.ts   <- do caído, INTOCADO por mim
17	8	tests/auth-login-anonymous-db.test.ts           <- do caído (ver nota de escopo)

$ git status --porcelain   (untracked relevantes)
?? agent-orchestration/omega/juntas/votos/O6R-07a/dev-a1-a3-auth.md   <- este arquivo
?? tests/o6r07a-anon-lockout-db.test.ts · o6r07a-anon-lockout.test.ts
?? tests/o6r07a-login-rate-limit.test.ts · o6r07a-scrypt-pin.test.ts
```

**A ÚNICA linha de código-fonte que eu escrevi neste mandato é ZERO.** Os `35 5`, `57 1`, `17 0`,
`16 3` e `16 0` do `src/` são **idênticos** ao que o V0.a mediu **antes** de qualquer injeção: as
três reversões foram injetadas e desfeitas por substituição exatamente inversa, conferidas por
`grep` do marcador e por **re-execução da sonda**. Eu produzi **prova**, não código — que era o
mandato.

### Nota de escopo — `tests/auth-login-anonymous-db.test.ts` (não é meu, e não o toquei)

O meu mandato lista 4 arquivos de teste; este é um **quinto**, editado pelo caído. **Não o revertí e
não o reescrevi**, e explico por quê: o **§5 do plano** permite "EDIÇÃO dos existentes SÓ nos citados
no §2.5 e SÓ se o contrato novo os quebrar", e `auth-login-anonymous-db` **está** no §2.5. O contrato
novo o quebrou de forma inevitável — a asserção antiga era literalmente
`failed_attempts === 0, "falha anônima não incrementa nenhum candidato"`, que é **o achado
Ω6R-SEC-003 escrito como contrato**. A edição troca `0` por `1`, renomeia o caso e explica a
revogação no comentário. **Divergência entre o meu mandato nominal e o §5 do plano: declarada aqui,
não resolvida por mim.**

### Portas usadas

`o6r07a-pg` **:56438** (PostgreSQL 16, 103 migrações) · `o6r07a-redis` **:56381**. Escolhidas por
medição (`docker ps` + `netsh interface ipv4 show excludedportrange protocol=tcp`), fora de todas as
24 faixas excluídas. **Nunca 55432.** **`erp-postgres` (5432) e `erp-redis` (6379) — a base viva —
não foram tocados nem lidos.** Os containers do outro dev (`o6r07a-prov-pg` :56442 /
`o6r07a-prov-redis` :56391) não foram tocados.

### O que eu NÃO fiz, e por quê

| não fiz | por quê |
|---|---|
| Não escrevi/alterei código de produção | O V0 mediu as três correções **íntegras**; o mandato diz para não reescrever o que está de pé |
| Não adicionei o "espião de scrypt que conta derivações" do §4 linha 6 | Não há ponto de injeção sem alargar `password.service.ts` só para o arnês, e a testemunha de efeito prova **mais** (§II.2/A3) — divergência declarada, junta decide |
| Não rodei a corrida N=25 | O gatilho do §4 linha 4 não disparou: zero contador novo, zero read-modify-write novo (V2.b) |
| Não apliquei a 104ª migração ao meu cluster | É do outro dev e mudaria o denominador contra o qual a comparação ANTES × DEPOIS vale |
| Não toquei `prisma/**`, `core-saas.test.ts`, `role-catalog-contract.snapshot.json`, `work-order-checklists-sticky.test.ts` | Fatia do outro dev, **agora**, e escopo proibido |
| Não abri seção própria para `P-O6R-B07A-RASTRO-ANONIMO-SEM-IP` | Mandato nominal cobria só `P-O6R-B07-RATE-LIMIT-DISTRIBUIDO`; registrei como residual **dentro** da seção autorizada, com nota §A2 |
| Não atualizei `Kpis/*`, `API_CONTRACTS.md`, `achados.jsonl`, `status-geral.md` | Escopo **proibido** no meu mandato — é trabalho de fechamento do PR, não meu |
| Não commitei, não abri PR, não mergeei | Proibido pelo mandato |
| Não usei `git checkout --`, `git reset`, `git stash`, `git clean -xd` | Há OUTRO dev na mesma árvore; os três primeiros apagariam o trabalho dele — e o `git clean -nxd` mostrou que o `-xd` **apagaria este próprio arquivo de evidência** |

### Limpeza §C5

Removido `dist/` (5,6 MB, artefato do `npm run build`, gitignored) e os temporários da sessão no
scratchpad; containers `o6r07a-pg` e `o6r07a-redis` derrubados (`docker rm -f`); **preservados**
`node_modules`, `.env`, todo arquivo rastreado, os untracked permitidos, os containers do outro dev,
a base viva e o resíduo de `storage/checklist-attachments/` (não sei distinguir o meu do dele com o
outro dev rodando testes agora — **não apago o que não é comprovadamente meu**; sem mass-delete).


### Adendo (§A2) — a árvore mudou DE NOVO depois do snapshot do §II.4, e não fui eu

Ao conferir o estado final, **depois** da limpeza, o `git diff --numstat` traz **uma linha a mais**
do que o bloco do §II.4, que foi tirado minutos antes:

```
128	0	agent-orchestration/omega/planos/B-O6R-07-plano.md      <- NÃO É MEU
```

`B-O6R-07-plano.md` é **escopo PROIBIDO** para mim (mandato e §5). Não o abri para escrever, não o
revertí e não vou "arrumá-lo": é do planejador/orquestrador, e apareceu enquanto eu rodava a bateria
— **a terceira mudança de árvore por terceiros durante este mandato** (as outras duas: o commit
`a37a9dd` do outro dev e a derrubada dos containers `o6r07a-prov-*` dele). Registro para que a junta
não leia a diferença entre o §II.4 e a árvore viva como resíduo meu.

**Estado final verificado, e é o que importa para o meu veredito:**

```
$ grep -rn "if (false\|INJECAO" src/modules/auth/
(sem saída)   GREP_EC=1        <- nenhuma reversão viva

$ git diff --numstat -- src/modules/auth/
16	0	anonymous-login.constants.ts
57	1	routes/auth.routes.ts
16	3	services/anonymous-login.service.ts
35	5	services/local-auth-login.service.ts
17	0	services/password.service.ts     <- BYTE A BYTE o mesmo do §II.1/V0.a

$ git diff --check      EC=0
$ git rev-parse HEAD    a37a9dd8b64d0fa7d62cfaf6fc7157d6c95ce3ff
```

---

## §II.5 · Veredito do desenvolvedor

**Os três vermelhos-controle foram refeitos do zero e estão REGISTRADOS — A1, A2 e A3 saem de
`EM APURAÇÃO` para PROVADOS.** Cada um: reversão injetada por substituição exatamente invertível,
sonda medida **VERMELHA** com `ec` e trecho de saída, correção restaurada, restauração **confirmada
por re-execução** (verde) e por varredura de resíduo. **25 casos novos, N=3 com denominador idêntico
3/3, zero flake em 12 execuções, `skipped 0`.** Nenhuma falha nova nasceu: das 4 conhecidas, 3 foram
fechadas **pelo outro dev** e a 4ª segue aberta e é dele.

**Não escrevi uma linha de código de produção** — o V0 mediu as três correções íntegras e o mandato
manda não reescrever o que está de pé.

**Três coisas para a junta decidir, todas declaradas e nenhuma escondida:**
1. **A3 prova por testemunha de efeito, não por espião contador** (§II.2/A3) — divergência de FORMA
   em relação ao §4 linha 6, com o motivo técnico medido.
2. **`tests/auth-login-anonymous-db.test.ts`** foi editado pelo caído: fora do meu mandato nominal,
   **dentro** do §5 do plano (§II.4).
3. **`P-O6R-B07A-RASTRO-ANONIMO-SEM-IP`** ficou registrado como residual dentro da seção autorizada
   de `pendencias.md`, porque o comentário de produção o cita e deixá-lo solto faria o código mentir.

---

## §II.6 · P.S. — uma correção ao `00-quedas.md`, para o registro ficar exato

O `00-quedas.md` diz que do caído *"não sobrou comando nenhum para re-executar barato"*. **Sobrou
saída bruta, não sobrou comando.** Ao limpar o scratchpad da sessão (§C5) encontrei, entre os
arquivos de outros agentes, o que só pode ser dele: `baseline-full-suite.txt`, `red-a1-mem.txt`,
`red-a1-db.txt`, `red-a1-final.txt`, `red-a2-probe.ts` / `red-a2-probe.mts`, `red-a3.txt`,
`green-n1.txt` / `green-n2.txt` / `green-n3.txt`.

**Não usei nenhum deles, e a decisão é deliberada.** São saídas **sem comando registrado, sem head
ao lado e sem atribuição** — exatamente o que o **P3** define como não-insumo ("conclusão sem comando
registrado não é insumo, inclusive parcial favorável"). Refiz os três vermelhos-controle do zero,
que era o mandato, e os números do §II.2 são todos meus.

**Não os apaguei** (não são comprovadamente meus, e o scratchpad é compartilhado com outros agentes
— sem mass-delete). Registro só para que a lição do `00-quedas.md` fique afiada onde ela de fato
morde: **o custo da queda não foi perder o arquivo de saída — foi perder o REGISTRO que transforma
saída em prova.** Os nomes daqueles arquivos sugerem que ele mediu tudo. O P1 existe justamente
porque "ter medido" e "ter provado" não são a mesma coisa.
