# dev-o6r07a-arranjo-sticky — S1..S4 da EMENDA E2 (F3) do B-O6R-07

**Papel:** DESENVOLVER (§C7.4-bis). Não achei o defeito, não decidi a emenda. Implemento e não rejulgo.
**Terreno:** worktree `.claude/worktrees/b07`, branch `fix/o6r07a-authorization`.
**Arquivo único do mandato:** `tests/work-order-checklists-sticky.test.ts`, somente dentro do caso `[rota]`.

> Estado deste registro: **EM APURAÇÃO** (preenchido item a item, cada um ANTES de começar o seguinte).

---

## §0 · Baseline — medido por mim ANTES de qualquer edição

**Head medido por mim** (`git rev-parse HEAD`):

```
a37a9dd8b64d0fa7d62cfaf6fc7157d6c95ce3ff
```

Branch: `fix/o6r07a-authorization`. Bate com o `a37a9dd` citado na EMENDA E2 — mas o número acima
é o que EU medi, não o herdado.

**`git status --porcelain` no baseline** (as mutações de `src/modules/auth/**`, `tests/auth-*`,
`tests/o6r07a-anon-*|login-rate-limit|scrypt-pin`, `pendencias.md` e o plano são do
`dev-o6r07a-auth-provas` e do planejador — **não são minhas e não foram tocadas**):

```
 M agent-orchestration/controle/pendencias.md
 M agent-orchestration/omega/planos/B-O6R-07-plano.md
 M src/modules/auth/anonymous-login.constants.ts
 M src/modules/auth/routes/auth.routes.ts
 M src/modules/auth/services/anonymous-login.service.ts
 M src/modules/auth/services/local-auth-login.service.ts
 M src/modules/auth/services/password.service.ts
 M tests/auth-login-anonymous-db.test.ts
?? agent-orchestration/omega/juntas/votos/O6R-07a/dev-a1-a3-auth.md
?? agent-orchestration/omega/juntas/votos/O6R-07a/dev-s1-s4-arranjo-sticky.md   <- este registro
?? tests/o6r07a-anon-lockout-db.test.ts
?? tests/o6r07a-anon-lockout.test.ts
?? tests/o6r07a-login-rate-limit.test.ts
?? tests/o6r07a-scrypt-pin.test.ts
```

O alvo do meu mandato, `tests/work-order-checklists-sticky.test.ts`, **NÃO aparece** — está limpo vs HEAD.

**sha256 do alvo no baseline** (`sha256sum`):
`f806fa8ca85ccbad15021d3d030e1e46bce00678446c3e2659a3b7f7c1e3965c`

**EOL medido** (armadilhas 1-3): arquivo de trabalho tem **826 CR em 826 linhas** → CRLF integral em
disco; o blob de `2d54ea2` tem **0 CR** (LF). `core.autocrlf=true`, sem `.gitattributes`. Por isso as
edições foram feitas por script que **preserva CRLF byte a byte** (§S1), e não por `sed -i`/`perl -i`.

### VERMELHO-CONTROLE — executado por mim, não herdado do planejador

Comando (head `a37a9dd`, SEM o arranjo):

```
node --test --import tsx tests/work-order-checklists-sticky.test.ts
```

Saída resumida:

```
not ok 15 - [rota] o ajuste exige a permissão de ENVIAR ao técnico e o detalhe passa a mostrar o conjunto
  error: zerar com `checklists: null` também é porta fechada
         403 !== 409
  expected: 409   actual: 403   operator: strictEqual
  stack: tests/work-order-checklists-sticky.test.ts:620:12
# tests 15
# pass 14
# fail 1
# skipped 0
EXIT=1
```

Nos logs das requisições 8 e 9 (o `zeragem` e o `edicaoComum`) o header é
`"x-user-id":"usr_000001","x-role":"field_technician"` — o helper `headers()` fixa o **managerA**
para todo papel, e a OS nunca foi atribuída: as três PATCH morrem no guard de escopo (403).

**Veredito do §0: ANTES = `ec=1 · tests 15 · pass 14 · fail 1 · 403 !== 409` na l.620.** Idêntico em
forma e número ao que a EMENDA E2 (F0) declara — confirmado por execução própria.

Containers de pé nesta máquina no baseline (`docker ps`): apenas **`erp-postgres` (5432)** e
**`erp-redis` (6379)** — a base viva, **INTOCADA, nem leitura**. Nenhum descartável de outro agente
estava de pé. **Eu não subi nenhum container**: o alvo roda com `CORE_SAAS_PERSISTENCE = "memory"`
(l.7 do próprio arquivo) e não fala com banco.

---

## S1 · Reverter l.612-613 ao texto pré-E1 (byte-exato de `2d54ea2`)

**Como o texto foi obtido:** extraído do PRÓPRIO git, nunca digitado de memória nem copiado do
mandato. Script de splice (scratchpad, fora do repo) que lê `git show
2d54ea2:tests/work-order-checklists-sticky.test.ts`, pega as linhas 612 e 613 **de lá** e as grava
sobre as 612/613 do alvo, rejuntando com `\r\n` para **preservar o CRLF** do arquivo de trabalho.
O script **aborta** se qualquer das quatro linhas (2 do blob, 2 do alvo) não for a esperada —
não houve como escrever no lugar errado.

Nada de `sed -i`/`perl -i` (armadilha 3), nada de `git checkout --` (armadilha 4: apagaria o
trabalho vivo do outro dev nesta árvore).

Saída:

```
S1 OK
612 <-     assert.equal(desvio.status, 409, "o desvio pelo update genérico é porta fechada, não 200");
613 <-     assert.equal(desvio.body.error?.reason ?? desvio.body.reason, "checklist_set_requires_endpoint");
EXIT=0
```

**Prova de byte-exatidão** (armadilhas 1-2: `md5sum` do arquivo mente sob `core.autocrlf`; aqui o
md5 é do **`od -c` das duas linhas**, com o CR do alvo removido, o que compara BYTES de conteúdo):

```
git show 2d54ea2:...  | sed -n '612,613p' | od -An -c | md5sum  -> e29d0c5008386c9c7aaaa6799c74d369
sed -n '612,613p' <alvo> | tr -d '\r'     | od -An -c | md5sum  -> e29d0c5008386c9c7aaaa6799c74d369
```

Iguais. **EOL preservado:** `tr -cd '\r' | wc -c` = **826** CR em **826** linhas (mesmo do baseline).

`git diff --numstat` do alvo após S1: `2  2  tests/work-order-checklists-sticky.test.ts` — duas
linhas, nada mais; o diff exibido troca exatamente `403/not_assigned_to_actor` por
`409/checklist_set_requires_endpoint`.

**Veredito parcial S1: FEITO e provado byte-exato.**

---

## S2 · Bloco de ARRANJO novo (perfil de operador + assign + `tecnicoHeaders`)

Inserido **entre o fecho da asserção do `ajuste`** (l.601 `    );`) **e o comentário
`// P1 da verificação — o DESVIO`** — exatamente o vão que o F3.2 nomeia. O script de splice
**aborta** se qualquer das três âncoras (l.601 `    );`, l.602 vazia, l.603 com
`P1 da verificação — o DESVIO`) não bater, e rejunta com `\r\n` (CRLF preservado).

Saída: `S2 OK · linhas inseridas: 37` · `EXIT=0`.
CRLF após S2: **863 CR em 863 linhas** (826 + 37 inseridas). `git diff --numstat`: `39  2`.

Conteúdo efetivamente gravado (l.603-638 do arquivo agora):

```
603|    // B-O6R-07a EMENDA E2 — ARRANJO: o técnico das três PATCH abaixo é ATRIBUÍDO a esta OS.
...
611|    const { createDefaultOperatorProfileService } = await import(
612|      "../src/modules/operator-profiles/operator-profile.service.js"
613|    );
614|    const profileService = await createDefaultOperatorProfileService();
617|    const tecnicoUserId = randomUUID();
618|    const atorAdmin = {
619|      tenantId: seed.tenantA.id,
620|      userId: seed.managerA.id,
621|      roles: ["tenant_admin"],
622|      permissions: [],
623|    } as never;
624|    const perfilTecnico = await profileService.create(atorAdmin, {
625|      user_id: tecnicoUserId,
626|      full_name: "Tecnico de Campo",
627|    });
628|    const atribuicao = await req(baseUrl, `/api/v1/work-orders/${workOrder.id}/assign`, {
629|      method: "POST",
630|      headers: headers(seed, "tenant_admin"),
631|      body: { operatorId: perfilTecnico.id },
632|    });
633|    assert.equal(atribuicao.status, 200);
634|    const tecnicoHeaders = {
635|      "x-tenant-id": seed.tenantA.id,
636|      "x-user-id": tecnicoUserId,
637|      "x-role": "field_technician",
638|    };
```

Conferências que fiz no fonte antes de escrever (nenhum item foi presumido):

- `createDefaultOperatorProfileService` existe e é `export async function` em
  `src/modules/operator-profiles/operator-profile.service.ts:143` — o caminho `.js` do import dinâmico
  é o mesmo idioma dos demais imports dinâmicos do arquivo.
- `OperatorProfile.id` existe (`operator-profile.types.ts:15 readonly id: string`).
- A rota é `POST /work-orders/:workOrderId/assign` (`work-order.routes.ts:195-198`) sob
  `work_orders:assign`; o corpo lê `body.operatorId` (`work-order.service.ts:1669`). A forma
  `{ operatorId: <perfil.id> }` é a canônica — a mesma de `o6r07a-wo-object-scope.test.ts:209-215`.
- `as never` no literal do ator: idioma permitido pelo F3.2, copiado do arquivo irmão
  (`o6r07a-wo-object-scope.test.ts:260`) e **confinado ao bloco** — não espalhado.
- `randomUUID` já importado na l.2; **nenhum import novo estático** foi adicionado.

**Veredito parcial S2: FEITO, ancorado e com CRLF preservado.** Validação de execução vem no S3/S4
(o bloco sozinho não muda o resultado: as três PATCH ainda usam `headers(seed, ...)` neste ponto).

---

## S3 · Trocar `headers(seed, "field_technician")` por `tecnicoHeaders` nas TRÊS requisições

O script troca por **número de linha, uma a uma**, e **aborta** se a linha não for exatamente
`      headers: headers(seed, "field_technician"),`. Ele também **asserta que a l.584 (`semPermissao`)
CONTINUA sendo essa linha** antes de mexer em qualquer outra — a `semPermissao` é a única que NÃO
muda (o 403 dela nasce no gate de rota, `field_dispatch:create` ausente do papel, e independe de
atribuição).

Saída: `S3 OK · trocadas: 646, 654, 662 · l.584 intacta` · `EXIT=0`.

Censo depois (`grep -n`), que é a prova de que foram três e só três:

```
584:      headers: headers(seed, "field_technician"),   <- semPermissao, INTACTA
646:      headers: tecnicoHeaders,                      <- desvio
654:      headers: tecnicoHeaders,                      <- zeragem
662:      headers: tecnicoHeaders,                      <- edicaoComum
```

CRLF: **863 CR em 863 linhas** (inalterado — a troca é linha-por-linha, não reescrita de EOL).

### Execução — o DEPOIS, N=3

```
node --test --import tsx tests/work-order-checklists-sticky.test.ts   (x3)

RUN 1 -> # tests 15 · pass 15 · fail 0 · skipped 0 · cancelled 0 · todo 0 · EXIT=0
RUN 2 -> # tests 15 · pass 15 · fail 0 · skipped 0 · cancelled 0 · todo 0 · EXIT=0
RUN 3 -> # tests 15 · pass 15 · fail 0 · skipped 0 · cancelled 0 · todo 0 · EXIT=0
```

**Denominador idêntico nas três: 15.** Nenhum `skipped` — o verde não é verde-por-sumiço.

```
npm run check   ->   tsc -p tsconfig.json --noEmit   ->   EXIT=0
```

O `as never` do bloco bastou: o `check` passa sem nenhum erro, e o idioma ficou confinado ao ator do
arranjo.

**Veredito parcial S3: FEITO. ANTES `ec=1 · 14/15 · 403 !== 409` → DEPOIS `ec=0 · 15/15` em N=3.**

---

## S4 · NADA MAIS (l.620 fica 409, l.628 fica 200, harness intocado, zero `src/**`)

**As duas linhas que a emenda manda NÃO tocar** — antigas l.620 e l.628, hoje deslocadas em +37 pelo
bloco do S2, portanto l.657 e l.665:

```
657|    assert.equal(zeragem.status, 409, "zerar com `checklists: null` também é porta fechada");
665|    assert.equal(edicaoComum.status, 200);
```

**409 e 200, exatamente como estavam.** Este é o ponto da emenda e ele está preservado: os dois números
agora valem para um técnico que **passa** o guard de escopo — a porta do conjunto segue fechada até para
o técnico da própria OS (409), e a edição comum que a permissão dele cobre segue aberta (200).

**Harness `withApi` e helpers intocados** — prova por md5 do `od`-independente: as 161 linhas do harness
em HEAD (l.666-826) e as mesmas 161 linhas hoje (l.703-863, deslocadas em +37) têm md5 **idêntico**
(`9a948a4b29c7558a5e39fc9b2b3e6d26`, com o CR removido do lado do disco). Nenhum reset de runtime de
perfis foi acrescentado — tenant novo por execução já isola, e a execução N=3 do S3 confirma.

**Diff confinado ao caso `[rota]`** — os hunks do `git diff` do arquivo são exatamente dois, ambos com
o cabeçalho do próprio caso:

```
@@ -600,21 +600,58 @@ test("[rota] o ajuste exige a permissão de ENVIAR ao técnico ...
@@ -622,7 +659,7 @@ test("[rota] o ajuste exige a permissão de ENVIAR ao técnico ...
```

**Zero linha de `src/**`.** `git status --porcelain` ao fim mostra APENAS:

```
 M tests/work-order-checklists-sticky.test.ts
?? agent-orchestration/omega/juntas/votos/O6R-07a/dev-s1-s4-arranjo-sticky.md
```

(os arquivos de `src/modules/auth/**` e os testes `o6r07a-anon-*`/`login-rate-limit`/`scrypt-pin` que
apareciam no §0 são do `dev-o6r07a-auth-provas` e sumiram sozinhos quando ele reverteu as sondas dele —
**eu não revertí, não commitei e não "arrumei" nada dele**, conforme o mandato.)

### Suíte canônica (`npm test` → `node scripts/run-backend-tests.mjs`)

```
[run-backend-tests] CORE_SAAS_PERSISTENCE=memory — padrão do runner
[run-backend-tests] 255 arquivo(s) · 2404 teste(s) · pass 2344 · fail 1 · skipped 59
EXIT=1
```

**A falha do sticky FECHOU.** No log da suíte:

```
11220|ok 2156 - [rota] o ajuste exige a permissão de ENVIAR ao técnico e o detalhe passa a mostrar o conjunto
```

**A ÚNICA falha restante é PRÉ-EXISTENTE e de AMBIENTE, não minha** — e digo por que, com medição:

```
not ok 85 - tests\core-saas-role-authority.test.ts     (falha de ARQUIVO, 0 teste registrado)
  src/database/prisma.ts:12
  Error: DATABASE_URL is required to initialize Prisma Client.
```

- `git status --porcelain -- tests/core-saas-role-authority.test.ts src/database/prisma.ts` → **vazio**:
  o arquivo que falha e a dependência que lança são **byte-idênticos ao HEAD**. Meu diff é um único
  arquivo de teste que nenhum dos dois importa — não há caminho por onde eu causasse isto.
- Causa medida: **este worktree não tem `.env`** (`[ -f .env ]` → não existe; a árvore principal tem) e
  `DATABASE_URL` não está exportada no ambiente. O `import` de `prisma.ts` estoura antes de registrar
  qualquer teste. **Não criei `.env`** — é escopo proibido, seria segredo, e a base viva `erp-postgres`
  está declarada INTOCÁVEL pelo meu mandato.
- Consequência colateral, também pré-existente: o guard `PISO DE DENOMINADOR` do runner marca esse mesmo
  arquivo ("terminou sem registrar um único teste e sem declarar skip") e por isso o `npm test` sai
  `ec=1`. É o guard fazendo o trabalho dele sobre uma condição de ambiente — **não é falha nova**.

**Veredito parcial S4: NADA ALÉM foi tocado. Aceite do arquivo cumprido; a única falha da suíte é
pré-existente/de ambiente e está nomeada com causa.**

---

## Fechamento

Estado deste registro: **FECHADO** (não mais "EM APURAÇÃO").

### `git diff --numstat`

```
42	5	tests/work-order-checklists-sticky.test.ts
```

**Um arquivo. 42 adições, 5 remoções.** Decomposição: S1 = 2/2 (reversão byte-exata) · S2 = +37
(bloco de arranjo) · S3 = 3/3 (as três trocas de header). 2+37+3 = 42 adições; 2+3 = 5 remoções.
Fecha a aritmética sem sobra.

### `ec` de cada passo (todos medidos por mim, nesta árvore)

| passo | comando | `ec` | resultado |
|---|---|---|---|
| §0 ANTES | `node --test --import tsx tests/work-order-checklists-sticky.test.ts` | **1** | tests 15 · pass 14 · fail 1 · `403 !== 409` na l.620 |
| S1 | script de reversão byte-exata a partir de `git show 2d54ea2:…` | **0** | md5 do `od -c` das duas linhas idêntico ao blob |
| S2 | script de inserção ancorada (l.601/602/603) | **0** | 37 linhas inseridas · CRLF 863/863 |
| S3 | script de troca por número de linha (646, 654, 662) | **0** | l.584 assertada intacta antes de mexer |
| DEPOIS #1 | `node --test --import tsx tests/…sticky.test.ts` | **0** | tests 15 · pass 15 · fail 0 · skipped 0 |
| DEPOIS #2 | idem | **0** | tests 15 · pass 15 · fail 0 · skipped 0 |
| DEPOIS #3 | idem | **0** | tests 15 · pass 15 · fail 0 · skipped 0 |
| check | `npm run check` (`tsc -p tsconfig.json --noEmit`) | **0** | sem erro; o `as never` bastou |
| suíte | `npm test` (`node scripts/run-backend-tests.mjs`) | **1** | 255 arq · 2404 testes · pass 2344 · fail 1 · skipped 59 |

### N e denominador

**N = 3** execuções do arquivo alvo, **denominador idêntico nas três: 15 testes**, `skipped 0` em todas.
O verde não vem de teste sumido. O ANTES (`14/15`) tem o **mesmo denominador 15** — a diferença é
exclusivamente o caso `[rota]`, que passou de `not ok` a `ok`.

### Portas / containers

**Nenhuma porta publicada por mim: não subi container algum.** O arquivo alvo roda com
`CORE_SAAS_PERSISTENCE = "memory"` (l.7 dele) e o runner canônico declara
`CORE_SAAS_PERSISTENCE=memory` como padrão — nada nesta bateria fala com Postgres.
`docker ps` no início e no fim: só **`erp-postgres` (5432)** e **`erp-redis` (6379)**, a base viva,
**não tocada nem para leitura**. Nada a derrubar (§C5). Nunca cheguei perto de 55432.

### O que eu NÃO fiz — e por quê

1. **Não renumerei a l.657 (409) nem a l.665 (200).** É o ponto da EMENDA E2 (F3.4); renumerar mataria a
   cobertura que o caso existe para dar. Implemento e não rejulgo.
2. **Não mexi na `semPermissao` (l.584).** F3.3: o 403 dela nasce no gate de rota
   (`field_dispatch:create` ausente do papel) e independe de atribuição.
3. **Não toquei `withApi`/harness** e não acrescentei reset de runtime de perfis. F3.4; e a execução
   N=3 provou que tenant novo por execução já isola.
4. **Zero linha de `src/**`.** O contrato de produto do §3.3 não muda nesta emenda (F3.4/F4).
5. **Não fechei a pendência `P-O6R-B07A-STICKY-409-VIRA-403` em
   `agent-orchestration/controle/pendencias.md`**, embora o F4 peça que "quem entregar o F3" a feche e
   anote a correção de rumo. **`pendencias.md` está fora do meu escopo permitido** (meu mandato autoriza
   exatamente dois arquivos: o teste e este registro) e, no baseline, estava **em mutação por outro
   agente**. **Fica ENTREGUE À ORQUESTRAÇÃO:** o rumo confirmado pela minha execução é que o sticky
   **NÃO vira 403 — VOLTA a 409** com ator atribuído no arranjo, exatamente como a E2 previu.
6. **Não criei `.env`** para fazer `core-saas-role-authority.test.ts` passar. Seria escopo proibido e
   secret; a falha é de ambiente e está nomeada com causa no S4.
7. **Não revertí, não commitei e não "arrumei"** nada do `dev-o6r07a-auth-provas` — nem por
   `checkout`, nem por `reset`, nem por `stash` (armadilha 4). As mutações dele que apareciam no meu
   baseline sumiram porque **ele** as reverteu.
8. **Não commitei, não abri PR, não mergeei** (protocolo, item 6).

### Limpeza §C5 — 1 linha

Removi os 5 arquivos de trabalho que criei no scratchpad de sessão (`s1-revert.mjs`, `s2-bloco.txt`,
`s2-inserir.mjs`, `s3-headers.mjs`, `suite.log`); **nenhum** artefato de build foi gerado (`npm run check`
é `--noEmit`; não há `dist/`, `coverage/`, `.vite/` nem `*.tsbuildinfo` na raiz), nenhum container foi
subido, e **deliberadamente NÃO apaguei** os 111 diretórios de `storage/checklist-attachments/`
(67 deles com menos de 60 min) porque outro dev está rodando suítes nesta mesma árvore agora e não
tenho como distinguir o lixo dele do meu — mass-delete às cegas é justamente a classe de erro que a
rodada já pagou; ficam registrados aqui para quem tiver a árvore só para si.
