# Mandato — agente-fabrica (4 corpos) — ciclo 4 do B-GOV-MANDATO (PR 393)

## MEDIDO

Forma do mandato: campos declarados, decisao do dono D-MANDATO-FORMA registrada em origin/main medido por: `MSYS_NO_PATHCONV=1 git -C C:/Users/AMP/w-mandato show origin/main:agent-orchestration/controle/decisoes.md | grep -ic '^## D-MANDATO-FORMA'`
```
1
```

Estado do PR 393 no instante do lancamento, pela ferramenta do bloco medido por: `bash scripts/mandato-refs.sh 393`
```
# refs do PR #393 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-01T08:51Z · repo: thiagodorgo/ERP_Techsolutios

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

O papel e a agente-fabrica, que escreve os corpos das quatro identidades novas do ciclo 4 (secoes 15.5 e 15.9 do plano)
  e declara, na mensagem final, que leu este mandato pelo caminho (ela nao tem Bash: o orquestrador mede o mandato_md5 e o
  registra): jurado-mandato-c1d-invariancia-e-morte-interna, jurado-mandato-c2d-cobertura-e-dois-lados,
  jurado-mandato-c3d-escopo-kpi-registro-mandato e conferente-dois-lados-b-gov-mandato-c4, cada um em
  .claude/agents/especialistas/ (novo) e no espelho .agents/agents/especialistas/ (novo) no formato do gerador
  scripts/sync-agent-agents.mjs (sem a linha tools, com o preambulo Codex), com frontmatter name, description de uma linha,
  tools Read Grep Glob Bash e model opus derruba com: `ls C:/Users/AMP/w-mandato/.claude/agents/especialistas/ | grep -icE 'c1d-invariancia-e-morte-interna|c2d-cobertura-e-dois-lados|c3d-escopo-kpi-registro-mandato|conferente-dois-lados-b-gov-mandato-c4'`

Os itens de cada cadeira sao os da tabela da secao 15.9, transcritos sem diluir e sem legislacao nova: C1 com o item morte
  interna (mata cada componente com shims proprios no PATH em forma POSIX, sobre o pre-voo do head primeiro, e tem de reportar
  o fail-open da passada 2 do awk sem ser mandada), C2 com o item dois lados (semente propria, mutante provado programa,
  comportamento antes da cor, o conferente executou), C3 com o item mandatos como artefato (mandato_md5 de cada papel igual ao
  arquivo e pre-voo de cada mandato re-executado no head do objeto, item 2.4), e o conferente com o procedimento da secao 15.5;
  os quatro corpos mandam declarar o mandato_md5 na 1a linha da evidencia derruba com: `grep -ic 'morte interna' C:/Users/AMP/w-mandato/.claude/agents/especialistas/jurado-mandato-c1d-invariancia-e-morte-interna.md; grep -ic 'dois lados' C:/Users/AMP/w-mandato/.claude/agents/especialistas/jurado-mandato-c2d-cobertura-e-dois-lados.md; grep -ic 'mandato_md5' C:/Users/AMP/w-mandato/.claude/agents/especialistas/jurado-mandato-c3d-escopo-kpi-registro-mandato.md`

As regras da casa estao nos quatro corpos: maioria de 3 sem veto e sem suplente (queda relanca a mesma identidade, que nao
  herda nada; voto perdido nunca aprova); todo achado com gravidade e escopo, este com evidencia de data ou origem; nao
  consigo medir e REPROVADO; nenhuma cadeira propoe correcao; a legalidade do ciclo 4 e a secao 9 do parecer da auditoria com
  CONSERTO VERIFICADO mais o inspetor LIBERADO, conferidas pela cadeira; o objeto e resolvido pela propria cadeira; a identidade
  de cada matriz e a tripla de blobs mais o ambiente; worktree detached proprio em caminho curto (w-j4c1, w-j4c2, w-j4c3,
  w-conf4), junction proibida, base viva erp-postgres 5432 e erp-redis 6379 nunca como alvo, MSYS_NO_PATHCONV nunca exportada,
  sem tail -f, timeout em tudo que executa artefato mutado, evidencia incremental com hora em arquivo proprio do scratchpad,
  as tres cadeiras votam juntas sem ler o voto umas das outras, e custo nunca e criterio derruba com: `grep -ic 'MSYS_NO_PATHCONV' C:/Users/AMP/w-mandato/.claude/agents/especialistas/jurado-mandato-c1d-invariancia-e-morte-interna.md`

Os inelegiveis da secao 15.9 estao listados por nome em cada corpo: as nove cadeiras dos ciclos 1 a 3, a instancia do inspetor
  da junta 3, os devs dos ciclos 1 a 3, o planejador das secoes 1 a 14.20, o auditor da maquina, o planejador do conserto da
  maquina, o orquestrador e o planejador do ciclo 4 derruba com: `grep -ic 'planejador-conserto-maquina' C:/Users/AMP/w-mandato/.claude/agents/especialistas/jurado-mandato-c2d-cobertura-e-dois-lados.md`

A fabrica nao versiona, nao roda o sync e nao toca nenhum outro arquivo: o unico efeito dela sao os oito arquivos novos, e quem
  versiona e o orquestrador (sync, git add -f nos dois espelhos, --check igual a zero) derruba com: `git -C C:/Users/AMP/w-mandato status --porcelain | grep -ivE 'especialistas' | wc -l`

A mensagem final da fabrica traz os quatro caminhos, o numero de linhas de cada corpo e toda divergencia que ela achar entre
  a secao 15.9 e este mandato, e vale a secao 15.9 derruba com: `grep -ic 'divergencia' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/FABRICA-C4.md`

## MEDIDO

Pre-voo deste mandato no head do lancamento medido por: `cd C:/Users/AMP/w-mandato && bash scripts/mandato-preflight.sh agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/fabrica.md 393; echo ec=$?`
```
COLAGEM    l.11-31: refs do PR #393 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-mandato/agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/fabrica.md
ec=0
head=f013c61ec1ab108e712f0f55dadec0690c10c194
utc=2026-10-01T08:51:11Z
```
