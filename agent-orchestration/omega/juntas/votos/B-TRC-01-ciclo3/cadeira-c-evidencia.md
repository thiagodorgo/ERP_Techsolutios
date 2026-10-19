papel: cadeira (c″) ciclo 3 | identidade: jurado-trc01c3-c-opus (corpo jurado-trc01c3-c-tabela-de-motivos) | executor: Claude Code, general-purpose limitado por escrito a Read/Grep/Glob/Bash | modelo: Claude Opus 5.5 (claude-opus-5-5; nível menor, §C7.6; substituição: nenhuma) | mandato_md5: f0409b03f6052e0dcee9db4e06d9844f (declarado no disparo: f0409b03f6052e0dcee9db4e06d9844f) | corpo_md5: .claude dca9e2c64ac326b6fafcd6fbb1a2fe2a · .agents b9652c2d69b8908f0b5d2c8b64f11529 (recebido no prompt: dca9e2c64ac326b6fafcd6fbb1a2fe2a, o .claude; o .agents bate com a tabela do inspetor)

# Evidência — cadeira (c″), junta do ciclo 3 do B-TRC-01 (PR #426)

## Cabeçalho do terreno (medido 2026-10-18 19:35Z)
- objeto julgado: `7c220467f754341a699c18c241fa9965c1a35638` (o disparo fixa este objeto).
- `git ls-remote origin refs/heads/feat/traccar-b-trc-01` = `ce20aa3fc5a4f58e1f8e446d6c6ffa265ec91b52`; `gh pr view 426` headRefOid = `ce20aa3f…` (igual), OPEN, isDraft=false, MERGEABLE, base main.
- delta `git diff --name-only 7c220467 ce20aa3f` = só registro: 4 mandatos + 00-quedas + evidência/parecer do inspetor (ciclo 3) + `omega/reprovacoes/R-B-TRC-01-ciclo2.md` (8 arquivos, nenhum em src/tests/prisma/docs). Meço o 7c220467, como o disparo manda.
- h2 `2043c5840c8f60fe91538840aaefb3420a11cfe3`: `git merge-base --is-ancestor h2 7c220467` ec=0 (ancestral, sem rebase).
- merge-base(origin/main, objeto) = `c260d36201f6e835799e7f96a14bc9eb8889ca5a`; origin/main no início = `a26f8afe74b73d9379b4fae5deba312875c2427b`.
- check-runs do objeto (`gh api …/commits/7c220467…/check-runs?per_page=100` → $SCRATCH/checkruns.json): total 14 | não-verdes 0 | pendentes 0.
- $SCRATCH = C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/jc3c (subpasta minha).
- uname: MINGW64_NT-10.0-22631 3.6.6 x86_64 Msys · node v20.19.5 · docker server 29.6.1 · df -h /c: 238G total, 11G livres.
- docker ps antes de subir: `j07cb1c2-c2-pg` (1 trabalho de outros: prefixo j07cb1c2), `erp-postgres`, `erp-redis` (base viva, listada à parte, não conta). Vaga: sim (outros = 1 ≤ 1).
- worktrees `w-jc2-b`/`w-jc2-b3`: `git worktree list | grep w-jc2` = 0 linhas agora (o inspetor os viu registrados às 19:2x; já não estão — reportado, não tocado).
- variáveis que defino: S (scratch), O (objeto), H2, DATABASE_URL/REDIS_URL só como prefixo de comando (valor publicado como ***).

## Legalidade (19:36Z–19:45Z)
- Inspetor: `insp-trc01c3-parecer.md` (instância `inspetor-trc01c3-opus`, Claude Opus 5.5, troca declarada do Codex) → **LIBERADO COM RESSALVA** (R-1…R-10). Confere: o meu nome/corpo (`jurado-trc01c3-c-tabela-de-motivos`, .claude dca9e2c6… / .agents b9652c2d…), worktrees `w-jc3-c` + `w-jc3-c-h2`, prefixo `jtrc01c3-c-`, portas 47763/47773; (i) diff h2→objeto sem `prisma/**` (= 0, item "(i)"); (ii) `w-jc2-b`/`w-jc2-b3` declarados (R-3); (iii) mandatos com A RE-VERIFICAR (2.1 VERDE); check-runs 14/14. Ressalvas lidas: R-8 (só 1 vaga de Docker enquanto `j07cb1c2-*` viver) e R-9 (`db:generate` antes de `check`) se aplicam a mim.
- Inelegibilidade: `OBITUARIO-IDENTIDADES.md` no objeto e na origin/main: `grep -c -i jurado-trc01c3-c` = 0 / 0. A minha identidade de sessão `jurado-trc01c3-c-opus` não coincide com nenhum nome da lista do corpo (não achei, não planejei, não desenvolvi, não inspecionei neste bloco).
- Normas na ref julgada (`git show 7c220467:<f> | grep -c`; e origin/main): CLAUDE.md "A partir do ciclo 3, só bloqueia" 1/1 · decisoes.md `D-TRC01-VEHICLE-ASSIGNED-AT` 1/1 · `D-TRC-DECISOES-DO-DONO-2026-10-11` 3/3 · "atribuído a outro" (registro 2026-09-08) 1/1 · "vínculo ambíguo **falha fechado**" existe em decisoes.md l.2250 (com negrito; `grep 'ambíguo falha fechado'` dá 0 por causa do `**`) e no CLAUDE.md l.739 · API_CONTRACTS.md `operator_history_ambiguous` objeto 1 / origin/main 0 (o texto novo é do ramo; l.96–98 do objeto: "…ou OS com despacho ativo cuja viatura foi (re)atribuída depois do instante do fix (B-TRC-01 ciclo 3)") · PLANO_TRACCAR.md `vehicle_assigned_at >` objeto 4 / origin/main 0 (arquivo do ramo). Régua escrita na ref julgada: sim.
- **A RE-VERIFICAR** (atas do ciclo 1 l.22, do ciclo 2 l.40–48 e plano l.416–417): tudo o que meu item toca — 129/129 (item 3), C1–C9 fora o P1, legada (i), forja ignorada (item 1), M-C1..M-C4 (item 2) — é re-medido abaixo como regressão; o resto não é julgado nem declarado verdadeiro por mim.

## Código lido (objeto) e esperado DERIVADO, publicado antes de medir
- `git diff 2043c584 7c220467 -- src` = 3 arquivos de `src/modules/field-dispatch/`: SQL `(wo.vehicle_id = V OR wo.vehicle_assigned_at > at)` + coluna `(wo.vehicle_assigned_at > at) AS "vehicleAssignedAfterFix"` (era `wo.vehicle_id = V AND (vaa IS NULL OR vaa <= at)`); classificador ganha `candidate.vehicleAssignedAfterFix === true ||` antes das regras de ciclo 1/2; tipo ganha o campo. Janela do despacho inalterada: `accepted_at IS NOT NULL AND accepted_at <= at AND (LEAST(completed,cancelled,failed) IS NULL OR at < LEAST(...))`.
- Gatilho `20260876`: INSERT → `now()` (NULL se sem viatura); UPDATE com `vehicle_id IS DISTINCT FROM` → `now()` (NULL se → NULL); legada (vaa nulo) + viatura → `now()` no 1º UPDATE; resto mantém OLD (forja ignorada).
- Mapa de motivos (`traccar-ingestion.service.ts:98-102`): none→`no_operator_at_fix_time`, ambiguous→`ambiguous_operator_at_fix_time`, history_ambiguous→`operator_history_ambiguous`; quarentena = 202, gravado = 204.
- Escritores de `work_orders.vehicle_id` no produto (`git grep` em src de `workOrder.(update|create|…)` e SQL `UPDATE/INSERT/DELETE work_orders`): 2 — `create` (`work-order-prisma.repository.ts:139`, `vehicleId ?? null`) e `assign` (l.534, só se `vehicleId !== undefined`; o serviço l.1689 usa `parseOptionalUuid`, que devolve `undefined` para null/""). FK de viatura `onDelete: Restrict` (schema l.2481): não há SET NULL por cascata. Nenhum caminho do produto zera a viatura → N3 só por SQL (a medir no item 1(c)).
- Despacho: `changeStatus` grava `accepted_at = now()` sempre que o status pedido é `accepted` (repo l.123), e `assertStatusTransition` aceita `from === to` (validators l.45) e `reassigned → accepted` (l.14): o `accepted_at` de um despacho pode ANDAR para depois de T pelo produto. Isto é o "lado 3" que vou atacar na forma própria F1.

| linha | esperado OBJETO (meu, do código) | esperado h2 (meu) | §3.4 objeto / h2 | diverge do §3.4? |
|---|---|---|---|---|
| C1 (fix V2, T<t_s) | 202/operator_history_ambiguous (vehicle_id=V2 e flag) | 202/no_operator (vaa>T exclui) | igual | não |
| C2 (fix V2, T>t_s) | 204→A | 204→A | igual | não |
| C3 (fix V1, T>t_s) | 202/no_operator (vehicle_id≠V1, vaa≤T) | 202/no_operator | igual | não |
| C4 (fix V1, T<t_s) | 202/operator_history_ambiguous (perna vaa>T) | 202/no_operator | igual | não |
| C5 (V1→V2→V1; T∈(t_s,t_volta) / depois) | 202/op_hist_amb / 204→A | 202/no_operator / 204 | igual | não |
| C6 (legada / pós-UPDATE: posterior / anterior) | 202/op_hist_amb / 204 / 202/op_hist_amb | 202/op_hist_amb / 204 / 202/no_operator | igual | não |
| C7 (forja; fix V2 antes; INSERT forjado) | ignorada / 202/op_hist_amb / now() | ignorada / 202/no_operator / now() | igual | não |
| C8 (mesma viatura) | vaa inalterada; 204 | idem | igual | não |
| C9 (→NULL só S: fix V1 / volta: anterior / posterior) | 202/no_operator / 202/op_hist_amb / 204 | 202/no_operator / 202/no_operator / 204 | igual | não |
| P1 (antes / atrasado / depois) | 202/ambiguous_operator / 202/op_hist_amb, locA 0 locB 0 / 204→B | 202/ambiguous_operator / **204→B** / 204→B | igual | não |
| P2 (T1 / T2 / T3) | 202/op_hist_amb / 202/op_hist_amb / 204→B | 202/no_operator / 202/no_operator / 204→B | igual | não |
| P3 (truncado / +1ms) | 202/op_hist_amb se resto µs>0 (204 se resto=0) / 204 | 202/no_operator (resto>0) / 204 | igual | não |
| N1 (fix V1 em T / T2) | 202/op_hist_amb / 204→A | 204→A / 204→A | igual | não |
| N2 | 202/op_hist_amb | 204→A | igual | não |
| N3 (→NULL por SQL) | 204→B (OS1: vehicle_id NULL e vaa NULL — fora) | 204→B | igual | não |
| F1 (forma própria, lado 3: OS1(A)+OS2(B) com V1 aceitas; fix Tb; DEPOIS de Tb o despacho de A é re-aceito — `accepted→accepted` ou `reassign`+`accepted` — pelo repositório do produto) | **204→B** (o `accepted_at` do despacho de A passa a > Tb e a linha sai pela janela; nenhum sinal) | 204→B | (não listada) | — |
| F2 (forma própria, lado 3: duas trocas V1→V2→V3 em OS1 depois de Tb, competidor B com V1) | 202/op_hist_amb | 204→B | — | — |
| F3 (forma própria, lado 3: OS1 perde V1 depois de Tb E o despacho de A é concluído depois de Tb) | 202/op_hist_amb (despacho ativo em Tb; perna vaa>Tb) | 204→B | — | — |
Divergência do meu esperado com a tabela §3.4: **nenhuma**. Contagem prevista h2→objeto de `204→quarentena`: P1-atrasado, N1(T), N2 = **3** (o cabeçalho do §3.4 diz "exatamente uma").

## Terreno subido (19:50Z)
- docker ps antes de subir: outros = 1 grupo (`j07cb1c2-c2-pg`), `erp-*` à parte → vaga. Portas 47763/47773: fora de `excludedportrange` e sem listener (netstat 0). `docker run -d --name jtrc01c3-c-pg -e POSTGRES_PASSWORD -p 127.0.0.1:47763:5432 postgres:16` e `jtrc01c3-c-redis -p 127.0.0.1:47773:6379 redis:7`; `docker port` → 127.0.0.1:47763 / 127.0.0.1:47773. `SELECT version()` = PostgreSQL 16.14.
- Worktree `C:/Users/AMP/w-jc3-c` detached em 7c220467 (`.git` existe, `.env` ausente), `npm ci` próprio ec=0, `prisma generate` (URL inerte) ec=0; disco 9,8G livres depois. **Um worktree só** (desvio declarado do padrão de dois): o lockfile não muda h2→objeto (`git diff --name-only 2043c584 7c220467 -- package-lock.json` = 0) e o src muda só em 3 arquivos de `src/modules/field-dispatch/`; o código de h2 é o src de h2 desses 3 arquivos gravado por cima (`git show 2043c584:<f>`), restaurado e provado (hash = blob). Poupa ~1 GB num disco a 96%.
- Bancos `jtrc01c3_c_obj` e `jtrc01c3_c_h2`: `withdb.sh <db> npx prisma migrate deploy` ec=0 nos dois, 112 migrações (as mesmas: `git diff --name-only 2043c584 7c220467 -- prisma` = 0). Papel `jtrc01c3c_rt` LOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT (`rolsuper=f, rolbypassrls=f`), DML por `GRANT USAGE ON SCHEMA public; GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES; GRANT USAGE,SELECT ON ALL SEQUENCES` (a mesma forma de `createEphemeralRole`); 108 tabelas com FORCE RLS. Senha aleatória (`node -e randomBytes`) em `$SCRATCH/jtrc01c3-c.pw`, só por ambiente (`withdb.sh`, md5 b8162975…): DATABASE_URL=postgresql://postgres:***@127.0.0.1:47763/<db>, REDIS_URL=redis://127.0.0.1:47773/0.

## Item 1 — tabela §3.4 por execução (EM APURAÇÃO)
Sonda `$SCRATCH/zz-jtrc01c3c-db.mts` md5 **824fcde1415b2022a25acc7639375648** (derivada de `zz-jtrc01c2c-db.mts` md5 2c30ca24… da (c′): mesmas funções de semeadura/troca/contagem; diffs: worktree único w-jc3-c, papel jtrc01c3c_rt, MODE obj|h2 em vez de obj|h1, contagem por DELTA de localização por técnico e de recibo, contagem do item de quarentena do motivo devolvido, B(loc,rec,quar) com o dispositivo de B, e as linhas novas N1, N2, N3, N3-P, F1, F2, F3). Ingestão = `createTraccarIngestionService` do objeto com `client` = papel sem bypass; P = `RlsPrismaWorkOrderRepository.assign`; S = `UPDATE work_orders SET vehicle_id` pelo papel sob `withTenantRls`; despacho por `PrismaFieldDispatchRepository` (create/changeStatus/reassign) sob `withTenantRls` do papel.

### 1(a) objeto — `cd w-jc3-c; JW=obj withdb.sh jtrc01c3_c_obj timeout 600 node --import tsx zz-jtrc01c3c-db.mts` → ec=0 (log `$SCRATCH/item1-obj.log`), verbatim:
```
[controle-2] dispositivo sem vinculo: 202/unmapped_device · quar(unmapped_device)=1 · recibos da instancia=0 · B(loc=0,rec=0,quar=0)
| C1 | P | 202/operator_history_ambiguous | 202/operator_history_ambiguous · dlocA=0 · drec=0 quar(operator_history_ambiguous)=1 · B(loc=0,rec=0,quar=0) · T1-vaa=-48ms T2-vaa=136ms T1-acc=102ms | sim |
| C2 | P | 204 | 204 · dlocA=1 · drec=1 · B(loc=0,rec=0,quar=0) | sim |
| C3 | P | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · dlocA=0 · drec=0 quar(no_operator_at_fix_time)=1 · B(loc=0,rec=0,quar=0) | sim |
| C4 | P | 202/operator_history_ambiguous | 202/operator_history_ambiguous · dlocA=0 · drec=0 quar(operator_history_ambiguous)=1 · B(loc=0,rec=0,quar=0) | sim |
| C5 | P | 202/operator_history_ambiguous | 202/operator_history_ambiguous · dlocA=0 · drec=0 quar(operator_history_ambiguous)=1 · B(loc=0,rec=0,quar=0) · T-vaa(volta)=-49ms | sim |
| C5-pos | P | 204 | 204 · dlocA=1 · drec=1 · B(loc=0,rec=0,quar=0) | sim |
| C8 | P | 204 | 204 · dlocA=1 · drec=1 · B(loc=0,rec=0,quar=0) · vaa inalterada=true | sim |
| C7 | P | 202/operator_history_ambiguous | 202/operator_history_ambiguous · dlocA=0 · drec=0 quar(operator_history_ambiguous)=1 · B(loc=0,rec=0,quar=0) · forja ignorada=true | sim |
[C7-INSERT P] INSERT forjado -> vaa = now() (nao 2000)=true
| C1 | S | 202/operator_history_ambiguous | 202/operator_history_ambiguous · dlocA=0 · drec=0 quar(operator_history_ambiguous)=1 · B(loc=0,rec=0,quar=0) · T1-vaa=-51ms T2-vaa=108ms T1-acc=260ms | sim |
| C2 | S | 204 | 204 · dlocA=1 · drec=1 · B(loc=0,rec=0,quar=0) | sim |
| C3 | S | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · dlocA=0 · drec=0 quar(no_operator_at_fix_time)=1 · B(loc=0,rec=0,quar=0) | sim |
| C4 | S | 202/operator_history_ambiguous | 202/operator_history_ambiguous · dlocA=0 · drec=0 quar(operator_history_ambiguous)=1 · B(loc=0,rec=0,quar=0) | sim |
| C5 | S | 202/operator_history_ambiguous | 202/operator_history_ambiguous · dlocA=0 · drec=0 quar(operator_history_ambiguous)=1 · B(loc=0,rec=0,quar=0) · T-vaa(volta)=-52ms | sim |
| C5-pos | S | 204 | 204 · dlocA=1 · drec=1 · B(loc=0,rec=0,quar=0) | sim |
| C8 | S | 204 | 204 · dlocA=1 · drec=1 · B(loc=0,rec=0,quar=0) · vaa inalterada=true | sim |
| C7 | S | 202/operator_history_ambiguous | 202/operator_history_ambiguous · dlocA=0 · drec=0 quar(operator_history_ambiguous)=1 · B(loc=0,rec=0,quar=0) · forja ignorada=true | sim |
[C7-INSERT S] INSERT forjado -> vaa = now() (nao 2000)=true
| C9 | S | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · dlocA=0 · drec=0 quar(no_operator_at_fix_time)=1 · B(loc=0,rec=0,quar=0) · vaa nula=true | sim |
| C9-volta-ant | S | 202/operator_history_ambiguous | 202/operator_history_ambiguous · dlocA=0 · drec=0 quar(operator_history_ambiguous)=1 · B(loc=0,rec=0,quar=0) | sim |
| C9-volta-pos | S | 204 | 204 · dlocA=1 · drec=1 · B(loc=0,rec=0,quar=0) | sim |
| P1-antes | P | 202/ambiguous_operator_at_fix_time | 202/ambiguous_operator_at_fix_time · dlocA=0 dlocB=0 · drec=0 quar(ambiguous_operator_at_fix_time)=1 · B(loc=0,rec=0,quar=0) | sim |
| P1-atrasado | P | 202/operator_history_ambiguous | 202/operator_history_ambiguous · dlocA=0 dlocB=0 · drec=0 quar(operator_history_ambiguous)=1 · B(loc=0,rec=0,quar=0) · Tb-vaa(OS1)=-206ms | sim |
| P1-pos | P | 204 | 204 · dlocA=0 dlocB=1 · drec=1 · B(loc=0,rec=0,quar=0) | sim |
| P2-T1 | P | 202/operator_history_ambiguous | 202/operator_history_ambiguous · dlocA=0 dlocB=0 · drec=0 quar(operator_history_ambiguous)=1 · B(loc=0,rec=0,quar=0) | sim |
| P2-T2 | P | 202/operator_history_ambiguous | 202/operator_history_ambiguous · dlocA=0 dlocB=0 · drec=0 quar(operator_history_ambiguous)=1 · B(loc=0,rec=0,quar=0) | sim |
| P2-T3 | P | 204 | 204 · dlocA=0 dlocB=1 · drec=1 · B(loc=0,rec=0,quar=0) | sim |
| N1-T | P | 202/operator_history_ambiguous | 202/operator_history_ambiguous · dlocA=0 dlocB=0 · drec=0 quar(operator_history_ambiguous)=1 · B(loc=0,rec=0,quar=0) | sim |
| N1-T2 | P | 204 | 204 · dlocA=1 dlocB=0 · drec=1 · B(loc=0,rec=0,quar=0) | sim |
| N2 | P | 202/operator_history_ambiguous | 202/operator_history_ambiguous · dlocA=0 · drec=0 quar(operator_history_ambiguous)=1 · B(loc=0,rec=0,quar=0) | sim |
| F2-duas-trocas | P | 202/operator_history_ambiguous | 202/operator_history_ambiguous · dlocA=0 dlocB=0 · drec=0 quar(operator_history_ambiguous)=1 · B(loc=0,rec=0,quar=0) | sim |
| F3-troca+concluido | P | 202/operator_history_ambiguous | 202/operator_history_ambiguous · dlocA=0 dlocB=0 · drec=0 quar(operator_history_ambiguous)=1 · B(loc=0,rec=0,quar=0) | sim |
| P1-antes | S | 202/ambiguous_operator_at_fix_time | 202/ambiguous_operator_at_fix_time · dlocA=0 dlocB=0 · drec=0 quar(ambiguous_operator_at_fix_time)=1 · B(loc=0,rec=0,quar=0) | sim |
| P1-atrasado | S | 202/operator_history_ambiguous | 202/operator_history_ambiguous · dlocA=0 dlocB=0 · drec=0 quar(operator_history_ambiguous)=1 · B(loc=0,rec=0,quar=0) · Tb-vaa(OS1)=-210ms | sim |
| P1-pos | S | 204 | 204 · dlocA=0 dlocB=1 · drec=1 · B(loc=0,rec=0,quar=0) | sim |
| P2-T1 | S | 202/operator_history_ambiguous | 202/operator_history_ambiguous · dlocA=0 dlocB=0 · drec=0 quar(operator_history_ambiguous)=1 · B(loc=0,rec=0,quar=0) | sim |
| P2-T2 | S | 202/operator_history_ambiguous | 202/operator_history_ambiguous · dlocA=0 dlocB=0 · drec=0 quar(operator_history_ambiguous)=1 · B(loc=0,rec=0,quar=0) | sim |
| P2-T3 | S | 204 | 204 · dlocA=0 dlocB=1 · drec=1 · B(loc=0,rec=0,quar=0) | sim |
| N1-T | S | 202/operator_history_ambiguous | 202/operator_history_ambiguous · dlocA=0 dlocB=0 · drec=0 quar(operator_history_ambiguous)=1 · B(loc=0,rec=0,quar=0) | sim |
| N1-T2 | S | 204 | 204 · dlocA=1 dlocB=0 · drec=1 · B(loc=0,rec=0,quar=0) | sim |
| N2 | S | 202/operator_history_ambiguous | 202/operator_history_ambiguous · dlocA=0 · drec=0 quar(operator_history_ambiguous)=1 · B(loc=0,rec=0,quar=0) | sim |
| F2-duas-trocas | S | 202/operator_history_ambiguous | 202/operator_history_ambiguous · dlocA=0 dlocB=0 · drec=0 quar(operator_history_ambiguous)=1 · B(loc=0,rec=0,quar=0) | sim |
| F3-troca+concluido | S | 202/operator_history_ambiguous | 202/operator_history_ambiguous · dlocA=0 dlocB=0 · drec=0 quar(operator_history_ambiguous)=1 · B(loc=0,rec=0,quar=0) | sim |
| F1-reaceite-antes | P | 202/ambiguous_operator_at_fix_time | 202/ambiguous_operator_at_fix_time · dlocA=0 dlocB=0 dlocC=0 · drec=0 quar(ambiguous_operator_at_fix_time)=1 · B(loc=0,rec=0,quar=0) | sim |
| F1-reaceite-atrasado | P | 204 | 204 · dlocA=0 dlocB=1 dlocC=0 · drec=1 · B(loc=0,rec=0,quar=0) · Tb-acc(despacho de OS1)=-195ms | sim |
| F1-reassign+aceite-antes | P | 202/ambiguous_operator_at_fix_time | 202/ambiguous_operator_at_fix_time · dlocA=0 dlocB=0 dlocC=0 · drec=0 quar(ambiguous_operator_at_fix_time)=1 · B(loc=0,rec=0,quar=0) | sim |
| F1-reassign+aceite-atrasado | P | 204 | 204 · dlocA=0 dlocB=1 dlocC=0 · drec=1 · B(loc=0,rec=0,quar=0) · Tb-acc(despacho de OS1)=-299ms | sim |
| N3 | S | 204 | 204 · dlocA=0 dlocB=1 · drec=1 · B(loc=0,rec=0,quar=0) · vaa(OS1) nula=true | sim |
| N3-P(assign sem viatura) | P | 202/ambiguous_operator_at_fix_time | 202/ambiguous_operator_at_fix_time · dlocA=0 dlocB=0 · drec=0 quar(ambiguous_operator_at_fix_time)=1 · B(loc=0,rec=0,quar=0) · vehicle_id(OS1) mantido=true | sim |
| P3-truncado | S | 202/operator_history_ambiguous | 202/operator_history_ambiguous · dlocA=0 · drec=0 quar(operator_history_ambiguous)=1 · B(loc=0,rec=0,quar=0) · resto_us=731 | sim |
| P3-+1ms | S | 204 | 204 · dlocA=1 · drec=1 · B(loc=0,rec=0,quar=0) | sim |
[fim obj] linhas=49 iguais=49 diferentes=0 · B(loc=0,rec=0,quar=0)
```
Leitura: **49/49 linhas iguais ao meu esperado publicado** (e ao §3.4 nas linhas que ele lista). P1-atrasado nas duas formas = 202/operator_history_ambiguous, ΔlocA 0, ΔlocB 0 (Tb 206/210 ms antes do vaa da OS1). P3: resto 731 µs, truncado → operator_history_ambiguous, +1 ms → 204. B(loc,rec,quar)=0 em todas. Controle (2) acusou: dispositivo sem vínculo → 202/unmapped_device, 1 item, 0 recibo. Controle (3) acusou: N3 pela forma S → 204 → B (ΔlocB=1) no objeto — a sonda enxerga a forma do P1 quando ela acontece; e a forma P do N3 (assign sem viatura) não zera (vehicle_id mantido=true → ambiguous). **F1 (forma própria, lado 3) = 204 → B nas duas variantes** (re-aceite `accepted→accepted` e `reassign`→C + `accepted`): o despacho de A tinha aceito antes de Tb, as duas OS tinham V1 em Tb (o mesmo fix em Ta dá ambiguous), e depois o `accepted_at` do despacho de A andou para 195/299 ms depois de Tb → a OS1 sai pela janela do despacho e o fix vai a B. F2 (duas trocas) e F3 (troca + despacho concluído) → quarentena, como derivado.

### 1(b) vermelho-controle em h2 — src dos 3 arquivos de `src/modules/field-dispatch/` de 2043c584 gravados por cima no meu worktree (`git show 2043c584:<f> > <f>`; hash-object = blob de h2 nos 3: d76251ff…, 9b902773…, 1028de64…; `git diff --numstat -- src` = 3/7, 1/3, 1/6), banco `jtrc01c3_c_h2`: `JW=h2 withdb.sh jtrc01c3_c_h2 timeout 600 node --import tsx zz-jtrc01c3c-db.mts` → ec=0, verbatim:
```
[controle-2] dispositivo sem vinculo: 202/unmapped_device · quar(unmapped_device)=1 · recibos da instancia=0 · B(loc=0,rec=0,quar=0)
| C1 | P | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · dlocA=0 · drec=0 quar(no_operator_at_fix_time)=1 · B(loc=0,rec=0,quar=0) · T1-vaa=-50ms T2-vaa=136ms T1-acc=101ms | sim |
| C2 | P | 204 | 204 · dlocA=1 · drec=1 · B(loc=0,rec=0,quar=0) | sim |
| C3 | P | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · dlocA=0 · drec=0 quar(no_operator_at_fix_time)=1 · B(loc=0,rec=0,quar=0) | sim |
| C4 | P | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · dlocA=0 · drec=0 quar(no_operator_at_fix_time)=1 · B(loc=0,rec=0,quar=0) | sim |
| C5 | P | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · dlocA=0 · drec=0 quar(no_operator_at_fix_time)=1 · B(loc=0,rec=0,quar=0) · T-vaa(volta)=-50ms | sim |
| C5-pos | P | 204 | 204 · dlocA=1 · drec=1 · B(loc=0,rec=0,quar=0) | sim |
| C8 | P | 204 | 204 · dlocA=1 · drec=1 · B(loc=0,rec=0,quar=0) · vaa inalterada=true | sim |
| C7 | P | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · dlocA=0 · drec=0 quar(no_operator_at_fix_time)=1 · B(loc=0,rec=0,quar=0) · forja ignorada=true | sim |
[C7-INSERT P] INSERT forjado -> vaa = now() (nao 2000)=true
| C1 | S | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · dlocA=0 · drec=0 quar(no_operator_at_fix_time)=1 · B(loc=0,rec=0,quar=0) · T1-vaa=-50ms T2-vaa=108ms T1-acc=105ms | sim |
| C2 | S | 204 | 204 · dlocA=1 · drec=1 · B(loc=0,rec=0,quar=0) | sim |
| C3 | S | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · dlocA=0 · drec=0 quar(no_operator_at_fix_time)=1 · B(loc=0,rec=0,quar=0) | sim |
| C4 | S | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · dlocA=0 · drec=0 quar(no_operator_at_fix_time)=1 · B(loc=0,rec=0,quar=0) | sim |
| C5 | S | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · dlocA=0 · drec=0 quar(no_operator_at_fix_time)=1 · B(loc=0,rec=0,quar=0) · T-vaa(volta)=-54ms | sim |
| C5-pos | S | 204 | 204 · dlocA=1 · drec=1 · B(loc=0,rec=0,quar=0) | sim |
| C8 | S | 204 | 204 · dlocA=1 · drec=1 · B(loc=0,rec=0,quar=0) · vaa inalterada=true | sim |
| C7 | S | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · dlocA=0 · drec=0 quar(no_operator_at_fix_time)=1 · B(loc=0,rec=0,quar=0) · forja ignorada=true | sim |
[C7-INSERT S] INSERT forjado -> vaa = now() (nao 2000)=true
| C9 | S | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · dlocA=0 · drec=0 quar(no_operator_at_fix_time)=1 · B(loc=0,rec=0,quar=0) · vaa nula=true | sim |
| C9-volta-ant | S | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · dlocA=0 · drec=0 quar(no_operator_at_fix_time)=1 · B(loc=0,rec=0,quar=0) | sim |
| C9-volta-pos | S | 204 | 204 · dlocA=1 · drec=1 · B(loc=0,rec=0,quar=0) | sim |
| P1-antes | P | 202/ambiguous_operator_at_fix_time | 202/ambiguous_operator_at_fix_time · dlocA=0 dlocB=0 · drec=0 quar(ambiguous_operator_at_fix_time)=1 · B(loc=0,rec=0,quar=0) | sim |
| P1-atrasado | P | 204 | 204 · dlocA=0 dlocB=1 · drec=1 · B(loc=0,rec=0,quar=0) · Tb-vaa(OS1)=-141ms | sim |
| P1-pos | P | 204 | 204 · dlocA=0 dlocB=1 · drec=1 · B(loc=0,rec=0,quar=0) | sim |
| P2-T1 | P | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · dlocA=0 dlocB=0 · drec=0 quar(no_operator_at_fix_time)=1 · B(loc=0,rec=0,quar=0) | sim |
| P2-T2 | P | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · dlocA=0 dlocB=0 · drec=0 quar(no_operator_at_fix_time)=1 · B(loc=0,rec=0,quar=0) | sim |
| P2-T3 | P | 204 | 204 · dlocA=0 dlocB=1 · drec=1 · B(loc=0,rec=0,quar=0) | sim |
| N1-T | P | 204 | 204 · dlocA=1 dlocB=0 · drec=1 · B(loc=0,rec=0,quar=0) | sim |
| N1-T2 | P | 204 | 204 · dlocA=1 dlocB=0 · drec=1 · B(loc=0,rec=0,quar=0) | sim |
| N2 | P | 204 | 204 · dlocA=1 · drec=1 · B(loc=0,rec=0,quar=0) | sim |
| F2-duas-trocas | P | 204 | 204 · dlocA=0 dlocB=1 · drec=1 · B(loc=0,rec=0,quar=0) | sim |
| F3-troca+concluido | P | 204 | 204 · dlocA=0 dlocB=1 · drec=1 · B(loc=0,rec=0,quar=0) | sim |
| P1-antes | S | 202/ambiguous_operator_at_fix_time | 202/ambiguous_operator_at_fix_time · dlocA=0 dlocB=0 · drec=0 quar(ambiguous_operator_at_fix_time)=1 · B(loc=0,rec=0,quar=0) | sim |
| P1-atrasado | S | 204 | 204 · dlocA=0 dlocB=1 · drec=1 · B(loc=0,rec=0,quar=0) · Tb-vaa(OS1)=-226ms | sim |
| P1-pos | S | 204 | 204 · dlocA=0 dlocB=1 · drec=1 · B(loc=0,rec=0,quar=0) | sim |
| P2-T1 | S | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · dlocA=0 dlocB=0 · drec=0 quar(no_operator_at_fix_time)=1 · B(loc=0,rec=0,quar=0) | sim |
| P2-T2 | S | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · dlocA=0 dlocB=0 · drec=0 quar(no_operator_at_fix_time)=1 · B(loc=0,rec=0,quar=0) | sim |
| P2-T3 | S | 204 | 204 · dlocA=0 dlocB=1 · drec=1 · B(loc=0,rec=0,quar=0) | sim |
| N1-T | S | 204 | 204 · dlocA=1 dlocB=0 · drec=1 · B(loc=0,rec=0,quar=0) | sim |
| N1-T2 | S | 204 | 204 · dlocA=1 dlocB=0 · drec=1 · B(loc=0,rec=0,quar=0) | sim |
| N2 | S | 204 | 204 · dlocA=1 · drec=1 · B(loc=0,rec=0,quar=0) | sim |
| F2-duas-trocas | S | 204 | 204 · dlocA=0 dlocB=1 · drec=1 · B(loc=0,rec=0,quar=0) | sim |
| F3-troca+concluido | S | 204 | 204 · dlocA=0 dlocB=1 · drec=1 · B(loc=0,rec=0,quar=0) | sim |
| F1-reaceite-antes | P | 202/ambiguous_operator_at_fix_time | 202/ambiguous_operator_at_fix_time · dlocA=0 dlocB=0 dlocC=0 · drec=0 quar(ambiguous_operator_at_fix_time)=1 · B(loc=0,rec=0,quar=0) | sim |
| F1-reaceite-atrasado | P | 204 | 204 · dlocA=0 dlocB=1 dlocC=0 · drec=1 · B(loc=0,rec=0,quar=0) · Tb-acc(despacho de OS1)=-244ms | sim |
| F1-reassign+aceite-antes | P | 202/ambiguous_operator_at_fix_time | 202/ambiguous_operator_at_fix_time · dlocA=0 dlocB=0 dlocC=0 · drec=0 quar(ambiguous_operator_at_fix_time)=1 · B(loc=0,rec=0,quar=0) | sim |
| F1-reassign+aceite-atrasado | P | 204 | 204 · dlocA=0 dlocB=1 dlocC=0 · drec=1 · B(loc=0,rec=0,quar=0) · Tb-acc(despacho de OS1)=-268ms | sim |
| N3 | S | 204 | 204 · dlocA=0 dlocB=1 · drec=1 · B(loc=0,rec=0,quar=0) · vaa(OS1) nula=true | sim |
| N3-P(assign sem viatura) | P | 202/ambiguous_operator_at_fix_time | 202/ambiguous_operator_at_fix_time · dlocA=0 dlocB=0 · drec=0 quar(ambiguous_operator_at_fix_time)=1 · B(loc=0,rec=0,quar=0) · vehicle_id(OS1) mantido=true | sim |
| P3-truncado | S | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · dlocA=0 · drec=0 quar(no_operator_at_fix_time)=1 · B(loc=0,rec=0,quar=0) · resto_us=281 | sim |
| P3-+1ms | S | 204 | 204 · dlocA=1 · drec=1 · B(loc=0,rec=0,quar=0) | sim |
[fim h2] linhas=49 iguais=49 diferentes=0 · B(loc=0,rec=0,quar=0)
```
Leitura: 49/49 iguais ao meu esperado de h2. **Controle (1) acusou: P1-atrasado em h2 = 204 → B nas duas formas (ΔlocB=1, ΔlocA=0)** — o achado da (c′) reproduz; e C1 = 202/no_operator_at_fix_time em h2. P3 em h2 (resto 281 µs): truncado → no_operator, +1 ms → 204.

### 1(a)/(b) C6 (OS legada) — migração em DUAS ETAPAS, sem desligar gatilho nem `session_replication_role`
Sonda `$SCRATCH/zz-jtrc01c3c-old.mts` md5 **51bb356bfca1b50c8af52f4f4a6e17bc** (reescrita pela descrição de `zz-jtrc01c2c-old.mts`, cujo texto a (c′) perdeu). Banco `jtrc01c3_c_old`: `docker cp prisma/migrations` para `/tmp/jc3c-mig` do MEU container; `psql -f` de cada `migration.sql` em ordem, pulando `20260876*` → aplicadas=110 (111 diretórios − 1); `vehicle_assigned_at` existe = 0, `operator_assigned_at` = 1; GRANT ao papel como acima. Etapa 1 (`seed`, ec=0): 6 conjuntos (obj-P, obj-S, h2-P, h2-S, obj-F4, h2-F4) com OS + despacho aceito pelo repositório do produto. Etapa 2: `psql -f 20260876…/migration.sql` ec=0 → `vehicle_assigned_at` nulo em 8/8 OS. `run` objeto (ec=0) e `run` h2 com os 3 src de h2 por cima (ec=0; restaurado: porcelain 0, hash=blob nos 3):
```
-- objeto
| C6-legada (P) | 202/operator_history_ambiguous | 202/operator_history_ambiguous · dloc=0 · vaa nula=true | sim |
| C6-pos-1oUPDATE posterior (P) | 204 | 204 · dloc=1 · vaa preenchida=true | sim |
| C6-pos-1oUPDATE anterior (P) | 202/operator_history_ambiguous | 202/operator_history_ambiguous · dloc=0 · T0-vaa=-3875ms | sim |
| C6-legada (S) | 202/operator_history_ambiguous | 202/operator_history_ambiguous · dloc=0 · vaa nula=true | sim |
| C6-pos-1oUPDATE posterior (S) | 204 | 204 · dloc=1 · vaa preenchida=true | sim |
| C6-pos-1oUPDATE anterior (S) | 202/operator_history_ambiguous | 202/operator_history_ambiguous · dloc=0 · T0-vaa=-3855ms | sim |
| F4 legada(A,W)+legada(B,V1): fix V1 em T0 | 202/operator_history_ambiguous | 202/operator_history_ambiguous · dloc=0 | sim |
[fim old obj] linhas=7 iguais=7
-- h2
| C6-legada (P) | 202/operator_history_ambiguous | 202/operator_history_ambiguous · dloc=0 · vaa nula=true | sim |
| C6-pos-1oUPDATE posterior (P) | 204 | 204 · dloc=1 · vaa preenchida=true | sim |
| C6-pos-1oUPDATE anterior (P) | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · dloc=0 · T0-vaa=-14301ms | sim |
| C6-legada (S) | 202/operator_history_ambiguous | 202/operator_history_ambiguous · dloc=0 · vaa nula=true | sim |
| C6-pos-1oUPDATE posterior (S) | 204 | 204 · dloc=1 · vaa preenchida=true | sim |
| C6-pos-1oUPDATE anterior (S) | 202/no_operator_at_fix_time | 202/no_operator_at_fix_time · dloc=0 · T0-vaa=-14335ms | sim |
| F4 legada(A,W)+legada(B,V1): fix V1 em T0 | 202/operator_history_ambiguous | 202/operator_history_ambiguous · dloc=0 | sim |
[fim old h2] linhas=7 iguais=7
```
1º UPDATE: P = `assign` com a MESMA viatura (OLD vaa nulo → now()); S = `UPDATE title` pelo papel. F4 (forma própria, OS legada com OUTRA viatura W): a perna nova não inclui a legada com W (`NULL > T` é nulo), mas o competidor com V1 também é legado → `operator_history_ambiguous`; e uma legada com W sem nenhum UPDATE depois da migração teve W desde a migração (qualquer troca carimbaria `vaa`), logo, para T posterior à migração, a exclusão é correta; não há caminho para 204 ao competidor por aqui.

### 1(c) formas próprias — raciocínio declarado antes (seção "esperado DERIVADO") e medida
- **F1 (lado 3 — o sinal que o tempo apaga, pelo eixo do DESPACHO):** a janela do despacho exige `accepted_at <= T`, e `accepted_at` é REESCRITO a cada `changeStatus(accepted)` (repo l.123). Pelo produto, `assertStatusTransition` (medido por `node --import tsx -e` no objeto): `accepted→accepted` **permitido**, `reassigned→accepted` **permitido**, `accepted→reassigned` permitido, `completed→accepted` recusado; rotas `PATCH /operations/dispatches/:id/status` e `/reassign` (`field-dispatch.routes.ts:70,78`). Esperado derivado: OS1 (A, V1) e OS2 (B, V1), fix em Tb; depois de Tb o despacho de A é re-aceito (ou reatribuído a C e aceito) → `accepted_at` > Tb → a OS1 sai do conjunto → 204 → B. **Medido no objeto e em h2: 204 → B nas duas variantes** (ΔlocB=1, ΔlocA=0, ΔlocC=0; o mesmo fix em Ta, antes do re-aceite, dá `ambiguous_operator_at_fix_time` — as duas OS tinham V1 e despacho aceito no instante). B(loc,rec,quar)=0. Origem: a janela `d.accepted_at <= ${input.at}` nasceu em `d5a4f25b` (B-TRC-01, ciclo 1; `git log -S`; ausente da merge-base c260d362, onde `findOperatorsForVehicleAt` = 0) — dentro do bloco, inalterada pelo ciclo 3.
- **F2 (duas trocas V1→V2→V3 na OS1 depois de Tb, competidor B com V1):** objeto `operator_history_ambiguous` (P e S), h2 204 → B. Fechado pelo conserto.
- **F3 (OS1 perde V1 depois de Tb E o despacho de A vai a `completed` depois de Tb):** objeto `operator_history_ambiguous` (P e S), h2 204 → B. Fechado.
- **F4:** acima (legada com outra viatura) — sem caminho.
- **Escritores de `work_orders.vehicle_id` no produto: 2** (`create`, `assign`); nenhum zera (`parseOptionalUuid` → undefined; medido: `N3-P` assign sem viatura mantém vehicle_id=true → ambiguous); FK `onDelete: Restrict`. **N3 não é alcançável pelo produto** pelo eixo da viatura.
- **P3 (borda µs):** a flag nasce no SQL da mesma expressão; o classificador não compara datas da viatura no Node (só lê `vehicleAssignedAfterFix === true` e `vehicleAssignedAt === null`); medido resto 731 µs → quarentena; +1 ms → 204. Sem divergência banco×Node.

### Item 1 — tabela consolidada e mudanças h2 → objeto (P e S deram o mesmo desfecho em toda linha que tem as duas)
| linha | objeto | h2 | mudança |
|---|---|---|---|
| C1 | op_hist_amb | no_operator | motivo→motivo |
| C2 | 204→A | 204→A | igual |
| C3 | no_operator | no_operator | igual |
| C4 | op_hist_amb | no_operator | motivo→motivo |
| C5 (meio / depois) | op_hist_amb / 204 | no_operator / 204 | motivo→motivo / igual |
| C6 (legada / posterior / anterior) | op_hist_amb / 204 / op_hist_amb | op_hist_amb / 204 / no_operator | igual / igual / motivo→motivo |
| C7 (forja; fix V2 antes; INSERT) | ignorada; op_hist_amb; now() | ignorada; no_operator; now() | motivo→motivo |
| C8 | vaa inalterada; 204 | idem | igual |
| C9 (só S) | no_operator / op_hist_amb / 204 | no_operator / no_operator / 204 | igual / motivo→motivo / igual |
| P1 (antes / atrasado / depois) | ambiguous / **op_hist_amb, locA 0, locB 0** / 204→B | ambiguous / **204→B** / 204→B | igual / **204→quarentena** / igual |
| P2 (T1 / T2 / T3) | op_hist_amb / op_hist_amb / 204→B | no_operator / no_operator / 204→B | motivo→motivo ×2 / igual |
| P3 (truncado / +1ms) | op_hist_amb (731 µs) / 204 | no_operator (281 µs) / 204 | motivo→motivo / igual |
| N1 (T / T2) | op_hist_amb / 204→A | 204→A / 204→A | **204→quarentena** / igual |
| N2 | op_hist_amb | 204→A | **204→quarentena** |
| N3 (só S) | 204→B | 204→B | igual (resíduo declarado; controle 3) |
| F1 (re-aceite / reassign+aceite; só P) | **204→B / 204→B** | 204→B / 204→B | igual — NÃO fechado |
| F2 / F3 | op_hist_amb | 204→B | 204→quarentena |

Contagem nas linhas do §3.4: 204→quarentena = **3** (P1-atrasado, N1-T, N2); quarentena→204 = **0**; motivo→motivo = 9 (C1, C4, C5-meio, C6-anterior, C7, C9-volta-ant, P2-T1, P2-T2, P3-truncado); o resto igual. O cabeçalho do §3.4 ("exatamente uma (P1) passa de 204 para quarentena") é **falso pela própria tabela**: N1 e N2 também passam — `nota` de registro contra o plano, não achado de produto (custo declarado em §3.8-(b)/(c)). Toda quarentena com motivo da lista fechada do CHECK. B(loc,rec,quar)=0 em todas as linhas, nas duas refs.

Vermelho-controle do item 1: (1) P1 em h2 = 204 → B (acusou); (2) dispositivo sem vínculo → unmapped_device, 0 recibo (acusou); (3) N3 forma S no objeto = 204 → B (acusou: a sonda enxerga a forma do P1 quando ela acontece — a mesma sonda que viu F1).

**Veredito parcial item 1:** o P1 está **fechado** no objeto nas duas formas; a tabela §3.4 dá 100% do esperado (49+7 linhas por ref); nenhum 204 para outro técnico fora do resíduo declarado N3 (por SQL, inalcançável pelo produto) **e da forma própria F1**. **Achado F1** — bloqueia · dentro-do-bloco · **não grave** (re-medido pela tabela do §1.3: mesma organização; nada perdido — recibo e localização gravados; B intocada; nenhuma permissão; nenhum dinheiro): *"com as duas OS tendo V1 e despacho aceito em Tb, o fix de Tb entregue depois de o despacho de A ser re-aceito (`accepted→accepted`) ou reatribuído e aceito grava no trajeto de B, no objeto e em h2"*. Repete a classe do (c)-1/(c′)-P1 **com informação nova**: um terceiro lado — o eixo do DESPACHO (`accepted_at` reescrito pelo produto), não o da viatura; o conserto do ciclo 3 só lê `vehicle_assigned_at`. Não reprova no ciclo 3 (§C7 item 8(2)); vira pendência (dono proposto: B-TRC-03, com o histórico por períodos — sem entrada própria no §4 do plano).

## Item 2 — testes e mutações do conserto (20:3xZ–20:5xZ)

### 2(a) os testes existem e dizem o que o título promete (blob do objeto, lido em `w-jc3-c`)
- T-C1 `tests/traccar-position-ingestion-db.test.ts:421` "…fix atrasado da viatura nova vai à quarentena (histórico ambíguo)": 6 asserções **com mensagem própria** (a1 C1 → `operator_history_ambiguous`; a2 locA 0; a3 C2 stored; a4 locA 1; a5 C3 → `no_operator_at_fix_time`; a6 C4 → `operator_history_ambiguous`). (O plano fala em "asserções 1 e 4"; no objeto são a1 e a6 — mesma propriedade, numeração diferente: nota.)
- T-P1 l.537: a1 controle `ambiguous_operator_at_fix_time`; troca por `assignVehicle` = `RlsPrismaWorkOrderRepository.assign` do produto (helper l.170–186); a2 `operator_history_ambiguous`; a3 locB 0; a4 locA 0; a5 stored; a6 locB 1; a7 locA 0. Confere com o título e com o §3.5.
- T-P2 l.573 (N1): a1 `operator_history_ambiguous`; a2 0 localização; a3 stored; a4 locA 1; a5 locB 0.
- T-C4(e) `tests/traccar-operator-at-fix-time.test.ts:57`: os 3 subcasos (datado+flag → history_ambiguous; só flag → history_ambiguous; vaa nulo+flag nula → history_ambiguous), com mensagem própria; `candidate()` com `vehicleAssignedAfterFix: false` (l.17).
- 3 execuções no objeto (`withdb.sh jtrc01c3_c_obj node --test --import tsx --test-reporter=tap tests/traccar-position-ingestion-db.test.ts tests/traccar-operator-at-fix-time.test.ts`): run1/run2/run3 ec=0, **27 tests, 27 pass, 0 fail, 0 skipped** nas três (22 `-db` + 5 unitários). Estável.

### 2(b) vermelho no src de h2 (3 arquivos de h2 por cima; `npm run check` ec=0, 0 `error TS`), banco `jtrc01c3_c_h2`
`tap`: 27 tests, 23 pass, **4 fail**, 0 skipped — exatamente os 4, pela mensagem própria da asserção (o `location` do TAP aponta para o teste, `5:8360` etc.; nomeei pela mensagem, 1ª linha do `error:`):
- `not ok 5` T-C4(e) — "datado + desconhecido no instante → ambíguo, nunca o único datado": actual `ambiguous`, expected `history_ambiguous`;
- `not ok 16` T-C1 — "T-C1 a1 (C1): fix da viatura NOVA anterior à troca → histórico ambíguo": actual `no_operator_at_fix_time` (o `node:test` para na 1ª asserção que cai; a a6/C4 não é alcançada — o C4 em h2 = `no_operator` está medido pela sonda no item 1);
- `not ok 19` **T-P1** — "T-P1 a2 (P1): … → quarentena, não B": actual `{kind: 'stored'}` — **o P1 reproduzido pelo teste**;
- `not ok 20` T-P2 — "T-P2 a1 (N1)": actual `stored`.
Restauro: `git checkout -- src/modules/field-dispatch/` → porcelain 0, hash-object = blob do objeto nos 3; 3 corridas verdes acima foram DEPOIS do restauro.
- Nota: o §3.7 passo 1 do plano diz que "um `candidate()` de teste sem a flag não compila — é o guard"; medido: `tsconfig.json` `include: ["src/**/*.ts"]` e `npm run check` deu ec=0 com o src de h2 (tipo SEM a flag) e os testes do objeto (COM a flag) — `check` não compila `tests/`. O guard por compilação não existe por `check` (lint não medido). `nota`, não grave.

### 2(c) mutações — `$SCRATCH/zz-jtrc01c3c-mut.mjs` (md5 c9e3160b…; aplica a entrada do catálogo do objeto — `mutations.mjs` hash = blob 5fcf59df… — com âncora EOL-consciente LF→CRLF e contagem == 1 obrigatória), `mutrun.sh` (md5 307a38cf…; `.ts`: aplica, numstat, hash≠blob, `npm run check`, os 2 arquivos de teste, restaura por `git checkout -- <f>`, prova porcelain 0 e hash=blob) e `mutmig.sh` (md5 2970b061…; migração: banco `jtrc01c3_c_mut` NOVO, `migrate deploy`, função mutada conferida no `pg_proc`, `-db`, restauro e `DROP DATABASE … WITH (FORCE)`).
- Catálogo do objeto: a entrada M-C1 agora é a forma M-C1′ (`> now()`), e o `find` antigo `vehicle_assigned_at IS NULL OR wo.vehicle_assigned_at <=` tem **0** ocorrências no src; M-P1a (l.93) e M-P1b (l.94) entraram.

| mutação | âncora | numstat | check | resultado (27 casos; 22 nas de migração) | caso(s) vermelho(s) pela mensagem | irmãos verdes | restauro |
|---|---|---|---|---|---|---|---|
| **M-P1a** (perna `OR vaa > at` removida) | 1 | 1/1 | ec=0 | 24 pass / 3 fail | T-C1 pela **a6 (C4)** — logo a1–a5 passaram (a OS que ganhou V2 entra por `vehicle_id` e a flag a torna ambígua); T-P1 a2 actual `stored`; T-P2 a1 actual `stored` | 24 | porcelain 0, hash=blob |
| **M-P1b** (linha da flag no classificador removida) | 1 | 0/1 | ec=0 | 23/4 | T-C4(e) actual `ambiguous`; T-C1 a1 actual `stored`; T-P1 a2 actual `ambiguous_operator_at_fix_time`; T-P2 a1 actual `ambiguous_operator_at_fix_time` (o plano previa `stored` para T-P2 — o vermelho é o mesmo caso, motivo diferente: nota) | 23 | idem |
| **M-C1′** (flag `> now()`) | 1 | 1/1 | ec=0 | 24/3 | T-C1 a1 `stored`; T-P1 a2 `ambiguous_operator…`; T-P2 a1 `ambiguous_operator…`; unitário verde (não vê SQL) | 24 | idem |
| M-C2 (`vehicleAssignedAt === null` removido) | 1 | 0/1 | ec=0 | 24/3 | unitário 1 (viatura sem data) actual `ambiguous`; T-C4(e) 3º subcaso "legada (sem data, flag nula)"; ingestão "OS anterior à migração fica ambígua…" actual `stored` | 24 | idem |
| MUT-43 (`false && candidates.some(`) | 1 | 1/1 | ec=0 | 16/11 | os 4 unitários de histórico, reatribuição A→B, `reassigned → on_route`, A→B→A, T-C1, OS legada, T-P1, T-P2 | 16 | idem |
| M-C3 (troca mantém OLD vaa) — migração | 1 | 1/1 | `migrate deploy` em banco novo ec=0; função mutada no banco = 1 | 18/4 de 22 | T-C1 a1 `stored`; gatilho T-C3; T-P1 a2 `stored`; T-P2 a1 `stored` | 18 | porcelain 0, hash=blob, banco mut = 0 |
| M-C4 (COALESCE aceita a forja) — migração | 1 | 1/1 | idem | 21/1 de 22 | gatilho T-C3: actual 946684800000 (= 2000-01-01, a forja ficou) | 21 | idem |
Vermelho-controle do item 2: (1) o arnês acusa — sem mutação os casos indicados ficam verdes (3/3 corridas 27/27) e com o src de h2 ficam vermelhos exatamente os 4; (2) a mutação muda o binário — hash≠blob antes de medir e = blob depois, nas 7.
**Veredito parcial item 2:** os 4 testes do §3.5 existem, asseveram o que o título promete, ficam verdes 3× e vermelhos no src de h2 pelas asserções nomeadas (T-P1 reproduz o P1); M-P1a/M-P1b/M-C1′ vermelhas pelo caso indicado; M-C2/M-C3/M-C4/MUT-43 continuam mordendo. Duas `nota`s contra o plano (T-P2 sob M-P1b/M-C1′ cai por motivo e não por `stored`; o "guard por compilação" do §3.7.1 não existe via `check`). **Nenhum teste nem mutação cobre a forma F1** (lado do despacho) — coerente com o achado do item 1.

## Item 3 — regressão (21:0xZ–)

### 3(a) parcial — as 15 suítes no objeto, de uma vez
- Conjunto: `git ls-tree --name-only <ref> tests/ | grep '^tests/traccar-'` → 15 no objeto, 15 em h2, **mesmo conjunto** (`diff` vazio).
- Banco NOVO `jtrc01c3_c_reg` (`migrate deploy` ec=0, sem a sujeira das sondas). `withdb.sh jtrc01c3_c_reg timeout 1500 node --test --import tsx --test-reporter=tap <as 15>` → ec=0: **# tests 132 · pass 132 · fail 0 · cancelled 0 · skipped 0**. `traccar-dev-topology` executou (o Docker do Windows responde a `docker compose … config`, que só RESOLVE a configuração, não sobe nada) — contado como verde porque executou.

### 3(b) títulos — `$SCRATCH/zz-jtrc01c3c-corpos.mjs` md5 b0fca5ee… (regra: toda chamada `test(`/`it(` em início de instrução com 1º argumento literal; corpo = a chamada inteira com parênteses casados, ignorando strings, templates `${}` e comentários; blobs por `git show <ref>:<f>`, CRLF→LF). Log verbatim:
```
tests/traccar-binding-uniqueness-db.test.ts: h2=7 objeto=7
tests/traccar-dev-topology.test.ts: h2=8 objeto=8
tests/traccar-forward-auth.test.ts: h2=9 objeto=9
tests/traccar-idempotency-db.test.ts: h2=10 objeto=10
tests/traccar-ingest-listener.test.ts: h2=18 objeto=18
tests/traccar-ingest-logs.test.ts: h2=9 objeto=9
tests/traccar-ingest-pool-db.test.ts: h2=3 objeto=3
tests/traccar-operator-at-fix-time.test.ts: h2=4 objeto=5
tests/traccar-position-contract.test.ts: h2=13 objeto=13
tests/traccar-position-ingestion-db.test.ts: h2=21 objeto=23
tests/traccar-quarantine-db.test.ts: h2=7 objeto=7
tests/traccar-rate-limit.test.ts: h2=6 objeto=6
tests/traccar-resolution-cost.test.ts: h2=9 objeto=9
tests/traccar-resolution-race-db.test.ts: h2=6 objeto=6
tests/traccar-rls-budget-order.test.ts: h2=1 objeto=1
TOTAL titulos h2=131 objeto=134
SUMIDOS(1):
  tests/traccar-position-ingestion-db.test.ts :: ingestão: a viatura da OS é a do instante do fix — fix atrasado da viatura nova vai à quarentena
NOVOS(4):
  tests/traccar-operator-at-fix-time.test.ts :: operador no instante: viatura (re)atribuída depois do fix torna o histórico ambíguo, mesmo ao lado de um candidato datado
  tests/traccar-position-ingestion-db.test.ts :: ingestão: a viatura da OS é a do instante do fix — fix atrasado da viatura nova vai à quarentena (histórico ambíguo)
  tests/traccar-position-ingestion-db.test.ts :: ingestão: a OS que tinha a viatura no instante do fix e a perdeu depois continua na janela — o fix ambíguo vai à quarentena, não ao outro técnico
  tests/traccar-position-ingestion-db.test.ts :: ingestão: OS de OUTRA viatura que trocou de viatura depois do fix torna o instante desconhecido — quarentena, nunca atribuição pelo estado de agora
CORPO EDITADO h2->objeto, mesmo titulo (0):
  
CICLO 1 (5abdf83b) casos em tests/traccar-position-ingestion-db.test.ts: 18; corpo igual em h1=h2=objeto: 18; diferentes: 0
  
```
Vermelho-controle do comparador (`… CTL`: no texto do OBJETO em memória, um título de `traccar-quarantine-db` renomeado e 1 caractere trocado no corpo de "recibo e localização gravados atomicamente"):
```
SUMIDOS(2):
  tests/traccar-position-ingestion-db.test.ts :: ingestão: a viatura da OS é a do instante do fix — fix atrasado da viatura nova vai à quarentena
  tests/traccar-quarantine-db.test.ts :: B-TRC-01 traccar-quarantine-db exige DATABASE_URL e um banco migrado
NOVOS(5):
  tests/traccar-operator-at-fix-time.test.ts :: operador no instante: viatura (re)atribuída depois do fix torna o histórico ambíguo, mesmo ao lado de um candidato datado
  tests/traccar-position-ingestion-db.test.ts :: ingestão: a viatura da OS é a do instante do fix — fix atrasado da viatura nova vai à quarentena (histórico ambíguo)
  tests/traccar-position-ingestion-db.test.ts :: ingestão: a OS que tinha a viatura no instante do fix e a perdeu depois continua na janela — o fix ambíguo vai à quarentena, não ao outro técnico
  tests/traccar-position-ingestion-db.test.ts :: ingestão: OS de OUTRA viatura que trocou de viatura depois do fix torna o instante desconhecido — quarentena, nunca atribuição pelo estado de agora
  tests/traccar-quarantine-db.test.ts :: RENOMEADO-CTL B-TRC-01 traccar-quarantine-db exige DATABASE_URL e um banco migrado
CORPO EDITADO h2->objeto, mesmo titulo (1):
  tests/traccar-position-ingestion-db.test.ts :: ingestão: recibo e localização gravados atomicamente sob o papel efêmero
CICLO 1 (5abdf83b) casos em tests/traccar-position-ingestion-db.test.ts: 18; corpo igual em h1=h2=objeto: 17; diferentes: 1
  ingestão: recibo e localização gravados atomicamente sob o papel efêmero (no objeto: true; h2: true; =h1: false; =h2: false)
```
Os dois controles acusaram (o renomeado aparece como sumido + novo; o caractere trocado aparece como corpo editado, e também no recorte do ciclo 1).
- **Títulos de h2 ⊆ objeto, salvo exatamente 1** (o T-C1, que ganhou " (histórico ambíguo)"); **novos = 4** = o T-C1 renomeado + T-C4(e) + T-P1 + T-P2. Nenhum outro título sumiu ou nasceu. A contagem estática (h2 131 → objeto 134) inclui os títulos de "exige DATABASE_URL" (casos `skip` que só nascem sem banco), por isso difere da executada (132).
- **Corpos:** 0 casos com o mesmo título e corpo diferente entre h2 e o objeto em TODOS os 15 arquivos — inclui T-C2 (legada), T-C3 (gatilho), T-B1, T-B2.

### 3(c) os casos do ciclo 1 (`5abdf83b`) em `traccar-position-ingestion-db`
18 títulos no blob do ciclo 1 = **17 casos + 1 placeholder `skip`** ("exige DATABASE_URL") — o "17" do plano confere. Os 18 têm o corpo **igual em h1 = h2 = objeto** (md5 do texto EOL-neutro). Nenhum envolve troca de viatura (lidos os títulos: operador no instante, reatribuição, re-aceite, A→B→A, organização suspensa, duplicata, atraso, evento, tempo esgotado, organização B). Como os corpos são idênticos e as asserções fixam o motivo, e os casos passam no objeto (132/132) e em h2 (a medir abaixo), o motivo é o mesmo.
- 3(a) por arquivo no objeto (cada arquivo sozinho, banco `jtrc01c3_c_reg`, TAP por arquivo): binding-uniqueness-db 6 · dev-topology 12 · forward-auth 9 · idempotency-db 9 · ingest-listener 18 · ingest-logs 9 · ingest-pool-db 2 · operator-at-fix-time **5** · position-contract 13 · position-ingestion-db **22** · quarantine-db 6 · rate-limit 6 · resolution-cost 9 · resolution-race-db 5 · rls-budget-order 1 = **132**, fail 0 e skipped 0 em todos, ec=0 em todos.
- Docker às 21:1xZ: `erp-*` (base viva, à parte) + `j07cb1c2-c2-pg`/`j07cb1c2-c2-runner` (1 trabalho de outros) + os meus 2 containers (1 trabalho) = 2 trabalhos, no limite. Disco 9,3G livres.
- Objeto re-resolvido: `ls-remote` = `gh` headRefOid = `ce20aa3f…` (igual ao início); delta 7c220467→ce20aa3f em `src tests prisma` = 0; origin/main `a26f8afe…` (igual).
- 3(a) em h2 (src E testes de h2 por cima: os 3 de `src/modules/field-dispatch/` + os 2 testes; `git diff --name-only 2043c584 -- src tests` = 0, ou seja, a árvore de src/tests = h2; banco NOVO `jtrc01c3_c_reg2`), cada arquivo sozinho: binding 6 · topology 12 · forward-auth 9 · idempotency 9 · listener 18 · logs 9 · pool 2 · operator-at-fix-time **4** · contract 13 · position-ingestion-db **20** · quarantine 6 · rate 6 · cost 9 · race 5 · rls-budget 1 = **129**. Na passada por arquivo, `position-ingestion-db` em h2 deu 19/1 (ec=1); o TAP dessa passada foi sobrescrito pela suíte seguinte (falha de registro minha: não sei qual caso caiu). Re-executado 2× no mesmo banco e na mesma árvore: **20/20, 20/20**, skipped 0 → transitório em h2, não no objeto; no objeto o mesmo arquivo deu 22/22 em 5 corridas (3 do item 2(a), a das 15 juntas e a por arquivo). Restaurado: porcelain 0, diff contra o objeto 0, hash = blob nos 5.
- **Diferença por arquivo h2 → objeto: só `operator-at-fix-time` (+1 = T-C4(e)) e `position-ingestion-db` (+2 = T-P1, T-P2)**; os outros 13 arquivos com o mesmo N. 129 → 132 = +3 casos novos.

**Veredito parcial item 3:** 15 suítes, **132/132** no objeto, fail 0, skipped 0 (duas formas: as 15 juntas e uma a uma); h2 129 (o baseline da ata do ciclo 2 re-verificado); diferença = exatamente os 3 casos novos; títulos de h2 ⊆ objeto salvo só o T-C1; novos = T-C1 renomeado + T-P1 + T-P2 + T-C4(e); os 17 casos do ciclo 1 com corpo idêntico em h1=h2=objeto; T-C2/T-C3/T-B1/T-B2 intactos; controles do comparador acusaram. APROVADO.

## Teardown (21:3xZ)
- `teardown.sh` (md5 a4b27597…): `log_statement` = none (nunca liguei); bancos `jtrc01c3_c_obj,_h2,_old,_reg,_reg2` dropados pelo nome (`_mut` já dropado após cada mutação de migração) → `pg_database LIKE 'jtrc01c3%'` = 0; papel `jtrc01c3c_rt` dropado → 0; papéis efêmeros `o6r_b01_%` restantes = 0; `docker rm -f -v jtrc01c3-c-pg jtrc01c3-c-redis` → `docker ps -a --filter name=jtrc01c3-c- -q | wc -l` = 0.
- Processos com `w-jc3-c` na linha de comando (PowerShell `Get-CimInstance`) = 0 → `git worktree remove --force C:/Users/AMP/w-jc3-c` ec=0; diretório ausente; `worktree list | grep -c w-jc3-c` = 0. O `w-jc3-c-h2` nunca foi criado (um worktree só, declarado). Mutações e src/testes de h2 restaurados antes (porcelain 0, hash = blob em cada arquivo tocado).
- Senha: `grep -c -F` = 0 na evidência, no voto e nos logs do `$SCRATCH`; o arquivo da senha e as sondas são apagados com a MINHA subpasta `$SCRATCH/jc3c` ao fim (só ela). Os textos das sondas ficam com md5 publicado (db 824fcde1…, old 51bb356b…, mut c9e3160b…, corpos b0fca5ee…, mutrun 307a38cf…, mutmig 2970b061…, withdb b8162975…, teardown a4b27597…).
- Base viva `erp-*`, portas 5432/6379/3000/5173/5050/8899, `w-07cb1`, `w-jc2-b*`, os containers `j07cb1c2-*` e os servidores públicos do Traccar: nunca tocados. Em `w-trc01` escrevi só `cadeira-c-evidencia.md` e `cadeira-c-voto.json`; o `git status` lá lista também os arquivos das cadeiras (a″)/(b″) — vi os NOMES na listagem, não os abri. Resíduos alheios reportados: `.npmtest-503.log`, `check_md5.cjs`, `check_md5.js` (os do R-2). Disco C: 9,8G livres no fim.
- Objeto no fim: igual ao do início (ce20aa3f no ramo = 7c220467 + registro; medi 7c220467).

## Voto gravado (21:4xZ) — `cadeira-c-voto.json`
VOTO: **APROVADO**. O P1 está fechado no objeto (h2 204→B; objeto operator_history_ambiguous, locA 0 e locB 0, nas formas P e S). Itens 1, 2 e 3 medidos por execução, com todos os vermelhos-controle acusando. Achado **F1** — o despacho re-aceito, ou reatribuído e aceito, depois do fix manda o fix ambíguo ao competidor, no objeto e em h2: `bloqueia`, dentro do bloco, **não grave**. Repete a classe com informação nova (o eixo do despacho). Pelo §C7 item 8(2) não reprova; vira pendência, com dono proposto B-TRC-03. Duas `nota`s de registro contra o plano.
