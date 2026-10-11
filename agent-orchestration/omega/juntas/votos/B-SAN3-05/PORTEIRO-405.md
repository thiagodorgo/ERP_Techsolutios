# PORTEIRO PÓS-MERGE — PR #405 (B-SAN3-05, o papel de runtime não contorna o RLS)

**Substituição DECLARADA (§C7.6-bis):** papel `porteiro-pos-merge` · modelo que rodou **Claude Opus 5.5 (claude-opus-5-5)** · por que não Fable: decisão do dono de 2026-10-08 — Fable só roda em bloco que toca dinheiro; este bloco não toca dinheiro. O frontmatter do corpo continua `model: fable`.

- Corpo aplicado: `git show a9fbe283:.claude/agents/porteiro-pos-merge.md` (78 linhas), md5 EOL-neutro `374b1b0d091a85cddf1733d3e51456ae` (`| tr -d '\r' | md5sum`).
- Merge julgado: `a9fbe28342a41e2f61cfbb0bea7e618f85d86d9f` (squash). Head aprovado (ata): `84831ad9796d8db29766b0ff6e0a1a894a9d45e7`. Head no merge: `c16bf9be1c3d08a8420751deb9ee4d86c896166a`.
- Medição na ref (§A7): tudo por `git show a9fbe283:…` / worktree próprio `C:/Users/AMP/w-port405` detached em `a9fbe283`.
- Início: 2026-10-09T22:03Z.

## 0. Pré-voo (disco, corpo, ref)
- `df -h /c` → 238G total, 12G livres (96%) às 22:03Z. Acima do piso de 7 GB do mandato; ABAIXO de ~10 GB? Não (12 GB). Re-medir ao fim.
- Corpo: `git show a9fbe283:.claude/agents/porteiro-pos-merge.md | tr -d '\r' | md5sum` → `374b1b0d091a85cddf1733d3e51456ae`, 78 linhas. É o corpo seguido.
- §C7 item 8 na ref: `git show a9fbe283:CLAUDE.md | tr -d '\r' | grep -n D-GOV-PROPORCIONAL` → l.268 (KPI CONGELADO no §C3), l.415 (teto de 2 ciclos), l.612–644 (item 8, (2) teto, (5) KPI congelado). Vale na ref julgada.
- Conclusão: pré-voo OK.

## 1. O merge existe e está íntegro
- `git fetch origin --prune; git log origin/main -3` → topo `a9fbe28342a41e2f61cfbb0bea7e618f85d86d9f` 2026-10-09 19:01:03 -0300 "fix(database): o papel de runtime não contorna o RLS (B-SAN3-05) (#405)", pai único `a9bbde38` (#410). Squash confirmado (1 pai).
- `gh pr view 405 --json state,mergedAt,mergeCommit,headRefOid` → `MERGED`, `2026-10-09T22:01:03Z`, mergeCommit `a9fbe283…`, headRefOid `c16bf9be1c3d08a8420751deb9ee4d86c896166a`, ramo `fix/runtime-role-sem-bypass`.
- Integridade do squash: `git rev-parse a9fbe283^{tree}` = `b77d8c43…` = `git rev-parse c16bf9be^{tree}`. **A árvore mergeada é byte a byte a árvore do head no merge.**
- `84831ad9` é ancestral de `c16bf9be` (`merge-base --is-ancestor` → sim). Entre eles, por `--first-parent`, **4 commits** (não 2, como diz o mandato): `10fbbd98` voto C2, `3a7fde77` voto C3, `c6c63717` merge da `main` `a9bbde38`, `c16bf9be` ata. Os dois commits de voto só tocam `votos/B-SAN3-05/ciclo4/C{2,3}-{evidencia.md,voto.json}`; a ata só toca 5 arquivos de registro (`log-execucao.md`, `pendencias-indice.md`, `pendencias.md`, `status-geral.md`, `J-B-SAN3-05.md`). Nota de forma: o mandato contou 2 commits pós-voto; são 4, e nenhum dos 2 a mais toca produto.
- Conclusão: merge existe na `main` remota e é íntegro.

## 2. Promessa × diff
**2a. Delta de produto mergeado = delta aprovado (`84831ad9`).**
- `git diff --name-status a9fbe283^ a9fbe283 -- src scripts tests prisma migrations docs/deployment.md frontend .github` → 50 arquivos (10 de `src`/`scripts`/`docs`, 40 de `tests`, sendo 34 fixtures). `prisma/`, `migrations/`, `frontend/`, `.github/` → 0 arquivos.
- `git diff c8af6458 84831ad9 -- <mesmos caminhos>` (merge-base do aprovado com a `main` = `c8af6458`, #408) → os mesmos 50 arquivos, mesmo status.
- **patch-id** (`git patch-id --stable`) dos dois deltas: `2bc57e75973205f6d9aaabc4bd0e7641d870f2dc` = `2bc57e75973205f6d9aaabc4bd0e7641d870f2dc`. **Idênticos.**
- Por blob, todo arquivo tocado pelo squash (N=135) contra `84831ad9`: 124 iguais, 11 diferentes — 10 de registro (`log-execucao.md`, `decisoes.md`, `pendencias.md`, `pendencias-indice.md`, `status-geral.md`, `J-B-SAN3-05.md`, `ciclo4/C2-*`, `ciclo4/C3-*`: votos e ata pós-voto + merge da `main`) e `docs/deployment.md`.
- `docs/deployment.md`: o desvio é só o lado da `main` — patch-id de `84831ad9→a9fbe283` = patch-id de `c8af6458→a9bbde38` (`ab6dee9d…`), ou seja, o que o #400 escreveu. As 6 linhas da `main` ausentes no squash existiam no merge-base e foram removidas pelo próprio #405 (conferido linha a linha: `mb=1 405=0`).
- Arquivos tocados dos dois lados (`comm -12`): 5 de registro + `docs/deployment.md`. Nenhuma linha de `decisoes.md`, `log-execucao.md`, `status-geral.md` de nenhum dos lados se perdeu (`comm -23` = 0). Em `pendencias.md`, as linhas "perdidas" são trocas de status `ABERTA → EM ANDAMENTO` feitas pela ata (`P-INFRA-RLS` l.~500 e a de leituras de plataforma l.7520), não perda.
- Fora da lista de produto do mandato, o squash leva também `docker-compose.prod.yml` (+16/−?) e `.gitattributes` (+1) — ambos com blob idêntico ao aprovado (`321fe70c…`); estão no aprovado, não entraram em silêncio.
- `Kpis/` no squash: **0 arquivos** (`git diff --name-only a9fbe283^ a9fbe283 -- Kpis | wc -l` → 0). Coerente com o KPI congelado (D-GOV-PROPORCIONAL (5)) e com o PROIBIDO do C4.4.

**2b. `D-405-PROIBIR-VIEWS` nas três cópias + doc.** (`git show a9fbe283:<arquivo>`)
- Trava `RUNTIME_ROLE_GUARD_SQL` (`src/database/runtime-role.ts` l.13–58): ramo `view` = `FROM view_force vf JOIN pg_class v … JOIN pg_roles o …` **sem `WHERE`** de dono/privilégio; comentário l.1–9 enuncia a regra ("QUALQUER view ou matview, de qualquer esquema e de qualquer dono … D-405-PROIBIR-VIEWS"); mensagem do `RuntimeRoleGuardError` (l.~108) acrescenta "nenhuma view/matview sobre tabela FORCE".
- `scripts/db-runtime-role.sh`: `DO` do MODO 6 → `SELECT DISTINCT 'view', v.oid::regclass::text FROM view_force vf JOIN pg_class v …` (sem filtro), `RAISE` com "nenhuma view/matview pode alcançar tabela FORCE: DROP VIEW/DROP MATERIALIZED VIEW de cada uma … (MODO 6)"; linha final `(SELECT count(*) FROM view_force) AS views`; cabeçalho l.3–4 e l.20–21 dizem a regra. `git ls-tree` → `100755`; 0 CR no blob; `.gitattributes` l.1 `scripts/db-runtime-role.sh text eol=lf`.
- Igualdade das 3 cópias (script python com a regex do T8f, normalizado sem espaço): trava 1 bloco, script 2 blocos, os 3 com md5 `6e9fe5dfcbd315ed33d3d6f5c4793bda` (= o md5 da candidata no plano C4.3); `view_escape` = 0 ocorrências nas duas fontes.
- `docs/deployment.md` (ref `a9fbe283`): l.95–98 via `view` + "**Regra operacional (`D-405-PROIBIR-VIEWS`): nenhuma view nem matview sobre tabela protegida (FORCE RLS), em nenhum esquema, de nenhum dono** (inclui `security_invoker` e matview vazia)"; l.128–130 MODO 6; l.135–138 a frase do compose.

**2c. Corpo do PR × diff.** `gh pr view 405 --json body` (39 linhas; PR criado 2026-10-04, 100 commits).
- Cumpridas no diff: guarda antes do Redis (`src/server.ts` l.17 `await assertRuntimeDatabaseRoleIfEnforced` antes de `createCoreSaasService`); `G-DB-ROLE` em `src/config/env.ts` (skip em produção recusado; default `enforce`); senha fora de argv (`\password` por stdin sob `setsid`, l.~117–125 do script); gerador/ratchet (`scripts/san3-05-acessos-de-plataforma.mjs` + `tests/san3-05-acessos-de-plataforma-guard.test.ts`); prova de REPLICATION com slot físico e `42501` (`tests/san3-05-runtime-role-guard-db.test.ts` l.822–838); leituras de plataforma por caminho explícito (`cloud-charge-prisma.repository.ts`, `cloud-usage-prisma.repository.ts`, `rls.ts`).
- **Desatualizado (nota, não bloqueia):** o corpo é do ciclo 1 e não foi reescrito. Afirma "documentação de deploy, **KPI** e rastreabilidade atualizados" e uma seção KPI ("blocos concluídos: 170 → 171", backend 3122/3124) — o diff tem **0** arquivos em `Kpis/`, o que é o CERTO sob `D-GOV-PROPORCIONAL` (5) e o C4.4; também cita "A1–A24", "seis pendências residuais", "arquivo do bloco 8/8" e "291 arquivos, 3.124 testes", números do ciclo 1 (o arquivo do bloco tem hoje 12 subtestes no `test(` único). Nenhuma promessa de **produto** do corpo falta no diff; o que sobra são números e a linha de KPI que a regra vigente proíbe. **Gravidade: nota** — o corpo de PR não é fonte de verdade de registro (§A5) e o registro do bloco está na ata/plano.
- Texto residual da regra antiga: a mensagem do `G-DB-ROLE` em `src/config/env.ts` ainda diz "view de dono que escapa" — subconjunto verdadeiro da regra nova; o plano C4.4 a deixou PROIBIDA de propósito ("nota para o orquestrador"). Conferir no item 6 se tem pendência (`-MENSAGEM-DA-RECUSA`).
- Conclusão 2: **produto mergeado = produto aprovado** (patch-id e blob); a regra do dono está nas três cópias e na doc. Corpo do PR desatualizado = nota.

## 3. Contagens reexecutadas
**Terreno próprio (P1, medido 22:05–22:10Z).**
- Worktree: `git -c core.autocrlf=false worktree add --detach C:/Users/AMP/w-port405 a9fbe28342a41e2f61cfbb0bea7e618f85d86d9f` ec=0; `rev-parse HEAD` = `a9fbe283…`. Byte-identidade: `git hash-object --no-filters --stdin-paths` × `ls-tree -r` → `blobs=3830 byte_identicos=3830`. Sem `node_modules` no worktree (nenhuma junction).
- Containers Linux próprios, prefixo `port405-`: rede `port405-net`, `port405-pg` (postgres:16 → 16.14), `port405-redis` (redis:7, `PONG`), `port405-node` (`erp-junta-node20-pg16:local`, node v20.20.2, npm 10.8.2, psql 16.14). `docker port` dos dois → vazio (**nenhuma porta publicada no host**). `erp-postgres`/`erp-redis` (Exited) não tocados; 5432/6379 do host nunca alvo.
- Árvore copiada ao container por `tar -T paths.txt` (3830 arquivos rastreados) → `md5sum -c` dentro: 0 divergência; amostra blob=container: `db-runtime-role.sh` `5cab4f63…`, `runtime-role.ts` `9efee03d…`, `san3-05-runtime-role-guard-db.test.ts` `57ab4744…`.
- `npm ci` próprio no container ec=0 (326 pacotes, 13 s). `prisma generate` ec=0 e `prisma migrate deploy` ec=0 (107 migrations) com `DATABASE_URL` só no ambiente do comando (`docker exec -e DATABASE_URL`, subshell). Catálogo migrado: **115 tabelas · 106 FORCE · 0 views/matviews fora do catálogo do sistema**.
- Desvio de terreno DECLARADO: numa consulta de catálogo (22:10Z) passei `-e PGPASSWORD=<valor>` ao `docker exec` — a senha do cluster DESCARTÁVEL (sem porta no host, rede própria) esteve no argv do `docker.exe` por ~1 s. Sem efeito no mérito (o cluster morre no teardown); daí em diante psql pelo socket local do contêiner pg (sem senha).

**Suítes do bloco, reexecutadas no meu cluster (22:10–22:12Z)** — `docker exec -e DATABASE_URL -w /work port405-node timeout … node --test --import tsx <arquivo>` (logs TAP em `scratchpad/port405/tap-*.log`):

| arquivo | N e forma (TAP) | ec | base do plano C4.5 |
|---|---|--:|---|
| `tests/san3-05-runtime-role-guard-db.test.ts` | `# tests 12 · pass 12 · fail 0 · cancelled 0 · skipped 0 · todo 0` — 1 `test(` pai + 11 subtestes (T5/T6/T9, T7/T8, T8b/T8c, T8c, T8d, T8e, T8f, T14a/b, T14c, T14d, T15), 9,4 s | 0 | 12 |
| `tests/db-catalog-write-guard.test.ts` (guarda de catálogo) | `tests 5 · pass 5 · fail 0 · skipped 0` (ratchet + PA + PC + 2×PD), 1,7 s | 0 | 5 |
| `tests/san3-05-runtime-role-bootstrap.test.ts` | `tests 12 · pass 12 · fail 0 · skipped 0` (T2 ×5, T4 ×7) | 0 | 12 |
| `tests/san3-05-acessos-de-plataforma-guard.test.ts` | `tests 35 · pass 35 · fail 0 · skipped 0` (1 pai T13 + 34 subtestes: inventário == congelado, 31 formas, L0, "sumida") | 0 | 35 |
| `tests/san3-05-leituras-de-plataforma-db.test.ts` | `tests 13 · pass 13 · fail 0 · skipped 0` (1 pai + T10 ×2, T11a–g, T12 ×3) | 0 | 13 |

Resíduo do cluster depois das 5 suítes (22:12:21Z): papéis `s305%` 0 · bancos não-padrão 0 · slots de replicação 0 · views fora do catálogo 0 · papéis não-sistema só `postgres`.

**MODO 6 do script contra o banco migrado** (`scratchpad/port405/modo6.sh`; script do container, md5 = blob; senha do papel só no ambiente, `-e NOME` sem valor):
- A · banco limpo, papel novo `port405_rt` → **ec=0**, linha final `port405_rt|f|f|f|f|0|0|115`; `pg_roles` super/bypass/repl = false, `NOINHERIT`, verificador `SCRAM-SHA-256$`; senha no stdout/stderr = 0.
- B · `CREATE VIEW public.port405_v AS SELECT id FROM public.attachments` (dono `postgres`, `attachments` FORCE=t, **nenhum grant ao papel**), papel NOVO `port405_rt2` → **ec=3**, `ERROR: papel port405_rt2 ainda escapa de RLS por 1 via(s): view:port405_v … (MODO 6)`; `port405_rt2` em `pg_roles` depois = 0 (ROLLBACK).
- C · mesma view, papel JÁ convergido `port405_rt` → **ec=3**, `view:port405_v` (a via é do banco).
- D · matview `port405_mv` de dono comum (`NOLOGIN NOSUPERUSER NOBYPASSRLS`), `WITH NO DATA` → **ec=3**, `view:port405_mv`.
- E · controle: view sobre tabela SEM FORCE (`port405_nf`) → **ec=0**, `…|0|0|116` (`views`=0; dml conta a tabela nova).
- Fixtures removidas: views fora do catálogo 0, tabelas `port405%` 0.

**Trava REAL (`probeRuntimeRolePosture` de `src/database/runtime-role.ts`, via `tsx` + `PrismaPg`) logada como o papel limpo do script** (`scratchpad/port405/trava.sh`):
- sem view → `escapes: []`; com `port405_v` (dono postgres, sem grant) → `[{via:"view", rolname:"postgres", objetos:1}]`; view removida → `[]`; controle `postgres` → 5 escapes (`atributo` ×4, `posse` 106).
- Conclusão: o MODO 6 **recusa** view e matview sobre tabela FORCE sem olhar dono nem grant, **aceita** o papel limpo e o controle sem FORCE; a trava de boot diz o mesmo. A regra do dono vale por execução no `a9fbe283`.

**Check-runs** (`gh api repos/{owner}/{repo}/commits/<sha>/check-runs`):
- head no merge `c16bf9be`: **14** check-runs, todos `completed/success`, app `github-actions` = 2 suítes × 7 jobs (`backend`, `backend-postgres`, `frontend`, `flutter`, `owner-portal`, `authority-portal`, `docker`), uma do evento `push` (run 37992477473) e uma do `pull_request` (run 37992483197). `actions/runs/<id>/attempts/1..4`: tentativas 1, 2, 3 = `completed/failure` (21:16Z, 21:20Z, 21:32Z) e 4 = `completed/success` (21:49Z) nos dois runs. A causa (limite do Docker Hub) **não medi** — só o padrão 3 falhas + 1 sucesso; o que vale para o merge é a tentativa 4, 14/14.
- `a9fbe283` na `main`: **8** check-runs — 7 jobs `completed/success` + `deploy` `completed/skipped` (workflow de deploy, inerte). CI da `main` verde no merge.
- `84831ad9` (aprovado): 7/7 `completed/success` — confere com a ata.
- **Não executei** a suíte inteira (`npm test`, ~40 min) nem `npm run check/build`: a promessa é o produto do bloco, que reexecutei arquivo a arquivo, e a suíte inteira tem 2 runs de CI verdes no head do merge + 1 na `main`. Declarado como não executado por mim.
- Conclusão 3: **números reproduzem** (12 · 5 · 12 · 35 · 13, fail 0, skipped 0) e MODO 6 + trava provados por execução.

## 4. KPI (congelado — D-GOV-PROPORCIONAL (5))
- Regra na ref: `D-GOV-PROPORCIONAL` (5) — `git show a9fbe283:CLAUDE.md` l.268 e l.644: "PR nenhum atualiza `Kpis/*`". O item 4 do corpo do porteiro (`merge_commit`/`approved_head` em KPI) **não se aplica** enquanto vigorar o congelamento; não cobro backfill.
- `git rev-parse a9bbde38:Kpis` = `a9fbe283:Kpis` = `4ec5b46c…` — árvore de `Kpis/` intocada pelo merge; último toque em `Kpis/` é `8ee10bd2` (#406, 2026-10-04). `git diff --name-only a9fbe283^ a9fbe283 -- Kpis` = 0.
- O corpo do PR ainda traz uma seção "KPI" (170 → 171, 3122/3124) — texto do ciclo 1, sem efeito no diff (ver 2c). Nota.
- Conclusão 4: conforme a regra vigente (KPI congelado, nada a cobrar).

## 5. Rito e registro da junta
- **Ata** `git show a9fbe283:agent-orchestration/omega/juntas/J-B-SAN3-05.md` (153 linhas): § "Ciclo 4 — junta 4 (2026-10-09)" l.97; `## VEREDITO: APROVADO (3 × 0, unanimidade)` l.110; tabela C1 `jurado-san305-c4-catalogo-de-views` · C2 `jurado-san305-c4-credencial-arnes-escopo` · C3 `jurado-san305-c4-boot-e-suite`, todas APROVADO, Opus 5.5 declarado; linha **`- **approved_head:** \`84831ad9796d8db29766b0ff6e0a1a894a9d45e7\``** presente. Papéis §C7.4-bis (planejador/dev/fábrica nomeados, nenhum achou nem votou). Quedas: 0. Não-convergência: "não".
- **Votos** (`votos/B-SAN3-05/ciclo4/`, parse JSON): C1 `voto: APROVADO`, objeto `79b0d594…`, 0 achado `bloqueia`; C2 `APROVADO`, objeto `84831ad9…`, 0 `bloqueia`; C3 `APROVADO`, objeto `84831ad9…`, 0 `bloqueia`. Evidências presentes: C1 640 linhas, C2 310, C3 533 (P1). Os três declaram "não li arquivo de outra cadeira antes de gravar".
- Objetos: `git diff --name-only <r> 84831ad9 -- . ':!agent-orchestration' ':!.claude' ':!.agents'` = **0** para `r` ∈ {`737e8cf3` head do dev, `2400049b` objeto do inspetor, `79b0d594` objeto da C1} — os três objetos são o mesmo produto. Check-runs: `2400049b` 7/7 success, `79b0d594` 7/7 success, `84831ad9` 7/7 success (confere "CI 7/7 verde em cada objeto").
- **Inspetor** `ciclo4/00-inspetor-terreno.md` (129 linhas): Opus 5.5 declarado; aberto 19:14Z, fechado 19:28Z; objeto `2400049b`; **LIBERADO COM RESSALVA (R1–R4)**. R2 = "Uma cadeira por vez (C4.6) e o livre medido entre cadeiras" (disco).
- **Desvio declarado:** ata l.~145–149 — "Às 20:41Z a C3 foi disparada com a C2 viva, porque o dono autorizou nessa hora até 2 processos Claude simultâneos"; disco medido antes (14 GB), cluster/rede/worktree próprios por cadeira; a C2 registrou como `C2c4-N5` (nota, "sem efeito nas minhas medições"; lote N=3 dela terminou 20:39:06Z, antes de a C3 subir às 20:41:33Z). Também em `log-execucao.md` l.4855. **Nota:** a autorização do dono só existe como relato do orquestrador (ata + log); `git grep` em `controle/decisoes.md` na ref não acha entrada para ela. Não muda mérito (efeito nulo medido pela C2); fica como dívida de registro (§A5).
- Corpos dos jurados do ciclo 4 versionados nos dois espelhos (`.claude/` e `.agents/`, no squash); `node scripts/sync-agent-agents.mjs --check` no meu worktree → `OK — 45 agentes, espelho consistente`.
- Conclusão 5: rito completo e registrado; desvio declarado com autorização relatada e efeito nulo medido.

## 6. Pendências
**6a. As 4 pendências novas** (`git show a9fbe283:agent-orchestration/controle/pendencias.md`, l.10366–10392):

| ID | sev. | escopo | dono | bloqueia | teste de encerramento | bem formada? |
|---|---|---|---|---|---|---|
| `P-SAN3-05-VIEW-SOBRE-FUNCAO-INVOKER` | BAIXA | dentro-do-bloco (trava de `d76b255f`) | `B-SAN3-10` | não | sim | sim |
| `P-SAN3-05-SUITE-SEM-FORMAS-F1-F3` | BAIXA | dentro-do-bloco (`e0143db1`) | `B-SAN3-05T` (PR só de testes) | não | sim | sim |
| `P-SAN3-05-T15-TETO-DE-RELOGIO` | MÉDIA | dentro-do-bloco (A2-1) | `B-ARNES-2` | não | sim | sim |
| `P-SAN3-05-MENSAGEM-DA-RECUSA` | BAIXA | misto (N3-a dentro; N3-b pré-existente `1a4a3f97`) | **"a nomear pelo orquestrador; candidato o bloco de `P-SAN3-05-POSTURA-NO-HEALTH`"** — e esse, por sua vez, tem dono "observabilidade (orquestrador deve nomear o bloco)" | não | sim | **NÃO — sem bloco dono** |

- Índice: as 4 estão em `pendencias-indice.md` na ref (linhas 10366/10373/10380/10387, coluna dono = "sim" — o gerador só vê o campo, não o valor "a nomear").
- **Índice × gerador:** cópia em `scratchpad/port405/gen/` com o `pendencias.md` e o gerador do blob → `python agent-orchestration/controle/gerar-indice-pendencias.py` ec=0 (`471 cabecalhos / 460 IDs | FECHADA 118, ABERTA 350, SEM-STATUS 3`) → md5 EOL-neutro gerado `500c637f64b4ac0b34b850bc3d009e7d` = versionado `500c637f64b4ac0b34b850bc3d009e7d`; `diff` vazio.
- Nota de casamento tema × dono: `B-SAN3-10` é dono de `-VIEW-SOBRE-FUNCAO-INVOKER`, `-REGRA-EM-TABELA` (ALTA) e `-SECURITY-DEFINER-INVENTARIO` (ALTA), mas no `PLANO_SAN3.md` (ref) o `B-SAN3-10` é `test/e2e-no-ci-e-roteiro` (e2e na CI + roteiro de demo, itens 42/44/54). A atribuição antecede este ciclo; não é defeito do merge, mas três residuais de segurança de banco penduradas num bloco de e2e merecem o olhar do orquestrador.

**6b. Amostragem de pendências antigas do bloco contra o código (3 + 1):**
- **S1 `P-SAN3-05-REGRA-EM-TABELA` (ALTA, ABERTA, "não bloqueia o #405") — reproduzida por execução** (`scratchpad/port405/regra.sh`): `zz405_t` ENABLE+FORCE com política por `app.t`; `zz405_src` com `CREATE RULE … ON INSERT … DO ALSO INSERT INTO zz405_t`; papel limpo `port405_rt` sob `app.t='A'`: INSERT direto de B → `ERROR: new row violates row-level security policy` (controle: RLS morde); INSERT em `zz405_src` de B → `INSERT 0 1` e o admin conta **1 linha B** em `zz405_t`; script com a regra presente → **ec=0**, `…|0|0|117`; trava REAL → **`escapes: []`**. A pendência é verdadeira e continua aberta. Hoje o banco migrado tem **0** regras de usuário (as 2 fora de `_RETURN` são `pg_catalog.pg_settings`: `pg_settings_u`, `pg_settings_n`) — premissa "hoje zero" confirmada. Fixtures removidas (zz405% = 0).
- **S2 `P-SAN3-05-LEITURA-MORTA-PROJECAO-DIARIA` (BAIXA, ABERTA):** `git grep listUsageDailyAggregates -- src` → só a declaração (`cloud-cost-allocation.repository.ts:29`), as 2 implementações (`:133`, `-prisma.repository.ts:237`) e comentários em `.types.ts`; nenhum chamador. Verdadeira, aberta.
- **S3 `P-SAN3-05-LOCAL-AUTH-WORK-SEM-GUC` (MÉDIA, ABERTA):** `src/modules/auth/services/local-auth-login.service.ts:106` → `runWithTenantContext: TenantContextRunner = async (_tenantId, work) => work()` (default sem GUC); a única construção em `src/` (`auth-runtime.ts:35`) roda dentro de `withTenantRls(prisma, input.tenant_id, …)` (l.45/52/59/66). Verdadeira como descrita (fail-open em princípio, produção hoje envolvida).
- **S4 `P-INFRA-RLS` e a pendência das leituras de plataforma (l.~500 e l.7520), passadas a "EM ANDAMENTO (código mergeado; fecha com a trava verde no ambiente — ato do dono §11)":** coerente com o que medi — leituras de plataforma 13/13 sob `NOSUPERUSER NOBYPASSRLS` (T10–T12) e a trava verde no meu cluster; o fechamento real depende do ambiente. Status honesto.
- Conclusão 6: índice = gerador; 3 das 4 novas bem formadas; **`-MENSAGEM-DA-RECUSA` sem bloco dono** (ressalva de registro). Amostra antiga: 4/4 verdadeiras como escritas.

## 7. Limpeza §C5
- `ls -d C:/Users/AMP/w-o05` → inexistente; `git worktree list | grep -c w-o05` → 0.
- Ramo `fix/runtime-role-sem-bypass`: local `git branch --list` → 0; remoto `git ls-remote origin refs/heads/fix/runtime-role-sem-bypass` → 0; ref `origin/…` após `fetch --prune` → 0.
- Containers `j05c4*`/`dev05c4*`/`dv05c4*`/`pl05c4*`/`insp405c4*` → 0; redes desses prefixos → 0.
- Rascunho preservado: `find C:/Users/AMP/erp-pausa-2026-10-03/w-o05-scratchpad-405 -type f | wc -l` → **278** arquivos (confere com o R1 do inspetor: 278).
- Volumes Docker órfãos (`docker volume ls -q -f dangling=true`) → **18** — resíduo alheio, de outras sessões (o inspetor do ciclo 4 já contou 18 no R1, antes das cadeiras). **Reportado, não varrido.**
- Árvore principal: `git status --porcelain | grep -c '^ D'` → 0 (nenhum rastreado apagado). Os `??` são corpos de jurado de outros blocos (ignore global), não deste merge.
- Base viva: `erp-postgres`/`erp-redis` estão `Exited` desde antes desta sessão e não foram alvo de nenhuma cadeira nem meu.
- Disco: 12G livres de 238G (96%) às 22:18Z — acima do piso de 7 GB do mandato e ~no limiar de ~10 GB do corpo: **recomendo `DEEP_CLEAN=1`** antes do próximo bloco pesado (docs/limpeza-de-disco.md).
- Conclusão 7: limpeza pós-merge do bloco feita.

## 8. O que bloqueia o próximo alvo
Próximo alvo: **o PLANO da trilha do Traccar** (sem código de ingestão em produção). Fontes na ref `a9fbe283`: `CLAUDE.md` §C7 item 8(4); `decisoes.md` l.2208 `D-TRACCAR-HTTP-PRIVADO-AWS`, l.2996 `D-ATO2-OPCAO-B`, l.3009 `D-TRACCAR-PLANO-APOS-405`, l.3026 `D-PLANO-DIA-2026-10-09`; `pendencias.md` (grep "traccar" → só l.10263, "não bloqueia o Traccar").

**8a. O que bloqueia o PLANO — nada aberto.**
- `D-TRACCAR-PLANO-APOS-405` ("o plano da trilha do Traccar só começa depois do merge do #405") → **cumprida** (`a9fbe283` na `main`, item 1).
- §C7 item 8(4), "PRs em voo em 2026-10-04" (`gh pr view`): #400 MERGED · #401 MERGED · #405 MERGED · #388 e #389 OPEN draft = **decididos** (`D-388-389-ESTACIONADOS`, "Estacionar os dois") · #393 OPEN draft = congelado pela regra (3). Condição cumprida.
- "registro em dia": falta registrar ESTE porteiro e nomear o dono de `P-SAN3-05-MENSAGEM-DA-RECUSA` — dívida de registro que viaja no próximo PR de registro, não impede o plano.
- "disco limpo": 12 GB livres (22:23Z), acima do gatilho de 10 GB da `D-PLANO-DIA-2026-10-09` ("limpeza profunda abaixo de 10 GB sem volumes alheios"); o `status-geral.md` (l.4991) registra "limpeza profunda antes da trilha do Traccar (ressalvas dos porteiros)". Plano é papel; a ressalva vale antes de qualquer etapa pesada da trilha.
- Nenhuma pendência na ref declara bloquear o plano do Traccar.
- Fora do escopo do gate, para ciência: o #411 (`B-SAN3-06b`, aberto 21:40Z, dev vivo em `w-06b`) corre em paralelo por `D-PLANO-DIA-2026-10-09` ("veredito do B-SAN3-06b na 2ª janela do Codex") — autorizado pelo dono, não por porteiro.

**8b. O que bloqueia a INGESTÃO EM PRODUÇÃO (não o plano).**
- Pré-requisito escrito do §C7 item 8(4): "o `B-SAN3-05` mergeado" → **cumprido**.
- **Mas o merge sozinho não põe o isolamento em produção, e passa a exigir o Ato 2 para qualquer deploy de produção:** com `NODE_ENV=production` a trava é `enforce` por padrão e `skip` é recusado pelo `G-DB-ROLE` (`src/config/env.ts`, diff do item 2); o T15 (verde no meu terreno) prova que o boot real **recusa** um papel superusuário. Logo, o próximo deploy de produção depois de `a9fbe283` só sobe com o `DATABASE_URL` do app apontando a `erp_runtime` — o Ato 2. E o Ato 2 depende de **`P-SAN3-05-ATO2-CINCO-TAREFAS`** (ALTA, ABERTA, "bloqueia: o Ato 2 em produção (não bloqueia o Traccar)", dono "bloco a nomear, depois do merge do #405" — **agora tem de ser nomeado**). Cadeia: ingestão em produção ⇐ deploy de produção ⇐ Ato 2 ⇐ 5 tarefas medidas.
- Também condicionam produção: `P-INFRA-RLS` + leituras de plataforma "EM ANDAMENTO (fecha com a trava verde no ambiente — ato do dono §11)"; `P-SAN3-05-STAGING-CD-AMARRACAO` (ALTA, bloqueia ligar o CD de staging); e as regras próprias do Traccar (junta completa de segurança por bloco de ingestão; implantar o Traccar é serviço/dependência nova → decisão crítica §C7.1; `D-TRACCAR-HTTP-PRIVADO-AWS`).
- Residuais de segurança ALTA que o plano do Traccar deve tratar no threat model (não declaradas como bloqueio): `P-SAN3-05-REGRA-EM-TABELA` — **reproduzida por mim** (item 6, S1: papel limpo gravou linha B sob contexto A por regra `DO ALSO`, trava `[]`, script ec=0; hoje 0 regras de usuário no banco migrado) — e `P-SAN3-05-SECURITY-DEFINER-INVENTARIO` (`auth_login_candidates`). Ambas com dono `B-SAN3-10`, cujo escopo no `PLANO_SAN3` é e2e/roteiro (nota do item 6).

**8c. O que não bloqueia nada.** As 4 pendências novas (`-VIEW-SOBRE-FUNCAO-INVOKER`, `-SUITE-SEM-FORMAS-F1-F3`, `-T15-TETO-DE-RELOGIO`, `-MENSAGEM-DA-RECUSA`), `-LEITURA-MORTA-PROJECAO-DIARIA`, `-LACO-POR-TENANT-DUPLICADO`, `-LOCAL-AUTH-WORK-SEM-GUC`, `-RUNNER-SEM-TIMEOUT`, `-LOG-DO-SERVIDOR-FORA-DA-CI` e as demais `P-SAN3-05-*` com `bloqueia: não`; o corpo desatualizado do PR #405; o registro da autorização de paralelismo só na ata.

**Desvios meus, declarados:** (i) `-e PGPASSWORD=<valor>` uma vez no argv do `docker.exe` (cluster descartável, sem porta no host; item 3); (ii) às 22:19Z um `grep -rn` sem arquivo (erro meu de pipe) varreu em leitura a árvore principal por ~2 min; parei a tarefa (`TaskStop`) e matei o processo residual (PID MSYS 1356, linha de comando conferida como minha); nada foi escrito. Nenhum dos dois toca o mérito.

## Veredito
**Teardown deste porteiro (22:21–22:23Z):** `docker rm -f -v port405-node port405-pg port405-redis` ec=0 ×3; `docker network rm port405-net` ec=0; containers/redes `port405` = 0; volumes anônimos do pg (`5fe53e38…`) e do redis (`86a9dfe1…`) removidos; volumes órfãos seguem **18** (alheios, intocados). Senha do cluster apagada do scratchpad. `git worktree remove --force C:/Users/AMP/w-port405` ec=0 → diretório inexistente, `git worktree list | grep -c port405` = 0, 0 processo com o caminho. `erp-postgres`, `erp-redis`, 5432, 6379 e `C:/Users/AMP/w-06b` nunca tocados. Disco 12 GB livres (igual ao início).

**Resumo dos achados (nenhum grave, nenhum de produto):**
1. Produto mergeado = produto aprovado (patch-id `2bc57e75…` = `2bc57e75…`; 124/135 blobs iguais, os 11 restantes explicados: registro pós-voto e o lado da `main` em `docs/deployment.md`). Árvore do squash = árvore de `c16bf9be`.
2. `D-405-PROIBIR-VIEWS` nas três cópias (md5 sem espaço `6e9fe5df…` ×3, `view_escape` 0) e na doc; provada por execução (MODO 6: view e matview sem grant → ec=3; papel limpo e controle sem FORCE → ec=0; trava REAL idem).
3. Contagens reproduzem: guard-db 12/12, catálogo 5/5, bootstrap 12/12, acessos 35/35, leituras 13/13; 0 fail, 0 skip. CI: `c16bf9be` 14/14 na 4ª tentativa (1–3 falharam), `a9fbe283` 7 success + `deploy` skipped.
4. Rito: ata 3 × 0 com `approved_head`, votos e evidências presentes, inspetor LIBERADO COM RESSALVA, desvio C2∥C3 declarado (autorização do dono só relatada na ata/log, não em `decisoes.md` — nota).
5. Registro: índice = gerador (md5 EOL-neutro `500c637f…`); **`P-SAN3-05-MENSAGEM-DA-RECUSA` sem bloco dono** (ajuste); `P-SAN3-05-ATO2-CINCO-TAREFAS` com dono "a nomear depois do merge do #405" (a hora chegou); corpo do PR #405 desatualizado (KPI/números do ciclo 1 — nota). Amostra de 4 pendências antigas: verdadeiras; `-REGRA-EM-TABELA` reproduzida e aberta.
6. Limpeza §C5 feita; 18 volumes órfãos alheios reportados.

LIBERADO COM RESSALVA: plano da trilha do Traccar (sem código de ingestão em produção) | no próximo PR de registro: registrar este parecer, nomear o bloco dono de `P-SAN3-05-ATO2-CINCO-TAREFAS` e de `P-SAN3-05-MENSAGEM-DA-RECUSA`, e escrever em `decisoes.md` a autorização do dono para C2∥C3; dentro do plano: declarar que ingestão em produção depende do Ato 2 (o boot de produção pós-`a9fbe283` recusa papel que escapa) e, portanto, de `P-SAN3-05-ATO2-CINCO-TAREFAS`, e tratar `P-SAN3-05-REGRA-EM-TABELA` (reproduzida) e `P-SAN3-05-SECURITY-DEFINER-INVENTARIO` no threat model; limpeza profunda (`DEEP_CLEAN=1`) antes de qualquer etapa pesada da trilha
