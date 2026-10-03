# Mandato — dev de testes (E1) — ciclo 4 do B-GOV-MANDATO (PR 393)

## MEDIDO

Forma do mandato: campos declarados, decisao do dono D-MANDATO-FORMA registrada em origin/main medido por: `MSYS_NO_PATHCONV=1 git -C C:/Users/AMP/w-mandato show origin/main:agent-orchestration/controle/decisoes.md | grep -ic '^## D-MANDATO-FORMA'`
```
1
```

Estado do PR 393 no instante do lancamento, pela ferramenta do bloco medido por: `bash scripts/mandato-refs.sh 393`
```
# refs do PR #393 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-01T08:50Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            chore/mandato-refs-e-preflight
base:            origin/main
estado:          OPEN | rascunho=true | MERGEABLE
head do PR:      f013c61ec1ab108e712f0f55dadec0690c10c194
merge-base:      5b6e103638f398d6074eecc5daebdf2d3bcd2252
merge commit:    <ainda nao mergeado>
check-runs:      total=12 nao-verdes=2 pendentes=2
approved_head:   NAO DETERMINAVEL (a ata casa o PR mas NAO declara aprovacao: nenhuma linha '- **approved_head:**')
                 objeto declarado 7462b75bfb7768556a2da2ee13f9ac92e9198872 (agent-orchestration/omega/juntas/J-B-GOV-MANDATO.md:10 @head-do-PR) — aprovacao nao legivel por maquina
                 objeto declarado 4c8819effd0b9f7a1ef8040eaa1707ca8342fdad (agent-orchestration/omega/juntas/J-B-GOV-MANDATO.md:96 @head-do-PR) — aprovacao nao legivel por maquina
                 objeto declarado 28b4defdc067387f384e06614e033e0976e9912b (agent-orchestration/omega/juntas/J-B-GOV-MANDATO.md:215 @head-do-PR) — aprovacao nao legivel por maquina
                 agent-orchestration/omega/juntas/J-B-GOV-SEM-TETO.md (mencao no corpo) @head-do-PR
                 NAO invente: sem a linha '- **approved_head:**' numa ata que se declare
                 sobre este PR, a ferramenta NAO afirma qual head a junta aprovou.

AVISO: 2 check-run(s) ainda rodando.
```

O merge-base do head com origin/main e igual a origin/main (a main pos-396 esta integrada) medido por: `cd C:/Users/AMP/w-mandato && [ "$(git merge-base origin/main HEAD)" = "$(git rev-parse origin/main)" ] && echo IGUAL || echo DIFERENTE`
```
IGUAL
```

A junta 3 reprovou 2 x 1; achados por gravidade em cada voto, lidos do JSON de cada evidencia medido por: `for n in 1 2 3; do f=C:/Users/AMP/w-mandato/agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo3/C$n-evidencia.md; echo "C$n: bloqueia=$(grep -ic '"gravidade": *"bloqueia"' $f) ajuste=$(grep -ic '"gravidade": *"ajuste"' $f) nota=$(grep -ic '"gravidade": *"nota"' $f)"; done`
```
C1: bloqueia=4 ajuste=3 nota=3
C2: bloqueia=2 ajuste=3 nota=1
C3: bloqueia=0 ajuste=3 nota=7
```

Os seis bloqueantes do ciclo 3, por id medido por: `grep -h -ioE '"id": *"C[123]c-0[0-9]"[^}]*"gravidade": *"bloqueia"' C:/Users/AMP/w-mandato/agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo3/C*-evidencia.md | grep -ioE 'C[123]c-0[0-9]' | sort -u | paste -sd' '`
```
C1c-01 C1c-02 C1c-03 C1c-04 C2c-01 C2c-02
```

O parecer da auditoria tem a secao 8 (conserto da maquina) e nao tem a secao 9 (atestacao); os quatro registros R existem medido por: `grep -ic '^## 8\. Conserto da máquina' C:/Users/AMP/w-mandato/agent-orchestration/omega/reprovacoes/R-B-GOV-MANDATO-ciclo3-auditoria.md; grep -ic '^## 9\.' C:/Users/AMP/w-mandato/agent-orchestration/omega/reprovacoes/R-B-GOV-MANDATO-ciclo3-auditoria.md; ls C:/Users/AMP/w-mandato/agent-orchestration/omega/reprovacoes/ | grep -i MANDATO`
```
1
0
R-B-GOV-MANDATO-1.md
R-B-GOV-MANDATO-2.md
R-B-GOV-MANDATO-3.md
R-B-GOV-MANDATO-ciclo3-auditoria.md
```

As tres pendencias do conserto da maquina estao no ramo medido por: `grep -ioE '^## P-GOV-MAQUINA-393-[A-Z0-9-]+' C:/Users/AMP/w-mandato/agent-orchestration/controle/pendencias.md | paste -sd' '`
```
## P-GOV-MAQUINA-393-D-M1-DOIS-LADOS ## P-GOV-MAQUINA-393-D-M2-MANDATO-ARTEFATO ## P-GOV-MAQUINA-393-D-M3-FALHA-INTERNA
```

Os sete corpos de cadeira dos ciclos 1 a 3, inelegiveis para o ciclo 4 medido por: `ls C:/Users/AMP/w-mandato/.claude/agents/especialistas/ | grep -i jurado-mandato | paste -sd' '`
```
jurado-mandato-c1-prevoo-fail-closed.md jurado-mandato-c1c-invariancia-de-forma.md jurado-mandato-c2-pergunta-feita.md jurado-mandato-c2c-cobertura-por-mutacao.md jurado-mandato-c3-escopo-kpi-registro.md jurado-mandato-c3b-fronteira-numero-registro.md jurado-mandato-c3c-fronteira-numero-registro.md
```

## HIPOTESE

O papel e desenvolvedor de testes do ciclo 4 (E1 da secao 15.3 do plano), identidade nova dev-tests-ciclo4-b-gov-mandato,
  que declara na 1a linha do relatorio e da mensagem final o papel, a identidade, o modelo e o mandato_md5 deste arquivo,
  e que nasce depois de este mandato estar versionado (condicao 2 da secao 8.6 do parecer da auditoria) derruba com: `head -1 C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/DEVT4C.md | grep -ic 'mandato_md5'`

O unico escopo e tests/mandato-preflight.test.ts e tests/mandato-refs.test.ts; o commit T4c toca apenas tests/**; o dev nao
  le scripts/** novos (le os do head, que sao o objeto dos casos) e nao edita scripts/**, docs/**, agent-orchestration/**,
  Kpis/** nem corpos de agente (secao 15.6 do plano) derruba com: `git -C C:/Users/AMP/w-mandato fetch origin && git -C C:/Users/AMP/w-mandato diff --name-only HEAD origin/chore/mandato-refs-e-preflight | grep -iv '^tests/mandato-' | wc -l`

A entrega E1 (secao 15.3) tem 40 casos novos — C1c-01 x4, C1c-02 x5, C1c-03 x3, C1c-04 x6, C2c-02/336 x1, A15 x8 (7
  componentes e stderr limpo), C1c-05 x1, C1c-06 x1, C2c-03 x8 (4 no pre-voo e 4 no refs), F-25 x1, F-6j x1 —, pelo menos 36
  no pre-voo e 4 no refs, com os helpers novos rodaComPath, docGrande e shimQueDorme; as modificacoes de linha existente sao
  so as declaradas (roda() dos dois arquivos com timeout e signal; os 5 titulos de C1c-10), cada uma com a propriedade que a
  justifica; todo caso existente cujo veredito mude por C1c-01 a C1c-04 e relatado, nunca decidido (esperado 0) derruba com: `grep -i '^# tests' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/devt4c/pre.tap C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/devt4c/refs.tap`

Antes do commit, o vermelho-controle historico da secao 15.8: o guard novo roda sobre os artefatos DO HEAD num arnes
  pristino (git archive sem autocrlf mais git init, hash-object sem filtros igual ao blob), TAP em arquivo, e os not ok sao
  EXATAMENTE os casos novos que atacam o head no pre-voo e [Y02..Y05] mais [F-25] no refs; com o guard do head sobre o
  artefato do head, fail 0 derruba com: `grep -ic '^not ok' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/devt4c/vc-pre.tap`

A bateria do dev de testes (secao 15.8): npx prisma generate com DATABASE_URL ficticia so no ambiente do comando, npm run
  check, npm run lint, os dois guards por node --test com TAP em arquivo, bash -n nos dois scripts do head, e o relatorio
  passa pelo pre-voo DO HEAD (dogfooding) com PRE-VOO OK colado; git diff --cached --check em linha propria antes do commit;
  um commit test(mandato) sem linha de atribuicao; push fast-forward para chore/mandato-refs-e-preflight e, se recusado,
  para e reporta derruba com: `git -C C:/Users/AMP/w-mandato fetch origin && git -C C:/Users/AMP/w-mandato log -1 --format=%B origin/chore/mandato-refs-e-preflight | grep -icE '^(co-authored-by|claude-session)'`

O terreno: worktree detached proprio C:/Users/AMP/w-devt4 no head do lancamento (caminho curto; conferir que existe),
  npm ci proprio sem junction, MSYS_NO_PATHCONV nunca exportada no shell que roda artefato, guard ou ferramenta, sem tail -f,
  timeout em tudo que executa artefato mutado, a base viva erp-postgres 5432 e erp-redis 6379 nunca como alvo (este papel nao
  precisa de banco), 0 processo vivo ao fim e o worktree mantido para o orquestrador medir derruba com: `git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios worktree list | grep -ic 'w-devt4'`

O relatorio e incremental, com a hora em cada secao, em C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/DEVT4C.md,
  e toda falha da API por sobrecarga e registrada nele com a hora derruba com: `grep -ic 'derruba com\|medido por' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/DEVT4C.md`

## MEDIDO

Pre-voo deste mandato no head do lancamento medido por: `cd C:/Users/AMP/w-mandato && bash scripts/mandato-preflight.sh agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/dev-tests.md 393; echo ec=$?`
```
COLAGEM    l.11-31: refs do PR #393 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-mandato/agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/dev-tests.md
ec=0
head=f013c61ec1ab108e712f0f55dadec0690c10c194
utc=2026-10-01T08:50:21Z
```
