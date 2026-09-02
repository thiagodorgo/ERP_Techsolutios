# SAN2-2 — Diário de execução da FASE 2 (`dev-san2-2`)

- **Papel:** `dev-san2-2` — desenvolvedor do bloco SAN2-2. Mandato de UM item: preparar o ambiente da Fase 2
  e **medir** as 4 suítes `-db` candidatas à lista `SUITES` do job `backend-postgres`. **Não** edito `ci.yml`
  neste mandato (é o próximo).
- **Worktree:** `.claude/worktrees/san2-r` · **branch:** `fix/san2-2-guard-espelho-ci` · **head:** `db2d291`
- **Plano:** `agent-orchestration/omega/planos/SAN2-2-plano.md` §3.2(b) e §6 Fase 2.
- **Data:** 2026-08-30
- **Registro incremental (P1 / `D-JUNTA-RESILIENTE`):** cada comando é escrito AQUI logo depois de executado,
  com saída resumida e veredito parcial. A morte do agente só pode custar a cauda não medida.

## Critério de aceite (§3.2b do plano)

Uma suíte só é **elegível** para entrar na lista `SUITES` se der **0 falhas e 0 pulos** nas **3** execuções.
Qualquer intermitência **desqualifica** a linha — e isso é **achado**, não obstáculo a contornar.

## Pré-condições medidas (antes de tocar em qualquer coisa)

### P0.1 — head e árvore

```
$ git log --oneline -1
db2d291 fix(agents-sync): o guard do espelho parou de mentir — e provou que ainda morde (SAN2-2 Fase 1)
```

Veredito parcial: head bate com o mandato. OK.

### P0.2 — containers existentes ANTES (a base viva não pode ser alvo)

```
$ docker ps -a --format "{{.Names}}\t{{.Status}}\t{{.Ports}}"
erp-postgres	Up 37 hours (healthy)	0.0.0.0:5432->5432/tcp
erp-redis	Up 37 hours (healthy)	0.0.0.0:6379->6379/tcp
```

Veredito parcial: só a base VIVA de dev está de pé (`erp-postgres`/`erp-redis`) — **proibidos até para
leitura** (§5 do plano). Não existe `san2-2-pg`/`san2-2-redis` ainda; as portas 55432/56379 estão livres.

### P0.3 — `.env` no worktree

```
$ ls -la .env    -> não existe (o worktree não tem .env)
```

Veredito parcial: **não há `.env` para poluir a resolução** — o `DATABASE_URL` que o Prisma e as suítes
enxergarem virá EXCLUSIVAMENTE do env que eu exportar. Zero risco de o `migrate deploy` cair na base viva por
herança de arquivo.

### P0.4 — env exata do job `backend-postgres` (`.github/workflows/ci.yml` l.108–120)

```yaml
DATABASE_URL: postgresql://postgres:postgres@localhost:5432/erp_techsolutions?schema=public
REDIS_URL: redis://localhost:6379
CORE_SAAS_PERSISTENCE: prisma
JWT_SECRET: dev-only-change-me
JWT_EXPIRES_IN: 15m
LOG_LEVEL: silent
RBAC_DB_PARITY: "1"
```

Reproduzo TODAS, trocando só host:porta do par descartável (55432 / 56379). O job também roda, antes das
suítes, `npm run db:generate` (já feito pelo orquestrador neste worktree), `npx prisma migrate deploy` e
`npm run db:seed` (passo "Provision database (seed)") — reproduzo os dois últimos contra o banco descartável.

## F2.1 — Subir o par descartável

### F2.1.a — primeira tentativa: porta 55432 **NÃO ESTÁ LIVRE** (achado de terreno)

```
$ docker run -d --name san2-2-pg -e POSTGRES_DB=erp_techsolutions -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=postgres -p 55432:5432 postgres:16
docker: Error response from daemon: ports are not available: exposing port TCP 0.0.0.0:55432 -> 127.0.0.1:0:
listen tcp 0.0.0.0:55432: bind: Foi feita uma tentativa de acesso a um soquete de uma maneira que é proibida
pelas permissões de acesso.

$ docker run -d --name san2-2-redis -p 56379:6379 redis:7
71065b3b9cda...   (OK — 56379 subiu)
```

Diagnóstico medido, não suposto:

```
$ netsh interface ipv4 show excludedportrange protocol=tcp
... 55253 55352 · 55353 55452 · 55453..63147 livre ...
```

**55432 cai dentro da faixa EXCLUÍDA 55353–55452** (reserva dinâmica do Windows/Hyper-V). O erro não é
"porta ocupada por outro processo": é o Windows ter reservado a faixa — nenhum processo consegue fazer bind.
O mandato afirmava "as portas estão livres"; **medido, a de Postgres não está**.

**Desvio declarado (1 linha, nada mais muda):** Postgres do par descartável vai para **56432** (fora de toda
faixa excluída; a faixa 55453–63147 está livre), Redis fica em **56379** como planejado. Nomes de container
inalterados (`san2-2-pg` / `san2-2-redis`). Nada no `ci.yml` depende desta porta — o job do CI usa 5432 nos
service containers do runner; a porta local só existe para esta medição e para a Fase 5.

### F2.1.b — o par descartável de pé (com a porta corrigida)

```
$ docker ps -a --filter name=san2-2   -> san2-2-pg ficou "Created" na tentativa que falhou o bind
$ docker rm san2-2-pg                 -> san2-2-pg  (só o meu container morto; a base viva não foi tocada)
$ docker run -d --name san2-2-pg -e POSTGRES_DB=erp_techsolutions -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=postgres -p 56432:5432 postgres:16
b7d4cfc07dd1...
$ docker ps --format "{{.Names}}\t{{.Status}}\t{{.Ports}}"
san2-2-pg	Up	0.0.0.0:56432->5432/tcp
san2-2-redis	Up	0.0.0.0:56379->6379/tcp
erp-postgres	Up 37 hours (healthy)	0.0.0.0:5432->5432/tcp     <- INTOCADO
erp-redis	Up 37 hours (healthy)	0.0.0.0:6379->6379/tcp        <- INTOCADO
$ docker exec san2-2-pg pg_isready -U postgres -d erp_techsolutions
/var/run/postgresql:5432 - accepting connections
$ docker exec san2-2-redis redis-cli ping
PONG
```

Veredito parcial: **par descartável saudável**. A base viva (`erp-postgres`/`erp-redis`) continua de pé,
não foi lida nem escrita, e **nenhum comando desta fase aponta para 5432/6379**.

### F2.1.c — env desta fase (espelha `ci.yml` l.108–120, só host:porta muda)

```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:56432/erp_techsolutions?schema=public"
export REDIS_URL="redis://localhost:56379"
export CORE_SAAS_PERSISTENCE=prisma
export RBAC_DB_PARITY=1
export JWT_SECRET=dev-only-change-me
export JWT_EXPIRES_IN=15m
export LOG_LEVEL=silent
```

## F2.2 — `npx prisma migrate deploy` contra o banco DESCARTÁVEL

```
$ . env.sh && echo "DATABASE_URL=$DATABASE_URL"
DATABASE_URL=postgresql://postgres:postgres@localhost:56432/erp_techsolutions?schema=public
$ npx prisma migrate deploy
... (lista completa das migrations, terminando em 20260868000000_add_auth_identities) ...
All migrations have been successfully applied.
EXIT=0
```

Veredito parcial: **migrations aplicadas, exit 0**, no banco descartável (porta 56432) — confirmado pelo
`DATABASE_URL` ecoado no MESMO comando, imediatamente antes do `migrate deploy`. A base viva não recebeu
migration alguma.

## F2.3 — `npm run db:seed` (o passo "Provision database (seed)" do job)

O job `backend-postgres` provisiona o banco com seed ANTES de rodar as suítes (`ci.yml`, passo
"Provision database (seed)"), e o §6 Fase 2 do plano manda `npx prisma migrate deploy && npm run db:seed`.
Reproduzir só o `migrate` deixaria as suítes num banco mais pobre que o do CI — mediria outra coisa.

```
$ npm run db:seed
> prisma db seed
Loaded Prisma config from prisma.config.ts.
Running seed command `tsx prisma/seed.ts` ...
The seed command has been executed.
EXIT=0
```

Veredito parcial: **banco descartável provisionado nas condições do job**. Ambiente pronto para medir.

## F2.4 — As 4 suítes, EXECUÇÃO 1 de 3

Comando (uma suíte por vez, TAP capturado em arquivo — a evidência não vive no contexto):

```bash
for s in impound-custody-history-db vehicle-identity-merge-db \
         work-order-checklists-freeze-links-db work-order-checklists-sticky-db; do
  node --test --import tsx "tests/$s.test.ts" > "$SCRATCH/$s.r1.tap" 2>&1; echo "exit=$?"
  grep -E '^# (tests|suites|pass|fail|cancelled|skipped|todo) ' "$SCRATCH/$s.r1.tap"
done
```

| suíte | exit | tests | pass | fail | skipped | cancelled | todo |
|---|---|---|---|---|---|---|---|
| `impound-custody-history-db` | 0 | 3 | **3** | 0 | **0** | 0 | 0 |
| `vehicle-identity-merge-db` | 0 | 5 | **5** | 0 | **0** | 0 | 0 |
| `work-order-checklists-freeze-links-db` | 0 | 6 | **6** | 0 | **0** | 0 | 0 |
| `work-order-checklists-sticky-db` | 0 | 8 | **8** | 0 | **0** | 0 | 0 |

Denominador registrado (pass/tests): 3/3 · 5/5 · 6/6 · 8/8 — **22/22** no total da execução 1.

Veredito parcial: execução 1 limpa nas quatro. **1 de 3** — nada é elegível ainda; o critério do §3.2(b)
exige as TRÊS execuções.

## F2.5 — As 4 suítes, EXECUÇÃO 2 de 3

Mesmo comando, `R=2`, mesmo banco descartável já provisionado (não recriei o banco entre execuções — a
execução 2 e 3 correm sobre o estado que a anterior deixou, que é o cenário mais hostil: se alguma suíte
dependesse de banco virgem, é aqui que ela quebraria).

| suíte | exit | tests | pass | fail | skipped | cancelled | todo |
|---|---|---|---|---|---|---|---|
| `impound-custody-history-db` | 0 | 3 | **3** | 0 | **0** | 0 | 0 |
| `vehicle-identity-merge-db` | 0 | 5 | **5** | 0 | **0** | 0 | 0 |
| `work-order-checklists-freeze-links-db` | 0 | 6 | **6** | 0 | **0** | 0 | 0 |
| `work-order-checklists-sticky-db` | 0 | 8 | **8** | 0 | **0** | 0 | 0 |

Denominador: 3/3 · 5/5 · 6/6 · 8/8 — **22/22**. **Idêntico à execução 1** (denominador constante entre
rodadas, que é o que a lição do arnês manda conferir).

Veredito parcial: execução 2 limpa nas quatro. **2 de 3.**

## F2.6 — As 4 suítes, EXECUÇÃO 3 de 3

| suíte | exit | tests | pass | fail | skipped | cancelled | todo |
|---|---|---|---|---|---|---|---|
| `impound-custody-history-db` | 0 | 3 | **3** | 0 | **0** | 0 | 0 |
| `vehicle-identity-merge-db` | 0 | 5 | **5** | 0 | **0** | 0 | 0 |
| `work-order-checklists-freeze-links-db` | 0 | 6 | **6** | 0 | **0** | 0 | 0 |
| `work-order-checklists-sticky-db` | 0 | 8 | **8** | 0 | **0** | 0 | 0 |

Denominador: 3/3 · 5/5 · 6/6 · 8/8 — **22/22**, idêntico às execuções 1 e 2.

### O que os 22 casos são (nome por nome, do TAP da execução 3 — N com FORMA, não só número)

`impound-custody-history-db` (3):

1. listCustodyHistory: agrupa por identidade, ordena entered_at DESC NULLS LAST + created_at DESC, resolve yardName
2. listCustodyHistory: processo SEM identidade → só o próprio (custódia única), isCurrent=true
3. listCustodyHistory: ISOLAMENTO — processo de OUTRO tenant nunca aparece (where tenant-first + RLS)

`vehicle-identity-merge-db` (5):

1. merge REAL: ImpoundProcess.identity_id migrado para o alvo, evento com snapshot_before gravado
2. unmerge-admin REAL: reverte confidence/canonical mas NÃO reverte impound_processes.identity_id já movidos
3. unmerge-admin REAL: restaura a confidence ORIGINAL CONFIRMED (não rebaixa para PROVISIONAL) — item 3
4. findDuplicateCandidates REAL: outras identidades ATIVAS com a mesma placa via query real
5. updateIdentity REAL: PATCH de campo cosmético numa identidade MERGED → merged_identity_read_only (FOR UPDATE)

`work-order-checklists-freeze-links-db` (6):

1. congela SÓ o par (modelo, etapa) alvo — a outra etapa do MESMO modelo fica intacta
2. congela N linhas numa chamada só — o conjunto não sai do despacho pela metade
3. linha RETIRADA não é carimbada — o despacho não ressuscita o que o operador tirou do conjunto
4. alvo inexistente é ignorado em SILÊNCIO — sem erro e sem escrita (contrato da interface)
5. o ESPELHO da ordem não é tocado por esta escrita — quem o escreve é o freeze da primária
6. é tenant-scoped: a organização vizinha não carimba a vistoria desta (nem sabe que ela existe)

`work-order-checklists-sticky-db` (8):

1. [sticky no banco] o create grava ordem + conjunto + espelho na MESMA transação
2. [identidade com fase] o MESMO modelo em coleta e entrega convive; repetir a etapa estoura o unique parcial
3. [proveniência] o CHECK do banco recusa "resolved" sem regra e "manual" com regra
4. [ALTA 6 no banco] promoção preguiçosa: a ordem legada materializa a linha antes de receber a nova
5. [remoção soft] a linha retirada guarda quem/quando/por quê e LIBERA o par para voltar depois
6. [ALTA 7a no banco] o campo antigo com 2 vistorias vivas é recusado e não deixa rastro
7. [ALTA 7b no banco] o duplicate copia o conjunto vivo com etapa e posição preservadas
8. [isolamento] a junção é tenant-scoped: outra organização não enxerga nem altera o conjunto

Veredito parcial: **3 de 3 execuções limpas nas quatro suítes.**

## F2.7 — CONTROLE: a classe verde-cego é real (medida, não citada)

O item 2 do bloco existe porque essas 4 suítes, hoje fora da lista curada, **pulam em silêncio** se o env
quebrar, e o job fica verde. Re-verifiquei isso por EXECUÇÃO (a afirmação do §2.2 do plano estava marcada
"a re-verificar", não é fato herdado):

```
$ echo "DATABASE_URL herdado do perfil = [${DATABASE_URL:-<vazio>}]"
DATABASE_URL herdado do perfil = [<vazio>]     # nenhuma herança de shell/profile poluindo a medição
$ env -u DATABASE_URL node --test --import tsx tests/<suite>.test.ts
```

| suíte | exit | tests | pass | fail | skipped |
|---|---|---|---|---|---|
| `impound-custody-history-db` | **0** | 1 | 0 | 0 | **1** |
| `vehicle-identity-merge-db` | **0** | 1 | 0 | 0 | **1** |
| `work-order-checklists-freeze-links-db` | **0** | 1 | 0 | 0 | **1** |
| `work-order-checklists-sticky-db` | **0** | 1 | 0 | 0 | **1** |

Confirmado na fonte (o gate é o mesmo nas quatro): `const connectionString = process.env.DATABASE_URL;` e,
na ausência dela, um único `test(..., { skip: "Set DATABASE_URL, start PostgreSQL and run migrations..." })`.

Veredito parcial: **exit 0 com 22 casos virando 4 pulos** — é exatamente a classe que a lista curada e o
guard de zero pulos (`ci.yml` l.204–209) existem para punir. O motivo do item 2 se confirma por execução.

## F2.8 — Prova de que a medição bateu no banco DESCARTÁVEL (e não em outro)

```
$ docker exec san2-2-pg psql -U postgres -d erp_techsolutions -tAc \
  "select relname||' inserts='||n_tup_ins||' deletes='||n_tup_del from pg_stat_user_tables where relname in (...)"
impound_processes inserts=36 deletes=36
tenants inserts=70 deletes=51
third_party_vehicle_identities inserts=42 deletes=42
work_order_checklists inserts=81 deletes=42

$ ... -tAc "select count(*) ..."
tenants=1  work_order_checklists=0  impound_processes=0  third_party_vehicle_identities=0
```

Leitura honesta: o contador **cumulativo** de inserts prova que as três rodadas escreveram **neste** cluster
(porta 56432) — não em `erp-postgres`; e o `count(*)` atual mostra que as suítes **fazem teardown** (as
tabelas de negócio voltaram a zero; `tenants=1` é o do seed). **Não** reconcilio 1:1 `inserts - deletes` com
o `count(*)`: `pg_stat_user_tables` é contador cumulativo e aproximado (cascatas, amostragem), e essa
reconciliação não é insumo do meu mandato — registro a divergência em vez de escondê-la. O que importa está
provado: houve escrita real no descartável, e o banco não acumula lixo entre execuções (é por isso que o
denominador ficou constante nas 3 rodadas).

## F2.9 — VEREDITO DA FASE 2

**As 4 suítes são ELEGÍVEIS** para entrar na lista `SUITES` do job `backend-postgres` pelo critério do
§3.2(b): **0 falhas e 0 pulos nas 3 execuções**, nas condições exatas do job (`CORE_SAAS_PERSISTENCE=prisma`,
`RBAC_DB_PARITY=1`, `JWT_SECRET`/`JWT_EXPIRES_IN`/`LOG_LEVEL` do job, banco descartável migrado + semeado).
**Zero intermitência observada** — as três rodadas deram números idênticos, caso a caso.

| suíte | r1 (pass/tests · skip) | r2 | r3 | elegível? |
|---|---|---|---|---|
| `tests/impound-custody-history-db.test.ts` | 3/3 · 0 | 3/3 · 0 | 3/3 · 0 | **SIM** |
| `tests/vehicle-identity-merge-db.test.ts` | 5/5 · 0 | 5/5 · 0 | 5/5 · 0 | **SIM** |
| `tests/work-order-checklists-freeze-links-db.test.ts` | 6/6 · 0 | 6/6 · 0 | 6/6 · 0 | **SIM** |
| `tests/work-order-checklists-sticky-db.test.ts` | 8/8 · 0 | 8/8 · 0 | 8/8 · 0 | **SIM** |

Efeito esperado na lista quando o PRÓXIMO mandato editar o `ci.yml`: **23 → 27 suítes**, +22 casos sob o
guard de zero pulos. Eu **não** editei o `ci.yml` — não é meu mandato.

### Achado desta fase (não é obstáculo contornado, é fato para a ata)

**`P-SAN2-2-PORTA-55432-RESERVADA` (BAIXA · escopo: `pre-existente` — terreno da máquina, não do bloco).**
A porta **55432**, prescrita no mandato e no §6 do plano, **não está livre nesta máquina**: cai na faixa
**55353–55452** que o Windows/Hyper-V reserva (`netsh interface ipv4 show excludedportrange protocol=tcp`).
Nenhum processo consegue fazer bind — o erro do Docker não é "porta ocupada por outro processo". Medida
tomada: Postgres descartável em **56432** (Redis ficou em 56379, como planejado); nomes de container
inalterados. Nada no `ci.yml` nem no produto depende dessa porta: o job do CI usa 5432 nos service containers
do runner. Quem repetir esta medição noutra máquina deve **conferir a faixa excluída antes**, não presumir
que "porta alta = porta livre".

## F2.10 — Estado final do ambiente (LEIA ANTES DA FASE 5)

**OS CONTAINERS FICAM DE PÉ** — a Fase 5 vai reusá-los, como o mandato determina:

```
san2-2-pg      Up   0.0.0.0:56432->5432/tcp   postgres:16   (erp_techsolutions migrado + semeado)
san2-2-redis   Up   0.0.0.0:56379->6379/tcp   redis:7
```

**Atenção da Fase 5:** a porta do Postgres é **56432**, não 55432 (F2.1.a). O `DATABASE_URL` a usar é
`postgresql://postgres:postgres@localhost:56432/erp_techsolutions?schema=public`. E o §6 Fase 5 do plano
manda **recriar** o par limpo (`docker rm -f san2-2-pg san2-2-redis` → subir de novo → `migrate deploy`,
SEM seed) — quem fizer isso repita a porta **56432**, não a do plano.

`erp-postgres` / `erp-redis` seguem **de pé e intocados** (37h de uptime, `healthy`): nenhum comando desta
fase apontou para 5432/6379, e o worktree não tem `.env` que pudesse redirecionar para lá.

**TAPs desta fase** (evidência bruta: 4 suítes × 3 rodadas + 4 controles = 16 arquivos) em
`<scratchpad>/san2-2/*.tap` — fora da árvore do repo, sujeitos à faxina §C5 da Fase 5.

**Diff que este mandato produziu: apenas este diário.** `ci.yml`, `src/**`, `tests/**`, `Kpis/**` e contratos
**intocados**; nada commitado.

## Edição do `ci.yml` — registro pelo ORQUESTRADOR (o dev caiu antes do P1)

> **Proveniência declarada.** A edição é do `dev-san2-2` (15ª queda do dia — `server_error` na frase
> "everything checks out, now the P1 registration"). O **diff é dele**; esta seção é o registro do que ficou
> na árvore, medido pelo orquestrador. Não é verificação de mérito: a junta julga o diff, e a cadeira **C2**
> (`curador-da-lista-suites-ci`) re-executa por conta própria.

### O que ficou no `ci.yml`

4 linhas novas na lista `SUITES` do job `backend-postgres`, precedidas de um comentário de 5 linhas que
registra **por que cada uma entrou** (medida antes: 3 execuções, 0 falha e 0 pulo, denominador constante
3+5+6+8 = 22 casos), mais um bloco `LUGAR RESERVADO` de 4 linhas para a suíte de corrida do financeiro.

### Medições do orquestrador sobre o resultado

```
grep -c 'SUITES=' ci.yml                                           → 27      (era 23)
grep 'SUITES=' | grep -oE 'tests/…\.test\.ts' | sort -u | wc -l    → 27      (sem duplicata)
grep 'SUITES=' | grep -c financial-entry-delete-reverse-race       → 0       (só no comentário)
git diff ci.yml | grep -iE '^[+-].*(skipped|pulad)'                → vazio   (guard intacto)
python -c "yaml.safe_load(...)"                                    → OK, 7 jobs
```

**Os quatro pontos do mandato batem:** lista 23 → 27 · a suíte do financeiro NÃO entrou e o lugar dela está
comentado com o dono certo (PR do B-O6R-02) · o guard anti-verde-cego não foi tocado · o passo do espelho da
Fase 1 (job `backend`) segue intacto.

### Nota de âncora — o plano estava errado e a correção do crítico se confirmou

O §3.2 do plano mandava inserir "após a l.202". A l.202 é `auth-login-candidates-fn-db.test.ts`, **no meio
do bloco de auth**; o bloco `SUITES=` vai até a **l.207** (`rls-tenant-isolation.test.ts`). A inserção foi
feita **após a 207**, como o crítico mediu. Inserir na 202 teria funcionado por acaso e quebrado o
agrupamento — e a ata registraria uma âncora que não existe.

### Pendente desta fase

- Validação de **schema de Actions** não foi feita (não há `actionlint` na árvore) — declarado, não presumido.
- Os containers `san2-2-pg` (**56432**) e `san2-2-redis` (**56379**) seguem **DE PÉ** para a Fase 5.
