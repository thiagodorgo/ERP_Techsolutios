# Mandato — Cadeira C1 (dinheiro) — B-SAN3-20 (PR 456, junta de DINHEIRO, ciclo 1)

## MEDIDO

Estado do PR 456 no instante da redação, pela ferramenta `mandato-refs.sh` copiada sem alteração de `C:/Users/AMP/erp-pausa-2026-10-03/redator-trc02-c2/` para `C:/Users/AMP/erp-pausa-2026-10-03/redator-san320/`, executada com o cwd no worktree do objeto, medido por: `cd C:/Users/AMP/w-san320 && bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san320/mandato-refs.sh 456`
```
# refs do PR #456 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-24T20:13Z · repo: thiagodorgo/ERP_Techsolutios

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

No objeto (`<objeto>`), os arquivos de código dos três módulos financeiros tocados pelo bloco (`src/modules/cheques/`, `src/modules/financial-titles/`, `src/modules/financial-entries/`, `src/modules/financial-uow/`) e as suítes que prendem K1–K6, K10 e K11 têm as contagens de linhas e de `test(` medidas abaixo; em `DELETE_UNDO_ORDER` (`src/modules/financial-entries/financial-entry-undo-owners.ts`), `cheque_link` precede `title_settlement` (D5), medido por: `cd C:/Users/AMP/w-san320 && git diff --numstat 7ab2fe71d0d40c2be51a790f0d20893651cdf972 a0f5aabca6b86aba21051baffd40c245b5ef1a05 -- src/; for p in C:/Users/AMP/w-san320/tests/cheque-title-link.test.ts C:/Users/AMP/w-san320/tests/cheque-title-link-atomic-db.test.ts C:/Users/AMP/w-san320/tests/financial-title-status-cas-db.test.ts C:/Users/AMP/w-san320/tests/financial-entry-undo-owners.test.ts; do rel=${p#C:/Users/AMP/w-san320/}; echo "$p tests=$(git show "a0f5aabca6b86aba21051baffd40c245b5ef1a05:$rel" | tr -d '\r' | grep -c -i -E '^\s*(test|it)\(')"; done; git show a0f5aabca6b86aba21051baffd40c245b5ef1a05:src/modules/financial-entries/financial-entry-undo-owners.ts | tr -d '\r' | grep -n -i -E 'DELETE_UNDO_ORDER|REVERSE_UNDO_ORDER' | head -4`
```
32	12	src/modules/cheques/cheque-prisma.repository.ts
2	0	src/modules/cheques/cheque.dto.ts
20	6	src/modules/cheques/cheque.repository.ts
107	5	src/modules/cheques/cheque.service.ts
5	0	src/modules/cheques/cheque.types.ts
6	0	src/modules/cheques/cheque.validators.ts
1	1	src/modules/financial-entries/financial-entry-undo-owners.ts
26	6	src/modules/financial-entries/financial-entry.service.ts
1	19	src/modules/financial-titles/financial-title-prisma.repository.ts
12	22	src/modules/financial-titles/financial-title.repository.ts
32	13	src/modules/financial-titles/financial-title.service.ts
1	11	src/modules/financial-titles/financial-title.types.ts
2	7	src/modules/financial-uow/financial-uow.ts
C:/Users/AMP/w-san320/tests/cheque-title-link.test.ts tests=38
C:/Users/AMP/w-san320/tests/cheque-title-link-atomic-db.test.ts tests=15
C:/Users/AMP/w-san320/tests/financial-title-status-cas-db.test.ts tests=10
C:/Users/AMP/w-san320/tests/financial-entry-undo-owners.test.ts tests=6
205:export const DELETE_UNDO_ORDER = ["reversal_pair", "cheque_link", "title_settlement"] as const;
206:export const REVERSE_UNDO_ORDER = ["reversal_pair", "cheque_link"] as const;
213: * `DELETE_UNDO_ORDER` faz `AssertSame` colapsar em `never`, e `true` não é atribuível a `never`:
216: * `REVERSE_UNDO_ORDER` NÃO é comparada com a união inteira de propósito, e a razão está escrita:
```

O relatório do dev (`C:/Users/AMP/w-san320/docs/revisoes/SAN3/B-SAN3-20-dev.md`) registra na seção "Retomada (Claude Opus)" a nota de execução **F-DEV-02** sobre o par `PATCH title_id × deposit` do §2.5 (quando o PATCH vence, o status continua `registered` e o `deposit` concorrente passa com `title_id` gravado, que é o desfecho sequencial de P2) e registra na seção R5 que `M8` é equivalente no `T-K2b` em memória (por causa do fast-fail `assertPayable` antes da UoW) e morre no `T-K2d` com barreira em Postgres, medido por: `cd C:/Users/AMP/w-san320 && p=C:/Users/AMP/w-san320/docs/revisoes/SAN3/B-SAN3-20-dev.md && git show "a0f5aabca6b86aba21051baffd40c245b5ef1a05:${p#C:/Users/AMP/w-san320/}" | tr -d '\r' | grep -n -i -o -E 'F-DEV-02 \(nota de execução sobre o §2\.5|M8 — equivalência declarada no T-K2b, morte no T-K2d'`
```
43:F-DEV-02 (nota de execução sobre o §2.5
101:M8 — equivalência declarada no T-K2b, morte no T-K2d
```

O limite declarado da propriedade P (por linha de cheque registrada, R1-02 / R9′) e a pendência `P-SAN3-20-CHEQUE-FISICO-DUPLICADO` estão registrados em `agent-orchestration/controle/decisoes.md` e `agent-orchestration/controle/pendencias.md` do objeto, medido por: `cd C:/Users/AMP/w-san320 && git show a0f5aabca6b86aba21051baffd40c245b5ef1a05:agent-orchestration/controle/decisoes.md | tr -d '\r' | grep -n -i -o -E 'D-SAN3-20-CHEQUE-SO-PELA-COMPENSACAO|por linha de cheque'; git show a0f5aabca6b86aba21051baffd40c245b5ef1a05:agent-orchestration/controle/pendencias.md | tr -d '\r' | grep -n -i -o -E '^## P-Ω4-7-DUPLA-CONTAGEM|^## P-SAN3-20-CHEQUE-FISICO-DUPLICADO'`
```
2334:D-SAN3-20-CHEQUE-SO-PELA-COMPENSACAO
3843:D-SAN3-20-CHEQUE-SO-PELA-COMPENSACAO
3851:por linha de cheque
1388:## P-Ω4-7-DUPLA-CONTAGEM
11495:## P-SAN3-20-CHEQUE-FISICO-DUPLICADO
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

Você é `jurado-san320-c1-opus`, identidade nova, executor Claude Opus (subagente do orquestrador com `model: "opus"` explícito, nível menor declarado, §C7.6) — a cadeira não-Gemini desta junta, com poder de veto, conforme decisão do dono de 24/10 (*"a c1 vc pode fazer, nao esperar o codex. temos pressa"*, `D-TOPO-E-O-CLAUDE`). O seu corpo canônico é `C:/Users/AMP/w-san320/.claude/agents/especialistas/jurado-san320-c1-dinheiro.md` no blob do objeto `a0f5aabca6b86aba21051baffd40c245b5ef1a05` (idêntico ao espelho `C:/Users/AMP/w-san320/.agents/agents/especialistas/jurado-san320-c1-dinheiro.md`, medido acima). Regra de esgotamento: se o Claude Opus esgotar (limite, 429, fila parada), termine o comando em curso, grave `## PAUSA <hora UTC>` em `cadeira-c1-evidencia.md` (P7) e **PARE** sem votar (§C7.6-bis: abaixo de Opus não há degrau — nunca Sonnet/Haiku; se um novo subagente Claude Opus de identidade nova retomar depois, ele re-executa cada comando registrado pela P3 antes de medir a cauda). Na primeira linha de `cadeira-c1-evidencia.md`, declare executor efetivo, modelo, nível, objeto, `mandato_md5` deste arquivo (`tr -d '\r' < <mandato> | md5sum`) e o veredito EOL-neutro (`IDENTICO`/`DIVERGE`) do corpo carregado contra o blob do objeto. Confirme que o seu nome não coincide com nenhum inelegível (`planejador-san3-20-astra`, `planejador-san3-20-fable`, críticos r1/r2, `dev-san3-20`, `dev-san320-opus`, `fab-red-san320-argon`, `insp-san320-argon`, `jurado-san320-c2-pro`, `jurado-san320-c3-argon`, orquestrador). Tudo no plano v3, nas críticas r1/r2 e no relatório do dev é **A RE-VERIFICAR**, derruba com: `head -1 C:/Users/AMP/w-san320/agent-orchestration/omega/juntas/votos/B-SAN3-20/cadeira-c1-evidencia.md | grep -i -E 'executor|opus|mandato_md5|IDENTICO|DIVERGE'`

Legalidade, régua e isolamento de terreno: só comece o mérito após ler `insp-san320-parecer.md` com `LIBERADO` ou `LIBERADO COM RESSALVA` e confirmar que o objeto continua sendo `a0f5aabca6b86aba21051baffd40c245b5ef1a05` com todos os check-runs concluídos. Régua: bloco de **DINHEIRO** — unanimidade de 3 cadeiras com poder de veto (§C7 item 8(1)), teto de 2 ciclos (item 8(2)), **ciclo 1** (qualquer achado `bloqueia` com escopo `dentro-do-bloco` reprova); todo achado declara `gravidade` (`bloqueia` | `ajuste` | `nota`), `escopo` (`dentro-do-bloco` | `pre-existente` com commit/data de origem e pendência com dono, §C7.1-ter(a)), `classe`, comando, saída e N/forma; todo voto declara `arquivos_medidos` (§C7 item 9(0), sem globs `**`); "não consigo medir" item seu = `REPROVADO`; não proponha correção (§C7.4-bis); não cobre KPI (`Kpis/**` está congelado, item 8(5)); não abra votos de outras cadeiras antes de fechar o seu. Terreno: crie worktree próprio `C:/Users/AMP/w-jsan320-c1` em `--detach a0f5aabca6b86aba21051baffd40c245b5ef1a05`, com `npm ci` próprio, `npm run db:generate` (Emenda E1) e zero junction de `node_modules` (§C7.1-ter(c)); suba Postgres 16 descartável próprio `jsan320-c1-pg` em `127.0.0.1` numa porta alta livre (ex.: `55441`), respeitando o orçamento P8 (commit livre ≥ 4 GB, no máximo 2 trabalhos Docker simultâneos excluídos `erp-*`, no máximo 3 subagentes Claude vivos) e nunca tocando a base viva (`erp-postgres`/`erp-redis`, portas `5432`/`6379`); ao final, restaure qualquer mutação provando `git hash-object` igual ao blob do objeto, remova `jsan320-c1-pg` e remova `C:/Users/AMP/w-jsan320-c1` com `git worktree remove --force`, derruba com: `grep -i -E 'w-jsan320-c1|jsan320-c1-pg|arquivos_medidos|gravidade|escopo|teardown' C:/Users/AMP/w-san320/agent-orchestration/omega/juntas/votos/B-SAN3-20/cadeira-c1-voto.json`

Item 1 de 3 (sondas próprias de K2, K3, K5 e Risco Residual 9 — §5.2 C1 item 1): no seu worktree e no seu Postgres descartável `jsan320-c1-pg` (e em memória/HTTP), execute as suítes `C:/Users/AMP/w-san320/tests/cheque-title-link.test.ts` e `C:/Users/AMP/w-san320/tests/cheque-title-link-atomic-db.test.ts` **e** rode sondas próprias para provar: (a) **K2**: `clear` de cheque vinculado (`received`/`receivable` e `issued`/`payable`, integral e parcial) cria exatamente 1 lançamento (`payment_method = 'check'`, `category = 'cheque_clearing'`, `title_id = <t>`), vincula `cleared_entry_id`, incrementa `paid_amount` e deriva o status do título na mesma transação; quando o título já está pago (`title_already_paid`), cancelado (`title_cancelled`), excede o saldo (`overpayment`) ou foi apagado logicamente entre o vínculo e o `clear` (`404 title_not_found`), o cheque permanece `deposited` com `cleared_entry_id IS NULL` e zero lançamento nasce; (b) **K3**: `bounce` após `clear` cria contra-lançamento `cheque_bounce` **sem `title_id`**, restaura `paid_amount` e status do título na mesma transação e zera o saldo líquido; (c) **Risco Residual 9 (pagamento misto + `bounce`)**: sonda própria com título de 300 pago 100 por cheque vinculado (`/clear`) e 200 por `pix` (`/pay` → `paid`, `paid_amount = 300`), seguido de `/bounce` do cheque de 100 → `restorePaymentGuarded(100)` leva o título a `partially_paid` com `paid_amount = 200` e preserva o lançamento `pix`; (d) **K5**: os 4 cenários do roteiro de reprodução (`receivable`/`payable` × `pay(check) → clear` e `clear → pay(check)`) com cheque vinculado nos dois executores (HTTP/memória e Postgres) dão saldo `±100` pela rota real `GET /api/v1/financial-accounts/:id/balance`, 1 único lançamento com `title_id`, `paid_amount = 100` e a 2ª porta recusada. Vermelho-controle: meça `M6`, `M7`, `M8` (verificando a equivalência em `T-K2b` e a morte em `T-K2d` sob barreira), `M10`, `M11` e `M16`, com restauro provado por hash, derruba com: `grep -i -E 'Item 1|K2|K3|K5|misto|partially_paid|M6|M7|M8|M10|M11|M16|vermelho' C:/Users/AMP/w-san320/agent-orchestration/omega/juntas/votos/B-SAN3-20/cadeira-c1-evidencia.md`

Item 2 de 3 (K4 nas portas públicas, K10 e K11 pelas sondas r1/r2 refeitas, F-DEV-02 e Riscos Residuais 1 e 10 — §5.2 C1 item 2): prove por execução: (a) **K4**: `POST /api/v1/financial-titles/:id/pay` e `POST /api/v1/financial-entries` com `payment_method = 'check'` recusam `422 cheque_required` (resposta do dono Q1 = A), respeitando a precedência de erros do §1 (`title_already_paid` precede `cheque_required` no `/pay`; `400` de corpo e `400/422` de conta precedem `cheque_required` no `/financial-entries`; `cheque_required` precede `period_closed` nos dois), enquanto outros métodos e a escrita pelo repositório na compensação seguem funcionando (R1-08); (b) **K10 (`sonda-r101.mts` refeita, D1′) e F-DEV-02**: `PATCH /cheques/:id` e `DELETE /cheques/:id` levam `status = 'registered'` no predicado; sob corrida com `deposit`+`clear` (`T-K10a`/`T-K10e`), o `PATCH` casa 0 linhas, relê e devolve `422 cheque_not_editable` (ou `404` se apagado), deixando o cheque `cleared` com `title_id IS NULL`; meça as duas ordens de `PATCH title_id × deposit` (`T-K10b`) e **julgue F-DEV-02** (quando o `PATCH` vence, ele mantém `status = 'registered'` e o `deposit` concorrente passa com `title_id` gravado — o mesmo desfecho sequencial de P2); (c) **K11 (`sonda-r201.mts` forma A refeita, D8a) e Risco Residual 1**: em `C:/Users/AMP/w-san320/tests/financial-title-status-cas-db.test.ts` e em sonda própria, `clear` vinculado segurando o lock do título após o CAS × `changeStatus(open → cancelled)` bloqueado em `pg_stat_activity` resulta em 0 linhas no `UPDATE … WHERE status = 'open'`, releitura e `422 invalid_status_transition`, título `paid`/100 e o `bounce` seguinte (`T-K11c`) restaurando o título a `open`/0; valide os **4 desfechos** da classificação do 0-linhas em `changeStatus` (`422 invalid_status_transition`, 1 retentativa vencedora, `409 title_status_conflict` em 3 mudanças forçadas no `T-K11h`, e **`404 title_not_found` quando o título é apagado logicamente concorrentemente** — nunca `409`); (d) **Risco Residual 10**: confirme no código e por execução (`T-K10d`, `T-K11d`) que o check-and-set em memória de cheque e de título é síncrono no `Map` (sem `await` entre ler e gravar). Vermelho-controle: meça `M12`, `M13`, `M14`, `M27`, `M29`, `M30`, `M31`, `M33` e `M37` vermelhas no seu worktree, com restauro por hash, derruba com: `grep -i -E 'Item 2|K4|cheque_required|K10|F-DEV-02|K11|title_status_conflict|404|M12|M13|M14|M27|M29|M30|M31|M33|M37|vermelho' C:/Users/AMP/w-san320/agent-orchestration/omega/juntas/votos/B-SAN3-20/cadeira-c1-evidencia.md`

Item 3 de 3 (K6 — imutabilidade com `reason` — e limites publicados de P e P2 — §5.2 C1 item 3): prove por execução em memória e no Postgres (`T-K6a`, `T-K6b`, `T-K6c`, `T-K6d` e `tests/financial-entry-undo-owners.test.ts` 6/6) que o lançamento de compensação de um cheque vinculado (tem `title_id` e é `cleared_entry_id`) é recusado em `DELETE /api/v1/financial-entries/:id` e `POST /api/v1/financial-entries/:id/reverse` com `422` e **`reason = 'cheque_entry_immutable'`** (ordem D5: `["reversal_pair", "cheque_link", "title_settlement"]`), enquanto um lançamento de liquidação sem cheque continua recusando `DELETE` com `settlement_entry_immutable` e permitindo `reverse` (`T-K6b`). Em seguida, confirme por execução (dois `POST /cheques` com mesmo número/banco/conta/valor → dois ids distintos) e por leitura de `agent-orchestration/controle/decisoes.md` (`D-SAN3-20-CHEQUE-SO-PELA-COMPENSACAO`) e `agent-orchestration/controle/pendencias.md` (`P-Ω4-7-DUPLA-CONTAGEM` e `P-SAN3-20-CHEQUE-FISICO-DUPLICADO`) que o enunciado publicado da propriedade **P** declara explicitamente o limite do §2.2 (**por linha de cheque registrada**, nunca por instrumento físico) e que **P2** declara a enumeração de writers do §2.5, nunca prometendo mais do que a prova executada garante. Vermelho-controle: meça `M17` (`title_settlement` antes de `cheque_link` → `T-K6a` falha no `reason`) e `M18` (`cheque_link` fora da ordem → `npm run check` falha com erro TS), restaurando por hash, derruba com: `grep -i -E 'Item 3|K6|cheque_entry_immutable|settlement_entry_immutable|M17|M18|P-SAN3-20-CHEQUE-FISICO-DUPLICADO|por linha de cheque|vermelho' C:/Users/AMP/w-san320/agent-orchestration/omega/juntas/votos/B-SAN3-20/cadeira-c1-evidencia.md`

Protocolo P1/P2/P3/P4/P7 do §C7.7, verbatim no bloco colado acima, com `<cadeira>` = `cadeira-c1`: apense a `cadeira-c1-evidencia.md` após CADA item; `cadeira-c1-voto.json` nasce esqueleto com os 3 itens EM APURAÇÃO e o campo `arquivos_medidos`, e fecha antes da mensagem final de 1 linha; únicos arquivos escritos por você no repositório: `cadeira-c1-evidencia.md` e `cadeira-c1-voto.json` em `C:/Users/AMP/w-san320/agent-orchestration/omega/juntas/votos/B-SAN3-20/`; nunca edite código fora do seu worktree descartável e nunca faça commit, derruba com: `test -f C:/Users/AMP/w-san320/agent-orchestration/omega/juntas/votos/B-SAN3-20/cadeira-c1-voto.json`

## MEDIDO

Pré-voo deste mandato executado com `C:/Users/AMP/erp-pausa-2026-10-03/redator-san320/mandato-preflight.sh` e `C:/Users/AMP/erp-pausa-2026-10-03/redator-san320/mandato-refs.sh` (copiados sem alteração de `C:/Users/AMP/erp-pausa-2026-10-03/redator-trc02-c2/`), pelo redator `fab-red-san320-argon` (Antigravity, Gemini 4 Argon, nível menor declarado), medido por: `cd C:/Users/AMP/w-san320 && MANDATO_REFS=C:/Users/AMP/erp-pausa-2026-10-03/redator-san320/mandato-refs.sh bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san320/mandato-preflight.sh C:/Users/AMP/w-san320/agent-orchestration/omega/juntas/votos/B-SAN3-20/00-mandatos/cadeira-c1.md 456 2>&1; echo ec=${PIPESTATUS[0]}`
```
COLAGEM    l.6-20: refs do PR #456 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-san320/agent-orchestration/omega/juntas/votos/B-SAN3-20/00-mandatos/cadeira-c1.md
ec=0
```
