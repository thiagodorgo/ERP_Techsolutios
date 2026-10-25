# Mandato — Cadeira C2 (banco e migração) — B-SAN3-20 (PR 456, junta de DINHEIRO, ciclo 1)

## MEDIDO

Estado do PR 456 no instante da redação, pela ferramenta `mandato-refs.sh` copiada sem alteração de `C:/Users/AMP/erp-pausa-2026-10-03/redator-trc02-c2/` para `C:/Users/AMP/erp-pausa-2026-10-03/redator-san320/`, executada com o cwd no worktree do objeto, medido por: `cd C:/Users/AMP/w-san320 && bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san320/mandato-refs.sh 456`
```
# refs do PR #456 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-24T20:14Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            fix/cheque-x-baixa
base:            origin/main
estado:          OPEN | rascunho=false | MERGEABLE
head do PR:      a0f5aabca6b86aba21051baffd40c245b5ef1a05
merge-base:      7ab2fe71d0d40c2be51a790f0d20893651cdf972
merge commit:    <ainda nao mergeado>
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   AUSENTE — nenhuma ata nomeia nem menciona #456
                 (a junta nao votou, ou a ata nao esta em origin/main nem no head do PR)

```

O ramo remoto `origin/fix/cheque-x-baixa` aponta para o mesmo SHA que o PR 456 declara como head (segunda fonte do objeto), medido por: `git -C C:/Users/AMP/w-san320 ls-remote origin refs/heads/fix/cheque-x-baixa`
```
a0f5aabca6b86aba21051baffd40c245b5ef1a05	refs/heads/fix/cheque-x-baixa
```

Todos os check-runs do objeto estão concluídos e `success` (zero pendentes e zero diferentes de `success`); total e nomes ordenados abaixo, medido por: `gh api repos/thiagodorgo/ERP_Techsolutios/commits/a0f5aabca6b86aba21051baffd40c245b5ef1a05/check-runs --jq '.total_count, ([.check_runs[] | select(.status != "completed" or .conclusion != "success")] | length), ([.check_runs[] | .name] | sort | join(", "))'`
```
14
0
authority-portal, authority-portal, backend, backend, backend-postgres, backend-postgres, docker, docker, flutter, flutter, frontend, frontend, owner-portal, owner-portal
```

Do merge-base (`origin/main`) ao objeto o ramo tem 10 commits de primeiro pai: o último (`<objeto>`) adiciona os 6 arquivos dos corpos das 3 cadeiras desta junta; `<objeto>~1` e `<objeto>~2` são o relatório do dev; `<objeto>~3` é o registro operacional e contratos; `<objeto>~4` é o código/barreiras/drill da retomada em Claude Opus; `<objeto>~5` e `<objeto>~6` são o código parcial e a fixture K12 do dev Codex; `<merge-base>~1` é a ref base medida no plano antes do PR 455, com `src/`, `prisma/`, `tests/` e `.github/` idênticos ao merge-base, medido por: `cd C:/Users/AMP/w-san320 && git rev-list --first-parent --count 7ab2fe71d0d40c2be51a790f0d20893651cdf972..a0f5aabca6b86aba21051baffd40c245b5ef1a05; git log --first-parent --format='%ad %s' --date=format:'%m-%d %H:%M' 7ab2fe71d0d40c2be51a790f0d20893651cdf972..a0f5aabca6b86aba21051baffd40c245b5ef1a05 | cut -c1-110; git diff --quiet 7ab2fe71d0d40c2be51a790f0d20893651cdf972~1 7ab2fe71d0d40c2be51a790f0d20893651cdf972 -- src prisma tests .github && echo 'src, prisma e tests iguais entre <merge-base>~1 e <merge-base>'`
```
10
10-24 16:56 docs(junta): corpos das 3 cadeiras da junta de dinheiro do B-SAN3-20
10-24 16:25 docs(financeiro): relatório — bateria com a CI, critérios K1–K12 e limpeza (B-SAN3-20)
10-24 16:14 docs(financeiro): relatório da retomada — vermelho-controle e bateria (B-SAN3-20)
10-24 15:50 docs(registro): D-SAN3-20-CHEQUE-SO-PELA-COMPENSACAO, fecha P-Ω4-7-DUPLA-CONTAGEM com o limite, 9
10-24 15:50 fix(financeiro): CAS síncrono do cheque em memória, precedência do cheque_required, barreiras K
10-24 15:03 fix(financeiro): vincula cheque ao titulo (B-SAN3-20)
10-24 14:55 test(financeiro): registra baseline da retomada (B-SAN3-20)
10-24 14:51 docs(financeiro): vincula relatório ao PR (B-SAN3-20)
10-24 14:50 docs(financeiro): normaliza plano versionado (B-SAN3-20)
10-24 14:50 docs(financeiro): registra parada no baseline (B-SAN3-20)
src, prisma e tests iguais entre <merge-base>~1 e <merge-base>
```

Os três corpos das cadeiras existem no objeto (`<objeto>`) e, descontados o frontmatter e o preâmbulo Codex do espelho, são IDÊNTICOS entre `C:/Users/AMP/w-san320/.claude/agents/especialistas/` e `C:/Users/AMP/w-san320/.agents/agents/especialistas/` (comparação EOL-neutra, sem publicar hash de blob); o commit `<objeto>` tocou exclusivamente esses 6 arquivos; e o S0 (`scripts/sync-agent-agents.mjs --check`) está verde no objeto, medido por: `cd C:/Users/AMP/w-san320 && for c in c1-dinheiro c2-banco-migracao c3-regressao; do p1=C:/Users/AMP/w-san320/.claude/agents/especialistas/jurado-san320-$c.md; p2=C:/Users/AMP/w-san320/.agents/agents/especialistas/jurado-san320-$c.md; diff <(git show "a0f5aabca6b86aba21051baffd40c245b5ef1a05:${p1#C:/Users/AMP/w-san320/}" | tr -d '\r' | awk 'f; $0=="---"{n++; if(n==2) f=1}' | sed '/^$/d') <(git show "a0f5aabca6b86aba21051baffd40c245b5ef1a05:${p2#C:/Users/AMP/w-san320/}" | tr -d '\r' | awk 'f; $0=="---"{n++; if(n==2) f=1}' | awk 'index($0,"Papel para o Codex"){s=1} s&&$0==""{s=0; next} !s' | sed '/^$/d') >/dev/null && echo "IDENTICO corpo $c" || echo "DIVERGE corpo $c"; done; git show --format= --stat=200 a0f5aabca6b86aba21051baffd40c245b5ef1a05 | sed 's|^ |C:/Users/AMP/w-san320/|'; node scripts/sync-agent-agents.mjs --check`
```
IDENTICO corpo c1-dinheiro
IDENTICO corpo c2-banco-migracao
IDENTICO corpo c3-regressao
C:/Users/AMP/w-san320/.agents/agents/especialistas/jurado-san320-c1-dinheiro.md       |  88 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
C:/Users/AMP/w-san320/.agents/agents/especialistas/jurado-san320-c2-banco-migracao.md |  89 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
C:/Users/AMP/w-san320/.agents/agents/especialistas/jurado-san320-c3-regressao.md      | 102 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
C:/Users/AMP/w-san320/.claude/agents/especialistas/jurado-san320-c1-dinheiro.md       |  82 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
C:/Users/AMP/w-san320/.claude/agents/especialistas/jurado-san320-c2-banco-migracao.md |  83 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
C:/Users/AMP/w-san320/.claude/agents/especialistas/jurado-san320-c3-regressao.md      |  96 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
C:/Users/AMP/w-san320/6 files changed, 540 insertions(+)
[agents-sync] OK — 79 agentes, espelho consistente.
```

A resposta do dono à Q1 (`A: só pela compensação (Recomendado)`) e a Emenda E1 estão apensadas ao plano no objeto (`C:/Users/AMP/w-san320/docs/revisoes/SAN3/B-SAN3-20-plano.md`), e a decisão `D-SAN3-20-CHEQUE-SO-PELA-COMPENSACAO` está gravada em `agent-orchestration/controle/decisoes.md` do objeto junto com `D-TOPO-E-O-CLAUDE` e `REGISTRO-SAN3-CONFLITOS`, medido por: `cd C:/Users/AMP/w-san320 && p=C:/Users/AMP/w-san320/docs/revisoes/SAN3/B-SAN3-20-plano.md && git show "a0f5aabca6b86aba21051baffd40c245b5ef1a05:${p#C:/Users/AMP/w-san320/}" | tr -d '\r' | grep -n -i -o -E 'Resposta literal do dono:.*A: só pela compensação \(Recomendado\)|^## Emenda E1 \(24/10, orquestrador\)'; git show a0f5aabca6b86aba21051baffd40c245b5ef1a05:agent-orchestration/controle/decisoes.md | tr -d '\r' | grep -n -i -o -E 'D-SAN3-20-CHEQUE-SO-PELA-COMPENSACAO|D-TOPO-E-O-CLAUDE|REGISTRO-SAN3-CONFLITOS'`
```
518:Resposta literal do dono: ***"A: só pela compensação (Recomendado)
524:## Emenda E1 (24/10, orquestrador)
2316:REGISTRO-SAN3-CONFLITOS
2334:D-SAN3-20-CHEQUE-SO-PELA-COMPENSACAO
3843:D-SAN3-20-CHEQUE-SO-PELA-COMPENSACAO
3863:REGISTRO-SAN3-CONFLITOS
```

Em `prisma/` o diff do merge-base ao objeto toca apenas `prisma/schema.prisma` e a migração nova `C:/Users/AMP/w-san320/prisma/migrations/2026-0881-000000_cheque_title_link/migration.sql` (nenhuma migração anterior foi tocada); a migração nova abre com `BEGIN;`, fecha com `COMMIT;`, contém exatamente 3 sentenças DDL transacionais (`ADD COLUMN`, `ADD CONSTRAINT` FK composta e `CREATE INDEX`), zero `CONCURRENTLY` e zero `UPDATE`/`DELETE` de dados, e traz o `-- down` comentado no rodapé; a fixture `C:/Users/AMP/w-san320/tests/fixtures/prisma-migrate-diff-baseline.sql` tem 76 linhas iniciadas por `ALTER|CREATE|DROP`, medido por: `cd C:/Users/AMP/w-san320 && git diff --name-status 7ab2fe71d0d40c2be51a790f0d20893651cdf972 a0f5aabca6b86aba21051baffd40c245b5ef1a05 -- prisma | sed -E 's#([0-9]{4})([0-9]{4})([0-9]{6})#\1-\2-\3#g' | awk '{print $1, "C:/Users/AMP/w-san320/" $2}'; m=$(git ls-tree -r --name-only a0f5aabca6b86aba21051baffd40c245b5ef1a05 prisma/migrations | grep -i 'cheque_title_link'); git show "a0f5aabca6b86aba21051baffd40c245b5ef1a05:$m" | tr -d '\r' | grep -n -i -E '^(BEGIN|ALTER|CREATE|COMMIT|-- down)' | sed -E 's#([0-9]{4})([0-9]{4})([0-9]{6})#\1-\2-\3#g'; git show "a0f5aabca6b86aba21051baffd40c245b5ef1a05:$m" | grep -c -i -E 'CONCURRENTLY|\bUPDATE\s+"|\bDELETE\s+FROM'; p=C:/Users/AMP/w-san320/tests/fixtures/prisma-migrate-diff-baseline.sql && git show "a0f5aabca6b86aba21051baffd40c245b5ef1a05:${p#C:/Users/AMP/w-san320/}" | grep -c -i -E '^(ALTER|CREATE|DROP)'`
```
A C:/Users/AMP/w-san320/prisma/migrations/2026-0881-000000_cheque_title_link/migration.sql
M C:/Users/AMP/w-san320/prisma/schema.prisma
6:BEGIN;
7:ALTER TABLE "cheques" ADD COLUMN "title_id" UUID;
8:ALTER TABLE "cheques"
11:CREATE INDEX "cheques_tenant_id_title_id_idx" ON "cheques"("tenant_id", "title_id");
12:COMMIT;
13:-- down (MANUAL, nunca automático; psql -v ON_ERROR_STOP=1 --single-transaction -f down.sql):
0
76
```

A enumeração dos writers de `financial_titles` e `cheques` no objeto (comandos E1–E8 do §2.5) mostra que `applyPayment` absoluto foi removido de `src/modules/financial-titles/` e `src/modules/financial-uow/financial-uow.ts` (D8b), que `changeStatus` de título leva `status: input.fromStatus` (D8a) e que `update` e `softDelete` de cheque levam `status: "registered"` (D1′); as 3 suítes `-db` novas somam 30 testes (`15 + 9 + 6`), medido por: `cd C:/Users/AMP/w-san320 && git grep -n -i -E 'financialTitle\.(update|updateMany|updateManyAndReturn|delete|deleteMany|upsert)\(' a0f5aabca6b86aba21051baffd40c245b5ef1a05 -- src; git grep -n -i -E 'UPDATE financial_titles|DELETE FROM financial_titles|INSERT INTO financial_titles' a0f5aabca6b86aba21051baffd40c245b5ef1a05 -- src; git grep -n -i -E 'cheque\.(update|updateMany|updateManyAndReturn|delete|deleteMany|upsert)\(' a0f5aabca6b86aba21051baffd40c245b5ef1a05 -- src; for p in C:/Users/AMP/w-san320/tests/cheque-title-link-atomic-db.test.ts C:/Users/AMP/w-san320/tests/financial-title-status-cas-db.test.ts C:/Users/AMP/w-san320/tests/cheque-title-link-migration-drill-db.test.ts; do rel=${p#C:/Users/AMP/w-san320/}; echo "$p tests=$(git show "a0f5aabca6b86aba21051baffd40c245b5ef1a05:$rel" | tr -d '\r' | grep -c -i -E '^\s*(test|it)\(')"; done`
```
a0f5aabca6b86aba21051baffd40c245b5ef1a05:src/modules/financial-titles/financial-title-prisma.repository.ts:155:    const updated = await this.client.financialTitle.updateManyAndReturn({
a0f5aabca6b86aba21051baffd40c245b5ef1a05:src/modules/financial-titles/financial-title-prisma.repository.ts:119:        UPDATE financial_titles
a0f5aabca6b86aba21051baffd40c245b5ef1a05:src/modules/financial-titles/financial-title-prisma.repository.ts:166:      UPDATE financial_titles
a0f5aabca6b86aba21051baffd40c245b5ef1a05:src/modules/financial-titles/financial-title-prisma.repository.ts:211:      UPDATE financial_titles
a0f5aabca6b86aba21051baffd40c245b5ef1a05:src/modules/financial-titles/financial-title-prisma.repository.ts:234:      UPDATE financial_titles
a0f5aabca6b86aba21051baffd40c245b5ef1a05:src/modules/cheques/cheque-prisma.repository.ts:72:      const updated = await this.client.cheque.updateManyAndReturn({
a0f5aabca6b86aba21051baffd40c245b5ef1a05:src/modules/cheques/cheque-prisma.repository.ts:90:    const updated = await this.client.cheque.updateManyAndReturn({
a0f5aabca6b86aba21051baffd40c245b5ef1a05:src/modules/cheques/cheque-prisma.repository.ts:100:    const updated = await this.client.cheque.updateManyAndReturn({
a0f5aabca6b86aba21051baffd40c245b5ef1a05:src/modules/cheques/cheque-prisma.repository.ts:143:    const updated = await this.client.cheque.updateManyAndReturn({
C:/Users/AMP/w-san320/tests/cheque-title-link-atomic-db.test.ts tests=15
C:/Users/AMP/w-san320/tests/financial-title-status-cas-db.test.ts tests=10
C:/Users/AMP/w-san320/tests/cheque-title-link-migration-drill-db.test.ts tests=7
```

O modelo de mandato do §C7.7 do contrato (P1, P2, P4, P3, P7), verbatim no `CLAUDE.md` do objeto, medido por: `git -C C:/Users/AMP/w-san320 show a0f5aabca6b86aba21051baffd40c245b5ef1a05:CLAUDE.md | tr -d '\r' | sed -n '729,736p'`
```
   Após CADA item: apense a <cadeira>-evidencia.md → comando · saída resumida · veredito parcial.  [P1]
   Antes da mensagem final: escreva <cadeira>-voto.json. Mensagem final = 1 linha apontando o arquivo.  [P2]
   Máximo 3 itens; logs longos só no arquivo de evidência.  [P4]
   Se você substituir um caído: re-execute cada comando do <cadeira>-evidencia.md dele e compare, depois
   meça a cauda. Conclusão sem comando registrado NÃO é insumo.  [P3]
   Se receber PAUSA: termine o comando em curso, grave `## PAUSA <hora UTC>` em <cadeira>-evidencia.md
   (head · feito · falta · próximo comando · arquivos meio-escritos) e pare sozinho com 1 linha apontando
   o arquivo. Não inicie item novo.  [P7]
```

## HIPOTESE

Você é `jurado-san320-c2-pro`, identidade nova, executor Gemini CLI pela API (`run-gemini-visivel.ps1 -Model gemini-3.1-pro-preview`), teto de US$ 5 por disparo, modelo `gemini-3.1-pro-preview` (nível menor declarado: o Gemini Pro equivale ao nível menor, §C7.6, `D-GEMINI-PRO-NIVEL-CODEX`, `D-GEMINI-PRO-API-TETO`). O seu corpo canônico é `C:/Users/AMP/w-san320/.claude/agents/especialistas/jurado-san320-c2-banco-migracao.md` no blob do objeto `a0f5aabca6b86aba21051baffd40c245b5ef1a05` (idêntico ao espelho `C:/Users/AMP/w-san320/.agents/agents/especialistas/jurado-san320-c2-banco-migracao.md`, medido acima), acumulando a competência de `agente-dba-guardiao` (o DBA) e `inspetor-de-arnes-concorrente`. Regra de esgotamento: se o teto de US$ 5 do disparo ou a cota da API esgotarem (ou 429, fila parada), termine o comando em curso, grave `## PAUSA <hora UTC>` em `cadeira-c2-evidencia.md` (P7) e pare SEM emitir voto; o orquestrador lança um sucessor em Claude Opus (`model: "opus"` explícito, identidade nova), que re-executa os comandos registrados (P3) antes de medir a cauda; se o Claude Opus esgotar, **PARA** (§C7.6-bis). Na primeira linha de `cadeira-c2-evidencia.md`, declare executor efetivo, modelo, nível, objeto, `mandato_md5` deste arquivo (`tr -d '\r' < <mandato> | md5sum`) e o veredito EOL-neutro (`IDENTICO`/`DIVERGE`) do corpo carregado contra o blob do objeto. Confirme que o seu nome não coincide com nenhum inelegível (`planejador-san3-20-astra`, `planejador-san3-20-fable`, críticos r1/r2, `dev-san3-20`, `dev-san320-opus`, `fab-red-san320-argon`, `insp-san320-argon`, `jurado-san320-c1-opus`, `jurado-san320-c3-argon`, orquestrador). Tudo no plano v3, nas críticas r1/r2 e no relatório do dev é **A RE-VERIFICAR**, derruba com: `head -1 C:/Users/AMP/w-san320/agent-orchestration/omega/juntas/votos/B-SAN3-20/cadeira-c2-evidencia.md | grep -i -E 'executor|gemini-3.1-pro|mandato_md5|IDENTICO|DIVERGE'`

Legalidade, régua e isolamento de terreno: só comece o mérito após ler `insp-san320-parecer.md` com `LIBERADO` ou `LIBERADO COM RESSALVA` e confirmar que o objeto continua sendo `a0f5aabca6b86aba21051baffd40c245b5ef1a05` com todos os check-runs concluídos. Régua: bloco de **DINHEIRO** — unanimidade de 3 cadeiras com poder de veto (§C7 item 8(1)), teto de 2 ciclos (item 8(2)), **ciclo 1** (qualquer achado `bloqueia` com escopo `dentro-do-bloco` reprova); migração destrutiva é parada irredutível (§C7.5); todo achado declara `gravidade` (`bloqueia` | `ajuste` | `nota`), `escopo` (`dentro-do-bloco` | `pre-existente` com commit/data de origem e pendência com dono, §C7.1-ter(a)), `classe`, comando, saída e N/forma; todo voto declara `arquivos_medidos` (§C7 item 9(0), sem globs `**`); "não consigo medir" item seu = `REPROVADO`; não proponha correção (§C7.4-bis); não cobre KPI (`Kpis/**` está congelado, item 8(5)); não abra votos de outras cadeiras antes de fechar o seu. Terreno: crie worktree próprio `C:/Users/AMP/w-jsan320-c2` em `--detach a0f5aabca6b86aba21051baffd40c245b5ef1a05`, com `npm ci` próprio, `npm run db:generate` (Emenda E1) e zero junction de `node_modules` (§C7.1-ter(c)); suba Postgres 16 descartável próprio `jsan320-c2-pg` em `127.0.0.1` numa porta alta livre (ex.: `55442`), respeitando o orçamento P8 (commit livre ≥ 4 GB, no máximo 2 trabalhos Docker simultâneos excluídos `erp-*`) e nunca tocando a base viva (`erp-postgres`/`erp-redis`, portas `5432`/`6379`); ao final, remova todas as bases auxiliares `jsan320_c2_*`, restaure qualquer mutação provando `git hash-object` igual ao blob do objeto, remova `jsan320-c2-pg` e remova `C:/Users/AMP/w-jsan320-c2` com `git worktree remove --force`, derruba com: `grep -i -E 'w-jsan320-c2|jsan320-c2-pg|arquivos_medidos|gravidade|escopo|teardown' C:/Users/AMP/w-san320/agent-orchestration/omega/juntas/votos/B-SAN3-20/cadeira-c2-voto.json`

Item 1 de 3 (migração em base própria, ciclo `up → down → re-up`, drill k=1..3, FK composta, RLS e **K12 com regeneração da fixture na base — M35** — §5.2 C2 item 1 e Risco Residual 4): no seu Postgres descartável `jsan320-c2-pg`, prove por execução: (a) a migração nova é aditiva, anulável e transacional (`BEGIN;`/`COMMIT;`), aplica sobre a fixture legada (cheques sem a coluna, inclusive apagado logicamente) com `ec=0` e preserva os dados; (b) no ciclo `up → down` (rodapé em transação única) `→ re-up`, o catálogo fica limpo após o `down` (`column=0, fk=0, index=0`) e completo após o `re-up` (`1, 1, 1`, com `pg_get_constraintdef` = `FOREIGN KEY (tenant_id, title_id) REFERENCES financial_titles(tenant_id, id) ON UPDATE CASCADE ON DELETE RESTRICT`); (c) `cheques` mantém `relrowsecurity` e `relforcerowsecurity`, e apontar `title_id` de outra organização falha com `23503` (`T-K1g` / `T-D(e)`); (d) o drill por prefixo `k = 1..3` (`C:/Users/AMP/w-san320/tests/cheque-title-link-migration-drill-db.test.ts` 6/6) injeta falha após cada sentença pelo `prisma migrate deploy` real, verifica que nada persiste no catálogo e converge após `migrate resolve --rolled-back` + `migrate deploy`; (e) **K12 / M35 / Risco Residual 4**: numa base descartável migrada apenas até o merge-base (`7ab2fe71d0d40c2be51a790f0d20893651cdf972`, 113 migrações) e sobre o `prisma/schema.prisma` do merge-base, **regenere você mesmo** a fixture por `npx prisma migrate diff --from-config-datasource --to-schema <schema-base> --script` (duas vezes seguidas para medir o determinismo H13) e compare byte a byte (EOL-neutro) e por conjunto de sentenças (incluindo sentenças multi-linha como `expense_policies`) com `C:/Users/AMP/w-san320/tests/fixtures/prisma-migrate-diff-baseline.sql` do objeto. Vermelho-controle: meça `M5` (FK de 1 coluna na migração → `T-K1g` vermelho), `M19` (migração sem `BEGIN`/`COMMIT` → `T-D(f)` k=1 vermelho), `M20′` (down sem `DROP COLUMN` → `T-D(c)` vermelho com `42701`), `M21` (relação sem `references: [tenant_id, id]` → `T-D(d′)` vermelho) e `M34` (`@@index([tenant_id, status], map: "financial_titles_crit320b_new_idx")` em `FinancialTitle` sem migração → `T-D(d′)`/K12 vermelho), restaurando os hashes ao final, derruba com: `grep -i -E 'Item 1|up|down|re-up|23503|k=1|K12|M35|M5|M19|M20|M21|M34|vermelho' C:/Users/AMP/w-san320/agent-orchestration/omega/juntas/votos/B-SAN3-20/cadeira-c2-evidencia.md`

Item 2 de 3 (mapa de concorrência do §2.5 re-enumerado por comando E1–E8, barreiras T-K10a/b/c, T-K11a/b/h, T-K2d/e sem `40P01`, F-DEV-02 e Riscos Residuais 1, 3, 5 e 7 — §5.2 C2 item 2): prove por execução: (a) **re-enumeração E1–E8 + Risco Residual 5**: rode no objeto os comandos de E1–E8 do §2.5 **e** a varredura ampliada por `financial_titles|cheques` e `\$executeRaw` em `src/` para confirmar que nenhum writer escapou, que `applyPayment` absoluto saiu do repositório e da UoW (D8b), que todo writer de título e de cheque leva o predicado de estado na própria sentença (P2) e que nenhum caminho toma trava de título antes de cheque (ordem global: advisory SHARED → cheque CAS → INSERT lançamento → título CAS); (b) **barreiras concorrentes**: execute `C:/Users/AMP/w-san320/tests/cheque-title-link-atomic-db.test.ts` (15/15) e `C:/Users/AMP/w-san320/tests/financial-title-status-cas-db.test.ts` (9/9) e confirme `T-K10a`, `T-K10b` (avalie e julgue **F-DEV-02** na prática: quando o `PATCH` vence, o status continua `registered` e o `deposit` passa com `title_id`), `T-K10c`, `T-K11a`, `T-K11b`, `T-K11c`, `T-K11h`, `T-K2d` (H3: perdedor bloqueado no `UPDATE` de `financial_titles`, não no `INSERT`, zero `40P01`) e `T-K2e`; (c) **Risco Residual 3 (`T-K11a′` sem barreira)** e **Risco Residual 1**: execute o interleaving em que `changeStatus` lê `open`, o `clear` vinculado commita inteiro e só então `changeStatus` roda o `UPDATE … WHERE status = 'open'` (sem bloqueio em `pg_stat_activity`), provando que casa 0 linhas e devolve `422 invalid_status_transition`, e que se o título foi apagado logicamente devolve `404 title_not_found`; (d) **Risco Residual 7 e H4**: confirme que `P-SAN3-20-CHECK-STATUS-X-PAID` e `P-SAN3-20-LEGADO-CHECK-SEM-CHEQUE` estão registradas com dono em `agent-orchestration/controle/pendencias.md` (não toque a base viva). Vermelho-controle: meça `M9`, `M27`, `M28` e `M30` vermelhas no seu worktree, com restauro por hash, derruba com: `grep -i -E 'Item 2|E1|executeRaw|T-K10a|T-K10b|F-DEV-02|T-K11a|T-K11h|T-K2d|40P01|P-SAN3-20-CHECK-STATUS-X-PAID|M9|M27|M28|M30|vermelho' C:/Users/AMP/w-san320/agent-orchestration/omega/juntas/votos/B-SAN3-20/cadeira-c2-evidencia.md`

Item 3 de 3 (estabilidade das suítes `-db` em 3 execuções seguidas e higiene do arnês concorrente — §5.2 C2 item 3 e Risco Residual 16): execute **3 vezes seguidas** a bateria `-db` completa do §4.6 passo 3 (`cheque-title-link-atomic-db`, `financial-title-status-cas-db`, `cheque-title-link-migration-drill-db`, `cheque-clear-bounce-atomic-db`, `financial-pay-title-atomic-db`, `financial-entry-reverse-restore-db`, `financial-entry-delete-reverse-race-db`, `financial-title-invariants-db`) sobre `jsan320-c2-pg` e prove nas 3 rodadas: **77/77 pass, `fail 0`, `skipped 0`, denominador constante (77)** e zero `40P01`. Audite o código das 3 suítes `-db` novas para confirmar que: (i) fixam `CORE_SAAS_PERSISTENCE=prisma` antes de importar a aplicação e assertam o modo; (ii) usam `application_name` escopado por teste nas barreiras (`pg-barrier.ts`) e observam o perdedor bloqueado em `pg_stat_activity` (`wait_event_type = 'Lock'`) antes de liberar (zero `sleep` cego como barreira); (iii) fazem teardown completo de tenants e de bases `san320_drill_*`. Vermelho-controle: prove que o seu verificador acusa se uma suíte for omitida (denominador ≠ 77) ou se o predicado de espera de `pg_stat_activity` num caso de barreira for corrompido numa cópia (timeout na barreira), restaurando por hash, derruba com: `grep -i -E 'Item 3|77|skipped 0|application_name|pg_stat_activity|wait_event_type|vermelho' C:/Users/AMP/w-san320/agent-orchestration/omega/juntas/votos/B-SAN3-20/cadeira-c2-evidencia.md`

Protocolo P1/P2/P3/P4/P7 do §C7.7, verbatim no bloco colado acima, com `<cadeira>` = `cadeira-c2`: apense a `cadeira-c2-evidencia.md` após CADA item; `cadeira-c2-voto.json` nasce esqueleto com os 3 itens EM APURAÇÃO e o campo `arquivos_medidos`, e fecha antes da mensagem final de 1 linha; únicos arquivos escritos por você no repositório: `cadeira-c2-evidencia.md` e `cadeira-c2-voto.json` em `C:/Users/AMP/w-san320/agent-orchestration/omega/juntas/votos/B-SAN3-20/`; nunca edite código fora do seu worktree descartável e nunca faça commit, derruba com: `test -f C:/Users/AMP/w-san320/agent-orchestration/omega/juntas/votos/B-SAN3-20/cadeira-c2-voto.json`

## MEDIDO

Pré-voo deste mandato executado com `C:/Users/AMP/erp-pausa-2026-10-03/redator-san320/mandato-preflight.sh` e `C:/Users/AMP/erp-pausa-2026-10-03/redator-san320/mandato-refs.sh` (copiados sem alteração de `C:/Users/AMP/erp-pausa-2026-10-03/redator-trc02-c2/`), pelo redator `fab-red-san320-argon` (Antigravity, Gemini 4 Argon, nível menor declarado), medido por: `cd C:/Users/AMP/w-san320 && MANDATO_REFS=C:/Users/AMP/erp-pausa-2026-10-03/redator-san320/mandato-refs.sh bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san320/mandato-preflight.sh C:/Users/AMP/w-san320/agent-orchestration/omega/juntas/votos/B-SAN3-20/00-mandatos/cadeira-c2.md 456 2>&1; echo ec=${PIPESTATUS[0]}`
```
COLAGEM    l.6-20: refs do PR #456 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-san320/agent-orchestration/omega/juntas/votos/B-SAN3-20/00-mandatos/cadeira-c2.md
ec=0
```
