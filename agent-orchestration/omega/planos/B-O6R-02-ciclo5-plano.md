# PLANO B-O6R-02 — ciclo 5 (TETO do §C7.4) · a junta ampliada replaneja a fatia: o NÚMERO passa a sobreviver à forma

**Papel:** `planejador-mestre`, instância NOVA, em Fable por contrato (`D-PLANEJADOR-MODELO-FABLE` — revalidação pós-correção, Fable obrigatório). O planejador do ciclo 4 é inelegível. Não achei defeito, não desenvolvo, não voto, não sou porteiro. Encerro a participação ao entregar este plano.
**Insumos lidos por inteiro:** ata `J-B-O6R-02-ciclo4.md` (com a ERRATA), relatório do achador `R-B-O6R-02-ciclo4.md` (com a ERRATA), os 5 votos verbatim (`votos/B-O6R-02-ciclo4/01..05`), `pendencias.md` (P-O6R-B02 ciclo 4 + as nove `P-O6R-B02-*` + `P-O6R-ARNES-ISOLAMENTO` com emendas dos ciclos 3 e 4), planos dos ciclos 3 e 4, `R-B-O6R-02-ciclo3-premissa.md`, `PD-O6R-B02-EXAUSTIVIDADE`, `CLAUDE.md` §C7 (1-bis/4/4-bis/6), `D-JUNTA-SEPARACAO-DE-PAPEIS`, `D-INSPETOR-TERRENO-JUNTA`, e o código do head no worktree `plan-c5` (§0).
**Branch:** `feat/o6r-b02-financial-uow` · head a replanejar **`12c3825`** · base `origin/main` = **`6efe5ad`** (re-medido agora: `origin/main` NÃO moveu; `5e321ac` NÃO é ancestral de `origin/main` — consequência no S0, §8).
**A ORDEM DO DONO (2026-08-25), que governa:** *"faça direito para só fazer uma vez. acabe com esses bugs."* E a frase que reprovou quatro ciclos: *"os defeitos estão fechados; a classe que os gerou, não."* Este plano é escrito contra as duas.

**Objetivo:** o dinheiro já não fabrica em camada nenhuma (confirmado por 3 cadeiras — B-1 FECHADO). O que falta é o que o veto do arnês nomeou: **o número que o PR publica tem de sobreviver à forma em que foi medido** — canônica 3 verde em N=10 de N=10, denominador idêntico nas 10, vaza-metro zerado, e cada afirmação de contrato sustentada pelos triggers **e pela FK** que a execução prova.
**Ator:** desenvolvedor único, instância NOVA nominalmente designada antes de qualquer código (§13.1), sob `D-INSTANCIA-NOVA-COM-AUDITORIA`.
**Fluxo origem→destino:** este plano → ataque do `critico-c5-adversarial` ao PLANO (máx 2 rodadas) → S0 (orquestrador) → auditoria do dev (§13.1) → fatias F1–F6 → bateria §9 + drills D29–D36 → `inspetor-de-terreno-da-junta` → junta ampliada 7 cadeiras (mérito unânime) → PR (gate `G-A109FD7-PUBLICADO`) → porteiro. Se ESTA junta reprovar: **parada + dossiê ao dono** (§C7.4 — não há ciclo 6).

---

## §0 · AUDITORIA POR EXECUÇÃO (feita ANTES do produto; saídas transcritas)

Arranjo: worktree **`.claude/worktrees/plan-c5`** detached em `12c3825` (preparado pelo orquestrador; conferi eu mesmo: `git status --porcelain` = 0 linhas ANTES e DEPOIS; `hash-object` = blob do head em `financial-entry-undo-owners.ts` `e352c6c…`, `financial-entry.service.ts` `9be7caf…`, `auth-identity-fixture.ts` `131eb0e…`, `audit-security.test.ts` `ba85452…`, `run-backend-tests.mjs` `28a589b…` — 5/5 iguais também ao fim). Node **v20.19.5**. Clusters descartáveis PRÓPRIOS: `plan-c5b-pg` (postgres:16, :55801, 105 migrations via `migrate deploy` ec=0), `plan-c5b-pg2` (:55802, idem — a sonda crua NÃO roda no mesmo cluster da bateria, para não contaminar o N), `plan-c5b-redis` (:56801). Exit sempre por variável; saída sempre em arquivo no scratchpad. Base viva `erp-postgres`/`erp-redis`: **zero comandos, nem leitura**. Zero mutação de arquivo rastreado (toda sonda em scratchpad/cluster). Teardown executado e conferido ao final (linha de limpeza no rodapé).

### 0.a · A classe `XX000` REPRODUZIDA, e o objeto disputado NOMEADO por execução

**Forma barata declarada:** `node scripts/run-backend-tests.mjs` sobre os **6 arquivos suspeitos** (`tests/audit-security.test.ts`, `tests/auth-identity-backfill-db.test.ts`, `tests/auth-identity-links-db.test.ts`, `tests/rls-tenant-isolation.test.ts`, `tests/vehicle-identity-schema.test.ts`, `tests/impound-process-checklist-link-schema.test.ts`), `DATABASE_URL` → :55801, `REDIS_URL` → :56801, `CORE_SAAS_PERSISTENCE` não exportada (runner declara memory), Node v20.19.5, **N=13 rodadas sequenciais** (~64 s cada), logs `xx000-r01..r13.log`:

```
r01..r04, r07, r10..r12  ec=0  tests=37  xx000=0        (8/13 verdes)
r05  ec=1  tests=37  XX000 em tests/vehicle-identity-schema.test.ts
r06  ec=1  tests=37  XX000 em tests/vehicle-identity-schema.test.ts
r08  ec=1  tests=37  XX000 em tests/audit-security.test.ts (not ok 1, $executeRawUnsafe)
r09  ec=1  tests=37  XX000 em tests/rls-tenant-isolation.test.ts   <== TOMA o lock
r13  ec=1  tests=32  XX000 em tests/auth-identity-backfill-db.test.ts <== TOMA o lock; DENOMINADOR CAIU 37→32
```

Três fatos que a ata não tinha: (i) a classe reproduz **sem** a canônica 3 inteira — 6 arquivos bastam, 5/13 vermelhos; (ii) **o `XX000` atinge também quem TOMA o lock** (r09, r13): serialização parcial não protege nem os serializados — o erro cai em quem perde a tupla; (iii) a r13 reproduziu o **B-2c4** na forma barata (arquivo aborta, 5 testes somem, total plausível).

**Sonda crua no cluster 2 (nomeia o objeto):** 2 conexões dedicadas, pares de statements simultâneos (`Promise.allSettled`), contagem de SQLSTATE por par (`catprobe-out.log`):

```
P1  GRANT USAGE ON SCHEMA public × idem (grantees distintos)   iters=200  XX000=200/200
P2  GRANT ... ON ALL TABLES × DROP OWNED BY                    iters=40   XX000=40/40
P4  DROP OWNED BY × GRANT USAGE ON SCHEMA public (o par da ERRATA) iters=200  XX000=200/200
P3  CREATE ROLE × CREATE ROLE (nomes distintos) — CONTROLE     iters=150  erros=0
```

**O objeto disputado, nomeado:** a **tupla de ACL** — a linha única de `public` em **`pg_namespace.nspacl`** e as linhas de **`pg_class.relacl`** das 115 tabelas. **`pg_authid` NÃO colide** (P3 = 0/150). A ERRATA está confirmada por execução: um plano que serializasse só o `CREATE ROLE` serializaria o statement errado. Sob sobreposição real a colisão é ~determinística (200/200) — a taxa baixa na canônica 3 é só janela temporal.

**Vaza-metro após as 13 rodadas (cluster 1):** roles não-sistema = **1 órfã `audit_rls_1787913759824_…` com LOGIN** (o teardown de `audit-security` morreu no próprio `XX000` da l.158 → o `DROP ROLE` da l.159 nunca rodou — B-3c4 reproduzido). `auth_identities` = **0** e `link_events` = **0**: o vazamento linear (+5/rodada) **NÃO reproduziu na minha forma de 6 arquivos** — o produtor está FORA delas (coerente com a atribuição de 2026-08-19 a `core-saas-role-authority-db`); registrado como **[A ATRIBUIR pelo dev, §13.1(f)]**, não como fato meu.

### 0.b · O runner com denominador menor SEM skip (D26b) — e uma assinatura NOVA, medida

Fixture-dir no scratchpad: `a.test.ts` (1 teste real) + `b.test.ts` (lê `DATABASE_URL` e sai limpo **sem registrar teste**). `node scripts/run-backend-tests.mjs <dir>` com `DATABASE_URL` presente → **ec=0**, `2 arquivo(s) · 2 teste(s) · pass 2 · skipped 0`, guard mudo. O buraco do B-2c4/A8 confirmado. **Fato novo, medido no TAP:** no Node 20.19.5, arquivo que registra **zero** teste vira **1 ponto de teste top-level "ok" NOMEADO PELO CAMINHO DO ARQUIVO** (`ok 2 - …/b.test.ts`; `# suites 0`); arquivo com testes NÃO ganha ponto de arquivo. É por isso que a suíte -db de 6 testes que some vira 2745−6+1=**2740** — e é uma **assinatura detectável**: ponto top-level cujo nome é um dos caminhos expandidos = arquivo que não registrou nada. (Fato à disposição do dev; o mecanismo é dele.)

### 0.c · `sync-agent-agents --check` sobre o conteúdo EXATO do head — **DIVERGÊNCIA com a ata: 25, não 15**

`git archive 12c3825 .claude/agents .agents/agents scripts/sync-agent-agents.mjs` → scratch → `node scripts/sync-agent-agents.mjs --check` → **ec=1 com 25 DIVERGE** (22 agentes-base + 3 especialistas; log integral guardado). A ata/A7 diz 15 ("12+3") — **planejo sobre o que medi: 25**. Na MESMA cópia de scratch: `node scripts/sync-agent-agents.mjs` (modo escrita) → ec=0, *"espelhados 25 agentes"* → `--check` → **ec=0, "OK — 25 agentes, espelho consistente"**. Ou seja: **o S0 fecha no head SEM rebase** (§8). Medido também: `origin/main` = `6efe5ad` (não moveu; o merge-base é o próprio) e `5e321ac` **não** está em `origin/main` — o "rebase sobre a base com 5e321ac" do plano do ciclo 4 era inexequível contra `origin/main`; o fix do espelho vive em branch local, não na main.

### 0.d · `reversal_of` sem FK; DELETE físico ausente do produto; e o CUSTO da FK, provado

Greps no head: **0** `REFERENCES`/`FOREIGN KEY` sobre `reversal_of` em `prisma/migrations/**`; **0** DELETE físico de `financial_entries` em `src/**` (os únicos `.delete(` são a rota HTTP → `service.delete` → soft-delete, e o `Map.delete` do repositório de memória). Índice único **`financial_entries_tenant_id_id_key (tenant_id, id)` JÁ EXISTE** (migration `20260812000000`, conferido em `pg_indexes` do cluster 2) — a FK composta **não exige índice novo**. Sonda executada no cluster 2 (`fkprobe-out3.log`):

```
ALTER TABLE ... ADD CONSTRAINT probe_reversal_fk FOREIGN KEY (tenant_id, reversal_of)
  REFERENCES financial_entries (tenant_id, id) ON DELETE RESTRICT ON UPDATE RESTRICT NOT VALID;  → ec=0
ALTER TABLE ... VALIDATE CONSTRAINT probe_reversal_fk;                                           → ec=0
par vivo semeado (out 100 + estorno in 100) →
  (v)  DELETE físico do original com estorno vivo  → RECUSADO pela FK  (no head: ACEITO, SALDO=100)
  (vii) UPDATE id (rename da PK) do original       → RECUSADO pela FK  (no head: ACEITO, contrapartida pendurada)
teardown idiomático de teste (DELETE do par inteiro em 1 statement)   → DELETE 2, funciona
limpeza: DROP CONSTRAINT + delete escopado → ec=0
```

A guarda é **barata e real**. Consequência no A1: §2-A1 decide **FK + texto**, não texto sozinho.

### 0.e · O teste `[RLS]` roda como superuser — confirmado (forma barata: leitura + catálogo)

`tests/financial-entry-delete-reverse-race-db.test.ts:264` usa o MESMO client do harness (conexão da `DATABASE_URL`); medido no meu cluster: `postgres` tem `rolsuper=t, rolbypassrls=t`. O `setTenantRlsContext` seta o GUC, mas a role atravessa a RLS — o título afirma o que a execução não exercita. Não re-executei o "passa com triggers derrubados" do jurado de banco (fora da forma barata; o vermelho-controle do D34 o re-prova — §7).

### 0.f · Itens "a conferir" da ERRATA (medidos por leitura, declarado)

O runner **não fixa `--test-concurrency`** (lido no arquivo inteiro — nenhuma ocorrência; paralelismo = default `availableParallelism()−1`; fixá-lo é **P1 do bloco irmão**, fora daqui). `ci.yml`: o step que canaliza para `tee` (l.222) tem **`set -o pipefail` na l.164 do MESMO bloco `run`** — o exit do `node --test` sobrevive ao pipe; medição por leitura, não por execução (juiz residual: `P-O6R-B02-SUITES-LIST-CI`, bloco seguinte).

**Nenhum bloqueante da ata caiu na auditoria.** Divergências entre o que medi e o que a ata diz, registradas: (i) A7 = **25** DIVERGE, não 15; (ii) o vazamento +5/rodada não reproduz na forma de 6 arquivos (produtor fora delas); (iii) o `XX000` atinge inclusive suítes que tomam o lock — a propriedade não é "os 3 de fora entram no lock" e sim "**TODOS os escritores num mecanismo único**".

---

## A DELIBERAÇÃO POR ESCRITO (§C7.4 ciclos 4–5 — a junta ampliada ratifica)

**Compare-se (A) fechar a classe DENTRO do B-O6R-02 · (B) destacar bloco `B-O6R-ARNES` e publicar o número com N honesto · (C) híbrido.**

| Opção | Aceite | Custo | Risco |
|---|---|---|---|
| **(A) tudo dentro** | canônica 3 10/10 E as 9 propriedades P1–P9 do `P-O6R-ARNES-ISOLAMENTO` fechadas | expandir §5 para 6+ suítes de 4 trilhas, `ci.yml`, DDL de esquema (P4), paralelismo (P1), 3 formas de execução | escopo de um bloco inteiro DENTRO do teto do protocolo; a decisão de escopo registrada em `R-B-O6R-01-ciclo3-premissa` (bloco irmão) seria revogada de carona |
| **(B) só publicar honesto** | número publicado com N=10, forma e causa nomeada (7/10, `XX000` classe `P-O6R-ARNES-ISOLAMENTO`) | ~zero código | o veto do arnês foi a *número sem N*, não a *número imperfeito declarado* — MAS a ordem do dono é "acabe com esses bugs", os produtores estão TODOS mapeados (§0.a), o mecanismo JÁ EXISTE (`withRoleCatalogLock` + ratchet), e o custo de fechar é pequeno; deixar 3/10 vermelho documentado no teto do protocolo é entregar um flake carimbado |
| **(C) HÍBRIDO — escolhida** | fechar AQUI o que os produtores medidos DENTRO da canônica 3 exigem (3 escritores fora do lock entram no mecanismo único; teardown resiliente; sweep de família; piso de denominador no runner que o C5.3 já toca; produtor da trilha de identidades adota teardown escopado) + FK do A1 + RLS real do A2 + registros A3–A6 + S0/A7; e **destacar para o bloco irmão** o que é do ARRANJO, não deste número | §5 cresce 6 arquivos de teste (nomeados, cirúrgicos) + 1 migration aditiva; `src/**` **intocado**; `ci.yml` **intocado** | mexer em 3 suítes pré-existentes (a bateria integral é o juiz); VALIDATE da FK falha em base com referência pendurada (fail-closed correto; §11) |

**Escolho (C).** Por quê: os três vermelhos de N=10 nasceram de exatamente **3 arquivos que escrevem ACL fora do mecanismo** + 1 teardown não-resiliente — tudo mapeado por execução minha, com o mecanismo e o detector (ratchet) já entregues por ciclos anteriores; fechar isso é pequeno, mecânico e mata a causa do veto. **O que a escolha NÃO resolve (fica nomeado no bloco irmão `P-O6R-ARNES-ISOLAMENTO`):** P1 (paralelismo declarado — o runner segue sem `--test-concurrency`), P4 (DDL de esquema compartilhado — o `ALTER TABLE … RENAME` de `checklist-applicability`), a divergência das TRÊS formas de execução (seed/detrito), as **68 órfãs `rls_test_`** e demais prefixos legados na base do dono, o teto da fila do lock, o vermelho ambiental da canônica 1 (`core-saas-role-authority` sem `DATABASE_URL`), e a inclusão da suíte -db na lista SUITES (`P-O6R-B02-SUITES-LIST-CI`, `ci.yml` PROIBIDO — justificativa: é o gate de TODOS os PRs, o pipefail já contém o risco do `tee` (§0.f), a suíte já roda na CI pelo job `backend` via canônica 3, e uma linha a mais de superfície de falha não entra no ciclo-teto).

---

## §1 · As PROPRIEDADES — cada uma com o drill que a julga

> Regra herdada e mantida: **o drill só conta se ficar vermelho na mutação e verde no restore.** Baseline medido na hora é parte do drill. Verde durante a quebra invalida o drill e reabre o ciclo.

> **P10 — mecanismo único de escrita de catálogo (fecha B-1c4):** *nenhum arquivo de teste escreve ACL/catálogo de cluster fora do mecanismo único (`withRoleCatalogLock`); a canônica 3 sai verde em **10/10 de N=10** com 0 `XX000`.* Juízes: **D29** (bateria barata dos 6 arquivos, N≥13, 0 XX000; vermelho-controle = minha tabela §0.a no head) e **D30** (sonda de barreira sob mutação).
> **P11 — denominador fixado por execução (fecha B-2c4/A8):** *arquivo expandido que termina sem registrar teste e sem declarar skip é ERRO nomeando o arquivo — nunca ec=0 com total menor.* Juiz: **D32** (o D26b vira vermelho); a assinatura medida no §0.b está à disposição do dev.
> **P12 — vaza-metro zerado (fecha B-3c4):** *(i) role efêmera cuja sequência falha NO MEIO não sobrevive à execução (teardown resiliente por statement + família no sweep com corte de idade); (ii) rodada VERDE da canônica 3 não muda contagem de roles nem de linhas — ou o produtor é NOMEADO por execução.* Juízes: **D31** e **D33**.
> **P13 — o par não se separa NEM por escritor cru (fecha A1 pela guarda, não só pelo texto):** *DELETE físico do original com estorno vivo e rename da PK são recusados POR CONSTRUÇÃO (FK composta em `reversal_of`), provado nas duas direções (recusa com FK; aceitação no down = vermelho-controle).* Juiz: **D35**.
> **P14 — título de teste só afirma o que a execução exercita (fecha A2):** *o caso `[RLS]` roda sob role `NOBYPASSRLS` com RLS forçada e fica VERMELHO com os triggers derrubados.* Juiz: **D34**.
> **P-REGISTRO (fecha A3–A6):** divergências de drill em `pendencias.md` (feito em `P-O6R-B02-DIVERGENCIA-D27-D21` — conferir, não reescrever); canônicas 1 e 2 publicadas com N; status/log reconciliados; censo de legado com caso permanente.

## §2 · Correções — por bloqueante e por ajuste (propriedade + critério; o COMO é do dev)

**B-1c4 → C6 (P10):** os **3 escritores fora do mecanismo** (`tests/audit-security.test.ts`, `tests/vehicle-identity-schema.test.ts`, `tests/impound-process-checklist-link-schema.test.ts`) passam a executar TODA a sua sequência de catálogo (CREATE ROLE/GRANTs/DROP OWNED/DROP ROLE) dentro do mecanismo único do arnês, em **janelas curtas** (setup e teardown; nunca segurando o lock durante o corpo do teste — o timeout de 30 s do lock é orçamento, não convite). O arnês (`tests/helpers/auth-identity-fixture.ts`) registra as famílias novas no sweep (padrão de nome com timestamp + corte de 60 min, como hoje; prefixo alheio NÃO registrado segue intocável). O ratchet (`tests/db-catalog-write-guard.test.ts`) tem as contagens/razões atualizadas **conscientemente** (as razões "fora do lock — destino P-O6R-ARNES-ISOLAMENTO" morrem). Critério: D29 verde (0 XX000, N≥13) + canônica 3 §9.3.
**B-2c4/A8 → C7 (P11):** `scripts/run-backend-tests.mjs` ganha o detector de **arquivo-que-some** (monotônico, como os três guards existentes) e passa a **publicar o denominador** na linha de sumário por execução. `tests/npm-test-runner-guard.test.ts` ganha ≥2 casos por fixture-dir (arquivo que some sem skip → vermelho nomeando o arquivo; controle verde). Critério: D32.
**B-3c4 → C8 (P12):** teardown de role efêmera **resiliente por statement** (a falha de um statement de limpeza não engole os seguintes — o `DROP ROLE` roda mesmo com `DROP OWNED` falho) nos 3 escritores e no arnês; famílias no sweep (C6). Para o vazamento linear: o dev **atribui por execução** (§13.1(f)) e, se o produtor for `tests/core-saas-role-authority-db.test.ts` (atribuição prévia de 2026-08-19), o teardown daquela suíte adota o idioma escopado do arnês (`cleanupIdentityFixture`); produtor FORA da §5 → registra com nome, não conserta. Critério: D31 + D33 (Δ roles = 0 e Δ linhas = 0 nas rodadas verdes, ou produtor nomeado na publicação).
**A1 → C9 (P13):** **FK composta** `(tenant_id, reversal_of) → financial_entries(tenant_id, id)` `ON DELETE RESTRICT ON UPDATE RESTRICT`, em migration NOVA aditiva (`NOT VALID` + `VALIDATE`; custo provado §0.d; índice único alvo já existe) **+ correção do TEXTO**: `API_CONTRACTS.md` re-versiona `financial_entry_undo@<data>.b-o6r-02-c5` e o parágrafo de concorrência passa a afirmar o que triggers+FK sustentam, nomeando o limite real que resta (edições cruas fora da classe do par: `UPDATE amount`/`account_id`, DELETE físico da contrapartida — medidos pelo ataque do c4, nenhum desenho de par os fecha). O cabeçalho da migration `20260870000000` NÃO é editado (migration existente é intocável) — o texto vivo é o contrato. ≥2 casos permanentes de SQL cru na suíte -db: (v) e (vii) recusados. Critério: D35; **ordem interna ao PR: o texto do contrato entra DEPOIS de D35 verde.**
**A2 → C10 (P14):** o caso `[RLS]` da suíte -db reformulado para rodar sob role efêmera `NOBYPASSRLS` com RLS forçada (o arranjo que o jurado de banco provou à mão), **via o mecanismo do arnês** (é escrita de catálogo — entra no lock e no ratchet). Critério: D34 (vermelho com triggers no down; verde no re-up).
**A3:** conferir que `P-O6R-B02-DIVERGENCIA-D27-D21` cobre as duas divergências (já registrada em 2026-08-28) — nada a reescrever; a ata do ciclo 5 referencia.
**A4:** canônicas 1 e 2 EXECUTADAS e PUBLICADAS pelo dev com N e forma (§9.2/§9.6) no KPI.
**A5:** `status-geral.md` + `log-execucao.md` reconciliados (REPROVADO do ciclo 4, autoria do ciclo 5); `P-O6R-B02-SUITES-LIST-CI` já existe — manter aberta com dono nomeado (bloco seguinte).
**A6:** 1 caso permanente -db que semeia órfão (idioma `session_replication_role='replica'`, tenant próprio) e exercita o censo da migration `20260870` observando o WARNING nomeado; teardown escopado.
**A7/S0:** do ORQUESTRADOR, antes de qualquer código (§8) — provado em scratch no §0.c.

## §3 · Contrato REST — delta

**Nenhuma rota, código HTTP ou reason novo.** 404 cross-tenant antes de regra, 422 de transição, 409 de duplicidade: byte a byte como estão (re-conferidos pela bateria). Delta = texto do C9 (re-versionamento datado + amarração por nome às suítes, mantendo a regra "contrato nunca à frente da execução").

## §4 · Modelagem

**UMA migration nova, aditiva pura:** `prisma/migrations/<timestamp>_add_reversal_pair_fk/migration.sql` — censo `DO` prévio de **referências penduradas** (`reversal_of` apontando `(tenant_id,id)` inexistente; se >0, `RAISE EXCEPTION` nomeando `P-O6R-B02-ORFAOS-LEGADOS` — abortar SEM mutar é fail-closed; higiene é decisão humana §C7.5) → `ADD CONSTRAINT … NOT VALID` → `VALIDATE CONSTRAINT`; down documentado no rodapé (`DROP CONSTRAINT`); drill up→down→re-up (D35). **`prisma/schema.prisma` NÃO muda** (precedente da casa: índice parcial e triggers vivem só na migration). Nenhuma coluna/índice novo (o único alvo, `financial_entries_tenant_id_id_key`, já existe — §0.d). Dinheiro segue Decimal; timestamptz; delete segue lógico. **Autorização explícita de `prisma/migrations/**` = criação de UMA pasta nova; migrations existentes intocáveis.**

## §5 · Arquivos exatos

**Desenvolvedor — tests/scripts:** `tests/audit-security.test.ts` · `tests/vehicle-identity-schema.test.ts` · `tests/impound-process-checklist-link-schema.test.ts` (C6/C8 — *justificativa da expansão, item a item: são os 3 únicos escritores de ACL fora do mecanismo, produtores medidos dos vermelhos §0.a/B-1c4; o próprio cabeçalho do arnês os nomeia como "destino: bloco irmão", e esta é a revogação CONSCIENTE e mínima dessa nota, deliberada acima*) · `tests/helpers/auth-identity-fixture.ts` (C6/C8 — famílias do sweep + teardown resiliente + o que as 3 suítes importarem) · `tests/db-catalog-write-guard.test.ts` (C6 — allowlist consciente) · `tests/core-saas-role-authority-db.test.ts` (C8 — SÓ se a atribuição §13.1(f) o confirmar; senão, fora) · `scripts/run-backend-tests.mjs` (C7) · `tests/npm-test-runner-guard.test.ts` (C7) · `tests/financial-entry-delete-reverse-race-db.test.ts` (C9 casos FK + C10 RLS real + A6 censo).
**Desenvolvedor — migration/docs/registro (mesmo PR):** `prisma/migrations/<timestamp>_add_reversal_pair_fk/migration.sql` (NOVA) · `API_CONTRACTS.md` (C9) · `Kpis/kpis-latest.json`, `Kpis/kpis-history.json`, `Kpis/kpis-history.md`, `Kpis/index.html` (§C3; `pr`/`merge_commit`/`approved_head` null na autoria) · `agent-orchestration/docs/status-geral.md` · `agent-orchestration/codex/log-execucao.md` (A5) · `agent-orchestration/controle/pendencias.md` (§12) · `docs/revisoes/O6R/achados.jsonl` + `REGISTRO_ACHADOS_O6R.md` (status pós-junta; quem registra não vota).
**Orquestrador (S0, fora do dev):** na branch, `node scripts/sync-agent-agents.mjs` (modo escrita) + commit + `--check` sobre `git archive HEAD` = ec=0 (provado §0.c; **SEM rebase** — `origin/main` não moveu); designação nominal do dev; convocação de fábrica/crítico/inspetor.
**PROIBIDO:** **`src/**` INTEIRO** (o B-1 está fechado — nenhuma linha de produto muda neste ciclo; qualquer diff em `src/` = violação) · qualquer outro `tests/**` · `.github/workflows/ci.yml` · `prisma/schema.prisma` · migrations EXISTENTES (inclusive o cabeçalho da `20260870000000`) · `CLAUDE.md`/`AGENTS.md` (diff 0 contra origin/main é critério) · `.env` · lockfiles · `infra/**` · frontend · mobile · RBAC · `mvp_*` · cherry-pick de `a109fd7` · junction/symlink de `node_modules` · `git checkout/stash/clean/reset --hard` na árvore principal · heredoc de shell para conteúdo de arquivo. **Arquivo fora das listas → o dev PARA e devolve.**

## §6 · Baseline N e meta M (pisos vinculantes)

Baseline (head, medido/confirmado): canônica 3 = 2745·2743·0·2 em **7/10** (arnês) — o número NÃO é estável; forma barata 6-arquivos = 37 testes em **8/13** (minha §0.a); D26b ec=0 (§0.b). Pisos do ciclo 4 (≥21 casos, ≥6 corrida, etc.): **entregues e confirmados — não se re-litigam**, só re-executam. Pisos NOVOS deste ciclo (casos permanentes):

| Propriedade | Piso |
|---|---|
| P10 | ≥1 caso -db de sonda de barreira do catálogo (par `DROP OWNED × GRANT` sob o mecanismo → 0 XX000 em N≥50) + ratchet com allowlist atualizada |
| P11 | ≥2 casos runner-guard (arquivo-que-some → vermelho nomeando; controle verde) |
| P12 | ≥1 caso de teardown resiliente/sweep por família nova + a publicação Δroles/Δlinhas por rodada na bateria |
| P13 | ≥2 casos SQL cru na suíte -db ((v) e (vii) recusados pela FK) + D35 |
| P14 | 1 caso `[RLS]` real (NOBYPASSRLS, RLS forçada) |
| A6 | 1 caso permanente do censo (WARNING com órfão semeado) |

**Total ≥8 casos permanentes novos.** Metas de bateria: canônica 3 **10/10 ec=0, denominador IDÊNTICO nas 10** (2745+Δ, Δ = casos novos, publicado); canônica 2 **15/15**, denominador constante; canônica 1 publicada com N≥3 (vermelho ambiental pré-existente declarado, não maquiado). Divergência publica o número real **e bloqueia se abaixo do piso**.

## §7 · Drills (numeração continua de D29) + re-execuções

Forma de todo drill: baseline verde medido na hora → mutação → vermelho com ec registrado → restore → `hash-object` = blob → verde re-medido → `git diff` sem resíduo.

| ID | Mutação/arranjo | Vermelho obrigatório | Prova de que não estava vermelho antes |
|---|---|---|---|
| **D29** | bateria barata dos 6 arquivos (§0.a), N≥13, sobre o código corrigido | 0 `XX000`, 13/13 ec=0, denominador idêntico | **vermelho-controle JÁ MEDIDO no head por mim: 5/13 com XX000 e 1 queda de denominador** (logs `xx000-r*.log`) |
| **D30** | no caso P10, remover o lock de UM lado da sonda | `XX000` em N≥50 iterações barrier-alinhadas; **0 em N≥50 = drill inconclusivo → reabre** | minha sonda P4: sem lock, 200/200 XX000 |
| **D31** | injetar falha no 1º statement do teardown de role (ex.: `DROP OWNED` de role inexistente) | nenhuma role viva ao fim (o resto do teardown roda); remover a resiliência → caso permanente vermelho | §0.a: hoje a falha na l.158 deixa a role viva (1 órfã com LOGIN medida) |
| **D32** | fixture-dir com arquivo que sai limpo sem registrar teste, `DATABASE_URL` presente | runner ec≠0 nomeando o arquivo | §0.b: hoje ec=0, `2 teste(s)`, guard mudo |
| **D33** | canônica 3 N=10 com snapshot de catálogo+linhas antes/depois por rodada | Δroles=0 em TODAS; Δlinhas=0 nas verdes OU produtor nomeado na publicação | arnês c4: 2 órfãs + +5/rodada; minha §0.a: 1 órfã |
| **D34** | triggers no down (rodapé da 20260870) no cluster do drill | o caso `[RLS]` reformulado fica VERMELHO; re-up → verde | banco c4: o caso atual ficou VERDE com triggers derrubados (ok 6) |
| **D35** | migration FK: up → down → re-up; sondas (v)/(vii) com FK e no down | com FK: recusadas; no down: ACEITAS (vermelho-controle); catálogo restaurado no re-up (`pg_constraint` 5→4→5) | §0.d: sem FK, (v)/(vii) aceitas (head); com FK, recusadas |
| **D36** | ordem interna do contrato | grep do texto novo do contrato SÓ depois de D29/D32/D34/D35 verdes (commit posterior) | lição do B-5/C5.1 do c4 |

**Re-execuções obrigatórias** (só arquivos tocados mudam; `src/` intocado — âncoras `e352c6c…`/`9be7caf…` conferidas por hash no início e no fim): suíte -db de corrida completa ×10 (`financial-entry-delete-reverse-race-db`, agora com RLS real + casos FK) · **D26 literal** (auto-pulo declarado → guard nomeia) · ratchet do catálogo · guards de KPI · as três canônicas (§9). D21/D23/D24/D25/D27/D28 **não** se re-executam individualmente (código-alvo intocado; qualquer hash de âncora divergente = violação de §5 e reabre).

## §8 · Ordem e dependências

**S0 (orquestrador, ANTES de tudo):** (i) espelho Codex fechado **NO HEAD, sem rebase** — `node scripts/sync-agent-agents.mjs` em modo escrita NA BRANCH + commit + `--check` sobre `git archive HEAD` = ec=0 (provado §0.c; decisão: rebase NÃO — `origin/main` = `6efe5ad` não moveu, rebase seria no-op e não fecharia nada); (ii) designação NOMINAL do dev (instância nova) registrada; (iii) fábrica cria as cadeiras/suplentes faltantes (§13); (iv) briefing do inspetor.
**S1** `critico-c5-adversarial` ataca ESTE PLANO (máx 2 rodadas; reabrir premissa exige PD ≥5 fontes novas). Plano emendado se necessário — antes de código.
**S2** dev: auditoria própria §13.1 (a)–(f). Divergência → devolve ao planejador.
**F1** C6+C8 (catálogo/teardown/sweep; D29/D30/D31) — o coração; se D29 não zerar, PARA e devolve.
**F2** C7 (runner; D32) → **F3** C8-identidades (se atribuído; D33) → **F4** C9-migration + casos FK (D35) → **F5** C10-RLS + A6-censo (D34) → **F6** contrato (D36) + KPI + A4/A5 + bateria integral §9.
F1→F2 em série (o denominador do runner é medido pela bateria de F1); F3–F5 independentes entre si, em série para isolamento de causa; commit por fatia.

## §9 · Bateria (forma DECLARADA — contagem só vale com N e forma)

Regra: `cmd > "$LOG" 2>&1; ec=$?` — exit por variável, nunca por pipe; contagens lidas do TAP no arquivo; cada número publica comando, env (`DATABASE_URL`/`CORE_SAAS_PERSISTENCE`), **Node v20.19.5**, N e forma; cluster descartável recém-migrado por bateria.

1. `npm run check` · `npm run lint`
2. **Canônica 1:** `npm test` SEM `DATABASE_URL` — **N≥3**, publicada (vermelho ambiental pré-existente de `core-saas-role-authority` DECLARADO por nome; não é meta zerá-lo — é do bloco irmão)
3. **Canônica 3:** banco descartável → `migrate deploy` (inclui a migration nova) → `DATABASE_URL` exportada → `npm test` — **N≥10 rodadas sequenciais**, publicando POR RODADA: tests/pass/fail/skip/ec/duração + Δroles/Δlinhas (D33). **Meta: 10/10 ec=0, denominador idêntico, skip=2 nomeados, Δroles=0.** Vermelho residual → produtor nomeado por execução, publicado, e a junta decide (o veto do arnês existe para isso)
4. Suíte -db de corrida isolada ×10 (0 `40P01|XX000|23505`)
5. **Drills D29–D36** + re-execuções (§7), hash conferido em cada
6. **Canônica 2:** `npm run db:seed` + `node --test --import tsx` com a lista SUITES do `ci.yml` — **N≥15**, denominador constante publicado por iteração, grep `unhandledRejection|XX000|23505|40P01`. Meta 15/15
7. `npm run build` · `npm --prefix frontend run check`
8. KPI: `node --check Kpis/app.js` + guards do painel
9. `git diff --check` · diff de `CLAUDE.md`/`AGENTS.md` contra origin/main **vazio** · diff de `src/**` contra `12c3825` **vazio** (critério novo — §5)
10. Migration nova: D35 é parte da bateria
11. Vermelho fora das canônicas: arranjo completo em `P-O6R-ARNES-ISOLAMENTO`, sem conclusão causal (regra mantida)

## §10 · O que NÃO reabrir (fechado por execução independente)

1. **B-1/C1 — FECHADO por 3 cadeiras** (ataque 590+140 iterações SALDO=0; banco 60/60+controle; arnês 78/78+66/66). Só as re-execuções do §7.
2. **C2/C3/C4/C5 — confirmados** (fail-closed + validador). Idem.
3. `expectTitleLedgerCoherent` · semântica dos guards (razões/códigos/precedência/404-antes-de-regra) · detectores por rota NÃO unificados · ramo `restorePaymentGuarded` · birth-fixed dos 2 donos.
4. **Divergências D27/D21** — registradas (`P-O6R-B02-DIVERGENCIA-D27-D21`); não re-litigar o enunciado.
5. **`ci.yml`/job `backend` sem seed** — PROIBIDO; `P-O6R-B02-SUITES-LIST-CI` é do bloco seguinte.
6. **O que fica no bloco irmão** (deliberação acima): P1/P4, 3 formas, prefixos legados (`rls_test_` 68 órfãs), fila do lock, vermelho ambiental da canônica 1.
7. Gate `G-A109FD7-PUBLICADO` · migrations existentes · `schema.prisma` · KPI `mvp_*`.

## §11 · Riscos e rollback

| Risco | Contenção |
|---|---|
| Correção que nasce defeito (a classe da D-JUNTA-SEPARACAO-DE-PAPEIS) | separação de papéis; `src/` PROIBIDO; drills com vermelho-controle já medido (§0); junta com veto do arnês re-executa N=10 |
| VALIDATE da FK falhar em base com referência pendurada | censo `DO` prévio aborta NOMEANDO a pendência (fail-closed, zero mutação); down = `DROP CONSTRAINT`; bases de CI/dev nascem de `migrate deploy` limpo (medido: VALIDATE ec=0) |
| FK quebrar teardown de suítes (delete físico de pares em testes) | provado §0.d: DELETE do par em 1 statement funciona; a bateria integral (260 arquivos, N=10) é o juiz — qualquer 23503 novo aparece nomeado |
| Serializar os 3 escritores aumentar a espera do lock/duração | janelas curtas (setup/teardown), nunca o corpo do teste; a duração por rodada é publicada (§9.3); teto da fila já está nas emendas do bloco irmão |
| Sweep de família nova alcançar prefixo alheio | padrão nome+timestamp+família explícita (idioma atual); mass-delete fora de família = proibido (incidente registrado); drill D31 |
| Piso de denominador dar falso-positivo (arquivo legitimamente sem testes) | não existe hoje: os 260 registram ≥1 ponto (ou o skip-marker); se surgir um legítimo, o vermelho nomeia e a decisão é consciente |
| `XX000` residual de produtor não mapeado | meta 10/10; residual → produtor nomeado por execução + publicação com N; junta decide com o veto da cadeira do arnês |
| Este ciclo falhar | é o TETO: parada + dossiê ao dono (§C7.4), com toda a evidência já em arquivo |

**Rollback:** revert do PR único; migration nova aditiva com down provado (D35); nenhum dado muda; drills nunca commitados.

## §12 · Registro, pendências, KPI

- **Fechar com o PR (status na própria pendência, nunca apagar):** `P-O6R-B02-RUNNER-SUMICO-SEM-SKIP` (C7) · `P-O6R-B02-TESTE-RLS-SUPERUSER` (C10) · `P-O6R-B02-OVERCLAIM-ORFA-SQL-CRU` (C9) · `P-O6R-B02-CENSO-CASO-PERMANENTE` (A6) · `P-O6R-B02-REGISTRO-STATUS-LOG` (A5) · `P-O6R-B02-BATERIA-CANONICAS-1-2` (A4) · `P-O6R-B02-S0-ESPELHO-NO-HEAD` (S0).
- **Manter abertas:** `P-O6R-B02-SUITES-LIST-CI` (bloco seguinte, `ci.yml`) · `P-O6R-B02-ORFAOS-LEGADOS` (se o censo acusar) · `P-O6R-ARNES-ISOLAMENTO` — **emendar com o §0.a/§0.b deste plano**: objeto disputado NOMEADO (tupla de ACL — `pg_namespace.nspacl`/`pg_class.relacl`; `pg_authid` não colide, 0/150), o fato de o XX000 atingir quem toma o lock, e a lista do que segue lá (P1/P4/3-formas/prefixos/fila).
- **KPI (§C3):** latest + history (append) + painel; contagens de execução REAL com N e forma (as TRÊS canônicas — A4); `pr` após `gh pr create`; `merge_commit`/`approved_head` null na autoria; **`mvp_demo`/`mvp_vendavel` INTOCADOS** (nenhum escopo de produto move).
- **Ata do ciclo 5** responde por escrito (a)/(b)/(c) do §C7.4-bis e registra quem ocupou cada papel — sem isso, ciclo inválido.

## §13 · Junta ampliada do ciclo 5 (≥7 cadeiras, TODAS identidade nova)

**Inelegíveis (conferência por nome contra a ata §2 — o inspetor re-confere):** os 12 dos ciclos 1–3, os 5 votantes do c4, os 4 titulares queimados, `planejador-mestre` do c4, dev `agent-a6e56e5988c0adbad` — e eu.

1. **Desenvolvedor:** instância NOVA `general-purpose`, **nominalmente designada por escrito no S0** (nome da instância + timestamp na ata — lição R5). Auditoria própria ANTES de codar (`D-INSTANCIA-NOVA-COM-AUDITORIA`): **(a)** bateria barata dos 6 arquivos, N≥13, no cluster próprio — confere meus 5/13 e os produtores; **(b)** sonda de pares P1/P4/P3 — confere o objeto (ACL sim, `pg_authid` não); **(c)** D26b fixture — ec=0 e o ponto nomeado pelo caminho; **(d)** `--check` sobre `git archive` do head pós-S0 — ec=0, senão devolve; **(e)** sondas FK (v)/(vii) com e sem FK no cluster próprio; **(f)** atribuição por execução do vazamento linear (+5/rodada) na canônica 3 — produtor nomeado ANTES de tocar em `core-saas-role-authority-db`. Divergência em qualquer item → devolve ao planejador.
2. **Crítico:** `critico-c5-adversarial` (criado, `77ead96`) ataca ESTE PLANO antes do código, **máx 2 rodadas**; reabrir premissa exige PD com ≥5 fontes novas. Não vota mérito, não conserta.
3. **Cadeiras votantes (6, unânimes — invariante financeiro):** `jurado-c5-arnes-catalogo-postgres` (criado; **veto**; vota PLANO e mérito; re-executa canônica 3 N≥10 com vaza-metro) · `jurado-c5-banco-fk-triggers` (**veto**; FK+triggers+D35, sondas cruas, RLS real) · `jurado-c5-ataque-ao-dinheiro` (**veto**; re-ataca as portas com a FK instalada; SALDO do produto) · `jurado-c5-denominador-runner` (D32/D26/piso; formas do runner) · `jurado-c5-vaza-metro-teardown` (D31/D33; famílias do sweep; resíduo por rodada) · `jurado-c5-validador-diff-plano` (**veto**; §5/PROIBIDO — inclusive `src/` diff 0 —, pisos §6, canônicas 1/2 publicadas, registro §12). As 4 últimas: **fábrica cria com identidade nova**, corpo com briefing conferível (hash do pristino, forma da nota autocrlf).
4. **Suplente NOMEADO por cadeira ANTES do início** (fábrica cria os 6+1 suplentes junto; identidade nova; jurado caído → suplente re-executa o briefing INTEIRO; voto perdido nunca conta; a junta não fecha com menos de 6 votos de mérito).
5. **Inspetor de terreno** (instância nova, Fable) ANTES da junta, fail-closed (`D-INSPETOR-TERRENO-JUNTA`): worktree próprio POR JURADO que muta (SEM junction — proibição de 26/08), cluster descartável por jurado em porta própria, pristino por `hash-object` (autocrlf), insumos completos no briefing (este plano + parecer do crítico c5 + ata c4 com ERRATA + relatório do achador + PD), afirmações da ata anterior marcadas "a re-verificar" (inclusive **o "15 DIVERGE" que eu medi como 25**), S0 conferido NO HEAD, baseline honesto, plano de perda de jurado. Sem `LIBERADO`, a junta não abre.
6. **Porteiro pré-merge no head exato**; PR só após `G-A109FD7-PUBLICADO`; sem registro de junta = merge inválido.

## §14 · O que eu medi e o que não medi

**Medi por EXECUÇÃO (saídas no §0, logs no scratchpad):** a classe XX000 reproduzida na forma barata (6 arquivos, N=13, 5 vermelhos, produtores nomeados, 1 queda de denominador 37→32); o objeto disputado por sonda de pares (ACL 200/200 e 40/40; `pg_authid` 0/150); a role órfã com LOGIN sobrevivendo (1, pós-r08); D26b (ec=0, 2 testes, e a assinatura do ponto-nomeado-pelo-arquivo); `--check` no head = ec=1 com **25** DIVERGE e o fechamento por sync em modo escrita (ec=0, 25 agentes) em cópia de scratch; a FK composta: ADD+VALIDATE ec=0, (v)/(vii) recusadas, teardown do par em 1 statement funciona; `origin/main` = `6efe5ad` e `5e321ac` fora dela; índice único `(tenant_id,id)` existente; `rolbypassrls=t` do `postgres` no cluster; ausência de FK em `reversal_of` e de DELETE físico em `src` (greps).
**Medi por LEITURA (arquivo:linha citados):** l.158/159 do `audit-security` (DROP OWNED fora do lock; DROP ROLE atrás dele); `withRoleCatalogLock`/`sweepOrphanEphemeralRoles`/famílias (arnês l.63–133); allowlist do ratchet com os 3 "fora do lock"; runner sem `--test-concurrency` e com `SKIP_BUDGET_DB=2` nomeado; `set -o pipefail` no step do `tee` (ci.yml l.164/222); o caso `[RLS]` usando o client do harness; o rodapé down da 20260870.
**NÃO medi (viram critérios com juiz nomeado):** o "passa com triggers derrubados" do caso `[RLS]` (juiz: vermelho-controle do D34); a atribuição do +5/rodada (juiz: dev §13.1(f)); o custo do VALIDATE em base volumosa (juiz: D35 + duração publicada); se a serialização elimina 100% do XX000 na canônica 3 completa (juiz: §9.3 N=10 — meu D29 cobre a forma barata); a duração extra do lock com os 3 escritores dentro (juiz: duração por rodada, §9.3); o comportamento do ruleset no merge (juiz: porteiro).
**Nenhuma afirmação deste plano sobre comportamento futuro é fato — são critérios de aceitação.** O ciclo 4 escreveu "meta: exit 0" e publicou 1/1; este plano escreve: **o número só existe com N, e a meta é 10/10 com o denominador idêntico e o vaza-metro zerado — ou o produtor nomeado por execução diante da junta.**

---

**Limpeza:** criei e derrubei `plan-c5b-pg` (:55801), `plan-c5b-pg2` (:55802), `plan-c5b-redis` (:56801) — `docker rm -fv` ec=0, `docker ps -a` restam só `erp-postgres`/`erp-redis` (nunca tocados, nem leitura); logs/sondas (xx000-r01..13, catprobe, fkprobe, d26b, headcheck) ficam no scratchpad da sessão, fora do repo; worktree `plan-c5` **mantido** (ordem do orquestrador), `status --porcelain` vazio, 5/5 âncoras `hash-object` = blob de `12c3825`; nenhuma junction criada; árvore principal intocada.

---

## ERRATA S0 (2026-08-28, apensada — §A2) — os "15 DIVERGE" (ata, A7) e os "25 DIVERGE" (plano do c5, §0.c) são ARTEFATO DE MEDIÇÃO

O orquestrador executou o S0 e mediu o oposto. Quatro medições, nesta ordem:

| # | Arranjo | Resultado |
|---|---|---|
| 1 | `--check` no **worktree real** do head (`.claude/worktrees/agent-af6ea607f3ddf8efd`, `12c3825`, árvore limpa) | **ec=0** — "OK — 25 agentes, espelho consistente" · 0 DIVERGE |
| 2 | `git archive 12c3825 … \| tar -x` + `--check` (o arranjo do plano) | ec=1 · **25 DIVERGE** — reproduzido |
| 3 | Diff do arquivo do archive × gerado: **as 64 linhas** diferem; 3995 × 3931 bytes = **exatamente 1 byte/linha** | o delta é **CR** |
| 4 | **Checkout LF puro** (`git -c core.autocrlf=false checkout 12c3825 -- …`) — o que a CI Linux recebe | **ec=0** · 0 DIVERGE · "25 agentes, espelho consistente" |

Contagem de CR: **blob = 0** nos dois lados (26 arquivos do espelho e 25 fontes, todos LF; não há `.gitattributes`);
arquivo **extraído do archive = 64 CR**. Ou seja: `git archive`+`tar` nesta máquina Windows injeta CRLF no espelho,
o script compara com o conteúdo gerado (LF) e acusa divergência que **não existe no repositório**.

**Consequência:** o **S0(i) do plano do ciclo 5 é NO-OP** — o espelho já fecha no head `12c3825`, e nenhum commit
foi feito na branch por este motivo (head preservado). A pendência `P-O6R-B02-S0-ESPELHO-NO-HEAD` (registrada como
ALTA) **não reproduz**: fica registrada como fechada por não-reprodução, com as quatro medições acima.

**O que isto NÃO invalida:** `5e321ac` continua não sendo ancestral de `12c3825` nem de `origin/main` (medido) — a
**letra** do S0 do ciclo 4 ("rebase sobre a base com `5e321ac`") segue inexequível, como o planejador do ciclo 5
apurou. E a CI **não executa** `sync-agent-agents --check` (0 ocorrências em `ci.yml`), então nenhum gate depende disto.

**Lição de método, para o ciclo 5 e para o inspetor:** medir o conteúdo de um commit por `git archive`+`tar` numa
máquina com `core.autocrlf=true` **não** é medir o commit. As formas honestas são o **checkout LF puro**
(`git -c core.autocrlf=false checkout <head> -- <caminhos>`) ou `git cat-file`/`git show` do blob. É a mesma classe
da nota de md5 × autocrlf que já está no briefing — agora com um segundo caso, e este chegou a virar pendência ALTA.
