# EVIDENCIA — cadeira C2 `auditor-do-arnes-e-da-suite` · junta SAN2-4b (PR #366)

> Identidade **NOVA**. Junta de 3, **UNANIMIDADE**. Head julgado `2d2d16d`, branch
> `fix/san2-4b-corrigir-arnes`, worktree `.claude/worktrees/san2-r`.
> Nao proponho correcao (§C7.4-bis). Escrita **incremental**: cada item apensado ao medir.
> Regra que sigo: **o verde nao prova; o vermelho-controle prova** — e mutacao que nao muta
> fabrica verde. Meco alem do que me foi entregue.

---

## §0 — Terreno desta cadeira (medido na abertura, não copiado)

| Item | Valor conferido por execução |
|---|---|
| Worktree | `.claude/worktrees/san2-r` · branch `fix/san2-4b-corrigir-arnes` |
| `git rev-parse HEAD` | `2d2d16db69afa22682866b8bb414e8afc35a5e80` (= `2d2d16d` do briefing) |
| `git status --porcelain` na abertura | 1 rastreado modificado (`pendencias-indice.md`, do próprio bloco) + os untracked da junta. **Nenhuma mutação viva nos 3 arquivos que eu meço** — `git diff --exit-code --stat tests/` → **ec=0** |
| Node | v20.19.5 · Host Windows 11 Pro 10.0.22631 · disco livre **18 GB** |
| **Base viva** | `docker ps` → `erp-postgres` **Up 2 days (healthy)** · `erp-redis` **Up 2 days (healthy)**. **ZERO comandos enviados a qualquer um dos dois**, nem de leitura |
| Porta escolhida | **56732**. `netsh … excludedportrange protocol=tcp` transcrito: 5357 · 49698-49997 · 50000-50059\* · 50160-50359 · 54183-54382 · 54517-54616 · 54893-55092 · **55253-55452** · 63148-64154. **55432 cai em 55353-55452 (proibida)**; **56732 está FORA de toda faixa** |
| Cluster descartável | `c2-arnes-pg` (postgres:16) na **56732** — MEU, distinto do `san2-4b-pg`/56432 do dev. `docker ps -a` na abertura: só os 2 vivos, nenhum cluster de outro jurado |
| `.env` no worktree | **NÃO EXISTE** (`ls -la .env` → "sem .env"). O `import "dotenv/config"` do teste não tem o que carregar → **impossível cair na base viva por herança**; toda `DATABASE_URL` foi passada explícita na invocação |
| `node_modules` | diretório real, **não** junction (`dir /AL node_modules` → "não pode encontrar o caminho") — proibição de 26/08 respeitada |
| Migrations aplicadas | **103** · tabelas em `public`: **115** (o `115` de `460 = 115 × 4`) |

---

## §1 — ITEM 1 · As DUAS portas, no código e por execução

### 1.1 — Leitura do código (o que o briefing manda ler, lido)

**Porta 1 — `SWEPT_ROLE_FAMILIES`** (`tests/helpers/auth-identity-fixture.ts:117-124`):

```
const SWEPT_ROLE_FAMILIES = [
  "o6r_b01", "o6r_clone_owner", "audit_rls", "vid_rls_test", "vid_link_rls", "rls_test",
] as const;
```

A família `"rls_test"` **entrou** — sexta e última. O `ORPHAN_ROLE_NAME_PATTERN` (l.133) é
**derivado** da lista (`join("|")`), então a verdade da varredura mora em um lugar só; e é
**ancorado em `^`**.

**Porta 2 — chamadores de `sweepOrphanEphemeralRoles`**, grep em `tests/ src/ scripts/`:

```
tests/helpers/auth-identity-fixture.ts:163  export async function sweepOrphanEphemeralRoles(...)  <- passou a ser EXPORTADA
tests/helpers/auth-identity-fixture.ts:335    await sweepOrphanEphemeralRoles(tx);                <- chamador antigo (createEphemeralRole)
tests/rls-tenant-isolation.test.ts:8          sweepOrphanEphemeralRoles,                          <- import NOVO
tests/rls-tenant-isolation.test.ts:42         await sweepOrphanEphemeralRoles(tx);                <- chamador NOVO
```

O chamador novo está **dentro** do `withRoleCatalogLock(adminClient, async (tx) => {` aberto na
l.41 — o lock que o arquivo **já detinha** — e **antes** do `CREATE ROLE` da l.43. É o mesmo
desenho de `createEphemeralRole`. **As duas portas estão fechadas no código.**

### 1.2 — Vermelho→verde e a MUTAÇÃO DE UMA METADE DE CADA VEZ (reexecutada por mim)

Arranjo: 4 roles plantadas por rodada com a assinatura **verbatim** do criador (`CREATE ROLE …
LOGIN PASSWORD … NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT` + `GRANT USAGE ON SCHEMA` + DML em
todas as tabelas + sequences). Assinatura da órfã plantada **conferida**: `rolcanlogin=t ·
rolvaliduntil IS NULL=t · 460 grants` — **460 = 115 × 4**, a assinatura das 68 da base viva
(medicao-3 §F10). O objeto que eu meço é o objeto que o 4a mediu.

**A PROVA DE QUE A MINHA MUTAÇÃO MUTA** (o briefing avisa que a 1.ª tentativa do dev não pegou por
CRLF). `file` → os dois arquivos têm **CRLF**. Por isso **não usei regex multi-linha**: usei
`sed -i '<N>d'` (deleção por número de linha, imune a CRLF) e conferi **três** provas por estado,
antes de medir:

| estado | `grep -c '"rls_test",'` (fixture) | `grep -c 'await sweepOrphanEphemeralRoles(tx);'` (criador) | `git diff --stat` (eol-neutro) |
|---|---|---|---|
| **BASE** (2 portas abertas) | **0** | **0** | 2 arquivos, 2 deletions |
| **M1** (só porta 2 fechada) | **0** | **1** | `auth-identity-fixture.ts` 1 deletion |
| **M2** (só porta 1 fechada) | **1** | **0** | `rls-tenant-isolation.test.ts` 1 deletion |
| **FULL** (head `2d2d16d`) | **1** | **1** | **vazio** (`--exit-code` → ec=0) |

Além do `grep`, imprimi a **região mutada** em cada estado (a lista de famílias sem a `rls_test`; o
`withRoleCatalogLock` sem a linha de sweep). Restauro por **cópia byte-a-byte** do pristine, com
`git diff --exit-code --stat tests/` → **ec=0** confirmando. Medi eol-neutro, como o §4 do briefing
manda — **não** por `md5sum`.

**Resultados — gatilho = o CRIADOR RODANDO SOZINHO (`tests/rls-tenant-isolation.test.ts`), o
arranjo em que a órfã nasce.** Denominador `# tests 1 · # pass 1 · # fail 0 · # skipped 0`, ec=0,
em todas as rodadas:

| estado | família registrada? | criador varre? | **ALVO `rls_test_<−2h>`** | **CTRL `audit_rls_<−2h>`** | SONDA `zzz_probe_` | NOVO `rls_test_<agora>` |
|---|---|---|---|---|---|---|
| **BASE** | não | não | **VIVA 2/2** | **VIVA 2/2** | VIVA 2/2 | VIVA 2/2 |
| **M1** — só porta 2 | **não** | sim | **VIVA 2/2** | **MORTA 2/2** | VIVA 2/2 | VIVA 2/2 |
| **M2** — só porta 1 | sim | **não** | **VIVA 2/2** | **VIVA 2/2** | VIVA 2/2 | VIVA 2/2 |
| **FULL** | sim | sim | **MORTA 2/2** | MORTA 2/2 | VIVA 2/2 | VIVA 2/2 |

**CONFIRMO a alegação do bloco, e confirmo o motivo DIFERENTE de cada metade:**

- em **M1** o varredor **roda e passa ao lado** (o `audit_rls_` morre 2/2, o alvo vive 2/2);
- em **M2** o varredor **não roda de forma alguma** (nem o `audit_rls_` morre);
- **nenhuma das duas metades, sozinha, muda o comportamento observável do alvo** — 2/2 viva em cada.

**E o alerta do dev reproduz na minha bancada:** quem fechasse só a porta 1 e medisse **apenas o
vermelho-controle `audit_rls_`** teria visto **verde em M1** e declarado feito, com a órfã viva.

**Gatilho da PORTA 1 (`tests/db-catalog-write-guard.test.ts`), estado FULL:** `# tests 5 · # pass 5`,
ec=0, **ALVO MORTA 2/2**, SONDA e NOVO VIVAS 2/2.

**Achado A FAVOR do bloco, que ninguém me entregou:** no estado **BASE** esse mesmo gatilho sai
**ec=1 · `# tests 5 · # pass 4 · # fail 1`**. O drill estendido pela C3 é, portanto, um **guard
permanente**: se alguém retirar a `rls_test` da lista no futuro, a suíte fica **VERMELHA**. A
correção não depende de memória de ninguém — o que o próprio comentário do drill promete
("se alguém remover a família do arnês sem mexer aqui, este caso fica VERMELHO") está **medido**.

### 1.3 — Vetor PRÓPRIO: 10 nomes adversariais (o bloco não mediu nenhum deles)

O bloco **argumentou** a ancoragem (`^`) em prosa — decisão de implementação nº 2 do `dev-c3-sweep.md`.
Eu a **executei**: plantei 10 nomes de fronteira e rodei o sweep uma vez (gatilho
`db-catalog-write-guard`, `# tests 5 · # pass 5`). **10/10 no esperado:**

| nome plantado | esperado | obtido | por que importa |
|---|---|---|---|
| `rls_test_<−2h>_deadbeef` | MORRER | **MORREU** | caso nominal |
| `rls_test_<−2h>` (sem sufixo) | MORRER | **MORREU** | o grupo de sufixo é opcional — as legadas do ciclo 2 |
| `rls_testX_<−2h>_deadbeef` | VIVER | **VIVEU** | **o vetor que quase pega:** em SQL `LIKE`, `_` é curinga de **1 caractere**, então o `rls_test_%` do `likePatterns` **casa** este nome — só o regex ancorado o salva. Se a varredura fosse pelo LIKE, esta role morria |
| `rls_testZ<−2h>_deadbeef` | VIVER | **VIVEU** | sem separador |
| `rls_test_notanumber_deadbeef` | VIVER | **VIVEU** | sem timestamp → corte de idade não aplicável |
| `rls_test_<−2h>_NOTHEX` | VIVER | **VIVEU** | sufixo fora de `[0-9a-f]` |
| `vid_rls_test_<−2h>_deadbeef` | MORRER | **MORREU** | irmã registrada; convive com `rls_test` no mesmo laço (armadilha M3-O-4) |
| `xrls_test_<−2h>_deadbeef` | VIVER | **VIVEU** | prefixo antes da família — a âncora `^` protege |
| `zzz_probe_<−2h>_deadbeef` | VIVER | **VIVEU** | família não registrada — anti-mass-delete |
| `rls_test_<agora>_deadbeef` | VIVER | **VIVEU** | corte de 60 min protege a execução corrente |

**A conclusão que este vetor sustenta e a do bloco não sustentava sozinha:** o `LIKE` do
`likePatterns` **sobre-casa** (é um superconjunto do pretendido) e quem estreita é o regex
ancorado. A afirmação do bloco continua verdadeira — mas agora está **medida**, não raciocinada, e
com o vetor que a derrubaria caso a implementação um dia dispensasse o regex.

**Observações desta cadeira no item 1:** 13 rodadas de gatilho. **SONDA não registrada sobreviveu
13/13** e **`rls_test_<agora>` sobreviveu 13/13**. Nenhum `DROP`/`DELETE` por curinga em momento
algum: o `drop.sh` da minha bancada **recusa** (`ec=2`) nome fora dos 3 namespaces de sonda e
**recusa** qualquer nome com `%`/`*`/espaço — as duas recusas foram **exercitadas**
(`drop.sh postgres` → ec=2 · `drop.sh 'rls_test_%'` → ec=2). As 3 roles adversariais fora do
namespace do script foram removidas **uma a uma, por nome exato**, com o comando registrado.

**VEREDITO ITEM 1: APROVADO.** As duas portas estão fechadas no código e por execução; as duas
meias-correções foram refutadas por mutação **conferida por três provas independentes**, falhando
por motivos diferentes; e a ancoragem, antes argumentada, está agora medida em 10 vetores de
fronteira.

---

## §2 — ITEM 2 · O teardown resiliente elimina a órfã

### 2.1 — A forma crua, tirada do GIT (não do relatório do dev)

Não aceitei a transcrição do diário. Fui ao objeto: `git show f6631d0:tests/rls-tenant-isolation.test.ts`
(head **anterior** à C4), l.3148-3151:

```ts
await withRoleCatalogLock(adminClient, async (tx) => {
  await tx.$executeRawUnsafe(`DROP OWNED BY "${roleName}"`);
  await tx.$executeRawUnsafe(`DROP ROLE IF EXISTS "${roleName}"`);
});
```

Dois statements numa transação só, sem retry e sem relatório. No head julgado (`2d2d16d`,
l.3171) isso virou `await dropEphemeralRoleResilient(adminClient, roleName);`. É essa a troca que
eu tinha de julgar.

### 2.2 — Sonda PRÓPRIA, em cluster descartável meu (`c2-arnes-pg`, 56732)

Escrevi `.tmp-c2-teardown-probe.mts` — **minha**, não li a do dev. Ela:

- cria a role com a assinatura **verbatim do criador** (`LOGIN PASSWORD … NOSUPERUSER NOCREATEDB
  NOCREATEROLE NOINHERIT` + `GRANT USAGE ON SCHEMA` + DML em todas as tabelas + sequences);
- roda a **FORMA A** copiada do `git show` acima e a **FORMA B** (`dropEphemeralRoleResilient`)
  sob a **MESMA** falha injetada: um duplo que rejeita a **primeira** aquisição de `$transaction`
  e delega o resto (a forma do drill PC, `db-catalog-write-guard.test.ts:394-416`);
- captura o `stderr` para medir a **segunda metade do aceite** ("resiliente" ≠ "silencioso").

**N = 10**, `DATABASE_URL` explícita em 56732:

| forma | sobreviveu | lançou | grants da sobrevivente | `attempts` | `failures` | marcador no stderr |
|---|---|---|---|---|---|---|
| **A — crua** (o código como estava) | **10/10** | **10/10** | `[460 ×10]` | — | — | — |
| **B — `dropEphemeralRoleResilient`** | **0/10** | **0/10** | — | `[2 ×10]` | `[2 ×10]` | **10/10** |

**A inversão é total e a órfã produzida é a órfã do 4a:** `460 = 115 × 4` grants em **10/10**, com
LOGIN — a mesma assinatura das 68 da base viva (medicao-3 §F10). A sonda não simula a órfã: ela a
**produz**, dez vezes, pela porta que a C4 fecha. **CONFIRMO o 10/10 × 0/10 do bloco.**

E confirmo as duas metades do aceite que o arnês declara: nenhum papel vivo ao fim **E** a falha
reportada — o marcador `[o6r-arnes] teardown de "rls_test_…"` com a mensagem da injeção apareceu no
stderr em **10/10**. A FORMA A, além de deixar a órfã, **lançou 10/10 de dentro de um `finally`**
(mascararia o erro original do teste); a FORMA B **não lançou nenhuma vez** quando a role morreu.

### 2.3 — O vaza-metro, COM controle de aparição (o que o briefing exige)

Δ=0 sem controle de aparição é indistinguível de "nunca tocou o cluster". Por isso cada rodada tem
**poller** rodando em paralelo (`SELECT rolname FROM pg_roles WHERE rolname LIKE 'rls\_test\_%'`
em laço durante a execução) e snapshot **de contagem E de lista ordenada** antes/depois.

Catálogo antes da bateria: **0 roles** de arnês (conferido; limpei as minhas sondas por nome exato).

| rodada | gatilho | ec | denominador | antes | depois | **Δ** | lista | poller: amostras com a role | distintas |
|---|---|---|---|---|---|---|---|---|---|
| F7-r01 | criador | 0 | `# tests 1 · # pass 1` | 0 | 0 | **0** | **IDÊNTICA** | **7** | 1 |
| F7-r02 | criador | 0 | `# tests 1 · # pass 1` | 0 | 0 | **0** | **IDÊNTICA** | **7** | 1 |
| F7-r03 | criador | 0 | `# tests 1 · # pass 1` | 0 | 0 | **0** | **IDÊNTICA** | **7** | 1 |
| F7-r04 | criador | 0 | `# tests 1 · # pass 1` | 0 | 0 | **0** | **IDÊNTICA** | **7** | 1 |
| F7-r05 | criador | 0 | `# tests 1 · # pass 1` | 0 | 0 | **0** | **IDÊNTICA** | **7** | 1 |
| GUARD-r01 | guard | 0 | `# tests 5 · # pass 5` | 0 | 0 | **0** | **IDÊNTICA** | 0 | 0 |
| GUARD-r02 | guard | 0 | `# tests 5 · # pass 5` | 0 | 0 | **0** | **IDÊNTICA** | 0 | 0 |
| GUARD-r03 | guard | 0 | `# tests 5 · # pass 5` | 0 | 0 | **0** | **IDÊNTICA** | **2** | 2 |

**Δ=0 em 8/8, lista ordenada idêntica em 8/8, e o controle de aparição prova que houve role de
verdade** (7 amostras por rodada no criador). Estendi o vaza-metro ao gatilho da porta 1, que o
bloco não mediu com esta forma.

### 2.4 — Uma órfã que EU vi, rastreada até a causa (e a causa não é o head julgado)

Registro porque quase virou achado meu, e a honestidade custa mais do que o silêncio. No meio do
item 1 encontrei um resíduo `rls_test_1788211706547_29c3bc62e3b0f` no meu cluster. Discriminei a
origem pelo catálogo, não pelo palpite: **`rolcanlogin = f`, `0` grants** → é uma órfã **sintética**
(`createSyntheticOrphanRole` cria `NOLOGIN`), do drill, e **não** a role do criador (que nasce com
`LOGIN` e 460 grants).

Reproduzi a causa em vez de supor: rodei o vaza-metro do guard **com a minha mutação M1 aplicada**
(família fora da lista → drill VERMELHO):

```
[GUARD-VERMELHO(M1)-r01] ec=1 | # tests 5 # pass 4 # fail 1 | antes=0 depois=2 delta=2 | lista=DIVERGIU
    > rls_test_1788205174890_14553108ef8a4
    > rls_test_1788212375079_4cda50974fe65
```

**Por quê:** `dropSyntheticOrphanRole` (l.477-485) assere o nome contra `ORPHAN_ROLE_NAME_PATTERN`,
que é **derivado de `SWEPT_ROLE_FAMILIES`**. Com a família removida pela MINHA mutação, a limpeza
**recusa** o nome que já não reconhece — que é o comportamento fail-closed correto do controle
anti-mass-delete. **O vazamento era artefato do meu próprio experimento, não propriedade de
`2d2d16d`:** no head julgado, Δ=0 em 3/3 rodadas do mesmo gatilho. As 2 roles foram removidas por
**nome exato**, uma a uma, comando registrado.

**VEREDITO ITEM 2: APROVADO.** `10/10 × 0/10` reproduzido em sonda própria, em cluster descartável
próprio, com a forma crua tirada do git e não do relatório; as duas metades do aceite batidas
(nenhum papel vivo **e** falha reportada, 10/10); vaza-metro Δ=0 em **8/8** com controle de
aparição de verdade.

---

## §3 — ITEM 3 · A suíte completa (R3 do inspetor, endereçada a esta cadeira)

### 3.1 — A forma canônica 3, montada por mim e conferida ANTES de rodar

O KPI declara a forma. Conferi cada condição por execução, não por leitura do relatório:

| condição da canônica 3 | como conferi | valor |
|---|---|---|
| `npm test` (= `node scripts/run-backend-tests.mjs`) | `package.json.scripts.test` lido | confere |
| `DATABASE_URL` em cluster descartável **56432+** | `c2-arnes-pg` postgres:16 na **56732** (MEU, ≠ 56432 do dev), `netsh` consultado antes: 56732 fora de toda faixa excluída | confere |
| banco migrado | `SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL` → **103** · tabelas em `public` → **115** | confere |
| `REDIS_URL` descartável | `c2-arnes-redis` redis:7 na **56779**, `redis-cli ping` → `PONG` | confere |
| **`CORE_SAAS_PERSISTENCE` AUSENTE** | `node -e` no ambiente do comando → `undefined` | **ausente** |
| **`RBAC_DB_PARITY` AUSENTE** | idem → `undefined` | **ausente** |
| `DATABASE_URL` não herdada de `.env` | `.env` **não existe** no worktree; env do shell → `undefined`; variável passada **explícita** na invocação | confere |
| Node | `v20.19.5` | confere |
| árvore sem mutação | `git diff --exit-code --stat src/ tests/` → **ec=0**; sonda `.tmp-c2-teardown-probe.mts` apagada **antes** de rodar | confere |

### 3.2 — A REEXECUÇÃO: **2609/2611 reproduz**

```
ec=0   duracao=197s
[run-backend-tests] 248 arquivo(s) · 2611 teste(s) · pass 2609 · fail 0 · skipped 2
# tests 2611 · # pass 2609 · # fail 0 · # cancelled 0 · # skipped 2 · # todo 0
grep -c '^not ok'  ->  0
```

**248 arquivos · 2611 testes · pass 2609 · fail 0 · skipped 2 · zero `not ok`.** Bate com o
publicado em **arquivos, testes, pass, fail e skipped** — os cinco números, não só o display.
(Duração 197 s contra os 223 480 ms do dev; máquina/carga, não conteúdo.)

### 3.3 — Os DOIS PULOS, **nomeados** (a pergunta do mandato)

Não são pulos anônimos, e **são exatamente** os do orçamento do runner. Extraídos do log por
diretiva TAP:

```
ok 1648 - toda permissão do catálogo existe na tabela `permissions` do banco # SKIP RBAC_DB_PARITY não é "1": …
ok 1649 - os grants do papel GLOBAL batem exatamente com ROLE_PERMISSIONS (nas duas direções) # SKIP RBAC_DB_PARITY não é "1": …
```

Os **dois** vêm do arquivo **`tests/permission-catalog-db-parity.test.ts`** (l.49:
`const PARIDADE_LIGADA = process.env.RBAC_DB_PARITY === "1"`), e são **gated por `RBAC_DB_PARITY`**
— que a própria canônica 3 declara **ausente**. Ou seja: os 2 pulos **são consequência declarada da
forma**, não resíduo.

E são **os mesmos dois que o runner orça por NOME**, em `scripts/run-backend-tests.mjs:73-82`:

```
// Os DOIS skips CONHECIDOS que compõem o orçamento (medidos na forma canônica 3 …):
//   1. tests/permission-catalog-db-parity.test.ts — "toda permissão do catálogo existe …"
//   2. tests/permission-catalog-db-parity.test.ts — "os grants do papel GLOBAL batem …"
// … Orçamento anônimo seria o mesmo buraco com outra roupa — por isso os dois estão NOMEADOS aqui.
const SKIP_BUDGET_DB = 2;
```

**Casam por nome, não só por contagem** — que é o que impede um terceiro pulo silencioso de se
esconder atrás do número 2. Com `DATABASE_URL` presente e `skipped = 2 = orçamento`, o guard do
C5.3 não disparou, corretamente.

### 3.4 — O DELTA **+2**: medido dos DOIS lados, não deduzido

O bloco afirma que o +2 são os dois casos que a C2 acrescentou ao `authority-portal` (12→14) e que
**nenhum outro arquivo mudou de denominador**. Não aceitei a dedução — medi.

**(a) No head `2d2d16d`, isolado, N=3:**

```
[run-backend-tests] 1 arquivo(s) · 14 teste(s) · pass 14 · fail 0 · skipped 0   (3x, constante)
```

**(b) Na BASE `45c3b97`** (o merge do SAN2-4a). Repus os **5 arquivos do diff de código** na versão
base — por **`git show <rev>:<path>`** do blob, **nunca** `git archive`+`tar` (a armadilha do
`core.autocrlf` que o §C7.1-ter(c) proíbe). Prova de que eu estava mesmo na base antes de medir:
`grep -c "AUTHORITY_SCRYPT_PARAMS.keylen" src/…/authority-password.ts` → **0** e
`grep -c '"rls_test",'` na fixture → **0**.

| arquivo do diff | base `45c3b97` | head `2d2d16d` | Δ |
|---|---|---|---|
| `tests/authority-portal.test.ts` | **12** | **14** | **+2** |
| `tests/db-catalog-write-guard.test.ts` | **5** | **5** | 0 |
| `tests/rls-tenant-isolation.test.ts` | **1** | **1** | 0 |

**O único denominador que se mexeu é o do `authority-portal`, e ele se mexeu em +2.**

**(c) E fui além do que o mandato pedia: rodei a SUÍTE COMPLETA NA BASE**, na mesma forma
canônica 3, no mesmo cluster:

```
### SUITE NA BASE 45c3b97 — ec=0  duracao=201s
[run-backend-tests] 248 arquivo(s) · 2609 teste(s) · pass 2607 · fail 0 · skipped 2
```

| | arquivos | testes | pass | fail | skipped | display |
|---|---|---|---|---|---|---|
| base `45c3b97` | 248 | **2609** | **2607** | 0 | 2 | **2607/2609** |
| head `2d2d16d` | 248 | **2611** | **2609** | 0 | 2 | **2609/2611** |
| **Δ** | **0** | **+2** | **+2** | 0 | 0 | |

**A conta fecha pelos dois lados, medida por mim e não herdada da ata do bloco anterior:**
`2607 + 2 = 2609` e `2609 + 2 = 2611`; o número de **arquivos não mudou** (248 → 248, nenhum arquivo
novo entrou nem sumiu), o de **falhas é 0 nos dois** e o de **pulos é 2 nos dois** (os mesmos dois
nomeados). O `2607/2609` que o KPI usa como âncora do delta **não é afirmação herdada**: eu o
reexecutei.

**Nota de vaza-metro da própria suíte:** catálogo do cluster antes da rodada base **0 roles** de
arnês, depois **0**. A suíte completa, terminando normalmente, não deixa órfã — coerente com o
diagnóstico do 4a de que a gênese exige morte do processo (SIGKILL/SIGINT) ou o teardown cru
falhando, e não o caminho feliz.

**VEREDITO ITEM 3: APROVADO.** `2609/2611` reproduz nos **cinco** números na forma canônica 3
montada e conferida por mim; os **2 pulos estão nomeados** e são exatamente o orçamento nomeado do
runner (`permission-catalog-db-parity`, gated por `RBAC_DB_PARITY` ausente — consequência declarada
da forma); e o **+2 está medido dos dois lados**, com a base reexecutada em `2607/2609` e o único
denominador móvel isolado em `12 → 14`.

---

## §4 — ACHADO ÚNICO · a única "conclusão além da medição" que encontrei

**`A-C2-1` — a frase "as 68 órfãs da base viva seguem intocadas" é uma propriedade da DISCIPLINA
do operador, não do código; e o `.env` da raiz aponta para a base viva.**

**Gravidade: `media`. Escopo: `pre-existente`. NÃO reprova** (§C7.1-ter(a)).

### O que eu medi

O comentário que a C3 escreveu em `tests/helpers/auth-identity-fixture.ts:103-105` afirma:

> "O QUE A ENTRADA **NÃO** DECIDE: as **68 órfãs da base viva** seguem intocadas e a sub-pendência
> `P-ARNES-RLS-TEST-FORA-DO-SWEEP` continua **ABERTA** — a recontagem supervisionada (só SELECT,
> datável pelo nome, que cada órfã embute) é da junta dona dela, não deste arquivo."

Nada no código sustenta o "seguem intocadas". O que eu medi no item 1 é o contrário: uma role
`rls_test_<agora−2h>` **morre** assim que qualquer gatilho de sweep roda contra o banco em que ela
vive — 2/2 no criador e 2/2 no guard, no head julgado. As 68 são todas **muito** mais velhas que o
corte de 60 min e todas casam o padrão (o próprio 4a as datou pelo nome). E:

```
.env da RAIZ do repositorio: EXISTE
host:porta do DATABASE_URL da raiz -> localhost:5432        (nenhuma credencial impressa)
worktree do jurado (.claude/worktrees/san2-r): SEM .env
```

`localhost:5432` é o `erp-postgres` — a base viva. O `npm test` da raiz é a forma **documentada**
de rodar a bateria (CLAUDE.md §9, "Backend/raiz — `npm run check` · `npm run lint` · `npm test`"),
e `tests/rls-tenant-isolation.test.ts` abre com `import "dotenv/config"`. Logo, **após o merge, um
`npm test` rodado da raiz varre a base viva** e recolhe as 68 — que é exatamente o dado que a
pendência aberta reserva para recontagem supervisionada.

**Não executei essa varredura, obviamente.** A base viva não recebeu nenhum comando meu, nem de
leitura — o `erp-postgres` segue `Up 2 days (healthy)`. O que li foi um **arquivo local**, e dele
só extraí `host:porta`.

### Por que é `pre-existente` — evidência de data, não opinião

| peça | quando entrou | origem |
|---|---|---|
| o mecanismo de sweep, o corte de 60 min, o `ORPHAN_ROLE_NAME_PATTERN` | **2026-08-19** | `0a39824` (#357, B-O6R-01) |
| as **5 famílias irmãs** na `SWEPT_ROLE_FAMILIES` (`o6r_b01`, `o6r_clone_owner`, `audit_rls`, `vid_rls_test`, `vid_link_rls`) | **2026-08-28** | `f081b5d` (#359, B-O6R-ARNES) — `git blame -L 118,122` |
| a linha `"rls_test",` | **2026-08-31** | `ecfdb24` — **este bloco** |
| o `.env` da raiz apontando `localhost:5432` | anterior a tudo isto | configuração de ambiente do dono |

**A classe antecede o bloco:** desde **28/08** um `npm test` da raiz já dropava as roles velhas das
**cinco** famílias irmãs na base viva. O bloco não criou o mecanismo, não criou o `.env` e não criou
a exposição — ele **estende a uma sexta família** o que já valia para cinco, que é precisamente o
que o plano lhe mandou fazer ("iguala-a às irmãs") com o preço medido (5/5 de gênese, 0
recolhimentos em 4 oportunidades, LOGIN + 460 grants).

**E o segundo braço do §C7.1-ter(a) também vale:** consertar isto está **fora do escopo permitido**
do bloco — o §5.1 do plano deu à C3/C4 exatamente três arquivos de `tests/`, e interditou o `.env`,
a base viva e a resolução da pendência. É a situação para a qual a regra foi escrita.

### O que é, então, e o que não é

**Não é** um defeito do que o bloco entregou: nenhum número publicado depende disso, nenhum
comportamento medido muda, e sob a regra vigente da rodada (todo jurado e o dev em cluster
descartável, base viva intocável) o caminho não dispara. O bloco **declarou** a pendência aberta e
**não** alegou tê-la resolvido — não há aqui o "carimbar o que não se mediu".

**É** uma afirmação escrita no código que se lê como propriedade do código e é, na verdade,
propriedade de uma disciplina operacional **não declarada ali**. O dado em risco é **forense** (a
contagem e os timestamps das 68), não produto: as roles não possuem objetos, só grants.

**Disposição (§C7.1-ter(a)):** pendência nomeada, dona = a junta de
`P-ARNES-RLS-TEST-FORA-DO-SWEEP`, que já detém a recontagem supervisionada. **Não proponho
correção** (§C7.4-bis) — reporto defeito, evidência executada e motivo.

---

## §5 — Fechamento do terreno desta cadeira

| item | estado |
|---|---|
| **Base viva** | `erp-postgres` **Up 2 days (healthy)** · `erp-redis` **Up 2 days (healthy)** — abertura **e** fechamento. **ZERO comandos**, nem de leitura. Nenhuma `DATABASE_URL`/`REDIS_URL` minha apontou 5432/6379 |
| **Árvore** | `git diff --exit-code --stat src/ tests/` → **ec=0**; `git rev-parse HEAD` → `2d2d16d…` **inalterado**. **Não commitei nada** |
| **Mutações** | as 4 (BASE/M1/M2 + reposição da base `45c3b97`) foram **todas revertidas por cópia byte-a-byte** do pristine, cada reversão conferida por `git diff --exit-code` |
| **Sonda temporária** | `.tmp-c2-teardown-probe.mts` **apagada** (antes mesmo de rodar a suíte); `git status` a confirma ausente |
| **Anti-mass-delete** | nenhum `DROP`/`DELETE` por curinga, em nenhuma base, em nenhum momento. Toda role removida **por nome exato, uma a uma**; o `drop.sh` recusou (`ec=2`) `postgres` e `rls_test_%` — recusas **exercitadas** |
| **Limpeza (§C5)** | `c2-arnes-pg` e `c2-arnes-redis` derrubados ao final, com `docker ps -a` conferido sem nenhum `c2-arnes-*` (registrado abaixo) |
