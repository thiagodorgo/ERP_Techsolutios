# C2 — `auditor-das-medicoes-2-e-3` · evidência incremental

**Bloco:** SAN2-4a · **PR:** #365 · **Head:** `4199b92` · **Quórum:** maioria de 3 · **Identidade:** NOVA

Regra deste arquivo: **um bloco por sub-item, apensado imediatamente após medir**. Comando · saída · veredito parcial.
Nada aqui é herdado de ata anterior; tudo abaixo foi executado nesta sessão salvo onde marcado `[LEITURA]`.

---

## C2-1 · As duas listas fecham 37 — execução PRÓPRIA

### Terreno (meu, independente do da medição 2)

```
$ docker ps --format "{{.Names}}\t{{.Ports}}\t{{.Status}}"
erp-postgres    0.0.0.0:5432->5432/tcp, [::]:5432->5432/tcp    Up 2 days (healthy)
erp-redis       0.0.0.0:6379->6379/tcp, [::]:6379->6379/tcp    Up 2 days (healthy)
```
Base viva **INTOCADA** — nenhum comando meu a alcança, nem leitura. O `Up 2 days` atravessa também a
minha passada.

`netsh interface ipv4 show excludedportrange protocol=tcp` — última faixa antes de 63148 termina em
**55452**. Minhas portas **56532** (pg) e **56579** (redis) estão fora de toda faixa. *(De passagem,
isto reproduz por execução própria o T2 da medição 2: a 55432 cai dentro de `55353–55452`.)*

Cluster descartável **meu**: `c2san24a-pg` (postgres:16, `127.0.0.1:56532`) + `c2san24a-redis`
(`127.0.0.1:56579`, `PING`→`PONG`). Head `4199b92`, branch `chore/san2-4a-medir-arnes`, Node **v20.19.5**.

```
$ psql -tAc "select count(*) from _prisma_migrations where finished_at is not null"   -> 103
$ ls prisma/migrations | wc -l                                                        -> 103
$ psql -tAc "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
             where n.nspname='public' and c.relkind='r'"                              -> 115
```
**115 tabelas** — metade da assinatura `460 = 115 × 4` já confirmada aqui, por execução minha, antes
de chegar ao item C2-3.

### C2-1a/b/d · As duas listas, N=3 cada — **e uma TERCEIRA lista que eu acrescentei**

Forma: `node scripts/run-backend-tests.mjs <lista>` · `DATABASE_URL`→:56532 · `REDIS_URL`→:56579 ·
`CORE_SAAS_PERSISTENCE` não exportada · sequencial, um processo por rodada · denominador lido do
sumário do runner (`scripts/run-backend-tests.mjs` l.412), **nunca de grep**. Logs `c2-*.log`,
TSV `c2-resultados.tsv` no scratchpad.

```
lista7     r01  ec=0  dur=19s  [run-backend-tests] 7 arquivo(s) · 37 teste(s) · pass 37 · fail 0 · skipped 0
lista6     r01  ec=0  dur=17s  [run-backend-tests] 6 arquivo(s) · 37 teste(s) · pass 37 · fail 0 · skipped 0
lista6alt  r01  ec=0  dur=17s  [run-backend-tests] 6 arquivo(s) · 37 teste(s) · pass 37 · fail 0 · skipped 0
lista7     r02  ec=0  dur=18s  [run-backend-tests] 7 arquivo(s) · 37 teste(s) · pass 37 · fail 0 · skipped 0
lista6     r02  ec=0  dur=17s  [run-backend-tests] 6 arquivo(s) · 37 teste(s) · pass 37 · fail 0 · skipped 0
lista6alt  r02  ec=0  dur=17s  [run-backend-tests] 6 arquivo(s) · 37 teste(s) · pass 37 · fail 0 · skipped 0
lista7     r03  ec=0  dur=18s  [run-backend-tests] 7 arquivo(s) · 37 teste(s) · pass 37 · fail 0 · skipped 0
lista6     r03  ec=0  dur=17s  [run-backend-tests] 6 arquivo(s) · 37 teste(s) · pass 37 · fail 0 · skipped 0
lista6alt  r03  ec=0  dur=18s  [run-backend-tests] 6 arquivo(s) · 37 teste(s) · pass 37 · fail 0 · skipped 0
```

- **lista-7** (registro A, `status-geral.md` l.33) → **(7, 37)** em **3/3**. ✅ **CONFIRMADO.**
- **lista-6** (registros B ≡ C, `pendencias.md` l.3440 + ciclo-5 §0.a) → **(6, 37)** em **3/3**. ✅ **CONFIRMADO.**
- **lista-6-alt** — a combinação que o **próprio bloco** enumerou no §R.5 e rotulou `[outra]`
  (`audit-security` + `auth-identity-backfill-db` + `auth-identity-link-events-db` +
  `auth-identity-links-db` + `rls-tenant-isolation` + `vehicle-identity-schema`) → **(6, 37)** em **3/3**.

**Veredito parcial C2-1a/b/d: as duas listas do bloco fecham 37 por execução minha, 0 fail, 0 skipped,
denominador constante em 9/9 rodadas.** A alegação central da medição 2 **se sustenta**.

### C2-1c · Denominadores POR ARQUIVO (N=2 cada, execução minha) e a identidade

```
porarq-audit-security                          r01/r02  ec=0  1 arquivo(s) ·  1 teste(s)
porarq-auth-identity-backfill-db               r01/r02  ec=0  1 arquivo(s) ·  6 teste(s)
porarq-auth-identity-link-events-db            r01/r02  ec=0  1 arquivo(s) ·  5 teste(s)
porarq-auth-identity-links-db                  r01/r02  ec=0  1 arquivo(s) · 15 teste(s)
porarq-auth-identity-role-real-db              r01/r02  ec=0  1 arquivo(s) · 10 teste(s)
porarq-impound-process-checklist-link-schema   r01/r02  ec=0  1 arquivo(s) ·  5 teste(s)
porarq-rls-tenant-isolation                    r01/r02  ec=0  1 arquivo(s) ·  1 teste(s)
porarq-vehicle-identity-schema                 r01/r02  ec=0  1 arquivo(s) ·  9 teste(s)
```
16/16 `ec=0`, `fail=0`, `skipped=0`, denominador **constante** em todas. Os 8 batem com os do bloco.

`enum.mjs` (meu, sobre os denominadores que **eu** medi — não os declarados):
```
soma A (lista-7) = 37 | |A| = 7
soma B (lista-6) = 37 | |B| = 6
identidade link-events(5)+role-real(10) = 15 == links(15) ? true
```
**C2-1c CONFIRMADO.** `1+6+5+10+5+1+9 = 37` e `1+6+15+1+9+5 = 37`; a identidade que une as duas
partições é exata. **Reconciliação:** soma por arquivo == denominador da lista inteira nas duas listas
-> o runner **não altera a contagem ao agregar**. Confirmado por execução minha.

### C2-1f · A sentença de impossibilidade é FALSA — confirmado

```
combinacoes de 6 (dos 8) que contem as 4 vitimas E fecham 37: 2
  - audit-security(1) + auth-identity-backfill-db(6) + auth-identity-link-events-db(5)
    + auth-identity-links-db(15) + rls-tenant-isolation(1) + vehicle-identity-schema(9)
  - audit-security(1) + auth-identity-backfill-db(6) + auth-identity-links-db(15)
    + impound-process-checklist-link-schema(5) + rls-tenant-isolation(1) + vehicle-identity-schema(9)
```
Enumeração minha, mesma cardinalidade da do bloco (**2**), e a segunda **é** a lista-6 — que eu
executei **3/3 em (6, 37)**. A sentença de `status-geral.md` l.33 (*"nenhuma combinação de 6 que
contenha as vítimas nomeadas fecha 37"*) está **derrubada por contraexemplo executado**.
**C2-1f CONFIRMADO** — o achado E-1 do bloco **se sustenta**.

### C2-1e · ACHADO — o par `(arquivos, testes)` **NÃO identifica a lista**

O bloco escreve, em `medicao-2-bateria-barata.md` **l.409-411** (E-2):

> "**O discriminador medido é o PAR `(arquivos, testes)`** [...] Publicar/conferir o par — e não só o
> total — **é o que torna a bateria barata reproduzível por terceiro**."

Enumeração exaustiva sobre os **mesmos 8 candidatos** e os denominadores que eu medi:

```
quantas listas distintas (dos 8 candidatos) produzem o par (6, 37) ? 3
  - audit-security+auth-identity-backfill-db+auth-identity-link-events-db+auth-identity-links-db+rls-tenant-isolation+vehicle-identity-schema
  - audit-security+auth-identity-backfill-db+auth-identity-links-db+impound-process-checklist-link-schema+rls-tenant-isolation+vehicle-identity-schema   <== a lista-6 "canonica"
  - audit-security+auth-identity-link-events-db+auth-identity-links-db+auth-identity-role-real-db+impound-process-checklist-link-schema+rls-tenant-isolation
quantas produzem o par (7, 37) ? 1
quantas listas de QUALQUER tamanho somam 37 ? 8
```

E **não ficou no papel** — as **três** foram executadas, e as três imprimem o mesmo par:
```
lista6      r01/r02/r03  ec=0  [run-backend-tests] 6 arquivo(s) · 37 teste(s) · pass 37
lista6alt   r01/r02/r03  ec=0  [run-backend-tests] 6 arquivo(s) · 37 teste(s) · pass 37
lista6alt2  r01/r02      ec=0  [run-backend-tests] 6 arquivo(s) · 37 teste(s) · pass 37
```

**Veredito C2-1e: a afirmação do bloco é VERDADEIRA em parte e FALSA como enunciada.**
O par **melhora** sobre o total (separa `(7,37)` de `(6,37)` — e nesse ponto o bloco está certo: o
critério do D29 "denominador idêntico" é mesmo insuficiente). Mas o par **não identifica** a lista:
**três** listas de 6 arquivos distintas produzem `(6, 37)`, e eu executei as três. Um terceiro a quem
se diga apenas *"(6, 37)"* **continua sem conseguir inferir qual bateria rodou** — que é exatamente o
defeito que o bloco imputa ao total sozinho. A sentença "é o que torna a bateria barata reproduzível
por terceiro" é uma **afirmação de suficiência falsa**, e o contraexemplo estava **no próprio §R.5 do
bloco**: ele enumerou a segunda combinação de 6 que fecha 37, rotulou-a `[outra]`, e não fechou o laço
com o E-2 três parágrafos adiante.

**Atenuante medido, e é o que decide a gravidade:** o §V.3 do mesmo diário **nomeia os 6 arquivos** na
receita de reprodutibilidade e diz "**não intercambiável**: mede arquivos diferentes". A receita que o
bloco recomenda está **correta e completa**; errado é o **alcance** do E-2 — e é ele que o `O-2` manda
apensar ao critério do **D29** do ciclo 5.

**Data/origem (escopo):** `git log` do arquivo -> commit **`1949c6a` (2026-08-31)**, desta branch, cujo
`merge-base` com `main` é `c9fd3a1` (2026-08-31). O texto **nasceu neste bloco** -> escopo
**`dentro-do-bloco`**. A mesma formulação foi propagada ao `BRIEFING-SAN2-4a.md` **l.17**.

**Gravidade: `atencao` (não bloqueia).** As três alegações centrais da medição 2 sobrevivem inteiras à
minha execução (as duas listas fecham 37; são partições, não contradição; a sentença de
impossibilidade é falsa). O defeito é de **alcance de uma conclusão**, não de medição: o bloco publicou
o dado que o refuta e publicou a receita correta ao lado. Mas **precisa** de errata antes de o 4b
escrever o D29, sob pena de o ciclo 5 ganhar um critério que ainda não pina a forma.

---

## C2-2 · A exclusão do varredor é DUPLA — **lida por mim no código**

### C2-2a · Exclusão por FAMÍLIA — `rls_test_` está fora

`tests/helpers/auth-identity-fixture.ts` l.105-111, transcrito:
```ts
const SWEPT_ROLE_FAMILIES = [
  "o6r_b01",
  "o6r_clone_owner",
  "audit_rls",
  "vid_rls_test",
  "vid_link_rls",
] as const;
```
**`rls_test_` NÃO está na lista.** E a exclusão é dupla dentro da própria função: o LIKE
(`${prefix}_%`, l.139) e o regex **ancorado** `^(?:o6r_b01|o6r_clone_owner|audit_rls|vid_rls_test|vid_link_rls)_(\d+)(?:_[0-9a-f]+)?$`
(l.119-121) — nenhuma alternativa é prefixo de `rls_test`, e a âncora `^` impede casamento parcial.
A l.94 documenta a exclusão como **decisão consciente** (sub-pendência `P-ARNES-RLS-TEST-FORA-DO-SWEEP`),
citando as 68 órfãs e o incidente de mass-delete de 26/07.
**C2-2a CONFIRMADO.**

### C2-2b · Exclusão por CHAMADOR — chamador único

Rodei o grep exato que o bloco declara (`grep -rn "sweepOrphanEphemeralRoles" tests/ src/ scripts/`):
```
tests/helpers/auth-identity-fixture.ts:138:async function sweepOrphanEphemeralRoles(...)   <- definicao
tests/helpers/auth-identity-fixture.ts:310:    await sweepOrphanEphemeralRoles(tx);         <- UNICA chamada
--- 2 linhas
```
E ampliei para o **worktree inteiro** (ripgrep, fora `node_modules`): as mesmas **2 linhas de código**;
o resto são citações em `.md`/`.json`. A l.310 está dentro de `createEphemeralRole`, que abre na
**l.299** (`grep -n "^export async function"` -> l.251 `dropEphemeralRoleResilient`, l.299
`createEphemeralRole`). **C2-2b CONFIRMADO — chamador único, e é `createEphemeralRole`.**

### C2-2c · O criador de `rls_test_` nunca invoca o varredor

`tests/rls-tenant-isolation.test.ts`:
- **l.6:** `import { withRoleCatalogLock } from "./helpers/auth-identity-fixture.js";` — importa
  **apenas** `withRoleCatalogLock`. **Não importa `createEphemeralRole`.**
- **l.25:** `const roleName = \`rls_test_${Date.now()}_${Math.random().toString(16).slice(2)}\`;`
- **l.31-42:** faz o próprio `CREATE ROLE ... LOGIN` + grants **inline**, dentro do lock.

Logo o arquivo que cria a família `rls_test_` **nunca chega ao varredor**. **C2-2c CONFIRMADO.**

### C2-2d · "Fechar uma porta não resolve" — CONFIRMADO

As duas exclusões são **independentes**: acrescentar `rls_test_` a `SWEPT_ROLE_FAMILIES` não faz o
`rls-tenant-isolation.test.ts` varrer coisa alguma, porque esse arquivo não chama o varredor em
momento nenhum; e o inverso (fazê-lo chamar) sem registrar a família também não alcançaria nada,
porque o LIKE e o regex ancorado a rejeitam. **A alegação central da medição 3 se sustenta.**

### ACHADO C2-A2 — a enumeração dos gatilhos do sweep é **4, e são 5**

`medicao-3-censo-roles.md` l.179-182 (transcrito):

> "**Consequência mensurável:** [...] o sweep só roda quando alguma das **4 suítes** que usam
> `createEphemeralRole` (`auth-identity-backfill-db`, `auth-identity-link-events-db`,
> `auth-identity-role-real-db`, `auth-login-candidates-fn-db`) executa. Isto é **observação para o
> 4b (O-1)**."

Enumeração minha, por invocação (não por import):
```
$ grep -rn "await createEphemeralRole(" tests/ src/ scripts/ | cut -d: -f1 | sort -u
tests/auth-identity-backfill-db.test.ts
tests/auth-identity-link-events-db.test.ts
tests/auth-identity-role-real-db.test.ts
tests/auth-login-candidates-fn-db.test.ts
tests/db-catalog-write-guard.test.ts          <== AUSENTE da lista do bloco
--- total de arquivos: 5
```
`tests/db-catalog-write-guard.test.ts` chama `createEphemeralRole` **três vezes** (l.383, 471, 511) —
e a l.470, imediatamente antes de uma delas, diz literalmente:
```
// O sweep roda dentro de `createEphemeralRole` — é assim que ele roda na suíte de verdade.
```
Ou seja: o arquivo omitido é justamente o **guard/ratchet que exercita o sweep de propósito**.

**Data/origem (escopo):** a sentença está em `medicao-3-censo-roles.md`, commit **`593cd99`
(2026-08-31)**, desta branch. O arquivo omitido, `tests/db-catalog-write-guard.test.ts`, tem último
commit **`f081b5d` (2026-08-28, #359)** — **já existia** quando a medição foi escrita, portanto era
alcançável pelo mesmo grep. Escopo: **`dentro-do-bloco`**.

**Gravidade: `atencao` (não bloqueia).** Não move a conclusão do item — a exclusão dupla é real e a
consequência qualitativa ("rodar o arquivo sozinho não varre nada") continua verdadeira. Mas é **N
errado numa enumeração publicada como completa**, dentro exatamente da frase entregue ao 4b como
`O-1`: quem for fechar a exclusão a partir dela vai planejar contra 4 gatilhos quando há 5, e o que
falta é o guard que existe para exercitar o sweep.

---

## C2-3 · A assinatura liga o mecanismo às 68 **sem contá-las**

### C2-3a · `460 = 115 x 4` — medido por MIM

Criei no **meu** cluster descartável uma role com os grants **literais** de
`tests/rls-tenant-isolation.test.ts` l.31-42 (CREATE ROLE ... LOGIN; GRANT USAGE ON SCHEMA public;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public; GRANT USAGE, SELECT ON ALL
SEQUENCES) e contei:
```
privilegios_de_tabela=460
tabelas_distintas=115
DELETE=115
INSERT=115
SELECT=115
UPDATE=115
usage_public=true
rolvaliduntil_is_null=true rolcanlogin=true rolsuper=false rolbypassrls=false
```
**460 = 115 x 4, decomposição exata**, LOGIN, sem expiração, USAGE em `public`. Bate com a F8.1/F8.3
do bloco em **todas** as células. E o **115** foi conferido independentemente contra o catálogo
(`pg_class` com `relkind` de tabela em `public` = 115, §C2-1). **C2-3a CONFIRMADO.**

### C2-3b · A assinatura bate com `P-O6R-ARNES-ISOLAMENTO`

`agent-orchestration/controle/pendencias.md` l.3296-3298, transcrito:
> "Cinco prefixos de role sem varredor: `rls_test_` (**68 órfãs vivas, todas com LOGIN**), `audit_rls_`,
> `vid_link_rls_`, `vid_rls_test_`. Total medido na base do dono: **81 roles não-sistema, 74 com LOGIN,
> até 460 privilégios de tabela cada.**"

`460` + `LOGIN` são exatamente o que eu medi na gênese. **C2-3b CONFIRMADO** — a ligação
mecanismo->pendência se sustenta, e é feita **sem contar** as 68.

*(Nota lateral, `pre-existente`, NÃO é achado do bloco: a mesma linha diz "**Cinco** prefixos" e lista
**quatro** nomes. É de **2026-08-18**, treze dias antes desta branch (`merge-base` `c9fd3a1`, 31/08), e
está fora do escopo do 4a. Registro só para que não se leia como defeito desta entrega.)*

### C2-3c · O timestamp do nome **data** cada role

```
node -e "new Date(1788186498149).toISOString()"  -> 2026-08-31T14:28:18.149Z
node -e "new Date(1788179560018).toISOString()"  -> 2026-08-31T12:32:40.018Z
```
Bate com o que o bloco publicou, e a origem está na l.25 do teste (o `Date.now()` embutido no nome).
**C2-3c CONFIRMADO.**

### C2-3d · A IDADE foi descartada com prova — **reproduzi a F9 inteira**

Semeei no meu cluster **quatro** roles sintéticas com o **mesmo** timestamp retrodatado em 2 h
(`1788185539358` = 2026-08-31T14:12:19.358Z), além do corte de 60 min:

| Role semeada | Família registrada? | Papel |
|---|---|---|
| `audit_rls_1788185539358_deadbeef` | **sim** | vermelho-controle |
| `vid_rls_test_1788185539358_deadbeef` | **sim** | controle de ancoragem (contém a substring `rls_test`) |
| `rls_test_1788185539358_deadbeef` | **NÃO** | o alvo |
| `zzz_probe_1788185539358_deadbeef` | **NÃO** | contraprova anti-mass-delete |

Invoquei o varredor pelo **único chamador real** (`node scripts/run-backend-tests.mjs
tests/auth-identity-backfill-db.test.ts`, `DATABASE_URL` -> :56532): `ec=0`, `1 arquivo(s) · 6
teste(s) · pass 6`. stderr, transcrito da MINHA execução:
```
[o6r-arnes] sweep dropou 2 role(s) órfã(s) das famílias registradas (o6r_b01, o6r_clone_owner, audit_rls, vid_rls_test, vid_link_rls) com mais de 60 min:
[o6r-arnes]   audit_rls_1788185539358_deadbeef
[o6r-arnes]   vid_rls_test_1788185539358_deadbeef
```
Catálogo depois: `rls_test_...deadbeef` · `rls_test_...cafe01` · `zzz_probe_...deadbeef`.

Mais **duas** oportunidades: r2 (segunda invocação do varredor, `ec=0`, **0** linhas de sweep — nada
velho sobrou nas famílias registradas) e r3 (`tests/rls-tenant-isolation.test.ts`, o **próprio
criador**, `ec=0`, `1 arquivo(s) · 1 teste(s)`). Catálogo ao fim das **três**: **inalterado**.

**Veredito C2-3d — os cinco pontos, por execução minha:**

| Afirmação | Resultado |
|---|---|
| Vermelho-controle: `audit_rls_` (registrada, >60 min) **é** recolhida | **SIM** — a sonda invocou o sweep de verdade |
| `rls_test_` **sobrevive** ao varredor | **SIM** — 3 oportunidades, 0 recolhimentos |
| **Idade não é a explicação** | **PROVADO** — a sobrevivente tem **exatamente o mesmo timestamp** das duas recolhidas |
| Contraprova anti-mass-delete: `zzz_probe_` sobrevive | **SIM** — o varredor não é curinga |
| Ancoragem: `vid_rls_test_` cai e `rls_test_` fica | **SIM** — mesma substring, destinos opostos |

**C2-3d CONFIRMADO.** O bloco reporta 4 oportunidades (F9 r1/r2 + F8.2 S1/S2); eu reproduzi **3** e o
resultado é o mesmo em todas. Teardown meu **escopado a nome exato** (3 drops nominais); controle
anti-mass-delete exercitado (o dono do cluster foi RECUSADO por estar fora dos prefixos permitidos);
catálogo final do meu cluster: **0** roles não-sistema.

### C2-3e · O **68** está declarado CARREGADO — CONFIRMADO

Varri **todas** as menções a `68` nos artefatos do bloco (l.170, 202, 339, 343, 497, 509, 556, 567,
573, 575 de `medicao-3-censo-roles.md` + l.19/31 do briefing). **Em nenhuma delas o 68 é apresentado
como número de hoje.** O §F10 o rotula em tabela: valor **68**, data **2026-08-18**, fonte
`P-O6R-ARNES-ISOLAMENTO` l.3296-3298, status **"CARREGADO — NÃO re-verificado"**; e fecha com:

> "Publicar '68' como número de hoje seria a classe exata que esta rodada existe para exterminar. [...]
> O número **de hoje** é, portanto, **desconhecido e >= 68 apenas por argumento — não por medição**."

O motivo do não-remedimento é o §5.2 (proibição de tocar `erp-postgres`, **inclusive leitura**), e a
prova de cumprimento é o `Up 2 days` que eu mesmo reli no início. **C2-3e CONFIRMADO — nada maquiado.**

### C2-3f · As duas falhas de instrumento — **publicadas, não maquiadas**

`medicao-3-censo-roles.md` **§F8.0** (l.299-318) tem título próprio: *"Duas falhas de INSTRUMENTO,
publicadas porque mudam a leitura dos números"*.

- **I-1** — o `$!` do Git Bash não é o PID do Windows; o `taskkill /F /T /PID` recebia o PID do MSYS e
  devolvia `ERRO: o processo "20323" não foi encontrado.` nas 5 tentativas; os processos **nunca**
  morreram e o resultado foi delta zero nas 5. O texto diz, literalmente: **"Aquele 0/5 é falha de
  instrumento, não janela estreita"**, e está **descartado por escrito**. Correção declarada: spawn de
  dentro do Node, `child.pid` real, `taskkill /T` na árvore (necessário porque o runner spawna um
  filho `node --test` que é quem detém a conexão).
- **I-2** — contaminação por órfã anterior: t2-t5 viam a órfã de t1 em **~11 ms** e matavam o filho
  antes de ele criar a própria role; as 4 tentativas são declaradas **INVÁLIDAS** e **não entram no
  N**. Correção: baseline de exclusão antes do spawn, só nome novo conta.

**C2-3f CONFIRMADO.** As duas estão publicadas **com o número espúrio que teriam gerado** — o
`0/5 órfãs` falso e limpo que o briefing pede para conferir —, com o mecanismo do erro e a correção.
Nenhuma foi suavizada; nenhuma rodada inválida foi contrabandeada para dentro do N.

### C2-3g · "Número sem N e forma" — procurei o análogo do achado da C1 nas medições 2 e 3

| Número publicado | N e forma declarados? |
|---|---|
| `(6,37)` / `(7,37)` | **sim** — N=5 por registro + N=3/N=2 por arquivo, env, Node, head, log nomeado |
| denominadores por arquivo | **sim** — N=5 acumulado; gatilho de escalada declarado e por que não disparou |
| `5/5 órfãs` | **sim** — e o §F8.4 separa explicitamente o **condicional** ("5/5 quando o kill cai na janela") do **incondicional** (~0,70 da F7), recusando converter um no outro |
| `~70 %` de janela | **sim** — F7, N=10 em duas passadas, a primeira com "controle de aparição AUSENTE" **declarado** |
| `460` / `115` | **sim** — 5/5 gêneses, e reproduzido por mim |
| `68` | **sim** — declarado CARREGADO, com data e status (§C2-3e) |
| **`4 suítes` que disparam o sweep** | **NÃO** — e são **5**. Achado **C2-A2** (item 2) |
| **par `(arquivos,testes)` como suficiente** | **NÃO** — falso por contraexemplo executado. Achado **C2-A1** (item 1) |

**C2-3g: o item 3, em si, está limpo.** Nenhum número **próprio da medição 3** foi publicado sem N e
forma — ao contrário, o §F8.4 é o lugar onde o bloco **se antecipa** ao ataque e recusa ler 5/5 como
taxa incondicional. Os dois análogos que encontrei estão nos itens 1 e 2 e já estão registrados lá.

---

## §T4 · Teardown DESTA cadeira (parte da medição, não cortesia)

Roles sintéticas minhas: **3 drops nominais** (`rls_test_...deadbeef`, `zzz_probe_...deadbeef`,
`rls_test_...cafe01`) — nome exato, **nunca curinga, nunca em massa** (incidente de 26/07 é a regra).
Controle anti-mass-delete exercitado: o dono do cluster foi **RECUSADO** por estar fora dos prefixos
permitidos. Catálogo final do meu cluster: **0** roles não-sistema.

Containers removidos e conferência final abaixo (§ execução de fecho).

**Execução de fecho, transcrita:**
```
$ docker ps -a --filter "name=c2san24a" --format "{{.Names}}"
(vazio)

$ docker ps --format "{{.Names}}\t{{.Status}}"
erp-postgres    Up 2 days (healthy)
erp-redis       Up 2 days (healthy)

$ git status --porcelain          -> apenas artefatos de junta untracked; nada commitado
$ git diff --stat HEAD -- src tests scripts prisma frontend mobile .github package*.json Kpis
(vazio)
$ git diff --check                -> ec=0
```
O `Up 2 days` de `erp-postgres`/`erp-redis` **atravessa também a minha passada** — prova de que a base
viva não foi tocada nem reiniciada por esta cadeira.

---

## VEREDITO C2 — **APROVADO**

As **três** alegações que me couberam sobrevivem à execução **própria**:

1. **As duas listas fecham 37.** 9 rodadas de lista + 16 por arquivo, denominador constante, 0 fail,
   0 skipped; a identidade `link-events(5) + role-real(10) == links(15)` é exata; a soma por arquivo
   bate com a lista inteira (o runner não altera a contagem ao agregar); e a sentença de
   impossibilidade do `status-geral.md` l.33 está **derrubada por contraexemplo executado**.
2. **A exclusão do varredor é DUPLA — no código.** `rls_test_` fora de `SWEPT_ROLE_FAMILIES` com LIKE
   e regex **ancorados**, **e** chamador único (`createEphemeralRole`, l.310) que o criador de
   `rls_test_` (l.25, importa só `withRoleCatalogLock`) **nunca** invoca. Fechar uma porta não resolve.
3. **A assinatura liga o mecanismo às 68 sem contá-las.** `460 = 115 × 4` reproduzido por mim,
   idêntico ao registrado em `P-O6R-ARNES-ISOLAMENTO`; timestamp do nome **data** cada role; **F9
   reproduzida por mim** com vermelho-controle e controle de ancoragem, descartando a **idade**; e o
   **68** está declarado **CARREGADO**, com data e status, jamais como número de hoje.

**As duas falhas de instrumento da M3 estão PUBLICADAS**, com o `0/5 órfãs` espúrio nomeado como falha
e descartado por escrito, e as 4 tentativas contaminadas declaradas inválidas e fora do N. **Não há
conserto escondido** no que me cabe: nenhum arquivo de código difere do head.

**Dois achados, ambos `gravidade: atencao` · `escopo: dentro-do-bloco`** — e ambos de **alcance de
conclusão**, nenhum de medição, por isso **não reprovam**:

| # | Achado | Data/origem |
|---|---|---|
| **C2-A1** | `E-2` afirma que publicar o par `(arquivos, testes)` **torna a bateria reproduzível por terceiro**. É falso: **três** listas de 6 arquivos distintas produzem `(6, 37)` — as três executadas por mim. O par melhora sobre o total, mas **não identifica** a lista. O contraexemplo estava no §R.5 **do próprio bloco** | commit `1949c6a` (2026-08-31), desta branch |
| **C2-A2** | A enumeração dos gatilhos do sweep é publicada como **4 suítes**; são **5** — falta `tests/db-catalog-write-guard.test.ts`, que chama `createEphemeralRole` 3× e exercita o sweep de propósito | sentença em `593cd99` (2026-08-31); o arquivo omitido é de `f081b5d` (2026-08-28, #359), **já existia** |

Os dois caem na frase que o bloco entrega ao **4b** (`O-2` e `O-1`) — precisam de **errata antes** de o
4b tocar o critério **D29** do ciclo 5, sob pena de o ciclo 5 receber um critério que ainda não pina a
forma e um plano contra 4 gatilhos havendo 5. **Não proponho a correção** (§C7.4-bis).
