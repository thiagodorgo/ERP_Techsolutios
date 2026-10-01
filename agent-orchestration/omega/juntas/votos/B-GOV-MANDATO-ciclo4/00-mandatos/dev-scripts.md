# Mandato — dev-scripts-ciclo4-b-gov-mandato (E2 + E3) — ciclo 4 do B-GOV-MANDATO (PR 393)

## MEDIDO

Forma do mandato: campos declarados, decisao do dono D-MANDATO-FORMA registrada em origin/main medido por: `MSYS_NO_PATHCONV=1 git -C C:/Users/AMP/w-mandato show origin/main:agent-orchestration/controle/decisoes.md | grep -ic '^## D-MANDATO-FORMA'`
```
1
```

Estado do PR 393 no instante do lancamento, pela ferramenta do bloco medido por: `bash scripts/mandato-refs.sh 393`
```
# refs do PR #393 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-01T17:12Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            chore/mandato-refs-e-preflight
base:            origin/main
estado:          OPEN | rascunho=true | MERGEABLE
head do PR:      738f0736e1bde573cc96f96174d5bc3d99dd7fa3
merge-base:      5b6e103638f398d6074eecc5daebdf2d3bcd2252
merge commit:    <ainda nao mergeado>
check-runs:      total=14 nao-verdes=4 pendentes=0
approved_head:   NAO DETERMINAVEL (a ata casa o PR mas NAO declara aprovacao: nenhuma linha '- **approved_head:**')
                 objeto declarado 7462b75bfb7768556a2da2ee13f9ac92e9198872 (agent-orchestration/omega/juntas/J-B-GOV-MANDATO.md:10 @head-do-PR) — aprovacao nao legivel por maquina
                 objeto declarado 4c8819effd0b9f7a1ef8040eaa1707ca8342fdad (agent-orchestration/omega/juntas/J-B-GOV-MANDATO.md:96 @head-do-PR) — aprovacao nao legivel por maquina
                 objeto declarado 28b4defdc067387f384e06614e033e0976e9912b (agent-orchestration/omega/juntas/J-B-GOV-MANDATO.md:215 @head-do-PR) — aprovacao nao legivel por maquina
                 agent-orchestration/omega/juntas/J-B-GOV-SEM-TETO.md (mencao no corpo) @head-do-PR
                 NAO invente: sem a linha '- **approved_head:**' numa ata que se declare
                 sobre este PR, a ferramenta NAO afirma qual head a junta aprovou.
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

O parecer da auditoria: presenca da secao 8 (conserto da maquina) e da secao 9 (atestacao), contadas (0 = ausente); os registros R existentes medido por: `grep -ic '^## 8\. Conserto da máquina' C:/Users/AMP/w-mandato/agent-orchestration/omega/reprovacoes/R-B-GOV-MANDATO-ciclo3-auditoria.md; grep -ic '^## 9\.' C:/Users/AMP/w-mandato/agent-orchestration/omega/reprovacoes/R-B-GOV-MANDATO-ciclo3-auditoria.md; ls C:/Users/AMP/w-mandato/agent-orchestration/omega/reprovacoes/ | grep -i MANDATO`
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
jurado-mandato-c1-prevoo-fail-closed.md jurado-mandato-c1c-invariancia-de-forma.md jurado-mandato-c1d-invariancia-e-morte-interna.md jurado-mandato-c2-pergunta-feita.md jurado-mandato-c2c-cobertura-por-mutacao.md jurado-mandato-c2d-cobertura-e-dois-lados.md jurado-mandato-c3-escopo-kpi-registro.md jurado-mandato-c3b-fronteira-numero-registro.md jurado-mandato-c3c-fronteira-numero-registro.md jurado-mandato-c3d-escopo-kpi-registro-mandato.md
```

## HIPOTESE

O papel e desenvolvedor de scripts e registro do ciclo 4 (E2 e E3 da secao 15.3 do plano), identidade nova
  dev-scripts-ciclo4-b-gov-mandato, que declara na 1a linha do relatorio e da mensagem final o papel, a identidade, o
  modelo e o mandato_md5 deste arquivo, e que nasce depois de os commits T4c e T4c-2 do dev de testes existirem no ramo e de este
  mandato estar versionado (ordem obrigatoria da secao 15.3: E1 commita antes de E2) derruba com: `head -1 C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/DEVS4C.md | grep -ic 'mandato_md5'`

O escopo de codigo e scripts/mandato-preflight.sh e scripts/mandato-mutantes.sh, mais scripts/mandato-refs.sh so em
  comentarios (git diff fora de comentarios vazio; qualquer edicao alem vem com falsificacao escrita); o dev NAO edita
  tests/**: se medir que um caso esta errado, escreve a falsificacao e para (secao 15.3 e regra 1 da secao 8) derruba com: `git -C C:/Users/AMP/w-mandato fetch origin && git -C C:/Users/AMP/w-mandato diff --name-only HEAD origin/chore/mandato-refs-e-preflight | grep -i '^tests/' | wc -l`

A entrega E2 e tudo da secao 15.2 COM a errata 15.14 (o caso [C1c-02f]: uma funcao de revisao so, nos dois ramos da checagem 6;
  o instrumento da revisao e git rev-parse --verify --quiet sobre a revisao seguida de ^{commit}), em dois commits so de scripts/**: S4a (pre-voo: C1c-01 isencao exata da colagem com
  o carimbo normalizado; C1c-02 token com dois pontos partido e revisao conferida por existencia; C1c-03 unidade com a
  prosa separada da cerca; C1c-04 cabecalho de secao exato; A15 com pipefail e a funcao morreu nos 24 pontos de substituicao
  e cano enumerados da fonte; C1c-05 e C1c-06) e S4b (ferramenta: mutante so conta se e programa, com extracao de cada
  programa awk e diagnostico de interpretador no stderr, categoria MUTANTE-INVALIDO fora do denominador; causa por ponto;
  controle que falha sai com ec 2; opcao --timeout por mutante com categoria TIMEOUT; equivalentes conferidos por id com
  ANOMALIA-EQUIV sem abater; M7 next no fim de linha gerado; insumo do diferencial que percorre RAIZ) derruba com: `git -C C:/Users/AMP/w-mandato fetch origin && git -C C:/Users/AMP/w-mandato log --format=%s HEAD..origin/chore/mandato-refs-e-preflight | grep -ic 'S4a\|S4b'`

A prova do dev de scripts (secao 15.3 e bateria da secao 15.8): o guard inteiro do T4c-2 sobre os artefatos novos da fail
  0 (o T4c-2 publicou 348 casos no pre-voo e 44 no refs; o numero exato e publicado por execucao); os 6 pares da secao 15.0(b) e os 6
  componentes da secao 15.0(c) reexecutados com shims proprios no PATH em forma POSIX dao vereditos invertidos (ataques REJ,
  pares OK, morte nomeada); os drills t-invalido, t-inventado, t-controle, t-timeout, t-next e t-diferencial com saida colada e
  o vermelho-controle historico (a mesma invocacao sobre a ferramenta do head) ao lado; bash -n nos dois scripts; o relatorio
  passa pelo pre-voo NOVO (dogfooding) com PRE-VOO OK colado derruba com: `grep -i '^# tests\|^# fail' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/devs4c/pre.tap`

A entrega E3 antes da E4 (commits D4 e K4, so docs e KPI, secao 15.3 e 15.7): o arquivo
  docs/revisoes/SAN3/B-GOV-MANDATO-ciclo4-mutantes.md (novo) com a identidade das matrizes do ciclo 4 (secao 15.4) e o custo
  com a formula; o arquivo docs/revisoes/SAN3/B-GOV-MANDATO-ciclo4-equivalentes.txt (novo); a EMENDA CICLO 4 no comando
  agent-orchestration/codex/comandos/B-GOV-MANDATO-mandato-verificavel.md com o escopo nominal da secao 15.6, a bateria da
  secao 15.8 e os codigos de saida novos; as pendencias da secao 15.7 em agent-orchestration/controle/pendencias.md com o
  indice pelo gerador; a trilha; e Kpis/* so por node scripts/kpi-freeze.mjs, com backend em N igual a 2 execucoes reais
  em Postgres e Redis descartaveis proprios em portas livres provadas, nunca a base viva; as matrizes verbatim (K4b) ficam
  para uma retomada desta identidade depois da E4 do orquestrador derruba com: `git -C C:/Users/AMP/w-mandato fetch origin && git -C C:/Users/AMP/w-mandato merge --ff-only origin/chore/mandato-refs-e-preflight && grep -ic 'tripla\|identidade' C:/Users/AMP/w-mandato/docs/revisoes/SAN3/B-GOV-MANDATO-ciclo4-mutantes.md`

O terreno: worktree detached proprio C:/Users/AMP/w-devs4 no head do lancamento (caminho curto; conferir que existe),
  npm ci proprio sem junction, MSYS_NO_PATHCONV nunca exportada no shell que roda artefato, guard ou ferramenta, sem tail -f,
  timeout em tudo que executa artefato mutado (a ferramenta do head nao tem timeout por mutante; a nova tera), a base viva
  erp-postgres 5432 e erp-redis 6379 nunca como alvo, clusters descartaveis removidos pelo nome, 0 processo vivo ao fim e o
  worktree mantido para a retomada do K4b derruba com: `git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios worktree list | grep -ic 'w-devs4'`

Cada commit e Conventional Commits sem linha de atribuicao, com git diff --cached --check em linha propria antes, e o push e
  fast-forward para chore/mandato-refs-e-preflight (recusado, para e reporta); o relatorio e incremental, com a hora em cada
  secao, em C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/DEVS4C.md,
  e toda falha da API por sobrecarga e registrada nele com a hora derruba com: `git -C C:/Users/AMP/w-mandato fetch origin && git -C C:/Users/AMP/w-mandato log --format=%B HEAD..origin/chore/mandato-refs-e-preflight | grep -icE '^(co-authored-by|claude-session)'`

## MEDIDO

Pre-voo deste mandato no head do lancamento medido por: `cd C:/Users/AMP/w-mandato && bash scripts/mandato-preflight.sh agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/dev-scripts.md 393; echo ec=$?`
```
COLAGEM    l.11-29: refs do PR #393 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-mandato/agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/dev-scripts.md
ec=0
head=738f0736e1bde573cc96f96174d5bc3d99dd7fa3
utc=2026-10-01T17:13:07Z
```
