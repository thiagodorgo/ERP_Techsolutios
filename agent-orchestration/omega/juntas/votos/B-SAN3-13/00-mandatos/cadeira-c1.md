# Mandato — Cadeira C1 — B-SAN3-13 ciclo 1 (junta de DADO)

## MEDIDO

Estado do PR 460 no instante da redação, pela ferramenta `mandato-refs.sh` copiada sem mudança para a pasta própria do redator `C:/Users/AMP/erp-pausa-2026-10-03/redator-san313/`, com o cwd no worktree do objeto (ec 0: o head do PR, a merge-base, 14 check-runs, nenhum não verde, e nenhuma ata ainda), medido por: `cd C:/Users/AMP/w-san313 && bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san313/mandato-refs.sh 460`
```
# refs do PR #460 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-25T18:33Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            fix/mobile-minhas-os
base:            origin/main
estado:          OPEN | rascunho=false | MERGEABLE
head do PR:      ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d
merge-base:      b08c755719a6cb0ed192fa04e549ac5fc67a3e67
merge commit:    <ainda nao mergeado>
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   AUSENTE — nenhuma ata nomeia nem menciona #460
                 (a junta nao votou, ou a ata nao esta em origin/main nem no head do PR)

```

O ramo remoto aponta para o mesmo SHA que o PR declara como head (segunda fonte do objeto), medido por: `git -C C:/Users/AMP/w-san313 ls-remote origin refs/heads/fix/mobile-minhas-os`
```
ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d	refs/heads/fix/mobile-minhas-os
```

Os check-runs do head do PR estão todos concluídos e `SUCCESS` (o total, os fora de `COMPLETED`/`SUCCESS` e os nomes com a conclusão, pelo `statusCheckRollup`), e são dois runs do workflow `ci` no objeto, um por gatilho (`pull_request` e `push`); os ids de run não são citados aqui (corrida numérica longa é cobrada como SHA pelo pré-voo) e se obtêm por `gh run list --commit`, medido por: `cd C:/Users/AMP/w-san313 && gh pr view 460 --json headRefOid,statusCheckRollup --jq '.headRefOid, (.statusCheckRollup|length), ([.statusCheckRollup[] | select(.status != "COMPLETED" or .conclusion != "SUCCESS")] | length), ([.statusCheckRollup[] | .name + ":" + .conclusion] | sort | join(", "))'; gh run list --commit ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d --json workflowName,event,status,conclusion,headSha --jq '.[] | .workflowName + " " + .event + " " + .status + " " + .conclusion + " " + .headSha'`
```
ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d
14
0
authority-portal:SUCCESS, authority-portal:SUCCESS, backend-postgres:SUCCESS, backend-postgres:SUCCESS, backend:SUCCESS, backend:SUCCESS, docker:SUCCESS, docker:SUCCESS, flutter:SUCCESS, flutter:SUCCESS, frontend:SUCCESS, frontend:SUCCESS, owner-portal:SUCCESS, owner-portal:SUCCESS
ci pull_request completed success ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d
ci push completed success ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d
```

O worktree `C:/Users/AMP/w-san313` está no objeto e sem modificação rastreada (0 linhas no status sem não rastreados), e o único não rastreado é o diretório de votos desta junta; por isso as leituras de arquivo deste mandato, feitas no disco desse worktree com caminho absoluto e com o CR retirado, leem o conteúdo do objeto (o `sed` do comando põe o prefixo do worktree no caminho que o `git status` imprime), medido por: `git -C C:/Users/AMP/w-san313 rev-parse HEAD; git -C C:/Users/AMP/w-san313 status --porcelain --untracked-files=no | wc -l; git -C C:/Users/AMP/w-san313 status --short | sed -E 's#^(..) (.*)#\1 C:/Users/AMP/w-san313/\2#'`
```
ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d
0
?? C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/
```

Do commit anterior ao objeto (`<objeto>~1`, o head que a fábrica recebeu) ao objeto há um commit, o dos corpos, e o delta é só os três corpos `jurado-san313-*` nos dois espelhos (o `sed` põe o prefixo do worktree no caminho impresso), medido por: `cd C:/Users/AMP/w-san313 && git rev-list --count ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d~1..ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d; git log -1 --format=%s ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d; git log -1 --format=%s ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d~1; git diff --name-only ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d~1 ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d | sed -e 's#^#C:/Users/AMP/w-san313/#'`
```
1
docs(junta): corpos das 3 cadeiras da junta de dado do B-SAN3-13
test(mobile): F1 no formato do dart format 3.13.4 (o da CI) (B-SAN3-13)
C:/Users/AMP/w-san313/.agents/agents/especialistas/jurado-san313-c1-escopo-e-cursor.md
C:/Users/AMP/w-san313/.agents/agents/especialistas/jurado-san313-c2-app-nunca-perde.md
C:/Users/AMP/w-san313/.agents/agents/especialistas/jurado-san313-c3-regressao-escopo-registro.md
C:/Users/AMP/w-san313/.claude/agents/especialistas/jurado-san313-c1-escopo-e-cursor.md
C:/Users/AMP/w-san313/.claude/agents/especialistas/jurado-san313-c2-app-nunca-perde.md
C:/Users/AMP/w-san313/.claude/agents/especialistas/jurado-san313-c3-regressao-escopo-registro.md
```

O head-base do vermelho-controle é `<objeto>~13` (o ponto em que o ramo saiu da `main`: o merge do B-TRC-02, PR 454), ancestral da merge-base atual; a merge-base atual é a `origin/main` de agora; o ramo tem 13 commits de primeiro pai desde o head-base e um único merge, `<objeto>~3`, cujo segundo pai é a merge-base (o assunto de cada um abaixo; SHA que não sai do `mandato-refs.sh 460` não se publica, e por isso o head-base é citado como `<objeto>~13`), medido por: `cd C:/Users/AMP/w-san313 && git log -1 --format=%s ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d~13; git merge-base --is-ancestor ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d~13 b08c755719a6cb0ed192fa04e549ac5fc67a3e67 && echo 'head-base ancestral da merge-base'; git merge-base ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d origin/main; git rev-parse origin/main; git rev-list --first-parent --count ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d~13..ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d; git rev-list --first-parent --merges --count ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d~13..ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d; git log -1 --format=%s ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d~3; test "$(git rev-parse ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d~3^2)" = b08c755719a6cb0ed192fa04e549ac5fc67a3e67 && echo 'segundo pai do merge = merge-base'`
```
feat(traccar): eventos da viatura e telemetria veicular pelo event.forward, com migração transacional e RLS forçado (B-TRC-02) (#454)
head-base ancestral da merge-base
b08c755719a6cb0ed192fa04e549ac5fc67a3e67
b08c755719a6cb0ed192fa04e549ac5fc67a3e67
13
1
chore(merge): origin/main (#458) no ramo do B-SAN3-13 — registros apensados nas duas ordens, índice regenerado
segundo pai do merge = merge-base
```

O corpo desta cadeira existe no objeto e, descontados o frontmatter e o bloco de adaptação Codex do espelho, é IDÊNTICO entre os dois espelhos (comparação EOL-neutra; o arquivo inteiro difere por construção do espelho, e por isso não se publica hash); o número de linhas de cada espelho está na saída, medido por: `cd C:/Users/AMP/w-san313 && diff <(tr -d '\r' < C:/Users/AMP/w-san313/.claude/agents/especialistas/jurado-san313-c1-escopo-e-cursor.md | awk 'f; $0=="---"{n++; if(n==2) f=1}' | sed '/^$/d') <(tr -d '\r' < C:/Users/AMP/w-san313/.agents/agents/especialistas/jurado-san313-c1-escopo-e-cursor.md | awk 'f; $0=="---"{n++; if(n==2) f=1}' | awk 'index($0,"Papel para o Codex"){s=1} s&&$0==""{s=0; next} !s' | sed '/^$/d') >/dev/null && echo 'IDENTICO corpo c1-escopo-e-cursor' || echo 'DIVERGE corpo c1-escopo-e-cursor'; wc -l < C:/Users/AMP/w-san313/.claude/agents/especialistas/jurado-san313-c1-escopo-e-cursor.md; wc -l < C:/Users/AMP/w-san313/.agents/agents/especialistas/jurado-san313-c1-escopo-e-cursor.md`
```
IDENTICO corpo c1-escopo-e-cursor
402
408
```

As duas ferramentas do pré-voo na pasta do redator são as do ramo `origin/chore/mandato-refs-e-preflight` com uma única diferença, a linha do `RAIZ` do `mandato-preflight.sh`, fixada em `C:/Users/AMP/w-trc02` (a adaptação do B-TRC-02), e são byte a byte as da pasta do redator do B-TRC-02; esse `RAIZ` não existe mais no disco, logo a checagem 6 do pré-voo não acharia caminho relativo nenhum, e por isso este mandato cita todo caminho do repositório ABSOLUTO no worktree do objeto (a checagem 6 não confere caminho absoluto, fronteira declarada no cabeçalho do pré-voo; a existência de cada um sai das leituras medidas neste mandato), medido por: `cd C:/Users/AMP/Documents/GitHub/ERP_Techsolutios && for b in mandato-refs.sh mandato-preflight.sh; do bl=$(git ls-tree -r origin/chore/mandato-refs-e-preflight -- scripts | awk -v b="$b" '$4 ~ ("/" b "$") {print $3}'); diff <(git cat-file blob "$bl") C:/Users/AMP/erp-pausa-2026-10-03/redator-san313/$b | grep -i -E '^[<>]'; echo "$b linhas-diferentes=$(diff <(git cat-file blob "$bl") C:/Users/AMP/erp-pausa-2026-10-03/redator-san313/$b | grep -c -i -E '^[<>]')"; cmp -s C:/Users/AMP/erp-pausa-2026-10-03/redator-san313/$b C:/Users/AMP/erp-pausa-2026-10-03/redator-trc02-c2/$b && echo "$b igual ao do redator do B-TRC-02"; done; test -d C:/Users/AMP/w-trc02 && echo 'RAIZ existe' || echo 'RAIZ ausente: C:/Users/AMP/w-trc02'`
```
mandato-refs.sh linhas-diferentes=0
mandato-refs.sh igual ao do redator do B-TRC-02
< RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
> RAIZ=C:/Users/AMP/w-trc02
mandato-preflight.sh linhas-diferentes=2
mandato-preflight.sh igual ao do redator do B-TRC-02
RAIZ ausente: C:/Users/AMP/w-trc02
```

O arquivo `-db` do bloco existe no objeto (os quatro arquivos de teste backend do bloco listados primeiro) e pula DECLARANDO quando falta `DATABASE_URL`; no `ci.yml` do objeto os jobs `backend` e `backend-postgres` definem `DATABASE_URL`, e nenhuma linha do `ci.yml` cita `san3-13` (a contagem fecha a saída): o arquivo `-db` do bloco não está nas `SUITES` do job `backend-postgres`, onde o plano §8 item 16 diz que ele roda (o dev diz que rodou no job `backend`; onde a CI o executa é da C1 medir), medido por: `cd C:/Users/AMP/w-san313 && git ls-tree -r --name-only ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d -- tests | grep -i 'san3-13' | sed -e 's#^#C:/Users/AMP/w-san313/#'; tr -d '\r' < C:/Users/AMP/w-san313/tests/san3-13-wo-list-cursor-db.test.ts | grep -n -i -o -E 'process\.env\.DATABASE_URL|skip: "[^"]*"'; tr -d '\r' < C:/Users/AMP/w-san313/.github/workflows/ci.yml | grep -n -i -E '^  backend(-postgres)?:|DATABASE_URL:'; echo "linhas do ci.yml com san3-13: $(tr -d '\r' < C:/Users/AMP/w-san313/.github/workflows/ci.yml | grep -c -i 'san3-13')"`
```
C:/Users/AMP/w-san313/tests/san3-13-wo-list-cursor-db.test.ts
C:/Users/AMP/w-san313/tests/san3-13-wo-list-cursor.test.ts
C:/Users/AMP/w-san313/tests/san3-13-wo-list-prisma-where.test.ts
C:/Users/AMP/w-san313/tests/san3-13-wo-list-scope.test.ts
20:process.env.DATABASE_URL
24:skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrações para executar esta suíte."
31:  backend:
40:      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/erp_techsolutions?schema=public
131:  backend-postgres:
134:      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/erp_techsolutions?schema=public
linhas do ci.yml com san3-13: 0
```

Toda composição de `WorkOrderService` em `src` e a ligação da referência estrita (`resolveActorOperatorProfileIdStrict`), pela busca do git no worktree que está no objeto: o campo opcional na interface (l.193), a leitura no serviço (l.486), a fábrica em memória (l.2109, `createDefaultReferenceResolvers`), a implementação do resolver (l.2286) e a fábrica com repositório (l.2395); o `sed` põe o prefixo do worktree no caminho impresso, medido por: `git -C C:/Users/AMP/w-san313 grep -n -i -E 'new WorkOrderService\(|resolveActorOperatorProfileIdStrict' -- src | sed -e 's#^#C:/Users/AMP/w-san313/#'`
```
C:/Users/AMP/w-san313/src/modules/work-orders/work-order.service.ts:193:  readonly resolveActorOperatorProfileIdStrict?: (actor: WorkOrderActorContext) => Promise<string | undefined>;
C:/Users/AMP/w-san313/src/modules/work-orders/work-order.service.ts:486:    const resolver = this.references.resolveActorOperatorProfileIdStrict;
C:/Users/AMP/w-san313/src/modules/work-orders/work-order.service.ts:2109:  return new WorkOrderService(memoryRepository, createDefaultReferenceResolvers());
C:/Users/AMP/w-san313/src/modules/work-orders/work-order.service.ts:2286:    resolveActorOperatorProfileIdStrict: async (actor) => {
C:/Users/AMP/w-san313/src/modules/work-orders/work-order.service.ts:2395:  return new WorkOrderService(repository, createDefaultReferenceResolvers(), createDefaultGeocoder());
```

Memória de commit livre em GB (a P8 (c) exige pelo menos 4 antes de lançar agente), os trabalhos Docker vivos fora da base `erp-*` (o teto é 2 contando o da cadeira) e o disco livre em `C:` (abaixo de 10 GB, `DEEP_CLEAN=1`, §C5), no instante da redação: a cadeira mede de novo antes de subir, medido por: `powershell.exe -NoProfile -Command '$o=Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory; [math]::Round(($o.CommitLimit-$o.CommittedBytes)/1GB,2)'; docker ps --format '{{.Names}}' | grep -v -i -E '^erp-' | sed -E 's#-(pg|redis|run|net)$##' | sort -u; echo "trabalhos fora de erp: $(docker ps --format '{{.Names}}' | grep -v -i -E '^erp-' | sed -E 's#-(pg|redis|run|net)$##' | sort -u | wc -l)"; df -h /c | tail -1 | awk '{print "livre em C: " $4}'`
```
12,49
trabalhos fora de erp: 0
livre em C: 11G
```

O modelo de mandato do §C7.7 do contrato (P1, P2, P4, P3, P7), verbatim no objeto, medido por: `tr -d '\r' < C:/Users/AMP/w-san313/CLAUDE.md | grep -n -i -A7 'Após CADA item: apense a <cadeira>-evidencia.md'`
```
733:   Após CADA item: apense a <cadeira>-evidencia.md → comando · saída resumida · veredito parcial.  [P1]
734-   Antes da mensagem final: escreva <cadeira>-voto.json. Mensagem final = 1 linha apontando o arquivo.  [P2]
735-   Máximo 3 itens; logs longos só no arquivo de evidência.  [P4]
736-   Se você substituir um caído: re-execute cada comando do <cadeira>-evidencia.md dele e compare, depois
737-   meça a cauda. Conclusão sem comando registrado NÃO é insumo.  [P3]
738-   Se receber PAUSA: termine o comando em curso, grave `## PAUSA <hora UTC>` em <cadeira>-evidencia.md
739-   (head · feito · falta · próximo comando · arquivos meio-escritos) e pare sozinho com 1 linha apontando
740-   o arquivo. Não inicie item novo.  [P7]
```

## HIPOTESE

Você é `jurado-san313-c1-opus` (nome proposto pela fábrica; o orquestrador confirma no disparo), identidade nova, executor Claude Code (subagente), modelo **Claude Opus**, nível menor DECLARADO (§C7.6); o seu corpo canônico é `C:/Users/AMP/w-san313/.claude/agents/especialistas/jurado-san313-c1-escopo-e-cursor.md`, carregado **do blob do objeto** (o worktree está no objeto, medido acima; não do disco de outra sessão, §A7). Na primeira linha de `c1-evidencia.md`, declare executor efetivo, modelo, nível, objeto, `mandato_md5` deste arquivo (CR retirado antes do md5) e o veredito IDENTICO/DIVERGE do corpo que você carregou contra o blob do objeto, EOL-neutro. **Opus esgotado: PARE sem votar** e registre onde parou (§C7.6-bis) — não há degrau abaixo. Inelegíveis por nome: `planejador-mestre` (Fable, autor do plano), `crit-san313-opus` (r1), `crit-san313-opus-r2`, `crit-san313-argon`, `crit-san313-pro-r2`, `dev-san313-opus`, `med-san313-argon` (a instância Argon que mediu o diagnóstico), `fab-san313-opus` (autor do conteúdo deste mandato e dos corpos), `redator-san313-opus` (que pôs este mandato na forma e executou as medições), o orquestrador, `inspetor-san313-opus`, `jurado-san313-c2-opus` e `jurado-san313-c3-opus`; se o seu nome coincidir, pare. Monocultura declarada: o dev rodou em Claude Opus, como você. O plano v3 com E1/E2, o relatório do dev, as críticas r1/r2 e a medição do Argon são **A RE-VERIFICAR**, derruba com: `head -1 C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/c1-evidencia.md | grep -i -E 'executor|Opus|mandato_md5|objeto|IDENTICO|DIVERGE'`

A legalidade vem antes do mérito: parecer `insp-san313-parecer.md` do inspetor `inspetor-san313-opus` com LIBERADO ou LIBERADO COM RESSALVA nomeando você, o seu executor, o seu worktree e os seus containers; o objeto é o head do PR 460 **depois do commit dos corpos** (medido acima), com todos os check-runs concluídos (head que andou bloqueia o início). Régua: bloco de DADO (o app apaga linhas do aparelho a partir desta lista) e de permissão, **unanimidade de 3 com veto** (§C7 item 8(1)); **ciclo 1**, todo `bloqueia` com escopo `dentro-do-bloco` reprova, grave ou não (§C7 item 8(2)). Divergência registrada (§A2): o plano §9 dava à C1 também a bateria backend inteira; na composição do orquestrador, a bateria inteira é da C3 e a C1 fica com CA-1..CA-11 e "a web não muda". Todo achado declara gravidade, classe, escopo, N e forma; `pre-existente` exige evidência de data ou origem e pendência com dono (§C7.1-ter(a)); "não consigo medir" item seu é REPROVADO; não proponha correção (§C7.4-bis), não reabra Q1–Q5 nem a E1, não cobre KPI nem matéria de C2 ou C3, não leia `c2-*`/`c3-*`; o voto declara `arquivos_medidos` (§C7 item 9 (0)), honesto (`**` se rodou `npm test`/`check`/`build`), derruba com: `grep -i -E 'legalidade|A RE-VERIFICAR|gravidade|classe|escopo|arquivos_medidos|ciclo 1' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/c1-voto.json`

Terreno: worktree exclusivo `C:/Users/AMP/j13-c1-wt`, detached no objeto, com `npm ci` próprio e zero junction de `node_modules` (§C7.1-ter(c)), removido só por `git worktree remove --force` depois de conferir que nenhum processo o usa. Postgres 16 `j13-c1-pg` e Redis 7 `j13-c1-redis` próprios, só em `127.0.0.1`, portas altas testadas antes (candidatas 47513 e 47514), senha aleatória só por ambiente; bancos extras `j13_c1_*`; `DATABASE_URL` e `REDIS_URL` seus como prefixo de **todo** comando `node`/`npm`. Antes de subir: memória de commit livre ≥ 4 GB (P8 (c)), no máximo 2 trabalhos Docker na máquina contando o seu (na redação já havia 2 fora da base, medido acima), disco ≥ 10 GB; faltando, espere. Nunca a base viva (`erp-postgres`, `erp-redis`, `erp-postgres-alt`), nem 5432, 6379, 3000, 5173, 5050, 8899, 55432, 55313; nunca `prune` nem container alheio. Mutação só no seu worktree, uma por vez, âncora única com prova de aplicação (CRLF incluso), restauro provado por `git hash-object` = blob do objeto; o vermelho-controle no head-base `<objeto>~13` (medido acima) por `git checkout ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d~13 -- src/modules/work-orders` no seu worktree, com os testes da versão de vermelho-controle do dev, restaurado e provado; scripts e sondas numa pasta sua `C:/Users/AMP/erp-pausa-2026-10-03/j13-c1/`, para que a evidência seja re-executável, derruba com: `grep -i -E 'j13-c1-wt|j13-c1-pg|j13-c1-redis|j13_c1_|127\.0\.0\.1|junction|commit livre|4 GB|erp-|5432|6379|hash-object|head-base|teardown' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/c1-evidencia.md`

Item 1 de 3 (escopo por papel sem vazamento; lista = mutáveis; resolver estrito; o `OR: []` — CA-1, CA-2, CA-4, CA-7, CA-8): os testes `san3-13-wo-list-scope`, `-prisma-where` e os 5 `-db` no seu Postgres com `skipped = 0`; uma sonda sua pelo REST e no Postgres com duas organizações, técnicos A e B com perfil, um ator sem perfil, `manager` e `manager`+`field_technician`, as 4 vias de atribuição do CA-1 e a órfã: o conjunto de cada ator, `∈ lista de A ⇔ PATCH /status por A ≠ 403` para cada OS, interseção com `assignedUserId`/`status`/`search`, e nenhuma OS de outra organização em lista nenhuma; o resolver estrito nos 4 casos (ausente, lança, `undefined`, `sub` não-UUID) e o guard intocado; o `OR: []` nunca chega ao Prisma, provado por combinações geradas por script. Mutações M1–M7, M9, M10, M17 e a sua (escopo por `assigned_user_id` só no Prisma). Vermelho-controle: no head-base, o B1 do dev vermelho pela asserção e a sua sonda mostrando a OS de B na lista de A, derruba com: `grep -i -E 'Item 1|CA-1|CA-2|CA-4|CA-7|CA-8|lista = mutáveis|403|cross|outra organização|503|scope_resolver_unavailable|scope_resolution_failed|não-UUID|OR: \[\]|M1|M17|vermelho|head-base' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/c1-evidencia.md`

Item 2 de 3 (a caminhada por cursor da E2 — CA-3, CA-5, CA-6, CA-9, CA-10, CA-11): os 5 `-db` três vezes, mesmo `# tests`, `skipped = 0`, e os testes em memória; uma caminhada sua em Postgres pelo REST, N ≥ 50 OS com empate até o µs, `limit` ∈ {1, 7, 100}, começando com `paginate=cursor` sem `cursor`: união = conjunto do admin, sem repetição, `id` decrescente inclusive na 1ª página, `total` constante, fim em `null`, a contagem de requisições no múltiplo exato (o dev diz 7 para 6 páginas), a reatribuição entre páginas, e a F-1 reproduzida como controle; os seis 400 da E2; `openOnly` derivado de `WORK_ORDER_STATUS_TRANSITIONS` e mantendo o `?status=` no Postgres; e ONDE a CI executa os `-db` deste bloco (o `ci.yml` e o log do run do objeto — medido acima: o `ci.yml` do objeto não cita `san3-13`, logo eles não estão nas `SUITES` do `backend-postgres`). Mutações M8, M11–M16 e a sua (`lte` no lugar de `lt`). Vermelho-controle: no head-base, o B14-db do dev vermelho pela asserção (`FALTARAM`), derruba com: `grep -i -E 'Item 2|CA-9|B14-db|B15-db|B19|FALTARAM|paginate=cursor|nextCursor|múltiplo|requisições|invalid_paginate|invalid_cursor_mode|invalid_cursor_offset|openOnly|backend-postgres|skipped|M12|vermelho|head-base' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/c1-evidencia.md`

Item 3 de 3 (a web não muda; a composição de produção liga o resolver estrito): o modo offset como `manager`, com o mesmo conjunto semeado, no objeto e no head-base — `items`, ordem `created_at desc, code desc` e `pagination` idênticos, só o `nextCursor: null` aditivo; o diretório `frontend` sem diff do bloco e sem `paginate`/`openOnly`/`scope` no service da web; o que um usuário só `technician` vê na web (registrado, não reprovado — H4/R2); toda fábrica de `WorkOrderService` que serve tráfego com a referência estrita (as composições medidas acima são piso), provado subindo o app pela fábrica do `server.ts` e listando como técnico (200, não 503); as 4 regressões vizinhas. Vermelho-controle: o comparador acusa uma OS a mais fabricada num lado; a fábrica sem a referência estrita dá 503; no head-base o técnico recebe a organização inteira, derruba com: `grep -i -E 'Item 3|offset|created_at desc|nextCursor: null|frontend|technician|new WorkOrderService|server\.ts|503|regress|vermelho|head-base' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/c1-evidencia.md`

Protocolo P1/P2/P3/P4/P7 do §C7.7, verbatim no bloco colado acima, com `<cadeira>` = `c1`: evidência em `c1-evidencia.md` após CADA item; `c1-voto.json` nasce esqueleto com os três itens EM APURAÇÃO e o campo `arquivos_medidos`, cada item gravado ao ser medido, e fecha antes da mensagem final de 1 linha; sucessor de identidade nova re-executa os comandos registrados e só então mede a cauda; três itens exatos; PAUSA grava head, feito, falta, próximo comando e arquivos meio-escritos e para. Queda vai a `00-quedas.md` deste diretório (P6, pelo orquestrador); no máximo 2 jurados em paralelo (P5). Únicos outputs no repositório: `c1-evidencia.md` e `c1-voto.json` em `C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/`; nunca commit, derruba com: `test -f C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/c1-voto.json`

## MEDIDO

Pré-voo deste mandato com as ferramentas copiadas sem mudança para a pasta do redator `C:/Users/AMP/erp-pausa-2026-10-03/redator-san313/` (diferença contra o ramo das ferramentas medida acima), executado com o cwd no worktree do objeto; o redator é `redator-san313-opus` (Claude Opus 5.5, nível menor declarado, cobrindo o Codex por ordem do dono), que pôs na forma v3 o conteúdo da fábrica `fab-san313-opus` e executou cada comando deste mandato pelo gerador `C:/Users/AMP/erp-pausa-2026-10-03/redator-san313/gerar-c1.sh`, medido por: `cd C:/Users/AMP/w-san313 && MANDATO_REFS=C:/Users/AMP/erp-pausa-2026-10-03/redator-san313/mandato-refs.sh bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san313/mandato-preflight.sh C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/00-mandatos/cadeira-c1.md 460 2>&1; echo ec=$?`
```
COLAGEM    l.6-20: refs do PR #460 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/00-mandatos/cadeira-c1.md
ec=0
```
