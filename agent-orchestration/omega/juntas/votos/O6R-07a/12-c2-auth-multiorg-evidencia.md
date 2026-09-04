# EVIDÊNCIA — cadeira C2-v2 (junta B-O6R-07a, CICLO 2, PR #369)

## SUCESSÃO — quem escreveu o quê neste arquivo (P1/P3)

**Autora A — `jurado-b07a-c2-auth-multiorg`** (queda #6, `rate_limit`/teto de sessão, lendo o arnês
multiorg). É dela, VERBATIM e preservado: o cabeçalho abaixo, a seção "Terreno medido POR MIM" **dela**
e o esqueleto J1 (6 sub-provas) / J2 (6) / J3 (3), todos `EM APURAÇÃO`. Nada do texto dela foi
reescrito, encurtado ou movido.

**Autora B — `jurado-b07a-c2-auth-multiorg-s`** (eu, identidade NOVA; substituo a caída). É meu tudo o
que estiver marcado **`[S]`**. **Não herdo medição nenhuma dela** — o esqueleto tem estrutura, não
prova; e pelo P3 conclusão sem comando registrado não é insumo. **Re-meço o terreno inteiro por mim**,
inclusive head e portas. Julgo o mérito; não proponho correção (§C7.4-bis).

---

# (cabeçalho da autora A, preservado verbatim)

# EVIDÊNCIA — cadeira C2-v2 `jurado-b07a-c2-auth-multiorg` (junta B-O6R-07a, CICLO 2, PR #369)

Identidade NOVA: não sou o C2 do ciclo 1, não planejei, não desenvolvi, não votei em nada.
Quórum: UNANIMIDADE DE 3. Esta cadeira TEM VETO. **CICLO-TETO** (`D-TETO-DOIS-CICLOS`): reprovação
aqui = o bloco PARA. Julgo o mérito; **não** proponho correção (§C7.4-bis).

## Terreno medido POR MIM

- `head_julgado` = **`9989c62a3b81468dee6dd39fae3da6246e0e6fb1`** (`git rev-parse HEAD`; == esperado
  do briefing). Correção do ciclo 2 COMMITADA neste head (delta `9d44989..9989c62` = os 10 arquivos
  de código/teste + registros); logo **`9d44989` é o código pré-correção** — é lá que o contraste
  vermelho se re-executa.
- portas/containers ANTES (`docker ps` + `netsh ... excludedportrange`, medidos por mim, não herdados
  do R3 — que já estava defasado, como o próprio R3 previu): de pé AGORA — `erp-postgres` **5432** ·
  `erp-redis` **6379** (base viva, nem leitura) · `jur-c5-arnes-pg-bat` **32783** ·
  `jur-c5-arnes-red-bat` **32784** (cadeiras do c5 votando AGORA — intocáveis; nota: R3 citava
  15501/15502 e 32779–32782, a fotografia moveu DE NOVO). Faixas excluídas: 2869 · 5357 ·
  49698–49997 · 50000–50059 · 50160–50559 · 53295–53494 · 54183–54382 · 54517–54616 · 54893–55092 ·
  60413–61012. **Porta escolhida para o MEU cluster: 15631** (fora de tudo; nunca 55432).

---

## J1 — As 4 propriedades do C2·3, por EXECUÇÃO (aceite C2·6 item 1) — **EM APURAÇÃO**

- **J1.1** — sonda-regressão 1 do antecessor (ataque anônimo sustentado ARMA lockout e deixa rastro
  — propriedade 1 / M4) — `EM APURAÇÃO`
- **J1.2** — sonda-regressão 2 do antecessor (5 logins CORRETOS na org A NÃO trancam o dono na org
  B — propriedade 2 / M1, a sonda que reprovou o ciclo 1) — `EM APURAÇÃO`
- **J1.3** — sonda-regressão 3 do antecessor (1 requisição ≠ N incrementos: soma entre orgs = 1,
  auditoria = 1 com ip/userAgent — propriedade 3 / M3) — `EM APURAÇÃO`
- **J1.4** — sucesso não fabrica `auth.login.failed` (propriedade 4 / M2) + sonda 4 do antecessor:
  lock × inexistente INDISTINGUÍVEIS, 423 nunca vaza (M5, invariante C2-2.a do B01) — `EM APURAÇÃO`
- **J1.5** — `tests/o6r07a-anon-lockout-multiorg.test.ts` N=3 denominador idêntico + CONTRASTE dos
  vermelhos re-executado por mim (pré-correção `9d44989`: M1 `5!==0` · M2 `1!==0` · M3 `2!==1`;
  base `f895dd2`: M4 `0!==5`) — `EM APURAÇÃO`
- **J1.6** — caso `-db` multi-org pela fiação REAL (`auth-runtime.ts`/`withTenantRls`), cluster
  descartável MEU, N=3 — `EM APURAÇÃO`

## J2 — Inventário das escritas do diff de auth — **EM APURAÇÃO**

- **J2.a** — cobrança é ato único: ramo `successes.length === 0`, DEPOIS do laço, ANTES do
  `settle`; `verifyAnonymousCandidate` sem efeito colateral — `EM APURAÇÃO`
- **J2.b** — cobra EXATAMENTE UM candidato (menor `failed_attempts`, sort estável); nunca em lock,
  nunca inexistente — `EM APURAÇÃO`
- **J2.c** — MESMO `incrementFailedAttempts` do B01 (repositório intocado) + MESMO
  `recordLoginFailure`, allowlist com `ipAddress`/`userAgent` e NADA além — `EM APURAÇÃO`
- **J2.d** — `auth-runtime.ts`: SÓ o espelho `withTenantRls` (7 linhas, zero remoção) — `EM APURAÇÃO`
- **J2.e** — `registerFailure` dep opcional (`?`): fail-open silencioso? Re-contagem dos sítios de
  construção + julgamento de gravidade — `EM APURAÇÃO`
- **J2.f** — resposta anônima segue achatada (`{kind:"invalid"}`); o dado de cobrança NUNCA
  serializa — `EM APURAÇÃO`

## J3 — Reparo A3 e §4 emendado (aceite C2·6 item 4) — **EM APURAÇÃO**

- **J3.a** — append em `pendencias.md` sob `D-DIVERGENCIA-B07A-A3-METODO-DA-PROVA`: razão FALSA
  registrada com a MARGEM publicada (49,08 ms × 0,04–0,40 ms, ≥120×) — `EM APURAÇÃO`
- **J3.b** — errata E-b emenda o §4 para PROPRIEDADE com margem publicada, não mecanismo — `EM APURAÇÃO`
- **J3.c** — texto × evidência do antecessor (leitura, rotulada como leitura) — `EM APURAÇÃO`

---

## Registro das sub-provas (apensado ao final de CADA uma, antes de começar a seguinte)

---

# `[S]` TERRENO RE-MEDIDO POR MIM (autora B — nada herdado da autora A nem do R3)

- `git rev-parse HEAD` (em `.claude/worktrees/b07`) → **`9989c62a3b81468dee6dd39fae3da6246e0e6fb1`**
  = **`head_julgado`**. Bate com o esperado do briefing. Branch: `fix/o6r07a-authorization`.
- `git status --porcelain` → ` M 00-quedas.md` + 4 `??` (00b-inspetor-c2-evidencia/parecer,
  11-c2-autorizacao-evidencia, 12-c2-auth-multiorg-evidencia). **Zero mutação em `src/`, `tests/`,
  `prisma/`** — a correção do ciclo 2 está COMMITADA no head (delta `9d44989..9989c62`), logo
  **`9d44989` é o código pré-correção** e é lá que o contraste vermelho se re-executa.
- `docker ps` (medido por mim, ANTES de subir qualquer coisa): `erp-postgres` **5432** ·
  `erp-redis` **6379** (base viva — nem leitura) · `jur-c5-arnes-pg-bat` **32783** ·
  `jur-c5-arnes-red-bat` **32784** (junta do ciclo 5, votando agora — INTOCÁVEIS).
  **Confirma o R3 e a nota da autora A: a fotografia moveu de novo** (o R3 citava 15501/15502 e
  32779–32782; hoje são 32783/32784). Herdar porta seria erro.
- `netsh interface ipv4 show excludedportrange protocol=tcp` → faixas excluídas: 2869 · 5357 ·
  49698–49997 · 50000–50059 · 50160–50559 · 53295–53494 · 54183–54382 · 54517–54616 · 54893–55092 ·
  60413–61012. **Porta escolhida para o MEU cluster: 15831/15832** (fora de todas; nunca 55432).
- `git worktree list`: 6 árvores. `jur-c5-arnes` aparece **`prunable`** — **NÃO podei** (é do ciclo 5,
  intocável, e `prune` é vedado pelo meu terreno). Criei a MINHA: `../jur-c2v2-red`, detached em
  `9d44989` (head conferido `9d4498998dc3d3c678af440bf90f68971eb6b1ac`), com **`npm ci` próprio**,
  **zero junction/symlink de `node_modules`** (o diretório não existia antes do `npm ci`).
- Diff julgado (`git diff --numstat 9d44989 9989c62`): 22 arquivos. O recorte de auth é
  `auth-runtime.ts` **7/0** · `auth.routes.ts` **3/0** · `anonymous-login.service.ts` **39/0** ·
  `local-auth-login.service.ts` **56/27**.

---

# `[S]` J1 — as 4 propriedades do C2·3, POR EXECUÇÃO

## `[S]` J1.1–J1.4 · VERDE no head julgado, N=3 — **CONFERE**

- comando (3×), no worktree julgado, head `9989c62`:
  `node --test --import tsx tests/o6r07a-anon-lockout-multiorg.test.ts`
- **RUN 1/2/3 idênticos: `# tests 5` · `# pass 5` · `# fail 0` · `# skipped 0`**; `ec` medido em
  execução própria sem pipe (`echo $?` direto): **`ec=0`**.
- os 5 `ok` transcritos por linha do TAP (`grep -n "^ok \|^not ok "`):
  - `ok 1 - M1 — 5 logins anônimos CORRETOS na org A não trancam a org B; o login direto na B segue entrando`
  - `ok 2 - M2 — 1 login anônimo bem-sucedido fabrica ZERO linha auth.login.failed (em qualquer organização)`
  - `ok 3 - M3 — 1 requisição anônima com senha errada = 1 incremento + 1 linha de auditoria, com ipAddress/userAgent`
  - `ok 4 - M4 — ataque anônimo sustentado tranca as DUAS organizações (armar preservado) e deixa rastro linha a linha`
  - `ok 5 - M5 — conta em lock × conta inexistente: respostas indistinguíveis (401 uniforme; 423 nunca vaza) [regressão C2-2.a]`
- mapa mandato → caso: propriedade 1 (força bruta ainda arma + rastro) = **M4** · propriedade 2 (uso
  correto nunca tranca o dono; a sonda 2 que REPROVOU o ciclo 1) = **M1** · propriedade 3 (1
  requisição ≠ N incrementos) = **M3** · propriedade 4 (sucesso não fabrica `auth.login.failed`) =
  **M2** · invariante C2-2.a do B01 (M5, regressão declarada, sem vermelho próprio).
- **Verde-cego é o risco desta sub-prova e por isso ela NÃO fecha aqui** — só o contraste do J1.5
  (mesmo arquivo, mesmo denominador, código pré-correção) prova que o verde corresponde ao vermelho.

## `[S]` J1.5 · CONTRASTE — o verde de hoje corresponde ao vermelho do diário — **CONFERE**

Terreno: worktree **meu**, `../jur-c2v2-red`, `npm ci` próprio (`ec=0`), zero junction/symlink.
Arquivo de teste copiado da árvore julgada com **identidade provada** (`md5sum` idêntico nos dois
lados: `0e9706fb7786b875bd981a627a13d994`) — não é "uma cópia parecida", é o MESMO arquivo.

**(a) Pré-correção — head `9d4498998dc3d3c678af440bf90f68971eb6b1ac`** (conferido por
`git rev-parse HEAD` dentro do worktree descartável):
- comando: `node --test --import tsx tests/o6r07a-anon-lockout-multiorg.test.ts` → **`ec=1`**
- `# tests 5` · `# pass 2` · `# fail 3` · `# skipped 0`
- `not ok 1 - M1 …` → `expected: 0` / `actual: 5` · `operator: 'strictEqual'` → **`5 !== 0`**
- `not ok 2 - M2 …` → `expected: 0` / `actual: 1` → **`1 !== 0`**
- `not ok 3 - M3 …` → `expected: 1` / `actual: 2` → **`2 !== 1`**
- `ok 4 - M4` e `ok 5 - M5` verdes.
- **BATE LINHA A LINHA com os vermelhos gravados no diário do dev** (D1.a `5!==0` · D1.b `1!==0` ·
  D1.c `2!==1`, placar `pass 2/fail 3`). Re-executado por MIM, não herdado.

**(b) Base — `f895dd25f0d8cd5fb6b7c18373245e43f968fcd9`** (mesmo worktree descartável, levado à base
por `git checkout --detach` DENTRO dele — nunca na árvore julgada; `node_modules` reaproveitado do
mesmo `npm ci` porque medi `git diff --numstat 9d44989 f895dd2 -- package-lock.json package.json` =
**VAZIO**; é o diretório físico do próprio worktree, não junction):
- comando idem → **`ec=1`** · `# tests 5` · `# pass 3` · `# fail 2` · `# skipped 0`
- `not ok 4 - M4 …` → `expected: 5` / `actual: 0` → **`0 !== 5`** — o contador PARADO do
  `Ω6R-SEC-003`, reproduzido por mim.
- `not ok 3 - M3 …` → `expected: 1` / `actual: 0` → **`0 !== 1`**.

**O que este contraste PROVA, e é o motivo de eu não aceitar o verde sozinho:** os mesmos 5 casos,
**denominador `# tests 5` idêntico nas TRÊS medições** (base 3/2 · pré-correção 2/3 · pós-correção
5/0), e o M3 falha com **formas OPOSTAS** nas duas pontas — `0 !== 1` na base (não se incrementa
nada) contra `2 !== 1` no pré-correção (incrementa por candidato). Sonda que só passasse por não
exercer o caminho não teria como falhar dos DOIS lados com sinais invertidos. **Não é verde-cego.**
Nenhum caso nasceu, sumiu ou foi renomeado entre as medições.

## `[S]` J1.6 · caso `-db` multi-org pela fiação REAL, cluster MEU, N=3 — **CONFERE**

- **cluster descartável meu:** `jur-c2v2-pg` (`postgres:16-alpine`) em **15831** — porta escolhida
  depois de medir `docker ps` + `netsh` (fora de todas as faixas excluídas; nunca 55432; base viva
  5432/6379 não lida nem tocada). `pg_isready` → `accepting connections`.
- **risco de encostar na base viva = zero por construção:** `ls -la .env` no worktree julgado →
  *No such file or directory*, logo o `import "dotenv/config"` do teste não carrega nada e o
  `DATABASE_URL` só existe quando eu o passo na linha de comando.
- `npx prisma migrate deploy` → **`ec=0`**; `select count(*) from _prisma_migrations where
  finished_at is not null` → **104**.
- comando (3×): `DATABASE_URL=…15831/erp_techsolutions node --test --import tsx
  tests/o6r07a-anon-lockout-db.test.ts`
- **RUN 1/2/3 idênticos: `# tests 7` · `# pass 7` · `# fail 0` · `# skipped 0` · `ec=0`**, com o
  subteste novo `ok 6 - CICLO 2: e-mail em DUAS organizações — 1 requisição falhada = 1 incremento
  + 1 linha, com ipAddress/userAgent (N=3)`.
- **Nota de terreno:** entre o meu `docker ps` inicial e este, os containers `jur-c5-arnes-pg-bat`
  (32783) / `jur-c5-arnes-red-bat` (32784) **deixaram de aparecer** — a junta do ciclo 5 varreu o
  terreno dela. **Eu não toquei em nenhum dos dois**; registro a mudança porque a fotografia de
  portas move, e é por isso que se mede em vez de herdar.

---

# `[S]` J2 — inventário das escritas do diff de auth (o desenho novo é o desenho entregue?)

Recorte medido: `git diff 9d44989 9989c62 -- src/modules/auth/` = **4 arquivos**, `7/0` · `3/0` ·
`39/0` · `56/27`. `local-auth-credential.repository.ts` **não aparece no diff** — o repositório do
B01 está intocado.

## `[S]` J2.a · cobrança é ATO ÚNICO, no lugar certo — **CONFERE**

`anonymous-login.service.ts:215-222`: o bloco `if (chargeableFailures.length > 0 &&
this.deps.registerFailure)` está **dentro** de `if (successes.length === 0)`, **depois** do laço
`for (const candidate of candidates)` e **imediatamente antes** de `return this.settle(startMs,
{ kind: "invalid" })`. Sucesso em qualquer candidato ⇒ o ramo nem roda ⇒ zero cobrança.
`verifyAnonymousCandidate` **sem efeito colateral**: no ramo `!passwordMatches` (l.261-269) só há
`return { ok:false, reason:"invalid_credentials", charge:{…} }` — as duas escritas do ciclo 1
(`incrementFailedAttempts` + `recordLoginFailure`) foram REMOVIDAS de lá; são 2 das 27 remoções.

## `[S]` J2.b · cobra EXATAMENTE UM, e nunca lock/inexistente — **CONFERE**

`const [target] = [...chargeableFailures].sort((a, b) => a.failedAttempts - b.failedAttempts)` — a
desestruturação pega **1**; `Array.prototype.sort` é **estável por especificação desde a ES2019**,
logo empate cai na ordem da lista de candidatos. **Quem entra em `chargeableFailures`:** só o ramo
`else if (result.charge)` do laço. E `charge` só é preenchido no `!passwordMatches` — li a função
inteira (`local-auth-login.service.ts:237-275`): tenant inexistente → `{ok:false,reason:
"invalid_credentials"}` **sem charge**; credencial inexistente → idem **sem charge**;
`locked_until > now` → `{ok:false, reason:"locked"}` **sem charge** (o lock não é combustível);
`inactive` só é alcançável **depois** da senha CERTA, logo nunca é falha de senha. **Nenhum caminho
empilha lock, inexistente ou inativo.**

## `[S]` J2.c · MESMO `incrementFailedAttempts` do B01 + MESMO `recordLoginFailure`, allowlist
fechada — **CONFERE** (e aqui a armadilha da linha duplicada foi tratada por BLOB, não por texto)

A armadilha do briefing é real e eu não a resolvi por `grep` de linha. Contei as ocorrências nos
**dois blobs**:
- `git show 9d44989:…/local-auth-login.service.ts | grep -n incrementFailedAttempts` →
  l.27 (assinatura da interface) · **l.152 (caminho DIRECIONADO do B01)** · l.216 (comentário) ·
  **l.261 (o anônimo do ciclo 1)**
- `git show 9989c62:…` → l.30 (assinatura) · **l.163 (o MESMO direcionado, deslocado pelas +11
  linhas de tipo acima)** · l.230 e l.331 (comentários) · **l.341 (dentro de
  `registerAnonymousFailure`)**

Ou seja: **o direcionado continua sendo UMA chamada e não foi tocado** — l.152 não cai em nenhum
hunk do diff (os hunks são `-17,6` · `-79,6` · `-209,28` · `-256,12` · `-319,6`), e o anônimo
**mudou de lugar**, de dentro do `verify` para o método novo. Não é linha nova de incremento; é a
mesma, movida.
`registerAnonymousFailure` (l.336-348) chama `this.credentials.incrementFailedAttempts(credentialId,
tenantId)` — o UPDATE atômico do B01, repositório fora do diff — e `this.recordLoginFailure(tenantId,
normalizeCredentialEmail(email), "invalid_credentials", auditContext, "without_org")`.
**Allowlist:** o `auditContext` que chega vem de `anonymous-login.service.ts:218-221` e é
**literalmente `{ ipAddress: input.ipAddress, userAgent: input.userAgent }` — nada além**. O corpo de
`recordLoginFailure` **não está no diff** (o hunk 5 termina em l.353; o método começa em l.354): o
`...auditContext` e o `metadata:{email, reason, loginMode}` já eram os do caminho direcionado. O tipo
`LocalAuthAuditContext` = `Pick<EnterpriseAuditLogInput,"requestId"|"correlationId"|"ipAddress"|
"userAgent">` é **pré-existente** (l.94, fora dos hunks). Sem token/path/bucket/storage key/base64/
`tenant_id` externo (§2.8).

## `[S]` J2.d · `auth-runtime.ts`: só o espelho, e ele é PORTANTE — **CONFERE, provado por mutação**

O diff do arquivo é **7 adições / 0 remoções**: 2 linhas de comentário + o método
`registerAnonymousFailure` envolvendo `withTenantRls(prisma, tenantId, …)`, na forma idêntica ao
`finalizeAnonymousLogin` (l.59-63). Zero outra linha. A ampliação nominal do C2·5 item 4 ficou
nominal.
**Não aceitei por leitura que o espelho esteja na fiação de produção — provei por MUTAÇÃO** (drill
`MUT-2`, no MEU worktree descartável em `9989c62`, cluster meu; a árvore julgada não foi tocada):
- baseline no worktree descartável: `-db` **7/7, ec=0**
- removi as 7 linhas do espelho → `npx tsc --noEmit` **`ec=0`, 0 `error TS`** (o `as
  LocalAuthLoginService` é um *cast*: o compilador não exige o método) · `-db` → **`ec=1`,
  `# pass 1` / `# fail 6`**, com as requisições virando **`desfechos anônimos observados:
  [500,500,500,500,500,500,500,500,500,500,429,429]`**
- **restaurei por edição inversa exata: `git status --porcelain` do worktree = VAZIO.**
- **Conclusão:** o espelho está mesmo no caminho de produção do `createApp` (o `-db` sobe o app
  real), e a ausência dele falha **ALTO (500)**, não em silêncio.

## `[S]` J2.e · `registerFailure` é dep OPCIONAL — o ponto fino, julgado com medição na mão

**Re-contagem dos sítios** (`grep -rn "new AnonymousLoginService" --include=*.ts src tests`) —
**5**, e confirmo o número que o dev publicou:

| # | sítio | injeta `registerFailure`? |
|---|---|---|
| 1 | `src/modules/auth/routes/auth.routes.ts:90` — **ÚNICO de produção** | **SIM** (l.104-106) |
| 2 | `tests/o6r07a-anon-lockout-multiorg.test.ts:291` | SIM (l.304) |
| 3 | `tests/o6r07a-anon-lockout.test.ts:287` | SIM (l.294) |
| 4 | `tests/auth-login-anonymous.test.ts:38` | **não** |
| 5 | `tests/o6r07a-login-rate-limit.test.ts:182` | **não** |

**Drill `MUT-1` — removi a injeção do sítio de PRODUÇÃO** (worktree descartável meu em `9989c62`,
cluster meu):
- `npx tsc --noEmit -p tsconfig.json` → **`ec=0`, `0` ocorrências de `error TS`**. **O compilador
  NÃO pega.** O `?` torna a omissão legal, e este é o fato duro do achado.
- `-db` → **`ec=1`, `# tests 7` · `# pass 1` · `# fail 6`**. Modo de falha: **`error: 'contador
  PARADO: failed_attempts = 0 (antes deste bloco era 0)'`** e, no subteste multi-org, **`0 !== 1`**.
  **Sem exceção, sem 500** — a cobrança some **em silêncio**. É literalmente a regressão do
  `Ω6R-SEC-003` reaparecendo.
- restaurado por edição inversa exata: `git status --porcelain` do worktree = **VAZIO**.

**Meu julgamento, e ele tem duas metades que não se cancelam:**
1. **O fail-open é REAL e não é teórico** — medi que o tipo não protege (tsc verde) e que o modo de
   falha é silencioso (contador parado, não exceção). Um sítio de produção futuro que esqueça a dep
   reverte o SEC-003 sem barulho. Isto **não** é a mesma classe de `verifyPasswordFn?` /
   `bucketStore?` / `minLatencyMs?`, que têm **default seguro no próprio serviço**; esta não tem
   default nenhum — a ausência dela é a ausência da defesa.
2. **Mas a defesa que existe hoje é executável e larga**: há **um só** sítio de produção, ele
   injeta, e o `-db` sobe o app real (`createApp`) — logo qualquer regressão nessa injeção derruba
   **6 de 7** subtestes, incluindo o caso 1, que é a própria medição do secops. O head entregue
   **não tem o defeito**; tem uma porta que só um erro futuro abriria, e um alarme que toca alto
   quando ela abre.

**Gravidade: `nota`, escopo `dentro-do-bloco`** (a dep nasce neste diff — `anonymous-login.service.ts`
l.79, hunk `@@ -72,6 +82 @@` de `9d44989..9989c62`). **Não reprova**: nada está quebrado no head, a
propriedade vale por execução, e a mitigação é um teste que já roda. Registro como observação de
desenho para o próximo bloco de auth — e registro também que **os dublês 4 e 5 não medem cobrança**
(o `auth-login-anonymous` é o arnês do B01, anterior a esta dep; o `login-rate-limit` mede o balde
por IP), logo a não-injeção deles é coerente e não esconde nada.

## `[S]` J2.f · a resposta anônima segue ACHATADA — **CONFERE**

`charge` é campo do tipo **interno** `AnonymousCandidateResult` (`local-auth-login.service.ts:82-92`),
consumido só dentro de `AnonymousLoginService.attempt`. O ramo de falha devolve
`this.settle(startMs, { kind: "invalid" })` — **401 uniforme**, sem 423, sem enumeração de
organizações. Provado também por execução: `ok 5 - M5 — conta em lock × conta inexistente:
respostas indistinguíveis (401 uniforme; 423 nunca vaza)` verde nas 3 rodadas, e o M3 asserta
`deepEqual(outcome, {kind:"invalid"})`. **O dado de cobrança nunca serializa.**

---

# `[S]` J3 — o reparo A3 e o §4 emendado (aceite C2·6 item 4)

## `[S]` J3.a · APPEND em `pendencias.md` com a margem publicada — **CONFERE**

- **É APPEND de verdade, e provei sem cair na armadilha de EOL.** `git diff -U0 9d44989 9989c62 --
  agent-orchestration/controle/pendencias.md` → **UM ÚNICO hunk: `@@ -5689,0 +5690,146 @@`** e
  `grep -c "^-[^-]"` → **0 linhas removidas**. Arquivo: **5689 → 5835 linhas** (+146, idêntico ao
  `--numstat` `146 0`). O bloco começa na l.5693, **estritamente depois** da última linha
  pré-existente. A entrada original (l.5631) **não foi editada**.
- **Armadilha evitada, e registro porque quase virou achado falso:** um `diff -q` entre
  `git show 9d44989:…` e `head -5689` da árvore acusou "differ". **Não é divergência — é EOL:**
  `tr -cd '\r' | wc -c` dá **0** no blob (git normaliza para LF) e **5654** na árvore (CRLF/misto),
  exatamente a armadilha do briefing (`md5sum`/`git status` mentem sob autocrlf). A medição que vale
  é a do `git diff`, que é EOL-aware — e ela diz append puro.
- **Conteúdo (l.5702, "APPEND (registro 1/7)"):** registra a razão original *"não existe ponto de
  injeção para o espião sem alargar `password.service.ts`"* como **FALSA por demonstração**, e
  publica **a margem: canônico 49,08 ms × todo trio fora do pino 0,04–0,40 ms, razão ≥120×**,
  incluindo `N=32768` em 0,09 ms. Separa corretamente as duas coisas: a **DECISÃO** de não alargar
  produção estava **CERTA** (classe do `SAN2-4b`); a **RAZÃO** estava errada — era "desnecessário por
  dentro", não "impossível". **CONFERE com o aceite C2·6 item 4.**

## `[S]` J3.b · errata E-b emenda o §4 para PROPRIEDADE com margem — **CONFERE**

- `C2·7 E-b` (plano l.1002-1004): *"a prescrição de MECANISMO ('espião de scrypt — contador de
  derivações') está SUPERADA pela exigência de PROPRIEDADE com margem publicada (C2·4)"*.
- O alvo existe e é o que a errata diz: **corpo §4, l.268, item 6** — o texto original prescreve
  literalmente *"(espião de scrypt, idioma do B01 §6.4.4)"*.
- O texto da propriedade está no C2·4 (l.913-917): *"provar que a derivação NÃO ocorreu, por
  qualquer testemunha que a decida (contador, exceção distintiva ou relógio), DESDE QUE a evidência
  publique a MARGEM medida ou o controle distintivo; testemunha sem margem publicada não é
  testemunha"*. **É propriedade, não mecanismo, e carrega a trava.**

## `[S]` J3.c · texto × evidência do jurado do ciclo 1 — **CONFERE (isto é LEITURA, e está rotulado)**

**Declaro o método:** esta sub-prova é **conferência documental**, não execução. Não re-montei o
espião de tempo do ciclo 1 (ele não é do meu mandato e a cadeira que o montou publicou a margem).
- `02-auth-kdf-evidencia.md` l.311/314: `canonico N=16384 r=8 p=1 -> verify=true tempo=49.08ms` ·
  `N=2 (DOWNGRADE extremo) -> verify=false tempo=0.04ms`; tabela l.363-364: canônico **49,08 ms** ×
  fora do pino **0,04–0,40 ms**, *"~120× a ~1200× mais barato"*.
- O append e o plano publicam **"≥120×"** — que é o **piso** conservador da faixa medida, não um
  arredondamento para cima. **Não superdeclara.**
- A emenda que o jurado do ciclo 1 escreveu que ratificaria (l.399-403) está transcrita no C2·4
  **com a trava incluída** (*"testemunha sem margem publicada não é testemunha"*). Nada foi suavizado
  na passagem do voto para o plano.

---

# `[S]` LIMPEZA (§C5) e FECHAMENTO

- **Cluster meu:** `jur-c2v2-pg` (15831) — **derrubado e removido** ao final; 0 restantes meus.
  **Nunca toquei** `erp-postgres`/`erp-redis` (base viva) nem containers de outra junta.
- **Worktree meu:** `../jur-c2v2-red` — removido por `git worktree remove --force`. As duas mutações
  (`MUT-1`, `MUT-2`) foram desfeitas por **edição inversa exata**, com `git status --porcelain`
  **VAZIO** conferido depois de cada uma, **antes** de remover. Nenhum `reset`/`stash`/
  `checkout -- .`/`gc`/`prune` em lugar nenhum; `jur-c5-arnes` aparecia `prunable` e **não foi
  podado**.
- **Árvore julgada:** `9989c62` intacta — `git status --porcelain` só lista registros da junta
  (` M 00-quedas.md` + os `??` de evidências/votos das cadeiras). **Zero mutação em `src/`,
  `tests/`, `prisma/`.** Não commitei.
- Logs brutos no scratchpad da sessão (fora do repo).
