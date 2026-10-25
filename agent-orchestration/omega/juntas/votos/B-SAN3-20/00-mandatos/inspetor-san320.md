# Mandato — Inspetor de terreno — B-SAN3-20 (PR 456, junta de DINHEIRO, ciclo 1)

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

As duas ferramentas do pré-voo em `C:/Users/AMP/erp-pausa-2026-10-03/redator-san320/` foram copiadas sem nenhuma alteração de `C:/Users/AMP/erp-pausa-2026-10-03/redator-trc02-c2/` (comparação byte a byte abaixo), medido por: `for b in mandato-preflight.sh mandato-refs.sh; do cmp -s C:/Users/AMP/erp-pausa-2026-10-03/redator-trc02-c2/$b C:/Users/AMP/erp-pausa-2026-10-03/redator-san320/$b && echo "$b IDENTICO" || echo "$b DIVERGE"; done`
```
mandato-preflight.sh IDENTICO
mandato-refs.sh IDENTICO
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

Todos os insumos do briefing estão versionados no objeto (`<objeto>`): o plano v3 com a resposta do dono à Q1 e a Emenda E1 (`C:/Users/AMP/w-san320/docs/revisoes/SAN3/B-SAN3-20-plano.md`), as críticas r1 e r2 (`C:/Users/AMP/w-san320/docs/revisoes/SAN3/B-SAN3-20-critica-r1.md`, `C:/Users/AMP/w-san320/docs/revisoes/SAN3/B-SAN3-20-critica-r2.md`), o relatório do dev com a retomada em Claude Opus, os vermelhos-controle e a falsificação F-DEV-02 (`C:/Users/AMP/w-san320/docs/revisoes/SAN3/B-SAN3-20-dev.md`), a fixture do drift K12 (`C:/Users/AMP/w-san320/tests/fixtures/prisma-migrate-diff-baseline.sql`, 76 linhas iniciadas por `ALTER|CREATE|DROP`), o comando do bloco (`C:/Users/AMP/w-san320/agent-orchestration/codex/comandos/B-SAN3-20-cheque-x-baixa.md`), os 3 corpos de cadeira nos dois espelhos e o corpo do inspetor de terreno nos dois espelhos (`.claude/agents/inspetor-de-terreno-da-junta.md` e `.agents/agents/inspetor-de-terreno-da-junta.md`, que fixam `model: opus` no frontmatter), medido por: `cd C:/Users/AMP/w-san320 && for p in C:/Users/AMP/w-san320/docs/revisoes/SAN3/B-SAN3-20-plano.md C:/Users/AMP/w-san320/docs/revisoes/SAN3/B-SAN3-20-critica-r1.md C:/Users/AMP/w-san320/docs/revisoes/SAN3/B-SAN3-20-critica-r2.md C:/Users/AMP/w-san320/docs/revisoes/SAN3/B-SAN3-20-dev.md C:/Users/AMP/w-san320/tests/fixtures/prisma-migrate-diff-baseline.sql C:/Users/AMP/w-san320/agent-orchestration/codex/comandos/B-SAN3-20-cheque-x-baixa.md C:/Users/AMP/w-san320/.claude/agents/especialistas/jurado-san320-c1-dinheiro.md C:/Users/AMP/w-san320/.agents/agents/especialistas/jurado-san320-c1-dinheiro.md C:/Users/AMP/w-san320/.claude/agents/especialistas/jurado-san320-c2-banco-migracao.md C:/Users/AMP/w-san320/.agents/agents/especialistas/jurado-san320-c2-banco-migracao.md C:/Users/AMP/w-san320/.claude/agents/especialistas/jurado-san320-c3-regressao.md C:/Users/AMP/w-san320/.agents/agents/especialistas/jurado-san320-c3-regressao.md C:/Users/AMP/w-san320/.claude/agents/inspetor-de-terreno-da-junta.md C:/Users/AMP/w-san320/.agents/agents/inspetor-de-terreno-da-junta.md; do rel=${p#C:/Users/AMP/w-san320/}; git cat-file -e "a0f5aabca6b86aba21051baffd40c245b5ef1a05:$rel" && echo "PRESENTE $p" || echo "AUSENTE $p"; done; p=C:/Users/AMP/w-san320/tests/fixtures/prisma-migrate-diff-baseline.sql && echo "linhas DDL na fixture K12: $(git show "a0f5aabca6b86aba21051baffd40c245b5ef1a05:${p#C:/Users/AMP/w-san320/}" | grep -c -i -E '^(ALTER|CREATE|DROP)')"; git show a0f5aabca6b86aba21051baffd40c245b5ef1a05:.claude/agents/inspetor-de-terreno-da-junta.md | tr -d '\r' | grep -i -E '^model:'`
```
PRESENTE C:/Users/AMP/w-san320/docs/revisoes/SAN3/B-SAN3-20-plano.md
PRESENTE C:/Users/AMP/w-san320/docs/revisoes/SAN3/B-SAN3-20-critica-r1.md
PRESENTE C:/Users/AMP/w-san320/docs/revisoes/SAN3/B-SAN3-20-critica-r2.md
PRESENTE C:/Users/AMP/w-san320/docs/revisoes/SAN3/B-SAN3-20-dev.md
PRESENTE C:/Users/AMP/w-san320/tests/fixtures/prisma-migrate-diff-baseline.sql
PRESENTE C:/Users/AMP/w-san320/agent-orchestration/codex/comandos/B-SAN3-20-cheque-x-baixa.md
PRESENTE C:/Users/AMP/w-san320/.claude/agents/especialistas/jurado-san320-c1-dinheiro.md
PRESENTE C:/Users/AMP/w-san320/.agents/agents/especialistas/jurado-san320-c1-dinheiro.md
PRESENTE C:/Users/AMP/w-san320/.claude/agents/especialistas/jurado-san320-c2-banco-migracao.md
PRESENTE C:/Users/AMP/w-san320/.agents/agents/especialistas/jurado-san320-c2-banco-migracao.md
PRESENTE C:/Users/AMP/w-san320/.claude/agents/especialistas/jurado-san320-c3-regressao.md
PRESENTE C:/Users/AMP/w-san320/.agents/agents/especialistas/jurado-san320-c3-regressao.md
PRESENTE C:/Users/AMP/w-san320/.claude/agents/inspetor-de-terreno-da-junta.md
PRESENTE C:/Users/AMP/w-san320/.agents/agents/inspetor-de-terreno-da-junta.md
linhas DDL na fixture K12: 76
model: opus
```

Os scripts e logs brutos do vermelho-controle e dos roteiros K5 da retomada do dev também existem fora do worktree, em `C:/Users/AMP/erp-pausa-2026-10-03/revisoes/B-SAN3-20-dev-evidencia/`, medido por: `ls C:/Users/AMP/erp-pausa-2026-10-03/revisoes/B-SAN3-20-dev-evidencia/`
```
mutacoes.jsonl
mutacoes.log
mutacoes.py
roteiro-k5-db.mts
roteiro-k5-http.mts
```

Nenhuma das identidades desta junta (`insp-san320-argon`, `jurado-san320-c1-opus`, `jurado-san320-c2-pro`, `jurado-san320-c3-argon`) nem a fábrica/redator (`fab-red-san320-argon`) consta no obituário de identidades (`agent-orchestration/omega/juntas/OBITUARIO-IDENTIDADES.md`) ou em atas anteriores (`agent-orchestration/omega/juntas/`); os papéis exercidos antes da junta no bloco são o planejador (`planejador-san3-20-astra`, `planejador-san3-20-fable`), os dois críticos r1 e r2 (Codex GPT-5.6 Sol), os dois devs (`dev-san3-20` Codex e `dev-san320-opus` Claude Opus) e esta fábrica/redator (`fab-red-san320-argon`), medido por: `cd C:/Users/AMP/w-san320 && git show a0f5aabca6b86aba21051baffd40c245b5ef1a05:agent-orchestration/omega/juntas/OBITUARIO-IDENTIDADES.md | grep -c -i -E 'san3-?20'; git grep -c -i -E 'insp-san320-argon|jurado-san320-c1-opus|jurado-san320-c2-pro|jurado-san320-c3-argon|fab-red-san320-argon' a0f5aabca6b86aba21051baffd40c245b5ef1a05 -- agent-orchestration/omega/juntas/ || echo "0 ocorrencias em atas"; p1=C:/Users/AMP/w-san320/docs/revisoes/SAN3/B-SAN3-20-plano.md && p2=C:/Users/AMP/w-san320/docs/revisoes/SAN3/B-SAN3-20-dev.md && { git show "a0f5aabca6b86aba21051baffd40c245b5ef1a05:${p1#C:/Users/AMP/w-san320/}"; git show "a0f5aabca6b86aba21051baffd40c245b5ef1a05:${p2#C:/Users/AMP/w-san320/}"; } | tr -d '\r' | grep -o -i -E '(planejador|critico|dev)-san3-?20[a-z0-9-]*' | sort -u`
```
0
0 ocorrencias em atas
dev-san3-20b
dev-san320
dev-san320-opus
dev-san320-pg
planejador-san3-20-astra
planejador-san3-20-fable
```

A árvore do worktree `C:/Users/AMP/w-san320` está no objeto (`<objeto>`), com zero caminhos rastreados modificados, `scripts/sync-agent-agents.mjs --check` verde (`ec=0`) e, como não rastreado, apenas o diretório `C:/Users/AMP/w-san320/agent-orchestration/omega/juntas/votos/B-SAN3-20/` onde estes mandatos são gerados, medido por: `cd C:/Users/AMP/w-san320 && git rev-parse HEAD && git status --short -uno | wc -l && git status --short | grep -v -i -E '^\?\? .*B-SAN3-20' | wc -l && node scripts/sync-agent-agents.mjs --check`
```
a0f5aabca6b86aba21051baffd40c245b5ef1a05
0
0
[agents-sync] OK — 79 agentes, espelho consistente.
```

No instante da redação, a memória de commit livre (GB), o número de grupos de trabalho Docker alheios vivos (excluídos os `erp-*` da base viva), o número de containers `erp-*`, o espaço livre em disco e a lista de worktrees da máquina eram os abaixo; no contrato (`CLAUDE.md`), a P8 fixa commit livre de pelo menos 4 GB, no máximo 3 subagentes Claude e teto de 2 trabalhos Docker, e o §C7 item 9 (0) exige `arquivos_medidos` em todo voto, medido por: `powershell.exe -NoProfile -Command '$o=Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory; [math]::Round(($o.CommitLimit-$o.CommittedBytes)/1GB,2)'; docker ps --format '{{.Names}}' | grep -v -i -E '^erp-' | sed -E 's#-(pg|redis|run|net)$##' | sort -u | wc -l; docker ps --format '{{.Names}}' | grep -c -i -E '^erp-'; df -h /c | tail -1 | awk '{print $4}'; git -C C:/Users/AMP/w-san320 worktree list | awk '{print $1}'; git -C C:/Users/AMP/w-san320 show a0f5aabca6b86aba21051baffd40c245b5ef1a05:CLAUDE.md | tr -d '\r' | grep -n -i -o -E 'memória de commit livre ≥ 4 GB|subagentes Claude\*\* ao mesmo tempo|Docker segue com teto de 2 trabalhos|\(0\) Todo voto de cadeira declara .arquivos_medidos.'`
```
14,88
0
2
9.2G
C:/Users/AMP/Documents/GitHub/ERP_Techsolutios
C:/Users/AMP/w-agapi2
C:/Users/AMP/w-kpi24
C:/Users/AMP/w-plan21
C:/Users/AMP/w-san320
C:/Users/AMP/w-trc02
719:memória de commit livre ≥ 4 GB
720:subagentes Claude** ao mesmo tempo
720:Docker segue com teto de 2 trabalhos
817:(0) Todo voto de cadeira declara `arquivos_medidos`
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

Você é `insp-san320-argon`, identidade nova, executor Antigravity (`agy`), modelo `gemini-4-argon` (esforço medium, nível menor declarado, §C7.6). Você compartilha o modelo `gemini-4-argon` com `fab-red-san320-argon` (fábrica/redator) e com a cadeira C3 (`jurado-san320-c3-argon`), mas tem **identidade distinta** e não vota nem julga mérito (julga apenas a legalidade e limpeza do tabuleiro, §C7.1-bis) — declare isso para a ata. O corpo `.claude/agents/inspetor-de-terreno-da-junta.md` fixa `model: opus` no frontmatter (medido acima); nesta junta o executor é o Argon por composição do orquestrador sob a ordem do dono ("use o Argon", `D-IAS-EXTERNAS-PRIMEIRO`) — divergência declarada, que você registra no parecer; carregue o corpo do blob do objeto (`a0f5aabca6b86aba21051baffd40c245b5ef1a05:.claude/agents/inspetor-de-terreno-da-junta.md`, idêntico ao espelho `.agents/agents/inspetor-de-terreno-da-junta.md`). Regra de esgotamento: se o Argon esgotar (limite, 429, fila parada), termine o comando em curso, grave `## PAUSA <hora UTC>` em `insp-san320-evidencia.md` (P7) e pare SEM emitir parecer; o orquestrador lança um sucessor em Claude Opus (`model: "opus"` explícito, identidade nova), que re-executa os comandos registrados (P3); se o Claude Opus esgotar, **PARA** (§C7.6-bis). Na primeira linha de `insp-san320-evidencia.md`, declare executor efetivo, modelo, nível, objeto e `mandato_md5` deste arquivo (`tr -d '\r' < <mandato> | md5sum`). Tudo no plano v3, nas críticas r1/r2 e no relatório do dev é **A RE-VERIFICAR**. Régua da junta que você libera: bloco `B-SAN3-20` = junta de **DINHEIRO**, inspetor + 3 cadeiras com poder de veto, **unanimidade de 3** (§C7 item 8(1)), teto de 2 ciclos (item 8(2)), **ciclo 1** (todo achado `bloqueia` com escopo `dentro-do-bloco` reprova), `escopo` + `gravidade` por achado (§C7.1-ter(a)), `arquivos_medidos` em todo voto (§C7 item 9(0)), derruba com: `head -1 C:/Users/AMP/w-san320/agent-orchestration/omega/juntas/votos/B-SAN3-20/insp-san320-evidencia.md | grep -i -E 'executor|gemini-4-argon|mandato_md5|objeto'`

Item 1 de 3 (objeto, CI, pré-voo dos 4 mandatos, corpos, espelho S0 e baseline `npm run check`): resolva o objeto por duas fontes (`git -C C:/Users/AMP/w-san320 ls-remote origin refs/heads/fix/cheque-x-baixa` e `gh pr view 456 --json headRefOid`) e confirme que coincidem com `a0f5aabca6b86aba21051baffd40c245b5ef1a05`; confirme que TODOS os check-runs do objeto estão `completed` e `success`, incluindo `backend`, `backend-postgres` e `frontend` (check-run ausente, `queued`, `in_progress` ou `cancelled` = `BLOQUEADO`, §C7.1-bis 4.3); confirme `mergeable` em `gh pr view 456 --json mergeable`; rode o pré-voo dos 4 mandatos (`inspetor-san320.md`, `cadeira-c1.md`, `cadeira-c2.md`, `cadeira-c3.md`) com `C:/Users/AMP/erp-pausa-2026-10-03/redator-san320/mandato-preflight.sh` e `MANDATO_REFS=C:/Users/AMP/erp-pausa-2026-10-03/redator-san320/mandato-refs.sh` e exija `PRE-VOO OK` nos quatro; confira no objeto, de forma EOL-neutra e descontado o preâmbulo Codex, os 3 corpos de cadeira (`jurado-san320-c1-dinheiro.md`, `jurado-san320-c2-banco-migracao.md`, `jurado-san320-c3-regressao.md`) nos dois espelhos e rode `node C:/Users/AMP/w-san320/scripts/sync-agent-agents.mjs --check` (`ec=0`, item 4.1); meça `npm run check` (`ec=0`, item 4.2) no head com a árvore limpa (`git status --short -uno` vazio), derruba com: `grep -i -E 'Item 1|check-runs|backend-postgres|PRE-VOO OK|sync-agent-agents|npm run check|LIBERADO|BLOQUEADO' C:/Users/AMP/w-san320/agent-orchestration/omega/juntas/votos/B-SAN3-20/insp-san320-parecer.md`

Item 2 de 3 (insumos obrigatórios §5.2, resposta do dono à Q1, Emenda E1, F-DEV-02, composição e inelegibilidade §C7.4-bis): confirme no blob do objeto a presença do plano v3 (`C:/Users/AMP/w-san320/docs/revisoes/SAN3/B-SAN3-20-plano.md`) com a **resposta literal do dono à Q1 apensada** (*"A: só pela compensação (Recomendado)"* — §5.2 manda bloquear sem isso) e a **Emenda E1** (passo −1: `npm run db:generate` antes do baseline, respondendo a `F-DEV-01`), das críticas r1 e r2, do relatório do dev (`C:/Users/AMP/w-san320/docs/revisoes/SAN3/B-SAN3-20-dev.md`) com as 32 mutações planejadas + M5 medidas, a equivalência de M8 no T-K2b (morta no T-K2d) e a falsificação **F-DEV-02** (que a junta julga), da fixture K12 (`C:/Users/AMP/w-san320/tests/fixtures/prisma-migrate-diff-baseline.sql`, 76 linhas DDL) e da entrada `D-SAN3-20-CHEQUE-SO-PELA-COMPENSACAO` em `agent-orchestration/controle/decisoes.md`. Cruze em `agent-orchestration/omega/juntas/OBITUARIO-IDENTIDADES.md` e nas atas anteriores e confirme que nenhuma das 4 identidades desta junta (`insp-san320-argon`, `jurado-san320-c1-opus`, `jurado-san320-c2-pro`, `jurado-san320-c3-argon`) coincide com os inelegíveis: planejadores (`planejador-san3-20-astra`, `planejador-san3-20-fable`), críticos r1/r2 (Codex), devs (`dev-san3-20` Codex, `dev-san320-opus` Claude Opus), fábrica/redator (`fab-red-san320-argon`), orquestrador, ou entre si. Registre a composição decidida pelo orquestrador: C1 dinheiro `jurado-san320-c1-opus` em Claude Opus (subagente do orquestrador, cadeira não-Gemini com veto, autorizada pelo dono em 24/10: *"a c1 vc pode fazer, nao esperar o codex. temos pressa"*); C2 banco + migração `jurado-san320-c2-pro` em Gemini 3.1 Pro pela API (`run-gemini-visivel.ps1`, teto US$ 5); C3 regressão/escopo/registro `jurado-san320-c3-argon` em Antigravity `gemini-4-argon`, derruba com: `grep -i -E 'Item 2|Q1|D-SAN3-20-CHEQUE-SO-PELA-COMPENSACAO|Emenda E1|F-DEV-02|fixture|OBITUARIO|ineleg|jurado-san320-c1-opus|jurado-san320-c2-pro|jurado-san320-c3-argon' C:/Users/AMP/w-san320/agent-orchestration/omega/juntas/votos/B-SAN3-20/insp-san320-parecer.md`

Item 3 de 3 (isolamento de terreno, bancos descartáveis, orçamento P8 e plano de quórum): confirme que `C:/Users/AMP/w-san320` não tem mutação viva e que os 3 mandatos de cadeira exigem: (i) worktree exclusivo por cadeira (`C:/Users/AMP/w-jsan320-c1`, `C:/Users/AMP/w-jsan320-c2`, `C:/Users/AMP/w-jsan320-c3`) em `--detach <objeto>`, com `npm ci` próprio, `npm run db:generate` (Emenda E1) e zero junction de `node_modules` (§C7.1-ter(c)), removido ao fim por `git worktree remove --force`; (ii) Postgres 16 descartável próprio por cadeira que mede banco (`jsan320-c1-pg`, `jsan320-c2-pg`, `jsan320-c3-pg`) publicado apenas em `127.0.0.1` numa porta alta livre (ex.: `55441`, `55442`, `55443`), bases de drill `jsan320_c2_*` removidas ao fim, e proibição absoluta de tocar a base viva (`erp-postgres`, `erp-redis`) e as portas `5432`, `6379`, `3000`, `5173`, `5050` e `8899`; (iii) orçamento P8 verificado antes de cada subida (memória de commit livre ≥ 4 GB, no máximo 2 trabalhos Docker simultâneos excluídos os `erp-*`, no máximo 3 subagentes Claude vivos, P5 no máximo 2 cadeiras em paralelo); (iv) plano de perda de jurado declarado (braço esgotado → `## PAUSA` na evidência pela P7 + registro em `00-quedas.md` pela P6 + sucessor Claude Opus de identidade nova re-executando pela P3; Opus esgotado → PARA, §C7.6-bis). Reporte worktrees/containers alheios como resíduo inerte sem tocá-los, derruba com: `grep -i -E 'Item 3|w-jsan320-|jsan320-c|127.0.0.1|5432|6379|erp-postgres|commit livre|4 GB|P3|P5|P6|P7|P8' C:/Users/AMP/w-san320/agent-orchestration/omega/juntas/votos/B-SAN3-20/insp-san320-parecer.md`

Protocolo P1/P2/P3/P4/P7 do §C7.7, verbatim no bloco colado acima, com `<cadeira>` = `insp-san320` e o parecer no lugar do voto: apense a `insp-san320-evidencia.md` após CADA item (comando · saída resumida · veredito parcial); `insp-san320-parecer.md` nasce esqueleto com os 3 itens EM APURAÇÃO e fecha com `LIBERADO`, `LIBERADO COM RESSALVA` ou `BLOQUEADO` antes da mensagem final de 1 linha; únicos arquivos escritos por você: `insp-san320-evidencia.md` e `insp-san320-parecer.md` em `C:/Users/AMP/w-san320/agent-orchestration/omega/juntas/votos/B-SAN3-20/`; nunca edite código e nunca faça commit, derruba com: `test -f C:/Users/AMP/w-san320/agent-orchestration/omega/juntas/votos/B-SAN3-20/insp-san320-parecer.md`

## MEDIDO

Pré-voo deste mandato executado com `C:/Users/AMP/erp-pausa-2026-10-03/redator-san320/mandato-preflight.sh` e `C:/Users/AMP/erp-pausa-2026-10-03/redator-san320/mandato-refs.sh` (copiados sem alteração de `C:/Users/AMP/erp-pausa-2026-10-03/redator-trc02-c2/`), pelo redator `fab-red-san320-argon` (Antigravity, Gemini 4 Argon, nível menor declarado), medido por: `cd C:/Users/AMP/w-san320 && MANDATO_REFS=C:/Users/AMP/erp-pausa-2026-10-03/redator-san320/mandato-refs.sh bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san320/mandato-preflight.sh C:/Users/AMP/w-san320/agent-orchestration/omega/juntas/votos/B-SAN3-20/00-mandatos/inspetor-san320.md 456 2>&1; echo ec=${PIPESTATUS[0]}`
```
COLAGEM    l.6-20: refs do PR #456 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-san320/agent-orchestration/omega/juntas/votos/B-SAN3-20/00-mandatos/inspetor-san320.md
ec=0
```
