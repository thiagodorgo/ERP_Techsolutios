papel: cadeira (c′) ciclo 2 | identidade: jurado-trc01c2-c-viatura-no-tempo (instância jurado-trc01c2-c-opus) | executor: Claude Code | modelo: Claude Opus 5.5 (claude-opus-5-5; nível menor, §C7.6; substituição: nenhuma) | mandato_md5: 41ad811105b46808fe2eea92353f5b57 (declarado no disparo: 41ad811105b46808fe2eea92353f5b57) | corpo_md5: 2e42d71774a6c10a80371bb1b1d5117f (.claude, blob do objeto) · 9f863a44faf13ffa56b77eed3921bb68 (.agents, blob do objeto) (recebido no prompt: lido do blob, n/a)

# Evidência — cadeira (c′) viatura no tempo — B-TRC-01 ciclo 2 (PR #426)

## Cabeçalho do terreno (medido 2026-10-18T03:08Z)

- objeto: `2043c5840c8f60fe91538840aaefb3420a11cfe3` — `git ls-remote origin refs/heads/feat/traccar-b-trc-01` = gh `headRefOid` (state OPEN, isDraft false, mergeable UNKNOWN no instante da leitura; o mandato registrou MERGEABLE às 02:43Z).
- h1 (head do ciclo 1) `5abdf83bfcfcac9f70cb1e1aad1c7a7a7cecbf91`: `git merge-base --is-ancestor h1 objeto` ec=0 (ancestral).
- merge-base com origin/main: `c260d36201f6e835799e7f96a14bc9eb8889ca5a`. origin/main no início: `c260d362…` (ref local de w-trc01) → após `git fetch -q origin main` (atualiza só refs remotas do repo comum; nenhuma escrita na árvore de w-trc01): `a26f8afe74b73d9379b4fae5deba312875c2427b`.
- check-runs do objeto (`gh api repos/thiagodorgo/ERP_Techsolutios/commits/<objeto>/check-runs?per_page=100` → `$SCRATCH/checkruns.json`): total 14 | não-verdes 0 | pendentes 0 (backend-postgres ×2 completed success).
- md5 EOL-neutro: corpo `.claude` 2e42d717… = o do disparo; `.agents` 9f863a44… = o publicado pelo inspetor; mandato 41ad8111… = disparo; plano do ciclo 2 `dd6e9074fbc56395e877a396dec16d2a` = disparo.
- `$SCRATCH` = `C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/jtrc01c2-c` (subpasta minha).
- `uname -a`: MINGW64_NT-10.0-22631 x86_64 Msys · `node -v` v20.19.5 · docker server 29.6.1 · `df -h /c`: 16G livres (94%).
- Docker antes de subir (`docker ps -a` → `$SCRATCH/docker-ps-0.txt`): só `erp-postgres`, `erp-redis` (base viva do dono, listada à parte, nunca alvo). Grupos de OUTROS com prefixo `tl*-`/`j*-`/`trc01*`: **0** (o worktree `w-jc2-b` existe, sem container). Regra do disparo: subir só se ≤ 1 → posso subir.
- Portas: `netsh … excludedportrange` não cobre 47663/47673 (faixas 5357, 50000–50059, 52002–52901, 55849–57129, 59805–60004, 62635–62734).

## Legalidade antes do mérito

- Inspetor: `insp-trc01c2-parecer.md` (instância `inspetor-trc01c2-cdx`) → **`## LIBERADO COM RESSALVA`**; nomeia a cadeira (c′) `jurado-trc01c2-c-viatura-no-tempo`, instância `jurado-trc01c2-c-opus`, Claude Code, Claude Opus 5.5, `C:/Users/AMP/w-jc2-c` + `w-jc2-c-h1`, prefixo `jtrc01c2-c-`, portas 47663/47673; corpo C `.claude` 2e42d717… `.agents` 9f863a44… (= os meus); autorização `D-TRC01-VEHICLE-ASSIGNED-AT` opção (i) e migração `20260876000000_…` no objeto; R-DBA no disco; backend-postgres com 6 suítes, skipped 0. Ressalvas: (1) insumos locais (plano md5 dd6e9074… e R-DBA local) — conferidos; (2) as 4 decisões do dono — agora em origin/main a26f8afe (PR #444), a conferir abaixo. Eu não sou o inspetor nem nome inelegível listado no corpo (a conferir no obituário).
- Norma na ref julgada (§A7), `git show <ref>:<arq> | grep -c -F`, objeto × origin/main a26f8afe: decisoes `D-TRACCAR-HTTP-PRIVADO-AWS` 1×1 · `D-TRC-DECISOES-DO-DONO-2026-10-11` 3×3 · "nunca mapa estático" 1×1 · "janela de tempo" 1×1 · `D-TRC01-VEHICLE-ASSIGNED-AT` 1×1 (opção **(i)**, l.3682) · D4 "aparece o técnico que aceitou" em decisoes.md l.3255; CLAUDE.md `C7.1-bis` 2×2, `C7.4-bis` 6×6, `D-GOV-PROPORCIONAL` 3×3, `P7 — Pausa` 1×1, `D-MEDIR-NA-REF-ALVO` 1×1. **`P-TRC-VIATURA-PERIODOS`: 0 em `pendencias.md` nas duas refs**; `git grep` no objeto acha a cadeia só nos corpos das cadeiras (.claude/.agents) → a pendência citada pelo plano/corpo NÃO existe registrada na ref julgada (registro é da (b′); anoto em pendencias_que_aceito). `API_CONTRACTS.md:96` no objeto: "`operator_history_ambiguous` cobre tanto despacho sem data confiável … quanto OS sem …" (presente).
- Obituário (`OBITUARIO-IDENTIDADES.md` do objeto, 301 linhas): 0 linhas com `trc01`/`trc01c2`/`viatura-no-tempo`/`c-opus` → a minha identidade não está SEPULTADA/RESERVADA. Não sou nenhum nome inelegível do corpo.

## Terreno (medido 03:08Z–03:25Z)

- worktrees próprios: `git worktree add --detach C:/Users/AMP/w-jc2-c 2043c584…` e `… C:/Users/AMP/w-jc2-c-h1 5abdf83b…`, ec=0; `.git` presente nos dois; `.env` AUSENTE nos dois; HEAD = objeto / h1. `package-lock.json` sem diff h1→objeto. `npm ci --no-audit --no-fund` próprio em CADA um (ec=0, 326 pacotes), sem junction/symlink; `prisma generate` com URL inerte ec=0 nos dois.
- containers (1 trabalho): `jtrc01c2-c-pg` (postgres:16 → `PostgreSQL 16.14 (Debian 16.14-1.pgdg13+1)`) em `127.0.0.1:47663`, `jtrc01c2-c-redis` (redis:7) em `127.0.0.1:47673` (`docker port` confere loopback). Superusuário do cluster `jadmin`; senha aleatória (`node -e` crypto 18 bytes) em `$SCRATCH/jtrc01c2-c.pw`, passada só por ambiente via wrapper `$SCRATCH/withdb.sh` (md5 f73b17d20680c5e304b2c00f2ac54196): `DATABASE_URL=postgresql://jadmin:***@127.0.0.1:47663/<db>`, `REDIS_URL=redis://127.0.0.1:47673`, `CORE_SAAS_PERSISTENCE=memory`, `LOG_LEVEL=silent` — só como prefixo, nenhum `export`.
- papel do runtime das sondas: `jtrc01c2c_rt` LOGIN NOSUPERUSER NOBYPASSRLS (pg_roles: rolsuper f, rolbypassrls f); DML por `GRANT USAGE ON SCHEMA public` + `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public` + `USAGE, SELECT ON ALL SEQUENCES`, em cada banco depois da migração.
- bancos: `jtrc01c2_c_obj` — `prisma migrate deploy` do objeto ec=0, **111** aplicadas, última `20260876000000_work_orders_vehicle_assigned_at`; gatilho `work_orders_vehicle_assigned_at` habilitado (`tgenabled=O`), `work_orders` relrowsecurity=t relforcerowsecurity=t. `jtrc01c2_c_h1` — migrate deploy do h1 ec=0, **110**, última `20260875000000_validate_location_source_check`. `jtrc01c2_c_old` — etapa 1: migrations do worktree h1 (lista md5 `aca475951ba8b0ef85e63586e8a223a4`, conteúdo dos 110 `migration.sql` EOL-neutro md5 `63f95c0f4dea88007e28df9f0a77db2d`; usei a pasta do meu worktree h1 em vez de cópia — mesmo conteúdo, declarado), 110 aplicadas; semeadura `$SCRATCH/zz-jtrc01c2c-old-seed.sql` (md5 08f3e5fa6fd89662f8acf889bd7c80fd): 2 OS com viatura (JC-OLD-P, JC-OLD-S) + despacho do técnico A `assigned` → `accepted` (operator_assigned_at ≤ accepted_at nas 2), coluna `vehicle_assigned_at` inexistente (0); etapa 2: `migrate deploy` do objeto ec=0, 1 aplicada (`20260876…`) → as 2 OS com viatura e **`vehicle_assigned_at` NULO** (= opção (i) do dono e o texto da migração: `ADD COLUMN` sem DEFAULT nem backfill). Nenhum `session_replication_role`/`DISABLE TRIGGER` nas minhas sondas.

## INTERRUPÇÃO — reinício do PC (registrado 2026-10-18T03:39Z; não foi PAUSA nem defeito)
- Aviso do orquestrador: o PC reiniciou e a execução foi interrompida; Docker religado, base viva de volta. Retomo como a MESMA identidade (`jurado-trc01c2-c-opus`), contexto preservado.
- Estado medido na retomada: evidência com 28 linhas (cabeçalho, legalidade, normas, terreno — nenhum item de mérito fechado; voto EM APURAÇÃO); worktrees `w-jc2-c` HEAD=objeto e `w-jc2-c-h1` HEAD=h1, `status --porcelain` 0 nos dois, `node_modules` próprio presente nos dois; containers `jtrc01c2-c-pg` e `jtrc01c2-c-redis` **Exited (0)** (16 min); de outros, só `erp-postgres`/`erp-redis` (base viva, fora da contagem) → trabalhos de outros = 0. Disco 14G livres.
- Passo em curso no corte: nenhum comando de mérito (o terreno tinha acabado de ser gravado; a próxima ação era escrever a sonda do item 1). Pela ordem do orquestrador, removo os meus containers pelo NOME e subo de novo; os bancos (`_obj`, `_h1`, `_old`) e o papel são refeitos pelos MESMOS comandos registrados acima (re-execução, não herança).

## Item 1 — tabela de cenários (EM APURAÇÃO)

### 1(0) A regra, lida no objeto (A RE-VERIFICAR: o desenho do plano §2.4.3/§2.4.4 contra o código)
- `git diff h1 objeto -- src/modules/field-dispatch src/modules/field-location src/integrations/traccar src/database prisma/schema.prisma`: só `field-dispatch-prisma.repository.ts` (SELECT ganha `wo.vehicle_assigned_at AS "vehicleAssignedAt"` + `AND (wo.vehicle_assigned_at IS NULL OR wo.vehicle_assigned_at <= ${input.at})`), `field-dispatch.repository.ts` (`candidate.vehicleAssignedAt === null ||` no `some` → `history_ambiguous`), `field-dispatch.types.ts` (+`vehicleAssignedAt: Date | null`) e `schema.prisma` (+coluna). `src/integrations/traccar` sem diff.
- migração `20260876…` no blob do objeto = a do plano §2.4.3 (INSERT → now() ou NULL; troca `IS DISTINCT FROM` → now() ou NULL; `OLD … IS NULL AND NEW.vehicle_id IS NOT NULL` → now(); senão `OLD`), `SECURITY INVOKER`, `BEFORE INSERT OR UPDATE … FOR EACH ROW`.
- caminhos do produto que mudam `work_orders.vehicle_id`: `PrismaWorkOrderRepository.assign` (`work-order-prisma.repository.ts:523-559`, `updateManyAndReturn` com `vehicle_id` só se `vehicleId !== undefined`); o serviço (`work-order.service.ts:1682-1729`) chama `assertStatusTransition(current.status, "assigned")` — `work-order.validators.ts:103-105` aceita `from === to` e `open → assigned` (l.22) → assign permitido a partir de `open` e de `assigned`; `vehicleId` vem de `parseOptionalUuid` (nulo vira `undefined`) → **o produto não zera a viatura pelo assign** (C9 forma P = n/a, declarado). Nenhum caminho muda a viatura fora de UPDATE em `work_orders` (a coluna vive lá).

### 1(a) Esperado derivado do CÓDIGO, publicado ANTES de medir (sonda `$SCRATCH/zz-jtrc01c2c-db.mts`, md5 2c30ca24b7e0968ac44b39a4c9e83681)
Mundo por cenário (organização própria, papel `jtrc01c2c_rt`), V1/V2 vinculados (valid_from = now−1h), OS de A com V1, despacho criado e aceito pelo repositório de despacho do objeto sob o papel; troca forma **P** = `RlsPrismaWorkOrderRepository.assign` do worktree; forma **S** = `UPDATE work_orders SET vehicle_id` sob `withTenantRls` pelo papel. Organização **B** semeada (OS + despacho aceito + vínculo) e nunca ingerida: `B(loc,rec)` tem de ficar 0/0 em toda linha.
| cenário | esperado objeto | esperado h1 |
|---|---|---|
| C1 fix V2 em T1<troca, entregue depois | 202/no_operator_at_fix_time, locA 0 | 204 → A |
| C2 fix V2 em T2>troca | 204 → A | 204 → A |
| C3 fix V1 em T2 | 202/no_operator | 202/no_operator |
| C4 fix V1 em T1−1ms | 202/no_operator (perda aceita) | 202/no_operator |
| C5 V1→V2→V1, fix V1 no período de V2 | 202/no_operator (vaa=volta>T → 0 candidato) | 204 → A |
| C6 OS legada (vaa nulo) | 202/operator_history_ambiguous; após 1 UPDATE: fix posterior 204, fix anterior 202/no_operator | (h1 não lê data) |
| C7 forja `vehicle_assigned_at=2000` pelo papel (S: SQL; P: client Prisma `updateMany`) | vaa inalterada; fix V2 de antes da troca segue 202/no_operator; INSERT forjado → now() | n/a |
| C8 mesma viatura (P: assign; S: UPDATE vehicle_id igual + UPDATE title) | vaa inalterada; fix → 204 | 204 |
| C9 vehicle_id=NULL (só S) | vaa NULL; fix V1 → 202/no_operator; volta a V1: fix anterior à volta 202/no_operator, posterior 204 | 202 / 204 / 204 |
| P1 (própria) 2 OS com V1, despachos aceitos de A e B; OS de A troca V1→V2; fix V1 tirado ANTES da troca entregue depois | **propriedade**: 202/ambiguous_operator_at_fix_time (no instante as 2 OS tinham V1 — o mesmo fix entregue antes da troca dá ambiguous). **Código** (predicado lê `wo.vehicle_id` atual): prevejo 204 → B | 204 → B |
| P2 (própria) V1 passa da OS de A (troca V1→V2 em t_s) para a OS de B (V3→V1 em t_s2) | T1<t_s: 202/no_operator (NÃO B); T∈(t_s,t_s2): 202/no_operator; T>t_s2: 204 → B | 204 → B nos três |
| P3 (própria) borda T = vaa (µs × ms) | T = vaa truncado a ms: 202/no_operator se resto µs>0; T = vaa+1ms: 204 | n/a |
Por que as próprias podem quebrar: P1 é "janela com uma ponta só" pelo lado de quem PERDE a viatura com competidor presente (a ponta que falta faria gravar em vez de ir à quarentena); P2 é a viatura que muda de OS (o C4 da plano virar 204 para outro); P3 é a borda do `<=` com relógios de resoluções diferentes.

### 1(b) Medido no OBJETO — `JW=obj withdb.sh obj jtrc01c2_c_obj node --import tsx zz-jtrc01c2c-db.mts` ec=0 (log `$SCRATCH/item1-obj.log`)
```
[controle-2] dispositivo sem vinculo: 202/unmapped_device · quarentena=unmapped_device:1 · recibos da instancia=0 · B(loc=0,rec=0)
| C1 | P | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · loc(op)=0 · rec=0 · B(loc=0,rec=0) · T1-vaa=-50ms T2-vaa=122ms T1-acc=107ms quar(V2)=no_operator_at_fix_time:1 | sim |
| C2 | P | 204 | 204 · loc(op)=1 · rec=1 · B(loc=0,rec=0) | sim |
| C3 | P | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · loc(op)=1 · rec=1 · B(loc=0,rec=0) · quar(V1)=no_operator_at_fix_time:1 | sim |
| C4 | P | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · loc(op)=1 · rec=1 · B(loc=0,rec=0) · quar(V1)=no_operator_at_fix_time:1 | sim |
| C5 | P | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · loc(op)=0 · rec=0 · B(loc=0,rec=0) · T-vaa(volta)=-48ms quar=no_operator_at_fix_time:1 | sim |
| C5-pos | P | 204 | 204 · loc(op)=1 · rec=1 · B(loc=0,rec=0) | sim |
| C8 | P | 204 | 204 · loc(op)=1 · rec=1 · B(loc=0,rec=0) · vaa inalterada=true | sim |
| C1 | S | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · loc(op)=0 · rec=0 · B(loc=0,rec=0) · T1-vaa=-49ms T2-vaa=108ms T1-acc=104ms quar(V2)=no_operator_at_fix_time:1 | sim |
| C2 | S | 204 | 204 · loc(op)=1 · rec=1 · B(loc=0,rec=0) | sim |
| C3 | S | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · loc(op)=1 · rec=1 · B(loc=0,rec=0) · quar(V1)=no_operator_at_fix_time:1 | sim |
| C4 | S | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · loc(op)=1 · rec=1 · B(loc=0,rec=0) · quar(V1)=no_operator_at_fix_time:1 | sim |
| C5 | S | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · loc(op)=0 · rec=0 · B(loc=0,rec=0) · T-vaa(volta)=-48ms quar=no_operator_at_fix_time:1 | sim |
| C5-pos | S | 204 | 204 · loc(op)=1 · rec=1 · B(loc=0,rec=0) | sim |
| C8 | S | 204 | 204 · loc(op)=1 · rec=1 · B(loc=0,rec=0) · vaa inalterada=true | sim |
| C7 | P | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · loc(op)=0 · rec=0 · B(loc=0,rec=0) · forja inalterada=true | sim |
[C7-INSERT P] INSERT forjado -> vaa recente (nao 2000)=true
| C7 | S | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · loc(op)=0 · rec=0 · B(loc=0,rec=0) · forja inalterada=true | sim |
[C7-INSERT S] INSERT forjado -> vaa recente (nao 2000)=true
| C9 | S | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · loc(op)=0 · rec=0 · B(loc=0,rec=0) · vaa nula=true | sim |
| C9-volta-pre | S | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · loc(op)=0 · rec=0 · B(loc=0,rec=0) | sim |
| C9-volta-pos | S | 204 | 204 · loc(op)=1 · rec=1 · B(loc=0,rec=0) | sim |
| P1-antes | P | 202/ambiguous_operator_at_fix_time | 202/ambiguous_operator_at_fix_time · loc(op)=0 · rec=0 · B(loc=0,rec=0) · loc(op)=B | sim |
| P1-atrasado | P | 202/ambiguous_operator_at_fix_time | 204 · loc(op)=1 · rec=1 · B(loc=0,rec=0) · fix tirado ANTES da troca (as 2 OS tinham V1); loc(op)=B; locA=0 | NAO |
| P1-pos | P | 204 | 204 · loc(op)=2 · rec=2 · B(loc=0,rec=0) · loc(op)=B | sim |
| P2-T1(A dirigia V1) | P | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · loc(op)=0 · rec=0 · B(loc=0,rec=0) · loc(op)=B; locA=0 | sim |
| P2-T2(ninguem com V1) | P | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · loc(op)=0 · rec=0 · B(loc=0,rec=0) · loc(op)=B | sim |
| P2-T3(B com V1) | P | 204 | 204 · loc(op)=1 · rec=1 · B(loc=0,rec=0) · loc(op)=B | sim |
| P1-antes | S | 202/ambiguous_operator_at_fix_time | 202/ambiguous_operator_at_fix_time · loc(op)=0 · rec=0 · B(loc=0,rec=0) · loc(op)=B | sim |
| P1-atrasado | S | 202/ambiguous_operator_at_fix_time | 204 · loc(op)=1 · rec=1 · B(loc=0,rec=0) · fix tirado ANTES da troca (as 2 OS tinham V1); loc(op)=B; locA=0 | NAO |
| P1-pos | S | 204 | 204 · loc(op)=2 · rec=2 · B(loc=0,rec=0) · loc(op)=B | sim |
| P2-T1(A dirigia V1) | S | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · loc(op)=0 · rec=0 · B(loc=0,rec=0) · loc(op)=B; locA=0 | sim |
| P2-T2(ninguem com V1) | S | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · loc(op)=0 · rec=0 · B(loc=0,rec=0) · loc(op)=B | sim |
| P2-T3(B com V1) | S | 204 | 204 · loc(op)=1 · rec=1 · B(loc=0,rec=0) · loc(op)=B | sim |
| P3-floor(ms truncado) | S | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · loc(op)=0 · rec=0 · B(loc=0,rec=0) · resto_us=910 | sim |
| P3-ceil(+1ms) | S | 204 | 204 · loc(op)=1 · rec=1 · B(loc=0,rec=0) | sim |
[fim obj] linhas=33 iguais=31 diferentes=2 · B(loc=0,rec=0)
```
Leitura: 31/33 iguais ao esperado; as 2 diferentes são **P1-atrasado** nas DUAS formas (P e S): o fix de V1 tirado em Tb, quando as DUAS OS tinham V1 com despacho aceito de A e de B (o fix Ta do mesmo período, entregue antes da troca, deu `202/ambiguous_operator_at_fix_time`), entregue DEPOIS de a OS de A trocar V1→V2, deu **204 e gravou 1 localização no trajeto de B** (locA=0). [controle-2] acusou: dispositivo sem vínculo → `202/unmapped_device`, quarentena 1, recibos 0. Organização B 0/0 em todas as 33 linhas. Diferenças de tempo (Node−Postgres): C1 T1−vaa = −50/−49 ms, T2−vaa = +122/+108 ms, T1−acc = +107/+104 ms; C5 T−vaa(volta) = −48 ms; P3 resto µs = 910 (borda `<=` coerente: truncado → quarentena, +1 ms → 204).

### 1(b′) Vermelho-controle no h1 — `JW=h1 withdb.sh h1 jtrc01c2_c_h1 node --import tsx zz-jtrc01c2c-db.mts CTL,C1,C5,C8,C9,P1,P2,CTL3` ec=0 (log `$SCRATCH/item1-h1.log`)
```
[controle-2] dispositivo sem vinculo: 202/unmapped_device · quarentena=unmapped_device:1 · recibos da instancia=0 · B(loc=0,rec=0)
| C1 | P | 204 | 204 · loc(op)=1 · rec=1 · B(loc=0,rec=0) · T1-vaa=n/a T2-vaa=n/a T1-acc=107ms quar(V2)=- | sim |
| C2 | P | 204 | 204 · loc(op)=2 · rec=2 · B(loc=0,rec=0) | sim |
| C3 | P | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · loc(op)=2 · rec=2 · B(loc=0,rec=0) · quar(V1)=no_operator_at_fix_time:1 | sim |
| C4 | P | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · loc(op)=2 · rec=2 · B(loc=0,rec=0) · quar(V1)=no_operator_at_fix_time:1 | sim |
| C5 | P | 204 | 204 · loc(op)=1 · rec=1 · B(loc=0,rec=0) · T-vaa(volta)=n/a quar=- | sim |
| C5-pos | P | 204 | 204 · loc(op)=2 · rec=2 · B(loc=0,rec=0) | sim |
| C8 | P | 204 | 204 · loc(op)=1 · rec=1 · B(loc=0,rec=0) · n/a (sem coluna) | sim |
| C1 | S | 204 | 204 · loc(op)=1 · rec=1 · B(loc=0,rec=0) · T1-vaa=n/a T2-vaa=n/a T1-acc=107ms quar(V2)=- | sim |
| C2 | S | 204 | 204 · loc(op)=2 · rec=2 · B(loc=0,rec=0) | sim |
| C3 | S | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · loc(op)=2 · rec=2 · B(loc=0,rec=0) · quar(V1)=no_operator_at_fix_time:1 | sim |
| C4 | S | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · loc(op)=2 · rec=2 · B(loc=0,rec=0) · quar(V1)=no_operator_at_fix_time:1 | sim |
| C5 | S | 204 | 204 · loc(op)=1 · rec=1 · B(loc=0,rec=0) · T-vaa(volta)=n/a quar=- | sim |
| C5-pos | S | 204 | 204 · loc(op)=2 · rec=2 · B(loc=0,rec=0) | sim |
| C8 | S | 204 | 204 · loc(op)=1 · rec=1 · B(loc=0,rec=0) · n/a (sem coluna) | sim |
| C9 | S | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · loc(op)=0 · rec=0 · B(loc=0,rec=0) | sim |
| C9-volta-pre | S | 204 | 204 · loc(op)=1 · rec=1 · B(loc=0,rec=0) | sim |
| C9-volta-pos | S | 204 | 204 · loc(op)=2 · rec=2 · B(loc=0,rec=0) | sim |
| P1-antes | P | 202/ambiguous_operator_at_fix_time | 202/ambiguous_operator_at_fix_time · loc(op)=0 · rec=0 · B(loc=0,rec=0) · loc(op)=B | sim |
| P1-atrasado | P | 202/ambiguous_operator_at_fix_time | 204 · loc(op)=1 · rec=1 · B(loc=0,rec=0) · fix tirado ANTES da troca (as 2 OS tinham V1); loc(op)=B; locA=0 | NAO |
| P1-pos | P | 204 | 204 · loc(op)=2 · rec=2 · B(loc=0,rec=0) · loc(op)=B | sim |
| P2-T1(A dirigia V1) | P | 204 | 204 · loc(op)=1 · rec=1 · B(loc=0,rec=0) · loc(op)=B; locA=0 | sim |
| P2-T2(ninguem com V1) | P | 204 | 204 · loc(op)=2 · rec=2 · B(loc=0,rec=0) · loc(op)=B | sim |
| P2-T3(B com V1) | P | 204 | 204 · loc(op)=3 · rec=3 · B(loc=0,rec=0) · loc(op)=B | sim |
| P1-antes | S | 202/ambiguous_operator_at_fix_time | 202/ambiguous_operator_at_fix_time · loc(op)=0 · rec=0 · B(loc=0,rec=0) · loc(op)=B | sim |
| P1-atrasado | S | 202/ambiguous_operator_at_fix_time | 204 · loc(op)=1 · rec=1 · B(loc=0,rec=0) · fix tirado ANTES da troca (as 2 OS tinham V1); loc(op)=B; locA=0 | NAO |
| P1-pos | S | 204 | 204 · loc(op)=2 · rec=2 · B(loc=0,rec=0) · loc(op)=B | sim |
| P2-T1(A dirigia V1) | S | 204 | 204 · loc(op)=1 · rec=1 · B(loc=0,rec=0) · loc(op)=B; locA=0 | sim |
| P2-T2(ninguem com V1) | S | 204 | 204 · loc(op)=2 · rec=2 · B(loc=0,rec=0) · loc(op)=B | sim |
| P2-T3(B com V1) | S | 204 | 204 · loc(op)=3 · rec=3 · B(loc=0,rec=0) · loc(op)=B | sim |
[controle-3] h1 + coluna SEM gatilho: UPDATE forjado pelo papel FICA (ano=2000)=true
[fim h1] linhas=29 iguais=27 diferentes=2 · B(loc=0,rec=0)
```
Leitura: [controle-1] **C1 no h1 = 204 → A nas duas formas (o achado do ciclo 1 reproduz)**; C5 h1 = 204 → A; P2 h1 = 204 → B nos três instantes (o h1 dava a B fixes de quando A tinha V1 e de quando ninguém tinha) — o objeto corrige C1, C5, P2 (todos quarentena). [controle-2] sem vínculo → unmapped_device (h1 e objeto). [controle-3] h1 + coluna `vehicle_assigned_at` acrescentada por mim SEM gatilho: o UPDATE forjado pelo papel **fica** (ano 2000 = true) → no objeto ele não fica (C7 'forja inalterada=true' nas duas formas) → a sonda mede o gatilho. **P1-atrasado dá 204 → B no h1 E no objeto** (mesmo desfecho: o conserto C não alcança esse caminho). C6 no h1: o h1 não tem a coluna e trata toda OS como datada — o C8/C2 do h1 (204) é o desfecho dele para OS 'sem data'.

### 1(c) C6 — OS legada por migração em DUAS etapas (`jtrc01c2_c_old`: 110 migrações do h1 → semeadura → `migrate deploy` do objeto) — `JW=obj withdb.sh obj jtrc01c2_c_old node --import tsx zz-jtrc01c2c-old.mts` (md5 bf61b0712c0a2dd8ee25a816b2712731) ec=0
```
| C6-P antes do 1o UPDATE (vaa nulo=true) | 202/operator_history_ambiguous | 202/operator_history_ambiguous · locA=0 | sim |
[C6-P] depois do 1o UPDATE (assign mesma viatura): vaa preenchida=true · Tpre-vaa=-48ms · Tpost-vaa=153ms
| C6-P fix POSTERIOR ao UPDATE | 204 | 204 · locA=1 | sim |
| C6-P fix ANTERIOR ao UPDATE | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · locA=1 quar=no_operator_at_fix_time:1,operator_history_ambiguous:1 | sim |
| C6-S antes do 1o UPDATE (vaa nulo=true) | 202/operator_history_ambiguous | 202/operator_history_ambiguous · locA=1 | sim |
[C6-S] depois do 1o UPDATE (UPDATE title): vaa preenchida=true · Tpre-vaa=-49ms · Tpost-vaa=108ms
| C6-S fix POSTERIOR ao UPDATE | 204 | 204 · locA=2 | sim |
| C6-S fix ANTERIOR ao UPDATE | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · locA=2 quar=no_operator_at_fix_time:1,operator_history_ambiguous:1 | sim |
[fim old] iguais=6/6 · B(loc=0,rec=0)
```
Leitura: opção (i) do dono confirmada por execução: vaa NULO pós-migração → `202/operator_history_ambiguous`, 0 localização; 1º UPDATE (P: assign com a mesma viatura; S: UPDATE de outra coluna) → vaa = now(); fix posterior → 204 → A; fix anterior ao UPDATE → `202/no_operator_at_fix_time`. 6/6 iguais. O T-C2 do dev fabrica o mesmo estado de linha (vehicle_id não nulo, vaa NULL) por `SET LOCAL session_replication_role = replica` pelo admin e assere o mesmo desfecho (history_ambiguous, depois stored após assign) → representa o mesmo estado; não testa o 'fix anterior ao UPDATE' (nota, não bloqueia: a minha sonda mede).

### 1(d) ACHADO P1 — a OS que PERDE a viatura some da janela do passado e o ambíguo vira único (por execução, duas formas, objeto e h1)
- Construção: 1 organização; V1 (vinculada) e V2; OS1 com V1 e despacho de A aceito; OS2 com V1 e despacho de B aceito (2 OS com a mesma viatura é estado do produto: o caso 'dois operadores com despacho aceito no fix — ambiguous_operator_at_fix_time' é teste do próprio objeto). Ta, Tb tirados ANTES da troca. fix V1@Ta entregue antes da troca → `202/ambiguous_operator_at_fix_time` (controle: no instante, as 2 OS tinham V1). OS1 troca V1→V2 (P = `RlsPrismaWorkOrderRepository.assign`; S = UPDATE pelo papel). fix V1@Tb (mesmo período de Ta) entregue DEPOIS → **204, 1 localização gravada no trajeto de B** (locA=0), nas formas P e S, no objeto e no h1.
- Causa no código do objeto: `findOperatorsForVehicleAt` (`field-dispatch-prisma.repository.ts:42`, `AND wo.vehicle_id = ${input.vehicleId}`) ainda lê a viatura ATUAL da OS; a coluna nova só dá a ponta INICIAL (`vehicle_assigned_at <= at`). A OS que tinha V1 no instante e deixou de ter não entra como candidata; o classificador vê 1 operador e devolve `single`. É a classe 'o estado de AGORA decidindo o fato de ANTES', forma 1 do corpo ('janela com uma ponta só'), no sentido que o corpo manda caçar: **a ponta que falta GRAVA em vez de ir à quarentena**. Viola a regra do dono (3) 'vínculo ambíguo falha fechado' (D-TRACCAR-HTTP-PRIVADO-AWS / §C7 item 8(4)) e a de 2026-09-08 ('janela de tempo… nunca mapa estático'), medido por execução.
- Escopo: `git blame -L 39,43 <objeto>` → l.39–42 em `d5a4f25b3` (2026-10-11, B-TRC-01), l.43 em `c32bd2cd6` (2026-10-17, ciclo 2); `findOperatorsForVehicleAt` 0 na merge-base c260d362 → **dentro-do-bloco**. Classe: **não grave** (mesma organização; B 0/0 em todas as linhas) — erro de dado e exposição de dado de localização entre técnicos da mesma organização, como o (c)-1. **Repete a classe do (c)-1 COM informação nova**: o caminho é a OS concorrente que PERDE a viatura (o conserto C cobre a OS que a GANHA). Não é a perda aceita C4 (esta vai à quarentena; P1 grava para outro) nem pede histórico como cobrança — nomeio a propriedade ausente, não o conserto.

**Veredito parcial item 1: REPROVADO** — C1–C9 (C9 só S, P n/a declarado) e as próprias P2, P3 iguais ao esperado nas duas formas; os três vermelhos-controle acusaram; **P1-atrasado: o fix de V1 tirado quando as duas OS tinham V1, entregue depois de a OS de A trocar de viatura, grava no trajeto de B pelas formas P e S** (bloqueia, dentro-do-bloco, não grave, ciclo 2).

## Item 2 — T-C1..T-C4, T-B1, T-B2 e as mutações (EM APURAÇÃO → fechado abaixo)

### 2(a) Os testes existem e dizem o que o plano diz (lidos no blob do objeto; `git grep -n` no objeto)
- T-C1 `tests/traccar-position-ingestion-db.test.ts:421` "a viatura da OS é a do instante do fix…": troca por `new h.workOrders.RlsPrismaWorkOrderRepository(h.role.client).assign(...)` (helper `assignVehicle`, l.172–186) = caminho do produto sob o papel efêmero; as 4 entregas do plano: dev2@antes → quarantined/no_operator e locA 0; dev2@depois → stored, locA 1; dev1@depois → quarentena; dev1@antes → quarentena; locA final 1. Confere.
- T-C2 l.450: nulo fabricado por `SET LOCAL session_replication_role = replica` pelo admin; ingest → quarantined/operator_history_ambiguous, 0 loc; assign com a mesma viatura → `vehicle_assigned_at` não nulo (l.474); fix posterior → stored. Confere (não cobre "fix anterior ao UPDATE"; a minha C6 cobre).
- T-C3 l.478: sob o papel efêmero e `withTenantRls`: forja 2000 ignorada (l.500), troca regrava (l.511), repetição preserva, nulo zera. Confere.
- T-C4 `tests/traccar-operator-at-fix-time.test.ts` (4 testes, sem banco): (a) l.21 um datado + um `vehicleAssignedAt: null` → history_ambiguous; (b) none/single/ambiguous; (c) operador nulo; (d) operador posterior ao aceite. Confere.
- T-B1 `tests/traccar-idempotency-db.test.ts:293`: término pelo admin no gancho `afterReceiptInsert`, filtro por `usename` do papel + `idle in transaction` + `query ILIKE '%traccar_ingress_receipts%'`; controle interno "exatamente 1 pid" (dentro do gancho e l.316); 503 `unavailable/database`; counts 0/0/0; eventos inalterados; retry 204 e 1/1. Confere.
- T-B2 `tests/traccar-rls-budget-order.test.ts:8`: sequência exata dos 3 `set_config` + `work`, opções `{maxWait:250, timeout:1750}`, `lockTimeoutMs:0` lança antes da transação, tenant inválido lança antes de qualquer SQL. Confere.

### 2(a′) Execução, 3× os `-db`, contra o MEU cluster (`$SCRATCH/tap.sh`, `--test-reporter=tap`, `jtrc01c2_c_obj`, REDIS_URL próprio)
```
traccar-position-ingestion-db-r1 ec=0 tests=20 pass=20 fail=0 skipped=0
traccar-idempotency-db-r1 ec=0 tests=9 pass=9 fail=0 skipped=0
traccar-position-ingestion-db-r2 ec=0 tests=20 pass=20 fail=0 skipped=0
traccar-idempotency-db-r2 ec=0 tests=9 pass=9 fail=0 skipped=0
traccar-position-ingestion-db-r3 ec=0 tests=20 pass=20 fail=0 skipped=0
traccar-idempotency-db-r3 ec=0 tests=9 pass=9 fail=0 skipped=0
traccar-operator-at-fix-time ec=0 tests=4 pass=4 fail=0 skipped=0
traccar-rls-budget-order ec=0 tests=1 pass=1 fail=0 skipped=0
```
[vermelho-controle 1 — o arnês acusa] sem mutação, os casos indicados estão VERDES (acima), logo cada vermelho abaixo vem da mutação.

### 2(b) Mutações — runner próprio `$SCRATCH/zz-jtrc01c2c-mut.mjs` (md5 f0778bf681af34a0e8788d97f51adddd) sobre cópia do catálogo do dev tirada do blob do objeto (`catalogo-dev.mjs`, md5 44d517e10e1d3391ad34e00f806cbd92, = EOL-neutro) + formas próprias `zz-jtrc01c2c-own.mjs` (md5 02959458cd99c27939fdfb08e4e07b7f: OWN-TC2 = controle do plano de T-C2, sem o ramo `OLD.vehicle_assigned_at IS NULL` do gatilho; OWN-TC4 = controle de T-C4, sem as checagens de `operatorAssignedAt`). Âncora EOL-consciente (worktree CRLF), contagem = 1, `git diff --numstat` não vazio, `hash-object ≠ blob` antes de medir [vermelho-controle 2], `npm run check` (tsc --noEmit) ec=0 nos `.ts`, migração mutada em `jtrc01c2_c_mut` NOVO (`migrate deploy` ec=0, 111) e removido pelo nome; TAP para arquivo; restauro `git checkout --` no MEU worktree, `porcelain` 0 e `hash-object = blob`. Mensagens extraídas por `$SCRATCH/msg.sh`.
| mutação | âncora | numstat | check / migrate | caso vermelho (TAP) | mensagem da asserção | irmãos | restauro |
|---|---|---|---|---|---|---|---|
| M-C1 (sem `vehicle_assigned_at <= at` no predicado) | 1 | 0 1 | tsc 0 | ingestion-db 19/20: **T-C1** (#11) | deepEqual `+ kind:'stored'` `- quarantined/no_operator_at_fix_time` = 1ª asserção | 19 verdes | porcelain 0, hash=blob |
| M-C2 (sem `vehicleAssignedAt === null`) | 1 | 0 1 | tsc 0 | at-fix-time 3/4: **T-C4(a)** (l.22) `+ ambiguous - history_ambiguous`; ingestion-db 19/20: **T-C2** (#12) `+ stored - quarantined/operator_history_ambiguous` | idem | verdes | ok |
| M-C3 (troca não regrava) | 1 | 1 1 | migrate 0 (111) | ingestion-db 18/20: **T-C1** (#11, 1ª asserção `+ stored`) e **T-C3** (#13, l.511 "a troca regrava") | assert.ok l.511 | 18 verdes | ok |
| M-C4 (`COALESCE(NEW…, OLD…)`) | 1 | 1 1 | migrate 0 | ingestion-db 19/20: **T-C3** (#13, l.500 "forjado ignorado") | `+ 946684800000` (2000-01-01) `- <vaa real>` | 19 verdes | ok |
| OWN-TC2 (sem ramo `OLD IS NULL`) | 1 | 0 4 | migrate 0 | ingestion-db 19/20: **T-C2** (#12, l.474) | `'o primeiro UPDATE torna a OS elegível dali em diante'` (2ª metade) | 19 verdes | ok |
| OWN-TC4 (sem checagens de operatorAssignedAt) | 1 | 1 3 | tsc 0 | at-fix-time 2/4: **T-C4(c)** e **(d)** | `+ single/operator-a - history_ambiguous` | (a),(b) verdes | ok |
| M-B1 (= MUT-35, recibo em transação própria) | 1+1 | 3 2 | tsc 0 | idempotency 6/9: **T-B1** (#9) e irmãos #7, #8 | T-B1: `0 !== 1` em l.316 (`terminated`) — o controle interno do teste; #7 l.280 e #8 l.290: `+ receipts: 1 - receipts: 0` | 6 verdes | ok |
| M-B2a (work antes do setter) | 1+1 | 2 1 | tsc 0 | budget-order 0/1: **T-B2** | deepEqual da sequência: `+ sql:'work'` na 1ª posição = asserção (1) | — (arquivo de 1 caso) | ok |
| M-B2b (`true`→`false` no setter) | 1 | 1 1 | tsc 0 | budget-order 0/1: **T-B2** | `+ …current_tenant_id', ?, false)` `- …, true)` = asserção (1) | — | ok |
| MUT-10c (registrada; 23c e OWN-13b presentes no catálogo l.87–89) | 1 | 1 1 | tsc 0 | idempotency 8/9: #5 "duas divergentes concorrentes" l.234 | `+ 204 - 409` | 8 verdes | ok |
Bancos `jtrc01c2_c_mut` removidos (lista final: só `_obj`, `_h1`, `_old`); `git status --porcelain` do meu worktree = 0.

Leitura:
- Todas as mutações do plano ficam vermelhas no caso indicado, por asserção (nenhuma por P2028/503/timeout/import), com a forma do catálogo do dev compilando e mutando a propriedade; M-C1/M-C3 (as do (c)-1) ficam vermelhas na 1ª asserção do T-C1 → o (c)-1 não voltaria sem ninguém ver.
- **Nota (não bloqueia):** sob M-B1, o T-B1 não chega à asserção `receipts` que o plano previu (§2.3.2 "→ `receipts: 1`"): ele cai no controle interno `terminated === 1` (l.316 `0 !== 1`), porque com o recibo comitado à parte não há conexão `idle in transaction` com o INSERT do recibo para terminar. O teste falha fechado (como o plano pede para o caso 0 pid), e a propriedade "recibo e localização atômicos" é pega pelos irmãos #7/#8 do mesmo arquivo pela asserção `receipts: 1`. Classe não grave (vigilância); a cobertura da propriedade existe.

**Veredito parcial item 2: APROVADO** (com a nota sobre o M-B1 × T-B1).

## Item 3 — regressão (EM APURAÇÃO → fechado abaixo)

### 3(a) As 13 + 2 suítes do Traccar — `git ls-tree --name-only <ref> tests/ | grep '^tests/traccar-'`: objeto 15, h1 13; as 2 novas = `traccar-operator-at-fix-time`, `traccar-rls-budget-order` (`comm -13`). Cada arquivo por `$SCRATCH/tap.sh` (TAP para arquivo, DATABASE_URL/REDIS_URL meus; objeto → `jtrc01c2_c_obj`, h1 → `jtrc01c2_c_h1`).
```
reg-obj-traccar-binding-uniqueness-db ec=0 tests=6 pass=6 fail=0 skipped=0
reg-obj-traccar-dev-topology ec=0 tests=12 pass=12 fail=0 skipped=0
reg-obj-traccar-forward-auth ec=0 tests=9 pass=9 fail=0 skipped=0
reg-obj-traccar-idempotency-db ec=0 tests=9 pass=9 fail=0 skipped=0
reg-obj-traccar-ingest-listener ec=0 tests=18 pass=18 fail=0 skipped=0
reg-obj-traccar-ingest-logs ec=0 tests=9 pass=9 fail=0 skipped=0
reg-obj-traccar-ingest-pool-db ec=0 tests=2 pass=2 fail=0 skipped=0
reg-obj-traccar-operator-at-fix-time ec=0 tests=4 pass=4 fail=0 skipped=0
reg-obj-traccar-position-contract ec=0 tests=13 pass=13 fail=0 skipped=0
reg-obj-traccar-position-ingestion-db ec=0 tests=20 pass=20 fail=0 skipped=0
reg-obj-traccar-quarantine-db ec=0 tests=6 pass=6 fail=0 skipped=0
reg-obj-traccar-rate-limit ec=0 tests=6 pass=6 fail=0 skipped=0
reg-obj-traccar-resolution-cost ec=0 tests=9 pass=9 fail=0 skipped=0
reg-obj-traccar-resolution-race-db ec=0 tests=5 pass=5 fail=0 skipped=0
reg-obj-traccar-rls-budget-order ec=0 tests=1 pass=1 fail=0 skipped=0
TOTAL objeto: tests=129 pass=129 fail=0 skipped=0

reg-h1-traccar-binding-uniqueness-db ec=0 tests=6 pass=6 fail=0 skipped=0
reg-h1-traccar-dev-topology ec=0 tests=12 pass=12 fail=0 skipped=0
reg-h1-traccar-forward-auth ec=0 tests=9 pass=9 fail=0 skipped=0
reg-h1-traccar-idempotency-db ec=0 tests=8 pass=8 fail=0 skipped=0
reg-h1-traccar-ingest-listener ec=0 tests=18 pass=18 fail=0 skipped=0
reg-h1-traccar-ingest-logs ec=0 tests=9 pass=9 fail=0 skipped=0
reg-h1-traccar-ingest-pool-db ec=0 tests=2 pass=2 fail=0 skipped=0
reg-h1-traccar-position-contract ec=0 tests=13 pass=13 fail=0 skipped=0
reg-h1-traccar-position-ingestion-db ec=0 tests=17 pass=17 fail=0 skipped=0
reg-h1-traccar-quarantine-db ec=0 tests=6 pass=6 fail=0 skipped=0
reg-h1-traccar-rate-limit ec=0 tests=6 pass=6 fail=0 skipped=0
reg-h1-traccar-resolution-cost ec=0 tests=9 pass=9 fail=0 skipped=0
reg-h1-traccar-resolution-race-db ec=0 tests=5 pass=5 fail=0 skipped=0
TOTAL h1: tests=120 pass=120 fail=0 skipped=0
```
- `traccar-dev-topology` executou de verdade (12/12, `docker compose … config` — resolve, não sobe container). N do objeto **129** (= 120 + 3 em ingestion-db [17→20] + 1 em idempotency [8→9] + 4 + 1 das novas) → ≥ 129 do plano confere; skipped 0 em todos. [A RE-VERIFICAR (9)] a base de 120/120 do ciclo 1 re-medida por mim no h1: **120/120**, 0 pulado.
- títulos de h1 ⊆ objeto e verdes: por arquivo, `comm -23` dos títulos `ok` do h1 contra os `ok` do objeto = **0** nos 13 arquivos.

### 3(b) Despacho e OS sem diff e verdes
- `git diff --name-only h1 objeto -- 'tests/field-dispatch*' 'tests/work-order*'` = **0** arquivos; `field-dispatch.validators.ts`/`field-dispatch.service.ts` sem diff.
- execução: os 34 arquivos `tests/field-dispatch*` + `tests/work-order*` do objeto numa invocação (`tap.sh obj jtrc01c2_c_obj reg-fdwo …`, inclui os 3 `-db` de checklist contra o meu cluster): **tests 366 · pass 366 · fail 0 · skipped 0 · cancelled 0**. Esses testes criam/atualizam OS por INSERT/UPDATE em `work_orders` — caminho em que o gatilho novo age; ele não tem `RAISE` (só atribui `NEW.vehicle_assigned_at`) e nenhum falhou.

### 3(c) 21 transições do despacho com e sem o gatilho novo — `$SCRATCH/zz-jtrc01c2c-trans.sql` (md5 4ad71b9b8bdf65eee0b36722ed6d21ea; derivada da `zz-jtrc01c-trans.sql` do ciclo 1 com ids próprios, + 2ª viatura e **troca da viatura da OS no meio** (d=1, n=5, `UPDATE work_orders SET vehicle_id = V2`), md5 por `to_jsonb(linha) - '<coluna *_assigned_at>'`, tudo em `BEGIN … ROLLBACK` → 0 resíduo). Máquina `FIELD_DISPATCH_STATUS_TRANSITIONS` sem diff h1→objeto; plano da sonda = **21** transições (contadas por grep, 5 despachos).
```
jtrc01c2_c_obj (gatilho novo em work_orders): fd_linhas=5 fd_md5_sem_operator_assigned_at=72d1ebf80d7bcbea4b1a23d152187203 · wo_linhas=1 wo_viatura_trocada=true wo_md5_sem_vehicle_assigned_at=ef9546eb17ae749d01a098f28f8f8808
jtrc01c2_c_h1  (sem a coluna/gatilho):        fd_linhas=5 fd_md5_sem_operator_assigned_at=72d1ebf80d7bcbea4b1a23d152187203 · wo_linhas=1 wo_viatura_trocada=true wo_md5_sem_vehicle_assigned_at=ef9546eb17ae749d01a098f28f8f8808
[controle] objeto + gatilho MEU jtrc01c2c_ctl (observation em on_route; zz-jtrc01c2c-trans-ctl.sql md5 9de1e0c645c3c4df85118d87ca1f60b0): fd_md5 = f93953814d0c18ac912db00f2286b301 (DIVERGE → o comparador acusa); depois: pg_trigger jtrc01c2c_ctl = 0, tenant da sonda = 0
```
- nenhuma transição recusada em um banco e aceita no outro (`RAISE EXCEPTION 'transição recusada'` / `'troca de viatura recusada'` com ON_ERROR_STOP: nenhum disparou nos dois); md5 de `field_dispatches` e de `work_orders` fora das colunas `*_assigned_at` **iguais**.

### 3(d) Os casos de `traccar-position-ingestion-db` do ciclo 1 — corpo byte a byte (EOL-neutro) — `$SCRATCH/zz-jtrc01c2c-corpos.mjs` (md5 245be5f55286f5acb96fc034e956e38b)
- h1: 18 blocos `test(` (17 casos executados + o guarda 'exige DATABASE_URL', que só roda sem banco) → **18 intactos, 0 editados** no objeto. O diff do arquivo h1→objeto (130+/2−) é só harness (import de `workOrders` no bootstrap, l.53/88) e os 3 casos novos. [controle] cópia do objeto com `assert.deepEqual`→`assert.deepStrictEqual` no caso 'dois operadores…' → 'EDITADO: …', 17 intactos — acusa.
- demais suítes do ciclo 1: idempotency 9 blocos intactos (diff 33+/0−: só o T-B1 novo); binding-uniqueness 7, ingest-pool 3, quarantine 7, resolution-race 6 intactos; os 7 arquivos sem bloco indentado (topology, forward-auth, listener, logs, contract, rate-limit, resolution-cost) têm diff **vazio** h1→objeto. Os 17 desfechos (no_operator/ambiguous/history_ambiguous/gravado) do ciclo 1 seguem os mesmos: corpos intactos e verdes no objeto.
- [A RE-VERIFICAR (1)(3)(4)(5)] re-executados como regressão por estas suítes no objeto (verdes, corpos intactos): 'tenantId no envelope dá 422 e zero escrita' (ingestion-db) e o contrato (13/13); chave de outra organização 409/quarentena (idempotency 9/9, quarantine 6/6); 20 entregas concorrentes = 1 episódio (quarantine 6/6); teto da resolução (resolution-cost 9/9, race 5/5). Não medi além disso por sonda própria (o meu item toca como regressão, não reabre).

**Veredito parcial item 3: APROVADO** — 129/129 skipped 0 (15 suítes), h1 120/120, títulos h1 ⊆ objeto, despacho/OS 0 diff e 366/366, 21 transições iguais fora das colunas `*_assigned_at` (com troca de viatura no meio), casos do ciclo 1 intactos; os dois controles acusaram.

## Fim — objeto re-resolvido e teardown (04:05Z–04:15Z)
- objeto no fim: `git ls-remote` = gh `headRefOid` = `2043c5840c8f60fe91538840aaefb3420a11cfe3` (OPEN) → **igual** ao do início; medi esse. origin/main no fim `a26f8afe…` (igual à do início após o fetch).
- teardown: `log_statement` = none (nunca liguei); bancos `jtrc01c2_c_obj/_h1/_old/_mut` dropados pelo nome (`pg_database LIKE 'jtrc01c2%'` = 0); papel `jtrc01c2c_rt` dropado (0); papéis efêmeros dos testes restantes 0; `docker rm -f -v jtrc01c2-c-pg jtrc01c2-c-redis` → `docker ps -a --filter name=jtrc01c2-c- -q | wc -l` = 0; processos com `w-jc2-c` na linha de comando = 0 → `git worktree remove --force` de `C:/Users/AMP/w-jc2-c` e `C:/Users/AMP/w-jc2-c-h1` ec=0, ausentes de `worktree list`; mutações todas restauradas antes (porcelain 0, hash=blob); senha: `grep -c -F` = 0 na evidência, no voto e nos logs, arquivo apagado com a minha subpasta `$SCRATCH` (só ela). Base viva `erp-*`, portas do dono, `w-07cb1`, `w-jc2-b` e containers de outros nunca tocados; nenhum servidor/imagem do Traccar usado. Em `w-trc01` escrevi só `cadeira-c-evidencia.md` e `cadeira-c-voto.json` (o `git fetch origin main` do início atualizou só refs remotas do repositório comum). Não li arquivo das cadeiras (a′)/(b′) deste ciclo. Disco C: 15G livres no fim.
- **Desvio declarado:** apaguei a subpasta `$SCRATCH` antes de colar o texto das sondas. Reconstruí a sonda do item 1 (a que sustenta o achado P1) a partir do texto que eu escrevi, e o md5 bate com o publicado antes de medir (**2c30ca24b7e0968ac44b39a4c9e83681**). Está verbatim abaixo. As outras ferramentas têm só md5 e descrição nesta evidência: `zz-jtrc01c2c-old.mts` bf61b071…, `zz-jtrc01c2c-mut.mjs` f0778bf6…, `zz-jtrc01c2c-own.mjs` 02959458… (as duas âncoras estão citadas no item 2), `zz-jtrc01c2c-corpos.mjs` 245be5f5…, `zz-jtrc01c2c-trans.sql` 4ad71b9b…/`-ctl` 9de1e0c6…, `setup.sh` cf8cd2f3…, `withdb.sh` f73b17d2…, `tap.sh`, `msg.sh`. Um sucessor precisa reescrevê-las pela descrição. O achado se reproduz só com a sonda abaixo.

### Apêndice — `zz-jtrc01c2c-db.mts` (md5 2c30ca24b7e0968ac44b39a4c9e83681), verbatim
````
// Sonda da cadeira (c′) ciclo 2 — item 1 (tabela de cenários, duas formas) e formas próprias, chamando o código do worktree JW.
// admin (jadmin) só semeia/conta; jtrc01c2c_rt (LOGIN NOSUPERUSER NOBYPASSRLS) faz a ingestão e as trocas (forma P = assign
// do repositório do produto; forma S = UPDATE SQL sob withTenantRls). Publica desfechos e contagens; nunca coordenada nem id.
// Uso: JW=obj|h1 node --import tsx zz-jtrc01c2c-db.mts <seções>   (DATABASE_URL/JTRC_PW só por prefixo, via withdb.sh)
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
const MODE = process.env.JW === "h1" ? "h1" : "obj";
const WP = MODE === "h1" ? "C:/Users/AMP/w-jc2-c-h1/" : "C:/Users/AMP/w-jc2-c/";
const W = "file:///" + WP;
const { PrismaPg } = await import(W + "node_modules/@prisma/adapter-pg/dist/index.mjs");
const { PrismaClient } = await import(W + "node_modules/@prisma/client/default.js");
const rls = await import(W + "src/database/rls.ts");
const dispatch = await import(W + "src/modules/field-dispatch/field-dispatch-prisma.repository.ts");
const woRepo = await import(W + "src/modules/work-orders/work-order-prisma.repository.ts");
const service = await import(W + "src/integrations/traccar/traccar-ingestion.service.ts");
const schema = await import(W + "src/integrations/traccar/traccar-position.schema.ts");
const adapter = await import(W + "src/integrations/traccar/traccar-position.adapter.ts");
const app = await import(W + "src/integrations/traccar/traccar-ingest.app.ts");
const URL0 = process.env.DATABASE_URL!;
const asRole = (role: string, appName: string) => { const u = new URL(URL0); u.username = role; u.password = process.env.JTRC_PW!; u.searchParams.set("application_name", appName); return u.toString(); };
const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: URL0 }) });
const rt = new PrismaClient({ adapter: new PrismaPg({ connectionString: asRole("jtrc01c2c_rt", "jtrc01c2c") }) });
const INSTANCE = `jtrc-c2-${randomUUID().slice(0, 8)}`;
const FIX = JSON.parse(readFileSync(WP + "infra/traccar/fixtures/6.16.0/position-osmand.json", "utf8"));
const RELAX = { phaseTwo: { maxWait: 5_000, timeout: 10_000 }, discovery: { maxWait: 5_000, timeout: 10_000 } };
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
const say = (s: string) => console.log(s);
const svc = service.createTraccarIngestionService({ client: rt, timeoutMs: 15_000, resolver: { maxTenants: 500, hintTtlMs: 600_000, negativeTtlMs: 60_000, cacheMax: 10_000 }, budgets: RELAX, publish: (async () => ({ event: {}, published: true })) as never, logger: { info: () => undefined, warn: () => undefined, error: () => undefined } });
const st = (o: any) => `${app.traccarIngestResponse(o).status}${o.reason ? "/" + o.reason : ""}`;
const n = async (sql: string, ...v: unknown[]) => Number(((await admin.$queryRawUnsafe(sql, ...v)) as any[])[0].n);
async function newTenant(tag: string) { const s = `jtrc-c2-${tag}-${randomUUID().slice(0, 6)}`; const r: any = await admin.$queryRawUnsafe(`INSERT INTO tenants (name, slug) VALUES ($1,$1) RETURNING id`, s); return r[0].id as string; }
async function newUser(t: string, l: string) { const r: any = await admin.$queryRawUnsafe(`INSERT INTO users (tenant_id, name, email) VALUES ($1::uuid,$2,$3) RETURNING id`, t, `Tec ${l}`, `jc2-${l}-${randomUUID().slice(0, 6)}@example.com`); return r[0].id as string; }
async function newVehicle(t: string) { const id = randomUUID(); await admin.$executeRawUnsafe(`INSERT INTO vehicles (id, tenant_id, plate, model) VALUES ($1::uuid,$2::uuid,$3,'sint')`, id, t, `JD${id.slice(0, 5).toUpperCase()}`); return id; }
async function newWO(t: string, v: string | null) { const r: any = await admin.$queryRawUnsafe(`INSERT INTO work_orders (tenant_id, code, title, vehicle_id) VALUES ($1::uuid,$2,'OS sint',$3::uuid) RETURNING id`, t, `JD-${randomUUID().slice(0, 8)}`, v); return r[0].id as string; }
const drepo = <T>(t: string, f: (r: any) => Promise<T>) => rls.withTenantRls(rt, t, (tx: any) => f(new dispatch.PrismaFieldDispatchRepository(tx)));
async function accepted(t: string, wo: string, op: string) { const d: any = await drepo(t, (r) => r.create({ tenantId: t, workOrderId: wo, operatorUserId: op, status: "assigned" })); await pause(40); await drepo(t, (r) => r.changeStatus({ tenantId: t, dispatchId: d.id, status: "accepted" })); await pause(40); return d.id as string; }
async function bind(t: string, v: string) { const dev = `jd${randomUUID().slice(0, 8)}`; await admin.$executeRawUnsafe(`INSERT INTO vehicle_tracking_bindings (tenant_id, vehicle_id, instance_key, external_device_key, valid_from) VALUES ($1::uuid,$2::uuid,$3,$4, now() - interval '1 hour')`, t, v, INSTANCE, dev); return dev; }
async function swap(form: string, t: string, wo: string, op: string, v: string | null) {
  if (form === "P") { const r = await new woRepo.RlsPrismaWorkOrderRepository(rt).assign({ tenantId: t, workOrderId: wo, operatorId: op, vehicleId: v ?? undefined, message: "jc2 troca", assignedBy: op }); if (!r) throw new Error("assign devolveu undefined"); }
  else await rls.withTenantRls(rt, t, (tx: any) => tx.$executeRawUnsafe(`UPDATE work_orders SET vehicle_id = $2::uuid WHERE id = $1::uuid`, wo, v));
  await pause(40);
}
function cmd(dev: string, at: Date) { const b = structuredClone(FIX); b.device.uniqueId = dev; b.position.fixTime = at.toISOString(); b.position.deviceTime = at.toISOString(); return adapter.buildTraccarPositionCommand(schema.parseTraccarPositionEnvelope(b), { instanceKey: INSTANCE, receivedAt: new Date() }); }
async function fixNow() { await pause(40); const d = new Date(); await pause(40); return d; }
const locs = (t: string, op?: string) => op ? n(`SELECT count(*) n FROM field_operator_locations WHERE tenant_id=$1::uuid AND operator_user_id=$2::uuid AND source='traccar'`, t, op) : n(`SELECT count(*) n FROM field_operator_locations WHERE tenant_id=$1::uuid AND source='traccar'`, t);
const recs = (t: string) => n(`SELECT count(*) n FROM traccar_ingress_receipts WHERE tenant_id=$1::uuid`, t);
const quarReasons = async (dev: string) => ((await admin.$queryRawUnsafe(`SELECT reason, count(*)::int c FROM traccar_quarantine_items WHERE instance_key=$1 AND external_device_key=$2 GROUP BY reason ORDER BY reason`, INSTANCE, dev)) as any[]).map((r) => `${r.reason}:${r.c}`).join(",") || "-";
const vaa = async (wo: string) => MODE === "h1" ? null : ((await admin.$queryRawUnsafe(`SELECT vehicle_assigned_at v FROM work_orders WHERE id=$1::uuid`, wo)) as any[])[0].v as Date | null;
const acc = async (d: string) => ((await admin.$queryRawUnsafe(`SELECT accepted_at v FROM field_dispatches WHERE id=$1::uuid`, d)) as any[])[0].v as Date;
const ms = (a: Date | null, b: Date | null) => (a && b ? `${a.getTime() - b.getTime()}ms` : "n/a");
const TB = await newTenant("orgB"); { const vB = await newVehicle(TB); const uB = await newUser(TB, "ob"); const woB = await newWO(TB, vB); await bind(TB, vB); await accepted(TB, woB, uB); }
const leakB = async () => `B(loc=${await locs(TB)},rec=${await recs(TB)})`;
const rows: string[] = [];
async function rec(id: string, form: string, esperado: string, o: any, t: string, op: string, extra = "") {
  const medido = st(o); const igual = medido === esperado ? "sim" : "NAO";
  const line = `| ${id} | ${form} | ${esperado} | ${medido} · loc(op)=${await locs(t, op)} · rec=${await recs(t)} · ${await leakB()}${extra ? " · " + extra : ""} | ${igual} |`;
  rows.push(line); say(line);
}
const E = (obj: string, h1: string) => (MODE === "h1" ? h1 : obj);
const NOOP = "202/no_operator_at_fix_time";
const which = new Set((process.argv[2] ?? "CTL,C1,C5,C7,C8,C9,P1,P2,P3").split(","));
try {
  if (which.has("CTL")) {
    const dev = `jdunm${randomUUID().slice(0, 6)}`;
    const o = await svc.ingest(cmd(dev, await fixNow()));
    say(`[controle-2] dispositivo sem vinculo: ${st(o)} · quarentena=${await quarReasons(dev)} · recibos da instancia=${await n(`SELECT count(*) n FROM traccar_ingress_receipts WHERE instance_key=$1`, INSTANCE)} · ${await leakB()}`);
  }
  for (const F of ["P", "S"]) {
    if (which.has("C1")) {
      const t = await newTenant("c1" + F); const v1 = await newVehicle(t); const v2 = await newVehicle(t); const a = await newUser(t, "a"); const wo = await newWO(t, v1);
      const d1 = await bind(t, v1); const d2 = await bind(t, v2); const dp = await accepted(t, wo, a);
      const T1 = await fixNow(); await swap(F, t, wo, a, v2); const T2 = await fixNow();
      const vs = await vaa(wo); const ac = await acc(dp);
      const dif = `T1-vaa=${ms(T1, vs)} T2-vaa=${ms(T2, vs)} T1-acc=${ms(T1, ac)}`;
      await rec("C1", F, E(NOOP, "204"), await svc.ingest(cmd(d2, T1)), t, a, dif + ` quar(V2)=${await quarReasons(d2)}`);
      await rec("C2", F, "204", await svc.ingest(cmd(d2, T2)), t, a);
      await rec("C3", F, NOOP, await svc.ingest(cmd(d1, T2)), t, a, `quar(V1)=${await quarReasons(d1)}`);
      await rec("C4", F, NOOP, await svc.ingest(cmd(d1, new Date(T1.getTime() - 1))), t, a, `quar(V1)=${await quarReasons(d1)}`);
    }
    if (which.has("C5")) {
      const t = await newTenant("c5" + F); const v1 = await newVehicle(t); const v2 = await newVehicle(t); const a = await newUser(t, "a"); const wo = await newWO(t, v1);
      const d1 = await bind(t, v1); await bind(t, v2); await accepted(t, wo, a);
      await swap(F, t, wo, a, v2); const T = await fixNow(); await swap(F, t, wo, a, v1); const Tpost = await fixNow(); const vs = await vaa(wo);
      await rec("C5", F, E(NOOP, "204"), await svc.ingest(cmd(d1, T)), t, a, `T-vaa(volta)=${ms(T, vs)} quar=${await quarReasons(d1)}`);
      await rec("C5-pos", F, "204", await svc.ingest(cmd(d1, Tpost)), t, a);
    }
    if (which.has("C8")) {
      const t = await newTenant("c8" + F); const v1 = await newVehicle(t); const a = await newUser(t, "a"); const wo = await newWO(t, v1);
      const d1 = await bind(t, v1); await accepted(t, wo, a); const v0 = await vaa(wo); await pause(80);
      await swap(F, t, wo, a, v1);
      if (F === "S") await rls.withTenantRls(rt, t, (tx: any) => tx.$executeRawUnsafe(`UPDATE work_orders SET title = 'jc2 outra coluna' WHERE id = $1::uuid`, wo));
      const v1a = await vaa(wo);
      const T = await fixNow();
      await rec("C8", F, "204", await svc.ingest(cmd(d1, T)), t, a, MODE === "h1" ? "n/a (sem coluna)" : `vaa inalterada=${v0 && v1a ? v0.getTime() === v1a.getTime() : "nulo!"}`);
    }
  }
  if (which.has("C7") && MODE === "obj") {
    for (const F of ["P", "S"]) {
      const t = await newTenant("c7" + F); const v1 = await newVehicle(t); const v2 = await newVehicle(t); const a = await newUser(t, "a"); const wo = await newWO(t, v1);
      await bind(t, v1); const d2 = await bind(t, v2); await accepted(t, wo, a);
      const T7 = await fixNow(); await swap("S", t, wo, a, v2); const v0 = await vaa(wo);
      const FORGED = new Date(Date.UTC(2000, 0, 1));
      if (F === "S") await rls.withTenantRls(rt, t, (tx: any) => tx.$executeRawUnsafe(`UPDATE work_orders SET vehicle_assigned_at = $2::timestamptz WHERE id = $1::uuid`, wo, FORGED));
      else await rls.withTenantRls(rt, t, (tx: any) => tx.workOrder.updateMany({ where: { tenant_id: t, id: wo }, data: { vehicle_assigned_at: FORGED } }));
      const v1a = await vaa(wo);
      await rec("C7", F, NOOP, await svc.ingest(cmd(d2, T7)), t, a, `forja inalterada=${v0!.getTime() === v1a!.getTime()}`);
      const woF = randomUUID(); const code = `JDF-${woF.slice(0, 6)}`;
      if (F === "S") await rls.withTenantRls(rt, t, (tx: any) => tx.$executeRawUnsafe(`INSERT INTO work_orders (id, tenant_id, code, title, vehicle_id, vehicle_assigned_at) VALUES ($1::uuid,$2::uuid,$3,'forja',$4::uuid,$5::timestamptz)`, woF, t, code, v1, FORGED));
      else await rls.withTenantRls(rt, t, (tx: any) => tx.workOrder.create({ data: { id: woF, tenant_id: t, code, title: "forja", vehicle_id: v1, vehicle_assigned_at: FORGED } }));
      const vf = await vaa(woF); say(`[C7-INSERT ${F}] INSERT forjado -> vaa recente (nao 2000)=${!!vf && vf.getUTCFullYear() !== 2000 && Date.now() - vf.getTime() < 60_000}`);
    }
  }
  if (which.has("C9")) {
    const t = await newTenant("c9"); const v1 = await newVehicle(t); const a = await newUser(t, "a"); const wo = await newWO(t, v1);
    const d1 = await bind(t, v1); await accepted(t, wo, a);
    await swap("S", t, wo, a, null); const vn = await vaa(wo); const T = await fixNow();
    await rec("C9", "S", NOOP, await svc.ingest(cmd(d1, T)), t, a, MODE === "h1" ? "" : `vaa nula=${vn === null}`);
    await swap("S", t, wo, a, v1); const T2 = await fixNow();
    await rec("C9-volta-pre", "S", E(NOOP, "204"), await svc.ingest(cmd(d1, new Date(T.getTime() + 1))), t, a);
    await rec("C9-volta-pos", "S", "204", await svc.ingest(cmd(d1, T2)), t, a);
  }
  for (const F of ["P", "S"]) {
    if (which.has("P1")) {
      const t = await newTenant("p1" + F); const v1 = await newVehicle(t); const v2 = await newVehicle(t); const a = await newUser(t, "a"); const b = await newUser(t, "b");
      const wo1 = await newWO(t, v1); const wo2 = await newWO(t, v1); const d1 = await bind(t, v1); await accepted(t, wo1, a); await accepted(t, wo2, b);
      const Ta = await fixNow(); const Tb = await fixNow();
      await rec("P1-antes", F, "202/ambiguous_operator_at_fix_time", await svc.ingest(cmd(d1, Ta)), t, b, "loc(op)=B");
      await swap(F, t, wo1, a, v2); const Tc = await fixNow();
      await rec("P1-atrasado", F, "202/ambiguous_operator_at_fix_time", await svc.ingest(cmd(d1, Tb)), t, b, `fix tirado ANTES da troca (as 2 OS tinham V1); loc(op)=B; locA=${await locs(t, a)}`);
      await rec("P1-pos", F, "204", await svc.ingest(cmd(d1, Tc)), t, b, "loc(op)=B");
    }
    if (which.has("P2")) {
      const t = await newTenant("p2" + F); const v1 = await newVehicle(t); const v2 = await newVehicle(t); const v3 = await newVehicle(t); const a = await newUser(t, "a"); const b = await newUser(t, "b");
      const wo1 = await newWO(t, v1); const wo2 = await newWO(t, v3); const d1 = await bind(t, v1); await accepted(t, wo1, a); await accepted(t, wo2, b);
      const T1 = await fixNow(); await swap(F, t, wo1, a, v2); const T2 = await fixNow(); await swap(F, t, wo2, b, v1); const T3 = await fixNow();
      await rec("P2-T1(A dirigia V1)", F, E(NOOP, "204"), await svc.ingest(cmd(d1, T1)), t, b, `loc(op)=B; locA=${await locs(t, a)}`);
      await rec("P2-T2(ninguem com V1)", F, E(NOOP, "204"), await svc.ingest(cmd(d1, T2)), t, b, "loc(op)=B");
      await rec("P2-T3(B com V1)", F, "204", await svc.ingest(cmd(d1, T3)), t, b, "loc(op)=B");
    }
  }
  if (which.has("P3") && MODE === "obj") {
    const t = await newTenant("p3"); const v1 = await newVehicle(t); const v2 = await newVehicle(t); const a = await newUser(t, "a"); const wo = await newWO(t, v1);
    await bind(t, v1); const d2 = await bind(t, v2); await accepted(t, wo, a); await swap("S", t, wo, a, v2);
    const us: any = ((await admin.$queryRawUnsafe(`SELECT (extract(microseconds FROM vehicle_assigned_at)::bigint % 1000)::int r FROM work_orders WHERE id=$1::uuid`, wo)) as any[])[0];
    const v = (await vaa(wo))!;
    await rec("P3-floor(ms truncado)", "S", us.r > 0 ? NOOP : "204", await svc.ingest(cmd(d2, new Date(v.getTime()))), t, a, `resto_us=${us.r}`);
    await rec("P3-ceil(+1ms)", "S", "204", await svc.ingest(cmd(d2, new Date(v.getTime() + 1))), t, a);
  }
  if (which.has("CTL3") && MODE === "h1") {
    await admin.$executeRawUnsafe(`ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS vehicle_assigned_at timestamptz(6)`);
    const t = await newTenant("ctl3"); const v1 = await newVehicle(t); const wo = await newWO(t, v1);
    await rls.withTenantRls(rt, t, (tx: any) => tx.$executeRawUnsafe(`UPDATE work_orders SET vehicle_assigned_at = $2::timestamptz WHERE id = $1::uuid`, wo, new Date(Date.UTC(2000, 0, 1))));
    const r: any = ((await admin.$queryRawUnsafe(`SELECT extract(year FROM vehicle_assigned_at)::int y FROM work_orders WHERE id=$1::uuid`, wo)) as any[])[0];
    say(`[controle-3] h1 + coluna SEM gatilho: UPDATE forjado pelo papel FICA (ano=2000)=${r.y === 2000}`);
  }
} catch (e: any) { say(`ERRO NA SONDA: ${e?.name}: ${String(e?.message ?? e).slice(0, 400)}`); process.exitCode = 1; }
finally {
  const igual = rows.filter((r) => r.endsWith("| sim |")).length; say(`[fim ${MODE}] linhas=${rows.length} iguais=${igual} diferentes=${rows.length - igual} · ${await leakB()}`);
  await rt.$disconnect().catch(() => undefined); await admin.$disconnect().catch(() => undefined);
}
````

## Voto gravado (04:20Z) — `cadeira-c-voto.json`
VOTO: REPROVADO. O achado P1 é `bloqueia`, `dentro-do-bloco`, `não grave`, e repete a classe do (c)-1 com informação nova. Item 1 REPROVADO; itens 2 e 3 APROVADOS. A nota N-MB1 fica para vigilância.
