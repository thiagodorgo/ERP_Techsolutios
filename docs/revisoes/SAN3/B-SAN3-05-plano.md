# B-SAN3-05 — PLANO v2 — o papel de runtime não escapa de RLS (itens 9 e 10 do §4.1) — ciclo 1, replanejado após a crítica r1

> **Papel:** `planejador-mestre` (identidade nova, sessão na nuvem) · **modelo:** Fable 5.1 (`claude-fable-5-1`, o
> fixado no frontmatter — sem fallback) · **medido em:** `origin/main` = `3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c`
> (resolvido por `git rev-parse origin/main` em 2026-09-30; a árvore da sessão está nesse SHA, `git status` vazio) ·
> **ramo deste plano:** `docs/plano-b-san3-05`, criado desse SHA · **bloco:** `B-SAN3-05` ·
> **branch da entrega:** `fix/runtime-role-sem-bypass` (§5.2 do `PLANO_SAN3.md`).
>
> **v2 (esta revisão):** `planejador-mestre` (instância NOVA desta sessão — não achou nem desenvolve; §C7.4-bis) ·
> **modelo em que roda de fato:** Fable 5.1 (`claude-fable-5-1`), o fixado no frontmatter — **sem fallback** (§C7.6: replanejamento
> após crítica, Fable obrigatório) · corpo `.claude/agents/planejador-mestre.md` @ `origin/main@3b1fe0f9`, md5 EOL-neutro
> `4c912f69a93f07b14d8fd1c49539c778` (conferido por mim) · **responde a** `docs/revisoes/SAN3/B-SAN3-05-critica-r1.md`
> (`critico-b-san3-05`, head `c7d1e95d62102b267f1636ce1ed715578d2242ae`) · **v1 recuperável em** `c3f57e9` · **máquina:**
> `uname -a` = `Linux vm 6.18.44-fc-v50 #1 SMP PREEMPT_DYNAMIC @0 x86_64 x86_64 x86_64 GNU/Linux`; `PATH=/opt/node20/bin:$PATH node -v`
> = `v20.20.2` (o do CI); Postgres 16.13 descartável `127.0.0.1:54353`, banco `erp_plano` (115 tabelas, 106 FORCE, medido ao abrir).
> Tudo o que a v2 afirma de novo foi **medido aqui**, na seção "Resposta à crítica r1"; o que a v1 afirmava e a crítica
> **reproduziu** (gerador byte a byte, Apêndice B 22/22, trava G1–G4, P-k/P-m/P-n/P-p) fica como estava.
>
> **Fonte do bloco:** `docs/revisoes/SAN3/PLANO_SAN3.md` §4.1 itens 9 e 10, §4.2 (l.192, "Papel de banco da
> produção"), §5.2 (linha `B-SAN3-05`), §6 (l.366: trava de mesmo arquivo `SAN3-05 → SAN3-03` nos dois
> repositórios de nuvem, e `SAN3-05 → AV-REAL` em `src/config/env.ts`), §5.6 (CE-G1, CE-G2). Pendências:
> `P-INFRA-RLS` (`pendencias.md:493`) e `P-O6R-B06-LEITURA-PLATAFORMA-SOB-FORCE-RLS` (`pendencias.md:7426`).
>
> **Regra de leitura deste plano (§A7 do contrato):** toda afirmação abaixo diz onde foi medida. **MEDIDO** = comando
> + saída, nesta sessão, sobre `origin/main@3b1fe0f9` ou sobre um Postgres 16.13 descartável com as migrações
> dessa ref aplicadas. **HIPÓTESE** = não medido aqui, com o comando exato que a derruba (§0.6). Nenhum SHA foi
> digitado; nenhum número foi copiado de bloco anterior.

---

## Resposta à crítica r1 — todos os achados, um a um (medido aqui, no cluster `54353`)

> Regra desta seção: **cada achado tem uma linha**; a coluna "o que mudou" aponta a seção da v2; a coluna "evidência"
> é comando + saída **executados nesta sessão** (roteiro de re-execução: os scripts da crítica r1, re-rodados, não
> herdados); o estado é um de **incorporado** · **falsificado com medição** · **pendência nomeada**. Nenhum achado foi
> recusado por argumento. Detalhe de cada medição em §R.1–§R.7, logo abaixo da tabela. Scratch desta sessão:
> `<scratchpad>/plano-v2/` (abaixo `$SP`); o da crítica, `<scratchpad>/critico-r1/` (abaixo `$S`).

| id | gravidade | achado (resumo da r1) | o que mudou na v2 (seção) | evidência executada | estado |
|---|---|---|---|---|---|
| F1 | bloqueia | A12/T13/C3(1): "L2b = ∅" impossível com o sítio 7 em arquivo PROIBIDO | O guard deixa de exigir "∅" e vira **RATCHET**: o inventário suspeito (L1+L2, chave sem número de linha) é **congelado** no head da entrega, **com o sítio 7 nominalmente dentro** (ligado à pendência `P-SAN3-05-LEITURA-MORTA-PROJECAO-DIARIA`); linha nova **ou sumida** = vermelho (§0.4, §2.2(b), A12, T13, Apêndice A). `cloud-cost-allocation/**` continua PROIBIDO (§6) — razão em §R.2 | §R.2: gerador v2 no head → 48 chaves congeladas, sítio 7 entre elas; mutação "sítio novo" (Ml) → `+1` vermelho; mutação "a fábrica do sítio 7 mudou por fora" → `sumidas: 1` vermelho | **incorporado** |
| F2 | bloqueia | guard gerado verde para 16/17 sítios crus reais; "default negar" falso | Dois guards com alcance **declarado**: (1) o ratchet estático com **default negar de verdade** — toda forma que o analisador não prova sob contexto entra no congelado (`OUTRO`, `TX-SEM-ENVOLTORIO?`, `$TRANSACTION-SEM-SETTER`, `CRU-DENTRO-DE-ENVOLTORIO`, `INJETADO-SEM-CLASSE`, `RAW OPACO`, identificador desestruturado, acesso por índice, subclasse); (2) o guard **da propriedade**, dinâmico: **T11-diferencial** — a mesma rota de plataforma, mesmo seed, sob superusuário × papel efêmero, tem de devolver o **mesmo** corpo (§2.2(b), §7 A9, §8 T11) | §R.2: as 17 mutações da r1 (`$S/muts/*.ts`, re-rodadas) contra o gerador v2 → **17/17 VERMELHAS** (`+1` chave cada); §R.3: `GET /platform/cloud-usage/summary` no app real, mesmo seed: super → `quantity: 50`, papel sem bypass → `metrics: []` (vermelho-controle do T11-diferencial no head) | **incorporado** |
| F3 | ajuste | `classify` engole `$transaction-SEM-setter`; "hoje zero casos" é falso | `$transaction-SEM-setter` vira classe própria `$TRANSACTION-SEM-SETTER` (suspeita, congelada); o residual (i) do §0.4 é reescrito com o número medido | §R.2: head → `"$TRANSACTION-SEM-SETTER":2` (`work-order-prisma.repository.ts` `assign`: `workOrderAssignment.create` **e** `workOrder.updateManyAndReturn`); mutação Md → `+1` vermelho | **incorporado** |
| F4 | ajuste | `updateManyAndReturn` fora do `OPS`: 68 acessos FORCE invisíveis | `OPS` deixa de ser digitado: é **derivado do client gerado** (`node_modules/.prisma/client/index.d.ts`, métodos do primeiro `*Delegate`) — 17 ops, incluindo `updateManyAndReturn` e `createManyAndReturn` | §R.2: `OPS(derivados)=17`; L1 sobe de 642 para **720** (os 68 + 10 RAW opacos); mutação Mq → `+1` vermelho | **incorporado** |
| F5 | bloqueia | pertença ao papel DONO escapa (`ALTER TABLE … NO FORCE`); trava e sonda de posse dizem 0 | A propriedade (§2.1(a)) ganha a terceira via — **posse, direta ou por pertença** (`pg_has_role(<quem>, c.relowner, 'MEMBER')` sobre toda tabela `FORCE`) — e a trava passa a **RECUSAR** posse (era "reportar"; decisão revertida, razão em §R.1). Mesmo predicado na auto-verificação do script (§4.1), no go/no-go do §11 e em H3 | §R.1: `p2_app_ownermember` (membro de `p2_mig`, dono de `t_force`): v1 `0` linhas (PASSA), sonda v1 `0`; `SET ROLE p2_mig; ALTER TABLE t_force NO FORCE ROW LEVEL SECURITY; SELECT count(*)` → **3** sem GUC; v2 → `posse/p2_mig` (RECUSA). Dono direto `p2_app_owner`: v2 RECUSA (`posse/p2_app_owner/self=t`) | **incorporado** |
| F6 | bloqueia | o SQL do procedimento não roda (`:'role'` em `DO $$`, `:"db"` não declarada) | Procedimento **reescrito e executado**: variáveis do `psql` entram por `set_config('san3.*')` (lidas com `current_setting` dentro de um único `DO`), banco = `current_database()`, migrador default = `current_user`; o `.sh` inteiro está no Apêndice C (md5 `189ddf8a093934cf1c1baa61ba80f5c8`) e é o que o dono e o compose rodam | §R.4: 7 cenários executados no cluster — papel novo `ec=0` linha `erp_runtime\|f\|f\|f\|0\|2`; 2ª execução **idêntica** (`pg_roles`, `pg_default_acl`, `pg_auth_members`, `relacl` por `diff`); migrador não-super **dono** `ec=0`; falhas nomeadas (§R.4 iii, iv-b, iv-c) | **incorporado** |
| F7 | ajuste | auto-verificação é `SELECT` (sai 0 com `escapa=t`); pertença não revogada | A verificação é `RAISE EXCEPTION` dentro do `DO` (⇒ `psql` **ec=3** e **ROLLBACK** de tudo); pertença a papel que escapa **ou** a dono de tabela FORCE é **revogada** (`REVOKE`, que falha se o executor não tiver ADMIN — falha, não silêncio); posse não se corrige (mensagem diz o `ALTER … OWNER TO`) | §R.4 (iii): papel pré-existente `SUPERUSER BYPASSRLS CREATEDB` + membro de `p3_bypass` + dono de `t_own` → `ERROR: papel erp_runtime ainda escapa … POSSE …`, `ec=3`, e **nada persistiu** (`t\|t\|t\|1` depois); reatribuída a posse → `ec=0`, `f\|f\|f\|0` (atributos corrigidos, pertença revogada) | **incorporado** |
| F8 | ajuste | migrador `NOSUPERUSER CREATEROLE`: `ALTER ROLE … NOSUPERUSER …` recusado | `CREATE ROLE` sem nomear `NOSUPERUSER/NOCREATEDB/NOBYPASSRLS` (são os defaults); `ALTER` só do atributo que **está** ligado e só se o executor **tiver** o atributo — senão **falha nomeando o atributo**; §11 passo 3 reescrito com os três modos de falha | §R.4 (iv): `p3_mig` (`LOGIN CREATEROLE NOSUPERUSER NOBYPASSRLS`, dono do banco e das tabelas) cria `erp_rt2` → `ec=0`, `f\|f\|f\|f`, default privileges `p3_mig\|r`/`p3_mig\|S`; (iv-b) `erp_rt2` pré-existente com `BYPASSRLS` → `ERROR: papel erp_rt2 tem BYPASSRLS e p3_mig nao pode remover (precisa de BYPASSRLS)`, `ec=3` | **incorporado** |
| F9 | bloqueia | fiação de produção da trava sem critério (default→`skip`; chamada em `main()` apagada) | Dois critérios novos: **A5′/T2′** — o export `env.DATABASE_RUNTIME_ROLE_GUARD` é lido num **processo filho** sob `NODE_ENV=production` + PROD_OK (não `safeParse`, não regra reescrita); **A17/T15** — o `src/server.ts` **real** sobe num processo filho sob `NODE_ENV=production` com `DATABASE_URL` de superusuário e tem de morrer com `RUNTIME_ROLE_CAN_BYPASS_RLS` **antes** do Redis (§7, §8) | §R.5: `le-export.sh EVIDENCE_SCANNER` → `production unavailable`; mutante `production ? "noop"` → filho imprime `production noop` (**vermelho**) enquanto o precedente segue `13/13` verde; `boot.sh` (server real, super, Redis do PROD_OK) → hoje passa da trava e morre em `RedisCommandError` aos ~18 s — vermelho-controle do T15 | **incorporado** |
| F10 | ajuste | "22/22" era `grep`; executado 28/28; mutação de A6 vermelha por `ZodError` | Números trocados pelos executados; A6 reescrito com o mecanismo real (`envSchema.parse` explode no import) | `node --test … deploy-manifest-parity` → `# tests 28 # pass 28`; `production-runtime-gates` → `63/63` (grep: 22 e 30) | **incorporado** |
| F11 | ajuste | mutação de A1 (apagar `r.rolsuper`) não deixa T6/T7 vermelhos | A trava devolve **a razão** por linha (`via`, `rolname`, `rolsuper`, `rolbypassrls`, `is_self`); T7 asserta a razão (`is_self ∧ rolsuper` presente), não só "recusou" | §R.1: sob `p2_super2` (`SUPERUSER NOBYPASSRLS`) v2 → 5 linhas incl. `atributo/p2_super2/is_self=t`; mutante sem `r.rolsuper` → a linha `is_self` **some** (restam `p2_bypass`, `postgres`, posses) ⇒ T7 vermelho | **incorporado** |
| F12 | ajuste | semente com `occurred_at`/`date` iguais: "remover a reordenação" não fica vermelho | Semente **intercalada**: A = 01h,03h,05h; B = 02h,04h (`date`: A = 15, B = 14) | `node -e` (§R.6): concatenação v1 "ordenada? **true**" (mutante passa); v2 "ordenada? **false**" → mutante vermelho; agregados `[A:15,B:14]` → `false` | **incorporado** |
| F13 | bloqueia | trava julga `current_user`; login super + `options=-c role=<limpo>` passa e escapa com `SET ROLE NONE` | A trava julga **`session_user` e `current_user`** (a pertença é avaliada para os dois; `SET ROLE NONE` volta a `session_user`) — §2.1(a), §2.2(a); §11 passo 5 reescrito | §R.1: `PGOPTIONS='-c role=p2_clean' psql -U postgres` → `session_user=postgres, current_user=p2_clean`; v1 `0` (PASSA); v2 **5 linhas** (RECUSA); `SET ROLE NONE` → 3 linhas sem GUC. Pelo **PrismaPg** (`$SP/options-url.mts`, URL com `options=-c%20role%3Dp2_clean`): v1 PASSA, v2 RECUSA; URL de login `p2_clean` → v2 PASSA | **incorporado** |
| F14 | ajuste | gerador resolve `typescript` a partir do alvo; cópia fora da árvore morre | Resolução a partir do **próprio script** (`import.meta.url` → `scripts/` → `node_modules` do repo), depois do `cwd`, nunca do alvo; T13 copia `src`+`prisma` para diretório temporário **sem** `node_modules` | §R.2: `cd /tmp && node $SP/fake-repo/scripts/gerador-v2.mjs <cópia sem node_modules>` → `ec=0`, cabeçalho L0 idêntico; o v1 no mesmo cenário → `Cannot find module` | **incorporado** |
| N1 | nota | `GRANT … WITH SET FALSE` recusado sem poder `SET ROLE` (falso positivo seguro) | Declarado em §4.2 como falso positivo **aceito** (direção segura; o remédio é `REVOKE`) | §R.1: `p2_member_noset` → v2 `atributo/p2_bypass` (RECUSA) | **incorporado** |
| N2 | nota | `REPO` cravado no Apêndice B | `const REPO = process.env.REPO ?? process.cwd();` (única linha alterada); re-executado aqui | §R.6: `npx tsx $SP/medir-papel.ts` no cluster `54353` → `22 itens, 0 fora do esperado`; limpeza `0 0 0 0` | **incorporado** |
| N3 | nota | os três `.sh` do repo são `100644`: sourced é o caminho padrão do entrypoint | O corpo do `.sh` roda numa **função em subshell** (nada de `set -u`/`exit` vaza para o entrypoint) **e** o arquivo é versionado `100755` (`git update-index --chmod=+x`; a junta C1 confere `git ls-files -s`) | §R.4 (vi): `fake-entrypoint.sh` (`set -Eeo pipefail`, executa se `-x`, senão `source`) nos **dois** modos → o entrypoint "continua vivo", `ec=0` | **incorporado** |
| N4 | nota | "sem `$disconnect` o processo não morre" é falso (~11,5 s); A4 é pega pelo espião do T4 | Justificativa reescrita (o `$disconnect` encurta a saída de ~11 s para imediata e fecha o pool limpo); A4 aponta o **espião do T4** | medição da r1 (item 4.3), aceita como executada; não re-medida | **incorporado** |
| N5 | nota | `deploy-production.yml:141` fala da tabela RBAC `roles`, não de papel PostgreSQL | Citação trocada pela medição: `git grep -n -i -E 'CREATE ROLE\|CREATE USER' origin/main -- prisma/migrations` → **0** | executado (§R.7) | **incorporado** |
| N6 | nota | A2 pega por T5 não T7; A9/T11 sem vermelho-controle; T12 vermelho-controle por import | A2 reatribuído a T5/T8; T11 ganha vermelho-controle **executado aqui** (§R.3); T12 importa a **fábrica** `createPrismaCloudChargeRepository()` (existe no head-base) e não a classe nova | §R.3 | **incorporado** |
| N7 | nota | A15/A16 sem mutação escrita | A15/A16 viram checagens por **comando** com mutação (`rg` que fica vazio se a doc não mudar; `FECHADA` em vez de `EM ANDAMENTO` reprova) | §7 | **incorporado** |
| N8 | nota | P-a 8 linhas/1 executável; P-f omite `permissions`, `role_permissions`; N omite `rls-tenant-isolation` | Números corrigidos: P-a **8/1**; P-f lista as **9** tabelas sem FORCE; baseline **N = 5** (o `test(` de `rls-tenant-isolation.test.ts:19` cobre as 4 tabelas de nuvem sob papel `NOSUPERUSER`, l.44 e 2460-2680) | §R.7: `git grep … \| wc -l` → 8; `psql … NOT relforcerowsecurity` → 9 nomes; `grep -n` no arquivo | **incorporado** |
| P1 | ajuste (pre-existente) | teste do default do `EVIDENCE_SCANNER` reescreve a regra (mutante 13/13 verde) — `fe2748c` 2026-09-06 | **Pendência nomeada** `P-O6R-07B-TESTE-DO-DEFAULT-CEGO-AO-EXPORT` (§13), dono `B-O6R-07b`/segurança; **fora do escopo** deste bloco. O mecanismo que a fecha é o mesmo do A5′ (leitura do export em processo filho) — a pendência aponta para ele | §R.5: reproduzido (mutante `production ? "noop"` → `13/13` verde) | **pendência nomeada** |

### §R.0 — Roteiro de re-execução (o que re-rodei da crítica antes de decidir)

Re-executados (não herdados) no cluster `54353`/Node 20: o gerador v1 verbatim (`$S/gerador.mjs`: `ec=0`, cabeçalho
`106/106/106/777 · 642 · 70/451`, L2b = 7 linhas — igual à r1); o Apêndice B com a emenda N2 (22/22); a trava v1
(`$S/guard.sql`) sob 11 papéis (coluna "v1" da tabela de §R.1 — reproduz os 10 casos da r1 e acrescenta `pg_read_all_data`);
o SQL v1 do procedimento (`$S/role.sql`) não foi re-rodado — o defeito é sintático e a v2 o substitui por inteiro
(§R.4 executa o substituto); as 17 mutações (`$S/muts/*.ts`) contra o gerador v2 (§R.2); o mutante `EVIDENCE_SCANNER`
do item 4.5 (§R.5). Medição da r1 aceita sem re-execução: N4 (tempo de saída sem `$disconnect`).

### §R.1 — A trava v2 sob 11 papéis (F5, F11, F13, N1) — banco `plano_i2`, criado e derrubado por mim

`$SP/guard-v2.sql` (= `RUNTIME_ROLE_GUARD_SQL` do §2.2(a), byte a byte); `guard-v2-sem-rolsuper.sql` = mutante de A1;
`guard-v1.sql` = o da r1. Tabela `t_force` (FORCE, 3 linhas, dona `p2_mig`, não-super) e `t_force2` (dona `p2_app_owner`).

```
papel                                   | v1 | v2 (via/rolname/is_self)                                                        | mutante sem rolsuper
postgres                                | 3  | 5: atributo/p2_bypass/f atributo/p2_super2/f atributo/postgres/t posse/p2_app_owner/f(1) posse/p2_mig/f(1) | 4 (some atributo/p2_super2)
p2_super2 (SUPERUSER NOBYPASSRLS)       | 3  | 5: … atributo/p2_super2/t …                                                     | 4: a linha is_self=t SOME  ← T7 vermelho
p2_clean                                | 0  | 0                                                                               | 0
p2_member_direct / _noinherit / _chain  | 1  | 1: atributo/p2_bypass/f                                                         | 1
p2_member_noset (INHERIT FALSE, SET FALSE) | 1 | 1: atributo/p2_bypass/f   (N1: falso positivo seguro)                          | 1
p2_app_ownermember (membro do DONO)     | 0  | 1: posse/p2_mig/f(1)          ← F5: v1 passava                                  | 1
p2_app_owner (dono direto de t_force2)  | 0  | 1: posse/p2_app_owner/t(1)                                                      | 1
p2_read_all (membro de pg_read_all_data)| 0  | 0   (e SELECT count(*) FROM t_force sem GUC → 0: não escapa)                    | 0
p2_mig (o migrador, dono)               | 0  | 1: posse/p2_mig/t(1)          (o app NUNCA roda como migrador — correto)         | 1
```

A porta do dono, executada: `psql -U p2_app_ownermember … BEGIN; SET LOCAL ROLE p2_mig; ALTER TABLE t_force NO FORCE ROW
LEVEL SECURITY; SELECT count(*) FROM t_force; ROLLBACK;` → `ALTER TABLE` / **`3`** (a sonda v1 `relowner = current_user`
dizia `0`). F13: `PGOPTIONS='-c role=p2_clean' psql -U postgres` → `postgres|p2_clean`; v1 → `0`; v2 → 5 linhas;
`SET ROLE NONE; SELECT count(*) FROM t_force` → `postgres|3`. Pelo app: `U='…/plano_i2?options=-c%20role%3Dp2_clean'
npx tsx $SP/options-url.mts` → `trava v1: PASSA | trava v2: RECUSA (5 linhas)`; `SET LOCAL ROLE NONE → {"c":"postgres","n":3}`;
URL de login `p2_clean` → `v2: PASSA`.

**Por que posse passa a RECUSAR (mudança de decisão da v1):** a v1 reportava posse para não impedir "o próprio ato do dono
num provedor que só ofereça um papel". Medido: quem é dono (ou membro do dono) lê tudo com **um** `ALTER TABLE` — a mesma
classe de escape que a pertença a `BYPASSRLS` (um `SET ROLE`), que a v1 já recusava. Aceitar uma e recusar a outra era
incoerente; e o cenário "um papel só" **já** é o cenário em que o app roda como migrador, que a trava v2 recusa de propósito
(`p2_mig` acima). O ato do dono (§11) cria o segundo papel; a trava é a prova de que ele foi feito.

### §R.2 — O gerador v2 e o ratchet (F1, F2, F3, F4, F14) — `$SP/gerador-v2.mjs`, md5 `293b3746ad7e4dea1c11e16c794e7aa3`

```
$ cd /home/user/wt-plano && PATH=/opt/node20/bin:$PATH node $SP/gerador-v2.mjs .
# L0: tabelas ENABLE=106 FORCE=106 · acessores Prisma em FORCE=106 · OPS(derivados)=17 · src/**/*.ts=777
# L1: call-sites sobre tabelas FORCE (+ RAW opacos) = 720
# L1 por classificação: {"TX-SEM-ENVOLTORIO?":12,"INJETADO-SEM-CLASSE":8,"INJETADO":646,"SOB-CONTEXTO":51,"$TRANSACTION-SEM-SETTER":2,"CRU":1}
# L2: classes com executor injetado = 70; instanciações achadas = 451
# L2 por classificação do argumento: {"SOB-CONTEXTO":423,"TX-SEM-ENVOLTORIO?":14,"CRU":4,"OUTRO()":4,"$TRANSACTION-SETTER-DEPOIS?":1,"INJETADO":5}
# INVENTÁRIO SUSPEITO (L1+L2): 48 chaves · sha1=147d41c209a5f3bbce9fc7d208fd33a02e6bd8d2 · L2b (derivado, informativo) = 65
```

As **48 chaves** congeladas (L1: 9 `TX-SEM-ENVOLTORIO?` · 8 `INJETADO-SEM-CLASSE` · 2 `$TRANSACTION-SEM-SETTER` · 1 `CRU`;
L2: 14 `TX-SEM-ENVOLTORIO?` · 5 `INJETADO` · 4 `CRU` · 4 `OUTRO()` · 1 `$TRANSACTION-SETTER-DEPOIS?`) estão no Apêndice A com
a saída completa. O sítio 7 está lá: `L2 src/modules/cloud-cost-allocation/cloud-cost-allocation-prisma.repository.ts
new PrismaCloudCostAllocationRepository(prisma) (nenhum) CRU`. Os L2b (65, com linha) são **derivados** de L2 e ficam fora
do congelado: a raiz (a instanciação) já está na chave, e congelar o derivado faria o ratchet reprovar todo método novo de
toda classe injetada, sem informação nova.

Harness (`cp -r src prisma` para `$SP/mut/base`, **sem** `node_modules`; por mutação, `src/modules/zz-mut/mut.ts` = o
arquivo da r1; `comm` do inventário congelado):

```
Ma_alias:+1 Mb_destructure:+1 Mc_element:+1 Md_tx_sem_setter:+1 Me_root_dentro_wrapper:+1 Mf_new_como_argumento:+1
Mg_subclasse:+1 Mh_funcao_livre_client:+1 Mi_sql_em_constante:+1 Mj_campo_arrow:+1 Mk_fabrica_param_tx:+1
Ml_mutacao_do_plano:+1 Mm_getter_prisma:+1 Mn_membro_nao_previsto:+1 Mo_tx_param_helper:+1
Mp_this_client_fora_de_classe_injetada:+1 Mq_updateManyAndReturn:+1
VERMELHAS: 17/17
```

Cada `+1` é a chave que a mutação acrescenta (ex.: Mb → `L1 … (identificador) cloudUsageEvent.findMany … OUTRO(identificador)`;
Mc → `prisma ["cloudUsageEvent"].findMany … CRU`; Md → `tx cloudUsageEvent.findMany $TRANSACTION-SEM-SETTER`; Me → `prisma …
CRU-DENTRO-DE-ENVOLTORIO`; Mg → `L2 new Sub(prisma) … CRU` (fecho por `extends`); Mh → `client … INJETADO-SEM-CLASSE`;
Mi → `prisma RAW-SQL($queryRawUnsafe) OPACO CRU`; Mq → `L2 new Rep(prisma) … CRU`). **Linha sumida** também reprova: mutação
que altera a fábrica do sítio 7 por fora (`prisma` → `prisma as never`) → `novas: 1 · sumidas: 1 → VERMELHO`.
F14: `cd /tmp && node $SP/fake-repo/scripts/gerador-v2.mjs $SP/mut/base` (script em `scripts/`, cwd sem `package.json`, alvo
sem `node_modules`) → `ec=0`; o v1 → `Cannot find module`.

**Alcance declarado do ratchet (o que ele NÃO enuncia):** é aproximação **estática** — acessor dinâmico (`prisma[nome]`),
`Object.values(prisma)`, SQL cru montado fora do arquivo e client obtido por caminho que não passe por um nome de
acessor Prisma continuam invisíveis. Por isso ele é o guard de **forma**, e o guard da **propriedade** é o T11-diferencial
(§R.3) — a junta C3 mede os dois.

### §R.3 — T11-diferencial: a propriedade, medida no app real (F2, N6)

`$SP/diff-http.mts` (padrão `san3-04a`: `createEphemeralRole` pelo arnês, `globalThis.prisma` **antes** de importar o app,
`createApp(PrismaCoreSaasService(…))`, seed de 2 organizações com `occurred_at` intercalados sob `withTenantRls`, cabeçalho
legado de plataforma em `NODE_ENV=test`; papel efêmero e seed derrubados no `finally`):

```
$ ROLE=super   ADMIN_URL=… npx tsx $SP/diff-http.mts
{"role":"super","papel":{"u":"postgres","rolsuper":true,"rolbypassrls":true},"status":200,"resumo":{…,"metrics":[{"metricKey":"storage_bytes","quantity":50,"unit":"bytes","sourceType":"medicao"}],…}}
$ ROLE=runtime ADMIN_URL=… npx tsx $SP/diff-http.mts
{"role":"runtime","papel":{"u":"o6r_b01_…","rolsuper":false,"rolbypassrls":false},"status":200,"resumo":{…,"metrics":[],…}}
$ psql … → 0 0 0   (tenants do diff, eventos, papéis efêmeros restantes)
```

É o item 10 pela superfície: **mesmo seed, mesma rota, `50` × vazio**. O T11 da v2 é este diferencial (corpo igual, com
`generatedAt` normalizado), com JWT `platform_admin` (CE-G2) no lugar do cabeçalho legado; o vermelho-controle no head-base
é a saída acima. T12 usa `createPrismaCloudChargeRepository()` (existe no head-base) para o mesmo fim.

### §R.4 — O procedimento do papel, executado (F6, F7, F8, N3) — bancos `plano_i3` (super) e `plano_i4` (dono `p3_mig`)

Script: Apêndice C (`$SP/db-runtime-role.sh`, md5 `189ddf8a093934cf1c1baa61ba80f5c8`, 82 linhas). `PGHOST/PGPORT` do cluster;
`PGUSER`/`PGDATABASE` por cenário; `DB_RUNTIME_PASSWORD` sempre presente (nunca ecoada).

```
(i)   PGUSER=postgres PGDATABASE=plano_i3 DB_RUNTIME_PASSWORD=… bash db-runtime-role.sh → DO / erp_runtime|f|f|f|0|2 / ec=0
(ii)  2ª execução → mesma linha, ec=0; diff dos snapshots (pg_roles, pg_default_acl, pg_auth_members, relacl) → IDEMPOTENTE
(iii) ALTER ROLE erp_runtime SUPERUSER BYPASSRLS CREATEDB; GRANT p3_bypass TO erp_runtime; t_own (FORCE) OWNER TO erp_runtime
      → ERROR: papel erp_runtime ainda escapa de RLS (1 via(s) … POSSE …): reatribua o dono ao migrador (ALTER TABLE ... OWNER TO postgres) … / ec=3
      → depois: t|t|t|1  (NADA persistiu: o DO é uma transação; ROLLBACK)
(iii-b) ALTER TABLE t_own OWNER TO postgres; rodar de novo → erp_runtime|f|f|f|0|3 / ec=0 ; pg_roles: f|f|f, membros=0
(iv)  p3_mig = LOGIN CREATEROLE NOSUPERUSER NOBYPASSRLS, dono de plano_i4 e das tabelas (a forma do gerenciado):
      PGUSER=p3_mig PGDATABASE=plano_i4 DB_RUNTIME_ROLE=erp_rt2 … → erp_rt2|f|f|f|0|2 / ec=0 ; pg_default_acl: p3_mig|r, p3_mig|S
(iv-b) ALTER ROLE erp_rt2 BYPASSRLS (pelo super) → como p3_mig: ERROR: papel erp_rt2 tem BYPASSRLS e p3_mig nao pode remover (precisa de BYPASSRLS) / ec=3
(iv-c) tabela public.t_alheia de OUTRO dono → ERROR: tabela/sequencia public.t_alheia pertence a p3_outro e p3_mig nao pode conceder DML nela: ALTER ... OWNER TO p3_mig … / ec=3
(v)   CREATE TABLE t_depois (por p3_mig, DEPOIS do script) → has_table_privilege('erp_rt2', 't_depois', 'SELECT,INSERT,UPDATE,DELETE') = t; USAGE na sequência = t
(vi)  trava v2 sob erp_rt2 em plano_i4 → 0 linhas (o papel que o script produz PASSA na trava)
(vii) fake-entrypoint.sh (set -Eeo pipefail; executa se -x, senão source): modo 100755 e modo 100644 → "entrypoint: continua vivo", ec=0
      sem DB_RUNTIME_PASSWORD → "DB_RUNTIME_PASSWORD obrigatória", ec=1
```

Limite medido e **declarado** (3.4 da r1): `ALTER DEFAULT PRIVILEGES` cobre só tabelas criadas pelo **migrador nomeado** e
**neste banco**. Tabela criada por outro papel fica sem grant → o script **falha nomeando a tabela** (iv-c); tabela futura de
outro papel só aparece como `42501` no primeiro acesso (R2). O plano exige que **todo DDL** (migrações, `db:provision-rbac`)
rode como o migrador — é o que a pipeline já faz (`PROD_DATABASE_URL`, §0.3 P-j).

### §R.5 — Fiação de produção (F9, P1)

`$SP/le-export.sh <CHAVE>`: `env -i` + PROD_OK do teste + `NODE_ENV=production` + `DOTENV_CONFIG_PATH=/dev/null`, `node --import
tsx -e "import('./src/config/env.ts').then(m => console.log(m.env.NODE_ENV + ' ' + m.env['<CHAVE>']))"`.

```
$ bash le-export.sh EVIDENCE_SCANNER                       → production unavailable   (ec=0)
$ sed -i 's/production ? "unavailable" : "noop"/production ? "noop" : "noop"/' src/config/env.ts   (mutação temporária)
$ bash le-export.sh EVIDENCE_SCANNER                       → production noop          ← o filho VÊ a mutação
$ node --test --import tsx tests/o6r07b-scanner-failclosed.test.ts   → # pass 13 # fail 0   ← o precedente NÃO vê (P1)
$ git checkout -- src/config/env.ts && cmp … && git status --short | wc -l → revertido, 0
```

`$SP/boot.sh <DATABASE_URL> 3457 3458`: `src/server.ts` **real** num filho, `NODE_ENV=production`, PROD_OK (Redis =
`redis.interno.exemplo.com`, inalcançável; o gate `Ω6R-DAT-001` recusa host local em produção — medido: `ZodError REDIS_URL`
com `127.0.0.1`), `DATABASE_URL` = superusuário do cluster:

```
{"level":50,"error":{"name":"RedisCommandError"},"msg":"Failed to start ERP Techsolutions API"}   … "Job worker tick failed" ×N   t=18s
```

Hoje o boot **passa** do ponto onde a trava viverá e morre no Redis. Com a trava (E1): a primeira linha `Failed to start` tem de
trazer `RUNTIME_ROLE_CAN_BYPASS_RLS`, **antes** de qualquer linha do worker, com `exit 1` em segundos — T15; e a mutação
"apagar a chamada em `main()`" reproduz exatamente a saída acima (Redis, não a trava) ⇒ vermelho.

### §R.6 — Semente e ordem (F12) e Apêndice B re-executado (N2)

```
$ node -e '…'  → semente v1: concatenação A,A,A,B,B ordenada por occurredAt? true   (mutante sem reordenar PASSA = F12)
                 semente v2: concatenação A(1,3,5),B(2,4) ordenada? false → mutante VERMELHO; reordenada: true
                 agregados v1 [A:15,B:15] ordenado? true | v2 [A:15,B:14] ordenado? false
$ ADMIN_URL=postgresql://postgres@127.0.0.1:54353/erp_plano?schema=public npx tsx $SP/medir-papel.ts → # 22 itens, 0 fora do esperado (ec=0)
$ psql … → 0 0 0 0   (papéis san3_05, tenants, eventos, cobranças)
```

### §R.7 — Números (N5, N8, F10)

```
$ git grep -n -i -E 'CREATE ROLE|CREATE USER' origin/main -- prisma/migrations | wc -l      → 0
$ git show origin/main:.github/workflows/deploy-production.yml | sed -n 141p → "# `migrate deploy` NÃO cria papel: nenhuma migração insere em `roles`, e produção nunca semeia."  (tabela RBAC — N5)
$ git grep -n -i -E 'rolbypassrls|rolsuper|BYPASSRLS' origin/main -- src | wc -l            → 8 (1 executável: login-readiness.ts:202)
$ psql … "… NOT relforcerowsecurity" → _prisma_migrations, cloud_charge_calculation_runs, cloud_charge_rules, cloud_cost_allocation_runs, cloud_cost_imports, cloud_cost_line_items, permissions, role_permissions, tenants
$ node --test … deploy-manifest-parity → 28/28 · production-runtime-gates → 63/63 (grep `test(`: 22 · 30)
$ grep -n -E '^\s*test\(|cloudUsageEvent|NOSUPERUSER' tests/rls-tenant-isolation.test.ts → test( l.15 (só declaração de pulo), l.19; NOSUPERUSER l.44; tabelas de nuvem l.2460-2680 e 3053-3068
```

---

## §0 — Terreno e LINHA DE BASE (medido por mim, comando + saída)

### 0.1 Referências — resolvidas, não digitadas

```
$ git fetch origin && git rev-parse origin/main
3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c
$ git rev-parse HEAD ; git merge-base HEAD origin/main
3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c
3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c
$ git log --oneline -3 origin/main
3b1fe0f docs(registro): votos, inspetor e porteiro do #394 versionados, e o backfill dele (#395)
b3f0af5 docs(governanca): D-SEM-TETO-AUDITORIA-NO-3 — sem teto de ciclos, auditoria da maquina no ciclo 3 (#394)
fc3363e chore(registro): corpo de agente novo para de nascer invisivel, e dois registros voltam a ser texto (B-SAN3-00)
```

`3b1fe0f9` é o esperado pelo mandato ("3b1fe0f9 ou descendente") — é ele mesmo, não um descendente.

### 0.2 A máquina de medição

```
$ uname -a
Linux vm 6.18.44-fc-v50 #1 SMP PREEMPT_DYNAMIC @0 x86_64 x86_64 x86_64 GNU/Linux
$ node --version ; npm --version
v22.22.2
10.9.7
$ docker --version ; timeout 120 docker run --rm postgres:16 postgres --version
Docker version 29.3.1, build c2be9cc
failed to connect to the docker API at unix:///var/run/docker.sock; check if the path is correct and if the daemon is running: dial unix /var/run/docker.sock: connect: no such file or directory
(exit=1 — há CLIENTE docker, NÃO há daemon: nada de contêiner nesta máquina)
$ which psql pg_ctl postgres
/usr/bin/psql            (exit=1 — pg_ctl e postgres não estão no PATH…)
$ ls /usr/lib/postgresql/16/bin | tr '\n' ' '
… initdb pg_ctl pg_dump postgres psql …   (…mas o pacote postgresql-16 está instalado)
$ /usr/lib/postgresql/16/bin/postgres --version
postgres (PostgreSQL) 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)
```

**Deu para subir Postgres 16 descartável — sem docker, com os binários do pacote**, como usuário `postgres`
(`initdb` recusa rodar como root), em `/var/lib/postgresql/erp_san3_05` (o scratchpad da sessão fica sob
`/tmp/claude-0`, `drwx------ root`, ilegível para o usuário `postgres`), porta **54329**, `listen_addresses=127.0.0.1`,
auth `trust` (cluster local e efêmero; nenhum segredo):

```
$ runuser -u postgres -- /usr/lib/postgresql/16/bin/initdb -D /var/lib/postgresql/erp_san3_05/data -U postgres --auth=trust --no-instructions
initdb exit=0
$ runuser -u postgres -- /usr/lib/postgresql/16/bin/pg_ctl -D /var/lib/postgresql/erp_san3_05/data -o "-p 54329 -k /var/lib/postgresql/erp_san3_05 -c listen_addresses=127.0.0.1" -l /var/lib/postgresql/erp_san3_05/server.log -w start
server started
$ psql -h 127.0.0.1 -p 54329 -U postgres -d postgres -Atc "SELECT version(); SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname='postgres';"
PostgreSQL 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1) on x86_64-pc-linux-gnu, compiled by gcc (Ubuntu 13.3.0-6ubuntu2~24.04.1) 13.3.0, 64-bit
postgres|t|t
$ npm ci --no-audit --no-fund   → exit=0 (222 pacotes em node_modules) ; DATABASE_URL=postgresql://build:build@localhost:5432/build npx prisma generate → client gerado
$ psql … -c "CREATE DATABASE erp_san3_05" && DATABASE_URL="postgresql://postgres@127.0.0.1:54329/erp_san3_05?schema=public" npx prisma migrate deploy
All migrations have been successfully applied.   (migrate exit=0)
$ psql … -d erp_san3_05 -Atc "SELECT count(*) FROM pg_tables WHERE schemaname='public'; SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relforcerowsecurity; SELECT count(*) FROM pg_policies WHERE schemaname='public';"
115
106
107
```

**Toda premissa de banco deste plano está, portanto, MEDIDA sob um papel `NOSUPERUSER NOBYPASSRLS` real** (§0.5) —
a cláusula "se não der, marque como HIPÓTESE" do mandato não se aplica às premissas de banco; aplica-se ao que
depende de **docker** (o compose local-prod) e ao que depende de **produção** (o papel real do Fly) — §0.6.

### 0.3 As premissas do enunciado, uma a uma

| # | Premissa | Estado | Comando → saída |
|---|---|---|---|
| P-a | Nada no repositório impõe `NOSUPERUSER NOBYPASSRLS` ao papel de runtime (item 9) | **MEDIDO — verdadeira** (números corrigidos, N8) | `git grep -n -i -E 'rolbypassrls\|rolsuper\|BYPASSRLS' origin/main -- src \| wc -l` → **8** linhas: 7 comentários; a **única** executável é `src/modules/auth/services/login-readiness.ts:202` (a sonda do B-O6R-01 pergunta pelo **dono da função** `auth_login_candidates`, não pelo papel corrente, e "não derruba o boot", l.7-8). `src/server.ts` (48 linhas) não consulta o banco antes do `listen`. `src/config/env.ts` tem os gates G1, G2, G3, G5, G-EVIDENCE-SCANNER, G-EVIDENCE-SNIFFABLE — nenhum sobre papel de banco. |
| P-b | O compose de subida/smoke conecta como `postgres` (`docker-compose.prod.yml:35,57`) | **MEDIDO — verdadeira** | `git show origin/main:docker-compose.prod.yml \| cat -n` → l.35 `DATABASE_URL: postgresql://postgres:postgres@postgres:5432/erp_techsolutions?schema=public` (serviço `migrate`); l.57 idem (serviço `api`, `NODE_ENV: production` na l.51). |
| P-c | Dev e CI rodam como `postgres` (superusuário) — o defeito do item 10 é invisível na suíte | **MEDIDO — verdadeira** | `.github/workflows/ci.yml:34,128` (`postgresql://postgres:postgres@localhost:5432/…`), `docker-compose.yml:7` (`POSTGRES_USER: postgres`), `.env.example:12`. E `postgres\|t\|t` no cluster (§0.2). |
| P-d | O papel real da produção é secret do Fly e **não foi medido** | **HIPÓTESE** (por construção: é segredo) | comando do dono em §0.6 H2. `fly.production.toml:9` declara só o NOME `DATABASE_URL`; `deploy-production.yml:136-138` roda `prisma migrate deploy` com `secrets.PROD_DATABASE_URL` — **outro** secret (GitHub Environment), l.164 idem para `db:provision-rbac`. |
| P-e | `docs/deployment.md` afirma em prosa o que nenhum mecanismo garante | **MEDIDO — conflito registrado (§A2)** | `docs/deployment.md:458`: "Em PRODUCAO o app conecta com role NAO-superuser (o `app_user`, sem BYPASSRLS) — nunca `postgres` —, … Confirmar na ativacao." e `:472-473` (runbook B-O6R-01): "O nome `app_user` acima é convenção em prosa, não fato". Prosa ≠ trava: este plano substitui a frase por mecanismo + procedimento (E4, E5). |
| P-f | `FORCE ROW LEVEL SECURITY` nas 4 tabelas de nuvem (e em quantas mais) | **MEDIDO — 106 tabelas, ENABLE = FORCE** | gerador L0 (§0.4): `ENABLE=106 FORCE=106`; no cluster: `relforcerowsecurity` = 106; `diff` nome a nome entre a lista das migrações e a do catálogo → **IDÊNTICAS**. Inclui `cloud_usage_events`, `cloud_usage_daily_aggregates`, `tenant_cloud_cost_allocations`, `tenant_cloud_charges`. **Sem FORCE (as 9, medidas — N8):** `_prisma_migrations`, `cloud_charge_calculation_runs`, `cloud_charge_rules`, `cloud_cost_allocation_runs`, `cloud_cost_imports`, `cloud_cost_line_items`, `permissions`, `role_permissions`, `tenants`. |
| P-g | A policy é `tenant_id = current_setting('app.current_tenant_id', true)`; sem GUC ela é falsa | **MEDIDO** | `prisma/migrations/20260614000000_add_cloud_charge_markup_rules/migration.sql:158-160`: `USING ("tenant_id"::text = current_setting('app.current_tenant_id', true)) WITH CHECK (…)`; `20260611000000…:60,67` e `20260613000000…:91` mesma forma. Sem GUC: `current_setting(…, true)` = `NULL` → comparação `NULL` → linha invisível e `INSERT` recusado (P6 em §0.5). |
| P-h | Item 10: as leituras de plataforma devolvem **zero** sob papel sem `BYPASSRLS` — e o remédio por tenant funciona no mesmo papel | **MEDIDO — 22/22** | §0.5 (P1…P7 = `0`; controles positivos por tenant = `3`, `2`, `1`, `2`; remédio R1 = `5`). |
| P-i | A consulta do teste de encerramento do §5.2 (`SELECT rolsuper, rolbypassrls … WHERE rolname = current_user`) basta | **MEDIDO — falsa (incompleta) — e a consulta da v1 também era** | G4c em §0.5: um papel `false:false` que é **MEMBRO** de um papel `BYPASSRLS` passa nela — e G4b prova que a porta é real. A crítica mediu mais duas portas que a consulta **da v1** deixava abertas: pertença ao **dono** (`ALTER TABLE … NO FORCE`, F5) e login superusuário com `options=-c role=…` (F13). A trava desta v2 usa `pg_has_role` sobre atributo **e** posse, para `session_user` **e** `current_user` (§2, §R.1). |
| P-j | Migrador e app podem ser papéis **distintos** sem tocar a pipeline | **MEDIDO — verdadeira** | `deploy-production.yml:136-138,162-164` (`PROD_DATABASE_URL`, GitHub Environment) × `fly.production.toml:9` (`DATABASE_URL`, Fly secret): já são **dois** segredos. O ato do dono (§11) troca só o segundo. |
| P-k | O app não precisa de privilégio além de `SELECT/INSERT/UPDATE/DELETE` + `USAGE/SELECT` em sequências | **MEDIDO no estático; residual em §0.6 H4** | `git grep -n -i -E '\b(TRUNCATE\|LISTEN\|pg_notify\|NOTIFY\|REFRESH MATERIALIZED\|COPY .* FROM\|LOCK TABLE\|CREATE TEMP\|SET ROLE\|SET SESSION AUTHORIZATION)\b' origin/main -- src` → 0 ocorrências executáveis (os hits são nomes de job `impound.notify-due` e a coluna `SET role = …` de um `UPDATE` em `checklist-prisma.repository.ts:574`). O `pg_advisory_xact_lock` (`src/database/financial-period-lock.ts`) e o `set_config` não exigem privilégio. A única `SECURITY DEFINER` (`auth_login_candidates`, `REVOKE ALL FROM PUBLIC`) é ato humano do runbook B-O6R-01 — fica `inert_no_execute` até o GRANT (esperado; §11 passo 4). |
| P-l | `ALTER DEFAULT PRIVILEGES` cobre as tabelas que o migrador criar **depois** | **MEDIDO — verdadeira** | no cluster: `CREATE ROLE h6_runtime …; ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO h6_runtime; … ON SEQUENCES …; CREATE TABLE h6_depois(id serial primary key); SELECT has_table_privilege('h6_runtime','h6_depois','SELECT,INSERT,UPDATE,DELETE'), has_sequence_privilege('h6_runtime','h6_depois_id_seq','USAGE'), has_table_privilege('h6_runtime','tenants','SELECT')` → `t\|t\|f`. Logo o procedimento precisa das **duas** coisas: `GRANT … ON ALL TABLES` (as existentes) **e** `ALTER DEFAULT PRIVILEGES` (as futuras). |
| P-m | Nenhum ramo em voo toca os arquivos do bloco | **MEDIDO — verdadeiro** | laço sobre `git for-each-ref refs/remotes/origin` com `git diff --name-only origin/main...<ramo>` filtrado pela fronteira: só `scripts/` aparece, e em **outros** arquivos (`audit-agents-skills.mjs`, `mandato-*.sh`, `demo-seed/*`, `porteiro-pre-merge.mjs`, `inventory-duplicates-census.sql`, `run-backend-tests.mjs`). Nada em `env.ts`, `src/database/`, compose, `deployment.md`, `server.ts` nem nos dois repositórios de nuvem. |
| P-n | "15 suítes exigem `CREATEROLE`/dono de tabela" (§5.2, fora do bloco → `B-ARNES-2`) | **MEDIDO — 13 + 8** | `git grep -l -E 'createEphemeralRole\|CREATE ROLE\|withRoleCatalogLock\|createSyntheticOrphanRole' origin/main -- tests` (sem `helpers/`) → **13** suítes escrevem catálogo; `git grep -l -E 'TRUNCATE\|ALTER TABLE\|DROP TABLE\|CREATE EXTENSION\|DISABLE TRIGGER' … -- tests` → **8** fazem DDL de dono. O número "15" do §5.2 não se reproduz assim; a classe está confirmada e continua **fora deste bloco** (§13). |
| P-o | A lista "hoje medida" do §5.2 tem **quatro** leituras | **MEDIDO — são sete sítios, em cinco métodos; um deles fora da fronteira** | §0.4. |
| P-p | Origem (§C7.1-ter(a)) | **MEDIDO** | `git log --diff-filter=A --date=short -- <arquivo>` devolve `f4ef511 2026-08-11` para os quatro arquivos de código **e** para as três migrações — `f4ef511` é a **raiz** do histórico (`git rev-list --max-parents=0 origin/main`). A datação útil vem das migrações (`20260611`, `20260613`, `20260614`) e das pendências (`P-INFRA-RLS`: Ω3-d; `P-O6R-B06-…`: 2026-09-07, medida no #386). Tudo **antecede** este bloco. |
| P-q | (v1) "posse pode ser só reportada" | **MEDIDO — falsa (F5)** | §R.1: membro do dono lê 3 linhas sem GUC após `ALTER TABLE … NO FORCE`; a v2 recusa posse. |
| P-r | (v1) "julgar `current_user` basta" | **MEDIDO — falsa (F13)** | §R.1: `options=-c role=p2_clean` com login `postgres` passa na v1 e escapa com `SET ROLE NONE`; a v2 julga `session_user` e `current_user`. |
| P-s | (v1) "o SQL do procedimento roda como escrito" | **MEDIDO — falsa (F6)**; substituído e executado | §R.4: 7 cenários, `ec` por cenário. |

### 0.4 O INVENTÁRIO — gerado por script, pela PROPRIEDADE (CE-G1) — v2

A propriedade **não é** "estes quatro métodos"; é: *acesso (leitura ou escrita) a uma tabela sob `FORCE ROW LEVEL
SECURITY`, executado por um executor **sem** `app.current_tenant_id` — que só devolve linhas (ou só grava) quando o
papel de banco escapa de RLS*. O gerador v2 (Apêndice A, **verbatim**, md5 `293b3746ad7e4dea1c11e16c794e7aa3`; o
desenvolvedor o commita como `scripts/san3-05-acessos-de-plataforma.mjs`) deriva tudo da fonte, em três camadas: L0 tabelas
FORCE ← `prisma/migrations/**`, tabela→model→acessor ← `prisma/schema.prisma`, e **os ops Prisma ← o client gerado**
(`node_modules/.prisma/client/index.d.ts`: 17 métodos do `*Delegate`, incluindo `updateManyAndReturn` — F4); L1 todo
`<recv>.<acessor>.<op>(…)`, `<recv>["<acessor>"].<op>(…)`, `<acessor>.<op>(…)` (identificador solto) e todo
`$queryRaw*/$executeRaw*` — com a tabela citada **ou OPACO** (SQL fora do literal) — em `src/**/*.ts`, com receptor e
envoltório lidos da AST; L2 para receptor injetado (`this.client`…), quem instancia a classe **e suas subclasses**
(`extends`), e com quê. `typescript` e o client são resolvidos a partir **do próprio script**, nunca do alvo (F14).

**Classificação v2 — default NEGAR (F2):** só `SOB-CONTEXTO` (receptor `tx` de um envoltório que seta o GUC, ou
`$transaction` com `setTenantRlsContext` **antes** do sítio) e `INJETADO` **resolvido em L2 para contexto** ficam fora do
inventário suspeito. Tudo o mais entra: `CRU`, `OUTRO(<recv>)`, `TX-SEM-ENVOLTORIO?`, `$TRANSACTION-SEM-SETTER` (F3),
`$TRANSACTION-SETTER-DEPOIS?`, `CRU-DENTRO-DE-ENVOLTORIO` (client raiz usado dentro do callback), `INJETADO-DENTRO-DE-ENVOLTORIO`,
`INJETADO-SEM-CLASSE` (função livre), `IDENTIFICADOR-ACESSOR` (desestruturação), `RAW-SQL OPACO`. Comando e cabeçalho no
head `3b1fe0f9`:

```
$ node scripts/san3-05-acessos-de-plataforma.mjs .        # (nesta sessão: node $SP/gerador-v2.mjs .)
# L0: tabelas ENABLE=106 FORCE=106 · acessores Prisma em FORCE=106 · OPS(derivados)=17 · src/**/*.ts=777
# L1: call-sites sobre tabelas FORCE (+ RAW opacos) = 720
# L1 por classificação: {"TX-SEM-ENVOLTORIO?":12,"INJETADO-SEM-CLASSE":8,"INJETADO":646,"SOB-CONTEXTO":51,"$TRANSACTION-SEM-SETTER":2,"CRU":1}
# L2: classes com executor injetado = 70; instanciações achadas = 451
# L2 por classificação do argumento: {"SOB-CONTEXTO":423,"TX-SEM-ENVOLTORIO?":14,"CRU":4,"OUTRO()":4,"$TRANSACTION-SETTER-DEPOIS?":1,"INJETADO":5}
# INVENTÁRIO SUSPEITO (L1+L2): 48 chaves · sha1=147d41c209a5f3bbce9fc7d208fd33a02e6bd8d2 · L2b (derivado, informativo) = 65
```

**O inventário suspeito (48 chaves, Apêndice A) é o que o ratchet T13 congela**, por chave **sem número de linha** (arquivo ·
classe.método · receptor · acessor.op · tabela · contexto · classe): chave nova **ou** chave sumida = vermelho; mudar o
congelado é ato consciente que a junta vê no diff, com uma linha de motivo por chave (a forma de
`tests/db-catalog-write-guard.test.ts`). Os L2b (65, com linha) são **derivados** de L2 e ficam fora do congelado (§R.2).

**A lista fechada do REMÉDIO (item 10) — os sítios alcançáveis de instanciação `CRU`, no head `3b1fe0f9`: os mesmos 7 da v1**
(a crítica conferiu linha, método, tabela e fronteira nos 7 — item 1.2 da r1):

| # | Sítio | Método | Tabela FORCE | Como chega ao client cru | Fronteira |
|--:|---|---|---|---|---|
| 1 | `src/modules/cloud-usage/cloud-usage-prisma.repository.ts:61` | `PrismaCloudUsageRepository.listEvents` | `cloud_usage_events` | `:173` `new PrismaCloudUsageRepository(this.prismaClient).listEvents()` — o ramo **sem `tenantId`** de `RlsPrismaCloudUsageRepository.listEvents` | **dentro** |
| 2 | `…/cloud-usage-prisma.repository.ts:120` | `PrismaCloudUsageRepository.listDailyAggregates` | `cloud_usage_daily_aggregates` | `:197` idem, ramo sem `tenantId` de `listDailyAggregates` | **dentro** |
| 3 | `src/modules/cloud-charges/cloud-charge-prisma.repository.ts:167` | `PrismaCloudChargeRepository.replaceTenantCharges` (`deleteMany`) | `tenant_cloud_charges` | `:240` `createPrismaCloudChargeRepository()` devolve `new PrismaCloudChargeRepository(prisma)` — **fábrica crua, sem envoltório `Rls*`** | **dentro** |
| 4 | `…/cloud-charge-prisma.repository.ts:171` | `replaceTenantCharges` (`create`) | `tenant_cloud_charges` | idem | **dentro** |
| 5 | `…/cloud-charge-prisma.repository.ts:202` | `listTenantCharges` (`findMany`) | `tenant_cloud_charges` | idem | **dentro** |
| 6 | `…/cloud-charge-prisma.repository.ts:220` | `listAllocationTenantAllocations` (`findMany`) | `tenant_cloud_cost_allocations` | idem — **não estava na lista do §5.2**; alimenta `executeCalculationRun` (`cloud-charge.service.ts:85`): sob papel sem bypass a cobrança calcula **zero** cobranças com `status: completed` | **dentro** (mesmo arquivo do §5.2) |
| 7 | `src/modules/cloud-cost-allocation/cloud-cost-allocation-prisma.repository.ts:238` | `PrismaCloudCostAllocationRepository.listUsageDailyAggregates` | `cloud_usage_daily_aggregates` | `:413` fábrica crua | **FORA** — e **sem chamador em `src/`** (`git grep -n listUsageDailyAggregates origin/main -- src tests` só devolve a interface, a implementação, um comentário de `.types.ts` e a sonda `o6r06-allocation-basis-rls-db.test.ts:59`). Fica **nominalmente no congelado** do T13 (chave `L2 … new PrismaCloudCostAllocationRepository(prisma) … CRU`) até o dono `B-O6R-08` a resolver (§13); sumir dessa chave sem atualizar o congelado é vermelho (F1) |

**Quem chama os cinco métodos de dentro (fluxo até a superfície):** `cloud-usage.service.ts:114` (`summarizeEvents` ←
`getPlatformUsageSummary` ← `GET /platform/cloud-usage/summary`, `cloud-usage.routes.ts:12-17`) e `:49`
(`aggregateDailyUsage`, o job `cloud-usage.aggregate-daily` — que sob papel sem bypass agregaria **nada**);
`:102` (`getTenantUsageDaily`, sempre com tenant — o ramo cru de `listDailyAggregates` hoje só é alcançável por
chamada direta sem tenant); `cloud-charge.service.ts:85,104,155,178` (`executeCalculationRun`, `listTenantCharges`,
`getCloudChargeSummary` ← `GET /platform/cloud-charges/...`, `cloud-charge.routes.ts:88-119`).

**O que está no congelado e NÃO é vazamento (para a junta conferir o critério, não a lista) — verificado por leitura:**
- **L1 `TX-SEM-ENVOLTORIO?` (9 chaves, 12 sítios)** — helpers que recebem `tx` do chamador: `src/database/rls.ts` (o setter
  e `setIdentityRlsContext`), `identity-link.service.ts:613`, `identity-resolver.ts` (chamados em `identity-link.service.ts:98,179,189,194,195,315`,
  após `setTenantRlsContext`/`setIdentityRlsContext`), `session-admin.service.ts:163` (`resolveUserLabels`, chamado na l.80
  dentro de `this.runWithTenantContext(actor.tenantId, …)` = `withTenantRls(prisma, …)`, `auth-runtime.ts:82`),
  `financial-period-close-prisma.repository.ts:111,115` (`readCompetencia`, dentro de `withTenantRls`, l.59 e 66),
  `financial-period-lock.ts` (advisory lock, sem tabela).
- **L1 `$TRANSACTION-SEM-SETTER` (2 sítios, F3)** — `work-order-prisma.repository.ts` `assign` (`workOrderAssignment.create`
  e `workOrder.updateManyAndReturn`, l.541 e vizinha): o `$transaction` não seta o GUC porque `assign` é chamado **dentro** de
  `withTenantRls` (`:669`, lido pela crítica) — contexto herdado; o gerador rotula pelo motivo certo agora, e a chave fica congelada.
- **L1 `INJETADO-SEM-CLASSE` (8)** — funções livres com `client`/`executor` como parâmetro (`identity-link.repository.ts`,
  `login-candidates.repository.ts`, `login-readiness.ts`, `cloud-usage.capture.ts`, `work-order-cancellation.gate.ts`,
  `impound.outbox.repository.ts`, `rls.ts`): o chamador decide o contexto — por isso são **suspeitas** e congeladas, não absolvidas.
- **L1 `CRU` (1)** — `health.routes.ts` `$queryRawUnsafe` opaco (`SELECT 1`-like; sem tabela).
- **L2 `TX-SEM-ENVOLTORIO?` (14)** — `new XRepository(tx)` em helpers de `auth-runtime.ts`, `identity-link.service.ts`,
  `identity-resolver.ts`, `local-auth-credential.service.ts`, `session-admin.service.ts`, `financial-title-prisma.repository.ts`
  (mesmo padrão acima). **L2 `OUTRO()` (4)** — `prisma-core-saas.store.ts:38-41` (`new UserRepository()` etc., default = client
  cru): os campos **não têm chamada** (`campo users → (sem chamada)`); todo uso passa por `new XRepository(tx)` sob
  `withTenantRls`. **L2 `INJETADO` (5)** — `impound-prisma.repository.ts:165,211,500,721`, `release-prisma.repository.ts:445`:
  transitivas — as 35 instanciações de `PrismaImpoundRepository`/`PrismaReleaseRepository` são todas `SOB-CONTEXTO` (`--all`).
  **L2 `$TRANSACTION-SETTER-DEPOIS?` (1)** — `prisma-core-saas.store.ts:47`. **L2 `CRU` (4)** — os sítios 1–7 acima.

**Residual declarado do gerador (é aproximação estática, não prova):** acessor dinâmico (`prisma[nome]`), `Object.values(prisma)`,
SQL cru montado fora do arquivo e client obtido por caminho sem nome de acessor Prisma não são vistos — e são as formas que
o ratchet **não** enuncia. O árbitro da propriedade é a **medição dinâmica**: §0.5 (repositório) e §R.3 (superfície HTTP,
o T11-diferencial), que o teste de encerramento repete (T10–T12).

### 0.5 A MEDIÇÃO sob papel `NOSUPERUSER NOBYPASSRLS` real — 22 itens, 0 fora do esperado

> **v2:** re-executado nesta sessão no cluster `54353` com a única emenda N2 (`REPO` por `cwd`): `22 itens, 0 fora do esperado`, limpeza `0 0 0 0` (§R.6). A r1 também reproduziu 22/22 no cluster dela. Os itens G1–G4 medem a trava **v1**; a trava **v2** (posse + `session_user`) está medida em §R.1 sob 11 papéis, e a superfície HTTP em §R.3.

Script em Apêndice B (**verbatim**), executado com `ADMIN_URL=postgresql://postgres@127.0.0.1:54329/erp_san3_05?schema=public
npx tsx <scratchpad>/medir-papel.ts` a partir da raiz do repo, importando **as classes reais** de
`src/modules/cloud-usage/cloud-usage-prisma.repository.ts`, `src/modules/cloud-charges/cloud-charge-prisma.repository.ts`,
`src/modules/cloud-cost-allocation/cloud-cost-allocation-prisma.repository.ts` e `src/database/rls.ts` do head.
Semente: 2 organizações (`A` com 3 eventos, `B` com 2; 1 agregado diário cada; 1 alocação cada; 1 cobrança cada),
gravada **sob contexto por tenant** como o app grava. Papéis criados e derrubados pelo script: `san3_05_runtime`
(`LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS` + grants DML), `san3_05_super_com_outro_nome`
(`SUPERUSER`), `san3_05_bypass_nologin` (`NOLOGIN BYPASSRLS`). Ao final: `pg_roles LIKE 'san3_05%'` = **0**,
`tenants LIKE 'san3-05-%'` = **0**, `cloud_usage_events` = 0, `tenant_cloud_charges` = 0 (limpo, medido).

| id | item | esperado | medido | ok |
|---|---|---|---|:-:|
| M0 | postura dos papéis (rolname:rolsuper:rolbypassrls) | `san3_05_bypass_nologin:false:true,san3_05_runtime:false:false,san3_05_super_com_outro_nome:true:false` | idem | ✓ |
| G1 | trava sob `postgres` (superusuário): linhas devolvidas > 0 ⇒ RECUSA | `recusa` | `recusa` | ✓ |
| G2 | trava sob `san3_05_runtime` (NOSUPERUSER NOBYPASSRLS): 0 linhas ⇒ PASSA | `passa` | `passa` | ✓ |
| G3 | MUTAÇÃO: superusuário com OUTRO nome ⇒ RECUSA (a trava é por atributo, não por nome) | `recusa` | `recusa` | ✓ |
| G4 | MUTAÇÃO: papel limpo que é MEMBRO de papel BYPASSRLS ⇒ RECUSA (`pg_has_role`) | `recusa` | `recusa` | ✓ |
| G4b | a porta dos fundos é real: `SET ROLE <bypass>` + `SELECT` sem GUC devolve os 5 eventos | `5` | `5` | ✓ |
| G4c | a consulta INGÊNUA do §5.2 sob o mesmo papel-membro diz `false:false` (cega à pertença) | `false:false` | `false:false` | ✓ |
| O1 | tabelas FORCE de posse do papel de runtime (dono ≠ app) | `0` | `0` | ✓ |
| O2 | tabelas FORCE de posse do migrador (`postgres`) | `106` | `106` | ✓ |
| P1 | `cloud-usage-prisma.repository.ts:173` `listEvents({})` [plataforma, sem tenant] — hoje | `0` | `0` | ✓ |
| P1c | controle positivo: `listEvents({tenantId: A})` sob contexto | `3` | `3` | ✓ |
| P1d | controle positivo: `listEvents({tenantId: B})` sob contexto | `2` | `2` | ✓ |
| P2 | `cloud-usage-prisma.repository.ts:197` `listDailyAggregates({})` [plataforma] — hoje | `0` | `0` | ✓ |
| P2c | controle positivo: `listDailyAggregates({tenantId: A})` | `1` | `1` | ✓ |
| P3 | `cloud-charge-prisma.repository.ts:202` `listTenantCharges(run)` — hoje | `0` | `0` | ✓ |
| P4 | `cloud-charge-prisma.repository.ts:220` `listAllocationTenantAllocations(allocRun)` — hoje | `0` | `0` | ✓ |
| P5c | controle: `listTenants()` (tabela `tenants` sem RLS) devolve as 2 organizações da semente | `2` | `2` | ✓ |
| P6 | `cloud-charge-prisma.repository.ts:167-171` `replaceTenantCharges` — hoje (`deleteMany` silencioso + `INSERT` recusado) | `42501 row-level security` | `42501 row-level security` | ✓ |
| P6b | …e o `deleteMany` sem contexto NÃO apagou nada (as 2 cobranças seguem lá, lidas como superusuário) | `2` | `2` | ✓ |
| P7 | `cloud-cost-allocation-prisma.repository.ts:238` `listUsageDailyAggregates` (sem chamador em `src`) — hoje | `0` | `0` | ✓ |
| P7c | controle: `listTenantAllocations(allocRun)` do B-O6R-06 (laço por tenant SOB contexto) devolve 2 | `2` | `2` | ✓ |
| R1 | REMÉDIO (protótipo): laço por tenant sob contexto, mesmo papel, soma os eventos das 2 organizações | `5` | `5` | ✓ |

**Leitura:** o item 10 é real e **silencioso** (P1–P4, P7: `0`, sem erro; só a **escrita** grita, P6). O remédio
por tenant sob contexto (R1) funciona no **mesmo** papel — logo o bloco não precisa de privilégio novo, precisa de
**contexto**. E a trava proposta (G1–G4) distingue os quatro casos que importam, incluindo o que a consulta do
§5.2 não distingue (G4c).

### 0.6 HIPÓTESES — o que NÃO foi medido aqui, com o comando que derruba cada uma

| id | Hipótese | Por que não foi medida | Comando que a mede |
|---|---|---|---|
| H1 | O script do papel, montado em `/docker-entrypoint-initdb.d/`, roda na **primeira** subida do volume do `postgres:16`, **no banco da app** (`POSTGRES_DB`, via `--username "$POSTGRES_USER" --dbname "$POSTGRES_DB"` — o entrypoint exporta `POSTGRES_USER/POSTGRES_DB/PGPASSWORD`, não `PGDATABASE`; medido na fonte pela r1, item 3.5) e **antes** do `migrate` (então os `ALTER DEFAULT PRIVILEGES` cobrem as tabelas das migrações — P-l) | sem daemon docker nesta máquina | `docker compose -f docker-compose.prod.yml down -v && docker compose -f docker-compose.prod.yml up -d postgres && docker compose -f docker-compose.prod.yml logs postgres \| grep -E 'running\|sourcing\|erp_runtime' && docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d erp_techsolutions -Atc "SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname='erp_runtime'; SELECT defaclrole::regrole, defaclobjtype FROM pg_default_acl"` → esperado `erp_runtime\|f\|f` e as linhas `postgres\|r`, `postgres\|S` **em `erp_techsolutions`**. E, na CI, o job `docker` (`ci.yml:394-477`) com `scripts/smoke-compose-persistence.mjs` verde no head. |
| H2 | O papel **de produção** hoje é superusuário/`BYPASSRLS` (ou não) | é segredo do Fly; ninguém mediu (`P-INFRA-RLS`, emenda de 2026-09-11) | pelo dono, com a URL do secret: `psql "$DATABASE_URL" -Atc "SELECT current_user, r.rolsuper, r.rolbypassrls, EXISTS (SELECT 1 FROM pg_roles b WHERE (b.rolsuper OR b.rolbypassrls) AND pg_has_role(current_user, b.oid, 'MEMBER')) AS escapa FROM pg_roles r WHERE r.rolname = current_user"`. Qualquer `t` ⇒ a trava vai recusar o boot ⇒ §11 antes do deploy. |
| H3 | Em produção, o migrador (`PROD_DATABASE_URL`) é o **dono** das 106 tabelas FORCE, e o papel do app não é dono **nem membro do dono** de nenhuma | idem | **é a trava que mede**, no boot (via `posse`, §2.2): se o papel do app for dono ou membro do dono, o boot recusa e o log traz `posse/<dono>`. Pelo dono, antes do deploy: a linha final do script (§11 passo 2) tem `posse = 0`. |
| H4 | O caminho do smoke de contêiner (`smoke-compose-persistence.mjs`: readiness → worker → grava organização → restart → relê) só exige DML + `USAGE` em sequências sob o papel novo | sem docker; e SQL dinâmico não é visto pelo grep de P-k | o mesmo job `docker` da CI no head: se o papel faltar privilégio, o smoke cai com `42501` no passo "grava organização" (o script já redige `DATABASE_URL`/`postgresql://` da saída — `smoke-compose-persistence.mjs:72-81`). |
| H5 | Boot recusado no Fly vira **restart em laço** até o dono trocar o secret (não "meio de pé") | sem ambiente | `fly logs -c fly.production.toml` após um deploy com papel errado: linha `Failed to start ERP Techsolutions API` com `code: RUNTIME_ROLE_CAN_BYPASS_RLS` e as `escapes`, máquina reiniciando; `fly status` sem máquina `started` passando no check. Localmente, o **T15** mede a metade que dá para medir: o processo real sai com `exit 1` em segundos, antes de tocar o Redis (hoje ele passa e morre no Redis aos ~18 s — §R.5). É o comportamento **desejado** (deployment.md:78-81: "configuracao incompleta nao degrada — ela reprova o boot"). |
| H6 | `tests/deploy-manifest-parity.test.ts` continua verde sem tocar manifesto nem `.env.example`, porque a chave nova é **opcional com default seguro** (não entra em `deriveRequiredInProduction()`, l.274-287, que só itera `PROD_BASELINE`; `.env.example` só precisa nomear chaves **exigidas**, l.431-434) | é consequência do desenho E2, medível só no diff | `node --test --import tsx tests/deploy-manifest-parity.test.ts` no head da entrega → **28/28** (executado no head-base: 28/28 — F10). Mutação que a derruba: tornar `DATABASE_RUNTIME_ROLE_GUARD` obrigatória — fica vermelha porque `envSchema.parse(process.env)` explode no import (`ZodError`), não pela lista derivada (mecanismo medido pela r1, item 4.4). |

---

## §1 — Objetivo · ator · fluxo · contrato

**Objetivo.** Fechar os itens 9 e 10 do gate vendável (`PLANO_SAN3.md` §4.1) com **mecanismo**, não prosa:
(9) o processo da API **só sobe em produção** se a identidade com que fala ao banco **não puder escapar de RLS** —
nem por atributo (`rolsuper`, `rolbypassrls`), nem por pertença (`SET ROLE` para um papel que escapa), nem por **posse**
(ser dono, ou membro do dono, de tabela `FORCE RLS` — um `ALTER TABLE … NO FORCE` e a política some; F5) — avaliado para
**`session_user` e `current_user`** (a URL pode trazer `options=-c role=…`; F13) —, e existe um **procedimento versionado e
executado** que cria esse papel (compose local-prod **e** banco gerenciado do dono, inclusive com migrador não-superusuário; F6–F8);
(10) as leituras e escritas **de plataforma** sobre tabelas `FORCE RLS` deixam de depender de bypass: rodam **por
organização, sob o contexto dela**, e somam — de modo que, no dia em que o papel de produção for trocado (ato do
dono, §11), o resumo de uso da plataforma, o Cloud Billing e a cobrança de nuvem **não zerem** — e a propriedade fica
**guardada** por um diferencial superusuário × papel sem bypass na superfície (T11) e por um ratchet de forma (T13).

**Ator.** Não há ator de negócio: é infraestrutura de segurança. Os papéis de plataforma (`platform_admin`,
permissões `platform:cloud-usage:read`, `platform:cloud-charges:*`) são os que **veem** o efeito do item 10; o
**dono** é quem pratica o ato do §4.2 (l.192).

**Fluxo origem → destino.**
1. `node dist/server.js` → `main()` → **[NOVO] trava do papel** (§2.2 E1; `session_user` ∧ `current_user`; atributo ∨ pertença ∨
   posse) → `createCoreSaasService()` → … → `listen`. Recusa ⇒ exceção nomeada **antes** do `listen` e antes de qualquer
   conexão ao Redis (medido: hoje o boot só morre no Redis, aos ~18 s — §R.5), conexão fechada, `process.exitCode = 1`
   (o `main().catch` que já existe em `src/server.ts:45-48`). **A fiação é medida pelo T15** (o servidor real, num filho).
2. `GET /platform/cloud-usage/summary` → `getPlatformUsageSummary` → `summarizeEvents` → `listEvents({sem tenant})`
   → **[NOVO] laço por organização sob contexto** → soma, reordenada. Idem `aggregateDailyUsage` (job) e `listDailyAggregates`.
3. `POST /platform/cloud-charges/calculation-runs` → `executeCalculationRun` → `listAllocationTenantAllocations`
   **[NOVO por tenant]** → cálculo → `replaceTenantCharges` **[NOVO por tenant, uma transação]**; `GET …/summary`
   → `listTenantCharges` **[NOVO por tenant]**.
4. Compose local-prod: `postgres` (init executa `scripts/db-runtime-role.sh` → cria `erp_runtime` **no banco da app**) →
   `migrate` (como `postgres`) → `api` (como `erp_runtime`, `NODE_ENV=production` ⇒ trava ativa ⇒ boot **prova** a postura) → smoke da CI.
5. Produção: o dono roda o script no banco gerenciado com a credencial do migrador (o script **falha nomeando** o que não
   puder corrigir), troca o secret `DATABASE_URL` do Fly para o papel novo, faz deploy; a trava é a prova (§11).

**Contrato.** Nenhuma rota, payload ou código HTTP muda. Contratos que mudam de **semântica** sob papel sem bypass:
`GET /platform/cloud-usage/summary` e `GET /platform/cloud-usage/tenants/:id/daily` (passam a devolver os números
reais — hoje, mesmo seed: `quantity: 50` sob superusuário, `metrics: []` sob papel limpo, §R.3); `GET /platform/cloud-charges/summary`,
`GET /platform/cloud-charges/calculation-runs/:id/charges` e o cálculo (idem). Boot: nova causa de recusa em produção,
nomeada `RUNTIME_ROLE_CAN_BYPASS_RLS` (item 9, `P-INFRA-RLS`), com **razões** no log (`via`: `atributo` | `posse`; `rolname`;
`is_self`). Env: chave nova **opcional** `DATABASE_RUNTIME_ROLE_GUARD` = `enforce` | `skip` (§2.2 E2). **`/health/*` não muda**
(corpo público inalterado — §2.8; a postura do papel vai só ao log estruturado do servidor).

---

---

## §2 — Onde mora a propriedade — respondido duas vezes

### 2.1 Pelo ENUNCIADO

A propriedade tem duas metades, e as duas são **do banco**, não do código de negócio:

- **(a) Identidade.** *A identidade com que a API fala ao banco em produção não consegue ler ou gravar linha de tabela
  `FORCE RLS` sem o GUC do tenant — nem com um comando a mais.* Em PostgreSQL 16, as vias **medidas** (§R.1) são três, e a
  formalização da v2 cobre as três, para os **dois** nomes da sessão:
  `¬∃ r ∈ pg_roles : (r.rolsuper ∨ r.rolbypassrls) ∧ (pg_has_role(session_user, r, 'MEMBER') ∨ pg_has_role(current_user, r, 'MEMBER'))`
  **∧** `¬∃ c ∈ pg_class : c.relforcerowsecurity ∧ (pg_has_role(session_user, c.relowner, 'MEMBER') ∨ pg_has_role(current_user, c.relowner, 'MEMBER'))`.
  A v1 formalizava só a primeira conjunção, só para `current_user` — e a crítica **mediu** dois escapes que ela aprovava:
  a pertença ao dono (`ALTER TABLE … NO FORCE` → 3 linhas sem GUC, F5) e o login superusuário com `options=-c role=<limpo>`
  (`SET ROLE NONE` → 3 linhas, F13). Hoje **nada** no repositório enuncia isso (P-a); `docs/deployment.md:458` enuncia em
  prosa e pede "confirmar na ativação".
  **O que fica fora, declarado:** (i) funções `SECURITY DEFINER` de dono que escapa e executáveis pelo papel — hoje só
  `auth_login_candidates(text)` (`REVOKE ALL FROM PUBLIC`; o `GRANT EXECUTE` é ato humano do runbook B-O6R-01) — a trava
  **não** as enumera; comando que as mede: `SELECT p.proname, pg_get_userbyid(p.proowner) FROM pg_proc p JOIN pg_roles o ON
  o.oid = p.proowner WHERE p.prosecdef AND (o.rolsuper OR o.rolbypassrls) AND has_function_privilege(current_user, p.oid, 'EXECUTE')`
  (→ pendência `P-SAN3-05-SECURITY-DEFINER-INVENTARIO`, §13); (ii) `pg_read_all_data`/`pg_write_all_data` **não** escapam
  (medido: membro de `pg_read_all_data` lê `0` linhas sem GUC — §R.1); (iii) `GRANT … WITH SET FALSE` é recusado sem poder
  `SET ROLE` — falso positivo **seguro**, aceito (N1).
- **(b) Contexto.** *Todo acesso a tabela `FORCE RLS` que precise de linhas de N organizações roda N vezes, cada uma
  sob o GUC da organização, e não uma vez sem GUC.* Hoje sete sítios violam isso (§0.4), e violam **em silêncio**
  (`0` linhas, `ec=0`) — o único que grita é a escrita (P6). Na superfície: mesma rota, mesmo seed, `50` × vazio (§R.3).

A metade (a) sem a (b) **zera** o painel de plataforma no dia da troca (é o item 10 como pré-requisito do 9). A (b)
sem a (a) é cosmética: sob superusuário o laço por tenant devolve o mesmo que a leitura crua. **Por isso são um
bloco só.**

### 2.2 Pelo REMÉDIO — cada metade mora num arquivo, e só num

**(a) → `src/database/runtime-role.ts` + `src/database/runtime-role.bootstrap.ts` + 1 linha em `src/server.ts` + gate em `src/config/env.ts`.**

- `RUNTIME_ROLE_GUARD_SQL` (constante **única**, o mesmo texto de `$SP/guard-v2.sql` medido em §R.1 — a junta confere byte a byte):
  ```sql
  SELECT via, rolname, rolsuper, rolbypassrls, is_self, tabelas_force
  FROM (
    SELECT 'atributo'::text AS via, r.rolname::text, r.rolsuper, r.rolbypassrls,
           (r.rolname = session_user OR r.rolname = current_user) AS is_self, NULL::int AS tabelas_force
    FROM pg_roles r
    WHERE (r.rolsuper OR r.rolbypassrls)
      AND (pg_has_role(session_user, r.oid, 'MEMBER') OR pg_has_role(current_user, r.oid, 'MEMBER'))
    UNION ALL
    SELECT 'posse', o.rolname::text, o.rolsuper, o.rolbypassrls,
           (o.rolname = session_user OR o.rolname = current_user), count(*)::int
    FROM pg_class c JOIN pg_roles o ON o.oid = c.relowner
    WHERE c.relkind IN ('r','p') AND c.relforcerowsecurity
      AND (pg_has_role(session_user, c.relowner, 'MEMBER') OR pg_has_role(current_user, c.relowner, 'MEMBER'))
    GROUP BY o.rolname, o.rolsuper, o.rolbypassrls, (o.rolname = session_user OR o.rolname = current_user)
  ) x ORDER BY via, rolname
  ```
  `probeRuntimeRolePosture(client)` devolve `{ sessionUser, currentUser, escapes: linhas acima }` (mais `SELECT session_user,
  current_user`). `assertRuntimeRolePosture(posture)` lança `RuntimeRoleGuardError` (`code = "RUNTIME_ROLE_CAN_BYPASS_RLS"`,
  `escapes` no erro) se `escapes.length > 0` — **qualquer via recusa**, inclusive `posse`. **Decisão revertida em relação à v1**
  (que só reportava posse): a pertença ao dono é um escape de um comando (§R.1), da mesma classe que a pertença a `BYPASSRLS`;
  e o cenário "provedor com um papel só" é exatamente o app rodando como migrador, que a trava recusa **de propósito** (o
  segundo papel é o ato do dono, §11). A trava não conhece **nomes**: `postgres`, `erp_runtime`, `fly-user` são indiferentes (G3).
- `assertRuntimeDatabaseRoleIfEnforced({ enforce = env.DATABASE_RUNTIME_ROLE_GUARD === "enforce", logger, loadClient,
  attempts = 5, backoffMs = 2000 })` — padrão de `src/infra/jobs/job-worker.bootstrap.ts` (dependências injetáveis,
  testável sem `server.ts`). Com `enforce`: abre o client (`src/database/prisma.ts`), sonda (retry só para erro de
  **conexão**; um veredito de postura não é retentado), loga em `info` `{ session_user, current_user, escapes: 0 }`
  **sem URL, sem senha, sem host** e retorna; se recusar: loga em `error` `{ session_user, current_user, escapes:
  [{via, rolname, rolsuper, rolbypassrls, is_self, tabelas_force}] }`, `await client.$disconnect()` (o pool fecha limpo e a saída
  é imediata — sem ele o processo **também** morre, ~11 s depois, quando o pool ocioso fecha: medido pela r1, N4), e **lança**.
  Sem `enforce`: retorna `{ enforced: false }` e loga uma linha `info` dizendo que a trava está desligada (dev/test) — nunca
  silêncio (lição do B-O6R-05: "o retorno MUDO era o modo de falha").
- `src/server.ts` `main()`: **primeira** instrução `await assertRuntimeDatabaseRoleIfEnforced({ logger });` — antes de
  `createCoreSaasService()` abrir Redis ou qualquer handle. Uma linha + import, exatamente como o B-O6R-05 fez com
  `startJobWorkerIfEnabled` (l.19). `src/server.ts` não está na linha do §5.2; entra no PERMITIDO **nominalmente e só
  para essa linha** (§6). **Quem prova que a linha existe e roda antes do Redis é o T15** (F9): o servidor real num processo
  filho, `NODE_ENV=production`, `DATABASE_URL` de superusuário → a primeira linha `Failed to start` traz `RUNTIME_ROLE_CAN_BYPASS_RLS`,
  nenhuma linha do worker antes, `exit 1` em segundos; hoje a mesma execução morre no Redis aos ~18 s (§R.5).
- **Gate `G-DB-ROLE` em `src/config/env.ts`** (a parte **síncrona** da trava — o schema não consulta banco):
  `DATABASE_RUNTIME_ROLE_GUARD: z.enum(["enforce", "skip"]).optional()`; no `export const env`, default por ambiente
  **espelhando a forma de `EVIDENCE_SCANNER` (l.637-638)**: `production` → `"enforce"`, `development`/`test` → `"skip"`
  (dev/CI rodam como `postgres` — P-c — e não podem recusar o boot de todo mundo); no `superRefine`, `production ∧
  "skip"` → issue em `DATABASE_RUNTIME_ROLE_GUARD` com mensagem nomeando `P-INFRA-RLS`/item 9. **Não existe valor
  que afrouxe em produção**. **O default do export é medido por processo filho** (T2′, F9): `NODE_ENV=production` + PROD_OK →
  `import("src/config/env.ts")` → `env.DATABASE_RUNTIME_ROLE_GUARD === "enforce"` — não pela regra reescrita no teste (a cegueira
  do precedente `o6r07b`, P1, medida em §R.5). Chave opcional com default seguro ⇒ não entra na lista derivada de exigidas
  (`deriveRequiredInProduction()` só itera `PROD_BASELINE`, l.274-287) ⇒ `fly.*.toml`, compose e `.env.example` **não**
  precisam declará-la (H6, 28/28).

**(b) → `src/database/rls.ts` (o laço) + os dois repositórios de nuvem (quem o usa).**

- `src/database/rls.ts` ganha **`forEachTenantRls(client, tenantIds, work)`**: **uma** transação, `setTenantRlsContext(tx,
  id)` (o setter único que já existe, l.16-27) **a cada volta** (transaction-local, substituído), `work(tx, id)` por
  volta, resultados concatenados na ordem de `tenantIds`; e **`assertRowsBelongToTenant(rows, tenantId, table)`** — o
  **canário** (uma volta que não trocou o GUC devolve, em silêncio, as linhas do tenant anterior; achado R2-C do
  B-O6R-06, `cloud-cost-allocation-prisma.repository.ts:168-178`). Os dois são o padrão já provado pelo B-O6R-06
  (`forEachTenantInOneTx`, l.340-368 daquele arquivo) **promovidos ao lar único** de `src/database/rls.ts`; a cópia
  privada da alocação **fica** (arquivo fora da fronteira) e vira pendência de deduplicação (§13). O GUC de
  identidade não é tocado. `forEachTenantRls` já consta dos envoltórios de contexto do gerador (Apêndice A, `CONTEXT_WRAPPERS`).
- **`RlsPrismaCloudUsageRepository`** (`cloud-usage-prisma.repository.ts:166-174, 190-198`): o ramo **sem
  `tenantId`** deixa de instanciar o repositório cru com `this.prismaClient` e passa a: `ids = tenant.findMany({select:{id}})`
  (tabela sem RLS — P-f; mesma leitura de `platform-overview-prisma.repository.ts:23-33`), `forEachTenantRls(ids,
  (tx, id) => new PrismaCloudUsageRepository(tx).listEvents({...filters, tenantId: id}))`, canário por volta, e a
  concatenação **reordenada** por `occurredAt asc` (o contrato do método era `orderBy occurred_at asc`; a concatenação
  por tenant quebraria a ordem global — e a semente do teste é **intercalada** para que "não reordenar" fique vermelho, F12).
  `listDailyAggregates` idem, reordenando por `date asc`. Custo N+1 declarado (o mesmo aceite de `platform-overview-prisma.repository.ts:15-16`).
- **`cloud-charge-prisma.repository.ts`**: nasce **`RlsPrismaCloudChargeRepository implements CloudChargeRepository`**
  (mesmo desenho `Prisma*` cru + `Rls*` envoltório dos outros módulos), delegando ao cru **tudo** que toca tabela
  **sem** RLS (`cloud_charge_rules`, `cloud_charge_calculation_runs`, `cloud_cost_allocation_runs`, `tenants`) e
  reescrevendo os **três** métodos da lista: `replaceTenantCharges(runId, charges)` — agrupa por `tenantId`, `ids =
  todos os tenants` (não só os com cobrança: quem ficou sem cobrança neste run precisa ter as linhas do run anterior
  **apagadas** — o B7 do B-O6R-06), `forEachTenantRls(ids, (tx, id) => { deleteMany({calculation_run_id, tenant_id:
  id}); create de cada cobrança do tenant })`, **uma** transação (atomicidade B8: falha no 2º tenant não deixa linha
  do 1º); `listTenantCharges(runId, filters)` — `ids = filters.tenantId ? [ele] : todos`, por volta `findMany({…,
  tenant_id: id})` + canário, concatenação reordenada por `createdAt asc`; `listAllocationTenantAllocations(runId)`
  — todos os tenants, por volta `findMany({allocation_run_id, tenant_id: id})` + canário, sem `take` global (espelha
  `listTenantAllocations` do B-O6R-06, l.180-200; o `take: 100_000` da versão crua deixa de existir —
  **decisão declarada**, a junta ratifica ou pede o teto por tenant). `createPrismaCloudChargeRepository()` passa a
  devolver o envoltório; o tipo de retorno vira a **interface** `CloudChargeRepository` (o serviço já depende da interface,
  `cloud-charge.service.ts:35`). **T12 importa a fábrica**, que existe no head-base — é o que torna o vermelho-controle
  válido (N6).

**O que NÃO é lar da propriedade (e por isso não entra):** `src/routes/health.routes.ts` (reportar a postura no
`/health/ready` seria útil, mas corpo público de saúde é §2.8 e o arquivo está fora do §5.2 — §13);
`cloud-cost-allocation-prisma.repository.ts` (fora do §5.2; o sítio 7 é morto e fica **congelado nominalmente** no T13 — §13);
`fly.*.toml` (a chave nova não é exigida; H6).

---

---

## §3 — Entregas

| E | Entrega | Arquivos | Fecha |
|---|---|---|---|
| E1 | Trava de boot **v2**: sonda (`RUNTIME_ROLE_GUARD_SQL` do §2.2 — atributo ∨ pertença ∨ posse, para `session_user` ∧ `current_user`) + asserção com **razões** + bootstrap + chamada em `main()` **medida pelo T15** | `src/database/runtime-role.ts` (novo), `src/database/runtime-role.bootstrap.ts` (novo), `src/server.ts` (1 linha + import) | item 9 (mecanismo) |
| E2 | Gate `G-DB-ROLE`: chave `DATABASE_RUNTIME_ROLE_GUARD`, default por ambiente **medido no export por processo filho** (T2), recusa de `skip` em produção | `src/config/env.ts` | item 9 (não afrouxável) |
| E3 | Laço por organização sob contexto + canário no lar único; os cinco métodos da lista fechada passam a usá-lo; concatenação reordenada | `src/database/rls.ts`, `src/modules/cloud-usage/cloud-usage-prisma.repository.ts`, `src/modules/cloud-charges/cloud-charge-prisma.repository.ts` | item 10 |
| E4 | Procedimento do papel **executado** (Apêndice C, verbatim, md5 `189ddf8a093934cf1c1baa61ba80f5c8`; modo `100755`; idempotente; falha nomeando o que não corrige) + compose local-prod com `api` no papel de runtime | `scripts/db-runtime-role.sh` (novo), `docker-compose.prod.yml` | item 9 (procedimento) + §4.2 "o que os blocos entregam pronto" |
| E5 | Documentação: seção "Papel de banco de runtime", linha `G-DB-ROLE` na tabela dos gates (deployment.md:71-76), a frase da l.458 trocada por mecanismo + procedimento, o runbook B-O6R-01 passo 0/5 apontando para o papel de runtime, os **três modos de falha** do script | `docs/deployment.md` | §4.2 (procedimento que o dono lê) |
| E6 | Guard **gerado** (CE-G1) **como ratchet**: o gerador v2 versionado (Apêndice A) + teste que o executa, compara o inventário suspeito com o **congelado** (chave a chave, com motivo) e executa as **17 mutações da r1 + a "sumida"** como fixtures | `scripts/san3-05-acessos-de-plataforma.mjs` (novo, = Apêndice A), `tests/san3-05-acessos-de-plataforma-guard.test.ts` (novo), `tests/fixtures/san3-05-mutacoes/*.ts` (17, novos, = Apêndice D) | item 10 (não regride por forma) |
| E7 | Testes T1–T15 (§8), incluindo o **diferencial HTTP** (T11) e o **boot real** (T15) | `tests/production-runtime-gates.test.ts` (+ casos), `tests/san3-05-runtime-role-guard-db.test.ts` (novo), `tests/san3-05-leituras-de-plataforma-db.test.ts` (novo), `tests/san3-05-runtime-role-bootstrap.test.ts` (novo) | DoD |
| E8 | KPI e registro no próprio PR (§9, §C3) + comando do bloco + registro em `agent-orchestration/` (inclui as pendências novas do §13, entre elas a P1 da r1) | `Kpis/*`, `agent-orchestration/codex/comandos/B-SAN3-05-runtime-role-sem-bypass.md` (novo), `agent-orchestration/controle/pendencias.md` (emendas de status + pendências novas), `agent-orchestration/docs/status-geral.md`, `agent-orchestration/codex/log-execucao.md` | §C3, §C6 |

O que **não** muda de propósito: `docker-compose.yml` (dev continua `postgres`: as 13 suítes de catálogo precisam de
`CREATEROLE`, P-n), `.github/workflows/ci.yml` (idem; e o job `docker` já roda o compose local-prod — é ele que
prova o E4), `fly.production.toml`/`fly.staging.toml` (nenhuma chave nova exigida; o segredo `DATABASE_URL` muda de
**valor**, não de nome — ato do dono), `prisma/**` (sem migração: não há objeto de banco novo além do **papel**, que
é objeto de **cluster** e nunca entra em migração — medido: `git grep -n -i -E 'CREATE ROLE|CREATE USER' origin/main --
prisma/migrations` → **0**; a l.141 de `deploy-production.yml` fala da tabela RBAC `roles`, não disto — N5).

---

## §4 — Modelagem

### 4.1 Sem migração. O objeto novo é um PAPEL de cluster, criado por procedimento — EXECUTADO (F6, F7, F8)

`scripts/db-runtime-role.sh` é o Apêndice C, **verbatim** (md5 `189ddf8a093934cf1c1baa61ba80f5c8`, 82 linhas), executado
em sete cenários no cluster desta sessão (§R.4). Desenho, e por que cada peça está lá:

- **Entradas por ambiente:** `DB_RUNTIME_ROLE` (default `erp_runtime`), `DB_RUNTIME_PASSWORD` (**obrigatória**; nunca ecoada;
  sem ela o script para com `ec=1` antes de conectar), `DB_MIGRATOR_ROLE` (default: **`current_user` da conexão**, resolvido
  dentro do SQL — é quem cria as tabelas, e é dele o `ALTER DEFAULT PRIVILEGES`). Conexão: no `initdb.d` do `postgres:16`,
  `--username "$POSTGRES_USER" --dbname "$POSTGRES_DB"` (o entrypoint exporta essas duas e `PGPASSWORD`; **não** exporta
  `PGDATABASE` — r1 item 3.5); fora dele, `PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE`, com `PGDATABASE` **obrigatória**,
  porque grants e default privileges são **por banco** (limite 3.4 da r1, medido).
- **Variáveis do `psql` não entram em `DO $$`** (F6): o script faz `SELECT set_config('san3.role', :'role', false), …` e o
  `DO` lê `current_setting('san3.*')`. O banco é `current_database()`. **Um `DO` = uma transação**: se qualquer passo falhar,
  **nada persiste** (§R.4 iii: o papel que escapava continuou como estava, `t|t|t|1`).
- **Criação sem nomear atributos default** (F8): `CREATE ROLE %I LOGIN NOINHERIT PASSWORD %L` — `NOSUPERUSER`, `NOCREATEDB`,
  `NOCREATEROLE`, `NOBYPASSRLS` são os defaults e **nomeá-los exige o atributo** no PG16. Papel pré-existente: `ALTER ROLE …
  LOGIN NOINHERIT PASSWORD` e, **só para o atributo que estiver ligado**, `ALTER ROLE … NOxxx` **se o executor tiver o
  atributo** — senão `RAISE EXCEPTION 'papel X tem BYPASSRLS e Y nao pode remover (precisa de BYPASSRLS)'` (§R.4 iv-b).
- **Pertença revogada** (F7): para todo papel `b` de que o alvo é membro e que escapa (`rolsuper ∨ rolbypassrls`) **ou** é dono
  de tabela `FORCE`, `REVOKE b FROM alvo` — falha (não silencia) se o executor não tiver ADMIN.
- **Privilégios: tabela a tabela**, só nas que o executor pode conceder (`pg_has_role(current_user, c.relowner, 'USAGE')`);
  tabela ou sequência de **outro dono** em `public` é **falha nomeada** (§R.4 iv-c: `tabela/sequencia public.t_alheia pertence a
  p3_outro e p3_mig nao pode conceder DML nela: ALTER ... OWNER TO p3_mig`) — o app receberia `42501` nela. Depois, `ALTER DEFAULT
  PRIVILEGES FOR ROLE <migrador> IN SCHEMA public` para tabelas e sequências **futuras** (P-l; §R.4 v: `t|t`).
- **Auto-verificação = a propriedade da trava, avaliada para o papel** (F7): atributo ∨ pertença a papel que escapa ∨ posse
  (direta ou por pertença) de tabela `FORCE` → `RAISE EXCEPTION` ⇒ `psql` **ec=3** ⇒ rollback. Posse **não se corrige aqui**
  (seria `REASSIGN`/`OWNER TO` — decisão do dono); a mensagem diz o comando.
- **Linha final, uma só, `-At`:** `rolname|rolsuper|rolbypassrls|escapa|posse|dml` — ex.: `erp_runtime|f|f|f|0|106` (o último
  número é quantas tabelas de `public` o papel pode `SELECT,INSERT,UPDATE,DELETE`).
- **Sourcing seguro (N3):** o corpo inteiro é uma **função em subshell** `db_runtime_role_main() ( set -euo pipefail; … )`;
  quando o entrypoint do `postgres:16` faz `source` (arquivo sem bit de execução), nenhum `set -u` nem `exit` vaza (§R.4 vii,
  nos dois modos). **E** o arquivo é versionado `100755` (`git update-index --chmod=+x scripts/db-runtime-role.sh`; junta C1
  confere `git ls-files -s scripts/db-runtime-role.sh` → `100755`) — os três `.sh` da casa são `100644` (medido pela r1),
  logo o padrão da casa **não** serve de espelho neste ponto.

**O que o procedimento NÃO faz, de propósito:** não concede `EXECUTE` em `auth_login_candidates(text)` (é o passo 5 do
runbook B-O6R-01, ato humano com decisão registrada); não dá `CREATEROLE`, `TRUNCATE`, DDL nem posse; não toca
`pg_hba`; não reatribui posse.

### 4.2 A trava (E1) — o SQL é o do §2.2, e só ele; os 11 casos medidos

Comportamento por caso (§R.1): superusuário (`postgres`) → recusa (`atributo`, `is_self`); papel limpo → **passa**;
superusuário com outro nome → recusa (`atributo … is_self`, e some se `r.rolsuper` for apagado — T7); papel limpo membro
de `BYPASSRLS` (direta, `NOINHERIT`, cadeia de 2 níveis, `SET FALSE`) → recusa (`atributo/<bypass>`; o último é falso positivo
**seguro**, aceito — N1); papel limpo **membro do dono** de tabela `FORCE` → recusa (`posse/<dono>`); **dono direto** →
recusa (`posse/<self>`); o **migrador** → recusa (`posse`; correto — o app nunca roda como migrador); membro de
`pg_read_all_data` → passa (não escapa, medido); login superusuário com `options=-c role=<limpo>` → recusa (`session_user`).
Erro de conexão → até 5 tentativas (2 s, 4 s, 8 s, 16 s, 32 s) e então **recusa** (fail-closed). Log do veredito:
`session_user`, `current_user`, `escapes` (n e, na recusa, as linhas `{via, rolname, rolsuper, rolbypassrls, is_self,
tabelas_force}`) — **nunca** URL, host, senha (§2.8).

### 4.3 O compose (E4)

`postgres`: `environment` ganha `DB_RUNTIME_ROLE: erp_runtime`, `DB_RUNTIME_PASSWORD:
local-prod-validation-db-runtime-not-a-secret`, `DB_MIGRATOR_ROLE: postgres`; `volumes` ganha
`./scripts/db-runtime-role.sh:/docker-entrypoint-initdb.d/10-runtime-role.sh:ro` (H1 — o script detecta `POSTGRES_DB` e cria o
papel **no banco da app**). `migrate`: **inalterado** (`postgres`, o dono das tabelas). `api`: `DATABASE_URL:
postgresql://erp_runtime:local-prod-validation-db-runtime-not-a-secret@postgres:5432/erp_techsolutions?schema=public`
(placeholder **rotulado**, mesma classe dos cinco secrets da l.62-68; o smoke redige `postgresql://` da saída). A
senha aparece **duas** vezes (init e `api`) — literal de propósito e idêntico, como os `JWT_*` (l.63-66 explica por
que não se interpola o `.env`). Comentário no compose: "volume já iniciado sem o papel ⇒ `down -v`".

---

## §5 — Arquivos tocados (caminhos exatos) e a regra do espelho

| Arquivo | Ação | Módulo de referência (espelho) |
|---|---|---|
| `src/database/runtime-role.ts` | novo | `src/modules/auth/services/login-readiness.ts:196-206` (a consulta a `pg_roles` com timeout; aqui sem "best-effort") |
| `src/database/runtime-role.bootstrap.ts` | novo | `src/infra/jobs/job-worker.bootstrap.ts` (injeção, `started/enforced`, log que nunca é mudo) |
| `src/server.ts` | +1 linha em `main()` + import | `src/server.ts:19` (`startJobWorkerIfEnabled`) |
| `src/config/env.ts` | +1 campo no schema, +1 gate no `superRefine`, +1 default no export | `EVIDENCE_SCANNER` (l.263-265, 540-553, 637-638) — a **forma**; o **teste** do default é o do T2 (processo filho), não o do precedente (P1) |
| `src/database/rls.ts` | +`forEachTenantRls`, +`assertRowsBelongToTenant` | `cloud-cost-allocation-prisma.repository.ts:340-368,372-…` (B-O6R-06) |
| `src/modules/cloud-usage/cloud-usage-prisma.repository.ts` | ramos sem tenant de `listEvents`/`listDailyAggregates` (l.166-174, 190-198) | `platform-overview-prisma.repository.ts` (leitura de `tenants` + N+1 sob contexto) |
| `src/modules/cloud-charges/cloud-charge-prisma.repository.ts` | +`RlsPrismaCloudChargeRepository`; fábrica l.238-241 devolve o envoltório; tabelas sem RLS lidas direto no `prismaClient` (sem instanciar o cru com client cru) | `RlsPrismaCloudUsageRepository` (mesmo arquivo de uso, l.142-199) |
| `scripts/db-runtime-role.sh` | novo, **= Apêndice C**, modo `100755` | `scripts/rbac-provision-drill.sh` (estilo); **não** no modo nem no `exit` (N3) |
| `scripts/san3-05-acessos-de-plataforma.mjs` | novo, **= Apêndice A** | `scripts/audit-agents-skills.mjs` (varredura gerada) |
| `tests/fixtures/san3-05-mutacoes/*.ts` | 17 novos, **= Apêndice D** (as mutações da r1, verbatim) | `tests/db-catalog-write-guard.test.ts` (mutação executada pelo teste) |
| `docker-compose.prod.yml` | `postgres` (env + volume), `api` (URL) | — |
| `docs/deployment.md` | seção nova; tabela dos gates; l.458; runbook B-O6R-01 passos 0 e 5; três modos de falha do script | — |
| `tests/production-runtime-gates.test.ts` | + casos do `G-DB-ROLE` (T1, T3) | o próprio arquivo (baseline PROD_OK) |
| `tests/san3-05-runtime-role-bootstrap.test.ts` | novo (T2 por processo filho, T4) | `tests/o6r05-…` do bootstrap do worker (injeção) |
| `tests/san3-05-runtime-role-guard-db.test.ts` | novo (T5–T9, T14, T15) | `tests/o6r06-usage-atomic-db.test.ts:610-633` (`createRoleWithoutBypassRls` pelo **arnês único**); `san3-04a-…-db.test.ts:64-70` (`globalThis.prisma`) |
| `tests/san3-05-leituras-de-plataforma-db.test.ts` | novo (T10–T12) | `tests/o6r06-allocation-basis-rls-db.test.ts` (B2′, B7, B8, B11) |
| `tests/san3-05-acessos-de-plataforma-guard.test.ts` | novo (T13) | `tests/db-catalog-write-guard.test.ts` (ratchet congelado com motivo por chave) |
| `Kpis/kpis-latest.json`, `Kpis/kpis-history.json`, `Kpis/kpis-history.md` | §C3 | — |
| `agent-orchestration/codex/comandos/B-SAN3-05-runtime-role-sem-bypass.md` | novo (molde `comando-template.md`) | `B-SAN3-04a-rbac-catalogo-banco-matriz.md` |
| `agent-orchestration/controle/pendencias.md`, `agent-orchestration/docs/status-geral.md`, `agent-orchestration/codex/log-execucao.md` | emendas | — |

---

## §6 — Escopo (§C4) — PERMITIDO e PROIBIDO, caminhos exatos

**O que mudou em relação à v1, e por quê:** entra **um** caminho novo no PERMITIDO — `tests/fixtures/san3-05-mutacoes/**`
(as 17 mutações da r1 como fixtures do T13; sem elas o ratchet não executa a mutação que o derruba). **Nada saiu.**
`src/modules/cloud-cost-allocation/**` **continua PROIBIDO**, e a razão é medida, não de conveniência: o sítio 7 não tem
chamador (§0.4), logo não zera nada em produção; o arquivo é do `B-O6R-08` (`P-O6R-B06-AGGREGATE-DAILY-SEM-AGENDA`) e do
`B-SAN3-03` (`PLANO_SAN3.md` l.246 — que já é sucessor deste bloco na trava de mesmo arquivo); e o F1 se resolve pelo
ratchet (o sítio 7 fica **congelado nominalmente** e sair dele sem atualizar o congelado é vermelho), não por ampliar a
fronteira a um terceiro módulo com interface e sonda de teste próprias. Nenhum caminho do §C4 (`prisma/**`, `migrations/**`,
`infra/**`, `.env*`, lockfiles, `pubspec*`, `.github/workflows/**`) entra.

**PERMITIDO** (e nada mais):
`src/database/**` · `src/config/env.ts` · `src/server.ts` (**nominalmente**: a linha da chamada + import, nada
além) · `src/modules/cloud-usage/cloud-usage-prisma.repository.ts` · `src/modules/cloud-charges/cloud-charge-prisma.repository.ts`
· `docker-compose.prod.yml` · `docs/deployment.md` · `scripts/db-runtime-role.sh` (novo, `100755`) ·
`scripts/san3-05-acessos-de-plataforma.mjs` (novo) · `tests/production-runtime-gates.test.ts` · `tests/san3-05-*.test.ts`
(novos) · `tests/fixtures/san3-05-mutacoes/**` (novos) · `Kpis/kpis-latest.json` · `Kpis/kpis-history.json` · `Kpis/kpis-history.md` ·
`agent-orchestration/codex/comandos/B-SAN3-05-runtime-role-sem-bypass.md` (novo) · `agent-orchestration/controle/pendencias.md`
· `agent-orchestration/controle/pendencias-indice.md` (se o gerador de índice o exigir) · `agent-orchestration/docs/status-geral.md`
· `agent-orchestration/codex/log-execucao.md` · `agent-orchestration/omega/juntas/**` (ata, votos — do orquestrador,
não do dev).

**PROIBIDO** (§C4 + fronteira do bloco):
`prisma/**` (schema, migrations, seed) · `.env`, `.env.*`, `.env.example` (a chave nova é opcional; H6) ·
`package.json`, `package-lock.json`, `frontend/package-lock.json`, `pubspec.*` · `.github/workflows/**` (a CI já
roda o compose; se o smoke ficar vermelho, o conserto é no compose/script/código, nunca no workflow) ·
`fly.production.toml`, `fly.staging.toml`, `frontend/fly.*.toml` · `Dockerfile`, `docker-compose.yml` (dev) ·
`src/routes/health.routes.ts` (corpo público; §13) · `src/modules/cloud-cost-allocation/**` (sítio 7 → congelado + pendência) ·
`src/modules/auth/**` (a sonda do login e o `runWithTenantContext` ficam como estão) · qualquer outro `src/modules/**`
· `frontend/**`, `mobile/**` · `CLAUDE.md`, `AGENTS.md`, `.claude/**`, `.agents/**` · `Kpis/index.html`, `Kpis/app.js`
(nenhuma dimensão nova: o painel hidrata dos JSON) · `docs/revisoes/SAN3/PLANO_SAN3.md` (o §5.2 fala em "quatro"; a
diferença para "sete/cinco métodos" fica registrada na ata e em `pendencias.md`, não editando o plano-mãe) ·
`tests/o6r07b-scanner-failclosed.test.ts` (P1 é pré-existente e tem dono; este bloco não o conserta).

**Trava de mesmo arquivo (§6 do PLANO_SAN3):** este bloco **precede** `B-SAN3-03` nos dois repositórios de nuvem e
`B-AV-REAL` em `src/config/env.ts`. Nenhum dos dois pode abrir ramo antes do merge deste. P-m confirma que hoje
ninguém está nesses arquivos.

---

## §7 — Critérios de aceite — cada um com a MUTAÇÃO que o deixa vermelho, o teste que a pega e a evidência já executada

| # | Critério (verde) | Mutação que o deixa VERMELHO | Teste | Evidência executada nesta sessão |
|---|---|---|---|---|
| A1 | Sob superusuário (`postgres`), a trava recusa: `RuntimeRoleGuardError` `RUNTIME_ROLE_CAN_BYPASS_RLS`, e `escapes` contém uma linha `via=atributo, is_self=true, rolsuper=true` | apagar a metade `via='atributo'` do `UNION` (sobra só `posse`) — a linha `atributo … is_self` some | T6 | §R.1: `postgres` → 5 linhas, uma `atributo/postgres/is_self=t` |
| A2 | Sob superusuário com **outro nome** (`SUPERUSER NOBYPASSRLS`, dono de nada), recusa **com** a linha `atributo … is_self=true, rolsuper=true` | apagar `r.rolsuper` do predicado — sobram `postgres` (bypass) e posses, a linha `is_self` **some** (F11) | T7 | §R.1: `p2_super2` v2 → `atributo/p2_super2/t`; mutante sem `rolsuper` → linha ausente |
| A3 | Sob papel `NOSUPERUSER NOBYPASSRLS` **membro** de papel `BYPASSRLS` (direta, `NOINHERIT`, cadeia), recusa com `atributo/<bypass>/is_self=false`; após `REVOKE`, passa; a consulta ingênua do §5.2 diz `false:false` no mesmo estado | trocar `pg_has_role(…, 'MEMBER')` por `r.rolname = current_user` | T8 | §R.1 (3 formas de pertença → 1 linha cada); G4c em §0.5 |
| A4 | **Posse (F5):** papel limpo **dono** de tabela `FORCE` → recusa `posse/<self>/is_self=true, tabelas_force=n`; papel limpo **membro do dono** → recusa `posse/<dono>/is_self=false`; após `ALTER TABLE … OWNER TO <migrador>` / `REVOKE`, passa | apagar a metade `via='posse'` do `UNION` | T8b | §R.1: `p2_app_ownermember` → `posse/p2_mig`; `p2_app_owner` → `posse/p2_app_owner/t`; e a porta: `NO FORCE` → 3 linhas sem GUC |
| A5 | **`session_user` (F13):** client cuja URL tem `options=-c role=<efêmero limpo>` com login superusuário → recusa; URL de login efêmero → passa | trocar `session_user` por `current_user` nas duas ocorrências do SQL | T8c (PrismaPg, a URL do app) | §R.1: `options-url.mts` → v1 PASSA, v2 RECUSA (5 linhas); login limpo → PASSA |
| A6 | Sob papel efêmero limpo, passa e o log traz `session_user`, `current_user`, `escapes: 0` — e **nenhum** campo com `postgresql://`, `password`, host; na recusa, `$disconnect` é chamado | logar a `DATABASE_URL` → T9; remover `$disconnect` → o **espião** do T4 (N4: o processo morre de qualquer modo, ~11 s depois) | T9, T4 | r1 item 4.3 (aceito) |
| A7 | `envSchema`: `production` + `skip` → issue em `DATABASE_RUNTIME_ROLE_GUARD`; valor fora do enum rejeitado; `test` + `enforce` aceito | apagar o gate do `superRefine`; aceitar um terceiro valor | T1, T3 (`safeParse`) | — (mecanismo `safeParse`, como os gates existentes) |
| A8 | **Default do export por processo filho (F9):** `NODE_ENV=production` + PROD_OK → o filho imprime `enforce`; `NODE_ENV=test` e `development` → `skip` | trocar o default de produção para `skip` no **export** | T2 (`node --import tsx -e "import('./src/config/env.ts')…"` com `env -i` + PROD_OK) | §R.5: o mesmo mecanismo com `EVIDENCE_SCANNER` vê a mutação que o precedente não vê |
| A9 | `tests/deploy-manifest-parity.test.ts` continua **28/28** sem editar manifesto nem `.env.example` | tornar a chave obrigatória (sem `.optional()`) — `envSchema.parse(process.env)` explode no import (`ZodError`) | bateria §8 (H6) | §R.7: 28/28 no head-base |
| A10 | Sob papel efêmero, `RlsPrismaCloudUsageRepository.listEvents({janela})` soma os eventos de **2** organizações (semente **intercalada**: A = 01h,03h,05h; B = 02h,04h; hoje `0` — **vermelho-controle no head-base**) e devolve ordenado por `occurredAt asc` | remover `setTenantRlsContext` de dentro do laço (soma 0); remover a reordenação (a concatenação A,A,A,B,B **não** está ordenada — F12) | T10 | §0.5 P1/R1 (0 × 5); §R.6 (ordem) |
| A11 | Idem `listDailyAggregates({})` → 2 agregados ordenados por `date asc` (A = 15, B = 14) | idem | T10 | §R.6 |
| A12 | **T11-diferencial (F2):** `GET /platform/cloud-usage/summary` via HTTP, app montado duas vezes (client do papel efêmero × client administrativo; `generatedAt` normalizado), mesmo seed, como `platform_admin` por JWT (CE-G2): corpos **iguais** e `metrics` **não vazio** | idem A10 (sem laço, o efêmero devolve `metrics: []` ≠ `quantity: 50`) | T11 (vermelho-controle no head-base = §R.3) | §R.3: `50` × `[]` |
| A13 | Sob papel efêmero, via `createPrismaCloudChargeRepository()` (a fábrica, que existe no head-base — N6): `listAllocationTenantAllocations(run)` → 2; `listTenantCharges(run)` → 2 (e `{tenantId: A}` → 1); `replaceTenantCharges(run, [A, B])` grava 2 e `replace(run, [A])` **apaga a de B** (B7); falha injetada na 2ª volta não deixa linha da 1ª (B8) | apagar `deleteMany` da volta; tirar a transação única | T12 | §0.5 P3/P4/P6 (hoje 0 / `42501`) |
| A14 | Canário: uma volta que **não** trocou o GUC lança `rows_from_another_tenant` (mutação executada pelo teste, como B6′/B9 do B-O6R-06) | remover `assertRowsBelongToTenant` | T12 | precedente lido (r1 item 5) |
| A15 | **Ratchet (F1, F2):** `node scripts/san3-05-acessos-de-plataforma.mjs .` no head da entrega tem inventário suspeito **igual ao congelado** do teste (chave a chave, com motivo por chave; o sítio 7 está nele, ligado à pendência); o teste executa o gerador (processo filho) e falha em chave **nova ou sumida** | (a) cada uma das **17 fixtures** de `tests/fixtures/san3-05-mutacoes/` copiada para `src/modules/zz-mut/mut.ts` numa cópia temporária de `src`+`prisma` → `+1`; (b) a fábrica do sítio 7 alterada por fora → chave sumida | T13 (18 subtestes) | §R.2: 17/17 `+1`; sumida → vermelho |
| A16 | Compose local-prod: `api` conecta como `erp_runtime` (≠ `migrate`), o smoke da CI (`ci.yml:472-477`) passa **com a trava ativa** (`NODE_ENV=production` já está na l.51); o papel nasce **no banco da app** | apontar `api.DATABASE_URL` de volta para `postgres` — o boot recusa e o smoke cai na readiness (H1/H4 medem na CI; **a fiação em si é o T15**, não este) | job `docker` no head | HIPÓTESE H1 |
| A17 | `scripts/db-runtime-role.sh`: os **7 cenários de §R.4** reproduzem (papel novo; 2ª execução idêntica; pré-existente que escapa → `ec≠0` e nada persiste; posse reatribuída → corrige e revoga; migrador não-super dono → `ec=0`; pré-existente `BYPASSRLS` sob não-super → falha nomeada; tabela alheia → falha nomeada) | omitir o `REVOKE` da pertença → cenário (iii-b) fica com `membros=1`; trocar o `RAISE` por `SELECT` → (iii) sai `ec=0` | T14 (a: o bloco `DO` extraído do `.sh` e executado pelo Prisma, sempre; b: o `.sh` por `bash`+`psql` quando `psql` estiver no PATH — H7) | §R.4 |
| A18 | `docs/deployment.md`: `rg -c 'G-DB-ROLE' docs/deployment.md` ≥ 2; `rg -n 'Confirmar na ativacao' docs/deployment.md` **vazio** na l.458; o runbook B-O6R-01 nomeia `erp_runtime` como alvo do `GRANT EXECUTE` (`rg -n 'TO erp_runtime' docs/deployment.md` ≥ 1) | não editar a doc (os `rg` ficam 0 / não vazio) | C2 (comando na ata) | — (documental) |
| A19 | Registro: `rg -n 'P-INFRA-RLS' agent-orchestration/controle/pendencias.md` mostra `EM ANDAMENTO (código mergeado; fecha com a trava verde no ambiente — ato do dono §11)`, nunca `FECHADA`; idem `P-O6R-B06-LEITURA-PLATAFORMA-SOB-FORCE-RLS`; as pendências do §13 abertas com dono (`rg -c 'P-SAN3-05-' pendencias.md` ≥ 6; `rg -c 'P-O6R-07B-TESTE-DO-DEFAULT-CEGO-AO-EXPORT'` ≥ 1) | marcar `FECHADA` no PR; omitir a P1 | C2 (comando na ata) | — |
| A20 | **Boot real (F9):** `src/server.ts` num processo filho, `NODE_ENV=production`, PROD_OK, `DATABASE_URL` de superusuário → `exit 1`; a **primeira** linha `Failed to start ERP Techsolutions API` traz `code: RUNTIME_ROLE_CAN_BYPASS_RLS`; **nenhuma** linha do worker/Redis antes; com `DATABASE_URL` do papel efêmero limpo → aparece `runtime database role verified` com `escapes: 0` e nenhuma recusa (o filho é morto em seguida) | apagar a chamada em `main()` → o filho passa e morre no Redis (`RedisCommandError`, ~18 s); default do export → `skip` → idem | T15 (vermelho-controle no head-base = §R.5) | §R.5 |

**CE-G2 (papel × passo):** os passos HTTP de T11 rodam como `platform_admin` com `platform:cloud-usage:read`
(`src/modules/platform/platform-permissions.ts:15`; rota `platform.routes.ts:45` + `cloud-usage.routes.ts:12`) — permissão
que o papel já tem (`RBAC_MATRIX.md`, `platform_admin` = tudo de plataforma); token assinado com `signAccessToken`
como em `san3-04a-menu-com-permissoes-do-banco-db.test.ts:79,179` (o protótipo de §R.3 usou o cabeçalho legado de
`NODE_ENV=test` só para medir o diferencial).

---

## §8 — Testes: baseline N, meta M ≥ 2N, e a bateria

**Baseline N = 5** (N8) — testes que hoje executam código dos arquivos deste bloco (ou as mesmas tabelas) **sob papel real
sem bypass**: `o6r06-usage-atomic-db.test.ts` A7 (l.211) e A17 (l.544); `o6r06-allocation-basis-rls-db.test.ts` B2′ (l.68)
e B11 (l.342); `rls-tenant-isolation.test.ts:19` (papel `NOSUPERUSER` da l.44; as 4 tabelas de nuvem em l.2460-2680 e
3053-3068). Nenhum deles cobre a **trava** (0), o **remédio** dos cinco métodos (0), nem a **fiação** (0). Contagem
**executada** das suítes que o bloco estende (F10): `production-runtime-gates.test.ts` **63** · `deploy-manifest-parity.test.ts`
**28** · `o6r06-usage-atomic-db.test.ts` 15 · `o6r06-allocation-basis-rls-db.test.ts` 10 (as duas últimas no cluster da r1).
Suíte inteira em `origin/main`: 287 arquivos `tests/*.test.ts`, 33 `-db`; KPI vigente `backend_tests 3052/3054`.

**Meta M ≥ 10 (2N).** O bloco entrega **15 testes** (T1–T15; com subtestes, ≥ 40 casos):

| T | Teste | Arquivo | Banco |
|---|---|---|---|
| T1 | `G-DB-ROLE`: `production` + `skip` rejeitado (issue path exato) | `production-runtime-gates.test.ts` | não |
| T2 | **Default do export por processo filho** (A8): `env -i` + PROD_OK + `NODE_ENV=production` → `enforce`; `test`/`development` → `skip` (`spawnSync(node, ["--import","tsx","-e", "import('./src/config/env.ts').then(m => console.log(m.env.DATABASE_RUNTIME_ROLE_GUARD))"])`, `DOTENV_CONFIG_PATH=/dev/null`) | `san3-05-runtime-role-bootstrap.test.ts` | não |
| T3 | valor fora do enum rejeitado em qualquer ambiente; `test` + `enforce` aceito | `production-runtime-gates.test.ts` | não |
| T4 | bootstrap com client **injetado** (fake): `enforce=false` → `{enforced:false}` + log info; `enforce=true` + postura limpa → passa e loga sem URL/senha; `enforce=true` + `escapes` → lança `RUNTIME_ROLE_CAN_BYPASS_RLS` **e** chama `$disconnect` (espião); erro de conexão → 5 tentativas e recusa | `san3-05-runtime-role-bootstrap.test.ts` | não |
| T5 | boot de verdade: `assertRuntimeDatabaseRoleIfEnforced({ enforce: true })` com `globalThis.prisma = efemera.client` (padrão `san3-04a`) → passa; com o client `postgres` → recusa | `san3-05-runtime-role-guard-db.test.ts` | sim |
| T6 | A1 (superusuário, razão `atributo … is_self`) | idem | sim |
| T7 | A2 (superusuário com outro nome — `SUPERUSER NOBYPASSRLS`, criado pelo arnês sob `withRoleCatalogLock`, derrubado no `finally`; asserta a linha `is_self ∧ rolsuper`) | idem | sim |
| T8 | A3 (pertença: `GRANT bypass TO efêmero` → recusa; `REVOKE` → passa; consulta ingênua **passa** no mesmo estado) · **T8b** A4 (posse: tabela `FORCE` temporária `OWNER TO efêmero` → recusa `posse/self`; `GRANT dono TO efêmero` → recusa `posse/dono`; desfeito → passa) · **T8c** A5 (`PrismaPg` com `options=-c%20role%3D<efêmero>` e login administrativo → recusa; login efêmero → passa) | idem | sim |
| T9 | A6 (log: campos exatos; ausência de `postgresql://`/`password`/host por varredura do JSON do log, padrão `auth-identity-exposure-scan.test.ts`) | idem | sim |
| T10 | A10 + A11, semente intercalada, com **vermelho-controle no head-base** (execução do mesmo teste contra `origin/main` antes do diff, colada na ata — worktree do jurado) | `san3-05-leituras-de-plataforma-db.test.ts` | sim |
| T11 | A12 — **diferencial HTTP** (dois processos ou dois `createApp` com `globalThis.prisma` trocado **antes** do import — o padrão `san3-04a`; a forma de dois processos é a de §R.3) | idem | sim |
| T12 | A13 + A14 (cobrança via **fábrica**: 2 lidas, órfã zero, atomicidade, canário por mutação executada) | idem | sim |
| T13 | A15 — ratchet: gerador como processo filho (`cwd` = raiz do repo, alvo = `.`), inventário == congelado; **18 subtestes de mutação** (17 fixtures + sumida) sobre cópia temporária de `src`+`prisma` (`fs.mkdtempSync`, sem `node_modules` — F14) | `san3-05-acessos-de-plataforma-guard.test.ts` | não |
| T14 | A17 — script do papel: (a) o bloco `DO $$…$$` extraído do `.sh` (regex) + `set_config` feitos pelo teste, executados pelo Prisma administrativo num **banco descartável próprio** (`CREATE DATABASE` sob `withRoleCatalogLock`), 7 cenários; (b) o `.sh` inteiro por `bash` + `psql` **se `psql` estiver no PATH** — senão pula **declarando** (o job `docker` executa o `.sh` de verdade pelo entrypoint — H1) | `san3-05-runtime-role-guard-db.test.ts` | sim |
| T15 | A20 — **boot real**: `spawn(node, ["--import","tsx","src/server.ts"])` com `env -i`-equivalente (PROD_OK + `NODE_ENV=production` + `DATABASE_URL` + `REDIS_URL` do PROD_OK + `PORT`/`PORTAL_PORT` livres + `DOTENV_CONFIG_PATH=/dev/null`); (a) superusuário → `exit 1` ≤ 15 s, 1ª linha `Failed to start` com o código, sem linha do worker; (b) efêmero → linha `verified` com `escapes: 0`, então `SIGTERM` | idem | sim |

**Regras dos testes `-db`:** papel efêmero **só** pelo arnês (`createEphemeralRole`/`withRoleCatalogLock`;
`o6r06-usage-atomic-db.test.ts:610-618` explica o `XX000 tuple concurrently updated`); os que criam papel/banco entram no
ratchet `db-catalog-write-guard` com contagem congelada (ou pedem ao arnês, que é o caminho preferido); **falha é
vermelho, nunca skip** sob `DATABASE_URL` presente (guard de zero pulos, `ci.yml:274-279` do job `backend-postgres` —
as suítes novas entram na lista `SUITES` **daquele job**… que está em `.github/workflows/ci.yml`, PROIBIDO). **Decisão:**
as três suítes `-db` novas seguem a convenção "auto-pula **declarando** sem `DATABASE_URL`" e rodam no job `backend`
(que tem `DATABASE_URL`, l.34) — o job `backend-postgres` com `SUITES` fica para o bloco que possa tocar o workflow
(`B-ARNES-2`), registrado em §13. A junta confere que **rodaram** no head (TAP colado). **H7 (HIPÓTESE):** o runner
`ubuntu-latest` tem `psql` (fonte: `actions/runner-images`, `Ubuntu2404-Readme.md`, "PostgreSQL 16"); comando que mede:
o próprio T14b imprime `psql: <caminho ou ausente>` no TAP.

**Bateria de validação (§9 do contrato), na ordem, com `timeout` e `ec` por variável:**

```
npm run check
npm run lint
node --test --import tsx tests/production-runtime-gates.test.ts tests/deploy-manifest-parity.test.ts tests/o6r07b-scanner-failclosed.test.ts tests/cors-env.test.ts tests/portal-env.test.ts     # regressão dos gates (B-O6R-05/07b)
node --test --import tsx tests/san3-05-runtime-role-bootstrap.test.ts tests/san3-05-acessos-de-plataforma-guard.test.ts
DATABASE_URL=<descartável> node --test --import tsx tests/san3-05-runtime-role-guard-db.test.ts tests/san3-05-leituras-de-plataforma-db.test.ts
DATABASE_URL=<descartável> node --test --import tsx tests/o6r06-usage-atomic-db.test.ts tests/o6r06-allocation-basis-rls-db.test.ts tests/o6r06-cost-summary-sum-db.test.ts tests/rls-tenant-isolation.test.ts tests/san3-04a-menu-com-permissoes-do-banco-db.test.ts tests/cloud-usage.test.ts tests/cloud-usage-routes.test.ts tests/cloud-charge-routes.test.ts tests/cloud-charge-markup-rules.test.ts tests/db-catalog-write-guard.test.ts   # regressões dos blocos anteriores
node scripts/san3-05-acessos-de-plataforma.mjs .            # inventário suspeito (== congelado do T13); cabeçalho + inventário colados na ata
git ls-files -s scripts/db-runtime-role.sh                  # 100755
DATABASE_URL=<descartável> npm test                         # suíte inteira (contagem real → KPI)
npm run build
node --check Kpis/app.js && node --test --import tsx tests/kpi-dashboard-charts.test.ts
git diff --check
```

Mais: `grep -n 'DATABASE_RUNTIME_ROLE_GUARD' fly.production.toml fly.staging.toml .env.example` → **vazio** (A9);
`git diff --name-only origin/main...HEAD` ⊆ PERMITIDO (§6); `git grep -n 'PrismaCloudChargeRepository(prisma)' -- src` →
**vazio** (o envoltório instancia o cru só com `tx`). O compose/smoke é provado pelo job `docker` da CI no head (H1/H4) — o dev
**não** o reproduz localmente se não tiver docker; a junta lê o run. Tudo em **Node 20** (o do CI; `node -v` colado).

---

## §9 — KPI (§C3) — no próprio PR

- `Kpis/kpis-latest.json`, `Kpis/kpis-history.json` (append) e `Kpis/kpis-history.md` (append) no mesmo PR; o painel
  `Kpis/index.html` hidrata dos JSON — **nenhuma** dimensão nova (não se toca `app.js`/`index.html`).
- `backend_tests`: **reexecução real** (`DATABASE_URL=<descartável> npm test`, TAP, **Node 20**), nunca copiado do
  `3052/3054` vigente (lido de `Kpis/kpis-latest.json` em `origin/main`). `frontend_smoke_tests` (`1202`) e `flutter_tests`
  (`864`): **carregados com nota** (§C3.3 — o PR não toca `frontend/` nem `mobile/`; `git diff --name-only origin/main...HEAD
  -- frontend mobile` vazio, colado na nota).
- `mvp_demo` (`99`) / `mvp_vendavel` (`88`): **intocados** (o PR não move escopo; fecha itens do gate por mecanismo, mas os itens
  9 e 10 só contam fechados após o ato do dono — §4.2).
- `blocks_completed`: 168 → **169**. `release.block`: "B-SAN3-05 (itens 9 e 10 do §4.1 — código; fecho depende do ato
  do dono)"; `pr` após `gh pr create`; `merge_commit`/`approved_head` **`null` na autoria** (§C3.5; backfill pós-merge
  pelo bloco seguinte); `status: "published_per_pr"`.
- History: 1 linha de justificativa por métrica carregada; menção explícita de que a lista do §5.2 ("quatro") foi
  medida como **sete sítios / cinco métodos dentro + um fora**; e de que este plano é a **v2** após a crítica r1
  (6 bloqueios incorporados com medição — nenhum recusado).

---

## §10 — Junta (§C7) — quórum, composição, papéis, terreno, resiliência

- **Quórum: unanimidade de 3** (§C7.1-ter(b): o bloco toca **segurança e permissão** — papel de banco, gate de boot,
  isolamento). O `critico-adversarial` já atuou **no plano** (r1, `critico-b-san3-05`, Opus 5.5 declarado); na junta do PR
  não tem cadeira (reservado aos blocos de invariante financeiro; aqui o dinheiro só é **lido**). O `§5.2` pede
  `agente-dba-guardiao` + `agente-secops`; a terceira cadeira é o `guardiao-fail-closed`.
- **Objeto:** o SHA do head da entrega com check-runs **concluídos** (`gh api repos/<owner>/<repo>/commits/<sha>/check-runs`)
  — inclusive o job `docker` (é ele que prova E4/H1). Sem CI concluída, o inspetor **bloqueia** o start (§C7.1-bis).
- **Cadeiras (≤3 itens cada — P4; medir ≠ julgar onde a medição é pesada):**

| Cadeira | Identidade (nova) | Itens | Veto |
|---|---|---|---|
| C1 papel, grants e compose | `agente-dba-guardiao` | (1) `scripts/db-runtime-role.sh` do **head** num cluster **descartável próprio**: os **7 cenários de §R.4** re-executados (`ec` por cenário, `diff` de idempotência, rollback do que escapa, migrador não-super dono, tabela alheia nomeada) e `git ls-files -s scripts/db-runtime-role.sh` = `100755`; (2) `RUNTIME_ROLE_GUARD_SQL` do head (não a do plano) sob os **11 papéis de §R.1**, incluindo `options=-c role=` pelo PrismaPg e a porta do dono (`NO FORCE` → linhas); (3) compose: `api` ≠ `migrate`, run do job `docker` verde no SHA julgado, papel criado **no banco da app** (`pg_default_acl` em `erp_techsolutions`), `down -v` documentado | sim (§C7.1) |
| C2 fiação, segredo e escopo | `agente-secops` | (1) **fiação**: T2 e T15 rodados no head **e** duas mutações próprias (default do export → `skip`; chamada em `main()` apagada) — cada uma tem de reprovar T2/T15; paridade 28/28 sem manifesto tocado; (2) zero segredo: placeholders rotulados e distintos, log da trava sem URL/senha/host (T9 + leitura), `/health/*` sem mudança; (3) diff × escopo §6 (fixtures só em `tests/fixtures/san3-05-mutacoes/`; `server.ts` só a linha; nada em PROIBIDO) e A18/A19 **por comando** | **sim** |
| C3 inventário e remédio | `guardiao-fail-closed` | (1) **ratchet**: gerador do head rodado; inventário == congelado; diff contra as **48 chaves do head-base** (Apêndice A) explicado chave a chave no teste; os 18 subtestes de mutação verdes-por-vermelho **e uma mutação nova de autoria própria** (forma não listada) — se o ratchet não a pegar, é o **residual declarado** (§0.4) e vira pendência nomeada, **não reprova**, desde que o T11-diferencial pegue a versão dinâmica dela; (2) T10–T12 rodados sob papel efêmero **com vermelho-controle no head-base** (mesmo teste, `origin/main`, saída colada) e o **T11-diferencial** (corpo igual super × efêmero, `metrics` não vazio); (3) `aggregateDailyUsage` e `executeCalculationRun` sob o papel: agregam/calculam 2 organizações (a via do job e a via da cobrança, não só o resumo) | sim |

- **Inspetor de terreno** (`inspetor-de-terreno-da-junta`, Fable) antes do voto: worktree por jurado que muta, **cluster
  descartável por jurado** (cada um o seu, porta própria — este plano mostra como subir um sem docker, §0.2),
  `sync-agent-agents.mjs --check` verde, check-runs concluídos no objeto, inelegibilidade por nome, plano de perda.
- **Papéis (§C7.4-bis):** **quem achou** = `critico-b-san3-05` (r1) e, no PR, as três cadeiras (identidades novas; nenhuma
  participou deste plano); **quem planeja** = este `planejador-mestre` (Fable — obrigatório nesta revalidação, §C7.6; a v1
  e a v2 são do mesmo papel, instâncias distintas); **quem desenvolve** = desenvolvedor de identidade nova nomeado pelo
  orquestrador no comando do bloco, que não vota e **não julga a validade dos achados** — implementa a v2. Ciclo de reprovação
  → `omega/reprovacoes/R-B-SAN3-05-<ciclo>.md`; no ciclo 3 com `bloqueia`, auditoria da máquina antes do ciclo 4
  (`D-SEM-TETO-AUDITORIA-NO-3`).
- **Escopo do voto (§C7.1-ter(a)):** `dentro-do-bloco` para os sítios 1–6, a trava, o procedimento, a fiação e o ratchet;
  `pre-existente` (não reprova, vira pendência com dono) para o sítio 7, para a suíte `-db` sob papel real (`B-ARNES-2`),
  para funções `SECURITY DEFINER` (§2.1), para o teste cego do `EVIDENCE_SCANNER` (P1, `fe2748c` 2026-09-06) e para
  qualquer forma que o ratchet **declaradamente** não veja (§0.4 residual) — com evidência de data (migrações `202606xx`;
  `f4ef511` é a raiz).
- **P1–P6:** evidência incremental em `omega/juntas/votos/B-SAN3-05/<cadeira>-evidencia.md`; voto-arquivo-primeiro
  (`<cadeira>-voto.json`, esqueleto item a item, cada item gravado ao ser medido); ≤2 jurados em paralelo; `00-quedas.md`; ata
  `omega/juntas/J-B-SAN3-05.md`.
- **Porteiro pós-merge** (`porteiro-pos-merge`, Fable): revalida promessa × diff, reexecuta o gerador (inventário == congelado)
  e a contagem de KPI, confere A19 e a limpeza §C5, e **libera** (ou não) o próximo alvo da frente 2 (`B-O6R-07c`).

---

## §11 — ATOS DO DONO — o que só você faz, escrito para você ler

> O bloco entrega **pronto**: a trava, o procedimento (executado em sete cenários, §R.4), o compose e a documentação. Os
> itens 9 e 10 **só fecham** quando a trava estiver **verde no ambiente** — e isso depende de dois atos que o repositório
> não pode praticar por você (`PLANO_SAN3.md` §4.2, l.192). O plano **não decide** nome do papel, senha, nem provedor;
> abaixo vão os defaults e o comando de cada passo. **Nada disto é feito pelo PR. Nada disto é feito antes do merge do PR.**

**Ato 1 — criar o papel de runtime no banco gerenciado de produção (e de staging).**
1. Conecte-se ao banco **da aplicação** com a credencial **do migrador** — a mesma URL que está em `PROD_DATABASE_URL` no
   GitHub Environment `production` (é ela que roda `prisma migrate deploy` e `db:provision-rbac`, e é ela que **fica**
   como migrador; para staging, `STAGING_DATABASE_URL`). `PGDATABASE` tem de ser o banco da app: grants e default
   privileges são **por banco**.
2. Escolha o nome do papel (default `erp_runtime`) e uma senha nova, forte, que **não** vai para o repositório nem
   para o chat. Rode, a partir da raiz do repo, no SHA mergeado:
   ```bash
   PGHOST=<host do gerenciado> PGPORT=5432 PGUSER=<usuário do migrador> PGPASSWORD=<senha do migrador> PGDATABASE=<banco da app> \
   DB_RUNTIME_ROLE=erp_runtime DB_RUNTIME_PASSWORD='<senha nova>' \
   bash scripts/db-runtime-role.sh
   ```
   (`DB_MIGRATOR_ROLE` não precisa ser passado: o default é o usuário desta conexão.) O script termina imprimindo **uma**
   linha: `erp_runtime|f|f|f|0|<n>` — rolsuper, rolbypassrls, escapa por pertença, tabelas FORCE de posse (direta **ou por
   pertença**), e quantas tabelas de `public` o papel pode ler e escrever (`<n>` = o total de tabelas da app). Se o papel
   escapar por qualquer via, o script **sai com erro (`ec=3`) e não deixa nada persistido** — não siga para o Ato 2.
3. Os **três** modos de falha, e o que cada um pede de você (todos medidos em §R.4):
   - `ERROR: permission denied to create role` — o migrador não tem `CREATEROLE`: **decisão de provedor** (§10.2 do
     PLANO_SAN3); pare e registre em `agent-orchestration/controle/`.
   - `ERROR: papel <X> tem <SUPERUSER|BYPASSRLS|CREATEDB|CREATEROLE> e <migrador> nao pode remover` — já existia um papel com
     esse nome e um atributo que o migrador não pode tirar: use **outro nome** (`DB_RUNTIME_ROLE=…`) ou corrija o papel com a
     credencial administrativa do provedor, e rode de novo.
   - `ERROR: tabela/sequencia public.<t> pertence a <outro> …` ou `… ainda escapa de RLS … POSSE …` — há tabela `FORCE` que não é
     do migrador (ou é do próprio papel): `ALTER TABLE public.<t> OWNER TO <migrador>;` com a credencial que puder, e rode de
     novo (o script é idempotente: rodar N vezes converge, medido em §R.4 ii).

**Ato 2 — trocar o secret do app (e só ele).**
4. `fly secrets set DATABASE_URL='postgresql://erp_runtime:<senha nova>@<host>:5432/<banco>?schema=public' -c fly.production.toml`
   (staging: `-c fly.staging.toml`). **Não** troque `PROD_DATABASE_URL`/`STAGING_DATABASE_URL` no GitHub: o migrador
   continua sendo o dono das tabelas (é isso que mantém "dono ≠ app", `docs/deployment.md:489-495`). **Não** use
   `options=-c role=…` na URL para "virar" outro papel: a trava julga também o usuário de login (F13) e vai recusar.
5. Faça o deploy pela pipeline de sempre. A trava é a prova — agora inteira: **o app sobe** ⇒ o usuário de login **e** o
   papel corrente não escapam de RLS por atributo, por pertença nem por posse. Confira no log
   (`fly logs -c fly.production.toml`) a linha `runtime database role verified` com `session_user`, `current_user` e
   `escapes: 0`. Se o app **não** subir e o log disser `RUNTIME_ROLE_CAN_BYPASS_RLS`, as `escapes` dizem **qual porta**
   (`via: atributo|posse`, `rolname`, `is_self`): volte ao passo 2 ou 4; a máquina anterior continua servindo até um deploy
   bem-sucedido (H5).
6. Depois, os dois efeitos que você deve **ver**: `GET /api/v1/platform/cloud-usage/summary` (como admin de plataforma)
   continua somando as organizações (item 10 — antes deste bloco ele zeraria neste exato momento: medido, `50` × vazio,
   §R.3); e `login_without_org` no `/health/ready` passa a `inactive`/`inert_no_execute` **até** o passo 5 do runbook
   B-O6R-01 conceder `GRANT EXECUTE ON FUNCTION public.auth_login_candidates(text) TO erp_runtime` — decisão sua, registrada
   em ata, como o runbook já pede (`docs/deployment.md:461-500`).

**O que muda no registro quando os dois atos estiverem feitos:** `P-INFRA-RLS` e `P-O6R-B06-LEITURA-PLATAFORMA-SOB-FORCE-RLS`
passam de `EM ANDAMENTO` para `FECHADA`, com a linha do log do passo 5 como evidência; os itens 9 e 10 do §4.1
fecham. Até lá, o PR mergeado é **código pronto, ato pendente** — e é assim que o §4.2 manda contar.

---

## §12 — Riscos e rollback

| R | Risco | Mitigação | Rollback |
|---|---|---|---|
| R1 | A trava recusa o boot em produção porque o secret ainda é o papel antigo (H2) | é o comportamento desejado; §11 antes do deploy; H5 mostra o que se vê; o log diz a porta | `fly secrets set DATABASE_URL=<anterior>` **ou** `flyctl deploy --image <sha-anterior>` (Runbook A) — o código anterior não tem trava |
| R2 | Tabela nova criada **por outro papel** (não o migrador) ou **noutro banco** fica sem grant (`42501` no 1º acesso) — limite medido do `ALTER DEFAULT PRIVILEGES` (§R.4 v, r1 3.4) | todo DDL roda como o migrador (é o que a pipeline faz); o script **falha nomeando** tabela alheia existente | rodar o script de novo (idempotente) após `OWNER TO <migrador>` |
| R3 | `N+1` por organização no resumo de plataforma e no cálculo de cobrança | precedente aceito (`platform-overview`, B-O6R-06); uma transação por chamada; nota de escala no código | — (é leitura) |
| R4 | Blip do banco no boot vira crash-loop (5 tentativas/62 s e recusa) | trade-off declarado: fail-closed > subir sem saber com quem fala; Fly reinicia; readiness já era 503 nesse blip | — |
| R5 | **Posse agora RECUSA** (mudança da v1): num ambiente em que o app seja dono (ou membro do dono) de tabela `FORCE`, o boot não sobe | é a intenção (§R.1: dono lê tudo com um `ALTER TABLE`); o script diz o `OWNER TO`; o segundo papel é o ato do dono | secret anterior (R1) |
| R6 | Compose com volume antigo sem o papel (init só na 1ª subida) | comentário no compose; CI faz `down -v` | `docker compose -f docker-compose.prod.yml down -v` |
| R7 | O `.sh` montado em `initdb.d` sem bit de execução é **sourced** pelo entrypoint (é o caminho padrão para os `.sh` da casa, `100644` — N3) | corpo em função-subshell (nada vaza; medido nos dois modos, §R.4 vii) **e** modo `100755` no git | H1 na CI |
| R8 | `login_without_org` fica `inactive` após a troca até o GRANT humano | é o desenho do B-O6R-01 (janela longa e reportada, `health.routes.ts:40-45`) | passo 6 do §11 |
| R9 | O ratchet (aproximação estática) não vê uma forma nova de acesso cru (acessor dinâmico, SQL montado fora do arquivo…) | residual **declarado** (§0.4); o guard da propriedade é o T11-diferencial; a junta C3 tenta uma forma própria; a suíte `-db` inteira sob papel real (`B-ARNES-2`) é o que fecha a classe | — |
| R10 | `take: 100_000` retirado de `listAllocationTenantAllocations` | espelha o B-O6R-06; a junta ratifica ou pede teto por tenant (decisão declarada, não silenciosa) | reintroduzir por tenant |
| R11 | O ratchet reprova PR alheio que acrescente um helper `tx` legítimo (chave nova em `TX-SEM-ENVOLTORIO?`) | custo declarado: atualizar o congelado **com motivo** é o ato consciente que o ratchet existe para exigir (a forma de `db-catalog-write-guard`); o congelado é curto (48 chaves) e sem número de linha | — |
| R12 | T15 depende de `tsx` no processo filho e de duas portas livres; Redis do PROD_OK é inalcançável de propósito | o teste escolhe portas por `listen(0)` e fecha antes; o caso (a) termina **antes** do Redis; o caso (b) mata o filho após a linha `verified` (não espera `listen`); timeout de 30 s por caso | — |
| R13 | H7 falsa (runner sem `psql`) | T14a (o `DO` pelo Prisma) é a prova obrigatória; T14b pula **declarando**; o `.sh` inteiro é provado pelo job `docker` (H1) | — |

**Rollback do PR inteiro:** `git revert` do squash — nenhuma migração, nenhum objeto de banco criado pelo código; o
papel criado pelo dono (se já criado) é inerte enquanto o secret não o usar.

---

## §13 — O que este plano NÃO pega (pendências nomeadas, com dono)

| Pendência (a abrir no PR) | O quê | Dono proposto |
|---|---|---|
| `P-SAN3-05-LEITURA-MORTA-PROJECAO-DIARIA` | sítio 7: `cloud-cost-allocation-prisma.repository.ts:238` (`listUsageDailyAggregates`) lê `cloud_usage_daily_aggregates` sem contexto e **não tem chamador** em `src/` (só a sonda de teste); remover ou envolver — e, ao fazê-lo, **atualizar o congelado** do T13 (a chave `L2 … new PrismaCloudCostAllocationRepository(prisma) … CRU` some) | `B-O6R-08` (dono da projeção diária, `P-O6R-B06-AGGREGATE-DAILY-SEM-AGENDA`) |
| `P-SAN3-05-LACO-POR-TENANT-DUPLICADO` | `forEachTenantInOneTx`/`assertRowsBelongToTenant` privados em `cloud-cost-allocation-prisma.repository.ts:340-380` × os públicos novos em `src/database/rls.ts` — a mesma verdade em dois lugares | `B-SAN3-03` (próximo a tocar os repositórios de nuvem, §6 do PLANO_SAN3) |
| `P-SAN3-05-SUITE-DB-SOB-PAPEL-REAL` | a suíte `-db` inteira sob papel `NOSUPERUSER NOBYPASSRLS` (13 suítes escrevem catálogo, 8 fazem DDL — P-n); `SUITES` do job `backend-postgres` para as 3 suítes novas; **é o que fecha o residual do ratchet** (R9: formas que a análise estática não vê só aparecem dinamicamente) | `B-ARNES-2` (já nomeado no §5.2) |
| `P-SAN3-05-POSTURA-NO-HEALTH` | reportar a postura do papel (`database_role: isolated`) no `/health/ready` **fora** de `checks`, como o `login_without_org` — corpo público, `src/routes/health.routes.ts` fora da fronteira | bloco de observabilidade (a nomear pelo orquestrador) |
| `P-SAN3-05-SECURITY-DEFINER-INVENTARIO` | a trava não enumera funções `SECURITY DEFINER` de dono que escapa e executáveis pelo papel (hoje só `auth_login_candidates`, por ato humano); inventário por comando (§2.1) e decisão de reportar/recusar no boot | `B-SAN3-10` (go-live) |
| `P-O6R-07B-TESTE-DO-DEFAULT-CEGO-AO-EXPORT` (**P1 da r1, pré-existente**: `tests/o6r07b-scanner-failclosed.test.ts` M-B7.1 e o default nascem em `fe2748c`, 2026-09-06, #380) | o teste reescreve a regra (`resolved = NODE_ENV === "production" ? "unavailable" : "noop"`) em vez de ler o export: mutante `production → noop` fica 13/13 verde (medido em §R.5). Conserto = o mecanismo do T2 deste plano (export lido em processo filho) | `B-O6R-07b` / segurança (a nomear pelo orquestrador) |
| (registro, não pendência) | o `§5.2` diz "quatro leituras"; medido: sete sítios, cinco métodos dentro + um fora; a consulta do teste de encerramento do §5.2 é cega à pertença (G4c), e a **da v1 deste plano** era cega à posse (F5) e ao `session_user` (F13) — a v2 usa `pg_has_role` sobre atributo e posse, para os dois nomes | ata da junta + emenda em `pendencias.md` (`P-INFRA-RLS`) |

Também fora: mudar o usuário de `db:provision-rbac`/`migrate` (continuam com o migrador); `docker-compose.yml` de
dev; qualquer mudança em `.github/workflows/**`; `.env.example` (chave opcional); os `fly.*.toml`; o conserto de P1.

---

## §14 — Comando do bloco (para o orquestrador colar em `agent-orchestration/codex/comandos/B-SAN3-05-runtime-role-sem-bypass.md`)

`# B-SAN3-05 — o papel de runtime não escapa de RLS (itens 9 e 10)` · **Plano:** esta **v2** (`docs/plano-b-san3-05`), que
responde à crítica r1 — a v1 (`c3f57e9`) **não** vale mais · **Objetivo** §1 · **Fontes** §0 e a seção "Resposta à crítica
r1" · **Regras** §2 e §4 (o SQL da trava é o do §2.2, byte a byte — atributo ∨ pertença ∨ posse, `session_user` ∧
`current_user`; o `.sh` é o Apêndice C, byte a byte, `100755`; o gerador é o Apêndice A, byte a byte; nenhum privilégio
além de DML+USAGE; nada em `/health`) · **Escopo PERMITIDO/PROIBIDO** §6 · **Rito** §10 (inspetor → dev de identidade nova
→ junta unânime de 3 → porteiro) · **Teste de encerramento** §7 A1–A20 com T1–T15 · **Bateria** §8 (Node 20) · **KPI** §9 ·
**DoD** §10 do contrato + A19 · **Atos do dono** §11 (fora do PR) · **Rastreabilidade**: `pr`, `merge_commit`,
`approved_head`, `J-B-SAN3-05.md`, `published_per_pr`.

---

## Apêndices

- **A** — o gerador v2 do inventário (ratchet), verbatim, e a saída completa no head `3b1fe0f9` (48 chaves congeladas).
- **B** — o script de medição sob papel real, verbatim (com a emenda N2), e a saída completa (22 itens) — re-executado aqui.
- **C** — `scripts/db-runtime-role.sh`, verbatim, executado em 7 cenários (§R.4).
- **D** — as 17 fixtures de mutação do T13 (as da r1, verbatim).

---

## Apêndice A — o gerador v2 do inventário (verbatim) e a saída no head `3b1fe0f9`

Arquivo que o desenvolvedor commita como `scripts/san3-05-acessos-de-plataforma.mjs` (uso: `node scripts/san3-05-acessos-de-plataforma.mjs <raiz> [--all]`, com `cwd` = raiz do repo — `typescript` e o client gerado resolvem a partir do script, depois do `cwd`, nunca do alvo). md5 do fonte medido: `293b3746ad7e4dea1c11e16c794e7aa3`. Diferenças para o v1 (`e8861755…`, r1): OPS derivados do client gerado (F4); `$transaction-SEM-setter` é classe própria (F3); receptor raiz/injetado dentro de envoltório, função livre, identificador desestruturado, acesso por índice, RAW opaco e subclasse são vistos (F2); o inventário suspeito (L1+L2, chave sem linha) é a saída que o ratchet congela (F1); resolução de módulos fora do alvo (F14).

```js
#!/usr/bin/env node
// B-SAN3-05 (v2) — INVENTÁRIO, gerado da fonte, dos acessos a tabelas sob FORCE ROW LEVEL SECURITY que NÃO estão
// comprovadamente sob contexto de tenant. Serve a um RATCHET (teste T13): o inventário suspeito é congelado por chave
// (sem número de linha); linha NOVA ou linha SUMIDA é vermelho — default NEGAR. O que é "suspeito" é toda forma que
// o analisador NÃO consegue provar sob contexto — não só "receptor cru".
//
// O QUE ISTO É: aproximação ESTÁTICA (AST do TypeScript). O árbitro da propriedade "sob papel sem bypass a superfície
// de plataforma devolve o mesmo que sob superusuário" é a medição DINÂMICA (T10–T12, T11-diferencial). Este inventário
// pega REGRESSÃO de forma; a dinâmica pega regressão de comportamento.
//
// Camadas (todas derivadas da fonte):
//   L0  tabelas FORCE ← prisma/migrations/**/migration.sql; tabela → model → acessor ← prisma/schema.prisma (@@map);
//       OPS (métodos de delegate Prisma) ← node_modules/.prisma/client/index.d.ts (o client GERADO), não digitados.
//   L1  todo `<recv>.<acessor>.<op>(…)`, `<recv>["<acessor>"].<op>(…)`, `<acessor>.<op>(…)` (identificador solto,
//       ex.: desestruturado) e todo `$queryRaw*/$executeRaw*` (com tabela FORCE citada, ou OPACO — SQL fora do literal).
//   L2  para classes cujo executor é injetado (`this.client`…), INCLUINDO subclasses (`extends`), quem as instancia e com quê.
// Resolução de `typescript`/client: a partir DESTE arquivo, depois do cwd — nunca do alvo (o alvo pode ser cópia temporária).
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";

const repo = path.resolve(process.argv[2] ?? ".");
const showAll = process.argv.includes("--all");
let req = null;
for (const base of [import.meta.url, path.join(process.cwd(), "package.json"), path.join(repo, "package.json")]) {
  try { const r = createRequire(base); r.resolve("typescript"); req = r; break; } catch { /* próximo */ }
}
if (!req) throw new Error("typescript não resolvido a partir do script, do cwd nem do alvo");
const ts = req("typescript");

// ---------- L0 ----------
function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out); else out.push(full);
  }
  return out;
}
const FORCE = new Set(); const ENABLE = new Set();
for (const f of walk(path.join(repo, "prisma/migrations")).filter((f) => f.endsWith("migration.sql"))) {
  const sql = readFileSync(f, "utf8");
  for (const m of sql.matchAll(/ALTER TABLE\s+"?([a-z_]+)"?\s+FORCE ROW LEVEL SECURITY/gi)) FORCE.add(m[1].toLowerCase());
  for (const m of sql.matchAll(/ALTER TABLE\s+"?([a-z_]+)"?\s+ENABLE ROW LEVEL SECURITY/gi)) ENABLE.add(m[1].toLowerCase());
  for (const m of sql.matchAll(/ALTER TABLE\s+"?([a-z_]+)"?\s+NO FORCE ROW LEVEL SECURITY/gi)) FORCE.delete(m[1].toLowerCase());
  for (const m of sql.matchAll(/ALTER TABLE\s+"?([a-z_]+)"?\s+DISABLE ROW LEVEL SECURITY/gi)) ENABLE.delete(m[1].toLowerCase());
}
const schema = readFileSync(path.join(repo, "prisma/schema.prisma"), "utf8");
const modelToTable = new Map(); let current = null;
for (const line of schema.split(/\r?\n/)) {
  const m = line.match(/^model\s+(\w+)\s*\{/); if (m) current = m[1];
  const map = line.match(/@@map\("([^"]+)"\)/); if (map && current) modelToTable.set(current, map[1]);
}
const accessorToTable = new Map();
for (const [model, table] of modelToTable) if (FORCE.has(table)) accessorToTable.set(model[0].toLowerCase() + model.slice(1), table);

// OPS derivados do client gerado: os métodos do primeiro `*Delegate` de node_modules/.prisma/client/index.d.ts
let OPS = null;
try {
  const clientDir = path.dirname(req.resolve("@prisma/client"));
  const dts = path.join(clientDir, "..", "..", ".prisma", "client", "index.d.ts");
  const text = readFileSync(dts, "utf8");
  const start = text.search(/export interface \w+Delegate</);
  const body = text.slice(start, text.indexOf("\n  }\n", start));
  OPS = new Set([...body.matchAll(/^    (\w+)</gm)].map((m) => m[1]));
} catch { /* sem client gerado: cai na lista abaixo */ }
if (!OPS || OPS.size < 10) {
  OPS = new Set(["findMany","findFirst","findFirstOrThrow","findUnique","findUniqueOrThrow","count","aggregate","groupBy",
    "create","createMany","createManyAndReturn","update","updateMany","updateManyAndReturn","upsert","delete","deleteMany"]);
  console.error("# aviso: OPS não derivado do client gerado; usando lista embutida");
}
const RAW = new Set(["$queryRaw", "$queryRawUnsafe", "$executeRaw", "$executeRawUnsafe"]);
const CONTEXT_WRAPPERS = new Set(["withTenantRls", "forEachTenantInOneTx", "forEachTenantRls", "withIdentityRls", "withTenantContext", "runWithTenantContext"]);
const CONTEXT_SETTERS = /setTenantRlsContext\(|setIdentityRlsContext\(|app\.current_tenant_id/;
const ROOT = /^(prisma|this\.prismaClient|this\.prisma|prismaClient|this\.db|db)$/;
const TXLIKE = /^(tx|trx|transaction)$/;
const INJ = /^(this\.client|this\.executor|client|executor)$/;

// ---------- L1 ----------
const srcFiles = walk(path.join(repo, "src")).filter((f) => f.endsWith(".ts") && !f.endsWith(".d.ts"));
const rows = []; const injectedClasses = new Map(); const extendsOf = new Map(); // class -> base
function isFunctionLike(n) { return ts.isArrowFunction(n) || ts.isFunctionExpression(n) || ts.isMethodDeclaration(n) || ts.isFunctionDeclaration(n); }
function contextOf(node, sf) {
  let n = node;
  while (n) {
    if (isFunctionLike(n)) {
      const parent = n.parent;
      if (parent && ts.isCallExpression(parent) && parent.arguments.includes(n)) {
        const name = parent.expression.getText(sf).split(".").pop();
        if (CONTEXT_WRAPPERS.has(name)) return name;
        if (name === "$transaction") {
          const body = n.body.getText(sf);
          const before = sf.text.slice(n.body.getStart(sf), node.getStart(sf));
          if (CONTEXT_SETTERS.test(before)) return "$transaction+setTenantRlsContext";
          if (CONTEXT_SETTERS.test(body)) return "$transaction+setter-depois?";
          return "$transaction-SEM-setter";
        }
      }
      if (ts.isMethodDeclaration(n) || ts.isFunctionDeclaration(n)) return null;
    }
    n = n.parent;
  }
  return null;
}
// classificação v2: tudo que NÃO está provado sob contexto é suspeito (default negar)
function classify(recv, ctx) {
  recv = recv.replace(/^\((.*)\)$/s, "$1").replace(/\s+as\s+[\s\S]*$/, "").trim(); // cast não muda o objeto
  if (ctx === "$transaction-SEM-setter") return "$TRANSACTION-SEM-SETTER";
  if (ctx === "$transaction+setter-depois?") return "$TRANSACTION-SETTER-DEPOIS?";
  if (ctx) {
    if (ROOT.test(recv)) return "CRU-DENTRO-DE-ENVOLTORIO";
    if (INJ.test(recv)) return "INJETADO-DENTRO-DE-ENVOLTORIO";
    if (TXLIKE.test(recv)) return "SOB-CONTEXTO";
    return "OUTRO-DENTRO-DE-ENVOLTORIO(" + recv + ")";
  }
  if (TXLIKE.test(recv)) return "TX-SEM-ENVOLTORIO?";
  if (INJ.test(recv)) return "INJETADO";
  if (ROOT.test(recv)) return "CRU";
  if (recv === "(identificador)") return "IDENTIFICADOR-ACESSOR";
  return "OUTRO(" + recv + ")";
}
const SUSPEITO_L1 = (cls) => cls !== "SOB-CONTEXTO" && cls !== "INJETADO"; // INJETADO se decide em L2
for (const file of srcFiles) {
  const text = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const rel = path.relative(repo, file).replace(/\\/g, "/");
  let enclosingClass = null; let enclosingMethod = null;
  function push(recv, what, table, node, extra = {}) {
    const ctx = contextOf(node, sf); let cls = classify(recv, ctx);
    if (cls === "INJETADO" && !enclosingClass) cls = "INJETADO-SEM-CLASSE";
    const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
    rows.push({ loc: `${rel}:${line}`, file: rel, recv, what, table, ctx: ctx ?? "(nenhum)", cls, klass: enclosingClass, method: enclosingMethod, ...extra });
    if (cls === "INJETADO" && enclosingClass) { if (!injectedClasses.has(enclosingClass)) injectedClasses.set(enclosingClass, new Set()); injectedClasses.get(enclosingClass).add(rel); }
  }
  function visit(node) {
    if (ts.isClassDeclaration(node) && node.name) {
      const prev = enclosingClass; enclosingClass = node.name.text;
      for (const h of node.heritageClauses ?? []) if (h.token === ts.SyntaxKind.ExtendsKeyword) for (const t of h.types) extendsOf.set(enclosingClass, t.expression.getText(sf));
      ts.forEachChild(node, visit); enclosingClass = prev; return;
    }
    if ((ts.isMethodDeclaration(node) || (ts.isPropertyDeclaration(node) && node.initializer && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer)))) && node.name) {
      const prev = enclosingMethod; enclosingMethod = node.name.getText(sf); ts.forEachChild(node, visit); enclosingMethod = prev; return;
    }
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const op = node.expression.name.text; const target = node.expression.expression;
      if (OPS.has(op)) {
        if (ts.isPropertyAccessExpression(target) && accessorToTable.has(target.name.text)) {
          push(target.expression.getText(sf), `${target.name.text}.${op}`, accessorToTable.get(target.name.text), node);
        } else if (ts.isElementAccessExpression(target) && ts.isStringLiteralLike(target.argumentExpression) && accessorToTable.has(target.argumentExpression.text)) {
          push(target.expression.getText(sf), `["${target.argumentExpression.text}"].${op}`, accessorToTable.get(target.argumentExpression.text), node);
        } else if (ts.isIdentifier(target) && accessorToTable.has(target.text)) {
          push("(identificador)", `${target.text}.${op}`, accessorToTable.get(target.text), node);
        }
      }
      if (RAW.has(op)) {
        const full = node.getText(sf); let hit = false;
        for (const table of FORCE) if (new RegExp(`\\b${table}\\b`).test(full)) { hit = true; push(target.getText(sf), `RAW-SQL(${op})`, table, node); }
        if (!hit) push(target.getText(sf), `RAW-SQL(${op}) OPACO`, "?", node);
      }
    }
    if (ts.isTaggedTemplateExpression(node) && ts.isPropertyAccessExpression(node.tag) && RAW.has(node.tag.name.text)) {
      const full = node.getText(sf); let hit = false;
      for (const table of FORCE) if (new RegExp(`\\b${table}\\b`).test(full)) { hit = true; push(node.tag.expression.getText(sf), `RAW-SQL(${node.tag.name.text})`, table, node); }
      if (!hit) push(node.tag.expression.getText(sf), `RAW-SQL(${node.tag.name.text}) OPACO`, "?", node);
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
}
// fecho por herança: subclasse de classe com executor injetado também é injetada
let grew = true;
while (grew) { grew = false; for (const [k, base] of extendsOf) if (injectedClasses.has(base) && !injectedClasses.has(k)) { injectedClasses.set(k, new Set(["(extends " + base + ")"])); grew = true; } }

// ---------- L2 ----------
const instantiations = [];
for (const file of srcFiles) {
  const text = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const rel = path.relative(repo, file).replace(/\\/g, "/");
  function visit(node) {
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && injectedClasses.has(node.expression.text)) {
      const arg = node.arguments?.[0]?.getText(sf) ?? "";
      const ctx = contextOf(node, sf); const cls = classify(arg, ctx);
      const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
      let usage = "?"; const p = node.parent;
      if (p && ts.isPropertyAccessExpression(p) && p.expression === node) usage = `.${p.name.text}()`;
      else if (p && ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) {
        const v = p.name.text; let scope = p; while (scope && !isFunctionLike(scope) && !ts.isSourceFile(scope)) scope = scope.parent;
        const body = scope.getText(sf).slice(node.getEnd() - scope.getStart(sf));
        const ms = [...body.matchAll(new RegExp(`\\b${v}\\.(\\w+)\\(`, "g"))].map((m) => m[1]);
        usage = ms.length ? `var ${v} → .${[...new Set(ms)].join("() .")}()` : `var ${v} → (sem chamada)`;
      } else if (p && (ts.isPropertyDeclaration(p) || ts.isParameter(p)) && ts.isIdentifier(p.name)) {
        const fld = p.name.text; let cls_ = p; while (cls_ && !ts.isClassDeclaration(cls_)) cls_ = cls_.parent;
        const body = cls_ ? cls_.getText(sf) : "";
        const ms = [...body.matchAll(new RegExp(`this\\.${fld}\\.(\\w+)\\(`, "g"))].map((m) => m[1]);
        usage = ms.length ? `campo ${fld} → .${[...new Set(ms)].join("() .")}()` : `campo ${fld} → (sem chamada)`;
      } else if (p && (ts.isReturnStatement(p) || ts.isArrowFunction(p) || ts.isAwaitExpression(p))) usage = "FÁBRICA/retorno → todos os métodos";
      else usage = "ARGUMENTO/LITERAL → todos os métodos (quem recebe decide)";
      instantiations.push({ loc: `${rel}:${line}`, file: rel, klass: node.expression.text, arg, ctx: ctx ?? "(nenhum)", cls, usage });
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
}
const SUSPEITO_L2 = (cls) => cls !== "SOB-CONTEXTO";
// L2b: call-sites INJETADO alcançáveis a partir de instanciações suspeitas
const reach = new Map();
for (const i of instantiations.filter((i) => SUSPEITO_L2(i.cls))) {
  if (!reach.has(i.klass)) reach.set(i.klass, new Set());
  if (/FÁBRICA|ARGUMENTO|\?$/.test(i.usage) || i.usage === "?") reach.get(i.klass).add("*");
  for (const m of [...i.usage.matchAll(/\.(\w+)\(\)/g)].map((m) => m[1])) reach.get(i.klass).add(m);
}
function reachKlass(k) { let c = k; while (c) { if (reach.has(c)) return c; c = extendsOf.get(c); } return null; }
const l2b = [];
for (const r of rows.filter((r) => r.cls === "INJETADO")) {
  // a classe do call-site pode ser base de uma subclasse instanciada crua
  for (const [k, set] of reach) { let c = k; while (c && c !== r.klass) c = extendsOf.get(c); if (!c) continue;
    if (set.has("*") || set.has(r.method)) l2b.push({ ...r, via: k === r.klass ? (set.has("*") ? "via fábrica/argumento" : "via chamada direta") : `via subclasse ${k}` }); }
}

// ---------- saída ----------
const byCls = {}; for (const r of rows) byCls[r.cls] = (byCls[r.cls] ?? 0) + 1;
const instByCls = {}; for (const i of instantiations) instByCls[i.cls] = (instByCls[i.cls] ?? 0) + 1;
console.log(`# L0: tabelas ENABLE=${ENABLE.size} FORCE=${FORCE.size} · acessores Prisma em FORCE=${accessorToTable.size} · OPS(derivados)=${OPS.size} · src/**/*.ts=${srcFiles.length}`);
console.log(`# L1: call-sites sobre tabelas FORCE (+ RAW opacos) = ${rows.length}`);
console.log(`# L1 por classificação: ${JSON.stringify(byCls)}`);
console.log(`# L2: classes com executor injetado = ${injectedClasses.size}; instanciações achadas = ${instantiations.length}`);
console.log(`# L2 por classificação do argumento: ${JSON.stringify(instByCls)}`);
// INVENTÁRIO SUSPEITO — chave SEM número de linha, com multiplicidade; é isto que o ratchet congela
const keys = new Map();
const add = (k) => keys.set(k, (keys.get(k) ?? 0) + 1);
for (const r of rows.filter((r) => SUSPEITO_L1(r.cls))) add(`L1\t${r.file}\t${r.klass ?? "-"}.${r.method ?? "-"}\t${r.recv}\t${r.what}\t${r.table}\t${r.ctx}\t${r.cls}`);
for (const i of instantiations.filter((i) => SUSPEITO_L2(i.cls))) add(`L2\t${i.file}\tnew ${i.klass}(${i.arg})\t${i.ctx}\t${i.cls}\t${i.usage}`);
// L2b NÃO entra no congelado: é DERIVADO de L2 (a raiz já está na chave) e mudaria a cada método novo de classe injetada.
const inv = [...keys].map(([k, n]) => `${k}\t×${n}`).sort();
console.log(`# INVENTÁRIO SUSPEITO (L1+L2): ${inv.length} chaves · sha1=${createHash("sha1").update(inv.join("\n")).digest("hex")} · L2b (derivado, informativo) = ${l2b.length}`);
console.log(""); console.log("## INVENTÁRIO SUSPEITO (ratchet: chave sem número de linha; linha nova OU sumida = vermelho)");
for (const k of inv) console.log(k);
console.log(""); console.log("## L2b — call-sites INJETADO alcançáveis de instanciações suspeitas (com linha)");
for (const r of l2b) console.log(`${r.loc}\t${r.klass}.${r.method}\t${r.recv}\t${r.what}\t${r.table}\t${r.via}`);
if (showAll) {
  console.log(""); console.log("## TODOS os call-sites (--all)");
  for (const r of rows) console.log(`${r.loc}\t${r.recv}\t${r.what}\t${r.table}\t${r.ctx}\t${r.cls}\t${r.klass ?? ""}.${r.method ?? ""}`);
  console.log(""); console.log("## TODAS as instanciações (--all)");
  for (const i of instantiations) console.log(`${i.loc}\tnew ${i.klass}(${i.arg})\t${i.ctx}\t${i.cls}\t${i.usage}`);
}
```

**Saída completa** (`node <gerador> .`, sem `--all`, sobre `origin/main@3b1fe0f9`; colunas separadas por TAB; o bloco `## INVENTÁRIO SUSPEITO` é o que o T13 congela — 48 chaves; o `## L2b` é informativo):

```text
# L0: tabelas ENABLE=106 FORCE=106 · acessores Prisma em FORCE=106 · OPS(derivados)=17 · src/**/*.ts=777
# L1: call-sites sobre tabelas FORCE (+ RAW opacos) = 720
# L1 por classificação: {"TX-SEM-ENVOLTORIO?":12,"INJETADO-SEM-CLASSE":8,"INJETADO":646,"SOB-CONTEXTO":51,"$TRANSACTION-SEM-SETTER":2,"CRU":1}
# L2: classes com executor injetado = 70; instanciações achadas = 451
# L2 por classificação do argumento: {"SOB-CONTEXTO":423,"TX-SEM-ENVOLTORIO?":14,"CRU":4,"OUTRO()":4,"$TRANSACTION-SETTER-DEPOIS?":1,"INJETADO":5}
# INVENTÁRIO SUSPEITO (L1+L2): 48 chaves · sha1=147d41c209a5f3bbce9fc7d208fd33a02e6bd8d2 · L2b (derivado, informativo) = 65

## INVENTÁRIO SUSPEITO (ratchet: chave sem número de linha; linha nova OU sumida = vermelho)
L1	src/database/financial-period-lock.ts	-.-	tx	RAW-SQL($executeRaw) OPACO	?	(nenhum)	TX-SEM-ENVOLTORIO?	×2
L1	src/database/rls.ts	-.-	client	RAW-SQL($executeRaw) OPACO	?	(nenhum)	INJETADO-SEM-CLASSE	×1
L1	src/database/rls.ts	-.-	tx	RAW-SQL($executeRaw) OPACO	?	(nenhum)	TX-SEM-ENVOLTORIO?	×1
L1	src/database/rls.ts	-.-	tx	RAW-SQL($queryRaw)	auth_identity_links	(nenhum)	TX-SEM-ENVOLTORIO?	×1
L1	src/modules/auth/repositories/identity-link.repository.ts	-.-	client	authIdentity.createMany	auth_identities	(nenhum)	INJETADO-SEM-CLASSE	×1
L1	src/modules/auth/repositories/login-candidates.repository.ts	-.-	client	RAW-SQL($queryRaw) OPACO	?	(nenhum)	INJETADO-SEM-CLASSE	×1
L1	src/modules/auth/services/identity-link.service.ts	IdentityLinkService.selectLinkOfPairForUpdate	tx	RAW-SQL($queryRaw)	auth_identity_links	(nenhum)	TX-SEM-ENVOLTORIO?	×1
L1	src/modules/auth/services/identity-resolver.ts	-.-	tx	RAW-SQL($executeRaw) OPACO	?	(nenhum)	TX-SEM-ENVOLTORIO?	×3
L1	src/modules/auth/services/identity-resolver.ts	-.-	tx	RAW-SQL($queryRaw)	auth_identity_links	(nenhum)	TX-SEM-ENVOLTORIO?	×1
L1	src/modules/auth/services/login-readiness.ts	-.-	client	RAW-SQL($queryRaw) OPACO	?	(nenhum)	INJETADO-SEM-CLASSE	×1
L1	src/modules/auth/services/session-admin.service.ts	SessionAdminService.resolveUserLabels	tx	user.findMany	users	(nenhum)	TX-SEM-ENVOLTORIO?	×1
L1	src/modules/cloud-usage/cloud-usage.capture.ts	-.-	client	RAW-SQL($executeRaw)	cloud_usage_events	(nenhum)	INJETADO-SEM-CLASSE	×1
L1	src/modules/commissions/work-order-cancellation.gate.ts	-.-	executor	workOrder.findFirst	work_orders	(nenhum)	INJETADO-SEM-CLASSE	×1
L1	src/modules/financial-period-closes/financial-period-close-prisma.repository.ts	PrismaFinancialPeriodCloseStore.readCompetencia	tx	financialEntry.findMany	financial_entries	(nenhum)	TX-SEM-ENVOLTORIO?	×1
L1	src/modules/financial-period-closes/financial-period-close-prisma.repository.ts	PrismaFinancialPeriodCloseStore.readCompetencia	tx	financialTitle.findMany	financial_titles	(nenhum)	TX-SEM-ENVOLTORIO?	×1
L1	src/modules/impound/impound.outbox.repository.ts	-.-	client	impoundOutboxEvent.create	impound_outbox_events	(nenhum)	INJETADO-SEM-CLASSE	×1
L1	src/modules/impound/impound.outbox.repository.ts	-.-	client	impoundOutboxEvent.findMany	impound_outbox_events	(nenhum)	INJETADO-SEM-CLASSE	×1
L1	src/modules/work-orders/work-order-prisma.repository.ts	PrismaWorkOrderRepository.assign	tx	workOrder.updateManyAndReturn	work_orders	$transaction-SEM-setter	$TRANSACTION-SEM-SETTER	×1
L1	src/modules/work-orders/work-order-prisma.repository.ts	PrismaWorkOrderRepository.assign	tx	workOrderAssignment.create	work_order_assignments	$transaction-SEM-setter	$TRANSACTION-SEM-SETTER	×1
L1	src/routes/health.routes.ts	-.-	prisma	RAW-SQL($queryRawUnsafe) OPACO	?	(nenhum)	CRU	×1
L2	src/modules/auth/auth-runtime.ts	new AuditLogRepository(tx)	(nenhum)	TX-SEM-ENVOLTORIO?	ARGUMENTO/LITERAL → todos os métodos (quem recebe decide)	×1
L2	src/modules/auth/auth-runtime.ts	new AuditLogRepository(tx)	(nenhum)	TX-SEM-ENVOLTORIO?	FÁBRICA/retorno → todos os métodos	×1
L2	src/modules/auth/auth-runtime.ts	new LocalAuthCredentialRepository(tx)	(nenhum)	TX-SEM-ENVOLTORIO?	ARGUMENTO/LITERAL → todos os métodos (quem recebe decide)	×1
L2	src/modules/auth/auth-runtime.ts	new UserRepository(tx)	(nenhum)	TX-SEM-ENVOLTORIO?	ARGUMENTO/LITERAL → todos os métodos (quem recebe decide)	×1
L2	src/modules/auth/auth-runtime.ts	new UserRoleRepository(tx)	(nenhum)	TX-SEM-ENVOLTORIO?	ARGUMENTO/LITERAL → todos os métodos (quem recebe decide)	×1
L2	src/modules/auth/services/identity-link.service.ts	new AuditLogRepository(tx)	(nenhum)	TX-SEM-ENVOLTORIO?	FÁBRICA/retorno → todos os métodos	×1
L2	src/modules/auth/services/identity-link.service.ts	new AuthSessionRepository(tx)	(nenhum)	TX-SEM-ENVOLTORIO?	.revokeAllActiveByUserForTenant()	×1
L2	src/modules/auth/services/identity-link.service.ts	new IdentityLinkEventRepository(tx)	(nenhum)	TX-SEM-ENVOLTORIO?	.append()	×1
L2	src/modules/auth/services/identity-link.service.ts	new IdentityLinkRepository(tx)	(nenhum)	TX-SEM-ENVOLTORIO?	.moveToIdentity()	×1
L2	src/modules/auth/services/identity-resolver.ts	new IdentityLinkEventRepository(tx)	(nenhum)	TX-SEM-ENVOLTORIO?	.append()	×1
L2	src/modules/auth/services/identity-resolver.ts	new IdentityLinkRepository(tx)	(nenhum)	TX-SEM-ENVOLTORIO?	.createForPair()	×1
L2	src/modules/auth/services/local-auth-credential.service.ts	new LocalAuthCredentialRepository(tx)	(nenhum)	TX-SEM-ENVOLTORIO?	.updatePassword()	×1
L2	src/modules/auth/services/session-admin.service.ts	new AuditLogRepository(tx)	(nenhum)	TX-SEM-ENVOLTORIO?	FÁBRICA/retorno → todos os métodos	×1
L2	src/modules/cloud-charges/cloud-charge-prisma.repository.ts	new PrismaCloudChargeRepository(prisma)	(nenhum)	CRU	FÁBRICA/retorno → todos os métodos	×1
L2	src/modules/cloud-cost-allocation/cloud-cost-allocation-prisma.repository.ts	new PrismaCloudCostAllocationRepository(prisma)	(nenhum)	CRU	FÁBRICA/retorno → todos os métodos	×1
L2	src/modules/cloud-usage/cloud-usage-prisma.repository.ts	new PrismaCloudUsageRepository(this.prismaClient)	(nenhum)	CRU	.listDailyAggregates()	×1
L2	src/modules/cloud-usage/cloud-usage-prisma.repository.ts	new PrismaCloudUsageRepository(this.prismaClient)	(nenhum)	CRU	.listEvents()	×1
L2	src/modules/core-saas/store/prisma-core-saas.store.ts	new AuditLogRepository()	(nenhum)	OUTRO()	campo auditLogs → (sem chamada)	×1
L2	src/modules/core-saas/store/prisma-core-saas.store.ts	new AuditLogRepository(tx)	$transaction+setter-depois?	$TRANSACTION-SETTER-DEPOIS?	var txAudit → (sem chamada)	×1
L2	src/modules/core-saas/store/prisma-core-saas.store.ts	new RoleRepository()	(nenhum)	OUTRO()	campo roles → (sem chamada)	×1
L2	src/modules/core-saas/store/prisma-core-saas.store.ts	new UserRepository()	(nenhum)	OUTRO()	campo users → (sem chamada)	×1
L2	src/modules/core-saas/store/prisma-core-saas.store.ts	new UserRoleRepository()	(nenhum)	OUTRO()	campo userRoles → (sem chamada)	×1
L2	src/modules/financial-titles/financial-title-prisma.repository.ts	new PrismaFinancialPeriodCloseRepository(tx)	(nenhum)	TX-SEM-ENVOLTORIO?	.isPeriodClosed()	×1
L2	src/modules/impound/impound-prisma.repository.ts	new PrismaImpoundChecklistLinkRepository(this.client)	(nenhum)	INJETADO	var linkRepo → .createLink()	×1
L2	src/modules/impound/impound-prisma.repository.ts	new PrismaVehicleIdentityRepository(this.client)	(nenhum)	INJETADO	var identityRepo → .resolveOrCreateByPlateKey()	×1
L2	src/modules/impound/impound-prisma.repository.ts	new PrismaVehicleIdentityRepository(this.client)	(nenhum)	INJETADO	var identityRepo → .resolveOrCreateByPlateKey() .createProvisionalUnidentified()	×1
L2	src/modules/impound/impound-prisma.repository.ts	new PrismaYardRepository(this.client)	(nenhum)	INJETADO	FÁBRICA/retorno → todos os métodos	×1
L2	src/modules/release/release-prisma.repository.ts	new PrismaYardRepository(this.client)	(nenhum)	INJETADO	.vacate()	×1

## L2b — call-sites INJETADO alcançáveis de instanciações suspeitas (com linha)
src/modules/auth/repositories/auth-session.repository.ts:113	AuthSessionRepository.revokeAllActiveByUserForTenant	this.client	authSession.updateMany	auth_sessions	via chamada direta
src/modules/auth/repositories/identity-link-event.repository.ts:31	IdentityLinkEventRepository.append	this.client	authIdentityLinkEvent.createMany	auth_identity_link_events	via chamada direta
src/modules/auth/repositories/identity-link.repository.ts:88	IdentityLinkRepository.createForPair	this.client	authIdentityLink.create	auth_identity_links	via chamada direta
src/modules/auth/repositories/identity-link.repository.ts:101	IdentityLinkRepository.moveToIdentity	this.client	authIdentityLink.updateMany	auth_identity_links	via chamada direta
src/modules/auth/repositories/local-auth-credential.repository.ts:27	LocalAuthCredentialRepository.create	this.client	localAuthCredential.create	local_auth_credentials	via fábrica/argumento
src/modules/auth/repositories/local-auth-credential.repository.ts:39	LocalAuthCredentialRepository.upsertForUser	this.client	localAuthCredential.upsert	local_auth_credentials	via fábrica/argumento
src/modules/auth/repositories/local-auth-credential.repository.ts:66	LocalAuthCredentialRepository.findByEmailForTenant	this.client	localAuthCredential.findUnique	local_auth_credentials	via fábrica/argumento
src/modules/auth/repositories/local-auth-credential.repository.ts:78	LocalAuthCredentialRepository.findByUserForTenant	this.client	localAuthCredential.findUnique	local_auth_credentials	via fábrica/argumento
src/modules/auth/repositories/local-auth-credential.repository.ts:89	LocalAuthCredentialRepository.updatePassword	this.client	localAuthCredential.update	local_auth_credentials	via fábrica/argumento
src/modules/auth/repositories/local-auth-credential.repository.ts:112	LocalAuthCredentialRepository.incrementFailedAttempts	this.client	RAW-SQL($executeRaw)	local_auth_credentials	via fábrica/argumento
src/modules/auth/repositories/local-auth-credential.repository.ts:125	LocalAuthCredentialRepository.resetFailedAttempts	this.client	localAuthCredential.updateMany	local_auth_credentials	via fábrica/argumento
src/modules/auth/repositories/local-auth-credential.repository.ts:138	LocalAuthCredentialRepository.markSuccessfulLogin	this.client	localAuthCredential.updateMany	local_auth_credentials	via fábrica/argumento
src/modules/cloud-charges/cloud-charge-prisma.repository.ts:167	PrismaCloudChargeRepository.replaceTenantCharges	this.client	tenantCloudCharge.deleteMany	tenant_cloud_charges	via fábrica/argumento
src/modules/cloud-charges/cloud-charge-prisma.repository.ts:171	PrismaCloudChargeRepository.replaceTenantCharges	this.client	tenantCloudCharge.create	tenant_cloud_charges	via fábrica/argumento
src/modules/cloud-charges/cloud-charge-prisma.repository.ts:202	PrismaCloudChargeRepository.listTenantCharges	this.client	tenantCloudCharge.findMany	tenant_cloud_charges	via fábrica/argumento
src/modules/cloud-charges/cloud-charge-prisma.repository.ts:220	PrismaCloudChargeRepository.listAllocationTenantAllocations	this.client	tenantCloudCostAllocation.findMany	tenant_cloud_cost_allocations	via fábrica/argumento
src/modules/cloud-cost-allocation/cloud-cost-allocation-prisma.repository.ts:238	PrismaCloudCostAllocationRepository.listUsageDailyAggregates	this.client	cloudUsageDailyAggregate.findMany	cloud_usage_daily_aggregates	via fábrica/argumento
src/modules/cloud-usage/cloud-usage-prisma.repository.ts:61	PrismaCloudUsageRepository.listEvents	this.client	cloudUsageEvent.findMany	cloud_usage_events	via chamada direta
src/modules/cloud-usage/cloud-usage-prisma.repository.ts:120	PrismaCloudUsageRepository.listDailyAggregates	this.client	cloudUsageDailyAggregate.findMany	cloud_usage_daily_aggregates	via chamada direta
src/modules/core-saas/repositories/audit-log.repository.ts:20	AuditLogRepository.listByTenant	this.client	auditLog.findMany	audit_logs	via fábrica/argumento
src/modules/core-saas/repositories/audit-log.repository.ts:34	AuditLogRepository.listByEntity	this.client	auditLog.findMany	audit_logs	via fábrica/argumento
src/modules/core-saas/repositories/audit-log.repository.ts:48	AuditLogRepository.create	this.client	auditLog.create	audit_logs	via fábrica/argumento
src/modules/core-saas/repositories/user-role.repository.ts:18	UserRoleRepository.listByTenant	this.client	userRoleAssignment.findMany	user_role_assignments	via fábrica/argumento
src/modules/core-saas/repositories/user-role.repository.ts:34	UserRoleRepository.listByUserForTenant	this.client	userRoleAssignment.findMany	user_role_assignments	via fábrica/argumento
src/modules/core-saas/repositories/user-role.repository.ts:50	UserRoleRepository.findAssignmentByIdForTenant	this.client	userRoleAssignment.findFirst	user_role_assignments	via fábrica/argumento
src/modules/core-saas/repositories/user-role.repository.ts:71	UserRoleRepository.assignRole	this.client	userRoleAssignment.findFirst	user_role_assignments	via fábrica/argumento
src/modules/core-saas/repositories/user-role.repository.ts:84	UserRoleRepository.assignRole	this.client	userRoleAssignment.create	user_role_assignments	via fábrica/argumento
src/modules/core-saas/repositories/user-role.repository.ts:95	UserRoleRepository.removeAssignment	this.client	userRoleAssignment.deleteMany	user_role_assignments	via fábrica/argumento
src/modules/core-saas/repositories/user-role.repository.ts:106	UserRoleRepository.removeAllForUser	this.client	userRoleAssignment.deleteMany	user_role_assignments	via fábrica/argumento
src/modules/core-saas/repositories/user-role.repository.ts:117	UserRoleRepository.assertUserBelongsToTenant	this.client	user.findFirst	users	via fábrica/argumento
src/modules/core-saas/repositories/user-role.repository.ts:133	UserRoleRepository.assertRoleIsAssignableToTenant	this.client	role.findFirst	roles	via fábrica/argumento
src/modules/core-saas/repositories/user-role.repository.ts:156	UserRoleRepository.assertBranchBelongsToTenant	this.client	branch.findFirst	branches	via fábrica/argumento
src/modules/core-saas/repositories/user.repository.ts:19	UserRepository.listByTenant	this.client	user.findMany	users	via fábrica/argumento
src/modules/core-saas/repositories/user.repository.ts:41	UserRepository.findByIdForTenant	this.client	user.findFirst	users	via fábrica/argumento
src/modules/core-saas/repositories/user.repository.ts:61	UserRepository.findByIdWithRoleAssignmentsForTenant	this.client	user.findFirst	users	via fábrica/argumento
src/modules/core-saas/repositories/user.repository.ts:81	UserRepository.create	this.client	user.create	users	via fábrica/argumento
src/modules/core-saas/repositories/user.repository.ts:96	UserRepository.updateProfile	this.client	user.update	users	via fábrica/argumento
src/modules/core-saas/repositories/user.repository.ts:108	UserRepository.createWithRoleAssignments	this.client	user.create	users	via fábrica/argumento
src/modules/financial-titles/financial-title-prisma.repository.ts:260	PrismaFinancialPeriodCloseRepository.isPeriodClosed	this.client	financialPeriodClose.findFirst	financial_period_closes	via chamada direta
src/modules/impound/impound.checklist-link-prisma.repository.ts:25	PrismaImpoundChecklistLinkRepository.createLink	this.client	impoundProcessChecklistLink.upsert	impound_process_checklist_links	via chamada direta
src/modules/vehicle-identities/vehicle-identity-prisma.repository.ts:352	PrismaVehicleIdentityRepository.resolveOrCreateByPlateKey	this.client	thirdPartyVehicleIdentity.findFirst	third_party_vehicle_identities	via chamada direta
src/modules/vehicle-identities/vehicle-identity-prisma.repository.ts:361	PrismaVehicleIdentityRepository.resolveOrCreateByPlateKey	this.client	thirdPartyVehicleIdentity.create	third_party_vehicle_identities	via chamada direta
src/modules/vehicle-identities/vehicle-identity-prisma.repository.ts:387	PrismaVehicleIdentityRepository.createProvisionalUnidentified	this.client	thirdPartyVehicleIdentity.create	third_party_vehicle_identities	via chamada direta
src/modules/yard/yard-prisma.repository.ts:41	PrismaYardRepository.createYard	this.client	yard.create	yards	via fábrica/argumento
src/modules/yard/yard-prisma.repository.ts:63	PrismaYardRepository.listYards	this.client	yard.findMany	yards	via fábrica/argumento
src/modules/yard/yard-prisma.repository.ts:64	PrismaYardRepository.listYards	this.client	yard.count	yards	via fábrica/argumento
src/modules/yard/yard-prisma.repository.ts:70	PrismaYardRepository.findYardById	this.client	yard.findFirst	yards	via fábrica/argumento
src/modules/yard/yard-prisma.repository.ts:76	PrismaYardRepository.updateYard	this.client	yard.updateManyAndReturn	yards	via fábrica/argumento
src/modules/yard/yard-prisma.repository.ts:96	PrismaYardRepository.createArea	this.client	yardArea.create	yard_areas	via fábrica/argumento
src/modules/yard/yard-prisma.repository.ts:116	PrismaYardRepository.listAreasByYard	this.client	yardArea.findMany	yard_areas	via fábrica/argumento
src/modules/yard/yard-prisma.repository.ts:124	PrismaYardRepository.findAreaById	this.client	yardArea.findFirst	yard_areas	via fábrica/argumento
src/modules/yard/yard-prisma.repository.ts:130	PrismaYardRepository.updateArea	this.client	yardArea.updateManyAndReturn	yard_areas	via fábrica/argumento
src/modules/yard/yard-prisma.repository.ts:147	PrismaYardRepository.createSpot	this.client	yardSpot.create	yard_spots	via fábrica/argumento
src/modules/yard/yard-prisma.repository.ts:167	PrismaYardRepository.listSpotsByArea	this.client	yardSpot.findMany	yard_spots	via fábrica/argumento
src/modules/yard/yard-prisma.repository.ts:175	PrismaYardRepository.listSpotsByYard	this.client	yardSpot.findMany	yard_spots	via fábrica/argumento
src/modules/yard/yard-prisma.repository.ts:183	PrismaYardRepository.findSpotById	this.client	yardSpot.findFirst	yard_spots	via fábrica/argumento
src/modules/yard/yard-prisma.repository.ts:188	PrismaYardRepository.updateSpot	this.client	yardSpot.findFirst	yard_spots	via fábrica/argumento
src/modules/yard/yard-prisma.repository.ts:194	PrismaYardRepository.updateSpot	this.client	yardSpot.update	yard_spots	via fábrica/argumento
src/modules/yard/yard-prisma.repository.ts:223	PrismaYardRepository.allocate	this.client	yardSpot.update	yard_spots	via fábrica/argumento
src/modules/yard/yard-prisma.repository.ts:244	PrismaYardRepository.vacate	this.client	yardSpot.update	yard_spots	via fábrica/argumento
src/modules/yard/yard-prisma.repository.ts:260	PrismaYardRepository.move	this.client	yardSpot.findFirst	yard_spots	via fábrica/argumento
src/modules/yard/yard-prisma.repository.ts:264	PrismaYardRepository.move	this.client	yardSpot.findFirst	yard_spots	via fábrica/argumento
src/modules/yard/yard-prisma.repository.ts:277	PrismaYardRepository.move	this.client	yardSpot.update	yard_spots	via fábrica/argumento
src/modules/yard/yard-prisma.repository.ts:281	PrismaYardRepository.move	this.client	yardSpot.update	yard_spots	via fábrica/argumento
src/modules/yard/yard-prisma.repository.ts:289	PrismaYardRepository.lockSpot	this.client	RAW-SQL($queryRaw)	yard_spots	via fábrica/argumento
```

---

## Apêndice B — a medição sob papel real (verbatim, com a emenda N2) e a saída completa

Executado na v1 com `ADMIN_URL=postgresql://postgres@127.0.0.1:54329/erp_san3_05?schema=public npx tsx <scratchpad>/medir-papel.ts` e **re-executado nesta v2** com `cd /home/user/wt-plano && ADMIN_URL=postgresql://postgres@127.0.0.1:54353/erp_plano?schema=public PATH=/opt/node20/bin:$PATH npx tsx $SP/medir-papel.ts` → `22 itens, 0 fora do esperado` (§R.6). **Única linha alterada** em relação à v1 (N2): `const REPO = process.env.REPO ?? process.cwd();` — md5 do arquivo emendado: `6204643a81fb5d2305f09ff38b89f9de` (v1: `e93baadc88ffa101f11ecfd6d69361a8`). Postgres 16.13 descartável, migrações de `3b1fe0f9` aplicadas; cria e derruba os papéis `san3_05_*` e a semente; nenhum segredo. Mede a trava **v1** (G1–G4); a v2 está em §R.1. É o roteiro dos testes T6–T12: o desenvolvedor **não** o commita como está — o converte em testes pelo arnês único (`createEphemeralRole`), como o §8 pede.

```ts
// B-SAN3-05 — MEDIÇÃO sob papel real `NOSUPERUSER NOBYPASSRLS` num Postgres 16 descartável.
// Roda com: cd <repo> && ADMIN_URL=postgresql://postgres@127.0.0.1:54329/erp_san3_05?schema=public npx tsx <este arquivo>
// Não toca o repositório. Cria e derruba os papéis `san3_05_*`. Nada aqui é segredo (cluster local, trust auth).
import { createRequire } from "node:module";

const REPO = process.env.REPO ?? process.cwd();
const require = createRequire(`${REPO}/package.json`);
const { PrismaPg } = require("@prisma/adapter-pg") as typeof import("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client") as typeof import("@prisma/client");

const ADMIN_URL = process.env.ADMIN_URL!;
if (!ADMIN_URL) throw new Error("ADMIN_URL ausente");

const RUNTIME = "san3_05_runtime";
const SUPER2 = "san3_05_super_com_outro_nome";
const BYPASS = "san3_05_bypass_nologin";
const PW = "san3-05-medicao";

const results: Array<{ id: string; item: string; esperado: string; medido: string; ok: boolean }> = [];
function rec(id: string, item: string, esperado: string, medido: unknown) {
  const m = String(medido);
  results.push({ id, item, esperado, medido: m, ok: m === esperado });
}

function urlFor(role: string): string {
  const u = new URL(ADMIN_URL);
  u.username = role;
  u.password = PW;
  return u.toString();
}

// A CONSULTA DA TRAVA (proposta do plano): recusa se o papel corrente É (ou É MEMBRO de) qualquer papel com
// rolsuper ou rolbypassrls. `pg_has_role(current_user, r.oid, 'MEMBER')` é verdadeiro para o próprio papel e
// para toda pertença (direta ou herdada) — cobre o atributo E a porta dos fundos do `SET ROLE`.
const GUARD_SQL = `
  SELECT r.rolname, r.rolsuper, r.rolbypassrls, (r.rolname = current_user) AS is_self
  FROM pg_roles r
  WHERE (r.rolsuper OR r.rolbypassrls) AND pg_has_role(current_user, r.oid, 'MEMBER')
  ORDER BY r.rolname`;

async function main() {
  const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: ADMIN_URL }) });
  const { withTenantRls } = (await import(`${REPO}/src/database/rls.ts`)) as typeof import("/home/user/ERP_Techsolutios/src/database/rls.js");
  const { RlsPrismaCloudUsageRepository } = (await import(`${REPO}/src/modules/cloud-usage/cloud-usage-prisma.repository.ts`)) as typeof import("/home/user/ERP_Techsolutios/src/modules/cloud-usage/cloud-usage-prisma.repository.js");
  const { PrismaCloudChargeRepository } = (await import(`${REPO}/src/modules/cloud-charges/cloud-charge-prisma.repository.ts`)) as typeof import("/home/user/ERP_Techsolutios/src/modules/cloud-charges/cloud-charge-prisma.repository.js");
  const { PrismaCloudCostAllocationRepository } = (await import(`${REPO}/src/modules/cloud-cost-allocation/cloud-cost-allocation-prisma.repository.ts`)) as typeof import("/home/user/ERP_Techsolutios/src/modules/cloud-cost-allocation/cloud-cost-allocation-prisma.repository.js");

  // ---- 0. papéis ----
  for (const r of [RUNTIME, SUPER2, BYPASS]) await admin.$executeRawUnsafe(`DROP ROLE IF EXISTS "${r}"`);
  await admin.$executeRawUnsafe(`CREATE ROLE "${RUNTIME}" LOGIN PASSWORD '${PW}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS`);
  await admin.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO "${RUNTIME}"`);
  await admin.$executeRawUnsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "${RUNTIME}"`);
  await admin.$executeRawUnsafe(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "${RUNTIME}"`);
  await admin.$executeRawUnsafe(`CREATE ROLE "${SUPER2}" LOGIN PASSWORD '${PW}' SUPERUSER`);
  await admin.$executeRawUnsafe(`CREATE ROLE "${BYPASS}" NOLOGIN BYPASSRLS`);
  await admin.$executeRawUnsafe(`GRANT SELECT ON ALL TABLES IN SCHEMA public TO "${BYPASS}"`);

  const postura = await admin.$queryRawUnsafe<Array<{ rolname: string; rolsuper: boolean; rolbypassrls: boolean }>>(
    `SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname IN ($1,$2,$3) ORDER BY rolname`, RUNTIME, SUPER2, BYPASS);
  rec("M0", "postura dos papéis (rolname:rolsuper:rolbypassrls)", `${BYPASS}:false:true,${RUNTIME}:false:false,${SUPER2}:true:false`,
    postura.map((p) => `${p.rolname}:${p.rolsuper}:${p.rolbypassrls}`).join(","));

  // ---- 1. semente (como superusuário, SOB contexto por tenant — como o app grava) ----
  const suffix = `${Date.now()}`;
  const t1 = await admin.tenant.create({ data: { name: `SAN3-05 A ${suffix}`, slug: `san3-05-a-${suffix}` } });
  const t2 = await admin.tenant.create({ data: { name: `SAN3-05 B ${suffix}`, slug: `san3-05-b-${suffix}` } });
  const day = new Date("2026-09-15T12:00:00.000Z");
  for (const [t, n] of [[t1, 3], [t2, 2]] as const) {
    await withTenantRls(admin, t.id, async (tx) => {
      for (let i = 0; i < n; i++) {
        await tx.cloudUsageEvent.create({ data: { tenant_id: t.id, source_type: "medicao", metric_key: "storage_bytes", quantity: 10, unit: "bytes", occurred_at: day, metadata: {} } });
      }
      await tx.cloudUsageDailyAggregate.create({ data: { tenant_id: t.id, date: new Date("2026-09-15T00:00:00.000Z"), metric_key: "storage_bytes", quantity: 10 * n, unit: "bytes", source_type: "medicao", metadata: {} } });
    });
  }
  const allocRun = await admin.cloudCostAllocationRun.create({ data: { provider: "aws", status: "completed", period_start: day, period_end: day, strategy: "usage_weighted_v1", metadata: {} } });
  for (const t of [t1, t2]) {
    await withTenantRls(admin, t.id, (tx) => tx.tenantCloudCostAllocation.create({ data: {
      allocation_run_id: allocRun.id, tenant_id: t.id, provider: "aws", period_start: day, period_end: day, service_code: "AmazonS3", usage_type: "storage",
      cost_category: "storage", allocation_method: "storage_usage_weight", allocation_basis_metric_key: "storage_bytes", allocation_basis_quantity: 10, allocation_ratio: 0.5, allocated_cost: 5, currency: "USD", source_cost_line_item_ids: [], metadata: {} } }));
  }
  const chargeRun = await admin.cloudChargeCalculationRun.create({ data: { status: "completed", period_start: day, period_end: day, source_allocation_run_id: allocRun.id, strategy: "markup_rules_v1", metadata: {} } });
  for (const t of [t1, t2]) {
    await withTenantRls(admin, t.id, (tx) => tx.tenantCloudCharge.create({ data: {
      calculation_run_id: chargeRun.id, tenant_id: t.id, source_allocation_run_id: allocRun.id, period_start: day, period_end: day, allocated_cost: 5, included_cloud_cost: 0, billable_cost: 5,
      markup_type: "percentage", markup_value: 20, minimum_monthly_charge: 0, gross_charge_amount: 6, discount_amount: 0, final_charge_amount: 6, margin_amount: 1, currency: "USD", status: "ready", metadata: {} } }));
  }

  // ---- 2. a trava, sob cada papel ----
  const asAdmin = await admin.$queryRawUnsafe<Array<{ rolname: string }>>(GUARD_SQL);
  rec("G1", "trava sob `postgres` (superusuário): linhas devolvidas > 0 ⇒ RECUSA", "recusa", asAdmin.length > 0 ? "recusa" : "passa");

  const runtime = new PrismaClient({ adapter: new PrismaPg({ connectionString: urlFor(RUNTIME) }) });
  const asRuntime = await runtime.$queryRawUnsafe<Array<{ rolname: string }>>(GUARD_SQL);
  rec("G2", `trava sob \`${RUNTIME}\` (NOSUPERUSER NOBYPASSRLS): 0 linhas ⇒ PASSA`, "passa", asRuntime.length === 0 ? "passa" : `recusa(${asRuntime.map((r) => r.rolname).join(",")})`);

  const super2 = new PrismaClient({ adapter: new PrismaPg({ connectionString: urlFor(SUPER2) }) });
  const asSuper2 = await super2.$queryRawUnsafe<Array<{ rolname: string; is_self: boolean }>>(GUARD_SQL);
  rec("G3", "MUTAÇÃO: superusuário com OUTRO nome ⇒ RECUSA (a trava é por atributo, não por nome)", "recusa", asSuper2.length > 0 ? "recusa" : "passa");
  await super2.$disconnect();

  // porta dos fundos: pertença a papel BYPASSRLS (deployment.md proíbe `GRANT <role_dona> TO <app>`)
  await admin.$executeRawUnsafe(`GRANT "${BYPASS}" TO "${RUNTIME}"`);
  const runtime2 = new PrismaClient({ adapter: new PrismaPg({ connectionString: urlFor(RUNTIME) }) });
  const asMember = await runtime2.$queryRawUnsafe<Array<{ rolname: string; is_self: boolean }>>(GUARD_SQL);
  rec("G4", "MUTAÇÃO: papel limpo que é MEMBRO de papel BYPASSRLS ⇒ RECUSA (pg_has_role)", "recusa", asMember.length > 0 ? `recusa` : "passa");
  // …e a porta é real: SET ROLE + leitura sem GUC devolve tudo
  const backdoor = await runtime2.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL ROLE "${BYPASS}"`);
    const [row] = await tx.$queryRawUnsafe<Array<{ n: bigint }>>(`SELECT count(*)::bigint AS n FROM cloud_usage_events WHERE tenant_id IN ('${t1.id}'::uuid,'${t2.id}'::uuid)`);
    return Number(row.n);
  });
  rec("G4b", "a porta dos fundos é real: SET ROLE <bypass> + SELECT sem GUC devolve os 5 eventos", "5", backdoor);
  // a consulta simples do §5.2 (`SELECT rolsuper, rolbypassrls … WHERE rolname = current_user`) NÃO vê a pertença:
  const naive = await runtime2.$queryRawUnsafe<Array<{ rolsuper: boolean; rolbypassrls: boolean }>>(`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`);
  rec("G4c", "a consulta INGÊNUA do §5.2 sob o mesmo papel-membro diz false:false (cega à pertença)", "false:false", `${naive[0].rolsuper}:${naive[0].rolbypassrls}`);
  await runtime2.$disconnect();
  await admin.$executeRawUnsafe(`REVOKE "${BYPASS}" FROM "${RUNTIME}"`);

  // ---- 3. posse das tabelas FORCE (dimensão reportada, não bloqueante) ----
  const [own] = await runtime.$queryRawUnsafe<Array<{ n: bigint }>>(`SELECT count(*)::bigint AS n FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace WHERE ns.nspname='public' AND c.relkind='r' AND c.relforcerowsecurity AND pg_get_userbyid(c.relowner) = current_user`);
  rec("O1", `tabelas FORCE de posse do papel de runtime (dono ≠ app)`, "0", Number(own.n));
  const [ownAdmin] = await admin.$queryRawUnsafe<Array<{ n: bigint }>>(`SELECT count(*)::bigint AS n FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace WHERE ns.nspname='public' AND c.relkind='r' AND c.relforcerowsecurity AND pg_get_userbyid(c.relowner) = current_user`);
  rec("O2", "tabelas FORCE de posse do migrador (`postgres`)", "106", Number(ownAdmin.n));

  // ---- 4. as leituras/escritas de plataforma, com o CÓDIGO REAL, sob o papel de runtime ----
  const usage = new RlsPrismaCloudUsageRepository(runtime);
  rec("P1", "cloud-usage-prisma.repository.ts:173 listEvents({}) [plataforma, sem tenant] — hoje", "0", (await usage.listEvents({ periodStart: new Date("2026-09-01"), periodEnd: new Date("2026-09-30") })).length);
  rec("P1c", "controle positivo: listEvents({tenantId: A}) sob contexto", "3", (await usage.listEvents({ tenantId: t1.id })).length);
  rec("P1d", "controle positivo: listEvents({tenantId: B}) sob contexto", "2", (await usage.listEvents({ tenantId: t2.id })).length);
  rec("P2", "cloud-usage-prisma.repository.ts:197 listDailyAggregates({}) [plataforma] — hoje", "0", (await usage.listDailyAggregates({})).length);
  rec("P2c", "controle positivo: listDailyAggregates({tenantId: A})", "1", (await usage.listDailyAggregates({ tenantId: t1.id })).length);

  const charges = new PrismaCloudChargeRepository(runtime);
  rec("P3", "cloud-charge-prisma.repository.ts:202 listTenantCharges(run) — hoje", "0", (await charges.listTenantCharges(chargeRun.id)).length);
  rec("P4", "cloud-charge-prisma.repository.ts:220 listAllocationTenantAllocations(allocRun) — hoje", "0", (await charges.listAllocationTenantAllocations(allocRun.id)).length);
  rec("P5c", "controle: listTenants() (tabela `tenants` sem RLS) devolve as 2 organizações da semente", "2", (await charges.listTenants()).filter((t) => t.id === t1.id || t.id === t2.id).length);
  let p6 = "sem erro";
  try {
    await charges.replaceTenantCharges(chargeRun.id, [{ calculationRunId: chargeRun.id, tenantId: t1.id, sourceAllocationRunId: allocRun.id, periodStart: day, periodEnd: day, allocatedCost: 5, includedCloudCost: 0, billableCost: 5, markupType: "percentage", markupValue: 20, minimumMonthlyCharge: 0, grossChargeAmount: 6, discountAmount: 0, finalChargeAmount: 6, marginAmount: 1, currency: "USD", status: "ready", metadata: {} }]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    p6 = /row-level security/i.test(msg) ? "42501 row-level security" : `erro: ${msg.slice(0, 80)}`;
  }
  rec("P6", "cloud-charge-prisma.repository.ts:167-171 replaceTenantCharges — hoje (deleteMany silencioso + INSERT recusado)", "42501 row-level security", p6);
  const [sobrou] = await admin.$queryRawUnsafe<Array<{ n: bigint }>>(`SELECT count(*)::bigint AS n FROM tenant_cloud_charges WHERE calculation_run_id = '${chargeRun.id}'::uuid`);
  rec("P6b", "…e o deleteMany sem contexto NÃO apagou nada (as 2 cobranças seguem lá, lidas como superusuário)", "2", Number(sobrou.n));

  const alloc = new PrismaCloudCostAllocationRepository(runtime);
  rec("P7", "cloud-cost-allocation-prisma.repository.ts:238 listUsageDailyAggregates (sem chamador em src) — hoje", "0", (await alloc.listUsageDailyAggregates(day, day)).length);
  rec("P7c", "controle: listTenantAllocations(allocRun) do B-O6R-06 (laço por tenant SOB contexto) devolve 2", "2", (await alloc.listTenantAllocations(allocRun.id)).length);

  // o REMÉDIO proposto (laço por tenant sob contexto, padrão B-O6R-06) — medido aqui como protótipo
  const tenants = await runtime.tenant.findMany({ where: { id: { in: [t1.id, t2.id] } }, select: { id: true } });
  let soma = 0;
  await runtime.$transaction(async (tx) => {
    const { setTenantRlsContext } = await import(`${REPO}/src/database/rls.ts`);
    for (const t of tenants) {
      await setTenantRlsContext(tx, t.id);
      const rows = await tx.cloudUsageEvent.findMany({ where: { tenant_id: t.id } });
      if (rows.some((r) => r.tenant_id !== t.id)) throw new Error("canário: linha de outro tenant");
      soma += rows.length;
    }
  });
  rec("R1", "REMÉDIO (protótipo): laço por tenant sob contexto, mesmo papel, soma os eventos das 2 organizações", "5", soma);

  await runtime.$disconnect();

  // ---- 5. limpeza ----
  for (const t of [t1, t2]) {
    await withTenantRls(admin, t.id, async (tx) => {
      await tx.tenantCloudCharge.deleteMany({ where: { tenant_id: t.id } });
      await tx.tenantCloudCostAllocation.deleteMany({ where: { tenant_id: t.id } });
      await tx.cloudUsageDailyAggregate.deleteMany({ where: { tenant_id: t.id } });
      await tx.cloudUsageEvent.deleteMany({ where: { tenant_id: t.id } });
    });
  }
  await admin.cloudChargeCalculationRun.delete({ where: { id: chargeRun.id } });
  await admin.cloudCostAllocationRun.delete({ where: { id: allocRun.id } });
  await admin.tenant.deleteMany({ where: { id: { in: [t1.id, t2.id] } } });
  for (const r of [RUNTIME, SUPER2, BYPASS]) {
    await admin.$executeRawUnsafe(`REVOKE ALL ON ALL TABLES IN SCHEMA public FROM "${r}"`);
    await admin.$executeRawUnsafe(`REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM "${r}"`);
    await admin.$executeRawUnsafe(`REVOKE ALL ON SCHEMA public FROM "${r}"`);
    await admin.$executeRawUnsafe(`DROP ROLE "${r}"`);
  }
  await admin.$disconnect();

  console.log("| id | item | esperado | medido | ok |");
  console.log("|---|---|---|---|:-:|");
  for (const r of results) console.log(`| ${r.id} | ${r.item} | \`${r.esperado}\` | \`${r.medido}\` | ${r.ok ? "✓" : "✗"} |`);
  const bad = results.filter((r) => !r.ok);
  console.log(`\n# ${results.length} itens, ${bad.length} fora do esperado`);
  process.exitCode = bad.length ? 1 : 0;
}

main().catch((e) => { console.error(e); process.exitCode = 2; });
```

**Saída completa** (exit=0):

| id | item | esperado | medido | ok |
|---|---|---|---|:-:|
| M0 | postura dos papéis (rolname:rolsuper:rolbypassrls) | `san3_05_bypass_nologin:false:true,san3_05_runtime:false:false,san3_05_super_com_outro_nome:true:false` | `san3_05_bypass_nologin:false:true,san3_05_runtime:false:false,san3_05_super_com_outro_nome:true:false` | ✓ |
| G1 | trava sob `postgres` (superusuário): linhas devolvidas > 0 ⇒ RECUSA | `recusa` | `recusa` | ✓ |
| G2 | trava sob `san3_05_runtime` (NOSUPERUSER NOBYPASSRLS): 0 linhas ⇒ PASSA | `passa` | `passa` | ✓ |
| G3 | MUTAÇÃO: superusuário com OUTRO nome ⇒ RECUSA (a trava é por atributo, não por nome) | `recusa` | `recusa` | ✓ |
| G4 | MUTAÇÃO: papel limpo que é MEMBRO de papel BYPASSRLS ⇒ RECUSA (pg_has_role) | `recusa` | `recusa` | ✓ |
| G4b | a porta dos fundos é real: SET ROLE <bypass> + SELECT sem GUC devolve os 5 eventos | `5` | `5` | ✓ |
| G4c | a consulta INGÊNUA do §5.2 sob o mesmo papel-membro diz false:false (cega à pertença) | `false:false` | `false:false` | ✓ |
| O1 | tabelas FORCE de posse do papel de runtime (dono ≠ app) | `0` | `0` | ✓ |
| O2 | tabelas FORCE de posse do migrador (`postgres`) | `106` | `106` | ✓ |
| P1 | cloud-usage-prisma.repository.ts:173 listEvents({}) [plataforma, sem tenant] — hoje | `0` | `0` | ✓ |
| P1c | controle positivo: listEvents({tenantId: A}) sob contexto | `3` | `3` | ✓ |
| P1d | controle positivo: listEvents({tenantId: B}) sob contexto | `2` | `2` | ✓ |
| P2 | cloud-usage-prisma.repository.ts:197 listDailyAggregates({}) [plataforma] — hoje | `0` | `0` | ✓ |
| P2c | controle positivo: listDailyAggregates({tenantId: A}) | `1` | `1` | ✓ |
| P3 | cloud-charge-prisma.repository.ts:202 listTenantCharges(run) — hoje | `0` | `0` | ✓ |
| P4 | cloud-charge-prisma.repository.ts:220 listAllocationTenantAllocations(allocRun) — hoje | `0` | `0` | ✓ |
| P5c | controle: listTenants() (tabela `tenants` sem RLS) devolve as 2 organizações da semente | `2` | `2` | ✓ |
| P6 | cloud-charge-prisma.repository.ts:167-171 replaceTenantCharges — hoje (deleteMany silencioso + INSERT recusado) | `42501 row-level security` | `42501 row-level security` | ✓ |
| P6b | …e o deleteMany sem contexto NÃO apagou nada (as 2 cobranças seguem lá, lidas como superusuário) | `2` | `2` | ✓ |
| P7 | cloud-cost-allocation-prisma.repository.ts:238 listUsageDailyAggregates (sem chamador em src) — hoje | `0` | `0` | ✓ |
| P7c | controle: listTenantAllocations(allocRun) do B-O6R-06 (laço por tenant SOB contexto) devolve 2 | `2` | `2` | ✓ |
| R1 | REMÉDIO (protótipo): laço por tenant sob contexto, mesmo papel, soma os eventos das 2 organizações | `5` | `5` | ✓ |

# 22 itens, 0 fora do esperado

---

## Apêndice C — `scripts/db-runtime-role.sh` (verbatim) — executado em 7 cenários (§R.4)

md5 medido: `189ddf8a093934cf1c1baa61ba80f5c8` · 82 linhas · versionar com modo `100755` (`git update-index --chmod=+x scripts/db-runtime-role.sh`). Uso: `DB_RUNTIME_PASSWORD=… [DB_RUNTIME_ROLE=erp_runtime] [DB_MIGRATOR_ROLE=<default: usuário da conexão>] bash scripts/db-runtime-role.sh`, com `PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE` (fora do initdb.d) ou `POSTGRES_USER/POSTGRES_DB` (dentro dele).

```bash
#!/usr/bin/env bash
# B-SAN3-05 — cria/converge o PAPEL DE RUNTIME da API: LOGIN, NOSUPERUSER, NOBYPASSRLS, sem posse de tabela FORCE RLS,
# sem pertença a papel que escape de RLS; só DML + USAGE em sequências. Idempotente. FALHA (psql ec=3) se o papel
# escapar de RLS por atributo, pertença ou posse e este script não puder corrigir — nunca "aceita" um papel que escapa.
#
# Entradas (ambiente): DB_RUNTIME_ROLE (default erp_runtime) · DB_RUNTIME_PASSWORD (obrigatória; nunca ecoada)
#   · DB_MIGRATOR_ROLE (default: o usuário desta conexão — é quem cria as tabelas; ALTER DEFAULT PRIVILEGES é dele)
# Conexão: no initdb.d do postgres:16 usa POSTGRES_USER/POSTGRES_DB (socket local); fora dele, PGHOST/PGPORT/PGUSER/
#   PGPASSWORD/PGDATABASE (PGDATABASE obrigatória: os GRANTs e os DEFAULT PRIVILEGES são POR BANCO — o banco da app).
# Todo o corpo roda numa FUNÇÃO em SUBSHELL: quando o entrypoint do postgres:16 faz `source` deste arquivo (modo 100644),
#   nenhum `set -u`/`exit` vaza para o shell dele. O arquivo é versionado com modo 100755 (executado, não sourced).
db_runtime_role_main() (
  set -euo pipefail
  : "${DB_RUNTIME_PASSWORD:?DB_RUNTIME_PASSWORD obrigatória}"
  local role="${DB_RUNTIME_ROLE:-erp_runtime}" migrator="${DB_MIGRATOR_ROLE:-}"
  local -a conn=()
  if [ -n "${POSTGRES_DB:-}" ]; then conn=(--username "${POSTGRES_USER:-postgres}" --dbname "$POSTGRES_DB")
  else : "${PGDATABASE:?PGDATABASE obrigatória (o banco da aplicação)}"; fi
  psql -X -v ON_ERROR_STOP=1 -At "${conn[@]}" \
    -v role="$role" -v password="$DB_RUNTIME_PASSWORD" -v migrator="$migrator" <<'SQL'
SELECT set_config('san3.role', :'role', false), set_config('san3.password', :'password', false),
       set_config('san3.migrator', coalesce(nullif(:'migrator', ''), current_user::text), false) \gset _
DO $$
DECLARE
  v_role     text := current_setting('san3.role');
  v_password text := current_setting('san3.password');
  v_migrator text := current_setting('san3.migrator');
  me pg_roles%ROWTYPE; alvo pg_roles%ROWTYPE; r record; n int;
BEGIN
  SELECT * INTO me FROM pg_roles WHERE rolname = current_user;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = v_role) THEN
    -- CREATE ROLE sem nomear NOSUPERUSER/NOCREATEDB/NOBYPASSRLS (são os defaults; nomeá-los exige o atributo — PG16)
    EXECUTE format('CREATE ROLE %I LOGIN NOINHERIT PASSWORD %L', v_role, v_password);
  ELSE
    EXECUTE format('ALTER ROLE %I WITH LOGIN NOINHERIT PASSWORD %L', v_role, v_password);
  END IF;
  SELECT * INTO alvo FROM pg_roles WHERE rolname = v_role;
  -- atributos que escapam: corrige se este executor puder; senão FALHA nomeando o atributo
  IF alvo.rolsuper     THEN IF me.rolsuper     THEN EXECUTE format('ALTER ROLE %I NOSUPERUSER', v_role); ELSE RAISE EXCEPTION 'papel % tem SUPERUSER e % nao pode remover (precisa de SUPERUSER): corrija com outro executor ou use outro nome', v_role, current_user; END IF; END IF;
  IF alvo.rolbypassrls THEN IF me.rolbypassrls THEN EXECUTE format('ALTER ROLE %I NOBYPASSRLS', v_role); ELSE RAISE EXCEPTION 'papel % tem BYPASSRLS e % nao pode remover (precisa de BYPASSRLS)', v_role, current_user; END IF; END IF;
  IF alvo.rolcreatedb  THEN IF me.rolcreatedb  THEN EXECUTE format('ALTER ROLE %I NOCREATEDB', v_role);  ELSE RAISE EXCEPTION 'papel % tem CREATEDB e % nao pode remover', v_role, current_user; END IF; END IF;
  IF alvo.rolcreaterole THEN IF me.rolcreaterole THEN EXECUTE format('ALTER ROLE %I NOCREATEROLE', v_role); ELSE RAISE EXCEPTION 'papel % tem CREATEROLE e % nao pode remover', v_role, current_user; END IF; END IF;
  -- pertença a papel que escapa (atributo) ou que é DONO de tabela FORCE RLS: REVOKE (falha se este executor não tiver ADMIN)
  FOR r IN SELECT DISTINCT b.rolname FROM pg_roles b
           WHERE b.rolname <> v_role AND pg_has_role(v_role, b.oid, 'MEMBER')
             AND (b.rolsuper OR b.rolbypassrls
                  OR EXISTS (SELECT 1 FROM pg_class c WHERE c.relkind IN ('r','p') AND c.relforcerowsecurity AND c.relowner = b.oid))
  LOOP EXECUTE format('REVOKE %I FROM %I', r.rolname, v_role); END LOOP;
  -- privilégios: só DML + USAGE/SELECT em sequências (existentes) e DEFAULT PRIVILEGES do migrador (futuras)
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), v_role);
  EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', v_role);
  -- GRANT tabela a tabela: só nas que este executor pode conceder (dono, ou membro do dono; superusuário = todas).
  -- Tabela de OUTRO dono em `public` é FALHA NOMEADA (o app receberia 42501 nela): reatribua o dono ao migrador.
  FOR r IN SELECT c.relname, c.relkind, pg_get_userbyid(c.relowner) AS dono, pg_has_role(current_user, c.relowner, 'USAGE') AS posso
           FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
           WHERE ns.nspname = 'public' AND c.relkind IN ('r','p','S') ORDER BY c.relname
  LOOP
    IF NOT r.posso THEN RAISE EXCEPTION 'tabela/sequencia public.% pertence a % e % nao pode conceder DML nela: ALTER ... OWNER TO % e rode de novo', r.relname, r.dono, current_user, v_migrator; END IF;
    IF r.relkind = 'S' THEN EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO %I', r.relname, v_role);
    ELSE EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO %I', r.relname, v_role); END IF;
  END LOOP;
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I', v_migrator, v_role);
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO %I', v_migrator, v_role);
  -- AUTO-VERIFICAÇÃO (a mesma propriedade da trava de boot, avaliada para o papel): qualquer linha ⇒ EXCEÇÃO ⇒ psql ec=3
  SELECT count(*) INTO n FROM (
    SELECT 1 FROM pg_roles b WHERE (b.rolsuper OR b.rolbypassrls) AND pg_has_role(v_role, b.oid, 'MEMBER')
    UNION ALL
    SELECT 1 FROM pg_class c WHERE c.relkind IN ('r','p') AND c.relforcerowsecurity AND pg_has_role(v_role, c.relowner, 'MEMBER')
  ) q;
  IF n > 0 THEN
    RAISE EXCEPTION 'papel % ainda escapa de RLS (% via(s): atributo, pertenca ou POSSE de tabela FORCE RLS). Posse nao se corrige aqui: reatribua o dono ao migrador (ALTER TABLE ... OWNER TO %) e rode de novo', v_role, n, v_migrator;
  END IF;
END $$;
-- linha final (uma só, -At): rolname|rolsuper|rolbypassrls|escapa_por_pertenca|tabelas_force_de_posse_ou_pertenca|tabelas_com_dml
SELECT r.rolname, r.rolsuper, r.rolbypassrls,
       EXISTS (SELECT 1 FROM pg_roles b WHERE (b.rolsuper OR b.rolbypassrls) AND pg_has_role(r.oid, b.oid, 'MEMBER')) AS escapa,
       (SELECT count(*) FROM pg_class c WHERE c.relkind IN ('r','p') AND c.relforcerowsecurity AND pg_has_role(r.oid, c.relowner, 'MEMBER')) AS posse,
       (SELECT count(*) FROM pg_tables t WHERE t.schemaname = 'public' AND has_table_privilege(r.oid, format('%I.%I', t.schemaname, t.tablename), 'SELECT,INSERT,UPDATE,DELETE')) AS dml
FROM pg_roles r WHERE r.rolname = :'role';
SQL
)
db_runtime_role_main "$@"
```

---

## Apêndice D — as 17 fixtures de mutação do T13 (`tests/fixtures/san3-05-mutacoes/`, verbatim — as da crítica r1)

Cada arquivo é copiado pelo T13 para `src/modules/zz-mut/mut.ts` numa cópia temporária de `src`+`prisma` (sem `node_modules`); o gerador tem de acrescentar **≥ 1** chave ao inventário suspeito (medido: 17/17, §R.2). O 18º subteste ("sumida") altera por `sed` a fábrica do sítio 7 na cópia (`new PrismaCloudCostAllocationRepository(prisma)` → `(prisma as never)`) e espera chave sumida/nova.

**`Ma_alias.ts`**

```ts
import { prisma } from "../../database/prisma.js";
export async function platformList() { const db2 = prisma; return db2.cloudUsageEvent.findMany({}); }
```

**`Mb_destructure.ts`**

```ts
import { prisma } from "../../database/prisma.js";
export async function platformList() { const { cloudUsageEvent } = prisma; return cloudUsageEvent.findMany({}); }
```

**`Mc_element.ts`**

```ts
import { prisma } from "../../database/prisma.js";
export async function platformList() { return prisma["cloudUsageEvent"].findMany({}); }
```

**`Md_tx_sem_setter.ts`**

```ts
import { prisma } from "../../database/prisma.js";
export async function platformList() { return prisma.$transaction(async (tx) => tx.cloudUsageEvent.findMany({})); }
```

**`Me_root_dentro_wrapper.ts`**

```ts
import { prisma } from "../../database/prisma.js";
import { withTenantRls } from "../../database/rls.js";
export async function platformList(id: string) { return withTenantRls(prisma, id, async (_tx) => prisma.cloudUsageEvent.findMany({})); }
```

**`Mf_new_como_argumento.ts`**

```ts
import { prisma } from "../../database/prisma.js";
import { PrismaCloudUsageRepository } from "../cloud-usage/cloud-usage-prisma.repository.js";
class Svc { constructor(readonly repo: PrismaCloudUsageRepository) {} run() { return this.repo.listEvents({}); } }
export function build() { return new Svc(new PrismaCloudUsageRepository(prisma)); }
```

**`Mg_subclasse.ts`**

```ts
import { prisma } from "../../database/prisma.js";
import { PrismaCloudChargeRepository } from "../cloud-charges/cloud-charge-prisma.repository.js";
class Sub extends PrismaCloudChargeRepository {}
export function make() { return new Sub(prisma); }
```

**`Mh_funcao_livre_client.ts`**

```ts
import { prisma } from "../../database/prisma.js";
async function listAll(client: typeof prisma) { return client.cloudUsageEvent.findMany({}); }
export function run() { return listAll(prisma); }
```

**`Mi_sql_em_constante.ts`**

```ts
import { prisma } from "../../database/prisma.js";
const SQL_TODOS = "SELECT * FROM cloud_usage_events";
export async function platformList() { return prisma.$queryRawUnsafe(SQL_TODOS); }
```

**`Mj_campo_arrow.ts`**

```ts
import { prisma } from "../../database/prisma.js";
class K { constructor(private readonly client: typeof prisma) {} listAll = async () => this.client.cloudUsageEvent.findMany({}); }
export function run() { return new K(prisma).listAll(); }
```

**`Mk_fabrica_param_tx.ts`**

```ts
import { prisma } from "../../database/prisma.js";
import { PrismaCloudUsageRepository } from "../cloud-usage/cloud-usage-prisma.repository.js";
const make = (tx: typeof prisma) => new PrismaCloudUsageRepository(tx);
export function run() { return make(prisma).listEvents({}); }
```

**`Ml_mutacao_do_plano.ts`**

```ts
import { prisma } from "../../database/prisma.js";
import { PrismaCloudUsageRepository } from "../cloud-usage/cloud-usage-prisma.repository.js";
export function run() { return new PrismaCloudUsageRepository(prisma).listEvents({}); }
```

**`Mm_getter_prisma.ts`**

```ts
import { getPrisma } from "../../database/prisma.js";
export async function platformList() { return getPrisma().cloudUsageEvent.findMany({}); }
```

**`Mn_membro_nao_previsto.ts`**

```ts
import { prisma } from "../../database/prisma.js";
class K { constructor(private readonly conn: typeof prisma) {} async listAll() { return this.conn.cloudUsageEvent.findMany({}); } }
export function run() { return new K(prisma).listAll(); }
```

**`Mo_tx_param_helper.ts`**

```ts
import { prisma } from "../../database/prisma.js";
async function helper(tx: typeof prisma) { return tx.tenantCloudCharge.findMany({}); }
export function run() { return helper(prisma); }
```

**`Mp_this_client_fora_de_classe_injetada.ts`**

```ts
import { prisma } from "../../database/prisma.js";
import { PrismaCloudChargeRepository } from "../cloud-charges/cloud-charge-prisma.repository.js";
export const repos = { charges: new PrismaCloudChargeRepository(prisma) };
export function run() { return repos.charges.listTenantCharges("x"); }
```

**`Mq_updateManyAndReturn.ts`**

```ts
import { prisma } from "../../database/prisma.js";
class Rep { constructor(private readonly client: typeof prisma) {} async fechar(id: string) { return this.client.tenantCloudCharge.updateManyAndReturn({ where: { id }, data: { status: "void" } }); } }
export function run() { return new Rep(prisma).fechar("x"); }
```
