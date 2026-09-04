# EVIDÊNCIA — cadeira C2 `jurado-b07a-auth-e-kdf` (junta B-O6R-07a, PR #369)

Identidade nova: não escrevi o plano, não emendei, não desenvolvi, não votei em junta anterior.
Quórum: UNANIMIDADE DE 3. Esta cadeira TEM VETO. Julgo o mérito; **não** proponho correção (§C7.4-bis).

## Terreno medido POR MIM (não herdado de nenhum head citado)

| item | comando | saída |
|---|---|---|
| head | `git rev-parse HEAD` | `fb6618b413bda0a8efd8bbbf1ace38f824761b82` |
| branch | `git rev-parse --abbrev-ref HEAD` | `fix/o6r07a-authorization` |
| delta desde `e9a9caa` | `git diff --name-status e9a9caa HEAD` | 3 arquivos, **todos** `agent-orchestration/omega/juntas/**` (BRIEFING + 2 do inspetor) — **zero código** |

**`head_julgado` = `fb6618b`.** O briefing/errata manda registrar `e9a9caa`; medi e confirmo que o delta
`e9a9caa..fb6618b` é **só registro de junta**, logo todo número de código vale idêntico nos dois. Registro o
head que **eu** medi.

---

## C2-1 — O lockout anônimo REUSA, não reinventa — **EM APURAÇÃO**

- **C2-1.a** — inventário COMPLETO das escritas novas no diff de auth — `EM APURAÇÃO`
- **C2-1.b** — o caminho anônimo chama o MESMO `incrementFailedAttempts` atômico do B01 (ancorado no
  **par de linhas**, não em texto — a linha existe 2×, l.152 direcionado / l.261 anônimo) — `EM APURAÇÃO`
- **C2-1.c** — nenhum contador novo, nenhum read-modify-write novo (busca ativa) — `EM APURAÇÃO`
- **C2-1.d** — a única escrita nova declarada é `INSERT` de auditoria append-only — `EM APURAÇÃO`

## C2-2 — Anti-enumeração do B01 sobreviveu, trade-off e rate-limit — **EM APURAÇÃO**

- **C2-2.a** — 401 uniforme no caminho anônimo: o **423 NUNCA** vaza (por execução) — `EM APURAÇÃO`
- **C2-2.b** — ATAQUE de enumeração: existe combinação (corpo, status, cabeçalho, sequência) que distinga
  conta existente × inexistente, ou travada × não travada? — `EM APURAÇÃO`
- **C2-2.c** — canal lateral de **timing** (custo de KDF / de lock) no caminho anônimo — `EM APURAÇÃO`
- **C2-2.d** — DECISÃO da cadeira sobre o trade-off (armar lockout anônimo × força bruta sem rastro)
  — `EM APURAÇÃO`
- **C2-2.e** — rate-limit por IP: `TokenBucket` EXISTENTE reusado (zero dependência nova), chave = HMAC de
  subchave derivada de `JWT_SECRET`, **429 `RATE_LIMITED`**, cobre as DUAS vias, posição do freio vs. parse
  do corpo (a cadeira de auth afirma UMA rota `POST /login` que se ramifica — confirmar ou derrubar)
  — `EM APURAÇÃO`

## C2-3 — Pino KDF e a divergência de método — **EM APURAÇÃO**

- **C2-3.a** — `parseScryptHash` aceita SÓ N=16384/r=8/p=1; outro trio → `undefined` (por EXECUÇÃO)
  — `EM APURAÇÃO`
- **C2-3.b** — stored com N diferente **não deriva** e vira `invalid_credentials` (por EXECUÇÃO, ponta a
  ponta no serviço de login) — `EM APURAÇÃO`
- **C2-3.c** — DIVERGÊNCIA `D-DIVERGENCIA-B07A-A3-METODO-DA-PROVA`: (a) testemunha de efeito ≥ espião?
  (b) `ERR_CRYPTO_INVALID_SCRYPT_PARAMS` subindo ao login era defeito próprio fechado de brinde?
  (c) emendar o §4 do plano ou exceção nomeada? — `EM APURAÇÃO`
- **C2-3.d** — rotação = `v=2`: mecanismo real ou promessa sem mecanismo? — `EM APURAÇÃO`

---

## Registro das sub-provas (apensado ao final de CADA uma, antes de começar a seguinte)

---

# C2-1 · O lockout anônimo REUSA, não reinventa — **APROVADO** (com achado adjacente em C2-2.d)

Merge-base medido: `git merge-base main HEAD` → `e6a6461`. Todo diff abaixo é contra ele.

## C2-1.a · Inventário COMPLETO das escritas novas — **VERDE**

```
git diff e6a64619 HEAD -- src/ | grep -E "^\+" | grep -viE "^\+\s*//|^\+\s*\*|^\+\+\+" \
  | grep -iE "insert|update|create|\.set\(|consume|record|delete|save|upsert|increment"
```

Saída (só as linhas de código, comentários filtrados) — **3 escritas novas em auth**, e nada mais:

| # | linha adicionada | natureza |
|---|---|---|
| 1 | `loginIpBucket.consume(ipBucketKey, ipBucketNowMs);` (`auth.routes.ts`) | balde in-process, classe EXISTENTE |
| 2 | `await this.credentials.incrementFailedAttempts(credential.id, tenantId);` (`local-auth-login.service.ts` l.261) | **call site** do UPDATE atômico do B01 |
| 3 | `await this.recordLoginFailure(tenantId, email, "invalid_credentials", {}, "without_org");` | INSERT de auditoria |

Controle negativo — **nenhum SQL cru novo**:
```
git diff e6a64619 HEAD -- src/ | grep -E "^\+" | grep -iE '\$executeRaw|\$queryRaw|this\.client\.|prisma\.'
→ VAZIO
```
**Veredito parcial: VERDE.** A única escrita nova de persistência é o INSERT de auditoria, como declarado.

## C2-1.b · O caminho anônimo usa o MESMO increment — **VERDE** (ancorado no PAR DE LINHAS)

A armadilha do mandato é real e foi conferida: a linha é **byte-a-byte idêntica** nos dois sítios.
Ancorei por número de linha + contexto, nunca por texto:

```
grep -n "incrementFailedAttempts" src/modules/auth/services/local-auth-login.service.ts
27:  incrementFailedAttempts(id: string, tenantId: string): Promise<unknown>;   ← declaração da porta
152:      await this.credentials.incrementFailedAttempts(credential.id, tenantId);  ← DIRECIONADO (B01)
216:  // ... comentário
261:      await this.credentials.incrementFailedAttempts(credential.id, tenantId);  ← ANÔNIMO (alvo)
```

`sed -n '140,162p'` mostra o contexto da **l.152** = `verifyPassword(password, ...)` + `auditContext`
(assinatura do caminho direcionado). `sed -n '248,272p'` mostra a **l.261** = `verifyPasswordFn(input.password, ...)`
+ `recordLoginFailure(..., {}, "without_org")` (assinatura do anônimo). São sítios distintos, confirmado.

`git diff` prova que **só a l.261 é nova**: o hunk `@@ -236,6 +256,11 @@` adiciona 5 linhas; a l.152 **não
aparece no diff**, ou seja, o caminho direcionado do B01 ficou **intocado**.

## C2-1.c · Nenhum contador novo, nenhum read-modify-write novo — **VERDE**

A implementação chamada é UMA só (`local-auth-credential.repository.ts:111`), **não tocada por este bloco**:

```sql
UPDATE local_auth_credentials
SET failed_attempts = failed_attempts + 1,
    locked_until = CASE WHEN failed_attempts + 1 >= 5 THEN now() + make_interval(mins => 15)
                        ELSE locked_until END
WHERE id = $1::uuid AND tenant_id = $2::uuid
```
Statement único, incremento relativo à coluna — **sem read-modify-write**. Nenhum campo/contador novo
(§3.10 do plano: zero migration em auth — conferido: o único `prisma/migrations/**` do diff é o de RBAC).

Sub-ataque próprio (não pedido no mandato, feito por dever da cadeira): o `TokenBucket` faz
`wouldAllow()` **e depois** `consume()` — check-then-act, que seria corrida se houvesse `await` entre eles.
`cat src/modules/portal-shared/token-bucket.ts`: **ambos são SÍNCRONOS** (`wouldAllow(): boolean`,
`consume(): void`), e em `auth.routes.ts` não há `await` entre as duas chamadas → sem ponto de
interleaving no event loop. `refill` é chamado 2× com o **mesmo `nowMs`**, então o segundo tem
`elapsed = 0` e não repõe em dobro. **Não é read-modify-write novo; é a classe existente usada como é.**

## C2-1.d · A escrita nova é INSERT append-only — **VERDE**

`recordLoginFailure` → `EnterpriseAuditLogService.record` → `src/modules/core-saas/audit/audit-log.service.ts`.
`grep -n "create\|update\|delete"` nesse arquivo: o único caminho de escrita é `this.auditLogs.create({...})`
(l.41). Sem `update`, sem `delete`. **Append-only confirmado.** O parâmetro novo `loginMode?: "without_org"`
entra no `metadata` sob spread condicional; a allowlist não ganha campo sensível (só `email`, `reason`,
`loginMode`) — **sem token/path/bucket/base64/tenant_id externo**.

### **VEREDITO C2-1: APROVADO.** O reuso é o que o §3.4 exigiu, e nada foi reinventado.

> **Porém** — a mecânica está certa, mas o **sítio** onde ela foi plugada produz um efeito que o plano
> não declarou. Isso NÃO é falha de C2-1 (o reuso é fiel); é o trade-off de C2-2.d, e vai medido lá.

---

# C2-2 · Anti-enumeração, trade-off e rate-limit — **REPROVADO** (achado `C2-A1`, `bloqueia`)

Sonda própria, descartável, escrita FORA de `tests/` (`.tmp-c2-probe/`, removida ao final — §C5) e
executada com `npx tsx`. Razão de existir: o arnês do bloco (`tests/o6r07a-anon-lockout.test.ts`) é
**mono-organização** — `listCandidates` devolve **1** candidato (l.291 do arquivo). O caminho anônimo
existe justamente para o e-mail que vive em **N** organizações, e essa forma **não é exercida por nenhum
teste do PR**.

## C2-2.a · 401 uniforme: o 423 não vaza — **VERDE**

```
=== SONDA 4 · o 423 vaza no caminho anonimo? conta em LOCK x conta INEXISTENTE ===
conta em LOCK   -> {"kind":"invalid"}
conta INEXIST.  -> {"kind":"invalid"}
>>> INDISTINGUIVEIS no corpo: 401 uniforme preservado, 423 nao vaza.
mutacoes durante o lock: [] (lock nao e combustivel)
```

Confirmado também no código: `verifyAnonymousCandidate` devolve `reason: "locked"` e
`AnonymousLoginService.attempt` o achata em `{kind:"invalid"}` (l.183-186). E o candidato **em lock não
incrementa** — o lock não se auto-alimenta. **VERDE.**

## C2-2.b · ATAQUE de enumeração — **VERDE quanto à RESPOSTA**

Vetores atacados e resultado:

| vetor | resultado |
|---|---|
| corpo/status: existente-com-senha-errada x inexistente | idênticos (`{kind:"invalid"}` → 401) |
| corpo/status: travada x não travada | idênticos (sonda 4) |
| `429 RATE_LIMITED` novo por IP | fala do **volume da origem**, não da conta — sem oráculo |
| `400 TENANT_ID_REQUIRED` (e-mail em >3 orgs) | **PRÉ-EXISTENTE**, resíduo declarado do B01 em `anonymous-login.service.ts:159-161`; a linha **não está no diff** deste PR |
| `409` com nomes de organização | só em **sucesso** (senha correta em >1 org) — não é oráculo |

Nenhuma via NOVA de enumeração pela resposta. **VERDE.**

## C2-2.c · Canal lateral de timing — **NOTA (não reprova)**

Medido por mim (`.tmp-c2-probe/probe-timing.ts`):

```
custo MEDIDO de 1 scrypt (N=16384,r=8,p=1), media de 10: 39.8 ms
piso de latencia ANONIMO: 400 ms
pior caso (3 candidatos): 119.4 ms  ->  folga do piso: 280.6 ms
```

O bloco acrescenta, **só no ramo "e-mail existe e a senha errou"**, `2xN` idas ao banco (N UPDATE +
N INSERT). Com N=3 e a folga de 280 ms, o piso do `settle` continua equalizando em condição normal.
**Declaro o que NÃO medi:** não medi o tempo real de ida-e-volta ao Postgres sob carga; sob banco lento
essa folga é o que separa o piso de virar oráculo. Registro como **nota**, não como achado: o piso
sobrevive à medição que consegui fazer.

## C2-2.e · Rate-limit por IP — **VERDE em todos os pontos**

| exigência do §3.5 | medição | veredito |
|---|---|---|
| `TokenBucket` EXISTENTE, zero dependência nova | import de `../../portal-shared/token-bucket.js`; `package.json` **não está no diff** | VERDE |
| chave = HMAC de subchave derivada de `JWT_SECRET` | `loginIpBucketKey`: HMAC(HMAC(secret, "login-ip-bucket-v1"), ip normalizado) — rótulo de domínio próprio, IP nunca em claro | VERDE |
| `429 RATE_LIMITED` | `response.status(429).json({error:{code:"RATE_LIMITED"...}})` | VERDE |
| cobre as DUAS vias | **CONFIRMO a cadeira de auth e derrubo a redação do §3.5**: as rotas do router são `/login` · `/refresh` · `/active-tenant` · `/logout`. Existe **UMA** `POST /login` (l.120) que se ramifica em `if (!resolvedTenantId)`. O freio está no topo do handler, **antes** do ramo → cobre as duas por construção | VERDE |
| freio antes do parse do corpo | `wouldAllow`/`consume` nas l.128-140; `parseLoginRequestBody` na l.141 — **depois** | VERDE |

O plano dizia "aplicado às DUAS **rotas** de login"; **rota é uma só**. A implementação está certa e o
plano é que estava impreciso — não é achado contra o código.

---

## C2-2.d · O TRADE-OFF, e o que a medição fez com ele — **ACHADO `C2-A1`, gravidade `bloqueia`**

### O que EU medi (execução, `.tmp-c2-probe/probe-multiorg.ts`)

`AnonymousLoginService.attempt` percorre **TODOS** os candidatos **sem curto-circuito no sucesso**
(l.166-183: laço `for (const candidate of candidates)` que apenas empilha em `successes`). O incremento
novo do §3.4 foi plugado **dentro** de `verifyAnonymousCandidate`, logo **herda esse leque**.

**SONDA 1 — um login BEM-SUCEDIDO custa à organização irmã:**

```
desfecho: success
mutacoes: [ 'increment:cred-B:tenant-B', 'markSuccess:cred-A:tenant-A' ]
Org A failed_attempts = 0
Org B failed_attempts = 1
>>> CONFIRMADO: 1 login de SUCESSO incrementou o contador da organizacao IRMA.
```

**SONDA 2 — cinco logins CORRETOS trancam a conta do próprio dono noutra organização:**

```
  login #1: success | A.fa=0 | B.fa=1 | B.locked=nao
  login #2: success | A.fa=0 | B.fa=2 | B.locked=nao
  login #3: success | A.fa=0 | B.fa=3 | B.locked=nao
  login #4: success | A.fa=0 | B.fa=4 | B.locked=nao
  login #5: success | A.fa=0 | B.fa=5 | B.locked=SIM
login DIRETO na Org B com a senha CORRETA: {"ok":false,"reason":"locked"}
```

**SONDA 3 — amplificação xN e trancamento de TODAS as organizações sem conhecer nenhuma:**

```
mutacoes de UMA tentativa anonima com senha errada: [ 'increment:cred-A:tenant-A', 'increment:cred-B:tenant-B' ]
>>> fator de amplificacao = N organizacoes por requisicao (teto MAX_LOGIN_CANDIDATES=3)
apos 5 requisicoes anonimas: A.locked=SIM | B.locked=SIM
```

**AUDITORIA — re-medida para não superdeclarar** (`.tmp-c2-probe/probe-audit.ts`); um login
**bem-sucedido** grava duas linhas:

```
tenant=tenant-B  action=auth.login.failed   metadata={... "reason":"invalid_credentials","loginMode":"without_org"}
tenant=tenant-A  action=auth.login.success  metadata={...}
```

Ou seja: **toda entrada correta do usuário gera um registro de FALHA DE LOGIN contra a organização
irmã.** O rastro que o §3.4 vendeu como mitigação passa a produzir falso positivo em cada login legítimo.
(Corrigi aqui minha própria contagem: a primeira sonda só dizia "2 linhas"; re-medi para nomear as ações,
porque "2 linhas de falha" teria sido exagero meu.)

### Por que isto é `dentro-do-bloco`, com evidência de origem

O comentário que este PR **removeu** dizia, textualmente, que a via anônima era "SEM efeito colateral:
falha anônima não incrementa contador de candidato nem audita em N organizações (§6.4.3)". O
comportamento nasce da linha adicionada no hunk `@@ -236,6 +256,11 @@` de
`local-auth-login.service.ts` — **está no diff deste PR** (`git diff e6a64619 HEAD`). Antes do bloco o
efeito era **impossível**. Origem: **este bloco**.

### A DECISÃO DA CADEIRA sobre o trade-off (é o que a ata precisa)

**Ratifico ARMAR o lockout na via anônima. Reprovo ESTE ARRANJO.** Em duas partes, para não serem
confundidas:

1. **A direção está certa e eu a aprovo.** A alternativa — não armar — mantém força bruta ilimitada e
   sem rastro, que é literalmente o achado `Ω6R-SEC-003`. O custo de armar (negação de acesso por 15 min
   a quem sabe o e-mail) é aceitável frente a isso, e as mitigações citadas (TTL de 15 min, balde por
   e-mail, balde por IP novo, rastro) são reais para **esse** vetor. Se a única pergunta fosse "armar ou
   não", meu voto seria **armar**.

2. **O arranjo entregue não é o trade-off que me foi apresentado.** O §3.4 descreveu um custo
   **atacante-dirigido e por conta**: "quem souber o e-mail tranca a conta por 15 min". A medição mostra
   **outros dois custos, nenhum declarado**:

   - **(i) Negação de acesso AUTOINFLIGIDA pelo uso CORRETO.** O dono da conta, com o mesmo e-mail em
     duas organizações e senhas distintas — que é exatamente o cenário para o qual esta funcionalidade
     inteira existe (`MAX_LOGIN_CANDIDATES=3`, `409 TENANT_SELECTION_REQUIRED`) —, **tranca a si mesmo**
     na segunda organização ao logar corretamente 5x na primeira. **Nenhuma** das mitigações declaradas
     alcança este caso: a vítima não estoura balde nenhum, ela **acerta a senha**. E o sucesso só zera o
     contador do vencedor (`finalizeAnonymousLogin` → `markSuccessfulLogin(credentialId, tenantId)`,
     l.302), então o contador da irmã **é monotônico** por esta via.
   - **(ii) Amplificação xN do vetor do atacante.** 1 requisição = N incrementos + N linhas de
     auditoria; **5 requisições trancam a conta em TODAS as organizações de uma vez, sem o atacante
     conhecer nenhuma delas.** Pela via direcionada isso exigiria conhecer cada organização e fazer
     5xN requisições. É **capacidade nova**, não mera redução de custo.

   O §3.4 diz que a decisão é da junta "com o trade-off à vista". **O trade-off à vista estava
   incompleto por medição**, e uma cadeira não pode ratificar o que não lhe foi mostrado. Some-se a
   isso o defeito de auditoria (falha registrada em cada sucesso), e o quórum deste bloco —
   unanimidade de 3 por tocar **segurança e permissão** — não admite ratificação.

**Não proponho correção (§C7.4-bis).** Reporto o defeito, a evidência executada e o motivo.

### **VEREDITO C2-2: REPROVADO.** `C2-A1`, `bloqueia`, `dentro-do-bloco`.

---

# C2-3 · Pino KDF e a divergência de método — **APROVADO** (1 achado `baixa` `pre-existente`)

Sonda `.tmp-c2-probe/probe-kdf.ts`, executada com `npx tsx`. Ela **forja** stored hashes no formato exato
da casa com o trio de custo que eu escolho, e mede.

## C2-3.a · O pino, provado por EXECUÇÃO — **VERDE**

```
  canonico N=16384 r=8 p=1  -> verify=true  tempo=49.08ms  (scrypt RODOU, como deve)
  N=32768 (valido, mais CARO)    -> verify=false tempo=   0.09ms  | par senha/hash valido? true
  N=8192  (valido, mais BARATO)  -> verify=false tempo=   0.23ms  | par senha/hash valido? true
  N=2     (DOWNGRADE extremo)    -> verify=false tempo=   0.04ms  | par senha/hash valido? true
  r=4     (r fora do pino)       -> verify=false tempo=   0.12ms  | par senha/hash valido? true
  p=2     (p fora do pino)       -> verify=false tempo=   0.40ms  | par senha/hash valido? true
```

**Meu próprio vermelho-controle está embutido na coluna `par senha/hash valido? true`**: para cada trio
forjado eu re-derivei com aquele trio e confirmei que o par senha↔hash **casa**. Ou seja, sem o pino esses
stored **autenticariam**. A recusa é obra do pino, não de forja malfeita. Cobertura completa do trio:
N acima, N abaixo, N absurdo, `r` e `p` — nenhum passa.

## C2-3.a-bis · "SEM rodar scrypt", provado sem alargar nada — **VERDE**

```
  N=4194304 -> verify=false tempo=0.26ms — SEM excecao (recusa limpa)
  controle: scrypt DIRETO com N=4194304 LANCA -> Invalid scrypt params: error:030000AC:...memory limit exceeded
  => logo, 'sem excecao' acima so pode significar que scrypt NAO FOI CHAMADO.
```

Este é um **silogismo fechado por medição**, não uma inferência: chamar scrypt com esse N **lança**
(provado pelo controle direto); o `verifyPassword` **não lançou**; logo scrypt **não foi chamado**.

## C2-3.b · Ponta a ponta no SERVIÇO de login — **VERDE**

```
  stored forjado com N=2 + senha CORRETA ->  {"ok":false,"reason":"invalid_credentials"}
  >>> o downgrade NAO autentica no servico de login.
```
Não é só a função pura: o defeito morre na porta que o produto usa.

---

## C2-3.c · A DIVERGÊNCIA `D-DIVERGENCIA-B07A-A3-METODO-DA-PROVA` — **VALIDADA, com reparo na justificativa**

### (a) A testemunha de efeito é ≥ o espião, ou há caminho que só o contador pegaria?

**Há um caminho que a testemunha COMO ENTREGUE não pega — e eu fechei esse caminho de fora, sem alargar
uma linha de produção.**

O caminho: uma implementação que **derive primeiro e pine depois**, com um N **válido e abaixo do
maxmem** (ex.: 32768). O valor de retorno seria `false` de qualquer jeito e **nenhuma exceção** ocorreria,
então uma testemunha que olhe **só o retorno** aprova um código que rodou scrypt com parâmetro escolhido
pelo atacante. Só o contador veria a derivação. Neste ponto a divergência tinha um buraco real.

**Mas a premissa da divergência — "o espião exigiria alargar `password.service.ts`" — é FALSA, e eu provo
derrubando-a:** montei um espião **do lado de fora**, com o relógio, em ~30 linhas e **zero** alteração de
produção. A razão medida é inequívoca:

| caminho | tempo | leitura |
|---|---|---|
| canônico (scrypt roda) | **49,08 ms** | referência |
| todo trio fora do pino | **0,04 – 0,40 ms** | **~120× a ~1200× mais barato** |

Não há regime em que uma derivação scrypt(N≥8192) se esconda dentro de 0,4 ms. O relógio decide o mesmo
bit que o contador decidiria, **e decide para o caso N=32768** — exatamente o buraco acima (medido:
0,09 ms, quando derivar custaria ~98 ms).

**Veredito de (a): VALIDADA.** A decisão de não alargar `password.service.ts` estava **certa** — alargar a
primitiva de senha só para o arnês é a classe do `SAN2-4b`, que este bloco existe para não repetir. O que
estava errado era a **razão dada**: não era "espião impossível sem alargar", era "espião desnecessário
por dentro". A ata deve registrar a decisão validada **e** a correção da razão, porque a razão errada, se
virar precedente, autoriza abandonar espião em caso onde nenhuma testemunha externa exista.

### (b) O `ERR_CRYPTO_INVALID_SCRYPT_PARAMS` era defeito PRÓPRIO, fechado de brinde?

**Sim, e merece número e nota próprios.** É defeito de **classe distinta** do downgrade:

- **Downgrade** (`N=2` autentica) = falha de **autenticação/integridade** — quem escreve a coluna escolhe
  o custo do KDF.
- **`ERR_CRYPTO_INVALID_SCRYPT_PARAMS`** = falha de **disponibilidade e forma de erro** — `verifyPassword`
  chama `deriveScryptHash` na l.45 **sem `try/catch`**; a promessa rejeita e a exceção sobe por
  `authenticateLocalCredential` até a rota, virando **500 numa rota de login não autenticada**. Confirmei
  a mecânica da exceção por controle direto (saída acima). São dois achados, não um.

**E uma ressalva que a junta deve ouvir:** o 500 foi fechado **por consequência**, não por defesa própria.
A l.45 continua **sem `try/catch`**. A blindagem hoje é *só* o pino; qualquer relaxamento futuro do parse
(ou uma segunda via que chame `deriveScryptHash` com dado armazenado) **reabre o 500**. Registro isto como
observação medida — a correção é de quem planeja, não minha (§C7.4-bis).

### (c) Emendar o §4 do plano, ou exceção nomeada?

**EMENDAR o §4 — e não como exceção.** Razão: o §4 prescreve um **MECANISMO** ("espião de scrypt (contador
de derivações)") onde deveria exigir uma **PROPRIEDADE** ("provar que a derivação NÃO ocorreu"). Prescrever
mecanismo foi o que gerou a pressão para abrir uma costura dentro da primitiva de senha — ou seja, o §4
empurrava o dev na direção do próprio defeito que o bloco fecha. Isso vai se repetir em toda primitiva
criptográfica, então tratar como exceção nomeada só adia.

Emenda que eu ratificaria, com a trava que a torna honesta: **§4 exige a propriedade, e admite qualquer
testemunha que a decida — contador, exceção distintiva ou relógio — DESDE QUE a evidência publique a
MARGEM medida** (aqui: 49,08 ms × 0,04–0,40 ms, ≥120×) **ou o controle distintivo** (aqui: scrypt direto
com N=2^22 lança). **Testemunha sem margem publicada não é testemunha** — é a mesma "prova por ficou
verde" que a regra-mãe do §4 proíbe.

---

## C2-3.d · Rotação = `v=2`: **promessa sem mecanismo** — achado `C2-A2`, `baixa`, `pre-existente`

```
  verify de um stored v=2 com a senha correta -> false
  (parseScryptHash rejeita version !== 'v=1' na l.99 — v=1 e v=2 nao coexistem)
```

E não existe caminho de re-hash:
```
grep -rniE "rehash|needsRehash|upgradeHash" src/ --include=*.ts   →  ZERO ocorrências
```
(`password_algorithm` existe como coluna, mas **nunca é lido para decidir re-hash** — só é gravado.)

**Consequência medida:** subir `SCRYPT_VERSION` para 2 faz `parseScryptHash` rejeitar **100% dos stored
`v=1` existentes** na l.99 → **todos os usuários deixam de entrar**. Não há tabela de versões coexistentes
nem re-hash no login bem-sucedido. Logo o comentário novo ("Rotacionar o custo exige uma VERSÃO NOVA do
formato (v=2)") é **verdadeiro como enunciado de requisito** e **inexequível como plano**: hoje a rotação
não é uma migração, é um apagão.

**Escopo: `pre-existente`, com evidência de origem.** O parser de versão única é anterior ao bloco: o diff
de `password.service.ts` tem **um único hunk, `@@ -119,6 +119,23 @@`**, e a l.99 (`version !== \`v=${SCRYPT_VERSION}\``)
**não é tocada**. O bloco apenas *nomeou* a rotação num comentário; não criou a limitação. Por
`D-JUNTA-ESCOPO-E-CALIBRACAO`, **não reprova** — vira pendência nomeada com bloco dono.

### **VEREDITO C2-3: APROVADO.** O pino faz o que o §3.6 prometeu, provado por execução e por espião de tempo.

---

# FECHAMENTO — o head MOVEU sob mim durante o trabalho (medido, não herdado)

Abri o trabalho em `fb6618b` e fechei medindo de novo, por disciplina. O head **mudou**:

```
git rev-parse HEAD                 →  abb0cbd21d542e12470201af876abe5e1c986582
git log --oneline fb6618b..abb0cbd →  abb0cbd docs(junta): C1 REPROVA o 07a — o P0 e declarado
                                       fechado enquanto o tecnico apaga anexo alheio; C3 aprova
git diff --name-status fb6618b abb0cbd
  A  votos/O6R-07a/01-autorizacao-alcada-evidencia.md
  A  votos/O6R-07a/01-autorizacao-alcada-voto.json
  A  votos/O6R-07a/03-migracao-escopo-registro-evidencia.md
  A  votos/O6R-07a/03-migracao-escopo-registro-voto.json
git diff --name-only fb6618b abb0cbd -- src/ tests/ prisma/   →  VAZIO
```

**Zero código.** São os registros de voto das cadeiras C1 e C3, commitados pelo orquestrador enquanto eu
media. Todas as minhas medições foram tomadas contra `fb6618b` e valem **idênticas** em `abb0cbd`, porque
nenhum arquivo de `src/`, `tests/` ou `prisma/` difere entre os dois. Registro os dois heads para que a ata
não precise adivinhar qual eu julguei.

## VEREDITO DA CADEIRA C2: **REPROVADO**

| item | veredito |
|---|---|
| **C2-1** lockout reusa, não reinventa | **APROVADO** |
| **C2-2** anti-enumeração, trade-off e rate-limit | **REPROVADO** — `C2-A1`, `bloqueia`, `dentro-do-bloco` |
| **C2-3** pino KDF e divergência de método | **APROVADO** (divergência **VALIDADA** com reparo na justificativa) |

Achados: `C2-A1` **bloqueia** (dentro-do-bloco) · `C2-A2` baixa (**pre-existente**, não reprova) ·
`C2-A3` nota · `C2-A4` nota. Detalhe e comandos no `02-auth-kdf-voto.json`.

## Limpeza (§C5), em 1 linha

Removi `.tmp-c2-probe/` (4 sondas `.ts` + 2 arquivos-parte `.md`) — confirmado por `git status --porcelain`,
que lista **apenas** os meus dois artefatos de voto como untracked. **Não** subi cluster nem container (todo
o ataque foi em memória, como fez a C1), **não** criei worktree, **não** escrevi na árvore principal, **não**
commitei nada.
